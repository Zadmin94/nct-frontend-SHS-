import MyPageContentHeader from '@components/mypage/MyPageContentHeader';
import MyPageFilterTabs from '@components/mypage/MyPageFilterTabs';
import MyPageListSearch from '@components/mypage/MyPageListSearch';
import MyPageSummary from '@components/mypage/MyPageSummary';

export default function MyPageListSectionLayout({
  title,
  headerActions,
  summaryItems,
  filterItems,
  activeFilter,
  onFilterChange,
  filterAriaLabel,
  onSearch,
  searchAriaLabel,
  searchPlaceholder,
  extraControls,
  isLoading = false,
}) {
  const hasEndContent = Boolean(extraControls || onSearch);

  return (
    // 이 컴포넌트를 어떤 화면이 어떤 방식(flex gap 포함)으로 감싸든 항상 단일 요소로
    // 취급되도록 div 하나로 감싼다 — Fragment였을 때 flex gap 컨테이너 안에 놓이면
    // 내부 3개 요소가 각각 별도 flex item이 되어 자체 mb-5에 부모 gap이 겹쳐 더해지는
    // 이중 여백 버그가 있었다.
    <div>
      <MyPageContentHeader title={title} actions={headerActions} />
      <MyPageSummary items={summaryItems} isLoading={isLoading} />
      <div className="mb-5">
        <MyPageFilterTabs
          items={filterItems}
          activeValue={activeFilter}
          onChange={onFilterChange}
          ariaLabel={filterAriaLabel}
          isLoading={isLoading}
          endContent={hasEndContent ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              {extraControls}
              {onSearch && (
                <MyPageListSearch onSearch={onSearch} ariaLabel={searchAriaLabel} placeholder={searchPlaceholder} />
              )}
            </div>
          ) : null}
        />
      </div>
    </div>
  );
}
