import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  acceptOfflineScheduleProposal,
  proposeTradeOfflineSchedule,
  rejectOfflineScheduleProposal,
  requestOfflineScheduleCancellation,
  withdrawOfflineScheduleProposal,
} from '@api/tradeApi';
import AlertModal from '@components/common/AlertModal';
import TimeSelect from '@components/common/TimeSelect';
import {
  getNextTenMinuteTime,
  isTenMinuteTime,
} from '@components/common/timeSelectUtils';
import DateRangePicker from '@components/product/DateRangePicker';
import { ActionButton } from '@components/common/ui';

const getInitialValue = (value) => (value && value !== '-' ? value : '');
const getTodayDate = () => new Date().toLocaleDateString('en-CA');
const MAX_SCHEDULE_PROPOSALS_PER_PARTY = 3;

const getInitialMeetingDate = (value) => {
  const initialValue = getInitialValue(value);
  return initialValue >= getTodayDate() ? initialValue : '';
};

const formatMeetingPlace = (place, address) => [place, address]
  .map(getInitialValue)
  .map((value) => value.trim())
  .filter(Boolean)
  .join(' ');

/** 직거래 일정 표시·제안·응답·변경·취소를 양쪽 상세 화면에서 공통으로 처리한다. */
const OfflineScheduleProposalPanel = ({
  tradeId,
  trade,
  onUpdated,
  onNotice,
  onError,
  onRefresh,
  pendingOnly = false,
}) => {
  const initialMeetingDate = getInitialMeetingDate(trade?.meetingDate);
  const [meetingDate, setMeetingDate] = useState(initialMeetingDate);
  const [meetingTime, setMeetingTime] = useState(() => {
    const initialTime = getInitialValue(trade?.meetingTime);
    const initialMinimumTime = initialMeetingDate === getTodayDate()
      ? getNextTenMinuteTime()
      : '00:00';

    return isTenMinuteTime(initialTime)
      && initialMinimumTime
      && initialTime >= initialMinimumTime
      ? initialTime
      : '';
  });
  const [meetingPlace, setMeetingPlace] = useState(
    formatMeetingPlace(trade?.meetingPlace, trade?.meetingAddress),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleRefreshAlertMessage, setScheduleRefreshAlertMessage] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const todayDate = getTodayDate();
  const minimumMeetingTime = meetingDate === todayDate ? getNextTenMinuteTime() : '00:00';
  const isMeetingTimeUnavailable = meetingDate === todayDate && !minimumMeetingTime;

  const pending = trade?.pendingScheduleProposalId
    ? {
      id: trade.pendingScheduleProposalId,
      type: trade.pendingScheduleProposalType,
      date: trade.pendingMeetingDate,
      time: trade.pendingMeetingTime,
      place: trade.pendingMeetingPlace,
      address: trade.pendingMeetingAddress,
    }
    : null;
  const hasConfirmedSchedule = Boolean(
    trade?.meetingDate && trade.meetingDate !== '-'
      && trade?.meetingTime && trade.meetingTime !== '-'
      && trade?.meetingPlace && trade.meetingPlace !== '-',
  );
  const scheduleProposalCount = Number(trade?.myScheduleProposalCount ?? 0);
  const remainingScheduleProposalCount = Math.max(
    0,
    Number(trade?.remainingScheduleProposalCount
      ?? MAX_SCHEDULE_PROPOSALS_PER_PARTY - scheduleProposalCount),
  );
  const isScheduleProposalLimitReached = remainingScheduleProposalCount === 0;

  const applyAction = async (action, successMessage) => {
    setIsSubmitting(true);
    try {
      const response = await action();
      onUpdated(response);
      onNotice(successMessage);
    } catch (error) {
      const message = error.response?.data?.message;
      if (
        error.response?.status === 409
        && message === '이미 응답을 기다리는 일정 제안이 있습니다.'
        && onRefresh
      ) {
        setScheduleRefreshAlertMessage('상대방이 먼저 일정 제안을 등록했습니다.\n확인을 누르면 최신 제안 내용을 불러옵니다.');
        return;
      }
      if (
        message === '철회할 수 있는 일정 제안을 찾을 수 없습니다.'
        && onRefresh
      ) {
        setScheduleRefreshAlertMessage('상대방이 이미 일정 제안에 응답했습니다.\n확인을 누르면 최신 상태를 불러옵니다.');
        return;
      }
      onError(message ?? '직거래 일정 처리에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitProposal = async (event) => {
    event.preventDefault();
    if (isScheduleProposalLimitReached) {
      onError('직거래 일정 제안은 판매자와 구매자 각각 최초 제안을 포함해 최대 3회까지 할 수 있습니다.');
      return;
    }
    if (!meetingDate || !meetingTime || !meetingPlace.trim()) {
      onError('거래 일시와 장소를 모두 입력해 주세요.');
      return;
    }
    const meetingDateTime = new Date(`${meetingDate}T${meetingTime}:00`);
    if (
      !isTenMinuteTime(meetingTime)
      || Number.isNaN(meetingDateTime.getTime())
      || meetingDateTime.getTime() <= Date.now()
    ) {
      onError('현재 이후의 거래 시간을 10분 단위로 다시 선택해 주세요.');
      return;
    }

    await applyAction(
      () => proposeTradeOfflineSchedule(tradeId, {
        meetingDate,
        meetingTime,
        meetingPlace: meetingPlace.trim(),
        meetingAddress: '',
      }),
      hasConfirmedSchedule ? '일정 변경을 제안했습니다.' : '직거래 일정을 제안했습니다.',
    );
  };

  const handleMeetingDateChange = ({ end }) => {
    if (isSubmitting || !end) return;

    const nextMinimumTime = end === todayDate ? getNextTenMinuteTime() : '00:00';
    setMeetingDate(end);
    setIsDatePickerOpen(false);
    setMeetingTime((currentTime) => (
      !isTenMinuteTime(currentTime)
      || !nextMinimumTime
      || currentTime < nextMinimumTime
        ? ''
        : currentTime
    ));
  };

  const handleScheduleRefreshConfirm = async () => {
    setScheduleRefreshAlertMessage('');
    await onRefresh?.();
  };

  if (
    pendingOnly
    || ['COMPLETED', 'CANCELED', 'ON_HOLD', 'CONFIRM_PENDING', 'WAITING_CONFIRMATION']
      .includes(trade?.status)
  ) {
    return null;
  }

  return (
    <div className="trade-detail-card__block trade-schedule-proposal-panel">
      <h3>직거래 일정·장소 관리</h3>

      {hasConfirmedSchedule && (
        <div className="trade-detail-card__block">
          <h4>현재 확정 일정</h4>
          <dl className="trade-meeting-summary">
            <div><dt>거래 일시</dt><dd>{trade.meetingDate} {trade.meetingTime}</dd></div>
            <div><dt>거래 장소</dt><dd>{formatMeetingPlace(trade.meetingPlace, trade.meetingAddress)}</dd></div>
          </dl>
        </div>
      )}

      {pending ? (
        <div className="trade-detail-card__block">
          <h4>{pending.type === 'TRDC0032' ? '일정 취소 요청' : '대기 중인 일정 제안'}</h4>
          {pending.type !== 'TRDC0032' && (
            <dl className="trade-meeting-summary">
              <div><dt>거래 일시</dt><dd>{pending.date ?? '-'} {pending.time ?? ''}</dd></div>
              <div><dt>거래 장소</dt><dd>{formatMeetingPlace(pending.place, pending.address) || '-'}</dd></div>
            </dl>
          )}
          <p className="trade-detail-card__muted">
            {trade.canRespondToScheduleProposal
              ? '상대방이 제안한 내용입니다. 수락하면 확정 일정으로 저장됩니다.'
              : '상대방의 응답을 기다리고 있습니다.'}
          </p>
          <div className="trade-detail-actions trade-detail-actions--end">
            {trade.canRespondToScheduleProposal && (
              <>
                <ActionButton
                  disabled={isSubmitting}
                  onClick={() => applyAction(
                    () => acceptOfflineScheduleProposal(tradeId, pending.id),
                    pending.type === 'TRDC0032' ? '직거래 일정 취소를 확정했습니다.' : '직거래 일정을 확정했습니다.',
                  )}
                >
                  수락
                </ActionButton>
                <ActionButton
                  disabled={isSubmitting}
                  onClick={() => applyAction(
                    () => rejectOfflineScheduleProposal(tradeId, pending.id),
                    '직거래 일정 제안을 거절했습니다.',
                  )}
                  tone="outline"
                >
                  거절
                </ActionButton>
              </>
            )}
            {trade.canWithdrawScheduleProposal && (
              <ActionButton
                disabled={isSubmitting}
                onClick={() => applyAction(
                  () => withdrawOfflineScheduleProposal(tradeId, pending.id),
                  '직거래 일정 제안을 철회했습니다.',
                )}
                tone="outline"
              >
                제안 철회
              </ActionButton>
            )}
          </div>
        </div>
      ) : (
        <form className="trade-detail-card__block" onSubmit={submitProposal}>
          <p className="trade-notice">
            {hasConfirmedSchedule
              ? '현재 확정 일정은 상대방이 수락하기 전까지 유지됩니다.'
              : '채팅으로 협의한 일시와 장소를 등록해 주세요.'}
          </p>
          <p className="trade-detail-card__muted">
            내가 제안한 일정 {scheduleProposalCount}/{MAX_SCHEDULE_PROPOSALS_PER_PARTY}회 · 남은 제안 {remainingScheduleProposalCount}회
          </p>
          <div className="trade-address-grid">
            <div className="trade-form-field trade-schedule-picker-field" role="group" aria-labelledby="offline-meeting-date-label">
              <span id="offline-meeting-date-label">거래 날짜</span>
              <button
                aria-expanded={isDatePickerOpen}
                aria-haspopup="dialog"
                className="input trade-schedule-picker-trigger"
                disabled={isSubmitting}
                onClick={() => {
                  setIsDatePickerOpen((isOpen) => !isOpen);
                }}
                type="button"
              >
                <span>{meetingDate || '날짜 선택'}</span>
                <CalendarDays aria-hidden="true" size={18} />
              </button>
              {isDatePickerOpen && (
                <div className="trade-schedule-date-picker" role="dialog" aria-label="거래 날짜 선택">
                  <DateRangePicker
                    fixedStart
                    endDate={meetingDate || null}
                    gridPadding="16px 12px"
                    hideStatus
                    onChange={handleMeetingDateChange}
                  />
                </div>
              )}
            </div>
            <div className="trade-form-field trade-schedule-picker-field" role="group" aria-labelledby="offline-meeting-time-label">
              <span id="offline-meeting-time-label">거래 시간</span>
              <TimeSelect
                ariaLabel="거래 시간"
                disabled={!meetingDate || isSubmitting}
                minTime={minimumMeetingTime}
                onChange={setMeetingTime}
                unavailable={isMeetingTimeUnavailable}
                unavailableMessage="오늘 선택 가능한 시간이 없습니다. 다른 날짜를 선택해 주세요."
                value={meetingTime}
              />
              {!meetingDate && (
                <p className="trade-detail-card__muted">먼저 거래 날짜를 선택해 주세요.</p>
              )}
            </div>
          </div>
          <label className="trade-form-field">
            거래 장소
            <textarea
              className="input trade-form-field__textarea"
              value={meetingPlace}
              onChange={(event) => setMeetingPlace(event.target.value)}
              placeholder="예: 합정역 8번 출구 앞 스타벅스 입구, 건물 오른쪽 벤치"
              maxLength={200}
              rows={3}
              disabled={isSubmitting}
            />
          </label>
          <div className="trade-detail-actions trade-detail-actions--end">
            <ActionButton loading={isSubmitting} type="submit" disabled={isScheduleProposalLimitReached}>
              {isSubmitting
                ? '처리 중...'
                : isScheduleProposalLimitReached
                  ? '일정 제안 횟수 소진'
                  : hasConfirmedSchedule ? '변경 제안하기' : '일정 제안하기'}
            </ActionButton>
            {hasConfirmedSchedule && (
              <ActionButton
                disabled={isSubmitting}
                onClick={() => applyAction(
                  () => requestOfflineScheduleCancellation(tradeId),
                  '직거래 일정 취소를 제안했습니다.',
                )}
                tone="outline"
              >
                일정 취소 제안
              </ActionButton>
            )}
          </div>
        </form>
      )}
      <AlertModal
        confirmLabel="확인"
        message={scheduleRefreshAlertMessage}
        onClose={handleScheduleRefreshConfirm}
        open={Boolean(scheduleRefreshAlertMessage)}
      />
    </div>
  );
};

export default OfflineScheduleProposalPanel;
