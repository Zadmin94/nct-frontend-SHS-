import api from './axios';

/** 담당자 7 · F-OPS-011: 관리자 위험 이벤트 목록·유형별 집계 API입니다. */
export const getAdminRiskEvents = (params = {}) =>
  api.get('/admin/risk-events', { params }).then((res) => res.data);

export const getAdminRiskEventSummary = (params = {}) =>
  api.get('/admin/risk-events/summary', { params }).then((res) => res.data);
