// src/api/productApi.js
// ─────────────────────────────────────────────────────────────────────────────
// 상품 API — 상품 등록 · 내 판매 목록 조회 · 상품 상세 조회 · 상품 삭제
//             금지 키워드 · 추가 공지(코멘트)
//             ProductRegisterPage / MyProductList / ProductDetailSellerPage 에서 사용
// ─────────────────────────────────────────────────────────────────────────────
import api from './axios';

/** 상품 등록 */
export const registerProduct = (data) =>
  api.post('/products', data).then(res => res.data);

/** 내 판매 목록 — filterType: DRAFT | RESERVED | ACTIVE | TRADING | DONE | CANCELED | ENDED | null(전체) */
export const getMyProducts = (page = 1, size = 10, filterType = null) =>
  api.get('/products/me', { params: { page, size, ...(filterType ? { filterType } : {}) } }).then(res => res.data);

/** 내 판매 목록 필터 탭 개수 — 목록 데이터 없이 개수만 (요약 카드·필터 탭 배지 전용) */
export const getMyProductsSummary = () =>
  api.get('/products/me/summary').then(res => res.data);

/** 상품 상세 조회 */
export const getProduct = (prdSn) =>
  api.get(`/products/${prdSn}`).then(res => res.data);

/** 상품 상세 진입 조회수 증가 */
export const increaseProductViewCount = (prdSn) =>
  api.post(`/products/${prdSn}/view`, null, { skipServerErrorRedirect: true }).then(res => res.data);

/** 임시저장 상품 수정 및 등록 전환 */
export const updateProduct = (prdSn, data) =>
  api.put(`/products/${prdSn}`, data).then(res => res.data);

/** 상품 삭제 */
export const deleteProduct = (prdSn) =>
  api.delete(`/products/${prdSn}`).then(res => res.data);

/** 금지 키워드 목록 조회 (F-AUC-004) */
export const fetchBannedKeywords = () =>
  api.get('/products/banned-keywords').then(res => res.data);

/** 추가 공지 등록 — 판매자 전용 (F-AUC-007) */
export const postProductComment = (prdSn, data) =>
  api.post(`/products/${prdSn}/comments`, data).then(res => res.data);

/** 추가 공지 목록 조회 — 최신 4개, 비로그인 포함 (F-AUC-007) */
export const fetchProductComments = (prdSn) =>
  api.get(`/products/${prdSn}/comments`).then(res => res.data);

/** 구매자 문의 목록 조회 (F-AUC-012) */
export const fetchProductInquiries = (prdSn) =>
  api.get(`/products/${prdSn}/inquiries`).then(res => res.data);

/** 구매자 문의 등록 (F-AUC-012) */
export const postProductInquiry = (prdSn, data) =>
  api.post(`/products/${prdSn}/inquiries`, data).then(res => res.data);

/** 구매자 문의 수정 — 작성자 본인, 판매자 답변 전까지만 가능 (F-AUC-012) */
export const updateProductInquiry = (prdSn, inquirySn, data) =>
  api.patch(`/products/${prdSn}/inquiries/${inquirySn}`, data).then(res => res.data);

/** 판매자 답변 등록 (F-AUC-012) */
export const postInquiryReply = (prdSn, inquirySn, data) =>
  api.post(`/products/${prdSn}/inquiries/${inquirySn}/reply`, data).then(res => res.data);

/** 판매자 답변 수정 — 등록 후 10분 이내만 가능 (F-AUC-012) */
export const updateInquiryReply = (prdSn, inquirySn, data) =>
  api.patch(`/products/${prdSn}/inquiries/${inquirySn}/reply`, data).then(res => res.data);

/** 문의(prdCmtSn) → 상품(prdSn) 변환 — 문의 등록/답변 알림 클릭 이동용 */
export const getProductSnByInquirySn = (prdCmtSn) =>
  api.get(`/products/inquiries/${prdCmtSn}`).then(res => res.data);
