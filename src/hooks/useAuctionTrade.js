// @ai_generated
import { useQuery } from '@tanstack/react-query';
import { getTradeDetailByAuctionId } from '@api/tradeApi';

const unwrapData = (response) => response?.data ?? response;

export function useAuctionTrade(auctionId) {
  return useQuery({
    queryKey: ['auction-trade', String(auctionId)],
    queryFn: () => getTradeDetailByAuctionId(auctionId),
    enabled: Boolean(auctionId),
    select: unwrapData,
  });
}
