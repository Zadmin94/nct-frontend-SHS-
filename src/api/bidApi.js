// src/api/bidApi.js
// 입찰 관련 백엔드 API 요청 관리 파일 (F-AUC-022 내 입찰 내역).
// BID/AUCTION 테이블은 담당자5 고정 소유 — 이 엔드포인트는 담당자5가 제공한 조회 계약이다.
import api from './axios';

/** 내 입찰 내역 조회 (경매 종료 여부와 무관하게 전체 이력) */
export const getMyBidHistory = () =>
  api.get('/bids/me').then(res => res.data);
