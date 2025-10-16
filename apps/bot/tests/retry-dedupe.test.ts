import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { replyMessageSafe } from '../src/utils/replySafe.js';
import { shouldProcessOnce, __clearDedupeCache } from '../src/utils/dedupe.js';

const createError = (status) => {
  const error = new Error(`HTTP ${status}`);
  error.status = status;
  error.response = { status, data: { message: `status ${status}` } };
  return error;
};

describe('replyMessageSafe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries on 429/5xx and eventually succeeds', async () => {
    const replyMessage = vi
      .fn()
      .mockRejectedValueOnce(createError(429))
      .mockRejectedValueOnce(createError(503))
      .mockResolvedValueOnce(undefined);

    const promise = replyMessageSafe({ replyMessage }, 'token', [{ type: 'text', text: 'hi' }]);

    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(600);
    await vi.advanceTimersByTimeAsync(1500);

    await promise;

    expect(replyMessage).toHaveBeenCalledTimes(3);
  });
});

describe('dedupe utility', () => {
  beforeEach(() => {
    __clearDedupeCache();
  });

  afterEach(() => {
    delete process.env.DEBUG_LOCAL;
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_CHANNEL_SECRET;
    delete process.env.LIFF_ID;
  });

  it('processes only once within TTL', () => {
    const key = 'event-1';
    expect(shouldProcessOnce(key)).toBe(true);
    expect(shouldProcessOnce(key)).toBe(false);
  });

  it('skips duplicated redelivery events in handleEvent', async () => {
    process.env.DEBUG_LOCAL = '1';
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
    process.env.LINE_CHANNEL_SECRET = 'test-secret';
    process.env.LIFF_ID = '';

    const handlers = await import('../src/handlers.js');
    const replyMessage = vi.fn();
    handlers.configureHandlers({ client: { replyMessage } });

    const event = {
      replyToken: 'test-token',
      type: 'message',
      deliveryContext: { isRedelivery: true },
      message: { type: 'text', text: 'dashboard', id: 'msg-1' },
      source: { userId: 'U123' },
    };

    const first = await handlers.handleEvent(event);
    const second = await handlers.handleEvent(event);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(replyMessage).not.toHaveBeenCalled();
  });
});
