import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActionButton } from "@components/common/ui";
import AuctionCard from "./AuctionCard";

const CARD_GAP = 20;

export default function AuctionSection({
  closingError, closingItems, closingLoading,
  newError, newItems, newLoading,
}) {
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [activeTab, setActiveTab] = useState("new");
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const items     = activeTab === "new" ? newItems     : closingItems;
  const isError   = activeTab === "new" ? newError     : closingError;
  const isLoading = activeTab === "new" ? newLoading   : closingLoading;

  const updateNavigation = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const maxScrollLeft = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    setCanScrollPrev(carousel.scrollLeft > 1);
    setCanScrollNext(carousel.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;

    const frameId = window.requestAnimationFrame(updateNavigation);
    const resizeObserver = new ResizeObserver(updateNavigation);
    resizeObserver.observe(carousel);
    carousel.addEventListener("scroll", updateNavigation, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      carousel.removeEventListener("scroll", updateNavigation);
    };
  }, [activeTab, items.length, updateNavigation]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    carouselRef.current?.scrollTo({ left: 0, behavior: "auto" });
  };

  const scrollCarousel = (direction) => {
    const carousel = carouselRef.current;
    const firstSlide = carousel?.querySelector("[data-auction-slide]");
    if (!carousel || !firstSlide) return;
    const slideWidth = firstSlide.getBoundingClientRect().width;
    carousel.scrollBy({ left: direction * (slideWidth + CARD_GAP), behavior: "smooth" });
  };

  return (
    <section className="py-12 border-t border-[#e0e0e0]">
      <div className="container">

        {/* 탭 */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => handleTabChange("new")}
            className={`h-[60px] w-[242px] rounded-[40px] font-bold text-[25px] tracking-[-2px] transition-colors cursor-pointer border-none ${
              activeTab === "new" ? "bg-[#0064ff] text-white" : "bg-[#ebebeb] text-[#969696]"
            }`}
          >
            신규 경매
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("closing")}
            className={`h-[60px] w-[242px] rounded-[40px] font-bold text-[25px] tracking-[-2px] transition-colors cursor-pointer border-none ${
              activeTab === "closing" ? "bg-[#0064ff] text-white" : "bg-[#ebebeb] text-[#969696]"
            }`}
          >
            마감 임박 경매
          </button>
        </div>

        {/* 캐러셀: 화살표는 카드 영역 밖 */}
        <div className="relative">
          {/* 좌 화살표 */}
          <button
            type="button"
            onClick={() => scrollCarousel(-1)}
            disabled={!canScrollPrev}
            aria-label="이전"
            className="absolute top-1/2 left-2 z-10 flex size-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-[#e0e0e0] bg-white transition-colors hover:bg-[#f3f5fa] disabled:cursor-not-allowed disabled:opacity-30 min-[1720px]:left-[-52px]"
          >
            <ChevronLeft size={22} />
          </button>

          {/* 카드 영역 */}
          <div
            ref={carouselRef}
            className="snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {isLoading && (
              <p className="grid h-[373px] place-items-center text-[18px] text-[#666]">경매를 불러오는 중입니다.</p>
            )}
            {!isLoading && isError && (
              <p className="grid h-[373px] place-items-center text-[18px] text-[#9b2c2c]">경매를 불러오지 못했습니다.</p>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <p className="grid h-[373px] place-items-center text-[18px] text-[#666]">표시할 경매가 없습니다.</p>
            )}
            {!isLoading && !isError && items.length > 0 && (
              <div className="flex gap-5">
                {items.map((item) => (
                  <div
                    key={`${activeTab}-${item.id}`}
                    data-auction-slide
                    className="w-[calc((100%_-_40px)/3)] shrink-0 snap-start xl:w-[calc((100%_-_60px)/4)] 2xl:w-[calc((100%_-_80px)/5)]"
                  >
                    <AuctionCard
                      fluid
                      item={item}
                      onClick={() => navigate(`/auction/${item.id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 우 화살표 */}
          <button
            type="button"
            onClick={() => scrollCarousel(1)}
            disabled={!canScrollNext}
            aria-label="다음"
            className="absolute top-1/2 right-2 z-10 flex size-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-[#e0e0e0] bg-white transition-colors hover:bg-[#f3f5fa] disabled:cursor-not-allowed disabled:opacity-30 min-[1720px]:right-[-52px]"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* 더보기 */}
        <div className="flex justify-center mt-8">
          <ActionButton
            to={activeTab === "new" ? "/auction?sort=latest" : "/auction?sort=deadline&endingSoonOnly=true"}
            tone="neutral"
            className="w-[100px] rounded-[40px] !border-[#ebebeb] !bg-[#f3f5fa] !text-[#4e4e4e] hover:!bg-[#e9edf5]"
          >
            더보기
          </ActionButton>
        </div>

      </div>
    </section>
  );
}
