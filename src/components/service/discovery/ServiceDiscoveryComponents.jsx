import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  RotateCcw,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { SERVICE_REQUEST_SORT_OPTIONS } from '@/constants/serviceDiscovery';
import { getServiceRequestDetailPath } from '@/routes/serviceRequestRoutes';
import { ActionButton, CategoryTag } from '@components/common/ui';

const FILTER_GROUP_CLASS = 'm-0 grid gap-2 border-0 p-0 disabled:opacity-60';
const FILTER_INPUT_CLASS = 'min-h-10 w-full rounded-lg border border-[#e2e1dc] bg-white px-3 text-body-sm text-[#1a1a18] outline-none transition-colors focus:border-primary md:text-body-md';

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `${amount.toLocaleString('ko-KR')}P`
    : '예산 협의';
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const getPageNumbers = (page, totalPages) => {
  const visibleCount = Math.min(5, totalPages);
  const start = Math.min(
    Math.max(1, page - Math.floor(visibleCount / 2)),
    Math.max(1, totalPages - visibleCount + 1),
  );
  return Array.from({ length: visibleCount }, (_, index) => start + index);
};

const FilterFields = ({
  categories,
  categoriesError,
  categoriesLoading,
  filters,
  onChange,
}) => {
  return (
    <div className="grid gap-[18px]">
      <label className="grid gap-2">
        <span className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">카테고리</span>
        <select
          className={FILTER_INPUT_CLASS}
          disabled={categoriesLoading || categoriesError}
          onChange={(event) => onChange('categorySn', event.target.value)}
          value={filters.categorySn}
        >
          <option value="">전체 카테고리</option>
          {categories.map((category) => (
            <option key={category.catSn} value={category.catSn}>{category.catNm}</option>
          ))}
        </select>
        {categoriesLoading && <span className="text-caption text-[#5f5e5a]">불러오는 중입니다.</span>}
        {categoriesError && <span className="text-caption text-[#b42318]">카테고리를 불러오지 못했습니다.</span>}
      </label>

      <fieldset className={FILTER_GROUP_CLASS}>
        <legend className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">예산 범위</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <input
            aria-label="최소 예산"
            className={`${FILTER_INPUT_CLASS} min-w-0`}
            min="0"
            onChange={(event) => onChange('minBudget', event.target.value)}
            placeholder="최소"
            type="number"
            value={filters.minBudget || ''}
          />
          <span className="text-base text-[#777774]">~</span>
          <input
            aria-label="최대 예산"
            className={`${FILTER_INPUT_CLASS} min-w-0`}
            min="0"
            onChange={(event) => onChange('maxBudget', event.target.value)}
            placeholder="최대"
            type="number"
            value={filters.maxBudget || ''}
          />
        </div>
      </fieldset>

      <label className="grid gap-2">
        <span className="mb-0.5 block text-body-lg font-extrabold text-[#1a1a18]">정렬</span>
        <select
          className={FILTER_INPUT_CLASS}
          onChange={(event) => onChange('sort', event.target.value)}
          value={filters.sort}
        >
          {SERVICE_REQUEST_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
};

export const ServiceFilterPanel = ({
  categories,
  categoriesError,
  categoriesLoading,
  filters,
  isOpen,
  onChange,
  onClose,
  onReset,
  resultCount,
  resultLoading,
}) => {
  const fields = (
    <FilterFields
      categories={categories}
      categoriesError={categoriesError}
      categoriesLoading={categoriesLoading}
      filters={filters}
      onChange={onChange}
    />
  );

  return (
    <>
      <button
        aria-label="필터 닫기"
        className={`fixed inset-0 z-[210] cursor-default border-0 bg-black/25 transition-opacity duration-200 ease-linear motion-reduce:transition-none md:hidden ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <aside
        className={`fixed inset-x-0 bottom-0 z-[220] flex h-[88dvh] max-h-[88dvh] w-full transform-gpu flex-col overflow-hidden rounded-t-2xl border border-[#f0efec] bg-white shadow-[0_-8px_28px_rgba(0,0,0,0.18)] transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform [backface-visibility:hidden] motion-reduce:transition-none ${isOpen ? 'pointer-events-auto translate-y-0' : 'pointer-events-none translate-y-[101%]'} md:sticky md:top-[82px] md:inset-x-auto md:bottom-auto md:z-auto md:mb-0 md:h-fit md:max-h-[calc(100dvh-122px)] md:w-[280px] md:flex-[0_0_280px] md:self-start md:translate-y-0 md:rounded-lg md:pointer-events-auto md:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]`}
        aria-label="서비스 검색 필터"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0efec] bg-white p-5 pb-3">
          <h2 className="m-0 text-h3 font-bold">필터</h2>
          <div className="flex items-center gap-2">
            <button className="inline-flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-[#e2e1dc] bg-white text-[#5f5e5a] transition-colors hover:border-primary hover:bg-primary-light hover:text-primary" onClick={onReset} title="필터 초기화" type="button">
              <RotateCcw aria-hidden="true" size={16} />
              <span className="sr-only">필터 초기화</span>
            </button>
            <button className="inline-flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-[#e2e1dc] bg-white text-[#5f5e5a] transition-colors hover:border-primary hover:bg-primary-light hover:text-primary md:hidden" onClick={onClose} title="필터 닫기" type="button">
              <X aria-hidden="true" size={18} />
              <span className="sr-only">필터 닫기</span>
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto overscroll-contain p-5 [scrollbar-color:#c8ced8_transparent] [scrollbar-width:thin] [&>*]:shrink-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c8ced8] [&::-webkit-scrollbar-track]:bg-transparent">
          {fields}
        </div>
        <div className="shrink-0 border-t border-[#f0efec] bg-white p-5 pt-3">
          <ActionButton
            className="min-h-[46px] rounded-lg px-3 text-body-md font-bold"
            fullWidth
            onClick={onClose}
            preserveSize
            tone="primary"
          >
            {resultLoading ? '서비스 조회 중...' : `서비스 ${(resultCount ?? 0).toLocaleString('ko-KR')}개 보기`}
          </ActionButton>
        </div>
      </aside>
    </>
  );
};

// 전역 브레드크럼 (BJN, 260805): 목록의 현재 경로(검색·필터 포함)를 state.from으로 전달해
// 상세 화면 브레드크럼이 "어디서 들어왔는지"를 표시할 수 있게 한다
const ServiceRequestCard = ({ request }) => {
  const location = useLocation();
  return (
  <Link
    className="group flex min-h-[410px] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-[#f0efec] bg-white p-5 text-body-sm text-inherit no-underline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.1)] max-md:min-h-0 md:text-body-md"
    state={{ from: `${location.pathname}${location.search}${location.hash}` }}
    to={getServiceRequestDetailPath(request.id)}
  >
    <div className="relative flex h-[210px] items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#e8f0fe,#f8f8f6)] text-[#5f5e5a]">
      <span className="inline-flex size-24 items-center justify-center rounded-full bg-white/60 text-center text-body-sm font-extrabold">
        {request.categoryName || '서비스'}
      </span>
      {request.imageUrl && (
        <img
          alt={request.title}
          className="absolute inset-0 block size-full object-cover"
          src={request.imageUrl}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
    <div className="mt-3 flex min-h-12 items-start justify-between gap-3">
      <h3
        className="m-0 h-12 min-w-0 overflow-hidden text-body-md leading-6 font-bold text-[#1a1a18] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] group-hover:text-primary md:text-body-lg"
        title={request.title}
      >
        {request.title}
      </h3>
      <CategoryTag className="shrink-0" tone="neutral">{request.categoryName || '서비스'}</CategoryTag>
    </div>
    <strong className="mt-2 whitespace-nowrap text-h3 font-extrabold text-primary-dark">{formatAmount(request.budgetAmount)}</strong>
    <div className="mt-auto flex min-h-[51px] items-end justify-end border-t border-[#f0efec] pt-3.5">
      <span className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#c9ddff] bg-primary-light px-3 text-center text-caption font-bold whitespace-nowrap text-primary-dark tabular-nums">
        <Clock3 aria-hidden="true" size={15} />
        요청 등록일 {formatDate(request.registeredAt) || '미확인'}
      </span>
    </div>
  </Link>
  );
};

export const ServiceRequestGrid = ({ requests }) => (
  <div className="grid grid-cols-3 gap-[45px] max-xl:grid-cols-2 max-xl:gap-6 max-md:grid-cols-1 max-md:gap-[18px]" aria-label="서비스 요청 검색 결과">
    {requests.map((request) => <ServiceRequestCard key={request.id} request={request} />)}
  </div>
);

export const ServiceEmptyState = () => (
  <div className="grid min-h-[340px] place-content-center justify-items-center gap-2.5 rounded-lg border border-[#f0efec] bg-[#f8f8f6] p-7 text-center" role="status">
    <strong className="text-h3">조건에 맞는 서비스 요청이 없습니다.</strong>
    <span className="m-0 text-[#5f5e5a]">검색어나 필터 조건을 변경해 주세요.</span>
  </div>
);

export const ServicePagination = ({ onChange, page, totalPages }) => {
  if (totalPages <= 0) return null;
  const pages = getPageNumbers(page, totalPages);
  const paginationButton = 'min-h-10 rounded-lg border border-[#e2e1dc] bg-white px-3.5 text-body-md font-semibold text-[#5f5e5a] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 max-sm:min-h-9 max-sm:min-w-9 max-sm:px-1.5 max-sm:text-caption';

  return (
    <nav className="mt-6 flex flex-nowrap justify-center gap-2 max-sm:gap-0.5" aria-label="서비스 검색 결과 페이지">
      <button className={paginationButton} disabled={page === 1} onClick={() => onChange(1)} title="첫 페이지" type="button"><ChevronsLeft aria-hidden="true" size={17} /><span className="sr-only">첫 페이지</span></button>
      <button className={paginationButton} disabled={page === 1} onClick={() => onChange(page - 1)} title="이전 페이지" type="button"><ChevronLeft aria-hidden="true" size={17} /><span className="sr-only">이전 페이지</span></button>
      {pages.map((number) => (
        <button
          aria-current={number === page ? 'page' : undefined}
          className={number === page
            ? 'min-h-10 rounded-lg border border-primary bg-primary px-3.5 text-body-md font-semibold text-white max-sm:min-h-9 max-sm:min-w-9 max-sm:px-1.5 max-sm:text-caption'
            : paginationButton}
          key={number}
          onClick={() => onChange(number)}
          type="button"
        >
          {number}
        </button>
      ))}
      <button className={paginationButton} disabled={page === totalPages} onClick={() => onChange(page + 1)} title="다음 페이지" type="button"><ChevronRight aria-hidden="true" size={17} /><span className="sr-only">다음 페이지</span></button>
      <button className={paginationButton} disabled={page === totalPages} onClick={() => onChange(totalPages)} title="마지막 페이지" type="button"><ChevronsRight aria-hidden="true" size={17} /><span className="sr-only">마지막 페이지</span></button>
    </nav>
  );
};
