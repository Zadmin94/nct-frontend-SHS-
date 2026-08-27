export const OFFLINE_TRADE_STEPS = [
  '채팅·일정 협의',
  '일정 확정',
  '직거래 예정·진행',
  '판매자·구매자 완료 확인',
  '거래 완료',
];

const hasValue = (value) => Boolean(value && value !== '-');

const hasCurrentOfflineSchedule = (trade) => (
  hasValue(trade?.meetingDate)
  && hasValue(trade?.meetingTime)
  && hasValue(trade?.meetingPlace)
);

const isMeetingTimeElapsed = (trade, now = Date.now()) => {
  if (!hasCurrentOfflineSchedule(trade)) return false;

  const meetingAt = new Date(`${trade.meetingDate}T${trade.meetingTime}`);
  return !Number.isNaN(meetingAt.getTime()) && meetingAt.getTime() <= now;
};

/**
 * 직거래 상단 프로그레스 바의 상태를 구매자·판매자 공통으로 계산한다.
 * 일정 제안에 대한 상대방 응답은 일정 확정 단계로, 약속 시간이 지난 뒤에는
 * 판매자·구매자 완료 확인 단계로 표시한다.
 */
export const getOfflineTradeProgressConfig = (trade, now = Date.now()) => {
  if (['ON_HOLD', 'CANCELED'].includes(trade?.status)) {
    return {
      steps: OFFLINE_TRADE_STEPS,
      activeIndex: -1,
      ariaLabel: '직거래 진행 단계',
    };
  }

  if (trade?.status === 'COMPLETED') {
    return {
      steps: OFFLINE_TRADE_STEPS,
      activeIndex: 4,
      ariaLabel: '직거래 진행 단계',
    };
  }

  if (['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade?.status)
    || isMeetingTimeElapsed(trade, now)) {
    return {
      steps: OFFLINE_TRADE_STEPS,
      activeIndex: 3,
      ariaLabel: '직거래 진행 단계',
    };
  }

  if (trade?.pendingScheduleProposalId) {
    return {
      steps: OFFLINE_TRADE_STEPS,
      activeIndex: 1,
      ariaLabel: '직거래 진행 단계',
    };
  }

  if (hasCurrentOfflineSchedule(trade)) {
    return {
      steps: OFFLINE_TRADE_STEPS,
      activeIndex: 2,
      ariaLabel: '직거래 진행 단계',
    };
  }

  return {
    steps: OFFLINE_TRADE_STEPS,
    activeIndex: 0,
    ariaLabel: '직거래 진행 단계',
  };
};
