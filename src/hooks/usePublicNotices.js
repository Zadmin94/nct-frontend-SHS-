import { useQuery } from '@tanstack/react-query';
import {
  fetchPublicNotice,
  fetchPublicNotices,
  fetchPublicNoticeTypes,
} from '@api/noticeApi';

// 공지 목록·상세가 같은 캐시 규칙을 사용하도록 Query key를 한 곳에서 관리합니다.
export const noticeQueryKeys = {
  all: ['public-notices'],
  types: () => [...noticeQueryKeys.all, 'types'],
  list: ({ typeCode, keyword, page, size }) => [
    ...noticeQueryKeys.all,
    'list',
    typeCode || 'all',
    keyword || 'all',
    page,
    size,
  ],
  detail: (noticeId) => [...noticeQueryKeys.all, 'detail', noticeId],
};

export const usePublicNoticeTypes = () => useQuery({
  queryKey: noticeQueryKeys.types(),
  queryFn: fetchPublicNoticeTypes,
});

export const usePublicNoticeList = ({ typeCode, keyword, page, size = 10 }) => useQuery({
  queryKey: noticeQueryKeys.list({ typeCode, keyword, page, size }),
  queryFn: () => fetchPublicNotices({ typeCode, keyword, page, size }),
});

export const usePublicNoticeDetail = (noticeId) => useQuery({
  queryKey: noticeQueryKeys.detail(noticeId),
  queryFn: () => fetchPublicNotice(noticeId),
  enabled: Number.isSafeInteger(noticeId) && noticeId > 0,
});
