import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useLiff } from './hooks/useLiff';
import { motion } from 'framer-motion';

const MotionCard = motion.div;

function HomePage({
  state,
}: {
  state: ReturnType<typeof useLiff>;
}) {
  const { status, profile, error, shareDashboard, closeWindow, refresh, idToken } = state;

  if (status === 'loading') {
    return (
      <ScreenLayout>
        <LoadingState />
      </ScreenLayout>
    );
  }

  if (status === 'error') {
    return (
      <ScreenLayout>
        <ErrorState message={error ?? 'LIFF 初始化失敗'} onRetry={refresh} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <MotionCard
        className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {profile?.pictureUrl ? (
            <motion.img
              key={profile.pictureUrl}
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="h-20 w-20 rounded-full shadow-lg"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {profile?.displayName?.slice(0, 1) ?? 'DW'}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">嗨，{profile?.displayName ?? 'DebtWise 使用者'} 👋</h1>
            <p className="mt-2 text-sm text-slate-600">
              你的還款儀表板已準備就緒，立即查看個人化策略。
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <PrimaryButton onClick={shareDashboard}>分享給好友</PrimaryButton>
          <Link
            to="/dashboard"
            className="flex w-full items-center justify-center rounded-full border border-primary/30 px-5 py-3 text-sm font-medium text-primary transition hover:bg-primary/5"
          >
            查看儀表板
          </Link>
          <SecondaryButton onClick={closeWindow}>關閉視窗</SecondaryButton>
        </div>

        {idToken ? (
          <p className="mt-6 rounded-xl bg-slate-100 p-4 text-[12px] text-slate-500">
            <span className="font-semibold">ID Token</span>：{idToken.slice(0, 24)}...
          </p>
        ) : null}
      </MotionCard>
    </ScreenLayout>
  );
}

function DashboardPage({
  state,
}: {
  state: ReturnType<typeof useLiff>;
}) {
  const { profile, status, error, refresh, idToken } = state;
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string>('尚未驗證 LIFF ID Token');

  useEffect(() => {
    if (!idToken) {
      setVerifyStatus('idle');
      setVerifyMessage('尚未取得 ID Token');
      return;
    }

    let cancelled = false;
    setVerifyStatus('loading');
    setVerifyMessage('正在驗證 ID Token…');

    fetch('/api/verify-idtoken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ token: idToken }),
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && payload.ok) {
          setVerifyStatus('success');
          setVerifyMessage(payload.message ?? 'ID Token 檢查通過（尚未驗證簽章）');
        } else {
          setVerifyStatus('error');
          setVerifyMessage(payload.error ?? '伺服器回傳錯誤');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setVerifyStatus('error');
        setVerifyMessage('ID Token 驗證失敗，請稍後再試。');
      });

    return () => {
      cancelled = true;
    };
  }, [idToken]);

  if (status === 'loading') {
    return (
      <ScreenLayout>
        <LoadingState />
      </ScreenLayout>
    );
  }

  if (status === 'error') {
    return (
      <ScreenLayout>
        <ErrorState message={error ?? 'LIFF 初始化失敗'} onRetry={refresh} />
      </ScreenLayout>
    );
  }

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  return (
    <ScreenLayout>
      <MotionCard
        className="w-full max-w-2xl rounded-3xl bg-white/90 p-8 shadow-xl backdrop-blur"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-xl font-semibold text-slate-900">個人儀表板</h2>
        <p className="mt-2 text-sm text-slate-600">
          以下資訊僅作示範，實際策略會在後端完成後串接。
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <InfoCard title="用戶名稱" value={profile.displayName} />
          <InfoCard title="顯示名稱" value={profile.statusMessage ?? '未設定'} />
          <InfoCard title="用戶 ID" value={profile.userId} copyable />
          <InfoCard
            title="圖片"
            value={profile.pictureUrl ? <img src={profile.pictureUrl} alt="profile" className="h-20 w-20 rounded-full object-cover" /> : '無'}
          />
        </div>

        <div className="mt-6">
          <VerificationBadge status={verifyStatus} message={verifyMessage} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            ← 返回首頁
          </Link>
        </div>
      </MotionCard>
    </ScreenLayout>
  );
}

function HealthPage() {
  return (
    <ScreenLayout>
      <MotionCard
        className="rounded-3xl bg-white/90 px-6 py-10 text-center text-xl font-semibold text-green-600 shadow-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        OK LIFF
      </MotionCard>
    </ScreenLayout>
  );
}

function ScreenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-accent/10 px-4 py-12">
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <motion.div
      className="flex items-center gap-3 rounded-3xl bg-white/80 px-6 py-4 text-slate-600 shadow"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="h-3 w-3 animate-ping rounded-full bg-primary"></span>
      正在載入 LIFF...
    </motion.div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-3 rounded-3xl bg-white/80 px-6 py-6 text-center text-sm text-red-600 shadow"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p>{message}</p>
      <PrimaryButton onClick={onRetry}>重新載入</PrimaryButton>
    </motion.div>
  );
}

function InfoCard({ title, value, copyable }: { title: string; value: React.ReactNode; copyable?: boolean }) {
  const content = typeof value === 'string' ? value : null;

  const handleCopy = () => {
    if (!content) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content).catch((err) => {
        console.error('[Clipboard] copy failed', err);
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm text-slate-700">
        <div className="break-all">{value}</div>
        {copyable && content ? (
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-500 transition hover:bg-slate-100"
            onClick={handleCopy}
          >
            複製
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-white shadow transition hover:bg-primary/90"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function VerificationBadge({ status, message }: { status: 'idle' | 'loading' | 'success' | 'error'; message: string }) {
  const color =
    status === 'success'
      ? 'bg-green-100 text-green-700 border-green-200'
      : status === 'error'
        ? 'bg-red-100 text-red-700 border-red-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${color}`}>
      <span className="h-2 w-2 rounded-full bg-current"></span>
      <span>{message}</span>
      {status === 'error' ? (
        <span className="text-xs text-slate-500">正式環境請使用 LINE OpenID 公鑰驗證簽章。</span>
      ) : null}
    </div>
  );
}

export default function App() {
  const liffState = useLiff();

  return (
    <Routes>
      <Route path="/" element={<HomePage state={liffState} />} />
      <Route path="/dashboard" element={<DashboardPage state={liffState} />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
