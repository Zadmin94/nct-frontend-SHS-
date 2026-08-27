// src/pages/user/notification/NotificationPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';

import NotificationDetailModal from './components/NotificationDetailModal';
import NotificationItem from './components/NotificationItem';
import PrevNextPagination from '../point/components/PrevNextPagination';
import { useMarkAllRead, useMarkRead, useNotifications } from '../../../hooks/useNotification';
import relativeTime from '../../../utils/relativeTime';
import CardGroupSkeleton from '@components/skeleton/CardGroupSkeleton';

// 도메인 정의 단일표 (목업 20_notification.html 기준) — DB 코드(NTFG03)·그룹 라벨·필터명을
// 한 곳에 정의하고 나머지 형태는 전부 여기서 파생시킨다. 네 벌로 나눠 적으면 도메인 하나
// 추가할 때 네 곳을 고쳐야 해서 정합성이 깨지기 쉬웠다 (2026-07-20 통합).
// 코드값 기준 매핑이라 DB 한글명(CMM_NM) 표기가 바뀌어도 그룹핑이 깨지지 않는다.
// 채팅(NTFC0014)은 팀 결정(2026-07-17)으로 추가 — 알림 발행은 채팅 기능 담당자 구현 후 표시됨
const DOMAIN_DEFS = [
  { code: 'NTFC0010', label: '경매·입찰', filter: '경매' },
  { code: 'NTFC0011', label: '거래·배송', filter: '거래' },
  { code: 'NTFC0014', label: '채팅', filter: '채팅' },
  { code: 'NTFC0012', label: '서비스', filter: '서비스' },
  { code: 'NTFC0013', label: '운영·환전', filter: '운영' },
];
const DOMAINS = DOMAIN_DEFS.map((d) => d.label);
const FILTERS = ['전체', ...DOMAIN_DEFS.map((d) => d.filter)];
const FILTER_TO_DOMAIN = Object.fromEntries(DOMAIN_DEFS.map((d) => [d.filter, d.label]));
const DOMAIN_TO_FILTER = Object.fromEntries(DOMAIN_DEFS.map((d) => [d.label, d.filter]));
const DOMAIN_CODE_TO_LABEL = Object.fromEntries(DOMAIN_DEFS.map((d) => [d.code, d.label]));

// 도메인 카드 미리보기 상한 — 넘으면 "+N건 더 보기"로 해당 도메인 탭(전체 목록+페이지네이션)으로 보낸다.
// 목록 페이지네이션은 다른 전체보기 화면(포인트 내역 등)과 같은 10건 기준 (2026-07-30)
const CARD_PREVIEW_LIMIT = 5;
const LIST_PAGE_SIZE = 10;

// 미읽음 알림을 먼저 보여주는 정렬 — 카드 미리보기(CARD_PREVIEW_LIMIT)에서 오래된 미읽음 알림이
// 최신 읽음 알림에 밀려 아예 안 보이는 일이 없도록 한다. Array.sort는 안정 정렬이라 같은
// 읽음여부 안에서는 원래(최신순) 순서가 유지된다 (2026-07-30)
const sortUnreadFirst = (list) => [...list].sort((a, b) => Number(a.read) - Number(b.read));

// 일반/제공자 구분 필터 (F-COM-011, 팀 결정 2026-07-17)
// "내가 소비자로서 받은 알림(일반)"과 "내가 서비스 제공자로서 받은 업무 알림(제공자)"을 나눈다
// 코드값(NTFG04) 기준: NTFC0015=일반, NTFC0016=제공자
const AUDIENCE_FILTERS = ['전체', '일반', '제공자'];
const AUDIENCE_TO_CODE = { 일반: 'NTFC0015', 제공자: 'NTFC0016' };

/** 서버 응답 알림 → 화면 표시용 형태로 변환 */
const toViewItem = (n) => ({
  id: n.id,
  domain: DOMAIN_CODE_TO_LABEL[n.domainCd] ?? n.domain, // 미지정 코드는 서버 한글명 그대로
  type: n.type,                                          // 유형 한글명 (배지 표시)
  audienceCd: n.audienceCd,                              // 일반/제공자 필터 기준 (F-COM-011)
  title: n.title,
  content: n.content,                                    // 상세 팝업 본문
  time: relativeTime(n.regDt),                           // "방금 전 / N분 전" 상대 표기
  ref: n.refSn != null ? '관련 링크' : null,             // 목록의 작은 배지 표시용
  refTypeCd: n.refTypeCd,                                // 상세 팝업의 "이동" 버튼 경로 계산용
  refSn: n.refSn,
  evtCd: n.evtCd,                                        // REFC0002 등 같은 참조유형을 공유하는 이벤트 구분용 (담당자2 확인, 2026-08-18)
  read: n.read,
});

/**
 * 알림함 (목업 20_notification.html, F-UX-064/065)
 * - GET /api/notification + PATCH read/read-all 연동 (useNotification 훅)
 * - 읽음 처리는 서버 반영 후 목록 재조회(invalidate)로 갱신 — 새로고침해도 상태 유지
 */
const NotificationPage = () => {
  const [filter, setFilter] = useState('전체');
  // 일반/제공자 구분 필터 (F-COM-011) — 도메인 필터와 독립적으로 겹쳐 적용된다
  const [audienceFilter, setAudienceFilter] = useState('전체');
  // 상세 팝업에 띄울 알림 — null이면 팝업 닫힌 상태
  const [selectedItem, setSelectedItem] = useState(null);
  // 도메인 탭으로 들어간 전체 목록의 현재 페이지 — 필터가 바뀌면 1페이지로 되돌린다 (2026-07-30)
  const [page, setPage] = useState(1);

  const { data: notifications = [], isLoading } = useNotifications();
  const markReadMutation = useMarkRead();
  const markAllReadMutation = useMarkAllRead();

  // 대상 구분 필터를 먼저 적용 — 이후 도메인 그룹핑은 걸러진 목록 기준
  const items = notifications
    .map(toViewItem)
    .filter((n) => audienceFilter === '전체' || n.audienceCd === AUDIENCE_TO_CODE[audienceFilter]);
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => markAllReadMutation.mutate();
  // 알림 클릭 — 읽음 처리와 상세 팝업 노출을 함께 한다
  const openItem = (item) => {
    markReadMutation.mutate(item.id);
    setSelectedItem(item);
  };

  // 도메인 탭으로 들어간 단일 도메인 전체 목록 — 필터가 '전체'가 아닐 때만 쓴다
  // ('전체' 화면의 도메인 카드는 아래 렌더에서 DOMAINS를 직접 돌므로 중간 배열이 필요 없다)
  const focusedDomain = filter === '전체' ? null : FILTER_TO_DOMAIN[filter];
  const focusedItems = focusedDomain ? items.filter((n) => n.domain === focusedDomain) : [];
  const focusedPageCount = Math.max(1, Math.ceil(focusedItems.length / LIST_PAGE_SIZE));
  const currentPage = Math.min(page, focusedPageCount);
  const pagedFocusedItems = focusedItems.slice(
    (currentPage - 1) * LIST_PAGE_SIZE,
    currentPage * LIST_PAGE_SIZE,
  );

  const changeAudienceFilter = (nextFilter) => {
    setAudienceFilter(nextFilter);
    setPage(1);
  };

  const changeDomainFilter = (nextFilter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  return (
    <div className="container" style={{ paddingTop: '25px', paddingBottom: '25px' }}>
      {/* 타이틀 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 m-0">알림</h1>
        <p className="text-gray-500 mt-1.5 mb-0">읽지 않은 알림 {unreadCount}개</p>
      </div>

      {/* 일반/제공자 구분 필터 (F-COM-011) — 도메인 탭과 겹쳐서 적용된다 */}
      <div className="flex gap-2 mb-3">
        {AUDIENCE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => changeAudienceFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors
              ${audienceFilter === f
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 필터 탭 + 전체 읽음 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => changeDomainFilter(f)}
              className={`rounded-lg px-3.5 py-2 text-sm border transition-colors
                ${filter === f
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={markAllRead}
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            전체 읽음
          </button>
        </div>
      </div>

      {/* 도메인별 그룹 카드 — '전체'일 때는 도메인마다 최근 5건(미읽음 우선)만 미리보고,
          "+N건 더 보기"나 위 도메인 탭을 누르면 그 도메인 전체를 10건씩 페이지로 보여준다.
          카드 하나에 알림이 몰려도(예: 운영·환전) 다른 도메인 카드까지 한눈에 보이게 하기 위함
          (2026-07-30, 알림이 많은 도메인 카드만 세로로 훅 길어지는 문제 개선) */}
      {isLoading ? (
        <CardGroupSkeleton cardsPerGroup={2} groups={4} />
      ) : filter === '전체' ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          {DOMAINS.map((domain) => {
            const domainItems = items.filter((n) => n.domain === domain);
            const overflowCount = domainItems.length - CARD_PREVIEW_LIMIT;
            const previewItems = overflowCount > 0
              ? sortUnreadFirst(domainItems).slice(0, CARD_PREVIEW_LIMIT)
              : domainItems;
            return (
              <div
                key={domain}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]"
              >
                <h3 className="text-base font-bold text-gray-900 mt-0 mb-3">{domain}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {previewItems.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6 m-0">알림이 없습니다.</p>
                  )}
                  {previewItems.map((item) => (
                    <NotificationItem key={item.id} item={item} onClick={openItem} />
                  ))}
                </div>
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={() => changeDomainFilter(DOMAIN_TO_FILTER[domain])}
                    className="mt-3 text-sm font-medium text-blue-600 hover:underline"
                  >
                    + {overflowCount}건 더 보기
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)] mt-5">
          <h3 className="text-base font-bold text-gray-900 mt-0 mb-3">{focusedDomain} · 총 {focusedItems.length}건</h3>
          <div className="grid grid-cols-1 gap-3">
            {pagedFocusedItems.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6 m-0">알림이 없습니다.</p>
            )}
            {pagedFocusedItems.map((item) => (
              <NotificationItem key={item.id} item={item} onClick={openItem} />
            ))}
          </div>
          {/* 포인트 테이블과 공용하는 "이전/다음" 페이지네이션 (2026-08-05 중복 통합) */}
          {focusedItems.length > LIST_PAGE_SIZE && (
            <PrevNextPagination page={currentPage} pageCount={focusedPageCount} onPageChange={setPage} className="mt-4" />
          )}
        </section>
      )}

      <NotificationDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
};

export default NotificationPage;
