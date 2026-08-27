import api from './axios';

/** 담당자 7 · F-OPS-010: 관리자 운영 대시보드 집계 API입니다. */
export const getAdminDashboardSummary = () =>
  api
    .get('/admin/dashboard/summary', { skipServerErrorRedirect: true })
    .then((response) => response.data);
