import api from './axios';

// 담당자 7 · F-PROV-004: 제공자 본인 프로필과 공개 프로필 조회 계약이다.
export const fetchMyProviderProfile = () =>
  api.get('/providers/me/profile').then((response) => response.data.data);

export const updateMyProviderProfile = ({ introduction, availableArea, profileFileSn }) =>
  api.put('/providers/me/profile', { introduction, availableArea, profileFileSn })
    .then((response) => response.data.data);

/** 제공자 본인의 카테고리별 견적 작성 승인 여부를 서버 기준으로 확인한다. */
export const fetchMyProviderQuoteAccess = (categorySn) =>
  api.get(`/providers/me/categories/${categorySn}/quote-access`)
    .then((response) => response.data.data);

export const fetchPublicProviderProfile = (providerUserSn) =>
  api.get(`/providers/${providerUserSn}/profile`).then((response) => response.data.data);

// 담당자 7 · F-PROV-005: 본인 관리와 공개 프로필에서 같은 포트폴리오 계약을 소비한다.
export const fetchMyPortfolios = () =>
  api.get('/providers/me/portfolios').then((response) => response.data.data);

export const createPortfolio = ({ title, content, fileIds }) =>
  api.post('/providers/me/portfolios', { title, content, fileIds })
    .then((response) => response.data.data);

export const updatePortfolio = ({ portfolioSn, title, content, fileIds }) =>
  api.put(`/providers/me/portfolios/${portfolioSn}`, { title, content, fileIds })
    .then((response) => response.data.data);

export const deletePortfolio = (portfolioSn) =>
  api.delete(`/providers/me/portfolios/${portfolioSn}`);

export const fetchPublicPortfolios = (providerUserSn) =>
  api.get(`/providers/${providerUserSn}/portfolios`).then((response) => response.data.data);
