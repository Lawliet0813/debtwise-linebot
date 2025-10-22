import { decodeProtectedHeader, importJWK, jwtVerify, errors as joseErrors } from 'jose';

const JWKS_ENDPOINT = 'https://api.line.me/oauth2/v2.1/certs';
const MAX_CACHED_KEYS = 5;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CLOCK_TOLERANCE_SECONDS = 300;
const MAX_FETCHES_PER_MINUTE = 10;
const MAX_RECENT_TIMESTAMPS = 100;

const jwkCache = new Map();
let lastFetchError = null;
let lastFetchAt = 0;
const recentFetchTimestamps = [];

const normalizeError = (error) => (error instanceof Error ? error : new Error(String(error)));

export class LineVerifyError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class TokenMissingError extends LineVerifyError {
  constructor() {
    super('Missing id_token', 'TOKEN_MISSING');
  }
}

export class TokenExpiredError extends LineVerifyError {
  constructor() {
    super('Token expired', 'TOKEN_EXPIRED');
  }
}

export class SignatureInvalidError extends LineVerifyError {
  constructor() {
    super('Signature invalid', 'SIGNATURE_INVALID');
  }
}

export class InvalidIssuerError extends LineVerifyError {
  constructor() {
    super('Issuer invalid', 'ISSUER_INVALID');
  }
}

export class InvalidAudienceError extends LineVerifyError {
  constructor() {
    super('Audience invalid', 'AUDIENCE_INVALID');
  }
}

export class NonceRequiredError extends LineVerifyError {
  constructor() {
    super('Nonce required', 'NONCE_REQUIRED');
  }
}

export class NonceMismatchError extends LineVerifyError {
  constructor() {
    super('Nonce mismatch', 'NONCE_MISMATCH');
  }
}

export class AlgorithmNotAllowedError extends LineVerifyError {
  constructor() {
    super('Algorithm not allowed', 'ALGORITHM_NOT_ALLOWED');
  }
}

export class MalformedTokenError extends LineVerifyError {
  constructor() {
    super('Malformed token', 'MALFORMED_TOKEN');
  }
}

export class UnknownVerificationError extends LineVerifyError {
  constructor(message) {
    super(message ?? 'Unknown verification error', 'UNKNOWN');
  }
}

const cleanupOldTimestamps = (timestamp) => {
  const cutoff = timestamp - 60_000;
  while (recentFetchTimestamps.length && recentFetchTimestamps[0] < cutoff) {
    recentFetchTimestamps.shift();
  }
  // Hard limit protection to prevent memory leak
  while (recentFetchTimestamps.length >= MAX_RECENT_TIMESTAMPS) {
    recentFetchTimestamps.shift();
  }
};

const touchFetchWindow = (timestamp) => {
  cleanupOldTimestamps(timestamp);
  recentFetchTimestamps.push(timestamp);
};

const ensureRateLimit = (timestamp) => {
  cleanupOldTimestamps(timestamp);
  if (recentFetchTimestamps.length >= MAX_FETCHES_PER_MINUTE) {
    const waitMs = 60_000 - (timestamp - recentFetchTimestamps[0]);
    const rateError = new UnknownVerificationError(
      `JWKS fetch throttled, retry after ${Math.ceil(waitMs / 1000)} seconds`,
    );
    rateError.retryAfter = Math.ceil(waitMs / 1000);
    throw rateError;
  }
};

const fetchRemoteJwks = async () => {
  const now = Date.now();
  ensureRateLimit(now);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(JWKS_ENDPOINT, {
      signal: controller.signal,
      headers: {
        'cache-control': 'no-cache',
        accept: 'application/json',
      },
    });
    if (!response.ok) {
      const err = new UnknownVerificationError(`JWKS fetch failed with status ${response.status}`);
      err.status = response.status;
      throw err;
    }
    const body = await response.json();
    return body?.keys ?? [];
  } finally {
    clearTimeout(timeout);
    touchFetchWindow(now);
    lastFetchAt = now;
  }
};

const cacheImportedKey = (kid, key) => {
  while (jwkCache.size >= MAX_CACHED_KEYS) {
    const oldestKey = jwkCache.keys().next().value;
    if (oldestKey === undefined) break;
    jwkCache.delete(oldestKey);
  }
  jwkCache.set(kid, { key, expiresAt: Date.now() + CACHE_TTL_MS });
};

const importKeysIntoCache = async (jwks) => {
  for (const jwk of jwks) {
    if (!jwk?.kid) continue;
    try {
      const key = await importJWK(jwk, 'RS256');
      cacheImportedKey(jwk.kid, key);
    } catch (error) {
      lastFetchError = normalizeError(error);
    }
  }
};

const refreshCacheIfNeeded = async (kid) => {
  const existing = jwkCache.get(kid);
  if (existing && existing.expiresAt > Date.now()) {
    return;
  }
  const jwks = await fetchRemoteJwks();
  await importKeysIntoCache(jwks);
};

const getKeyFromCache = (kid) => {
  const entry = jwkCache.get(kid);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    jwkCache.delete(kid);
    return null;
  }
  return entry.key;
};

export const maskIdToken = (token) => {
  if (typeof token !== 'string' || token.length === 0) {
    return '';
  }
  if (token.length <= 16) {
    return '****';
  }
  const prefix = token.slice(0, 12);
  const suffix = token.slice(-12);
  return `${prefix}****${suffix}`;
};

export const getLastFetchError = () => lastFetchError;

export const __resetLineVerifyState = () => {
  jwkCache.clear();
  recentFetchTimestamps.splice(0, recentFetchTimestamps.length);
  lastFetchError = null;
  lastFetchAt = 0;
};

export async function verifyLineIdToken({
  token,
  expectedAudience,
  expectedIssuer = 'https://access.line.me',
  nonce,
  requireNonce = false,
}) {
  if (!token) {
    throw new TokenMissingError();
  }

  let header;
  try {
    header = decodeProtectedHeader(token);
  } catch (error) {
    throw new MalformedTokenError(normalizeError(error).message);
  }

  if (header.alg !== 'RS256') {
    throw new AlgorithmNotAllowedError();
  }

  const kid = header.kid;
  if (!kid) {
    throw new SignatureInvalidError();
  }

  try {
    await refreshCacheIfNeeded(kid);
  } catch (error) {
    const normalized = normalizeError(error);
    if (normalized instanceof LineVerifyError) {
      throw normalized;
    }
    throw new UnknownVerificationError(normalized.message);
  }

  let key = getKeyFromCache(kid);
  if (!key) {
    try {
      await refreshCacheIfNeeded(kid);
      key = getKeyFromCache(kid);
    } catch (error) {
      const normalized = normalizeError(error);
      if (normalized instanceof LineVerifyError) {
        throw normalized;
      }
      throw new UnknownVerificationError(normalized.message);
    }
  }

  if (!key) {
    throw new SignatureInvalidError();
  }

  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: expectedIssuer,
      audience: expectedAudience,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });

    if (requireNonce && !nonce) {
      throw new NonceRequiredError();
    }

    if (requireNonce && !payload.nonce) {
      throw new NonceMismatchError();
    }

    if (typeof nonce === 'string') {
      if (!payload.nonce || payload.nonce !== nonce) {
        throw new NonceMismatchError();
      }
    }

    return payload;
  } catch (error) {
    if (error instanceof LineVerifyError) {
      throw error;
    }
    if (error instanceof joseErrors.JWTExpired) {
      throw new TokenExpiredError();
    }
    if (error instanceof joseErrors.JWTClaimValidationFailed) {
      if (error.claim === 'iss') {
        throw new InvalidIssuerError();
      }
      if (error.claim === 'aud') {
        throw new InvalidAudienceError();
      }
      if (error.claim === 'nbf' || error.claim === 'iat') {
        throw new TokenExpiredError();
      }
    }
    if (error instanceof joseErrors.JWSSignatureVerificationFailed) {
      throw new SignatureInvalidError();
    }
    if (error instanceof joseErrors.JWKSNoMatchingKey) {
      throw new SignatureInvalidError();
    }
    if (error instanceof joseErrors.JWTInvalid || error instanceof joseErrors.JOSEError) {
      throw new MalformedTokenError();
    }
    throw new UnknownVerificationError(normalizeError(error).message);
  }
}

export const __debugState = () => ({
  cacheSize: jwkCache.size,
  lastFetchAt,
  lastFetchError,
  recentFetches: [...recentFetchTimestamps],
});
