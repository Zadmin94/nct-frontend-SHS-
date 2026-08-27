import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminNotice,
  deleteAdminNotice,
  fetchAdminNotice,
  fetchAdminNoticeOptions,
  fetchAdminNotices,
  hideAdminNotice,
  publishAdminNotice,
  updateAdminNotice,
} from '@api/adminNoticeApi';
import { noticeQueryKeys } from '@hooks/usePublicNotices';

const FAQ_TYPE_CODE = 'NTCC0008';
const PUBLISHED_STATUS_CODE = 'NTCC0006';

const moveOptionFirst = (options, code) => [
  ...options.filter((option) => option.code === code),
  ...options.filter((option) => option.code !== code),
];
const moveOptionLast = (options, code) => [
  ...options.filter((option) => option.code !== code),
  ...options.filter((option) => option.code === code),
];

export const adminNoticeQueryKeys = {
  all: ['admin-notices'],
  options: () => [...adminNoticeQueryKeys.all, 'options'],
  list: (filters) => [...adminNoticeQueryKeys.all, 'list', filters],
  detail: (noticeId) => [...adminNoticeQueryKeys.all, 'detail', noticeId],
};

export const useAdminNoticeOptions = () => useQuery({
  queryKey: adminNoticeQueryKeys.options(),
  queryFn: fetchAdminNoticeOptions,
  // 담당자 7 | F-OPS-023: 작성 화면과 목록 필터의 선택지 표시 순서를 동일하게 맞춥니다.
  select: (options) => ({
    ...options,
    types: moveOptionLast(options.types ?? [], FAQ_TYPE_CODE),
    statuses: moveOptionFirst(options.statuses ?? [], PUBLISHED_STATUS_CODE),
  }),
});

export const useAdminNoticeList = (filters) => useQuery({
  queryKey: adminNoticeQueryKeys.list(filters),
  queryFn: () => fetchAdminNotices(filters),
});

export const useAdminNoticeDetail = (noticeId) => useQuery({
  queryKey: adminNoticeQueryKeys.detail(noticeId),
  queryFn: () => fetchAdminNotice(noticeId),
  enabled: Number.isSafeInteger(noticeId) && noticeId > 0,
});

const useNoticeMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (notice) => {
      queryClient.invalidateQueries({ queryKey: adminNoticeQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: noticeQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      if (notice?.noticeId) {
        queryClient.setQueryData(adminNoticeQueryKeys.detail(notice.noticeId), notice);
      }
    },
  });
};

export const useCreateAdminNotice = () => useNoticeMutation(createAdminNotice);
export const useUpdateAdminNotice = () => useNoticeMutation(updateAdminNotice);
export const usePublishAdminNotice = () => useNoticeMutation(publishAdminNotice);
export const useHideAdminNotice = () => useNoticeMutation(hideAdminNotice);
export const useDeleteAdminNotice = () => useNoticeMutation(deleteAdminNotice);
