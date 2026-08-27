import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changeAdminAuctionProductVisibility,
  decideAdminAuctionCancellation,
  fetchAdminAuctionCancellationRequest,
  fetchAdminAuctionOverview,
  fetchAdminAuctionSummary,
  forceCancelAdminAuction,
  pauseAdminAuction,
  resumeAdminAuction,
} from '@api/adminAuctionApi';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AuctionOriginalModal from '@components/trade/AuctionOriginalModal';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_AUCTIONS_PATH, ADMIN_REPORTS_PATH } from '@/routes/adminRoutes';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import { formatDateTime, toast } from '@utils/common';
import '../audit/adminAuditPage.css';
import './adminAuctionManagementPage.css';

const TRADE_STATUS_LABELS = {
  TRDC0003: '진행중',
  TRDC0004: '배송/직거래중',
  TRDC0005: '상대확인대기',
  TRDC0006: '완료',
  TRDC0007: '보류',
  TRDC0008: '취소',
};

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

const formatAmount = (value) => (
  value == null ? '-' : `${Number(value).toLocaleString('ko-KR')}P`
);

const createRequestId = () => globalThis.crypto?.randomUUID?.()
  ?? `admin-auction-operation-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** 담당자 7 · F-OPS-003/004: 경매 운영 정보와 모든 관리자 명령을 한 상세 페이지에서 제공합니다. */
const AdminAuctionDetailPage = () => {
  const { auctionId: auctionIdParam } = useParams();
  const auctionId = Number(auctionIdParam);
  const validAuctionId = Number.isInteger(auctionId) && auctionId > 0;
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialSummary = location.state?.auctionSummary;
  const requestedBackPath = location.state?.from;
  const backPath = typeof requestedBackPath === 'string'
    && (requestedBackPath.startsWith(ADMIN_AUCTIONS_PATH)
      || requestedBackPath.startsWith(ADMIN_REPORTS_PATH))
    ? requestedBackPath
    : ADMIN_AUCTIONS_PATH;
  const backLabel = backPath.startsWith(ADMIN_REPORTS_PATH) ? '신고 상세' : '경매 관리';

  const [reviewReason, setReviewReason] = useState('');
  const [forceCancelReason, setForceCancelReason] = useState('');
  const [visibilityReason, setVisibilityReason] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [isOriginalAuctionOpen, setIsOriginalAuctionOpen] = useState(false);

  const overviewQuery = useQuery({
    queryKey: ['admin-auction-overview', auctionId],
    queryFn: () => fetchAdminAuctionOverview(auctionId),
    enabled: validAuctionId,
  });
  const summaryQuery = useQuery({
    queryKey: ['admin-auction-summary', auctionId],
    queryFn: () => fetchAdminAuctionSummary(auctionId),
    enabled: validAuctionId,
    initialData: Number(initialSummary?.auctionId) === auctionId ? initialSummary : undefined,
  });
  const cancellationSummary = summaryQuery.data ?? initialSummary;
  const hasPendingCancellation = cancellationSummary?.cancelRequestId != null
    && cancellationSummary?.cancelApprovedYn == null;
  const cancellationQuery = useQuery({
    queryKey: ['admin-auction-cancellation-request', auctionId],
    queryFn: () => fetchAdminAuctionCancellationRequest(auctionId),
    enabled: validAuctionId && hasPendingCancellation,
    retry: false,
  });

  const refreshAuction = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-auction-overview', auctionId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-auction-summary', auctionId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-auction-cancellation-request', auctionId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }),
    ]);
  };

  const decisionMutation = useMutation({
    mutationFn: decideAdminAuctionCancellation,
    onSuccess: async (_, variables) => {
      await refreshAuction();
      toast({
        icon: 'success',
        title: `취소 요청을 ${variables.decision === 'APPROVED' ? '승인' : '반려'}했습니다.`,
        timer: 2000,
      });
      setReviewReason('');
    },
  });
  const forceCancelMutation = useMutation({
    mutationFn: forceCancelAdminAuction,
    onSuccess: async () => {
      await refreshAuction();
      toast({ icon: 'success', title: `경매 #${auctionId}를 취소했습니다.`, timer: 2000 });
      setForceCancelReason('');
    },
  });
  const visibilityMutation = useMutation({
    mutationFn: changeAdminAuctionProductVisibility,
    onSuccess: async (_, variables) => {
      await refreshAuction();
      toast({
        icon: 'success',
        title: `상품을 ${variables.visible ? '노출' : '숨김'} 처리했습니다.`,
        timer: 2000,
      });
      setVisibilityReason('');
    },
  });
  const pauseMutation = useMutation({
    mutationFn: ({ action, ...variables }) => (
      action === 'pause' ? pauseAdminAuction(variables) : resumeAdminAuction(variables)
    ),
    onSuccess: async (_, variables) => {
      await refreshAuction();
      toast({
        icon: 'success',
        title: `경매를 ${variables.action === 'pause' ? '일시중지' : '재개'}했습니다.`,
        timer: 2000,
      });
      setPauseReason('');
    },
  });

  const overview = overviewQuery.data;
  const summary = summaryQuery.data ?? initialSummary;
  const auction = overview?.auction;
  const product = overview?.product;
  const cancellation = cancellationQuery.data;
  const cancellationPending = hasPendingCancellation || cancellation?.cancelRequestSn != null;
  const productId = product?.prdSn ?? summary?.productId;
  const productName = product?.prdNm ?? auction?.title ?? summary?.productName ?? '상품 정보 없음';
  const productVisible = (product?.prdUseYn ?? summary?.productUseYn) !== 'N';
  const auctionStatusCode = auction?.auctionStatusCode ?? summary?.auctionStatusCode;
  const auctionStatusLabel = auction?.auctionStatusName
    ?? summary?.auctionStatusName
    ?? auctionStatusCode;
  const tradeId = overview?.tradeSn ?? summary?.tradeId;
  const tradeStatusCode = overview?.tradeStatusCode ?? summary?.tradeStatusCode;
  const tradeStatusLabel = TRADE_STATUS_LABELS[tradeStatusCode]
    ?? summary?.tradeStatusName
    ?? tradeStatusCode;
  const seller = summary?.sellerUserSn != null
    ? formatAdminMemberIdentity(summary.sellerMember, summary.sellerUserSn)
    : auction?.sellerName?.trim()
      || formatAdminMemberIdentity(null, auction?.sellerId ?? product?.usrSn);
  const canPause = auctionStatusCode === 'AUCC0002' && !cancellationPending;
  const canResume = auctionStatusCode === 'AUCC9001' && !cancellationPending;
  const canForceCancel = ['AUCC0001', 'AUCC0002', 'AUCC0003', 'AUCC9001'].includes(
    auctionStatusCode,
  ) && !cancellationPending;
  const isBusy = decisionMutation.isPending || forceCancelMutation.isPending
    || visibilityMutation.isPending || pauseMutation.isPending;

  const decide = (decision) => {
    const reason = reviewReason.trim();
    if (!cancellationPending || !reason || decisionMutation.isPending
      || cancellationQuery.isLoading || cancellationQuery.isError) return;
    decisionMutation.mutate({ auctionId, decision, reason });
  };

  const changeProductVisibility = () => {
    const reason = visibilityReason.trim();
    if (productId == null || !reason || visibilityMutation.isPending) return;
    visibilityMutation.mutate({
      auctionId,
      visible: !productVisible,
      reason,
      requestId: createRequestId(),
    });
  };

  const changePauseState = () => {
    const reason = pauseReason.trim();
    const action = canPause ? 'pause' : canResume ? 'resume' : null;
    if (!action || !reason || pauseMutation.isPending) return;
    pauseMutation.mutate({ action, auctionId, reason, requestId: createRequestId() });
  };

  const forceCancel = () => {
    const reason = forceCancelReason.trim();
    if (!canForceCancel || !reason || forceCancelMutation.isPending) return;
    forceCancelMutation.mutate({ auctionId, reason, requestId: createRequestId() });
  };

  if (!validAuctionId) {
    return (
      <div className="admin-bjn-page admin-auction-detail-page">
        <PageMeta title="경매 상세" />
        <AdminPageHeader title="경매 상세" />
        <div className="admin-bjn-state is-error">올바른 경매 번호가 아닙니다.</div>
      </div>
    );
  }

  return (
    <div className="admin-bjn-page admin-auction-detail-page">
      <PageMeta title="경매 상세" />
      <AdminPageHeader
        action={(
          <button className="btn btn-outline" onClick={() => navigate(backPath)} type="button">
            <ArrowLeft aria-hidden="true" size={17} /> {backLabel}
          </button>
        )}
        title="경매 상세"
      />

      {overviewQuery.isLoading && (
        <div className="admin-bjn-state" aria-live="polite">경매 상세를 불러오는 중입니다.</div>
      )}
      {overviewQuery.isError && (
        <div className="admin-bjn-state is-error" role="alert">
          경매 상세를 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => overviewQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      )}

      {!overviewQuery.isLoading && !overviewQuery.isError && overview && (
        <div className="admin-auction-detail-page__layout">
          <main className="admin-auction-detail-page__main">
            <AdminSectionCard
              action={auctionStatusLabel && (
                <AdminStatusBadge tone={auctionStatusTone(auctionStatusCode)}>
                  {auctionStatusLabel}
                </AdminStatusBadge>
              )}
              title={(
                <button
                  aria-label={`${productName} 원본 경매 상세 보기`}
                  className="admin-auction-detail-page__reference-button"
                  onClick={() => setIsOriginalAuctionOpen(true)}
                  title="원본 경매 상세 보기"
                  type="button"
                >
                  {productName}
                </button>
              )}
            >
              <section className="admin-auction-cancellation admin-auction-detail-page__facts">
                <dl>
                  <dt>경매 번호</dt><dd>#{auctionId}</dd>
                  {productId != null && (
                    <>
                      <dt>상품 번호</dt><dd>#{productId}</dd>
                    </>
                  )}
                  <dt>상품 노출</dt>
                  <dd>
                    <AdminStatusBadge tone={productVisible ? 'success' : 'warning'}>
                      {productVisible ? '노출' : '숨김'}
                    </AdminStatusBadge>
                  </dd>
                  <dt>판매자</dt><dd>{seller}</dd>
                  <dt>입찰 수</dt><dd>{auction?.bidCount ?? summary?.bidCount ?? 0}건</dd>
                  <dt>현재가</dt><dd>{formatAmount(auction?.currentPrice)}</dd>
                  <dt>시작가</dt><dd>{formatAmount(auction?.startPrice ?? product?.prdStartAmt)}</dd>
                  <dt>경매 시작</dt><dd>{formatDateTime(auction?.startDateTime)}</dd>
                  <dt>경매 종료</dt><dd>{formatDateTime(auction?.endDateTime)}</dd>
                  <dt>거래</dt>
                  <dd>{tradeId == null ? '-' : `${productName} 거래 · 거래 #${tradeId}`}</dd>
                  <dt>거래 상태</dt>
                  <dd>
                    {tradeStatusLabel
                      ? <AdminStatusBadge tone={tradeStatusTone(tradeStatusCode)}>{tradeStatusLabel}</AdminStatusBadge>
                      : '-'}
                  </dd>
                  <dt>등록일</dt><dd>{formatDateTime(product?.prdRegDt ?? summary?.registeredAt)}</dd>
                </dl>
                {summaryQuery.isError && (
                  <p className="admin-auction-cancellation__sync-status is-error" role="alert">
                    취소 처리 요약은 불러오지 못했지만 경매 상세와 운영 이력은 확인할 수 있습니다.
                  </p>
                )}
              </section>
            </AdminSectionCard>

            <AdminHistoryTimeline
              referenceSn={auctionId}
              referenceType="AUCTION"
              title="경매 운영 이력"
            />
          </main>

          <aside className="admin-auction-detail-page__operations" aria-label="경매 운영 처리">
            {(cancellationPending || summary?.cancelRequestId != null) && (
              <section className="admin-auction-operation-card is-cancellation">
                <h4>판매자 취소 요청</h4>
                <dl className="admin-auction-detail-page__operation-facts">
                  <dt>요청 일시</dt>
                  <dd>{formatDateTime(cancellation?.requestedAt ?? summary?.cancelRequestedAt)}</dd>
                  <dt>판매자 사유</dt>
                  <dd>{cancellation?.reason ?? summary?.cancelReason ?? '-'}</dd>
                  {summary?.cancelApprovedYn != null && (
                    <>
                      <dt>처리 결과</dt>
                      <dd>{summary.cancelApprovedYn === 'Y' ? '승인' : '반려'}</dd>
                      <dt>처리자</dt>
                      <dd>{formatAdminMemberIdentity(
                        summary.cancelProcessorMember,
                        summary.cancelProcessorUserSn,
                      )}</dd>
                      <dt>처리 일시</dt><dd>{formatDateTime(summary.cancelProcessedAt)}</dd>
                      <dt>처리 사유</dt><dd>{summary.cancelProcessReason ?? '-'}</dd>
                    </>
                  )}
                </dl>
                {cancellationPending && (
                  <>
                    <label>
                      관리자 처리 사유
                      <textarea
                        className="admin-reason-textarea"
                        disabled={decisionMutation.isPending}
                        maxLength="1000"
                        onChange={(event) => setReviewReason(event.target.value)}
                        placeholder="승인 또는 반려 사유를 입력하세요."
                        value={reviewReason}
                      />
                    </label>
                    {!reviewReason.trim() && (
                      <p className="admin-auction-cancellation__validation" role="alert">
                        처리 사유를 입력해야 승인 또는 반려할 수 있습니다.
                      </p>
                    )}
                    {decisionMutation.isError && (
                      <p className="admin-bjn-state is-error" role="alert">
                        취소 요청을 처리하지 못했습니다. 최신 상태를 다시 확인해 주세요.
                      </p>
                    )}
                    <div className="admin-auction-cancellation__actions">
                      <button
                        className="btn btn-outline"
                        disabled={!reviewReason.trim() || decisionMutation.isPending
                          || cancellationQuery.isLoading || cancellationQuery.isError}
                        onClick={() => decide('REJECTED')}
                        type="button"
                      >
                        반려
                      </button>
                      <button
                        className="btn btn-primary"
                        disabled={!reviewReason.trim() || decisionMutation.isPending
                          || cancellationQuery.isLoading || cancellationQuery.isError}
                        onClick={() => decide('APPROVED')}
                        type="button"
                      >
                        {decisionMutation.isPending ? '처리 중…' : '취소 승인'}
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {hasPendingCancellation && cancellationQuery.isError && (
              <p className="admin-auction-cancellation__sync-status is-error" role="alert">
                판매자 취소 요청 상태를 확인하지 못했습니다.
              </p>
            )}

            {productId != null && (
              <section className="admin-auction-operation-card">
                <h4>상품 공개 설정</h4>
                <p>상품과 이력은 유지하고 공개 목록과 상세 노출만 제어합니다.</p>
                <label>
                  처리 사유
                  <textarea
                    className="admin-reason-textarea"
                    disabled={visibilityMutation.isPending}
                    maxLength="1000"
                    onChange={(event) => setVisibilityReason(event.target.value)}
                    placeholder={`${productVisible ? '숨김' : '노출 복구'} 사유를 입력하세요.`}
                    value={visibilityReason}
                  />
                </label>
                {visibilityMutation.isError && (
                  <p className="admin-bjn-state is-error" role="alert">
                    상품 공개 상태를 변경하지 못했습니다.
                  </p>
                )}
                <div className="admin-auction-cancellation__actions">
                  <button
                    className={productVisible ? 'btn btn-danger' : 'btn btn-primary'}
                    disabled={!visibilityReason.trim() || visibilityMutation.isPending}
                    onClick={changeProductVisibility}
                    type="button"
                  >
                    {visibilityMutation.isPending
                      ? '처리 중…'
                      : productVisible ? '상품 숨김' : '노출 복구'}
                  </button>
                </div>
              </section>
            )}

            {(canPause || canResume) && (
              <section className="admin-auction-operation-card">
                <h4>경매 진행 제어</h4>
                <p>
                  {canPause
                    ? '신규 입찰과 자동 종료를 멈춥니다.'
                    : '멈춰 있던 시간만큼 종료 시각을 연장해 경매를 재개합니다.'}
                </p>
                <label>
                  처리 사유
                  <textarea
                    className="admin-reason-textarea"
                    disabled={pauseMutation.isPending}
                    maxLength="1000"
                    onChange={(event) => setPauseReason(event.target.value)}
                    placeholder={`${canPause ? '일시중지' : '재개'} 사유를 입력하세요.`}
                    value={pauseReason}
                  />
                </label>
                {pauseMutation.isError && (
                  <p className="admin-bjn-state is-error" role="alert">
                    경매 상태를 변경하지 못했습니다.
                  </p>
                )}
                <div className="admin-auction-cancellation__actions">
                  <button
                    className={canPause ? 'btn btn-outline' : 'btn btn-primary'}
                    disabled={!pauseReason.trim() || pauseMutation.isPending}
                    onClick={changePauseState}
                    type="button"
                  >
                    {pauseMutation.isPending
                      ? '처리 중…'
                      : canPause ? '경매 일시중지' : '경매 재개'}
                  </button>
                </div>
              </section>
            )}

            {canForceCancel && (
              <section className="admin-auction-force-cancel">
                <h4>관리자 강제 취소</h4>
                <p>입찰·보관금·거래가 있으면 경매 취소 전용 서비스에서 함께 정리합니다.</p>
                <label>
                  취소 사유
                  <textarea
                    className="admin-reason-textarea"
                    disabled={forceCancelMutation.isPending}
                    maxLength="1000"
                    onChange={(event) => setForceCancelReason(event.target.value)}
                    placeholder="강제 취소 사유를 입력하세요."
                    value={forceCancelReason}
                  />
                </label>
                {!forceCancelReason.trim() && (
                  <p className="admin-auction-cancellation__validation" role="alert">
                    취소 사유를 입력해야 강제 취소할 수 있습니다.
                  </p>
                )}
                {forceCancelMutation.isError && (
                  <p className="admin-bjn-state is-error" role="alert">
                    경매를 취소하지 못했습니다. 현재 경매·거래 상태를 확인해 주세요.
                  </p>
                )}
                <div className="admin-auction-cancellation__actions">
                  <button
                    className="btn btn-danger"
                    disabled={!forceCancelReason.trim() || forceCancelMutation.isPending}
                    onClick={forceCancel}
                    type="button"
                  >
                    {forceCancelMutation.isPending ? '취소 처리 중…' : '경매 강제 취소'}
                  </button>
                </div>
              </section>
            )}

            {isBusy && <p className="admin-auction-detail-page__busy">운영 처리를 반영하고 있습니다.</p>}
          </aside>
        </div>
      )}

      <AuctionOriginalModal
        auctionId={auctionId}
        onClose={() => setIsOriginalAuctionOpen(false)}
        open={isOriginalAuctionOpen}
        readOnly
      />
    </div>
  );
};

export default AdminAuctionDetailPage;
