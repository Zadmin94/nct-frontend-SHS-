// @ai_generated
import { Skeleton } from '@components/skeleton/BaseSkeleton';

const CARD_LINE_COUNTS = [3, 4, 3];

export default function TradeDetailSkeleton({
  embedded = false,
  role = 'buyer',
  layout = 'standalone',
}) {
  const isAuctionLayout = !embedded && layout === 'auction';
  const contentClassName = embedded
    ? 'trade-detail-page__content'
    : isAuctionLayout
      ? 'container auction-trade-detail-shell'
      : 'container';

  return (
    <div
      className={`trade-detail-skeleton trade-detail-page--${role}${
        isAuctionLayout ? '' : ' trade-detail-page'
      }`}
    >
      <main
        className={contentClassName}
        aria-busy="true"
        aria-label="거래 상세 정보를 불러오는 중"
      >
        {/* @ai_generated (담당자1, 2026-08-13): 실제 화면에서 부모가 제목과 스테퍼를
            제공하는 embedded 로딩에는 중복 영역을 만들지 않는다. */}
        {!embedded && (
          <>
            <div className="trade-detail-page__header trade-detail-skeleton__header">
              <Skeleton height={36} width={180} />
            </div>
            <ol className="trade-stepper trade-detail-skeleton__stepper" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <li className="trade-stepper__item" key={index}>
                  <Skeleton circle height={26} width={26} />
                  <Skeleton className="trade-detail-skeleton__step-label" height={18} width={72} />
                </li>
              ))}
            </ol>
          </>
        )}

        <div className="trade-detail-grid">
          {CARD_LINE_COUNTS.map((lineCount, cardIndex) => (
            <section className="trade-detail-skeleton__card" key={cardIndex} aria-hidden="true">
              <Skeleton height={22} width="42%" />
              <Skeleton className="trade-detail-skeleton__media" height={150} />
              <div className="trade-detail-skeleton__lines">
                {Array.from({ length: lineCount }).map((_, lineIndex) => (
                  <Skeleton
                    height={16}
                    key={lineIndex}
                    width={lineIndex === lineCount - 1 ? '68%' : '100%'}
                  />
                ))}
              </div>
              <Skeleton className="trade-detail-skeleton__action" height={42} />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
