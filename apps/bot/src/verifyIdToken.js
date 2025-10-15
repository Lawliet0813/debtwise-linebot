import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL = new URL('https://api.line.me/oauth2/v2.1/certs');
const JWKS = createRemoteJWKSet(JWKS_URL);

const ISSUER = 'https://access.line.me';

export async function verifyIdToken(token, channelId) {
  if (!channelId) {
    throw new Error('缺少 LINE Channel ID，請在環境變數設定 LINE_CHANNEL_ID。');
  }

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: ISSUER,
    audience: channelId,
  });

  return payload;
}
