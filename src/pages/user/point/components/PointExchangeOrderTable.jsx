// src/pages/user/point/components/PointExchangeOrderTable.jsx
// Claude Code 작성 (BJN, 2026-07-17)
import PointTable from './PointTable';
import pointBadge from './pointBadge';

// 환전주문상태(PEOG01)별 배지 색 — 충전 이력 테이블(PointChargeOrderTable)과 같은 방식
const STATUS_BADGE = {
  신청: 'bg-amber-100 text-amber-800',
  완료: 'bg-blue-100 text-blue-800',
  반려: 'bg-red-100 text-red-700',
};

// 배지 마크업은 네 내역 테이블 공용 렌더러(pointBadge)로 통합 — 여기는 색 매핑만 정의 (2026-08-05)
const badge = pointBadge(STATUS_BADGE);

// 표 배치는 공용 셸(PointTable)이 담당 — 여기는 컬럼 구성과 셀 내용만 정의한다 (2026-07-20 통합)
// widthClass 퍼센트는 원장·충전 내역 표와 같은 열 순서(일시/배지/금액/짧은텍스트/긴텍스트)
// 기준으로 맞춘 값 — 임의로 바꾸면 세 표의 세로 구분선이 어긋난다 (2026-08-04, PointTable.jsx 참고)
const COLUMNS = [
  { key: 'date', header: '신청일시', widthClass: 'w-[170px]', cellClass: 'truncate text-gray-700', render: (r) => <span title={r.date}>{r.date}</span> },
  { key: 'status', header: '상태', widthClass: 'w-[80px]', cellClass: 'whitespace-nowrap', render: (r) => badge(r.status) },
  {
    key: 'amount', header: '신청금액', align: 'right', widthClass: 'w-auto', cellClass: 'whitespace-nowrap font-medium text-gray-900',
    render: (r) => `${r.amount.toLocaleString()}P`,
  },
  {
    key: 'account', header: '입금 계좌', align: 'left', widthClass: 'w-auto', cellClass: 'truncate text-gray-500',
    render: (r) => `${r.bankName} ${r.accountNo}`,
  },
  {
    // 반려면 사유, 처리됐으면 처리일, 둘 다 아니면(지급 대기) 안내 문구
    key: 'note', header: '비고', align: 'left', widthClass: 'w-[250px]', cellClass: 'truncate text-gray-500',
    render: (r) => {
      const note = r.rejectReason ?? r.processedDate ?? '며칠 내 지급 예정';
      return <span title={note}>{note}</span>;
    },
  },
];

// 모바일 카드 한 장 — 배지+날짜 / 금액+계좌 / 비고 순서로 배치 (2026-08-03)
const renderCard = (r) => (
  <>
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0">{badge(r.status)}</span>
      <span className="min-w-0 truncate text-xs text-gray-400" title={r.date}>{r.date}</span>
    </div>
    <div className="mt-1 flex items-baseline justify-between gap-2">
      <span className="text-base font-bold text-gray-900">{r.amount.toLocaleString()}P</span>
      <span className="text-xs text-gray-400 whitespace-nowrap">{r.bankName} {r.accountNo}</span>
    </div>
    <div className="mt-1 text-[13px] leading-snug text-gray-500">{r.rejectReason ?? r.processedDate ?? '며칠 내 지급 예정'}</div>
  </>
);

/**
 * 환전 신청 이력 테이블 (F-PAY-012, D-026)
 * - 신청·완료·반려 전 상태를 보여준다. 신청 즉시 포인트가 차감되므로
 *   "신청" 상태 = 차감은 끝났고 관리자 지급(수동 이체)만 남은 상태다
 * - 입금 계좌는 신청 시점 스냅샷 — 신청 후 마이페이지에서 계좌를 바꿔도 여기 표시는 안 바뀐다
 *   ("내가 어디로 받기로 했더라?" 확인용)
 */
// limit을 주면(마이페이지 요약 카드) 최근 N건만 보여주고 "+"로 전체보기 모달을 띄운다.
// limit 없이 부르면(전체보기 모달 안) 전부 보여준다 (2026-07-29).
const PointExchangeOrderTable = ({ rows, limit, onExpand, loading, centerAlign = false }) => (
  <PointTable
    title="환전 내역"
    columns={COLUMNS}
    rows={limit ? rows.slice(0, limit) : rows}
    emptyText="환전 내역이 없습니다."
    onExpand={limit ? onExpand : undefined}
    pageSize={limit ? undefined : 10}
    loading={loading}
    renderCard={renderCard}
    centerAlign={centerAlign}
  />
);

export default PointExchangeOrderTable;
