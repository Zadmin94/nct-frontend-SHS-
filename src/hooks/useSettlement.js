// src/hooks/useSettlement.js
// 정산 조회 훅 (usePoint.js 관례 동일)
import { useQuery } from '@tanstack/react-query';

import { getSettlementList } from '../api/settlementApi';

/** 내 정산 목록 — data: [{ id, tradeId, amount, statusCd, statusName, regDate }] */
export function useSettlementList() {
  return useQuery({
    queryKey: ['settlement', 'list'],
    queryFn: getSettlementList,
    select: (res) => res.data,
  });
}
