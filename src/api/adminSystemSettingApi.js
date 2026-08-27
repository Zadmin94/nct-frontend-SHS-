// Claude Code 작성 (BJN, 2026-07-18)
// src/api/adminSystemSettingApi.js
// 시스템 설정 관리자 API 모듈 (담당자6 BJN, F-OPS-024)
import api from './axios';

/** 전체 시스템 설정 조회 — SYSTEM_SETTING 단일 행 */
export const getSystemSetting = () =>
  api.get('/admin/system-setting').then(res => res.data);

/**
 * 전체 시스템 설정 저장 — 단일 행 전체 덮어쓰기 계약 (알림 설정과 같은 방식)
 * 허용 범위 밖 값은 서버가 400으로 거절하고 아무것도 저장하지 않는다
 */
export const updateSystemSetting = (setting) =>
  api.put('/admin/system-setting', setting).then(res => res.data);
