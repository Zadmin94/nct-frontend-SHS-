import api from './axios';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';

/** 담당자 7 · F-PAY-012: 처리 전후 환전 주문을 상태·검색 조건으로 페이지 조회합니다. */
export const getAdminPointExchangeOrders = ({ statusCode, keyword, page = 1, size = ADMIN_PAGE_SIZE } = {}) =>
  api.get('/admin/point/exchange/orders/search', {
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

/** 담당자 7 · F-PAY-012/F-OPS-015: 신청 건의 지급 계좌를 감사기록과 함께 제한 조회합니다. */
export const getAdminPointExchangeAccount = (orderSn) =>
  api.get(`/admin/point/exchange/orders/${orderSn}/account`)
    .then((response) => response.data.data);

export const completeAdminPointExchange = (orderSn) =>
  api.post(`/admin/point/exchange/${orderSn}/complete`).then((response) => response.data);

export const rejectAdminPointExchange = ({ orderSn, reason }) =>
  api.post(`/admin/point/exchange/${orderSn}/reject`, { reason })
    .then((response) => response.data);
