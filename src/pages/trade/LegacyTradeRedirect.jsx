// @ai_generated
import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { getTradeDetail } from '@api/tradeApi';
import AsyncRouteError from '@components/common/AsyncRouteError';
import TradeDetailSkeleton from '@components/trade/TradeDetailSkeleton';

export default function LegacyTradeRedirect() {
  const { tradeId } = useParams();
  const location = useLocation();
  const tradeQuery = useQuery({
    queryKey: ['trade', String(tradeId), 'legacy-redirect'],
    queryFn: () => getTradeDetail(tradeId),
    select: (response) => response?.data ?? response,
  });

  if (tradeQuery.isLoading) {
    return <TradeDetailSkeleton layout="auction" />;
  }

  if (tradeQuery.isError) {
    return <AsyncRouteError error={tradeQuery.error} onRetry={() => tradeQuery.refetch()} />;
  }

  if (!tradeQuery.data?.auctionId) {
    return <AsyncRouteError error={{ status: 404 }} onRetry={() => tradeQuery.refetch()} />;
  }

  return (
    <Navigate
      replace
      to={`/auction/${tradeQuery.data.auctionId}/trade${location.search}`}
      state={location.state}
    />
  );
}
