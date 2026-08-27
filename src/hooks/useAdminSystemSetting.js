// Claude Code 작성 (BJN, 2026-07-18)
// src/hooks/useAdminSystemSetting.js
// 시스템 설정 관리자 훅 (TanStack Query, 담당자6 BJN, F-OPS-024)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSystemSetting, updateSystemSetting } from '../api/adminSystemSettingApi';

/** 전체 시스템 설정 조회 — data: { sysSetSn, aucExtMin, ..., emailYn } */
export function useSystemSetting() {
  return useQuery({
    queryKey: ['admin', 'system-setting'],
    queryFn: getSystemSetting,
    select: (res) => res.data,
  });
}

/** 전체 시스템 설정 저장 — mutate(setting). 저장 성공 시 설정·감사로그 캐시를 갱신한다 */
export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSystemSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-setting'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }); // 목록과 대상별 이력을 함께 갱신한다
    },
  });
}
