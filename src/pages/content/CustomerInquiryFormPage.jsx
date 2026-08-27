import { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { MessageCircleQuestion, ShieldCheck } from 'lucide-react';
import { ContentPageShell } from '@components/content/ContentUi';
import { ActionButton } from '@components/common/ui';
import { getMyPageInquiryPath } from '@/routes/myPageRoutes';
import {
  useCreateCustomerInquiry,
  useCustomerInquiryTypes,
} from '@hooks/useCustomerInquiry';
import { useAuth } from '@hooks/useAuth';
import { toast } from '@utils/common';
import './CustomerInquiryFormPage.css';

const EMPTY_FORM = { inquiryTypeCode: '', title: '', content: '' };
const TYPE_LABELS_BY_MODE = {
  general: {
    INQC0001: '계정',
    INQC0002: '경매·상품 구매',
    INQC0003: '서비스·견적 요청',
    INQC0004: '거래·결제',
    INQC0005: '제공자 신청',
    INQC0006: '기타',
  },
  provider: {
    INQC0001: '계정',
    INQC0002: '경매·상품 판매',
    INQC0003: '견적 제출·서비스 제공',
    INQC0004: '거래·정산',
    INQC0005: '제공자 권한·프로필',
    INQC0006: '기타',
  },
};

/** 담당자 7 · 관리자 대상 1:1 문의: 원문을 로컬 폼에만 두고 서버의 탐지·마스킹 저장 계약으로 제출합니다. */
const CustomerInquiryFormPage = () => {
  const navigate = useNavigate();
  const { isProvider } = useAuth();
  const typesQuery = useCustomerInquiryTypes();
  const createMutation = useCreateCustomerInquiry();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const detectionKeyRef = useRef(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '', server: '' }));
    // 실패 요청을 그대로 재시도할 때만 같은 키를 사용하고, 입력이 바뀌면 다음 제출에서 새 키를 만든다.
    detectionKeyRef.current = null;
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.inquiryTypeCode) nextErrors.inquiryTypeCode = '문의 유형을 선택해 주세요.';
    if (!form.title.trim()) nextErrors.title = '제목을 입력해 주세요.';
    if (!form.content.trim()) nextErrors.content = '문의 내용을 입력해 주세요.';
    return nextErrors;
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0 || createMutation.isPending) {
      setErrors(nextErrors);
      return;
    }

    detectionKeyRef.current ??= crypto.randomUUID();

    try {
      await createMutation.mutateAsync({
        inquiryTypeCode: form.inquiryTypeCode,
        title: form.title.trim(),
        content: form.content.trim(),
        detectionKey: detectionKeyRef.current,
      });
      detectionKeyRef.current = null;
      toast({ icon: 'success', title: '문의가 접수되었습니다.' });
      navigate(getMyPageInquiryPath(isProvider));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        server: error.response?.data?.message ?? '문의 접수에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
      }));
    }
  };

  const typeOptions = typesQuery.data ?? [];
  const typeLabels = TYPE_LABELS_BY_MODE[isProvider ? 'provider' : 'general'];

  return (
    <ContentPageShell className="customer-inquiry-form-page">
      <Helmet><title>에누리컷</title></Helmet>

      <header className="customer-support-page-header customer-support-page-header--plain">
        <h1>관리자에게 문의하기</h1>
        <p>서비스 이용 중 확인이 필요한 내용을 남기면 처리 상태와 답변을 마이페이지에서 확인할 수 있습니다.</p>
      </header>

      <form className="customer-inquiry-form" onSubmit={submit}>
        <div className="customer-inquiry-form__heading">
          <span><MessageCircleQuestion aria-hidden="true" /></span>
          <div>
            <h2>문의 내용</h2>
            <p>문의와 답변은 민감정보를 가린 상태로 저장됩니다.</p>
          </div>
        </div>

        <label>
          문의 유형
          <select
            aria-invalid={Boolean(errors.inquiryTypeCode)}
            disabled={typesQuery.isLoading || typesQuery.isError || createMutation.isPending}
            onChange={(event) => updateField('inquiryTypeCode', event.target.value)}
            value={form.inquiryTypeCode}
          >
            <option value="">문의 유형을 선택해 주세요.</option>
            {typeOptions.map((type) => (
              <option key={type.code} value={type.code}>
                {typeLabels[type.code] ?? type.name}
              </option>
            ))}
          </select>
          {errors.inquiryTypeCode && <small role="alert">{errors.inquiryTypeCode}</small>}
          {typesQuery.isError && (
            <small role="alert">
              문의 유형을 불러오지 못했습니다.
              <button onClick={() => typesQuery.refetch()} type="button">다시 불러오기</button>
            </small>
          )}
        </label>

        <label>
          제목
          <input
            aria-invalid={Boolean(errors.title)}
            disabled={createMutation.isPending}
            maxLength={200}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="문의 제목을 입력해 주세요."
            value={form.title}
          />
          <span className="customer-inquiry-form__counter">{form.title.length} / 200</span>
          {errors.title && <small role="alert">{errors.title}</small>}
        </label>

        <label>
          문의 내용
          <textarea
            aria-invalid={Boolean(errors.content)}
            disabled={createMutation.isPending}
            maxLength={4000}
            onChange={(event) => updateField('content', event.target.value)}
            placeholder="확인이 필요한 내용을 구체적으로 입력해 주세요. 주민등록번호, 계좌 비밀번호 등 민감정보는 입력하지 마세요."
            value={form.content}
          />
          <span className="customer-inquiry-form__counter">{form.content.length} / 4000</span>
          {errors.content && <small role="alert">{errors.content}</small>}
        </label>

        <aside className="customer-inquiry-form__notice">
          <ShieldCheck aria-hidden="true" />
          <p><strong>접수 안내</strong><span>첨부파일과 추가 질문은 현재 지원하지 않습니다. 답변 전까지 새 문의를 별도로 등록할 수 있습니다.</span></p>
        </aside>

        {errors.server && <p className="customer-inquiry-form__error" role="alert">{errors.server}</p>}

        <div className="customer-inquiry-form__actions">
          <ActionButton disabled={createMutation.isPending} onClick={() => navigate(-1)} tone="outline">취소</ActionButton>
          <ActionButton
            disabled={createMutation.isPending || typesQuery.isError}
            loading={createMutation.isPending}
            type="submit"
          >
            {createMutation.isPending ? '접수 중…' : '문의 접수'}
          </ActionButton>
        </div>
      </form>
    </ContentPageShell>
  );
};

export default CustomerInquiryFormPage;
