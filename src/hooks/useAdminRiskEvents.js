import { useQuery } from '@tanstack/react-query';
import { getAdminRiskEvents, getAdminRiskEventSummary } from '@api/adminRiskEventApi';

/** 담당자 7 · F-OPS-011: 필터가 바뀌면 관리자 위험 이벤트 목록을 다시 읽습니다. */
export const useAdminRiskEvents = (filters) => useQuery({
  queryKey: ['admin', 'risk-events', filters],
  queryFn: () => getAdminRiskEvents(filters),
  select: (response) => response.data,
});

/** 담당자 7 · F-OPS-011: 처리 상태·기간별 유형 집계를 읽습니다. */
export const useAdminRiskEventSummary = (filters = {}) => useQuery({
  queryKey: ['admin', 'risk-events', 'summary', filters],
  queryFn: () => getAdminRiskEventSummary(filters),
  select: (response) => response.data,
});
