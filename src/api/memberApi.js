// src/api/memberApi.js
// 회원 프로필 수정·탈퇴 관련 API 요청 관리 파일 (F-AUTH-010·011).
// `api`(Axios 인스턴스)를 사용해 /api/member/** 호출.
import api from './axios';

/** 프로필 기본 정보 상세 조회 (ISS-022 - 마이페이지 초기값 표시용) */
export const getProfile = () =>
  api.get('/member/me').then(res => res.data);

/** 프로필 기본 정보 수정 (닉네임·프로필사진·연락이메일·계좌번호·전화번호·주소) */
export const updateProfile = (payload) =>
  api.patch('/member/me', payload).then(res => res.data);

/** 로그인 회원의 사용 중인 배송지 목록 */
export const getDeliveryAddresses = async () => {
  const response = await api.get('/member/me/delivery-addresses');
  return response.data.data;
};

/** 경매 배송 거래에 사용할 배송지 등록 */
export const createDeliveryAddress = async (payload) => {
  const response = await api.post('/member/me/delivery-addresses', payload);
  return response.data.data;
};

export const updateDeliveryAddress = async (deliveryAddressId, payload) => {
  const response = await api.patch(`/member/me/delivery-addresses/${deliveryAddressId}`, payload);
  return response.data.data;
};

export const deleteDeliveryAddress = async (deliveryAddressId) => {
  await api.delete(`/member/me/delivery-addresses/${deliveryAddressId}`);
};

export const setDefaultDeliveryAddress = async (deliveryAddressId) => {
  const response = await api.patch(`/member/me/delivery-addresses/${deliveryAddressId}/default`);
  return response.data.data;
};

/** 로그인 상태 비밀번호 변경 (ISS-022 - 현재 비밀번호 재확인 필요) */
export const changePassword = (payload) =>
  api.patch('/member/me/password', payload).then(res => res.data);

/** 마이페이지 소셜 연동 목록 조회 (F-AUTH-016) */
export const getOauthLinks = () =>
  api.get('/member/oauth-links').then(res => res.data);

/** 마이페이지 소셜 연동 해제 (F-AUTH-016) */
export const unlinkOauth = (provider) =>
  api.delete(`/member/oauth-links/${provider}`).then(res => res.data);

/** 회원 탈퇴 - 활성 계정(로그인 상태 + 현재 비밀번호 재확인) */
export const withdrawActive = (currentPassword) =>
  api.post('/member/me/withdraw', { currentPassword }).then(res => res.data);

// @ai_generated: F-AUTH-011 - 정지 계정 전용. 계정 상태와 무관하게 항상 동일한 성공 응답을 준다.
/** 정지 계정용 탈퇴 확인 링크 발송 */
export const requestWithdrawal = (params) =>
  api.post('/member/withdrawal-links', params).then(res => res.data);

/** 정지 계정용 탈퇴 확정 (이메일 링크의 토큰) */
export const confirmWithdrawal = (token) =>
  api.post('/member/withdrawal-links/confirm', { token }).then(res => res.data);
