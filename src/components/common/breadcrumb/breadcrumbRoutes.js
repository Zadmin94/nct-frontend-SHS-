// 담당자 7 · 공통 브레드크럼 대상과 고정 정보 구조
// ─────────────────────────────────────────────────────────────────────────────
// 브레드크럼 중앙 맵 — "어떤 경로에서 브레드크럼을 보여줄지"와 "라벨을 뭐라고 쓸지"를
// 이 파일 한 곳에서만 관리한다. (라우트 정의 파일 AppRoutes.jsx는 건드리지 않기 위해
// 별도 맵으로 분리 — 라우트 파일은 담당자1 소유이기도 하고, 선언형 <Routes>에는
// 라벨 메타데이터를 붙일 자리가 없다)
//
// 구조:
//  - BREADCRUMB_ROUTES  : 브레드크럼을 표시할 "대상 페이지" 목록.
//                         여기 등록된 경로만 브레드크럼이 나오고, 미등록 경로(목록/랜딩 등)는
//                         자동으로 아무것도 표시되지 않는다.
//  - 진입 경로(state.from)는 검증된 마이페이지 메뉴일 때만 상위 경로로 반영한다.
//    알림·검색·홈처럼 단순히 거쳐 온 화면은 브레드크럼 계층에 넣지 않는다.
//  - 사이드 메뉴가 위치를 이미 보여 주는 마이페이지·고객센터, 관리자, 프로필은 등록하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getMyPageInquiryPath,
  getMyPagePath,
  getServiceTradeChatPath,
  getServiceTradeDetailPath,
} from '@/routes/myPageRoutes';
import {
  getServiceRequestDetailPath,
  getServiceRequestQuoteCreatePath,
  getServiceRequestQuoteDetailPath,
  getServiceRequestQuoteEditPath,
  SERVICE_REQUEST_CREATE_PATH,
  SERVICE_REQUEST_DETAIL_ROUTE,
} from '@/routes/serviceRequestRoutes';

// 항목 형태: { label: '표시명', to: '이동 경로' } — to가 없으면 링크 없이 텍스트만 표시
export const HOME_ITEM = { label: '홈', to: '/' };

// 마이페이지 계층 경로 → 사이드바에 표시되는 실제 메뉴명 (MyPageSidebar.jsx 기준)
export const MYPAGE_SECTION_LABELS = {
  'auction-bids': '상품 구매 목록',
  'auction-sales': '상품 판매 목록',
  'service-requests': '내 서비스 요청 목록',
  wishlist: '관심 경매',
  chat: '채팅',
  wallet: '포인트 지갑',
  profile: '프로필',
  quote: '견적 제출 내역',
  review: '내 리뷰',
  'service-trade': '서비스 거래',
  'received-review': '받은 리뷰',
  'report-list': '내 신고 목록',
  'inquiry-list': '1:1 문의',
};

// 마이페이지 트레일 생성 헬퍼 — 사이드 메뉴 밖의 독립 상세·작성 화면에서 재사용한다.
// sectionKey가 있으면 "마이페이지 > 섹션명" 두 단계, 없으면 "마이페이지" 한 단계.
export const buildMyPageTrail = (sectionKey, isProvider = false) => {
  const base = [{ label: '마이페이지', to: '/user/mypage' }];
  const sectionLabel = MYPAGE_SECTION_LABELS[sectionKey];
  return sectionLabel
    ? [...base, {
      label: sectionLabel,
      to: sectionKey === 'inquiry-list'
        ? getMyPageInquiryPath(isProvider)
        : getMyPagePath(sectionKey),
    }]
    : base;
};

// ─────────────────────────────────────────────────────────────────────────────
// 브레드크럼 대상 페이지 목록.
//  - pageLabel     : 마지막 항목(현재 페이지)에 표시할 고정 라벨 (실제 데이터 제목은 넣지 않음 — 사용자 확정)
//  - defaultTrail  : 진입 위치와 무관한 "정보 구조상의 정식 상위 경로".
//                    경로 파라미터가 필요하면 함수로 정의한다.
//  - hidden: true  : 파라미터 패턴과 URL이 겹치는 목록 페이지를 명시적으로 제외하기 위한 표시
//
// ※ matchPath는 배열 순서대로 첫 매치를 쓰므로, 구체 경로(/services/requests/new)를
//    파라미터 경로(/services/requests/:svcReqSn)보다 반드시 앞에 둔다.
// ─────────────────────────────────────────────────────────────────────────────
export const BREADCRUMB_ROUTES = [
  // 경매
  {
    pattern: '/auction/:auctionId/trade/review/new',
    pageLabel: '리뷰 작성',
    defaultTrail: ({ auctionId }) => [
      { label: '경매 상세', to: `/auction/${auctionId}` },
      { label: '거래 상세', to: `/auction/${auctionId}/trade` },
    ],
  },
  {
    pattern: '/auction/:auctionId/trade/review/edit',
    pageLabel: '리뷰 수정',
    defaultTrail: ({ auctionId }) => [
      { label: '경매 상세', to: `/auction/${auctionId}` },
      { label: '거래 상세', to: `/auction/${auctionId}/trade` },
    ],
  },
  {
    pattern: '/auction/:auctionId/trade',
    pageLabel: '거래 상세',
    // 거래 상세는 경매 상세의 하위 탐색 화면이 아니라 마이페이지에서 관리하는 거래 화면이다.
    // 구매·판매 역할별 상위 메뉴는 거래 조회 후 AuctionTradeDetailPage가 고정 오버라이드한다.
    defaultTrail: [],
  },
  {
    pattern: '/auction/:auctionId',
    pageLabel: '경매 상세',
    defaultTrail: [{ label: '경매', to: '/auction' }],
  },

  // 서비스 요청 — /new, /me가 :svcReqSn 패턴과 겹치므로 구체 경로 먼저
  {
    // 일반회원이 헤더에서 바로 진입하는 독립 작성 화면이라 상위는 홈만 둔다.
    pattern: SERVICE_REQUEST_CREATE_PATH,
    pageLabel: '서비스 요청 작성',
    defaultTrail: [],
  },
  {
    pattern: getServiceRequestQuoteCreatePath(':svcReqSn'),
    pageLabel: '견적 작성',
    defaultTrail: ({ svcReqSn }) => [
      { label: '서비스 요청 상세', to: getServiceRequestDetailPath(svcReqSn) },
    ],
  },
  {
    pattern: getServiceRequestQuoteEditPath(':svcReqSn', ':quoteId'),
    pageLabel: '견적 수정',
    defaultTrail: ({ svcReqSn }) => [
      { label: '서비스 요청 상세', to: getServiceRequestDetailPath(svcReqSn) },
    ],
  },
  {
    pattern: getServiceRequestQuoteDetailPath(':svcReqSn', ':quoteId'),
    pageLabel: '견적 상세',
    defaultTrail: ({ svcReqSn }) => [
      { label: '서비스 요청 상세', to: getServiceRequestDetailPath(svcReqSn) },
    ],
  },
  {
    // 일반회원과 제공자가 같은 상세 화면을 사용하므로 역할별 목록을 상위로 단정하지 않는다.
    pattern: SERVICE_REQUEST_DETAIL_ROUTE,
    pageLabel: '서비스 요청 상세',
    defaultTrail: [],
  },

  // 물건 거래 (구매자/판매자/채팅)
  {
    pattern: '/trades/:tradeId/chat',
    pageLabel: '거래 채팅',
    defaultTrail: buildMyPageTrail('chat'),
  },
  {
    pattern: '/trades/:tradeId/seller',
    pageLabel: '거래 상세',
    defaultTrail: buildMyPageTrail('auction-sales'),
  },
  {
    pattern: '/trades/:tradeId',
    pageLabel: '거래 상세',
    defaultTrail: buildMyPageTrail('auction-bids'),
  },
  {
    pattern: getServiceTradeChatPath(':tradeId'),
    pageLabel: '서비스 채팅',
    defaultTrail: ({ tradeId }) => [
      ...buildMyPageTrail('service-trade'),
      { label: '서비스 거래 상세', to: getServiceTradeDetailPath(tradeId) },
    ],
  },
  {
    // 담당자 7: 서비스 거래 상세는 마이페이지의 서비스 거래 목록을 고정 상위로 사용한다.
    pattern: getServiceTradeDetailPath(':tradeId'),
    pageLabel: '서비스 거래 상세',
    defaultTrail: buildMyPageTrail('service-trade'),
  },

  // 상품
  {
    pattern: '/product/register',
    pageLabel: '상품 등록',
    defaultTrail: [{ label: '경매', to: '/auction' }],
  },
  {
    pattern: '/product/:prdSn/seller',
    pageLabel: '상품 상세',
    defaultTrail: buildMyPageTrail('auction-sales'),
  },

  // 마이페이지 사이드 메뉴 밖에서 열리는 1:1 문의 작성 화면
  {
    pattern: '/user/mypage/provider/inquiries/new',
    pageLabel: '문의 작성',
    defaultTrail: buildMyPageTrail('inquiry-list', true),
  },
  {
    pattern: '/user/mypage/inquiries/new',
    pageLabel: '문의 작성',
    defaultTrail: buildMyPageTrail('inquiry-list'),
  },

  // 제공자
  {
    pattern: '/provider/apply',
    pageLabel: '제공자 신청',
    defaultTrail: [{ label: '마이페이지', to: '/user/mypage' }],
  },
  {
    pattern: '/provider/applications/status',
    pageLabel: '제공자 신청 현황',
    defaultTrail: [{ label: '마이페이지', to: '/user/mypage' }],
  },
];
