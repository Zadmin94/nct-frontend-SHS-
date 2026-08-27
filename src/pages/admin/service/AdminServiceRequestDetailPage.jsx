import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelAdminServiceRequest,
  changeAdminServiceRequestVisibility,
  fetchAdminServiceRequestDetail,
  invalidateAdminQuote,
} from '@api/adminServiceRequestApi';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminModal from '@components/admin/AdminModal';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminReferenceLink from '@components/admin/AdminReferenceLink';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_REPORTS_PATH, ADMIN_SERVICE_REQUESTS_PATH } from '@/routes/adminRoutes';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import { formatDateTime, toast } from '@utils/common';
import './adminServiceRequestPage.css';

const QUOTE_STATUS_META = {
  QUTC0001: { label: '제출', tone: 'info' },
  QUTC0002: { label: '수정', tone: 'info' },
  QUTC0003: { label: '만료', tone: 'neutral' },
  QUTC0004: { label: '선택', tone: 'success' },
  QUTC0005: { label: '철회', tone: 'danger' },
};

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

const quoteStatusMeta = (statusCode) => (
  QUOTE_STATUS_META[statusCode] ?? { label: statusCode ?? '-', tone: 'neutral' }
);

const formatAmount = (value) => (
  value == null ? '-' : `${Number(value).toLocaleString('ko-KR')}P`
);

const createRequestId = () => globalThis.crypto?.randomUUID?.()
  ?? `admin-service-operation-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** 담당자 7 · F-OPS-010/021: 견적 요청, 견적, 거래·정산 상태와 운영 명령을 한 화면에 제공합니다. */
const AdminServiceRequestDetailPage = () => {
  const { serviceRequestId: serviceRequestIdParam } = useParams();
  const serviceRequestId = Number(serviceRequestIdParam);
  const validServiceRequestId = Number.isInteger(serviceRequestId) && serviceRequestId > 0;
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requestedBackPath = location.state?.from;
  const backPath = typeof requestedBackPath === 'string'
    && (requestedBackPath.startsWith(ADMIN_SERVICE_REQUESTS_PATH)
      || requestedBackPath.startsWith(ADMIN_REPORTS_PATH))
    ? requestedBackPath
    : ADMIN_SERVICE_REQUESTS_PATH;
  const backLabel = backPath.startsWith(ADMIN_REPORTS_PATH) ? '신고 상세' : '견적 요청 관리';
  const [operation, setOperation] = useState(null);
  const [operationReason, setOperationReason] = useState('');
  const [operationFeedback, setOperationFeedback] = useState('');

  const detailQuery = useQuery({
    queryKey: ['admin-service-request-detail', serviceRequestId],
    queryFn: () => fetchAdminServiceRequestDetail(serviceRequestId),
    enabled: validServiceRequestId,
  });

  const refreshServiceRequest = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-service-requests'] }),
      queryClient.invalidateQueries({
        queryKey: ['admin-service-request-detail', serviceRequestId],
      }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }),
    ]);
  };

  const operationMutation = useMutation({
    mutationFn: (variables) => {
      if (variables.type === 'CANCEL_REQUEST') return cancelAdminServiceRequest(variables);
      if (variables.type === 'CHANGE_VISIBILITY') {
        return changeAdminServiceRequestVisibility(variables);
      }
      return invalidateAdminQuote(variables);
    },
    onSuccess: async (_, variables) => {
      await refreshServiceRequest();
      toast({ icon: 'success', title: variables.successMessage, timer: 1800 });
      setOperation(null);
      setOperationReason('');
      setOperationFeedback('');
    },
  });

  const detail = detailQuery.data;
  const quotes = detail?.quotes ?? [];
  const canOperateRequest = detail?.statusCode === 'SVCC0002' && detail?.tradeId == null;

  const openOperation = (nextOperation) => {
    setOperation(nextOperation);
    setOperationReason('');
    setOperationFeedback('');
  };

  const closeOperation = () => {
    if (operationMutation.isPending) return;
    setOperation(null);
    setOperationReason('');
    setOperationFeedback('');
  };

  const submitOperation = async () => {
    const reason = operationReason.trim();
    if (!operation || !reason || operationMutation.isPending) return;
    setOperationFeedback('');
    try {
      await operationMutation.mutateAsync({
        ...operation,
        serviceRequestId,
        reason,
        requestId: createRequestId(),
      });
    } catch (error) {
      setOperationFeedback(
        error?.response?.data?.message || '운영 처리를 완료하지 못했습니다.',
      );
    }
  };

  if (!validServiceRequestId) {
    return (
      <div className="admin-content-page admin-service-page admin-service-detail-page">
        <PageMeta title="견적 요청 상세" />
        <AdminPageHeader title="견적 요청 상세" />
        <div className="admin-service-page__state is-error">올바른 요청 번호가 아닙니다.</div>
      </div>
    );
  }

  return (
    <div className="admin-content-page admin-service-page admin-service-detail-page">
      <PageMeta title="견적 요청 상세" />
      <AdminPageHeader
        action={(
          <button
            className="btn btn-outline"
            onClick={() => navigate(backPath)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={17} /> {backLabel}
          </button>
        )}
        title="견적 요청 상세"
      />

      {detailQuery.isLoading && (
        <div className="admin-service-page__state" aria-live="polite">
          견적 요청 상세를 불러오는 중입니다.
        </div>
      )}
      {detailQuery.isError && (
        <div className="admin-service-page__state is-error" role="alert">
          견적 요청 상세를 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => detailQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      )}

      {!detailQuery.isLoading && !detailQuery.isError && detail && (
        <section className="admin-service-detail admin-service-detail-page__surface">
          <div className="admin-service-detail__summary">
            <div className="admin-service-detail__status-line">
              <span>요청 #{detail.serviceRequestId}</span>
              <div className="admin-service-detail__badges">
                {(detail.statusName || detail.statusCode) && (
                  <AdminStatusBadge tone={statusTone(detail.statusCode)}>
                    원본 · {detail.statusName ?? detail.statusCode}
                  </AdminStatusBadge>
                )}
                <AdminStatusBadge tone={detail.visible ? 'success' : 'danger'}>
                  {detail.visible ? '노출' : '숨김'}
                </AdminStatusBadge>
                {detail.integratedStatusName && (
                  <AdminStatusBadge tone={integratedStatusTone(detail.integratedStatusCode)}>
                    통합 · {detail.integratedStatusName}
                  </AdminStatusBadge>
                )}
              </div>
            </div>
            <h3>{detail.title}</h3>
          </div>

          <div className="admin-service-detail__facts">
            {detail.categoryName && (
              <div><span>카테고리</span><strong>{detail.categoryName}</strong></div>
            )}
            {detail.budgetAmount != null && (
              <div><span>예산</span><strong>{formatAmount(detail.budgetAmount)}</strong></div>
            )}
            {(detail.requesterName || detail.requesterUserId != null) && (
              <div>
                <span>요청자</span>
                <strong>{formatAdminMemberIdentity(
                  detail.requesterMember,
                  detail.requesterUserId,
                )}</strong>
              </div>
            )}
            <div>
              <span>제출 견적</span>
              <strong>{detail.totalQuoteCount ?? 0}건 · 활성 {detail.activeQuoteCount ?? 0}건</strong>
            </div>
          </div>

          <div className="admin-service-detail-page__columns">
            <main className="admin-service-detail-page__main">
              <section className="admin-service-detail__section is-quotes">
                <div className="admin-service-detail__section-heading">
                  <h4>제출 견적</h4>
                  <span>{quotes.length}건</span>
                </div>
                {quotes.length === 0 ? (
                  <p className="admin-service-detail__empty">제출된 견적이 없습니다.</p>
                ) : (
                  <div className="admin-service-detail__quote-list">
                    {quotes.map((quote) => {
                      const quoteStatus = quoteStatusMeta(quote.statusCode);
                      return (
                        <article
                          className={`admin-service-detail__quote-card${quote.selected ? ' is-selected' : ''}`}
                          key={quote.quoteId}
                        >
                          <div className="admin-service-detail__quote-header">
                            <AdminReferenceLink
                              meta={`견적 · #${quote.quoteId}`}
                              title={formatAdminMemberIdentity(
                                quote.providerMember,
                                quote.providerUserId,
                              )}
                            />
                            <AdminStatusBadge tone={quoteStatus.tone}>
                              {quoteStatus.label}
                            </AdminStatusBadge>
                          </div>
                          <dl>
                            <div className="admin-service-detail__quote-provider">
                              <dt>제공자</dt>
                              <dd>{formatAdminMemberIdentity(
                                quote.providerMember,
                                quote.providerUserId,
                              )}</dd>
                            </div>
                            <div><dt>금액</dt><dd>{formatAmount(quote.amount)}</dd></div>
                            <div><dt>최초 제출일</dt><dd>{formatDateTime(quote.submittedAt)}</dd></div>
                            <div><dt>수정일</dt><dd>{formatDateTime(quote.updatedAt)}</dd></div>
                            <div><dt>수정 횟수</dt><dd>{quote.reviseCount ?? 0}회</dd></div>
                          </dl>
                          {['QUTC0001', 'QUTC0002'].includes(quote.statusCode)
                            && (detail.tradeQuoteId == null
                              || Number(detail.tradeQuoteId) !== Number(quote.quoteId)) && (
                              <div className="admin-service-detail__quote-actions">
                                <button
                                  className="btn btn-outline"
                                  onClick={() => openOperation({
                                    type: 'INVALIDATE_QUOTE',
                                    quoteId: quote.quoteId,
                                    title: `견적 #${quote.quoteId} 취소`,
                                    description: '제출·수정 상태의 견적만 철회 상태로 전환합니다.',
                                    confirmLabel: '견적 취소',
                                    successMessage: `견적 #${quote.quoteId}를 취소했습니다.`,
                                  })}
                                  type="button"
                                >
                                  견적 취소
                                </button>
                              </div>
                            )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {detail.content?.trim() && (
                <section className="admin-service-detail__section">
                  <h4>요청 내용</h4>
                  <p>{detail.content}</p>
                </section>
              )}

              <AdminHistoryTimeline
                referenceSn={detail.serviceRequestId}
                referenceType="SERVICE_REQUEST"
                title="견적 요청 운영 이력"
              />
            </main>

            <aside className="admin-service-detail-page__aside">
              {detail.selectedQuoteId != null && (
                <section className="admin-service-detail__section is-selected-quote">
                  <h4>선택 견적</h4>
                  <dl>
                    <dt>견적</dt>
                    <dd>
                      <AdminReferenceLink
                        meta={`견적 · #${detail.selectedQuoteId}`}
                        title={formatAdminMemberIdentity(
                          detail.selectedProviderMember,
                          detail.selectedProviderUserId,
                        )}
                      />
                    </dd>
                    <dt>제공자</dt><dd>{formatAdminMemberIdentity(
                      detail.selectedProviderMember,
                      detail.selectedProviderUserId,
                    )}</dd>
                    <dt>금액</dt><dd>{formatAmount(detail.selectedAmount)}</dd>
                    <dt>원본 상태</dt><dd>{detail.selectedQuoteStatusCode}</dd>
                  </dl>
                </section>
              )}

              {detail.tradeId != null && (
                <section className="admin-service-detail__section is-trade-flow">
                  <h4>거래 · 정산 흐름</h4>
                  <dl>
                    <dt>거래</dt>
                    <dd>
                      <AdminReferenceLink
                        meta={`거래 · #${detail.tradeId}`}
                        title={`${detail.title} 서비스 거래`}
                      />
                    </dd>
                    <dt>연결 견적</dt>
                    <dd>
                      <AdminReferenceLink
                        meta={`견적 · #${detail.tradeQuoteId}`}
                        title={formatAdminMemberIdentity(
                          detail.selectedProviderMember,
                          detail.selectedProviderUserId,
                        )}
                      />
                    </dd>
                    <dt>거래 상태</dt><dd>{detail.tradeStatusName ?? detail.tradeStatusCode}</dd>
                    <dt>보관금</dt>
                    <dd>
                      {detail.activeEscrowAmount > 0
                        ? `보관 중 · ${formatAmount(detail.activeEscrowAmount)}`
                        : '활성 보관금 없음'}
                    </dd>
                    <dt>정산</dt>
                    <dd>
                      {detail.settlementId == null
                        ? '정산 건 없음'
                        : `${detail.title} 정산 · 정산 #${detail.settlementId} · ${detail.settlementStatusName ?? detail.settlementStatusCode}`}
                    </dd>
                    {detail.settledPointAmount > 0 && (
                      <><dt>지급 원장</dt><dd>{formatAmount(detail.settledPointAmount)}</dd></>
                    )}
                    {detail.refundedPointAmount > 0 && (
                      <><dt>환불 원장</dt><dd>{formatAmount(detail.refundedPointAmount)}</dd></>
                    )}
                    <dt>진행 분쟁</dt>
                    <dd>
                      {detail.activeDisputeId == null
                        ? '없음'
                        : `${detail.title} 신고 사건 · 신고 #${detail.activeDisputeId} · ${detail.activeDisputeStatusName ?? detail.activeDisputeStatusCode}`}
                    </dd>
                  </dl>
                </section>
              )}

              {(detail.registeredAt || detail.updatedAt) && (
                <section className="admin-service-detail__section is-record">
                  <h4>기록</h4>
                  <dl>
                    {detail.registeredAt && (
                      <><dt>등록</dt><dd>{formatDateTime(detail.registeredAt)}</dd></>
                    )}
                    {detail.updatedAt && (
                      <><dt>수정</dt><dd>{formatDateTime(detail.updatedAt)}</dd></>
                    )}
                  </dl>
                </section>
              )}

              {canOperateRequest && (
                <section className="admin-service-detail__section is-operations">
                  <h4>운영 처리</h4>
                  <p>거래 생성 전 공개 요청만 숨김·복구하거나 취소할 수 있습니다.</p>
                  <div className="admin-service-detail__operation-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => openOperation({
                        type: 'CHANGE_VISIBILITY',
                        visible: !detail.visible,
                        title: detail.visible ? '견적 요청 숨김' : '견적 요청 노출 복구',
                        description: detail.visible
                          ? '요청과 견적 이력은 유지하고 제공자 목록에서만 숨깁니다.'
                          : '제공자 견적 요청 목록에 다시 노출합니다.',
                        confirmLabel: detail.visible ? '숨김 처리' : '노출 복구',
                        successMessage: detail.visible
                          ? '견적 요청을 숨김 처리했습니다.'
                          : '견적 요청 노출을 복구했습니다.',
                      })}
                      type="button"
                    >
                      {detail.visible ? '요청 숨김' : '노출 복구'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => openOperation({
                        type: 'CANCEL_REQUEST',
                        title: '견적 요청 취소',
                        description: '요청을 취소하고 제출·수정 상태의 활성 견적을 함께 철회합니다.',
                        confirmLabel: '요청 취소',
                        successMessage: '견적 요청을 취소했습니다.',
                      })}
                      type="button"
                    >
                      요청 취소
                    </button>
                  </div>
                </section>
              )}
            </aside>
          </div>
        </section>
      )}

      {operation && (
        <AdminModal onClose={closeOperation} title={operation.title}>
          <section className="admin-service-operation-modal">
            <p>{operation.description}</p>
            <label>
              처리 사유
              <textarea
                className="admin-reason-textarea"
                disabled={operationMutation.isPending}
                maxLength="1000"
                onChange={(event) => setOperationReason(event.target.value)}
                placeholder="관리자 처리 사유를 입력하세요."
                value={operationReason}
              />
            </label>
            {!operationReason.trim() && (
              <p className="admin-service-operation-modal__validation" role="alert">
                처리 사유를 입력해야 실행할 수 있습니다.
              </p>
            )}
            {operationFeedback && (
              <p className="admin-service-operation-modal__feedback" role="alert">
                {operationFeedback}
              </p>
            )}
            <div className="admin-service-operation-modal__actions">
              <button
                className="btn btn-outline"
                disabled={operationMutation.isPending}
                onClick={closeOperation}
                type="button"
              >
                취소
              </button>
              <button
                className="btn btn-danger"
                disabled={!operationReason.trim() || operationMutation.isPending}
                onClick={submitOperation}
                type="button"
              >
                {operationMutation.isPending ? '처리 중…' : operation.confirmLabel}
              </button>
            </div>
          </section>
        </AdminModal>
      )}
    </div>
  );
};

export default AdminServiceRequestDetailPage;
