// @ai_generated
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toImageUrl } from '@api/fileApi';
import { useCounterpartTradeReview, useMyTradeReview } from '@hooks/useReview';
import StarRatingDisplay from '@components/review/StarRatingDisplay';
import TradeReviewForm from '@components/trade/TradeReviewForm';
import AsyncRouteError from '@components/common/AsyncRouteError';
import PhotoLightbox from '@components/common/PhotoLightbox';

// 별점 + 본문 + 사진을 그리는 표시 전용 블록. 상대방이 작성한 리뷰(수정 불가) 전용이다.
// @ai_generated (담당자1, 2026-08-07): 백엔드가 이미 내려주는 photos를 렌더링하지 않아
// 마이페이지 목록에서는 보이던 사진이 거래 상세에서는 사라졌었다(P4-7).
// @ai_generated (담당자1, 2026-08-09): 사진이 보이긴 해도 눌러서 확대할 수 없다는 지적에 따라
// PhotoLightbox를 붙였다.
function ReadOnlyReviewContent({ rating, content, photos }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const photoUrls = (photos ?? []).map(toImageUrl);

  return (
    <div className="mt-2">
      <StarRatingDisplay rating={rating} size={20} />
      <p className="trade-review-content mt-3 text-[#333]">{content}</p>
      {photoUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {photoUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              className="trade-review-photo-trigger"
              onClick={() => setSelectedIndex(index)}
              aria-label={`리뷰 첨부 사진 ${index + 1} 크게 보기`}
            >
              <img
                src={url}
                alt={`리뷰 첨부 사진 ${index + 1}`}
                className="size-20 rounded-lg border border-[#ebebeb] object-cover"
              />
            </button>
          ))}
        </div>
      )}
      <PhotoLightbox
        title="리뷰 사진"
        photoUrls={photoUrls}
        index={selectedIndex}
        onClose={() => setSelectedIndex(null)}
        onNavigate={setSelectedIndex}
      />
    </div>
  );
}

// 상대방이 아직 리뷰를 쓰지 않았을 때, "내가 작성한 리뷰"의 잠금 폼과 같은 톤으로 - 별점/본문이
// 들어갈 자리의 모양은 흐릿하게 유지하고 그 위에 안내 문구만 가운데 띄운다(TradeReviewForm의
// disabledText 오버레이 패턴 재사용, 사용자 확인 2026-08-09).
function CounterpartReviewPlaceholder() {
  return (
    <div className="trade-review-form-wrap mt-2">
      <div className="trade-review-form trade-review-form--disabled" inert="">
        <StarRatingDisplay rating={0} size={20} />
        <p className="mt-3 whitespace-pre-wrap text-[#333]">&nbsp;</p>
      </div>
      <div className="trade-review-form__overlay">
        <p className="trade-review-form__overlay-notice">상대방이 아직 리뷰를 작성하지 않았습니다.</p>
      </div>
    </div>
  );
}

const UNAVAILABLE_TEXT = {
  incomplete: '거래가 완료된 후 리뷰를 작성할 수 있습니다.',
  // @ai_generated (담당자1, 2026-08-07): UNAVAILABLE은 "거래 미완료"와 "삭제 이력 존재"라는
  // 서로 다른 원인을 하나로 묶은 상태라, 거래 완료 여부로 문구를 구분한다.
  deleted: '삭제한 리뷰는 다시 작성하거나 수정할 수 없습니다.',
};

export default function TradeReviewSection({ tradeId, isTradeCompleted, guidanceText }) {
  const reviewQuery = useMyTradeReview(tradeId);
  const review = reviewQuery.data;
  const counterpartReviewQuery = useCounterpartTradeReview(tradeId);
  const counterpartReview = counterpartReviewQuery.data;
  const [searchParams, setSearchParams] = useSearchParams();

  // ?review=write|edit(레거시 /user/reviews/write|edit/:id 리다이렉트가 남기는 흔적)는
  // 폼이 항상 열려 있는 지금은 더 할 일이 없다 - 쿼리만 지워 새로고침 시 남지 않게 한다.
  useEffect(() => {
    if (!searchParams.get('review')) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('review');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  return (
    <aside className="auction-trade-detail-shell__review" aria-label="거래 리뷰">
      {/* 상대방이 작성한 리뷰 + 내가 작성한 리뷰를 한 카드 안 두 구획으로 묶는다 - 구분선은
          .trade-detail-card__block + .trade-detail-card__block(페이지 공통 규칙)에 맡긴다. */}
      <div className="trade-detail-card">
        <div className="trade-detail-card__block">
          <h2 className="text-xl font-bold text-black">상대방이 작성한 리뷰</h2>

          {counterpartReviewQuery.isLoading && <p className="mt-2 text-[#666]">리뷰 상태를 확인하는 중입니다.</p>}
          {counterpartReviewQuery.isError && (
            <AsyncRouteError
              error={counterpartReviewQuery.error}
              onRetry={() => counterpartReviewQuery.refetch()}
              compact
            />
          )}

          {counterpartReview?.status === 'WRITTEN' && (
            <ReadOnlyReviewContent
              rating={counterpartReview.rating}
              content={counterpartReview.content}
              photos={counterpartReview.photos}
            />
          )}

          {counterpartReview?.status === 'NOT_WRITTEN' && <CounterpartReviewPlaceholder />}
        </div>

        {reviewQuery.isLoading && (
          <div className="trade-detail-card__block">
            <p className="text-[#666]">리뷰 상태를 확인하는 중입니다.</p>
          </div>
        )}
        {reviewQuery.isError && (
          <div className="trade-detail-card__block">
            <AsyncRouteError error={reviewQuery.error} onRetry={() => reviewQuery.refetch()} compact />
          </div>
        )}

        {review?.status === 'UNAVAILABLE' && (
          <TradeReviewForm
            key={`unavailable-${isTradeCompleted}`}
            tradeId={tradeId}
            disabledText={isTradeCompleted ? UNAVAILABLE_TEXT.deleted : UNAVAILABLE_TEXT.incomplete}
            guidanceText={guidanceText}
          />
        )}

        {(review?.status === 'WRITABLE' || review?.status === 'WRITTEN') && (
          <TradeReviewForm
            // 리뷰 삭제/등록으로 reviewId가 바뀌면(또는 없어지면) 이전 내용이 남아있지 않도록
            // 새로 마운트해 폼 내부 상태를 초기값(review 기준)으로 되돌린다.
            key={review.reviewId ?? 'new'}
            tradeId={tradeId}
            review={review.status === 'WRITTEN' ? review : undefined}
            guidanceText={guidanceText}
          />
        )}
      </div>
    </aside>
  );
}
