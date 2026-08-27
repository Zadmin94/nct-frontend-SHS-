import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeAdminPointExchange,
  getAdminPointExchangeAccount,
  getAdminPointExchangeOrders,
  rejectAdminPointExchange,
} from '@api/adminPointExchangeApi';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminDetailDrawer from '@components/admin/AdminDetailDrawer';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminPagination from '@components/admin/AdminPagination';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import { toast } from '@utils/common';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import '../audit/adminAuditPage.css';
import './adminOperationPages.css';

const EXCHANGE_STATUS = {
  PEOC0001: { label: '신청', tone: 'warning' },
  PEOC0002: { label: '완료', tone: 'success' },
  PEOC0003: { label: '반려', tone: 'neutral' },
};

const PAGE_SIZE = ADMIN_PAGE_SIZE;
const EMPTY_FILTERS = { statusCode: '', keyword: '' };
const formatAmount = (value) => `${Number(value ?? 0).toLocaleString('ko-KR')}P`;
const formatDate = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '-');
const exchangeStatus = (code, fallback) => (
  EXCHANGE_STATUS[code] ?? { label: fallback || code || '-', tone: 'neutral' }
);
const isRequested = (code) => code === 'PEOC0001';

/** 담당자 7 · F-PAY-012: 처리 전후 환전 주문을 한 목록에서 조회하고 관리합니다. */
const AdminPointExchangePage = () => {
  const queryClient = useQueryClient();
  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [revealedAccount, setRevealedAccount] = useState(null);
  const [transferConfirmed, setTransferConfirmed] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ['admin', 'point-exchange', 'search', appliedFilters, page],
    queryFn: () => getAdminPointExchangeOrders({
      ...appliedFilters,
      page,
      size: PAGE_SIZE,
    }),
  });
  const accountMutation = useMutation({
    mutationFn: getAdminPointExchangeAccount,
    gcTime: 0,
    onSuccess: (account) => {
      setRevealedAccount(account);
      setTransferConfirmed(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
  const processMutation = useMutation({
    mutationFn: ({ action, orderSn, rejectReason }) => (
      action === 'complete'
        ? completeAdminPointExchange(orderSn)
        : rejectAdminPointExchange({ orderSn, reason: rejectReason })
    ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      toast({
        icon: 'success',
        title: `환전 신청 #${variables.orderSn}을 ${
          variables.action === 'complete' ? '지급 완료' : '반려'
        } 처리했습니다.`,
        timer: 2000,
      });
      setSelected(null);
      setReason('');
      setRevealedAccount(null);
      setTransferConfirmed(false);
      accountMutation.reset();
      if (page === 1) {
        ordersQuery.refetch();
      } else {
        setPage(1);
      }
    },
  });

  const submitSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({
      ...filterForm,
      keyword: filterForm.keyword.trim(),
    });
    setPage(1);
  };

  const resetFilters = () => {
    setFilterForm(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const openOrder = (order) => {
    setSelected(order);
    setReason('');
    setRevealedAccount(null);
    setTransferConfirmed(false);
    accountMutation.reset();
    processMutation.reset();
  };

  const closeOrder = () => {
    if (accountMutation.isPending || processMutation.isPending) return;
    setSelected(null);
    setReason('');
    setRevealedAccount(null);
    setTransferConfirmed(false);
    accountMutation.reset();
    processMutation.reset();
  };

  const columns = [
    { key: 'id', label: '신청 번호', render: (value) => `#${value}` },
    {
      key: 'userSn',
      label: '신청자',
      className: 'admin-table__compact-text',
      render: (value, row) => formatAdminMemberIdentity(row.applicantMember, value),
    },
    { key: 'amount', label: '신청 금액', render: formatAmount },
    {
      key: 'accountNo',
      label: '지급 계좌',
      render: (value, row) => `${row.bankName || '-'} ${value || '-'}`,
    },
    { key: 'date', label: '신청일', render: formatDate },
    {
      key: 'processedDate',
      label: '처리일',
      className: 'admin-table__processed-date',
      render: formatDate,
    },
    {
      key: 'statusCode',
      label: '상태',
      render: (value, row) => {
        const status = exchangeStatus(value, row.status);
        return <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>;
      },
    },
    {
      key: 'manage',
      label: '관리',
      render: (_, row) => (
        <button
          className={`btn ${
            isRequested(row.statusCode) ? 'btn-primary' : 'btn-outline'
          } admin-operation-table__action`}
          onClick={() => openOrder(row)}
          type="button"
        >
          {isRequested(row.statusCode) ? '처리' : '내역'}
        </button>
      ),
    },
  ];

  const complete = () => {
    if (!selected || !revealedAccount?.bankName || !revealedAccount?.accountNo
      || !transferConfirmed || processMutation.isPending) return;
    processMutation.mutate({ action: 'complete', orderSn: selected.id });
  };

  const reject = () => {
    const normalizedReason = reason.trim();
    if (!selected || !normalizedReason || processMutation.isPending) return;
    processMutation.mutate({
      action: 'reject',
      orderSn: selected.id,
      rejectReason: normalizedReason,
    });
  };

  const toggleAccount = () => {
    if (!selected || accountMutation.isPending) return;
    if (revealedAccount) {
      setRevealedAccount(null);
      setTransferConfirmed(false);
      accountMutation.reset();
      return;
    }
    accountMutation.mutate(selected.id);
  };

  const selectedStatus = exchangeStatus(selected?.statusCode, selected?.status);
  const canProcess = isRequested(selected?.statusCode);
  const hasRevealedAccount = Boolean(
    revealedAccount?.bankName?.trim() && revealedAccount?.accountNo?.trim(),
  );
  const accountNo = revealedAccount?.accountNo ?? selected?.accountNo;
  const bankName = revealedAccount?.bankName ?? selected?.bankName;

  return (
    <div className="admin-bjn-page admin-operation-page">
      <PageMeta title="환전 관리" />
      <AdminPageHeader title="환전 관리" />

      <form className="admin-bjn-filters admin-operation-search" onSubmit={submitSearch}>
        <label className="admin-operation-search__status">
          처리 상태
          <select
            onChange={(event) => setFilterForm({
              ...filterForm,
              statusCode: event.target.value,
            })}
            value={filterForm.statusCode}
          >
            <option value="">전체 상태</option>
            <option value="PEOC0001">신청</option>
            <option value="PEOC0002">완료</option>
            <option value="PEOC0003">반려</option>
          </select>
        </label>
        <label className="admin-operation-search__keyword">
          환전 검색
          <input
            maxLength={100}
            onChange={(event) => setFilterForm({
              ...filterForm,
              keyword: event.target.value,
            })}
            placeholder="신청 번호·신청자명"
            value={filterForm.keyword}
          />
        </label>
        <AdminFilterActions disabled={ordersQuery.isFetching} onReset={resetFilters} />
      </form>

      {ordersQuery.isError && (
        <div className="admin-bjn-state is-error">
          환전 목록을 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => ordersQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      )}
      {!ordersQuery.isError && (
        <AdminSectionCard
          action={!ordersQuery.isLoading && <span>총 {ordersQuery.data?.totalItems ?? 0}건</span>}
          description="신청부터 지급 완료·반려까지 모든 환전 주문과 처리 이력을 확인합니다."
          title="환전 목록"
        >
          <div className="admin-bjn-table-scroll">
            <AdminTable
              columns={columns}
              data={ordersQuery.data?.items ?? []}
              emptyMessage="조건에 맞는 환전 주문이 없습니다."
              loading={ordersQuery.isLoading}
              rowKey={(row) => row.id}
            />
          </div>
          <AdminPagination
            ariaLabel="환전 목록 페이지 이동"
            disabled={ordersQuery.isFetching}
            onPageChange={setPage}
            page={ordersQuery.data?.page ?? page}
            totalPages={ordersQuery.data?.totalPages ?? 0}
          />
        </AdminSectionCard>
      )}

      {selected && (
        <AdminDetailDrawer
          eyebrow="포인트 환전"
          footer={(
            <button
              className="btn btn-outline"
              disabled={accountMutation.isPending || processMutation.isPending}
              onClick={closeOrder}
              type="button"
            >
              닫기
            </button>
          )}
          onClose={closeOrder}
          title={canProcess ? '환전 신청 처리' : '환전 처리 내역'}
        >
          <section className="admin-operation-detail">
            <dl>
              <dt>신청 번호</dt><dd>#{selected.id}</dd>
              <dt>신청자</dt><dd>{formatAdminMemberIdentity(selected.applicantMember, selected.userSn)}</dd>
              <dt>신청 금액</dt><dd><strong>{formatAmount(selected.amount)}</strong></dd>
              <dt>상태</dt>
              <dd><AdminStatusBadge tone={selectedStatus.tone}>{selectedStatus.label}</AdminStatusBadge></dd>
              <dt>은행</dt><dd>{bankName || '-'}</dd>
              <dt>지급 계좌</dt>
              <dd className="admin-operation-account">
                <span>{accountNo || '-'}</span>
                {canProcess && (
                  <button
                    className="btn btn-outline"
                    disabled={accountMutation.isPending}
                    onClick={toggleAccount}
                    type="button"
                  >
                    {accountMutation.isPending
                      ? '불러오는 중…'
                      : revealedAccount ? '숨기기' : '계좌번호 보기'}
                  </button>
                )}
              </dd>
              <dt>신청일</dt><dd>{formatDate(selected.date)}</dd>
              {!canProcess && (
                <>
                  <dt>처리자</dt><dd>{formatAdminMemberIdentity(selected.processorMember, selected.processedBy)}</dd>
                  <dt>처리일</dt><dd>{formatDate(selected.processedDate)}</dd>
                  {selected.statusCode === 'PEOC0003' && (
                    <>
                      <dt>반려 사유</dt>
                      <dd className="admin-operation-detail__content">{selected.rejectReason || '-'}</dd>
                    </>
                  )}
                </>
              )}
            </dl>

            <AdminHistoryTimeline
              referenceSn={selected.id}
              referenceType="POINT_EXCHANGE_ORDER"
            />

            {accountMutation.isError && (
              <p className="admin-operation-error" role="alert">
                {accountMutation.error?.response?.data?.message
                  ?? '계좌번호를 불러오지 못했습니다. 이미 처리된 신청인지 확인해 주세요.'}
              </p>
            )}

            {canProcess && (
              <>
                <label className="admin-operation-confirm">
                  <input
                    checked={transferConfirmed}
                    disabled={!hasRevealedAccount || processMutation.isPending}
                    onChange={(event) => setTransferConfirmed(event.target.checked)}
                    type="checkbox"
                  />
                  계좌번호를 확인하고 실제 이체를 완료했습니다.
                </label>

                <label className="admin-operation-detail__reason">
                  반려 사유
                  <textarea
                    className="admin-reason-textarea"
                    disabled={processMutation.isPending}
                    maxLength={500}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="반려할 경우 사유를 입력하세요."
                    value={reason}
                  />
                </label>

                {processMutation.isError && (
                  <p className="admin-operation-error" role="alert">
                    {processMutation.error?.response?.data?.message
                      ?? '환전 처리에 실패했습니다. 이미 처리된 신청인지 확인해 주세요.'}
                  </p>
                )}
                <div className="admin-operation-actions">
                  <button
                    className="btn btn-outline"
                    disabled={!reason.trim() || processMutation.isPending}
                    onClick={reject}
                    type="button"
                  >
                    반려
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!hasRevealedAccount || !transferConfirmed || processMutation.isPending}
                    onClick={complete}
                    type="button"
                  >
                    {processMutation.isPending ? '처리 중…' : '지급 완료'}
                  </button>
                </div>
              </>
            )}
          </section>
        </AdminDetailDrawer>
      )}
    </div>
  );
};

export default AdminPointExchangePage;
