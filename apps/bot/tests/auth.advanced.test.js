import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

let privateKey;
let jwk;

const NOW = () => Math.floor(Date.now() / 1000);

beforeAll(async () => {
  const { privateKey: privKey, publicKey } = await generateKeyPair('RS256');
  privateKey = privKey;
  jwk = await exportJWK(publicKey);
  jwk.kid = 'test-key-advanced';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.LINE_CHANNEL_ID;
  delete process.env.LINE_LOGIN_NONCE_REQUIRED;
});

const buildFetchMock = (responseOverride = {}) =>
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ keys: [jwk] }),
    ...responseOverride,
  });

const signToken = async ({
  iss = 'https://access.line.me',
  aud = '1234567890',
  sub = 'U1234567890',
  kid = jwk.kid,
  alg = 'RS256',
  nonce,
  issuedAt = NOW(),
  expiresAt = NOW() + 600,
  notBefore,
  claims = {},
} = {}) => {
  const payload = {
    sub,
    name: 'Test User',
    picture: 'https://example.com/picture.png',
    email: 'test@example.com',
    ...claims,
  };
  if (nonce !== undefined) {
    payload.nonce = nonce;
  }

  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg, kid, typ: 'JWT' })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt);

  if (notBefore !== undefined) {
    jwt.setNotBefore(notBefore);
  }

  return jwt.sign(privateKey);
};

const createRequest = ({ body = {}, headers = {} } = {}) => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    body,
    headers: normalizedHeaders,
    get(name) {
      return normalizedHeaders[name.toLowerCase()];
    },
  };
};

const createResponse = () => {
  const res = {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
  return res;
};

const invokeHandler = async ({ body, nonceRequired = false, fetchMock }) => {
  vi.resetModules();
  process.env.LINE_CHANNEL_ID = '1234567890';
  if (nonceRequired) {
    process.env.LINE_LOGIN_NONCE_REQUIRED = 'true';
  } else {
    delete process.env.LINE_LOGIN_NONCE_REQUIRED;
  }

  if (!fetchMock) {
    fetchMock = buildFetchMock();
  }
  vi.stubGlobal('fetch', fetchMock);

  const { handleVerify } = await import('../src/routes/auth.js');
  const authUtils = await import('../src/utils/lineVerify.js');
  authUtils.__resetLineVerifyState();

  const req = createRequest({
    body,
    headers: { 'content-type': 'application/json' },
  });
  const res = createResponse();
  await handleVerify(req, res);

  return { res, fetchMock };
};

describe('JWKS Caching', () => {
  it('reuses cached keys within TTL', async () => {
    vi.resetModules();
    process.env.LINE_CHANNEL_ID = '1234567890';

    const fetchMock = buildFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const { handleVerify } = await import('../src/routes/auth.js');
    const authUtils = await import('../src/utils/lineVerify.js');
    authUtils.__resetLineVerifyState();

    const token1 = await signToken();
    const token2 = await signToken();

    // First request should fetch JWKS
    let req = createRequest({
      body: { id_token: token1 },
      headers: { 'content-type': 'application/json' },
    });
    let res = createResponse();
    await handleVerify(req, res);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);

    // Second request should reuse cached key (no module reset)
    req = createRequest({
      body: { id_token: token2 },
      headers: { 'content-type': 'application/json' },
    });
    res = createResponse();
    await handleVerify(req, res);
    expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1, not 2
    expect(res.statusCode).toBe(200);
  });

  it('refetches keys when kid not in cache', async () => {
    vi.resetModules();
    process.env.LINE_CHANNEL_ID = '1234567890';

    const jwk2 = { ...jwk, kid: 'new-key-id' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ keys: [jwk] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ keys: [jwk, jwk2] }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { handleVerify } = await import('../src/routes/auth.js');
    const authUtils = await import('../src/utils/lineVerify.js');
    authUtils.__resetLineVerifyState();

    // First token with original kid
    const token1 = await signToken({ kid: jwk.kid });
    let req = createRequest({
      body: { id_token: token1 },
      headers: { 'content-type': 'application/json' },
    });
    let res = createResponse();
    await handleVerify(req, res);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);

    // Second token with new kid should trigger refetch
    const token2 = await signToken({ kid: 'new-key-id' });
    req = createRequest({
      body: { id_token: token2 },
      headers: { 'content-type': 'application/json' },
    });
    res = createResponse();
    await handleVerify(req, res);
    expect(fetchMock).toHaveBeenCalledTimes(2); // Should fetch again
  });

  it('handles cache expiry correctly', async () => {
    vi.resetModules();
    process.env.LINE_CHANNEL_ID = '1234567890';

    const fetchMock = buildFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const { handleVerify } = await import('../src/routes/auth.js');
    const authUtils = await import('../src/utils/lineVerify.js');
    authUtils.__resetLineVerifyState();

    const token = await signToken();

    // First request
    let req = createRequest({
      body: { id_token: token },
      headers: { 'content-type': 'application/json' },
    });
    let res = createResponse();
    await handleVerify(req, res);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Simulate cache expiry by advancing time
    const realDateNow = Date.now;
    vi.spyOn(Date, 'now').mockImplementation(() => realDateNow() + 11 * 60 * 1000); // 11 minutes

    // Second request should refetch
    const token2 = await signToken();
    req = createRequest({
      body: { id_token: token2 },
      headers: { 'content-type': 'application/json' },
    });
    res = createResponse();
    await handleVerify(req, res);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('Rate Limiting', () => {
  it('throttles after MAX_FETCHES_PER_MINUTE', async () => {
    vi.resetModules();
    process.env.LINE_CHANNEL_ID = '1234567890';

    // Create 10 different kids to force 10 fetches
    const kids = Array.from({ length: 10 }, (_, i) => `kid-${i}`);
    const jwks = kids.map((kid) => ({ ...jwk, kid }));

    let fetchCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({ keys: jwks }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);

    const { handleVerify } = await import('../src/routes/auth.js');
    const authUtils = await import('../src/utils/lineVerify.js');
    authUtils.__resetLineVerifyState();

    // Make 10 requests with different kids (should hit rate limit on 11th)
    for (let i = 0; i < 10; i++) {
      const token = await signToken({ kid: `kid-${i}` });
      const req = createRequest({
        body: { id_token: token },
        headers: { 'content-type': 'application/json' },
      });
      const res = createResponse();
      await handleVerify(req, res);
    }

    expect(fetchCount).toBe(10);

    // 11th request with new kid should trigger rate limit error
    const token11 = await signToken({ kid: 'kid-10' });
    const req = createRequest({
      body: { id_token: token11 },
      headers: { 'content-type': 'application/json' },
    });
    const res = createResponse();
    await handleVerify(req, res);

    // Rate limit causes verification failure, which returns 401 with UNKNOWN code
    // (treated as verification error, not server error)
    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('UNKNOWN');
  });
});

describe('Error Handling', () => {
  it('handles JWKS fetch failure with 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    });

    const token = await signToken();
    const { res } = await invokeHandler({ body: { id_token: token }, fetchMock });

    // JWKS fetch failure is treated as verification failure (401)
    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('UNKNOWN');
  });

  it('handles JWKS fetch failure with 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'server error' }),
    });

    const token = await signToken();
    const { res } = await invokeHandler({ body: { id_token: token }, fetchMock });

    // JWKS fetch failure is treated as verification failure (401)
    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('UNKNOWN');
  });

  it('handles JWKS fetch timeout', async () => {
    const fetchMock = vi.fn().mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        // Simulate abort after timeout
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            reject(new Error('The operation was aborted'));
          });
        }
        // Never resolve to simulate hanging request
      });
    });

    const token = await signToken();
    const { res } = await invokeHandler({ body: { id_token: token }, fetchMock });

    // Timeout/abort is treated as verification failure (401)
    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('UNKNOWN');
  }, 10000); // Extend test timeout to 10s

  it('rejects tokens with missing kid', async () => {
    // Create token without kid in header
    const payload = {
      sub: 'U1234567890',
      name: 'Test User',
    };

    const jwt = new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' }) // No kid
      .setIssuer('https://access.line.me')
      .setAudience('1234567890')
      .setIssuedAt(NOW())
      .setExpirationTime(NOW() + 600);

    const token = await jwt.sign(privateKey);
    const { res } = await invokeHandler({ body: { id_token: token } });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('SIGNATURE_INVALID');
  });

  it('rejects tokens with unsupported algorithm HS256', async () => {
    const payload = {
      sub: 'U1234567890',
      name: 'Test User',
    };

    const jwt = new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', kid: 'test', typ: 'JWT' })
      .setIssuer('https://access.line.me')
      .setAudience('1234567890')
      .setIssuedAt(NOW())
      .setExpirationTime(NOW() + 600);

    const token = await jwt.sign(new TextEncoder().encode('secret'));
    const { res } = await invokeHandler({ body: { id_token: token } });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('ALGORITHM_NOT_ALLOWED');
  });

  it('rejects tokens with future notBefore (nbf)', async () => {
    const futureTime = NOW() + 400; // 400 seconds in future (beyond 5 min tolerance)
    const token = await signToken({ notBefore: futureTime });
    const { res } = await invokeHandler({ body: { id_token: token } });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('TOKEN_EXPIRED');
  });

  it('handles malformed JWKS response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ keys: null }), // Invalid response
    });

    const token = await signToken();
    const { res } = await invokeHandler({ body: { id_token: token }, fetchMock });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('SIGNATURE_INVALID');
  });

  it('handles empty request body', async () => {
    const { res } = await invokeHandler({ body: {} });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('TOKEN_MISSING');
  });

  it('handles null id_token', async () => {
    const { res } = await invokeHandler({ body: { id_token: null } });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('TOKEN_MISSING');
  });

  it('handles malformed token', async () => {
    const { res } = await invokeHandler({ body: { id_token: 'not.a.valid.jwt' } });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('MALFORMED_TOKEN');
  });

  it('handles missing LINE_CHANNEL_ID', async () => {
    vi.resetModules();
    delete process.env.LINE_CHANNEL_ID;

    const fetchMock = buildFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const { handleVerify } = await import('../src/routes/auth.js');
    const authUtils = await import('../src/utils/lineVerify.js');
    authUtils.__resetLineVerifyState();

    const token = await signToken();
    const req = createRequest({
      body: { id_token: token },
      headers: { 'content-type': 'application/json' },
    });
    const res = createResponse();
    await handleVerify(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.error).toBe('SERVER_CONFIG');
  });

  it('rejects token with wrong audience', async () => {
    const token = await signToken({ aud: 'wrong-audience' });
    const { res } = await invokeHandler({ body: { id_token: token } });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('AUDIENCE_INVALID');
  });
});

describe('Nonce Validation', () => {
  it('accepts token without nonce when not required', async () => {
    const token = await signToken(); // No nonce
    const { res } = await invokeHandler({ body: { id_token: token }, nonceRequired: false });

    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
  });

  it('rejects when nonce required but not provided in request', async () => {
    const token = await signToken({ nonce: 'token-nonce' });
    const { res } = await invokeHandler({
      body: { id_token: token }, // No nonce in body
      nonceRequired: true,
    });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('NONCE_REQUIRED');
  });

  it('rejects when nonce required but missing in token', async () => {
    const token = await signToken(); // No nonce in token
    const { res } = await invokeHandler({
      body: { id_token: token, nonce: 'request-nonce' },
      nonceRequired: true,
    });

    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe('NONCE_MISMATCH');
  });

  it('validates nonce match when provided', async () => {
    const token = await signToken({ nonce: 'correct-nonce' });
    const { res } = await invokeHandler({
      body: { id_token: token, nonce: 'correct-nonce' },
      nonceRequired: false,
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
  });
});
