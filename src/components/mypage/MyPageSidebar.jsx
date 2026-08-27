// src/components/mypage/MyPageSidebar.jsx
// Figma: mypage_01일반(18:2)/mypage_01일반_프로필수정(28:12) LEFTMENU
//        mypage_02제공자모드(57:495) LEFTMENU
// - 절대좌표 → 반응형 전환.
//   데스크톱(lg+): 좌측 세로 목록 / 모바일: 상단 가로 스크롤 탭.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { toast } from "@utils/common";

const GENERAL_MENU_ITEMS = [
  { key: "home",    label: "MY 홈",  type: "section" },
  { key: "profile", label: "프로필", type: "section" },
  {
    key: "auction-history",
    label: "경매",
    type: "accordion",
    children: [
      { key: "auction-bids",    label: "상품 구매 목록", type: "section" },
      { key: "auction-sales",   label: "상품 판매 목록", type: "section" },
      { key: "wishlist",        label: "관심 경매",      type: "section" },
    ],
  },
  {
    key: "service-history",
    label: "견적",
    type: "accordion",
    children: [
      { key: "service-requests", label: "견적 요청 내역", type: "section" },
      { key: "service-trade",    label: "견적 진행 내역", type: "section" },
    ],
  },
  { key: "chat",         label: "채팅",         type: "section" },
  { key: "wallet",       label: "포인트 지갑",  type: "section" },
  { key: "review",       label: "리뷰",      type: "section" },
  { key: "report-list",  label: "신고 내역", type: "section" },
  { key: "inquiry-list",  label: "1:1 문의",   type: "section" },
];

// "정산 관리" 메뉴는 포인트 지갑 화면의 "정산 내역" 탭으로 흡수돼 빠졌다
// (백종남·옥동민 협의, 2026-08-04 — PointWalletPage.jsx 참고)
const PROVIDER_MENU_ITEMS = [
  { key: "home",              label: "MY 홈",        type: "section" },
  { key: "profile",           label: "프로필",       type: "section" },
  {
    key: "provider-service-menu",
    label: "견적",
    type: "accordion",
    children: [
      { key: "quote",         label: "견적 제출 내역", type: "section" },
      { key: "service-trade", label: "견적 진행 내역", type: "section" },
    ],
  },
  { key: "chat",              label: "채팅",          type: "section" },
  { key: "wallet",            label: "포인트 지갑",   type: "section" },
  { key: "received-review",   label: "리뷰",          type: "section" },
  { key: "report-list",       label: "신고 내역",     type: "section" },
  { key: "inquiry-list",      label: "1:1 문의",   type: "section" },
];

// 담당자 7: 일반·제공자 메뉴에 같은 하위 key가 있어도 현재 화면의 메뉴에서 부모를 찾습니다.
function getParentAccordion(sectionKey, menuItems) {
  return menuItems.find((item) => (
    item.type === "accordion"
    && (item.children ?? []).some((child) => child.key === sectionKey)
  ))?.key ?? null;
}

export default function MyPageSidebar({
  mode = "general",
  activeSection,
  onSelect,
  onRequestProviderSwitch,
  menuItems: customMenuItems,
  title,
}) {
  const navigate = useNavigate();
  // 담당자 7: 고객센터처럼 같은 규격을 쓰는 화면은 메뉴 데이터와 제목만 주입해 재사용합니다.
  const menuItems = customMenuItems
    ?? (mode === "provider" ? PROVIDER_MENU_ITEMS : GENERAL_MENU_ITEMS);
  const sidebarTitle = title ?? "마이페이지";

  const [openAccordion, setOpenAccordion] = useState(() => getParentAccordion(activeSection, menuItems));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  // activeSection이 accordion child로 변경되면 해당 accordion 자동으로 열기
  useEffect(() => {
    const parent = getParentAccordion(activeSection, menuItems);
    if (!parent) return undefined;

    const animationFrameId = window.requestAnimationFrame(() => {
      setOpenAccordion(parent);
    });
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [activeSection, menuItems]);

  const handleClick = (item) => {
    if (item.type === "accordion") {
      setOpenAccordion(prev => prev === item.key ? null : item.key);
      return;
    }
    // 아코디언 자식이 아닌 항목 클릭 시 아코디언 닫기
    if (!getParentAccordion(item.key, menuItems)) setOpenAccordion(null);

    if (item.type === "section") { onSelect?.(item.key); return; }
    if (item.type === "route")   { navigate(item.to); return; }
    if (item.type === "provider-switch") { onRequestProviderSwitch?.(); return; }
    toast({ icon: "info", title: "준비 중인 메뉴입니다." });
  };

  // 모바일 탭: accordion 항목은 children으로 평탄화, 부모 항목은 건너뜀
  const mobileTabs = menuItems.flatMap(item =>
    item.type === "accordion" ? (item.children ?? []) : [item]
  );

  return (
    <nav className="lg:sticky lg:top-[122px] lg:w-[210px] lg:shrink-0" aria-label={`${sidebarTitle} 메뉴`}>
      {/* 타이틀 (데스크톱) */}
      <h2 className="hidden h-9 items-center px-2 text-[25px] font-bold leading-none text-black lg:flex mb-5">
        {sidebarTitle}
        {!title && mode === "provider" && (
          <span className="ml-1 text-[14px] leading-none text-[#0064ff]">(제공자)</span>
        )}
      </h2>

      {/* 모바일: 아코디언 네비게이션 */}
      <div className="lg:hidden border-b border-gray-200 relative">
        {/* 트리거 바 */}
        <div className="flex items-center h-[44px] bg-white">
          <button
            type="button"
            aria-label="이전 페이지"
            onClick={() => navigate(-1)}
            className="flex items-center justify-start w-[44px] h-full shrink-0 text-gray-700 pl-2"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="flex-1 flex items-center h-full pr-1"
          >
            <span className="flex-1 text-center text-gray-900 text-[18px] font-semibold">
              {mobileTabs.find(t => t.key === activeSection)?.label ?? sidebarTitle}
            </span>
            <span className="w-[44px] flex items-center justify-center text-gray-500">
              {mobileMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
        </div>

        {/* 모달 오버레이 + 메뉴 목록 */}
        {mobileMenuOpen && (
          <>
            {/* 어두운 배경 */}
            <div
              className="fixed inset-0 z-[80] bg-black/40"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* 메뉴 패널 */}
            <div className="absolute top-full left-0 right-0 z-[81] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.15)] rounded-b-[12px] overflow-hidden">
              {mobileTabs.map((item) => {
                const isActive = item.key === activeSection;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { handleClick(item); setMobileMenuOpen(false); }}
                    className={`w-full text-center py-[14px] text-[16px] border-b border-gray-100 last:border-b-0 transition-colors ${
                      isActive
                        ? "text-[#0064ff] font-bold bg-blue-50"
                        : "text-gray-700 font-normal hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 데스크톱: 세로 목록 */}
      <div className="hidden lg:block  border-t-1 border-t-gray-300">
        {menuItems.map((item) => {
          const isAccordion    = item.type === "accordion";
          const isOpen         = isAccordion && openAccordion === item.key;
          const isActive       = item.type === "section" && item.key === activeSection;
          const hasActiveChild = isAccordion && (item.children ?? []).some(c => c.key === activeSection);

          return (
            <React.Fragment key={item.key}>
              <button
                type="button"
                onClick={() => handleClick(item)}
                className={`cursor-pointer w-full flex items-center justify-between h-[70px] px-[18px] text-left transition-all  ${
                  isActive
                    ? "bg-[#0064ff] rounded-[10px] shadow-[0_4px_14px_rgba(0,0,0,0.10)]"
                    : isOpen && hasActiveChild
                    ? "bg-[#0064ff] rounded-t-[10px] shadow-[0_4px_14px_rgba(0,0,0,0.10)]"
                    : isOpen
                    ? "bg-[#DAE1F0] rounded-t-[10px]"
                    : "bg-transparent hover:bg-[#f3f5fa]"
                }`}
              >
                <span
                  className={`text-[17px] ${
                    isActive || (isOpen && hasActiveChild)
                      ? "font-bold text-white"
                      : isOpen
                      ? "font-bold text-[#0064ff]"
                      : "font-medium text-[#333]"
                  }`}
                >
                  {item.label}
                </span>
                {isAccordion ? (
                  isOpen
                    ? <ChevronUp   size={14} className={isActive || hasActiveChild ? "text-white" : "text-[#0064ff]"} />
                    : <ChevronDown size={14} className="text-[#888]" />
                ) : item.showChevron ? (
                  <ChevronDown size={14} className="text-[#888]" />
                ) : null}
              </button>

              {/* 아코디언 하위 메뉴 — 구분선보다 위에 렌더링 */}
              {isAccordion && isOpen && (
                <div className="bg-[#F3F5FA] px-[18px] py-3 rounded-b-[10px]">
                  {(item.children ?? []).map(child => {
                    const isChildActive = child.key === activeSection;
                    return (
                      <button
                        key={child.key}
                        type="button"
                        onClick={() => handleClick(child)}
                        className="group cursor-pointer w-full flex items-center h-[36px] text-left"
                      >
                        <span
                          className={`text-[16px] transition-colors ${
                            isChildActive
                              ? "font-bold text-[#0064ff]"
                              : "font-normal text-[#333] group-hover:text-[#0064ff]"
                          }`}
                        >
                          {child.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="h-px bg-[#e5e5e5]" />
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
