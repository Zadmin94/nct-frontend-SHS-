import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BACKEND_URL } from '@api/axios';

export function useAuctionStream(auctionId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auctionId) return undefined;

    const eventSource = new EventSource(
      `${BACKEND_URL}/api/auctions/${auctionId}/stream`,
      { withCredentials: true },
    );

    const handleAuctionUpdated = () => {
      queryClient.refetchQueries({
        queryKey: ['auctionDetail', auctionId],
        type: 'active',
      });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['landing-curation', 'auctions'] });
      queryClient.invalidateQueries({ queryKey: ['bids', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['point', 'balance'] });
    };

    eventSource.onopen = () => {
      queryClient.refetchQueries({
        queryKey: ['point', 'balance'],
        type: 'active',
      });
    };
    eventSource.addEventListener('auction-updated', handleAuctionUpdated);
    eventSource.onerror = () => {};

    return () => {
      eventSource.onopen = null;
      eventSource.removeEventListener('auction-updated', handleAuctionUpdated);
      eventSource.close();
    };
  }, [auctionId, queryClient]);
}
