import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, LoaderCircle, Star, X } from 'lucide-react';
import { getAuctionStatus } from '@api/auctionApi';
import { getUserReviews } from '@api/reviewApi';
import Pagination from '@components/common/Pagination';
import { ActionButton } from '@components/common/ui';

const PAGE_SIZE = 5;

const AuctionSellerReviewDialog = ({
  isOpen,
  sellerId,
  sellerName,
  returnPath = '/auction',
  onClose,
  onToast,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [openingProductId, setOpeningProductId] = useState(null);
  const closeButtonRef = useRef(null);
  const numericSellerId = Number(sellerId);
  const hasSellerId = Number.isSafeInteger(numericSellerId) && numericSellerId > 0;
  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'seller-auction', numericSellerId, 'goods', page - 1, PAGE_SIZE],
    queryFn: () => getUserReviews(numericSellerId, {
      dealType: 'goods',
      page: page - 1,
      size: PAGE_SIZE,
    }).then((response) => response?.data ?? response),
    enabled: Boolean(isOpen && hasSellerId),
  });

  const reviews = reviewsQuery.data?.content ?? [];
  const totalCount = Number(reviewsQuery.data?.totalCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (!isOpen) return undefined;

    const focusFrameId = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrameId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!reviewsQuery.isSuccess || page <= totalPages) return undefined;

    const pageFrameId = window.requestAnimationFrame(() => setPage(totalPages));
    return () => window.cancelAnimationFrame(pageFrameId);
  }, [page, reviewsQuery.isSuccess, totalPages]);

  const handleProductOpen = async (review) => {
    const productId = Number(review.productId);
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      onToast?.('연결된 경매 정보를 찾을 수 없습니다.');
      return;
    }

    setOpeningProductId(productId);
    try {
      const auctionStatus = await queryClient.fetchQuery({
        queryKey: ['auctionStatus', productId],
        queryFn: () => getAuctionStatus(productId),
        staleTime: 5 * 60 * 1000,
      });
      const auctionId = Number(auctionStatus?.aucSn);
      if (!Number.isSafeInteger(auctionId) || auctionId <= 0) {
        throw new Error('Auction not found');
      }

      setOpeningProductId(null);
      onClose();
      navigate(`/auction/${auctionId}`, { state: { from: returnPath } });
    } catch {
      setOpeningProductId(null);
      onToast?.('연결된 경매 상세를 불러오지 못했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      aria-labelledby="auction-seller-review-title"
      aria-modal="true"
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="flex max-h-[min(760px,90dvh)] w-full max-w-[680px] flex-col overflow-hidden rounded-lg bg-white shadow-[0_18px_54px_rgba(0,0,0,0.22)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-[#ececec] px-5 md:px-6">
          <div className="min-w-0">
            <h2 className="m-0 truncate text-body-lg font-bold text-[#1d1d1f]" id="auction-seller-review-title">
              {sellerName || '판매자'}님의 받은 리뷰
            </h2>
            {!reviewsQuery.isLoading && !reviewsQuery.isError && (
              <p className="mt-1 mb-0 text-caption text-[#777]">받은 리뷰 {totalCount.toLocaleString('ko-KR')}건</p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            aria-label="판매자 리뷰 닫기"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#d9d9d9] bg-white text-[#555] hover:border-primary hover:text-primary"
            title="닫기"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {reviewsQuery.isLoading && (
            <div className="space-y-3" aria-label="판매자 리뷰를 불러오는 중">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="h-28 animate-pulse rounded-lg bg-[#f3f5f8]" key={index} />
              ))}
            </div>
          )}

          {reviewsQuery.isError && (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <p className="m-0 text-body-sm text-[#b42318]">판매자 리뷰를 불러오지 못했습니다.</p>
                <ActionButton
                  className="mt-3"
                  onClick={() => reviewsQuery.refetch()}
                  size="sm"
                  tone="neutral"
                >
                  다시 불러오기
                </ActionButton>
              </div>
            </div>
          )}

          {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 && (
            <p className="m-0 grid min-h-64 place-items-center text-center text-body-sm text-[#777]">
              아직 받은 리뷰가 없습니다.
            </p>
          )}

          {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length > 0 && (
            <>
              <ul className="m-0 list-none divide-y divide-[#eceef1] p-0">
                {reviews.map((review) => (
                  <li className="py-5 first:pt-0" key={review.reviewId}>
                    <div className="flex items-start justify-between gap-4">
                      {review.productTitle && Number(review.productId) > 0 ? (
                        <button
                          className="inline-flex min-w-0 cursor-pointer items-start gap-1 border-0 bg-transparent p-0 text-left text-body-md font-bold break-words text-[#1d1d1f] hover:text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                          disabled={openingProductId != null}
                          title={`${review.productTitle} 경매 상세보기`}
                          type="button"
                          onClick={() => handleProductOpen(review)}
                        >
                          <span className="min-w-0">{review.productTitle}</span>
                          {openingProductId === Number(review.productId) ? (
                            <LoaderCircle className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" size={17} />
                          ) : (
                            <ChevronRight className="mt-0.5 shrink-0" aria-hidden="true" size={17} />
                          )}
                        </button>
                      ) : (
                        <strong className="min-w-0 text-body-md font-bold break-words text-[#777]">
                          상품 정보를 확인할 수 없는 거래
                        </strong>
                      )}
                      <span className="shrink-0 text-caption text-[#888]">{review.createdDate}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <strong
                          aria-label={`평점 ${review.rating}점`}
                          className="inline-flex items-center gap-1 text-body-sm text-[#d97706]"
                        >
                          <Star aria-hidden="true" fill="currentColor" size={17} />
                          {review.rating} / 5
                        </strong>
                        <span className="rounded bg-[#f1f4f8] px-2 py-1 text-caption font-semibold text-[#667085]">
                          {review.dealType === 'service' ? '서비스 거래' : '물건 거래'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 mb-0 break-words text-body-md leading-7 text-[#353535]">
                      {review.content || '작성된 리뷰 내용이 없습니다.'}
                    </p>
                    <p className="mt-2 mb-0 text-caption text-[#888]">
                      구매자 {review.reviewerName || '정보 없음'}
                    </p>
                  </li>
                ))}
              </ul>
              <Pagination
                ariaLabel="판매자 리뷰 페이지"
                className="mb-0"
                disabled={reviewsQuery.isFetching}
                maxVisiblePages={5}
                page={page}
                showSinglePage
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default AuctionSellerReviewDialog;
