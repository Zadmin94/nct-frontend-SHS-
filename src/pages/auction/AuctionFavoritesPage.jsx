import { useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartOff, RotateCcw } from 'lucide-react';
import {
  fetchMyFavoriteAuctions,
  removeAuctionFavorite,
} from '@api/auctionApi';
import { toImageUrl } from '@api/fileApi';
import { formatPrice, formatDateTime } from '@utils/common';
import { resolveAuctionResultLabel, formatTimeUntil, resolveTradeMethodLabel } from './utils/auctionFormatters';
import useCountdown from '@hooks/useCountdown';
import CardGridSkeleton from '@components/skeleton/CardGridSkeleton';
import MyPageContentHeader from '@components/mypage/MyPageContentHeader';
import MyPageListSectionLayout from '@components/mypage/MyPageListSectionLayout';
import MyPageAuctionListItem from '@components/mypage/MyPageAuctionListItem';
import MyPageListEmpty from '@components/mypage/MyPageListEmpty';
import MyPageListError from '@components/mypage/MyPageListError';
import MyPageStatusBadge from '@components/mypage/MyPageStatusBadge';
import MyPageListSkeleton from '@components/skeleton/MyPageListSkeleton';
import Pagination from '@components/common/Pagination';
import AuctionCard from './components/AuctionCard';
import Toast from '@components/common/Toast';
import { ActionButton } from '@components/common/ui';
import '@assets/css/my-active-auctions.css';

const PAGE_SIZE = 12;

const MAX_VISIBLE_PAGES = 5;
const PAGINATION_BUTTON_CLASS =
  'min-h-10 rounded-lg border border-[#e2e1dc] bg-white px-3.5 text-sm font-semibold text-[#5f5e5a] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45';

const EMPTY_STATE_CLASS =
  'grid min-h-[340px] place-content-center justify-items-center gap-2.5 rounded-lg border border-[#f0efec] bg-[#f8f8f6] p-7 text-center';

const getPageNumber = (searchParams) => {
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

// 관심 경매는 "내가 관리하는 상태"가 아니라 "찜한 경매 자체의 상태"라, 임시저장/거래중 같은
// 판매 내역 개념 대신 경매 결과(진행 중/종료)로 요약·필터를 구성한다 (실험용 미리보기).
// 낙찰·유찰·취소는 전부 "종료"로 묶는다(사용자 결정) — 활성 여부만 구분하면 충분하다고 판단.
const resolveFavoriteStatusGroup = (item) => (
  resolveAuctionResultLabel(item) ? 'ENDED' : 'ACTIVE'
);

const formatFavoriteRemainingTime = (item, now) => {
  const isEnded = Boolean(resolveAuctionResultLabel(item));
  if (isEnded) return `종료 일시 ${formatDateTime(item.endDateTime)}`;
  // 진행 중(AUCC0002)인데 endDateTime이 없는 경우는 정상 데이터에서는 나오지 않는
  // 방어적 분기(데이터 누락 시 화면이 깨지는 것을 막기 위한 안전장치).
  if (!item.endDateTime) return '종료 시간 미정';
  return `종료까지 ${formatTimeUntil(item.endDateTime, now)}`;
};

const FAVORITE_STATUS_FILTERS = [
  { value: null, label: '전체' },
  { value: 'ACTIVE', label: '진행 중' },
  { value: 'ENDED', label: '종료' },
];

const getVisiblePages = (currentPage, totalPages) => {
  const visibleCount = Math.min(MAX_VISIBLE_PAGES, totalPages);
  const half = Math.floor(visibleCount / 2);
  const start = Math.min(
    Math.max(currentPage - half, 1),
    Math.max(totalPages - visibleCount + 1, 1),
  );

  return Array.from({ length: visibleCount }, (_, index) => start + index);
};

const AuctionFavoritesPage = ({ embedded = false }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [toastMessage, setToastMessage] = useState('');
  const [keyword, setKeyword] = useState('');
  const queryClient = useQueryClient();
  const page = getPageNumber(searchParams);
  // @ai_generated 관심 경매 상태 탭은 기존 page 쿼리와 함께 URL에서 복원한다.
  const requestedStatusFilter = searchParams.get('tab');
  const statusFilter = FAVORITE_STATUS_FILTERS.some(({ value }) => value === requestedStatusFilter)
    ? requestedStatusFilter
    : null;

  const {
    data: favoritePage,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['auctionFavorites', page, PAGE_SIZE],
    queryFn: () => fetchMyFavoriteAuctions({ page, size: PAGE_SIZE }),
    placeholderData: (previousData) => previousData,
    refetchOnMount: 'always',
  });

  const favoriteItems = useMemo(() => favoritePage?.items || [], [favoritePage]);
  const now = useCountdown(favoriteItems.length > 0);
  const totalElements = favoritePage?.totalElements || 0;
  const totalPages = favoritePage?.totalPages || 0;
  const visiblePages = useMemo(
    () => getVisiblePages(page, totalPages),
    [page, totalPages],
  );

  // 요약·필터 개수는 현재 불러온 페이지 항목 기준이다(서버 API가 상태별 집계를 아직 안 내려줌) —
  // 미리보기 목적의 근사치이며, 실제로 쓰려면 서버에 상태별 카운트 조회를 추가해야 한다.
  const favoriteStatusCounts = useMemo(() => favoriteItems.reduce((counts, item) => {
    const group = resolveFavoriteStatusGroup(item);
    counts[group] = (counts[group] || 0) + 1;
    return counts;
  }, { ACTIVE: 0, ENDED: 0 }), [favoriteItems]);

  const normalizedKeyword = keyword.trim().toLowerCase();
  const visibleFavoriteItems = useMemo(() => favoriteItems.filter((item) => {
    const matchesStatus = !statusFilter || resolveFavoriteStatusGroup(item) === statusFilter;
    const matchesKeyword = !normalizedKeyword
      || String(item.title ?? '').toLowerCase().includes(normalizedKeyword);
    return matchesStatus && matchesKeyword;
  }), [favoriteItems, statusFilter, normalizedKeyword]);

  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusFilterChange = (nextFilter) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextFilter) nextSearchParams.set('tab', nextFilter);
    else nextSearchParams.delete('tab');
    nextSearchParams.delete('page');
    setSearchParams(nextSearchParams, { replace: true });
  };

  const favoriteMutation = useMutation({
    mutationFn: removeAuctionFavorite,
    onMutate: async (auctionId) => {
      const queryKey = ['auctionFavorites', page, PAGE_SIZE];
      await queryClient.cancelQueries({ queryKey: ['auctionFavorites'] });
      const previousPage = queryClient.getQueryData(queryKey);
      const wasLastItemOnPage = previousPage?.items?.length === 1;

      queryClient.setQueryData(queryKey, (currentPage) => {
        if (!currentPage?.items) return currentPage;

        const nextItems = currentPage.items.filter((item) => item.auctionId !== auctionId);
        if (nextItems.length === currentPage.items.length) return currentPage;

        const nextTotalElements = Math.max(0, (currentPage.totalElements || 0) - 1);
        return {
          ...currentPage,
          items: nextItems,
          totalElements: nextTotalElements,
          totalPages: Math.ceil(nextTotalElements / PAGE_SIZE),
        };
      });

      return { previousPage, queryKey, wasLastItemOnPage };
    },
    onSuccess: (_status, _auctionId, context) => {
      if (page > 1 && context?.wasLastItemOnPage) {
        goToPage(page - 1);
      }
    },
    onError: (error, _auctionId, context) => {
      if (context?.previousPage && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPage);
      }
      setToastMessage(
        error.response?.data?.message || '관심 경매를 삭제하지 못했습니다.',
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['auctionFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['auctionFavoriteStatus'] });
      queryClient.invalidateQueries({ queryKey: ['auctionDetail'] });
      queryClient.invalidateQueries({ queryKey: ['landing-curation', 'auctions', 'popular'] });
    },
  });

  const content = (
    <section className="my-active-auctions">
      <MyPageContentHeader
        title="관심 경매"
        actions={!isLoading && !isError ? (
          <span className="inline-flex min-h-9 items-center text-sm font-extrabold whitespace-nowrap text-primary-dark">
            {totalElements.toLocaleString('ko-KR')}개 경매
          </span>
        ) : null}
      />

      {isLoading ? (
        <CardGridSkeleton cardHeight={410} columns={3} count={6} />
      ) : isError ? (
        <div className={EMPTY_STATE_CLASS}>
          <strong className="text-lg">관심 경매를 불러오지 못했습니다.</strong>
          <p className="m-0 text-[#5f5e5a]">잠시 후 다시 시도해 주세요.</p>
          <ActionButton
            size="sm"
            onClick={() => refetch()}
          >
            <RotateCcw size={16} />
            다시 시도
          </ActionButton>
        </div>
      ) : favoriteItems.length > 0 ? (
        <div className="grid w-full grid-cols-3 gap-[45px] max-xl:grid-cols-2 max-xl:gap-6 max-md:grid-cols-1 max-md:gap-[18px]">
          {favoriteItems.map((item) => (
            <div className="relative min-w-0" key={item.auctionId}>
              <AuctionCard item={item} />
              <button
                className="absolute top-[30px] right-[30px] z-[2] inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#e2e2e2] bg-white/95 text-[#d63c3c] shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#d63c3c] hover:text-white disabled:cursor-wait disabled:opacity-55 max-md:top-[22px] max-md:right-[22px]"
                type="button"
                title="관심 경매에서 삭제"
                aria-label={`${item.title} 관심 경매에서 삭제`}
                aria-busy={favoriteMutation.isPending
                  && favoriteMutation.variables === item.auctionId}
                disabled={favoriteMutation.isPending
                  && favoriteMutation.variables === item.auctionId}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  favoriteMutation.mutate(item.auctionId);
                }}
              >
                <HeartOff size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={EMPTY_STATE_CLASS}>
          <strong className="text-lg">관심 등록한 경매가 없습니다.</strong>
          <p className="m-0 text-[#5f5e5a]">경매를 둘러보고 관심 있는 상품을 저장해 보세요.</p>
          <ActionButton
            className="mt-[18px] !border-[#1d1d1f] !bg-[#1d1d1f]"
            to="/auction"
          >
            경매 둘러보기
          </ActionButton>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2" aria-label="관심 경매 목록 페이지">
          <button
            className={PAGINATION_BUTTON_CLASS}
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            이전
          </button>
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={pageNumber === page
                ? 'min-h-10 rounded-lg border border-primary bg-primary px-3.5 text-sm font-semibold text-white'
                : PAGINATION_BUTTON_CLASS}
              onClick={() => goToPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            className={PAGINATION_BUTTON_CLASS}
            type="button"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            다음
          </button>
        </div>
      )}
    </section>
  );

  // 마이페이지 "경매" 아코디언의 나머지 3개 화면(진행 중인 경매/구매 내역/판매 내역)과
  // 같은 공통 요소(MyPageAuctionListItem 행, 공통 Pagination)로 맞춘 목록.
  const listContent = (
    <section className="my-active-auctions">
      <MyPageListSectionLayout
        title="관심 경매"
        summaryItems={[
          { label: '진행 중', value: favoriteStatusCounts.ACTIVE },
          { label: '종료', value: favoriteStatusCounts.ENDED },
        ]}
        filterItems={FAVORITE_STATUS_FILTERS.map((filter) => ({
          ...filter,
          count: filter.value === null ? favoriteItems.length : favoriteStatusCounts[filter.value],
        }))}
        activeFilter={statusFilter}
        onFilterChange={handleStatusFilterChange}
        filterAriaLabel="관심 경매 상태"
        onSearch={setKeyword}
        searchAriaLabel="관심 경매 검색"
        searchPlaceholder="상품명 검색"
        isLoading={isLoading}
      />

      {isLoading ? (
        <MyPageListSkeleton count={PAGE_SIZE} />
      ) : isError ? (
        <MyPageListError message="관심 경매를 불러오지 못했습니다." onRetry={refetch} retryIcon={<RotateCcw size={16} />} />
      ) : visibleFavoriteItems.length === 0 ? (
        <MyPageListEmpty
          message={favoriteItems.length === 0
            ? '관심 등록한 경매가 없습니다.'
            : '해당 조건의 관심 경매가 없습니다.'}
          action={favoriteItems.length === 0 ? (
            <ActionButton to="/auction">경매 둘러보기</ActionButton>
          ) : null}
        />
      ) : (
        <>
        {/* history-list의 display:grid가 불레이어 CSS라 Tailwind hidden(@layer utilities)보다 우선
            적용된다 — hidden/lg:block은 별도 래퍼에 둬서 두 display 선언이 충돌하지 않게 한다. */}
        <div className="hidden lg:block">
        <div className="history-list">
          {visibleFavoriteItems.map((item) => {
            const statusGroup = resolveFavoriteStatusGroup(item);
            const isEnded = statusGroup === 'ENDED';
            const badgeClass = isEnded ? 'badge-outline-gray' : 'badge-primary';
            const badgeLabel = isEnded ? '종료' : '진행 중';

            return (
              <MyPageAuctionListItem
                key={item.auctionId}
                imageSrc={toImageUrl(item.thumbnailPath)}
                imageAlt={item.title}
                imageFallback="경매 이미지"
                badge={<MyPageStatusBadge className={badgeClass}>{badgeLabel}</MyPageStatusBadge>}
                title={item.title}
                topLine={formatFavoriteRemainingTime(item, now)}
                priceItems={[
                  { label: '입찰 횟수', value: `${item.bidCount ?? 0}회` },
                  { label: '현재가', value: formatPrice(item.currentPrice) },
                  {
                    label: '즉시구매가',
                    value: Number(item.instantBuyPrice) > 0 ? formatPrice(item.instantBuyPrice) : '없음',
                  },
                ]}
                tradeMethodLabel={resolveTradeMethodLabel(item.tradeMethodCode, item.tradeMethodName)}
                actionButton={(
                  <>
                    <ActionButton
                      size="sm"
                      state={{ from: `${location.pathname}${location.search}${location.hash}` }}
                      to={`/auction/${item.auctionId}`}
                    >
                      경매 상세
                    </ActionButton>
                    <ActionButton
                      aria-busy={favoriteMutation.isPending && favoriteMutation.variables === item.auctionId}
                      disabled={favoriteMutation.isPending && favoriteMutation.variables === item.auctionId}
                      onClick={() => favoriteMutation.mutate(item.auctionId)}
                      size="sm"
                      tone="neutral"
                    >
                      관심 해제
                    </ActionButton>
                  </>
                )}
              />
            );
          })}
        </div>
        </div>
        <div className="grid gap-4 lg:hidden">
          {visibleFavoriteItems.map((item) => (
            <div className="relative min-w-0" key={item.auctionId}>
              <AuctionCard item={item} />
              <button
                type="button"
                className="absolute top-[22px] right-[22px] z-[2] inline-flex size-10 items-center justify-center rounded-full border border-[#e2e2e2] bg-white/95 text-[#d63c3c] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                aria-label={`${item.title} 관심 해제`}
                aria-busy={favoriteMutation.isPending && favoriteMutation.variables === item.auctionId}
                disabled={favoriteMutation.isPending && favoriteMutation.variables === item.auctionId}
                onClick={() => favoriteMutation.mutate(item.auctionId)}
              >
                <HeartOff size={18} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        </>
      )}

      {!isLoading && !isError && (
        <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} showSinglePage />
      )}
    </section>
  );

  return (
    <div className="min-h-full bg-white text-[#1a1a18]">
      {embedded ? listContent : (
        <main
          className="container min-h-[calc(100vh-180px)]"
          style={{ paddingTop: '28px', paddingBottom: '52px' }}
        >
          {content}
        </main>
      )}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage('')}
        variant="info"
      />
    </div>
  );
};

export default AuctionFavoritesPage;
