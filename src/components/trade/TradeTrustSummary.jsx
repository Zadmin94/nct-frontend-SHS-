import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { getUserReviewTrust } from '@api/reviewApi';

const unwrapData = (response) => response?.data ?? response;

const MAX_SCORE = 5.0;

const formatScore = (score) => {
  const numericScore = Number(score);

  return Number.isFinite(numericScore)
    ? numericScore.toFixed(1)
    : '-';
};

const toReviewCount = (value) => {
  if (value == null || value === '') {
    return null;
  }

  const numericCount = Number(value);
  return Number.isInteger(numericCount) && numericCount >= 0
    ? numericCount
    : null;
};

/**
 * 거래 상대방이 현재 거래 도메인에서 받은 리뷰의 평균 별점과 리뷰 수를 짧게 표시한다.
 * @ai_generated: 개별 리뷰 본문까지는 안 보여준다 - 경매는 최고가 입찰로 상대가 정해지는
 * 구조라 "상대를 고를지" 결정하는 지점이 없고(입찰 전엔 경매 페이지에 별도 리뷰 열람 기능이
 * 이미 있음), 낙찰·거래 확정 이후에는 리뷰 본문을 봐도 취할 수 있는 행동이 없다. 집계 평점
 * 정도의 가벼운 참고 신호만 남긴다(사용자 결정, 2026-08-09). "프로필 정보 오른쪽 남는 공간"에
 * 배지처럼 붙일 수 있도록 인라인 요소 하나로 렌더링한다(박스 없음).
 * 리뷰가 없거나 API가 아직 배포되지 않은 경우에도 거래 상세 자체는 계속 볼 수 있어야 한다.
 */
const TradeTrustSummary = ({ counterpartUserId, dealType }) => {
  const trustQuery = useQuery({
    queryKey: ['reviews', 'trust', dealType, String(counterpartUserId)],
    queryFn: () => getUserReviewTrust(counterpartUserId, dealType),
    enabled: Boolean(counterpartUserId && dealType),
    select: unwrapData,
  });
  const trust = trustQuery.data;
  const reviewCount = toReviewCount(trust?.totalCount);
  const reviewScore = trust?.totalScore == null || trust?.totalScore === ''
    ? Number.NaN
    : Number(trust.totalScore);

  if (!counterpartUserId || !dealType || trustQuery.isLoading) {
    return null;
  }

  if (trustQuery.isError) {
    return <span className="trade-trust-score trade-trust-score--muted">평점 조회 실패</span>;
  }

  if (reviewCount == null) {
    return <span className="trade-trust-score trade-trust-score--muted">평점 정보 없음</span>;
  }

  if (reviewCount === 0) {
    return (
      <span className="trade-trust-score trade-trust-score--muted">
        <Star size={16} aria-hidden="true" />
        리뷰 없음
      </span>
    );
  }

  if (!Number.isFinite(reviewScore)) {
    return <span className="trade-trust-score trade-trust-score--muted">평점 정보 없음</span>;
  }

  return (
    <span
      className="trade-trust-score"
      aria-label={`${dealType === 'service' ? '서비스' : '물품'} 리뷰 평균 별점 ${formatScore(reviewScore)}점, 5점 만점, 리뷰 ${reviewCount}개`}
    >
      <Star size={16} aria-hidden="true" />
      <strong>{formatScore(reviewScore)}</strong>
      <span className="trade-trust-score__max">/{MAX_SCORE.toFixed(1)}</span>
      <span className="trade-trust-score__reviews">· 리뷰 {reviewCount}개</span>
    </span>
  );
};

export default TradeTrustSummary;
