import { toImageUrl } from '@api/fileApi';

const formatPrice = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}P` : '-';
};

const getDeadlinePresentation = (endDateTime) => {
  if (!endDateTime) return { dday: null, urgent: false };
  const remainingMs = new Date(endDateTime).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return { dday: null, urgent: false };
  }
  if (remainingMs <= 24 * 60 * 60 * 1000) {
    return { dday: null, urgent: true };
  }
  return {
    dday: `D-${Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))}`,
    urgent: false,
  };
};

export const toLandingAuctionItem = (auction) => {
  const deadline = getDeadlinePresentation(auction.endDateTime);
  const instantBuyPrice = Number(auction.instantBuyPrice);
  return {
    id: auction.auctionId,
    image: toImageUrl(auction.thumbnailPath),
    badge: null,
    bids: `입찰 ${Number(auction.bidCount || 0).toLocaleString('ko-KR')}회`,
    name: auction.title || '제목 미등록 경매',
    price: formatPrice(auction.currentPrice),
    secondaryPrice: Number.isFinite(instantBuyPrice) && instantBuyPrice > 0
      ? `/ ${formatPrice(instantBuyPrice)}`
      : null,
    ...deadline,
  };
};

export const toLandingPopularAuction = (auction, index) => ({
  id: auction.auctionId,
  rank: index + 1,
  name: auction.title || '제목 미등록 경매',
  price: formatPrice(auction.currentPrice),
});

export const toLandingServiceRequest = (request) => {
  const budget = Number(request.budgetAmount);
  const regionAndDate = [request.regionName, request.registeredAt?.slice?.(0, 10)]
    .filter(Boolean)
    .join(' · ');
  return {
    id: request.id,
    price: Number.isFinite(budget) && budget > 0
      ? `${budget.toLocaleString('ko-KR')}P`
      : '협의',
    title: request.title || '제목 미등록 서비스 요청',
    meta: regionAndDate,
    bidLabel: request.categoryName || '서비스',
    quotes: request.quoteCount,
    ddayLabel: request.statusName || null,
  };
};
