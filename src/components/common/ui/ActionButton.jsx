// 담당자 7 · UI 공통화: 일반 액션 버튼과 라우트 링크의 크기·톤·상태 표현을 한 계약으로 제공합니다.
import { Link } from 'react-router-dom';
import './uiComponents.css';

const SIZE_CLASS = {
  sm: 'ui-action-button--sm',
  md: 'ui-action-button--md',
  lg: 'ui-action-button--lg',
};

const TONE_CLASS = {
  primary: 'ui-action-button--primary',
  outline: 'ui-action-button--outline',
  neutral: 'ui-action-button--neutral',
  danger: 'ui-action-button--danger',
  'danger-outline': 'ui-action-button--danger-outline',
};

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(' ');

export default function ActionButton({
  children,
  className = '',
  disabled = false,
  fullWidth = false,
  loading = false,
  onClick,
  // 입력창·카드와 맞춘 기존 36/42/46px 버튼은 소비처의 geometry class를 그대로 사용합니다.
  preserveSize = false,
  size = 'md',
  tabIndex,
  to,
  tone = 'primary',
  type = 'button',
  ...rest
}) {
  const isDisabled = disabled || loading;
  const buttonClassName = joinClassNames(
    'ui-action-button',
    !preserveSize && (SIZE_CLASS[size] ?? SIZE_CLASS.md),
    TONE_CLASS[tone] ?? TONE_CLASS.primary,
    fullWidth && 'ui-action-button--full-width',
    loading && 'ui-action-button--loading',
    isDisabled && 'ui-action-button--disabled',
    className,
  );
  const content = (
    <>
      {loading && <span aria-hidden="true" className="ui-action-button__spinner" />}
      {children}
    </>
  );

  if (to != null) {
    const handleLinkClick = (event) => {
      if (isDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      onClick?.(event);
    };

    return (
      <Link
        {...rest}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        className={buttonClassName}
        onClick={handleLinkClick}
        tabIndex={isDisabled ? -1 : tabIndex}
        to={to}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      aria-busy={loading || undefined}
      className={buttonClassName}
      disabled={isDisabled}
      onClick={onClick}
      tabIndex={tabIndex}
      type={type}
    >
      {content}
    </button>
  );
}
