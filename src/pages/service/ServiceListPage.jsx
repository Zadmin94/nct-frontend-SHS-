import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getCategories } from '@api/categoryApi';
import { ContentState } from '@components/content/ContentUi';
import {
  ServiceEmptyState,
  ServiceFilterPanel,
  ServicePagination,
  ServiceRequestGrid,
} from '@components/service/ServiceUi';
import CardGridSkeleton from '@components/skeleton/CardGridSkeleton';
import HeaderSearchPortal from '@components/common/HeaderSearchPortal';
import HeaderSearchWithHistory from '@components/common/HeaderSearchWithHistory';
import {
  SERVICE_CATEGORY_DOMAIN_CODE,
  SERVICE_DISCOVERY_PAGE_SIZE,
} from '@/constants/serviceDiscovery';
import { useServiceDiscovery } from '@hooks/useServiceDiscovery';
import useBodyScrollLock from '@hooks/useBodyScrollLock';

const toBudget = (value) => {
  const parsed = Number(value || 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const toPage = (value) => {
  const parsed = Number(value || 1);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
};

const toRequestSort = (value) => (value === 'budget' ? 'budget' : 'latest');

/** 담당자 5 · F-COM-002: 제공자가 공개 서비스 요청을 검색하는 목록 화면입니다. */
const ServiceListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultHeadingRef = useRef(null);
  const [keywordDraft, setKeywordDraft] = useState(searchParams.get('keyword') || '');

  const categoriesQuery = useQuery({
    queryKey: ['service-discovery-categories', SERVICE_CATEGORY_DOMAIN_CODE],
    queryFn: () => getCategories(SERVICE_CATEGORY_DOMAIN_CODE)
      .then((response) => response.data.filter((category) => category.catParentSn !== null)),
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesQuery.data ?? [];
  const legacyCategory = searchParams.get('category') || '';
  const resolvedLegacyCategorySn = legacyCategory
    ? categories.find((category) => category.catNm === legacyCategory)?.catSn
    : '';

  const filters = useMemo(() => ({
    keyword: searchParams.get('keyword') || '',
    categorySn: searchParams.get('categorySn') || String(resolvedLegacyCategorySn || ''),
    minBudget: toBudget(searchParams.get('minBudget')),
    maxBudget: toBudget(searchParams.get('maxBudget')),
    sort: toRequestSort(searchParams.get('sort')),
    page: toPage(searchParams.get('page')),
    size: SERVICE_DISCOVERY_PAGE_SIZE,
  }), [resolvedLegacyCategorySn, searchParams]);

  const budgetInvalid = filters.maxBudget > 0
    && filters.minBudget > filters.maxBudget;
  const legacyCategoryPending = Boolean(legacyCategory) && categoriesQuery.isLoading;
  const legacyCategoryMissing = Boolean(legacyCategory)
    && categoriesQuery.isSuccess
    && !resolvedLegacyCategorySn;
  const discoveryQuery = useServiceDiscovery(filters, {
    enabled: !budgetInvalid && !legacyCategoryPending && !legacyCategoryMissing,
  });
  const result = discoveryQuery.data;

  const updateParams = (changes, options = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === 0 || value == null || (key === 'page' && value === 1)) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    setSearchParams(next, options);
  };

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filtersOpen]);

  useBodyScrollLock(filtersOpen);

  useEffect(() => {
    const sort = searchParams.get('sort');
    const hasProviderParams = searchParams.has('view') || searchParams.has('region');
    const hasUnsupportedSort = Boolean(sort) && sort !== 'latest' && sort !== 'budget';
    if (!hasProviderParams && !hasUnsupportedSort) return;

    const next = new URLSearchParams(searchParams);
    next.delete('view');
    next.delete('region');
    if (hasUnsupportedSort) next.delete('sort');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!legacyCategory || !resolvedLegacyCategorySn || searchParams.get('categorySn')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.set('categorySn', String(resolvedLegacyCategorySn));
    setSearchParams(next, { replace: true });
  }, [legacyCategory, resolvedLegacyCategorySn, searchParams, setSearchParams]);

  const handleSearch = (keyword) => {
    updateParams({ keyword: keyword.trim(), page: null });
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleFilterChange = (name, value) => {
    const changes = { [name]: value, page: null };
    if (name === 'categorySn') changes.category = null;
    updateParams(changes, { replace: true });
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    if (filters.keyword) next.set('keyword', filters.keyword);
    setSearchParams(next, { replace: true });
  };

  const handlePageChange = (page) => {
    updateParams({ page });
    window.requestAnimationFrame(() => {
      resultHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const resultErrorTitle = budgetInvalid
    ? '예산 범위를 다시 확인해 주세요.'
    : legacyCategoryMissing
      ? '선택한 서비스 카테고리를 찾을 수 없습니다.'
      : '서비스 요청 검색 결과를 불러오지 못했습니다.';

  return (
    <div className="min-h-full bg-white text-body-sm text-[#1a1a18] md:text-body-md">
      <Helmet><title>견적 요청 목록 | 에누리컷</title></Helmet>

      <HeaderSearchPortal>
        <HeaderSearchWithHistory
          storageKey="nct:service-request-search-history"
          dropdownId="service-search-history"
          value={keywordDraft}
          onChange={setKeywordDraft}
          onSubmit={handleSearch}
          placeholder="필요한 서비스 요청을 검색하세요"
          ariaLabel="서비스 검색어"
          key={filters.keyword}
        />
      </HeaderSearchPortal>

      <main className="mx-auto my-0 w-full max-w-[1600px] py-10 max-md:px-4 max-md:py-6">
      <div className="flex items-start gap-6 max-md:block">
        <ServiceFilterPanel
          categories={categories}
          categoriesError={categoriesQuery.isError}
          categoriesLoading={categoriesQuery.isLoading}
          filters={filters}
          isOpen={filtersOpen}
          onChange={handleFilterChange}
          onClose={() => setFiltersOpen(false)}
          onReset={resetFilters}
          resultCount={result?.total}
          resultLoading={discoveryQuery.isLoading}
        />

        <section className="min-w-0 flex-1 scroll-mt-24" ref={resultHeadingRef}>
          <button className="mb-3 hidden min-h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary bg-white font-bold text-primary max-md:inline-flex" onClick={() => setFiltersOpen(true)} type="button">
            <SlidersHorizontal aria-hidden="true" size={18} />필터
          </button>

          {discoveryQuery.isLoading && <CardGridSkeleton cardHeight={410} columns={3} count={6} />}

          {(budgetInvalid || legacyCategoryMissing || discoveryQuery.isError) && (
            <ContentState
              actionLabel={!budgetInvalid && !legacyCategoryMissing ? '다시 불러오기' : undefined}
              description={budgetInvalid ? '최대 예산은 최소 예산보다 크거나 같아야 합니다.' : '검색 조건을 확인한 뒤 다시 시도해 주세요.'}
              onAction={!budgetInvalid && !legacyCategoryMissing ? () => discoveryQuery.refetch() : undefined}
              title={resultErrorTitle}
              tone="error"
            />
          )}

          {!discoveryQuery.isLoading
            && !discoveryQuery.isError
            && !budgetInvalid
            && !legacyCategoryMissing
            && result?.items?.length === 0 && <ServiceEmptyState />}

          {result?.items?.length > 0 && <ServiceRequestGrid requests={result.items} />}

          <ServicePagination
            onChange={handlePageChange}
            page={filters.page}
            totalPages={result?.totalPages || 0}
          />
        </section>
      </div>
      </main>
    </div>
  );
};

export default ServiceListPage;
