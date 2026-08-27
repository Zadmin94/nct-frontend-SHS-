// src/api/fileApi.js
// Claude Code 작성 (BJN, 2026-07-17)
// ─────────────────────────────────────────────────────────────────────────────
// 파일 관리 API — 이미지 업로드/삭제 (F-AUC-002 이미지 연계)
// ProductRegisterPage에서 사용. 업로드 응답 url은 백엔드 서빙 경로
// (/api/attachment/{서비스}/{yyyyMMdd}/파일명)라 axios 인스턴스의 baseURL(.../api)과
// 축이 달라서, 화면에 그릴 땐 toImageUrl로 백엔드 origin을 직접 붙여줘야 한다.
// service 구분은 저장 폴더 분류용 — 상품 이미지는 'product' (백엔드 화이트리스트와 일치해야 함).
// ─────────────────────────────────────────────────────────────────────────────
import api from './axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/** 이미지 1장 업로드 → { flSn, url }. service: 어느 도메인의 첨부인지 (예: 'product') */
export const uploadImage = (file, service) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('service', service);
  return api
    .post('/attachment', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then(res => res.data);
};

/** 본인이 올린 파일 삭제 — 등록 전 화면에서 이미지를 뺄 때 고아 파일 정리용 */
export const deleteImage = (flSn) => api.delete(`/attachment/${flSn}`);

/** 배송 인증사진을 업로드한다. 응답의 flSn은 발송 제출 요청에서만 사용한다. */
export const uploadDeliveryProof = (file) => uploadImage(file, 'delivery');

/** 담당자 7 · F-COM-018: 신고 첨부는 공개 서빙되지 않는 abuse-report 구분으로 업로드합니다. */
export const uploadAbuseReportFile = (file) => uploadImage(file, 'abuse-report');

/**
 * 배송 인증사진은 공개 URL로 열 수 없다. 로그인 쿠키를 포함한 요청으로 Blob을 받아
 * 화면에서만 Object URL로 표시해 거래 당사자 권한 검사를 유지한다.
 */
export const getDeliveryProofBlob = (deliveryId, fileId) => api.get(
  `/attachment/delivery/${deliveryId}/files/${fileId}/download`,
  { responseType: 'blob' },
);

/** 서버가 내려준 경로를 화면에 그릴 수 있는 절대 URL로 변환. 이미 절대 URL이면 그대로 반환 */
export const toImageUrl = (path) => {
  if (!path) return null;
  // blob: — 저장 전 로컬 미리보기(아직 업로드되지 않은 이미지)는 그대로 사용
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  return `${BACKEND_URL}${path}`;
};
