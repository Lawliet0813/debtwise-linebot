import { createRemoteJWKSet, jwtVerify } from 'jose';

const DEFAULT_ISSUER = 'https://access.line.me';
const JWKS_URL = new URL('https://api.line.me/oauth2/v2.1/certs');
const JWKS = createRemoteJWKSet(JWKS_URL);

export async function verifyLineIdToken(token, channelId, issuer = DEFAULT_ISSUER) {
  if (!token) {
    throw new Error('缺少 ID Token');
  }
  if (!channelId) {
    throw new Error('缺少 LOGIN_CHANNEL_ID，請於環境變數中設定');
  }

  const { payload } = await jwtVerify(token, JWKS, {
    issuer,
    audience: channelId,
  });

  return payload;
}
