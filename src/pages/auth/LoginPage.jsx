// src/pages/auth/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import BrandLogo from '@components/common/BrandLogo';
import AuthPageContainer from '@components/auth/AuthPageContainer';
import AuthCard from '@components/auth/AuthCard';
import { ActionButton } from '@components/common/ui';
import { createSuspendedInquiry } from '@api/customerInquiryApi';
import { notify } from '@utils/common';
import { getMemberDemoAccount } from '@/constants/demoAccounts';

// ── 소셜 로그인 버튼 데이터 ──────────────────────────────
const SOCIAL_PROVIDERS = [
  {
    key     : 'kakao',
    label   : '카카오',
    bg      : '#FEE500',
    color   : '#181600',
    href    : () => `${import.meta.env.VITE_API_URL}/api/oauth2/authorization/kakao`,
    icon    : (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
        <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.6 5.1 4 6.6l-1 3.6 4.2-2.8c.9.2 1.8.3 2.8.3 5.52 0 10-3.48 10-7.7S17.52 3 12 3z"/>
      </svg>
    ),
  },
  {
    key     : 'naver',
    label   : '네이버',
    bg      : '#03C75A',
    color   : '#fff',
    href    : () => `${import.meta.env.VITE_API_URL}/api/oauth2/authorization/naver`,
    icon    : (
      <span style={{ fontWeight: 900, fontSize: '18px', lineHeight: 1 }}>N</span>
    ),
  },
  {
    key     : 'google',
    label   : '구글',
    bg      : '#fff',
    color   : '#444',
    border  : '1.5px solid #e2e2e2',
    href    : () => `${import.meta.env.VITE_API_URL}/api/oauth2/authorization/google`,
    icon    : (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
];

// ── LoginPage ─────────────────────────────────────────────
export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();
  // @author 황희준
  // @intent 일반·제공자 데모 역할 키만 허용해 기존 로그인 화면의 초기 입력값을 안전하게 채운다.
  const demoAccount = getMemberDemoAccount(location.state?.demoAccount);

  // 담당자 7: 헤더의 로그인 게이트에서 전달한 검색조건·해시까지 로그인 후 복원한다.
  const returnLocation = location.state?.from;
  const stateReturnPath = returnLocation?.pathname
    ? `${returnLocation.pathname}${returnLocation.search ?? ''}${returnLocation.hash ?? ''}`
    : null;
  const from = stateReturnPath
    || sessionStorage.getItem('loginRedirectFrom')
    || '/';

  const [userId,       setUserId]       = useState(demoAccount?.loginId ?? '');
  const [password,     setPassword]     = useState(demoAccount?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  // @ai_generated: F-AUTH-011 - 정지 계정은 로그인이 막혀 있어, alert 대신 탈퇴 요청 경로로 안내한다.
  const [suspendedLoginId, setSuspendedLoginId] = useState(null);
  // @ai_generated: F-AUTH-017/POL-AUTH-016 - 정지 계정 로그인 실패 응답에 실리는 비로그인 문의
  // 접수용 단발성 토큰과, 그 토큰으로 접수하는 문의 폼 상태.
  const [suspendedInquiryToken, setSuspendedInquiryToken] = useState(null);
  const [inquiryForm, setInquiryForm] = useState({ title: '', content: '' });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [inquiryError, setInquiryError] = useState('');

  // ── 일반 로그인 ───────────────────────────────────────
  const handleLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      await notify({ icon: 'warning', title: '아이디와 비밀번호를 입력해주세요.', size: 'sm' });
      return;
    }

    setLoading(true);
    try {
      const payload = { email: userId, password: password, rememberMe };
      await login(payload);

      sessionStorage.removeItem('loginRedirectFrom');

      const safePath = from.startsWith('/admin') ? '/' : from;
      navigate(safePath, { replace: true });
    } catch (error) {
      // @ai_generated: F-AUTH-011/017 - ACCOUNT_SUSPENDED만 따로 분기해 고객센터 안내 + 비로그인
      // 문의 접수 폼이 있는 모달로 안내한다. WITHDRAWN_USER 등 나머지는 공통 알림으로 안내한다.
      if (error.response?.data?.code === 'ACCOUNT_SUSPENDED') {
        setSuspendedLoginId(userId);
        setSuspendedInquiryToken(error.response?.data?.data?.inquiryToken ?? null);
      } else if (error.response?.status === 401) {
        await notify({ icon: 'error', title: '아이디 또는 비밀번호가 일치하지 않습니다.' });
      } else if (error.response?.data?.message) {
        await notify({ icon: 'error', title: error.response.data.message });
      } else {
        await notify({ icon: 'error', title: '로그인 처리 중 오류가 발생했습니다.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // @ai_generated: F-AUTH-017/POL-AUTH-016 - 정지 계정 비로그인 문의 접수. 토큰은 1회용이라
  // 성공하면 서버에서 즉시 소진되고, 또 접수하려면 로그인을 다시 시도해 새 토큰을 받아야 한다.
  const handleSuspendedInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryForm.title.trim() || !inquiryForm.content.trim()) {
      setInquiryError('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setInquirySubmitting(true);
    setInquiryError('');
    try {
      await createSuspendedInquiry({
        inquiryToken: suspendedInquiryToken,
        title: inquiryForm.title.trim(),
        content: inquiryForm.content.trim(),
      });
      setInquirySubmitted(true);
    } catch (error) {
      const msg = error?.response?.data?.message || '문의 접수에 실패했습니다.';
      setInquiryError(msg);
    } finally {
      setInquirySubmitting(false);
    }
  };

  // Enter 키 로그인
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  // ── 소셜 로그인 ───────────────────────────────────────
  const handleSocialLogin = (provider) => {
    sessionStorage.setItem('loginRedirectFrom', from);
    // @ai_generated: 소셜 로그인은 별도 화면이 없어, 이 체크박스 상태를 짧은 쿠키로 실어 보내
    // 백엔드(OAuth2SuccessHandler/온보딩 완료)가 로그인 유지 여부를 판단하게 한다.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `oauth_remember_me=${rememberMe}; path=/; max-age=600`;
    window.location.assign(provider.href());
  };

  // ── 렌더 ─────────────────────────────────────────────
  return (
    <>
      <AuthPageContainer>
        <AuthCard className="max-w-110">

        {/* @ai_generated: 공통 헤더와 별개로 카드 중앙 브랜드 로고를 유지한다. */}
        <div className="text-center mb-8">
          <Link aria-label="에누리컷 홈" className="inline-flex" to="/">
            <BrandLogo className="brand-logo--auth" />
          </Link>
        </div>

        {/* 입력 폼 */}
        <div className="flex flex-col gap-4">

          {/* 아이디 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">아이디</label>
            <input
              type="text"
              placeholder="아이디를 입력해주세요"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={handleKeyDown}
              className="
                w-full h-12 px-4 rounded-lg border border-gray-300
                text-sm text-gray-900 placeholder-gray-400
                outline-none transition
                focus:border-blue-500 focus:ring-2 focus:ring-blue-100
              "
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">비밀번호</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력해주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="
                  w-full h-12 px-4 pr-11 rounded-lg border border-gray-300
                  text-sm text-gray-900 placeholder-gray-400
                  outline-none transition
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />
                }
              </button>
            </div>
          </div>

          {/* 하루동안 로그인 유지 */}
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm text-gray-500">하루동안 로그인 유지</span>
          </label>

          {/* 로그인 버튼 */}
          <ActionButton
            onClick={handleLogin}
            fullWidth
            loading={loading}
            size="lg"
            className="mt-1"
          >
            {loading ? '로그인 중...' : '로그인'}
          </ActionButton>
        </div>

        {/* 회원가입 | 아이디 찾기 | 비밀번호 찾기 */}
        <div className="flex items-center justify-between mt-5 text-sm">
          <Link
            to="/login/signup"
            className="font-semibold text-gray-700 hover:text-blue-600 transition [text-decoration:underline] underline-offset-2"
          >
            회원가입 →
          </Link>
          <div className="flex items-center gap-2 text-gray-500">
            <Link to="/find-email"      className="hover:text-blue-600 transition">아이디 찾기</Link>
            <span className="text-gray-300">|</span>
            <Link to="/reset-password"  className="hover:text-blue-600 transition">비밀번호 찾기</Link>
          </div>
        </div>

        {/* 소셜 로그인 */}
        <div className="mt-7">
          <div className="flex items-center justify-center gap-6">
            {SOCIAL_PROVIDERS.map((provider) => (
              <div key={provider.key} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSocialLogin(provider)}
                  className="
                    w-14 h-14 rounded-full flex items-center justify-center
                    shadow-sm hover:brightness-95 active:scale-95
                    transition-all duration-150 cursor-pointer
                  "
                  style={{
                    background : provider.bg,
                    color      : provider.color,
                    border     : provider.border ?? 'none',
                  }}
                  aria-label={`${provider.label} 로그인`}
                >
                  {provider.icon}
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  {provider.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        </AuthCard>
      </AuthPageContainer>

      {/* 정지 계정 안내 모달 (F-AUTH-011/017, POL-AUTH-013/016) */}
      {/* @ai_generated: ISS-026 - 탈퇴 유도 버튼 대신 고객센터 안내로 대체(Option B).
          /withdrawal(정지 계정 전용 이메일 링크 탈퇴)은 코드·기존 발급 링크 모두 그대로 유지하되,
          이 화면에서의 새 진입 버튼만 제거한다.
          @ai_generated: ISS-030 - 고객센터 전화 안내만으로는 문의를 "제출"할 방법이 없었다.
          이 모달에서 받은 inquiryToken(로그인 실패 응답에 포함, 세션 없이도 유효)으로 로그인 없이
          문의를 접수한다. */}
      {suspendedLoginId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-100 bg-white rounded-2xl shadow-lg px-8 py-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">⚠️</div>
            <h2 className="text-base font-bold mb-2">정지된 계정입니다</h2>
            <p className="text-sm text-gray-500 mb-6">
              계정 이용에 대한 문의는 아래 고객센터로 연락하시거나, 문의를 남겨주시면
              답변을 등록된 이메일로 보내드립니다.<br />
              <a href="tel:070-1234-5678" className="font-semibold text-gray-700">070-1234-5678</a>
              <br />평일 10:00 - 18:00 (점심시간 12:00 - 13:00 제외 · 주말/공휴일 제외)
            </p>

            {suspendedInquiryToken && !inquirySubmitted && (
              <form onSubmit={handleSuspendedInquirySubmit} className="text-left mb-4">
                <input
                  type="text"
                  placeholder="제목"
                  value={inquiryForm.title}
                  onChange={(e) => setInquiryForm((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={inquirySubmitting}
                  className="w-full h-10 mb-2 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500"
                />
                <textarea
                  placeholder="문의 내용을 입력해주세요."
                  value={inquiryForm.content}
                  onChange={(e) => setInquiryForm((prev) => ({ ...prev, content: e.target.value }))}
                  disabled={inquirySubmitting}
                  rows={3}
                  className="w-full mb-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                />
                {inquiryError && <p className="text-xs text-red-600 mb-2">{inquiryError}</p>}
                <ActionButton
                  type="submit"
                  fullWidth
                  loading={inquirySubmitting}
                  size="sm"
                >
                  {inquirySubmitting ? '접수 중...' : '문의 접수하기'}
                </ActionButton>
              </form>
            )}
            {inquirySubmitted && (
              <p className="text-sm text-blue-600 font-semibold mb-4">
                문의가 접수되었습니다. 답변은 이메일로 안내드립니다.
              </p>
            )}

            <ActionButton
              onClick={() => {
                setSuspendedLoginId(null);
                setSuspendedInquiryToken(null);
                setInquiryForm({ title: '', content: '' });
                setInquirySubmitted(false);
                setInquiryError('');
              }}
              fullWidth
              tone="neutral"
            >
              닫기
            </ActionButton>
          </div>
        </div>
      )}
    </>
  );
}
