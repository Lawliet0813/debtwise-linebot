import '@testing-library/jest-dom/vitest';

vi.stubEnv('VITE_LIFF_ID', 'TEST_LIFF_ID');

vi.mock('@line/liff', () => {
  const profile = {
    displayName: '測試用戶',
    userId: 'U1234567890',
    pictureUrl: '',
    statusMessage: 'Hello Vitest',
  };

  const liff = {
    init: vi.fn().mockResolvedValue(undefined),
    isLoggedIn: vi.fn(() => true),
    login: vi.fn(),
    getProfile: vi.fn().mockResolvedValue(profile),
    getIDToken: vi.fn(() => 'TEST_TOKEN'),
    shareTargetPicker: vi.fn().mockResolvedValue(undefined),
    sendMessages: vi.fn().mockResolvedValue(undefined),
    isApiAvailable: vi.fn(() => false),
    closeWindow: vi.fn(),
    isInClient: vi.fn(() => false),
  };

  return { default: liff, ...liff };
});

vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ ok: true, message: 'mock verified' }),
  }),
));
