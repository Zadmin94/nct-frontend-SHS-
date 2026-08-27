import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { toImageUrl } from '@api/fileApi';
import { getUserReviews } from '@api/reviewApi';
import Pagination from '@components/common/Pagination';
import { ActionButton } from '@components/common/ui';
import MyPageListEmpty from '@components/mypage/MyPageListEmpty';
import MyPageListError from '@components/mypage/MyPageListError';
import MyPageListItem from '@components/mypage/MyPageListItem';
import MyPageListPriceActions from '@components/mypage/MyPageListPriceActions';
import MyPageListSectionLayout from '@components/mypage/MyPageListSectionLayout';
import MyPageMobileCard from '@components/mypage/MyPageMobileCard';
import MyPageReviewListItem from '@components/mypage/MyPageReviewListItem';
import MyPageStatusBadge from '@components/mypage/MyPageStatusBadge';
import MyPageListSkeleton from '@components/skeleton/MyPageListSkeleton';
import StarRatingDisplay from '@components/review/StarRatingDisplay';
import { useAuth } from '@hooks/useAuth';
import { useMyReviews, useWritableReviews } from '@hooks/useReview';
import { formatDate, toast } from '@utils/common';
import { getServiceTradeDetailPath } from '@/routes/myPageRoutes';

const PAGE_SIZE = 10;

const TAB = {
  WRITABLE: 'writable',
  WRITTEN: 'written',
  RECEIVED: 'received',
};

const unwrapData = (response) => response?.data ?? response;

/**
 * 담당자 7 · F-PROV-009/F-COM-007~008: 제공자 시점의 서비스 리뷰 화면입니다.
 * 작성 가능·작성 완료·받은 리뷰를 일반 마이페이지와 같은 공통 목록 구조로 표시합니다.
 */
export default function ProviderReceivedReviewSection() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => (
    location.state?.justWrote || location.state?.justUpdated ? TAB.WRITTEN : TAB.WRITABLE
  ));
  const [writablePage, setWritablePage] = useState(1);
  const [writtenPage, setWrittenPage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const providerUserSn = Number(user?.id);
  const canLoadReceivedReviews = Number.isSafeInteger(providerUserSn) && providerUserSn > 0;
  const writableQuery = useWritableReviews();
  const myReviewsQuery = useMyReviews();
  const receivedQuery = useQuery({
    queryKey: ['reviews', 'received', providerUserSn, 'service', receivedPage - 1, PAGE_SIZE],
    queryFn: () => getUserReviews(providerUserSn, {
      dealType: 'service',
      page: receivedPage - 1,
      size: PAGE_SIZE,
    }).then(unwrapData),
    enabled: canLoadReceivedReviews,
  });

  const writableItems = useMemo(() => (
    (writableQuery.data ?? [])
      .filter((item) => item.dealType === 'service')
      .map((item) => ({ ...item, thumbnail: toImageUrl(item.thumbnail) }))
  ), [writableQuery.data]);
  const writtenItems = useMemo(() => (
    (myReviewsQuery.data ?? [])
      .filter((item) => item.dealType === 'service')
      .map((item) => ({ ...item, thumbnail: toImageUrl(item.photos?.[0]) }))
  ), [myReviewsQuery.data]);
  const receivedItems = receivedQuery.data?.content ?? [];
  const receivedTotalCount = Number(receivedQuery.data?.totalCount ?? 0);
  const receivedTotalPages = Math.max(1, Math.ceil(receivedTotalCount / PAGE_SIZE));

  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();
  const filteredWritableItems = useMemo(() => writableItems.filter((item) => (
    !normalizedSearchKeyword
      || String(item.title ?? '').toLowerCase().includes(normalizedSearchKeyword)
      || String(item.partyName ?? '').toLowerCase().includes(normalizedSearchKeyword)
  )), [normalizedSearchKeyword, writableItems]);
  const filteredWrittenItems = useMemo(() => writtenItems.filter((item) => (
    !normalizedSearchKeyword
      || String(item.title ?? '').toLowerCase().includes(normalizedSearchKeyword)
      || String(item.partyName ?? '').toLowerCase().includes(normalizedSearchKeyword)
      || String(item.content ?? '').toLowerCase().includes(normalizedSearchKeyword)
  )), [normalizedSearchKeyword, writtenItems]);

  const writableTotalPages = Math.max(1, Math.ceil(filteredWritableItems.length / PAGE_SIZE));
  const writtenTotalPages = Math.max(1, Math.ceil(filteredWrittenItems.length / PAGE_SIZE));
  const pagedWritableItems = useMemo(() => filteredWritableItems.slice(
    (writablePage - 1) * PAGE_SIZE,
    writablePage * PAGE_SIZE,
  ), [filteredWritableItems, writablePage]);
  const pagedWrittenItems = useMemo(() => filteredWrittenItems.slice(
    (writtenPage - 1) * PAGE_SIZE,
    writtenPage * PAGE_SIZE,
  ), [filteredWrittenItems, writtenPage]);

  useEffect(() => {
    const { justWrote, justUpdated } = location.state ?? {};
    if (justWrote) {
      toast({ icon: 'success', title: '작성한 리뷰 목록에 추가되었습니다.' });
    } else if (justUpdated) {
      toast({ icon: 'success', title: '리뷰가 수정되었습니다.' });
    }
    if (justWrote || justUpdated) {
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
    // 일반 마이페이지와 동일하게 최초 진입 시 전달된 완료 상태만 한 번 소비합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!receivedQuery.isSuccess || receivedPage <= receivedTotalPages) return undefined;

    const animationFrameId = window.requestAnimationFrame(() => setReceivedPage(receivedTotalPages));
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [receivedPage, receivedQuery.isSuccess, receivedTotalPages]);

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setWritablePage(1);
    setWrittenPage(1);
    setReceivedPage(1);
    setSearchKeyword('');
  };

  const handleSearch = (keyword) => {
    setSearchKeyword(keyword);
    setWritablePage(1);
    setWrittenPage(1);
  };

  const openServiceTrade = (item, reviewMode = null) => {
    const tradeId = Number(item.tradeId ?? item.id);
    if (!Number.isSafeInteger(tradeId) || tradeId <= 0) {
      toast({ icon: 'error', title: '서비스 거래 상세로 이동할 수 없습니다.' });
      return;
    }

    const search = reviewMode ? `?review=${reviewMode}` : '';
    navigate(`${getServiceTradeDetailPath(tradeId)}${search}`, {
      state: { from: location.pathname + location.search },
    });
  };

  const tabs = [
    { value: TAB.WRITABLE, label: '작성 가능', count: writableItems.length },
    { value: TAB.WRITTEN, label: '작성 완료', count: writtenItems.length },
    { value: TAB.RECEIVED, label: '받은 리뷰', count: receivedTotalCount },
  ];
  const activeQuery = activeTab === TAB.WRITABLE
    ? writableQuery
    : activeTab === TAB.WRITTEN
      ? myReviewsQuery
      : receivedQuery;
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  return (
    <>
      <MyPageListSectionLayout
        title="리뷰"
        summaryItems={[
          { label: '작성 가능', value: writableItems.length },
          { label: '작성 완료', value: writtenItems.length },
          { label: '받은 리뷰', value: receivedTotalCount },
        ]}
        filterItems={tabs}
        activeFilter={activeTab}
        onFilterChange={handleTabChange}
        filterAriaLabel="제공자 서비스 리뷰 탭"
        onSearch={activeTab === TAB.RECEIVED ? undefined : handleSearch}
        searchAriaLabel="서비스 리뷰 검색"
        searchPlaceholder="견적 요청·거래 상대방 검색"
        isLoading={isLoading}
      />

      <div className="flex flex-col gap-5">
        {isLoading && <MyPageListSkeleton count={3} />}

        {!isLoading && isError && (
          <MyPageListError message="리뷰 목록을 불러오지 못했습니다." onRetry={() => activeQuery.refetch()} />
        )}

        {!isLoading && !isError && activeTab === TAB.WRITABLE && (
          <>
            {filteredWritableItems.length === 0 ? (
              <MyPageListEmpty message="아직 작성 가능한 서비스 리뷰가 없습니다." />
            ) : (
              <div className="flex flex-col gap-3">
                {pagedWritableItems.map((item) => (
                  <MyPageReviewListItem
                    key={item.id}
                    variant="writable"
                    thumbnail={item.thumbnail}
                    title={item.title}
                    dealType="service"
                    partyLabel={item.partyLabel}
                    partyName={item.partyName}
                    completedDate={item.completedDate}
                    reviewDeadline={item.reviewDeadline}
                    onViewTarget={() => openServiceTrade(item, 'new')}
                  />
                ))}
              </div>
            )}
            <Pagination
              page={writablePage}
              totalPages={writableTotalPages}
              onPageChange={setWritablePage}
              showSinglePage
            />
          </>
        )}

        {!isLoading && !isError && activeTab === TAB.WRITTEN && (
          <>
            {filteredWrittenItems.length === 0 ? (
              <MyPageListEmpty message="아직 작성한 서비스 리뷰가 없습니다." />
            ) : (
              <div className="flex flex-col gap-3">
                {pagedWrittenItems.map((item) => (
                  <MyPageReviewListItem
                    key={item.id}
                    variant="written"
                    thumbnail={item.thumbnail}
                    title={item.title}
                    dealType="service"
                    rating={item.rating}
                    content={item.content}
                    completedDate={item.completedDate}
                    onViewTarget={() => openServiceTrade(item)}
                  />
                ))}
              </div>
            )}
            <Pagination
              page={writtenPage}
              totalPages={writtenTotalPages}
              onPageChange={setWrittenPage}
              showSinglePage
            />
          </>
        )}

        {!isLoading && !isError && activeTab === TAB.RECEIVED && (
          <>
            {receivedItems.length === 0 ? (
              <MyPageListEmpty message="아직 받은 서비스 리뷰가 없습니다." />
            ) : (
              <div className="flex flex-col gap-3">
                {receivedItems.map((review) => (
                  <div key={review.reviewId}>
                    {/* ── 모바일: 풀사이즈 카드 ─────────────────────── */}
                    <div className="sm:hidden">
                      <MyPageMobileCard
                        imageAlt={review.productTitle || '서비스 리뷰'}
                        imageFallbackLabel="서비스 리뷰"
                        badge={<MyPageStatusBadge className="badge-teal">받은 리뷰</MyPageStatusBadge>}
                        title={review.productTitle || '서비스 거래'}
                        footerLeft={`작성일 ${formatDate(review.createdDate)}`}
                        actionButton={(
                          <ActionButton onClick={() => openServiceTrade(review)}>
                            거래 상세
                          </ActionButton>
                        )}
                      />
                    </div>
                    {/* ── 데스크톱: 기존 가로 행 레이아웃 ─────────── */}
                    <div className="hidden sm:block">
                      <MyPageListItem
                        imageAlt={review.productTitle || '서비스 리뷰'}
                        imageFallback="서비스 리뷰"
                        badge={<MyPageStatusBadge className="badge-teal">받은 리뷰</MyPageStatusBadge>}
                        title={review.productTitle || '서비스 거래'}
                        actions={(
                          <MyPageListPriceActions topLine={`작성일 ${formatDate(review.createdDate)}`}>
                            <ActionButton onClick={() => openServiceTrade(review)}>
                              거래 상세
                            </ActionButton>
                          </MyPageListPriceActions>
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <StarRatingDisplay rating={review.rating} size={17} />
                          <p className="truncate">{review.content || '작성된 리뷰 내용이 없습니다.'}</p>
                        </div>
                        <p><strong>서비스 이용자</strong> {review.reviewerName || '회원'}</p>
                      </MyPageListItem>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination
              maxVisiblePages={5}
              page={receivedPage}
              totalPages={receivedTotalPages}
              onPageChange={setReceivedPage}
              showSinglePage
            />
          </>
        )}
      </div>
    </>
  );
}
