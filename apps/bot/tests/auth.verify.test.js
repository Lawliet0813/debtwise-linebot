import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

let privateKey;
let jwk;

const NOW = () => Math.floor(Date.now() / 1000);

beforeAll(async () => {
  const { privateKey: privKey, publicKey } = await generateKeyPair('RS256');
  privateKey = privKey;
  jwk = await exportJWK(publicKey);
  jwk.kid = 'test-key';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.LINE_CHANNEL_ID;
  delete process.env.LINE_LOGIN_NONCE_REQUIRED;
});

const buildFetchMock = () =>
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ keys: [jwk] }),
  });

const signToken = async ({
  iss = 'https://access.line.me',
  aud = '1234567890',
  sub = 'U1234567890',
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
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })
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

const invokeHandler = async ({ body, nonceRequired = false }) => {
  vi.resetModules();
  process.env.LINE_CHANNEL_ID = '1234567890';
  if (nonceRequired) {
    process.env.LINE_LOGIN_NONCE_REQUIRED = 'true';
  } else {
    delete process.env.LINE_LOGIN_NONCE_REQUIRED;
  }

  const fetchMock = buildFetchMock();
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

describe('POST /auth/verify', () => {
  it('returns payload and user data when token is valid', async () => {
    const token = await signToken({ nonce: 'nonce-1234' });
    const { res, fetchMock } = await invokeHandler({ body: { id_token: token } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    expect(res.payload.user).toEqual({
      lineUserId: 'U1234567890',
      name: 'Test User',
      picture: 'https://example.com/picture.png',
      email: 'test@example.com',
    });
    expect(res.payload.payload.sub).toBe('U1234567890');
  });

  it('rejects expired tokens with TOKEN_EXPIRED', async () => {
    const token = await signToken({ expiresAt: NOW() - 1000 });
    const { res } = await invokeHandler({ body: { id_token: token } });

    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ ok: false, error: 'TOKEN_EXPIRED' });
  });

  it('rejects tokens with invalid issuer', async () => {
    const token = await signToken({ iss: 'https://example.com' });
    const { res } = await invokeHandler({ body: { id_token: token } });

    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ ok: false, error: 'ISSUER_INVALID' });
  });

  it('enforces nonce when LINE_LOGIN_NONCE_REQUIRED=true', async () => {
    const token = await signToken({ nonce: 'correct-nonce' });
    const { res } = await invokeHandler({
      body: { id_token: token, nonce: 'mismatch' },
      nonceRequired: true,
    });

    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ ok: false, error: 'NONCE_MISMATCH' });
  });
});
