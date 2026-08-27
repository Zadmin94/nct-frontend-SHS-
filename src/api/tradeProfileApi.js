import api from './axios';

/** 담당자 7 · 공개 거래 프로필: 민감정보를 제외한 회원 표시 정보만 조회합니다. */
export const getTradeProfile = (userSn) => (
  api.get(`/users/${userSn}/profile`, { skipServerErrorRedirect: true })
    .then((response) => response.data.data)
);
