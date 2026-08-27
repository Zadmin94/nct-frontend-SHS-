import InlineSkeleton from '@components/skeleton/InlineSkeleton';

export default function MyPageFilterTabs({
  items,
  activeValue,
  onChange,
  ariaLabel,
  endContent,
  isLoading = false,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-2 sm:flex-row sm:items-end">
      <div
        className="flex h-11 min-w-0 flex-1 gap-[26px] overflow-x-auto scrollbar-none"
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const isActive = activeValue === item.value;

          return (
            <button
              key={String(item.value)}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.value)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-0 border-b-2 bg-transparent pb-[13px] text-[15px] font-bold ${
                isActive
                  ? "border-[#1466f5] text-[#1466f5]"
                  : "border-transparent text-[#555]"
              }`}
            >
              {item.label}
              {isLoading ? (
                <InlineSkeleton width={20} height={20} borderRadius={6} />
              ) : (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-extrabold text-white ${
                    isActive ? "bg-[#1466f5]" : "bg-[#565b64]"
                  }`}
                >
                  {item.count ?? 0}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {endContent && <div className="shrink-0 pb-2">{endContent}</div>}
    </div>
  );
}
