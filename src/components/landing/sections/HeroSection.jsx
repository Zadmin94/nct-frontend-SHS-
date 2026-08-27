import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ActionButton } from "@components/common/ui";
import { assets } from "./assets";

const SLIDE = {
  eyebrow: "START GUIDE",
  title1: "처음이어도 흐름만 알면 어렵지",
  title2: "않아요.",
  sub: "경매와 서비스 요청, 시작부터 완료까지 한눈에 확인하세요.",
  btnLabel: "이용가이드 보기",
  btnRoute: "/customersupport/guide",
  tags: ["경매 거래", "서비스 요청", "안전 거래"],
};

const ITEM_HEIGHT     = 50;
const PAGE_SIZE       = 5;
const STAGGER         = 120;
const HALF_FLIP       = 350;
const INTERVAL        = 4500;
const HOT_W           = 400;
const HOT_HEADER_H    = 73;
const HOT_LIST_H      = PAGE_SIZE * ITEM_HEIGHT;
const HOT_INDICATOR_H = 40;
const idleStyle       = { transform: "perspective(600px) rotateX(0deg)", transition: "none" };

export default function HeroSection({ hotItems = [], hotItemsError, hotItemsLoading }) {
  const navigate = useNavigate();

  const [rowPages,    setRowPages]    = useState(Array(PAGE_SIZE).fill(0));
  const [rowStyles,   setRowStyles]   = useState(Array(PAGE_SIZE).fill(idleStyle));
  const [hoveredRow,  setHoveredRow]  = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const busyRef   = useRef(false);
  const pageCount = Math.max(1, Math.ceil(hotItems.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, pageCount - 1);

  const goToPage = useCallback((targetPage) => {
    if (busyRef.current || targetPage < 0 || targetPage >= pageCount) return;
    busyRef.current = true;
    setCurrentPage(targetPage);
    Array.from({ length: PAGE_SIZE }).forEach((_, row) => {
      const t = row * STAGGER;
      setTimeout(() => {
        setRowStyles(prev => { const n = [...prev]; n[row] = { transform: "perspective(600px) rotateX(-90deg)", transition: `transform ${HALF_FLIP}ms ease-in` }; return n; });
      }, t);
      setTimeout(() => {
        setRowPages(prev => { const n = [...prev]; n[row] = targetPage; return n; });
        setRowStyles(prev => { const n = [...prev]; n[row] = { transform: "perspective(600px) rotateX(90deg)", transition: "none" }; return n; });
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setRowStyles(prev => { const n = [...prev]; n[row] = { transform: "perspective(600px) rotateX(0deg)", transition: `transform ${HALF_FLIP}ms ease-out` }; return n; });
        }));
      }, t + HALF_FLIP);
    });
    setTimeout(() => { busyRef.current = false; }, (PAGE_SIZE - 1) * STAGGER + HALF_FLIP * 2 + 50);
  }, [pageCount]);

  useEffect(() => {
    if (pageCount <= 1) return undefined;
    const id = setInterval(() => goToPage((visiblePage + 1) % pageCount), INTERVAL);
    return () => clearInterval(id);
  }, [goToPage, pageCount, visiblePage]);

  return (
    <>
      <div className="relative overflow-hidden flex flex-col justify-center" style={{ minHeight: 750 }}>
        <div className="absolute inset-0">
          <img src={assets.bgImg} alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        <div className="relative max-w-[1600px] mx-auto px-8 pb-6 flex flex-col items-center">
          <h1 className="text-center text-[50px] font-bold leading-tight tracking-[-2.5px] mb-8">
            <span className="text-[#a0a4ff]">실시간 경매</span>
            <span className="text-white">와</span><br />
            <span className="text-[#00e5e8]">생활 서비스</span>
            <span className="text-white">를 한 화면에서</span>
          </h1>
        </div>

        <div className="container relative flex items-center justify-between">

          {/* 슬라이드 카드 */}
          <div
            className="shrink-0 flex flex-col rounded-[200px] overflow-hidden shadow-[0px_4px_20px_0px_rgba(0,0,0,0.15)]"
            style={{ width: 1000, height: 340 }}
          >
            <div
              className="bg-white/90 flex items-center pl-28 pr-16 gap-16 cursor-pointer"
              style={{ flex: 1 }}
              onClick={() => navigate(SLIDE.btnRoute)}
            >
              <img
                src={assets.heroSectionImg}
                alt=""
                className="h-45 object-contain shrink-0 pointer-events-none"
              />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[14px] font-bold text-primary tracking-[3px] mb-3 leading-normal">
                  {SLIDE.eyebrow}
                </p>
                <p className="text-[45px] font-bold text-black leading-[1.2] tracking-[-2.25px]">
                  {SLIDE.title1}<br />{SLIDE.title2}
                </p>
                <p className="text-[18px] text-black tracking-[-0.8px] mt-2">{SLIDE.sub}</p>
                <div className="flex justify-start mt-4">
                  <ActionButton
                    onClick={(event) => event.stopPropagation()}
                    to={SLIDE.btnRoute}
                    className="rounded-[10px] px-6"
                  >
                    <span className="font-bold tracking-[-0.9px]">{SLIDE.btnLabel}</span>
                  </ActionButton>
                </div>
              </div>
            </div>
            {/* 슬라이드 인디케이터 */}
            <div className="flex justify-center gap-1.5 items-center bg-white/90" style={{ height: HOT_INDICATOR_H }}>
              <div className="rounded-full" style={{ width: 16, height: 8, backgroundColor: "#0064ff", boxShadow: "0 0 6px rgba(0,100,255,0.6)" }} />
            </div>
          </div>

          {/* HOT ITEM 카드 */}
          <div
            className="shrink-0 relative z-10 rounded-[20px] shadow-[0px_4px_20px_0px_rgba(0,0,0,0.15)]"
            style={{ width: HOT_W }}
          >
            <div
              className="bg-primary rounded-tl-[20px] rounded-tr-[20px] flex items-center justify-between px-6"
              style={{ height: HOT_HEADER_H }}
            >
              <span className="text-[25px] font-black text-white tracking-[5px]">HOT ITEM</span>
              <button
                type="button"
                onClick={() => navigate("/auction?sort=popular")}
                className="flex items-center gap-1 text-[14px] text-white/90 hover:text-white cursor-pointer"
              >
                더보기 <ChevronRight size={14} />
              </button>
            </div>

            <div className="bg-white" style={{ height: HOT_LIST_H }}>
              {(hotItemsLoading || hotItemsError || hotItems.length === 0) ? (
                <p className="grid place-items-center text-[16px] text-[#666] h-full">
                  {hotItemsLoading ? "인기 경매를 불러오는 중입니다." : hotItemsError ? "인기 경매를 불러오지 못했습니다." : "표시할 인기 경매가 없습니다."}
                </p>
              ) : (
                Array.from({ length: PAGE_SIZE }).map((_, rowIdx) => {
                  const itemPage  = Math.min(rowPages[rowIdx], pageCount - 1);
                  const item      = hotItems[itemPage * PAGE_SIZE + rowIdx];
                  const isHovered = hoveredRow === rowIdx;
                  if (!item) return <div key={rowIdx} className="border-b border-[#ebebeb]" style={{ height: ITEM_HEIGHT }} />;
                  return (
                    <Link
                      key={rowIdx}
                      to={`/auction/${item.id}`}
                      className="flex items-center border-b border-[#ebebeb] px-5 no-underline"
                      style={{ height: ITEM_HEIGHT, ...rowStyles[rowIdx], transformOrigin: "center center", display: "flex" }}
                      onMouseEnter={() => setHoveredRow(rowIdx)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <div
                        className="flex shrink-0 size-7.25 items-center justify-center rounded-full transition-colors duration-200"
                        style={{ backgroundColor: isHovered ? "#0064ff" : "#E6F0FF" }}
                      >
                        <span className="font-bold text-[13px] tracking-[-0.65px] transition-colors duration-200" style={{ color: isHovered ? "#fff" : "#0064ff" }}>
                          {item.rank}
                        </span>
                      </div>
                      <span className="flex-1 min-w-0 truncate text-[16px] text-black tracking-[-0.8px] ml-2.5">{item.name}</span>
                      <span className="shrink-0 font-bold text-[16px] text-black tracking-[-0.8px]">{item.price}</span>
                    </Link>
                  );
                })
              )}
            </div>

            {pageCount > 1 ? (
              <div
                className="flex justify-center gap-1.5 items-center bg-white rounded-bl-[20px] rounded-br-[20px]"
                style={{ height: HOT_INDICATOR_H }}
              >
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToPage(i)}
                    className="cursor-pointer rounded-full transition-all duration-300"
                    style={{ width: i === visiblePage ? 16 : 8, height: 8, backgroundColor: i === visiblePage ? "#0064ff" : "#c9d3e0" }}
                  />
                ))}
              </div>
            ) : (
              <div
                className="bg-white rounded-bl-[20px] rounded-br-[20px]"
                style={{ height: HOT_INDICATOR_H }}
              />
            )}
          </div>

        </div>
      </div>
    </>
  );
}
