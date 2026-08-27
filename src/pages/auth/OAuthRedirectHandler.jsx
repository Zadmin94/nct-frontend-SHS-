// src/pages/auth/OAuthRedirectHandler.jsx
// @ai_generated: 작업단위5 - OAuth 로그인 성공/실패 후 처리 페이지.
// 백엔드가 성공 시 httpOnly 쿠키만 심고 이 페이지로 리다이렉트하므로, 프론트 로그인 상태
// (localStorage.isLogin, useConfig 전역 상태, react-query 캐시)는 여기서 useAuth.js의 fetchUser와
// 동일한 방식으로 직접 반영한다 (useAuth.js 자체는 변경하지 않음 - SPEC 설계 결정 E).
// 실패 시(OAuth2FailureHandler가 붙인 ?oauthError= 쿼리 파라미터)는 에러 카드로 안내한다.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@hooks/useApi';
import { useConfig } from '@hooks/useConfig';
import { ActionButton } from '@components/common/ui';
import { toast } from '@utils/common';

// 레드팀 Q4 반영: 이 키들은 백엔드 OAuth2ErrorCode(nct-backend/.../handler/OAuth2ErrorCode.java)와
// 고정 계약이다 - ErrorCode enum과 무관하게 별도 상수로 분리돼 있으니, 값을 바꿀 때는 반드시
// 그 파일도 함께 수정한다(어느 한쪽만 바뀌면 컴파일 에러 없이 조용히 매칭이 깨진다).
const OAUTH_ERROR_MESSAGES = {
  ACCOUNT_SUSPENDED: '정지된 계정입니다. 관리자에게 문의하세요.',
  WITHDRAWN_USER: '탈퇴한 사용자입니다.',
  OAUTH_EMAIL_REQUIRED: '이메일 제공에 동의해야 소셜 로그인을 사용할 수 있습니다. 제공자 설정에서 이메일 동의 후 다시 시도해주세요.',
  // 레드팀 Q6 반영: 마이페이지 연동 관리(작업 2)가 아직 없어 그 기능을 가리키는 안내는
  // 실행 불가능한 지시가 된다 - 작업 2 완료 전까지는 로컬 로그인 안내로 완화한다.
  DUPLICATE_EMAIL: '이미 가입된 이메일입니다. 기존 계정(아이디/비밀번호)으로 로그인해주세요.',
  DUPLICATE_NICKNAME: '이미 사용 중인 닉네임입니다. 관리자에게 문의하세요.',
  OAUTH_UNSUPPORTED_PROVIDER: '지원하지 않는 소셜 로그인입니다.',
  OAUTH_LOGIN_FAILED: '소셜 로그인 처리 중 오류가 발생했습니다.',
};

// 마이페이지 소셜 연동(F-AUTH-016) 콜백 전용 코드 - OAuth2LinkFailureHandler(백엔드)와의 고정 계약.
// 연동은 로그인 중인 사용자의 부가 동작이라 실패해도 /login이 아니라 마이페이지로 돌려보낸다.
const LINK_ERROR_MESSAGES = {
  LINK_AUTH_REQUIRED: '로그인이 만료되어 연동할 수 없습니다. 다시 로그인 후 시도해주세요.',
  ALREADY_LINKED_ELSEWHERE: '이미 다른 계정에 연동된 소셜 계정입니다.',
  ALREADY_LINKED_SELF: '이미 연동된 소셜 계정입니다.',
};
const MYPAGE_LINK_RETURN_KEY = 'mypageLinkReturn';
const MYPAGE_LINK_RETURN_FALLBACK = '/user/mypage/profile';

const OAuthRedirectHandler = () => {
  const navigate  = useNavigate();
  const apiTool   = useApi();
  const { setConfig } = useConfig();
  const queryClient = useQueryClient();

  // 실패 콜백(?oauthError=)·온보딩 필요(?onboardingRequired=true)는 렌더 시점에 바로 계산 -
  // effect 안에서 동기 setState를 피한다.
  const [errorMessage, setErrorMessage] = useState(() => {
    const oauthError = new URLSearchParams(window.location.search).get('oauthError');
    return oauthError ? (OAUTH_ERROR_MESSAGES[oauthError] ?? OAUTH_ERROR_MESSAGES.OAUTH_LOGIN_FAILED) : null;
  });
  // @ai_generated: 작업단위5(F-AUTH-004 온보딩, ISS-009) - 미연동 신규 사용자는 실패가 아니라
  // 온보딩 화면으로 보낸다(OAuth2FailureHandler가 붙인 onboardingRequired 파라미터).
  const onboardingRequired = new URLSearchParams(window.location.search).get('onboardingRequired') === 'true';
  // F-AUTH-016: 마이페이지 소셜 연동 콜백(OAuth2LinkSuccessHandler/FailureHandler)은 로그인
  // 콜백과 쿼리 파라미터가 달라 위 두 분기와 겹치지 않는다. 연동은 이미 로그인된 사용자의
  // 부가 동작이라 토큰 재발급이 없으므로 fetchMe 없이 결과만 안내하고 마이페이지로 돌려보낸다.
  const linkParams = new URLSearchParams(window.location.search);
  const linkSuccess = linkParams.get('linkSuccess') === 'true';
  const linkError = linkParams.get('linkError');

  useEffect(() => {
    if (linkSuccess || linkError) {
      const returnTo = sessionStorage.getItem(MYPAGE_LINK_RETURN_KEY) || MYPAGE_LINK_RETURN_FALLBACK;
      sessionStorage.removeItem(MYPAGE_LINK_RETURN_KEY);
      if (linkSuccess) {
        toast({ icon: 'success', title: '소셜 계정 연동이 완료되었습니다.' });
      } else {
        toast({ icon: 'error', title: LINK_ERROR_MESSAGES[linkError] ?? '소셜 계정 연동에 실패했습니다.' });
      }
      navigate(returnTo, { replace: true });
      return;
    }

    if (onboardingRequired) {
      navigate('/oauth/onboarding', { replace: true });
      return;
    }
    if (errorMessage) return; // 실패 콜백이면 내 정보 조회를 시도하지 않는다

    (async () => {
      try {
        // httpOnly 쿠키는 이미 심어져 있으므로 내 정보 조회로 로그인 여부를 확인한다.
        const authData = await apiTool.fetchMe();
        localStorage.setItem('isLogin', 'true');
        setConfig('user', authData.data);
        queryClient.setQueryData(['auth', 'user'], authData.data);

        const from = sessionStorage.getItem('loginRedirectFrom');
        sessionStorage.removeItem('loginRedirectFrom');
        navigate(authData.data?.role === 'ROLE_ADMIN' ? '/admin' : (from || '/'), { replace: true });
      } catch {
        setErrorMessage(OAUTH_ERROR_MESSAGES.OAUTH_LOGIN_FAILED);
      }
    })();
    // 최초 마운트 시 1회만 실행 (쿼리 파라미터·리다이렉트 처리)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-100 bg-white rounded-2xl shadow-lg px-8 py-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">⚠️</div>
          <h2 className="text-base font-bold mb-2">소셜 로그인 실패</h2>
          <p className="text-sm text-gray-500 mb-8">{errorMessage}</p>
          <ActionButton
            fullWidth
            replace
            to="/login"
          >
            로그인으로 돌아가기
          </ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">로그인 처리 중입니다...</p>
    </div>
  );
};

export default OAuthRedirectHandler;
