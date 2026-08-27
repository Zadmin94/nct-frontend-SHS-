import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthCard from '@components/auth/AuthCard';
import AuthPageContainer from '@components/auth/AuthPageContainer';
import { useAuth } from '@hooks/useAuth';
import { getAdminDemoAccount } from '@/constants/demoAccounts';

const ADMIN_HOME = '/admin';
const ADMIN_LOGIN = '/admin/login';

const isAdminPath = (path) => (
  path === ADMIN_HOME
  || path.startsWith(`${ADMIN_HOME}/`)
  || path.startsWith(`${ADMIN_HOME}?`)
  || path.startsWith(`${ADMIN_HOME}#`)
);

const getAdminReturnPath = (location) => {
  const returnLocation = location.state?.from;
  const statePath = returnLocation?.pathname
    ? `${returnLocation.pathname}${returnLocation.search ?? ''}${returnLocation.hash ?? ''}`
    : null;
  const storedPath = sessionStorage.getItem('adminLoginRedirectFrom');
  const candidate = statePath || storedPath || ADMIN_HOME;

  return isAdminPath(candidate) && !candidate.startsWith(ADMIN_LOGIN)
    ? candidate
    : ADMIN_HOME;
};

/**
 * 담당자 7 · F-OPS-001: 관리자 계정만 허용하는 전용 로그인 화면입니다.
 * 관리자 전용 로그인 API를 사용하며 소셜·가입 경로는 제공하지 않습니다.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLogin, rejectCurrentSession, user, loading: authLoading } = useAuth();
  // @author 황희준
  // @intent 관리자 전용 데모 역할 키만 허용해 기존 관리자 인증 계약을 바꾸지 않고 입력값만 채운다.
  const demoAccount = getAdminDemoAccount(location.state?.demoAccount);
  const [loginId, setLoginId] = useState(demoAccount?.loginId ?? '');
  const [password, setPassword] = useState(demoAccount?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const rejectingExistingSessionRef = useRef(false);
  const returnPath = getAdminReturnPath(location);

  useEffect(() => {
    if (!authLoading && user?.role === 'ROLE_ADMIN') {
      sessionStorage.removeItem('adminLoginRedirectFrom');
    }
  }, [authLoading, user?.role]);

  useEffect(() => {
    if (
      !authLoading
      && !submitting
      && user
      && user.role !== 'ROLE_ADMIN'
      && !rejectingExistingSessionRef.current
    ) {
      rejectingExistingSessionRef.current = true;
      void rejectCurrentSession()
        .catch(() => undefined)
        .finally(() => {
          rejectingExistingSessionRef.current = false;
        });
    }
  }, [authLoading, rejectCurrentSession, submitting, user]);

  if (!authLoading && user?.role === 'ROLE_ADMIN') {
    return <Navigate to={returnPath} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedLoginId = loginId.trim();

    if (!normalizedLoginId || !password) {
      setErrorMessage('아이디와 비밀번호를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const userData = await adminLogin({
        email: normalizedLoginId,
        password,
        rememberMe,
      });

      if (userData?.role !== 'ROLE_ADMIN') {
        try {
          await rejectCurrentSession();
        } catch {
          // 서버 요청 실패 여부로 계정 유형이나 내부 상태를 노출하지 않는다.
        }
        setPassword('');
        setErrorMessage('관리자 계정 정보를 확인해 주세요.');
        return;
      }

      sessionStorage.removeItem('adminLoginRedirectFrom');
      navigate(returnPath, { replace: true });
    } catch (error) {
      if (error.response?.status === 401) {
        setErrorMessage('관리자 계정 정보를 확인해 주세요.');
      } else {
        setErrorMessage('로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageContainer className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_#1e3a5f_0,_#0f172a_42%,_#020617_100%)]">
      <AuthCard className="max-w-105 border border-slate-200/70 shadow-2xl shadow-slate-950/30">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">관리자 로그인</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            관리자 권한이 있는 계정으로 로그인해 주세요.
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700" htmlFor="admin-login-id">
              아이디
            </label>
            <input
              id="admin-login-id"
              type="text"
              autoComplete="username"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              className="h-12 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="관리자 아이디"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700" htmlFor="admin-password">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-300 px-4 pr-12 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="비밀번호"
              />
              <button
                type="button"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex w-fit cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-700"
            />
            <span className="text-sm text-slate-500">하루동안 로그인 유지</span>
          </label>

          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || authLoading}
            className="mt-1 h-12 w-full cursor-pointer rounded-lg bg-blue-700 text-base font-bold text-white transition hover:bg-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '확인 중...' : '관리자 로그인'}
          </button>
        </form>
      </AuthCard>
    </AuthPageContainer>
  );
}
