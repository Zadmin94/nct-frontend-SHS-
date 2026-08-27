// Claude Code 작성 (BJN, 2026-07-19)
// 관리자 알림 화면 (담당자6 BJN, F-COM-004/005 — 목업 03_관리자/20_notification.html 기준)
// - 회원·제공자 / 신고·거래문제 / 경매·서비스 / 환전·시스템, 4개 탭으로 운영 알림을 모아 보여준다
// - 카드 데이터는 각 도메인 테이블을 서버가 읽기 전용으로 집계한 실제 값이다 (더미 아님)
// - linkPath가 있는 카드만 클릭 가능하며, 아직 관리자 화면·계약이 없는 항목은 이동을 막는다
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPagination from '@components/admin/AdminPagination';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import CommonTabs from '@components/common/CommonTabs';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import { useAdminNotificationSummary } from '@hooks/useAdminNotification';
import useClientPagination from '@hooks/useClientPagination';
import './adminNotificationPage.css';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'userProvider', label: '회원·제공자' },
  { key: 'report', label: '신고·거래문제' },
  { key: 'auctionService', label: '경매·서비스' },
  { key: 'exchangeSystem', label: '환전·시스템' },
];

const GROUP_TITLES = {
  userProvider: '회원·제공자',
  report: '신고·거래문제',
  auctionService: '경매·서비스',
  exchangeSystem: '환전·시스템',
};
const PAGE_SIZE = ADMIN_PAGE_SIZE;

const AdminNotificationSkeleton = () => (
  <div className="admin-noti-grid admin-noti-grid--skeleton" aria-label="운영 알림을 불러오는 중">
    {Array.from({ length: 4 }).map((_, groupIndex) => (
      <div className="admin-noti-group" key={groupIndex}>
        <h3><Skeleton height={15} width={96} /></h3>
        <div className="admin-noti-list">
          {Array.from({ length: 2 }).map((__, cardIndex) => (
            <div className="admin-noti-card" key={cardIndex}>
              <strong><Skeleton height={13} width="58%" /></strong>
              <p><Skeleton height={13} width="82%" /></p>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const NotificationCard = ({ item }) => {
  const navigate = useNavigate();
  const clickable = Boolean(item.linkPath);
  return (
    <div
      className={`admin-noti-card${clickable ? ' is-clickable' : ''}`}
      onClick={clickable ? () => navigate(item.linkPath) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <strong>{item.title}</strong>
      <p>{item.detail}</p>
    </div>
  );
};

const AdminNotificationPage = () => {
  const [tab, setTab] = useState('all');
  const { data, isLoading, isError } = useAdminNotificationSummary();

  const groups = useMemo(() => (data
    ? [
        { key: 'userProvider', items: data.userProvider },
        { key: 'report', items: data.report },
        { key: 'auctionService', items: data.auctionService },
        { key: 'exchangeSystem', items: data.exchangeSystem },
      ]
    : []), [data]);

  const visibleGroups = tab === 'all' ? groups : groups.filter((g) => g.key === tab);
  const visibleItems = useMemo(
    () => visibleGroups.flatMap((group) => group.items.map((item, index) => ({
      groupKey: group.key,
      item,
      key: `${group.key}-${item.title}-${index}`,
    }))),
    [visibleGroups],
  );
  const {
    page,
    pagedItems,
    resetPage,
    setPage,
    totalItems,
    totalPages,
  } = useClientPagination(visibleItems, PAGE_SIZE);
  const pagedGroups = useMemo(
    () => visibleGroups
      .map((group) => ({
        ...group,
        items: pagedItems.filter((entry) => entry.groupKey === group.key),
      }))
      .filter((group) => group.items.length > 0),
    [pagedItems, visibleGroups],
  );
  const displayGroups = totalItems === 0 ? visibleGroups : pagedGroups;

  return (
    <div className="admin-bjn-page">
      <AdminPageHeader
        title="알림"
      />

      <CommonTabs
        activeValue={tab}
        ariaLabel="관리자 알림 유형"
        className="admin-noti-tabs"
        items={TABS.map((item) => ({ value: item.key, label: item.label }))}
        onChange={(value) => {
          setTab(value);
          resetPage();
        }}
      />

      {isLoading && <AdminNotificationSkeleton />}
      {isError && <div className="admin-bjn-state is-error">알림 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.</div>}

      {!isLoading && !isError && (
        <div className="admin-noti-grid">
          {displayGroups.map((group) => (
            <div className="admin-noti-group" key={group.key}>
              <h3>{GROUP_TITLES[group.key]}</h3>
              {group.items.length === 0 ? (
                <p className="admin-noti-empty">확인할 알림이 없습니다.</p>
              ) : (
                <div className="admin-noti-list">
                  {group.items.map((entry) => (
                    <NotificationCard
                      item={totalItems === 0 ? entry : entry.item}
                      key={totalItems === 0 ? entry.title : entry.key}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!isLoading && !isError && (
        <AdminPagination
          ariaLabel="운영 알림 목록 페이지 이동"
          onPageChange={setPage}
          page={page}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default AdminNotificationPage;
