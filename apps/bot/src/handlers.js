import { buildDashboardFlex } from './flex/dashboard.js';
import { replyMessageSafe } from './utils/replySafe.js';
import { shouldProcessOnce } from './utils/dedupe.js';
import { logError, logInfo } from './utils/logger.js';

let lineClient = null;

export function configureHandlers({ client } = {}) {
  lineClient = client ?? null;
}

export function routeTextCommand(inputText = '', context = {}) {
  const text = (inputText ?? '').trim();
  const normalized = text.toLowerCase();
  const commands = {
    help: ['help', '說明'],
    dashboard: ['dashboard', '開啟儀表板'],
  };

  if (commands.help.includes(normalized)) {
    return {
      command: 'help',
      messages: [
        {
          type: 'text',
          text: [
            '可用指令：',
            '• help / 說明：查看指令列表',
            '• dashboard / 開啟儀表板：打開 DebtWise 儀表板',
          ].join('\n'),
        },
      ],
    };
  }

  if (commands.dashboard.includes(normalized)) {
    const userId = context.userId ?? '';
    return {
      command: 'dashboard',
      messages: [buildDashboardFlex(userId)],
    };
  }

  return {
    command: 'fallback',
    messages: [
      {
        type: 'text',
        text: '我還不懂這句話，輸入 help 查看使用方式。',
      },
    ],
  };
}

const IS_LOCAL = process.env.DEBUG_LOCAL === '1';

function shouldSkipReply(replyToken) {
  return IS_LOCAL || replyToken === 'test' || !replyToken;
}

export async function handleEvent(event) {
  if (!event) return null;

  if (event.deliveryContext?.isRedelivery) {
    const dedupeKey = event.message?.id ?? event.replyToken ?? '';
    if (!shouldProcessOnce(dedupeKey)) {
      logInfo({ scope: 'dedupe', key: dedupeKey, skipped: true });
      return null;
    }
  }

  if (event.type !== 'message' || event.message?.type !== 'text') {
    return null;
  }

  const { replyToken } = event;
  const userId = event.source?.userId ?? '';
  const { command, messages } = routeTextCommand(event.message?.text ?? '', { userId });

  const dryRun = shouldSkipReply(replyToken);
  logInfo({
    scope: 'command',
    cmd: command,
    userId,
    dryRun,
  });

  if (dryRun) {
    return messages;
  }

  if (!lineClient || typeof lineClient.replyMessage !== 'function') {
    const error = new Error('LINE client 尚未設定');
    logError({ scope: 'command', cmd: command, userId, dryRun, ok: false, message: error.message });
    throw error;
  }

  try {
    await replyMessageSafe(lineClient, replyToken, messages);
    logInfo({ scope: 'command', cmd: command, userId, ok: true });
    return messages;
  } catch (error) {
    const status = error?.status ?? error?.response?.status;
    const data = error?.response?.data;
    logError({
      scope: 'command',
      cmd: command,
      userId,
      ok: false,
      status,
      data,
      message: error instanceof Error ? error.message : 'replyMessage failed',
    });
    throw error;
  }
}
