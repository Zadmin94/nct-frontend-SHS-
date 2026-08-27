import { Flag, Heart, MapPin } from 'lucide-react';
import { formatNumber, formatPoint } from '@utils/common';
import { resolveTradeMethodLabel } from '../utils/auctionFormatters';
import {
  ActionButton,
  CategoryTag,
  DomainStatus,
  StatusBadge,
} from '@components/common/ui';

const BID_UNIT_MULTIPLIERS = [1, 5, 10];
const AUCTION_STATUS = {
  ENDED: 'AUCC0003',
  FAILED: 'AUCC0004',
  CANCELLED: 'AUCC0005',
  CANCELLATION_REQUESTED: 'AUCC0006',
};
const AUCTION_STATUS_TONE = {
  AUCC0001: 'warning',
  AUCC0002: 'info',
  AUCC0003: 'success',
  AUCC0004: 'neutral',
  AUCC0005: 'danger',
  AUCC0006: 'warning',
  AUCC0013: 'warning',
  AUCC9001: 'warning',
};

const resolveClosedAuctionContent = (statusCode, isCurrentHighestBidder) => {
  if (statusCode === AUCTION_STATUS.ENDED) {
    return isCurrentHighestBidder
      ? {
          title: '낙찰되었습니다',
          description: '거래 내역에서 후속 절차를 확인해 주세요.',
        }
      : {
          title: '경매가 종료되었습니다',
          description: '입찰과 즉시구매가 모두 종료되었습니다.',
        };
  }
  if (statusCode === AUCTION_STATUS.FAILED) {
    return {
      title: '유찰된 경매입니다',
      description: '유효한 낙찰자가 없어 경매가 종료되었습니다.',
    };
  }
  if (statusCode === AUCTION_STATUS.CANCELLED) {
    return {
      title: '취소된 경매입니다',
      description: '판매자 또는 관리자 처리로 경매가 취소되었습니다.',
    };
  }
  if (statusCode === AUCTION_STATUS.CANCELLATION_REQUESTED) {
    return {
      title: '취소 요청 처리 중입니다',
      description: '관리자 검토가 완료될 때까지 입찰할 수 없습니다.',
    };
  }
  if (statusCode === 'AUCC0013' || statusCode === 'AUCC9001') {
    return {
      title: '경매가 일시정지되었습니다',
      description: '운영 확인이 끝나면 기존 진행 상태와 남은 시간을 기준으로 다시 시작됩니다.',
    };
  }
  return {
    title: '경매 종료 처리 중입니다',
    description: '낙찰 결과를 처리하고 있습니다. 잠시 후 다시 확인해 주세요.',
  };
};

const AuctionBidPanel = ({
  auction,
  currentPrice,
  bidUnitPrice,
  remainingTime,
  remainingTimeLabel,
  selectedTradeName,
  selectedTradeMethodCode,
  isMixedTradeMethod,
  showTradeMethodError,
  displayedBidAmount,
  holdAgreed,
  requiresBidHoldConsent,
  showHoldConsentError,
  isBidPending,
  isTradeMethodChangePending,
  isBuyNowPending,
  isAuctionOpen,
  isAuctionReady,
  isOwnAuction,
  isCurrentHighestBidder,
  hasTradeMethodChange,
  isBuyNowAvailable,
  isAuthenticated,
  isAuthLoading,
  isBidderRole,
  availablePoint,
  hasAvailablePoint,
  isPointBalanceLoading,
  isPointBalanceError,
  isBidPointSufficient,
  isBidAmountUnitValid,
  isInstantBuyAmountSelected,
  hasBidAmountSelection,
  isBuyNowPointSufficient,
  isDeliveryAddressChecking,
  requiresDeliveryAddressRegistration,
  selectedDeliveryAddressLabel,
  isFavoritePending,
  onBidInputChange,
  onBidInputBlur,
  onBidMultiplierSelect,
  onHoldAgreedChange,
  onTradeMethodChange,
  onBidSubmit,
  onTradeMethodChangeSubmit,
  onBuyNowOpen,
  onDeliveryAddressOpen,
  onFavoriteToggle,
  onReportOpen,
  onChargeClick,
  onTradeDetailOpen,
  readOnly = false,
}) => {
  const isBidPointInsufficient = hasAvailablePoint && !isBidPointSufficient;
  const isBuyNowPointInsufficient = hasAvailablePoint && !isBuyNowPointSufficient;
  const showBidAmountUnitError = hasBidAmountSelection && !isBidAmountUnitValid;
  const showDeliveryAddressGate = isDeliveryAddressChecking
    || requiresDeliveryAddressRegistration;
  const favoriteButtonStateClass = isAuthLoading || !isAuthenticated || isOwnAuction
    ? 'cursor-not-allowed opacity-45'
    : 'cursor-pointer active:scale-[0.96]';
  const pointBalanceLabel = !isAuthenticated
    ? '-'
    : (hasAvailablePoint
      ? `${formatNumber(availablePoint)}P`
      : (isPointBalanceLoading
        ? '조회 중'
        : (isPointBalanceError ? '확인 불가' : '-')));
  const currentPriceLabel = formatPoint(currentPrice);
  const currentPriceSize = `${100 / Math.max(currentPriceLabel.length * 0.62, 1)}cqi`;
  const remainingTimeSize = `${100 / Math.max(String(remainingTime).length * 0.66, 1)}cqi`;
  const isEndedAuction = auction.auctionStatusCode === AUCTION_STATUS.ENDED;
  const closedAuctionContent = resolveClosedAuctionContent(
    auction.auctionStatusCode,
    isCurrentHighestBidder,
  );
  const isCurrentHighestTradeMethodControl = isAuctionOpen
    && isCurrentHighestBidder
    && isMixedTradeMethod
    && !isInstantBuyAmountSelected;
  const isPrimaryActionPending = isCurrentHighestTradeMethodControl
    ? isTradeMethodChangePending
    : isBidPending;
  const isPrimaryActionDisabled = isCurrentHighestTradeMethodControl
    ? (!isAuctionOpen || !hasTradeMethodChange || isTradeMethodChangePending)
    : (!isAuctionOpen
      || (isCurrentHighestBidder && !isInstantBuyAmountSelected)
      || isBidPending
      || isBidPointInsufficient
      || !isBidAmountUnitValid);
  const resolvePrimaryActionLabel = () => {
    if (!isAuctionOpen) return isEndedAuction && isCurrentHighestBidder ? '낙찰 완료' : '입찰 종료';
    if (isCurrentHighestTradeMethodControl) {
      if (!hasTradeMethodChange) return '최고입찰 중';
      return `${selectedTradeName}으로 변경${isTradeMethodChangePending ? ' 중' : ''}`;
    }
    if (isInstantBuyAmountSelected) {
      return isBidPointInsufficient ? '포인트 부족' : '즉시구매';
    }
    if (isCurrentHighestBidder) return '최고입찰 중';
    if (isBidPointInsufficient) return '포인트 부족';
    if (!isBidAmountUnitValid) {
      return hasBidAmountSelection ? '입찰 단위 확인' : '입찰 금액 선택';
    }
    return isBidPending ? '입찰 중' : '입찰하기';
  };
  const primaryActionLabel = resolvePrimaryActionLabel();

  return (
    <aside className="grid min-h-[452px] content-start gap-[16px] rounded-lg border border-[#e8e8e8] bg-white px-[38px] pt-[28px] pb-[30px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)] max-lg:min-h-0 max-lg:px-[22px] max-lg:py-7">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DomainStatus
            className="!h-7 !gap-1.5 !px-3 !text-[14px]"
            tone={AUCTION_STATUS_TONE[auction.auctionStatusCode] ?? 'neutral'}
            variant="soft"
          >
            {auction.auctionStatusName || '진행중'}
          </DomainStatus>
          {auction.tradeMethodName && (
            <CategoryTag
              className="!h-7 !gap-1.5 !px-3 !text-[14px]"
              tone="info"
              variant="outline"
            >
              {resolveTradeMethodLabel(auction.tradeMethodCode, auction.tradeMethodName)}
            </CategoryTag>
          )}
          <StatusBadge
            aria-hidden={!isCurrentHighestBidder}
            className={`transition-opacity ${
              isCurrentHighestBidder ? 'visible opacity-100' : 'invisible opacity-0'
            }`}
            live={isCurrentHighestBidder}
            tone="success"
            variant="soft"
          >
            {isEndedAuction ? '낙찰자' : '최고입찰자'}
          </StatusBadge>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-2">
          <button
            className={`inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full border px-3 py-0.5 text-[13px] leading-[1.4] font-bold transition-[border-color,background-color,color,transform] duration-300 ease-out ${favoriteButtonStateClass} ${
              auction.favorite
                ? 'border-[#f6c6d2] bg-[#fff0f4] text-[#c0184a]'
                : 'border-[#dadada] bg-white text-[#666]'
            }`}
            type="button"
            aria-pressed={Boolean(auction.favorite)}
            aria-busy={isFavoritePending}
            disabled={isAuthLoading || !isAuthenticated || isOwnAuction}
            title={isOwnAuction
              ? '본인 경매 상품은 관심 상품으로 등록할 수 없습니다'
              : (isAuthLoading
                ? '로그인 정보를 확인하는 중입니다'
                : (!isAuthenticated ? '로그인 후 관심 상품을 등록할 수 있습니다' : undefined))}
            onClick={onFavoriteToggle}
          >
            <span
              className={`inline-grid size-4 place-items-center transition-transform duration-300 ease-out ${
                auction.favorite ? 'scale-110' : 'scale-100'
              }`}
              aria-hidden="true"
            >
              <Heart
                size={14}
                className={`transition-[fill,stroke] duration-300 ease-out ${
                  auction.favorite ? 'fill-current' : 'fill-transparent'
                }`}
              />
            </span>
            관심
          </button>
          <button
            className={`inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full border border-[#dadada] bg-white px-3 py-0.5 text-[13px] leading-[1.4] font-bold text-[#666] transition-colors ${
              isAuthLoading || isOwnAuction
                ? 'cursor-not-allowed opacity-45'
                : 'cursor-pointer hover:border-[#999] hover:text-[#1d1d1f]'
            }`}
            type="button"
            disabled={isAuthLoading || isOwnAuction}
            title={isOwnAuction ? '본인 경매 상품은 신고할 수 없습니다' : '경매 상품 신고'}
            onClick={onReportOpen}
          >
            <Flag size={14} aria-hidden="true" />
            신고
          </button>
          </div>
        )}
      </div>

      <h1 className="m-0 break-words text-h2 font-bold text-[#1d1d1f] [overflow-wrap:anywhere] md:text-h1">
        {auction.title}
      </h1>

      <div className="grid items-stretch gap-4 xl:h-96 xl:grid-cols-[minmax(0,1.03fr)_minmax(280px,0.82fr)]">
        <section className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-3 xl:h-full" aria-label="경매 현황">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid min-h-[106px] content-center rounded-lg border border-[#e8e8e8] bg-white px-5 py-4 [container-type:inline-size]">
              <p className="mt-0 mb-2 text-body-md font-bold text-[#3f3f46]">
                {isAuctionReady ? '경매 시작가' : (isEndedAuction ? '낙찰가' : '현재 최고가')}
              </p>
              <p
                className="m-0 max-w-full whitespace-nowrap font-bold leading-tight text-primary-dark tabular-nums"
                id="currentPrice"
                style={{ fontSize: `clamp(1rem, ${currentPriceSize}, 2rem)` }}
              >
                {currentPriceLabel}
              </p>
            </div>

            <div className="grid min-h-[106px] content-center rounded-lg border border-[#e8e8e8] bg-white px-5 py-4 [container-type:inline-size]">
              <p className="m-0 grid gap-[7px] leading-[1.1]" id="countdown">
                <span
                  className={`text-body-md font-bold ${
                    isAuctionOpen || isAuctionReady ? 'text-[#3f3f46]' : 'text-[#8a8a8a]'
                  }`}
                  id="countdownLabel"
                >
                  {remainingTimeLabel}
                </span>
                <span
                  className={`max-w-full whitespace-nowrap font-bold leading-tight tabular-nums ${
                    isAuctionOpen || isAuctionReady ? 'text-[#1d1d1f]' : 'text-[#8a8a8a]'
                  }`}
                  id="countdownValue"
                  style={{ fontSize: `clamp(1rem, ${remainingTimeSize}, 2rem)` }}
                >
                  {remainingTime}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="grid min-h-12 content-center gap-0.5 rounded-lg border border-[#e8e8e8] bg-white px-2 py-[7px] text-center">
              <span className="text-caption font-medium text-[#666]">입찰횟수</span>
              <strong className="text-body-md text-primary-dark">{auction.bidCount || 0}회</strong>
            </div>
            <div className="grid min-h-12 content-center gap-0.5 rounded-lg border border-[#e8e8e8] bg-white px-2 py-[7px] text-center">
              <span className="text-caption font-medium text-[#666]">관심인원</span>
              <strong className="text-body-md text-primary-dark">{formatNumber(auction.favoriteCount)}명</strong>
            </div>
            <div className="grid min-h-12 content-center gap-0.5 rounded-lg border border-[#e8e8e8] bg-white px-2 py-[7px] text-center">
              <span className="text-caption font-medium text-[#666]">조회수</span>
              <strong className="text-body-md text-primary-dark">{formatNumber(auction.viewCount)}회</strong>
            </div>
          </div>

          <div className="grid grid-rows-[40px_auto] content-start rounded-lg border border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
            {readOnly ? (
              <div className="flex min-h-10 items-center justify-between gap-4">
                <span className="text-caption font-bold text-[#666]">거래 방식</span>
                <strong className="min-w-0 max-w-[72%] truncate text-body-sm text-[#1d1d1f]">
                  {selectedTradeName}
                </strong>
              </div>
            ) : isMixedTradeMethod ? (
              <div className={`flex min-h-10 items-center justify-between gap-3 rounded-md transition-colors ${
                showTradeMethodError
                  ? 'bg-[#fff4f3] outline outline-1 outline-[#f0aaa4] outline-offset-2'
                  : ''
              }`}>
                <span className={`text-caption font-bold ${showTradeMethodError ? 'text-[#b42318]' : 'text-[#666]'}`}>
                  거래 방식
                </span>
                <div className="flex w-full max-w-[305px] items-center justify-end gap-1.5">
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5" role="group" aria-label="거래 방식 선택">
                    {[
                      { code: 'TRDC0009', label: '배송' },
                      { code: 'TRDC0010', label: '직거래' },
                    ].map((method) => {
                      const selected = selectedTradeMethodCode === method.code;
                      return (
                        <button
                          className={`min-h-8 cursor-pointer rounded-md border px-3 text-caption font-bold transition-colors ${
                            selected
                              ? 'border-primary bg-primary-light text-primary-dark'
                              : (showTradeMethodError
                                ? 'border-[#e58d86] bg-white text-[#b42318]'
                                : 'border-[#dadada] bg-white text-[#666] hover:border-primary hover:text-primary-dark')
                          }`}
                          key={method.code}
                          type="button"
                          aria-pressed={selected}
                          disabled={!isAuctionOpen || isTradeMethodChangePending}
                          onClick={() => onTradeMethodChange(method.code)}
                        >
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    aria-label="배송지 설정"
                    className={`inline-flex min-h-8 min-w-[72px] shrink-0 items-center justify-center gap-1 rounded-md border px-2 text-caption font-bold transition-colors ${
                      selectedTradeMethodCode === 'TRDC0009' && isAuthenticated && !isOwnAuction
                        ? 'border-[#dadada] bg-white text-[#555] hover:border-primary hover:text-primary-dark'
                        : 'cursor-not-allowed border-[#e4e4e4] bg-[#f4f4f4] text-[#aaa]'
                    }`}
                    disabled={!isAuctionOpen
                      || isTradeMethodChangePending
                      || !isAuthenticated
                      || isOwnAuction
                      || selectedTradeMethodCode !== 'TRDC0009'}
                    onClick={onDeliveryAddressOpen}
                    title={isOwnAuction
                      ? '본인 경매 상품에서는 배송지를 설정할 수 없습니다'
                      : selectedTradeMethodCode === 'TRDC0009'
                      ? (selectedDeliveryAddressLabel || '배송지 선택')
                      : '배송을 선택하면 배송지를 설정할 수 있습니다'}
                    type="button"
                  >
                    <MapPin aria-hidden="true" size={14} />
                    배송지
                  </button>
                </div>
                {showTradeMethodError && (
                  <span className="sr-only" role="alert">배송 또는 직거래 방식을 선택해 주세요</span>
                )}
              </div>
            ) : (
              <div className="flex min-h-10 items-center justify-between gap-4">
                <span className="text-caption font-bold text-[#666]">거래 방식</span>
                <div className="flex min-w-0 max-w-[72%] items-center justify-end gap-2">
                  <strong
                    className="min-w-0 truncate text-body-sm text-[#1d1d1f]"
                    title={selectedTradeMethodCode === 'TRDC0009' && isAuthenticated && !isOwnAuction
                      ? (selectedDeliveryAddressLabel || '선택된 배송지 없음')
                      : selectedTradeName}
                  >
                    {selectedTradeMethodCode === 'TRDC0009' && isAuthenticated && !isOwnAuction
                      ? (isDeliveryAddressChecking
                        ? '배송지 확인 중'
                        : (selectedDeliveryAddressLabel || '선택된 배송지 없음'))
                      : selectedTradeName}
                  </strong>
                  {selectedTradeMethodCode === 'TRDC0009' && (
                    <button
                      className={`inline-flex min-h-8 min-w-[72px] shrink-0 items-center justify-center gap-1 rounded-md border px-2 text-caption font-bold transition-colors ${
                        isAuthenticated && isAuctionOpen && !isOwnAuction
                          ? 'border-[#dadada] bg-white text-[#555] hover:border-primary hover:text-primary-dark'
                          : 'cursor-not-allowed border-[#e4e4e4] bg-[#f4f4f4] text-[#aaa]'
                      }`}
                      disabled={!isAuthenticated || !isAuctionOpen || isOwnAuction || isDeliveryAddressChecking}
                      onClick={onDeliveryAddressOpen}
                      title={isOwnAuction
                        ? '본인 경매 상품에서는 배송지를 설정할 수 없습니다'
                        : (selectedDeliveryAddressLabel || '배송지 선택')}
                      type="button"
                    >
                      <MapPin aria-hidden="true" size={14} />
                      배송지
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="mt-6 border-t border-[#e8e8e8] pt-6">
              <p className="m-0 text-caption font-bold text-[#666]">안내사항</p>
              <ul className="mt-2 mb-0 list-disc space-y-1 pl-4 text-caption text-[#666]">
                <li>마감 10분 이내 유효 입찰 시 종료 시간이 자동 연장됩니다.</li>
                <li>완료된 입찰은 취소할 수 없으니 금액을 확인해 주세요.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border border-[#e8e8e8] bg-white px-5 py-3 xl:h-full" aria-label="입찰 및 즉시구매">
          {readOnly ? (
            <div className="grid min-h-36 flex-1 place-items-center content-center gap-2 px-4 text-center" role="status">
              <strong className="text-h3 font-bold text-[#1d1d1f]">관리자 읽기 전용</strong>
              <span className="text-body-sm leading-6 text-[#666] md:text-body-md">
                이 화면에서는 입찰 및 구매 기능을 사용할 수 없습니다.
              </span>
            </div>
          ) : isAuctionReady ? (
            <div className="grid min-h-36 flex-1 place-items-center content-center gap-2 text-center text-[#1d1d1f]" role="status">
              <strong className="text-h3 font-bold">경매 시작 전입니다</strong>
              <span className="text-body-sm text-[#666] md:text-body-md">입찰과 즉시구매는 경매가 시작되면 이용할 수 있습니다.</span>
            </div>
          ) : isAuthLoading ? (
            <div className="grid min-h-36 flex-1 place-items-center text-body-md font-bold text-[#666]" role="status">
              로그인 정보를 확인하는 중입니다.
            </div>
          ) : !isAuctionOpen ? (
            <div className="grid min-h-36 flex-1 place-items-center px-3 text-center text-[#1d1d1f]" role="status">
              <div className="grid max-w-[320px] gap-2">
                <DomainStatus
                  className="mx-auto"
                  tone={AUCTION_STATUS_TONE[auction.auctionStatusCode] ?? 'neutral'}
                  variant="soft"
                >
                  {auction.auctionStatusName || '종료'}
                </DomainStatus>
                <strong className="text-h3 font-bold text-[#1d1d1f]">{closedAuctionContent.title}</strong>
                <p className="m-0 text-body-sm leading-6 text-[#666] md:text-body-md">
                  {closedAuctionContent.description}
                </p>
                {Number(auction.tradeId) > 0 && (isOwnAuction || isCurrentHighestBidder) ? (
                  <ActionButton
                    className="mt-2"
                    onClick={onTradeDetailOpen}
                  >
                    거래 상세 보기
                  </ActionButton>
                ) : (
                  isEndedAuction && isCurrentHighestBidder && (
                    <span className="mt-1 text-caption font-bold text-[#666]">거래 생성 중</span>
                  )
                )}
              </div>
            </div>
          ) : isOwnAuction ? (
            <div className="grid min-h-36 flex-1 place-items-center text-h3 font-bold text-primary-dark" role="status">
              본인 경매 상품
            </div>
          ) : isAuthenticated && !isBidderRole ? (
            <div className="grid min-h-36 flex-1 place-items-center px-3 text-center text-body-md font-bold text-[#666]" role="status">
              입찰과 즉시구매는 일반회원 모드에서 이용할 수 있습니다.
            </div>
          ) : (
            <>
              <div className="mb-1.5 grid gap-2">
                <label className="text-body-md font-bold text-[#666]" htmlFor="bidAmount">입찰 금액</label>
                <input
                  className="min-h-11 w-full rounded-lg border border-[#dadada] bg-white px-3.5 text-body-md text-[#1d1d1f] outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-[#f3f3f3]"
                  id="bidAmount"
                  type="text"
                  inputMode="numeric"
                  value={displayedBidAmount}
                  disabled={!isAuctionOpen || isCurrentHighestBidder}
                  aria-invalid={showBidAmountUnitError}
                  aria-describedby={showBidAmountUnitError ? 'bidAmountPolicy' : undefined}
                  onChange={onBidInputChange}
                  onBlur={onBidInputBlur}
                />
              </div>
              <div className="grid gap-1.5">
                <span className="text-caption text-[#666]">
                  입찰 단위 <strong className="ml-1 text-[#1d1d1f]">{formatPoint(bidUnitPrice)}</strong>
                </span>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="입찰 단위 배수 선택">
                  {BID_UNIT_MULTIPLIERS.map((multiplier) => (
                    <button
                      className="min-h-10 min-w-[58px] cursor-pointer rounded-lg border border-[#dadada] bg-white text-body-sm font-bold text-[#1d1d1f] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      key={multiplier}
                      disabled={!isAuctionOpen || isCurrentHighestBidder}
                      aria-label={`현재가에 입찰 단위 ${multiplier}배 추가`}
                      onClick={() => onBidMultiplierSelect(multiplier)}
                    >
                      +{formatNumber(bidUnitPrice * multiplier)}
                    </button>
                  ))}
                </div>
              </div>
              <p
                aria-hidden={!showBidAmountUnitError}
                className={`mt-1 mb-0 min-h-5 text-caption text-[#b42318] transition-opacity ${
                  showBidAmountUnitError ? 'visible opacity-100' : 'invisible opacity-0'
                }`}
                id="bidAmountPolicy"
                role={showBidAmountUnitError ? 'alert' : undefined}
              >
                {formatPoint(bidUnitPrice)} 단위에 맞는 금액을 입력해 주세요
              </p>
              <div className="grid min-h-7 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 text-caption text-[#666]">
                <span>사용 가능 포인트</span>
                <strong className={`text-body-md ${isBidPointInsufficient ? 'text-[#b42318]' : 'text-[#1d1d1f]'}`}>
                  {pointBalanceLabel}
                </strong>
                {isAuthenticated && (
                  <button className="font-bold text-primary-dark underline underline-offset-3" type="button" onClick={onChargeClick}>
                    충전
                  </button>
                )}
              </div>

              {!isAuthenticated ? (
                <p className="mt-16 mb-0 flex min-h-12 items-center justify-center text-center text-body-md font-bold text-[#666] max-lg:mt-8" role="status">
                  로그인이 필요한 서비스입니다.
                </p>
              ) : (
                <div className="mt-auto grid gap-1.5 pt-2">
                  {showDeliveryAddressGate ? (
                    <>
                      {requiresBidHoldConsent && (
                        <span aria-hidden="true" className="mb-0.5 min-h-[38px]" />
                      )}
                      <ActionButton
                        loading={isDeliveryAddressChecking}
                        onClick={isDeliveryAddressChecking ? undefined : onDeliveryAddressOpen}
                        size="lg"
                      >
                        {isDeliveryAddressChecking ? '배송지 확인 중' : '배송지 등록'}
                      </ActionButton>
                      <span aria-hidden="true" className="min-h-[46px]" />
                    </>
                  ) : (
                    <>
                      {requiresBidHoldConsent && (
                        <label className={`mb-0.5 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-caption transition-colors ${
                          showHoldConsentError
                            ? 'border-[#f0aaa4] bg-[#fff4f3] font-bold text-[#b42318]'
                            : 'border-transparent text-[#666]'
                        }`}>
                          <input
                            className="size-4 accent-primary"
                            id="holdAgree"
                            type="checkbox"
                            checked={holdAgreed}
                            disabled={!isAuctionOpen}
                            aria-invalid={showHoldConsentError}
                            onChange={(event) => onHoldAgreedChange(event.target.checked)}
                          />
                          입찰 포인트 홀딩에 동의합니다
                        </label>
                      )}
                      <ActionButton
                        id="bidBtn"
                        aria-busy={isPrimaryActionPending}
                        disabled={isPrimaryActionDisabled}
                        loading={isPrimaryActionPending}
                        size="lg"
                        onClick={isCurrentHighestTradeMethodControl
                          ? onTradeMethodChangeSubmit
                          : onBidSubmit}
                      >
                        {primaryActionLabel}
                      </ActionButton>
                      {!isInstantBuyAmountSelected && (
                        <ActionButton
                          id="buyNowBtn"
                          aria-busy={isBuyNowPending}
                          disabled={!isBuyNowAvailable || isBuyNowPending || isBuyNowPointInsufficient}
                          loading={isBuyNowPending}
                          onClick={onBuyNowOpen}
                          size="lg"
                          tone="outline"
                        >
                          {!isAuctionOpen
                            ? '즉시구매 종료'
                            : (isBuyNowPointInsufficient
                              ? '포인트 부족'
                              : (isBuyNowAvailable
                                ? `즉시구매 ${formatPoint(auction.instantBuyPrice)}`
                                : '즉시구매 불가'))}
                        </ActionButton>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </aside>
  );
};

export default AuctionBidPanel;
