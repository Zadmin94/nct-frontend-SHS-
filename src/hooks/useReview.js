// src/hooks/useReview.js
// 리뷰 조회 훅 (usePoint.js/useSettlement.js 관례 동일)
import { useQuery } from '@tanstack/react-query';

import { getWritableReviews, getMyReviews, getMyTradeReview, getCounterpartTradeReview } from '../api/reviewApi';

// @ai_generated: 리뷰 도메인의 조회·무효화 키를 한 계약으로 유지한다.
export const reviewQueryKeys = {
  all: ['reviews'],
  writable: ['reviews', 'writable'],
  my: ['reviews', 'my'],
  trade: (tradeId) => ['reviews', 'trade', String(tradeId)],
  counterpartTrade: (tradeId) => ['reviews', 'counterpart-trade', String(tradeId)],
};

/** 작성 가능한 리뷰 목록 — data: [{ id, thumbnail, title, dealType, partyLabel, partyName, completedDate }] */
export function useWritableReviews({ enabled = true } = {}) {
  return useQuery({
    queryKey: reviewQueryKeys.writable,
    queryFn: getWritableReviews,
    select: (res) => res.data,
    enabled,
  });
}

/** 내가 작성한 리뷰 목록 — data: [{ id, tradeId, rating, content, title, dealType, partyLabel, partyName, completedDate, photos }] */
export function useMyReviews() {
  return useQuery({
    queryKey: reviewQueryKeys.my,
    queryFn: getMyReviews,
    select: (res) => res.data,
  });
}

/** 거래 상세에서 현재 사용자의 리뷰 상태와 작성 내용을 조회한다. */
export function useMyTradeReview(tradeId) {
  return useQuery({
    queryKey: reviewQueryKeys.trade(tradeId),
    queryFn: () => getMyTradeReview(tradeId),
    enabled: Boolean(tradeId),
    select: (response) => response?.data ?? response,
  });
}

/** 거래 상세에서 상대방이 나에 대해 작성한 리뷰를 조회한다. */
export function useCounterpartTradeReview(tradeId) {
  return useQuery({
    queryKey: reviewQueryKeys.counterpartTrade(tradeId),
    queryFn: () => getCounterpartTradeReview(tradeId),
    enabled: Boolean(tradeId),
    select: (response) => response?.data ?? response,
  });
}
