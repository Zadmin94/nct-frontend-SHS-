// Claude Code 작성 (BJN, 2026-07-19)
// src/hooks/useAdminNotification.js
// 관리자 알림함 훅 (TanStack Query, 담당자6 BJN, F-COM-004/005)
import { useQuery } from '@tanstack/react-query';

import { getAdminNotificationSummary } from '../api/adminNotificationApi';

/** 관리자 알림함 요약 — data: { userProvider, report, auctionService, exchangeSystem } */
export function useAdminNotificationSummary() {
  return useQuery({
    queryKey: ['admin', 'notifications', 'summary'],
    queryFn: getAdminNotificationSummary,
    select: (res) => res.data,
  });
}
