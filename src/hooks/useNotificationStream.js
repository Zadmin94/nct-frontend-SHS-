// src/hooks/useNotificationStream.js
// 알림 실시간 push 구독 훅 (SSE)
// - EventSource로 백엔드 /api/notification/stream을 열어두고, 'notification' 이벤트가 오면
//   알림 목록 쿼리(['notification','list'])를 invalidate한다 — Header 배지와 알림함
//   페이지가 같은 queryKey를 공유하므로 이 한 줄로 둘 다 갱신된다.
// - Access Token(쿠키) 수명이 30분이고 EventSource 재연결은 axios의 401→refresh 인터셉터를
//   타지 않으므로, 구독 중엔 주기적으로 /auth/refresh를 백그라운드 호출해 쿠키를 계속 갱신한다.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { BACKEND_URL } from '../api/axios';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15분

/** enabled가 true인 동안(로그인 상태) 알림 스트림을 구독한다. 반환값 없음 — 부수효과 전용 */
export function useNotificationStream(enabled) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;

    const eventSource = new EventSource(`${BACKEND_URL}/api/notification/stream`, {
      withCredentials: true,
    });

    eventSource.addEventListener('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notification', 'list'] });
    });

    // 연결 오류는 EventSource가 자체적으로 재연결을 시도하므로 여기선 조용히 넘어간다
    eventSource.onerror = () => {};

    // AT 쿠키가 만료되기 전에 미리 갱신해서 재연결 시 401을 방지한다
    const refreshInterval = setInterval(() => {
      axios.post(`${BACKEND_URL}/api/auth/refresh`, {}, { withCredentials: true }).catch(() => {});
    }, REFRESH_INTERVAL_MS);

    return () => {
      eventSource.close();
      clearInterval(refreshInterval);
    };
  }, [enabled, queryClient]);
}
