import crypto from 'crypto';

export function computeLineSignature(secret, rawBody) {
  const key = typeof secret === 'string' ? secret : '';
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody ?? '', 'utf8');
  return crypto.createHmac('sha256', key).update(bodyBuffer).digest('base64');
}
