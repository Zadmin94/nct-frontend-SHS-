import api from './axios';

/** 로그인한 의뢰자·제공자의 서비스 거래 목록을 페이지 단위로 조회한다. */
export const getMyServiceTrades = ({
  role,
  status,
  keyword,
  page = 1,
  size = 10,
} = {}) => (
  api.get('/trades/service', {
    params: {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
      page,
      size,
    },
  }).then((response) => response.data.data)
);

/** 로그인한 거래 당사자의 서비스 거래 상세와 서버 판정 가능 행동을 조회한다. */
export const getServiceTradeDetail = (tradeId) => (
  api.get(`/trades/${tradeId}/service-detail`).then((response) => response.data.data)
);

/** 담당자 7 · F-OPS-005: 개인정보 원문과 당사자 행동이 제거된 관리자용 거래 상세입니다. */
export const getAdminServiceTradeDetail = (tradeId) => (
  api.get(`/admin/service-trades/${tradeId}`).then((response) => response.data.data)
);

/** F-SVC-014: 서비스 제공자가 완료 요청을 등록하고 의뢰자 확인 기한을 시작한다. */
export const requestServiceCompletion = (tradeId, payload) => (
  api.post(`/trades/${tradeId}/service-completion-requests`, payload).then((res) => res.data)
);

/** F-SVC-011: 서비스 의뢰자가 완료를 확인하면 서버가 정산까지 함께 처리한다. */
export const confirmServiceCompletion = (tradeId) => (
  api.post(`/trades/${tradeId}/service-completions`).then((res) => res.data)
);

/** F-SVC-016: 일정 변경 요청은 거래 상태를 바꾸지 않고 이력으로만 기록한다. */
export const requestServiceScheduleChange = (tradeId, payload) => (
  api.post(`/trades/${tradeId}/service-schedule-changes`, payload).then((res) => res.data)
);

/** F-SVC-016: 일정 취소 요청은 거래 상태를 바꾸지 않고 이력으로만 기록한다. */
export const requestServiceScheduleCancellation = (tradeId, payload) => (
  api.post(`/trades/${tradeId}/service-schedule-cancellations`, payload).then((res) => res.data)
);

/** 상대방의 일정 취소 요청을 동의하거나 거절한다. 동의 시 거래 취소·보관금 환불을 함께 처리한다. */
export const decideServiceScheduleCancellation = (tradeId, approved) => (
  api.post(`/trades/${tradeId}/service-schedule-cancellations/decision`, { approved }).then((res) => res.data)
);
