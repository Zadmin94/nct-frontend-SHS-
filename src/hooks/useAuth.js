// src/hooks/useAuth.js
// 로그인 상태 전반을 관리하는 훅.
// 로그인/로그아웃 실행, 현재 로그인 유저 조회, 인증 여부 판단

// useQuery: 데이터조회 담당(GET)
// useMutation: 데이터 변경 담당(POST, PUT, DELETE)
// useQueryClient: 캐시를 직접 조작하는 도구. useQuery가 관리하는 캐시에 수동 개입.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@hooks/useApi';
import { useConfig } from '@hooks/useConfig';
import { memberProfileQueryOptions } from '@hooks/useMemberProfile';

const isAdminPath = (path) => (
  path === '/admin'
  || path.startsWith('/admin/')
  || path.startsWith('/admin?')
  || path.startsWith('/admin#')
);

export const useAuth = () => {
  const apiTool = useApi();
  const { setConfig } = useConfig();
  const queryClient = useQueryClient();

  // 담당자 7 · F-OPS-001: 관리자 전용 로그인에서 권한 불일치 세션을 화면 이동 없이 제거할 때도 같은 초기화를 사용한다.
  const clearAuthState = () => {
    localStorage.removeItem('isLogin');
    setConfig('user', {});
    queryClient.setQueryData(['auth', 'user'], null);
    queryClient.clear();
  };

  /**
   * 1. 내 정보 조회 ==========================
   * HttpOnly 쿠기 기반
   * isLogin 플래그가 없으면 서버를 찌르지 않음 -> 불필요한 요청 차단함.
  */
 const fetchUser = async () => {
   if (!localStorage.getItem('isLogin')) return null;     // isLogin 없음 -> null반환.
   try {      // isLogin 있음.
    // 자신의 데이터 받아옴.
    // apiTool.fetchMe() → execute() 내부에서 res.data(axios 응답 바디)를 반환 → 이게 authData
    // authData = { status, httpCode, data: {...} }, authData.data = 진짜 유저 정보.
     const authData = await apiTool.fetchMe();
     setConfig('user', authData.data);      // useConfig.js 의 setConfig에 path: 'user', value: authData.data
     void queryClient.prefetchQuery(memberProfileQueryOptions);
     return authData.data;
  } catch {   // 예외 발생.
      localStorage.removeItem('isLogin');     // isLogin 플래그 삭제.
      return null;
    }
  };

  /**
   * ['auth','user']라는 키로 fetchUser를 실행해서 나온 결과를 user라는 이름으로 쓰고, 5분 동안은 캐시 재사용.
   * useQuery가 반환하는 객체는 원래 { data, isLoading, ... }
   */
  // `data: user` : data라는 프로퍼티를 꺼내 user라는 다른 이름으로 받는다. `=null`을 통해 data가 undefined면 기본값 null.
  // `isLoading: isUserLoading`: isLoading이라는 프로퍼티를 꺼내 isUserLoading이라는 다른 이름으로 받음.
  const { data: user = null, isLoading: isUserLoading } = useQuery({
    // 이 쿼리를 식별하는 배열 형태의 고유 키.
    // 캐시를 저장/조회할 때 이 키로 구분함.
    queryKey : ['auth', 'user'],
    queryFn  : fetchUser, // 실행할 함수 자체를 넘김.
    // useQuery가 지원하는 공식 옵션(라이브러리 자체 API). 현재 코드엔 없지만, 옵션 중 `gcTime`: 쿼리를 아무도 안쓸 때 캐시를 메모리에서 완전히 지우기까지 걸리는 시간.
    // 5분 캐시 (화면 이동 시 중복 호출 방지). 5분 안에 동일 queryKey로 재요청해도 캐시된 값을 그대로 씀.
    staleTime: 1000 * 60 * 5,
  });
  // ==========================================

  /**
   * 2. 로그인 Mutation =======================
  */
  const loginMutation = useMutation({
   mutationFn: async (credentials) => {
     const loginRes = await apiTool.login(credentials);
     return loginRes.data;                  // loginRes.data -> 하단의 userData임.
                                            // useMutation의 동작 규칙. 리액트쿼리가 반환값을 성공 결과로 인식하는 것임.
    },
    // 실패 시 별도 처리가 필요 없기 때문에 onSucess만 존재함.
    // 로그인 실패 시 mutationFn에서 에러 던져짐. -> 리액트쿼리가 자동으로 loginMutation.isError, .error 상태에 반영.
    // 실패 처리 책임을 호출부에 넘긴 것.
    onSuccess: (userData) => {
      localStorage.setItem('isLogin', 'true');      // 로컬스토리지에 isLogin값을 true로 저장함
      setConfig('user', userData);      // useConfig의 전역 상태 저장소에 user 값을 userData로 세팅.
      queryClient.setQueryData(['auth', 'user'], userData);   // TanStack Query의 캐시에 직접 값을 주입.
      void queryClient.prefetchQuery(memberProfileQueryOptions);
    },
  });

  // 담당자 7 · F-OPS-001: 관리자 화면은 일반 로그인과 분리된 서버 계약만 호출한다.
  const adminLoginMutation = useMutation({
    mutationFn: async (credentials) => {
      const loginRes = await apiTool.adminLogin(credentials);
      return loginRes.data;
    },
    onSuccess: (userData) => {
      localStorage.setItem('isLogin', 'true');
      setConfig('user', userData);
      queryClient.setQueryData(['auth', 'user'], userData);
      void queryClient.prefetchQuery(memberProfileQueryOptions);
    },
  });
  // ==========================================

  /**
   * 3. 로그아웃 Mutation =====================
  */
 const logoutMutation = useMutation({
   mutationFn: async () => {
     // currentPath: 현재 사용자가 보고 있던 페이지 경로 전체가 됨.
     // window.location: 브라우저의 현재 URL 정보 담은 객체.
     // .pathname: 도메인 뒤의 경로.
     // .search: 퀴리스트링(`?`의 뒤) 부분.
     const currentPath = window.location.pathname + window.location.search;
     await apiTool.logout();      // api.post('/auth/logout')
     return currentPath;
    },
    onSuccess: (currentPath) => {
      clearAuthState();

      // 인증이 필요한 관리자 화면에서 로그아웃하면 로그인 화면으로, 그 외는 현재 페이지 유지
      // 로그아웃 시 접근 불가한 경로 목록을 배열로 정의함. 현재는 /admin뿐임.
      // 라우트가 많아지면 라우트 정의 쪽(routes/)에서 "보호된 경로" 목록을 따로 관리 고려.
      if (isAdminPath(currentPath)) {
        // 담당자 7: 관리자 로그아웃 뒤 보호 라우트가 잠깐 로그인 화면을 거쳐 메인으로 이동하지 않도록 최종 목적지도 로그인으로 맞춘다.
        // window.location.href: 브라우저를 해당 주소로 강제 이동함. 페이지 전체 새로고침 방식이라 앱을 다시 로드함.
        window.location.href = '/admin/login';
      } else {
        window.location.href = currentPath; // 최근 경로로 이동.
      }
    },
    onError: () => {
      // 네트워크 오류 시에도 프론트 상태 강제 초기화
      // 로그인중이라는 상태를 나타내는 값들을 제거함.
      clearAuthState();
      window.location.href = isAdminPath(window.location.pathname) ? '/admin/login' : '/';
    },
  });
  // ==========================================

  /**
   * 3.5 모드 전환 Mutation (F-PROV-008) =======
   * 일반(USER) ↔ 제공자(SERVICE) 전환. 백엔드가 USR_ROLE_CD를 실제로 바꾸고
   * 새 역할이 담긴 액세스 토큰을 HttpOnly 쿠키로 다시 내려준다(프론트 저장 불필요).
   * 응답 바디는 로그인과 같은 형태라 로그인 성공 처리와 동일하게 유저 캐시를 갱신한다.
   * 제공자 권한이 없거나 제재 중이면 서버가 에러를 던짐 → 호출부에서 catch해 안내.
  */
  const switchModeMutation = useMutation({
    mutationFn: async (to) => {                 // to: 'USER' | 'SERVICE'
      const res = await apiTool.switchMode(to);
      return res.data;                          // 로그인과 동일 — data 안이 진짜 유저 정보.
    },
    onSuccess: (userData) => {
      setConfig('user', userData);                            // 전역 상태 갱신.
      queryClient.setQueryData(['auth', 'user'], userData);   // 쿼리 캐시 갱신 → isProvider가 즉시 반영됨.
    },
  });
  // ==========================================

  /**
   * 4. 로컬 강제 로그아웃 ====================
   * 회원탈퇴 등 특수 케이스
  */
  const localLogout = () => {
    // 로그인중이라는 상태를 나타내는 값들을 제거함.
    localStorage.removeItem('isLogin');
    setConfig('user', {});
    queryClient.setQueryData(['auth', 'user'], null);
    queryClient.clear();
    window.location.href = '/';       // 랜딩 페이지로 이동. 페이지 전체 새로고침 방식 -> 앱 다시 로드.
  };

  /**
   * 관리자 로그인 결과가 ROLE_ADMIN이 아닐 때 발급된 서버 세션과 로컬 인증 상태를 즉시 폐기한다.
   * 서버 로그아웃 실패 시에도 로컬 상태는 반드시 제거하며 화면 이동은 호출부가 결정한다.
   */
  const rejectSessionMutation = useMutation({
    mutationFn: () => apiTool.rejectSession(),
    onSettled: clearAuthState,
  });

  // useAuth의 리턴.
  // 훅이 최종적으로 컴포넌트에 노출하는 값들.
  //
  return {
    user,
    loading        : isUserLoading || loginMutation.isPending || adminLoginMutation.isPending || logoutMutation.isPending || rejectSessionMutation.isPending,    // useQuery로 조회한 로그인 유저 정보.
    // !!: 논리부정(!)을 두번 사용함 -> 값을 강제로 boolean형으로 변환함.
    // isAuthenticated를 별도 state로 관리하지 않고, user값 하나로부터 파생시킴.
    // user 객체 기반 자동 동기화. user만 갱신되면 자동으로 따라가서 두 값이 따로 놀지 않음.
    isAuthenticated: !!user,
    // 함수 명 변경하여 노출.
    // mutateAsync: Promise를 반환함.
    // mutate를 쓰지 않은 이유는 결과를 Promise로 반환하지 않아 await로 완료 대기 불가.
    login          : loginMutation.mutateAsync,
    adminLogin     : adminLoginMutation.mutateAsync,
    logout         : logoutMutation.mutateAsync,
    rejectCurrentSession: rejectSessionMutation.mutateAsync,
    // 모드 전환 (F-PROV-008). user.role은 백엔드 로그인/전환 응답에 포함된 필드.
    switchMode     : switchModeMutation.mutateAsync,
    isProvider     : user?.role === 'ROLE_SERVICE',
    localLogout,      // 함수 그대로 노출. 서버 요 청 없이 로컬 상태만 강제 초기화 하는 함수.
  };
  // ==========================================
};
