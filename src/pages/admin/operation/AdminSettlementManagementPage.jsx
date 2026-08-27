import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminSettlement,
  getAdminSettlements,
  holdAdminSettlement,
  releaseAdminSettlement,
} from '@api/adminSettlementApi';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminDetailDrawer from '@components/admin/AdminDetailDrawer';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminPagination from '@components/admin/AdminPagination';
import AdminReferenceLink from '@components/admin/AdminReferenceLink';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import { toast } from '@utils/common';
import '../audit/adminAuditPage.css';
import './adminOperationPages.css';

const EMPTY_FILTERS = { statusCode: '', keyword: '' };
const STATUS = {
  STLC0001: { label: '대기', tone: 'warning' },
  STLC0002: { label: '보류', tone: 'danger' },
  STLC0003: { label: '완료', tone: 'success' },
  STLC0004: { label: '환불종결', tone: 'neutral' },
};
const formatAmount = (value) => `${Number(value ?? 0).toLocaleString('ko-KR')}P`;
const formatDate = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '-');
const laterDate = (first, second) => {
  if (!first) return second ?? null;
  if (!second) return first;
  return new Date(first).getTime() >= new Date(second).getTime() ? first : second;
};
const settlementProcessedAt = (row) => {
  if (['STLC0003', 'STLC0004'].includes(row.statusCode)) return row.updatedAt;

  const latestActionAt = laterDate(row.processedAt, row.updatedAt);
  if (row.statusCode === 'STLC0002') return latestActionAt;
  if (row.statusCode !== 'STLC0001') return row.processedAt;
  if (row.processedAt) return latestActionAt;

  // 최초 대기는 등록과 갱신 시각이 같고, 분쟁 재개 등 실제 상태 전이 때만 갱신 시각이 늦어집니다.
  return new Date(row.updatedAt).getTime() > new Date(row.registeredAt).getTime()
    ? row.updatedAt
    : null;
};
const settlementStatus = (code, name) => STATUS[code] ?? {
  label: name || code || '-',
  tone: 'neutral',
};
const requestId = () => globalThis.crypto?.randomUUID?.()
  ?? `settlement-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** F-OPS-009 관리자 정산 목록·상세와 보류·해제를 제공합니다. */
const AdminSettlementManagementPage = () => {
  const queryClient = useQueryClient();
  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState('');

  const settlementsQuery = useQuery({
    queryKey: ['admin', 'settlements', appliedFilters, page],
    queryFn: () => getAdminSettlements({
      ...appliedFilters,
      page,
      size: ADMIN_PAGE_SIZE,
    }),
  });
  const detailQuery = useQuery({
    queryKey: ['admin', 'settlements', selectedId],
    queryFn: () => getAdminSettlement(selectedId),
    enabled: selectedId != null,
  });
  const actionMutation = useMutation({
    mutationFn: ({ action, settlementId, payload }) => (
      action === 'hold'
        ? holdAdminSettlement(settlementId, payload)
        : releaseAdminSettlement(settlementId, payload)
    ),
    onSuccess: async (_, variables) => {
      toast({
        icon: 'success',
        title: variables.action === 'hold'
          ? '정산을 보류했습니다.'
          : '정산 보류를 해제했습니다.',
        timer: 1800,
      });
      setReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'settlements'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }),
      ]);
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
  const openDetail = (settlementId) => {
    actionMutation.reset();
    setReason('');
    setSelectedId(settlementId);
  };
  const closeDetail = () => {
    if (actionMutation.isPending) return;
    actionMutation.reset();
    setReason('');
    setSelectedId(null);
  };

  const columns = [
    {
      key: 'settlementId',
      label: '정산',
      className: 'admin-reference-cell',
      render: (value, row) => (
        <AdminReferenceLink
          meta={`정산 · #${value}`}
          title={formatAdminMemberIdentity({ nickname: row.userName }, row.userId)}
        />
      ),
    },
    {
      key: 'tradeId',
      label: '연결 거래',
      className: 'admin-reference-cell',
      render: (value, row) => (
        <AdminReferenceLink
          meta={`거래 · #${value}`}
          title={`${formatAdminMemberIdentity({ nickname: row.userName }, row.userId)} 거래`}
        />
      ),
    },
    {
      key: 'userName',
      label: '정산 대상',
      className: 'admin-table__compact-text',
      render: (value, row) => formatAdminMemberIdentity(
        { nickname: value },
        row.userId,
      ),
    },
    { key: 'amount', label: '정산 포인트', render: formatAmount },
    {
      key: 'statusCode',
      label: '상태',
      render: (value, row) => {
        const status = settlementStatus(value, row.statusName);
        return <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>;
      },
    },
    { key: 'registeredAt', label: '등록일', render: formatDate },
    {
      key: 'processedAt',
      label: '처리일',
      className: 'admin-table__processed-date',
      render: (_, row) => formatDate(settlementProcessedAt(row)),
    },
    {
      key: 'manage',
      label: '관리',
      render: (_, row) => (
        <button
          className="btn btn-outline admin-operation-table__action"
          onClick={() => openDetail(row.settlementId)}
          type="button"
        >
          상세
        </button>
      ),
    },
  ];

  const detail = detailQuery.data;
  const currentStatus = settlementStatus(detail?.statusCode, detail?.statusName);
  const action = detail?.statusCode === 'STLC0001'
    ? 'hold'
    : detail?.statusCode === 'STLC0002' ? 'release' : null;
  const actionLabel = action === 'hold' ? '정산 보류' : '보류 해제';
  const submitAction = (event) => {
    event.preventDefault();
    const normalizedReason = reason.trim();
    if (!selectedId || !action || !normalizedReason || actionMutation.isPending) return;
    actionMutation.mutate({
      action,
      settlementId: selectedId,
      payload: { reason: normalizedReason, requestId: requestId() },
    });
  };

  return (
    <div className="admin-bjn-page admin-operation-page">
      <PageMeta title="정산 관리" />
      <AdminPageHeader title="정산 관리" />

      <form className="admin-bjn-filters admin-operation-search" onSubmit={submitSearch}>
        <label className="admin-operation-search__status">
          정산 상태
          <select
            onChange={(event) => setFilterForm({
              ...filterForm,
              statusCode: event.target.value,
            })}
            value={filterForm.statusCode}
          >
            <option value="">전체 상태</option>
            <option value="STLC0001">대기</option>
            <option value="STLC0002">보류</option>
            <option value="STLC0003">완료</option>
            <option value="STLC0004">환불종결</option>
          </select>
        </label>
        <label className="admin-operation-search__keyword">
          정산 검색
          <input
            maxLength={100}
            onChange={(event) => setFilterForm({
              ...filterForm,
              keyword: event.target.value,
            })}
            placeholder="정산 번호·거래 번호·이름"
            value={filterForm.keyword}
          />
        </label>
        <AdminFilterActions disabled={settlementsQuery.isFetching} onReset={resetFilters} />
      </form>

      {settlementsQuery.isError ? (
        <div className="admin-bjn-state is-error">
          정산 목록을 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => settlementsQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      ) : (
        <AdminSectionCard
          action={!settlementsQuery.isLoading && (
            <span>총 {settlementsQuery.data?.totalItems ?? 0}건</span>
          )}
          description="정산 상태와 최근 관리자 처리 내역을 확인하고 대기 정산을 보류하거나 재개합니다."
          title="정산 목록"
        >
          <div className="admin-bjn-table-scroll">
            <AdminTable
              columns={columns}
              data={settlementsQuery.data?.items ?? []}
              emptyMessage="조건에 맞는 정산이 없습니다."
              loading={settlementsQuery.isLoading}
              rowKey={(row) => row.settlementId}
            />
          </div>
          <AdminPagination
            ariaLabel="정산 목록 페이지 이동"
            disabled={settlementsQuery.isFetching}
            onPageChange={setPage}
            page={page}
            totalPages={settlementsQuery.data?.totalPages ?? 0}
          />
        </AdminSectionCard>
      )}

      {selectedId != null && (
        <AdminDetailDrawer
          eyebrow="정산 관리"
          footer={(
            <button
              className="btn btn-outline"
              disabled={actionMutation.isPending}
              onClick={closeDetail}
              type="button"
            >
              닫기
            </button>
          )}
          onClose={closeDetail}
          title={detail
            ? `${formatAdminMemberIdentity({ nickname: detail.userName }, detail.userId)} 정산`
            : '정산 상세'}
        >
          <section className="admin-operation-detail">
            {detailQuery.isLoading && <div className="admin-bjn-state">상세 정보를 불러오는 중입니다.</div>}
            {detailQuery.isError && (
              <div className="admin-operation-error" role="alert">정산 상세를 불러오지 못했습니다.</div>
            )}
            {detail && (
              <>
                <dl>
                  <dt>거래</dt>
                  <dd>
                    <AdminReferenceLink
                      meta={`거래 · #${detail.tradeId}`}
                      title={`${formatAdminMemberIdentity(
                        { nickname: detail.userName },
                        detail.userId,
                      )} 거래`}
                    />
                  </dd>
                  <dt>정산 대상</dt>
                  <dd>{formatAdminMemberIdentity(
                    { nickname: detail.userName },
                    detail.userId,
                  )}</dd>
                  <dt>정산 포인트</dt><dd>{formatAmount(detail.amount)}</dd>
                  <dt>현재 상태</dt>
                  <dd><AdminStatusBadge tone={currentStatus.tone}>{currentStatus.label}</AdminStatusBadge></dd>
                  <dt>등록일</dt><dd>{formatDate(detail.registeredAt)}</dd>
                  <dt>최종 갱신일</dt><dd>{formatDate(detail.updatedAt)}</dd>
                  <dt>최근 처리자</dt>
                  <dd>{detail.processorUserId
                    ? formatAdminMemberIdentity(
                      { nickname: detail.processorName },
                      detail.processorUserId,
                    )
                    : '-'}</dd>
                  <dt>최근 처리일</dt><dd>{formatDate(detail.processedAt)}</dd>
                  <dt>최근 처리 사유</dt>
                  <dd className="admin-operation-detail__content">{detail.processReason || '-'}</dd>
                </dl>

                <AdminHistoryTimeline
                  referenceSn={selectedId}
                  referenceType="SETTLEMENT"
                />

                {action && (
                  <form className="admin-operation-decision" onSubmit={submitAction}>
                    <div className="admin-operation-decision__heading">
                      <strong>{actionLabel}</strong>
                      <span>상태 변경, 감사 기록과 알림이 하나의 트랜잭션으로 처리됩니다.</span>
                    </div>
                    <label className="admin-operation-detail__reason">
                      처리 사유
                      <textarea
                        className="admin-reason-textarea"
                        disabled={actionMutation.isPending}
                        maxLength={1000}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={`${actionLabel} 사유를 입력하세요.`}
                        value={reason}
                      />
                    </label>
                    {actionMutation.isError && (
                      <p className="admin-operation-error" role="alert">
                        {actionMutation.error?.response?.data?.message
                          ?? `${actionLabel} 처리에 실패했습니다.`}
                      </p>
                    )}
                    <div className="admin-operation-actions">
                      <button
                        className="btn btn-primary"
                        disabled={!reason.trim() || actionMutation.isPending}
                        type="submit"
                      >
                        {actionMutation.isPending ? '처리 중…' : actionLabel}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </AdminDetailDrawer>
      )}
    </div>
  );
};

export default AdminSettlementManagementPage;
