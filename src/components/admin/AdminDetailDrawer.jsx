import { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import './AdminDetailDrawer.css';

/** 담당자 7: 관리자 목록을 유지한 채 핵심 상세와 처리 영역을 보여주는 공통 드로어입니다. */
const AdminDetailDrawer = ({
  children,
  eyebrow = '상세 정보',
  footer,
  onClose,
  panelClassName = '',
  title,
}) => {
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="admin-detail-drawer"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <aside
        aria-labelledby={titleId}
        aria-modal="true"
        className={['admin-detail-drawer__panel', panelClassName].filter(Boolean).join(' ')}
        role="dialog"
      >
        <header className="admin-detail-drawer__header">
          <div>
            <span>{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button aria-label="상세 닫기" onClick={onClose} type="button">
            <X aria-hidden="true" size={22} />
          </button>
        </header>

        <div className="admin-detail-drawer__body">{children}</div>

        {footer && <footer className="admin-detail-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  );
};

export default AdminDetailDrawer;
