import api from './axios';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';

/** 담당자 7 · F-OPS-007: 관리자 신고 전체·상태별 목록, 상세, 처리 계약입니다. */
export const getAdminReports = ({
  statusCode,
  keyword,
  caseType = 'ALL',
  page,
  size = ADMIN_PAGE_SIZE,
}) =>
  api.get('/admin/reports/search', {
    params: {
      ...(statusCode ? { statusCode } : {}),
      ...(keyword ? { keyword } : {}),
      ...(caseType && caseType !== 'ALL' ? { caseType } : {}),
      page,
      size,
    },
  }).then((response) => response.data.data);

export const getAdminReport = (reportSn) =>
  api.get(`/admin/reports/${reportSn}`).then((response) => response.data.data);

export const decideAdminReport = ({
  reportSn,
  decision,
  tradeDecision = null,
  enforcementAction = 'NONE',
  reason,
}) =>
  api.post(`/admin/reports/${reportSn}/decision`, {
    decision,
    tradeDecision,
    enforcementAction,
    reason,
  })
    .then((response) => response.data);

export const releaseAdminReportSanction = ({ reportSn, reason }) =>
  api.post(`/admin/reports/${reportSn}/sanction/release`, { reason })
    .then((response) => response.data);

/** 담당자 7 · F-OPS-007/015: 열람 사유와 함께 신고 첨부 원문을 요청합니다. */
export const getAdminReportFileBlob = ({ reportSn, fileSn, reason }) => api.post(
  `/admin/reports/${reportSn}/files/${fileSn}/download`,
  { reason },
  { responseType: 'blob' },
);
