// src/pages/auth/ResetPasswordPage.jsx
// F-AUTH-007: 이 페이지는 URL 쿼리파라미터(token) 유무로 두 상태를 하나의 라우트에서 처리한다.
//   - token 없음: 아이디+이메일 입력 -> 재설정 링크 발송 요청
//   - token 있음: 이메일 링크 클릭 후 도착 -> 새 비밀번호 입력 -> 확정
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { requestPasswordReset, confirmPasswordReset } from '@api/authApi';
import AuthPageContainer from '@components/auth/AuthPageContainer';
import AuthCard from '@components/auth/AuthCard';
import { ActionButton } from '@components/common/ui';
import { isValidNewPassword, PASSWORD_POLICY_GUIDE } from '@utils/passwordPolicy';
import { notify } from '@utils/common';

// @ai_generated: 목업(38_password_reset.html)의 이메일 마스킹 규칙을 그대로 재사용한다.
const maskEmail = (email) =>
  email.replace(/^(.{1,2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, '*') + c);

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  return token ? <ConfirmForm token={token} /> : <RequestForm />;
}

// ── token 없음: 재설정 링크 발송 요청 ──────────────────────────
function RequestForm() {
  const [loginId, setLoginId] = useState('');
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async () => {
    if (!loginId.trim() || !email.trim()) {
      await notify({ icon: 'warning', title: '아이디와 이메일을 입력해주세요.', size: 'sm' });
      return;
    }

    setLoading(true);
    try {
      // @ai_generated: 계정 상태와 무관하게 서버가 항상 동일한 성공 응답을 준다.
      await requestPasswordReset({ loginId, email });
      setSent(true);
    } catch (error) {
      if (error.response?.status === 429) {
        await notify({
          icon: 'warning',
          title: error.response.data?.message ?? '잠시 후 다시 시도해주세요.',
        });
      } else {
        await notify({ icon: 'error', title: '요청 처리 중 오류가 발생했습니다.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleResend = () => handleSubmit();

  return (
    <AuthPageContainer>
      <AuthCard className="max-w-110">
        <h1 className="text-xl font-bold text-center mb-8">비밀번호 재설정</h1>

        {!sent ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">아이디</label>
              <input
                type="text"
                placeholder="가입 시 사용한 아이디"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

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

            <ActionButton
              onClick={handleSubmit}
              fullWidth
              loading={loading}
              size="lg"
              className="mt-1"
            >
              {loading ? '발송 중...' : '재설정 링크 발송'}
            </ActionButton>
          </div>
        ) : (
          <div className="flex flex-col gap-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-2xl">
              📧
            </div>
            <div>
              <h2 className="text-base font-bold mb-2">이메일을 확인해주세요</h2>
              <p className="text-sm text-gray-500">
                <strong className="text-gray-700">{maskEmail(email)}</strong>으로<br />
                비밀번호 재설정 링크를 발송했습니다.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                소셜 가입 회원은 가입한 소셜 계정으로 로그인해주세요.
              </p>
            </div>
            <ul className="text-xs text-gray-500 text-left bg-gray-50 rounded-lg px-4 py-3 space-y-1.5">
              <li>링크는 발송 후 <strong className="text-gray-700">1시간</strong> 동안 유효합니다.</li>
              <li>링크는 <strong className="text-gray-700">1회만</strong> 사용할 수 있습니다.</li>
              <li>메일이 오지 않으면 스팸함을 확인해주세요.</li>
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                onClick={() => setSent(false)}
                tone="neutral"
              >
                다시 입력하기
              </ActionButton>
              <ActionButton
                onClick={handleResend}
                loading={loading}
                tone="outline"
              >
                재발송 요청
              </ActionButton>
            </div>
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

// ── token 있음: 새 비밀번호 입력·확정 ──────────────────────────
function ConfirmForm({ token }) {
  const [newPassword,        setNewPassword]        = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm]  = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState({ newPassword: false, newPasswordConfirm: false });
  const [loading,            setLoading]             = useState(false);
  const [done,                setDone]                = useState(false);
  const [invalid,             setInvalid]             = useState(false);

  const handleSubmit = async () => {
    if (!newPassword.trim() || !newPasswordConfirm.trim()) {
      await notify({ icon: 'warning', title: '새 비밀번호를 입력해주세요.', size: 'sm' });
      return;
    }
    if (!isValidNewPassword(newPassword)) {
      await notify({ icon: 'warning', title: PASSWORD_POLICY_GUIDE, size: 'sm' });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      await notify({ icon: 'warning', title: '비밀번호가 일치하지 않습니다.', size: 'sm' });
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({ token, newPassword });
      setDone(true);
    } catch (error) {
      // @ai_generated: 만료(409)·사용완료(409)·존재하지않음(404)을 화면에서 구분하지 않는다.
      const status = error.response?.status;
      if (status === 404 || status === 409) {
        setInvalid(true);
      } else if (error.response?.data?.message) {
        await notify({ icon: 'error', title: error.response.data.message });
      } else {
        await notify({ icon: 'error', title: '비밀번호 재설정 중 오류가 발생했습니다.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (invalid) {
    return (
      <AuthPageContainer>
        <AuthCard className="max-w-110 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">⚠️</div>
          <h1 className="text-lg font-bold mb-2">링크가 유효하지 않습니다</h1>
          <p className="text-sm text-gray-500 mb-8">
            이미 사용되었거나 만료된 링크입니다.<br />비밀번호 재설정을 다시 요청해주세요.
          </p>
          <Link
            to="/reset-password"
            className="inline-flex h-12 items-center justify-center w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-base font-bold transition"
          >
            다시 요청하기
          </Link>
        </AuthCard>
      </AuthPageContainer>
    );
  }

  if (done) {
    return (
      <AuthPageContainer>
        <AuthCard className="max-w-110 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center text-2xl mb-4">✅</div>
          <h1 className="text-lg font-bold mb-2">비밀번호가 변경되었습니다</h1>
          <p className="text-sm text-gray-500 mb-8">
            보안을 위해 기존에 로그인되어 있던 모든 기기에서 자동으로 로그아웃됩니다.<br />
            새 비밀번호로 다시 로그인해주세요.
          </p>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-base font-bold transition"
          >
            로그인하기
          </Link>
        </AuthCard>
      </AuthPageContainer>
    );
  }

  return (
    <AuthPageContainer>
      <AuthCard className="max-w-110">
        <h1 className="text-xl font-bold text-center mb-2">새 비밀번호 설정</h1>
        <p className="text-sm text-gray-500 text-center mb-8">변경 후 모든 기기에서 자동으로 로그아웃됩니다.</p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">새 비밀번호</label>
            <div className="relative">
              <input type={passwordVisibility.newPassword ? 'text' : 'password'} placeholder="8~64자, 영문·숫자·특수문자 중 2종 이상" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-12 px-4 pr-11 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <button type="button" onClick={() => setPasswordVisibility((previous) => ({ ...previous, newPassword: !previous.newPassword }))} aria-label={passwordVisibility.newPassword ? '새 비밀번호 숨기기' : '새 비밀번호 보기'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">
                {passwordVisibility.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">새 비밀번호 확인</label>
            <div className="relative">
              <input type={passwordVisibility.newPasswordConfirm ? 'text' : 'password'} placeholder="새 비밀번호를 다시 입력해주세요" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} className="w-full h-12 px-4 pr-11 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <button type="button" onClick={() => setPasswordVisibility((previous) => ({ ...previous, newPasswordConfirm: !previous.newPasswordConfirm }))} aria-label={passwordVisibility.newPasswordConfirm ? '새 비밀번호 확인 숨기기' : '새 비밀번호 확인 보기'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">
                {passwordVisibility.newPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <ActionButton
            onClick={handleSubmit}
            fullWidth
            loading={loading}
            size="lg"
            className="mt-1"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </ActionButton>
        </div>
      </AuthCard>
    </AuthPageContainer>
  );
}
