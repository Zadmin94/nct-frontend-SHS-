import api from './axios';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';

/** F-OPS-009 관리자 정산 목록·상세·보류·해제 계약입니다. */
export const getAdminSettlements = ({
  statusCode,
  keyword,
  page = 1,
  size = ADMIN_PAGE_SIZE,
} = {}) => api.get('/admin/settlements', {
  params: {
    ...(statusCode ? { statusCode } : {}),
    ...(keyword ? { keyword } : {}),
    page,
    size,
  },
}).then((response) => response.data.data ?? {
  items: [],
  page,
  size,
  totalItems: 0,
  totalPages: 0,
});

export const getAdminSettlement = (settlementId) =>
  api.get(`/admin/settlements/${settlementId}`)
    .then((response) => response.data.data);

export const holdAdminSettlement = (settlementId, payload) =>
  api.post(`/admin/settlements/${settlementId}/hold`, payload)
    .then((response) => response.data.data);

export const releaseAdminSettlement = (settlementId, payload) =>
  api.post(`/admin/settlements/${settlementId}/release`, payload)
    .then((response) => response.data.data);
