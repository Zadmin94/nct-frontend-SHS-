// 담당자 7 · UI 공통화: 업무 목록과 카드에서 사용하는 짧은 상태 배지를 공통 규격으로 표시합니다.
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

export default function StatusBadge({
  children,
  className = '',
  live = false,
  role,
  tone = 'neutral',
  variant = 'soft',
  ...rest
}) {
  const badgeClassName = [
    'ui-status-badge',
    TONE_CLASS[tone] ?? TONE_CLASS.neutral,
    VARIANT_CLASS[variant] ?? VARIANT_CLASS.soft,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      {...rest}
      aria-live={live ? 'polite' : undefined}
      className={badgeClassName}
      role={live ? 'status' : role}
    >
      {children}
    </span>
  );
}
