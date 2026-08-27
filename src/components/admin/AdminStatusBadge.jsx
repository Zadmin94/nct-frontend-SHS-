import './AdminStatusBadge.css';

/**
 * 관리자 화면에서 상태를 같은 색으로 보여 주는 작은 공통 부품입니다.
 * 나중에 디자인팀 공통 Badge가 생기면 이 파일 하나만 교체하면 됩니다.
 */
const toneClass = {
  danger: 'badge-soft-danger',
  warning: 'badge-soft-warning',
  success: 'badge-soft-success',
  info: 'badge-soft-info',
  neutral: 'badge-soft-neutral',
};

const AdminStatusBadge = ({ children, tone = 'neutral' }) => (
  <span className={`badge admin-badge ${toneClass[tone] ?? toneClass.neutral}`}>
    {children}
  </span>
);

export default AdminStatusBadge;
