// src/api/reviewApi.js
// 리뷰 관련 백엔드 API 요청 관리 파일.
// API 호출 함수를 만들어 타 파일에서도 사용할 수 있게 내보냄.
import api from './axios';

const MULTIPART_CONFIG = { headers: { 'Content-Type': 'multipart/form-data' } };

/** 작성 가능한 리뷰 목록 (완료 거래 중 아직 리뷰를 안 쓴 것) */
export const getWritableReviews = () =>
  api.get('/reviews/writable').then(res => res.data);

/** 담당자 7 · F-COM-009: 물품 또는 서비스 한 도메인의 리뷰 평균과 건수만 조회한다. */
export const getUserReviewTrust = (userId, dealType) => (
  api.get(`/reviews/trust/${userId}`, { params: { dealType } }).then(res => res.data)
);

/** 물건·서비스 거래 유형을 구분한 상대방의 받은 리뷰 목록을 페이지 단위로 조회한다. */
export const getUserReviews = (userId, params) => (
  api.get(`/reviews/user/${userId}`, { params }).then(res => res.data)
);

/** 리뷰 등록 */
export const createReview = (data) =>
  api.post('/reviews', data, MULTIPART_CONFIG).then(res => res.data);

/** 리뷰 수정 (multipart/form-data: rating, content, photos) */
export const updateReview = (id, data) =>
  api.put(`/reviews/${id}`, data, MULTIPART_CONFIG).then(res => res.data);

/** 리뷰 삭제 */
export const deleteReview = (id) =>
  api.delete(`/reviews/${id}`).then(res => res.data);

/** 내가 작성한 리뷰 목록 */
export const getMyReviews = () =>
  api.get('/reviews/me').then(res => res.data);

// @ai_generated
/** 거래 상세에서 현재 사용자의 작성 가능 여부와 작성한 리뷰를 함께 조회한다. */
export const getMyTradeReview = (tradeId) =>
  api.get(`/trades/${tradeId}/reviews/me`).then(res => res.data);

// @ai_generated
/** 거래 상세에서 상대방이 나에 대해 작성한 리뷰를 조회한다. */
export const getCounterpartTradeReview = (tradeId) =>
  api.get(`/trades/${tradeId}/reviews/counterpart`).then(res => res.data);

// @ai_generated
/** 기존 reviewId 수정 URL을 auctionId 기반 신규 URL로 전환할 최소 컨텍스트를 조회한다. */
export const getMyReviewRouteContext = (reviewId) =>
  api.get(`/reviews/${reviewId}/context`).then(res => res.data);
