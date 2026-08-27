import { useMemo, useState } from 'react';

/** 담당자 7: 서버 페이지 계약이 없는 관리자 배열 목록을 화면에서 안전하게 나눕니다. */
const useClientPagination = (items = [], pageSize = 20) => {
  const [requestedPage, setPage] = useState(1);
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const totalItems = safeItems.length;
  const totalPages = Math.ceil(totalItems / safePageSize);
  const page = totalPages > 0 ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const startIndex = (page - 1) * safePageSize;
  const pagedItems = useMemo(
    () => safeItems.slice(startIndex, startIndex + safePageSize),
    [safeItems, safePageSize, startIndex],
  );

  return {
    page,
    pagedItems,
    resetPage: () => setPage(1),
    setPage,
    startIndex,
    totalItems,
    totalPages,
  };
};

export default useClientPagination;
