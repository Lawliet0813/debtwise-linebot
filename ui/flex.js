const MAX_BUBBLES = 10;
const MAX_NAME_LENGTH = 16;

export function clip(text = '', maxLength = MAX_NAME_LENGTH) {
  const chars = Array.from(text);
  if (chars.length <= maxLength) {
    return text;
  }
  return `${chars.slice(0, Math.max(maxLength - 1, 1)).join('')}…`;
}

export function formatCurrency(value) {
  const num = Number(value) || 0;
  return num
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatRate(value) {
  const num = Number(value) || 0;
  return num
    .toFixed(3)
    .replace(/\.?0+$/, '');
}

export function formatDue(day) {
  return `每月 ${day} 號`;
}

export function buildDebtListBubbles(debts = []) {
  if (!Array.isArray(debts) || debts.length === 0) {
    return [];
  }

  const hasOverflow = debts.length > MAX_BUBBLES;
  const limit = hasOverflow ? MAX_BUBBLES - 1 : MAX_BUBBLES;
  const displayDebts = debts.slice(0, limit);
  const remainingCount = debts.length - displayDebts.length;

  const bubbles = displayDebts.map(buildDebtBubble);

  if (hasOverflow) {
    bubbles.push(buildOverflowBubble(remainingCount));
  }

  return bubbles;
}

export function buildEmptyListBubble() {
  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: '目前沒有債務紀錄',
          weight: 'bold',
          size: 'lg',
        },
        {
          type: 'text',
          text: '輸入 /add 名稱 金額 利率% d=到期日 [min=最低還款] 開始建立你的清單。',
          wrap: true,
        },
      ],
    },
  };
}

export function buildFlexMessage(bubbles, altText = '債務清單') {
  const contents =
    bubbles.length === 1
      ? bubbles[0]
      : {
          type: 'carousel',
          contents: bubbles,
        };

  return {
    type: 'flex',
    altText,
    contents,
  };
}

function buildDebtBubble(debt) {
  const remaining =
    typeof debt.remaining === 'number'
      ? Math.max(debt.remaining, 0)
      : Math.max(Number(debt.balance || 0) - Number(debt.paidSum || 0), 0);
  const paidSum = Number(debt.paidSum || 0);

  const contents = [
    {
      type: 'text',
      text: clip(debt.name ?? '未命名債務'),
      weight: 'bold',
      size: 'lg',
      wrap: true,
    },
    {
      type: 'text',
      text: `💰 餘額：$${formatCurrency(remaining)}`,
      wrap: true,
    },
    {
      type: 'text',
      text: `💸 利率：${formatRate(debt.interest_rate ?? debt.rate ?? 0)}%`,
      wrap: true,
    },
    {
      type: 'text',
      text: `📆 到期：${formatDue(debt.due_day ?? debt.dueDay ?? '-')}`,
      wrap: true,
    },
  ];

  if (paidSum > 0) {
    contents.splice(2, 0, {
      type: 'text',
      text: `✅ 已還：$${formatCurrency(paidSum)}`,
      wrap: true,
    });
  }

  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents,
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '輸入 /pay <名稱> <金額> 可登記還款',
          size: 'xs',
          color: '#888888',
          wrap: true,
        },
      ],
    },
  };
}

function buildOverflowBubble(remainingCount) {
  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: '更多債務',
          weight: 'bold',
          size: 'lg',
        },
        {
          type: 'text',
          text: `…還有 ${remainingCount} 筆債務，輸入 /list 於官方帳號查看完整清單。`,
          wrap: true,
        },
      ],
    },
  };
}

export function buildPlanBubble({
  methodLabel,
  monthlyBudget,
  totalMonths,
  totalInterest,
  firstMonth,
}) {
  const contents = [
    {
      type: 'text',
      text: `${methodLabel} 還款計畫`,
      weight: 'bold',
      size: 'lg',
      wrap: true,
    },
    {
      type: 'text',
      text: `💵 月預算：$${formatCurrency(monthlyBudget)}`,
      wrap: true,
    },
    {
      type: 'text',
      text: `⏱️ 預估 ${totalMonths} 個月清償`,
      wrap: true,
    },
    {
      type: 'text',
      text: `💸 總利息：約 $${formatCurrency(totalInterest)}`,
      wrap: true,
    },
  ];

  if (firstMonth && Array.isArray(firstMonth.items) && firstMonth.items.length > 0) {
    const topItems = firstMonth.items.slice(0, 4);
    const hasMore = firstMonth.items.length > topItems.length;

    contents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `📅 第 ${firstMonth.monthIndex} 個月分配`,
          weight: 'bold',
          size: 'sm',
        },
        ...topItems.map((item) => ({
          type: 'text',
          text: `• ${clip(item.name)}：$${formatCurrency(item.pay)}`,
          size: 'sm',
          wrap: true,
        })),
        ...(hasMore
          ? [
              {
                type: 'text',
                text: '…還有其他債務持續繳款',
                size: 'xs',
                color: '#888888',
              },
            ]
          : []),
      ],
    });
  }

  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents,
    },
  };
}
