import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

const TRACK_CYCLE_COUNT = 21;
const TRACK_CENTER_CYCLE = Math.floor(TRACK_CYCLE_COUNT / 2);
const getLogicalIndex = (index, count) => ((index % count) + count) % count;

const AuctionImageGallery = ({
  auction,
  imageItems,
  activeImageIndex,
  failedImageUrls,
  navigationCommand,
  onMoveImage,
  onImageClick,
  onImageError,
}) => {
  const slideCount = imageItems.length;
  const processingCommandIdRef = useRef(null);
  const [virtualTrackIndex, setVirtualTrackIndex] = useState(
    slideCount > 1
      ? (TRACK_CENTER_CYCLE * slideCount) + activeImageIndex
      : activeImageIndex,
  );
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const repeatedImageItems = slideCount > 1
    ? Array.from(
      { length: TRACK_CYCLE_COUNT },
      () => imageItems,
    ).flat()
    : imageItems;

  useEffect(() => {
    if (
      !navigationCommand
      || processingCommandIdRef.current === navigationCommand.id
    ) {
      return undefined;
    }

    processingCommandIdRef.current = navigationCommand.id;
    const frameId = window.requestAnimationFrame(() => {
      setIsTransitionEnabled(true);
      setVirtualTrackIndex((currentIndex) => {
        const currentLogicalIndex = getLogicalIndex(currentIndex, slideCount);

        if (navigationCommand.status === 'RIGHT') {
          const forwardDistance = getLogicalIndex(
            navigationCommand.targetIndex - currentLogicalIndex,
            slideCount,
          );
          return currentIndex + forwardDistance;
        }

        const backwardDistance = getLogicalIndex(
          currentLogicalIndex - navigationCommand.targetIndex,
          slideCount,
        );
        return currentIndex - backwardDistance;
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [navigationCommand, slideCount]);

  const handleTrackTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;

    setIsTransitionEnabled(false);
    setVirtualTrackIndex((currentIndex) => (
      (TRACK_CENTER_CYCLE * slideCount)
      + getLogicalIndex(currentIndex, slideCount)
    ));
  };

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-lg border border-[#e8e8e8] bg-[#e9e9e9] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)] max-lg:h-auto max-lg:aspect-4/3">
      {slideCount > 0 ? (
        <>
          <div
            className={`absolute inset-0 flex ${
              isTransitionEnabled
                ? 'transition-transform duration-[450ms] ease-in-out'
                : 'transition-none'
            } motion-reduce:transition-none`}
            style={{ transform: `translate3d(-${virtualTrackIndex * 100}%, 0, 0)` }}
            data-active-index={activeImageIndex}
            onTransitionEnd={handleTrackTransitionEnd}
          >
            {repeatedImageItems.map((item, index) => (
              <div
                className="flex size-full shrink-0 items-center justify-center bg-[#e9e9e9]"
                key={`${Math.floor(index / slideCount)}-${item.id}`}
                aria-hidden={index !== virtualTrackIndex}
              >
                {item.url && !failedImageUrls.has(item.url) ? (
                  <button
                    aria-label={`${item.alt || auction.title || '상품 이미지'} 확대 보기`}
                    className="block size-full cursor-zoom-in border-0 bg-[#e9e9e9] p-0"
                    onClick={() => onImageClick?.(getLogicalIndex(index, slideCount))}
                    tabIndex={index === virtualTrackIndex ? 0 : -1}
                    type="button"
                  >
                    <img
                      className="block size-full bg-[#e9e9e9] object-cover"
                      src={item.url}
                      alt={item.alt || `${auction.title} 상품 이미지`}
                      onError={() => onImageError(item.url)}
                    />
                  </button>
                ) : (
                  <span className="text-body-lg font-extrabold text-[#666]">
                    {auction.categoryName || '상품 이미지'}
                  </span>
                )}
              </div>
            ))}
          </div>

          {slideCount > 1 && (
            <>
              <button
                className="absolute top-1/2 left-[18px] z-[2] inline-flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white transition-colors hover:bg-white hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                type="button"
                aria-label="이전 이미지 보기"
                onClick={() => onMoveImage(-1)}
              >
                <ChevronLeft size={26} aria-hidden="true" />
              </button>
              <button
                className="absolute top-1/2 right-[18px] z-[2] inline-flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white transition-colors hover:bg-white hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                type="button"
                aria-label="다음 이미지 보기"
                onClick={() => onMoveImage(1)}
              >
                <ChevronRight size={26} aria-hidden="true" />
              </button>
            </>
          )}
        </>
      ) : (
        <span className="absolute inset-0 grid place-items-center text-body-lg font-extrabold text-[#666]">
          {auction.categoryName || '상품 이미지'}
        </span>
      )}
    </div>
  );
};

export const AuctionPreviewRail = ({
  imageItems,
  activeImageIndex,
  failedImageUrls,
  onPreviewClick,
  onImageError,
}) => (
  <section
    className="m-0 min-h-[84px] overflow-hidden rounded-lg border border-[#e8e8e8] bg-white p-[7px]"
    aria-label="상품 이미지 미리보기"
  >
    {imageItems.length > 0 ? (
      <div className="flex snap-x gap-[7px] overflow-x-auto scroll-smooth pb-[3px] motion-reduce:scroll-auto">
        {imageItems.map((item, index) => (
          <button
            className={`grid size-[68px] shrink-0 snap-start cursor-pointer place-items-center overflow-hidden rounded-lg border bg-white p-0 text-[#666] transition-shadow max-lg:size-16 ${
              activeImageIndex === index
                ? 'border-primary shadow-[0_0_0_2px_#e5efff]'
                : 'border-[#e8e8e8]'
            }`}
            type="button"
            key={item.id}
            data-photo={item.url || ''}
            aria-current={activeImageIndex === index ? 'true' : undefined}
            onClick={() => onPreviewClick(index)}
          >
            {item.url && !failedImageUrls.has(item.url) ? (
              <img
                className="size-full bg-[#f6f6f6] object-cover"
                src={item.url}
                alt={item.alt}
                onError={() => onImageError(item.url)}
              />
            ) : (
              <ImageOff size={20} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    ) : (
      <div className="grid min-h-[68px] place-items-center text-caption text-[#666]" role="status">
        등록된 이미지가 없습니다.
      </div>
    )}
  </section>
);

export default AuctionImageGallery;
