import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '@api/categoryApi';
import { uploadImage } from '@api/fileApi';
import { getProfile, updateProfile } from '@api/memberApi';
import PageMeta from '@components/admin/PageMeta';
import { ContentPageShell } from '@components/content/ContentUi';
import { ActionButton } from '@components/common/ui';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import { MEMBER_PROFILE_QUERY_KEY, useMemberProfile } from '@hooks/useMemberProfile';
import { useMyProviderApplications, useSubmitProviderApplication } from '@hooks/useProviderApplications';
import { toast } from '@utils/common';
import './providerApplyPage.css';
import './providerApplicationMulti.css';
import './providerApplyForm.css';

const SERVICE_DOMAIN_CD = 'CATC0002';

const DOCUMENTS = [
  { code: 'PRVC0012', label: '자격증' },
  { code: 'PRVC0013', label: '경력증빙' },
  { code: 'PRVC0014', label: '본인확인' },
];

const STEPS = ['카테고리 선택', '정산 정보', '카테고리별 증빙 서류'];

const STEP_DESCRIPTIONS = [
  '견적을 제출할 서비스 분야를 선택해 주세요. 분야별 심사는 각각 진행됩니다.',
  '서비스 정산에 사용할 계좌를 확인하거나 이 화면에서 바로 등록해 주세요.',
  '선택한 분야마다 심사에 필요한 증빙 서류를 한 개 이상 등록해 주세요.',
];

const statusLabel = (code, fallback) => ({
  PRVC0002: '심사 대기',
  PRVC0003: '승인됨',
  PRVC0004: '반려됨',
})[code] ?? fallback ?? '확인 필요';

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const normalizeAccountNo = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 50);

const maskAccountNo = (value) => {
  const accountNo = normalizeAccountNo(value);
  if (!accountNo) return '-';
  if (accountNo.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(Math.max(accountNo.length - 4, 4), 8))} ${accountNo.slice(-4)}`;
};

/** 담당자 7 · F-PROV-002/003/006/007/012~014
 * 제공자 권한 신청 화면입니다. 선택한 서비스 카테고리의 catSn을 실제 신청 API로 보내며,
 * 공통 파일 API에서 받은 flSn을 카테고리별 서류로 묶어 PROVIDER_APPLY_FILE 저장 흐름까지 연결합니다.
 */
const ProviderApplyPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [error, setError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountForm, setAccountForm] = useState({ bankName: '', accountNo: '' });
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isPreparingSubmit, setIsPreparingSubmit] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingKey, setUploadingKey] = useState('');
  const submitPreparationRef = useRef(false);
  const uploadedFilesRef = useRef({});
  const applicationsQuery = useMyProviderApplications();
  const submitMutation = useSubmitProviderApplication();
  const categoriesQuery = useQuery({
    queryKey: ['provider-service-categories', SERVICE_DOMAIN_CD],
    queryFn: () => getCategories(SERVICE_DOMAIN_CD)
      .then((response) => response.data.filter((category) => category.catParentSn !== null)),
  });
  // 담당자 7 · F-AUTH-010: 제공자 신청 화면에서도 기존 회원 프로필 계좌 저장 계약을 재사용한다.
  // 무료 포트폴리오 환경에서는 형식만 확인하며, 저장된 계좌를 실명 인증 완료로 취급하지 않는다.
  const profileQuery = useMemberProfile();
  const accountMutation = useMutation({
    mutationFn: async ({ bankName, accountNo }) => {
      // 계좌만 저장하면서 오래된 Query 캐시의 프로필 값이 다른 탭의 최신 수정을 덮지 않도록
      // 저장 직전에 서버 값을 다시 읽고 필수 필드를 유지한다.
      const latestProfileResponse = await getProfile();
      const profile = latestProfileResponse?.data;
      if (!profile?.nickname || !profile?.email || !profile?.phone) {
        throw new Error('계좌 저장에 필요한 프로필 필수 정보를 확인하지 못했습니다.');
      }

      return updateProfile({
        nickname: profile.nickname,
        email: profile.email,
        phone: String(profile.phone).replace(/\D/g, ''),
        bankName,
        accountNo,
      });
    },
    onSuccess: (response) => {
      if (response?.data && typeof response.data === 'object') {
        queryClient.setQueryData(MEMBER_PROFILE_QUERY_KEY, response.data);
      } else {
        queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY });
      }
      setAccountError('');
      setAccountForm({ bankName: '', accountNo: '' });
      setIsEditingAccount(false);
      toast({ icon: 'success', title: '정산 계좌를 저장했습니다.' });
    },
    onError: (mutationError) => {
      setAccountError(errorMessage(mutationError, mutationError.message || '계좌 저장에 실패했습니다.'));
    },
  });
  const hasSettlementAccount = Boolean(profileQuery.data?.bankName && profileQuery.data?.accountNo);
  const settlementAccountStatus = profileQuery.isLoading
    ? '확인 중'
    : profileQuery.isError
      ? '확인 실패'
      : hasSettlementAccount
        ? isEditingAccount ? '수정 중' : '등록 완료'
        : '등록 필요';

  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
  const latestApplicationByCategory = useMemo(() => {
    const latest = new Map();
    applications.forEach((application) => {
      const categorySn = Number(application.categorySn);
      if (!latest.has(categorySn)) latest.set(categorySn, application);
    });
    return latest;
  }, [applications]);
  const unavailable = (category) => ['PRVC0002', 'PRVC0003']
    .includes(latestApplicationByCategory.get(Number(category.catSn))?.statusCode);
  const applicationAvailabilityUnavailable = applicationsQuery.isLoading
    || applicationsQuery.isFetching
    || applicationsQuery.isError;
  const uploadedDocumentCount = Object.values(uploadedFiles)
    .filter((file) => selectedCategories.some((category) => category.catSn === file.categorySn))
    .length;

  useEffect(() => {
    uploadedFilesRef.current = uploadedFiles;
  }, [uploadedFiles]);

  useEffect(() => () => {
    Object.values(uploadedFilesRef.current).forEach(({ previewUrl }) => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    });
  }, []);

  const toggleCategory = (category) => {
    if (applicationAvailabilityUnavailable || unavailable(category)) return;
    setError('');
    setSelectedCategories((current) => {
      const alreadySelected = current.some((item) => item.catSn === category.catSn);
      return alreadySelected
        ? current.filter((item) => item.catSn !== category.catSn)
        : [...current, category];
    });
  };

  const fileKey = (categorySn, fileTypeCode) => `${categorySn}:${fileTypeCode}`;
  const uploadDocument = async (category, document, file) => {
    if (!file) return;
    const key = fileKey(category.catSn, document.code);
    setUploadingKey(key);
    setError('');
    try {
      const response = await uploadImage(file, 'provider');
      const uploaded = response.data;
      setUploadedFiles((current) => {
        const previousPreviewUrl = current[key]?.previewUrl;
        if (previousPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(previousPreviewUrl);
        return {
          ...current,
          [key]: {
            categorySn: category.catSn,
            fileTypeCode: document.code,
            flSn: uploaded.flSn,
            fileName: file.name,
            // 제공자 서류는 공개 URL로 열리지 않으므로, 선택한 브라우저에서만 볼 수 있는 로컬 미리보기다.
            previewUrl: URL.createObjectURL(file),
          },
        };
      });
    } catch (uploadError) {
      setError(errorMessage(uploadError, '서류 파일 업로드 중 오류가 발생했습니다.'));
    } finally {
      setUploadingKey('');
    }
  };

  const saveSettlementAccount = (event) => {
    event.preventDefault();
    const bankName = accountForm.bankName.trim();
    const accountNo = normalizeAccountNo(accountForm.accountNo);

    if (!bankName || !accountNo) {
      setAccountError('은행명과 계좌번호를 모두 입력해 주세요.');
      return;
    }
    if (!/^\d+$/.test(accountNo)) {
      setAccountError('계좌번호는 숫자만 입력해 주세요.');
      return;
    }

    setAccountError('');
    accountMutation.mutate({ bankName, accountNo });
  };

  const editSettlementAccount = () => {
    setAccountError('');
    setAccountForm({
      bankName: profileQuery.data?.bankName ?? '',
      accountNo: '',
    });
    setIsEditingAccount(true);
  };

  const cancelSettlementAccountEdit = () => {
    setAccountError('');
    setAccountForm({ bankName: '', accountNo: '' });
    setIsEditingAccount(false);
  };

  const next = async () => {
    if (submitPreparationRef.current || submitMutation.isPending) return;

    if (step === 0 && applicationsQuery.isLoading) {
      setError('신청 가능 여부를 확인하는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (step === 0 && applicationsQuery.isError) {
      setError('신청 가능 여부를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      return;
    }
    if (step === 0 && !selectedCategories.length) {
      setError('신청할 카테고리를 한 개 이상 선택해 주세요.');
      return;
    }
    if (step === 0 && selectedCategories.some(unavailable)) {
      setSelectedCategories((current) => current.filter((category) => !unavailable(category)));
      setError('이미 심사 중이거나 승인된 분야를 제외했습니다. 선택 내용을 다시 확인해 주세요.');
      return;
    }

    if (step < 2) return setStep(step + 1);

    const hasMissingFile = selectedCategories.some((category) => (
      !Object.values(uploadedFiles).some((file) => file.categorySn === category.catSn)
    ));
    if (hasMissingFile) {
      return setError('선택한 카테고리마다 증빙 서류를 한 개 이상 업로드해 주세요.');
    }

    submitPreparationRef.current = true;
    setIsPreparingSubmit(true);
    try {
      // 담당자 7 · F-PROV-006/012: 작성 중 다른 화면에서 같은 분야를 신청했을 수 있으므로
      // 실제 제출 직전에 신청 이력을 다시 읽고 중복 신청 가능성을 차단한다.
      const latestApplicationsResult = await applicationsQuery.refetch();
      if (latestApplicationsResult.isError) {
        setError('신청 가능 여부를 다시 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const unavailableCategorySns = new Set(
        (latestApplicationsResult.data ?? [])
          .filter((application) => ['PRVC0002', 'PRVC0003'].includes(application.statusCode))
          .map((application) => Number(application.categorySn)),
      );
      const hasUnavailableSelection = selectedCategories.some((category) => (
        unavailableCategorySns.has(Number(category.catSn))
      ));
      if (hasUnavailableSelection) {
        setSelectedCategories((current) => current.filter((category) => (
          !unavailableCategorySns.has(Number(category.catSn))
        )));
        setError('작성 중 신청 상태가 변경된 분야를 제외했습니다. 선택 내용을 다시 확인해 주세요.');
        return;
      }

      const files = Object.values(uploadedFiles)
        .filter((file) => selectedCategories.some((category) => category.catSn === file.categorySn))
        .map(({ categorySn, fileTypeCode, flSn }) => ({ categorySn, fileTypeCode, flSn }));

      await submitMutation.mutateAsync({
        categorySns: selectedCategories.map((category) => category.catSn),
        reason: '제공자 권한 신청',
        files,
      });
      navigate('/provider/applications/status');
    } catch (submitError) {
      setError(errorMessage(submitError, '제공자 신청 처리 중 오류가 발생했습니다.'));
    } finally {
      submitPreparationRef.current = false;
      setIsPreparingSubmit(false);
    }
  };

  return (
    <ContentPageShell className="provider-apply-page provider-apply-page--form">
      <PageMeta title="제공자 권한 신청" />
      <header className="provider-apply-page__header">
        <div>
          <h1>제공자 권한 신청</h1>
          <p>활동할 서비스 분야와 정산 계좌, 증빙 서류를 순서대로 확인합니다.</p>
        </div>
      </header>

      <ol className="provider-apply-progress" aria-label="제공자 권한 신청 진행 단계">
        {STEPS.map((item, index) => (
          <li
            aria-current={index === step ? 'step' : undefined}
            className={[
              'provider-apply-progress__item',
              index < step ? 'provider-apply-progress__item--complete' : '',
              index === step ? 'provider-apply-progress__item--current' : '',
            ].filter(Boolean).join(' ')}
            key={item}
          >
            <span className="provider-apply-progress__marker" aria-hidden="true">
              {index < step ? '✓' : index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>

      <div className="provider-apply-layout">
        <section className="provider-apply-card" aria-labelledby="provider-apply-step-title">
          <header className="provider-apply-card__header">
            <span>단계 {step + 1}</span>
            <h2 id="provider-apply-step-title">{STEPS[step]}</h2>
            <p>{STEP_DESCRIPTIONS[step]}</p>
          </header>

          <div className="provider-apply-card__body">
            {step === 0 && categoriesQuery.isLoading && (
              <div className="provider-apply-category-grid">
                {Array.from({ length: 10 }).map((_, index) => (
                  <Skeleton borderRadius={12} height={84} key={index} />
                ))}
              </div>
            )}

            {step === 0 && categoriesQuery.isError && (
              <p className="provider-apply-error" role="alert">서비스 카테고리를 불러오지 못했습니다.</p>
            )}

            {step === 0 && applicationsQuery.isError && (
              <p className="provider-apply-error" role="alert">
                신청 가능 여부를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.
              </p>
            )}

            {step === 0 && categoriesQuery.data && (
              <div className="provider-apply-category-grid">
                {categoriesQuery.data.map((category) => {
                  const isSelected = selectedCategories.some((item) => item.catSn === category.catSn);
                  const application = latestApplicationByCategory.get(Number(category.catSn));

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={isSelected ? 'active' : ''}
                      disabled={applicationAvailabilityUnavailable || unavailable(category)}
                      key={category.catSn}
                      onClick={() => toggleCategory(category)}
                      type="button"
                    >
                      <span className="provider-apply-category-grid__name">{category.catNm}</span>
                      <span className="provider-apply-category-grid__meta">
                        <small>{applicationsQuery.isLoading
                          ? '확인 중'
                          : applicationsQuery.isError
                            ? '확인 필요'
                            : application
                              ? statusLabel(application.statusCode, application.statusName)
                              : '신청 가능'}</small>
                        {isSelected && <span aria-hidden="true">✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 1 && (
              <section
                className={`provider-apply-account${hasSettlementAccount && !isEditingAccount ? ' is-ready' : ''}`}
                aria-labelledby="provider-apply-account-title"
              >
                <header>
                  <div>
                    <span>계좌 확인</span>
                    <h3 id="provider-apply-account-title">정산 계좌</h3>
                  </div>
                  <strong>{settlementAccountStatus}</strong>
                </header>
                <p>여기에서 등록한 계좌는 마이페이지의 환전 계좌에도 함께 반영됩니다.</p>

                {profileQuery.isLoading && (
                  <Skeleton borderRadius={12} height={82} />
                )}

                {!profileQuery.isLoading && profileQuery.isError && (
                  <p className="provider-apply-error" role="alert">
                    계좌 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.
                  </p>
                )}

                {!profileQuery.isLoading && !profileQuery.isError
                  && hasSettlementAccount && !isEditingAccount && (
                  <dl>
                    <div>
                      <dt>은행</dt>
                      <dd>{profileQuery.data.bankName}</dd>
                    </div>
                    <div>
                      <dt>계좌번호</dt>
                      <dd>{maskAccountNo(profileQuery.data.accountNo)}</dd>
                    </div>
                  </dl>
                )}

                {!profileQuery.isLoading && !profileQuery.isError
                  && (!hasSettlementAccount || isEditingAccount) && (
                  <form className="provider-apply-account__form" onSubmit={saveSettlementAccount}>
                    <div className="provider-apply-account__fields">
                      <label htmlFor="provider-settlement-bank-name">
                        <span>은행명</span>
                        <input
                          autoComplete="off"
                          id="provider-settlement-bank-name"
                          maxLength={100}
                          onChange={(event) => {
                            setAccountError('');
                            setAccountForm((current) => ({
                              ...current,
                              bankName: event.target.value,
                            }));
                          }}
                          placeholder="예: 신한은행"
                          value={accountForm.bankName}
                        />
                      </label>
                      <label htmlFor="provider-settlement-account-no">
                        <span>계좌번호</span>
                        <input
                          autoComplete="off"
                          id="provider-settlement-account-no"
                          inputMode="numeric"
                          maxLength={50}
                          onChange={(event) => {
                            setAccountError('');
                            setAccountForm((current) => ({
                              ...current,
                              accountNo: normalizeAccountNo(event.target.value),
                            }));
                          }}
                          placeholder={hasSettlementAccount ? '새 계좌번호 입력' : '숫자만 입력'}
                          value={accountForm.accountNo}
                        />
                      </label>
                    </div>
                    {accountError && (
                      <p className="provider-apply-error" role="alert">{accountError}</p>
                    )}
                    <div className="provider-apply-account__actions">
                      {hasSettlementAccount && (
                        <ActionButton
                          className="min-w-28 max-[760px]:w-full max-[760px]:min-w-0"
                          disabled={accountMutation.isPending}
                          onClick={cancelSettlementAccountEdit}
                          tone="neutral"
                        >
                          <X aria-hidden="true" size={16} />
                          취소
                        </ActionButton>
                      )}
                      <ActionButton
                        className="min-w-28 max-[760px]:w-full max-[760px]:min-w-0"
                        disabled={accountMutation.isPending}
                        type="submit"
                      >
                        <Save aria-hidden="true" size={16} />
                        {accountMutation.isPending ? '저장 중...' : '계좌 저장'}
                      </ActionButton>
                    </div>
                  </form>
                )}

                {!profileQuery.isLoading && !profileQuery.isError
                  && hasSettlementAccount && !isEditingAccount && (
                  <div className="provider-apply-account__actions">
                    <ActionButton
                      className="min-w-28 max-[760px]:w-full max-[760px]:min-w-0"
                      onClick={editSettlementAccount}
                      tone="outline"
                    >
                      <Pencil aria-hidden="true" size={16} />
                      계좌 수정
                    </ActionButton>
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <div className="provider-apply-files">
                {selectedCategories.map((category) => {
                  const categoryFileCount = Object.values(uploadedFiles)
                    .filter((file) => file.categorySn === category.catSn)
                    .length;

                  return (
                    <section className="provider-apply-file-group" key={category.catSn}>
                      <header className="provider-apply-file-group__header">
                        <div>
                          <strong>{category.catNm}</strong>
                          <span>심사에 사용할 서류를 한 개 이상 선택해 주세요.</span>
                        </div>
                        <span>{categoryFileCount}개 등록</span>
                      </header>
                      <div className="provider-apply-file-group__items">
                        {DOCUMENTS.map((document) => {
                          const key = fileKey(category.catSn, document.code);
                          const uploaded = uploadedFiles[key];
                          const uploadLabel = uploadingKey === key
                            ? '업로드 중...'
                            : uploaded?.fileName ?? '이미지 파일 선택';

                          return (
                            <label className={`provider-apply-upload${uploaded ? ' is-uploaded' : ''}`} key={document.code}>
                              <strong>{document.label}</strong>
                              {uploaded?.previewUrl ? (
                                <img alt={`${document.label} 미리보기`} src={uploaded.previewUrl} />
                              ) : (
                                <span className="provider-apply-upload__placeholder">
                                  {uploadingKey === key ? '업로드 중...' : '이미지 선택'}
                                </span>
                              )}
                              <span className="provider-apply-upload__name">{uploadLabel}</span>
                              <input
                                accept="image/*"
                                disabled={uploadingKey === key
                                  || submitMutation.isPending
                                  || isPreparingSubmit}
                                onChange={(event) => (
                                  uploadDocument(category, document, event.target.files?.[0])
                                )}
                                type="file"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="provider-apply-error provider-apply-error--form" role="alert">{error}</p>}

          <footer className={`provider-apply-actions${step === 0 ? ' provider-apply-actions--single' : ''}`}>
            {step > 0 && (
              <ActionButton
                className="min-w-[108px] max-[760px]:w-full"
                disabled={submitMutation.isPending || isPreparingSubmit}
                onClick={() => setStep(step - 1)}
                tone="neutral"
              >
                이전
              </ActionButton>
            )}
            <ActionButton
              className="min-w-[108px] max-[760px]:w-full"
              disabled={submitMutation.isPending
                || isPreparingSubmit
                || accountMutation.isPending
                || Boolean(uploadingKey)
                || (step === 0 && (categoriesQuery.isLoading || applicationAvailabilityUnavailable))
                || (step === 1 && (profileQuery.isLoading || !hasSettlementAccount || isEditingAccount))}
              onClick={next}
            >
              {step === 2
                ? isPreparingSubmit || submitMutation.isPending
                  ? '신청 처리 중...'
                  : `${selectedCategories.length}개 카테고리 신청하기`
                : '다음'}
            </ActionButton>
          </footer>
        </section>

        <aside className="provider-apply-summary" aria-label="제공자 신청 요약">
          <header>
            <div>
              <span>현재 작성 내용</span>
              <h2>신청 요약</h2>
            </div>
            <strong>{step + 1} / {STEPS.length}</strong>
          </header>

          <dl className="provider-apply-summary__counts">
            <div>
              <dt>선택 분야</dt>
              <dd>{selectedCategories.length}개</dd>
            </div>
            <div>
              <dt>정산 계좌</dt>
              <dd className={hasSettlementAccount && !isEditingAccount ? 'is-ready' : 'is-required'}>
                {settlementAccountStatus}
              </dd>
            </div>
            <div>
              <dt>등록 서류</dt>
              <dd>{uploadedDocumentCount}개</dd>
            </div>
          </dl>

          <div className="provider-apply-summary__selection">
            <h3>선택한 분야</h3>
            {selectedCategories.length > 0 ? (
              <ul>
                {selectedCategories.map((category) => (
                  <li key={category.catSn}>{category.catNm}</li>
                ))}
              </ul>
            ) : (
              <p>아직 선택한 분야가 없습니다.</p>
            )}
          </div>

        </aside>
      </div>
    </ContentPageShell>
  );
};

export default ProviderApplyPage;
