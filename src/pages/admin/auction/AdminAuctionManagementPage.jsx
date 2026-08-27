import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchAdminAuctions } from '@api/adminAuctionApi';
import AdminDateRangeFilter from '@components/admin/AdminDateRangeFilter';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminPagination from '@components/admin/AdminPagination';
import AdminReferenceLink from '@components/admin/AdminReferenceLink';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import PageMeta from '@components/admin/PageMeta';
import CommonTabs from '@components/common/CommonTabs';
import { ADMIN_HIGH_VOLUME_PAGE_SIZE } from '@/constants/adminPagination';
import { getAdminAuctionDetailPath } from '@/routes/adminRoutes';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import { formatDateTime } from '@utils/common';
import AdminBidUnitManagementPanel from './AdminBidUnitManagementPanel';
import '../audit/adminAuditPage.css';
import './adminAuctionManagementPage.css';

const auctionStatusTone = (statusCode) => {
  if (statusCode === 'AUCC0005' || statusCode === 'AUCC0006') return 'danger';
  if (statusCode === 'AUCC9001') return 'warning';
  if (statusCode === 'AUCC0002') return 'info';
  return 'neutral';
};

const tradeStatusTone = (statusCode) => {
  if (statusCode === 'TRDC0008') return 'danger';
  if (statusCode === 'TRDC0005' || statusCode === 'TRDC0007') return 'warning';
  if (statusCode === 'TRDC0006') return 'success';
  if (statusCode === 'TRDC0003' || statusCode === 'TRDC0004') return 'info';
  return 'neutral';
};

const TRADE_STATUS_LABELS = {
  TRDC0003: '진행중',
  TRDC0004: '배송/직거래중',
  TRDC0005: '상대확인대기',
  TRDC0006: '완료',
  TRDC0007: '보류',
  TRDC0008: '취소',
};

const INITIAL_FILTERS = {
  keyword: '',
  auctionStatusCode: '',
  tradeStatusCode: '',
  productVisible: '',
  cancellationPending: '',
  registeredFrom: '',
  registeredTo: '',
};

const PAGE_SIZE = ADMIN_HIGH_VOLUME_PAGE_SIZE;

/** 담당자 7 · F-OPS-003/004: 경매 목록은 탐색에 집중하고 운영 처리는 독립 상세 페이지로 연결합니다. */
const AdminAuctionManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'bid-units' ? 'bid-units' : 'auctions';
  const [filterForm, setFilterForm] = useState(INITIAL_FILTERS);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [filterError, setFilterError] = useState('');
  const [page, setPage] = useState(1);

  const auctionsQuery = useQuery({
    queryKey: ['admin-auctions', filters, page],
    queryFn: () => fetchAdminAuctions({
      keyword: filters.keyword || undefined,
      auctionStatusCode: filters.auctionStatusCode || undefined,
      tradeStatusCode: filters.tradeStatusCode || undefined,
      productVisible: filters.productVisible === ''
        ? undefined
        : filters.productVisible === 'VISIBLE',
      cancellationPending: filters.cancellationPending === ''
        ? undefined
        : filters.cancellationPending === 'PENDING',
      registeredFrom: filters.registeredFrom || undefined,
      registeredTo: filters.registeredTo || undefined,
      page,
      size: PAGE_SIZE,
    }),
    enabled: activeTab === 'auctions',
  });

  const rows = auctionsQuery.data?.items ?? [];
  const columns = useMemo(() => [
    {
      key: 'auctionReference',
      label: '경매',
      className: 'admin-table__long-text admin-auction-table__product-name admin-reference-cell',
      render: (_, row) => (
        <AdminReferenceLink
          centered
          meta={`경매 · #${row.auctionId}`}
          state={{
            auctionSummary: row,
            from: `${location.pathname}${location.search}`,
          }}
          title={row.productName || `경매 #${row.auctionId}`}
          to={getAdminAuctionDetailPath(row.auctionId)}
        />
      ),
    },
    {
      key: 'sellerUserSn',
      label: '판매자',
      className: 'admin-table__compact-text',
      render: (value, row) => formatAdminMemberIdentity(row.sellerMember, value),
    },
    {
      key: 'productUseYn',
      label: '상품 노출',
      render: (value) => (
        <AdminStatusBadge tone={value === 'N' ? 'warning' : 'success'}>
          {value === 'N' ? '숨김' : '노출'}
        </AdminStatusBadge>
      ),
    },
    {
      key: 'auctionStatusName',
      label: '경매 상태',
      render: (value, row) => (
        <AdminStatusBadge tone={auctionStatusTone(row.auctionStatusCode)}>
          {value ?? row.auctionStatusCode}
        </AdminStatusBadge>
      ),
    },
    { key: 'bidCount', label: '입찰', render: (value) => `${value ?? 0}건` },
    {
      key: 'tradeStatusName',
      label: '거래 상태',
      render: (value, row) => {
        const label = value ?? TRADE_STATUS_LABELS[row.tradeStatusCode] ?? row.tradeStatusCode;
        return label
          ? <AdminStatusBadge tone={tradeStatusTone(row.tradeStatusCode)}>{label}</AdminStatusBadge>
          : '-';
      },
    },
    { key: 'registeredAt', label: '등록일', render: formatDateTime },
    {
      key: 'manage',
      label: '관리',
      render: (_, row) => (
        <button
          className={row.cancelRequestId && row.cancelApprovedYn == null
            ? 'btn btn-danger'
            : 'btn btn-outline'}
          onClick={() => navigate(getAdminAuctionDetailPath(row.auctionId), {
            state: {
              auctionSummary: row,
              from: `${location.pathname}${location.search}`,
            },
          })}
          type="button"
        >
          {row.cancelRequestId
            ? (row.cancelApprovedYn == null ? '취소 심사' : '취소 처리 이력')
            : '상세 보기'}
        </button>
      ),
    },
  ], [location.pathname, location.search, navigate]);

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

  const selectTab = (tab) => {
    setSearchParams(tab === 'bid-units' ? { tab: 'bid-units' } : {});
  };

  return (
    <div className="admin-bjn-page admin-auction-page">
      <PageMeta title="경매 관리" />
      <AdminPageHeader title="경매 관리" />
      <CommonTabs
        activeValue={activeTab}
        ariaLabel="경매 관리 메뉴"
        className="admin-auction-tabs"
        items={[
          { value: 'auctions', label: '상품·경매 조회' },
          { value: 'bid-units', label: '입찰 단위 관리' },
        ]}
        onChange={selectTab}
      />

      {activeTab === 'bid-units' ? (
        <div role="tabpanel"><AdminBidUnitManagementPanel /></div>
      ) : (
        <div role="tabpanel">
          <form className="admin-bjn-filters admin-auction-filters" onSubmit={submitSearch}>
            <label>
              경매 상태
              <select
                onChange={(event) => setFilterForm({ ...filterForm, auctionStatusCode: event.target.value })}
                value={filterForm.auctionStatusCode}
              >
                <option value="">전체</option>
                <option value="AUCC0006">취소 요청</option>
                <option value="AUCC0002">진행 중</option>
                <option value="AUCC9001">관리자 일시중지</option>
                <option value="AUCC0001">진행 예정</option>
                <option value="AUCC0003">종료</option>
                <option value="AUCC0004">유찰</option>
                <option value="AUCC0005">취소</option>
              </select>
            </label>
            <label>
              거래 상태
              <select
                onChange={(event) => setFilterForm({ ...filterForm, tradeStatusCode: event.target.value })}
                value={filterForm.tradeStatusCode}
              >
                <option value="">전체</option>
                <option value="TRDC0003">진행중</option>
                <option value="TRDC0004">배송/직거래중</option>
                <option value="TRDC0005">상대확인대기</option>
                <option value="TRDC0006">완료</option>
                <option value="TRDC0007">보류</option>
                <option value="TRDC0008">취소</option>
              </select>
            </label>
            <label>
              상품 노출
              <select
                onChange={(event) => setFilterForm({ ...filterForm, productVisible: event.target.value })}
                value={filterForm.productVisible}
              >
                <option value="">전체</option>
                <option value="VISIBLE">노출</option>
                <option value="HIDDEN">숨김</option>
              </select>
            </label>
            <label>
              취소 요청
              <select
                onChange={(event) => setFilterForm({ ...filterForm, cancellationPending: event.target.value })}
                value={filterForm.cancellationPending}
              >
                <option value="">전체</option>
                <option value="PENDING">처리 대기</option>
                <option value="NONE">처리 대기 없음</option>
              </select>
            </label>
            <AdminDateRangeFilter
              fromValue={filterForm.registeredFrom}
              onFromChange={(value) => setFilterForm({ ...filterForm, registeredFrom: value })}
              onToChange={(value) => setFilterForm({ ...filterForm, registeredTo: value })}
              toValue={filterForm.registeredTo}
            />
            <label className="admin-auction-filters__search">
              검색
              <input
                onChange={(event) => setFilterForm({ ...filterForm, keyword: event.target.value })}
                placeholder="상품명·판매자·경매 번호"
                value={filterForm.keyword}
              />
            </label>
            <AdminFilterActions disabled={auctionsQuery.isFetching} onReset={resetFilters} />
          </form>

          {filterError && (
            <p className="admin-auction-page__filter-error" role="alert">{filterError}</p>
          )}
          {auctionsQuery.isError && (
            <div className="admin-bjn-state is-error">
              경매 목록을 불러오지 못했습니다.
              <button className="btn btn-outline" onClick={() => auctionsQuery.refetch()} type="button">
                다시 시도
              </button>
            </div>
          )}
          {!auctionsQuery.isError && (
            <AdminSectionCard
              action={!auctionsQuery.isLoading && <span>총 {auctionsQuery.data?.totalItems ?? 0}건</span>}
              title="경매·거래 목록"
            >
              <div className="admin-bjn-table-scroll">
                <AdminTable
                  columns={columns}
                  data={rows}
                  loading={auctionsQuery.isLoading}
                  rowKey={(row) => row.auctionId}
                />
              </div>
              <AdminPagination
                ariaLabel="경매·거래 목록 페이지 이동"
                disabled={auctionsQuery.isFetching}
                onPageChange={setPage}
                page={auctionsQuery.data?.page ?? page}
                totalPages={auctionsQuery.data?.totalPages ?? 0}
              />
            </AdminSectionCard>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAuctionManagementPage;
