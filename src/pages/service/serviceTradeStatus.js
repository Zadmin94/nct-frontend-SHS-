// TRADE.TRD_STATUS_CD(TRDG02)를 서비스 거래 화면 단계·문구로 변환한다.
// 서비스 거래 유형(TRDC0002)과 보관금 상태는 이 모듈에서 상태 코드로 다루지 않는다.
// 실제 API DTO가 확정되면 이 모듈만 보완해 역할별 화면이 같은 기준을 사용하게 한다.
const SERVICE_TRADE_STATUS = {
  TRDC0003: {
    label: '서비스 진행 중',
    description: '제공자가 약속한 범위의 서비스를 진행하고 있습니다.',
    step: 1,
    tone: 'progress',
  },
  TRDC0005: {
    label: '완료 확인 대기',
    description: '완료 요청을 확인하거나 거래 문제를 접수할 수 있습니다.',
    step: 2,
    tone: 'pending',
  },
  TRDC0006: {
    label: '거래 완료',
    description: '서비스 거래가 정상적으로 완료되었습니다.',
    step: 3,
    tone: 'complete',
  },
  TRDC0007: {
    label: '거래 보류',
    description: '거래 문제를 확인하는 동안 완료와 정산이 보류됩니다.',
    step: -1,
    tone: 'problem',
  },
  TRDC0008: {
    label: '거래 취소',
    description: '취소된 서비스 거래입니다.',
    step: -1,
    tone: 'canceled',
  },
};

const UNKNOWN_STATUS = {
  label: '상태 확인 필요',
  description: '서비스 거래 상태를 확인하고 있습니다.',
  step: -1,
  tone: 'pending',
};

export const getServiceTradeStatus = (statusCode) => (
  SERVICE_TRADE_STATUS[statusCode] ?? UNKNOWN_STATUS
);

export const SERVICE_TRADE_STEPS = [
  '보관금',
  '서비스 진행',
  '의뢰자·제공자 완료 확인',
  '거래 완료',
];
