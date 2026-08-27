import api from './axios';

// 담당자 7 · F-COM-003: 관리자 화면의 CATEGORY 읽기·쓰기 계약이다.
export const fetchAdminCategories = (domainCode) =>
  api.get(`/admin/categories/${domainCode}`).then(({ data }) => data.data);

export const saveAdminCategory = ({ domainCode, categorySn, payload }) => {
  const path = `/admin/categories/${domainCode}${categorySn ? `/${categorySn}` : ''}`;
  return api[categorySn ? 'put' : 'post'](path, payload).then(({ data }) => data.data);
};

export const moveAdminCategory = ({ domainCode, categorySn, direction }) =>
  api.put(`/admin/categories/${domainCode}/${categorySn}/order`, { direction })
    .then(({ data }) => data.data);

export const reorderAdminCategories = ({ domainCode, categorySnOrder }) =>
  api.put(`/admin/categories/${domainCode}/reorder`, { categorySnOrder })
    .then(({ data }) => data.data);
