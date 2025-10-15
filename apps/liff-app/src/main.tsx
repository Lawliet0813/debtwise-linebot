import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import liff from '@line/liff';
import App from './App';
import './index.css';

declare global {
  interface Window {
    __LIFF_INIT_ERROR?: string;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('應用程式載入失敗：找不到 root 節點');
}

const liffId = import.meta.env.VITE_LIFF_ID as string | undefined;

async function bootstrap() {
  if (!liffId) {
    const message = '缺少 VITE_LIFF_ID，請確認環境設定。';
    console.error('[LIFF] init skipped:', message);
    if (typeof window !== 'undefined') {
      window.__LIFF_INIT_ERROR = message;
    }
  } else {
    try {
      await liff.init({ liffId });
      console.info('[LIFF] 初始化成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[LIFF] 初始化失敗:', message);
      if (typeof window !== 'undefined') {
        window.__LIFF_INIT_ERROR = message;
      }
    }
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

bootstrap();
