const PRIMARY_COLOR = '#4A90E2';

const buildButtonAction = (userId, liffId) => {
  if (liffId) {
    const ts = Date.now();
    const query = new URLSearchParams();
    if (userId) {
      query.set('userId', userId);
    }
    query.set('t', String(ts));
    return `https://liff.line.me/${liffId}?${query.toString()}`;
  }
  return 'https://debtwise.app/dashboard';
};

export function buildDashboardFlex(userId = '') {
  const liffId = process.env.LIFF_ID || process.env.VITE_LIFF_ID || '';
  const uri = buildButtonAction(userId, liffId);

  return {
    type: 'flex',
    altText: 'DebtWise 儀表板',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: 'DebtWise 儀表板',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
            wrap: true,
          },
          {
            type: 'text',
            text: '查看個人還款進度與建議',
            size: 'sm',
            color: '#EAEDF2',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: PRIMARY_COLOR,
            action: {
              type: 'uri',
              label: '開啟',
              uri,
            },
          },
        ],
      },
      styles: {
        body: {
          backgroundColor: '#1F2940',
        },
        footer: {
          backgroundColor: '#131B2C',
        },
      },
    },
  };
}
