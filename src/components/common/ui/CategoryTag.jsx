// 담당자 7 · UI 공통화: 카테고리와 정적 분류값을 상태 배지와 같은 pill 체계로 표시합니다.
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

export default function CategoryTag({
  children,
  className = '',
  tone = 'neutral',
  variant = 'soft',
  ...rest
}) {
  const tagClassName = [
    'ui-category-tag',
    TONE_CLASS[tone] ?? TONE_CLASS.neutral,
    VARIANT_CLASS[variant] ?? VARIANT_CLASS.soft,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span {...rest} className={tagClassName}>
      {children}
    </span>
  );
}
