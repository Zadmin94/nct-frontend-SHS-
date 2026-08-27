// Claude Code 작성 (BJN, 2026-07-19)
// src/api/adminNotificationApi.js
// 관리자 알림함 API 모듈 (담당자6 BJN, F-COM-004/005)
import api from './axios';

/**
 * 관리자 알림함 요약 조회 — 탭별(회원·제공자/신고·거래문제/경매·서비스/환전·시스템) 카드 목록
 * data: { userProvider, report, auctionService, exchangeSystem }
 *   각 배열 원소: { title, detail, linkPath? }
 */
export const getAdminNotificationSummary = () =>
  api.get('/admin/notifications/summary').then(res => res.data);
