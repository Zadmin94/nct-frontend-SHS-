import { Link } from 'react-router-dom';
import InlineSkeleton from '@components/skeleton/InlineSkeleton';
import './CommonTabs.css';

/**
 * 담당자 7: 마이페이지의 밑줄형 탭을 전체 화면에서 동일하게 사용하는 공통 컴포넌트입니다.
 * 각 화면은 값과 이동 경로만 전달하고 탭의 크기·간격·활성 표시는 이곳에서 관리합니다.
 */
export default function CommonTabs({
  activeValue,
  ariaLabel,
  className = '',
  endContent,
  isLoading = false,
  items,
  onChange,
}) {
  const getTabClassName = (isActive) => (
    `common-tabs__tab${isActive ? ' is-active' : ''}`
  );

  return (
    <div className={`common-tabs${className ? ` ${className}` : ''}`}>
      <div className="common-tabs__list" role="tablist" aria-label={ariaLabel}>
        {items.map((item) => {
          const isActive = activeValue === item.value;
          const content = (
            <>
              <span>{item.label}</span>
              {item.count != null && (
                isLoading
                  ? <InlineSkeleton width={20} height={20} borderRadius={6} />
                  : <span className="common-tabs__count">{item.count}</span>
              )}
            </>
          );

          if (item.to) {
            return (
              <Link
                aria-controls={item.ariaControls}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.ariaLabel}
                aria-selected={isActive}
                className={getTabClassName(isActive)}
                id={item.id}
                key={String(item.value)}
                onKeyDown={item.onKeyDown}
                role="tab"
                tabIndex={item.tabIndex}
                to={item.to}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              aria-controls={item.ariaControls}
              aria-label={item.ariaLabel}
              aria-selected={isActive}
              className={getTabClassName(isActive)}
              disabled={item.disabled}
              id={item.id}
              key={String(item.value)}
              onClick={() => onChange?.(item.value)}
              onKeyDown={item.onKeyDown}
              role="tab"
              tabIndex={item.tabIndex}
              type="button"
            >
              {content}
            </button>
          );
        })}
      </div>
      {endContent && <div className="common-tabs__end">{endContent}</div>}
    </div>
  );
}
