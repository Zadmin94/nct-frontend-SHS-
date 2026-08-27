// src/pages/auth/WithdrawalRequestPage.jsx
// F-AUTH-011: 정지 계정 전용 탈퇴 확인 페이지. URL 쿼리파라미터(token) 유무로 두 상태를 하나의
// 라우트에서 처리한다(ResetPasswordPage.jsx와 동일 구조).
//   - token 없음: 로그인ID+이메일 입력 -> 탈퇴 확인 링크 발송 요청
//   - token 있음: 이메일 링크 클릭 후 도착 -> 탈퇴 확정 버튼
import { useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { requestWithdrawal, confirmWithdrawal } from '@api/memberApi';
import AuthPageContainer from '@components/auth/AuthPageContainer';
import AuthCard from '@components/auth/AuthCard';
import { ActionButton } from '@components/common/ui';
import { notify } from '@utils/common';

export default function WithdrawalRequestPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  return token ? <ConfirmStep token={token} /> : <RequestForm />;
}

// ── token 없음: 탈퇴 확인 링크 발송 요청 ──────────────────────
function RequestForm() {
  const location = useLocation();
  // @ai_generated: 로그인 화면의 "정지된 계정입니다" 안내에서 넘어올 때 입력했던 로그인ID를 이어받는다.
  const prefilledLoginId = location.state?.loginId ?? '';

  const [loginId, setLoginId] = useState(prefilledLoginId);
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
      await requestWithdrawal({ loginId, email });
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
        <h1 className="text-xl font-bold text-center mb-2">회원 탈퇴</h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          정지된 계정은 로그인 없이 이메일 확인을 거쳐 탈퇴를 진행합니다.
        </p>

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
                placeholder="example@email.com"
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
              tone="danger"
              className="mt-1"
            >
              {loading ? '발송 중...' : '탈퇴 확인 메일 받기'}
            </ActionButton>
          </div>
        ) : (
          <div className="flex flex-col gap-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center text-2xl">
              📧
            </div>
            <div>
              <h2 className="text-base font-bold mb-2">이메일을 확인해주세요</h2>
              <p className="text-sm text-gray-500">
                입력하신 이메일로<br />
                탈퇴 확인 링크를 발송했습니다.
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
                tone="danger-outline"
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

// ── token 있음: 탈퇴 확정 ────────────────────────────────────
function ConfirmStep({ token }) {
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [invalid, setInvalid] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmWithdrawal(token);
      setDone(true);
    } catch (error) {
      // @ai_generated: 만료(409)·사용완료(409)·존재하지않음(404)을 화면에서 구분하지 않는다.
      const status = error.response?.status;
      if (status === 404 || status === 409) {
        setInvalid(true);
      } else if (error.response?.data?.message) {
        await notify({ icon: 'error', title: error.response.data.message });
      } else {
        await notify({ icon: 'error', title: '탈퇴 확정 중 오류가 발생했습니다.' });
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
            이미 사용되었거나 만료된 링크입니다.<br />탈퇴를 다시 요청해주세요.
          </p>
          <Link
            to="/withdrawal"
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
          <h1 className="text-lg font-bold mb-2">탈퇴가 완료되었습니다</h1>
          <p className="text-sm text-gray-500 mb-8">그동안 이용해 주셔서 감사합니다.</p>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-base font-bold transition"
          >
            로그인 화면으로
          </Link>
        </AuthCard>
      </AuthPageContainer>
    );
  }

  return (
    <AuthPageContainer>
      <AuthCard className="max-w-110 text-center">
        <h1 className="text-xl font-bold mb-2">회원 탈퇴 확인</h1>
        <p className="text-sm text-gray-500 mb-8">
          아래 버튼을 누르면 계정 탈퇴가 즉시 진행되며 되돌릴 수 없습니다.
        </p>
        <ActionButton
          onClick={handleConfirm}
          fullWidth
          loading={loading}
          size="lg"
          tone="danger"
        >
          {loading ? '처리 중...' : '탈퇴 확정하기'}
        </ActionButton>
      </AuthCard>
    </AuthPageContainer>
  );
}
