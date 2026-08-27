import api from './axios';

/** F-SVC-005: 견적 제출 */
export const submitQuote = (data) =>
  api.post('/quotes', data).then((res) => res.data);

/** F-SVC-006: 견적 수정 */
export const updateQuote = (quoteId, data) =>
  api.put(`/quotes/${quoteId}`, data).then((res) => res.data);

/** 견적 작업사진 업로드 — 파일 1장당 1회 호출, 반환값 { flSn, url } */
export const uploadQuotePhoto = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('service', 'quote');
  return api.post('/attachment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data.data);
};

/** F-SVC-008: 견적 철회 */
export const withdrawQuote = (quoteId) =>
  api.delete(`/quotes/${quoteId}`).then((res) => res.data);

/** 내 견적 목록 (제공자) */
export const getMyQuotes = (params) =>
  api.get('/quotes/me', { params, skipServerErrorRedirect: true }).then((res) => res.data);

/** 담당자 7 연결 · F-SVC-005~008: 제공자 본인 견적 상세 조회 */
export const getMyQuote = (quoteId) =>
  api.get(`/quotes/me/${quoteId}`, { skipServerErrorRedirect: true }).then((res) => res.data);

/** 제공자 대시보드용 활성 견적 수 조회 */
export const getMyQuoteSummary = () =>
  api.get('/quotes/me/summary', { skipServerErrorRedirect: true }).then((res) => res.data);

/** 현재 제공자의 특정 서비스 요청 활성 견적 조회 */
export const getMyActiveQuote = (svcReqSn) =>
  api.get(`/quotes/me/service-request/${svcReqSn}`, { skipServerErrorRedirect: true }).then((res) => res.data);

/** 견적 수정 이력 조회 */
export const getQuoteHistory = (quoteId) =>
  api.get(`/quotes/${quoteId}/history`).then((res) => res.data);

/** 받은 견적 목록 조회 (요청자용) */
export const getReceivedQuotes = (svcReqSn) =>
  api.get(`/quotes/service-request/${svcReqSn}`).then((res) => res.data);

/** F-SVC-010: 요청자 견적 선택과 서비스 거래·보관금 생성을 한 번에 처리한다. */
export const selectQuoteAndCreateTrade = (svcReqSn, quoteId) =>
  api.post(`/service-requests/${svcReqSn}/quotes/${quoteId}/select`).then((res) => res.data);

/**
 * F-SVC-006: 견적 첨부파일을 인증 쿠키 포함 요청으로 Blob 수신.
 * 보호된 엔드포인트(/api/quotes/{id}/attachments/{flSn})는 <img src> 직접 사용 시
 * 브라우저가 쿠키를 포함하지 않아 401이 발생하므로 axios로 받아 Object URL로 변환한다.
 */
export const getQuoteAttachmentBlob = (quoteId, flSn) =>
  api.get(`/quotes/${quoteId}/attachments/${flSn}`, { responseType: 'blob' });
