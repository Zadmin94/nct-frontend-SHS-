import './AdminSectionCard.css';

/** 담당자 7: 관리자 목록과 상세 화면의 섹션 구조를 통일하는 공통 카드입니다. */
const AdminSectionCard = ({ action, children, className = '', description, title }) => (
  <section className={`admin-section-card ${className}`}>
    {(title || description || action) && (
      <header className="admin-section-card__header">
        <div>
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
        {action && <div className="admin-section-card__action">{action}</div>}
      </header>
    )}
    {children}
  </section>
);

export default AdminSectionCard;
