// src/components/common/Pagination.jsx
// Figma: 21_review_list_작성한 리뷰(node 56:415, "paging") 디자인 기준 페이지네이션.
// 페이지 번호 박스(35x35, 활성=파랑 채움/비활성=흰 배경+회색 테두리) + 이전/다음 화살표.
import { ChevronLeft, ChevronRight } from 'lucide-react';

const getVisiblePages = (currentPage, totalPages, maxVisiblePages) => {
  const requestedWindow = Number.isFinite(maxVisiblePages)
    ? Math.floor(maxVisiblePages)
    : totalPages;
  const windowSize = Math.max(1, Math.min(totalPages, requestedWindow));
  const halfWindow = Math.floor(windowSize / 2);
  const windowStart = Math.min(
    Math.max(currentPage - halfWindow, 1),
    Math.max(totalPages - windowSize + 1, 1),
  );

  return Array.from({ length: windowSize }, (_, index) => windowStart + index);
};

const Pagination = ({
  page,
  totalPages,
  onPageChange,
  showSinglePage = false,
  maxVisiblePages,
  className = '',
  ariaLabel = '페이지 이동',
  disabled = false,
}) => {
  const visibleTotalPages = Math.max(1, totalPages || 0);
  const visiblePage = Math.min(Math.max(1, page), visibleTotalPages);

  if (!showSinglePage && visibleTotalPages <= 1) return null;

  const visiblePages = getVisiblePages(visiblePage, visibleTotalPages, maxVisiblePages);
  const btnBase = "flex items-center justify-center size-[35px] rounded border border-[#d9d9d9] bg-white text-[#4e4e4e] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label={ariaLabel}
      className={`pagination flex items-center justify-center my-6${className ? ` ${className}` : ''}`}
    >
      <div className="pagination__controls flex items-center justify-center gap-2">
      {/* 첫 페이지 «  */}
      <button
        type="button"
        onClick={() => onPageChange(1)}
        disabled={disabled || visiblePage === 1}
        aria-label="첫 페이지"
        className={`${btnBase} pagination__boundary`}
      >
        <span className="text-[13px] font-bold">«</span>
      </button>

      {/* 이전 페이지 < */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, visiblePage - 1))}
        disabled={disabled || visiblePage === 1}
        aria-label="이전 페이지"
        className={`${btnBase} pagination__previous`}
      >
        <ChevronLeft size={18} />
      </button>

      {visiblePages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          disabled={disabled}
          aria-current={p === visiblePage ? 'page' : undefined}
          className={
            p === visiblePage
              ? 'pagination__page flex items-center justify-center size-[35px] rounded bg-primary text-white text-[16px] font-bold'
              : 'pagination__page flex items-center justify-center size-[35px] rounded border border-[#d9d9d9] bg-white text-[#4e4e4e] text-[16px]'
          }
        >
          {p}
        </button>
      ))}

      {/* 다음 페이지 > */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(visibleTotalPages, visiblePage + 1))}
        disabled={disabled || visiblePage === visibleTotalPages}
        aria-label="다음 페이지"
        className={`${btnBase} pagination__next`}
      >
        <ChevronRight size={18} />
      </button>

      {/* 마지막 페이지 » */}
      <button
        type="button"
        onClick={() => onPageChange(visibleTotalPages)}
        disabled={disabled || visiblePage === visibleTotalPages}
        aria-label="마지막 페이지"
        className={`${btnBase} pagination__boundary`}
      >
        <span className="text-[13px] font-bold">»</span>
      </button>
      </div>
    </nav>
  );
};
export default Pagination;
