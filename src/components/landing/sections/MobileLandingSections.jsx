// src/components/landing/sections/MobileLandingSections.jsx
//
// 태블릿/모바일(md 미만) 전용 랜딩 레이아웃.
// - 기존 데스크톱 버전(ScaledStage)은 1920px 디자인을 통째로 축소하는 방식이라, 화면이 깨지진
//   않지만 글자·터치 타겟까지 같이 줄어들어 실제 모바일 UX로는 부적합했다.
// - 여기서는 같은 데이터(카드 컴포넌트도 재사용)를 절대좌표 없이 진짜 반응형(세로 스택 +
//   가로 스크롤 캐러셀)으로 다시 배치한다. 모바일 전용 디자인 시안은 따로 없어서
//   "요즘 반응형 스타일"에 맞춰 통상적인 패턴(세로 스택, 스와이프 카드, 아이콘 가로 스크롤)으로 구성했다.
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import arrowDark from "@assets/img/arrowDark.png";
import { ActionButton } from "@components/common/ui";
import { assets } from "./assets";
import AuctionCard from "./AuctionCard";


export default function MobileLandingSections({
  closingAuctionItems,
  closingAuctionError,
  closingAuctionLoading,
  hotItems,
  isHotAuctionError,
  isHotAuctionLoading,
  newAuctionItems,
  newAuctionError,
  newAuctionLoading,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("new");
  const auctionScrollRef = useRef(null);

  const scrollCarousel = (ref, dir) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * ref.current.clientWidth, behavior: "smooth" });
  };

  const auctionItems = activeTab === "new" ? newAuctionItems : closingAuctionItems;
  const isAuctionError = activeTab === "new" ? newAuctionError : closingAuctionError;
  const isAuctionLoading = activeTab === "new" ? newAuctionLoading : closingAuctionLoading;

  return (
    <div className="flex flex-col gap-8 pb-10 lg:hidden">
      {/* ── 히어로: 배경 이미지 + 타이틀 + 태그 + 검색 + 슬라이드 배너 ── */}
      <section className="relative overflow-hidden">
        {/* 배경 이미지 + 오버레이 */}
        <div className="absolute inset-0">
          <img src={assets.bgImg} alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/45" />
        </div>

        <div className="relative z-10 px-4 pt-8 pb-6 text-center">
          {/* 타이틀 */}
          <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">
            <span className="text-[#7b82e0]">실시간 경매</span>
            <span className="text-white">와</span><br />
            <span className="text-[#00ccd0]">생활 서비스</span>
            <span className="text-white">를 한 화면에서</span>
          </h1>

          {/* 슬라이드 배너 */}
          <div className="mt-4">
            <div
              className="overflow-hidden rounded-[20px] bg-white/90 cursor-pointer"
              onClick={() => navigate("/customersupport/guide")}
            >
              <div className="flex items-center gap-4 pl-5 pr-4 py-5">
                <img
                  src={assets.heroSectionImg}
                  alt=""
                  className="h-[90px] object-contain shrink-0 pointer-events-none"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11px] font-bold text-[#0064ff] tracking-[2px] mb-1">START GUIDE</p>
                  <p className="font-bold text-[18px] text-black leading-snug tracking-tight">
                    처음이어도 흐름만 알면 어렵지<br />않아요.
                  </p>
                  <p className="text-[12px] text-black mt-1">경매와 서비스 요청, 시작부터 완료까지 한눈에 확인하세요.</p>
                  <ActionButton
                    className="mt-3"
                    onClick={(event) => event.stopPropagation()}
                    size="sm"
                    to="/customersupport/guide"
                  >
                    이용가이드 보기
                  </ActionButton>
                </div>
              </div>
              {/* 인디케이터 */}
              <div className="flex justify-center items-center py-2">
                <div className="rounded-full" style={{ width: 16, height: 8, backgroundColor: "#0064ff", boxShadow: "0 0 6px rgba(0,100,255,0.6)" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOT ITEM */}
      <section className="px-4">
        <div className="overflow-hidden rounded-2xl border border-[#ebebeb] shadow-sm">
          <div className="flex items-center justify-between bg-[#0064ff] px-4 py-3">
            <span className="text-[16px] font-black tracking-[2px] text-white">HOT ITEM</span>
            <button type="button" onClick={() => navigate("/auction?sort=popular")} className="text-[12px] text-white/90">더보기 ›</button>
          </div>
          <ul className="divide-y divide-[#f0f0f0] bg-white">
            {hotItems.slice(0, 5).map((item, i) => (
              <li key={item.id}>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f7f9fc]"
                  onClick={() => navigate(`/auction/${item.id}`)}
                  type="button"
                >
                  <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${i === 0 ? "bg-[#0064ff]" : "bg-[#c9d3e0]"}`}>
                    {item.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px]">{item.name}</span>
                  <span className="shrink-0 text-[14px] font-bold">{item.price}</span>
                </button>
              </li>
            ))}
            {!isHotAuctionLoading && !isHotAuctionError && hotItems.length === 0 && (
              <li className="px-4 py-6 text-center text-[14px] text-[#666]">표시할 인기 경매가 없습니다.</li>
            )}
            {isHotAuctionLoading && <li className="px-4 py-6 text-center text-[14px] text-[#666]">불러오는 중입니다.</li>}
            {isHotAuctionError && <li className="px-4 py-6 text-center text-[14px] text-[#9b2c2c]">인기 경매를 불러오지 못했습니다.</li>}
          </ul>
        </div>
      </section>

      {/* 경매 (탭 + 가로 스와이프 카드) */}
      <section>
        <div className="mb-3 flex items-center justify-between px-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("new")}
              className={`rounded-full px-4 py-2 text-[15px] font-bold transition-colors ${activeTab === "new" ? "bg-[#0064ff] text-white" : "bg-[#ebebeb] text-[#969696]"}`}
            >
              신규 경매
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("closing")}
              className={`rounded-full px-4 py-2 text-[15px] font-bold transition-colors ${activeTab === "closing" ? "bg-[#0064ff] text-white" : "bg-[#ebebeb] text-[#969696]"}`}
            >
              마감 임박 경매
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="이전"
              onClick={() => scrollCarousel(auctionScrollRef, -1)}
              className="flex size-[32px] items-center justify-center"
            >
              <img src={arrowDark} alt="이전" className="size-[20px] object-contain rotate-180" />
            </button>
            <button
              type="button"
              aria-label="다음"
              onClick={() => scrollCarousel(auctionScrollRef, 1)}
              className="flex size-[32px] items-center justify-center"
            >
              <img src={arrowDark} alt="다음" className="size-[20px] object-contain" />
            </button>
          </div>
        </div>
        <div
          ref={auctionScrollRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-padding-left:16px]"
        >
          {!isAuctionLoading && !isAuctionError && auctionItems.map((item) => (
            <div
              key={item.id}
              className="w-full shrink-0 snap-start min-[480px]:w-[calc(50%_-_8px)]"
            >
              <AuctionCard
                fluid
                item={item}
                onClick={() => navigate(`/auction/${item.id}`)}
              />
            </div>
          ))}
          {isAuctionLoading && <p className="w-full px-4 py-14 text-center text-[16px] text-[#666]">경매를 불러오는 중입니다.</p>}
          {isAuctionError && <p className="w-full px-4 py-14 text-center text-[16px] text-[#9b2c2c]">경매를 불러오지 못했습니다.</p>}
          {!isAuctionLoading && !isAuctionError && auctionItems.length === 0 && <p className="w-full px-4 py-14 text-center text-[16px] text-[#666]">표시할 경매가 없습니다.</p>}
        </div>
        <div className="mt-2 flex justify-center">
          <ActionButton
            to={activeTab === "new"
              ? "/auction?sort=latest"
              : "/auction?sort=deadline&endingSoonOnly=true"}
            tone="neutral"
            size="sm"
            className="rounded-full px-5"
          >
            더보기 ›
          </ActionButton>
        </div>
      </section>

    </div>
  );
}
