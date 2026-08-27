// src/pages/auth/OAuthOnboardingPage.jsx
// @ai_generated: 작업단위5(F-AUTH-004 온보딩, ISS-009/POL-AUTH-015)
// 소셜 최초 가입은 여기서 약관 동의 + 닉네임 확정을 마쳐야 완결된다(콜백 시점엔 계정이 아직 없음).
// 약관 원문(SIGNUP_TERMS)은 SignupPage.jsx와 동일 파일을 그대로 재사용해 문구 드리프트를 막는다.
// AgreementRow/AgreementModal 자체는 SignupPage.jsx의 복잡한 폼 상태(중복확인·이메일인증 등)와
// 얽혀 있어 안전하게 분리 추출하기보다, 이 화면(체크박스 3개+모달)에 맞는 가벼운 버전을 새로 둔다.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useConfig } from '@hooks/useConfig';
import { checkNickname, completeOauthOnboarding, getOauthOnboardingPending } from '@api/authApi';
import AuthPageContainer from '@components/auth/AuthPageContainer';
import AuthCard from '@components/auth/AuthCard';
import { ActionButton } from '@components/common/ui';
import { SIGNUP_TERMS } from './signupTerms';
import { formatPhoneNumber, isValidPhoneNumber, toPhoneDigits } from '@utils/phoneNumber';
import FormSkeleton from '@components/skeleton/FormSkeleton';
import DaumPostcode from 'react-daum-postcode';

const AGREEMENT_ITEMS = [
  { key: 'terms', code: 'AGRC0001', label: '서비스이용약관', required: true },
  { key: 'privacy', code: 'AGRC0002', label: '개인정보처리방침', required: true },
  { key: 'marketing', code: 'AGRC0003', label: '마케팅 정보 수신', required: false },
];

const PROVIDER_LABELS = { kakao: '카카오', naver: '네이버', google: '구글' };

const AgreementRow = ({ agreement, checked, onChange, onOpen }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3.5 py-3">
    <label className="flex min-w-0 items-center gap-2 text-sm text-gray-900">
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span>
        {agreement.label}
        {agreement.required ? '(필수)' : '(선택)'}
      </span>
    </label>
    <ActionButton
      onClick={onOpen}
      className="shrink-0"
      size="sm"
      tone="neutral"
    >
      보기
    </ActionButton>
  </div>
);

const AgreementModal = ({ agreement, onClose }) => {
  const terms = SIGNUP_TERMS[agreement.code];

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6" role="dialog">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="m-0 text-xl">{terms?.title ?? agreement.label}</h2>
        {terms ? (
          <>
            <p className="mt-1 text-xs text-gray-400">시행일자 {terms.effectiveDate}</p>
            <p className="mt-4 text-sm leading-6 text-gray-600">{terms.summary}</p>
            <div className="mt-4 grid gap-4 overflow-y-auto pr-1">
              {terms.articles.map((article) => (
                <section key={article.heading}>
                  <h3 className="m-0 text-sm font-semibold text-gray-900">{article.heading}</h3>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-6 text-gray-600">{article.body}</p>
                </section>
              ))}
            </div>
          </>
        ) : null}
        <div className="mt-6 flex justify-end">
          <ActionButton
            onClick={onClose}
            size="sm"
          >
            닫기
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

const OAuthOnboardingPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setConfig } = useConfig();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [provider, setProvider] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  // @ai_generated: 현재 닉네임 값에 대한 중복 확인 결과만 가입 조건으로 인정한다.
  const [nicknameAvailability, setNicknameAvailability] = useState({
    checkedValue: '',
    state: 'idle',
    message: '',
  });
  const nicknameRequestRef = useRef(0);
  const [optionalInfo, setOptionalInfo] = useState({ telno: '', address: '', zip: '', detailAddress: '', bankName: '', accountNo: '' });
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  const [optionalInfoError, setOptionalInfoError] = useState('');
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, marketing: false });
  const [openAgreement, setOpenAgreement] = useState(null);
  const [agreementMessage, setAgreementMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await getOauthOnboardingPending();
        setProvider(response?.data?.provider ?? '');
        setNickname(response?.data?.nickname ?? '');
      } catch {
        setLoadError('온보딩 정보를 찾을 수 없습니다. 소셜 로그인을 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allAgreed = AGREEMENT_ITEMS.every((agreement) => agreements[agreement.key]);
  const requiredAgreed = agreements.terms && agreements.privacy;
  const selectedAgreement = AGREEMENT_ITEMS.find((agreement) => agreement.key === openAgreement);

  const handleAgreementChange = (key) => (event) => {
    setAgreements((previous) => ({ ...previous, [key]: event.target.checked }));
    setAgreementMessage('');
    setSubmitMessage('');
  };

  const handleAllAgreements = (event) => {
    const checked = event.target.checked;
    setAgreements({ terms: checked, privacy: checked, marketing: checked });
    setAgreementMessage('');
    setSubmitMessage('');
  };

  // @ai_generated: OAuth 온보딩 선택정보는 로컬 가입과 같은 전화번호·계좌 입력 계약을 사용한다.
  const handleOptionalInfoChange = (field) => (event) => {
    const value = field === 'telno' ? formatPhoneNumber(event.target.value) : event.target.value;
    setOptionalInfo((previous) => ({ ...previous, [field]: value }));
    setOptionalInfoError('');
  };

  // @ai_generated: 입력값이 바뀌면 이전 확인 결과와 진행 중 응답을 모두 무효화한다.
  const handleNicknameChange = (event) => {
    nicknameRequestRef.current += 1;
    setNickname(event.target.value);
    setNicknameError('');
    setNicknameAvailability({ checkedValue: '', state: 'idle', message: '' });
  };

  // @ai_generated: 일반 회원가입과 동일한 닉네임 중복 확인 API를 재사용한다.
  const handleNicknameCheck = async () => {
    const trimmedNickname = nickname.trim();
    const requestId = nicknameRequestRef.current + 1;
    nicknameRequestRef.current = requestId;
    if (!trimmedNickname) {
      setNicknameError('닉네임을 입력해주세요.');
      return;
    }
    if (trimmedNickname.length > 100) {
      setNicknameError('닉네임은 100자 이하로 입력해주세요.');
      return;
    }

    setNicknameError('');
    setNicknameAvailability({
      checkedValue: trimmedNickname,
      state: 'checking',
      message: '확인 중입니다.',
    });

    try {
      const response = await checkNickname(trimmedNickname);
      const available = response?.data?.available;
      if (typeof available !== 'boolean') {
        throw new Error('중복 확인 응답 형식이 올바르지 않습니다.');
      }
      if (nicknameRequestRef.current !== requestId) return;

      setNicknameAvailability({
        checkedValue: trimmedNickname,
        state: available ? 'available' : 'unavailable',
        message: available ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.',
      });
    } catch (error) {
      if (nicknameRequestRef.current !== requestId) return;
      setNicknameAvailability({
        checkedValue: trimmedNickname,
        state: 'error',
        message: error.response?.data?.message ?? '중복 확인 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleSubmit = async () => {
    setSubmitMessage('');
    setAgreementMessage('');

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setNicknameError('닉네임을 입력해주세요.');
      return;
    }
    if (trimmedNickname.length > 100) {
      setNicknameError('닉네임은 100자 이하로 입력해주세요.');
      return;
    }
    setNicknameError('');

    if (
      nicknameAvailability.state !== 'available'
      || nicknameAvailability.checkedValue !== trimmedNickname
    ) {
      // @ai_generated: 이미 중복 판정 메시지가 있으면 미확인 안내를 추가로 겹쳐 표시하지 않는다.
      if (
        nicknameAvailability.state !== 'unavailable'
        || nicknameAvailability.checkedValue !== trimmedNickname
      ) {
        setNicknameError('가입 전에 닉네임 중복 확인을 완료해주세요.');
      }
      return;
    }

    // @ai_generated: ISS-023 - 전화번호가 선택에서 필수로 전환됐다.
    if (!optionalInfo.telno.trim()) {
      setOptionalInfoError('전화번호를 입력해주세요.');
      return;
    }
    if (!isValidPhoneNumber(optionalInfo.telno)) {
      setOptionalInfoError('전화번호는 0으로 시작하는 11자리 숫자를 입력해주세요.');
      return;
    }
    if (Boolean(optionalInfo.address.trim()) !== Boolean(optionalInfo.zip.trim())) {
      setOptionalInfoError('주소 검색으로 주소와 우편번호를 함께 입력해주세요.');
      return;
    }
    if (optionalInfo.detailAddress.trim() && !optionalInfo.address.trim()) {
      setOptionalInfoError('주소 검색 후 상세주소를 입력해주세요.');
      return;
    }
    if (Boolean(optionalInfo.bankName.trim()) !== Boolean(optionalInfo.accountNo.trim())) {
      setOptionalInfoError('은행명과 계좌번호는 함께 입력해주세요.');
      return;
    }

    if (!requiredAgreed) {
      setAgreementMessage('서비스이용약관과 개인정보처리방침에 모두 동의해야 가입할 수 있습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await completeOauthOnboarding({
        nickname: trimmedNickname,
        telno: toPhoneDigits(optionalInfo.telno),
        address: optionalInfo.address.trim(),
        zip: optionalInfo.zip.trim(),
        detailAddress: optionalInfo.detailAddress.trim(),
        bankName: optionalInfo.bankName.trim(),
        accountNo: optionalInfo.accountNo.trim(),
        agreements: AGREEMENT_ITEMS.map((agreement) => ({
          agreementTypeCode: agreement.code,
          agreed: agreements[agreement.key],
        })),
      });

      const userData = response?.data;
      localStorage.setItem('isLogin', 'true');
      setConfig('user', userData);
      queryClient.setQueryData(['auth', 'user'], userData);

      const from = sessionStorage.getItem('loginRedirectFrom');
      sessionStorage.removeItem('loginRedirectFrom');
      navigate(userData?.role === 'ROLE_ADMIN' ? '/admin' : (from || '/'), { replace: true });
    } catch (error) {
      const message = error.response?.data?.message ?? '가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.';
      if (message.includes('닉네임')) {
        setNicknameError('');
        setNicknameAvailability({
          checkedValue: trimmedNickname,
          state: 'unavailable',
          message,
        });
      } else {
        setSubmitMessage(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthPageContainer>
        <AuthCard className="max-w-100">
          <FormSkeleton fields={5} />
        </AuthCard>
      </AuthPageContainer>
    );
  }

  if (loadError) {
    return (
      <AuthPageContainer>
        <AuthCard className="max-w-100 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">⚠️</div>
          <h2 className="text-base font-bold mb-2">온보딩 정보 없음</h2>
          <p className="text-sm text-gray-500 mb-8">{loadError}</p>
          <ActionButton
            fullWidth
            replace
            to="/login"
          >
            로그인으로 돌아가기
          </ActionButton>
        </AuthCard>
      </AuthPageContainer>
    );
  }

  return (
    <AuthPageContainer>
      {/* .container + Tailwind py-* 병용 시 App.css shorthand가 레이어 충돌로 상하 패딩을 무력화 — 인라인 style로 우회 */}
      <section className="container text-[#1a1a18]" style={{ paddingTop: '28px', paddingBottom: '28px' }}>
        <header className="mb-4 flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px]">{PROVIDER_LABELS[provider] ?? '소셜'} 계정으로 가입을 완료합니다</h1>
          <p className="m-0 text-xs text-[#888780]">닉네임과 선택 정보를 입력하고 약관에 동의하면 가입이 완료됩니다.</p>
        </header>

        <div className="grid gap-6">
          <section aria-labelledby="agreement-title" className="rounded-2xl border border-[#f0efec] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_2px_8px_rgba(0,0,0,.06)]">
            <h2 className="m-0 text-lg" id="agreement-title">약관 동의</h2>
            <label className="mt-3.5 inline-flex items-center gap-2 text-sm text-[#1a1a18]">
              <input checked={allAgreed} onChange={handleAllAgreements} type="checkbox" />
              전체 동의
            </label>
            <div className="mt-3.5 grid gap-2.5 lg:grid-cols-3">
              {AGREEMENT_ITEMS.map((agreement) => (
                <AgreementRow
                  agreement={agreement}
                  checked={agreements[agreement.key]}
                  key={agreement.key}
                  onChange={handleAgreementChange(agreement.key)}
                  onOpen={() => setOpenAgreement(agreement.key)}
                />
              ))}
            </div>
            {agreementMessage ? <p aria-live="polite" className="mt-3 text-xs text-red-600">{agreementMessage}</p> : null}
          </section>

          <div>
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <section aria-labelledby="basic-info-title" className="rounded-2xl border border-[#f0efec] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_2px_8px_rgba(0,0,0,.06)]">
                <h2 className="m-0 text-lg" id="basic-info-title">기본 정보</h2>
                <div className="mt-3.5 rounded-lg border border-[#e2e1dc] bg-[#fafaf8] px-4 py-3">
                  <p className="m-0 text-sm font-medium text-[#1a1a18]">{PROVIDER_LABELS[provider] ?? '소셜'} 계정으로 본인 확인이 완료되었습니다.</p>
                  <p className="mt-1 text-xs text-[#888780]">소셜 계정 정보는 가입 완료 후 변경할 수 없습니다.</p>
                </div>
                <div className="mt-3.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="oauth-nickname">닉네임 <span className="text-[#a32d2d]">*</span></label>
                  {/* @ai_generated: 제공자 기본값을 유지한 채 사용자가 명시적으로 중복을 확인한다. */}
                  <div className="mt-1.5 grid gap-2 min-[769px]:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      id="oauth-nickname"
                      type="text"
                      value={nickname}
                      onChange={handleNicknameChange}
                      disabled={submitting}
                      className="h-12 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    <ActionButton
                      onClick={handleNicknameCheck}
                      disabled={submitting || nicknameAvailability.state === 'checking'}
                      loading={nicknameAvailability.state === 'checking'}
                      size="lg"
                      tone="neutral"
                    >
                      중복 확인
                    </ActionButton>
                  </div>
                  {nicknameAvailability.message ? (
                    <p
                      aria-live="polite"
                      className={`mt-1.5 text-xs ${
                        nicknameAvailability.state === 'available' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {nicknameAvailability.message}
                    </p>
                  ) : null}
                  {nicknameError ? <p className="mt-1.5 text-xs text-red-600">{nicknameError}</p> : null}
                </div>
              </section>

              <section aria-labelledby="additional-info-title" className="rounded-2xl border border-[#f0efec] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_2px_8px_rgba(0,0,0,.06)]">
                <div className="flex items-center gap-2">
                  <h2 className="m-0 text-lg" id="additional-info-title">추가 정보</h2>
                </div>
                <div className="mt-3.5 grid gap-3.5">
                  <label className="text-sm text-gray-700" htmlFor="oauth-telno">전화번호<span className="ml-1 text-[#a32d2d]">*</span>
                    <input id="oauth-telno" type="tel" required value={optionalInfo.telno} onChange={handleOptionalInfoChange('telno')} placeholder="-를 제외한 숫자만 입력해주세요" className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500" />
                  </label>
                  <div>
                    <span className="text-sm text-gray-700">주소</span>
                    <div className="mt-1.5 grid gap-2 min-[769px]:grid-cols-[minmax(0,1fr)_auto]">
                      <input id="oauth-address" value={optionalInfo.address} readOnly onClick={() => setAddressSearchOpen(true)} className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500" />
                      <button type="button" onClick={() => setAddressSearchOpen(true)} className="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">주소 검색</button>
                    </div>
                    <input aria-label="우편번호" value={optionalInfo.zip} readOnly onClick={() => setAddressSearchOpen(true)} className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <label className="text-sm text-gray-700" htmlFor="oauth-detail-address">상세주소
                    <input id="oauth-detail-address" value={optionalInfo.detailAddress} onChange={handleOptionalInfoChange('detailAddress')} disabled={!optionalInfo.address} placeholder={optionalInfo.address ? '동·호수 등 상세주소' : '주소 검색 후 입력할 수 있습니다.'} maxLength={200} className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50" />
                  </label>
                  <label className="text-sm text-gray-700" htmlFor="oauth-bank-name">은행명
                    <input id="oauth-bank-name" value={optionalInfo.bankName} onChange={handleOptionalInfoChange('bankName')} placeholder="은행명을 입력해주세요." maxLength={100} className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500" />
                  </label>
                  <label className="text-sm text-gray-700" htmlFor="oauth-account-no">계좌번호
                    <input id="oauth-account-no" value={optionalInfo.accountNo} onChange={handleOptionalInfoChange('accountNo')} placeholder="계좌번호를 입력해주세요." maxLength={50} className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500" />
                  </label>
                </div>
                {optionalInfoError ? <p aria-live="polite" className="mt-2 text-xs text-red-600">{optionalInfoError}</p> : null}
              </section>
            </div>

            <div className="mt-6 flex flex-col items-stretch gap-2 sm:items-end">
              <ActionButton
                onClick={handleSubmit}
                loading={submitting}
                size="lg"
                className="w-full sm:w-auto"
              >
                {submitting ? '가입 처리 중...' : '가입 완료'}
              </ActionButton>
              {submitMessage ? <p aria-live="polite" className="text-xs text-red-600">{submitMessage}</p> : null}
            </div>
          </div>
        </div>
      </section>

      {selectedAgreement ? <AgreementModal agreement={selectedAgreement} onClose={() => setOpenAgreement(null)} /> : null}
      {addressSearchOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAddressSearchOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-base font-bold">주소 검색</h2>
              <button type="button" aria-label="주소 검색 닫기" onClick={() => setAddressSearchOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">닫기</button>
            </div>
            <DaumPostcode
              autoClose={false}
              onComplete={(data) => {
                const address = data.roadAddress || data.jibunAddress || '';
                const zip = data.zonecode || '';
                if (!address || !zip) return;
                setOptionalInfo((previous) => ({ ...previous, address, zip, detailAddress: '' }));
                setOptionalInfoError('');
                setAddressSearchOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </AuthPageContainer>
  );
};

export default OAuthOnboardingPage;
