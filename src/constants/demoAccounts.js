// @author 황희준
// @intent 포트폴리오 데모 자격정보를 URL에 싣지 않고 허용된 역할 키로만 선택하도록 화이트리스트를 관리한다.
export const DEMO_ACCOUNT_KEYS = Object.freeze({
  USER: 'user',
  PROVIDER: 'provider',
  ADMIN: 'admin',
});

const DEMO_ACCOUNTS = Object.freeze({
  [DEMO_ACCOUNT_KEYS.USER]: Object.freeze({
    loginId: 'user',
    password: 'user1234',
    loginPath: '/login',
  }),
  [DEMO_ACCOUNT_KEYS.PROVIDER]: Object.freeze({
    loginId: 'provider',
    password: 'provider1234',
    loginPath: '/login',
  }),
  [DEMO_ACCOUNT_KEYS.ADMIN]: Object.freeze({
    loginId: 'admin',
    password: 'admin1234',
    loginPath: '/admin/login',
  }),
});

export const getDemoAccount = (key) => DEMO_ACCOUNTS[key] ?? null;

export const getMemberDemoAccount = (key) => (
  key === DEMO_ACCOUNT_KEYS.USER || key === DEMO_ACCOUNT_KEYS.PROVIDER
    ? getDemoAccount(key)
    : null
);

export const getAdminDemoAccount = (key) => (
  key === DEMO_ACCOUNT_KEYS.ADMIN ? getDemoAccount(key) : null
);
