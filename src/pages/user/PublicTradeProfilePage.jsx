import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Flag, PackageCheck, Star } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toImageUrl } from '@api/fileApi';
import { getUserReviews, getUserReviewTrust } from '@api/reviewApi';
import { getTradeProfile } from '@api/tradeProfileApi';
import ReportModal from '@components/common/ReportModal';
import Pagination from '@components/common/Pagination';
import { ActionButton } from '@components/common/ui';
import { ContentPageShell, ContentState } from '@components/content/ContentUi';
import ProfileSkeleton from '@components/skeleton/ProfileSkeleton';
import { useAuth } from '@hooks/useAuth';
import './publicTradeProfilePage.css';

const PAGE_SIZE = 5;
const MAX_SCORE = 5;
const REVIEW_ROLE_TABS = [
  { ariaLabel: '전체 리뷰', label: '전체', value: null },
  { ariaLabel: '판매자로서 받은 리뷰', label: '판매 리뷰', value: 'SELLER' },
  { ariaLabel: '구매자로서 받은 리뷰', label: '구매 리뷰', value: 'BUYER' },
];

const unwrapData = (response) => response?.data ?? response;

const toCount = (value) => {
  if (value == null || value === '') return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
};

const toScore = (value) => {
  if (value == null || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= MAX_SCORE ? score : null;
};

const formatScore = (value) => toScore(value)?.toFixed(1) ?? '-';

const formatReviewDate = (value) => {
  if (!value) return '작성일 미정';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

/** 담당자 7 · 공개 거래 프로필: 평점은 통합하고, 받은 리뷰는 판매·구매 역할로 구분해 보여줍니다. */
const PublicTradeProfilePage = () => {
  const { userSn: rawUserSn } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const userSn = Number(rawUserSn);
  const validUserSn = Number.isSafeInteger(userSn) && userSn > 0;
  const { user } = useAuth();
  const currentUserSn = Number(user?.id ?? user?.userId ?? user?.userSn ?? user?.usrSn);
  const isOwnProfile = Number.isSafeInteger(currentUserSn) && currentUserSn === userSn;
  const [reviewRole, setReviewRole] = useState(null);
  const [page, setPage] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const returnContext = location.state?.tradeProfileReturn;
  const returnTo = typeof returnContext?.to === 'string'
    && returnContext.to.startsWith('/')
    && !returnContext.to.startsWith('//')
    ? returnContext.to
    : null;
  const returnLabel = typeof returnContext?.label === 'string' && returnContext.label.trim()
    ? returnContext.label.trim()
    : '이전 화면으로 돌아가기';
  const handleReturn = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(returnTo, { replace: true });
  };
  const handleReviewRoleChange = (nextRole) => {
    setReviewRole(nextRole);
    setPage(0);
  };
  const handleReviewTabKeyDown = (event, currentIndex) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % REVIEW_ROLE_TABS.length;
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + REVIEW_ROLE_TABS.length) % REVIEW_ROLE_TABS.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = REVIEW_ROLE_TABS.length - 1;
    if (nextIndex == null) return;

    event.preventDefault();
    const nextTab = REVIEW_ROLE_TABS[nextIndex];
    handleReviewRoleChange(nextTab.value);
    document.getElementById(`trade-profile-review-tab-${nextTab.value ?? 'all'}`)?.focus();
  };

  const profileQuery = useQuery({
    queryKey: ['trade-profile', userSn],
    queryFn: () => getTradeProfile(userSn),
    enabled: validUserSn,
  });
  const trustQuery = useQuery({
    queryKey: ['reviews', 'trust', 'goods', String(userSn)],
    queryFn: () => getUserReviewTrust(userSn, 'goods'),
    enabled: validUserSn && profileQuery.isSuccess,
    select: unwrapData,
  });
  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'received', userSn, 'goods', reviewRole ?? 'ALL', page, PAGE_SIZE],
    queryFn: () => getUserReviews(userSn, {
      dealType: 'goods',
      role: reviewRole,
      page,
      size: PAGE_SIZE,
    }).then(unwrapData),
    enabled: validUserSn && profileQuery.isSuccess,
  });

  if (!validUserSn) {
    return (
      <ContentPageShell className="trade-profile-page">
        <Helmet><title>잘못된 거래 프로필 주소 | 에누리컷</title></Helmet>
        <ContentState
          backLabel="메인으로 돌아가기"
          backTo="/"
          title="잘못된 거래 프로필 주소입니다."
          tone="error"
        />
      </ContentPageShell>
    );
  }

  if (profileQuery.isLoading) return <ProfileSkeleton />;

  if (profileQuery.isError) {
    const status = profileQuery.error?.response?.status;
    const missingProfile = status === 404 || status === 410;
    return (
      <ContentPageShell className="trade-profile-page">
        <Helmet><title>거래 프로필 조회 오류 | 에누리컷</title></Helmet>
        <ContentState
          actionLabel={missingProfile ? undefined : '다시 불러오기'}
          backLabel={returnTo ? returnLabel : '메인으로 돌아가기'}
          backTo={returnTo ?? '/'}
          description={missingProfile
            ? '존재하지 않거나 탈퇴한 회원일 수 있습니다.'
            : '잠시 후 다시 시도해 주세요.'}
          onAction={missingProfile ? undefined : () => profileQuery.refetch()}
          title={missingProfile
            ? '거래 프로필을 찾을 수 없습니다.'
            : '거래 프로필을 불러오지 못했습니다.'}
          tone="error"
        />
      </ContentPageShell>
    );
  }

  const profile = profileQuery.data;
  const displayName = profile?.displayName?.trim() || '회원';
  const profileImageUrl = toImageUrl(profile?.profileImageUrl);
  const trustCount = toCount(trustQuery.data?.totalCount);
  const trustScore = toScore(trustQuery.data?.totalScore);
  const reviews = reviewsQuery.data?.content ?? [];
  const totalCount = toCount(reviewsQuery.data?.totalCount) ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const activeRoleLabel = REVIEW_ROLE_TABS.find((tab) => tab.value === reviewRole)?.ariaLabel
    ?? '전체 리뷰';
  const emptyReviewTitle = reviewRole === 'SELLER'
    ? '판매자로서 받은 리뷰가 없습니다.'
    : reviewRole === 'BUYER'
      ? '구매자로서 받은 리뷰가 없습니다.'
      : '아직 받은 물품 리뷰가 없습니다.';

  return (
    <ContentPageShell className="trade-profile-page">
      <Helmet><title>{displayName} 거래 프로필 | 에누리컷</title></Helmet>

      {returnTo && (
        <button
          className="trade-profile-back-link"
          onClick={handleReturn}
          type="button"
        >
          <ChevronLeft aria-hidden="true" />
          {returnLabel}
        </button>
      )}

      <div className="trade-profile-layout">
        <aside className="trade-profile-card" aria-labelledby="trade-profile-name">
          {!isOwnProfile && (
            <ActionButton
              aria-label={`${displayName} 회원 신고하기`}
              className="trade-profile-report-button"
              onClick={() => setReportOpen(true)}
              preserveSize
              size="sm"
              tone="danger-outline"
            >
              <Flag aria-hidden="true" />
              신고
            </ActionButton>
          )}

          <div className="trade-profile-avatar" aria-label={`${displayName} 프로필 사진`}>
            <span aria-hidden="true">{displayName.slice(0, 1)}</span>
            {profileImageUrl && (
              <img
                alt=""
                onError={(event) => { event.currentTarget.hidden = true; }}
                src={profileImageUrl}
              />
            )}
          </div>
          <h1 id="trade-profile-name">{displayName}</h1>

          <section className="trade-profile-trust" aria-labelledby="trade-profile-trust-title">
            <h2 id="trade-profile-trust-title">거래 평점</h2>

            {trustQuery.isLoading && (
              <div className="trade-profile-trust__loading" aria-label="거래 평점을 불러오는 중">
                <span /><span />
              </div>
            )}
            {trustQuery.isError && (
              <div className="trade-profile-inline-state" role="alert">
                <p>거래 평점을 불러오지 못했습니다.</p>
                <button onClick={() => trustQuery.refetch()} type="button">다시 불러오기</button>
              </div>
            )}
            {!trustQuery.isLoading && !trustQuery.isError && trustCount === 0 && (
              <p className="trade-profile-rating is-empty">
                <Star aria-hidden="true" />
                아직 받은 리뷰가 없습니다.
              </p>
            )}
            {!trustQuery.isLoading && !trustQuery.isError && trustCount == null && (
              <p className="trade-profile-rating is-empty">평점 정보를 확인할 수 없습니다.</p>
            )}
            {!trustQuery.isLoading && !trustQuery.isError && trustCount > 0 && trustScore == null && (
              <p className="trade-profile-rating is-empty">
                리뷰 {trustCount.toLocaleString('ko-KR')}개
              </p>
            )}
            {!trustQuery.isLoading && !trustQuery.isError && trustCount > 0 && trustScore != null && (
              <p
                aria-label={`물품 거래 평점 5점 만점에 ${formatScore(trustScore)}점, 물품 리뷰 ${trustCount}개`}
                className="trade-profile-rating"
              >
                <Star aria-hidden="true" fill="currentColor" />
                <strong>{formatScore(trustScore)}</strong>
                <span>리뷰 {trustCount.toLocaleString('ko-KR')}개</span>
              </p>
            )}

            <p className="trade-profile-trust__note">
              받은 물품 거래 리뷰의 5점 평균과 리뷰 수를 기준으로 표시합니다.
            </p>
          </section>
        </aside>

        <section className="trade-profile-reviews" aria-labelledby="trade-profile-review-title">
          <h2 className="sr-only" id="trade-profile-review-title">받은 물품 리뷰</h2>
          <div className="trade-profile-reviews__header">
            <div
              aria-label="받은 물품 리뷰 유형"
              className="trade-profile-review-tabs"
              role="tablist"
            >
              {REVIEW_ROLE_TABS.map((tab, tabIndex) => {
                const selected = tab.value === reviewRole;
                return (
                  <button
                    aria-controls="trade-profile-review-panel"
                    aria-label={tab.ariaLabel ?? tab.label}
                    aria-selected={selected}
                    className={selected ? 'is-active' : ''}
                    id={`trade-profile-review-tab-${tab.value ?? 'all'}`}
                    key={tab.value ?? 'all'}
                    onClick={() => handleReviewRoleChange(tab.value)}
                    onKeyDown={(event) => handleReviewTabKeyDown(event, tabIndex)}
                    role="tab"
                    tabIndex={selected ? 0 : -1}
                    type="button"
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {!reviewsQuery.isLoading && !reviewsQuery.isError && (
              <strong>{totalCount.toLocaleString('ko-KR')}건</strong>
            )}
          </div>

          <div
            aria-busy={reviewsQuery.isFetching}
            aria-labelledby={`trade-profile-review-tab-${reviewRole ?? 'all'}`}
            id="trade-profile-review-panel"
            role="tabpanel"
          >
            {reviewsQuery.isLoading && (
              <div
                aria-label={`${activeRoleLabel}를 불러오는 중`}
                className="trade-profile-review-skeleton"
                role="status"
              >
                {[1, 2, 3].map((item) => <span key={item} />)}
              </div>
            )}
            {reviewsQuery.isError && (
              <div className="trade-profile-review-state" role="alert">
                <strong>{activeRoleLabel}를 불러오지 못했습니다.</strong>
                <button onClick={() => reviewsQuery.refetch()} type="button">다시 불러오기</button>
              </div>
            )}
            {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 && (
              <div className="trade-profile-review-state" role="status">
                <PackageCheck aria-hidden="true" />
                <strong>{emptyReviewTitle}</strong>
                <span>완료된 물품 거래의 리뷰가 등록되면 확인할 수 있습니다.</span>
              </div>
            )}
            {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length > 0 && (
              <>
                <ul className="trade-profile-review-list">
                  {reviews.map((review) => (
                    <li key={review.reviewId}>
                      <div className="trade-profile-review-list__meta">
                        <span aria-label={`평점 ${formatScore(review.rating)}점`}>
                          <Star aria-hidden="true" fill="currentColor" />
                          {formatScore(review.rating)}
                        </span>
                        <time dateTime={review.createdDate}>{formatReviewDate(review.createdDate)}</time>
                      </div>
                      <strong>{review.productTitle || '물품 거래'}</strong>
                      <p>{review.content || '작성된 리뷰 내용이 없습니다.'}</p>
                      <span className="trade-profile-review-list__reviewer">
                        작성자 {review.reviewerName || '회원'}
                      </span>
                    </li>
                  ))}
                </ul>
                <Pagination
                  ariaLabel={`${activeRoleLabel} 페이지 이동`}
                  disabled={reviewsQuery.isFetching}
                  maxVisiblePages={5}
                  onPageChange={(nextPage) => setPage(nextPage - 1)}
                  page={page + 1}
                  showSinglePage
                  totalPages={totalPages}
                />
              </>
            )}
          </div>
        </section>
      </div>

      <ReportModal
        contextLabel={`회원: ${displayName}`}
        onClose={() => setReportOpen(false)}
        open={reportOpen && !isOwnProfile}
        reportedUserSn={userSn}
        targetLabel="신고 대상 회원"
        targetLocked
        targetName={displayName}
        targetType="direct"
      />
    </ContentPageShell>
  );
};

export default PublicTradeProfilePage;
