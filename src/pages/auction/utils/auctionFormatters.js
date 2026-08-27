import { toImageUrl } from '@api/fileApi';

const AUCTION_STATUS = {
  READY: 'AUCC0001',
  ACTIVE: 'AUCC0002',
  ENDED: 'AUCC0003',
  FAILED: 'AUCC0004',
  CANCELLED: 'AUCC0005',
  CANCELLATION_REQUESTED: 'AUCC0006',
};

const DETAIL_SECOND_THRESHOLD = 10 * 60;
const BOTH_TRADE_METHOD_CODE = 'TRDC0015';

export const parseAmount = (value) => Number(String(value || '').replace(/[^0-9]/g, '')) || 0;

export const resolveTradeMethodLabel = (tradeMethodCode, tradeMethodName) => (
  tradeMethodCode === BOTH_TRADE_METHOD_CODE
    ? '배송, 직거래'
    : (tradeMethodName || '정보 없음')
);

export const createImageItems = (images = []) => images.map((image, index) => ({
  id: image.imageId || `image-${index}`,
  url: toImageUrl(image.path),
  alt: image.originalName || `상품 이미지 ${index + 1}`,
  representative: image.representative,
})).filter((image) => image.url);

export const resolveAuctionResultLabel = (auction) => {
  const statusCode = auction?.auctionStatusCode;

  if (statusCode === AUCTION_STATUS.ENDED) return '낙찰';
  if (statusCode === AUCTION_STATUS.FAILED) return '유찰';
  if (statusCode === AUCTION_STATUS.CANCELLED) return '취소';
  if (statusCode === AUCTION_STATUS.CANCELLATION_REQUESTED) return '취소 요청';
  if (statusCode === AUCTION_STATUS.READY) return auction.auctionStatusName || '준비';
  return null;
};

export const formatTimeUntil = (dateTime, now = Date.now()) => {
  if (!dateTime) return '-';

  const targetTimestamp = new Date(dateTime).getTime();
  if (!Number.isFinite(targetTimestamp)) return '-';

  const diffMs = Math.max(targetTimestamp - now, 0);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (totalSeconds <= DETAIL_SECOND_THRESHOLD) {
    const totalMinutes = Math.floor(totalSeconds / 60);
    return `${totalMinutes}분 ${seconds}초`;
  }
  if (days > 0) return `${days}일 ${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
};

export const formatRemainingTime = (auction, now = Date.now()) => {
  const resultLabel = resolveAuctionResultLabel(auction);
  if (resultLabel) return resultLabel;
  return formatTimeUntil(auction?.endDateTime, now);
};
