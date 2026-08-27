import api from './axios';

const TRADE_ENDPOINT = '/trades';

/**
 * 로그인한 사용자의 거래 목록을 역할·상태·검색어 기준으로 조회한다.
 * 백엔드 응답 형식은 추후 거래 API 계약서에 맞춰 화면 어댑터에서 처리한다.
 */
export const getTradeHistory = async (params = {}) => {
  const response = await api.get(TRADE_ENDPOINT, {
    params,
  });

  return response.data;
};

/**
 * 거래 당사자의 역할을 서버에서 검증한 뒤 거래 상세 정보를 조회한다.
 */
export const getTradeDetail = async (tradeId) => {
  const response = await api.get(`${TRADE_ENDPOINT}/${tradeId}`);

  return response.data;
};

// @ai_generated
/** 경매 번호를 외부 식별자로 사용해 현재 사용자의 물건 거래 상세를 조회한다. */
export const getTradeDetailByAuctionId = async (auctionId) => {
  const response = await api.get(`${TRADE_ENDPOINT}/auction/${auctionId}`);

  return response.data;
};

/**
 * 거래 당사자가 직거래 일정 신규 제안 또는 변경 제안을 등록한다.
 * 서버는 거래 당사자 여부와 직거래 방식 여부를 함께 검증한다.
 */
export const proposeTradeOfflineSchedule = async (tradeId, payload) => {
  const response = await api.post(
    `${TRADE_ENDPOINT}/${tradeId}/offline-schedule/proposals`,
    payload,
  );

  return response.data;
};

/** 확정 직거래 일정 취소를 상대방에게 제안한다. */
export const requestOfflineScheduleCancellation = async (tradeId) => {
  const response = await api.post(
    `${TRADE_ENDPOINT}/${tradeId}/offline-schedule/cancel-requests`,
  );

  return response.data;
};

/** 상대방이 제안한 직거래 일정을 수락한다. */
export const acceptOfflineScheduleProposal = async (tradeId, proposalId) => {
  const response = await api.post(
    `${TRADE_ENDPOINT}/${tradeId}/offline-schedule/proposals/${proposalId}/accept`,
  );

  return response.data;
};

/** 상대방이 제안한 직거래 일정을 거절한다. */
export const rejectOfflineScheduleProposal = async (tradeId, proposalId) => {
  const response = await api.post(
    `${TRADE_ENDPOINT}/${tradeId}/offline-schedule/proposals/${proposalId}/reject`,
  );

  return response.data;
};

/** 본인이 등록한 대기 중 직거래 일정 제안을 철회한다. */
export const withdrawOfflineScheduleProposal = async (tradeId, proposalId) => {
  const response = await api.delete(
    `${TRADE_ENDPOINT}/${tradeId}/offline-schedule/proposals/${proposalId}`,
  );

  return response.data;
};

/**
 * 거래 당사자의 완료 확인을 전송한다.
 * 첫 확인은 상대방 대기를 시작하고, 두 번째 확인은 서버에서 거래 완료로 전환한다.
 */
export const requestTradeCompletion = async (tradeId) => {
  const response = await api.post(
    `${TRADE_ENDPOINT}/${tradeId}/completion-requests`,
  );

  return response.data;
};

/** 직거래 완료 요청을 받은 상대방이 동의해 완료하거나 거절해 거래 진행으로 되돌린다. */
export const respondOfflineTradeCompletionRequest = async (tradeId, requesterRole, approve) => {
  const response = await api.post(
    `${TRADE_ENDPOINT}/${tradeId}/offline-completion-requests/respond`,
    null,
    { params: { approve, requesterRole } },
  );

  return response.data;
};

/** 판매자가 업로드 완료한 배송 인증사진과 메모를 한 번에 거래에 연결한다. */
export const submitTradeDeliveryProof = async (tradeId, payload) => {
  const response = await api.post(
    `${TRADE_ENDPOINT}/${tradeId}/delivery-proofs`,
    payload,
  );

  return response.data;
};
