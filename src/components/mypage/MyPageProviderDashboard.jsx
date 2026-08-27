import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getUserReviews } from '@api/reviewApi';
import { getMyServiceTrades } from '@api/serviceTradeApi';
import { useMyProviderProfile } from '@hooks/useProviderProfile';
import { usePointBalance } from '@hooks/usePoint';
import { useMyQuoteSummary } from '@hooks/useQuote';
import { getMyPagePath } from '@/routes/myPageRoutes';
import { assets } from '@components/mypage/assets';
import MyPageContentHeader from "@components/mypage/MyPageContentHeader";
import {
  MyPageDashboardSummaryCards,
  MyPageDashboardTop,
} from '@components/mypage/MyPageDashboardCommon';
import ProviderApprovedCategorySection from '@components/mypage/ProviderApprovedCategorySection';

const PROVIDER_ROLE = 'PROVIDER';
const SERVICE_IN_PROGRESS = 'TRDC0003';
const SERVICE_WAITING_CONFIRMATION = 'TRDC0005';
const SERVICE_COMPLETED = 'TRDC0006';
const SUB_BUTTON_CLASS_NAME = 'text-white/70 hover:text-white underline underline-offset-2 transition-colors';

export default function MyPageProviderDashboard({ user, onLogout, onSwitchToGeneral, onOpenSection }) {
  const navigate = useNavigate();
  const profileQuery = useMyProviderProfile();
  const pointBalanceQuery = usePointBalance();
  const quoteSummaryQuery = useMyQuoteSummary();
  // 담당자 7 · F-PROV-009: 서비스 거래 목록과 같은 계약으로 대시보드 상태별 건수를 표시합니다.
  const inProgressServiceTradesQuery = useQuery({
    queryKey: ['my-service-trades', PROVIDER_ROLE, SERVICE_IN_PROGRESS, '', 1, 1],
    queryFn: () => getMyServiceTrades({
      role: PROVIDER_ROLE,
      status: SERVICE_IN_PROGRESS,
      page: 1,
      size: 1,
    }),
    staleTime: 30 * 1000,
  });
  const waitingConfirmationServiceTradesQuery = useQuery({
    queryKey: ['my-service-trades', PROVIDER_ROLE, SERVICE_WAITING_CONFIRMATION, '', 1, 1],
    queryFn: () => getMyServiceTrades({
      role: PROVIDER_ROLE,
      status: SERVICE_WAITING_CONFIRMATION,
      page: 1,
      size: 1,
    }),
    staleTime: 30 * 1000,
  });
  const completedServiceTradesQuery = useQuery({
    queryKey: ['my-service-trades', PROVIDER_ROLE, SERVICE_COMPLETED, '', 1, 1],
    queryFn: () => getMyServiceTrades({
      role: PROVIDER_ROLE,
      status: SERVICE_COMPLETED,
      page: 1,
      size: 1,
    }),
    staleTime: 30 * 1000,
  });
  const serviceTradeQueries = [
    inProgressServiceTradesQuery,
    waitingConfirmationServiceTradesQuery,
    completedServiceTradesQuery,
  ];
  const profile = profileQuery.data;
  const providerUserSn = Number(profile?.userSn);
  const receivedReviewsQuery = useQuery({
    queryKey: ['reviews', 'received', providerUserSn, 'service', 0, 3],
    queryFn: () => getUserReviews(providerUserSn, {
      dealType: 'service',
      page: 0,
      size: 3,
    }).then((response) => response?.data ?? response),
    enabled: Number.isSafeInteger(providerUserSn) && providerUserSn > 0,
  });
  const pointBalance = pointBalanceQuery.data;
  const receivedReviews = receivedReviewsQuery.data?.content ?? [];
  const nickname = user?.nickname || '제공자';
  const openSection = (section) => onOpenSection?.(section);
  const openQuoteTab = (tab) => (event) => {
    event.stopPropagation();
    const searchParams = new URLSearchParams({ tab });
    navigate(`${getMyPagePath('quote')}?${searchParams.toString()}`);
  };
  const openServiceTradeStatus = (status) => (event) => {
    event.stopPropagation();
    const searchParams = new URLSearchParams({ status });
    navigate(`${getMyPagePath('service-trade')}?${searchParams.toString()}`);
  };

  return (
    <div className="space-y-5">
      <MyPageContentHeader title="MY 홈" />
      {/* 담당자 7 · F-PROV-009: 일반회원 MY 홈과 같은 프로필 1칸 + 요약 3칸 배치를 사용합니다. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4 lg:items-stretch">
        <MyPageDashboardTop
          className="lg:col-span-1"
          profileImageUrl={profile?.profileImageUrl || user?.profileImageUrl}
          nickname={nickname}
          email={user?.email || ''}
          profilePath={getMyPagePath('profile')}
          actions={[
            {
              key: 'logout',
              label: '로그아웃',
              icon: assets.iconLogout,
              onClick: onLogout,
            },
            {
              key: 'general-switch',
              label: '일반 모드 전환',
              icon: assets.iconSwitch1,
              iconClassName: 'size-[10px]',
              onClick: onSwitchToGeneral,
            },
          ]}
        />

        <MyPageDashboardSummaryCards
          className="lg:col-span-3"
          columns={3}
          ariaLabel="제공자 요약"
          items={[
            {
              key: 'point',
              color: '#776bf8',
              icon: assets.iconPoint,
              label: '포인트 잔액',
              value: pointBalanceQuery.isLoading
                ? '…'
                : pointBalanceQuery.isError
                  ? '—'
                  : formatNumber(pointBalance?.total),
              unit: 'P',
              meta: pointBalanceQuery.isLoading
                ? '포인트를 불러오는 중입니다.'
                : pointBalanceQuery.isError
                  ? '포인트 잔액을 불러오지 못했습니다.'
                  : `거래가능 ${formatNumber(pointBalance?.available)}P ㅣ 홀딩 ${formatNumber(pointBalance?.hold)}P`,
              onMore: () => openSection('wallet'),
            },
            {
              key: 'quote',
              color: '#3B4DE3',
              icon: assets.iconAction,
              label: '견적 현황',
              value: quoteSummaryQuery.isLoading
                ? '…'
                : quoteSummaryQuery.isError
                  ? '—'
                  : `${formatNumber(quoteSummaryQuery.data?.totalQuoteCount)}건`,
              meta: quoteSummaryQuery.isLoading
                ? '견적 현황을 불러오는 중입니다.'
                : quoteSummaryQuery.isError
                  ? '견적 현황을 불러오지 못했습니다.'
                  : (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <button type="button" onClick={openQuoteTab('waiting')} className={SUB_BUTTON_CLASS_NAME}>
                        대기중 {formatNumber(quoteSummaryQuery.data?.activeQuoteCount)}건
                      </button>
                      <span className="text-white/70">ㅣ</span>
                      <button type="button" onClick={openQuoteTab('in-progress')} className={SUB_BUTTON_CLASS_NAME}>
                        진행중 {formatNumber(quoteSummaryQuery.data?.selectedQuoteCount)}건
                      </button>
                      <span className="text-white/70">ㅣ</span>
                      <button type="button" onClick={openQuoteTab('ended')} className={SUB_BUTTON_CLASS_NAME}>
                        종료 {formatNumber(quoteSummaryQuery.data?.endedQuoteCount)}건
                      </button>
                    </span>
                  ),
              onMore: () => openSection('quote'),
            },
            {
              key: 'service',
              color: '#0CB8BB',
              icon: assets.iconService,
              label: '견적 진행 내역',
              value: serviceCountValue(serviceTradeQueries),
              meta: serviceTradeQueries.some((query) => query.isLoading)
                ? '견적 진행 내역을 불러오는 중입니다.'
                : serviceTradeQueries.some((query) => query.isError)
                  ? '견적 진행 내역을 불러오지 못했습니다.'
                  : (
                    <span className="-mx-2 flex min-w-0 flex-nowrap items-center gap-x-1 whitespace-nowrap">
                      <button type="button" onClick={openServiceTradeStatus(SERVICE_IN_PROGRESS)} className={SUB_BUTTON_CLASS_NAME}>
                        진행 중 {formatServiceCount(inProgressServiceTradesQuery)}건
                      </button>
                      <span className="text-white/70">ㅣ</span>
                      <button type="button" onClick={openServiceTradeStatus(SERVICE_WAITING_CONFIRMATION)} className={SUB_BUTTON_CLASS_NAME}>
                        완료 확인 {formatServiceCount(waitingConfirmationServiceTradesQuery)}건
                      </button>
                      <span className="text-white/70">ㅣ</span>
                      <button type="button" onClick={openServiceTradeStatus(SERVICE_COMPLETED)} className={SUB_BUTTON_CLASS_NAME}>
                        거래 완료 {formatServiceCount(completedServiceTradesQuery)}건
                      </button>
                    </span>
                  ),
              onMore: () => openSection('service-trade'),
            },
          ]}
        />
      </div>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3" aria-label="제공자 권한과 리뷰">
        <ProviderApprovedCategorySection />

        <article className="min-h-72 rounded-[15px] border border-[#e3e8f0] bg-white p-6 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#1f2937]">받은 리뷰</h2>
            {!receivedReviewsQuery.isLoading && !receivedReviewsQuery.isError && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#637085]">
                  {receivedReviewsQuery.data?.totalCount ?? 0}건
                </span>
                {(receivedReviewsQuery.data?.totalCount ?? 0) > 0 && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-[#0064ff] hover:underline"
                    onClick={() => openSection('received-review')}
                  >
                    전체보기
                  </button>
                )}
              </div>
            )}
          </div>
          <ReceivedReviewContent
            isLoading={profileQuery.isLoading || receivedReviewsQuery.isLoading}
            isError={profileQuery.isError || receivedReviewsQuery.isError}
            reviews={receivedReviews}
            onRetry={() => {
              if (profileQuery.isError) {
                profileQuery.refetch();
              } else {
                receivedReviewsQuery.refetch();
              }
            }}
          />
        </article>
      </section>
    </div>
  );
}

function ReceivedReviewContent({ isLoading, isError, reviews, onRetry }) {
  if (isLoading) {
    return (
      <div className="mt-6 space-y-3 border-t border-dashed border-[#dce3ec] pt-5" aria-label="받은 리뷰를 불러오는 중">
        {[1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-xl bg-[#f3f6fa]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-6 border-t border-dashed border-[#dce3ec] pt-5">
        <p className="text-sm leading-6 text-[#b42318]">받은 리뷰를 불러오지 못했습니다.</p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-[#0064ff] hover:underline"
          onClick={onRetry}
        >
          다시 불러오기
        </button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="mt-6 border-t border-dashed border-[#dce3ec] pt-5">
        <p className="text-sm leading-6 text-[#6b7788]">아직 받은 서비스 리뷰가 없습니다.</p>
      </div>
    );
  }

  return (
    <ul className="mt-5 divide-y divide-[#edf0f4] border-t border-dashed border-[#dce3ec]">
      {reviews.map((review) => (
        <li key={review.reviewId} className="py-4 first:pt-5">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-[#f59e0b]" aria-label={`평점 ${review.rating}점`}>
              ★ {review.rating}
            </strong>
            <span className="text-xs text-[#8a96a8]">{review.createdDate}</span>
          </div>
          {review.productTitle && (
            <p className="mt-2 truncate text-xs font-semibold text-[#637085]">
              {review.productTitle}
            </p>
          )}
          <p className="mt-1 break-words text-sm leading-6 text-[#27364b]">{review.content}</p>
          <p className="mt-2 text-xs text-[#8a96a8]">{review.reviewerName}</p>
        </li>
      ))}
    </ul>
  );
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR');
}

function formatServiceCount(query) {
  return formatNumber(query.data?.totalCount);
}

function serviceCountValue(queries) {
  if (queries.some((query) => query.isLoading)) return '…';
  if (queries.some((query) => query.isError)) return '—';

  const totalCount = queries.reduce(
    (sum, query) => sum + Number(query.data?.totalCount ?? 0),
    0,
  );
  return `${formatNumber(totalCount)}건`;
}
