// src/pages/provider/MyQuoteListPage.jsx
// 담당자 7 연결 · F-SVC-005/006/008: 제공자 견적 제출 내역을 마이페이지 공통 목록으로 표시합니다.
import { useMemo, useState } from 'react';
import { CalendarDays, Tags } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Pagination from '@components/common/Pagination';
import { ActionButton } from '@components/common/ui';
import MyPageAuctionListItem from '@components/mypage/MyPageAuctionListItem';
import MyPageListSectionLayout from '@components/mypage/MyPageListSectionLayout';
import MyPageListEmpty from '@components/mypage/MyPageListEmpty';
import MyPageListError from '@components/mypage/MyPageListError';
import MyPageMobileCard from '@components/mypage/MyPageMobileCard';
import MyPageStatusBadge from '@components/mypage/MyPageStatusBadge';
import MyPageListSkeleton from '@components/skeleton/MyPageListSkeleton';
import { useMyQuotes, useWithdrawQuote } from '@hooks/useQuote';
import { confirm, toast } from '@utils/common';
import {
  getServiceRequestQuoteDetailPath,
  getServiceRequestQuoteEditPath,
} from '@/routes/serviceRequestRoutes';

const PAGE_SIZE = 10;

const STATUS_CONFIG = {
  QUTC0001: { filter: 'submitted', group: 'waiting', label: '제출됨', badgeClass: 'badge-blue' },
  QUTC0002: { filter: 'revised', group: 'waiting', label: '수정됨', badgeClass: 'badge-blue' },
  QUTC0003: { filter: 'expired', group: 'ended', label: '만료됨', badgeClass: 'badge-gray' },
  QUTC0004: { filter: 'selected', group: 'in-progress', label: '선택됨', badgeClass: 'badge-teal' },
  QUTC0005: { filter: 'withdrawn', group: 'ended', label: '철회됨', badgeClass: 'badge-gray' },
};

const FILTER_LABELS = {
  all: '전체',
  submitted: '제출',
  revised: '수정',
  selected: '선택',
  expired: '만료',
  withdrawn: '철회',
};

const VALID_FILTERS = new Set(Object.keys(FILTER_LABELS));

const REQUEST_FILTERS = [
  { value: 'all', label: '요청 상태 전체' },
  { value: 'normal', label: '정상 요청' },
  { value: 'held', label: '운영 보류' },
];

const VALID_REQUEST_FILTERS = new Set(REQUEST_FILTERS.map(({ value }) => value));
const REQUEST_HOLD_STATUS = 'SVCC0005';

const formatAmount = (amount) => (
  Number.isFinite(Number(amount)) ? `${Number(amount).toLocaleString()}P` : '-'
);

const formatDate = (value) => {
  if (!value) return '-';
  return String(value).slice(0, 10).replaceAll('-', '.');
};

function QuoteStatusBadges({ quote }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <MyPageStatusBadge className={quote.badgeClass}>
        {quote.statusLabel}
      </MyPageStatusBadge>
      {quote.isRequestHeld && (
        <MyPageStatusBadge className="badge-warning">
          요청 보류
        </MyPageStatusBadge>
      )}
    </span>
  );
}

function QuoteActionButtons({ quote, onDetail, onEdit, onWithdraw }) {
  const isEditableStatus = ['QUTC0001', 'QUTC0002'].includes(quote.statusCode);
  const canEdit = isEditableStatus && !quote.isRequestHeld && quote.editCount < 3;
  const canWithdraw = isEditableStatus && !quote.isRequestHeld;
  const requestHeldTitle = '원본 견적 요청이 운영 보류 중입니다.';
  const editDisabledTitle = quote.isRequestHeld
    ? requestHeldTitle
    : '견적 수정 가능 횟수 3회를 모두 사용했습니다.';

  return (
    <>
      <ActionButton size="sm" onClick={() => onDetail(quote)}>
        상세보기
      </ActionButton>
      {isEditableStatus && (
        <ActionButton
          disabled={!canEdit}
          onClick={() => onEdit(quote)}
          size="sm"
          title={canEdit ? undefined : editDisabledTitle}
          tone="outline"
        >
          {quote.editCount >= 3 ? '수정 3/3' : `수정${quote.editCount > 0 ? ` ${quote.editCount}/3` : ''}`}
        </ActionButton>
      )}
      {isEditableStatus && (
        <ActionButton
          disabled={!canWithdraw}
          onClick={() => onWithdraw(quote)}
          size="sm"
          title={canWithdraw ? undefined : requestHeldTitle}
          tone="danger"
        >
          철회
        </ActionButton>
      )}
    </>
  );
}

export default function MyQuoteListPage({ embedded = false } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const activeFilter = VALID_FILTERS.has(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'all';
  const activeRequestFilter = VALID_REQUEST_FILTERS.has(searchParams.get('requestStatus'))
    ? searchParams.get('requestStatus')
    : 'all';

  const {
    data: pageData,
    isLoading,
    isError,
    refetch,
  } = useMyQuotes({ page: 1, size: 50 });
  const withdrawMutation = useWithdrawQuote();

  const quotes = useMemo(() => (pageData?.content ?? []).map((quote) => {
    const status = STATUS_CONFIG[quote.statusCode] ?? {
      filter: 'unknown',
      group: 'ended',
      label: quote.statusCode || '알 수 없음',
      badgeClass: 'badge-gray',
    };

    return {
      ...quote,
      requestTitle: quote.svcReqTitle || '서비스 요청',
      quoteTitle: quote.qutTtl || '제출 견적',
      submittedAtLabel: formatDate(quote.registeredAt),
      editCount: Number(quote.reviseCnt ?? 0),
      statusFilter: status.filter,
      statusGroup: status.group,
      statusLabel: status.label,
      badgeClass: status.badgeClass,
      isRequestHeld: quote.svcReqStatusCode === REQUEST_HOLD_STATUS,
    };
  }), [pageData]);

  const countByGroup = (group) => quotes.filter((quote) => quote.statusGroup === group).length;
  const countByFilter = (filter) => quotes.filter((quote) => quote.statusFilter === filter).length;
  const filteredQuotes = useMemo(() => {
    const quoteStatusFiltered = activeFilter === 'all'
      ? quotes
      : quotes.filter((quote) => quote.statusFilter === activeFilter);
    const requestStatusFiltered = quoteStatusFiltered.filter((quote) => {
      if (activeRequestFilter === 'held') return quote.isRequestHeld;
      if (activeRequestFilter === 'normal') return !quote.isRequestHeld;
      return true;
    });

    return [...requestStatusFiltered].sort(
      (left, right) => Number(right.isRequestHeld) - Number(left.isRequestHeld),
    );
  }, [activeFilter, activeRequestFilter, quotes]);
  const totalPages = Math.max(1, Math.ceil(filteredQuotes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleQuotes = filteredQuotes.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const returnPath = `${location.pathname}${location.search}${location.hash}`;

  const filterItems = Object.entries(FILTER_LABELS).map(([value, label]) => ({
    value,
    label,
    count: value === 'all' ? quotes.length : countByFilter(value),
  }));

  const handleFilterChange = (nextFilter) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('tab', nextFilter);
    setSearchParams(nextSearchParams, { replace: true });
    setPage(1);
  };

  const handleRequestFilterChange = (event) => {
    const nextFilter = event.target.value;
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextFilter === 'all') {
      nextSearchParams.delete('requestStatus');
    } else {
      nextSearchParams.set('requestStatus', nextFilter);
    }
    setSearchParams(nextSearchParams, { replace: true });
    setPage(1);
  };

  const handleDetail = (quote) => {
    navigate(getServiceRequestQuoteDetailPath(quote.svcReqSn, quote.qutSn), {
      state: { quote, from: returnPath },
    });
  };

  const handleEdit = (quote) => {
    if (quote.editCount >= 3) {
      toast({ icon: 'warning', title: '수정 가능 횟수(3회)를 초과했습니다.' });
      return;
    }
    navigate(getServiceRequestQuoteEditPath(quote.svcReqSn, quote.qutSn), {
      state: { from: returnPath, quoteTitle: quote.quoteTitle },
    });
  };

  const handleWithdraw = async (quote) => {
    const confirmed = await confirm({
      title: '견적을 철회하시겠습니까?',
      text: '철회한 견적은 복구할 수 없습니다.',
      icon: 'warning',
      confirmButtonText: '철회',
      cancelButtonText: '취소',
    });
    if (!confirmed) return;

    try {
      await withdrawMutation.mutateAsync(quote.qutSn);
      toast({ icon: 'success', title: '견적이 철회되었습니다.' });
    } catch (error) {
      toast({
        icon: 'error',
        title: error?.response?.data?.message || '견적 철회에 실패했습니다.',
      });
    }
  };

  const renderActions = (quote) => (
    <QuoteActionButtons
      quote={quote}
      onDetail={handleDetail}
      onEdit={handleEdit}
      onWithdraw={handleWithdraw}
    />
  );

  return (
    <div className={embedded ? '' : 'container seller-page'}>
      <MyPageListSectionLayout
        title="견적 제출 내역"
        summaryItems={[
          { label: '전체', value: quotes.length },
          { label: '대기 중', value: countByGroup('waiting') },
          { label: '진행 중', value: countByGroup('in-progress') },
          { label: '종료', value: countByGroup('ended') },
        ]}
        filterItems={filterItems}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        filterAriaLabel="견적 상태"
        extraControls={(
          <select
            aria-label="원본 견적 요청 상태"
            className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#dce2ed] bg-white px-3 text-sm outline-none focus:border-[#1466f5]"
            onChange={handleRequestFilterChange}
            value={activeRequestFilter}
          >
            {REQUEST_FILTERS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}
        isLoading={isLoading}
      />

      {isLoading ? (
        <MyPageListSkeleton count={4} />
      ) : isError ? (
        <MyPageListError message="견적 목록을 불러오지 못했습니다." onRetry={() => refetch()} />
      ) : filteredQuotes.length === 0 ? (
        <MyPageListEmpty message="해당 상태의 견적이 없습니다." />
      ) : (
        <>
          <div className="hidden flex-col gap-3 lg:flex">
            {visibleQuotes.map((quote) => (
              <MyPageAuctionListItem
                key={quote.qutSn}
                imageAlt={quote.requestTitle}
                imageFallback={quote.catNm || '견적'}
                badge={<QuoteStatusBadges quote={quote} />}
                title={quote.requestTitle}
                topLine={`제출 ${quote.submittedAtLabel}`}
                priceItems={[
                  { label: '내 견적', value: formatAmount(quote.amount), highlight: true },
                  ...(quote.svcReqBdgtAmt != null
                    ? [{ label: '요청 예산', value: formatAmount(quote.svcReqBdgtAmt) }]
                    : []),
                ]}
                categoryLabel={quote.catNm || '미분류'}
                detailItems={[{ label: '견적 제목', value: quote.quoteTitle }]}
                actionButton={renderActions(quote)}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
            {visibleQuotes.map((quote) => (
              <MyPageMobileCard
                key={quote.qutSn}
                imageFallbackLabel={quote.catNm || '견적'}
                badge={<QuoteStatusBadges quote={quote} />}
                title={quote.requestTitle}
                price={formatAmount(quote.amount)}
                priceSuffix="내 견적"
                infoItems={[
                  { icon: Tags, label: '카테고리', value: quote.catNm || '미분류' },
                  { icon: CalendarDays, label: '제출일', value: quote.submittedAtLabel },
                ]}
                footerLeft={quote.quoteTitle}
                footerRight={quote.editCount > 0 ? `수정 ${quote.editCount}/3` : undefined}
                actionButton={renderActions(quote)}
              />
            ))}
          </div>
        </>
      )}

      {!isLoading && !isError && filteredQuotes.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          showSinglePage
          ariaLabel="견적 제출 내역 페이지 이동"
        />
      )}
    </div>
  );
}
