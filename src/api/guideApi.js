import api from './axios';

// 담당자 7 · F-COM-014: 정적 이용가이드 문구의 단일 소스인 공개 백엔드 계약입니다.
export const fetchPublicGuides = () => (
  api.get('/guides', { skipServerErrorRedirect: true })
    .then((response) => response.data.data)
);
