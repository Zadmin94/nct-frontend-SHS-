// src/pages/auth/FindEmailPage.jsx
// F-AUTH-014: 이메일+가입 닉네임으로 아이디를 찾는다. 실패 사유(불일치·탈퇴·정지·미가입)는
// 서버가 전부 동일한 오류로 응답하므로 화면도 하나의 안내 문구만 보여준다.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { findEmail } from '@api/authApi';
import AuthPageContainer from '@components/auth/AuthPageContainer';
import AuthCard from '@components/auth/AuthCard';
import { ActionButton } from '@components/common/ui';
import { notify } from '@utils/common';

const SOCIAL_PROVIDER_LABELS = {
  kakao: '카카오',
  naver: '네이버',
  google: '구글',
};

const getSocialLoginUrl = (provider) => (
  `${import.meta.env.VITE_API_URL}/api/oauth2/authorization/${provider}`
);

export default function FindEmailPage() {
  const [email,        setEmail]        = useState('');
  const [nickname,     setNickname]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [recoveryResult, setRecoveryResult] = useState(null);

  const handleSubmit = async () => {
    if (!email.trim() || !nickname.trim()) {
      await notify({ icon: 'warning', title: '이메일과 닉네임을 입력해주세요.', size: 'sm' });
      return;
    }

    setLoading(true);
    try {
      const result = await findEmail({ email, nickname });
      setRecoveryResult(result?.data ?? null);
    } catch {
      // @ai_generated: 불일치·탈퇴·정지·미가입 전부 USER_NOT_FOUND(404)로 동일하게 응답된다.
      await notify({ icon: 'error', title: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleRetry = () => {
    setRecoveryResult(null);
    setEmail('');
    setNickname('');
  };

  return (
    <AuthPageContainer>
      <AuthCard className="max-w-110">
        <h1 className="text-xl font-bold text-center mb-8">아이디 찾기</h1>

        {recoveryResult === null ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">이메일 주소</label>
              <input
                type="email"
                placeholder="가입한 이메일을 입력해주세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">닉네임</label>
              <input
                type="text"
                placeholder="가입 시 입력한 닉네임을 입력해주세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <ActionButton
              onClick={handleSubmit}
              fullWidth
              loading={loading}
              size="lg"
              className="mt-1"
            >
              {loading ? '조회 중...' : '아이디 찾기'}
            </ActionButton>
          </div>
        ) : recoveryResult.accountType === 'SOCIAL_ONLY' ? (
          <SocialAccountResult
            providers={recoveryResult.oauthProviders ?? []}
            onRetry={handleRetry}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm font-semibold text-green-700">아이디를 찾았습니다</p>
              <p className="text-xs text-green-600 mt-1">입력하신 정보로 가입된 계정입니다.</p>
            </div>
            <div className="bg-gray-50 rounded-lg py-5 text-center">
              <div className="text-xs text-gray-500 mb-1">가입된 아이디</div>
              <div className="font-mono text-base font-bold text-gray-900">{recoveryResult.maskedLoginId}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                to="/login"
                tone="outline"
              >
                로그인하기
              </ActionButton>
              <ActionButton
                to="/reset-password"
                tone="neutral"
              >
                비밀번호 재설정
              </ActionButton>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="text-sm text-gray-400 hover:text-blue-600 transition"
            >
              다시 찾기
            </button>
          </div>
        )}

        <div className="text-center mt-6">
          <Link to="/login" className="text-sm text-gray-500 hover:text-blue-600 transition">
            ← 로그인으로 돌아가기
          </Link>
        </div>
      </AuthCard>
    </AuthPageContainer>
  );
}

function SocialAccountResult({ providers, onRetry }) {
  const supportedProviders = providers.filter((provider) => SOCIAL_PROVIDER_LABELS[provider]);
  const providerLabels = supportedProviders.map((provider) => SOCIAL_PROVIDER_LABELS[provider]);
  const providerText = providerLabels.join('·') || '소셜';

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-700">소셜 로그인 계정을 찾았습니다</p>
        <p className="mt-1 text-xs leading-5 text-blue-600">
          {providerText} 계정으로 가입한 회원입니다.<br />
          {providerText} 로그인을 이용해주세요.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {supportedProviders.map((provider) => (
          <a
            key={provider}
            href={getSocialLoginUrl(provider)}
            className="flex h-11 items-center justify-center rounded-lg border border-blue-600 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            {SOCIAL_PROVIDER_LABELS[provider]}로 로그인
          </a>
        ))}
        {supportedProviders.length === 0 && (
          <Link
            to="/login"
            className="flex h-11 items-center justify-center rounded-lg border border-blue-600 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            로그인 화면으로 이동
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="text-sm text-gray-400 transition hover:text-blue-600"
      >
        다시 찾기
      </button>
    </div>
  );
}
