import api from './axios';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';

/** 담당자 7 · F-OPS-002/019/020: 관리자 회원 조회와 계정 제한 API 계약입니다. */
export const getAdminMembers = ({ statusCode, keyword, page, size = ADMIN_PAGE_SIZE }) =>
  api.get('/admin/members', {
    params: {
      ...(statusCode ? { statusCode } : {}),
      ...(keyword ? { keyword } : {}),
      page,
      size,
    },
  }).then((response) => response.data.data);

export const getAdminMember = (userSn) =>
  api.get(`/admin/members/${userSn}`).then((response) => response.data.data);

export const changeAdminMemberStatus = ({ userSn, targetStatusCode, reason, requestId }) =>
  api.post(`/admin/members/${userSn}/status`, { targetStatusCode, reason, requestId })
    .then((response) => response.data.data);
