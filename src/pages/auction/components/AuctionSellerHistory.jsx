import { memo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchSellerAuctionHistory } from '@api/auctionApi';
import { toImageUrl } from '@api/fileApi';
import { ActionButton } from '@components/common/ui';

const HISTORY_PAGE_SIZE = 5;
const HISTORY_FETCH_SIZE = 60;

const fetchRemainingSellerAuctionHistory = async (sellerId, totalFetchPages) => {
  const pageRequests = Array.from(
    { length: Math.max(0, totalFetchPages - 1) },
    (_, index) => fetchSellerAuctionHistory(sellerId, {
      page: index + 2,
      size: HISTORY_FETCH_SIZE,
      sort: 'latest',
    }),
  );
  const pages = await Promise.all(pageRequests);
  return pages.flatMap((pageData) => pageData?.items ?? []);
};

const AuctionSellerHistory = ({
  currentAuctionId,
  sellerId,
  sellerName,
  returnPath = '/auction',
  enabled = true,
}) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number.parseInt(searchParams.get('sellerPage') ?? '1', 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const changePage = (nextPage) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextPage <= 1) {
      nextSearchParams.delete('sellerPage');
    } else {
      nextSearchParams.set('sellerPage', String(nextPage));
    }
    setSearchParams(nextSearchParams, {
      replace: true,
      state: {
        ...(location.state && typeof location.state === 'object' ? location.state : {}),
        preserveScrollPosition: true,
      },
    });
  };

  const firstHistoryQuery = useQuery({
    queryKey: ['sellerAuctionHistory', sellerId, 'first'],
    queryFn: () => fetchSellerAuctionHistory(sellerId, {
      page: 1,
      size: HISTORY_FETCH_SIZE,
      sort: 'latest',
    }),
    enabled: Boolean(enabled && sellerId),
  });
  const totalFetchPages = firstHistoryQuery.data?.totalPages ?? 0;
  const remainingHistoryQuery = useQuery({
    queryKey: ['sellerAuctionHistory', sellerId, 'remaining', totalFetchPages],
    queryFn: () => fetchRemainingSellerAuctionHistory(sellerId, totalFetchPages),
    enabled: Boolean(enabled && sellerId && firstHistoryQuery.isSuccess && totalFetchPages > 1),
  });

  const firstHistoryItems = firstHistoryQuery.data?.items ?? [];
  const historyItems = [
    ...firstHistoryItems,
    ...(remainingHistoryQuery.data ?? []),
  ];
  const totalElements = firstHistoryQuery.data?.totalElements ?? historyItems.length;
  const totalPages = Math.ceil(totalElements / HISTORY_PAGE_SIZE);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const firstItemIndex = (currentPage - 1) * HISTORY_PAGE_SIZE;
  const items = historyItems.slice(firstItemIndex, firstItemIndex + HISTORY_PAGE_SIZE);
  const isInitialWaiting = !enabled || firstHistoryQuery.isLoading;
  const isCurrentPageWaiting = !isInitialWaiting
    && items.length === 0
    && firstItemIndex < totalElements
    && remainingHistoryQuery.isLoading;
  const hasCurrentPageError = firstHistoryQuery.isError
    || (items.length === 0 && remainingHistoryQuery.isError);

  return (
    <div aria-label="판매자가 등록한 경매 상품">
      <div className="mb-4 flex min-h-6 items-center justify-between gap-3">
        <h3 className="m-0 text-body-md font-bold text-[#1d1d1f]">판매자의 경매 상품</h3>
        {!isInitialWaiting && !hasCurrentPageError && (
          <span className="shrink-0 text-caption font-semibold text-[#777]">
            {Number(totalElements).toLocaleString('ko-KR')}개
          </span>
        )}
      </div>

      {(isInitialWaiting || isCurrentPageWaiting) && (
        <div className="grid grid-cols-5 gap-2.5 md:gap-4" aria-label="판매자 경매 상품을 불러오는 중">
          {Array.from({ length: HISTORY_PAGE_SIZE }).map((_, index) => (
            <span
              className="aspect-square animate-pulse rounded-lg border border-[#e8e8e8] bg-[#f1f1ef]"
              key={index}
            />
          ))}
        </div>
      )}

      {hasCurrentPageError && (
        <div className="grid min-h-28 place-items-center rounded-lg border border-[#e8e8e8] bg-[#f8f8f6] p-5 text-center">
          <div>
            <p className="m-0 text-body-sm text-[#666]">판매자 경매 상품을 불러오지 못했습니다.</p>
            <ActionButton
              className="mt-3"
              onClick={() => {
                firstHistoryQuery.refetch();
                if (remainingHistoryQuery.isError) remainingHistoryQuery.refetch();
              }}
              size="sm"
              tone="neutral"
            >
              다시 시도
            </ActionButton>
          </div>
        </div>
      )}

      {!isInitialWaiting && !isCurrentPageWaiting && !hasCurrentPageError && totalElements === 0 && (
        <p className="m-0 grid min-h-28 place-items-center rounded-lg border border-[#e8e8e8] bg-[#f8f8f6] p-5 text-center text-body-sm text-[#777]">
          등록된 경매 상품이 없습니다.
        </p>
      )}

      {!isInitialWaiting && !isCurrentPageWaiting && !hasCurrentPageError && items.length > 0 && (
        <div className="grid grid-cols-5 gap-2.5 md:gap-4">
            {items.map((item) => {
              const thumbnailUrl = toImageUrl(item.thumbnailPath);
              const isCurrentAuction = String(item.auctionId) === String(currentAuctionId);
              const thumbnail = thumbnailUrl ? (
                <img
                  className={`size-full object-cover ${
                    isCurrentAuction ? '' : 'transition duration-200 group-hover:scale-[1.03]'
                  }`}
                  src={thumbnailUrl}
                  alt={item.title}
                />
              ) : (
                <span className="grid size-full place-items-center px-2 text-center text-caption font-semibold text-[#777]">
                  이미지 없음
                </span>
              );

              if (isCurrentAuction) {
                return (
                  <div
                    className="relative aspect-square min-w-0 cursor-default overflow-hidden rounded-lg border-2 border-primary bg-[#eef5ff] shadow-[0_0_0_3px_rgba(0,100,255,0.12)]"
                    key={item.auctionId}
                    title={`${item.title} - 보고 있는 경매`}
                    aria-current="page"
                    aria-label={`${item.title}, 현재 보고 있는 경매`}
                  >
                    {thumbnail}
                    <span className="absolute top-1.5 left-1.5 z-10 rounded bg-primary px-1.5 py-1 text-xs leading-none font-bold text-white shadow-sm md:top-2 md:left-2 md:px-2 md:text-[13px]">
                      <span className="md:hidden">현재</span>
                      <span className="hidden md:inline">보고 있는 경매</span>
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  className="group relative aspect-square min-w-0 overflow-hidden rounded-lg border border-[#e8e8e8] bg-[#f5f5f3] no-underline transition hover:border-primary hover:shadow-[0_4px_12px_rgba(0,100,255,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  key={item.auctionId}
                  to={`/auction/${item.auctionId}${location.search}`}
                  state={{ from: returnPath }}
                  title={item.title}
                  aria-label={`${sellerName || '판매자'}의 경매 상품 ${item.title} 상세보기`}
                >
                  {thumbnail}
                </Link>
              );
            })}
        </div>
      )}

      {!isInitialWaiting && !firstHistoryQuery.isError && totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-3" aria-label="판매자 경매 상품 페이지">
              <button
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[#d9d9d9] bg-white text-[#555] hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                type="button"
                aria-label="이전 판매자 경매 상품"
                disabled={currentPage <= 1}
                onClick={() => changePage(Math.max(1, currentPage - 1))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <span className="min-w-16 text-center text-caption font-bold tabular-nums text-[#555]">
                {currentPage} / {totalPages}
              </span>
              <button
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[#d9d9d9] bg-white text-[#555] hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                type="button"
                aria-label="다음 판매자 경매 상품"
                disabled={currentPage >= totalPages}
                onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
        </nav>
      )}
    </div>
  );
};

export default memo(AuctionSellerHistory);
