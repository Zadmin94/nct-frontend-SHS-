import MyPageListItem from '@components/mypage/MyPageListItem';
import MyPageListPriceActions from '@components/mypage/MyPageListPriceActions';
import MyPageMobileCard from '@components/mypage/MyPageMobileCard';
import MyPageStatusBadge from '@components/mypage/MyPageStatusBadge';
import StarRatingDisplay from '@components/review/StarRatingDisplay';
import { ActionButton, StatusBadge } from '@components/common/ui';
import { formatDate } from '@utils/common';

const REVIEW_TYPE_META = {
  goods: { label: '물건거래', badgeClass: 'badge-primary' },
  service: { label: '서비스', badgeClass: 'badge-teal' },
};

const isReviewExpired = (reviewDeadline) => {
  if (!reviewDeadline) return false;
  return new Date(reviewDeadline) < new Date(new Date().toDateString());
};

export default function MyPageReviewListItem({
  variant,
  thumbnail,
  title,
  dealType = 'goods',
  partyLabel = '판매자',
  partyName,
  completedDate,
  reviewDeadline,
  rating,
  content,
  onViewTarget,
}) {
  const typeMeta = REVIEW_TYPE_META[dealType] ?? REVIEW_TYPE_META.goods;
  const isWritten = variant === 'written';
  const expired = !isWritten && isReviewExpired(reviewDeadline);

  const dday = (() => {
    if (isWritten || !reviewDeadline || expired) return null;
    const today = new Date(new Date().toDateString());
    const deadline = new Date(reviewDeadline);
    const diff = Math.round((deadline - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-Day';
    if (diff > 0) return `D-${diff}`;
    return null;
  })();

  const deadlineText = `거래 완료일 ${formatDate(completedDate)}`;

  const badgeEl = (
    <>
      <MyPageStatusBadge className={typeMeta.badgeClass}>{typeMeta.label}</MyPageStatusBadge>
      {dday && (
        <StatusBadge tone={dday === 'D-Day' ? 'danger' : 'warning'} variant="soft">
          리뷰작성기간 {dday}
        </StatusBadge>
      )}
    </>
  );

  const actionButtonEl = expired ? (
    <StatusBadge tone="danger" variant="soft">
      기간 만료
    </StatusBadge>
  ) : (
    <ActionButton onClick={onViewTarget}>상세보기</ActionButton>
  );

  return (
    <>
      {/* ── 모바일: 상품구매목록과 동일한 카드 형태 ────────────── */}
      <div className="sm:hidden">
        <MyPageMobileCard
          imageSrc={thumbnail}
          imageAlt={title}
          imageFallbackLabel="NO IMAGE"
          badge={badgeEl}
          title={title}
          footerLeft={deadlineText}
          actionButton={actionButtonEl}
        />
      </div>

      {/* ── 데스크톱: 기존 가로 행 레이아웃 ────────────────────── */}
      <div className="hidden sm:block">
        <MyPageListItem
          imageSrc={thumbnail}
          imageAlt={title}
          imageFallback="NO IMAGE"
          badge={badgeEl}
          title={title}
          actions={(
            <MyPageListPriceActions topLine={deadlineText} topLineClassName="text-sm font-medium whitespace-nowrap text-[#667085]">
              {actionButtonEl}
            </MyPageListPriceActions>
          )}
        >
          {isWritten ? (
            <div className="flex min-w-0 items-center gap-3">
              <StarRatingDisplay rating={rating} size={17} />
              <p className="truncate">{content}</p>
            </div>
          ) : (
            <p className="flex items-center gap-2">
              <span><strong>{partyLabel}</strong> {partyName || '-'}</span>
            </p>
          )}
        </MyPageListItem>
      </div>
    </>
  );
}
