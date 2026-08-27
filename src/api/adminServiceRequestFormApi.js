import api from './axios';

// 담당자 7 · F-COM-003/F-SVC-002: 관리자 서비스 요청 폼 편집·발행 계약입니다.
export const fetchAdminServiceRequestForm = (categorySn) =>
  api.get(`/admin/service-request-forms/categories/${categorySn}`)
    .then(({ data }) => data.data);

export const saveAdminServiceRequestFormDraft = ({ categorySn, payload }) =>
  api.post(`/admin/service-request-forms/categories/${categorySn}/drafts`, payload)
    .then(({ data }) => data.data);

export const publishAdminServiceRequestForm = ({ categorySn, formTemplateSn }) =>
  api.post(
    `/admin/service-request-forms/categories/${categorySn}/drafts/${formTemplateSn}/publish`,
  ).then(({ data }) => data.data);

export const discardAdminServiceRequestFormDraft = ({ categorySn, formTemplateSn }) =>
  api.post(
    `/admin/service-request-forms/categories/${categorySn}/drafts/${formTemplateSn}/discard`,
  ).then(({ data }) => data.data);
