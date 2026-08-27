import api from './axios';

/** 관리자 자금 운영 대시보드의 포인트·정산·환전 집계를 조회합니다. */
export const getAdminFundSummary = ({ from, to }) => (
  api.get('/admin/funds/summary', { params: { from, to } })
    .then((response) => response.data.data)
);
