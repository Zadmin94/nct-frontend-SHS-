// src/api/notificationApi.js
// 알림 API 모듈 (담당자6 BJN)
import api from './axios';

/** 내 알림 목록 조회 (최신순 100건) */
export const getNotifications = () =>
  api.get('/notification').then(res => res.data);

/** 개별 읽음 처리 — 서버가 본인 알림인지 검증하므로 남의 id는 무시된다 */
export const markNotificationRead = (id) =>
  api.patch(`/notification/${id}/read`).then(res => res.data);

/** 전체 읽음 처리 */
export const markAllNotificationsRead = () =>
  api.patch('/notification/read-all').then(res => res.data);

/** 알림 수신 설정 조회 (F-COM-012 세분화, 2026-07-24) — data: { events: [{eventCode, domain, label, inapp, email}, ...] }
 *  저장한 적 없는 이벤트는 서버가 기본값(true)을 내려준다 */
export const getNotificationSettings = () =>
  api.get('/notification/settings').then(res => res.data);

/** 알림 수신 설정 저장 — 이벤트 13개를 전부 보내는 전체 덮어쓰기 계약 */
export const saveNotificationSettings = (settings) =>
  api.put('/notification/settings', settings).then(res => res.data);
