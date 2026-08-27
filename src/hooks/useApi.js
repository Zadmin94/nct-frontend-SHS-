// src/hooks/useApi.js
// API 호출을 감싸는 공통 래퍼 훅.
// 이 훅을 통해 loading, error 상태를 일관되게 관리.

import { useState, useCallback, useMemo } from 'react';
import api from '@api/axios';

/**
 * loading: API 호출중인지를 나타냄.
 * error: API 호출 실패 시 에러 객체가 담김.
 */
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  /**
   * useCallback -> 의존성 배열(하단의 [])이 변경되지 않는 한 재사용.
   * apiCall: 매개변수로 함수를 넘겨받은 것.
   * fullResponse: 호출 시 값이 없으면 기본 false
   */
  const execute = useCallback(async (apiCall, fullResponse = false) => {
    setLoading(true);     // API 호출중인 상태로 변경.
    setError(null);       // 에러 객체가 담길 state 초기화.
    try {
      const res = await apiCall();    // apiCall 함수 실행. await -> 응답 대기.
      return fullResponse ? res : res.data;     // res: 응답 객체 전체, res.data: 실제 데이터.
    } catch (err) {
      setError(err);
      throw err;      // 에러를 다시 던짐.
    } finally {
      setLoading(false);      // 성공, 실패 관계없이 API호출이 끝났으니 상태 변경.
    }
  }, []);

  /**
   * 의존성배열인 [execute]가 바뀌지 않으면 새 객체를 만들지 않음.
   * useMemo -> 참조값 고정 -> useAuth의 useQuery dependency 안정화.
   * {키 : 값(함수)} 구조.
   * 타 파일에서 `const apiTool = useApi();` `apiTool.fetchMe()` ... 으로 사용 -> 위의 executre로 화살표 함수 자체 전달 -> execute에서 api 호출 실행.
   */
  const services = useMemo(() => ({

    // 인증 =====================================
    fetchMe : ()      => execute(() => api.get('/auth/me')),
    login   : (creds) => execute(() => api.post('/auth/login', creds), false),
    // 담당자 7 · F-OPS-001: 관리자 계정은 전용 서버 경로에서만 신규 세션을 발급한다.
    adminLogin: (creds) => execute(() => api.post('/auth/admin/login', creds), false),
    logout  : ()      => execute(() => api.post('/auth/logout'), false),
    // 담당자 7 · F-OPS-001: 권한 불일치 세션 정리는 공통 오류 화면 이동 없이 호출 화면에서 마무리한다.
    rejectSession: () => execute(() => api.post('/auth/logout', null, {
      skipAuthRefresh: true,
      skipAuthStateRedirect: true,
      skipServerErrorRedirect: true,
    }), false),
    // 모드 전환 (F-PROV-008): to = 'USER' | 'SERVICE'. 새 토큰은 서버가 쿠키로 내려줘서 별도 저장 불필요.
    switchMode: (to)  => execute(() => api.post('/auth/mode', null, { params: { to } })),
    // ==========================================

    // 프로필 ===================================
    checkNickname : (nickname) => execute(() => api.get('/auth/check-nickname', { params: { nickname } })),
    updateProfile : (formData) => execute(() => api.post('/member/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }), true),
    withdrawMember: (payload)  => execute(() => api.delete('/member/me', { data: payload })),
    // ==========================================

  }), [execute]);

  // useApi 훅이 최종적으로 반환하는 객체.
  // service라는 중첩 객체 형태 그대로 반환 시 apiTool.service.login()처럼 한단계 더 진입이 필요.
  return { loading, error, ...services };
};
