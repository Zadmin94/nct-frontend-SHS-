import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  answerAdminCustomerInquiry,
  getAdminCustomerInquiries,
  getAdminCustomerInquiry,
  startAdminCustomerInquiry,
} from '@api/customerInquiryApi';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminDetailDrawer from '@components/admin/AdminDetailDrawer';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminPagination from '@components/admin/AdminPagination';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import { useAuth } from '@hooks/useAuth';
import { useCustomerInquiryTypes } from '@hooks/useCustomerInquiry';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import { formatDateTime, toast } from '@utils/common';
import '../audit/adminAuditPage.css';
import './adminOperationPages.css';
import './adminCustomerInquiryPage.css';

const STATUS = {
  INQC0007: { label: '접수', tone: 'warning' },
  INQC0008: { label: '처리중', tone: 'info' },
  INQC0009: { label: '답변완료', tone: 'success' },
};
const EMPTY_FILTERS = { statusCode: '', inquiryTypeCode: '', keyword: '' };
const PAGE_SIZE = ADMIN_PAGE_SIZE;

const getStatus = (code) => STATUS[code] ?? { label: code ?? '-', tone: 'neutral' };
const normalizeId = (value) => (value == null ? '' : String(value));

/** 담당자 7 · 관리자 대상 1:1 문의: 접수 배정과 답변을 상태별로 분리해 역전이·직행 UI를 만들지 않습니다. */
const AdminCustomerInquiryManagementPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inquiryTypesQuery = useCustomerInquiryTypes();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [answer, setAnswer] = useState('');
  const startRequestIdRef = useRef(null);
  const answerDetectionKeyRef = useRef(null);

  const currentAdminId = user?.id ?? user?.userId ?? user?.userSn ?? user?.usrSn;
  const requestedInquirySn = Number(searchParams.get('inquirySn'));
  const selectedInquirySn = Number.isInteger(requestedInquirySn) && requestedInquirySn > 0
    ? requestedInquirySn
    : null;
  const typeNameByCode = Object.fromEntries(
    (inquiryTypesQuery.data ?? []).map((type) => [type.code, type.name]),
  );

  const listQuery = useQuery({
    queryKey: ['admin', 'customer-inquiries', 'list', appliedFilters, page],
    queryFn: () => getAdminCustomerInquiries({
      ...appliedFilters,
      page,
      size: PAGE_SIZE,
    }),
  });
  const lastAvailablePage = Math.max(1, listQuery.data?.totalPages ?? 0);

  useEffect(() => {
    if (listQuery.isFetching || page <= lastAvailablePage) return undefined;

    const animationFrameId = window.requestAnimationFrame(() => {
      setPage(lastAvailablePage);
    });
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [lastAvailablePage, listQuery.isFetching, page]);
  const detailQuery = useQuery({
    queryKey: ['admin', 'customer-inquiries', 'detail', selectedInquirySn],
    queryFn: () => getAdminCustomerInquiry(selectedInquirySn),
    enabled: selectedInquirySn != null,
  });

  const refreshInquiryQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'customer-inquiries'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }),
    ]);
  };

  const startMutation = useMutation({
    mutationFn: startAdminCustomerInquiry,
    onSuccess: (_, variables) => {
      startRequestIdRef.current = null;
      toast({ icon: 'success', title: `문의 #${variables.inquirySn} 처리를 시작했습니다.` });
    },
    onSettled: refreshInquiryQueries,
  });
  const answerMutation = useMutation({
    mutationFn: answerAdminCustomerInquiry,
    onSuccess: (_, variables) => {
      answerDetectionKeyRef.current = null;
      setAnswer('');
      toast({ icon: 'success', title: `문의 #${variables.inquirySn} 답변을 등록했습니다.` });
    },
    onSettled: refreshInquiryQueries,
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

  const openInquiry = (inquirySn) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('inquirySn', String(inquirySn));
      return next;
    });
    setAnswer('');
    startRequestIdRef.current = null;
    answerDetectionKeyRef.current = null;
    startMutation.reset();
    answerMutation.reset();
  };

  const closeInquiry = () => {
    if (startMutation.isPending || answerMutation.isPending) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('inquirySn');
      return next;
    });
    setAnswer('');
    startRequestIdRef.current = null;
    answerDetectionKeyRef.current = null;
  };

  const startProcessing = () => {
    if (!selectedInquirySn || startMutation.isPending) return;
    startRequestIdRef.current ??= crypto.randomUUID();
    startMutation.mutate({ inquirySn: selectedInquirySn, requestId: startRequestIdRef.current });
  };

  const submitAnswer = () => {
    const normalizedAnswer = answer.trim();
    if (!selectedInquirySn || !normalizedAnswer || answerMutation.isPending) return;
    answerDetectionKeyRef.current ??= crypto.randomUUID();
    answerMutation.mutate({
      inquirySn: selectedInquirySn,
      answer: normalizedAnswer,
      detectionKey: answerDetectionKeyRef.current,
    });
  };

  const columns = [
    { key: 'inquirySn', label: '문의 번호', render: (value) => `#${value}` },
    {
      key: 'inquiryTypeCode',
      label: '유형',
      render: (value, row) => row.inquiryTypeName || typeNameByCode[value] || value || '-',
    },
    {
      key: 'userSn',
      label: '작성자',
      className: 'admin-table__compact-text',
      render: (value, row) => formatAdminMemberIdentity(row.writerMember, value),
    },
    { key: 'title', label: '제목', className: 'admin-table__long-text' },
    { key: 'registeredAt', label: '접수일', render: formatDateTime },
    {
      key: 'answeredAt',
      label: '처리일',
      className: 'admin-table__processed-date',
      render: formatDateTime,
    },
    {
      key: 'statusCode',
      label: '상태',
      render: (value) => {
        const status = getStatus(value);
        return <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>;
      },
    },
    {
      key: 'manage',
      label: '관리',
      render: (_, row) => (
        <button
          className={`btn ${row.statusCode === 'INQC0009' ? 'btn-outline' : 'btn-primary'} admin-operation-table__action`}
          onClick={() => openInquiry(row.inquirySn)}
          type="button"
        >
          {row.statusCode === 'INQC0009' ? '내역' : '처리'}
        </button>
      ),
    },
  ];

  const detail = detailQuery.data;
  const detailStatus = getStatus(detail?.statusCode);
  const assignedToCurrentAdmin = normalizeId(detail?.processorUserSn) !== ''
    && normalizeId(detail?.processorUserSn) === normalizeId(currentAdminId);
  const canStart = detail?.statusCode === 'INQC0007';
  const canAnswer = detail?.statusCode === 'INQC0008' && assignedToCurrentAdmin;
  const transitionFailure = startMutation.error ?? answerMutation.error;
  const transitionError = transitionFailure
    ? transitionFailure.response?.data?.message
      ?? '문의 처리 상태를 확인하지 못했습니다. 새로 조회된 상태를 확인한 뒤 다시 시도해 주세요.'
    : null;

  return (
    <div className="admin-bjn-page admin-operation-page admin-customer-inquiry-page">
      <PageMeta title="문의 관리" />
      <AdminPageHeader title="문의 관리" />

      <form className="admin-bjn-filters admin-operation-search" onSubmit={submitSearch}>
        <label className="admin-operation-search__status">
          처리 상태
          <select onChange={(event) => setFilterForm({ ...filterForm, statusCode: event.target.value })} value={filterForm.statusCode}>
            <option value="">전체 상태</option>
            <option value="INQC0007">접수</option>
            <option value="INQC0008">처리중</option>
            <option value="INQC0009">답변완료</option>
          </select>
        </label>
        <label className="admin-customer-inquiry-search__type">
          문의 유형
          <select
            disabled={inquiryTypesQuery.isLoading || inquiryTypesQuery.isError}
            onChange={(event) => setFilterForm({ ...filterForm, inquiryTypeCode: event.target.value })}
            value={filterForm.inquiryTypeCode}
          >
            <option value="">전체 유형</option>
            {(inquiryTypesQuery.data ?? []).map((type) => (
              <option key={type.code} value={type.code}>{type.name}</option>
            ))}
          </select>
        </label>
        <label className="admin-operation-search__keyword">
          문의 검색
          <input
            maxLength={100}
            onChange={(event) => setFilterForm({ ...filterForm, keyword: event.target.value })}
            placeholder="문의 번호·제목"
            value={filterForm.keyword}
          />
        </label>
        <AdminFilterActions disabled={listQuery.isFetching} onReset={resetFilters} />
      </form>

      {listQuery.isError && (
        <div className="admin-bjn-state is-error">
          문의 목록을 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => listQuery.refetch()} type="button">다시 시도</button>
        </div>
      )}
      {!listQuery.isError && (
        <AdminSectionCard
          action={!listQuery.isLoading && <span>총 {listQuery.data?.totalItems ?? 0}건</span>}
          description="접수된 문의를 담당자가 직접 배정받은 뒤 답변합니다."
          title="1:1 문의 목록"
        >
          <div className="admin-bjn-table-scroll">
            <AdminTable
              columns={columns}
              data={listQuery.data?.items ?? []}
              emptyMessage="조건에 맞는 문의가 없습니다."
              loading={listQuery.isLoading}
              rowKey={(row) => row.inquirySn}
            />
          </div>
          <AdminPagination
            ariaLabel="관리자 문의 목록 페이지 이동"
            disabled={listQuery.isFetching}
            onPageChange={setPage}
            page={listQuery.data?.page ?? page}
            totalPages={listQuery.data?.totalPages ?? 0}
          />
        </AdminSectionCard>
      )}

      {selectedInquirySn && (
        <AdminDetailDrawer
          eyebrow="고객 문의"
          footer={(
            <button
              className="btn btn-outline"
              disabled={startMutation.isPending || answerMutation.isPending}
              onClick={closeInquiry}
              type="button"
            >
              닫기
            </button>
          )}
          onClose={closeInquiry}
          title="문의 상세"
        >
          <section className="admin-operation-detail">
            {detailQuery.isLoading && <div className="admin-bjn-state">문의 내용을 불러오는 중입니다.</div>}
            {detailQuery.isError && <div className="admin-bjn-state is-error">문의 상세를 불러오지 못했습니다.</div>}
            {detail && (
              <>
                <dl>
                  <dt>문의 번호</dt><dd>#{detail.inquirySn}</dd>
                  <dt>문의 유형</dt><dd>{detail.inquiryTypeName || typeNameByCode[detail.inquiryTypeCode] || detail.inquiryTypeCode}</dd>
                  <dt>작성자</dt><dd>{formatAdminMemberIdentity(detail.writerMember, detail.userSn)}</dd>
                  <dt>상태</dt><dd><AdminStatusBadge tone={detailStatus.tone}>{detailStatus.label}</AdminStatusBadge></dd>
                  <dt>접수일</dt><dd>{formatDateTime(detail.registeredAt)}</dd>
                  <dt>제목</dt><dd>{detail.title}</dd>
                  <dt>문의 내용</dt><dd className="admin-operation-detail__content">{detail.content}</dd>
                  {detail.processorUserSn != null && <><dt>처리 담당자</dt><dd>{formatAdminMemberIdentity(detail.processorMember, detail.processorUserSn)}</dd></>}
                  {detail.statusCode === 'INQC0009' && (
                    <>
                      <dt>답변일</dt><dd>{formatDateTime(detail.answeredAt)}</dd>
                      <dt>답변</dt><dd className="admin-operation-detail__content">{detail.answer}</dd>
                    </>
                  )}
                </dl>

                <AdminHistoryTimeline
                  referenceSn={detail.inquirySn}
                  referenceType="CUSTOMER_INQUIRY"
                />

                {canStart && (
                  <div className="admin-operation-decision">
                    <div className="admin-operation-decision__heading">
                      <strong>문의 처리 시작</strong>
                      <span>처리를 시작하면 현재 관리자에게 배정되며 다른 관리자는 답변할 수 없습니다.</span>
                    </div>
                    <div className="admin-operation-actions">
                      <button className="btn btn-primary" disabled={startMutation.isPending} onClick={startProcessing} type="button">
                        {startMutation.isPending ? '배정 중…' : '처리 시작'}
                      </button>
                    </div>
                  </div>
                )}

                {detail.statusCode === 'INQC0008' && !assignedToCurrentAdmin && (
                  <p className="admin-operation-detail__notice">
                    <strong>다른 관리자가 처리 중인 문의입니다.</strong>
                    배정된 관리자만 답변을 등록할 수 있습니다.
                  </p>
                )}

                {canAnswer && (
                  <>
                    <label className="admin-operation-detail__reason">
                      관리자 답변
                      <textarea
                        disabled={answerMutation.isPending}
                        maxLength={4000}
                        onChange={(event) => {
                          setAnswer(event.target.value);
                          answerDetectionKeyRef.current = null;
                          answerMutation.reset();
                        }}
                        placeholder="사용자에게 전달할 답변을 입력하세요."
                        value={answer}
                      />
                    </label>
                    {!answer.trim() && <p className="admin-operation-validation" role="alert">답변을 입력해야 완료할 수 있습니다.</p>}
                    <div className="admin-operation-actions">
                      <button className="btn btn-primary" disabled={!answer.trim() || answerMutation.isPending} onClick={submitAnswer} type="button">
                        {answerMutation.isPending ? '등록 중…' : '답변 등록'}
                      </button>
                    </div>
                  </>
                )}

                {transitionError && <p className="admin-operation-error" role="alert">{transitionError}</p>}
              </>
            )}
          </section>
        </AdminDetailDrawer>
      )}
    </div>
  );
};

export default AdminCustomerInquiryManagementPage;
