// @ai_generated
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createReview, updateReview, deleteReview } from '@api/reviewApi';
import { reviewQueryKeys } from '@hooks/useReview';
import { toImageUrl } from '@api/fileApi';
import StarRating from '@components/review/StarRating';
import PhotoLightbox from '@components/common/PhotoLightbox';
import { ActionButton, StatusBadge } from '@components/common/ui';
import { confirm, toast } from '@utils/common';

const MAX_PHOTOS = 5;
const MAX_CONTENT_LENGTH = 500;
const DEFAULT_GUIDANCE_TEXT = '상품 상태와 설명이 일치했는지, 응대와 소통은 어땠는지, 배송·직거래 과정에서 좋았거나 아쉬웠던 점을 구체적으로 남겨주세요.';

/**
 * 거래 리뷰 등록/수정 폼. ReviewWritePage/ReviewEditPage(별도 페이지)에 있던 기능을
 * 거래 상세의 "거래 리뷰" 카드 안에서 그대로 쓸 수 있도록 옮긴 것 - 별점, 사진 첨부
 * (드래그앤드롭·대표사진 지정·개별 삭제), 내용 작성, 등록/수정 API 호출까지 동일하다.
 * 다만 카드 폭이 좁아 사진은 2단 그리드 대신 발송 인증 등록과 같은 가로 스크롤 썸네일 목록
 * 패턴(.trade-proof-*)을 재사용하고, 이미 같은 페이지 다른 카드에 상품/상대방 정보가 보이므로
 * 아이템 요약과 리뷰 평균 별점은 다시 그리지 않는다.
 *
 * @ai_generated (담당자1, 2026-08-09): 작성/수정이 "가능한" 상태(review가 WRITABLE이든
 * WRITTEN이든)에서는 폼을 잠글 이유가 없다 - 처음부터 바로 입력 가능하게 열어두고, 등록/
 * 수정/삭제는 영역 우측 상단 버튼으로만 노출한다. 잠금·오버레이는 애초에 작성이 불가능한
 * 상태(UNAVAILABLE)에서만 의미가 있다 - disabledText를 넘기면 입력을 모두 막고 그 위에
 * 반투명 오버레이로 안내 문구를 가운데 보여준다(빈 텍스트 한 줄보다, 실제로 채워질 폼의
 * 모양을 흐릿하게라도 보여주는 쪽이 낫다는 판단, 사용자 확인).
 */
export default function TradeReviewForm({
  tradeId,
  review,
  disabledText,
  guidanceText = DEFAULT_GUIDANCE_TEXT,
  onDone,
}) {
  const queryClient = useQueryClient();
  const isDisabled = Boolean(disabledText);
  const isEdit = Boolean(review?.reviewId);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [content, setContent] = useState(review?.content ?? '');
  const [photos, setPhotos] = useState([]); // [{ id, file, previewUrl }] - 새로 첨부한 사진만.
  const [pickMode, setPickMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedExistingPhotoIndex, setSelectedExistingPhotoIndex] = useState(null);
  const fileInputRef = useRef(null);

  const existingPhotos = review?.photos ?? [];
  const existingPhotoUrls = existingPhotos.map(toImageUrl);
  const remainingSlots = MAX_PHOTOS - existingPhotos.length - photos.length;

  const addFiles = (fileList) => {
    if (isDisabled || remainingSlots <= 0) return;
    const files = Array.from(fileList).slice(0, remainingSlots).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...files]);
  };

  const handleFilesSelected = (event) => {
    addFiles(event.target.files ?? []);
    event.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const setAsRepresentative = (photoId) => {
    setPhotos((prev) => {
      const idx = prev.findIndex((p) => p.id === photoId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      next.unshift(picked);
      return next;
    });
    setPickMode(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ icon: 'error', title: '별점을 선택해주세요.' });
      return;
    }
    if (content.trim().length === 0) {
      toast({ icon: 'error', title: '리뷰 내용을 입력해주세요.' });
      return;
    }

    const formData = new FormData();
    if (!isEdit) formData.append('targetId', tradeId);
    formData.append('rating', rating);
    formData.append('content', content);
    photos.forEach((p) => formData.append('photos', p.file));

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateReview(review.reviewId, formData);
        toast({ icon: 'success', title: '리뷰가 수정되었습니다.' });
      } else {
        await createReview(formData);
        toast({ icon: 'success', title: '리뷰가 등록되었습니다.' });
      }
      await queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      onDone?.();
    } catch (err) {
      console.error(isEdit ? '리뷰 수정 실패:' : '리뷰 등록 실패:', err);
      toast({
        icon: 'error',
        title: isEdit
          ? '리뷰 수정에 실패했습니다. 잠시 후 다시 시도해주세요.'
          : '리뷰 등록에 실패했습니다. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: '리뷰를 삭제하시겠습니까?',
      text: '삭제한 리뷰는 복구하거나 다시 작성할 수 없습니다.',
    });
    if (!ok) return;

    try {
      await deleteReview(review.reviewId);
      await queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      toast({ icon: 'success', title: '리뷰가 삭제되었습니다.' });
    } catch (error) {
      toast({
        icon: 'error',
        title: error.response?.data?.message || '리뷰 삭제에 실패했습니다.',
      });
    }
  };

  return (
    <div className="trade-detail-card__block">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-black">내가 작성한 리뷰</h2>
        {!isDisabled && (
          <div className="flex items-center gap-2">
            {isEdit && (
              <ActionButton disabled={submitting} onClick={handleDelete} size="sm" tone="danger">
                삭제
              </ActionButton>
            )}
            <ActionButton loading={submitting} onClick={handleSubmit} size="sm">
              {submitting ? (isEdit ? '수정 중...' : '등록 중...') : (isEdit ? '수정' : '리뷰 등록')}
            </ActionButton>
          </div>
        )}
      </div>

      <div className="trade-review-form-wrap">
        <div
          className={`trade-review-form${isDisabled ? ' trade-review-form--disabled' : ''}`}
          // inert: pointer-events:none은 마우스만 막고 키보드 Tab/Enter는 막지 못한다.
          // inert 속성은 포커스·클릭·스크린리더 접근을 서브트리 전체에서 한 번에 차단한다.
          inert={isDisabled}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <p className="trade-review-form__label">만족하셨나요?</p>
          <StarRating value={rating} onChange={setRating} />

          <label className="trade-form-field trade-review-form__content">
            어떤 점이 좋았나요?
            <textarea
              className="input trade-form-field__textarea trade-review-form__textarea"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
              maxLength={MAX_CONTENT_LENGTH}
              placeholder="거래 경험을 구체적으로 작성하세요."
            />
            <span className="trade-form-field__count">{content.length} / {MAX_CONTENT_LENGTH}</span>
          </label>

          <div className="trade-proof-upload-area">
            <div className="trade-proof-upload-box">
              <label className="trade-proof-upload" htmlFor={`review-photo-input-${tradeId}`}>
                <input
                  id={`review-photo-input-${tradeId}`}
                  ref={fileInputRef}
                  className="trade-proof-upload__input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  disabled={remainingSlots <= 0}
                />
                <span className="trade-proof-upload__icon" aria-hidden="true">↑</span>
                <strong>사진 첨부</strong>
                <span>{pickMode ? '대표로 지정할 사진을 선택하세요' : `드래그앤드롭 또는 파일 선택 · 최대 ${MAX_PHOTOS}장 (${existingPhotos.length + photos.length}/${MAX_PHOTOS})`}</span>
              </label>

              {(existingPhotos.length > 0 || photos.length > 0) && (
                <ul className="trade-proof-thumbnail-list" aria-label="첨부한 리뷰 사진">
                  {existingPhotoUrls.map((url, index) => (
                    <li key={url}>
                      <img
                        src={url}
                        alt={`기존 리뷰 사진 ${index + 1}`}
                        onClick={() => setSelectedExistingPhotoIndex(index)}
                        className="trade-review-photo-trigger"
                      />
                    </li>
                  ))}
                  {photos.map((p, index) => (
                    <li key={p.id}>
                      <img
                        src={p.previewUrl}
                        alt={`새로 첨부한 리뷰 사진 ${index + 1}`}
                        onClick={() => pickMode && index !== 0 && setAsRepresentative(p.id)}
                        style={{
                          cursor: pickMode && index !== 0 ? 'pointer' : 'default',
                          outline: index === 0 ? '2px solid #155eef' : 'none',
                        }}
                      />
                      {index === 0 && (
                        <StatusBadge
                          className="trade-review-form__representative-badge"
                          tone="info"
                          variant="soft"
                        >
                          대표
                        </StatusBadge>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        disabled={submitting}
                        aria-label={`새로 첨부한 리뷰 사진 ${index + 1} 삭제`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {photos.length > 0 && (
              <div className="trade-detail-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPickMode((v) => !v)}
                >
                  대표이미지로 지정
                </button>
              </div>
            )}
          </div>

            <div className="mt-6 rounded border border-[#ebebeb] bg-[#f8f9fd] p-4 text-[15px] text-[#4e4e4e]">
              <p className="mb-1 font-bold text-black">이런 내용을 적으면 다른 사용자에게 도움이 돼요</p>
              <p>{guidanceText}</p>
            </div>

          <PhotoLightbox
            title="리뷰 사진"
            photoUrls={existingPhotoUrls}
            index={selectedExistingPhotoIndex}
            onClose={() => setSelectedExistingPhotoIndex(null)}
            onNavigate={setSelectedExistingPhotoIndex}
          />
        </div>

        {isDisabled && (
          <div className="trade-review-form__overlay">
            <p className="trade-review-form__overlay-notice">{disabledText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
