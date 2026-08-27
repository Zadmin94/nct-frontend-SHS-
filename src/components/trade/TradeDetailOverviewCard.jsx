import { toImageUrl } from '@api/fileApi';
import { ActionButton, DomainStatus } from '@components/common/ui';
import TradeProductCard from '@components/trade/TradeProductCard';
import TradeTrustSummary from '@components/trade/TradeTrustSummary';
import { Link, useLocation } from 'react-router-dom';

const TRADE_STATUS_TONES = {
  'trade-status--progress': 'info',
  'trade-status--pending': 'warning',
  'trade-status--complete': 'success',
  'trade-status--problem': 'danger',
  'trade-status--canceled': 'neutral',
};

/**
 * 배송·직거래 상세에서 공통으로 사용하는 1영역이다.
 * 거래 방식별 차이는 상위 화면에서 상태값·안내 문구로만 전달하고,
 * 진행 안내·상품·거래 상대방의 배치와 태그 위치는 여기서 동일하게 유지한다.
 */
export default function TradeDetailOverviewCard({
  trade,
  statusLabel,
  statusClassName,
  statusMessages,
  counterpartTitle,
  auctionId,
  onReport,
  onCancelRequest,
}) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return (
    <section className="trade-detail-card">
      <div className="trade-detail-card__block">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 style={{ margin: 0 }}>거래 진행 안내</h3>
          <DomainStatus tone={TRADE_STATUS_TONES[statusClassName] ?? 'neutral'}>
            {statusLabel}
          </DomainStatus>
        </div>
        {statusMessages.map((message, index) => (
          <p key={`${message}-${index}`}>{message}</p>
        ))}
        {onCancelRequest && (
          <div className="trade-detail-actions trade-detail-actions--end">
            <ActionButton onClick={onCancelRequest} size="sm" tone="danger-outline">
              경매 취소 요청
            </ActionButton>
          </div>
        )}
      </div>

      <TradeProductCard
        bare
        productImageUrl={trade.productImageUrl}
        productName={trade.productName}
        price={trade.price}
        category={trade.category}
        createdDate={trade.createdDate}
        completedDate={trade.completedDate}
        auctionId={auctionId}
      />

      <div className="trade-detail-card__block">
        <div className="trade-counterpart__heading">
          <h3>{counterpartTitle}</h3>
          {onReport && (
            <ActionButton onClick={onReport} size="sm" tone="danger-outline">
              신고하기
            </ActionButton>
          )}
        </div>
        <div className="trade-counterpart">
          <div className="trade-counterpart__profile">
            <div className="trade-counterpart__avatar">
              {trade.counterpartProfileImageUrl
                ? <img src={toImageUrl(trade.counterpartProfileImageUrl)} alt={trade.counterpart} />
                : (trade.counterpart?.slice(0, 1) ?? '?')}
            </div>
            <div>
              <p>
                {trade.counterpartUserId
                  ? (
                    <Link
                      className="text-inherit underline-offset-4 hover:text-primary hover:underline"
                      state={{
                        tradeProfileReturn: {
                          label: '거래 상세로 돌아가기',
                          to: returnTo,
                        },
                      }}
                      to={`/users/${trade.counterpartUserId}`}
                    >
                      {trade.counterpart}
                    </Link>
                  )
                  : trade.counterpart}
              </p>
              {trade.counterpartJoinedLabel !== '-' && (
                <>
                  <p className="trade-detail-card__muted">{trade.counterpartJoinedLabel}</p>
                  <p className="trade-detail-card__muted">완료한 거래 {trade.counterpartCompletedTradeCount}건</p>
                </>
              )}
            </div>
          </div>
          <TradeTrustSummary counterpartUserId={trade.counterpartUserId} dealType="goods" />
        </div>
      </div>
    </section>
  );
}
