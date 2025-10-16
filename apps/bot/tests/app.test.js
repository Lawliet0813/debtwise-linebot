import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { computeLineSignature } from '../src/utils/signature.js';

const BODY_STR = '{"events":[{"replyToken":"test","type":"message","message":{"type":"text","text":"開啟儀表板"}}]}';
const BODY_BUFFER = Buffer.from(BODY_STR, 'utf8');

async function bootstrap({ debugLocal = '1' } = {}) {
  vi.resetModules();
  process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
  process.env.LINE_CHANNEL_SECRET = 'test-secret';
  process.env.DEBUG_LOCAL = debugLocal;
  process.env.DEBUG_TEST_MODE = '0';
  process.env.VITE_LIFF_ID = 'LIFF_ID';
  process.env.LOGIN_CHANNEL_ID = 'CHANNEL_ID';
  process.env.LOGIN_ISSUER = 'https://access.line.me';

  const appModule = await import('../src/app.js');
  const handlersModule = await import('../src/handlers.js');
  const replyMessage = vi.fn().mockResolvedValue(undefined);

  handlersModule.configureHandlers({
    client: { replyMessage },
  });

  const app = appModule.default;

  return { app, replyMessage, handleEvent: handlersModule.handleEvent };
}

describe('bot application', () => {
  const networkAvailable = process.env.ENABLE_HTTP_TESTS === 'true';
  const maybe = networkAvailable ? it : it.skip;

  maybe('provides health check endpoint', async () => {
    const { app } = await bootstrap();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  maybe('skips reply for local debug events', async () => {
    const { replyMessage, handleEvent } = await bootstrap({ debugLocal: '1' });
    await handleEvent({
      replyToken: 'test',
      type: 'message',
      message: { type: 'text', text: 'hi' },
    });
    expect(replyMessage).not.toHaveBeenCalled();
  });

  maybe('handles webhook request with valid signature', async () => {
    const { app, replyMessage } = await bootstrap({ debugLocal: '0' });
    const signature = computeLineSignature(process.env.LINE_CHANNEL_SECRET, BODY_BUFFER);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', signature)
      .set('Content-Length', String(BODY_BUFFER.length))
      .send(BODY_STR);

    expect(res.status).toBe(200);
    expect(replyMessage).toHaveBeenCalled();
  });
});
