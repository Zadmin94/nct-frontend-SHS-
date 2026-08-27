// Claude Code 작성 (BJN, 2026-08-05)
// "이전 / N / M / 다음" 단순 페이지네이션 — PointTable(포인트 내역 전체보기 모달)과
// 알림함 페이지(NotificationPage 도메인 탭)가 같은 마크업을 2벌 복사해 쓰던 것을 통합
// (2026-08-05 코드 점검 후속). 숫자 박스형 공용 Pagination(components/common)과는 다른
// 생김새라 그걸 재사용하지 않고, 기존 화면 모양 그대로 유지하는 별도 소형 컴포넌트로 뒀다.
// 두 사용처 모두 담당자6 소유 파일이라 point/components 안에 둔다.

const btnClass =
  'px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors';

/**
 * @param {number} page 현재 페이지 (1부터)
 * @param {number} pageCount 전체 페이지 수
 * @param {(nextPage: number) => void} onPageChange 페이지 변경 콜백
 * @param {string} [className] 여백 등 배치 조정용 (기본 mt-3)
 */
const PrevNextPagination = ({ page, pageCount, onPageChange, className = 'mt-3' }) => (
  <div className={`flex items-center justify-center gap-3 ${className}`}>
    <button
      type="button"
      disabled={page === 1}
      onClick={() => onPageChange(page - 1)}
      className={btnClass}
    >
      이전
    </button>
    <span className="text-sm text-gray-500">{page} / {pageCount}</span>
    <button
      type="button"
      disabled={page === pageCount}
      onClick={() => onPageChange(page + 1)}
      className={btnClass}
    >
      다음
    </button>
  </div>
);

export default PrevNextPagination;
