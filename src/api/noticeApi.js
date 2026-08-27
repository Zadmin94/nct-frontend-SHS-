// 사용자 공지 API만 모아 둔 파일입니다.
// 페이지에서 주소를 직접 만들지 않아, 백엔드 경로가 바뀌어도 이 파일만 수정하면 됩니다.
import api from './axios';

export const fetchPublicNoticeTypes = () =>
  api.get('/notices/types').then((response) => response.data.data);

export const fetchPublicNotices = ({ typeCode, keyword, page, size = 10 }) =>
  api.get('/notices', {
    params: {
      ...(typeCode ? { typeCode } : {}),
      ...(keyword ? { keyword } : {}),
      page,
      size,
    },
  }).then((response) => response.data.data);

export const fetchPublicNotice = (noticeId) =>
  api.get(`/notices/${noticeId}`).then((response) => response.data.data);
