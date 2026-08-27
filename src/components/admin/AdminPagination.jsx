// src/components/admin/AdminPagination.jsx
import Pagination from '@components/common/Pagination';
import './AdminPagination.css';

/** 담당자 7: 관리자 목록도 전역 공용 페이지네이션을 사용하고 관리자용 간격만 덧씌웁니다. */
const AdminPagination = ({
  page,
  totalPages,
  onPageChange,
  className = '',
  ariaLabel = '관리자 목록 페이지 이동',
  disabled = false,
}) => (
  <Pagination
    ariaLabel={ariaLabel}
    className={`admin-pagination${className ? ` ${className}` : ''}`}
    disabled={disabled}
    maxVisiblePages={5}
    onPageChange={onPageChange}
    page={page}
    showSinglePage
    totalPages={totalPages}
  />
);
export default AdminPagination;
