import { logError, logInfo } from './logger.js';

const RETRY_DELAYS = [200, 600, 1500];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetriableStatus(status) {
  if (!status) return false;
  if (status === 429) return true;
  return status >= 500 && status < 600;
}

export async function replyMessageSafe(client, replyToken, messages) {
  if (!client || typeof client.replyMessage !== 'function') {
    throw new Error('replyMessageSafe requires a valid LINE client');
  }

  const payload = Array.isArray(messages) ? messages : [messages];

  let attempt = 0;
  for (;;) {
    try {
      await client.replyMessage(replyToken, payload);
      logInfo({ scope: 'reply', attempt: attempt + 1, ok: true });
      return;
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      const data = error?.response?.data;
      logError({
        scope: 'reply',
        attempt: attempt + 1,
        ok: false,
        status,
        data,
        message: error instanceof Error ? error.message : 'replyMessage failed',
      });

      if (attempt >= RETRY_DELAYS.length - 1 || !isRetriableStatus(status)) {
        throw error;
      }

      await sleep(RETRY_DELAYS[attempt]);
      attempt += 1;
    }
  }
}
