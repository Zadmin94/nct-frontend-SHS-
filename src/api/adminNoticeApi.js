// F-OPS-023 관리자 공지 API를 한곳에 모읍니다.
// 사용자 공개 조회 API와 분리되어 있어, 관리자 화면을 바꿔도 공개 공지 계약은 영향을 받지 않습니다.
import api from './axios';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';

export const fetchAdminNoticeOptions = () =>
  api.get('/admin/notices/options').then((response) => response.data.data);

export const fetchAdminNotices = ({ typeCode, statusCode, keyword, page, size = ADMIN_PAGE_SIZE }) =>
  api.get('/admin/notices', {
    params: {
      ...(typeCode ? { typeCode } : {}),
      ...(statusCode ? { statusCode } : {}),
      ...(keyword ? { keyword } : {}),
      page,
      size,
    },
  }).then((response) => response.data.data);

export const fetchAdminNotice = (noticeId) =>
  api.get(`/admin/notices/${noticeId}`).then((response) => response.data.data);

export const createAdminNotice = (payload) =>
  api.post('/admin/notices', payload).then((response) => response.data.data);

export const updateAdminNotice = ({ noticeId, payload }) =>
  api.put(`/admin/notices/${noticeId}`, payload).then((response) => response.data.data);

/** 담당자 7 | F-OPS-023: 제목·내용·게시 기간은 보존하고 상태만 게시로 전환합니다. */
export const publishAdminNotice = ({ noticeId, expectedRevision }) =>
  api.patch(`/admin/notices/${noticeId}/publish`, { expectedRevision })
    .then((response) => response.data.data);

export const hideAdminNotice = ({ noticeId }) =>
  api.patch(`/admin/notices/${noticeId}/hide`)
    .then((response) => response.data.data);

export const deleteAdminNotice = ({ noticeId, changeReason }) =>
  api.delete(`/admin/notices/${noticeId}`, { data: { changeReason } });
