import { memo } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import TempComment from './TempComment';
import { SkeletonBlock } from '@components/skeleton/AuctionSkeletons';

const SELLER_INFO_ITEM_CLASS = 'grid min-h-[72px] content-center gap-1 border-b border-[#eceef1] py-3 last:border-b-0 md:grid-cols-[140px_minmax(0,1fr)] md:items-center md:gap-6';

const toReviewCount = (reviewCount) => {
  if (reviewCount == null || reviewCount === '') return null;
  const numericCount = Number(reviewCount);
  return Number.isFinite(numericCount) && numericCount >= 0 ? numericCount : null;
};

const toRating = (rating) => {
  if (rating == null || rating === '') return null;
  const numericRating = Number(rating);
  return Number.isFinite(numericRating) ? numericRating : null;
};

const formatSellerRating = (rating, reviewCount) => {
  const numericCount = toReviewCount(reviewCount);
  const numericRating = toRating(rating);
  if (numericCount == null || (numericCount > 0 && numericRating == null)) return '평점 정보 없음';
  if (numericCount === 0) return '등록된 평점 없음';
  return `${numericRating.toFixed(1)} / 5.0`;
};

const formatSellerReviewCount = (reviewCount) => {
  const numericCount = toReviewCount(reviewCount);
  if (numericCount == null) return '리뷰 정보 없음';
  return `${numericCount.toLocaleString('ko-KR')}개`;
};

const hasSellerRating = (rating, reviewCount) => (
  toRating(rating) != null && (toReviewCount(reviewCount) ?? 0) > 0
);

export const AuctionProductDescriptionSection = memo(({ content, sectionId }) => (
  <section
    className="scroll-mt-[208px] border-b border-[#e2e5ea] py-10 md:scroll-mt-[82px] md:py-14"
    id={sectionId}
    aria-labelledby={`${sectionId}-title`}
  >
    <header className="mb-7">
      <h2
        className="m-0 text-h2 font-bold text-[#1d1d1f]"
        id={`${sectionId}-title`}
      >
        상품 설명
      </h2>
    </header>

    <TempComment content={content} />
  </section>
));

AuctionProductDescriptionSection.displayName = 'AuctionProductDescriptionSection';

export const AuctionSellerInformationSection = ({
  auction,
  selectedTradeName,
  sectionId,
  sellerRating,
  sellerReviewCount,
  isSellerRatingLoading = false,
  onSellerReviewsOpen,
  children,
}) => {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return (
    <section
      className="scroll-mt-[208px] py-10 md:scroll-mt-[82px] md:py-14"
      id={sectionId}
      aria-labelledby={`${sectionId}-title`}
    >
    <header className="mb-7">
      <h2
        className="m-0 text-h2 font-bold text-[#1d1d1f]"
        id={`${sectionId}-title`}
      >
        판매자 정보
      </h2>
    </header>

    <dl className="m-0 border-y border-[#e2e5ea]">
      <div className={SELLER_INFO_ITEM_CLASS}>
        <dt className="text-caption font-bold text-[#666]">판매자</dt>
        <dd className="m-0 text-body-md font-semibold text-[#1d1d1f]">
          {auction.sellerId
            ? (
              <Link
                className="text-inherit underline-offset-4 hover:text-primary hover:underline"
                state={{
                  tradeProfileReturn: {
                    label: '경매 상세로 돌아가기',
                    to: returnTo,
                  },
                }}
                to={`/users/${auction.sellerId}`}
              >
                {auction.sellerName || '판매자'}
              </Link>
            )
            : (auction.sellerName || '판매자')}
        </dd>
      </div>
      <div className={SELLER_INFO_ITEM_CLASS}>
        <dt className="text-caption font-bold text-[#666]">평점</dt>
        <dd className="m-0 text-body-md text-[#1d1d1f]">
          {isSellerRatingLoading
            ? <SkeletonBlock className="h-5 w-28" />
            : hasSellerRating(sellerRating, sellerReviewCount)
              ? (
                <span className="inline-flex items-center gap-1.5" aria-label={`물건 리뷰 평균 별점 ${Number(sellerRating).toFixed(1)}점, 5점 만점`}>
                  <Star aria-hidden="true" className="fill-[#ffca3a] text-[#ffca3a]" size={17} />
                  {formatSellerRating(sellerRating, sellerReviewCount)}
                </span>
              )
              : formatSellerRating(sellerRating, sellerReviewCount)}
        </dd>
      </div>
      <div className={SELLER_INFO_ITEM_CLASS}>
        <dt className="text-caption font-bold text-[#666]">받은 리뷰</dt>
        <dd className="m-0 text-body-md text-[#1d1d1f]">
          {isSellerRatingLoading
            ? <SkeletonBlock className="h-5 w-20" />
            : (toReviewCount(sellerReviewCount) ?? 0) > 0 && typeof onSellerReviewsOpen === 'function'
              ? (
                <button
                  className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-body-md font-semibold text-primary hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  type="button"
                  onClick={onSellerReviewsOpen}
                >
                  {formatSellerReviewCount(sellerReviewCount)}
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              )
              : formatSellerReviewCount(sellerReviewCount)}
        </dd>
      </div>
      <div className={SELLER_INFO_ITEM_CLASS}>
        <dt className="text-caption font-bold text-[#666]">거래 방식</dt>
        <dd className="m-0 text-body-md text-[#1d1d1f]">{selectedTradeName}</dd>
      </div>
      {children && (
        <div className="border-b border-[#eceef1] py-4 last:border-b-0">
          <dt className="sr-only">판매자가 등록한 경매 상품</dt>
          <dd className="m-0">{children}</dd>
        </div>
      )}
    </dl>
    </section>
  );
};
