// src/pages/user/point/components/PointConvertHistoryTable.jsx
// Claude Code 작성 (BJN, 2026-07-30, 정산포인트 내역으로 확장 2026-08-04)
import PointTable from './PointTable';
import pointBadge from './pointBadge';
import { formatPointLedgerReason, reasonSummary } from './pointLedgerReason';

// 원장유형 배지 색 — 포인트 내역 표(PointLedgerTable)의 TYPE_BADGE와 같은 색을 쓴다
const TYPE_BADGE = {
  정산: 'bg-blue-100 text-blue-800',
  전환: 'bg-purple-100 text-purple-800',
};

// 배지 마크업은 네 내역 테이블 공용 렌더러(pointBadge)로 통합 — 여기는 색 매핑만 정의 (2026-08-05)
const badge = pointBadge(TYPE_BADGE);

// 표 배치는 공용 셸(PointTable)이 담당 — 여기는 컬럼 구성과 셀 내용만 정의한다 (2026-07-20 통합 방식과 동일)
// widthClass 퍼센트는 앞 3열(일시/유형/변동금액)만 포인트 내역 표와 맞춰뒀다 — 컬럼 수가 달라
// 뒤쪽까지는 못 맞춘다 (2026-08-04, PointTable.jsx 참고). 이 표엔 항상 정산가능 카테고리만
// 남아서 잔액이 한 트랙으로만 이어진다.
const COLUMNS = [
  { key: 'date', header: '일시', widthClass: 'w-[170px]', cellClass: 'truncate text-gray-700', render: (r) => <span title={r.date}>{r.date}</span> },
  { key: 'type', header: '유형', widthClass: 'w-[80px]', cellClass: 'whitespace-nowrap', render: (r) => badge(r.type) },
  {
    key: 'amount', header: '변동금액', align: 'right', widthClass: 'w-auto',
    cellClass: (r) => `truncate font-medium ${r.amount > 0 ? 'text-blue-700' : 'text-red-700'}`,
    render: (r) => `${r.amount > 0 ? '+' : ''}${r.amount.toLocaleString()}P`,
  },
  {
    key: 'balanceAfter', header: '정산가능 잔액', align: 'right', widthClass: 'w-auto', cellClass: 'truncate text-gray-700',
    render: (r) => <span title={`${r.balanceAfter.toLocaleString()}P`}>{r.balanceAfter.toLocaleString()}P</span>,
  },
  {
    key: 'reason', header: '사유', align: 'left', widthClass: 'w-[250px]', cellClass: 'truncate text-gray-500',
    render: (r) => <span title={formatPointLedgerReason(r.reason)}>{reasonSummary(r.reason)}</span>,
  },
];

// 모바일 카드 한 장 — 배지+날짜 / 금액+정산가능 잔액 / 사유 순서로 배치 (2026-08-03)
const renderCard = (r) => (
  <>
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0">{badge(r.type)}</span>
      <span className="min-w-0 truncate text-xs text-gray-400" title={r.date}>{r.date}</span>
    </div>
    <div className="mt-1 flex items-baseline justify-between gap-2">
      <span className={`text-base font-bold ${r.amount > 0 ? 'text-blue-700' : 'text-red-700'}`}>
        {r.amount > 0 ? '+' : ''}{r.amount.toLocaleString()}P
      </span>
      <span className="max-w-[55%] shrink-0 truncate text-xs text-gray-400">
        잔액 {r.balanceAfter.toLocaleString()}P
      </span>
    </div>
    {r.reason && <div className="mt-1 text-[13px] leading-snug text-gray-500" title={formatPointLedgerReason(r.reason)}>{reasonSummary(r.reason)}</div>}
  </>
);

/**
 * 정산포인트 내역 테이블 (F-PAY-010, F-PAY-043) — 정산가능 카테고리와 관련된 흐름 전부.
 * - 정산 완료로 정산가능 포인트가 들어오는 것(유형 "정산")과, 정산가능→사용가능으로 내보내는
 *   전환(유형 "전환")을 한 표에 모았다(2026-08-04) — 포인트 내역 표는 사용가능 카테고리만
 *   보여주므로, 정산가능 포인트의 입출은 여기가 유일한 창구다.
 * - 전환 1건은 원장에 −(정산가능)/+(사용가능) 두 행으로 남는데, 여기서는 정산가능쪽(−) 행만
 *   써서 "정산가능 잔액이 얼마나 줄었는지" 관점으로 보여준다. 짝이 되는 +행(사용가능쪽)은
 *   포인트 내역 표에서 확인할 수 있다.
 * - "관련" 컬럼을 안 둔 이유: 전환은 참조 자체가 없고(원장에 refType/refSn을 안 남김), 정산은
 *   참조가 있어도 구매자의 입찰이라 판매자 화면에서는 못 찾는다(포인트 내역 표와 같은 사유) —
 *   항상 빈 값일 컬럼을 그대로 두느니 아예 뺐다.
 */
// limit을 주면(마이페이지 요약 카드) 최근 N건만 보여주고 "+"로 전체보기 모달을 띄운다.
// limit 없이 부르면(전체보기 모달 안) 전부 보여준다 (2026-07-29 다른 내역 표와 동일한 방식).
const PointConvertHistoryTable = ({ rows, limit, onExpand, loading, centerAlign = false }) => {
  const settleableRows = rows.filter((r) => r.category === '정산가능');
  const visibleRows = limit ? settleableRows.slice(0, limit) : settleableRows;

  return (
    <PointTable
      title="정산포인트 내역"
      columns={COLUMNS}
      rows={visibleRows}
      emptyText="정산포인트 내역이 없습니다."
      onExpand={limit ? onExpand : undefined}
      pageSize={limit ? undefined : 10}
      loading={loading}
      renderCard={renderCard}
      centerAlign={centerAlign}
    />
  );
};

export default PointConvertHistoryTable;
