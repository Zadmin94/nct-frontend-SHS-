// src/routes/AppRoutes.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 전체 라우트 정의 — 랜딩 / 공개 독립 페이지 / 일반 회원 / 관리자 영역으로 구분
// 로그인이 필요한 경로는 ProtectedRoute 로 감싸 인증 여부를 검사합니다.
//
// ※ 파일 소유: 황희준(담당자1)
//    라우트 추가·수정은 황희준에게 전달 후 반영. 임시로 추가된 상품 라우트
//    (/product/register, /product/:prdSn/seller) 도 최종 통합 시
//    황희준에게 전달해 ProtectedRoute 구조에 맞게 정리 필요.
//    판매 목록은 계층 경로 /user/mypage/auctions/sales 한 곳에서 제공합니다.
// ─────────────────────────────────────────────────────────────────────────────
import { Navigate, Outlet, Routes, Route, useLocation, useParams } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import {
  getServiceTradeChatPath,
  getServiceTradeDetailPath,
  LEGACY_PROVIDER_PROFILE_PATH,
  MYPAGE_INQUIRY_PATHS,
  MYPAGE_PROFILE_TAB_PATHS,
  MYPAGE_SECTION_PATHS,
} from './myPageRoutes';
import {
  SERVICE_REQUEST_CREATE_PATH,
  SERVICE_REQUEST_DETAIL_ROUTE,
  SERVICE_REQUESTS_PATH,
} from './serviceRequestRoutes';

// Layouts
import LandingLayout from '@layouts/LandingLayout';
import UserLayout    from '@layouts/UserLayout';
import AdminLayout   from '@layouts/AdminLayout';
import AuthLayout    from '@layouts/AuthLayout';
import CustomerSupportLayout from '@layouts/CustomerSupportLayout';

// ──────────────────────────────────────────
// 공개 페이지
// ──────────────────────────────────────────
import LandingPage        from '@pages/landing/LandingPage';
import AuctionListPage    from '@pages/auction/AuctionListPage';
import AuctionDetailPage  from '@pages/auction/AuctionDetailPage';
import LoginPage          from '@pages/auth/LoginPage';
import AdminLoginPage     from '@pages/auth/AdminLoginPage';
import SignupPage         from '@pages/auth/SignupPage';
import FindEmailPage      from '@pages/auth/FindEmailPage';
import ResetPasswordPage  from '@pages/auth/ResetPasswordPage';
import WithdrawalRequestPage from '@pages/auth/WithdrawalRequestPage';
import OAuthRedirectHandler from '@pages/auth/OAuthRedirectHandler';
import OAuthOnboardingPage from '@pages/auth/OAuthOnboardingPage';

// 에러 페이지
import NotFoundPage   from '@pages/error/NotFoundPage';
import ServerErrorPage from '@pages/error/ServerErrorPage';
import Unauthorized   from '@pages/error/Unauthorized';

// ──────────────────────────────────────────
// UserLayout (공개 조회 가능)
// ──────────────────────────────────────────
//import MainPage        from '@pages/main/MainPage';

// ──────────────────────────────────────────
// UserLayout (로그인 필요)
// ──────────────────────────────────────────
import MyPage from '@pages/user/MyPage';
import TradeDetailBuyer from '@pages/trade/TradeDetailBuyer';
import TradeDetailSeller from '@pages/trade/TradeDetailSeller';
import AuctionTradeDetailPage from '@pages/trade/AuctionTradeDetailPage';
import LegacyTradeRedirect from '@pages/trade/LegacyTradeRedirect';
import TradeChat from '@pages/trade/TradeChat';
// 담당자 7 공개 콘텐츠 route. 공통 route 소유자(담당자 1)에게 동일 manifest로 전달합니다.
import GuidePage from '@pages/content/GuidePage';
import FaqPage from '@pages/content/FaqPage';
import NoticeListPage from '@pages/content/NoticeListPage';
import NoticeDetailPage from '@pages/content/NoticeDetailPage';
import CustomerInquiryFormPage from '@pages/content/CustomerInquiryFormPage';
import ServiceListPage from '@pages/service/ServiceListPage';
import PublicProviderProfilePage from '@pages/provider/PublicProviderProfilePage';
import ProviderApplyPage from '@pages/provider/ProviderApplyPage';
import ProviderApplicationStatusPage from '@pages/provider/ProviderApplicationStatusPage';
import NotificationPage from '@pages/user/notification/NotificationPage';
import QuoteFormPage from '@pages/provider/QuoteFormPage';
import ReviewListPage from '@pages/user/ReviewListPage';
import PublicTradeProfilePage from '@pages/user/PublicTradeProfilePage';
import MyPageReviewLayout from '@layouts/MyPageReviewLayout';
import LegacyReviewRedirect from '@pages/user/LegacyReviewRedirect';

// 담당자 7 병합 검증: develop의 상품 route가 참조하는 페이지 import가 누락되어 런타임 빈 화면이 발생해 복구했습니다.
// 임시 코드는 아니며 상품 기능의 구현·소유권은 기존 상품 담당자에게 그대로 있습니다.
import ProductRegisterPage from '@pages/product/ProductRegisterPage';
import ProductDetailSellerPage from '@pages/product/ProductDetailSellerPage';

// F-SVC-001~004: 서비스 요청서 작성/임시저장 폼
import ServiceRequestFormPage from '@pages/service/ServiceRequestFormPage';
// F-SVC-003~004: 서비스 요청서 상세 조회/관리
import ServiceRequestDetailPage from '@pages/service/ServiceRequestDetailPage';
import QuoteDetailPage from '@pages/service/QuoteDetailPage';
import ServiceTradeDetailRoutePage from '@pages/service/ServiceTradeDetailRoutePage';
import {
  ADMIN_AUCTION_DETAIL_ROUTE,
  ADMIN_AUCTIONS_ROUTE,
  ADMIN_FUNDS_ROUTE,
  ADMIN_OPERATIONS_RECORDS_ROUTE,
  ADMIN_PROVIDER_APPLICATIONS_ROUTE,
  ADMIN_REPORT_DETAIL_ROUTE,
  ADMIN_REPORTS_ROUTE,
  ADMIN_SERVICE_REQUEST_DETAIL_ROUTE,
  ADMIN_SERVICE_REQUESTS_ROUTE,
  ADMIN_SERVICE_TRADE_DETAIL_ROUTE,
  ADMIN_SETTINGS_ROUTE,
} from './adminRoutes';

/** 담당자 7 경로 정리: 죽은 목록 주소가 동적 상세 ID로 오인되지 않게 숫자 요청 번호만 허용합니다. */
const ServiceRequestNumberRoute = () => {
  const { svcReqSn } = useParams();
  return /^\d+$/.test(svcReqSn ?? '') ? <Outlet /> : <NotFoundPage />;
};

// ──────────────────────────────────────────
// Admin 페이지
// ──────────────────────────────────────────
import Dashboard        from '@pages/admin/Dashboard';
import AdminMemberList from '@pages/admin/AdminMemberList';
import AdminNoticeListPage from '@pages/admin/notice/AdminNoticeListPage';
import AdminNoticeFormPage from '@pages/admin/notice/AdminNoticeFormPage';
import AdminCategoryPage from '@pages/admin/category/AdminCategoryPage';
import AdminServiceRequestFormPage from '@pages/admin/category/AdminServiceRequestFormPage';
import AdminServiceRequestPage from '@pages/admin/service/AdminServiceRequestPage';
import AdminServiceRequestDetailPage from '@pages/admin/service/AdminServiceRequestDetailPage';
import AdminProviderApprovalPage from '@pages/admin/provider/AdminProviderApprovalPage';
import AdminOperationsRecordPage from '@pages/admin/operation/AdminOperationsRecordPage';
import AdminSystemSettingPage from '@pages/admin/setting/AdminSystemSettingPage';
import AdminAuctionManagementPage from '@pages/admin/auction/AdminAuctionManagementPage';
import AdminAuctionDetailPage from '@pages/admin/auction/AdminAuctionDetailPage';
import AdminNotificationPage from '@pages/admin/notification/AdminNotificationPage';
import AdminReportManagementPage from '@pages/admin/operation/AdminReportManagementPage';
import AdminCustomerInquiryManagementPage from '@pages/admin/operation/AdminCustomerInquiryManagementPage';
import AdminServiceTradeDetailRoutePage from '@pages/admin/operation/AdminServiceTradeDetailRoutePage';
import AdminPointExchangePage from '@pages/admin/operation/AdminPointExchangePage';
import AdminSettlementManagementPage from '@pages/admin/operation/AdminSettlementManagementPage';
import AdminFundDashboardPage from '@pages/admin/funds/AdminFundDashboardPage';

const AppRoutes = () => {
  const location = useLocation();
  return (
    <Routes>
      {/* ────────────────────────────────
          랜딩 페이지 (LandingLayout)
      ──────────────────────────────── */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
      </Route>

      {/* 담당자 7 · F-OPS-001: 관리자 로그인은 사용자 헤더·푸터가 없는 독립 인증 화면입니다. */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* @ai_generated: 일반 사용자 인증 화면은 공통 헤더·푸터를 AuthLayout에서 한 번만 조립한다. */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/signup" element={<SignupPage />} />
        <Route path="/find-email" element={<FindEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/withdrawal" element={<WithdrawalRequestPage />} />
        <Route path="/oauth/onboarding" element={<OAuthOnboardingPage />} />
      </Route>

      {/* OAuth 콜백은 결과 처리 후 즉시 이동하는 경로이므로 레이아웃을 적용하지 않는다. */}
      <Route path="/oauth/redirect"  element={<OAuthRedirectHandler />} />
      <Route path="/unauthorized"    element={<Unauthorized />} />
      <Route path="/403"             element={<Unauthorized />} />
      <Route path="/404"             element={<NotFoundPage />} />
      <Route path="/500"             element={<ServerErrorPage />} />
      {/* ────────────────────────────────
          공개 조회 영역 (UserLayout)
      ──────────────────────────────── */}
      <Route element={<UserLayout />}>
        {/* 경매 */}
        <Route path="/auction" element={<AuctionListPage />} />
        <Route path="/auction/:auctionId" element={<AuctionDetailPage />} />

        <Route element={<CustomerSupportLayout />}>
          <Route path="/customersupport/guide" element={<GuidePage />} />
          <Route path="/customersupport/notice" element={<NoticeListPage />} />
          <Route path="/customersupport/notice/:noticeId" element={<NoticeDetailPage />} />
          <Route path="/customersupport/faq" element={<FaqPage />} />
        </Route>
      </Route>

      {/* 담당자 7 경로 정리: 서비스 요청 상세는 숫자 요청 번호 아래에서만 인증·권한 검사를 시작합니다. */}
      <Route path={SERVICE_REQUEST_DETAIL_ROUTE} element={<ServiceRequestNumberRoute />}>
        <Route element={<ProtectedRoute allowedRoles={['ROLE_USER', 'ROLE_SERVICE']} />}>
          <Route element={<UserLayout />}>
            <Route index element={<ServiceRequestDetailPage />} />
            <Route path="quotes/:quoteId" element={<QuoteDetailPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['ROLE_SERVICE']} />}>
          <Route element={<UserLayout />}>
            <Route path="quotes/new" element={<QuoteFormPage />} />
            <Route path="quotes/:quoteId/edit" element={<QuoteFormPage />} />
          </Route>
        </Route>
      </Route>

      {/* @ai_generated: 두 현재 역할이 함께 쓰는 마이페이지 셸 경로. */}
      <Route
        element={(
          <ProtectedRoute allowedRoles={['ROLE_USER', 'ROLE_SERVICE']} />
        )}
      >
        <Route element={<UserLayout />}>
          {/* 담당자 7 · 공개 거래 프로필: 일반·서비스 모드에서 같은 회원 프로필을 조회합니다. */}
          <Route path="/users/:userSn" element={<PublicTradeProfilePage />} />
          {/* 담당자 7 · F-PROV-016: 제공자 프로필·포트폴리오는 로그인 회원만 조회합니다. */}
          <Route path="/providers/:providerId" element={<PublicProviderProfilePage />} />
          <Route path="/user/mypage" element={<MyPage />} />
          <Route
            path="/user/mypage/auctions/active"
            element={<Navigate replace to={MYPAGE_SECTION_PATHS['auction-bids']} />}
          />
          <Route
            path="/user/mypage/auctions/bids"
            element={<Navigate replace to={MYPAGE_SECTION_PATHS['auction-bids']} />}
          />
          {Object.entries(MYPAGE_SECTION_PATHS)
            .filter(([section]) => section !== 'home')
            .map(([section, path]) => (
              <Route key={section} path={path} element={<MyPage initialSection={section} />} />
            ))}
          <Route element={<ProtectedRoute allowedRoles={['ROLE_SERVICE']} />}>
            <Route
              path={MYPAGE_PROFILE_TAB_PATHS.provider}
              element={<MyPage initialSection="profile" initialProfileTab="provider" />}
            />
            <Route
              path={MYPAGE_PROFILE_TAB_PATHS.portfolio}
              element={<MyPage initialSection="profile" initialProfileTab="portfolio" />}
            />
            <Route
              path={LEGACY_PROVIDER_PROFILE_PATH}
              element={<Navigate replace to={MYPAGE_PROFILE_TAB_PATHS.provider} />}
            />
          </Route>
          {/* 담당자 7 · 문의 작성은 진입한 마이페이지 경로의 하위 화면으로 유지합니다. */}
          <Route path={`${MYPAGE_INQUIRY_PATHS.general}/new`} element={<CustomerInquiryFormPage />} />
          <Route element={<ProtectedRoute allowedRoles={['ROLE_SERVICE']} />}>
            <Route path={MYPAGE_INQUIRY_PATHS.provider} element={<MyPage initialSection="inquiry-list" />} />
            <Route path={`${MYPAGE_INQUIRY_PATHS.provider}/new`} element={<CustomerInquiryFormPage />} />
          </Route>
          <Route path="/user/notification" element={<NotificationPage />} />
          {/* 담당자 7 · F-PROV-006/012~014: 제공자 모드에서도 추가 분야 심사 신청·상태 조회를 허용합니다. */}
          <Route path="/provider/apply" element={<ProviderApplyPage />} />
          <Route path="/provider/applications/status" element={<ProviderApplicationStatusPage />} />
          {/* 담당자 7 · F-SVC-010: 사용자 서비스 거래는 마이페이지 목록 아래의 단일 계층 경로를 사용합니다. */}
          <Route path={getServiceTradeDetailPath(':tradeId')} element={<ServiceTradeDetailRoutePage />} />
          <Route path={getServiceTradeChatPath(':tradeId')} element={<TradeChat />} />
        </Route>
      </Route>

      {/* @ai_generated CHG-032: 아래는 일반회원 전용 기능이므로 ROLE_USER 현재 모드만 접근한다. */}
      <Route
        element={(
          <ProtectedRoute allowedRoles={['ROLE_USER']} />
        )}
      >
        <Route element={<UserLayout />}>
          <Route element={<MyPageReviewLayout />}>
            <Route path="/user/reviews/write/:id" element={<LegacyReviewRedirect mode="new" />} />
            <Route path="/user/reviews/edit/:id" element={<LegacyReviewRedirect mode="edit" />} />
          </Route>

          <Route path="/trades/:tradeId/chat" element={<TradeChat />} />
          <Route path="/auction/:auctionId/trade" element={<AuctionTradeDetailPage />} />
          <Route path="/trades/:tradeId" element={<LegacyTradeRedirect />} />
          <Route
            path="/trades/:tradeId/seller"
            element={<LegacyTradeRedirect />}
          />

          {/* 상품 — 로그인 필요 */}
          <Route path="/product/register"        element={<ProductRegisterPage key={location.key} />} />
          <Route path="/product/:prdSn/seller"   element={<ProductDetailSellerPage />} />

          {/* 서비스 - 로그인 필요 */}
          {/* 담당자 2 · F-SVC-001~004: 서비스 요청서 작성/임시저장 폼. 라우트 소유자에게 전달 필요. */}
          <Route path={SERVICE_REQUEST_CREATE_PATH} element={<ServiceRequestFormPage />} />
        </Route>
      </Route>

      {/* 임시 화면도 관리자 정보 구조를 보여 주므로 ROLE_ADMIN만 접근할 수 있습니다. */}
      <Route
        element={(
          <ProtectedRoute
            allowedRoles={['ROLE_ADMIN']}
            unauthenticatedTo="/admin/login"
          />
        )}
      >
        <Route path="/admin" element={<AdminLayout />}>
          {/* 대시보드 */}
          <Route index element={<Dashboard />} />
          <Route path="members" element={<AdminMemberList />} />
          <Route path="notices" element={<AdminNoticeListPage />} />
          <Route path="notices/new" element={<AdminNoticeFormPage />} />
          <Route path="notices/:noticeId" element={<AdminNoticeFormPage />} />
          <Route path="categories" element={<AdminCategoryPage />} />
          <Route path="categories/:categorySn/form" element={<AdminServiceRequestFormPage />} />
          <Route path={ADMIN_SERVICE_REQUESTS_ROUTE} element={<AdminServiceRequestPage />} />
          <Route path={ADMIN_SERVICE_REQUEST_DETAIL_ROUTE} element={<AdminServiceRequestDetailPage />} />
          <Route path={ADMIN_PROVIDER_APPLICATIONS_ROUTE} element={<AdminProviderApprovalPage />} />
          <Route path={ADMIN_AUCTIONS_ROUTE} element={<AdminAuctionManagementPage />} />
          <Route path={ADMIN_AUCTION_DETAIL_ROUTE} element={<AdminAuctionDetailPage />} />
          <Route path={ADMIN_REPORTS_ROUTE} element={<AdminReportManagementPage />} />
          <Route path={ADMIN_REPORT_DETAIL_ROUTE} element={<AdminReportManagementPage />} />
          <Route path="inquiries" element={<AdminCustomerInquiryManagementPage />} />
          <Route path={ADMIN_SERVICE_TRADE_DETAIL_ROUTE} element={<AdminServiceTradeDetailRoutePage />} />
          <Route path="exchanges" element={<AdminPointExchangePage />} />
          <Route path="settlements" element={<AdminSettlementManagementPage />} />
          <Route path={ADMIN_FUNDS_ROUTE} element={<AdminFundDashboardPage />} />
          {/* 담당자 7 · F-OPS-011: 담당자 6의 F-OPS-016 화면을 소비해 운영 기록 탐색만 통합합니다. */}
          <Route path={ADMIN_OPERATIONS_RECORDS_ROUTE} element={<AdminOperationsRecordPage />} />
          <Route path={ADMIN_SETTINGS_ROUTE} element={<AdminSystemSettingPage />} />
          {/* 관리자 알림 (담당자6, F-COM-004/005) */}
          <Route path="notifications" element={<AdminNotificationPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ROLE_SERVICE']} />}>
        <Route element={<UserLayout />}>
          {/* 담당자 5 · F-COM-002: 공개 요청 검색·목록은 제공자 모드 전용입니다. */}
          <Route path={SERVICE_REQUESTS_PATH} element={<ServiceListPage />} />
        </Route>
      </Route>
      
      {/* 404 폴백 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
