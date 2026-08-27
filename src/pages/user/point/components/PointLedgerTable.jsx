// src/pages/user/point/components/PointLedgerTable.jsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMyBidHistory } from '@hooks/useBid';
import PointTable from './PointTable';
import pointBadge from './pointBadge';
import { formatPointLedgerReason, reasonSummary } from './pointLedgerReason';
import { getServiceTradeDetailPath } from '@/routes/myPageRoutes';

// 원장유형(PTLG02)별 배지 색 — 목업 badge-success/warning/blue/gray 매핑
const TYPE_BADGE = {
  충전:       'bg-blue-100 text-blue-800',
  홀딩:       'bg-amber-100 text-amber-800',
  반환:       'bg-indigo-100 text-indigo-800',
  보관금전환: 'bg-amber-100 text-amber-800',
  정산:       'bg-blue-100 text-blue-800',
  전환:       'bg-purple-100 text-purple-800',
  환전출금:   'bg-red-100 text-red-700',
  환전복원:   'bg-teal-100 text-teal-800',
  환불:       'bg-cyan-100 text-cyan-800',
  보정:       'bg-gray-100 text-gray-600',
};

// 배지 마크업은 네 내역 테이블 공용 렌더러(pointBadge)로 통합 — 여기는 색 매핑만 정의 (2026-08-05)
const badge = pointBadge(TYPE_BADGE);

// 참조유형공통코드(REFG01) → 이동할 화면 경로.
// 거래(REFC0005)는 정산 적립(PTLC0008)이면 판매자 화면, 보관금 환불(PTLC0013)이면 구매자 화면으로 보낸다 —
// 정산은 항상 판매자에게, 환불은 항상 구매자/의뢰자에게 적립되기 때문 (PointLedgerType 주석 기준).
// 입찰(REFC0004)은 원장에 경매번호가 없어(bidSn만 있음), 내 입찰 내역(/bids/me, 담당자5 제공 조회
// 계약)에서 bidSn→aucSn을 찾아 진행 중이든 종료됐든 상관없이 해당 경매 상세로 보낸다.
const resolveRefLink = (row, bidByBidSn) => {
  if (!row.refTypeCd || row.refSn == null) return null;
  switch (row.refTypeCd) {
    case 'REFC0005': // 거래
      if (row.tradeTypeCode === 'TRDC0002') return getServiceTradeDetailPath(row.refSn);
      if (row.tradeTypeCode === 'TRDC0001') {
        return row.typeCd === 'PTLC0008' ? `/trades/${row.refSn}/seller` : `/trades/${row.refSn}`;
      }
      return null;
    case 'REFC0004': { // 입찰
      const aucSn = bidByBidSn.get(row.refSn)?.aucSn;
      return aucSn ? `/auction/${aucSn}` : null;
    }
    default:
      return null;
  }
};

// 참조번호(BID_SN 등)는 화면에서 그 자체로는 의미가 없어서, 알아볼 수 있는 상품명이 있으면
// 상품명만 보여준다 — 참조번호는 화면에 안 찍어도 refTypeCd/refSn과 링크(href)에는 그대로
// 남아있어 데이터 연결·원장-DB 대조에는 영향 없다 (사용자 결정, 2026-07-29).
const withProductName = (row, bidByBidSn) => {
  if (row.refTypeCd === 'REFC0004') {
    const title = bidByBidSn.get(row.refSn)?.auctionTitle;
    if (title) return title;
  }
  return row.ref;
};

// 사유는 "고정 문구: 관리자 입력 상세" 형태인 경우가 있어(취소 사유 등) 콜론 앞
// 고정 문구만 기본 표시하고, 전체 텍스트는 title 툴팁으로 남긴다 (2026-08-04, 가독성 개선).
// "(정산번호 446)" 같은 내부 참조번호도 화면엔 안 보여준다 — 사용자가 조회·문의에 쓸 방법이
// 없는 내부 식별자라 노출 실익이 없다(데이터는 원장 사유 그대로 DB에 남는다, 표시만 정리).
// 표 배치는 공용 셸(PointTable)이 담당 — 여기는 컬럼 구성과 셀 내용만 정의한다 (2026-07-20 통합)
// widthClass 퍼센트는 앞 3열(일시/배지/금액)만 충전·환전 내역 표와 맞춰뒀다 — 이 표는 잔액
// 컬럼이 하나 더 있어 컬럼 수가 달라서, 뒤쪽(잔액/관련/사유)까지 세 표를 전부 맞추진 못한다
// (2026-08-04, PointTable.jsx 참고).
const buildColumns = (bidByBidSn) => [
  { key: 'date', header: '일시', widthClass: 'w-[170px]', cellClass: 'truncate text-gray-700', render: (r) => <span title={r.date}>{r.date}</span> },
  {
    key: 'type', header: '유형', widthClass: 'w-[80px]', cellClass: 'whitespace-nowrap',
    render: (r) => badge(r.type),
  },
  {
    key: 'amount', header: '변동금액', align: 'right', widthClass: 'w-auto',
    cellClass: (r) => `whitespace-nowrap font-medium ${r.amount > 0 ? 'text-blue-700' : 'text-red-700'}`,
    render: (r) => `${r.amount > 0 ? '+' : ''}${r.amount.toLocaleString()}P`,
  },
  {
    // 정산가능·홀딩 카테고리 행은 아래에서 다 걸러내서, 이 표엔 항상 사용가능 카테고리만
    // 남는다 — 잔액이 한 트랙으로만 이어져서 카테고리 라벨을 따로 붙일 필요가 없다 (2026-08-04).
    key: 'balanceAfter', header: '잔액', align: 'right', widthClass: 'w-auto', cellClass: 'truncate text-gray-700',
    render: (r) => <span title={`${r.balanceAfter.toLocaleString()}P`}>{r.balanceAfter.toLocaleString()}P</span>,
  },
  {
    key: 'ref', header: '관련', align: 'left', widthClass: 'w-[25%]', cellClass: 'truncate text-gray-500',
    render: (r) => {
      if (!r.ref) return '-';
      const label = withProductName(r, bidByBidSn);
      const link = resolveRefLink(r, bidByBidSn);
      return link
        ? <Link to={link} title={label} className="text-blue-600 hover:underline">{label}</Link>
        : <span title={label}>{label}</span>;
    },
  },
  {
    key: 'reason', header: '사유', align: 'left', widthClass: 'w-[25%]', cellClass: 'truncate text-gray-500',
    render: (r) => <span title={formatPointLedgerReason(r.reason)}>{reasonSummary(r.reason)}</span>,
  },
];

// 모바일 카드 한 장 — 표 컬럼과 같은 데이터를 배지+날짜 / 금액+잔액 / 사유 / 관련 순서로 배치한다
// (사유·관련처럼 폭이 일정치 않은 정보가 있어 표는 sm 이상에서만, 좁은 화면은 카드로 보여준다, 2026-08-03)
const buildRenderCard = (bidByBidSn) => (r) => {
  const label = r.ref ? withProductName(r, bidByBidSn) : null;
  const link = r.ref ? resolveRefLink(r, bidByBidSn) : null;
  return (
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
      {label && (
        link
          ? <Link to={link} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">↗ {label}</Link>
          : <div className="mt-1 text-xs text-gray-500">{label}</div>
      )}
    </>
  );
};

// limit을 주면(마이페이지 요약 카드) 최근 N건만 보여주고 "+"로 전체보기 모달을 띄운다.
// limit 없이 부르면(전체보기 모달 안) 전부 보여준다 (2026-07-29).
//
// 사용가능 카테고리만 보여준다(2026-08-04) — 홀딩·정산가능 카테고리 행은 원장(POINT_LEDGER)엔
// 그대로 남고 화면 노출만 거른다. 상단 요약 카드는 이 필터와 별개로 항상 현재 값을 보여준다.
// - 홀딩: 사용자가 취소·조작할 수 없는 시스템 처리 중 상태라 행 자체가 정보 가치 없음. 홀딩이
//   걸리거나 반환될 때 짝이 되는 사용가능 카테고리 행("사유: 입찰 포인트 홀딩")이 같은 사건을
//   이미 설명해준다.
// - 정산가능(정산 적립·전환 출금 등): 정산가능 포인트와 관련된 흐름은 전부 정산포인트 내역 표
//   (PointConvertHistoryTable)로 옮겼다 — 여기서 빼도 정보 손실이 없고, 이 표에 남는 행이 전부
//   사용가능 카테고리라 잔액이 한 트랙으로만 이어진다.
const PointLedgerTable = ({ rows, limit, onExpand, loading, centerAlign = false }) => {
  const { data: myBids } = useMyBidHistory();
  const bidByBidSn = useMemo(
    () => new Map((myBids ?? []).map((b) => [b.bidSn, b])),
    [myBids],
  );
  const columns = useMemo(() => buildColumns(bidByBidSn), [bidByBidSn]);
  const renderCard = useMemo(() => buildRenderCard(bidByBidSn), [bidByBidSn]);
  const displayRows = rows.filter((r) => r.category === '사용가능');
  const visibleRows = limit ? displayRows.slice(0, limit) : displayRows;

  return (
    <PointTable
      title="포인트 내역"
      columns={columns}
      rows={visibleRows}
      emptyText="포인트 내역이 없습니다."
      onExpand={limit ? onExpand : undefined}
      pageSize={limit ? undefined : 10}
      loading={loading}
      renderCard={renderCard}
      centerAlign={centerAlign}
    />
  );
};

export default PointLedgerTable;
