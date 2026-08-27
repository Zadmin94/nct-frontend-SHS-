import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyProviderApplications, submitProviderApplication } from '@api/providerApplicationApi';

export const providerApplicationKeys = {
  all: ['provider-applications'],
  mine: () => [...providerApplicationKeys.all, 'mine'],
};

// 담당자 7 · F-PROV-006/012/014
// 마이페이지와 신청 상태 화면에서 같은 "내 제공자 신청 목록"을 읽도록 만든 공용 훅입니다.
export const useMyProviderApplications = ({ enabled = true } = {}) => useQuery({
  queryKey: providerApplicationKeys.mine(),
  queryFn: fetchMyProviderApplications,
  enabled,
});

export const useSubmitProviderApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitProviderApplication,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: providerApplicationKeys.all }),
  });
};
