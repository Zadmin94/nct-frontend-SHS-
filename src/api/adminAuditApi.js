// Claude Code 작성 (BJN, 2026-07-18)
// src/api/adminAuditApi.js
// 감사로그 관리자 API 모듈 (담당자6 BJN, F-OPS-014/016)
import api from './axios';

/**
 * 감사로그 조건별 조회 — 조건은 전부 선택 사항
 * @param {{usrSn?: number, typeCd?: string, from?: string, to?: string, limit?: number}} params
 *        from/to는 'YYYY-MM-DD' — 서버가 from은 그날 0시, to는 그날 끝까지로 해석한다
 */
export const getAuditLogs = (params = {}) =>
  api.get('/admin/audit/logs', { params }).then(res => res.data);

/** 담당자 7 · F-OPS-016: 관리자 상세 화면의 주 대상·연관 대상 처리 이력입니다. */
export const getAuditHistory = ({ refType, refSn, limit = 100 }) =>
  api.get('/admin/audit/history', {
    params: { refType, refSn, limit },
    skipServerErrorRedirect: true,
  })
    .then(res => res.data.data);

/** 담당자 7 · F-OPS-005/014: 거래 신고에 연결된 채팅 내역을 사유와 함께 제한 조회합니다. */
export const requestReportChatView = (reportSn, body) =>
  api.post(`/admin/audit/reports/${reportSn}/chat-view`, body)
    .then(res => res.data.data);
