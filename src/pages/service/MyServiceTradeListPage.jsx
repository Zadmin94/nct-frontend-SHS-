import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, MessageSquareText } from 'lucide-react';
import { getMyServiceTrades } from '@api/serviceTradeApi';
import { toImageUrl } from '@api/fileApi';
import { getServiceTradeDetailPath } from '@/routes/myPageRoutes';
import MyPageAuctionListItem from '@components/mypage/MyPageAuctionListItem';
import MyPageListSectionLayout from '@components/mypage/MyPageListSectionLayout';
import MyPageListEmpty from '@components/mypage/MyPageListEmpty';
import MyPageListError from '@components/mypage/MyPageListError';
import MyPageStatusBadge from '@components/mypage/MyPageStatusBadge';
import MyPageListSkeleton from '@components/skeleton/MyPageListSkeleton';
import MyPageMobileCard from '@components/mypage/MyPageMobileCard';
import Pagination from '@components/common/Pagination';
import { ActionButton } from '@components/common/ui';
import { getServiceTradeStatus } from './serviceTradeStatus';

const PAGE_SIZE = 10;

const FILTERS = [
  { label: '전체', value: 'ALL' },
  { label: '진행 중', value: 'TRDC0003' },
  { label: '완료 확인', value: 'TRDC0005' },
  { label: '보류', value: 'TRDC0007' },
  { label: '거래 완료', value: 'TRDC0006' },
  { label: '거래 취소', value: 'TRDC0008' },
];

const STATUS_BADGE = {
  progress: 'badge-primary',
  pending: 'badge-warning',
  complete: 'badge-success',
  problem: 'badge-danger',
  canceled: 'badge-outline-gray',
};

const formatPoint = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}P` : '-';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export default function MyServiceTradeListPage({ fixedRole = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // 담당자 7 · F-PROV-009: URL 상태는 이 목록에 정의된 필터 코드만 허용해 직접 진입과 새로고침을 유지합니다.
  const requestedFilter = searchParams.get('status') ?? 'ALL';
  const activeFilter = FILTERS.some((filter) => filter.value === requestedFilter)
    ? requestedFilter
    : 'ALL';
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const normalizedKeyword = keyword.trim();
  const filterQueries = useQueries({
    queries: FILTERS.map((filter) => {
      const isActive = filter.value === activeFilter;
      const status = filter.value === 'ALL' ? undefined : filter.value;
      const queryPage = isActive ? page : 1;
      const querySize = isActive ? PAGE_SIZE : 1;

      return {
        queryKey: [
          'my-service-trades',
          fixedRole ?? 'ALL',
          status ?? 'ALL',
          normalizedKeyword,
          queryPage,
          querySize,
        ],
        queryFn: () => getMyServiceTrades({
          role: fixedRole,
          status,
          keyword: normalizedKeyword,
          page: queryPage,
          size: querySize,
        }),
        staleTime: 30 * 1000,
      };
    }),
  });
  const activeFilterIndex = Math.max(
    0,
    FILTERS.findIndex((filter) => filter.value === activeFilter),
  );
  const listQuery = filterQueries[activeFilterIndex];
  const pageData = listQuery.data;
  const visibleTrades = Array.isArray(pageData?.content) ? pageData.content : [];
  const totalPages = Math.max(0, Number(pageData?.totalPages) || 0);
  const visiblePage = Number(pageData?.page) || page;
  const filterCounts = Object.fromEntries(FILTERS.map((filter, index) => [
    filter.value,
    Number(filterQueries[index].data?.totalCount) || 0,
  ]));
  const countsLoading = filterQueries.some((query) => query.isLoading);

  const handleFilterChange = (value) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (value === 'ALL') {
      nextSearchParams.delete('status');
    } else {
      nextSearchParams.set('status', value);
    }
    setSearchParams(nextSearchParams, { replace: true });
    setPage(1);
  };

  const handleSearch = (value) => {
    setKeyword(value.trim());
    setPage(1);
  };

  return (
    <section aria-label="견적 진행 내역 목록">
      <MyPageListSectionLayout
        title="견적 진행 내역"
        summaryItems={[
          { label: '진행 중', value: filterCounts.TRDC0003 },
          { label: '완료 확인', value: filterCounts.TRDC0005 },
          { label: '거래 완료', value: filterCounts.TRDC0006 },
        ]}
        filterItems={FILTERS.map((filter) => ({
          ...filter,
          count: filterCounts[filter.value],
        }))}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        filterAriaLabel="견적 진행 내역 상태"
        onSearch={handleSearch}
        searchAriaLabel="견적 진행 내역 검색"
        searchPlaceholder="요청 제목 또는 거래 상대 검색"
        isLoading={countsLoading}
      />

      {listQuery.isLoading ? (
        <MyPageListSkeleton count={4} />
      ) : listQuery.isError ? (
        <MyPageListError
          message="견적 진행 내역을 불러오지 못했습니다."
          onRetry={() => listQuery.refetch()}
        />
      ) : visibleTrades.length === 0 ? (
        <MyPageListEmpty message="해당 조건의 견적 진행 내역이 없습니다." />
      ) : (
        <>
          <div className="hidden lg:block">
            <div className="history-list">
              {visibleTrades.map((trade) => {
                const status = getServiceTradeStatus(trade.tradeStatusCode);
                const counterpartLabel = trade.viewerRole === 'REQUESTER' ? '제공자' : '의뢰자';

                return (
                  <MyPageAuctionListItem
                    key={trade.tradeId}
                    imageSrc={trade.serviceRequestImageUrl ? toImageUrl(trade.serviceRequestImageUrl) : undefined}
                    imageAlt={trade.serviceRequestTitle}
                    imageFallback={trade.categoryName || '서비스'}
                    badge={(
                      <MyPageStatusBadge className={STATUS_BADGE[status.tone] ?? 'badge-outline-gray'}>
                        {status.label}
                      </MyPageStatusBadge>
                    )}
                    title={trade.serviceRequestTitle || '견적 진행 내역'}
                    topLine={`거래 시작 ${formatDate(trade.createdAt)}`}
                    priceItems={[
                      { label: '거래 금액', value: formatPoint(trade.tradeAmount), highlight: true },
                    ]}
                    detailItems={[
                      { label: counterpartLabel, value: trade.counterpartNickname || '-' },
                    ]}
                    actionButton={(
                      <ActionButton size="sm" to={getServiceTradeDetailPath(trade.tradeId)}>
                        거래 상세
                      </ActionButton>
                    )}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {visibleTrades.map((trade) => {
              const status = getServiceTradeStatus(trade.tradeStatusCode);
              const counterpartLabel = trade.viewerRole === 'REQUESTER' ? '제공자' : '의뢰자';

              return (
                <MyPageMobileCard
                  key={trade.tradeId}
                  imageSrc={trade.serviceRequestImageUrl ? toImageUrl(trade.serviceRequestImageUrl) : undefined}
                  imageAlt={trade.serviceRequestTitle}
                  imageFallbackLabel={trade.categoryName || '서비스'}
                  badge={(
                    <MyPageStatusBadge className={STATUS_BADGE[status.tone] ?? 'badge-outline-gray'}>
                      {status.label}
                    </MyPageStatusBadge>
                  )}
                  title={trade.serviceRequestTitle || '견적 진행 내역'}
                  price={formatPoint(trade.tradeAmount)}
                  infoItems={[
                    { icon: MessageSquareText, label: counterpartLabel, value: trade.counterpartNickname || '-' },
                    { icon: CalendarDays, label: '거래 시작', value: formatDate(trade.createdAt) },
                  ]}
                  footerLeft={`카테고리 · ${trade.categoryName || '서비스'}`}
                  actionButton={(
                    <ActionButton size="sm" to={getServiceTradeDetailPath(trade.tradeId)}>
                      상세보기
                    </ActionButton>
                  )}
                />
              );
            })}
          </div>

          <Pagination
            page={visiblePage}
            totalPages={totalPages}
            onPageChange={setPage}
            maxVisiblePages={5}
          />
        </>
      )}
    </section>
  );
}
