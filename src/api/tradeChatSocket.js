import { BACKEND_URL } from './axios';

/** HTTP API 주소와 같은 백엔드 원본을 WebSocket 연결 주소로 바꾼다. */
export const getTradeChatWebSocketUrl = () => {
  const backendUrl = new URL(BACKEND_URL);
  const protocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  return `${protocol}//${backendUrl.host}/ws/trade-chat`;
};
