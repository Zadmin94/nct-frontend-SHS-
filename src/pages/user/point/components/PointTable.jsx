// src/pages/user/point/components/PointTable.jsx
// Claude Code 작성 (BJN, 2026-07-20)
import { useState } from 'react';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import PrevNextPagination from './PrevNextPagination';

/**
 * 포인트 화면 공용 테이블 셸 — 원장·충전·환전 세 내역 테이블이 같은 표 구조(제목 + 카드형
 * 래퍼 + thead/tbody + 빈 상태 행 + hover 행)를 3벌 복사해 쓰던 것을 하나로 통합 (2026-07-20).
 *
 * 표마다 다른 것(컬럼 구성·셀 내용·셀 스타일)은 columns 설정으로 받는다:
 *   { key, header, align?('right'면 우측 정렬), cellClass?(문자열 또는 (row)=>문자열), widthClass?, render(row) }
 * 배지 같은 셀 생김새는 각 테이블 파일이 render로 정의 — 셸은 배치만 책임진다.
 * widthClass는 일시·금액·상태 배지처럼 여러 표에 공통으로 나오는 컬럼 종류의 너비를
 * 맞추는 용도 — 표마다 컬럼 개수·내용 길이가 달라 같은 성격의 컬럼도 너비가 제각각이라
 * 페이지에 여러 표가 나란히 쌓일 때 여백이 들쭉날쭉해 보이던 것을 줄인다 (2026-07-30).
 * table-fixed로 렌더링하므로(2026-08-04) widthClass는 각 표에서 같은 열 순서(일시/상태·유형/
 * 금액/짧은텍스트/긴텍스트)에 동일한 퍼센트(w-[n%])를 줘야 표마다 세로 구분선이 맞는다 —
 * 셸이 강제하지는 않으니 새 표를 추가하거나 컬럼을 바꿀 때 다른 포인트 표들과 값을 맞출 것.
 *
 * pageSize를 주면(전체보기 모달) 내부에서 페이지네이션한다 — 요약 카드(최근 5건)는 pageSize
 * 없이 불러서 그대로 다 보여준다 (2026-07-29, "+" 전체보기 모달을 10건씩 페이지로 보여달라는 요청).
 *
 * renderCard(row)를 주면 모바일(sm 미만)에서는 표 대신 카드 목록을 보여준다 — 사유·비고처럼
 * 폭이 일정치 않은 컬럼이 있는 표를 좁은 화면에서 가로 스크롤 없이 보여주기 위한 것
 * (사용자 요청, 2026-08-03). 카드의 겉모양(테두리·둥근 모서리·여백)은 셸이 통일해서 책임지고,
 * renderCard는 안쪽 내용(배지·금액·부가정보 배치)만 반환한다 — 셸이 컬럼 render를 책임지는
 * 것과 같은 분리. 안 주면 기존처럼 표만 항상 보여준다(하위 호환).
 */
const PointTable = ({
  title, columns, rows, emptyText, onExpand, pageSize, loading = false, loadingRows = 5, renderCard, centerAlign = false,
}) => {
  const [page, setPage] = useState(1);
  const pageCount = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  const pagedRows = pageSize
    ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : rows;

  return (
    <section className="mt-6">
      {!centerAlign && (
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 m-0">{title}</h3>
        {/* 목록 화면에서는 최근 5건만 보여주고, 전체 내역은 이 버튼으로 모달에서 확인한다 (2026-07-29) */}
        {onExpand && (
          <button
            type="button"
            aria-label={`${title} 전체 보기`}
            onClick={onExpand}
            className="flex size-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-base leading-none"
          >
            +
          </button>
        )}
      </div>
      )}

      {renderCard && (
        <div className="sm:hidden space-y-1.5">
          {loading && Array.from({ length: loadingRows }).map((_, cardIndex) => (
            <div key={cardIndex} className="bg-white border border-gray-100 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]">
              <Skeleton height={14} />
              <Skeleton height={20} className="mt-2" />
            </div>
          ))}
          {!loading && pagedRows.length === 0 && (
            <div className="text-center text-gray-400 py-10 bg-white border border-gray-100 rounded-xl">
              {emptyText}
            </div>
          )}
          {!loading && pagedRows.map((row) => (
            <div
              key={row.id}
              className="bg-white border border-gray-100 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]"
            >
              {renderCard(row)}
            </div>
          ))}
        </div>
      )}

      <div className={`${renderCard ? 'hidden sm:block ' : ''}overflow-x-auto bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]`}>
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={centerAlign ? { textAlign: 'center' } : undefined}
                  className={`${centerAlign ? '' : (col.align === 'right' ? 'text-right' : 'text-left')} font-bold px-4 py-3 ${col.widthClass ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && Array.from({ length: loadingRows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col) => <td className="px-4 py-3" key={col.key}><Skeleton height={14} /></td>)}
            </tr>
          ))}
          {!loading && pagedRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-gray-400 py-10">
                  {emptyText}
                </td>
              </tr>
            )}
            {!loading && pagedRows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {columns.map((col) => {
                  // 셀 스타일이 행 값에 따라 달라지는 컬럼(예: 금액 +/- 색)은 함수로 받는다
                  const cellClass = typeof col.cellClass === 'function' ? col.cellClass(row) : (col.cellClass ?? '');
                  return (
                    <td
                      key={col.key}
                      style={centerAlign ? { textAlign: col.align === 'left' ? 'left' : 'center' } : undefined}
                      className={`px-4 py-3 ${centerAlign ? '' : (col.align === 'right' ? 'text-right' : '')} ${cellClass}`}
                    >
                      {col.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 알림함 페이지와 공용하는 "이전/다음" 페이지네이션 (2026-08-05 중복 통합) */}
      {pageSize && (
        <PrevNextPagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      )}
    </section>
  );
};

export default PointTable;
