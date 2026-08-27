// src/hooks/useBid.js
// 입찰 조회 훅 (usePoint.js/useReview.js 관례 동일)
import { useQuery } from '@tanstack/react-query';

import { getMyBidHistory } from '../api/bidApi';

/**
 * 내 입찰 내역 — data: [{ bidSn, aucSn, bidAmount, bidStatusCode, auctionStatusCode, displayStatus }].
 * @ai_generated (260809): 통합 구매 목록에서 입찰 조회를 선택적으로 켜기 위한 enabled 계약.
 */
export function useMyBidHistory({ refetchInterval, enabled = true } = {}) {
  return useQuery({
    queryKey: ['bids', 'my'],
    queryFn: getMyBidHistory,
    select: (res) => res.data,
    refetchInterval,
    enabled,
  });
}
