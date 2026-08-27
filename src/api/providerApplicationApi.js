import api from './axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// 담당자 7 · F-PROV-002/003/006/007/012~014
// 제공자 신청 화면과 관리자 심사 화면이 함께 사용하는 백엔드 계약입니다.
// 신청 서류는 파일 API에서 받은 flSn만 넘기고, 백엔드는 PROVIDER_APPLY_FILE 연결 row를 생성합니다.
export const fetchMyProviderApplications = () =>
  api.get('/providers/applications/me')
    .then((response) => response.data.data);

export const submitProviderApplication = ({ categorySns, reason, files = [] }) =>
  api.post('/providers/applications', { categorySns, reason, files })
    .then((response) => response.data.data);

export const fetchAdminProviderApplications = ({ statusCode } = {}) =>
  api.get('/admin/provider-applications', { params: statusCode ? { statusCode } : {} })
    .then((response) => response.data.data);

export const approveProviderApplication = ({ applicationSn, reason }) =>
  api.post(`/admin/provider-applications/${applicationSn}/approve`, { reason })
    .then((response) => response.data.data);

export const rejectProviderApplication = ({ applicationSn, reason }) =>
  api.post(`/admin/provider-applications/${applicationSn}/reject`, { reason })
    .then((response) => response.data.data);

export const stopProviderPermission = ({ applicationSn, reason, requestId }) =>
  api.post(`/admin/provider-applications/${applicationSn}/permission/stop`, { reason, requestId })
    .then((response) => response.data.data);

export const restoreProviderPermission = ({ applicationSn, reason, requestId }) =>
  api.post(`/admin/provider-applications/${applicationSn}/permission/restore`, { reason, requestId })
    .then((response) => response.data.data);

// 담당자 7 · F-PROV-003: 관리자 제공자 심사 모달에서 제출 서류 원문을 새 탭으로 열기 위한 URL입니다.
// 실제 파일 접근 권한과 신청-파일 연결 여부는 백엔드 AdminProviderFileController가 다시 검증합니다.
export const getAdminProviderApplicationFileDownloadUrl = ({ applicationSn, flSn }) =>
  [
    BACKEND_URL,
    '/api/admin/provider-applications/',
    applicationSn,
    '/files/',
    flSn,
    '/download',
  ].join('');
