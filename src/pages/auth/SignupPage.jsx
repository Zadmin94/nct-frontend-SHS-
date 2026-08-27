// @ai_generated
// src/pages/auth/SignupPage.jsx
// 단일 가입 화면에서 약관·이메일 인증·최종 가입의 서버 상태를 순서대로 연결한다.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import DaumPostcode from 'react-daum-postcode';
import {
  checkLoginId,
  checkNickname,
  sendSignupEmailVerification,
  signup,
  verifySignupEmailVerification,
} from '@api/authApi';
import { SIGNUP_TERMS } from './signupTerms';
import { ActionButton } from '@components/common/ui';
import { formatPhoneNumber, isValidPhoneNumber, toPhoneDigits } from '@utils/phoneNumber';
import { isValidNewPassword, PASSWORD_POLICY_GUIDE } from '@utils/passwordPolicy';

const INPUT_CLASS = 'w-full rounded-lg border border-[#e2e1dc] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-[#f8f8f6]';

const LOGIN_ID_PATTERN = /^[A-Za-z0-9._-]{4,50}$/;
// @ai_generated: 로그인 ID 안내가 실제 정규식의 최소·최대 길이와 항상 일치하도록 유지한다.
const LOGIN_ID_GUIDE = '영문·숫자·. _ - 조합으로 4~50자';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_PATTERN = /^\d{6}$/;

const INITIAL_FORM = {
  loginId: '',
  nickname: '',
  password: '',
  passwordConfirm: '',
  email: '',
  telno: '',
  address: '',
  detailAddress: '',
  zip: '',
  bankName: '',
  accountNo: '',
};

const INITIAL_AVAILABILITY = {
  checkedValue: '',
  state: 'idle',
  message: '',
};

const INITIAL_VERIFICATION = {
  verificationId: null,
  email: '',
  expiresAt: null,
  resendAvailableAt: null,
  status: 'idle',
};

const INITIAL_NOTICE = { type: 'idle', message: '' };

// @ai_generated: 새로고침에도 "인증 완료" 상태만 보존한다 - 인증번호(sent) 자체는 3분짜리라
// 재발송을 유도하는 게 자연스럽고, 입력 폼 값까지 보존하는 건 범위 밖(문서 260818_2130 항목5).
const SIGNUP_VERIFICATION_STORAGE_KEY = 'nct_signup_verification';

const readStoredVerification = () => {
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_VERIFICATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.status !== 'verified' || !parsed.expiresAt) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStoredVerification = (verification) => {
  try {
    window.sessionStorage.setItem(SIGNUP_VERIFICATION_STORAGE_KEY, JSON.stringify(verification));
  } catch {
    // 저장 실패(프라이빗 모드 등)는 무시 - 새로고침 복원만 안 될 뿐 현재 세션 동작엔 영향 없다.
  }
};

const clearStoredVerification = () => {
  try {
    window.sessionStorage.removeItem(SIGNUP_VERIFICATION_STORAGE_KEY);
  } catch {
    // 삭제 실패는 무시 - 다음 세션에서 만료 체크로 걸러지므로 현재 흐름을 막을 이유가 없다.
  }
};

const AGREEMENT_ITEMS = [
  { key: 'terms', code: 'AGRC0001', label: '서비스이용약관', required: true },
  { key: 'privacy', code: 'AGRC0002', label: '개인정보처리방침', required: true },
  { key: 'marketing', code: 'AGRC0003', label: '마케팅 정보 수신', required: false },
];

const AVAILABILITY_CLASS = {
  idle: 'text-[#888780]',
  checking: 'text-primary',
  available: 'text-primary-dark',
  unavailable: 'text-[#a32d2d]',
  error: 'text-[#a32d2d]',
};

const Field = ({ children, error, label, required = false }) => (
  <label className="grid gap-1.5 text-sm text-[#5f5e5a]">
    <span>
      {label}
      {required ? <span className="ml-1 text-[#a32d2d]">*</span> : null}
    </span>
    {children}
    {error ? <span className="text-xs text-[#a32d2d]">{error}</span> : null}
  </label>
);

const AgreementRow = ({ agreement, checked, onChange, onOpen }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-[#f0efec] px-3.5 py-3">
    <label className="flex min-w-0 items-center gap-2 text-sm text-[#1a1a18]">
      <input checked={checked} onChange={onChange} type="checkbox" />
      <span>
        {agreement.label}
        {agreement.required ? '(필수)' : '(선택)'}
      </span>
    </label>
    <ActionButton onClick={onOpen} size="sm" tone="neutral">
      보기
    </ActionButton>
  </div>
);

const AgreementModal = ({ agreement, onClose }) => {
  const terms = SIGNUP_TERMS[agreement.code];

  return (
    <div aria-modal="true" className="fixed inset-0 z-500 flex items-center justify-center bg-black/35 p-6" role="dialog">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="m-0 text-xl">{terms?.title ?? agreement.label}</h2>
        {terms ? (
          <>
            <p className="mt-1 text-xs text-[#888780]">시행일자 {terms.effectiveDate}</p>
            <p className="mt-4 text-sm leading-6 text-[#5f5e5a]">{terms.summary}</p>
            <div className="mt-4 grid gap-4 overflow-y-auto pr-1">
              {terms.articles.map((article) => (
                <section key={article.heading}>
                  <h3 className="m-0 text-sm font-semibold text-[#1a1a18]">{article.heading}</h3>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-6 text-[#5f5e5a]">{article.body}</p>
                </section>
              ))}
            </div>
          </>
        ) : null}
        <div className="mt-6 flex justify-end">
          <ActionButton onClick={onClose} size="sm">
            닫기
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

const validateLoginId = (value) => {
  const loginId = value.trim();
  if (!loginId) return '로그인 아이디를 입력해주세요.';
  if (!LOGIN_ID_PATTERN.test(loginId)) return `${LOGIN_ID_GUIDE} 입력해주세요.`;
  if (loginId.toUpperCase().startsWith('OAUTH_')) return 'OAUTH_로 시작하는 아이디는 사용할 수 없습니다.';
  return '';
};

const validateNickname = (value) => {
  const nickname = value.trim();
  if (!nickname) return '닉네임을 입력해주세요.';
  if (nickname.length > 100) return '닉네임은 100자 이하로 입력해주세요.';
  return '';
};

const validatePassword = (value) => {
  if (!value) return '비밀번호를 입력해주세요.';
  if (!isValidNewPassword(value)) return PASSWORD_POLICY_GUIDE;
  return '';
};

const validateEmail = (value) => {
  if (!value.trim()) return '이메일을 입력해주세요.';
  if (!EMAIL_PATTERN.test(value.trim())) return '이메일 형식을 확인해주세요.';
  return '';
};

// @ai_generated: ISS-023 - 전화번호가 선택에서 필수로 전환됐다.
const validateTelno = (value) => {
  if (!value.trim()) return '전화번호를 입력해주세요.';
  return isValidPhoneNumber(value) ? '' : '0으로 시작하는 11자리 숫자를 입력해주세요.';
};

const validateOptionalLength = (value, maxLength, fieldName) => (
  value.trim().length <= maxLength ? '' : `${fieldName}은 ${maxLength}자 이하로 입력해주세요.`
);

const responseMessage = (error, fallback) => error.response?.data?.message ?? fallback;

const toFieldErrors = (error) => {
  const errors = error.response?.data?.data;
  if (!Array.isArray(errors)) return {};

  return errors.reduce((result, item) => {
    if (item?.field && item?.message) result[item.field] = item.message;
    return result;
  }, {});
};

const parseServerTime = (time) => {
  const parsed = time ? Date.parse(time) : Number.NaN;
  return Number.isNaN(parsed) ? null : parsed;
};

const formatRemaining = (targetTime, now) => {
  if (!targetTime) return '00:00';
  const remainingSeconds = Math.max(0, Math.ceil((targetTime - now) / 1000));
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const SignupPage = () => {
  // @ai_generated: 복원된 인증 상태와 입력창의 이메일이 서로 다르면 verifiedForCurrentEmail
  // 게이트가 항상 실패해 복원이 무의미해진다 - 인증된 이메일만 폼에 함께 채워 넣는다.
  const restoredVerification = readStoredVerification();
  const [form, setForm] = useState(() => (
    restoredVerification ? { ...INITIAL_FORM, email: restoredVerification.email } : INITIAL_FORM
  ));
  const [passwordVisibility, setPasswordVisibility] = useState({ password: false, passwordConfirm: false });
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [availability, setAvailability] = useState({
    loginId: INITIAL_AVAILABILITY,
    nickname: INITIAL_AVAILABILITY,
  });
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, marketing: false });
  const [openAgreement, setOpenAgreement] = useState(null);
  const [agreementMessage, setAgreementMessage] = useState('');
  const [verification, setVerification] = useState(() => restoredVerification ?? INITIAL_VERIFICATION);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationNotice, setVerificationNotice] = useState(INITIAL_NOTICE);
  const [signupMessage, setSignupMessage] = useState('');
  const [submission, setSubmission] = useState({ send: false, verify: false, signup: false });
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [signupSucceeded, setSignupSucceeded] = useState(false);
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  // @ai_generated: 입력값·새 발송이 바뀌면 늦은 인증 API 응답을 무시한다.
  const availabilityRequestRef = useRef({ loginId: 0, nickname: 0 });
  const verificationRequestRef = useRef(0);
  // @ai_generated: 발송·확인을 직렬화하고, 늦은 응답이 다른 인증 ID 상태를 바꾸지 못하게 한다.
  const verificationOperationRef = useRef('idle');
  const activeVerificationIdRef = useRef(verification.verificationId ?? null);

  const validators = {
    loginId: validateLoginId,
    nickname: validateNickname,
    password: validatePassword,
    email: validateEmail,
    telno: validateTelno,
    // @ai_generated: 선택 입력은 비워둘 수 있지만, 부분 저장으로 인한 불완전한 회원 데이터를 막는다.
    address: (value) => {
      const lengthError = validateOptionalLength(value, 200, '주소');
      if (lengthError) return lengthError;
      return value.trim() && !form.zip.trim() ? '주소 검색으로 우편번호를 함께 입력해주세요.' : '';
    },
    detailAddress: (value) => validateOptionalLength(value, 200, '상세주소'),
    zip: (value) => {
      if (value.trim() && !/^\d{5}$/.test(value.trim())) return '우편번호는 5자리 숫자여야 합니다.';
      return value.trim() && !form.address.trim() ? '주소 검색으로 주소를 함께 입력해주세요.' : '';
    },
    bankName: (value) => {
      const lengthError = validateOptionalLength(value, 100, '은행명');
      if (lengthError) return lengthError;
      return value.trim() && !form.accountNo.trim() ? '계좌번호를 함께 입력해주세요.' : '';
    },
    accountNo: (value) => {
      const lengthError = validateOptionalLength(value, 50, '계좌번호');
      if (lengthError) return lengthError;
      return value.trim() && !form.bankName.trim() ? '은행명을 함께 입력해주세요.' : '';
    },
    passwordConfirm: (value) => {
      if (!value) return '비밀번호 확인을 입력해주세요.';
      return form.password === value ? '' : '비밀번호가 일치하지 않습니다.';
    },
  };

  const fieldError = (field) => serverErrors[field] ?? (touched[field] ? validators[field](form[field]) : '');
  const passwordConfirmError = validators.passwordConfirm(form.passwordConfirm);
  const allAgreed = AGREEMENT_ITEMS.every((agreement) => agreements[agreement.key]);
  const requiredAgreed = agreements.terms && agreements.privacy;
  const selectedAgreement = AGREEMENT_ITEMS.find((agreement) => agreement.key === openAgreement);
  const expiresAt = parseServerTime(verification.expiresAt);
  const resendAvailableAt = parseServerTime(verification.resendAvailableAt);
  const verificationExpired = verification.status === 'sent' && (!expiresAt || expiresAt <= clockNow);
  const resendAvailable = verification.status === 'sent' && !verificationExpired
    && Boolean(resendAvailableAt) && resendAvailableAt <= clockNow;
  const verifiedForCurrentEmail = verification.status === 'verified'
    && verification.email === form.email.trim().toLowerCase();

  useEffect(() => {
    if (verification.status !== 'sent' || verificationExpired) return undefined;

    const timerId = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [verification.status, verification.expiresAt, verificationExpired]);

  const clearServerError = (field) => {
    setServerErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const updateAvailability = (field, next) => {
    setAvailability((previous) => ({ ...previous, [field]: next }));
  };

  const handleFieldChange = (field) => (event) => {
    // @ai_generated: 전화번호는 표시값만 하이픈을 포함하고 저장·전송 값은 숫자로 정규화한다.
    const value = field === 'telno' ? formatPhoneNumber(event.target.value) : event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    clearServerError(field);
    setSignupMessage('');

    if (field === 'loginId' || field === 'nickname') {
      availabilityRequestRef.current[field] += 1;
      updateAvailability(field, INITIAL_AVAILABILITY);
    }
  };

  const handleEmailChange = (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, email: value }));
    clearServerError('email');
    setSignupMessage('');
    verificationRequestRef.current += 1;
    verificationOperationRef.current = 'idle';
    activeVerificationIdRef.current = null;
    setVerification(INITIAL_VERIFICATION);
    clearStoredVerification();
    setVerificationCode('');
    setVerificationNotice(INITIAL_NOTICE);
    // @ai_generated: 무효화된 이전 요청의 finally는 세대 보호로 정리를 건너뛰므로 여기서 즉시 해제한다.
    setSubmission((previous) => ({ ...previous, send: false, verify: false }));
  };

  const handleFieldBlur = (field) => () => {
    setTouched((previous) => ({ ...previous, [field]: true }));
  };

  // @ai_generated: 카카오 우편번호 선택값만 주소·우편번호에 반영하고, 상세주소는 사용자가 별도로 입력한다.
  const handleAddressComplete = (data) => {
    const address = data.roadAddress || data.jibunAddress || '';
    const zip = data.zonecode || '';
    if (!address || !zip) return;

    setForm((previous) => ({ ...previous, address, zip }));
    setTouched((previous) => ({ ...previous, address: true, zip: true }));
    clearServerError('address');
    clearServerError('zip');
    setSignupMessage('');
    setAddressSearchOpen(false);
  };

  const handleAgreementChange = (key) => (event) => {
    setAgreements((previous) => ({ ...previous, [key]: event.target.checked }));
    setAgreementMessage('');
    setSignupMessage('');
  };

  const handleAllAgreements = (event) => {
    const checked = event.target.checked;
    setAgreements({ terms: checked, privacy: checked, marketing: checked });
    setAgreementMessage('');
    setSignupMessage('');
  };

  const currentAvailability = (field) => {
    const status = availability[field];
    return status.checkedValue === form[field].trim() ? status : INITIAL_AVAILABILITY;
  };

  const handleAvailabilityCheck = async (field) => {
    const value = form[field].trim();
    const validationMessage = validators[field](value);
    const requestId = availabilityRequestRef.current[field] + 1;
    availabilityRequestRef.current[field] = requestId;
    setTouched((previous) => ({ ...previous, [field]: true }));

    if (validationMessage) {
      updateAvailability(field, { checkedValue: value, state: 'error', message: validationMessage });
      return;
    }

    updateAvailability(field, { checkedValue: value, state: 'checking', message: '확인 중입니다.' });

    try {
      const response = field === 'loginId'
        ? await checkLoginId(value)
        : await checkNickname(value);
      const available = response?.data?.available;

      if (typeof available !== 'boolean') {
        throw new Error('중복 확인 응답 형식이 올바르지 않습니다.');
      }
      if (availabilityRequestRef.current[field] !== requestId) return;

      updateAvailability(field, {
        checkedValue: value,
        state: available ? 'available' : 'unavailable',
        message: available ? '사용 가능한 값입니다.' : '이미 사용 중인 값입니다.',
      });
    } catch (error) {
      if (availabilityRequestRef.current[field] !== requestId) return;
      updateAvailability(field, {
        checkedValue: value,
        state: 'error',
        message: responseMessage(error, '중복 확인 중 오류가 발생했습니다. 다시 시도해주세요.'),
      });
    }
  };

  const handleSendVerification = async () => {
    const email = form.email.trim().toLowerCase();
    const emailError = validateEmail(email);
    setTouched((previous) => ({ ...previous, email: true }));
    clearServerError('email');

    if (emailError) {
      setVerificationNotice({ type: 'error', message: emailError });
      return;
    }
    if (!requiredAgreed) {
      setAgreementMessage('서비스이용약관과 개인정보처리방침에 모두 동의해야 인증번호를 발송할 수 있습니다.');
      return;
    }
    if (verifiedForCurrentEmail) return;
    if (verificationOperationRef.current !== 'idle') {
      setVerificationNotice({ type: 'error', message: '진행 중인 이메일 인증 요청이 완료된 뒤 다시 시도해주세요.' });
      return;
    }

    const requestId = verificationRequestRef.current + 1;
    verificationRequestRef.current = requestId;
    verificationOperationRef.current = 'sending';
    setSubmission((previous) => ({ ...previous, send: true }));
    setVerificationNotice({ type: 'idle', message: '' });

    try {
      const response = await sendSignupEmailVerification({
        email,
        termsAgreed: agreements.terms,
        privacyAgreed: agreements.privacy,
      });
      const result = response?.data;

      if (!result?.verificationId || !result.expiresAt || !result.resendAvailableAt) {
        throw new Error('인증번호 발송 응답 형식이 올바르지 않습니다.');
      }
      if (verificationRequestRef.current !== requestId) return;

      activeVerificationIdRef.current = result.verificationId;
      setVerification({
        verificationId: result.verificationId,
        email,
        expiresAt: result.expiresAt,
        resendAvailableAt: result.resendAvailableAt,
        status: 'sent',
      });
      setVerificationCode('');
      setVerificationNotice({ type: 'success', message: '인증번호를 발송했습니다. 3분 안에 입력해주세요.' });
      setClockNow(Date.now());
    } catch (error) {
      if (verificationRequestRef.current !== requestId) return;
      const message = responseMessage(error, '인증번호 발송 중 오류가 발생했습니다. 다시 시도해주세요.');
      if (error.response?.status === 409) {
        setServerErrors((previous) => ({ ...previous, email: message }));
      }
      setVerificationNotice({ type: 'error', message });
    } finally {
      if (verificationRequestRef.current === requestId) {
        verificationOperationRef.current = 'idle';
        setSubmission((previous) => ({ ...previous, send: false }));
      }
    }
  };

  const handleVerifyCode = async () => {
    if (verificationOperationRef.current !== 'idle') {
      setVerificationNotice({ type: 'error', message: '진행 중인 이메일 인증 요청이 완료된 뒤 다시 시도해주세요.' });
      return;
    }
    if (!verification.verificationId || verification.status !== 'sent') {
      setVerificationNotice({ type: 'error', message: '먼저 인증번호를 발송해주세요.' });
      return;
    }
    if (verificationExpired) {
      setVerificationNotice({ type: 'error', message: '인증번호가 만료되었습니다. 새 인증을 시작해주세요.' });
      return;
    }
    if (!VERIFICATION_CODE_PATTERN.test(verificationCode)) {
      setVerificationNotice({ type: 'error', message: '인증번호는 6자리 숫자로 입력해주세요.' });
      return;
    }

    const requestId = verificationRequestRef.current;
    const verificationId = verification.verificationId;
    if (activeVerificationIdRef.current !== verificationId) return;
    verificationOperationRef.current = 'verifying';
    setSubmission((previous) => ({ ...previous, verify: true }));
    setVerificationNotice({ type: 'idle', message: '' });

    try {
      const response = await verifySignupEmailVerification(verificationId, { code: verificationCode });
      if (verificationRequestRef.current !== requestId || activeVerificationIdRef.current !== verificationId) return;

      // @ai_generated: 서버가 인증 성공 시 만료시각을 60분 유예로 연장해 응답에 실어준다 - 발송
      // 시점의 3분짜리 expiresAt을 그대로 쓰면 새로고침 복원이 몇 분 안에 거부돼 버린다.
      const graceExpiresAt = response?.data?.expiresAt ?? verification.expiresAt;
      const nextVerification = { ...verification, status: 'verified', expiresAt: graceExpiresAt };
      setVerification(nextVerification);
      writeStoredVerification(nextVerification);
      setVerificationCode('');
      setVerificationNotice({ type: 'success', message: '이메일 인증이 완료되었습니다.' });
    } catch (error) {
      if (verificationRequestRef.current !== requestId || activeVerificationIdRef.current !== verificationId) return;
      setVerificationNotice({
        type: 'error',
        message: responseMessage(error, '인증번호 확인 중 오류가 발생했습니다. 다시 시도해주세요.'),
      });
    } finally {
      if (verificationRequestRef.current === requestId && activeVerificationIdRef.current === verificationId) {
        verificationOperationRef.current = 'idle';
        setSubmission((previous) => ({ ...previous, verify: false }));
      }
    }
  };

  const ensureAvailability = (field) => {
    const status = currentAvailability(field);
    if (status.state === 'available') return true;

    updateAvailability(field, {
      checkedValue: form[field].trim(),
      state: 'error',
      message: '가입 전에 중복 확인을 완료해주세요.',
    });
    return false;
  };

  const mapSignupError = (error) => {
    const fieldErrors = toFieldErrors(error);
    if (Object.keys(fieldErrors).length > 0) {
      setServerErrors((previous) => ({ ...previous, ...fieldErrors }));
      setSignupMessage('입력값을 다시 확인해주세요.');
      return;
    }

    const message = responseMessage(error, '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    if (message.includes('로그인 아이디')) {
      setServerErrors((previous) => ({ ...previous, loginId: message }));
    } else if (message.includes('닉네임')) {
      setServerErrors((previous) => ({ ...previous, nickname: message }));
    } else if (message.includes('이메일')) {
      if (message.includes('인증')) {
        setVerificationNotice({ type: 'error', message });
      } else {
        setServerErrors((previous) => ({ ...previous, email: message }));
      }
    }
    setSignupMessage(message);
  };

  const handleSignup = async () => {
    setTouched(Object.keys(INITIAL_FORM).reduce((result, field) => ({ ...result, [field]: true }), {}));
    setSignupMessage('');
    setAgreementMessage('');

    const hasFormError = Object.keys(INITIAL_FORM).some((field) => validators[field](form[field]));
    if (hasFormError) {
      setSignupMessage('입력값을 다시 확인해주세요.');
      return;
    }
    if (!requiredAgreed) {
      setAgreementMessage('서비스이용약관과 개인정보처리방침에 모두 동의해야 가입할 수 있습니다.');
      return;
    }
    if (!verifiedForCurrentEmail) {
      setVerificationNotice({ type: 'error', message: '현재 이메일의 인증을 완료해야 가입할 수 있습니다.' });
      return;
    }
    if (!ensureAvailability('loginId') || !ensureAvailability('nickname')) return;

    setSubmission((previous) => ({ ...previous, signup: true }));
    try {
      await signup({
        loginId: form.loginId.trim(),
        password: form.password,
        nickname: form.nickname.trim(),
        email: form.email.trim().toLowerCase(),
        telno: toPhoneDigits(form.telno),
        address: form.address.trim(),
        detailAddress: form.detailAddress.trim(),
        zip: form.zip.trim(),
        bankName: form.bankName.trim(),
        accountNo: form.accountNo.trim(),
        agreements: AGREEMENT_ITEMS.map((agreement) => ({
          agreementTypeCode: agreement.code,
          agreed: agreements[agreement.key],
        })),
        verificationId: verification.verificationId,
      });
      clearStoredVerification();
      setSignupSucceeded(true);
    } catch (error) {
      mapSignupError(error);
    } finally {
      setSubmission((previous) => ({ ...previous, signup: false }));
    }
  };

  const renderAvailabilityMessage = (field) => {
    const status = currentAvailability(field);
    // @ai_generated: 초기 안내와 Field가 이미 표시한 입력 오류는 중복해 렌더링하지 않는다.
    if (status.state === 'idle' || (status.state === 'error' && fieldError(field))) return null;

    return (
      <span aria-live="polite" className={`min-h-5 text-xs ${AVAILABILITY_CLASS[status.state]}`}>
        {status.message}
      </span>
    );
  };

  const verificationStatusLabel = verification.status === 'verified'
    ? '인증 완료'
    : verificationExpired
      ? '인증 만료'
      : verification.status === 'sent'
        ? '인증 대기'
        : '인증 전';

  const verificationButtonLabel = verifiedForCurrentEmail
    ? '인증 완료'
    : verification.verificationId && verificationExpired
      ? '새 인증 시작'
      : verification.verificationId
        ? '인증번호 재발송'
        : '인증번호 발송';

  const sendDisabled = submission.send || submission.verify || verifiedForCurrentEmail
    || (verification.status === 'sent' && !verificationExpired && !resendAvailable);

  return (
    <>
      {/* .container + Tailwind py-* 병용 시 App.css shorthand가 레이어 충돌로 상하 패딩을 무력화 — 인라인 style로 우회 */}
      <section className="container flex-1 text-[#1a1a18]" style={{ paddingTop: '28px', paddingBottom: '28px' }}>
        {/* @ai_generated: 가입 동작은 입력 카드 전체의 바깥 우하단에 배치한다. */}
        <div className="mb-4 mt-7 flex flex-col gap-3 min-[769px]:flex-row min-[769px]:items-start min-[769px]:justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px]">회원가입</h1>
            {!signupSucceeded ? (
              // @ai_generated: 가입 전 안내는 제목 바로 아래에 두고 상태 변화도 계속 알린다.
              <p aria-live="polite" className={`m-0 text-left text-xs ${signupMessage ? 'text-[#a32d2d]' : 'text-[#888780]'}`}>
                {signupMessage || (verifiedForCurrentEmail ? '가입 완료를 누르면 계정이 생성됩니다.' : '')}
              </p>
            ) : null}
          </div>
        </div>

        {signupSucceeded ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-[#f0efec] bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,.04),0_2px_8px_rgba(0,0,0,.06)]">
            <p className="m-0 text-lg font-semibold text-primary">회원가입이 완료되었습니다.</p>
            <p className="mt-3 text-sm text-[#5f5e5a]">로그인 아이디와 비밀번호로 로그인해 서비스를 이용해 주세요.</p>
            <ActionButton className="mt-6" size="sm" to="/login">
              로그인하러 가기
            </ActionButton>
          </section>
        ) : (
          <>
          <div className="grid gap-6">
              {/* @ai_generated: 약관은 상단 전체폭, 입력 정보는 하단 동등한 2열 카드로 그룹화한다. */}
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
                <p aria-live="polite" className={`mt-3 text-xs ${agreementMessage ? 'text-[#a32d2d]' : 'text-[#888780]'}`}>
                  {agreementMessage || '서비스이용약관과 개인정보처리방침은 인증번호 발송과 가입에 필수입니다.'}
                </p>
              </section>

              <div className="relative">
                <div className="grid items-start gap-6 lg:grid-cols-2">
              <section aria-labelledby="signup-info-title" className="rounded-2xl border border-[#f0efec] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_2px_8px_rgba(0,0,0,.06)]">
                <h2 className="m-0 text-lg" id="signup-info-title">기본 정보</h2>
                <div className="mt-3.5 grid gap-3.5">
                  <Field error={fieldError('loginId')} label="아이디" required>
                    <div className="grid gap-2 min-[769px]:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        className={INPUT_CLASS}
                        onBlur={handleFieldBlur('loginId')}
                        onChange={handleFieldChange('loginId')}
                        placeholder="영문, 숫자, 특수문자(._-) 4~50자"
                        value={form.loginId}
                      />
                      <ActionButton
                        className="shrink-0"
                        disabled={currentAvailability('loginId').state === 'checking'}
                        loading={currentAvailability('loginId').state === 'checking'}
                        onClick={() => handleAvailabilityCheck('loginId')}
                        size="sm"
                        tone="outline"
                      >
                        중복 확인
                      </ActionButton>
                    </div>
                    {renderAvailabilityMessage('loginId')}
                  </Field>

                  <Field error={fieldError('nickname')} label="닉네임" required>
                    <div className="grid gap-2 min-[769px]:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        className={INPUT_CLASS}
                        onBlur={handleFieldBlur('nickname')}
                        onChange={handleFieldChange('nickname')}
                        placeholder="사용할 닉네임을 입력해주세요"
                        value={form.nickname}
                      />
                      <ActionButton
                        className="shrink-0"
                        disabled={currentAvailability('nickname').state === 'checking'}
                        loading={currentAvailability('nickname').state === 'checking'}
                        onClick={() => handleAvailabilityCheck('nickname')}
                        size="sm"
                        tone="outline"
                      >
                        중복 확인
                      </ActionButton>
                    </div>
                    {renderAvailabilityMessage('nickname')}
                  </Field>

                  <Field error={fieldError('password')} label="비밀번호" required>
                    <div className="relative">
                      <input
                        className={`${INPUT_CLASS} pr-11`}
                        onBlur={handleFieldBlur('password')}
                        onChange={handleFieldChange('password')}
                        type={passwordVisibility.password ? 'text' : 'password'}
                        placeholder="8~64자, 영문·숫자·특수문자 중 2종 이상"
                        value={form.password}
                      />
                      <button type="button" onClick={() => setPasswordVisibility((previous) => ({ ...previous, password: !previous.password }))} aria-label={passwordVisibility.password ? '비밀번호 숨기기' : '비밀번호 보기'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">
                        {passwordVisibility.password ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </Field>

                  <Field error={form.passwordConfirm ? passwordConfirmError : fieldError('passwordConfirm')} label="비밀번호 확인" required>
                    <div className="relative">
                      <input
                        className={`${INPUT_CLASS} pr-11`}
                        onBlur={handleFieldBlur('passwordConfirm')}
                        onChange={handleFieldChange('passwordConfirm')}
                        type={passwordVisibility.passwordConfirm ? 'text' : 'password'}
                        placeholder="비밀번호를 다시 입력해주세요"
                        value={form.passwordConfirm}
                      />
                      <button type="button" onClick={() => setPasswordVisibility((previous) => ({ ...previous, passwordConfirm: !previous.passwordConfirm }))} aria-label={passwordVisibility.passwordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">
                        {passwordVisibility.passwordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {form.passwordConfirm && !passwordConfirmError ? (
                      <span className="text-xs text-primary-dark">비밀번호가 일치합니다.</span>
                    ) : null}
                  </Field>

                  <Field error={fieldError('telno')} label="전화번호" required>
                    <input
                      className={INPUT_CLASS}
                      onBlur={handleFieldBlur('telno')}
                      onChange={handleFieldChange('telno')}
                      placeholder="-를 제외한 숫자만 입력해주세요"
                      type="tel"
                      value={form.telno}
                    />
                  </Field>

                  <Field error={fieldError('email')} label="이메일" required>
                    <div className="grid gap-2 min-[769px]:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        className={INPUT_CLASS}
                        onBlur={handleFieldBlur('email')}
                        onChange={handleEmailChange}
                        placeholder="example@email.com"
                        type="email"
                        value={form.email}
                      />
                      <ActionButton
                        className="shrink-0"
                        disabled={sendDisabled}
                        loading={submission.send}
                        onClick={handleSendVerification}
                        size="sm"
                        tone="outline"
                      >
                        {submission.send ? '발송 중...' : verificationButtonLabel}
                      </ActionButton>
                    </div>
                    <span className="text-xs text-[#888780]">이메일 중복은 인증번호 발송 단계에서 확인합니다.</span>
                  </Field>

                  <section aria-labelledby="verification-title" className="grid gap-2 rounded-lg border border-dashed border-[#e2e1dc] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="m-0 text-sm text-[#5f5e5a]" id="verification-title">이메일 인증</h3>
                      <span className={`rounded-lg px-2.5 py-0.5 text-xs ${verifiedForCurrentEmail ? 'bg-primary-light text-primary-dark' : 'bg-[#f0f0ee] text-[#5f5e5a]'}`}>
                        {verificationStatusLabel}
                      </span>
                    </div>
                    <p className="m-0 text-xs text-[#888780]">인증번호는 발송 후 3분 동안 유효합니다.</p>
                    <div className="grid gap-2 min-[769px]:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        className={INPUT_CLASS}
                        disabled={verification.status !== 'sent' || verificationExpired || submission.send || submission.verify}
                        inputMode="numeric"
                        maxLength="6"
                        onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                        placeholder="6자리 인증번호"
                        value={verificationCode}
                      />
                      <ActionButton
                        disabled={verification.status !== 'sent' || verificationExpired || submission.send || submission.verify}
                        loading={submission.verify}
                        onClick={handleVerifyCode}
                        size="sm"
                      >
                        {submission.verify ? '확인 중...' : '인증 확인'}
                      </ActionButton>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono text-[#888780]">
                        {verification.status === 'sent' ? formatRemaining(expiresAt, clockNow) : '03:00'}
                      </span>
                      {verification.status === 'sent' && !verificationExpired && !resendAvailable ? (
                        <span className="text-[#888780]">재발송 가능: {formatRemaining(resendAvailableAt, clockNow)}</span>
                      ) : null}
                    </div>
                    {verificationExpired ? <p className="m-0 text-xs text-[#a32d2d]">인증번호가 만료되었습니다. 새 인증을 시작해주세요.</p> : null}
                    {verificationNotice.message ? (
                      <p aria-live="polite" className={`m-0 text-xs ${verificationNotice.type === 'error' ? 'text-[#a32d2d]' : 'text-primary-dark'}`}>
                        {verificationNotice.message}
                      </p>
                    ) : null}
                  </section>

                </div>
              </section>

              <section aria-labelledby="additional-info-title" className="rounded-2xl border border-[#f0efec] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04),0_2px_8px_rgba(0,0,0,.06)]">
                <div className="flex items-center gap-2">
                  <h2 className="m-0 text-lg" id="additional-info-title">추가정보(선택)</h2>
                </div>
                <div className="mt-3.5 grid gap-3.5">
                  <Field error={fieldError('address') || fieldError('zip')} label="주소(선택)">
                    <div className="grid gap-2 min-[769px]:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        className={`${INPUT_CLASS} cursor-pointer`}
                        onClick={() => setAddressSearchOpen(true)}
                        onFocus={(e) => e.target.blur()}
                        readOnly
                        value={form.address}
                      />
                      <ActionButton onClick={() => setAddressSearchOpen(true)} size="sm" tone="outline">
                        주소 검색
                      </ActionButton>
                    </div>
                    <input
                      className={`${INPUT_CLASS} cursor-pointer`}
                      onClick={() => setAddressSearchOpen(true)}
                      onFocus={(e) => e.target.blur()}
                      readOnly
                      value={form.zip}
                    />
                  </Field>

                  <Field error={fieldError('detailAddress')} label="상세주소(선택)">
                    <input
                      className={INPUT_CLASS}
                      disabled={!form.address}
                      onBlur={handleFieldBlur('detailAddress')}
                      onChange={handleFieldChange('detailAddress')}
                      placeholder={form.address ? '동·호수 등 상세주소' : '주소 검색 후 입력할 수 있습니다.'}
                      value={form.detailAddress}
                    />
                  </Field>

                  <Field error={fieldError('bankName')} label="은행명(선택)">
                    <input
                      className={INPUT_CLASS}
                      onBlur={handleFieldBlur('bankName')}
                      onChange={handleFieldChange('bankName')}
                      placeholder="은행명을 입력해주세요."
                      value={form.bankName}
                    />
                  </Field>

                  <Field error={fieldError('accountNo')} label="계좌번호(선택)">
                    <input
                      className={INPUT_CLASS}
                      onBlur={handleFieldBlur('accountNo')}
                      onChange={handleFieldChange('accountNo')}
                      placeholder="계좌번호를 입력해주세요."
                      value={form.accountNo}
                    />
                  </Field>
                </div>
              </section>
              </div>
                <div className="mt-6 flex justify-end lg:absolute lg:bottom-0 lg:right-0 lg:mt-0">
                  <ActionButton loading={submission.signup} onClick={handleSignup} size="sm">
                    {submission.signup ? '가입 처리 중...' : '가입 완료'}
                  </ActionButton>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {addressSearchOpen ? (
        <div aria-modal="true" className="fixed inset-0 z-200 flex items-center justify-center bg-black/35 p-4" role="dialog">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f0efec] px-5 py-4">
              <h2 className="m-0 text-lg">주소 검색</h2>
              <ActionButton aria-label="주소 검색 닫기" onClick={() => setAddressSearchOpen(false)} size="sm" tone="neutral">
                닫기
              </ActionButton>
            </div>
            <DaumPostcode autoClose={false} onComplete={handleAddressComplete} />
          </div>
        </div>
      ) : null}

      {selectedAgreement ? <AgreementModal agreement={selectedAgreement} onClose={() => setOpenAgreement(null)} /> : null}

    </>
  );
};

export default SignupPage;
