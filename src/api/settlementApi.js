// src/api/settlementApi.js
// 정산 API 모듈 (담당자6 BJN)
// - pointApi.js 관례대로 res.data(=ApiResponse)까지 벗겨서 반환
import api from './axios';

/** 내 정산 목록 조회 (최신순 100건) */
export const getSettlementList = () =>
  api.get('/settlement').then(res => res.data);
