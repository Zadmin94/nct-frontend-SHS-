import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addAuctionFavorite,
  buyNowAuction,
  changeMyAuctionBidTradeMethod,
  fetchAuctionDetail,
  fetchAuctionFavoriteStatus,
  placeAuctionBid,
  removeAuctionFavorite,
} from '@api/auctionApi';
import { createDeliveryAddress } from '@api/memberApi';
import { useAuth } from '@hooks/useAuth';
import { useAuctionStream } from '@hooks/useAuctionStream';
import { useAuctionViewTracking } from '@hooks/useAuctionViewTracking';
import useCountdown from '@hooks/useCountdown';
import useBodyScrollLock from '@hooks/useBodyScrollLock';
import { usePointBalance } from '@hooks/usePoint';
import {
  DELIVERY_ADDRESSES_QUERY_KEY,
  useDeliveryAddresses,
} from '@hooks/useDeliveryAddresses';
import { getUserReviewTrust } from '@api/reviewApi';
import {
  SITE_HEADER_DOCK_EVENT,
  SITE_HEADER_VISIBILITY_EVENT,
} from '@/constants/layoutEvents';
import { getMyPagePath } from '@/routes/myPageRoutes';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import HeaderSearchPortal, {
  SimpleHeaderSearch,
} from '@components/common/HeaderSearchPortal';
import ImageLightbox from '@components/common/ImageLightbox';
import ReportModal from '@components/common/ReportModal';
import PointChargeWidgetModal from '@pages/user/point/components/PointChargeWidgetModal';
import AuctionBidPanel from './components/AuctionBidPanel';
import AuctionBuyNowModal from './components/AuctionBuyNowModal';
import AuctionDeliveryAddressModal from './components/AuctionDeliveryAddressModal';
import AuctionImageGallery, { AuctionPreviewRail } from './components/AuctionImageGallery';
import {
  AuctionProductDescriptionSection,
  AuctionSellerInformationSection,
} from './components/AuctionInfoGrid';
import AuctionInquirySection from './components/AuctionInquirySection';
import AuctionProductUpdateSection from './components/AuctionProductUpdateSection';
import AuctionSellerHistory from './components/AuctionSellerHistory';
import AuctionSellerReviewDialog from './components/AuctionSellerReviewDialog';
import Toast from '@components/common/Toast';
import {
  createImageItems,
  formatRemainingTime,
  formatTimeUntil,
  parseAmount,
  resolveAuctionResultLabel,
} from './utils/auctionFormatters';
import { formatNumber, formatPoint } from '@utils/common';

const DETAIL_PAGE_CLASS = 'bg-white pb-14 text-[#1d1d1f]';
const DETAIL_CONTAINER_CLASS = 'mx-auto w-[calc(100%_-_52px)] max-w-[1600px] max-lg:w-[calc(100%_-_32px)] max-sm:w-[calc(100%_-_24px)]';
const DETAIL_EMPTY_CLASS = 'grid min-h-[340px] place-content-center justify-items-center gap-2.5 rounded-lg border border-[#e8e8e8] bg-[#f8f8f6] p-7 text-center';
const DELIVERY_TRADE_METHOD_CODE = 'TRDC0009';
const OFFLINE_TRADE_METHOD_CODE = 'TRDC0010';
const BOTH_TRADE_METHOD_CODE = 'TRDC0015';
const FAVORITE_SYNC_DELAY_MS = 300;
const DETAIL_SECTION_ITEMS = [
  { id: 'auction-product-description', label: '상품설명' },
  { id: 'auction-product-updates', label: '변경 내역' },
  { id: 'auction-product-inquiries', label: '상품문의' },
  { id: 'auction-seller-information', label: '판매자 정보' },
];

export const AuctionDetailPageContent = ({ auctionId, embedded = false, readOnly = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading: isAuthLoading } = useAuth();
  const authenticatedUserId = user?.id ?? user?.userId ?? user?.userSn ?? user?.usrSn;
  const isBidderRole = user?.role === 'ROLE_USER';
  const [bidAmount, setBidAmount] = useState('');
  const [holdAgreed, setHoldAgreed] = useState(false);
  const [tradeMethodSelection, setTradeMethodSelection] = useState({
    auctionId: null,
    code: '',
  });
  const [deliveryAddressSelection, setDeliveryAddressSelection] = useState({
    auctionId: null,
    deliveryAddressId: null,
  });
  const [tradeMethodErrorAuctionId, setTradeMethodErrorAuctionId] = useState(null);
  const [showHoldConsentError, setShowHoldConsentError] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeDetailSectionId, setActiveDetailSectionId] = useState(
    DETAIL_SECTION_ITEMS[0].id,
  );
  const [isDetailNavigationStuck, setIsDetailNavigationStuck] = useState(false);
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);
  const [isDeliveryAddressModalOpen, setIsDeliveryAddressModalOpen] = useState(false);
  const [isSellerReviewDialogOpen, setIsSellerReviewDialogOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // 입찰 패널의 "충전" 클릭 시 마이페이지로 이동하지 않고 이 자리에서 바로 모달을 띄운다
  // (헤더 POINT 드롭다운과 같은 방식, 사용자 요청으로 변경 2026-07-28 — 이동하면 입력 중인 입찰 금액이 날아감)
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(null);
  const [imageNavigationCommand, setImageNavigationCommand] = useState(null);
  const requestedImageIndexRef = useRef(null);
  const imageNavigationIdRef = useRef(0);
  const requestedDetailSectionIdRef = useRef(null);
  const detailSectionUnlockTimerRef = useRef(null);
  const detailNavigationRef = useRef(null);
  const favoriteSyncTimerRef = useRef(null);
  const favoriteMutateRef = useRef(null);
  const favoriteRequestPendingRef = useRef(false);
  const favoriteLastInteractionAtRef = useRef(0);
  const confirmedFavoriteRef = useRef(null);
  const confirmedFavoriteCountRef = useRef(0);
  const desiredFavoriteRef = useRef(null);
  const [failedImageUrls, setFailedImageUrls] = useState(() => new Set());
  useBodyScrollLock(
    isBuyNowOpen
    || isDeliveryAddressModalOpen
    || isSellerReviewDialogOpen
    || isChargeModalOpen,
  );
  const requestedReturnPath = location.state?.from;
  const returnPath = typeof requestedReturnPath === 'string'
    && requestedReturnPath.startsWith('/')
    && !requestedReturnPath.startsWith('//')
    && !/^\/auction\/[^/?#]+(?:[/?#]|$)/.test(requestedReturnPath)
    ? requestedReturnPath
    : '/auction';
  const returnLabel = returnPath.startsWith('/auction') ? '경매 목록' : '이전 목록';
  const headerSearch = (
    <HeaderSearchPortal>
      <SimpleHeaderSearch
        onSearch={(keyword) => navigate(`/auction?keyword=${encodeURIComponent(keyword)}`)}
        placeholder="원하는 경매 상품을 검색하세요"
      />
    </HeaderSearchPortal>
  );
  const handleInquiryLoginRequired = useCallback(() => {
    navigate('/login', { state: { from: location } });
  }, [location, navigate]);
  const handleSellerReviewsOpen = useCallback(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      handleInquiryLoginRequired();
      return;
    }
    setIsSellerReviewDialogOpen(true);
  }, [handleInquiryLoginRequired, isAuthLoading, isAuthenticated]);
  const handleSellerReviewsClose = useCallback(() => {
    setIsSellerReviewDialogOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (embedded) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [auctionId, embedded]);

  const detailQueryKey = useMemo(
    () => ['auctionDetail', auctionId, authenticatedUserId ?? 'anonymous'],
    [auctionId, authenticatedUserId],
  );
  const {
    data: auction,
    isLoading,
    isError,
  } = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => fetchAuctionDetail(auctionId, { includeSupplemental: false }),
    enabled: Boolean(auctionId),
  });
  const isCurrentAuctionDetail = Boolean(
    auction?.auctionId != null
    && String(auction.auctionId) === String(auctionId),
  );
  const supplementalQueriesEnabled = Boolean(isCurrentAuctionDetail && auction?.productId);
  const sellerRatingQuery = useQuery({
    queryKey: ['reviews', 'rating', 'goods', auction?.sellerId],
    queryFn: async () => {
      const response = await getUserReviewTrust(auction.sellerId, 'goods');
      return response?.data ?? response ?? null;
    },
    enabled: Boolean(supplementalQueriesEnabled && auction?.sellerId),
  });
  const isOwnAuction = authenticatedUserId != null
    && auction?.sellerId != null
    && String(authenticatedUserId) === String(auction.sellerId);
  const isAuctionActiveStatus = auction?.auctionStatusCode === 'AUCC0002';
  const pointBalanceQuery = usePointBalance({
    enabled: Boolean(!readOnly && isAuthenticated && auction && !isOwnAuction && isAuctionActiveStatus),
    retry: 3,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const deliveryAddressesQuery = useDeliveryAddresses({
    enabled: Boolean(!readOnly && isAuthenticated),
  });
  const favoriteStatusQuery = useQuery({
    queryKey: ['auctionFavoriteStatus', auctionId],
    queryFn: () => fetchAuctionFavoriteStatus(auctionId),
    enabled: Boolean(
      auctionId
      && auction
      && !readOnly
      && isAuthenticated
      && !isOwnAuction
      && typeof auction.favorite !== 'boolean'
    ),
  });
  useAuctionStream(auctionId);
  useAuctionViewTracking(
    auctionId,
    !readOnly && isCurrentAuctionDetail ? auction?.productId : null,
  );
  const now = useCountdown(Boolean(
    (auction?.auctionStatusCode === 'AUCC0001' && auction?.startDateTime)
    || (auction?.auctionStatusCode === 'AUCC0002' && auction?.endDateTime),
  ));

  const showToast = useCallback((message) => setToastMessage(message), []);
  const handleReportOpen = useCallback(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      handleInquiryLoginRequired();
      return;
    }
    if (isOwnAuction) {
      showToast('본인이 등록한 경매 상품은 신고할 수 없습니다');
      return;
    }
    setIsReportModalOpen(true);
  }, [
    handleInquiryLoginRequired,
    isAuthLoading,
    isAuthenticated,
    isOwnAuction,
    showToast,
  ]);
  const getErrorMessage = (error) => error?.response?.data?.message || '요청 처리 중 오류가 발생했습니다';
  const openDeliveryAddressModal = () => setIsDeliveryAddressModalOpen(true);
  const deliveryAddressMutation = useMutation({
    mutationFn: createDeliveryAddress,
    onSuccess: (createdAddress) => {
      queryClient.setQueryData(DELIVERY_ADDRESSES_QUERY_KEY, (current = []) => {
        const normalized = createdAddress.defaultAddress
          ? current.map((address) => ({ ...address, defaultAddress: false }))
          : current;
        return [...normalized, createdAddress].sort((left, right) => (
          Number(right.defaultAddress) - Number(left.defaultAddress)
          || Number(left.deliveryAddressId) - Number(right.deliveryAddressId)
        ));
      });
      setDeliveryAddressSelection({
        auctionId,
        deliveryAddressId: createdAddress.deliveryAddressId,
      });
      setIsDeliveryAddressModalOpen(false);
      if (auction?.currentHighestBidder
          && auction?.myBidTradeMethodCode === DELIVERY_TRADE_METHOD_CODE) {
        tradeMethodChangeMutation.mutate({
          tradeMethod: DELIVERY_TRADE_METHOD_CODE,
          deliveryAddressId: createdAddress.deliveryAddressId,
        });
        return;
      }
      showToast('배송지가 등록되었습니다');
    },
  });
  const handleMutationSuccess = (updatedAuction) => {
    queryClient.setQueryData(detailQueryKey, updatedAuction);
    queryClient.invalidateQueries({ queryKey: ['point', 'balance'] });
    queryClient.invalidateQueries({ queryKey: ['landing-curation', 'auctions'] });
    setBidAmount('');
    setHoldAgreed(false);
    setTradeMethodErrorAuctionId(null);
    setShowHoldConsentError(false);
  };
  const handleAuctionMutationError = (error) => {
    if (error?.response?.data?.code === 'BUYER_ADDRESS_INCOMPLETE') {
      setIsBuyNowOpen(false);
      deliveryAddressMutation.reset();
      openDeliveryAddressModal();
      return;
    }
    if (error?.response?.data?.code === 'POINT_INSUFFICIENT') {
      queryClient.invalidateQueries({ queryKey: ['point', 'balance'] });
    }
    showToast(getErrorMessage(error));
  };
  const applyFavoriteStatus = useCallback((status) => {
    queryClient.setQueryData(detailQueryKey, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        favorite: status.favorite,
        favoriteCount: status.favoriteCount,
      };
    });
  }, [detailQueryKey, queryClient]);

  const runFavoriteSync = useCallback(() => {
    if (favoriteRequestPendingRef.current) return;

    const nextFavorite = desiredFavoriteRef.current;
    if (typeof nextFavorite !== 'boolean'
      || nextFavorite === confirmedFavoriteRef.current) return;

    favoriteMutateRef.current?.({ nextFavorite });
  }, []);

  const scheduleFavoriteSync = useCallback((delay = FAVORITE_SYNC_DELAY_MS) => {
    if (favoriteSyncTimerRef.current !== null) {
      window.clearTimeout(favoriteSyncTimerRef.current);
    }

    if (desiredFavoriteRef.current === confirmedFavoriteRef.current) {
      favoriteSyncTimerRef.current = null;
      return;
    }

    favoriteSyncTimerRef.current = window.setTimeout(() => {
      favoriteSyncTimerRef.current = null;
      runFavoriteSync();
    }, delay);
  }, [runFavoriteSync]);

  const bidMutation = useMutation({
    mutationFn: (payload) => placeAuctionBid(auctionId, payload),
    onSuccess: (updatedAuction) => {
      handleMutationSuccess(updatedAuction);
      showToast('입찰이 완료되었습니다.');
    },
    onError: handleAuctionMutationError,
  });
  const tradeMethodChangeMutation = useMutation({
    mutationFn: (payload) => changeMyAuctionBidTradeMethod(auctionId, payload),
    onSuccess: (updatedAuction, payload) => {
      queryClient.setQueryData(detailQueryKey, updatedAuction);
      setTradeMethodSelection({
        auctionId,
        code: updatedAuction?.myBidTradeMethodCode || payload.tradeMethod,
      });
      setDeliveryAddressSelection({
        auctionId,
        deliveryAddressId: updatedAuction?.myBidDeliveryAddressId
          ?? payload.deliveryAddressId
          ?? null,
      });
      setTradeMethodErrorAuctionId(null);
      const changedDeliveryAddressOnly = payload.tradeMethod === DELIVERY_TRADE_METHOD_CODE
        && auction?.myBidTradeMethodCode === DELIVERY_TRADE_METHOD_CODE;
      if (!changedDeliveryAddressOnly) {
        showToast(`${payload.tradeMethod === DELIVERY_TRADE_METHOD_CODE ? '배송' : '직거래'}로 변경되었습니다`);
      }
    },
    onError: handleAuctionMutationError,
  });
  const buyNowMutation = useMutation({
    mutationFn: (payload) => buyNowAuction(auctionId, payload),
    onSuccess: (updatedAuction) => {
      handleMutationSuccess(updatedAuction);
      setIsBuyNowOpen(false);
      navigate(
        updatedAuction?.tradeId
          ? `/auction/${auctionId}/trade`
          : getMyPagePath('auction-bids'),
        { replace: true },
      );
    },
    onError: handleAuctionMutationError,
  });
  const favoriteMutation = useMutation({
    mutationFn: ({ nextFavorite }) => (nextFavorite
      ? addAuctionFavorite(auctionId)
      : removeAuctionFavorite(auctionId)),
    onMutate: () => {
      favoriteRequestPendingRef.current = true;
    },
    onSuccess: (status) => {
      const confirmedFavorite = Boolean(status.favorite);
      const confirmedFavoriteCount = Number(status.favoriteCount) || 0;
      confirmedFavoriteRef.current = confirmedFavorite;
      confirmedFavoriteCountRef.current = confirmedFavoriteCount;

      if (desiredFavoriteRef.current === confirmedFavorite) {
        applyFavoriteStatus(status);
        return;
      }

      queryClient.setQueryData(detailQueryKey, (currentAuction) => (
        currentAuction
          ? {
            ...currentAuction,
            favorite: desiredFavoriteRef.current,
            favoriteCount: Math.max(
              0,
              confirmedFavoriteCount + (desiredFavoriteRef.current ? 1 : -1),
            ),
          }
          : currentAuction
      ));
    },
    onError: (error, { nextFavorite }) => {
      if (desiredFavoriteRef.current !== nextFavorite) return;

      desiredFavoriteRef.current = confirmedFavoriteRef.current;
      queryClient.setQueryData(detailQueryKey, (currentAuction) => (
        currentAuction
          ? {
            ...currentAuction,
            favorite: confirmedFavoriteRef.current,
            favoriteCount: confirmedFavoriteCountRef.current,
          }
          : currentAuction
      ));
      showToast(getErrorMessage(error));
    },
    onSettled: () => {
      favoriteRequestPendingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['auctionFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['landing-curation', 'auctions', 'popular'] });

      if (desiredFavoriteRef.current !== confirmedFavoriteRef.current) {
        const elapsed = Date.now() - favoriteLastInteractionAtRef.current;
        scheduleFavoriteSync(Math.max(0, FAVORITE_SYNC_DELAY_MS - elapsed));
      }
    },
  });

  useEffect(() => {
    favoriteMutateRef.current = favoriteMutation.mutate;
  }, [favoriteMutation.mutate]);

  useEffect(() => {
    if (typeof auction?.favorite !== 'boolean') return;
    if (favoriteSyncTimerRef.current !== null || favoriteMutation.isPending) return;

    confirmedFavoriteRef.current = auction.favorite;
    confirmedFavoriteCountRef.current = Number(auction.favoriteCount) || 0;
    desiredFavoriteRef.current = auction.favorite;
  }, [auction?.favorite, auction?.favoriteCount, favoriteMutation.isPending]);

  useEffect(() => {
    confirmedFavoriteRef.current = null;
    confirmedFavoriteCountRef.current = 0;
    desiredFavoriteRef.current = null;

    return () => {
      if (favoriteSyncTimerRef.current !== null) {
        window.clearTimeout(favoriteSyncTimerRef.current);
        favoriteSyncTimerRef.current = null;

        const pendingFavorite = desiredFavoriteRef.current;
        if (typeof pendingFavorite === 'boolean'
          && pendingFavorite !== confirmedFavoriteRef.current) {
          const syncRequest = pendingFavorite
            ? addAuctionFavorite(auctionId)
            : removeAuctionFavorite(auctionId);
          void syncRequest
            .catch(() => undefined)
            .finally(() => {
              queryClient.invalidateQueries({ queryKey: ['auctionFavorites'] });
              queryClient.invalidateQueries({ queryKey: ['landing-curation', 'auctions', 'popular'] });
            });
        }
      }
    };
  }, [auctionId, queryClient]);

  useEffect(() => {
    if (favoriteStatusQuery.data) {
      applyFavoriteStatus(favoriteStatusQuery.data);
    }
  }, [applyFavoriteStatus, favoriteStatusQuery.data]);

  useEffect(() => {
    if (embedded || !auction?.productId) return undefined;

    let animationFrameId = null;
    const updateActiveSection = () => {
      const stickyOffset = window.innerWidth < 768 ? 208 : 82;
      const navigationStickyTop = window.innerWidth < 768 ? 154 : 0;
      const activationOffset = stickyOffset + 12;
      const navigationTop = detailNavigationRef.current?.getBoundingClientRect().top;
      const navigationIsStuck = navigationTop != null
        && navigationTop <= navigationStickyTop + 1;
      setIsDetailNavigationStuck((currentValue) => (
        currentValue === navigationIsStuck ? currentValue : navigationIsStuck
      ));
      const lastSectionId = DETAIL_SECTION_ITEMS[DETAIL_SECTION_ITEMS.length - 1].id;
      const lastSection = document.getElementById(lastSectionId);
      const lastSectionActivationLine = activationOffset
        + ((window.innerHeight - activationOffset) * 0.5);
      const reachedLastSection = lastSection
        && lastSection.getBoundingClientRect().top <= lastSectionActivationLine;
      const reachedPageBottom = window.innerHeight + window.scrollY
        >= document.documentElement.scrollHeight - 2;
      const requestedSectionId = requestedDetailSectionIdRef.current;

      if (requestedSectionId) {
        setActiveDetailSectionId(requestedSectionId);
        return;
      }

      let nextSectionId = DETAIL_SECTION_ITEMS[0].id;

      if (reachedPageBottom || reachedLastSection) {
        nextSectionId = lastSectionId;
      } else {
        DETAIL_SECTION_ITEMS.forEach(({ id }) => {
          const section = document.getElementById(id);
          if (section && section.getBoundingClientRect().top <= activationOffset) {
            nextSectionId = id;
          }
        });
      }

      setActiveDetailSectionId((currentSectionId) => (
        currentSectionId === nextSectionId ? currentSectionId : nextSectionId
      ));
    };
    const scheduleActiveSectionUpdate = () => {
      if (animationFrameId !== null) return;
      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        updateActiveSection();
      });
    };
    const finishRequestedSectionNavigation = () => {
      const requestedSectionId = requestedDetailSectionIdRef.current;
      if (requestedSectionId) {
        setActiveDetailSectionId(requestedSectionId);
      }
      requestedDetailSectionIdRef.current = null;
      if (detailSectionUnlockTimerRef.current !== null) {
        window.clearTimeout(detailSectionUnlockTimerRef.current);
        detailSectionUnlockTimerRef.current = null;
      }
      if (!requestedSectionId) scheduleActiveSectionUpdate();
    };

    updateActiveSection();
    window.addEventListener('scroll', scheduleActiveSectionUpdate, { passive: true });
    window.addEventListener('scrollend', finishRequestedSectionNavigation);
    window.addEventListener('resize', scheduleActiveSectionUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleActiveSectionUpdate);
      window.removeEventListener('scrollend', finishRequestedSectionNavigation);
      window.removeEventListener('resize', scheduleActiveSectionUpdate);
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      if (detailSectionUnlockTimerRef.current !== null) {
        window.clearTimeout(detailSectionUnlockTimerRef.current);
        detailSectionUnlockTimerRef.current = null;
      }
    };
  }, [auction?.productId, embedded]);

  useEffect(() => {
    if (embedded) return undefined;
    const syncSiteHeaderLayout = () => {
      const isDesktop = window.innerWidth >= 768;
      window.dispatchEvent(new CustomEvent(SITE_HEADER_VISIBILITY_EVENT, {
        detail: { hidden: isDetailNavigationStuck && isDesktop },
      }));
      window.dispatchEvent(new CustomEvent(SITE_HEADER_DOCK_EVENT, {
        detail: { docked: isDetailNavigationStuck && !isDesktop },
      }));
    };

    syncSiteHeaderLayout();
    window.addEventListener('resize', syncSiteHeaderLayout);
    return () => {
      window.removeEventListener('resize', syncSiteHeaderLayout);
      window.dispatchEvent(new CustomEvent(SITE_HEADER_VISIBILITY_EVENT, {
        detail: { hidden: false },
      }));
      window.dispatchEvent(new CustomEvent(SITE_HEADER_DOCK_EVENT, {
        detail: { docked: false },
      }));
    };
  }, [embedded, isDetailNavigationStuck]);

  if (isAuthLoading || isLoading) {
    return (
      <>
        {!embedded && headerSearch}
        <main className={DETAIL_PAGE_CLASS}>
          <div className={DETAIL_CONTAINER_CLASS} style={{ paddingTop: '32px' }}>
            <section className="grid items-stretch gap-2 lg:grid-cols-[minmax(360px,0.78fr)_minmax(560px,1.22fr)]">
              <Skeleton height={420} />
              <div style={{ border: '1px solid #f0efec', borderRadius: 8, padding: 24 }}>
                <Skeleton height={16} style={{ marginBottom: 12, maxWidth: 100 }} />
                <Skeleton height={30} style={{ marginBottom: 16, maxWidth: '80%' }} />
                <Skeleton height={40} style={{ marginBottom: 16 }} />
                <Skeleton count={3} height={16} style={{ marginBottom: 8 }} />
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }

  if (isError || !auction) {
    return (
      <>
        {!embedded && headerSearch}
        <main className={DETAIL_PAGE_CLASS}>
          <div className={DETAIL_CONTAINER_CLASS}>
            <div className={DETAIL_EMPTY_CLASS}>
              <strong className="text-h3">경매 상세 정보를 불러오지 못했습니다.</strong>
              <Link className="inline-flex items-center gap-1.5 font-extrabold text-primary no-underline" to={returnPath}>
                {returnLabel}으로 돌아가기
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const imageItems = createImageItems(auction.images || []);
  const representativeIndex = imageItems.findIndex((image) => image.representative === 'Y');
  const defaultImageIndex = representativeIndex >= 0 ? representativeIndex : 0;
  const activeImageIndex = selectedImageIndex !== null && imageItems[selectedImageIndex]
    ? selectedImageIndex
    : defaultImageIndex;
  const currentPrice = Number(auction.currentPrice || auction.startPrice || 0);
  const bidUnitPrice = Number(auction.bidUnitPrice || 1000);
  const instantBuyPrice = Number(auction.instantBuyPrice || 0);
  const hasInstantBuyPrice = Number.isFinite(instantBuyPrice) && instantBuyPrice > 0;
  const nextUnitBidPrice = currentPrice + bidUnitPrice;
  const minimumBidPrice = hasInstantBuyPrice
    ? Math.min(nextUnitBidPrice, instantBuyPrice)
    : nextUnitBidPrice;
  const isAuctionReady = auction.auctionStatusCode === 'AUCC0001';
  const auctionResultLabel = isAuctionReady ? null : resolveAuctionResultLabel(auction);
  const auctionStartTimestamp = auction.startDateTime
    ? new Date(auction.startDateTime).getTime()
    : null;
  const isAuctionStartDue = isAuctionReady
    && Number.isFinite(auctionStartTimestamp)
    && auctionStartTimestamp <= now;
  const remainingTime = isAuctionReady
    ? (isAuctionStartDue ? '시작 처리 중' : formatTimeUntil(auction.startDateTime, now))
    : formatRemainingTime(auction, now);
  const remainingTimeLabel = isAuctionReady
    ? (isAuctionStartDue ? '경매 상태' : '경매 시작까지 남은 시간')
    : (auctionResultLabel ? '경매 결과' : '경매 종료까지 남은 시간');
  const auctionEndTimestamp = auction.endDateTime
    ? new Date(auction.endDateTime).getTime()
    : null;
  const isAuctionOpen = auction.auctionStatusCode === 'AUCC0002'
    && (auctionEndTimestamp === null || auctionEndTimestamp > now);
  const isInquiryAvailable = (isAuctionReady || isAuctionOpen)
    && Number.isFinite(auctionEndTimestamp)
    && auctionEndTimestamp > now;
  const isBuyNowAvailable = isAuctionOpen
    && !isOwnAuction
    && Number(auction.instantBuyPrice || 0) > 0;
  const isCurrentHighestBidder = Boolean(auction.currentHighestBidder);
  const hasBidHistory = Boolean(auction.hasBidHistory);
  const requiresBidHoldConsent = isAuthenticated && !hasBidHistory;
  const isMixedTradeMethod = auction.tradeMethodCode === BOTH_TRADE_METHOD_CODE;
  const savedBidTradeMethodCode = isCurrentHighestBidder
    && [DELIVERY_TRADE_METHOD_CODE, OFFLINE_TRADE_METHOD_CODE]
      .includes(auction.myBidTradeMethodCode)
    ? auction.myBidTradeMethodCode
    : '';
  const selectedMixedTradeMethodCode = String(tradeMethodSelection.auctionId) === String(auctionId)
    ? tradeMethodSelection.code
    : savedBidTradeMethodCode;
  const selectedTradeValue = isMixedTradeMethod
    ? selectedMixedTradeMethodCode
    : (auction.tradeMethodCode || '');
  const selectedTradeName = selectedTradeValue === DELIVERY_TRADE_METHOD_CODE
    ? '배송'
    : (selectedTradeValue === OFFLINE_TRADE_METHOD_CODE
      ? '직거래'
      : (isMixedTradeMethod ? '선택 필요' : (auction.tradeMethodName || '거래 방식 미정')));
  const hasTradeMethodChange = Boolean(
    isCurrentHighestBidder
    && isMixedTradeMethod
    && selectedTradeValue
    && selectedTradeValue !== savedBidTradeMethodCode,
  );
  const showTradeMethodError = Boolean(
    isMixedTradeMethod
    && !selectedTradeValue
    && String(tradeMethodErrorAuctionId) === String(auctionId),
  );
  const deliveryAddresses = Array.isArray(deliveryAddressesQuery.data)
    ? deliveryAddressesQuery.data
    : [];
  const locallySelectedDeliveryAddressId = String(deliveryAddressSelection.auctionId) === String(auctionId)
    ? deliveryAddressSelection.deliveryAddressId
    : null;
  const savedBidDeliveryAddressId = isCurrentHighestBidder
    ? auction.myBidDeliveryAddressId
    : null;
  const selectedDeliveryAddress = deliveryAddresses.find((address) => (
    Number(address.deliveryAddressId) === Number(locallySelectedDeliveryAddressId)
  )) || deliveryAddresses.find((address) => (
    Number(address.deliveryAddressId) === Number(savedBidDeliveryAddressId)
  )) || deliveryAddresses.find((address) => address.defaultAddress)
    || deliveryAddresses[0]
    || null;
  const selectedDeliveryAddressId = selectedDeliveryAddress?.deliveryAddressId ?? null;
  const isDeliveryAddressChecking = Boolean(
    isAuthenticated
    && selectedTradeValue === DELIVERY_TRADE_METHOD_CODE
    && deliveryAddressesQuery.isPending,
  );
  const requiresDeliveryAddressRegistration = Boolean(
    isAuthenticated
    && isAuctionOpen
    && selectedTradeValue === DELIVERY_TRADE_METHOD_CODE
    && deliveryAddressesQuery.isSuccess
    && deliveryAddresses.length === 0,
  );
  const handleDeliveryAddressOpen = () => {
    deliveryAddressMutation.reset();
    openDeliveryAddressModal();
  };
  const ensureTradeMethodSelected = () => {
    if (!isMixedTradeMethod || selectedTradeValue) {
      setTradeMethodErrorAuctionId(null);
      return true;
    }
    setTradeMethodErrorAuctionId(auctionId);
    return false;
  };
  const resolveRequiredDeliveryAddress = async () => {
    if (selectedTradeValue !== DELIVERY_TRADE_METHOD_CODE) {
      return { ready: true, deliveryAddressId: null };
    }

    let addresses = deliveryAddressesQuery.data;
    if (!Array.isArray(addresses)) {
      const result = await deliveryAddressesQuery.refetch();
      if (result.error || !result.data) {
        showToast(getErrorMessage(result.error));
        return { ready: false, deliveryAddressId: null };
      }
      addresses = result.data;
    }

    const selected = addresses.find((address) => (
      Number(address.deliveryAddressId) === Number(locallySelectedDeliveryAddressId)
    )) || addresses.find((address) => (
      Number(address.deliveryAddressId) === Number(savedBidDeliveryAddressId)
    )) || addresses.find((address) => address.defaultAddress)
      || addresses[0];
    if (selected) {
      setDeliveryAddressSelection({
        auctionId,
        deliveryAddressId: selected.deliveryAddressId,
      });
      return { ready: true, deliveryAddressId: selected.deliveryAddressId };
    }

    handleDeliveryAddressOpen();
    return { ready: false, deliveryAddressId: null };
  };
  const displayedBidAmount = bidAmount || formatNumber(minimumBidPrice);
  const requestedBidAmount = parseAmount(displayedBidAmount);
  const hasBidAmountSelection = bidAmount !== '';
  const bidIncrementAmount = requestedBidAmount - currentPrice;
  const isInstantBuyAmountSelected = hasInstantBuyPrice
    && requestedBidAmount >= instantBuyPrice;
  const isBidAmountUnitValid = isInstantBuyAmountSelected || (
    requestedBidAmount >= nextUnitBidPrice
    && bidIncrementAmount % bidUnitPrice === 0
  );
  const availablePointValue = pointBalanceQuery.data?.available;
  const availablePoint = availablePointValue == null ? null : Number(availablePointValue);
  const hasAvailablePoint = Number.isFinite(availablePoint);
  const isBidPointSufficient = !hasAvailablePoint || availablePoint >= requestedBidAmount;
  const isBuyNowPointSufficient = !hasAvailablePoint || availablePoint >= instantBuyPrice;
  const isPointBalanceLoading = isAuthenticated
    && !hasAvailablePoint
    && pointBalanceQuery.isLoading;
  const isPointBalanceError = isAuthenticated && pointBalanceQuery.isError;
  const capBidAmount = (amount) => (hasInstantBuyPrice
    ? Math.min(amount, instantBuyPrice)
    : amount);
  const handleBidInputChange = (event) => setBidAmount(
    formatNumber(capBidAmount(parseAmount(event.target.value))),
  );
  const handleBidInputBlur = () => {
    if (parseAmount(bidAmount) < minimumBidPrice) {
      setBidAmount(formatNumber(minimumBidPrice));
    }
  };
  const handleBidMultiplierSelect = (multiplier) => {
    setBidAmount((value) => formatNumber(
      capBidAmount(parseAmount(value || minimumBidPrice) + (bidUnitPrice * multiplier)),
    ));
  };
  const handleBidSubmit = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (isOwnAuction) {
      showToast('본인이 등록한 경매에는 입찰할 수 없습니다');
      return;
    }
    if (!isAuctionOpen) {
      showToast('종료된 경매에는 입찰할 수 없습니다');
      return;
    }
    if (isInstantBuyAmountSelected) {
      await handleBuyNowOpen();
      return;
    }
    if (isCurrentHighestBidder) {
      showToast('현재 최고입찰자입니다');
      return;
    }
    const amount = requestedBidAmount;
    if (amount < minimumBidPrice) {
      showToast(`최소 ${formatPoint(minimumBidPrice)} 이상 입력해 주세요`);
      return;
    }
    if (!isBidAmountUnitValid) {
      showToast(`${formatPoint(bidUnitPrice)} 단위에 맞는 금액을 입력해 주세요`);
      return;
    }
    if (hasAvailablePoint && availablePoint < amount) {
      showToast(`사용 가능 포인트가 부족합니다. 필요 ${formatNumber(amount)}P, 보유 ${formatNumber(availablePoint)}P`);
      return;
    }
    const isTradeMethodReady = ensureTradeMethodSelected();
    const isHoldConsentReady = !requiresBidHoldConsent || holdAgreed;
    setShowHoldConsentError(!isHoldConsentReady);
    if (!isTradeMethodReady || !isHoldConsentReady) {
      showToast(!isTradeMethodReady && !isHoldConsentReady
        ? '거래 방식 선택과 포인트 홀딩 동의가 필요합니다'
        : (!isTradeMethodReady
          ? '배송 또는 직거래 방식을 선택해 주세요'
          : '포인트 홀딩 동의가 필요합니다'));
      return;
    }
    const deliveryAddress = await resolveRequiredDeliveryAddress();
    if (!deliveryAddress.ready) return;
    bidMutation.mutate({
      bidAmount: amount,
      tradeMethod: selectedTradeValue,
      deliveryAddressId: deliveryAddress.deliveryAddressId,
    });
  };
  const handleTradeMethodChangeSubmit = async () => {
    if (!isAuthenticated || !isAuctionOpen || !isCurrentHighestBidder || !isMixedTradeMethod) {
      showToast('현재 최고입찰 상태에서만 거래방식을 변경할 수 있습니다');
      return;
    }
    if (!ensureTradeMethodSelected()) {
      showToast('배송 또는 직거래 방식을 선택해 주세요');
      return;
    }
    if (!hasTradeMethodChange) return;
    const deliveryAddress = await resolveRequiredDeliveryAddress();
    if (!deliveryAddress.ready) return;

    tradeMethodChangeMutation.mutate({
      tradeMethod: selectedTradeValue,
      deliveryAddressId: deliveryAddress.deliveryAddressId,
    });
  };
  const handleBuyNowOpen = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (isOwnAuction) {
      showToast('본인이 등록한 경매는 즉시구매할 수 없습니다');
      return;
    }
    if (!isAuctionOpen) {
      showToast('종료된 경매에는 즉시구매할 수 없습니다');
      return;
    }
    if (!isBuyNowAvailable) {
      showToast('즉시구매가 제공되지 않는 경매입니다');
      return;
    }
    if (!ensureTradeMethodSelected()) {
      showToast('배송 또는 직거래 방식을 선택해 주세요');
      return;
    }
    const deliveryAddress = await resolveRequiredDeliveryAddress();
    if (!deliveryAddress.ready) return;
    if (hasAvailablePoint && availablePoint < instantBuyPrice) {
      showToast(`사용 가능 포인트가 부족합니다. 필요 ${formatNumber(instantBuyPrice)}P, 보유 ${formatNumber(availablePoint)}P`);
      return;
    }
    setIsBuyNowOpen(true);
  };
  const handleBuyNowConfirm = () => {
    if (!isBuyNowAvailable) {
      setIsBuyNowOpen(false);
      showToast('즉시구매를 진행할 수 없는 경매입니다');
      return;
    }
    if (hasAvailablePoint && availablePoint < instantBuyPrice) {
      setIsBuyNowOpen(false);
      showToast(`사용 가능 포인트가 부족합니다. 필요 ${formatNumber(instantBuyPrice)}P, 보유 ${formatNumber(availablePoint)}P`);
      return;
    }
    buyNowMutation.mutate({
      tradeMethod: selectedTradeValue,
      deliveryAddressId: selectedTradeValue === DELIVERY_TRADE_METHOD_CODE
        ? selectedDeliveryAddressId
        : null,
    });
  };
  const handleDeliveryAddressSelect = (deliveryAddressId) => {
    setDeliveryAddressSelection({ auctionId, deliveryAddressId });
    setIsDeliveryAddressModalOpen(false);
    if (isCurrentHighestBidder
        && isAuctionOpen
        && savedBidTradeMethodCode === DELIVERY_TRADE_METHOD_CODE
        && Number(deliveryAddressId) !== Number(auction.myBidDeliveryAddressId)) {
      tradeMethodChangeMutation.mutate({
        tradeMethod: DELIVERY_TRADE_METHOD_CODE,
        deliveryAddressId,
      });
      return;
    }
    showToast('사용할 배송지가 선택되었습니다');
  };
  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      showToast('로그인 후 관심 상품을 등록할 수 있습니다');
      return;
    }
    if (isOwnAuction) {
      showToast('본인 경매 상품은 관심 상품으로 등록할 수 없습니다');
      return;
    }
    const currentFavorite = typeof desiredFavoriteRef.current === 'boolean'
      ? desiredFavoriteRef.current
      : Boolean(auction.favorite);
    if (confirmedFavoriteRef.current === null) {
      confirmedFavoriteRef.current = currentFavorite;
      confirmedFavoriteCountRef.current = Number(auction.favoriteCount) || 0;
    }

    const nextFavorite = !currentFavorite;
    desiredFavoriteRef.current = nextFavorite;
    favoriteLastInteractionAtRef.current = Date.now();

    void queryClient.cancelQueries({ queryKey: detailQueryKey });
    queryClient.setQueryData(detailQueryKey, (currentAuction) => {
      if (!currentAuction) return currentAuction;

      return {
        ...currentAuction,
        favorite: nextFavorite,
        favoriteCount: Math.max(
          0,
          (Number(currentAuction.favoriteCount) || 0) + (nextFavorite ? 1 : -1),
        ),
      };
    });

    scheduleFavoriteSync();
  };
  const handleHoldAgreedChange = (checked) => {
    setHoldAgreed(checked);
    if (checked) setShowHoldConsentError(false);
  };
  const moveImage = (direction) => {
    if (imageItems.length <= 1) return;

    const fromIndex = requestedImageIndexRef.current !== null
      && imageItems[requestedImageIndexRef.current]
      ? requestedImageIndexRef.current
      : activeImageIndex;
    const targetIndex = (fromIndex + direction + imageItems.length) % imageItems.length;
    const command = {
      id: imageNavigationIdRef.current + 1,
      targetIndex,
      status: direction < 0 ? 'LEFT' : 'RIGHT',
    };

    imageNavigationIdRef.current = command.id;
    requestedImageIndexRef.current = targetIndex;
    setSelectedImageIndex(targetIndex);
    setImageNavigationCommand(command);
  };
  const handlePreviewClick = (index) => {
    const fromIndex = requestedImageIndexRef.current !== null
      && imageItems[requestedImageIndexRef.current]
      ? requestedImageIndexRef.current
      : activeImageIndex;
    if (index === fromIndex) return;

    const forwardDistance = (index - fromIndex + imageItems.length) % imageItems.length;
    const backwardDistance = (fromIndex - index + imageItems.length) % imageItems.length;
    const command = {
      id: imageNavigationIdRef.current + 1,
      targetIndex: index,
      status: forwardDistance <= backwardDistance ? 'RIGHT' : 'LEFT',
    };

    imageNavigationIdRef.current = command.id;
    requestedImageIndexRef.current = index;
    setSelectedImageIndex(index);
    setImageNavigationCommand(command);
  };
  const handleImageError = (url) => {
    setFailedImageUrls((prev) => new Set(prev).add(url));
  };
  const handleDetailSectionNavigate = (sectionId) => {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    requestedDetailSectionIdRef.current = sectionId;
    if (detailSectionUnlockTimerRef.current !== null) {
      window.clearTimeout(detailSectionUnlockTimerRef.current);
    }
    detailSectionUnlockTimerRef.current = window.setTimeout(() => {
      requestedDetailSectionIdRef.current = null;
      detailSectionUnlockTimerRef.current = null;
    }, 1800);
    setActiveDetailSectionId(sectionId);
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {!embedded && headerSearch}
      <main className={DETAIL_PAGE_CLASS}>
        <div className={DETAIL_CONTAINER_CLASS}>
          <section className="mt-[34px] grid items-stretch gap-2 lg:grid-cols-[minmax(360px,0.78fr)_minmax(560px,1.22fr)] max-lg:mt-4">
            <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-2 max-lg:grid-rows-[auto_auto]">
              <AuctionImageGallery
                key={`auction-gallery-${auction.auctionId}`}
                auction={auction}
                imageItems={imageItems}
                activeImageIndex={activeImageIndex}
                failedImageUrls={failedImageUrls}
                navigationCommand={imageNavigationCommand}
                onMoveImage={moveImage}
                onImageClick={setLightboxImageIndex}
                onImageError={handleImageError}
              />
              <AuctionPreviewRail
                imageItems={imageItems}
                activeImageIndex={activeImageIndex}
                failedImageUrls={failedImageUrls}
                onPreviewClick={handlePreviewClick}
                onImageError={handleImageError}
              />
            </div>
            <AuctionBidPanel
              auction={auction}
              readOnly={readOnly}
              currentPrice={currentPrice}
              bidUnitPrice={bidUnitPrice}
              remainingTime={remainingTime}
              remainingTimeLabel={remainingTimeLabel}
              selectedTradeName={selectedTradeName}
              selectedTradeMethodCode={selectedTradeValue}
              isMixedTradeMethod={isMixedTradeMethod}
              showTradeMethodError={showTradeMethodError}
              displayedBidAmount={displayedBidAmount}
              holdAgreed={holdAgreed}
              requiresBidHoldConsent={requiresBidHoldConsent}
              showHoldConsentError={showHoldConsentError}
              isBidPending={bidMutation.isPending}
              isTradeMethodChangePending={tradeMethodChangeMutation.isPending}
              isBuyNowPending={buyNowMutation.isPending}
              isAuctionOpen={isAuctionOpen}
              isAuctionReady={isAuctionReady}
              isOwnAuction={isOwnAuction}
              isCurrentHighestBidder={isCurrentHighestBidder}
              hasTradeMethodChange={hasTradeMethodChange}
              isBuyNowAvailable={isBuyNowAvailable}
              isAuthenticated={isAuthenticated}
              isAuthLoading={isAuthLoading}
              isBidderRole={isBidderRole}
              availablePoint={availablePoint}
              hasAvailablePoint={hasAvailablePoint}
              isPointBalanceLoading={isPointBalanceLoading}
              isPointBalanceError={isPointBalanceError}
              isBidPointSufficient={isBidPointSufficient}
              isBidAmountUnitValid={isBidAmountUnitValid}
              isInstantBuyAmountSelected={isInstantBuyAmountSelected}
              hasBidAmountSelection={hasBidAmountSelection}
              isBuyNowPointSufficient={isBuyNowPointSufficient}
              isDeliveryAddressChecking={isDeliveryAddressChecking}
              requiresDeliveryAddressRegistration={requiresDeliveryAddressRegistration}
              selectedDeliveryAddressLabel={selectedDeliveryAddress?.name || ''}
              isFavoritePending={favoriteMutation.isPending || favoriteStatusQuery.isFetching}
              onBidInputChange={handleBidInputChange}
              onBidInputBlur={handleBidInputBlur}
              onBidMultiplierSelect={handleBidMultiplierSelect}
              onHoldAgreedChange={handleHoldAgreedChange}
              onTradeMethodChange={(code) => {
                setTradeMethodSelection({ auctionId, code });
                setTradeMethodErrorAuctionId(null);
              }}
              onBidSubmit={handleBidSubmit}
              onTradeMethodChangeSubmit={handleTradeMethodChangeSubmit}
              onBuyNowOpen={handleBuyNowOpen}
              onDeliveryAddressOpen={handleDeliveryAddressOpen}
              onFavoriteToggle={handleFavoriteToggle}
              onReportOpen={handleReportOpen}
              onChargeClick={() => setIsChargeModalOpen(true)}
              onTradeDetailOpen={() => navigate(`/auction/${auctionId}/trade`)}
            />
          </section>
        </div>

        <nav
          ref={detailNavigationRef}
          className={`sticky ${embedded ? 'top-0' : 'top-[154px] md:top-0'} mt-7 h-[54px] bg-white transition-shadow md:h-[82px] ${
            isDetailNavigationStuck
              ? 'z-40 shadow-[0_5px_14px_rgba(0,0,0,0.14)]'
              : 'z-0 shadow-none'
          }`}
          aria-label="경매 상세 구역"
        >
          <div className={`${DETAIL_CONTAINER_CLASS} grid h-full grid-cols-4`}>
            {DETAIL_SECTION_ITEMS.map(({ id, label }) => {
              const isActive = activeDetailSectionId === id;
              return (
                <button
                  className={`relative inline-flex h-full cursor-pointer items-center justify-center border-x-0 border-t-0 border-b-[3px] bg-white px-2 text-center text-caption font-bold break-keep whitespace-normal transition-colors md:text-body-md ${
                    isActive
                      ? 'border-b-primary text-primary'
                      : 'border-b-transparent text-[#666] hover:text-[#1d1d1f]'
                  }`}
                  key={id}
                  type="button"
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => handleDetailSectionNavigate(id)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className={DETAIL_CONTAINER_CLASS}>
          <AuctionProductDescriptionSection
            content={auction.content}
            sectionId={DETAIL_SECTION_ITEMS[0].id}
          />

          <AuctionProductUpdateSection
            key={`updates-${auction.productId}`}
            sectionId={DETAIL_SECTION_ITEMS[1].id}
            productId={auction.productId}
            enabled={supplementalQueriesEnabled}
          />

          <AuctionInquirySection
            key={`inquiries-${auction.productId}`}
            sectionId={DETAIL_SECTION_ITEMS[2].id}
            productId={auction.productId}
            isAuthenticated={isAuthenticated}
            isOwnAuction={isOwnAuction}
            isInquiryAvailable={isInquiryAvailable}
            currentUserId={authenticatedUserId}
            enabled={supplementalQueriesEnabled}
            onLoginRequired={handleInquiryLoginRequired}
            onToast={showToast}
            readOnly={readOnly}
          />

          <AuctionSellerInformationSection
            auction={auction}
            selectedTradeName={selectedTradeName}
            sectionId={DETAIL_SECTION_ITEMS[3].id}
            sellerRating={sellerRatingQuery.data?.totalScore ?? auction.sellerRating}
            sellerReviewCount={sellerRatingQuery.data?.totalCount ?? auction.sellerReviewCount}
            isSellerRatingLoading={!supplementalQueriesEnabled || sellerRatingQuery.isLoading}
            onSellerReviewsOpen={handleSellerReviewsOpen}
          >
            <AuctionSellerHistory
              key={`seller-history-${auction.sellerId}`}
              currentAuctionId={auctionId}
              sellerId={auction.sellerId}
              sellerName={auction.sellerName}
              returnPath={returnPath}
              enabled={supplementalQueriesEnabled}
            />
          </AuctionSellerInformationSection>
        </div>
      </main>

      {!readOnly && (
        <AuctionBuyNowModal
          isOpen={isBuyNowOpen}
          auction={auction}
          selectedTradeName={selectedTradeName}
          isPending={buyNowMutation.isPending}
          isBuyNowAvailable={isBuyNowAvailable}
          onClose={() => setIsBuyNowOpen(false)}
          onConfirm={handleBuyNowConfirm}
        />
      )}
      {isSellerReviewDialogOpen && (
        <AuctionSellerReviewDialog
          isOpen
          sellerId={auction.sellerId}
          sellerName={auction.sellerName}
          returnPath={returnPath}
          onClose={handleSellerReviewsClose}
          onToast={showToast}
        />
      )}
      {!readOnly && isDeliveryAddressModalOpen && (
        <AuctionDeliveryAddressModal
          addresses={deliveryAddresses}
          selectedAddressId={selectedDeliveryAddressId}
          isSaving={deliveryAddressMutation.isPending}
          errorMessage={deliveryAddressMutation.error?.response?.data?.message
            || deliveryAddressMutation.error?.message
            || ''}
          onClose={() => {
            if (deliveryAddressMutation.isPending) return;
            deliveryAddressMutation.reset();
            setIsDeliveryAddressModalOpen(false);
          }}
          onSelect={handleDeliveryAddressSelect}
          onSave={(address) => deliveryAddressMutation.mutateAsync(address)}
        />
      )}
      {!readOnly && (
        <ReportModal
          open={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetName={auction.title}
          targetLabel="경매 상품"
          targetLocked
          hideTitle
          targetType="auction"
          referenceSn={Number(auction.auctionId ?? auctionId)}
          reportedUserSn={Number(auction.sellerId)}
        />
      )}
      <ImageLightbox
        images={imageItems.map((image) => image.url)}
        initialIndex={lightboxImageIndex ?? activeImageIndex}
        open={lightboxImageIndex !== null}
        onClose={() => setLightboxImageIndex(null)}
      />
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage('')}
        variant="info"
      />
      {!readOnly && isChargeModalOpen && (
        <PointChargeWidgetModal
          infoRow={{ label: '사용 가능 포인트', value: `${(hasAvailablePoint ? availablePoint : 0).toLocaleString()} P` }}
          onClose={() => setIsChargeModalOpen(false)}
        />
      )}
    </>
  );
};

const AuctionDetailPage = () => {
  const { auctionId } = useParams();
  return <AuctionDetailPageContent key={auctionId} auctionId={auctionId} />;
};

export default AuctionDetailPage;
