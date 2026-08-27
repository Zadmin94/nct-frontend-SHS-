import { StatusBadge } from '@components/common/ui';

const LEGACY_BADGE_STYLES = {
  'badge-primary': { tone: 'info', variant: 'solid' },
  'badge-success': { tone: 'info', variant: 'outline' },
  'badge-warning': { tone: 'warning', variant: 'solid' },
  'badge-danger': { tone: 'danger', variant: 'outline' },
  'badge-gray': { tone: 'neutral', variant: 'solid' },
  'badge-orange': { tone: 'warning', variant: 'solid' },
  'badge-outline-orange': { tone: 'warning', variant: 'outline' },
  'badge-outline-gray': { tone: 'neutral', variant: 'outline' },
  'badge-teal': { tone: 'success', variant: 'outline' },
  'badge-urgent': { tone: 'warning', variant: 'solid' },
  'badge-blue': { tone: 'info', variant: 'soft' },
  'badge-goods': { tone: 'neutral', variant: 'soft' },
  'badge-aqua': { tone: 'success', variant: 'solid' },
};

const LEGACY_BADGE_CLASSES = new Set(['badge', ...Object.keys(LEGACY_BADGE_STYLES)]);

// 담당자 7 · UI 공통화: 기존 마이페이지 상태 문자열은 유지하고 공통 배지의 의미색으로 변환합니다.
export default function MyPageStatusBadge({ children, className = 'badge-outline-gray' }) {
  const classNames = String(className ?? '').trim().split(/\s+/).filter(Boolean);
  const semanticClassName = classNames.find((name) => LEGACY_BADGE_STYLES[name]);
  const style = LEGACY_BADGE_STYLES[semanticClassName] ?? {
    tone: 'neutral',
    variant: 'outline',
  };
  const layoutClassName = classNames
    .filter((name) => !LEGACY_BADGE_CLASSES.has(name))
    .join(' ');

  return (
    <StatusBadge
      className={layoutClassName}
      tone={style.tone}
      variant={style.variant}
    >
      {children}
    </StatusBadge>
  );
}
