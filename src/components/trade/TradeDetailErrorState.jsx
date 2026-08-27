// @ai_generated (담당자1, 2026-08-07)
// TradeDetailBuyer/Seller의 loadError 화면(거래 정보를 불러오지 못했습니다 + 다시 시도)이
// role className만 다르고 완전히 동일해서 공통화했다.
import { ActionButton } from '@components/common/ui';

export default function TradeDetailErrorState({ role, contentClassName, onRetry }) {
  return (
    <div className={`trade-detail-page trade-detail-page--${role}`}>
      <main className={`${contentClassName} trade-detail-page__state`}>
        <section className="trade-detail-card" role="alert">
          <h1>거래 정보를 불러오지 못했습니다.</h1>
          <ActionButton onClick={onRetry} tone="outline">
            다시 시도
          </ActionButton>
        </section>
      </main>
    </div>
  );
}
