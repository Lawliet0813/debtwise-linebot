export function createEventHandler({ client, liffId, flexBuilder }) {
  if (!client || typeof client.replyMessage !== 'function') {
    throw new Error('LINE client 未正確設定');
  }

  const dashboardFlex = () => flexBuilder(liffId);

  return async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return null;
    }

    const text = (event.message.text || '').trim();

    if (text === '開啟儀表板') {
      const bubble = dashboardFlex();
      const message = {
        type: 'flex',
        altText: '開啟 DebtWise 儀表板',
        contents: bubble,
      };

      await client.replyMessage(event.replyToken, [message]);
      return message;
    }

    // Echo fallback
    await client.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '輸入「開啟儀表板」即可開啟 LIFF。其他功能開發中。',
      },
    ]);

    return null;
  };
}
