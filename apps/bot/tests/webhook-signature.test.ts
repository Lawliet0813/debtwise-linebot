import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { computeLineSignature } from '../src/utils/signature.js';

const SECRET = '058870bcf03adaa5a4693f9b6510da58';
const BODY_STR = '{"events":[{"replyToken":"test","type":"message","message":{"type":"text","text":"開啟儀表板"}}]}';
const BODY = Buffer.from(BODY_STR, 'utf8');
const GOOD_SIG = 'S2vh2wv1n1e8wvjub4GQl8b4dE2lxSMu/3E30pAjdc4=';

describe('LINE Webhook Signature (DEBUG_TEST_MODE)', () => {
  let app;

  beforeAll(async () => {
    vi.resetModules();
    process.env.DEBUG_TEST_MODE = '1';
    process.env.LINE_CHANNEL_SECRET = SECRET;
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
    process.env.DEBUG_LOCAL = '1';
    process.env.VITE_LIFF_ID = 'TEST_LIFF';

    const appModule = await import('../src/app.js');
    app = appModule.default;
  });

  afterAll(() => {
    process.env.DEBUG_TEST_MODE = '0';
    delete process.env.LINE_CHANNEL_SECRET;
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  });

  it('OK: valid signature → 200', async () => {
    expect(computeLineSignature(SECRET, BODY)).toBe(GOOD_SIG);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Content-Length', String(BODY.length))
      .set('x-line-signature', GOOD_SIG)
      .send(BODY_STR);

    expect(res.status).toBe(200);
  });

  it('NoSignature: missing header → 401/400', async () => {
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Content-Length', String(BODY.length))
      .send(BODY_STR);

    expect([400, 401]).toContain(res.status);
  });

  it('BadSignature: wrong signature → 401', async () => {
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Content-Length', String(BODY.length))
      .set('x-line-signature', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')
      .send(BODY_STR);

    expect(res.status).toBe(401);
  });
});
