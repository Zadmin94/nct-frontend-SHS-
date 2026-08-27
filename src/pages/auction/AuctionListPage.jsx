import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Gavel,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { fetchAuctions } from '@api/auctionApi';
import { getCategories } from '@api/categoryApi';
import { fetchReferenceCodes } from '@api/referenceApi';
import { SORT_OPTIONS } from '@/constants/auctionOptions';
import { SITE_HEADER_DOCK_EVENT } from '@/constants/layoutEvents';
import CardGridSkeleton from '@components/skeleton/CardGridSkeleton';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import HeaderSearchPortal from '@components/common/HeaderSearchPortal';
import HeaderSearchWithHistory from '@components/common/HeaderSearchWithHistory';
import useBodyScrollLock from '@hooks/useBodyScrollLock';
import AuctionCard from './components/AuctionCard';
import { ActionButton } from '@components/common/ui';

const getSelectedValues = (searchParams, key) => searchParams.getAll(key);
const DEFAULT_PAGE_SIZE = 12;
const PRODUCT_CATEGORY_DOMAIN_CODE = 'CATC0001';
const AUCTION_STATUS_GROUP_CODE = 'AUCG01';
const TRADE_METHOD_GROUP_CODE = 'TRDG03';
const COLLAPSED_CATEGORY_COUNT = 5;
const AUCTION_STATUS_FILTERS = [
  { code: 'AUCC0001', label: '진행 예정' },
  { code: 'AUCC0002', label: '진행 중' },
  { code: 'AUCC0003', label: '종료' },
];
const TRADE_METHOD_FILTERS = [
  { value: 'delivery', sourceCodes: ['TRDC0009', 'TRDC0015'], label: '배송' },
  { value: 'direct', sourceCodes: ['TRDC0010', 'TRDC0015'], label: '직거래' },
];
const FILTER_GROUP_CLASS = 'm-0 grid gap-2 border-0 p-0 disabled:opacity-60';
const FILTER_OPTION_CLASS = 'flex cursor-pointer items-center gap-2 text-body-sm text-[#5f5e5a] md:text-body-md';
const FILTER_MESSAGE_CLASS = 'm-0 min-h-5 text-caption text-[#5f5e5a]';
const FILTER_INPUT_CLASS = 'min-h-10 w-full rounded-lg border border-[#e2e1dc] bg-white px-3 text-body-sm text-[#1a1a18] outline-none transition-colors focus:border-primary md:text-body-md';
const PAGINATION_BUTTON_CLASS = 'min-h-10 rounded-lg border border-[#e2e1dc] bg-white px-3.5 text-body-md font-semibold text-[#5f5e5a] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 max-sm:min-h-9 max-sm:min-w-9 max-sm:px-1.5 max-sm:text-caption';
const PAGINATION_WINDOW_SIZE = 5;
const MOBILE_HEADER_HEIGHT = 154;

const getPaginationItems = (currentPage, totalPages) => {
  const halfWindow = Math.floor(PAGINATION_WINDOW_SIZE / 2);
  const windowSize = Math.min(PAGINATION_WINDOW_SIZE, totalPages);
  const maxWindowStart = totalPages - windowSize + 1;
  const windowStart = Math.min(
    Math.max(currentPage - halfWindow, 1),
    maxWindowStart,
  );
  return Array.from({ length: windowSize }, (_, index) => windowStart + index);
};

const toggleValue = (values, value) => (
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
);

const normalizeTradeMethod = (value) => {
  if (value === 'delivery' || value === 'TRDC0009') return 'delivery';
  if (value === 'direct' || value === 'TRDC0010') return 'direct';
  return 'all';
};

const createDraftFromSearchParams = (searchParams) => ({
  keyword: searchParams.get('keyword') || '',
  categories: getSelectedValues(searchParams, 'category'),
  statuses: getSelectedValues(searchParams, 'status'),
  tradeMethod: normalizeTradeMethod(searchParams.get('tradeMethod')),
  sort: searchParams.get('sort') || 'latest',
  minPrice: searchParams.get('minPrice') || '',
  maxPrice: searchParams.get('maxPrice') || '',
  instantBuyOnly: searchParams.get('instantBuyOnly') === 'true',
  endingSoonOnly: searchParams.get('endingSoonOnly') === 'true',
});

const AuctionListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldScrollAfterPageChangeRef = useRef(false);
  const filterBarAnchorRef = useRef(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterBarFixed, setFilterBarFixed] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState(searchParams.get('keyword') || '');
  const [categoryDraft, setCategoryDraft] = useState(() => getSelectedValues(searchParams, 'category'));
  const [statusDraft, setStatusDraft] = useState(() => getSelectedValues(searchParams, 'status'));
  const [tradeMethodDraft, setTradeMethodDraft] = useState(
    normalizeTradeMethod(searchParams.get('tradeMethod')),
  );
  const [sortDraft, setSortDraft] = useState(searchParams.get('sort') || 'latest');
  const [minPriceDraft, setMinPriceDraft] = useState(searchParams.get('minPrice') || '');
  const [maxPriceDraft, setMaxPriceDraft] = useState(searchParams.get('maxPrice') || '');
  const [instantBuyOnlyDraft, setInstantBuyOnlyDraft] = useState(
    searchParams.get('instantBuyOnly') === 'true',
  );
  const [endingSoonOnlyDraft, setEndingSoonOnlyDraft] = useState(
    searchParams.get('endingSoonOnly') === 'true',
  );
  const [previewQueryParams, setPreviewQueryParams] = useState(null);
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      const nextDraft = createDraftFromSearchParams(new URLSearchParams(searchParamsKey));
      setKeywordDraft(nextDraft.keyword);
      setCategoryDraft(nextDraft.categories);
      setStatusDraft(nextDraft.statuses);
      setTradeMethodDraft(nextDraft.tradeMethod);
      setSortDraft(nextDraft.sort);
      setMinPriceDraft(nextDraft.minPrice);
      setMaxPriceDraft(nextDraft.maxPrice);
      setInstantBuyOnlyDraft(nextDraft.instantBuyOnly);
      setEndingSoonOnlyDraft(nextDraft.endingSoonOnly);
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [searchParamsKey]);

  useEffect(() => {
    if (!filterOpen || !window.matchMedia('(max-width: 767px)').matches) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filterOpen]);

  useBodyScrollLock(filterOpen);

  useEffect(() => {
    const anchor = filterBarAnchorRef.current;
    if (!anchor) return undefined;

    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const observer = new IntersectionObserver(([entry]) => {
      const shouldFix = mobileQuery.matches
        && !entry.isIntersecting
        && entry.boundingClientRect.top < MOBILE_HEADER_HEIGHT;
      setFilterBarFixed(shouldFix);
    }, {
      rootMargin: `-${MOBILE_HEADER_HEIGHT}px 0px 0px 0px`,
      threshold: 0,
    });

    observer.observe(anchor);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncHeaderDock = () => {
      window.dispatchEvent(new CustomEvent(SITE_HEADER_DOCK_EVENT, {
        detail: { docked: filterBarFixed && window.innerWidth < 768 },
      }));
    };

    syncHeaderDock();
    window.addEventListener('resize', syncHeaderDock);
    return () => {
      window.removeEventListener('resize', syncHeaderDock);
      window.dispatchEvent(new CustomEvent(SITE_HEADER_DOCK_EVENT, {
        detail: { docked: false },
      }));
    };
  }, [filterBarFixed]);

  const selectedCategories = getSelectedValues(searchParams, 'category');
  const selectedStatuses = getSelectedValues(searchParams, 'status');
  const tradeMethod = normalizeTradeMethod(searchParams.get('tradeMethod'));
  const sort = searchParams.get('sort') || 'latest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const instantBuyOnly = searchParams.get('instantBuyOnly') === 'true';
  const endingSoonOnly = searchParams.get('endingSoonOnly') === 'true';
  const page = Number(searchParams.get('page') || 1);

  const categoriesQuery = useQuery({
    queryKey: ['auction-filter-categories', PRODUCT_CATEGORY_DOMAIN_CODE],
    queryFn: () => getCategories(PRODUCT_CATEGORY_DOMAIN_CODE)
      .then((response) => response.data.filter((category) => category.catParentSn !== null)),
    staleTime: 5 * 60 * 1000,
  });
  const auctionStatusesQuery = useQuery({
    queryKey: ['reference-codes', AUCTION_STATUS_GROUP_CODE],
    queryFn: () => fetchReferenceCodes(AUCTION_STATUS_GROUP_CODE),
    staleTime: 5 * 60 * 1000,
  });
  const tradeMethodsQuery = useQuery({
    queryKey: ['reference-codes', TRADE_METHOD_GROUP_CODE],
    queryFn: () => fetchReferenceCodes(TRADE_METHOD_GROUP_CODE),
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = categoriesQuery.data || [];
  const visibleCategoryOptions = showAllCategories
    ? categoryOptions
    : categoryOptions.slice(0, COLLAPSED_CATEGORY_COUNT);
  const availableAuctionStatusCodes = new Set(
    auctionStatusesQuery.data?.map((status) => status.code) || [],
  );
  const auctionStatusOptions = AUCTION_STATUS_FILTERS
    .filter((status) => availableAuctionStatusCodes.has(status.code));
  const availableTradeMethodCodes = new Set(
    tradeMethodsQuery.data?.map((method) => method.code) || [],
  );
  const tradeMethodOptions = TRADE_METHOD_FILTERS
    .filter((method) => method.sourceCodes.some((code) => availableTradeMethodCodes.has(code)));

  const queryParams = {
    keyword: searchParams.get('keyword') || '',
    category: selectedCategories,
    status: selectedStatuses,
    tradeMethod,
    sort,
    minPrice,
    maxPrice,
    instantBuyOnly: instantBuyOnly || undefined,
    endingSoonOnly: endingSoonOnly || undefined,
    page,
    size: DEFAULT_PAGE_SIZE,
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setPreviewQueryParams({
        keyword: keywordDraft.trim(),
        category: categoryDraft,
        status: statusDraft,
        tradeMethod: tradeMethodDraft,
        sort: sortDraft,
        minPrice: minPriceDraft,
        maxPrice: maxPriceDraft,
        instantBuyOnly: instantBuyOnlyDraft || undefined,
        endingSoonOnly: endingSoonOnlyDraft || undefined,
        page: 1,
        size: 1,
      });
    }, 250);

    return () => window.clearTimeout(timerId);
  }, [
    categoryDraft,
    endingSoonOnlyDraft,
    instantBuyOnlyDraft,
    keywordDraft,
    maxPriceDraft,
    minPriceDraft,
    sortDraft,
    statusDraft,
    tradeMethodDraft,
  ]);

  const filterPreviewQuery = useQuery({
    queryKey: ['auction-filter-preview', previewQueryParams],
    queryFn: () => fetchAuctions(previewQueryParams),
    enabled: Boolean(previewQueryParams),
    placeholderData: keepPreviousData,
    staleTime: 10 * 1000,
  });

  const {
    data: auctionPage,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['auctions', queryParams],
    queryFn: () => fetchAuctions(queryParams),
    placeholderData: keepPreviousData,
  });

  const auctionItems = auctionPage?.items || [];
  const totalPages = auctionPage?.totalPages || 0;
  const paginationItems = getPaginationItems(page, totalPages);

  useEffect(() => {
    if (!shouldScrollAfterPageChangeRef.current) return undefined;

    shouldScrollAfterPageChangeRef.current = false;
    const animationFrameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [page]);

  const createSearchParamsFromDraft = (keywordValue = keywordDraft) => {
    const next = new URLSearchParams();
    const keyword = keywordValue.trim();

    if (keyword) next.set('keyword', keyword);
    categoryDraft.forEach((category) => next.append('category', category));
    statusDraft.forEach((status) => next.append('status', status));
    if (minPriceDraft) next.set('minPrice', minPriceDraft);
    if (maxPriceDraft) next.set('maxPrice', maxPriceDraft);
    if (instantBuyOnlyDraft) next.set('instantBuyOnly', 'true');
    if (endingSoonOnlyDraft) next.set('endingSoonOnly', 'true');
    if (tradeMethodDraft && tradeMethodDraft !== 'all') next.set('tradeMethod', tradeMethodDraft);
    if (sortDraft && sortDraft !== 'latest') next.set('sort', sortDraft);

    return next;
  };

  const scrollToPageTop = () => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  };

  const handleSearch = (keyword) => {
    setSearchParams(createSearchParamsFromDraft(keyword), { replace: false });
    scrollToPageTop();
  };

  const handleFilterSearch = () => {
    const next = createSearchParamsFromDraft();

    setSearchParams(next, { replace: false });
    setFilterOpen(false);
    scrollToPageTop();
  };

  const handlePriceDraftChange = (setter, value) => {
    setter(value.replace(/[^\d]/g, ''));
  };

  const clearFilters = () => {
    setKeywordDraft('');
    setCategoryDraft([]);
    setStatusDraft([]);
    setTradeMethodDraft('all');
    setSortDraft('latest');
    setMinPriceDraft('');
    setMaxPriceDraft('');
    setInstantBuyOnlyDraft(false);
    setEndingSoonOnlyDraft(false);
    setShowAllCategories(false);
    setSearchParams(new URLSearchParams());
    setFilterOpen(false);
    scrollToPageTop();
  };

  const goToPage = (nextPage) => {
    if (nextPage === page) return;

    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    shouldScrollAfterPageChangeRef.current = true;
    setSearchParams(next);
  };

  return (
    <div className="min-h-full bg-white text-body-sm text-[#1a1a18] md:text-body-md">
  <HeaderSearchPortal>
      <HeaderSearchWithHistory
        storageKey="nct:auction-search-history"
        dropdownId="auction-search-history"
        value={keywordDraft}
        onChange={setKeywordDraft}
        onSubmit={handleSearch}
        placeholder="원하는 경매 상품을 검색하세요"
        ariaLabel="경매 검색어"
      />
  </HeaderSearchPortal>

     {/* .container에 Tailwind py-*를 같이 쓰면 App.css의 padding shorthand가 레이어 충돌로 상하 패딩을 0으로 무력화한다 — 인라인 style로 우회 */}
      <main className="mx-auto my-0 w-full max-w-[1600px] py-10 max-md:px-4 max-md:py-6">
        <div className="flex items-start gap-6 max-md:block">
          <button
            className={`fixed inset-0 z-[210] cursor-default border-0 bg-black/25 transition-opacity duration-200 ease-linear motion-reduce:transition-none md:hidden ${
              filterOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
            type="button"
            aria-label="필터 닫기"
            tabIndex={filterOpen ? 0 : -1}
            onClick={() => setFilterOpen(false)}
          />
          <aside
            className={`fixed inset-x-0 bottom-0 z-[220] flex h-[88dvh] max-h-[88dvh] w-full transform-gpu flex-col overflow-hidden rounded-t-2xl border border-[#f0efec] bg-white shadow-[0_-8px_28px_rgba(0,0,0,0.18)] transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform [backface-visibility:hidden] motion-reduce:transition-none ${
              filterOpen
                ? 'pointer-events-auto translate-y-0'
                : 'pointer-events-none translate-y-[101%]'
            } md:sticky md:top-[82px] md:inset-x-auto md:bottom-auto md:z-auto md:mb-0 md:h-fit md:max-h-[calc(100dvh-122px)] md:w-[280px] md:flex-[0_0_280px] md:self-start md:translate-y-0 md:rounded-lg md:pointer-events-auto md:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]`}
            aria-label="경매 목록 필터"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0efec] bg-white p-5 pb-3">
              <h2 className="m-0 text-h3 font-bold">필터</h2>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-[#e2e1dc] bg-white text-[#5f5e5a] transition-colors hover:border-primary hover:bg-primary-light hover:text-primary"
                  type="button"
                  onClick={clearFilters}
                  title="필터 초기화"
                  aria-label="필터 초기화"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="inline-flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-[#e2e1dc] bg-white text-[#5f5e5a] transition-colors hover:border-primary hover:bg-primary-light hover:text-primary md:hidden"
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  aria-label="필터 닫기"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto overscroll-contain p-5 [scrollbar-color:#c8ced8_transparent] [scrollbar-width:thin] [&>*]:shrink-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c8ced8] [&::-webkit-scrollbar-track]:bg-transparent">
            <fieldset
              className={`${FILTER_GROUP_CLASS} min-h-[214px]`}
              disabled={categoriesQuery.isLoading || categoriesQuery.isError}
            >
              <legend className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">카테고리</legend>
              {categoriesQuery.isLoading ? (
                <div className="grid gap-1.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton height={18} key={index} width={100 - index * 15 + '%'} />
                  ))}
                </div>
              ) : categoriesQuery.isError ? (
                <p className={`${FILTER_MESSAGE_CLASS} text-[#b42318]`}>불러오지 못했습니다.</p>
              ) : categoryOptions.length === 0 ? (
                <p className={FILTER_MESSAGE_CLASS}>선택 가능한 항목이 없습니다.</p>
              ) : (
                <>
                  {visibleCategoryOptions.map((category) => (
                    <label className={FILTER_OPTION_CLASS} key={category.catSn}>
                      <input
                        className="accent-primary"
                        type="checkbox"
                        checked={categoryDraft.includes(category.catNm)}
                        onChange={() => setCategoryDraft((prev) => toggleValue(prev, category.catNm))}
                      />
                      {category.catNm}
                    </label>
                  ))}
                  {categoryOptions.length > COLLAPSED_CATEGORY_COUNT && (
                    <button
                      className="inline-flex min-h-7 w-fit cursor-pointer items-center gap-1 border-0 bg-transparent text-caption font-bold text-primary transition-colors hover:text-primary-dark"
                      type="button"
                      onClick={() => setShowAllCategories((prev) => !prev)}
                    >
                      {showAllCategories ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      {showAllCategories ? '접기' : '더보기'}
                    </button>
                  )}
                </>
              )}
            </fieldset>

            <fieldset className={FILTER_GROUP_CLASS}>
              <legend className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">가격 범위</legend>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <input
                  className={FILTER_INPUT_CLASS}
                  value={minPriceDraft}
                  onChange={(event) => handlePriceDraftChange(setMinPriceDraft, event.target.value)}
                  inputMode="numeric"
                  placeholder="최소 금액"
                  aria-label="최소 금액"
                />
                <span className="text-[#5f5e5a]">~</span>
                <input
                  className={FILTER_INPUT_CLASS}
                  value={maxPriceDraft}
                  onChange={(event) => handlePriceDraftChange(setMaxPriceDraft, event.target.value)}
                  inputMode="numeric"
                  placeholder="최대 금액"
                  aria-label="최대 금액"
                />
              </div>
            </fieldset>

            <fieldset
              className={`${FILTER_GROUP_CLASS} min-h-[120px]`}
              disabled={auctionStatusesQuery.isLoading || auctionStatusesQuery.isError}
            >
              <legend className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">진행 상태</legend>
              {auctionStatusesQuery.isLoading ? (
                <div className="grid gap-1.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton height={18} key={index} width={100 - index * 15 + '%'} />
                  ))}
                </div>
              ) : auctionStatusesQuery.isError ? (
                <p className={`${FILTER_MESSAGE_CLASS} text-[#b42318]`}>불러오지 못했습니다.</p>
              ) : auctionStatusOptions.length === 0 ? (
                <p className={FILTER_MESSAGE_CLASS}>선택 가능한 항목이 없습니다.</p>
              ) : auctionStatusOptions.map((status) => (
                <label className={FILTER_OPTION_CLASS} key={status.code}>
                  <input
                    className="accent-primary"
                    type="checkbox"
                    checked={statusDraft.includes(status.code)}
                    onChange={() => setStatusDraft((prev) => toggleValue(prev, status.code))}
                  />
                  {status.label}
                </label>
              ))}
            </fieldset>

            <fieldset
              className={`${FILTER_GROUP_CLASS} min-h-[120px]`}
              disabled={tradeMethodsQuery.isLoading || tradeMethodsQuery.isError}
            >
              <legend className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">거래 방식</legend>
              {tradeMethodsQuery.isLoading ? (
                <div className="grid gap-1.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton height={18} key={index} width={100 - index * 15 + '%'} />
                  ))}
                </div>
              ) : tradeMethodsQuery.isError ? (
                <p className={`${FILTER_MESSAGE_CLASS} text-[#b42318]`}>불러오지 못했습니다.</p>
              ) : tradeMethodOptions.length === 0 ? (
                <p className={FILTER_MESSAGE_CLASS}>선택 가능한 항목이 없습니다.</p>
              ) : (
                <>
                  <label className={FILTER_OPTION_CLASS}>
                    <input
                      className="accent-primary"
                      name="tradeMethod"
                      type="radio"
                      checked={tradeMethodDraft === 'all'}
                      onChange={() => setTradeMethodDraft('all')}
                    />
                    모두
                  </label>
                  {tradeMethodOptions.map((method) => (
                    <label className={FILTER_OPTION_CLASS} key={method.value}>
                      <input
                        className="accent-primary"
                        name="tradeMethod"
                        type="radio"
                        checked={tradeMethodDraft === method.value}
                        onChange={() => setTradeMethodDraft(method.value)}
                      />
                      {method.label}
                    </label>
                  ))}
                </>
              )}
            </fieldset>

            <fieldset className={FILTER_GROUP_CLASS}>
              <legend className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">추가 조건</legend>
              <label className={FILTER_OPTION_CLASS}>
                <input
                  className="accent-primary"
                  type="checkbox"
                  checked={endingSoonOnlyDraft}
                  onChange={(event) => setEndingSoonOnlyDraft(event.target.checked)}
                />
                마감 1시간 이내 상품만
              </label>
              <label className={FILTER_OPTION_CLASS}>
                <input
                  className="accent-primary"
                  type="checkbox"
                  checked={instantBuyOnlyDraft}
                  onChange={(event) => setInstantBuyOnlyDraft(event.target.checked)}
                />
                즉시구매 가능한 상품만
              </label>
            </fieldset>

            <label className="grid gap-2">
              <span className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">정렬</span>
              <select
                className={FILTER_INPUT_CLASS}
                value={sortDraft}
                onChange={(event) => setSortDraft(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            </div>

            <div className="shrink-0 border-t border-[#f0efec] bg-white p-5 pt-3">
              <ActionButton
                fullWidth
                size="lg"
                onClick={handleFilterSearch}
                aria-busy={filterPreviewQuery.data?.totalElements === undefined}
              >
                {filterPreviewQuery.data?.totalElements === undefined
                  ? '상품 조회 중...'
                  : `상품 ${filterPreviewQuery.data.totalElements.toLocaleString('ko-KR')}개 보기`}
              </ActionButton>
            </div>
          </aside>

          {/* aside(필터 패널)와 flex 형제로 items-start라 테두리 자체는 이미 같은 높이에서 시작 — 추가 여백 없음 */}
          <section className="min-w-0 flex-1">
            <div className="mb-3 hidden max-md:block">
              <ActionButton
                fullWidth
                state={{ from: '/auction' }} /* 상품 등록 취소·완료 후 돌아올 목록 경로 */
                to="/product/register"
              >
                <Gavel aria-hidden="true" size={18} strokeWidth={2.2} />
                경매 등록
              </ActionButton>
            </div>
            <div className="hidden max-md:relative max-md:-mx-4 max-md:mb-3 max-md:block max-md:h-[58px]">
              <span
                ref={filterBarAnchorRef}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 h-px w-px md:hidden"
              />
              <div className={`max-md:z-40 max-md:bg-white/95 max-md:px-4 max-md:py-2 max-md:backdrop-blur-sm ${
                filterBarFixed
                  ? 'max-md:fixed max-md:inset-x-0 max-md:top-[154px] max-md:shadow-[0_5px_14px_rgba(0,0,0,0.14)]'
                  : 'max-md:absolute max-md:inset-0'
              }`}>
                <ActionButton
                  fullWidth
                  tone="outline"
                  aria-haspopup="dialog"
                  aria-expanded={filterOpen}
                  onClick={() => setFilterOpen(true)}
                >
                  <SlidersHorizontal size={18} />
                  필터
                </ActionButton>
              </div>
            </div>

            {isLoading ? (
              <CardGridSkeleton cardHeight={410} columns={3} count={6} />
            ) : isError ? (
              <div className="grid min-h-[340px] place-content-center justify-items-center gap-2.5 rounded-lg border border-[#f0efec] bg-[#f8f8f6] p-7 text-center">
                <strong>경매 상품을 불러오지 못했습니다.</strong>
                <p className="m-0 text-[#5f5e5a]">잠시 후 다시 시도해 주세요.</p>
              </div>
            ) : auctionItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-[45px] max-xl:grid-cols-2 max-xl:gap-6 max-md:grid-cols-1 max-md:gap-[18px]">
                {auctionItems.map((item) => (
                  <AuctionCard key={item.auctionId} item={item} />
                ))}
              </div>
            ) : (
              <div className="grid min-h-[340px] place-content-center justify-items-center gap-2.5 rounded-lg border border-[#f0efec] bg-[#f8f8f6] p-7 text-center">
                <strong className="text-h3">등록된 경매 상품이 없습니다.</strong>
                <p className="m-0 text-[#5f5e5a]">새 경매가 올라오면 이곳에 표시됩니다.</p>
                <ActionButton
                  onClick={clearFilters}
                >
                  필터 초기화
                </ActionButton>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex flex-nowrap justify-center gap-2 max-sm:gap-0.5" aria-label="경매 목록 페이지">
                <button
                  className={PAGINATION_BUTTON_CLASS}
                  type="button"
                  title="첫 페이지"
                  aria-label="첫 페이지로 이동"
                  disabled={page <= 1}
                  onClick={() => goToPage(1)}
                >
                  <ChevronsLeft size={17} aria-hidden="true" />
                </button>
                <button
                  className={PAGINATION_BUTTON_CLASS}
                  type="button"
                  title="이전 페이지"
                  aria-label="이전 페이지로 이동"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                </button>
                {paginationItems.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    aria-current={pageNumber === page ? 'page' : undefined}
                    className={pageNumber === page
                      ? 'min-h-10 rounded-lg border border-primary bg-primary px-3.5 text-body-md font-semibold text-white max-sm:min-h-9 max-sm:min-w-9 max-sm:px-1.5 max-sm:text-caption'
                      : PAGINATION_BUTTON_CLASS}
                    onClick={() => goToPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  className={PAGINATION_BUTTON_CLASS}
                  type="button"
                  title="다음 페이지"
                  aria-label="다음 페이지로 이동"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
                <button
                  className={PAGINATION_BUTTON_CLASS}
                  type="button"
                  title="마지막 페이지"
                  aria-label="마지막 페이지로 이동"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(totalPages)}
                >
                  <ChevronsRight size={17} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

    </div>
  );
};

export default AuctionListPage;
