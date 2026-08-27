// 담당자 7 경로 통합: 마이페이지 화면은 query가 아니라 상위→하위 계층 URL을 사용합니다.
export const MYPAGE_SECTION_PATHS = Object.freeze({
  home: '/user/mypage',
  profile: '/user/mypage/profile',
  'auction-bids': '/user/mypage/auctions/purchases',
  'auction-sales': '/user/mypage/auctions/sales',
  wishlist: '/user/mypage/auctions/favorites',
  'service-requests': '/user/mypage/services/requests',
  'service-trade': '/user/mypage/services/trades',
  quote: '/user/mypage/services/quotes',
  'received-review': '/user/mypage/services/reviews/received',
  chat: '/user/mypage/chat',
  wallet: '/user/mypage/wallet',
  review: '/user/mypage/reviews',
  'report-list': '/user/mypage/reports',
  'inquiry-list': '/user/mypage/inquiries',
});

// 담당자 7 · F-PROV-004/005: 제공자 프로필 관리를 단일 메뉴의 하위 탭 경로로 통합합니다.
export const MYPAGE_PROFILE_TAB_PATHS = Object.freeze({
  account: MYPAGE_SECTION_PATHS.profile,
  provider: `${MYPAGE_SECTION_PATHS.profile}/provider`,
  portfolio: `${MYPAGE_SECTION_PATHS.profile}/portfolio`,
});

export const LEGACY_PROVIDER_PROFILE_PATH = '/user/mypage/provider/profile';

export const MYPAGE_INQUIRY_PATHS = Object.freeze({
  general: '/user/mypage/inquiries',
  provider: '/user/mypage/provider/inquiries',
});

export const getMyPageInquiryPath = (isProvider = false) => (
  isProvider ? MYPAGE_INQUIRY_PATHS.provider : MYPAGE_INQUIRY_PATHS.general
);

export const getMyPageInquiryCreatePath = (isProvider = false) => (
  `${getMyPageInquiryPath(isProvider)}/new`
);

export const getMyPagePath = (section = 'home') => (
  MYPAGE_SECTION_PATHS[section] ?? MYPAGE_SECTION_PATHS.home
);

/** 담당자 7 · F-SVC-010: 마이페이지 서비스 거래 상세의 단일 사용자 경로입니다. */
export const getServiceTradeDetailPath = (tradeId) => (
  `${MYPAGE_SECTION_PATHS['service-trade']}/${tradeId}`
);

/** 담당자 7 · F-SVC-010: 서비스 거래 상세에 종속된 채팅 경로입니다. */
export const getServiceTradeChatPath = (tradeId) => (
  `${getServiceTradeDetailPath(tradeId)}/chat`
);

export const getMyPageSection = (pathname) => {
  if (Object.values(MYPAGE_PROFILE_TAB_PATHS).includes(pathname)
    || pathname === LEGACY_PROVIDER_PROFILE_PATH) {
    return 'profile';
  }

  if (pathname === MYPAGE_INQUIRY_PATHS.provider
    || pathname.startsWith(`${MYPAGE_INQUIRY_PATHS.provider}/`)) {
    return 'inquiry-list';
  }

  if (pathname === MYPAGE_INQUIRY_PATHS.general
    || pathname.startsWith(`${MYPAGE_INQUIRY_PATHS.general}/`)) {
    return 'inquiry-list';
  }

  return Object.entries(MYPAGE_SECTION_PATHS)
    .find(([, path]) => path === pathname)?.[0] ?? null;
};
