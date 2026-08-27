// src/pages/user/MyPage.jsx
//
// Figma: 에누리컷_디자인시안
//   - MY 홈 탭(일반):      node-id 18:2
//   - 프로필수정 탭(일반):   node-id 28:12
//   - MY 홈(제공자모드):     node-id 57:495
// - 절대좌표(ScaledStage) 방식 → 반응형 Flex 레이아웃으로 전환.
//   사이드바: 데스크톱(lg+) 좌측 고정 컬럼 / 모바일 상단 가로 스크롤 탭.
//   콘텐츠: 우측 flex-1 영역.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPageInquiryPath, getMyPagePath } from "@/routes/myPageRoutes";
import MyPageSidebar from "@components/mypage/MyPageSidebar";
import MyPageDashboard from "@components/mypage/MyPageDashboard";
import MyPageProfileEdit from "@components/mypage/MyPageProfileEdit";
import MyPageProviderDashboard from "@components/mypage/MyPageProviderDashboard";
import ProviderReceivedReviewSection from "@components/mypage/ProviderReceivedReviewSection";
import MyPageProfileManagement from "@components/mypage/MyPageProfileManagement";
import TradeChat from "@pages/trade/TradeChat";
import AuctionFavoritesPage from "@pages/auction/AuctionFavoritesPage";
import TradeHistory from "@pages/trade/TradeHistory";
import MyProductList from "@components/product/MyProductList";
import PointWalletPage from "@pages/user/point/PointWalletPage";
import MyReportListPage from "@pages/user/report/MyReportListPage";
import MyInquiryListPage from "@pages/user/inquiry/MyInquiryListPage";
import MyQuoteListPage from "@pages/provider/MyQuoteListPage";
import MyServiceRequestListPage from "@pages/service/MyServiceRequestListPage";
import MyServiceTradeListPage from "@pages/service/MyServiceTradeListPage";
import ReviewListPage from "@pages/user/ReviewListPage";
import { useAuth } from "@hooks/useAuth";
import { useMyProviderApplications } from "@hooks/useProviderApplications";
import { confirm } from "@utils/common";

const MYPAGE_SECTIONS = new Set([
  "auction-bids",
  "auction-sales",
  "service-requests",
  "wishlist",
  "chat",
  "wallet",
  "profile",
  "quote",
  "review",
  "service-trade",
  "received-review",
  "report-list",
  "inquiry-list",
]);

const PROVIDER_ONLY_SECTIONS = new Set([
  "quote",
  "received-review",
]);

const isAllowedSection = (section, isProvider) => (
  MYPAGE_SECTIONS.has(section)
  && (isProvider || !PROVIDER_ONLY_SECTIONS.has(section))
);

export default function MyPage({
  initialSection = "home",
  initialProfileTab = "account",
}) {
  // isProvider: 현재 로그인 역할이 제공자(ROLE_SERVICE)인지 — 서버가 내려준 실제 역할 기준.
  const { user, isProvider, switchMode, logout } = useAuth();
  const { data: myProviderApps = [] } = useMyProviderApplications({
    enabled: !!user && !isProvider,
  });
  const isProviderApproved = myProviderApps.some((app) => app.statusCode === 'PRVC0003');
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(
    isAllowedSection(initialSection, isProvider) ? initialSection : "home",
  );
  useEffect(() => {
    const nextSection = isAllowedSection(initialSection, isProvider)
      ? initialSection
      : "home";

    // 함수형 업데이트로 activeSection을 읽지 않아, 이 effect가 activeSection 변경 자체에는
    // 반응하지 않는다 — 사이드바 클릭처럼 이미 URL과 동기화된 내부 전환에서 불필요하게
    // 재검증이 도는 걸 막는다 (재검증은 URL/역할이 실제로 바뀔 때만 필요).
    const animationFrameId = window.requestAnimationFrame(() => {
      setActiveSection((prevSection) => (
        nextSection === prevSection ? prevSection : nextSection
      ));
    });
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [initialSection, isProvider]);

  // 사이드바 클릭마다 증가 — 콘텐츠 영역 key로 써서, 같은 섹션을 다시 눌러도 그 섹션 컴포넌트를
  // 강제로 리마운트한다(필터·검색어·페이지 등 내부 state를 처음 진입 상태로 초기화하기 위함).
  const [sectionResetKey, setSectionResetKey] = useState(0);

  // 임시저장·외부 링크 등으로 이 페이지에 진입할 때 이전 페이지의 스크롤 위치가 남지 않도록 최상단으로 이동한다.
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // @ai_generated (담당자1, 2026-08-13): 목록 응답에 auctionId가 있으면 호환 리다이렉트와
  // 중복 상세 조회를 거치지 않고 정식 거래 상세 경로로 바로 이동한다.
  const handleOpenPurchaseTradeDetail = (tradeId, auctionId, returnPath) => {
    const hasTradeId = Number.isSafeInteger(Number(tradeId)) && Number(tradeId) > 0;
    const hasAuctionId = Number.isSafeInteger(Number(auctionId)) && Number(auctionId) > 0;
    const detailPath = !hasTradeId && hasAuctionId
      ? `/auction/${auctionId}`
      : hasTradeId && hasAuctionId
        ? `/auction/${auctionId}/trade`
        : hasTradeId
          ? `/trades/${tradeId}`
          : getMyPagePath('auction-bids');
    navigate(detailPath, {
      state: { from: returnPath ?? getMyPagePath("auction-bids") },
    });
  };

  // 사이드바 메뉴를 누르면 항상 그 섹션의 기본(목록) 화면으로 이동한다.
  // 같은 메뉴를 다시 눌러도 상세 화면에 머물러 있지 않도록, 드릴다운 상태를 무조건 초기화한다
  // (예: 판매 내역 상세를 보다가 "상품 판매 목록"을 다시 누르면 목록으로 돌아가야 한다).
  const handleSelectSection = (section) => {
    const nextSection = MYPAGE_SECTIONS.has(section) ? section : "home";
    setActiveSection(nextSection);
    navigate(nextSection === "inquiry-list"
      ? getMyPageInquiryPath(isProvider)
      : getMyPagePath(nextSection));
    setSectionResetKey((key) => key + 1);
    window.scrollTo(0, 0);
  };

  // 제공자 모드 전환 (F-PROV-008): 서버에 실제 역할 전환을 요청한다.
  // 제공자 권한 여부는 프론트가 미리 알 수 없으므로(서버 DB의 승인 상태 기준)
  // 일단 호출하고, 권한이 없어 실패하면 신청 페이지로 안내한다.
  const handleProviderSwitchRequest = async () => {
    try {
      await switchMode("SERVICE");
      setActiveSection("home");
      navigate(getMyPagePath("home"));
    } catch {
      const ok = await confirm({
        title: "제공자 신청이 필요합니다",
        text: "제공자 전환은 제공자 신청 후 이용할 수 있어요. 신청 페이지로 이동하시겠습니까?",
        icon: "info",
        confirmButtonText: "신청하기",
        cancelButtonText: "취소",
      });
      if (ok) navigate("/provider/apply");
    }
  };

  // 일반 모드로 복귀 — 이쪽은 권한 검사가 없어 실패할 일이 거의 없다.
  const handleSwitchToGeneral = async () => {
    await switchMode("USER");
    setActiveSection("home");
    navigate(getMyPagePath("home"));
  };

  return (
    <div className="container py-6 lg:py-10">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start ">
        <MyPageSidebar
          mode={isProvider ? "provider" : "general"}
          activeSection={activeSection}
          onSelect={handleSelectSection}
          onRequestProviderSwitch={handleProviderSwitchRequest}
        />
        <div className="flex-1 min-w-0" key={sectionResetKey}>
          {activeSection === "home" && !isProvider && (
            <MyPageDashboard
              user={user}
              isProviderApproved={isProviderApproved}
              onLogout={logout}
              onRequestProviderSwitch={handleProviderSwitchRequest}
            />
          )}
          {activeSection === "home" && isProvider && (
            <MyPageProviderDashboard
              user={user}
              onLogout={logout}
              onSwitchToGeneral={handleSwitchToGeneral}
              onOpenSection={handleSelectSection}
            />
          )}
          {activeSection === "profile" && (
            isProvider
              ? <MyPageProfileManagement user={user} initialTab={initialProfileTab} />
              : <MyPageProfileEdit user={user} />
          )}
          {activeSection === "auction-bids" && (
            <TradeHistory
              embedded
              fixedRole="BUYER"
              onOpenTradeDetail={handleOpenPurchaseTradeDetail}
            />
          )}
          {activeSection === "auction-sales" && <MyProductList />}
          {activeSection === "service-requests" && <MyServiceRequestListPage embedded />}
          {activeSection === "wishlist" && <AuctionFavoritesPage embedded />}
          {activeSection === "wallet" && <PointWalletPage embedded />}
          {activeSection === "quote" && isProvider && <MyQuoteListPage embedded />}
          {!isProvider && activeSection === "review" && <ReviewListPage />}
          {activeSection === "report-list" && <MyReportListPage embedded />}
          {activeSection === "inquiry-list" && <MyInquiryListPage embedded />}
          {activeSection === "service-trade" && (
            <MyServiceTradeListPage fixedRole={isProvider ? "PROVIDER" : "REQUESTER"} />
          )}
          {isProvider && activeSection === "received-review" && <ProviderReceivedReviewSection />}
          {activeSection === "chat" && (
            <TradeChat
              embedded
              showRoomList
            />
          )}
        </div>
      </div>
    </div>
  );
}
