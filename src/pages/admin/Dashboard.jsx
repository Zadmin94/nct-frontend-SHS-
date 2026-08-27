import { createElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  BriefcaseBusiness,
  ClipboardCheck,
  Gavel,
  Grid2X2,
  Handshake,
  Megaphone,
  RefreshCw,
  Settings,
  ShieldAlert,
  Siren,
  Users,
  WalletCards,
} from 'lucide-react';
import { fetchAdminAuctions } from '@api/adminAuctionApi';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import PageMeta from '@components/admin/PageMeta';
import { useAdminDashboardSummary } from '@hooks/useAdminDashboard';
import {
  ADMIN_OPERATIONS_RECORDS_PATH,
  ADMIN_PROVIDER_APPLICATIONS_PATH,
  ADMIN_SERVICE_REQUESTS_PATH,
  ADMIN_SETTINGS_PATH,
} from '@/routes/adminRoutes';
import './Dashboard.css';

const SUMMARY_ITEMS = [
  {
    key: 'activeUserCount',
    label: '활성 사용자',
    description: '현재 이용 가능한 회원',
    icon: Users,
    tone: 'blue',
    unit: '명',
  },
  {
    key: 'totalTradeCount',
    label: '전체 거래',
    description: '생성된 거래 누적 건수',
    icon: Handshake,
    tone: 'indigo',
  },
  {
    key: 'activeDisputeCount',
    label: '활성 분쟁',
    description: '접수·처리 중인 거래 분쟁',
    icon: Siren,
    tone: 'red',
  },
  {
    key: 'incompleteSettlementCount',
    label: '미완료 정산',
    description: '대기·보류 상태의 정산',
    icon: ClipboardCheck,
    tone: 'orange',
  },
  {
    key: 'pendingAuctionCancellationCount',
    label: '판매자 취소 심사 대기',
    description: '관리자 취소 판정 필요',
    icon: Gavel,
    tone: 'orange',
  },
  {
    key: 'pendingExchangeCount',
    label: '환전 지급 대기',
    description: '관리자 지급 확인 필요',
    icon: WalletCards,
    tone: 'purple',
  },
  {
    key: 'unprocessedRiskEventCount',
    label: '미처리 위험 이벤트',
    description: '운영 확인이 필요한 이벤트',
    icon: ShieldAlert,
    tone: 'red',
  },
];

const SHORTCUTS = [
  { label: '회원 관리', to: '/admin/members', icon: Users },
  { label: '제공자 심사', to: ADMIN_PROVIDER_APPLICATIONS_PATH, icon: ClipboardCheck },
  { label: '경매 관리', to: '/admin/auctions', icon: Gavel },
  { label: '견적 요청 관리', to: ADMIN_SERVICE_REQUESTS_PATH, icon: BriefcaseBusiness },
  { label: '카테고리 관리', to: '/admin/categories', icon: Grid2X2 },
  { label: '정산 관리', to: '/admin/settlements', icon: WalletCards },
  { label: '환전 관리', to: '/admin/exchanges', icon: WalletCards },
  { label: '공지 관리', to: '/admin/notices', icon: Megaphone },
  { label: '신고 관리', to: '/admin/reports', icon: Siren },
  { label: '운영 기록', to: `${ADMIN_OPERATIONS_RECORDS_PATH}?tab=risk`, icon: ShieldAlert },
  { label: '시스템 설정', to: ADMIN_SETTINGS_PATH, icon: Settings },
  { label: '운영 알림', to: '/admin/notifications', icon: Bell },
];

const formatCount = (value) =>
  value == null ? '-' : Number(value).toLocaleString('ko-KR');

/**
 * 담당자 7 · F-OPS-010: 실제 운영 집계와 관리자 메뉴를 보여 주는 대시보드입니다.
 */
const Dashboard = () => {
  const summaryQuery = useAdminDashboardSummary();
  const cancellationReviewQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'auction-cancellation-pending'],
    queryFn: () => fetchAdminAuctions({
      cancellationPending: true,
      page: 1,
      size: 1,
    }),
  });
  const summary = {
    ...(summaryQuery.data ?? {}),
    pendingAuctionCancellationCount: cancellationReviewQuery.data?.totalItems,
  };
  const isSummaryItemLoading = (key) => (
    key === 'pendingAuctionCancellationCount'
      ? cancellationReviewQuery.isLoading
      : summaryQuery.isLoading
  );
  const actionItems = [
    {
      key: 'provider',
      label: '제공자 심사 대기',
      detail: summaryQuery.isLoading
        ? '불러오는 중'
        : summaryQuery.isError
          ? '현황 조회 실패'
          : `심사 대기 ${formatCount(summary.pendingProviderApplicationCount)}건`,
      icon: ClipboardCheck,
      tone: 'blue',
      to: ADMIN_PROVIDER_APPLICATIONS_PATH,
    },
    {
      key: 'report',
      label: '신고 접수 대기',
      detail: summaryQuery.isLoading
        ? '불러오는 중'
        : summaryQuery.isError
          ? '현황 조회 실패'
          : `접수 대기 ${formatCount(summary.pendingReportCount)}건`,
      icon: Siren,
      tone: 'orange',
      to: '/admin/reports',
    },
    {
      key: 'auction-cancellation',
      label: '판매자 취소 심사',
      detail: cancellationReviewQuery.isLoading
        ? '불러오는 중'
        : cancellationReviewQuery.isError
          ? '현황 조회 실패'
          : `처리 대기 ${formatCount(cancellationReviewQuery.data?.totalItems)}건`,
      icon: Gavel,
      tone: 'indigo',
      to: '/admin/auctions',
    },
    {
      key: 'exchange',
      label: '환전 지급 대기',
      detail: summaryQuery.isLoading
        ? '불러오는 중'
        : summaryQuery.isError
          ? '현황 조회 실패'
          : `지급 확인 필요 ${formatCount(summary.pendingExchangeCount)}건`,
      icon: WalletCards,
      tone: 'purple',
      to: '/admin/exchanges',
    },
    {
      key: 'risk',
      label: '미처리 위험 이벤트',
      detail: summaryQuery.isLoading
        ? '불러오는 중'
        : summaryQuery.isError
          ? '현황 조회 실패'
          : `운영 확인 필요 ${formatCount(summary.unprocessedRiskEventCount)}건`,
      icon: ShieldAlert,
      tone: 'red',
      to: `${ADMIN_OPERATIONS_RECORDS_PATH}?tab=risk`,
    },
  ];
  const isRefreshing = summaryQuery.isFetching
    || cancellationReviewQuery.isFetching;
  const refreshDashboard = () => Promise.all([
    summaryQuery.refetch(),
    cancellationReviewQuery.refetch(),
  ]);

  return (
    <div className="admin-dashboard">
      <PageMeta title="관리자 대시보드" />
      <AdminPageHeader
        action={(
          <button
            className="admin-dashboard__refresh"
            disabled={isRefreshing}
            onClick={refreshDashboard}
            type="button"
          >
            <RefreshCw aria-hidden="true" />
            새로고침
          </button>
        )}
        title="관리자 대시보드"
      />

      {summaryQuery.isError ? (
        <section className="admin-dashboard__error" role="alert">
          <div>
            <strong>운영 현황을 불러오지 못했습니다.</strong>
            <span>잠시 후 다시 시도해 주세요.</span>
          </div>
          <button onClick={() => summaryQuery.refetch()} type="button">다시 시도</button>
        </section>
      ) : (
        <section className="admin-dashboard__summary" aria-label="주요 운영 현황">
          {SUMMARY_ITEMS.map(({ key, label, description, icon: Icon, tone, unit = '건' }) => (
            <article className={`admin-summary-card admin-summary-card--${tone}`} key={key}>
              <span className="admin-summary-card__icon">
                {createElement(Icon, { 'aria-hidden': true })}
              </span>
              <div>
                <span>{label}</span>
                {isSummaryItemLoading(key) ? (
                  <span className="admin-summary-card__skeleton" aria-label={`${label} 불러오는 중`} />
                ) : (
                  <strong>
                    {formatCount(summary[key])}
                    {summary[key] != null && <small>{unit}</small>}
                  </strong>
                )}
                <p>{description}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="admin-dashboard__content">
        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel__heading">
            <div>
              <h2>조치 필요 현황</h2>
              <p>현재 확인이 필요한 운영 항목입니다.</p>
            </div>
          </div>

          <div className="admin-dashboard-actions">
            {actionItems.map(({ key, label, detail, icon: Icon, tone, to }) => (
              <div className="admin-dashboard-action" key={key}>
                <span className={`admin-dashboard-action__icon admin-dashboard-action__icon--${tone}`}>
                  {createElement(Icon, { 'aria-hidden': true })}
                </span>
                <div>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </div>
                <Link to={to}>확인</Link>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel__heading">
            <div>
              <h2>운영 바로가기</h2>
              <p>자주 사용하는 관리 화면으로 이동합니다.</p>
            </div>
          </div>

          <div className="admin-dashboard-shortcuts">
            {SHORTCUTS.map(({ label, to, icon: Icon }) => (
              <Link key={to} to={to}>
                {createElement(Icon, { 'aria-hidden': true })}
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
