import { useQuery } from '@tanstack/react-query';
import { getAdminDashboardSummary } from '@api/adminDashboardApi';

/** 담당자 7 · F-OPS-010: 관리자 운영 현황을 한 번에 조회합니다. */
export const useAdminDashboardSummary = () => useQuery({
  queryKey: ['admin', 'dashboard', 'summary'],
  queryFn: getAdminDashboardSummary,
  select: (response) => response.data,
});
