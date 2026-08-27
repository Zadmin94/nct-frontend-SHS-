import InlineSkeleton from '@components/skeleton/InlineSkeleton';

// sm 이상에서 항목 수만큼 열을 나눈다 — 3개 고정이면 항목이 2개일 때 남은 한 칸이 비어
// 카드가 좁아 보인다(Tailwind가 인식하도록 실제 클래스명을 그대로 나열해둔다).
const GRID_COLS_CLASS = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' };

export default function MyPageSummary({ items, isLoading = false }) {
  const gridColsClass = GRID_COLS_CLASS[items.length] ?? 'sm:grid-cols-3';

  return (
    <div className={`mb-5 hidden grid-cols-1 border-y border-[#e9edf4] lg:grid ${gridColsClass}`}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex min-h-[70px] items-center justify-between gap-3 px-5 py-4 ${
            index > 0 ? "border-t border-[#e9edf4] sm:border-l sm:border-t-0" : ""
          }`}
        >
          <span className="text-base leading-7 font-bold text-[#667085]">{item.label}</span>
          <strong className="inline-flex min-w-8 items-center justify-end text-2xl leading-7 font-extrabold text-[#155eef]">
            {isLoading ? <InlineSkeleton width={32} height={24} /> : item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}
