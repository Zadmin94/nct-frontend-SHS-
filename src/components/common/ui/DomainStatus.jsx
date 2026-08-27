// 담당자 7 · UI 공통화: 거래 등 도메인이 결정한 의미색을 dot와 함께 표시하며 상태코드는 해석하지 않습니다.
import './uiComponents.css';

const TONE_CLASS = {
  info: 'ui-tone-info',
  success: 'ui-tone-success',
  warning: 'ui-tone-warning',
  danger: 'ui-tone-danger',
  neutral: 'ui-tone-neutral',
};

const VARIANT_CLASS = {
  solid: 'ui-variant-solid',
  outline: 'ui-variant-outline',
  soft: 'ui-variant-soft',
};

export default function DomainStatus({
  children,
  className = '',
  live = false,
  role,
  tone = 'neutral',
  variant = 'soft',
  ...rest
}) {
  const statusClassName = [
    'ui-domain-status',
    TONE_CLASS[tone] ?? TONE_CLASS.neutral,
    VARIANT_CLASS[variant] ?? VARIANT_CLASS.soft,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      {...rest}
      aria-live={live ? 'polite' : undefined}
      className={statusClassName}
      role={live ? 'status' : role}
    >
      <span aria-hidden="true" className="ui-domain-status__dot" />
      {children}
    </span>
  );
}
