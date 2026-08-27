import { Link } from 'react-router-dom';

import './AdminReferenceLink.css';

/** 담당자 7: 관리자 목록과 상세에서 업무 대상을 제목·종류·번호로 동일하게 표시합니다. */
const AdminReferenceLink = ({
  ariaLabel,
  centered = false,
  className = '',
  meta,
  onClick,
  state,
  title,
  to,
}) => {
  const normalizedTitle = title?.trim() || meta || '관련 항목';
  const interactive = Boolean(to || onClick);
  const classes = [
    'admin-reference-link',
    centered ? 'admin-reference-link--centered' : '',
    interactive ? 'admin-reference-link--interactive' : '',
    className,
  ].filter(Boolean).join(' ');
  const content = (
    <>
      <span className="admin-reference-link__summary">
        <strong title={normalizedTitle}>{normalizedTitle}</strong>
        {meta && <small title={meta}>{meta}</small>}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        aria-label={ariaLabel || `${normalizedTitle} 상세 보기`}
        className={classes}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return to ? (
    <Link
      aria-label={ariaLabel || `${normalizedTitle} 상세 보기`}
      className={classes}
      state={state}
      to={to}
    >
      {content}
    </Link>
  ) : <span className={classes}>{content}</span>;
};

export default AdminReferenceLink;
