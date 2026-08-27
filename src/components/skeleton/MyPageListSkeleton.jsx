import { Skeleton } from './BaseSkeleton';

export default function MyPageListSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="목록 불러오는 중">
      {Array.from({ length: count }).map((_, index) => (
        <article
          className="flex flex-col gap-5 rounded-xl border border-[#dce2ed] bg-white p-5 sm:h-[160px] sm:flex-row sm:items-center"
          key={index}
        >
          <div className="h-[104px] w-[104px] shrink-0 overflow-hidden rounded-[10px]">
            <Skeleton width={104} height={104} borderRadius={10} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2">
              <Skeleton width={64} height={20} borderRadius={6} />
            </div>
            <Skeleton width="58%" height={28} borderRadius={5} />
            <div className="mt-2">
              <Skeleton width="42%" height={16} borderRadius={4} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-6">
            <div className="flex flex-col items-end gap-3">
              <Skeleton width={110} height={14} borderRadius={4} />
              <div className="flex items-end gap-4">
                <div className="flex flex-col items-end gap-1">
                  <Skeleton width={48} height={10} borderRadius={3} />
                  <Skeleton width={90} height={22} borderRadius={5} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Skeleton width={48} height={10} borderRadius={3} />
                  <Skeleton width={90} height={22} borderRadius={5} />
                </div>
              </div>
            </div>
            <Skeleton width={84} height={36} borderRadius={8} />
          </div>
        </article>
      ))}
    </div>
  );
}
