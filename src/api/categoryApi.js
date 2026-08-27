// src/api/categoryApi.js
// ─────────────────────────────────────────────────────────────────────────────
// 카테고리 API — 상품 카테고리 목록 조회
//                ProductRegisterPage 카테고리 선택 칩에서 사용
//                domainCd 'CATC0001' = 물건 카테고리
// ─────────────────────────────────────────────────────────────────────────────
import api from './axios';

/** 카테고리 목록 조회 (domainCd: 'CATC0001' = 물건) */
export const getCategories = (domainCd) =>
  api.get('/categories', { params: { domainCd } }).then(res => res.data);
