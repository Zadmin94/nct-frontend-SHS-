import api from './axios';

// 담당자 7 · F-OPS-003/004: 관리자 경매 조회와 종료 경매 취소 요청 판정 API입니다.
export const fetchAdminAuctions = async (params) => {
  const response = await api.get('/admin/auctions', { params });
  return response.data.data;
};

export const fetchAdminAuctionOverview = async (auctionId) => {
  const response = await api.get(`/admin/auctions/${auctionId}`, {
    skipServerErrorRedirect: true,
  });
  return response.data.data;
};

export const fetchAdminAuctionCancellationRequest = async (auctionId) => {
  const response = await api.get(
    `/admin/seller-cancellations/auctions/${auctionId}/cancellation-request`,
    { skipServerErrorRedirect: true },
  );
  return response.data.data;
};

export const decideAdminAuctionCancellation = async ({ auctionId, decision, reason }) => {
  await api.post(`/admin/seller-cancellations/auctions/${auctionId}/cancellation-request/decision`, {
    decision,
    reason,
  });
};

export const forceCancelAdminAuction = async ({ auctionId, reason, requestId }) => {
  const response = await api.post(`/admin/auctions/${auctionId}/force-cancel`, {
    reason,
    requestId,
  });
  return response.data.data;
};

// 담당자 7 · F-OPS-003/004: 독립 상세 경로에서도 목록의 취소 처리 메타데이터를 복원합니다.
export const fetchAdminAuctionSummary = async (auctionId) => {
  const page = await fetchAdminAuctions({
    keyword: String(auctionId),
    page: 1,
    size: 100,
  });
  return (page?.items ?? []).find(
    (item) => Number(item.auctionId) === Number(auctionId),
  ) ?? null;
};

// 담당자 7 · F-OPS-003: 상품 삭제와 구분되는 공개 숨김·복구 명령입니다.
export const changeAdminAuctionProductVisibility = async ({
  auctionId,
  visible,
  reason,
  requestId,
}) => {
  const response = await api.post(`/admin/auctions/${auctionId}/product-visibility`, {
    visible,
    reason,
    requestId,
  });
  return response.data.data;
};

// 담당자 7 · F-OPS-003: 진행 중 경매의 수동 일시중지·재개 명령입니다.
export const pauseAdminAuction = async ({ auctionId, reason, requestId }) => {
  const response = await api.post(`/admin/auctions/${auctionId}/pause`, {
    reason,
    requestId,
  });
  return response.data.data;
};

export const resumeAdminAuction = async ({ auctionId, reason, requestId }) => {
  const response = await api.post(`/admin/auctions/${auctionId}/resume`, {
    reason,
    requestId,
  });
  return response.data.data;
};

// 담당자 7 · F-AUC-013/F-OPS-003: 경매 관리의 AUCG02 입찰 단위 읽기·쓰기 계약입니다.
export const fetchAdminBidUnits = async () => {
  const response = await api.get('/admin/auctions/bid-units');
  return response.data.data;
};

export const saveAdminBidUnit = async ({ bidUnitSn, payload }) => {
  const path = `/admin/auctions/bid-units${bidUnitSn ? `/${bidUnitSn}` : ''}`;
  const response = await api[bidUnitSn ? 'put' : 'post'](path, payload);
  return response.data.data;
};

export const changeAdminBidUnitStatus = async ({ bidUnitSn, payload }) => {
  const response = await api.put(`/admin/auctions/bid-units/${bidUnitSn}/status`, payload);
  return response.data.data;
};

export const reorderAdminBidUnits = async (bidUnitSnOrder) => {
  const response = await api.put('/admin/auctions/bid-units/reorder', { bidUnitSnOrder });
  return response.data.data;
};
