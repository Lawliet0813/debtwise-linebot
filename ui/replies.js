export function buildMainQuickReply() {
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '新增債務',
          text: '/add 卡費 50000 14.9% d=25',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '紀錄還款',
          text: '/pay 卡費 3000',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '還款計畫',
          text: '/plan 20000 雪崩',
        },
      },
    ],
  };
}
