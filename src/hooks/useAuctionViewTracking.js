import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { increaseProductViewCount } from '@api/productApi';

const VIEW_STORAGE_PREFIX = 'nct:auction-view:';
const trackedViews = new Set();

const getStorageKey = (auctionId) => `${VIEW_STORAGE_PREFIX}${auctionId}`;

const readStoredView = (storageKey) => {
  try {
    return window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

const storeView = (storageKey, value) => {
  try {
    window.sessionStorage.setItem(storageKey, value);
  } catch {
    // In-memory tracking still prevents duplicate requests in this page session.
  }
};

const removeStoredView = (storageKey) => {
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // The next page entry can retry through in-memory tracking.
  }
};

export function useAuctionViewTracking(auctionId, productId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auctionId || !productId) return;

    const storageKey = getStorageKey(auctionId);
    if (trackedViews.has(storageKey) || readStoredView(storageKey)) return;

    trackedViews.add(storageKey);
    storeView(storageKey, 'pending');

    increaseProductViewCount(productId)
      .then((response) => {
        storeView(storageKey, 'recorded');
        const latestViewCount = Number(response?.data?.viewCount ?? response?.viewCount);
        if (!Number.isFinite(latestViewCount)) return;

        queryClient.setQueriesData({
          queryKey: ['auctionDetail', auctionId],
        }, (currentAuction) => {
          if (!currentAuction) return currentAuction;

          const currentViewCount = Number(currentAuction.viewCount);
          const nextViewCount = Number.isFinite(currentViewCount)
            ? Math.max(currentViewCount, latestViewCount)
            : latestViewCount;

          return nextViewCount === currentViewCount
            ? currentAuction
            : { ...currentAuction, viewCount: nextViewCount };
        });
      })
      .catch(() => {
        trackedViews.delete(storageKey);
        removeStoredView(storageKey);
      });
  }, [auctionId, productId, queryClient]);
}
