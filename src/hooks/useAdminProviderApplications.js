import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveProviderApplication,
  fetchAdminProviderApplications,
  rejectProviderApplication,
  restoreProviderPermission,
  stopProviderPermission,
} from '@api/providerApplicationApi';

export const adminProviderApplicationKeys = {
  all: ['admin-provider-applications'],
  list: (statusCode) => [...adminProviderApplicationKeys.all, 'list', statusCode || 'all'],
};

export const useAdminProviderApplications = (statusCode) => useQuery({
  queryKey: adminProviderApplicationKeys.list(statusCode),
  queryFn: () => fetchAdminProviderApplications({ statusCode }),
});

const useProviderDecision = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminProviderApplicationKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }),
      ]);
    },
  });
};

export const useApproveProviderApplication = () => useProviderDecision(approveProviderApplication);
export const useRejectProviderApplication = () => useProviderDecision(rejectProviderApplication);
export const useStopProviderPermission = () => useProviderDecision(stopProviderPermission);
export const useRestoreProviderPermission = () => useProviderDecision(restoreProviderPermission);
