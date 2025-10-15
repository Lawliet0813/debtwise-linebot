import { useCallback, useEffect, useMemo, useState } from 'react';
import liff, { type Liff, type Profile } from '@line/liff';

type LiffStatus = 'loading' | 'ready' | 'error';

interface UseLiffResult {
  status: LiffStatus;
  liff: Liff | null;
  profile: Profile | null;
  idToken: string | null;
  error: string | null;
  shareDashboard: () => Promise<void>;
  closeWindow: () => void;
  refresh: () => Promise<void>;
}

const missingLiffIdMessage =
  '缺少 LIFF ID，請在 apps/liff-app/.env.local 設定 VITE_LIFF_ID。';

export function useLiff(): UseLiffResult {
  const [status, setStatus] = useState<LiffStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [instance, setInstance] = useState<Liff | null>(null);

  const liffId = useMemo(() => import.meta.env.VITE_LIFF_ID as string | undefined, []);

  const initialize = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!liffId) {
      setError(missingLiffIdMessage);
      setStatus('error');
      return;
    }

    try {
      setStatus('loading');
      await liff.init({ liffId });
      setInstance(liff);

      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }

      const profileData = await liff.getProfile();
      setProfile(profileData);
      setIdToken(liff.getIDToken() ?? null);
      setStatus('ready');
      setError(null);
    } catch (err) {
      console.error('[LIFF] init failed', err);
      setError(err instanceof Error ? err.message : 'LIFF 初始化失敗，請稍後再試。');
      setStatus('error');
    }
  }, [liffId]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const shareDashboard = useCallback(async () => {
    if (!instance) {
      return;
    }

    try {
      if (instance.isApiAvailable('shareTargetPicker')) {
        await instance.shareTargetPicker([
          {
            type: 'text',
            text: '我的 DebtWise 儀表板已準備就緒，立即查看專屬策略 👉',
          },
          {
            type: 'text',
            text: 'https://liff.line.me/' + (import.meta.env.VITE_LIFF_ID ?? ''),
          },
        ]);
      } else {
        await instance.sendMessages([
          {
            type: 'text',
            text: '前往我的 DebtWise 儀表板：https://liff.line.me/' + (import.meta.env.VITE_LIFF_ID ?? ''),
          },
        ]);
      }
    } catch (err) {
      console.error('[LIFF] share failed', err);
      setError('分享時發生錯誤，請稍後再試。');
    }
  }, [instance]);

  const closeWindow = useCallback(() => {
    if (!instance) {
      return;
    }
    if (instance.isInClient()) {
      instance.closeWindow();
    } else {
      window.close();
    }
  }, [instance]);

  return {
    status,
    liff: instance,
    profile,
    idToken,
    error,
    shareDashboard,
    closeWindow,
    refresh: initialize,
  };
}
