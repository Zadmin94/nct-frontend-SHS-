// src/pages/user/point/components/PointChargeOrderTable.jsx
// Claude Code 작성 (BJN, 2026-07-16)
import PointTable from './PointTable';
import pointBadge from './pointBadge';

// 충전주문상태(PCOG01)별 배지 색 — 원장 테이블(PointLedgerTable)의 TYPE_BADGE와 같은 방식
const STATUS_BADGE = {
  대기: 'bg-amber-100 text-amber-800',
  완료: 'bg-blue-100 text-blue-800',
  실패: 'bg-red-100 text-red-700',
  취소: 'bg-gray-100 text-gray-600',
};

// 배지 마크업은 네 내역 테이블 공용 렌더러(pointBadge)로 통합 — 여기는 색 매핑만 정의 (2026-08-05)
const badge = pointBadge(STATUS_BADGE);

// 표 배치는 공용 셸(PointTable)이 담당 — 여기는 컬럼 구성과 셀 내용만 정의한다 (2026-07-20 통합)
// widthClass 퍼센트는 원장·환전 내역 표와 같은 열 순서(일시/배지/금액/짧은텍스트/긴텍스트)
// 기준으로 맞춘 값 — 임의로 바꾸면 세 표의 세로 구분선이 어긋난다 (2026-08-04, PointTable.jsx 참고)
const COLUMNS = [
  { key: 'date', header: '일시', widthClass: 'w-[170px]', cellClass: 'truncate text-gray-700', render: (r) => <span title={r.date}>{r.date}</span> },
  { key: 'status', header: '상태', widthClass: 'w-[80px]', cellClass: 'whitespace-nowrap', render: (r) => badge(r.status) },
  {
    key: 'amount', header: '충전금액', align: 'right', widthClass: 'w-auto', cellClass: 'whitespace-nowrap font-medium text-gray-900',
    render: (r) => `${r.amount.toLocaleString()}P`,
  },
  { key: 'payMethod', header: '결제수단', align: 'left', widthClass: 'w-auto', cellClass: 'truncate text-gray-500', render: (r) => r.payMethod ?? '-' },
  {
    key: 'failReason', header: '비고', align: 'left', widthClass: 'w-[250px]', cellClass: 'truncate text-gray-500',
    render: (r) => <span title={r.failReason}>{r.failReason ?? '-'}</span>,
  },
];

// 모바일 카드 한 장 — 배지+날짜 / 금액+결제수단 / 비고 순서로 배치 (2026-08-03)
const renderCard = (r) => (
  <>
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0">{badge(r.status)}</span>
      <span className="min-w-0 truncate text-xs text-gray-400" title={r.date}>{r.date}</span>
    </div>
    <div className="mt-1 flex items-baseline justify-between gap-2">
      <span className="text-base font-bold text-gray-900">{r.amount.toLocaleString()}P</span>
      <span className="text-xs text-gray-400 whitespace-nowrap">{r.payMethod ?? '-'}</span>
    </div>
    {r.failReason && <div className="mt-1 text-[13px] leading-snug text-gray-500">{r.failReason}</div>}
  </>
);

// 완료(PCOC0002)·실패(PCOC0003)만 보여준다. 대기(PCOC0001)는 아직 결과가 안 나온 진행 중 건이라
// 계속 쌓이면 목록만 어지럽히고, 취소(PCOC0004)는 실제로는 별도 사유가 있는 게 아니라 대기가
// 3시간 지나 화면 표시만 바뀐 것(markExpiredForDisplay, DB 상태는 그대로 대기)이라 대기와
// 같이 뺀다. 실패는 카드 거절·내부 처리 오류 등 실제 사유가 있어 "결제는 됐는데 포인트가
// 안 들어왔다" 문의 시 필요해서 남긴다 (사용자 결정, 2026-07-29).
const VISIBLE_STATUS_CODES = new Set(['PCOC0002', 'PCOC0003']);

/**
 * 충전 시도 이력 테이블 (F-PAY-011) — 완료·실패 건만 표시.
 * limit을 주면(마이페이지 요약 카드) 필터링 이후 기준으로 최근 N건만 보여주고 "+"로 전체보기
 * 모달을 띄운다 — limit 없이 부르면(전체보기 모달 안) 전부 보여준다 (2026-07-29).
 */
const PointChargeOrderTable = ({ rows, limit, onExpand, loading, centerAlign = false }) => {
  const visible = rows.filter((r) => VISIBLE_STATUS_CODES.has(r.statusCd));
  return (
    <PointTable
      title="충전 내역"
      columns={COLUMNS}
      rows={limit ? visible.slice(0, limit) : visible}
      emptyText="충전 내역이 없습니다."
      onExpand={limit ? onExpand : undefined}
      pageSize={limit ? undefined : 10}
      loading={loading}
      renderCard={renderCard}
      centerAlign={centerAlign}
    />
  );
};

export default PointChargeOrderTable;
