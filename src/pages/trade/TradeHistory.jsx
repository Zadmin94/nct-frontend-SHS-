import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, CalendarDays } from 'lucide-react';
import { toImageUrl } from '@api/fileApi';
import { getTradeHistory } from '@api/tradeApi';
import {
  getTradeListItems,
  toTradeHistoryItem,
} from '@api/tradeAdapter';
import { formatDate, formatPoint } from '@utils/common';
import { useMyBidHistory } from '@hooks/useBid';
import Pagination from '@components/common/Pagination';
import MyPageListSkeleton from '@components/skeleton/MyPageListSkeleton';
import MyPageListSectionLayout from '@components/mypage/MyPageListSectionLayout';
import MyPageContentHeader from '@components/mypage/MyPageContentHeader';
import MyPageListEmpty from '@components/mypage/MyPageListEmpty';
import MyPageListError from '@components/mypage/MyPageListError';
import MyPageAuctionListItem from '@components/mypage/MyPageAuctionListItem';
import MyPageStatusBadge from '@components/mypage/MyPageStatusBadge';
import MyPageMobileCard from '@components/mypage/MyPageMobileCard';
import { ActionButton } from '@components/common/ui';
import '@assets/css/trade-history.css';

const statusInfo = {
  DELIVERING: {
    label: '배송·직거래 중',
    badgeClass: 'badge-teal',
  },
  WAITING_CONFIRMATION: {
    label: '상대 확인 대기',
    badgeClass: 'badge-orange',
  },
  // 구매자의 완료 확인 요청 직후 상태도 같은 대기 문구로 표시한다.
  CONFIRM_PENDING: {
    label: '상대 확인 대기',
    badgeClass: 'badge-orange',
  },
  COMPLETED: {
    label: '거래 완료',
    badgeClass: 'badge-outline-gray',
  },
  ON_HOLD: {
    label: '거래 보류',
    badgeClass: 'badge-outline-orange',
  },
  CANCELED: {
    label: '거래 취소',
    badgeClass: 'badge-danger',
  },
};

const statusPriority = {
  IN_PROGRESS: 0,
  DELIVERING: 1,
  WAITING_CONFIRMATION: 2,
  CONFIRM_PENDING: 2,
  COMPLETED: 3,
  ON_HOLD: 4,
  CANCELED: 5,
};

const activeTradeStatuses = new Set([
  'IN_PROGRESS',
  'DELIVERING',
  'WAITING_CONFIRMATION',
  'CONFIRM_PENDING',
  'ON_HOLD',
]);

// 경매 하위 목록(구매 목록/판매 목록) 공통 페이지당 건수
const PAGE_SIZE = 10;

const tabs = [
  { value: 'ALL', label: '전체' },
  { value: 'BUYER', label: '구매 내역' },
  { value: 'SELLER', label: '판매 내역' },
];

// 마이페이지 상품 구매 목록은 입찰과 구매 거래를 하나의 상태 체계로 보여준다.
const purchaseFilters = [
  { value: 'ALL', label: '전체' },
  { value: 'HIGHEST', label: '최고 입찰 중' },
  { value: 'OUTBID_ACTIVE', label: '재입찰 필요' },
  { value: 'TRADING', label: '거래 중' },
  { value: 'CLOSED', label: '종료' },
];

const purchaseClosedSubFilters = [
  { value: '', label: '전체 종료' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELED', label: '취소' },
  { value: 'FAILED', label: '낙찰 실패' },
];

const purchaseStatusPriority = {
  HIGHEST: 0,
  OUTBID_ACTIVE: 1,
  TRADING: 2,
  COMPLETED: 3,
  CANCELED: 4,
  FAILED: 5,
};

const purchaseStatusMeta = {
  HIGHEST: {
    label: '최고 입찰 중',
    badgeClass: 'badge-primary',
  },
  OUTBID_ACTIVE: {
    label: '재입찰 필요',
    badgeClass: 'badge-outline-orange',
  },
  TRADING: {
    label: '거래 중',
    badgeClass: 'badge-teal',
  },
  COMPLETED: {
    label: '거래 완료',
    badgeClass: 'badge-outline-gray',
  },
  CANCELED: {
    label: '거래 취소',
    badgeClass: 'badge-danger',
  },
  FAILED: {
    label: '낙찰 실패',
    badgeClass: 'badge-outline-gray',
  },
};

const getBidPurchaseStatus = (bid) => {
  // 판매자 취소 요청(AUCC0006)은 MyBidHistoryItem에서 UNKNOWN으로 내려올 수 있다.
  // 구매 목록에서는 참여 경매를 숨기지 않고 종료 > 취소로 흡수한다.
  if (bid.auctionStatusCode === 'AUCC0006' || bid.displayStatus === 'CANCELED') {
    return 'CANCELED';
  }

  if (bid.displayStatus === 'HIGHEST' && bid.auctionStatusCode === 'AUCC0002') {
    return 'HIGHEST';
  }

  if (bid.displayStatus === 'OUTBID') {
    return bid.auctionStatusCode === 'AUCC0002' ? 'OUTBID_ACTIVE' : 'FAILED';
  }

  // 낙찰과 거래 행은 같은 트랜잭션에서 생성되므로 BID 항목을 별도로 만들지 않는다.
  if (bid.displayStatus === 'WON') {
    return null;
  }

  return null;
};

const toLatestBids = (bidHistory = []) => {
  const latestByAuction = new Map();

  [...bidHistory]
    .sort((left, right) => (
      new Date(right.bidDateTime || 0).getTime() - new Date(left.bidDateTime || 0).getTime()
    ))
    .forEach((bid) => {
      if (!latestByAuction.has(bid.aucSn)) {
        latestByAuction.set(bid.aucSn, bid);
      }
    });

  return [...latestByAuction.values()];
};

const toPurchaseItems = (tradeItems = [], bidHistory = []) => {
  const buyerTrades = tradeItems.filter((trade) => trade.type === 'BUYER');
  const normalizedTrades = buyerTrades.map((trade) => ({
    ...trade,
    kind: 'TRADE',
    purchaseStatus: activeTradeStatuses.has(trade.status)
      ? 'TRADING'
      : trade.status === 'COMPLETED'
        ? 'COMPLETED'
        : trade.status === 'CANCELED'
          ? 'CANCELED'
          : 'TRADING',
  }));

  const normalizedBids = toLatestBids(bidHistory)
    .map((bid) => ({
      ...bid,
      kind: 'BID',
      purchaseStatus: getBidPurchaseStatus(bid),
      productName: bid.auctionTitle ?? `경매 #${bid.aucSn}`,
      productImageUrl: bid.thumbnailPath ?? '',
      counterpart: bid.sellerName ?? '-',
      date: formatDate(bid.bidDateTime),
      completedDate: formatDate(bid.auctionEndDateTime),
      amount: formatPoint(bid.bidAmount),
      method: bid.tradeMethodCode,
    }))
    .filter((bid) => bid.purchaseStatus);

  return [...normalizedTrades, ...normalizedBids];
};

const getTradeHistoryDetailPath = ({ trade, isBidItem }) => {
  if (isBidItem) {
    if (trade.aucSn) {
      return trade.tradeId
        ? `/auction/${trade.aucSn}/trade`
        : `/auction/${trade.aucSn}`;
    }

    return trade.tradeId ? `/trades/${trade.tradeId}` : '/auction';
  }

  if (trade.auctionId) {
    return `/auction/${trade.auctionId}/trade`;
  }

  return trade.type === 'SELLER'
    ? `/trades/${trade.id}/seller`
    : `/trades/${trade.id}`;
};

// 사용자가 입력한 공백 차이로 동일한 상품을 놓치지 않도록 검색용 문자열을 통일한다.
const normalizeSearchText = (value) => String(value ?? '')
  .toLowerCase()
  .replaceAll(/\s+/g, '');

// 판매자 진행 건은 거래 방식에 맞춰 지금 필요한 행동을 상태 문구로 보여준다.
const getStatusInfo = (trade) => {
  // 거래 방식에 따라 현재 진행 상태를 구분해 사용자가 다음 상황을 바로 알 수 있게 한다.
  if (trade.status === 'DELIVERING') {
    return {
      label: trade.method === 'DELIVERY' ? '배송 중' : '직거래 중',
      badgeClass: 'badge-teal',
    };
  }

  if (trade.status === 'IN_PROGRESS') {
    if (trade.method === 'OFFLINE') {
      const hasMeetingSchedule = Boolean(
        trade.meetingDate
        && trade.meetingTime
        && trade.meetingPlace,
      );

      if (hasMeetingSchedule) {
        return {
          label: '직거래 진행 중',
          badgeClass: 'badge-teal',
        };
      }

      let label = '일정 제안 필요';

      if (trade.type === 'BUYER') {
        label = '일정 확인 필요';
      }

      return {
        label,
        badgeClass: 'badge-primary',
      };
    }

    return {
      label: '배송 등록 필요',
      badgeClass: 'badge-primary',
    };
  }

  return statusInfo[trade.status] ?? {
    label: trade.status ?? '상태 확인 중',
    badgeClass: 'badge-orange',
  };
};

const getPurchaseStatusInfo = (item) => {
  if (item.kind === 'TRADE') {
    return getStatusInfo(item);
  }

  return purchaseStatusMeta[item.purchaseStatus] ?? {
    label: '상태 확인 중',
    badgeClass: 'badge-orange',
  };
};

const getPurchaseTopLine = (item) => {
  if (item.kind === 'TRADE') {
    return `확정날짜 ${item.date} / 완료날짜 ${item.completedDate ?? '-'}`;
  }

  const endLabel = item.purchaseStatus === 'HIGHEST' ? '종료 예정' : '종료날짜';
  return `입찰날짜 ${item.date} / ${endLabel} ${formatDate(item.auctionEndDateTime)}`;
};

const getPurchasePriceItems = (item) => {
  if (item.kind === 'TRADE') {
    return [{ label: '확정 금액', value: item.amount }];
  }

  if (item.purchaseStatus === 'HIGHEST') {
    return [
      { label: '현재 최고가', value: formatPoint(item.currentPrice) },
      { label: '내 입찰가', value: formatPoint(item.bidAmount) },
    ];
  }

  return [{ label: '내 입찰가', value: formatPoint(item.bidAmount) }];
};

const getPurchaseMethodLabel = (item) => {
  if (item.kind === 'TRADE') {
    return item.method === 'DELIVERY' ? '배송' : '직거래';
  }

  return item.tradeMethodName || '정보 없음';
};

/**
 * 거래 목록을 독립 페이지 또는 마이페이지 본문 영역에서 재사용한다.
 * embedded=true이면 마이페이지의 사이드바·여백을 유지하고 목록 영역만 렌더링한다.
 */
const TradeHistory = ({
  embedded = false,
  fixedRole = null,
  onOpenTradeDetail = null,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isBuyerPurchaseList = fixedRole === 'BUYER';
  const [allTradeItems, setAllTradeItems] = useState([]);
  const [filteredTradeItems, setFilteredTradeItems] = useState([]);
  const [activeTab, setActiveTab] = useState(fixedRole ?? 'ALL');
  const [keyword, setKeyword] = useState('');
  const [tradeStatusFilter, setTradeStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  // @ai_generated 구매 목록은 상세 복귀·새로고침에도 탭이 유지되도록 허용된 URL 값만 사용한다.
  const requestedPurchaseFilter = searchParams.get('tab');
  const purchaseFilter = purchaseFilters.some(({ value }) => value === requestedPurchaseFilter)
    ? requestedPurchaseFilter
    : 'ALL';
  const requestedPurchaseSubFilter = searchParams.get('sub') ?? '';
  const purchaseSubFilter = purchaseClosedSubFilters.some(({ value }) => value === requestedPurchaseSubFilter)
    ? requestedPurchaseSubFilter
    : '';
  const statusFilter = isBuyerPurchaseList ? purchaseFilter : tradeStatusFilter;
  const closedSubFilter = isBuyerPurchaseList ? purchaseSubFilter : '';

  const {
    data: bidHistory = [],
    isLoading: isBidLoading,
    isError: isBidError,
    refetch: refetchBids,
  } = useMyBidHistory({
    refetchInterval: isBuyerPurchaseList ? 15_000 : false,
    enabled: isBuyerPurchaseList,
  });

  // 탭별 건수와 진행 중 건수는 필터와 무관한 전체 목록으로 계산한다.
  const tradeCounts = useMemo(() => {
    return allTradeItems.reduce((counts, trade) => {
      counts.ALL += 1;

      if (trade.type === 'BUYER') {
        counts.BUYER += 1;
      }

      if (trade.type === 'SELLER') {
        counts.SELLER += 1;
      }

      if (activeTradeStatuses.has(trade.status)) {
        counts.ACTIVE += 1;
      }

      return counts;
    }, {
      ALL: 0,
      BUYER: 0,
      SELLER: 0,
      ACTIVE: 0,
    });
  }, [allTradeItems]);

  // 역할이 고정된 입찰 내역에서는 해당 역할의 진행 건수만 요약에 표시한다.
  const activeTradeCount = useMemo(() => {
    return allTradeItems.filter((trade) => {
      const matchesRole = !fixedRole || trade.type === fixedRole;

      return matchesRole && activeTradeStatuses.has(trade.status);
    }).length;
  }, [allTradeItems, fixedRole]);

  const purchaseItems = useMemo(
    () => toPurchaseItems(allTradeItems, bidHistory),
    [allTradeItems, bidHistory],
  );

  // 통합 구매 목록의 탭 건수는 검색어·하위 종료 필터와 무관한 전체 목록을 기준으로 표시한다.
  const purchaseStatusCounts = useMemo(() => purchaseFilters.reduce((counts, filter) => {
    if (filter.value === 'ALL') {
      counts[filter.value] = purchaseItems.length;
      return counts;
    }

    if (filter.value === 'CLOSED') {
      counts[filter.value] = purchaseItems.filter((item) => (
        ['COMPLETED', 'CANCELED', 'FAILED'].includes(item.purchaseStatus)
      )).length;
      return counts;
    }

    counts[filter.value] = purchaseItems.filter(
      (item) => item.purchaseStatus === filter.value,
    ).length;
    return counts;
  }, {}), [purchaseItems]);

  // 요약 영역은 조건과 관계없이 로그인한 사용자의 전체 거래를 기준으로 표시한다.
  const loadAllTradeItems = useCallback(async () => {
    if (isBuyerPurchaseList) {
      setIsLoading(true);
    }

    setLoadError('');

    try {
      const response = await getTradeHistory(
        isBuyerPurchaseList ? { role: 'BUYER' } : {},
      );
      const items = getTradeListItems(response).map(toTradeHistoryItem);

      setAllTradeItems(items);
      if (isBuyerPurchaseList) {
        setFilteredTradeItems(items);
      }
    } catch (error) {
      console.error('[TradeHistory] 전체 거래 목록 조회 실패', error);
      setLoadError(isBuyerPurchaseList
        ? '구매 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        : '거래 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (isBuyerPurchaseList) {
        setIsLoading(false);
      }
    }
  }, [isBuyerPurchaseList]);

  // 탭·상태·검색어가 바뀌면 서버에 조건을 전달해 필요한 거래만 다시 조회한다.
  const loadFilteredTradeItems = useCallback(async () => {
    if (isBuyerPurchaseList) {
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const params = {};

      if (activeTab !== 'ALL') {
        params.role = activeTab;
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const response = await getTradeHistory(params);
      const items = getTradeListItems(response).map(toTradeHistoryItem);

      setFilteredTradeItems(items);
    } catch (error) {
      // 필터 변경 후 실패도 남겨, 서버 응답 형식과 화면 어댑터 문제를 구분한다.
      console.error('[TradeHistory] 필터 거래 목록 조회 실패', error);
      setLoadError('거래 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isBuyerPurchaseList, statusFilter]);

  // 첫 진입에는 탭별 건수용 전체 목록을 별도로 조회한다.
  useEffect(() => {
    const requestTimer = window.setTimeout(loadAllTradeItems, 0);

    return () => window.clearTimeout(requestTimer);
  }, [loadAllTradeItems]);

  // 검색어 입력은 짧게 지연해, 매 글자마다 서버 요청이 쌓이지 않게 한다.
  useEffect(() => {
    if (isBuyerPurchaseList) {
      return undefined;
    }

    const requestTimer = window.setTimeout(loadFilteredTradeItems, 250);

    return () => window.clearTimeout(requestTimer);
  }, [isBuyerPurchaseList, loadFilteredTradeItems]);

  const visiblePurchaseItems = useMemo(() => {
    if (statusFilter === 'CLOSED') {
      const closedItems = purchaseItems.filter((item) => (
        ['COMPLETED', 'CANCELED', 'FAILED'].includes(item.purchaseStatus)
      ));

      return closedSubFilter
        ? closedItems.filter((item) => item.purchaseStatus === closedSubFilter)
        : closedItems;
    }

    return statusFilter === 'ALL'
      ? purchaseItems
      : purchaseItems.filter((item) => item.purchaseStatus === statusFilter);
  }, [closedSubFilter, purchaseItems, statusFilter]);

  // 서버가 골라 준 목록은 현재 필요한 행동이 먼저 보이도록 화면에서만 정렬한다.
  const visibleTrades = useMemo(() => {
    const normalizedKeyword = normalizeSearchText(keyword);
    const sourceItems = isBuyerPurchaseList ? visiblePurchaseItems : filteredTradeItems;
    const searchedTrades = !normalizedKeyword
      ? sourceItems
      : sourceItems.filter((trade) => {
        const searchTarget = [
          trade.id,
          trade.tradeId,
          trade.bidSn,
          trade.aucSn,
          trade.productName,
          trade.counterpart,
        ].join(' ');

        return normalizeSearchText(searchTarget).includes(normalizedKeyword);
      });

    return [...searchedTrades].sort((firstTrade, secondTrade) => {
      const firstPriority = isBuyerPurchaseList
        ? (purchaseStatusPriority[firstTrade.purchaseStatus] ?? 6)
        : (statusPriority[firstTrade.status] ?? 4);
      const secondPriority = isBuyerPurchaseList
        ? (purchaseStatusPriority[secondTrade.purchaseStatus] ?? 6)
        : (statusPriority[secondTrade.status] ?? 4);

      return firstPriority - secondPriority;
    });
  }, [filteredTradeItems, isBuyerPurchaseList, keyword, visiblePurchaseItems]);

  const totalPages = Math.max(1, Math.ceil(visibleTrades.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTrades = visibleTrades.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    window.scrollTo(0, 0);
  };

  const handleBuyerFilterChange = (nextFilter) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextFilter === 'ALL') nextSearchParams.delete('tab');
    else nextSearchParams.set('tab', nextFilter);
    nextSearchParams.delete('sub');
    setSearchParams(nextSearchParams, { replace: true });
    setPage(1);
  };

  const handleBuyerSubFilterChange = (nextSubFilter) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextSubFilter) nextSearchParams.set('sub', nextSubFilter);
    else nextSearchParams.delete('sub');
    setSearchParams(nextSearchParams, { replace: true });
    setPage(1);
  };

  const combinedLoading = isLoading || (isBuyerPurchaseList && isBidLoading);
  const combinedError = loadError || (isBuyerPurchaseList && isBidError
    ? '입찰 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
    : '');
  const handleRetry = isBuyerPurchaseList
    ? () => Promise.all([loadAllTradeItems(), refetchBids()])
    : loadFilteredTradeItems;

  return (
    <div className={embedded
      ? 'trade-history-page trade-history-page--embedded'
      : 'trade-history-page'}
    >
      <main className={embedded
        ? 'trade-history-page__content'
        : 'container trade-history-page__content'}
      >
        {fixedRole === 'BUYER' ? (
          <MyPageListSectionLayout
            title="상품 구매 목록"
            summaryItems={[
              { label: '최고 입찰 중', value: purchaseStatusCounts.HIGHEST ?? 0 },
              { label: '재입찰 필요', value: purchaseStatusCounts.OUTBID_ACTIVE ?? 0 },
              { label: '거래 중', value: purchaseStatusCounts.TRADING ?? 0 },
            ]}
            filterItems={purchaseFilters.map((filter) => ({
              ...filter,
              count: purchaseStatusCounts[filter.value] ?? 0,
            }))}
            activeFilter={statusFilter}
            onFilterChange={handleBuyerFilterChange}
            filterAriaLabel="구매 목록 상태"
            onSearch={setKeyword}
            searchAriaLabel="구매 거래 검색"
            extraControls={statusFilter === 'CLOSED' ? (
              <select
                className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#dce2ed] bg-white px-3 text-sm outline-none focus:border-[#1466f5]"
                value={closedSubFilter}
                onChange={(event) => handleBuyerSubFilterChange(event.target.value)}
                aria-label="종료 상태"
              >
                {purchaseClosedSubFilters.map((filter) => (
                  <option key={filter.value || 'all-closed'} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            ) : null}
            isLoading={combinedLoading}
          />
        ) : (
          <MyPageContentHeader title="거래 내역" />
        )}

        {!fixedRole && !isLoading && !loadError && (
          <section className="trade-history-summary" aria-label="진행 중 거래 요약">
            <div>
              <span>진행 중 거래</span>
              <strong>{activeTradeCount}건</strong>
            </div>
            <p>확인이 필요한 거래부터 순서대로 확인해 주세요.</p>
          </section>
        )}

        <section className="trade-history-panel" aria-label="거래 내역 필터">
          {!fixedRole && (
            <div className="trade-history-tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  className={`trade-history-tab ${
                    activeTab === tab.value ? 'trade-history-tab--active' : ''
                  }`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  key={tab.value}
                  onClick={() => { setActiveTab(tab.value); setPage(1); }}
                >
                  {tab.label} <span>{tradeCounts[tab.value]}</span>
                </button>
              ))}
            </div>
          )}

          {!fixedRole && <div className="trade-history-filters">
            <label className="trade-history-search">
              <span className="trade-history-search__label">상품 구매 검색</span>
              <input
                className="input"
                value={keyword}
                onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
                placeholder="상품명, 상대방, 거래번호 검색"
              />
            </label>
            {!fixedRole && (
              <label className="trade-history-select">
                <span className="trade-history-search__label">거래 상태</span>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(event) => { setTradeStatusFilter(event.target.value); setPage(1); }}
                >
                  <option value="ALL">전체 상태</option>
                  <option value="DELIVERING">배송중</option>
                  <option value="WAITING_CONFIRMATION">상대 확인 대기</option>
                  <option value="COMPLETED">거래 완료</option>
                  <option value="ON_HOLD">거래 보류</option>
                  <option value="CANCELED">거래 취소</option>
                </select>
              </label>
            )}
          </div>}
        </section>

        <section className={fixedRole ? '!mt-0' : ''} aria-live="polite">
          {combinedLoading && <MyPageListSkeleton count={5} />}

          {combinedError && (
            <MyPageListError message={combinedError} onRetry={handleRetry} />
          )}

          {!combinedLoading && !combinedError && visibleTrades.length === 0 && (
            <MyPageListEmpty message={isBuyerPurchaseList
              ? '해당 조건의 구매 목록이 없습니다.'
              : '해당 조건의 거래 내역이 없습니다.'}
            />
          )}

          {/* history-list의 display:grid가 불레이어 CSS라 Tailwind hidden(@layer utilities)보다 우선
              적용된다 — hidden/lg:block은 별도 래퍼에 둬서 두 display 선언이 충돌하지 않게 한다. */}
          <div className="hidden lg:block">
          <div className="history-list">
          {!combinedLoading && !combinedError && pagedTrades.map((trade) => {
            const status = isBuyerPurchaseList
              ? getPurchaseStatusInfo(trade)
              : getStatusInfo(trade);
            const isBidItem = isBuyerPurchaseList && trade.kind === 'BID';
            const canOpenTradeDetail = Boolean(
              onOpenTradeDetail && (!isBidItem || trade.tradeId),
            );
            const auctionId = isBidItem ? trade.aucSn : trade.auctionId;
            const detailPath = getTradeHistoryDetailPath({
              trade,
              isBidItem,
            });
            const detailState = embedded
              ? { from: `${location.pathname}${location.search}` }
              : undefined;
            const openDetail = () => {
              if (canOpenTradeDetail) {
                onOpenTradeDetail(isBidItem ? trade.tradeId : trade.id, auctionId, detailState?.from);
                return;
              }

              navigate(detailPath, { state: detailState });
            };

            return (
              <MyPageAuctionListItem
                key={isBidItem ? `bid-${trade.bidSn}` : `trade-${trade.id}`}
                to={canOpenTradeDetail ? undefined : detailPath}
                state={detailState}
                imageSrc={toImageUrl(trade.productImageUrl)}
                imageAlt={trade.productName}
                imageFallback="상품 이미지"
                badge={<MyPageStatusBadge className={status.badgeClass}>{status.label}</MyPageStatusBadge>}
                title={trade.productName}
                topLine={isBuyerPurchaseList
                  ? getPurchaseTopLine(trade)
                  : `확정날짜 ${trade.date} / 완료날짜 ${trade.completedDate ?? '-'}`}
                priceItems={isBuyerPurchaseList
                  ? getPurchasePriceItems(trade)
                  : [{ label: '확정 금액', value: trade.amount }]}
                tradeMethodLabel={isBuyerPurchaseList
                  ? getPurchaseMethodLabel(trade)
                  : (trade.method === 'DELIVERY' ? '배송' : '직거래')}
                actionButton={canOpenTradeDetail ? (
                  <ActionButton
                    onClick={openDetail}
                    size="sm"
                  >
                    {isBidItem && !trade.tradeId ? '경매 상세' : '거래 상세'}
                  </ActionButton>
                ) : (
                  <span className="btn btn-sm btn-primary">
                    {isBidItem && !trade.tradeId ? '경매 상세' : '거래 상세'}
                  </span>
                )}
              />
            );
          })}
          </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {!combinedLoading && !combinedError && pagedTrades.map((trade) => {
              const status = isBuyerPurchaseList
                ? getPurchaseStatusInfo(trade)
                : getStatusInfo(trade);
              const isBidItem = isBuyerPurchaseList && trade.kind === 'BID';
              // @ai_generated 모바일도 데스크톱과 같은 구매 상태별 가격 항목을 사용한다.
              const purchasePriceItems = isBuyerPurchaseList
                ? getPurchasePriceItems(trade)
                : [];
              const canOpenTradeDetail = Boolean(
                onOpenTradeDetail && (!isBidItem || trade.tradeId),
              );
              const auctionId = isBidItem ? trade.aucSn : trade.auctionId;
              const detailPath = getTradeHistoryDetailPath({
                trade,
                isBidItem,
              });
              const detailState = embedded
                ? { from: `${location.pathname}${location.search}` }
                : undefined;
              const actionButton = canOpenTradeDetail ? (
                <ActionButton
                  onClick={() => onOpenTradeDetail(isBidItem ? trade.tradeId : trade.id, auctionId, detailState?.from)}
                  size="sm"
                >
                  {isBidItem && !trade.tradeId ? '경매 상세' : '거래 상세'}
                </ActionButton>
              ) : (
                <ActionButton size="sm" state={detailState} to={detailPath}>
                  {isBidItem && !trade.tradeId ? '경매 상세' : '거래 상세'}
                </ActionButton>
              );

              return (
                <MyPageMobileCard
                  key={isBidItem ? `bid-${trade.bidSn}` : `trade-${trade.id}`}
                  imageSrc={toImageUrl(trade.productImageUrl)}
                  imageAlt={trade.productName}
                  imageFallbackLabel="상품 이미지"
                  badge={<MyPageStatusBadge className={status.badgeClass}>{status.label}</MyPageStatusBadge>}
                  title={trade.productName}
                  price={isBuyerPurchaseList ? undefined : trade.amount}
                  priceItems={purchasePriceItems}
                  infoItems={[
                    {
                      icon: CalendarDays,
                      label: isBidItem ? '입찰날짜' : '확정날짜',
                      value: trade.date,
                    },
                    {
                      icon: CalendarCheck,
                      label: isBidItem ? '종료날짜' : '완료날짜',
                      value: isBidItem
                        ? formatDate(trade.auctionEndDateTime)
                        : trade.completedDate ?? '-',
                    },
                  ]}
                  footerLeft={`거래 방식 · ${isBuyerPurchaseList
                    ? getPurchaseMethodLabel(trade)
                    : (trade.method === 'DELIVERY' ? '배송' : '직거래')}`}
                  actionButton={actionButton}
                />
              );
            })}
          </div>
        </section>

        {!combinedLoading && !combinedError && (
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} showSinglePage />
        )}
      </main>
    </div>
  );
};

export default TradeHistory;
