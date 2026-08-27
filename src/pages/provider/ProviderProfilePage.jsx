import { useEffect, useRef, useState } from 'react';
import { deleteImage, toImageUrl, uploadImage } from '@api/fileApi';
import { confirm, toast } from '@utils/common';
import { assets } from '@components/mypage/assets';
import {
  useCreatePortfolio,
  useDeletePortfolio,
  useMyPortfolios,
  useMyProviderProfile,
  useUpdateMyProviderProfile,
  useUpdatePortfolio,
} from '@hooks/useProviderProfile';
import MyPageContentHeader from '@components/mypage/MyPageContentHeader';
import ImageAttachmentPicker from '@components/common/ImageAttachmentPicker';
import { ActionButton } from '@components/common/ui';
import FormSkeleton from '@components/skeleton/FormSkeleton';
import './providerProfilePage.css';

const fieldClass = 'w-full rounded-md border border-[#d9d9d9] px-3 py-2 text-sm text-[#404040] focus:border-[#0064ff] focus:outline-none';
const MAX_PORTFOLIO_IMAGES = 5;

/** 담당자 7 · F-PROV-004: 승인된 제공자가 소개와 가능 지역을 직접 관리하는 화면이다. */
export default function ProviderProfilePage({
  embedded = false,
  showHeader = true,
  view = 'all',
} = {}) {
  const profileQuery = useMyProviderProfile();
  const needsProviderProfile = view === 'all' || view === 'provider';
  const statusClass = embedded
    ? 'w-full py-12 text-center'
    : 'mx-auto max-w-3xl px-4 py-12 text-center';

  if (needsProviderProfile && profileQuery.isLoading) return (
    <main className={`provider-profile-editor ${embedded ? 'w-full py-8' : 'mx-auto max-w-3xl px-4 py-8'}`}>
      {embedded && showHeader && <MyPageContentHeader title="프로필" />}
      <FormSkeleton fields={6} />
    </main>
  );
  if (needsProviderProfile && profileQuery.isError) return (
    <main className={`provider-profile-editor ${embedded ? 'w-full' : 'mx-auto max-w-3xl px-4 py-8'}`}>
      {embedded && showHeader && <MyPageContentHeader title="프로필" />}
      <div className={statusClass}>
        <p className="text-[#d9363e]">제공자 프로필을 불러올 수 없습니다.</p>
        <ActionButton className="mt-4" onClick={() => profileQuery.refetch()} tone="outline">다시 시도</ActionButton>
      </div>
    </main>
  );

  return (
    <main className={`provider-profile-editor ${embedded ? 'w-full' : 'mx-auto max-w-3xl px-4 py-8'}`}>
      {embedded && showHeader ? (
        <MyPageContentHeader title="프로필" />
      ) : !embedded ? (
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#252525]">제공자 프로필 관리</h1>
            <p className="mt-1 text-sm text-[#666]">공개 프로필에 표시할 소개와 가능 지역을 관리합니다.</p>
          </div>
          <ActionButton to="/user/mypage" tone="outline">대시보드</ActionButton>
        </div>
      ) : null}
      <div className={embedded && view === 'all' ? 'provider-profile-editor__split' : 'space-y-6'}>
        {(view === 'all' || view === 'provider') && (
          <ProviderProfileForm key={profileQuery.data.userSn} profile={profileQuery.data} />
        )}
        {(view === 'all' || view === 'portfolio') && <PortfolioRegistrationSection />}
      </div>
    </main>
  );
}

/**
 * 담당자 7 · F-PROV-005: 파일 업로드 계약을 소비해 포트폴리오 등록·수정·삭제를 제공한다.
 * 새 파일 업로드와 포트폴리오 저장 사이에 실패하면 방금 올린 고아 파일을 정리한다.
 */
function PortfolioRegistrationSection() {
  const imagesRef = useRef([]);
  const portfoliosQuery = useMyPortfolios();
  const createMutation = useCreatePortfolio();
  const updateMutation = useUpdatePortfolio();
  const deleteMutation = useDeletePortfolio();
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => () => {
    imagesRef.current.forEach((image) => {
      if (image.file && image.url) URL.revokeObjectURL(image.url);
    });
  }, []);

  const clearEditor = () => {
    imagesRef.current.forEach((image) => {
      if (image.file && image.url) URL.revokeObjectURL(image.url);
    });
    setEditingPortfolio(null);
    setTitle('');
    setDescription('');
    setImages([]);
    setFileError('');
  };

  const editPortfolio = (portfolio) => {
    imagesRef.current.forEach((image) => {
      if (image.file && image.url) URL.revokeObjectURL(image.url);
    });
    setEditingPortfolio(portfolio);
    setTitle(portfolio.title ?? '');
    setDescription(portfolio.content ?? '');
    setImages((portfolio.files ?? []).map((file) => ({
      id: `file-${file.fileSn}`,
      name: `포트폴리오 이미지 ${file.sortOrder + 1}`,
      size: null,
      file: null,
      flSn: file.fileSn,
      url: file.url,
    })));
    setFileError('');
  };

  const submitPortfolio = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast({ icon: 'error', title: '포트폴리오 제목을 입력해 주세요.' });
      return;
    }
    if (images.length === 0) {
      toast({ icon: 'error', title: '대표로 사용할 작업 이미지를 한 장 이상 선택해 주세요.' });
      return;
    }

    setIsSubmitting(true);
    const uploadedFiles = [];
    try {
      for (const image of images.filter((item) => item.file)) {
        const response = await uploadImage(image.file, 'portfolio');
        uploadedFiles.push({ id: image.id, flSn: response.data.flSn });
      }

      const uploadedById = new Map(uploadedFiles.map((file) => [file.id, file.flSn]));
      const fileIds = images.map((image) => image.flSn ?? uploadedById.get(image.id));
      const payload = {
        title: normalizedTitle,
        content: description.trim() || null,
        fileIds,
      };

      if (editingPortfolio) {
        await updateMutation.mutateAsync({
          portfolioSn: editingPortfolio.portfolioSn,
          ...payload,
        });
        const retainedIds = new Set(fileIds);
        const removedIds = (editingPortfolio.files ?? [])
          .map((file) => file.fileSn)
          .filter((fileSn) => !retainedIds.has(fileSn));
        await Promise.allSettled(removedIds.map((fileSn) => deleteImage(fileSn)));
        toast({ icon: 'success', title: '포트폴리오를 수정했습니다.' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ icon: 'success', title: '포트폴리오를 등록했습니다.' });
      }
      clearEditor();
    } catch (error) {
      await Promise.allSettled(uploadedFiles.map((file) => deleteImage(file.flSn)));
      toast({
        icon: 'error',
        title: error?.response?.data?.message ?? '포트폴리오 저장에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePortfolio = async (portfolio) => {
    const confirmed = await confirm({
      title: '포트폴리오를 삭제할까요?',
      text: `'${portfolio.title}' 항목은 삭제 후 복구할 수 없습니다.`,
      confirmButtonText: '삭제',
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(portfolio.portfolioSn);
      await Promise.allSettled((portfolio.files ?? []).map((file) => deleteImage(file.fileSn)));
      if (editingPortfolio?.portfolioSn === portfolio.portfolioSn) clearEditor();
      toast({ icon: 'success', title: '포트폴리오를 삭제했습니다.' });
    } catch (error) {
      toast({
        icon: 'error',
        title: error?.response?.data?.message ?? '포트폴리오 삭제에 실패했습니다.',
      });
    }
  };

  return (
    <div className="provider-portfolio-layout">
      <section
        aria-labelledby="portfolio-registration-title"
        className="provider-profile-editor__card grid gap-5 rounded-xl border border-[#e5e5e5] bg-white p-6"
      >
        <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 id="portfolio-registration-title" className="text-lg font-bold text-[#252525]">
            {editingPortfolio ? '포트폴리오 수정' : '새 포트폴리오 등록'}
          </h2>
          {editingPortfolio && (
            <ActionButton onClick={clearEditor} size="sm" tone="outline">새 항목 등록</ActionButton>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-[#404040]" htmlFor="portfolio-title">포트폴리오 제목</label>
          <input
            id="portfolio-title"
            className={fieldClass}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 원룸 이사 및 정리 서비스"
            value={title}
          />
          <p className="mt-1 text-right text-xs text-[#888]">{title.length}/200</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-[#404040]" htmlFor="portfolio-description">작업 설명</label>
          <textarea
            id="portfolio-description"
            className={`${fieldClass} min-h-32 resize-y`}
            maxLength={4000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="어떤 작업을 했는지, 제공 가능한 범위를 알려 주세요."
            value={description}
          />
          <p className="mt-1 text-right text-xs text-[#888]">{description.length}/4000</p>
        </div>

        <ImageAttachmentPicker
          compact
          description="JPG·PNG·WEBP, 파일당 10MB, 최대 5개"
          error={fileError}
          images={images}
          inputAriaLabel="포트폴리오 작업 이미지 선택"
          maxImages={MAX_PORTFOLIO_IMAGES}
          onChange={setImages}
          onError={setFileError}
          title="작업 이미지"
        />

        <div className="flex justify-end">
          <ActionButton disabled={isSubmitting} onClick={submitPortfolio}>
            {isSubmitting ? '저장 중' : editingPortfolio ? '수정 저장' : '포트폴리오 등록'}
          </ActionButton>
        </div>
      </section>

      <section
        aria-labelledby="portfolio-list-title"
        className="provider-profile-editor__card rounded-xl border border-[#e5e5e5] bg-white p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="portfolio-list-title" className="text-lg font-bold text-[#252525]">등록된 포트폴리오 관리</h2>
          <span className="shrink-0 text-sm font-semibold text-[#667085]">
            {(portfoliosQuery.data?.length ?? 0).toLocaleString()}건
          </span>
        </div>

        {portfoliosQuery.isLoading && <p className="text-sm text-[#666]">등록한 포트폴리오를 불러오는 중입니다.</p>}
        {portfoliosQuery.isError && (
          <div className="rounded-lg border border-[#f1c5c8] bg-[#fff8f8] px-4 py-3 text-sm text-[#c62828]">
            포트폴리오 목록을 불러오지 못했습니다.
            <button type="button" className="ml-2 underline" onClick={() => portfoliosQuery.refetch()}>다시 시도</button>
          </div>
        )}
        {!portfoliosQuery.isLoading && !portfoliosQuery.isError && portfoliosQuery.data?.length === 0 && (
          <div className="flex min-h-40 items-center justify-center border-y border-[#e9edf3] text-sm text-[#667085]">
            등록된 포트폴리오가 없습니다.
          </div>
        )}
        {portfoliosQuery.data?.length > 0 && (
          <ul className="provider-profile-editor__portfolio-list" aria-label="등록한 포트폴리오">
            {portfoliosQuery.data.map((portfolio) => {
              const representative = portfolio.files?.find((file) => file.representative)
                ?? portfolio.files?.[0];
              return (
                <li key={portfolio.portfolioSn}>
                  <div className="provider-profile-editor__portfolio-thumb">
                    {representative?.url ? (
                    <img
                      src={toImageUrl(representative.url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    ) : (
                      <span>이미지 없음</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-[15px] text-[#252525]">{portfolio.title}</strong>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-[#666]">
                      {portfolio.content || '등록된 설명이 없습니다.'}
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <ActionButton size="sm" tone="outline" onClick={() => editPortfolio(portfolio)}>수정</ActionButton>
                      <ActionButton
                        disabled={deleteMutation.isPending}
                        onClick={() => removePortfolio(portfolio)}
                        size="sm"
                        tone="danger-outline"
                      >
                        삭제
                      </ActionButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProviderProfileForm({ profile }) {
  const updateMutation = useUpdateMyProviderProfile();
  const [form, setForm] = useState({
    introduction: profile.introduction ?? '',
    availableArea: profile.availableArea ?? '',
    profileFileSn: profile.profileFileSn ?? null,
  });
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoButtonClick = () => photoInputRef.current?.click();

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // 같은 파일을 다시 선택해도 change가 발생하도록 초기화
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const res = await uploadImage(file, 'profile');
      setForm((current) => ({ ...current, profileFileSn: res.data.flSn }));
      setPreviewImageUrl(toImageUrl(res.data.url));
    } catch (error) {
      toast({ icon: 'error', title: error?.response?.data?.message ?? '사진 업로드에 실패했습니다.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      await updateMutation.mutateAsync(form);
      toast({ icon: 'success', title: '제공자 프로필을 저장했습니다.' });
    } catch (error) {
      toast({ icon: 'error', title: error?.response?.data?.message ?? '프로필 저장에 실패했습니다.' });
    }
  };

  return (
      <form className="provider-profile-editor__card provider-profile-editor__form rounded-xl border border-[#e5e5e5] bg-white p-6" onSubmit={submit}>
        <div className="provider-profile-editor__section-heading">
          <h2>기본 프로필</h2>
        </div>

        {/* 제공자 전용 프로필 사진 — 개인정보 수정의 계정 사진과 별개 값이다. 비워두면(profileFileSn
            null) 공개 프로필에서 개인 프로필 사진이 그대로 대체 표시된다 (PRV_PRF_FL_SN 정본요청 참고). */}
        <label className="mb-2 block text-sm font-bold text-[#404040]">프로필 사진</label>
        <div className="mb-6 flex items-center gap-4">
          <div className="size-[80px] shrink-0 overflow-hidden rounded-full bg-[#e6f0ff]">
            <img
              src={previewImageUrl || toImageUrl(profile.profileImageUrl) || assets.profile}
              alt=""
              className="size-full object-cover"
            />
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <div>
            <button type="button" onClick={handlePhotoButtonClick} disabled={isUploadingPhoto} className="btn btn-outline btn-sm">
              {isUploadingPhoto ? '업로드 중...' : '사진 변경'}
            </button>
            <p className="mt-1 text-xs text-[#888]">비워두면 개인 프로필 사진이 대신 표시됩니다.</p>
          </div>
        </div>

        <label className="mb-2 block text-sm font-bold text-[#404040]" htmlFor="provider-area">가능 지역</label>
        <input id="provider-area" className={fieldClass} maxLength={200} value={form.availableArea}
          onChange={(event) => setForm((current) => ({ ...current, availableArea: event.target.value }))}
          placeholder="예: 서울 전 지역, 경기 성남시" />
        <label className="mb-2 mt-6 block text-sm font-bold text-[#404040]" htmlFor="provider-introduction">소개</label>
        <textarea id="provider-introduction" className={`${fieldClass} min-h-44 resize-y`} maxLength={4000} value={form.introduction}
          onChange={(event) => setForm((current) => ({ ...current, introduction: event.target.value }))}
          placeholder="제공 가능한 서비스와 경력을 소개해 주세요." />
        <p className="mt-1 text-right text-xs text-[#888]">{form.introduction.length}/4000</p>
        <div className="mt-6 flex justify-end"><ActionButton type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? '저장 중' : '저장'}</ActionButton></div>
      </form>
  );
}
