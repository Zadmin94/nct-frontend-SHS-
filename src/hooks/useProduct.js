// src/hooks/useProduct.js
// 상품(판매) 조회 훅 (usePoint.js/useBid.js 관례 동일)
// PRODUCT는 담당자2 고정 소유 - 여기서는 담당자2가 이미 만들어 둔 GET /api/products/me만 소비한다.
import { useQuery } from '@tanstack/react-query';

import { getMyProducts, getMyProductsSummary } from '../api/productApi';

/** 내 판매 목록 (페이지네이션) — data: { list, page, size, total, totalPages } */
export function useMyProducts(page = 1, size = 10, filterType = null) {
  return useQuery({
    queryKey: ['products', 'my', page, size, filterType],
    queryFn: () => getMyProducts(page, size, filterType),
    select: (res) => res.data,
  });
}

/** 내 판매 목록 필터 탭 개수 — data: { total, draft, reserved, active, trading, dispute, closed } */
export function useMyProductsSummary() {
  return useQuery({
    queryKey: ['products', 'my', 'summary'],
    queryFn: () => getMyProductsSummary(),
    select: (res) => res.data,
  });
}
