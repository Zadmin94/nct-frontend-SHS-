// src/hooks/useServiceRequest.js
// 내 서비스 요청서 조회 훅 (useProduct.js 관례 동일)
import { useQuery } from '@tanstack/react-query';

import { getMyServiceRequests } from '../api/serviceRequestApi';

/** 내 서비스 요청 목록 (페이지네이션) — data: { list, page, size, total, totalPages } */
export function useMyServiceRequests(page = 1, size = 10, filterType = null) {
  return useQuery({
    queryKey: ['serviceRequests', 'my', page, size, filterType],
    queryFn: () => getMyServiceRequests(page, size, filterType),
    select: (res) => res.data,
  });
}
