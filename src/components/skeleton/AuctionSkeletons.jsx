const SkeletonBlock = ({ className = '' }) => (
  <span
    aria-hidden="true"
    className={`block animate-pulse rounded-md bg-[#e9edf2] ${className}`}
  />
);

const AuctionCardSkeleton = () => (
  <article
    aria-hidden="true"
    className="flex min-h-[410px] flex-col overflow-hidden rounded-lg border border-[#f0efec] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)] max-md:min-h-0"
  >
    <SkeletonBlock className="h-[210px] w-full rounded-lg" />
    <div className="mt-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBlock className="h-5 w-[88%]" />
        <SkeletonBlock className="h-5 w-[62%]" />
      </div>
      <SkeletonBlock className="h-6 w-16 shrink-0 rounded-lg" />
    </div>
    <SkeletonBlock className="mt-3 h-7 w-28" />
    <div className="mt-2 flex gap-2.5">
      <SkeletonBlock className="h-4 w-20" />
      <SkeletonBlock className="h-4 w-14" />
    </div>
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#f0efec] pt-3.5 max-md:flex-col max-md:items-start">
      <SkeletonBlock className="h-4 w-16" />
      <SkeletonBlock className="h-9 w-44 max-w-full rounded-lg" />
    </div>
  </article>
);

const AuctionDetailSkeleton = () => (
  <main
    className="bg-white pb-14 text-[#1d1d1f]"
    aria-busy="true"
    aria-label="경매 상세 정보를 불러오는 중"
  >
    <div className="mx-auto w-full max-w-[1600px] px-4 lg:px-6">
      <SkeletonBlock className="mt-[34px] h-5 w-24 max-lg:mt-4" />

      <section className="mt-[18px] grid items-stretch gap-2 lg:grid-cols-[minmax(360px,0.78fr)_minmax(560px,1.22fr)] max-lg:mt-4">
        <div className="grid min-h-[498px] min-w-0 grid-rows-[minmax(0,1fr)_80px] gap-2 max-lg:min-h-0">
          <SkeletonBlock className="h-full min-h-[410px] w-full rounded-lg max-lg:aspect-square max-lg:min-h-0" />
          <div className="grid grid-cols-5 gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock className="h-20 w-full rounded-lg" key={index} />
            ))}
          </div>
        </div>

        <div className="grid min-h-[498px] grid-cols-2 content-start gap-x-12 gap-y-7 rounded-lg border border-[#e8e8e8] bg-white p-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-lg:min-h-[460px] max-sm:grid-cols-1 max-sm:gap-5 max-sm:p-5">
          <div className="col-span-2 flex items-center justify-between gap-3 max-sm:col-span-1">
            <div className="flex gap-2">
              <SkeletonBlock className="h-6 w-14 rounded-full" />
              <SkeletonBlock className="h-6 w-16 rounded-full" />
            </div>
            <SkeletonBlock className="h-7 w-16 rounded-full" />
          </div>
          <SkeletonBlock className="col-span-2 h-9 w-[min(520px,82%)] max-sm:col-span-1" />
          <div className="space-y-4">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-10 w-40" />
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="mt-8 h-4 w-36" />
            <SkeletonBlock className="h-9 w-52" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="h-12 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock className="h-10 w-full rounded-lg" key={index} />
              ))}
            </div>
            <SkeletonBlock className="mt-7 h-4 w-28" />
            <SkeletonBlock className="h-5 w-36" />
          </div>
          <div className="col-span-2 grid grid-cols-3 gap-3 self-end max-sm:col-span-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock className="h-[58px] w-full rounded-lg" key={index} />
            ))}
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-2 max-sm:col-span-1 max-sm:grid-cols-1">
            <SkeletonBlock className="h-12 w-full rounded-lg" />
            <SkeletonBlock className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </section>
    </div>

    <div className="mt-7 h-[82px] border-y border-[#e2e5ea] bg-white max-sm:h-[54px]">
      <div className="mx-auto grid h-full w-full max-w-[1600px] grid-cols-4 gap-6 px-4 lg:px-6 max-sm:gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="grid place-items-center" key={index}>
            <SkeletonBlock className="h-5 w-20 max-sm:w-14" />
          </div>
        ))}
      </div>
    </div>

    <div className="mx-auto w-full max-w-[1600px] px-4 py-12 lg:px-6">
      <SkeletonBlock className="h-8 w-32" />
      <div className="mt-8 space-y-4">
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-5 w-[92%]" />
        <SkeletonBlock className="h-5 w-[68%]" />
      </div>
    </div>
  </main>
);

const MyActiveAuctionSkeleton = () => (
  <div aria-hidden="true">
    <div className="my-active-auctions__summary">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index}>
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-7 w-8" />
        </div>
      ))}
    </div>
    <div className="mb-[18px] flex gap-2 overflow-hidden">
      <SkeletonBlock className="h-[38px] w-20 shrink-0 rounded-lg" />
      <SkeletonBlock className="h-[38px] w-28 shrink-0 rounded-lg" />
      <SkeletonBlock className="h-[38px] w-28 shrink-0 rounded-lg" />
    </div>
    <div className="history-list">
      {Array.from({ length: 4 }).map((_, index) => (
        <article className="my-active-auction-item" key={index}>
          <SkeletonBlock className="size-[88px] rounded-lg max-[720px]:size-[72px]" />
          <div className="min-w-0 space-y-2.5">
            <div className="flex gap-2">
              <SkeletonBlock className="h-6 w-20 rounded-full" />
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-5 w-[min(360px,82%)]" />
            <SkeletonBlock className="h-4 w-28" />
            <div className="flex gap-5">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-24" />
            </div>
          </div>
          <SkeletonBlock className="h-[38px] w-24 rounded-lg max-[720px]:col-span-2 max-[720px]:w-full" />
        </article>
      ))}
    </div>
  </div>
);

const AuctionInquirySkeleton = ({ count = 4 }) => (
  <div className="grid gap-3" aria-hidden="true">
    {Array.from({ length: count }).map((_, index) => (
      <article className="min-h-[148px] rounded-lg border border-[#e8e8e8] bg-white p-[18px]" key={index}>
        <div className="flex items-center justify-between gap-4">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
        <SkeletonBlock className="mt-5 h-4 w-[94%]" />
        <SkeletonBlock className="mt-3 h-4 w-[72%]" />
        <SkeletonBlock className="mt-5 h-7 w-20 rounded-full" />
      </article>
    ))}
  </div>
);

export {
  AuctionCardSkeleton,
  AuctionDetailSkeleton,
  AuctionInquirySkeleton,
  MyActiveAuctionSkeleton,
  SkeletonBlock,
};
