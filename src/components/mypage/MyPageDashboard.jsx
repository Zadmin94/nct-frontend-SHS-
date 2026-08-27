// src/components/mypage/MyPageDashboard.jsx
// Figma: mypage_01일반(node 18:2) CONTENTS 구간("MY 홈" 탭).
// - 절대좌표 → 반응형 전환. 통계카드 2x2→4열, 목록패널 1열→2열 그리드.
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMyPagePath, getServiceTradeDetailPath } from "@/routes/myPageRoutes";
import { useQuery } from "@tanstack/react-query";
import { getMyBidHistory } from "@api/bidApi";
import { getMyServiceRequests } from "@api/serviceRequestApi";
import { getMyServiceTrades } from "@api/serviceTradeApi";
import { getMyProducts } from "@api/productApi";
import { getTradeHistory } from "@api/tradeApi";
import { getTradeListItems, toTradeHistoryItem } from "@api/tradeAdapter";
import { getWritableReviews } from "@api/reviewApi";
import { getTradeChatRooms } from "@api/tradeChatApi";
import { toTradeChatRooms } from "@api/tradeChatAdapter";
import { usePointBalance } from "@hooks/usePoint";
import { useMemberProfile } from "@hooks/useMemberProfile";
import { reviewQueryKeys } from "@hooks/useReview";
import { toast } from "@utils/common";
import { ActionButton } from "@components/common/ui";
import MyPageStatusBadge from "@components/mypage/MyPageStatusBadge";
import { assets } from "@components/mypage/assets";
import MyPageContentHeader from "@components/mypage/MyPageContentHeader";
import MyPagePanel from "@components/mypage/MyPagePanel";
import {
  MyPageDashboardSummaryCards,
  MyPageDashboardTop,
} from "@components/mypage/MyPageDashboardCommon";

const REVIEW_PANEL_TABS = [
  { key: "all",     label: "전체" },
  { key: "goods",   label: "경매" },
  { key: "service", label: "견적" },
];

const CHAT_PANEL_TABS = [
  { key: "all",     label: "전체" },
  { key: "goods",   label: "경매" },
  { key: "service", label: "견적" },
];

function TabBadge({ count, active }) {
  return (
    <span
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold"
      style={{ background: active ? "#0064ff" : "#e5e5e5", color: active ? "#fff" : "#969696" }}
    >
      {count ?? 0}
    </span>
  );
}

function PanelTabs({ tabs, counts, activeKey, onChange, header = false }) {
  if (header) {
    return (
      <div className="flex items-stretch self-stretch gap-4">
        {tabs.map((tab) => {
          const active = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              style={{ borderBottom: active ? "2px solid #0064ff" : "2px solid transparent", marginBottom: -1 }}
              className={`flex items-center gap-1.5 text-[14px] font-medium bg-transparent border-none cursor-pointer transition-colors px-0 ${
                active ? "text-[#0064ff]" : "text-[#969696]"
              }`}
            >
              {tab.label}
              <TabBadge count={counts[tab.key]} active={active} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-5 border-b border-[#e5e5e5] mb-4">
      {tabs.map((tab) => {
        const active = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{ marginBottom: -1 }}
            className={`pb-2.5 text-[15px] font-medium bg-transparent border-none cursor-pointer transition-colors flex items-center gap-1.5 ${
              active ? "text-[#0064ff] border-b-2 border-[#0064ff]" : "text-[#969696]"
            }`}
          >
            {tab.label}
            <TabBadge count={counts[tab.key]} active={active} />
          </button>
        );
      })}
    </div>
  );
}

function ReviewablePanel({ items, onView, onMore }) {
  const [activeTab, setActiveTab] = useState("all");
  const fmtDate = (str) => str?.slice(0, 10).replace(/-/g, ".") ?? "-";

  const goodsItems   = items.filter((i) => i.dealType === "goods");
  const serviceItems = items.filter((i) => i.dealType === "service");
  const tabItems = (
    activeTab === "goods"   ? goodsItems :
    activeTab === "service" ? serviceItems :
    items
  ).slice(0, 3);
  const counts = { all: items.length, goods: goodsItems.length, service: serviceItems.length };

  const emptyMsg = {
    all: "작성할 리뷰가 없습니다.",
    goods: "작성할 경매 리뷰가 없습니다.",
    service: "작성할 견적 리뷰가 없습니다.",
  };

  return (
    <section className="overflow-hidden border border-[#e4e9f2] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] rounded-[15px] h-[300px]">
      <header className="flex items-center justify-between gap-4 border-b border-[#e8e9ec] bg-[#f5f7fc] px-5 h-[60px]">
        <h3 className="m-0 font-bold text-[18px] text-[#1a1a1a] shrink-0">
          거래 완료 리뷰작성
          <span className="ml-2 text-[15px] font-bold text-[#0064ff]">{items.length}건</span>
        </h3>
        <PanelTabs tabs={REVIEW_PANEL_TABS} counts={counts} activeKey={activeTab} onChange={setActiveTab} header />
        <button
          type="button"
          onClick={onMore}
          className="bg-transparent border-none cursor-pointer flex items-center gap-1 text-[14px] text-[#969696] shrink-0"
        >
          더보기 <ChevronRight size={14} className="text-[#969696]" />
        </button>
      </header>
      <div className="h-[240px] overflow-hidden px-5 pb-5">
        {tabItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[15px] text-[#969696] m-0">{emptyMsg[activeTab]}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e8e9ec]">
            {tabItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#1a1a1a] m-0 truncate">{item.title}</p>
                  <p className="text-[13px] text-[#969696] m-0 mt-0.5">
                    {item.partyLabel} {item.partyName} · {fmtDate(item.completedDate)}
                  </p>
                </div>
                <ActionButton
                  onClick={() => onView(item)}
                  className="shrink-0"
                  size="sm"
                >
                  상세보기
                </ActionButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ActiveChatPanel({ rooms, onOpenChat, onMore }) {
  const [activeTab, setActiveTab] = useState("all");

  const goodsRooms   = rooms.filter((r) => r.tradeTypeCode === "TRDC0001");
  const serviceRooms = rooms.filter((r) => r.tradeTypeCode === "TRDC0002");
  const tabRooms = (
    activeTab === "goods"   ? goodsRooms :
    activeTab === "service" ? serviceRooms :
    rooms
  );
  const counts = { all: rooms.length, goods: goodsRooms.length, service: serviceRooms.length };

  const emptyMsg = {
    all: "진행중인 채팅이 없습니다.",
    goods: "진행중인 경매 채팅이 없습니다.",
    service: "진행중인 견적 채팅이 없습니다.",
  };

  return (
    <section className="overflow-hidden border border-[#e4e9f2] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] rounded-[15px] h-[300px]">
      <header className="flex items-center justify-between gap-4 border-b border-[#e8e9ec] bg-[#f5f7fc] px-5 h-[60px]">
        <h3 className="m-0 font-bold text-[18px] text-[#1a1a1a] shrink-0">
          진행중인 채팅
          <span className="ml-2 text-[15px] font-bold text-[#0064ff]">{rooms.length}건</span>
        </h3>
        <PanelTabs tabs={CHAT_PANEL_TABS} counts={counts} activeKey={activeTab} onChange={setActiveTab} header />
        <button
          type="button"
          onClick={onMore}
          className="bg-transparent border-none cursor-pointer flex items-center gap-1 text-[14px] text-[#969696] shrink-0"
        >
          더보기 <ChevronRight size={14} className="text-[#969696]" />
        </button>
      </header>
      <div className="h-[240px] overflow-hidden px-5 pb-5">
        {tabRooms.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[15px] text-[#969696] m-0">{emptyMsg[activeTab]}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e8e9ec]">
            {tabRooms.map((room) => (
              <div
                key={room.roomId}
                onClick={() => onOpenChat?.(room)}
                className="flex items-center gap-3 py-3 cursor-pointer hover:opacity-70 transition-opacity"
              >
                <div className="relative shrink-0">
                  <div className="size-[36px] rounded-full bg-[#e6f0ff] flex items-center justify-center text-[#0064ff] font-bold text-[15px]">
                    {room.counterpartNickname?.[0] ?? "?"}
                  </div>
                  {room.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#e63946] text-white text-[10px] font-bold flex items-center justify-center">
                      {room.unreadCount > 99 ? "99+" : room.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#1a1a1a] m-0 truncate">{room.productName}</p>
                  <p className="text-[13px] text-[#969696] m-0 mt-0.5 truncate">{room.lastMessage}</p>
                </div>
                <span className="text-[13px] text-[#b0aea8] shrink-0">{room.latestMessageAt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function MyPageDashboard({
  user,
  isProviderApproved,
  onLogout,
  onRequestProviderSwitch,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const nickname = user?.nickname || "고객";
  const email = user?.email || "";
  const profileQuery = useMemberProfile();

  const nav = (section) => (event) => {
    event?.stopPropagation();
    navigate(getMyPagePath(section));
  };

  // ── 실데이터 조회 ──────────────────────────────────────────────────────────

  // 포인트 잔액
  const { data: pointBalance } = usePointBalance({ enabled: !!user });

  // 경매 입찰 전체 이력 (구매자)
  const { data: bidHistory = [] } = useQuery({
    queryKey: ["bids", "my"],
    queryFn: getMyBidHistory,
    select: (res) => res.data ?? [],
    enabled: !!user,
  });
  const activeAuctionCnt = new Set(
    bidHistory
      .filter((b) => b.auctionStatusCode === "AUCC0002" && (b.displayStatus === "HIGHEST" || b.displayStatus === "OUTBID"))
      .map((b) => b.aucSn)
  ).size;
  // 구매 건수 — 상품 구매 목록(TradeHistory fixedRole=BUYER)과 동일한 기준
  const { data: allTradeItems = [] } = useQuery({
    queryKey: ["trades", "my", "all"],
    queryFn: async () => {
      const res = await getTradeHistory({});
      return getTradeListItems(res).map(toTradeHistoryItem);
    },
    enabled: !!user,
  });
  const purchaseCnt = allTradeItems.filter((t) => t.type === "BUYER").length;

  // 담당자 7: 일반회원 서비스 현황은 요청자 전용 조회 계약만 사용한다.
  const { data: svcReqAll } = useQuery({
    queryKey: ["serviceRequests", "me", "total"],
    queryFn: () => getMyServiceRequests(1, 1),
    select: (res) => res.data,
    enabled: !!user,
  });
  const svcRequestCnt = svcReqAll?.total ?? 0;

  // 견적이 선택된 뒤 실제로 진행 중인 요청자 거래 건수
  const { data: activeServiceTradePage } = useQuery({
    queryKey: ["my-service-trades", "REQUESTER", "TRDC0003", { page: 1, size: 1 }],
    queryFn: () => getMyServiceTrades({
      role: "REQUESTER",
      status: "TRDC0003",
      page: 1,
      size: 1,
    }),
    enabled: !!user,
  });
  const activeServiceTradeCnt = Number(activeServiceTradePage?.totalCount) || 0;

  const { data: svcTradeCompleted } = useQuery({
    queryKey: ["my-service-trades", "REQUESTER", "TRDC0006", "", 1, 1],
    queryFn: () => getMyServiceTrades({
      role: "REQUESTER",
      status: "TRDC0006",
      page: 1,
      size: 1,
    }),
    enabled: !!user,
  });
  const svcTradeCompletedCnt = Number(svcTradeCompleted?.totalCount) || 0;

  // 경매 판매 건수 (진행 중 상태)
  const { data: auctionActiveSummary } = useQuery({
    queryKey: ["products", "my", 1, 1, "ACTIVE"],
    queryFn: () => getMyProducts(1, 1, "ACTIVE"),
    select: (res) => res.data,
    enabled: !!user,
  });
  const auctionSaleCnt = auctionActiveSummary?.total ?? 0;

  // 진행중인 채팅방 (ACTIVE 상태만)
  const { data: activeChatRooms = [] } = useQuery({
    queryKey: ["chatRooms", "active"],
    queryFn: async () => {
      const res = await getTradeChatRooms();
      return toTradeChatRooms(res).filter((r) => r.roomStatus === "ACTIVE").slice(0, 3);
    },
    enabled: !!user,
  });

  // 미작성 리뷰 목록
  // @ai_generated (담당자1, 2026-08-07): 리터럴 키 대신 useReview.js의 reviewQueryKeys 계약을
  // 써서, 리뷰 등록/수정/삭제 후 무효화(reviewQueryKeys.all=['reviews'])가 이 캐시도 갱신하게 한다(P4-4).
  const { data: writableReviews = [] } = useQuery({
    queryKey: reviewQueryKeys.writable,
    queryFn: getWritableReviews,
    select: (res) => res.data ?? [],
    enabled: !!user,
  });

  const fmtP = (n) => (n != null ? Number(n).toLocaleString() : "...");

  // ── 통계 카드 ──────────────────────────────────────────────────────────────

  const subBtn = "text-white/70 hover:text-white underline underline-offset-2 transition-colors";

  const statCards = [
    {
      key: "point",
      color: "#776bf8",
      icon: assets.iconPoint,
      label: "포인트 잔액",
      value: fmtP(pointBalance?.total),
      unit: "P",
      meta: pointBalance
        ? `사용가능 ${fmtP(pointBalance.available)}P   ㅣ   환전가능 ${fmtP(pointBalance.settleable)}P`
        : "조회 중...",
      onMore: nav("wallet"),
    },
    {
      key: "auction",
      color: "#3B4DE3",
      icon: assets.iconAction,
      label: "경매 거래",
      value: String(purchaseCnt),
      unit: "건",
      meta: (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button type="button" onClick={nav("auction-bids")} className={subBtn}>입찰중 {activeAuctionCnt}건</button>
          <span className="text-white/70">ㅣ</span>
          <button type="button" onClick={nav("auction-bids")}    className={subBtn}>구매 {purchaseCnt}건</button>
          <span className="text-white/70">ㅣ</span>
          <button type="button" onClick={nav("auction-sales")}   className={subBtn}>판매 {auctionSaleCnt}건</button>
        </span>
      ),
      onMore: nav("auction-bids"),
    },
    {
      key: "service",
      color: "#0CB8BB",
      icon: assets.iconService,
      label: "견적 요청 내역",
      value: String(svcRequestCnt),
      unit: "건",
      meta: (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button type="button" onClick={nav("service-requests")} className={subBtn}>전체 요청 {svcRequestCnt}건</button>
          <span className="text-white/70">ㅣ</span>
          <button type="button" onClick={nav("service-trade")} className={subBtn}>진행 {activeServiceTradeCnt}건</button>
          <span className="text-white/70">ㅣ</span>
          <button type="button" onClick={nav("service-trade")} className={subBtn}>완료 {svcTradeCompletedCnt}건</button>
        </span>
      ),
      onMore: nav("service-requests"),
    },
  ];

  return (
    <div className="space-y-5">
      <MyPageContentHeader title="MY 홈" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4 lg:items-stretch">
        <MyPageDashboardTop
          className="lg:col-span-1"
          profileImageUrl={profileQuery.data?.profileImageUrl || user?.profileImageUrl}
          nickname={nickname}
          email={email}
          profilePath={getMyPagePath('profile')}
          actions={[
            {
              key: 'logout',
              label: '로그아웃',
              icon: assets.iconLogout,
              onClick: onLogout,
            },
            {
              key: 'provider-switch',
              label: isProviderApproved ? '제공자 전환' : '제공자 신청',
              icon: assets.iconSwitch1,
              iconClassName: 'size-[10px]',
              onClick: onRequestProviderSwitch,
            },
          ]}
        />

        <MyPageDashboardSummaryCards
          className="lg:col-span-3"
          columns={3}
          items={statCards}
          ariaLabel="일반회원 거래 요약"
        />
      </div>

      {/* 채팅 + 리뷰 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <ActiveChatPanel
          rooms={activeChatRooms}
          onOpenChat={() => navigate(getMyPagePath("chat"))}
          onMore={() => navigate(getMyPagePath("chat"))}
        />
        <ReviewablePanel
          items={writableReviews}
          onView={(item) => {
            const from = location.pathname + location.search;
            if (item.dealType === 'service') {
              navigate(getServiceTradeDetailPath(item.tradeId ?? item.id), { state: { from } });
              return;
            }
            // @ai_generated (담당자1, 2026-08-07): auctionId가 없으면 "/auction/undefined/trade"로
            // 이동해 400을 받는 대신(P3-7), 안내만 하고 이동을 막는다.
            if (!item.auctionId) {
              toast({ icon: 'error', title: '거래 상세로 이동할 수 없습니다. 잠시 후 다시 시도해주세요.' });
              return;
            }
            navigate(`/auction/${item.auctionId}/trade`, { state: { from } });
          }}
          onMore={() => navigate(getMyPagePath("review"))}
        />
      </div>
    </div>
  );
}
