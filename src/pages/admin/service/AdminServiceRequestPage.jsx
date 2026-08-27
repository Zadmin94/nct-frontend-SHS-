import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchAdminServiceRequests } from '@api/adminServiceRequestApi';
import AdminDateRangeFilter from '@components/admin/AdminDateRangeFilter';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminPagination from '@components/admin/AdminPagination';
import AdminReferenceLink from '@components/admin/AdminReferenceLink';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_HIGH_VOLUME_PAGE_SIZE } from '@/constants/adminPagination';
import { getAdminServiceRequestDetailPath } from '@/routes/adminRoutes';
import { useAdminCategories } from '@hooks/useAdminCategories';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import { formatDateTime } from '@utils/common';
import '../notice/adminContentPages.css';
import './adminServiceRequestPage.css';

const INITIAL_FILTERS = {
  categorySn: '',
  statusCode: '',
  registeredFrom: '',
  registeredTo: '',
  keyword: '',
};
const PAGE_SIZE = ADMIN_HIGH_VOLUME_PAGE_SIZE;
const SERVICE_CATEGORY_DOMAIN = 'CATC0002';
const STATUS_OPTIONS = [
  { value: 'SVCC0002', label: '공개' },
  { value: 'SVCC0001', label: '임시저장' },
  { value: 'SVCC0003', label: '매칭완료' },
  { value: 'SVCC0004', label: '종료' },
  { value: 'SVCC0005', label: '운영보류' },
  { value: 'SVCC0006', label: '취소' },
];

const statusTone = (statusCode) => {
  if (statusCode === 'SVCC0002') return 'info';
  if (statusCode === 'SVCC0003') return 'success';
  if (statusCode === 'SVCC0005') return 'warning';
  if (statusCode === 'SVCC0006') return 'danger';
  return 'neutral';
};

const integratedStatusTone = (statusCode) => {
  if (statusCode === 'COMPLETED') return 'success';
  if (statusCode === 'IN_PROGRESS') return 'info';
  return 'warning';
};

const tradeStatusTone = (statusCode) => {
  if (statusCode === 'TRDC0006') return 'success';
  if (statusCode === 'TRDC0007' || statusCode === 'TRDC0008') return 'danger';
  return 'info';
};

const formatAmount = (value) => (
  value == null ? '-' : `${Number(value).toLocaleString('ko-KR')}P`
);

const getTradeFlowDetails = (row) => [
  row.activeDisputeId != null ? '분쟁 진행 중' : null,
  row.activeEscrowAmount > 0 ? `보관 ${formatAmount(row.activeEscrowAmount)}` : null,
  row.refundedPointAmount > 0 ? `환불 ${formatAmount(row.refundedPointAmount)}` : null,
  row.settlementId != null
    ? `정산 ${row.settlementStatusName ?? row.settlementStatusCode}`
    : null,
].filter(Boolean);

/** 담당자 7 · F-OPS-010/021: 견적 요청 목록은 탐색에 집중하고 상세 운영은 독립 경로로 연결합니다. */
const AdminServiceRequestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filterForm, setFilterForm] = useState(INITIAL_FILTERS);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [filterError, setFilterError] = useState('');
  const [page, setPage] = useState(1);

  const categoriesQuery = useAdminCategories(SERVICE_CATEGORY_DOMAIN);
  const requestsQuery = useQuery({
    queryKey: ['admin-service-requests', filters, page],
    queryFn: () => fetchAdminServiceRequests({
      keyword: filters.keyword || undefined,
      categorySn: filters.categorySn || undefined,
      statusCode: filters.statusCode || undefined,
      registeredFrom: filters.registeredFrom || undefined,
      registeredTo: filters.registeredTo || undefined,
      page,
      size: PAGE_SIZE,
    }),
  });

  const rows = requestsQuery.data?.items ?? [];
  const categories = categoriesQuery.data ?? [];
  const columns = useMemo(() => [
    {
      key: 'serviceRequestReference',
      label: '견적 요청',
      className: 'admin-service-list__title admin-table__long-text admin-reference-cell',
      render: (_, row) => (
        <AdminReferenceLink
          centered
          meta={`견적 요청 · #${row.serviceRequestId}`}
          state={{ from: `${location.pathname}${location.search}` }}
          title={row.title || `견적 요청 #${row.serviceRequestId}`}
          to={getAdminServiceRequestDetailPath(row.serviceRequestId)}
        />
      ),
    },
    { key: 'categoryName', label: '카테고리', className: 'admin-table__compact-text' },
    {
      key: 'requesterUserId',
      label: '요청자',
      className: 'admin-table__compact-text',
      render: (value, row) => formatAdminMemberIdentity(row.requesterMember, value),
    },
    { key: 'budgetAmount', label: '예산', render: formatAmount },
    {
      key: 'statusName',
      label: '원본 상태',
      render: (value, row) => (
        <AdminStatusBadge tone={statusTone(row.statusCode)}>
          {value ?? row.statusCode}
        </AdminStatusBadge>
      ),
    },
    {
      key: 'integratedStatusName',
      label: '통합 상태',
      render: (value, row) => (
        <AdminStatusBadge tone={integratedStatusTone(row.integratedStatusCode)}>
          {value ?? '-'}
        </AdminStatusBadge>
      ),
    },
    {
      key: 'totalQuoteCount',
      label: '견적',
      render: (value, row) => `${value ?? 0}건${row.activeQuoteCount ? ` · 활성 ${row.activeQuoteCount}` : ''}`,
    },
    {
      key: 'tradeStatusName',
      label: '거래 흐름',
      className: 'admin-service-list__flow-cell',
      render: (value, row) => {
        if (row.tradeId == null) return '-';
        const tradeStatusLabel = value ?? row.tradeStatusCode;
        const flowDetails = getTradeFlowDetails(row);
        return (
          <div
            className="admin-service-list__flow"
            title={[tradeStatusLabel, ...flowDetails].join(' · ')}
          >
            <AdminStatusBadge tone={tradeStatusTone(row.tradeStatusCode)}>
              {tradeStatusLabel}
            </AdminStatusBadge>
            {flowDetails.length > 0 && (
              <span className="admin-service-list__flow-summary">
                {flowDetails.join(' · ')}
              </span>
            )}
          </div>
        );
      },
    },
    { key: 'registeredAt', label: '등록일', render: formatDateTime },
    {
      key: 'manage',
      label: '관리',
      render: (_, row) => (
        <button
          className="btn btn-outline"
          onClick={() => navigate(getAdminServiceRequestDetailPath(row.serviceRequestId), {
            state: { from: `${location.pathname}${location.search}` },
          })}
          type="button"
        >
          상세 보기
        </button>
      ),
    },
  ], [location.pathname, location.search, navigate]);

  const change = ({ target }) => {
    setFilterForm((current) => ({ ...current, [target.name]: target.value }));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if (filterForm.registeredFrom && filterForm.registeredTo
      && filterForm.registeredFrom > filterForm.registeredTo) {
      setFilterError('등록 시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    setFilterError('');
    setPage(1);
    setFilters({ ...filterForm, keyword: filterForm.keyword.trim() });
  };

  const resetFilters = () => {
    setFilterError('');
    setPage(1);
    setFilterForm(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="admin-content-page admin-service-page">
      <PageMeta title="견적 요청 관리" />
      <AdminPageHeader title="견적 요청 관리" />

      <form
        aria-label="견적 요청 검색"
        className="card admin-service-filter"
        onSubmit={submitSearch}
      >
        <label>
          카테고리
          <select
            disabled={categoriesQuery.isLoading}
            name="categorySn"
            onChange={change}
            value={filterForm.categorySn}
          >
            <option value="">전체</option>
            {categories.map((category) => (
              <option key={category.categorySn} value={category.categorySn}>
                {category.name}{category.active ? '' : ' (사용 중지)'}
              </option>
            ))}
          </select>
        </label>
        <label>
          상태
          <select name="statusCode" onChange={change} value={filterForm.statusCode}>
            <option value="">전체</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <AdminDateRangeFilter
          fromValue={filterForm.registeredFrom}
          onFromChange={(value) => setFilterForm((current) => ({
            ...current,
            registeredFrom: value,
          }))}
          onToChange={(value) => setFilterForm((current) => ({
            ...current,
            registeredTo: value,
          }))}
          toValue={filterForm.registeredTo}
        />
        <label className="admin-service-filter__search">
          검색
          <input
            name="keyword"
            onChange={change}
            placeholder="요청명 · 요청자 · 요청번호"
            value={filterForm.keyword}
          />
        </label>
        <AdminFilterActions disabled={requestsQuery.isFetching} onReset={resetFilters} />
      </form>

      {filterError && (
        <p className="admin-service-page__filter-error" role="alert">{filterError}</p>
      )}
      {categoriesQuery.isError && (
        <p className="admin-service-page__filter-error" role="alert">
          카테고리 필터를 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => categoriesQuery.refetch()} type="button">
            다시 시도
          </button>
        </p>
      )}
      {requestsQuery.isError && (
        <div className="admin-service-page__state is-error" role="alert">
          견적 요청 목록을 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => requestsQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      )}

      {!requestsQuery.isError && (
        <AdminSectionCard
          action={!requestsQuery.isLoading && <span>총 {requestsQuery.data?.totalItems ?? 0}건</span>}
          className="admin-notice-list admin-service-list"
          title="견적 요청 목록"
        >
          <div className="admin-table-scroll">
            <AdminTable
              columns={columns}
              data={rows}
              emptyMessage="조건에 맞는 견적 요청이 없습니다."
              loading={requestsQuery.isLoading}
              rowKey={(item) => item.serviceRequestId}
            />
          </div>
          <AdminPagination
            ariaLabel="견적 요청 목록 페이지 이동"
            disabled={requestsQuery.isFetching}
            onPageChange={setPage}
            page={requestsQuery.data?.page ?? page}
            totalPages={requestsQuery.data?.totalPages ?? 0}
          />
        </AdminSectionCard>
      )}
    </div>
  );
};

export default AdminServiceRequestPage;
