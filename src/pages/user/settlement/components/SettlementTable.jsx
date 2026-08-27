// src/pages/user/settlement/components/SettlementTable.jsx
import { Link } from 'react-router-dom';
import { StatusBadge } from '@components/common/ui';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import { getServiceTradeDetailPath } from '@/routes/myPageRoutes';

const STATUS_BADGE_TONE = {
  대기: 'warning',
  보류: 'danger',
  완료: 'info',
  환불종결: 'neutral',
};

const STATUS_FILTERS = ['전체', '대기', '보류', '완료', '환불종결'];

// 담당자 7: 정산의 거래 유형에 따라 물건/서비스 거래 상세 경로를 분리한다.
const getTradeDetailPath = (row) => {
  if (row.tradeTypeCode === 'TRDC0002') return getServiceTradeDetailPath(row.tradeId);
  if (row.tradeTypeCode === 'TRDC0001') return `/trades/${row.tradeId}/seller`;
  return null;
};

/**
 * 정산 내역 테이블 — 상태 필터 탭 포함 (목업 18_settlement.html 기준)
 * 정산 요청·계좌 정보 등은 백엔드에 대응 기능이 없어 이번 화면에서는 제외 (조회 전용)
 */
const SettlementTable = ({ rows, filter, onFilterChange, loading = false, loadingRows = 6 }) => {
  const filtered = filter === '전체' ? rows : rows.filter((r) => r.statusName === filter);

  return (
    <section className="mt-6">
      <div className="flex gap-2 mb-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`rounded-lg px-3.5 py-2 text-sm border transition-colors
              ${filter === f
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              <th className="text-left font-bold px-4 py-3">관련 거래</th>
              <th className="text-left font-bold px-4 py-3">등록일시</th>
              <th className="text-right font-bold px-4 py-3">정산 포인트</th>
              <th className="text-left font-bold px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && Array.from({ length: loadingRows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 4 }).map((__, cellIndex) => (
                  <td className="px-4 py-3" key={cellIndex}><Skeleton height={14} /></td>
                ))}
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-400 py-10">
                  정산 내역이 없습니다.
                </td>
              </tr>
            )}
            {!loading && filtered.map((row) => {
              const tradeDetailPath = row.tradeId ? getTradeDetailPath(row) : null;
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {tradeDetailPath ? (
                      <Link
                        className="font-medium text-primary no-underline hover:underline"
                        to={tradeDetailPath}
                      >
                        거래상세
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.regDate}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-gray-900">
                    {row.amount.toLocaleString()}P
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge tone={STATUS_BADGE_TONE[row.statusName] ?? 'neutral'} variant="soft">
                      {row.statusName}
                    </StatusBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SettlementTable;
