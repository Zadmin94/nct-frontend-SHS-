// src/api/authApi.js
// 인증, 회원 관련 백엔드 API 요청 관리 파일.
// API 호출 함수를 만들어 타 파일에서도 사용할 수 있게 내보냄.
// `api`(Axios 인스턴스)를 사용해 인증 API 호출.
import api from './axios';

/** 로그인 */
export const login = (credentials) =>
  api.post('/auth/login', credentials).then(res => res.data);

/** 담당자 7 · F-OPS-001: 관리자 전용 로그인 */
export const adminLogin = (credentials) =>
  api.post('/auth/admin/login', credentials).then(res => res.data);

/** 로그아웃 */
export const logout = () =>
  api.post('/auth/logout').then(res => res.data);

// @ai_generated CHG-032/F-PROV-015 - 담당자2의 모드 전환 화면이 공통 AUTH API를 소비하는 계약.
export const switchMode = (to) =>
  api.post('/auth/mode', null, { params: { to } }).then(res => res.data);

/** 회원가입 */
export const signup = (userData) =>
  api.post('/auth/signup', userData).then(res => res.data);

/** 내 정보 조회 */
export const getMyInfo = () =>
  api.get('/auth/me').then(res => res.data);

/** 아이디 찾기 (F-AUTH-014) */
export const findEmail = (params) =>
  api.post('/auth/find-email', params).then(res => res.data);

// @ai_generated: F-AUTH-007 - 계정 상태와 무관하게 항상 동일한 성공 응답을 주는 API라
// skipServerErrorRedirect 등은 불필요하다(429 재발송 제한만 화면에서 그대로 노출).
/** 비밀번호 재설정 링크 발송 */
export const requestPasswordReset = (params) =>
  api.post('/auth/password-reset-links', params).then(res => res.data);

/** 비밀번호 재설정 확정 (이메일 링크의 토큰 + 새 비밀번호) */
export const confirmPasswordReset = (params) =>
  api.post('/auth/password-reset-links/confirm', params).then(res => res.data);

/** 이메일 중복 확인 */
export const checkEmail = (email) =>
  api.get('/auth/check-email', { params: { email } }).then(res => res.data);

// @ai_generated: 로그인 ID와 이메일이 분리된 가입 계약의 사전 중복 확인 API.
/** 로그인 ID 중복 확인 */
export const checkLoginId = (loginId) =>
  api.get('/auth/check-login-id', { params: { loginId } }).then(res => res.data);

// @ai_generated: 가입 인증 메일의 503은 가입 화면에서 재시도 안내를 보여주도록 공통 이동을 생략한다.
/** 가입 이메일 인증번호 발송·재발송 */
export const sendSignupEmailVerification = (payload) =>
  api.post('/auth/email-verifications', payload, { skipServerErrorRedirect: true })
    .then(res => res.data);

/** 가입 이메일 인증번호 확인 */
export const verifySignupEmailVerification = (verificationId, payload) =>
  // @ai_generated: 잘못된 인증번호의 401은 토큰 만료가 아니라 화면 안에서 안내할 업무 오류다.
  api.post(`/auth/email-verifications/${verificationId}/verify`, payload, { skipAuthRefresh: true })
    .then(res => res.data);

/** 닉네임 중복 확인 */
export const checkNickname = (nickname) =>
  api.get('/auth/check-nickname', { params: { nickname } }).then(res => res.data);

// @ai_generated: 작업단위5(F-AUTH-004 온보딩, ISS-009) - 소셜 최초 가입 온보딩
/** 온보딩 화면 진입값 조회 (닉네임 기본값·provider) */
export const getOauthOnboardingPending = () =>
  api.get('/auth/oauth-onboarding/pending').then(res => res.data);

/** 온보딩 완료 (약관 동의 + 닉네임 확정) */
export const completeOauthOnboarding = (payload) =>
  api.post('/auth/oauth-onboarding/complete', payload).then(res => res.data);
