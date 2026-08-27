import React, { useState } from "react";

/**
 * 신규 경매/마감 임박 경매 섹션에서 사용하는 개별 경매 상품 카드.
 *
 * 이전에는 캔버스 절대좌표(item.left + 1920 캔버스 기준 top)로 그려서 캐러셀처럼
 * 옆으로 슬라이드시킬 수 없었다. 카드 자신을 기준으로 한 상대좌표로 다시 짜서
 * flex 트랙 안에 나란히 놓고 translateX로 슬라이드할 수 있게 했다.
 * "마감임박"/"D-day" 배지가 카드 상단 테두리보다 25px 위로 튀어나오는 디자인이라
 * 카드 높이에 그만큼 여유(OVERHANG)를 둔다.
 */
const OVERHANG = 25;
const CARD_WIDTH = 295;
const CARD_BODY_HEIGHT = 323;
const OVERHANG_BOTTOM = 25;

export default function AuctionCard({ fluid = false, item, onClick }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const imageFailed = Boolean(item.image) && failedImageUrl === item.image;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      className="relative shrink-0 cursor-pointer"
      style={{ width: fluid ? "100%" : CARD_WIDTH, height: CARD_BODY_HEIGHT + OVERHANG + OVERHANG_BOTTOM}}
    >
      <div
        className="absolute bg-white border border-[#e0e0e0] border-solid rounded-[20px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)]"
        style={{ top: OVERHANG, left: 0, width: "100%", height: CARD_BODY_HEIGHT }}
      />
      <div className="absolute right-px left-px grid place-items-center overflow-hidden rounded-t-[20px] bg-[#f3f4f6] text-base font-semibold text-[#777]" style={{ top: OVERHANG + 1, height: 194 }}>
        {item.image && !imageFailed
          ? (
            <img
              alt={item.name}
              className="size-full object-cover"
              src={item.image}
              onError={() => setFailedImageUrl(item.image)}
            />
          )
          : <span>이미지 없음</span>}
      </div>

      {item.badge && (
        <>
          <div className="absolute bg-[#e63946] rounded-[20px] size-[14px]" style={{ top: OVERHANG + 281, left: 80 }} />
          <p className="absolute font-['Noto_Sans_KR:Bold'] font-bold text-[10px] text-white tracking-[-0.8px] whitespace-nowrap" style={{ top: OVERHANG + 282, left: 83 }}>
            {item.badge}
          </p>
        </>
      )}

      {/* 마감임박(빨강) - urgent 플래그가 있고 D-day 표기가 없을 때만 */}
      {item.urgent && !item.dday && (
        <div className="absolute" style={{ top: 0, left: 22 }}>
          <div className="bg-[#e63946] rounded-[25px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.15)] size-[50px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center font-['Noto_Sans_KR:Bold'] font-bold text-[12px] text-white tracking-[-0.96px] leading-tight">
            <p>마감</p>
            <p>임박</p>
          </div>
        </div>
      )}

      {/* D-day(회색) - urgent 배지와 자리를 공유하므로 배타적으로 렌더링 */}
      {item.dday && (
        <div className="absolute" style={{ top: 0, left: 22 }}>
          <div className="bg-[#4e4e4e] rounded-[25px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.15)] size-[50px]" />
          <p className="absolute inset-0 flex items-center justify-center font-['Noto_Sans_KR:Bold'] font-bold text-[16px] text-center text-white tracking-[-1.6px]">
            {item.dday}
          </p>
        </div>
      )}

      <p className="absolute font-['Noto_Sans_KR:Medium'] font-medium text-[#969696] text-[15px] tracking-[-1.2px] whitespace-nowrap" style={{ top: OVERHANG + 278, left: 22 }}>
        {item.bids}
      </p>
      <p className="absolute right-[22px] overflow-hidden text-ellipsis font-['Noto_Sans_KR:Medium'] text-[18px] font-medium tracking-[-0.9px] whitespace-nowrap text-black" style={{ top: OVERHANG + 210, left: 22 }}>
        {item.name}
      </p>
      <div
        className="absolute right-[18px] left-[22px] flex min-w-0 items-baseline gap-2 overflow-hidden"
        style={{ top: OVERHANG + 238 }}
      >
        <p className="m-0 shrink-0 font-['Noto_Sans_KR:Bold'] text-[25px] font-bold tracking-[-2px] whitespace-nowrap text-black">
          {item.price}
        </p>
        {item.secondaryPrice && (
          <p className="m-0 min-w-0 overflow-hidden text-ellipsis font-['Noto_Sans_KR:Regular'] text-[15px] font-normal tracking-[-1.2px] whitespace-nowrap text-[#969696]">
            {item.secondaryPrice}
          </p>
        )}
      </div>
    </div>
  );
}
