// Claude Code 작성 (BJN, 260805)
// ─────────────────────────────────────────────────────────────────────────────
// 전역 브레드크럼 바 — UserLayout에서 헤더 바로 아래에 한 번만 렌더된다.
// 위치·스타일·접근성 마크업을 이 컴포넌트가 독점하므로 모든 페이지에서 위치가 통일되고(요구 2),
// 페이지 콘텐츠(main>Outlet) 밖에 있어 콘텐츠 영역과 분리 관리된다(요구 4).
//
// 표시할 항목이 없으면(null) 바 자체를 렌더하지 않아 목록·랜딩 페이지 레이아웃에 영향이 없다.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import useBreadcrumbTrail from './useBreadcrumbTrail';

const BreadcrumbBar = () => {
  const items = useBreadcrumbTrail();
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="현재 위치" className="border-b border-[#f0f0f0] bg-white">
      {/* .container(App.css): 헤더·본문과 좌우 시작선을 맞춘다. min-h 고정으로 높이 흔들림 방지 */}
      <ol className="container flex min-h-11 flex-wrap items-center gap-1.5 py-2.5 text-caption text-[#8b8b88]">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex min-w-0 items-center gap-1.5">
              {idx > 0 && <ChevronRight aria-hidden="true" className="shrink-0" size={14} />}
              {!isLast && item.to ? (
                <Link className="transition-colors hover:text-primary hover:underline" to={item.to}>
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'max-w-[240px] truncate font-medium text-[#1a1a18] md:max-w-[400px]' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default BreadcrumbBar;
