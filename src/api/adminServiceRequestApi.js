import api from './axios';

// 담당자 7: 관리자 서비스 요청 목록·상세의 읽기 전용 API 계약이다.
export const fetchAdminServiceRequests = async (params) => {
  const response = await api.get('/admin/service-requests', { params });
  return response.data.data;
};

export const fetchAdminServiceRequestDetail = async (serviceRequestId) => {
  const response = await api.get(`/admin/service-requests/${serviceRequestId}`, {
    skipServerErrorRedirect: true,
  });
  return response.data.data;
};

export const cancelAdminServiceRequest = async ({ serviceRequestId, reason, requestId }) => {
  const response = await api.post(`/admin/service-requests/${serviceRequestId}/cancel`, {
    reason,
    requestId,
  });
  return response.data.data;
};

export const changeAdminServiceRequestVisibility = async ({
  serviceRequestId,
  visible,
  reason,
  requestId,
}) => {
  const response = await api.post(`/admin/service-requests/${serviceRequestId}/visibility`, {
    visible,
    reason,
    requestId,
  });
  return response.data.data;
};

export const invalidateAdminQuote = async ({
  serviceRequestId,
  quoteId,
  reason,
  requestId,
}) => {
  const response = await api.post(
    `/admin/service-requests/${serviceRequestId}/quotes/${quoteId}/invalidate`,
    { reason, requestId },
  );
  return response.data.data;
};
