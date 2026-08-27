import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeAdminMemberStatus,
  getAdminMember,
  getAdminMembers,
} from '@api/adminMemberApi';
import AdminDetailDrawer from '@components/admin/AdminDetailDrawer';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminPagination from '@components/admin/AdminPagination';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import { toast } from '@utils/common';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import './audit/adminAuditPage.css';
import './operation/adminOperationPages.css';
import './AdminMemberList.css';

const PAGE_SIZE = ADMIN_PAGE_SIZE;
const EMPTY_FILTERS = { statusCode: '', keyword: '' };
const STATUS = {
  USRC0001: { label: '활성', tone: 'success' },
  USRC0002: { label: '정지', tone: 'danger' },
  USRC0003: { label: '탈퇴', tone: 'neutral' },
};
const REPORT_STATUS = {
  ABSC0001: '접수',
  ABSC0002: '처리 중',
  ABSC0003: '완료',
  ABSC0004: '반려',
};

const formatDate = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '-');
const memberStatus = (code, name) => STATUS[code] ?? { label: name ?? code ?? '-', tone: 'neutral' };
const createRequestId = () => globalThis.crypto?.randomUUID?.()
  ?? `member-status-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** 담당자 7 · F-OPS-002/019/020: 회원 조회·신고/제재 이력·계정 제한을 한 화면에서 관리합니다. */
const AdminMemberList = () => {
  const queryClient = useQueryClient();
  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedUserSn, setSelectedUserSn] = useState(null);
  const [reason, setReason] = useState('');

  const membersQuery = useQuery({
    queryKey: ['admin', 'members', appliedFilters, page],
    queryFn: () => getAdminMembers({ ...appliedFilters, page, size: PAGE_SIZE }),
  });
  const memberQuery = useQuery({
    queryKey: ['admin', 'members', selectedUserSn],
    queryFn: () => getAdminMember(selectedUserSn),
    enabled: selectedUserSn != null,
  });
  const statusMutation = useMutation({
    mutationFn: changeAdminMemberStatus,
    onSuccess: (result) => {
      toast({
        icon: 'success',
        title: result.changed
          ? `${formatAdminMemberIdentity(selectedMember, result.userSn)}의 상태를 변경했습니다.`
          : '이미 같은 상태라 추가 처리하지 않았습니다.',
        timer: 2200,
      });
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });

  const submitSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({ ...filterForm, keyword: filterForm.keyword.trim() });
    setPage(1);
  };

  const resetFilters = () => {
    setFilterForm(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const openMember = (userSn) => {
    setSelectedUserSn(userSn);
    setReason('');
    statusMutation.reset();
  };

  const closeMember = () => {
    if (statusMutation.isPending) return;
    setSelectedUserSn(null);
    setReason('');
    statusMutation.reset();
  };

  const changeStatus = (targetStatusCode) => {
    const normalizedReason = reason.trim();
    if (!selectedUserSn || !normalizedReason || statusMutation.isPending) return;
    statusMutation.mutate({
      userSn: selectedUserSn,
      targetStatusCode,
      reason: normalizedReason,
      requestId: createRequestId(),
    });
  };

  const columns = [
    {
      key: 'rowNumber',
      label: '번호',
      render: (_, __, index) => ((membersQuery.data?.page ?? page) - 1) * PAGE_SIZE + index + 1,
    },
    {
      key: 'userSn',
      label: '회원',
      className: 'admin-table__compact-text',
      render: (_, row) => formatAdminMemberIdentity(row, row.userSn),
    },
    { key: 'roleName', label: '역할', render: (value, row) => value ?? row.roleCode ?? '-' },
    {
      key: 'statusCode',
      label: '상태',
      render: (value, row) => {
        const status = memberStatus(value, row.statusName);
        return <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>;
      },
    },
    { key: 'reportCount', label: '신고', render: (value) => `${value ?? 0}건` },
    { key: 'registeredAt', label: '가입일', render: formatDate },
    {
      key: 'manage',
      label: '관리',
      render: (_, row) => (
        <button
          className="btn btn-outline admin-member__manage"
          onClick={() => openMember(row.userSn)}
          type="button"
        >
          상세
        </button>
      ),
    },
  ];

  const detail = memberQuery.data;
  const selectedMember = detail?.member;
  const selectedStatus = memberStatus(selectedMember?.statusCode, selectedMember?.statusName);
  const canChange = detail?.restrictionAvailable
    && selectedMember?.statusCode !== 'USRC0003';

  return (
    <div className="admin-bjn-page admin-operation-page admin-member">
      <PageMeta title="회원 관리" />
      <AdminPageHeader title="회원 관리" />

      {!membersQuery.isLoading && membersQuery.data?.restrictionAvailable === false && (
        <div className="admin-member__contract-warning" role="status">
          회원 조회는 사용할 수 있습니다. 계정 제한·해제는 담당자 5의 제재 계약 연결 후 활성화됩니다.
        </div>
      )}

      <form className="admin-bjn-filters admin-operation-search" onSubmit={submitSearch}>
        <label className="admin-operation-search__status">
          회원 상태
          <select
            onChange={(event) => setFilterForm({ ...filterForm, statusCode: event.target.value })}
            value={filterForm.statusCode}
          >
            <option value="">전체 상태</option>
            <option value="USRC0001">활성</option>
            <option value="USRC0002">정지</option>
            <option value="USRC0003">탈퇴</option>
          </select>
        </label>
        <label className="admin-operation-search__keyword">
          회원 검색
          <input
            maxLength={100}
            onChange={(event) => setFilterForm({ ...filterForm, keyword: event.target.value })}
            placeholder="로그인 ID·이름"
            value={filterForm.keyword}
          />
        </label>
        <AdminFilterActions disabled={membersQuery.isFetching} onReset={resetFilters} />
      </form>

      {membersQuery.isError && (
        <div className="admin-bjn-state is-error">
          회원 목록을 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => membersQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      )}
      {!membersQuery.isError && (
        <AdminSectionCard
          action={!membersQuery.isLoading && <span>총 {membersQuery.data?.totalItems ?? 0}명</span>}
          description="민감정보 원문 없이 회원 상태와 신고 건수를 조회합니다."
          title="회원 목록"
        >
          <div className="admin-bjn-table-scroll">
            <AdminTable
              columns={columns}
              data={membersQuery.data?.items ?? []}
              emptyMessage="조건에 맞는 회원이 없습니다."
              loading={membersQuery.isLoading}
              rowKey={(row) => row.userSn}
            />
          </div>
          <AdminPagination
            ariaLabel="회원 목록 페이지 이동"
            disabled={membersQuery.isFetching}
            onPageChange={setPage}
            page={membersQuery.data?.page ?? page}
            totalPages={membersQuery.data?.totalPages ?? 0}
          />
        </AdminSectionCard>
      )}

      {selectedUserSn && (
        <AdminDetailDrawer
          eyebrow="회원 관리"
          footer={(
            <button
              className="btn btn-outline"
              disabled={statusMutation.isPending}
              onClick={closeMember}
              type="button"
            >
              닫기
            </button>
          )}
          onClose={closeMember}
          panelClassName="admin-member-drawer"
          title="회원 상세"
        >
          <section className="admin-member-detail">
            {memberQuery.isLoading && <div className="admin-bjn-state">회원 정보를 불러오는 중입니다.</div>}
            {memberQuery.isError && <div className="admin-bjn-state is-error">회원 정보를 불러오지 못했습니다.</div>}
            {selectedMember && (
              <>
                <dl className="admin-member-detail__summary">
                  <dt>회원</dt>
                  <dd>{formatAdminMemberIdentity(selectedMember, selectedMember.userSn)}</dd>
                  <dt>역할</dt><dd>{selectedMember.roleName ?? selectedMember.roleCode}</dd>
                  <dt>상태</dt>
                  <dd><AdminStatusBadge tone={selectedStatus.tone}>{selectedStatus.label}</AdminStatusBadge></dd>
                  <dt>가입일</dt><dd>{formatDate(selectedMember.registeredAt)}</dd>
                </dl>

                <section className="admin-member-detail__history">
                  <h3>최근 신고 이력</h3>
                  {detail.reports.length === 0
                    ? <p>신고 이력이 없습니다.</p>
                    : (
                      <ul>
                        {detail.reports.map((report) => (
                          <li key={report.reportSn}>
                            <span>#{report.reportSn} · {REPORT_STATUS[report.statusCode] ?? report.statusCode}</span>
                            <span>신고자: {report.reporterUserSn == null
                              ? '시스템'
                              : formatAdminMemberIdentity(report.reporterMember, report.reporterUserSn)}</span>
                            <strong>{report.content || '내용 없음'}</strong>
                            <time>{formatDate(report.registeredAt)}</time>
                            {report.processedAt && (
                              <span>처리: {formatAdminMemberIdentity(
                                report.processorMember,
                                report.processedBy,
                              )} · {formatDate(report.processedAt)}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                </section>

                <section className="admin-member-detail__history">
                  <h3>최근 제재 이력</h3>
                  {!detail.sanctionHistoryAvailable
                    ? <p className="admin-member-detail__unavailable">담당자 5의 제재 이력 계약 연결 대기 중입니다.</p>
                    : detail.sanctions.length === 0
                      ? <p>제재 이력이 없습니다.</p>
                      : (
                        <ul>
                          {detail.sanctions.map((sanction) => (
                            <li key={sanction.sanctionSn}>
                              <span>#{sanction.sanctionSn} · {sanction.sanctionTypeName ?? sanction.sanctionTypeCode}</span>
                              <strong>{sanction.reason}</strong>
                              <time>{formatDate(sanction.startedAt)}</time>
                              <span>처리자: {formatAdminMemberIdentity(
                                detail.sanctionProcessorMembers?.[sanction.processedBy],
                                sanction.processedBy,
                              )}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                </section>

                {selectedMember.statusCode !== 'USRC0003' && (
                  <section className="admin-member-detail__change">
                    <label>
                      처리 사유
                      <textarea
                        className="admin-reason-textarea"
                        disabled={!canChange || statusMutation.isPending}
                        maxLength={500}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="계정 제한 또는 해제 사유를 입력하세요."
                        value={reason}
                      />
                    </label>
                    {!detail.restrictionAvailable && (
                      <p className="admin-member-detail__unavailable" role="status">
                        제재 계약이 연결되기 전에는 상태를 변경할 수 없습니다.
                      </p>
                    )}
                    {statusMutation.isError && (
                      <p className="admin-operation-error" role="alert">
                        {statusMutation.error?.response?.data?.message
                          ?? '회원 상태 변경에 실패했습니다.'}
                      </p>
                    )}
                    <div className="admin-operation-actions">
                      {selectedMember.statusCode === 'USRC0001' ? (
                        <button
                          className="btn btn-primary admin-member__restrict"
                          disabled={!canChange || !reason.trim() || statusMutation.isPending}
                          onClick={() => changeStatus('USRC0002')}
                          type="button"
                        >
                          {statusMutation.isPending ? '처리 중…' : '계정 제한'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          disabled={!canChange || !reason.trim() || statusMutation.isPending}
                          onClick={() => changeStatus('USRC0001')}
                          type="button"
                        >
                          {statusMutation.isPending ? '처리 중…' : '제한 해제'}
                        </button>
                      )}
                    </div>
                  </section>
                )}
                <AdminHistoryTimeline
                  referenceSn={selectedMember.userSn}
                  referenceType="MEMBER"
                  title="회원 운영 이력"
                />
              </>
            )}
          </section>
        </AdminDetailDrawer>
      )}
    </div>
  );
};

export default AdminMemberList;
