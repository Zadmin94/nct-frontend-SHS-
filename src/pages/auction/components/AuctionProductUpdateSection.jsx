import { memo, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, RotateCcw } from 'lucide-react';
import { fetchProductComments } from '@api/productApi';
import Pagination from '@components/common/Pagination';
import { SkeletonBlock } from '@components/skeleton/AuctionSkeletons';
import { ActionButton } from '@components/common/ui';

const UPDATES_PER_PAGE = 5;

const formatUpdatedAt = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const AuctionProductUpdateSection = ({
  sectionId,
  productId,
  enabled = true,
}) => {
  const [page, setPage] = useState(1);
  const updateQuery = useQuery({
    queryKey: ['productComments', productId],
    queryFn: async () => {
      const response = await fetchProductComments(productId);
      return response?.data ?? [];
    },
    enabled: Boolean(enabled && productId),
  });
  const updates = useMemo(
    () => (Array.isArray(updateQuery.data) ? updateQuery.data : []).map((update) => ({
      updateId: update.prdCmtSn,
      title: update.prdCmtTtl,
      content: update.prdCmtCn,
      registeredAt: update.prdCmtRegDt,
    })),
    [updateQuery.data],
  );
  const totalPages = Math.ceil(updates.length / UPDATES_PER_PAGE);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const pagedUpdates = useMemo(() => {
    const startIndex = (currentPage - 1) * UPDATES_PER_PAGE;
    return updates.slice(startIndex, startIndex + UPDATES_PER_PAGE);
  }, [currentPage, updates]);
  const isWaiting = !enabled || updateQuery.isLoading;

  return (
    <section
      className="scroll-mt-[208px] border-b border-[#e2e5ea] py-10 md:scroll-mt-[82px] md:py-14"
      id={sectionId}
      aria-labelledby={`${sectionId}-title`}
    >
      <header className="mb-7 flex items-center justify-between gap-4">
        <h2
          className="m-0 text-h2 font-bold text-[#1d1d1f]"
          id={`${sectionId}-title`}
        >
          변경 내역
        </h2>
        <strong className="text-body-md whitespace-nowrap text-primary-dark">{updates.length}건</strong>
      </header>

      {isWaiting && (
        <div className="grid gap-3 border-y border-[#e2e5ea] py-4" aria-label="변경 내역을 불러오는 중">
          {Array.from({ length: UPDATES_PER_PAGE }).map((_, index) => (
            <div className="grid min-h-[92px] grid-cols-[40px_minmax(0,1fr)] items-center gap-4 px-1 py-4" key={index}>
              <SkeletonBlock className="size-10 rounded-full" />
              <div className="grid gap-2">
                <SkeletonBlock className="h-5 w-[42%]" />
                <SkeletonBlock className="h-4 w-[72%]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {updateQuery.isError && (
        <div className="grid min-h-28 place-items-center content-center gap-2.5 border-y border-[#e2e5ea] px-4 py-8 text-center text-body-sm text-[#777]">
          <p className="m-0">변경 내역을 불러오지 못했습니다.</p>
          <ActionButton
            onClick={() => updateQuery.refetch()}
            size="sm"
            tone="outline"
          >
            <RotateCcw size={15} aria-hidden="true" />
            다시 불러오기
          </ActionButton>
        </div>
      )}

      {!isWaiting && !updateQuery.isError && updates.length === 0 && (
        <p className="m-0 grid min-h-28 place-items-center border-y border-[#e2e5ea] px-4 py-8 text-center text-body-sm text-[#777]">
          등록된 변경 내역이 없습니다.
        </p>
      )}

      {!isWaiting && !updateQuery.isError && updates.length > 0 && (
        <ol className="m-0 grid list-none gap-3 border-y border-[#e2e5ea] py-4">
          {pagedUpdates.map((update) => (
            <li
              className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-b border-[#eceef1] px-1 py-4 last:border-b-0 max-sm:grid-cols-[34px_minmax(0,1fr)] max-sm:gap-3"
              key={update.updateId}
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-light text-primary-dark max-sm:size-[34px]">
                <History size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-4 max-sm:flex-col max-sm:gap-1">
                  <strong className="text-body-md text-[#1d1d1f]">{update.title}</strong>
                  <time
                    className="text-caption whitespace-nowrap text-[#777]"
                    dateTime={update.registeredAt}
                  >
                    {formatUpdatedAt(update.registeredAt)}
                  </time>
                </div>
                {update.content && (
                  <p className="mt-2 mb-0 whitespace-pre-wrap text-body-sm text-[#555] [overflow-wrap:anywhere] md:text-body-md">
                    {update.content}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="pt-7 max-sm:pt-6 [&_button]:transition-colors [&_button:not(:disabled)]:cursor-pointer [&_button:not(:disabled):hover]:border-primary [&_button:not(:disabled):hover]:bg-[#f2f7ff] [&_button:not(:disabled):hover]:text-primary-dark">
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          showSinglePage
          className="!my-0"
        />
      </div>
    </section>
  );
};

export default memo(AuctionProductUpdateSection);
