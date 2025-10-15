import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { createEventHandler } from '../src/handlers.js';
import { loadDashboardFlex } from '../src/flex.js';

const channelSecret = 'test-secret';
const channelToken = 'test-token';

function createSignature(body) {
  const hmac = crypto.createHmac('sha256', channelSecret);
  hmac.update(JSON.stringify(body));
  return hmac.digest('base64');
}

describe('bot application', () => {
  let replyMessage;
  let app;

  const networkAvailable = process.env.ENABLE_HTTP_TESTS === 'true';

  beforeEach(() => {
    replyMessage = vi.fn().mockResolvedValue(undefined);
    app = createApp({
      lineConfig: {
        channelAccessToken: channelToken,
        channelSecret,
      },
      lineClient: { replyMessage },
      liffId: 'TEST_LIFF',
    });
  });

  const maybe = networkAvailable ? it : it.skip;

  maybe('returns OK BOT on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK BOT');
  });

  maybe('serves sample flex JSON', async () => {
    const res = await request(app).get('/flex/sample');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('bubble');
  });

  maybe('handles "開啟儀表板" message via webhook', async () => {
    const event = {
      replyToken: 'reply-token',
      type: 'message',
      message: { type: 'text', text: '開啟儀表板' },
    };
    const body = { events: [event] };
    const signature = createSignature(body);

    const res = await request(app)
      .post('/webhook')
      .set('content-type', 'application/json')
      .set('x-line-signature', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(replyMessage).toHaveBeenCalledWith('reply-token', [expect.objectContaining({
      type: 'flex',
      altText: expect.stringContaining('DebtWise'),
    })]);
  });

  it('creates flex message via handler without HTTP server', async () => {
    const handler = createEventHandler({
      client: { replyMessage },
      liffId: 'DIRECT_TEST',
      flexBuilder: loadDashboardFlex,
    });

    await handler({
      replyToken: 'token-123',
      type: 'message',
      message: { type: 'text', text: '開啟儀表板' },
    });

    expect(replyMessage).toHaveBeenCalledWith('token-123', [expect.objectContaining({
      type: 'flex',
    })]);
  });
});
