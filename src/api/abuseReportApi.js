import api from './axios';

export const fetchActiveManualAbuseReportReferences = (
  referenceTypeCode,
  referenceSns,
) => api.get('/abuse-reports/references/statuses', {
  params: {
    referenceTypeCode,
    referenceSns: referenceSns.join(','),
  },
}).then((response) => response.data);

/** F-COM-018: 고객센터형 신고 접수 */
export const submitCustomerReport = (data) =>
  api.post('/abuse-reports/customer', data).then((res) => res.data);

export const submitTradeReport = (tradeId, data) =>
  api.post(`/trades/${tradeId}/reports`, data).then((res) => res.data);

/** 구매자 문의 신고 — targetType: 'INQUIRY', targetSn: prdCmtSn, reportContent */
export const submitInquiryReport = (data) =>
  api.post('/customer-support/reports', data).then((res) => res.data);

/** F-COM-018: 내 신고 목록 (페이지네이션) — status: ABSC0001~0004 | FINISHED | null(전체) */
export const getMyReports = (params) =>
  api.get('/abuse-reports/me', { params, skipServerErrorRedirect: true }).then((res) => res.data);

/** F-COM-018: 내 신고 단건 상세 */
export const getMyReportDetail = (reportSn) =>
  api.get(`/abuse-reports/me/${reportSn}`).then((res) => res.data);

/** 담당자 7 · F-COM-018: 본인 신고에 연결된 보호 첨부를 Blob으로 받습니다. */
export const getMyReportFileBlob = (reportSn, fileSn) => api.get(
  `/abuse-reports/me/${reportSn}/files/${fileSn}/download`,
  { responseType: 'blob' },
);
