import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { toImageUrl } from '@api/fileApi';
import {
  confirmServiceCompletion,
  requestServiceCompletion,
} from '@api/serviceTradeApi';
import {
  getServiceTradeStatus,
  SERVICE_TRADE_STEPS,
} from './serviceTradeStatus';
import TradeProgressSteps from '@components/trade/TradeProgressSteps';
import TradeReviewSection from '@components/trade/TradeReviewSection';
import TradeTrustSummary from '@components/trade/TradeTrustSummary';
import ServiceTradeOriginalModal from '@components/trade/ServiceTradeOriginalModal';
import DateRangePicker from '@components/product/DateRangePicker';
import TimeSelect from '@components/common/TimeSelect';
import { ActionButton, DomainStatus } from '@components/common/ui';
import {
  getNextTenMinuteTime,
  isTenMinuteTime,
} from '@components/common/timeSelectUtils';
import ReportModal from '@components/common/ReportModal';
import { getServiceTradeChatPath } from '@/routes/myPageRoutes';
import { formatMembershipDuration } from '@utils/common';
import '@assets/css/trade-detail.css';
import '@assets/css/service-trade-detail.css';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatPointAmount = (amount) => {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount) ? `${numericAmount.toLocaleString('ko-KR')}P` : '-';
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const SERVICE_TRADE_HISTORY_LABELS = {
  CHANGE: '일정 변경 요청',
  CANCEL_REQUEST: '일정 취소 요청',
  CANCEL_APPROVED: '일정 취소 동의',
  CANCEL_REJECTED: '일정 취소 거절',
  DISPUTE_REPORTED: '거래 문제 접수',
  ESCROW_HELD: '보관금 예치 완료',
  COMPLETION_REQUESTED: '서비스 완료 요청',
  SETTLEMENT_COMPLETED: '정산 완료',
  ESCROW_REFUNDED: '보관금 환불 완료',
  DISPUTE_HOLD: '관리자 정산 보류',
  DISPUTE_COMPLETE: '관리자 처리 완료',
  ADMIN_REFUND: '관리자 전액 환불',
  DISPUTE_REJECTED: '관리자 반려',
};

const SERVICE_TRADE_HISTORY_PAGE_SIZE = 4;

const SERVICE_TRADE_STATUS_TONES = {
  progress: 'success',
  pending: 'warning',
  complete: 'info',
  problem: 'danger',
  canceled: 'neutral',
};

// 실조회 컨테이너와 개발용 입력 양쪽에서 재사용하는 서비스 거래 표현 컴포넌트다.
export default function ServiceTradeDetailPage({
  trade = null,
  onRequestCompletion = requestServiceCompletion,
  onConfirmCompletion = confirmServiceCompletion,
  scheduleHistory = null,
  onRequestScheduleChange = null,
  onRequestScheduleCancellation = null,
  onDecideScheduleCancellation = null,
  chatPath = null,
  onActionCompleted = null,
  backPath = null,
  backLabel = '목록으로',
}) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isOriginalDocumentOpen, setIsOriginalDocumentOpen] = useState(false);
  const [completionDialogType, setCompletionDialogType] = useState(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [completionMemo, setCompletionMemo] = useState('');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [completionSubmitted, setCompletionSubmitted] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [scheduleDialogType, setScheduleDialogType] = useState(null);
  const [requestedScheduleDate, setRequestedScheduleDate] = useState('');
  const [requestedScheduleTime, setRequestedScheduleTime] = useState('');
  const [isScheduleDatePickerOpen, setIsScheduleDatePickerOpen] = useState(false);
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [scheduleSubmitted, setScheduleSubmitted] = useState(false);
  const [isDecidingScheduleCancellation, setIsDecidingScheduleCancellation] = useState(false);
  const [scheduleCancellationDecisionError, setScheduleCancellationDecisionError] = useState('');
  const todayDate = getTodayDate();
  const minimumScheduleTime = requestedScheduleDate === todayDate
    ? getNextTenMinuteTime()
    : '00:00';
  const isScheduleTimeUnavailable = requestedScheduleDate === todayDate
    && !minimumScheduleTime;

  if (!trade) {
    return (
      <main className="service-trade-detail-page">
        <section className="container service-trade-detail-page__empty">
          <h1>서비스 거래 상세</h1>
          <p>거래 정보를 표시할 수 없습니다.</p>
        </section>
      </main>
    );
  }

  const status = getServiceTradeStatus(trade.tradeStatusCode);
  const isRequester = trade.viewerRole === 'REQUESTER';
  const isProvider = trade.viewerRole === 'PROVIDER';
  const canShowTradeReview = isRequester || isProvider;
  const isTradeCompleted = trade.tradeStatusCode === 'TRDC0006';
  const canRequestCompletion = isProvider && trade.availableActions?.includes('REQUEST_COMPLETION');
  const canConfirmCompletion = isRequester && trade.availableActions?.includes('CONFIRM_COMPLETION');
  const canOpenChat = trade.chatAvailable === true;
  const canViewChatHistory = trade.chatRoomStatus === 'CLOSED';
  const canAccessChat = canOpenChat || canViewChatHistory;
  const canRequestScheduleChange = typeof onRequestScheduleChange === 'function'
    && trade.availableActions?.includes('REQUEST_SCHEDULE_CHANGE');
  const canRequestScheduleCancellation = typeof onRequestScheduleCancellation === 'function'
    && trade.availableActions?.includes('REQUEST_SCHEDULE_CANCELLATION');
  const canDecideScheduleCancellation = typeof onDecideScheduleCancellation === 'function'
    && trade.availableActions?.includes('DECIDE_SCHEDULE_CANCELLATION');
  const isCompletionRequest = completionDialogType === 'REQUEST';
  const completionHandler = isCompletionRequest ? onRequestCompletion : onConfirmCompletion;
  const canSubmitCompletion = typeof completionHandler === 'function';
  const isScheduleChange = scheduleDialogType === 'CHANGE';
  const scheduleHandler = isScheduleChange ? onRequestScheduleChange : onRequestScheduleCancellation;
  const canSubmitSchedule = typeof scheduleHandler === 'function';
  const tradeAmountLabel = trade.tradeAmountLabel ?? formatPointAmount(trade.tradeAmount);
  const autoCompleteAtLabel = formatDateTime(trade.autoCompleteAt);
  const counterpartTitle = isRequester ? '제공자 정보' : isProvider ? '의뢰자 정보' : '거래 상대방 정보';
  const counterpartName = trade.counterpartNickname ?? '거래 상대방';
  const counterpartJoinedLabel = formatMembershipDuration(trade.counterpartJoinedAt);
  const nextStepLabel = SERVICE_TRADE_STEPS[status.step + 1] ?? '거래 완료';
  const resolvedScheduleHistory = scheduleHistory ?? trade.scheduleHistory;
  const historyCount = Array.isArray(resolvedScheduleHistory) ? resolvedScheduleHistory.length : 0;
  const historyPageCount = Math.ceil(historyCount / SERVICE_TRADE_HISTORY_PAGE_SIZE);
  const currentHistoryPage = Math.min(historyPage, Math.max(historyPageCount - 1, 0));
  const visibleHistory = Array.isArray(resolvedScheduleHistory)
    ? resolvedScheduleHistory.slice(
      currentHistoryPage * SERVICE_TRADE_HISTORY_PAGE_SIZE,
      (currentHistoryPage + 1) * SERVICE_TRADE_HISTORY_PAGE_SIZE,
    )
    : [];

  const openCompletionDialog = (type) => {
    setCompletionDialogType(type);
    setCompletionMemo('');
    setCompletionError('');
    setCompletionSubmitted(false);
  };

  const closeCompletionDialog = () => {
    if (isSubmittingCompletion) return;
    setCompletionDialogType(null);
  };

  const handleCompletionSubmit = async (event) => {
    event.preventDefault();
    const memo = completionMemo.trim();

    if (isCompletionRequest && !memo) {
      setCompletionError('완료 요청 메모를 입력해 주세요.');
      return;
    }
    if (!canSubmitCompletion) {
      setCompletionError('현재 완료 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsSubmittingCompletion(true);
    setCompletionError('');
    try {
      await completionHandler(trade.tradeId, isCompletionRequest ? { completionMemo: memo } : undefined);
      await onActionCompleted?.();
      setCompletionSubmitted(true);
    } catch (error) {
      setCompletionError(error.response?.data?.message ?? '완료 처리를 요청하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const openScheduleDialog = (type) => {
    setScheduleDialogType(type);
    setRequestedScheduleDate('');
    setRequestedScheduleTime('');
    setIsScheduleDatePickerOpen(false);
    setScheduleReason('');
    setScheduleError('');
    setScheduleSubmitted(false);
  };

  const closeScheduleDialog = () => {
    if (isSubmittingSchedule) return;
    setScheduleDialogType(null);
  };

  const handleScheduleSubmit = async (event) => {
    event.preventDefault();
    const reason = scheduleReason.trim();
    if (isScheduleChange && (!requestedScheduleDate || !requestedScheduleTime)) {
      setScheduleError('변경할 서비스 날짜와 시간을 선택해 주세요.');
      return;
    }
    if (isScheduleChange) {
      const requestedDateTime = new Date(`${requestedScheduleDate}T${requestedScheduleTime}:00`);
      if (
        !isTenMinuteTime(requestedScheduleTime)
        || Number.isNaN(requestedDateTime.getTime())
        || requestedDateTime.getTime() <= Date.now()
      ) {
        setScheduleError('변경 시간은 현재 이후의 10분 단위로 선택해 주세요.');
        return;
      }
    }
    if (!reason) {
      setScheduleError('요청 사유를 입력해 주세요.');
      return;
    }
    if (!canSubmitSchedule) {
      setScheduleError('현재 일정 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsSubmittingSchedule(true);
    setScheduleError('');
    try {
      await scheduleHandler(trade.tradeId, isScheduleChange
        ? { requestedScheduleAt: `${requestedScheduleDate}T${requestedScheduleTime}`, reason }
        : { reason });
      await onActionCompleted?.();
      setScheduleSubmitted(true);
    } catch (error) {
      setScheduleError(error.response?.data?.message ?? '일정 요청을 처리하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleScheduleCancellationDecision = async (approved) => {
    setIsDecidingScheduleCancellation(true);
    setScheduleCancellationDecisionError('');
    try {
      await onDecideScheduleCancellation(trade.tradeId, approved);
      await onActionCompleted?.();
    } catch (error) {
      setScheduleCancellationDecisionError(
        error.response?.data?.message ?? '일정 취소 요청을 처리하지 못했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setIsDecidingScheduleCancellation(false);
    }
  };

  return (
    <main className="service-trade-detail-page">
      <div className="container">
        <header className="trade-detail-page__header service-trade-detail-page__header">
          <div><h1>거래 상세</h1></div>
          {backPath && (
            <ActionButton
              className="service-trade-detail-page__list-link"
              to={backPath}
              tone="neutral"
            >
              ← {backLabel}
            </ActionButton>
          )}
        </header>

        <TradeProgressSteps
          steps={SERVICE_TRADE_STEPS}
          activeIndex={Math.max(status.step, 0)}
          ariaLabel="서비스 거래 진행 상태"
        />

        <div className="trade-detail-grid service-trade-detail-grid">
          <section className="trade-detail-card" aria-labelledby="service-trade-guide-title">
            <div className="trade-detail-card__block">
              <div className="service-trade-card__title-row">
                <h3 id="service-trade-guide-title">거래 진행 안내</h3>
                <DomainStatus tone={SERVICE_TRADE_STATUS_TONES[status.tone] ?? 'neutral'}>
                  {status.label}
                </DomainStatus>
              </div>
              <p>{status.description}</p>
            </div>
            <div className="trade-detail-card__block">
              <div className="service-trade-info__heading">
                <h3>서비스 정보</h3>
                <ActionButton
                  onClick={() => setIsOriginalDocumentOpen(true)}
                  size="sm"
                  tone="primary"
                >
                  {isProvider ? '내 견적 보기' : '내 요청 보기'}
                </ActionButton>
              </div>
              <dl className="service-trade-detail-list service-trade-detail-list--service-info">
                {isRequester ? (
                  <div><dt>선택 견적</dt><dd>{trade.quoteSummary}</dd></div>
                ) : (
                  <>
                    <div><dt>의뢰 요청</dt><dd>{trade.serviceRequestTitle || '등록된 서비스 요청'}</dd></div>
                    <div className="service-trade-detail-list__request-content">
                      <dt>요청 내용</dt>
                      <dd>{trade.serviceRequestContent || '등록된 상세 요청 내용이 없습니다.'}</dd>
                    </div>
                  </>
                )}
                {trade.serviceAddressLabel && <div><dt>서비스 주소</dt><dd>{trade.serviceAddressLabel}</dd></div>}
                <div><dt>서비스 일정</dt><dd>{trade.scheduleLabel || '등록된 일정 정보 없음'}</dd></div>
                {autoCompleteAtLabel && <div><dt>완료 확인 기한</dt><dd>{autoCompleteAtLabel}</dd></div>}
                <div><dt>거래 금액</dt><dd className="service-trade-detail-list__amount">{tradeAmountLabel}</dd></div>
              </dl>
            </div>
            <div className="trade-detail-card__block">
              <div className="trade-counterpart__heading">
                <h3>{counterpartTitle}</h3>
                {trade.counterpartUserId && (
                  <ActionButton
                    onClick={() => setIsReportOpen(true)}
                    size="sm"
                    tone="danger-outline"
                  >
                    신고하기
                  </ActionButton>
                )}
              </div>
                <div className="trade-counterpart service-trade-counterpart">
                <div className="trade-counterpart__profile">
                  <div className="trade-counterpart__avatar">
                    {trade.counterpartProfileImageUrl
                      ? <img src={toImageUrl(trade.counterpartProfileImageUrl)} alt={counterpartName} />
                      : counterpartName.slice(0, 1)}
                  </div>
                  <div>
                    {trade.counterpartUserId ? (
                      <Link className="service-trade-counterpart__name" to={`/users/${trade.counterpartUserId}`}>
                        {counterpartName}
                      </Link>
                    ) : <strong className="service-trade-counterpart__name">{counterpartName}</strong>}
                    {counterpartJoinedLabel !== '-' && <p className="trade-detail-card__muted">{counterpartJoinedLabel}</p>}
                    <p className="trade-detail-card__muted">완료한 거래 {trade.counterpartCompletedTradeCount ?? 0}건</p>
                  </div>
                  <TradeTrustSummary counterpartUserId={trade.counterpartUserId} dealType="service" />
                </div>
              </div>
              <p className="service-trade-next-step">다음 단계: <strong>{nextStepLabel}</strong></p>
            </div>
          </section>

          <section className="trade-detail-card" aria-labelledby="service-trade-chat-title">
            <div className="trade-detail-card__block">
              <h3 id="service-trade-chat-title">거래 채팅</h3>
              <p>{canAccessChat ? '서비스 진행 중 협의한 거래 채팅 내용을 확인할 수 있습니다.' : '생성된 거래 채팅 기록이 없습니다.'}</p>
              {(canAccessChat || canRequestScheduleChange || canRequestScheduleCancellation) && (
                <div className="service-trade-inline-actions service-trade-inline-actions--summary" aria-label="서비스 일정 및 채팅 처리">
                  <div className="service-trade-inline-actions__group">
                    {canAccessChat && (
                      <ActionButton
                        className="service-trade-inline-actions__chat"
                        fullWidth
                        to={chatPath ?? getServiceTradeChatPath(trade.tradeId)}
                        tone="outline"
                      >
                        <MessageSquareText aria-hidden="true" size={18} /> {canViewChatHistory ? '채팅 기록 보기' : '서비스 채팅'}
                      </ActionButton>
                    )}
                    {canRequestScheduleChange && (
                      <ActionButton
                        fullWidth
                        onClick={() => openScheduleDialog('CHANGE')}
                        tone="neutral"
                      >
                        <CalendarDays aria-hidden="true" size={18} /> 일정 변경 요청
                      </ActionButton>
                    )}
                    {canRequestScheduleCancellation && (
                      <ActionButton
                        fullWidth
                        onClick={() => openScheduleDialog('CANCEL')}
                        tone="neutral"
                      >
                        일정 취소 요청
                      </ActionButton>
                    )}
                  </div>
                </div>
              )}
              {canDecideScheduleCancellation && (
                <div className="service-trade-cancellation-decision" role="status">
                  <div>
                    <strong>상대방이 일정 취소를 요청했습니다.</strong>
                    <p>동의하면 거래가 취소되고 보관금은 의뢰자에게 전액 환불됩니다.</p>
                  </div>
                  <div className="service-trade-cancellation-decision__actions">
                    <ActionButton
                      className="w-36 font-extrabold"
                      disabled={isDecidingScheduleCancellation}
                      onClick={() => handleScheduleCancellationDecision(false)}
                      tone="neutral"
                    >
                      거절
                    </ActionButton>
                    <ActionButton
                      className="w-36 font-extrabold"
                      disabled={isDecidingScheduleCancellation}
                      onClick={() => handleScheduleCancellationDecision(true)}
                      tone="danger"
                    >
                      {isDecidingScheduleCancellation ? '처리 중...' : '동의하고 취소'}
                    </ActionButton>
                  </div>
                  {scheduleCancellationDecisionError && <p className="service-trade-dispute-form__error" role="alert">{scheduleCancellationDecisionError}</p>}
                </div>
              )}
            </div>
            <div className="trade-detail-card__block" aria-labelledby="service-trade-status-title">
              <div className="service-trade-card__title-row">
                <h3 id="service-trade-status-title">거래 확인</h3>
                <ShieldCheck aria-hidden="true" size={20} />
              </div>
              <p>현재 거래 상태: <strong>{status.label}</strong></p>
              <div className="service-trade-card__escrow" aria-label="서비스 보관금">
                <span><WalletCards aria-hidden="true" size={17} /> 보관금</span>
                <strong>{tradeAmountLabel}</strong>
                <p>{trade.escrowStatusLabel ?? '보관금 상태를 확인하고 있습니다.'}</p>
              </div>
              {(canRequestCompletion || canConfirmCompletion) && (
                <div className="service-trade-inline-actions service-trade-inline-actions--status" aria-label="거래 완료 처리">
                  <div className="service-trade-inline-actions__group service-trade-inline-actions__group--primary">
                    {canRequestCompletion && (
                      <ActionButton
                        fullWidth
                        onClick={() => openCompletionDialog('REQUEST')}
                        tone="primary"
                      >
                        <CheckCircle2 aria-hidden="true" size={18} /> 완료 요청 작성
                      </ActionButton>
                    )}
                    {canConfirmCompletion && (
                      <ActionButton
                        fullWidth
                        onClick={() => openCompletionDialog('CONFIRM')}
                        tone="primary"
                      >
                        <CheckCircle2 aria-hidden="true" size={18} /> 거래 완료 확인
                      </ActionButton>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {canShowTradeReview && (
            <TradeReviewSection tradeId={trade.tradeId} isTradeCompleted={isTradeCompleted} />
          )}
        </div>

        {Array.isArray(resolvedScheduleHistory) && (
          <section className="service-trade-card service-trade-card--schedule" aria-labelledby="service-trade-schedule-history-title">
            <header className="service-trade-card__header">
              <CalendarDays aria-hidden="true" size={20} />
              <h2 id="service-trade-schedule-history-title">일정 및 거래 이력</h2>
            </header>
            {resolvedScheduleHistory.length > 0 ? (
              <ol className="service-trade-schedule-history">
                {visibleHistory.map((item) => (
                  <li key={item.id}>
                    <strong>
                      {SERVICE_TRADE_HISTORY_LABELS[item.eventType] ?? '일정 취소 요청'}
                    </strong>
                    <span>{item.occurredAt ? formatDateTime(item.occurredAt) : '-'}</span>
                    {item.requestedScheduleAt && <p>변경 희망: {formatDateTime(item.requestedScheduleAt)}</p>}
                    {item.reason && <p>{item.reason}</p>}
                  </li>
                ))}
              </ol>
            ) : <p className="service-trade-card__empty">등록된 일정 또는 거래 이력이 없습니다.</p>}
            {historyPageCount > 1 && (
              <nav className="service-trade-history-pagination" aria-label="일정 및 거래 이력 페이지">
                <button
                  type="button"
                  disabled={currentHistoryPage === 0}
                  onClick={() => setHistoryPage((page) => Math.max(page - 1, 0))}
                >이전</button>
                <span>{currentHistoryPage + 1} / {historyPageCount}</span>
                <button
                  type="button"
                  disabled={currentHistoryPage >= historyPageCount - 1}
                  onClick={() => setHistoryPage((page) => Math.min(page + 1, historyPageCount - 1))}
                >다음</button>
              </nav>
            )}
          </section>
        )}

      </div>

      {completionDialogType && (
        <div className="service-trade-dialog-backdrop" role="presentation" onMouseDown={closeCompletionDialog}>
          <section
            className="service-trade-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-trade-completion-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="service-trade-dialog__header">
              <h2 id="service-trade-completion-title">{isCompletionRequest ? '서비스 완료 요청' : '서비스 완료 확인'}</h2>
              <button className="service-trade-dialog__close" type="button" onClick={closeCompletionDialog} aria-label="완료 처리 창 닫기">×</button>
            </header>

            {completionSubmitted ? (
              <div className="service-trade-dialog__result" role="status">
                <strong>{isCompletionRequest ? '완료 요청을 전달했습니다.' : '서비스 완료를 확인했습니다.'}</strong>
                <p>{isCompletionRequest ? '의뢰자의 확인 기한은 5일이며, 이의가 없으면 자동 완료됩니다.' : '거래 완료와 정산 처리 결과를 안내해 드립니다.'}</p>
                <ActionButton
                  onClick={closeCompletionDialog}
                  tone="primary"
                >
                  확인
                </ActionButton>
              </div>
            ) : (
              <form className="service-trade-dispute-form" onSubmit={handleCompletionSubmit}>
                <p className="service-trade-dispute-form__notice">
                  {isCompletionRequest
                    ? '완료 요청 후 의뢰자가 확인하거나 5일 동안 이의가 없으면 거래가 자동 완료됩니다.'
                    : '완료를 확인하면 거래 완료와 제공자 정산 처리 절차가 진행됩니다.'}
                </p>
                {isCompletionRequest && (
                  <>
                    <label htmlFor="service-trade-completion-memo">완료 요청 메모</label>
                    <textarea
                      id="service-trade-completion-memo"
                      value={completionMemo}
                      onChange={(event) => setCompletionMemo(event.target.value)}
                      maxLength={1000}
                      placeholder="완료한 작업 내용과 확인 사항을 입력해 주세요."
                      disabled={isSubmittingCompletion}
                    />
                    <p className="service-trade-dispute-form__count">{completionMemo.length}/1,000</p>
                  </>
                )}
                {!canSubmitCompletion && <p className="service-trade-dispute-form__help">현재 완료 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>}
                {completionError && <p className="service-trade-dispute-form__error" role="alert">{completionError}</p>}
                <div className="service-trade-dispute-form__actions">
                  <ActionButton
                    disabled={isSubmittingCompletion}
                    onClick={closeCompletionDialog}
                    tone="neutral"
                  >
                    취소
                  </ActionButton>
                  <ActionButton
                    disabled={isSubmittingCompletion || !canSubmitCompletion}
                    tone="primary"
                    type="submit"
                  >
                    {isSubmittingCompletion ? '처리 중...' : isCompletionRequest ? '완료 요청 보내기' : '완료 확인'}
                  </ActionButton>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {scheduleDialogType && (
        <div className="service-trade-dialog-backdrop" role="presentation" onMouseDown={closeScheduleDialog}>
          <section
            className="service-trade-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-trade-schedule-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="service-trade-dialog__header">
              <h2 id="service-trade-schedule-dialog-title">{isScheduleChange ? '서비스 일정 변경 요청' : '서비스 일정 취소 요청'}</h2>
              <button className="service-trade-dialog__close" type="button" onClick={closeScheduleDialog} aria-label="일정 요청 창 닫기">×</button>
            </header>

            {scheduleSubmitted ? (
              <div className="service-trade-dialog__result" role="status">
                <strong>{isScheduleChange ? '일정 변경 요청을 전달했습니다.' : '일정 취소 요청을 전달했습니다.'}</strong>
                <p>상대방 확인과 처리 결과는 서비스 거래 이력에서 안내해 드립니다.</p>
                <ActionButton
                  onClick={closeScheduleDialog}
                  tone="primary"
                >
                  확인
                </ActionButton>
              </div>
            ) : (
              <form className="service-trade-dispute-form" onSubmit={handleScheduleSubmit}>
                <p className="service-trade-dispute-form__notice">일정 변경·취소에는 수수료가 부과되지 않으며 요청 사유가 거래 이력에 기록됩니다.</p>
                {isScheduleChange && (
                  <div className="service-trade-schedule-picker-grid">
                    <div className="service-trade-date-picker-field" role="group" aria-labelledby="service-trade-requested-schedule-date-label">
                      <span id="service-trade-requested-schedule-date-label">변경 희망 날짜</span>
                      <button
                        aria-expanded={isScheduleDatePickerOpen}
                        aria-haspopup="dialog"
                        className="service-trade-time-picker-trigger"
                        disabled={isSubmittingSchedule}
                        onClick={() => {
                          setIsScheduleDatePickerOpen((isOpen) => !isOpen);
                        }}
                        type="button"
                      >
                        <span>{requestedScheduleDate || '날짜 선택'}</span>
                        <CalendarDays aria-hidden="true" size={18} />
                      </button>
                      {isScheduleDatePickerOpen && (
                        <div className="service-trade-date-picker" role="dialog" aria-label="변경 희망 날짜 선택">
                          <DateRangePicker
                            fixedStart
                            endDate={requestedScheduleDate || null}
                            gridPadding="12px"
                            hideStatus
                            onChange={({ end }) => {
                              setRequestedScheduleDate(end);
                              setIsScheduleDatePickerOpen(false);
                              const nextMinimumTime = end === todayDate
                                ? getNextTenMinuteTime()
                                : '00:00';
                              if (
                                !isTenMinuteTime(requestedScheduleTime)
                                || !nextMinimumTime
                                || requestedScheduleTime < nextMinimumTime
                              ) {
                                setRequestedScheduleTime('');
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="service-trade-time-slots-field" role="group" aria-label="변경 희망 시간">
                      <span className="service-trade-time-slots-field__label">변경 희망 시간</span>
                      <TimeSelect
                        ariaLabel="변경 희망 시간"
                        disabled={!requestedScheduleDate || isSubmittingSchedule}
                        minTime={minimumScheduleTime}
                        onChange={(time) => {
                          setScheduleError('');
                          setRequestedScheduleTime(time);
                        }}
                        unavailable={isScheduleTimeUnavailable}
                        unavailableMessage="오늘 선택 가능한 시간이 없습니다. 다른 날짜를 선택해 주세요."
                        value={requestedScheduleTime}
                      />
                      {!requestedScheduleDate && <p>먼저 변경 희망 날짜를 선택해 주세요.</p>}
                    </div>
                  </div>
                )}
                <label htmlFor="service-trade-schedule-reason">요청 사유</label>
                <textarea
                  id="service-trade-schedule-reason"
                  value={scheduleReason}
                  onChange={(event) => setScheduleReason(event.target.value)}
                  maxLength={1000}
                  placeholder="일정 변경 또는 취소가 필요한 사유를 입력해 주세요."
                  disabled={isSubmittingSchedule}
                />
                <p className="service-trade-dispute-form__count">{scheduleReason.length}/1,000</p>
                {!canSubmitSchedule && <p className="service-trade-dispute-form__help">현재 일정 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>}
                {scheduleError && <p className="service-trade-dispute-form__error" role="alert">{scheduleError}</p>}
                <div className="service-trade-dispute-form__actions">
                  <ActionButton
                    disabled={isSubmittingSchedule}
                    onClick={closeScheduleDialog}
                    tone="neutral"
                  >
                    취소
                  </ActionButton>
                  <ActionButton
                    disabled={isSubmittingSchedule || !canSubmitSchedule}
                    tone="primary"
                    type="submit"
                  >
                    {isSubmittingSchedule ? '요청 중...' : '요청 보내기'}
                  </ActionButton>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
      <ReportModal
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetName={counterpartName}
        targetType="trade"
        referenceSn={trade.tradeId}
        reportedUserSn={trade.counterpartUserId}
        contextLabel={`거래 상대: ${counterpartName}`}
        tradeReportTypeCodes={['ABRC0008', 'ABRC0010', 'ABRC0011']}
        redirectAfterSubmit={false}
      />
      <ServiceTradeOriginalModal
        open={isOriginalDocumentOpen}
        onClose={() => setIsOriginalDocumentOpen(false)}
        viewerRole={trade.viewerRole}
        serviceRequestId={trade.serviceRequestId}
        selectedQuoteId={trade.selectedQuoteId}
      />
    </main>
  );
}
