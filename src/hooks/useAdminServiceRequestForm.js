import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  discardAdminServiceRequestFormDraft,
  fetchAdminServiceRequestForm,
  publishAdminServiceRequestForm,
  saveAdminServiceRequestFormDraft,
} from '@api/adminServiceRequestFormApi';

const keys = {
  detail: (categorySn) => ['admin-service-request-form', String(categorySn)],
};

export const useAdminServiceRequestForm = (categorySn) => useQuery({
  enabled: Boolean(categorySn),
  queryKey: keys.detail(categorySn),
  queryFn: () => fetchAdminServiceRequestForm(categorySn),
});

export const useSaveAdminServiceRequestFormDraft = (categorySn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAdminServiceRequestFormDraft,
    onSuccess: (data) => {
      queryClient.setQueryData(keys.detail(categorySn), data);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
};

export const useDiscardAdminServiceRequestFormDraft = (categorySn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discardAdminServiceRequestFormDraft,
    onSuccess: (data) => {
      queryClient.setQueryData(keys.detail(categorySn), data);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
};

export const usePublishAdminServiceRequestForm = (categorySn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishAdminServiceRequestForm,
    onSuccess: (data) => {
      queryClient.setQueryData(keys.detail(categorySn), data);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
};
