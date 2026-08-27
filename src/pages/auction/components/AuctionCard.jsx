import { Link, useLocation } from 'react-router-dom';
import { Truck, UserRound } from 'lucide-react';
import { toImageUrl } from '@api/fileApi';
import { CategoryTag } from '@components/common/ui';
import useCountdown from '@hooks/useCountdown';
import { formatPoint } from '@utils/common';
import {
  resolveAuctionResultLabel,
  resolveTradeMethodLabel,
} from '../utils/auctionFormatters';

const formatAuctionCardTimeLabel = (item, now) => {
  const resultLabel = resolveAuctionResultLabel(item);
  if (resultLabel) return resultLabel;
  if (!item.endDateTime) return '남은 시간 -';

  const end = new Date(item.endDateTime);
  const diffMs = Math.max(end.getTime() - now, 0);

  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `남은 시간 ${days}일 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  if (hours > 0) return `남은 시간 ${hours}시간 ${minutes}분`;
  return `남은 시간 ${totalMinutes}분`;
};

const AuctionCard = ({ item }) => {
  const location = useLocation();
  const isCountingDown = Boolean(
    item.endDateTime && item.auctionStatusCode === 'AUCC0002',
  );
  const now = useCountdown(isCountingDown);
  const imageUrl = toImageUrl(item.thumbnailPath);
  const auctionResultLabel = resolveAuctionResultLabel(item);
  const isWinningAuction = item.auctionStatusCode === 'AUCC0003';
  const remainingTime = formatAuctionCardTimeLabel(item, now);
  const instantBuyPrice = Number(item.instantBuyPrice || 0);
  const hasInstantBuyPrice = Number.isFinite(instantBuyPrice) && instantBuyPrice > 0;
  const isTimeExpired = item.auctionStatusCode !== 'AUCC0002'
    || !item.endDateTime
    || new Date(item.endDateTime).getTime() <= now
    || Boolean(auctionResultLabel);
  const returnPath = `${location.pathname}${location.search}${location.hash}`;

  return (
    <Link
      className="flex min-h-[410px] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-[#f0efec] bg-white p-5 text-body-sm text-inherit no-underline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.1)] max-md:min-h-0 md:text-body-md"
      to={`/auction/${item.auctionId}`}
      state={{ from: returnPath }}
    >
      <div className="flex h-[210px] items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#e8f0fe,#f8f8f6)] text-[#5f5e5a]">
        {imageUrl ? (
          <img className="block size-full object-cover" src={imageUrl} alt={item.title} />
        ) : (
          <span className="inline-flex size-24 items-center justify-center rounded-full bg-white/60 text-body-sm font-extrabold">
            {item.categoryName || '경매'}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 max-sm:flex-col max-sm:gap-1.5">
        <strong className="min-w-0 overflow-hidden text-body-md font-bold text-[#1a1a18] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] md:text-body-lg">
          {item.title}
        </strong>
        <CategoryTag className="shrink-0" tone="neutral">
          {item.categoryName}
        </CategoryTag>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong className="whitespace-nowrap text-h3 font-extrabold text-primary-dark">
          {formatPoint(item.currentPrice)}
        </strong>
        {!isWinningAuction && hasInstantBuyPrice && (
          <span className="whitespace-nowrap text-caption font-semibold text-[#85847f]">
            / {formatPoint(instantBuyPrice)}
          </span>
        )}
      </div>
      <dl className="mt-2 mb-3.5 grid grid-cols-2 gap-2 text-caption text-[#5f5e5a]">
        <div className="min-w-0 rounded-lg bg-[#f8f8f6] px-2.5 py-2">
          <dt className="mb-1 flex items-center gap-1 text-caption font-bold text-[#85847f]">
            <UserRound size={13} aria-hidden="true" />
            판매자
          </dt>
          <dd className="m-0 truncate font-semibold text-[#3f3f3c]">
            {item.sellerName || '정보 없음'}
          </dd>
        </div>
        <div className="min-w-0 rounded-lg bg-[#f8f8f6] px-2.5 py-2">
          <dt className="mb-1 flex items-center gap-1 text-caption font-bold text-[#85847f]">
            <Truck size={13} aria-hidden="true" />
            거래 방식
          </dt>
          <dd className="m-0 truncate font-semibold text-[#3f3f3c]">
            {resolveTradeMethodLabel(item.tradeMethodCode, item.tradeMethodName)}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#f0efec] pt-3.5 max-sm:flex-col max-sm:items-stretch">
        <span className="text-caption font-semibold text-[#5f5e5a]">
          입찰 {item.bidCount ?? 0}회
        </span>
        <strong
          className={`inline-flex min-h-9 w-44 max-w-full items-center justify-center rounded-lg border px-3 text-center text-caption font-bold whitespace-nowrap tabular-nums max-md:w-auto max-md:min-w-[152px] max-sm:w-full max-sm:min-w-0 max-sm:px-2 max-sm:text-[13px] max-sm:whitespace-normal ${
            isTimeExpired
              ? 'border-[#d8d8d8] bg-[#f1f1f1] text-[#7a7a7a]'
              : 'border-[#c9ddff] bg-primary-light text-primary-dark'
          }`}
        >
          {remainingTime}
        </strong>
      </div>
    </Link>
  );
};

export default AuctionCard;
