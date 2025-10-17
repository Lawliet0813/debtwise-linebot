import express from 'express';
import { decodeProtectedHeader } from 'jose';
import {
  verifyLineIdToken,
  LineVerifyError,
  maskIdToken,
} from '../utils/lineVerify.js';
import { logError, logInfo } from '../utils/logger.js';

const authRouter = express.Router();

authRouter.use(
  express.json({
    limit: '1mb',
    type: ['application/json', 'text/json', 'application/*+json'],
  }),
);

const asBoolean = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

const formatUser = (payload) => ({
  lineUserId: payload.sub ?? null,
  name: payload.name ?? null,
  picture: payload.picture ?? null,
  email: payload.email ?? null,
});

export async function handleVerify(req, res) {
  const { id_token: idToken, nonce } = req.body ?? {};
  const maskedToken = maskIdToken(idToken);

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    logError({
      scope: 'auth.verify',
      status: 500,
      reason: 'missing_channel_id',
      token: maskedToken,
    });
    return res.status(500).json({
      ok: false,
      error: 'SERVER_CONFIG',
    });
  }

  const requireNonce = asBoolean(process.env.LINE_LOGIN_NONCE_REQUIRED, false);
  const issuer = 'https://access.line.me';

  let header = null;
  try {
    if (typeof idToken === 'string' && idToken.length > 0) {
      header = decodeProtectedHeader(idToken);
    }
  } catch {
    header = null;
  }

  try {
    const payload = await verifyLineIdToken({
      token: idToken,
      expectedAudience: channelId,
      expectedIssuer: issuer,
      nonce: typeof nonce === 'string' ? nonce : undefined,
      requireNonce,
    });

    logInfo({
      scope: 'auth.verify',
      status: 200,
      kid: header?.kid ?? null,
      iss: payload.iss ?? null,
      aud: payload.aud ?? null,
      token: maskedToken,
    });

    return res.json({
      ok: true,
      user: formatUser(payload),
      payload,
    });
  } catch (error) {
    const err = error instanceof LineVerifyError ? error : null;
    const errorCode = err?.code ?? 'UNKNOWN';
    const status = err ? 401 : 500;

    logError({
      scope: 'auth.verify',
      status,
      reason: error instanceof Error ? error.message : String(error),
      errorCode,
      kid: header?.kid ?? null,
      iss: header?.iss ?? undefined,
      aud: header?.aud ?? undefined,
      token: maskedToken,
    });

    return res.status(status).json({
      ok: false,
      error: errorCode,
    });
  }
}

authRouter.post('/verify', handleVerify);

export default authRouter;
