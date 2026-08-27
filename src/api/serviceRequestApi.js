// src/api/serviceRequestApi.js
// ─────────────────────────────────────────────────────────────────────────────
// 서비스 요청서 API — 요청서 등록 · 내 요청 목록 조회 · 요청서 상세 조회 · 삭제
//             ServiceRequestFormPage 등에서 사용 (F-SVC-001~004)
// ─────────────────────────────────────────────────────────────────────────────
import api from './axios';

/** 요청서 등록 */
export const registerServiceRequest = (data) =>
  api.post('/service-requests', data).then(res => res.data);

/** 내 요청서 목록 — filterType: DRAFT | OPEN | MATCHED | CLOSED | CANCELED | null(전체) */
export const getMyServiceRequests = (page = 1, size = 10, filterType = null) =>
  api.get('/service-requests/me', { params: { page, size, ...(filterType ? { filterType } : {}) } }).then(res => res.data);

/** 요청서 상세 조회 */
export const getServiceRequest = (svcReqSn) =>
  api.get(`/service-requests/${svcReqSn}`).then(res => res.data);

/** F-SVC-002 현재 활성 카테고리별 동적 폼 정의 */
export const getServiceRequestForms = () =>
  api.get('/service-requests/forms').then(res => res.data);

/** F-SVC-002 임시저장 요청서가 사용한 과거 폼 버전 조회 */
export const getServiceRequestForm = (formTemplateSn) =>
  api.get(`/service-requests/forms/${formTemplateSn}`).then(res => res.data);

/** 임시저장 수정 화면 전용 상세 — 구조화 답변과 요청자 주소 포함 */
export const getEditableServiceRequest = (svcReqSn) =>
  api.get(`/service-requests/${svcReqSn}/edit`).then(res => res.data);

/** 임시저장 요청서 수정 및 공개 전환 */
export const updateServiceRequest = (svcReqSn, data) =>
  api.put(`/service-requests/${svcReqSn}`, data).then(res => res.data);

/** 요청서 삭제 */
export const deleteServiceRequest = (svcReqSn) =>
  api.delete(`/service-requests/${svcReqSn}`).then(res => res.data);

/** 요청서 마감 (F-SVC-003) */
export const closeServiceRequest = (svcReqSn) =>
  api.patch(`/service-requests/${svcReqSn}/close`).then(res => res.data);

/** 요청서 변경사항 추가 — 견적 요청 정책상 최대 3개 */
export const addServiceRequestComment = (svcReqSn, data) =>
  api.post(`/service-requests/${svcReqSn}/comments`, data).then(res => res.data);

/** 마감된 요청서 재등록 — 내용을 복사한 새 임시저장 요청서 생성 */
export const reregisterServiceRequest = (svcReqSn) =>
  api.post(`/service-requests/${svcReqSn}/reregister`).then(res => res.data);

/** 요청서 변경사항 목록 조회 */
export const getServiceRequestComments = (svcReqSn) =>
  api.get(`/service-requests/${svcReqSn}/comments`).then(res => res.data);
