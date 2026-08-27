import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Toast from '@components/common/Toast';
import {
  getTradeDetail,
  requestTradeCompletion,
  respondOfflineTradeCompletionRequest,
} from '@api/tradeApi';
import { startTradeChat } from '@api/tradeChatApi';
import { getDeliveryProofBlob } from '@api/fileApi';
import {
  canUseTradeChat,
  getTradeChatButtonLabel,
  getTradeChatDescription,
  toTradeDetail,
} from '@api/tradeAdapter';
import { splitSentences } from '@utils/common';
import { reviewQueryKeys } from '@hooks/useReview';
import TradeDetailSkeleton from '@components/trade/TradeDetailSkeleton';
import TradeDetailHeader from '@components/trade/TradeDetailHeader';
import TradeProgressSteps from '@components/trade/TradeProgressSteps';
import { getOfflineTradeProgressConfig } from '@components/trade/tradeProgressConfig';
import TradeDetailOverviewCard from '@components/trade/TradeDetailOverviewCard';
import OfflineScheduleProposalPanel from '@components/trade/OfflineScheduleProposalPanel';
import TradeDetailErrorState from '@components/trade/TradeDetailErrorState';
import { ActionButton } from '@components/common/ui';
import PhotoLightbox from '@components/common/PhotoLightbox';
import AlertModal from '@components/common/AlertModal';
import ReportModal from '@components/common/ReportModal';
import '@assets/css/trade-detail.css';

// 상태 코드표가 확정되기 전까지는 이미 합의된 화면 문구만 제한적으로 표시한다.
const statusInfo = {
  IN_PROGRESS: {
    label: '거래 진행 중',
    description: '물건 또는 직거래 진행 상태를 확인해 주세요.',
    step: 0,
    className: 'trade-status--progress',
  },
  DELIVERING: {
    label: '거래 진행 중',
    description: '물건 또는 직거래 진행 상태를 확인해 주세요.',
    step: 0,
    className: 'trade-status--progress',
  },
  CONFIRM_PENDING: {
    label: '판매자 확인 대기',
    description: '판매자의 확인이나 이의제기 없이 일정 기간이 지나면 거래가 자동으로 완료됩니다.',
    step: 1,
    className: 'trade-status--pending',
  },
  WAITING_CONFIRMATION: {
    label: '판매자 확인 대기',
    description: '판매자의 확인이나 이의제기 없이 일정 기간이 지나면 거래가 자동으로 완료됩니다.',
    step: 1,
    className: 'trade-status--pending',
  },
  COMPLETED: {
    label: '거래 완료',
    description: '거래가 정상적으로 완료되었습니다.',
    step: 2,
    className: 'trade-status--complete',
  },
  ON_HOLD: {
    label: '거래 보류',
    description: '거래 문제를 확인하는 동안 거래와 정산이 보류됩니다.',
    step: -1,
    className: 'trade-status--problem',
  },
  CANCELED: {
    label: '거래 취소',
    description: '취소된 거래입니다. 거래 내역에서 취소 사유를 확인해 주세요.',
    step: -1,
    className: 'trade-status--canceled',
  },
};

const unknownStatus = {
  label: '상태 확인 필요',
  description: '현재 거래 상태를 확인할 수 없습니다. 잠시 후 다시 확인해 주세요.',
  step: -1,
  className: 'trade-status--pending',
};

const TradeDetailBuyer = ({
  embedded = false,
  tradeId: selectedTradeId,
  // @ai_generated (담당자1, 2026-08-07): AuctionTradeDetailPage가 이미 조회한 상세를 그대로
  // 주입하면 이 컴포넌트는 같은 tradeId를 다시 GET하지 않는다(P2-2, 3중 API 호출 제거).
  initialTrade,
  // @ai_generated (담당자1, 2026-08-07): 재조회를 멈춘 대신, 완료 확인 성공 시 부모의
  // useAuctionTrade 캐시와 리뷰 상태 캐시를 직접 무효화해야 새로고침 없이도 문구·리뷰 버튼이
  // 갱신된다(독립 검수에서 발견 - 재조회 제거의 부작용이었다).
  auctionId,
  // @ai_generated (담당자1, 2026-08-07): embedded일 때 진행바를 이 컴포넌트 안이 아니라
  // AuctionTradeDetailPage의 공용 행(좌우 컬럼을 가로지름)에 그리기 위해, 계산된 단계 값만
  // 이 콜백으로 올려보낸다. 계산 로직 자체는 여기 그대로 둔다(중복 방지).
  onStepperChange,
  // @ai_generated (담당자1, 2026-08-07): 거래 리뷰 카드를 다른 카드들과 같은 3열 그리드 폭으로
  // 맞추기 위해, AuctionTradeDetailPage가 이미 만든 <TradeReviewSection>을 그대로 받아
  // trade-detail-grid 맨 끝에 그린다(로직은 그쪽에 그대로 두고 위치만 옮긴다).
  reviewSlot,
  onBack,
  onOpenChat,
  onReport,
}) => {
  const { tradeId: routeTradeId } = useParams();
  const tradeId = selectedTradeId ?? routeTradeId;
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [trade, setTrade] = useState(() => (initialTrade ? toTradeDetail(initialTrade) : null));
  const [isLoading, setIsLoading] = useState(!initialTrade);
  const [loadError, setLoadError] = useState('');
  const [completionAgreed, setCompletionAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [completionRefreshAlertMessage, setCompletionRefreshAlertMessage] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [deliveryProofUrls, setDeliveryProofUrls] = useState([]);
  const [selectedDeliveryProofIndex, setSelectedDeliveryProofIndex] = useState(null);
  const hasDeliveryProofFiles = Boolean(
    trade?.deliveryId && trade?.deliveryProofFiles?.length,
  );
  const visibleDeliveryProofUrls = hasDeliveryProofFiles ? deliveryProofUrls : [];
  const [isCompletionResultOpen, setIsCompletionResultOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const contentClassName = embedded ? 'trade-detail-page__content' : 'container';
  const chatPath = `/trades/${tradeId}/chat?from=buyer`;
  const handleOpenReport = () => {
    if (onReport) {
      onReport();
      return;
    }

    setIsReportOpen(true);
  };

  // 상세에서 채팅을 시작할 때만 직거래 채팅방을 만들고, 생성 후 기존 진입 경로를 연다.
  const openTradeChat = async () => {
    if (!canUseTradeChat(trade)) {
      return;
    }

    setNotice('');
    try {
      if (trade.chatRoomStatus === 'NOT_STARTED') {
        await startTradeChat(tradeId);
        setTrade((currentTrade) => currentTrade
          ? { ...currentTrade, chatRoomStatus: 'ACTIVE', chatAvailable: true }
          : currentTrade);
      }
      if (onOpenChat) onOpenChat(tradeId);
      else navigate(chatPath);
    } catch (chatError) {
      setNotice(chatError.response?.data?.message ?? '거래 채팅을 시작하지 못했습니다.');
    }
  };

  const handleOfflineScheduleUpdated = (response) => {
    const updatedTrade = toTradeDetail(response);
    setTrade(updatedTrade);
    if (auctionId) {
      queryClient.invalidateQueries({ queryKey: ['auction-trade', String(auctionId)] });
    }
    setNotice('직거래 일정 협의 내용이 반영되었습니다.');
  };

  // 마이페이지에서 진입한 상세는 브라우저 이력 대신 거래내역 탭으로 명확하게 복귀한다.
  const handleBackToList = () => {
    if (embedded && onBack) {
      onBack();
      return;
    }

    if (location.state?.from?.startsWith('/user/mypage/')) {
      navigate(location.state.from);
      return;
    }

    navigate('/user/mypage/auctions/purchases');
  };

  // URL의 거래 번호로 서버 상세를 조회해 직접 URL 접근에도 같은 데이터를 표시한다.
  const loadTrade = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await getTradeDetail(tradeId);

      const detail = toTradeDetail(response);

      setTrade(detail);
    } catch {
      setLoadError('거래 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [tradeId]);

  // 거래 번호가 바뀌면 렌더링 완료 뒤에 해당 거래의 상세를 다시 조회한다.
  // initialTrade가 주입된 경우(embedded)는 이미 데이터가 있으므로 다시 조회하지 않는다.
  useEffect(() => {
    if (initialTrade) {
      return undefined;
    }

    const requestTimer = window.setTimeout(loadTrade, 0);

    return () => window.clearTimeout(requestTimer);
  }, [loadTrade, initialTrade]);

  // 확정 일정 시각이 지나면 직거래 프로그레스 바를 완료 확인 단계로 갱신한다.
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);

    return () => window.clearInterval(timer);
  }, []);

  // 보호된 배송 사진은 axios 요청으로 Blob을 받아, 브라우저가 인증 쿠키를 빠뜨리지 않게 표시한다.
  useEffect(() => {
    if (!hasDeliveryProofFiles) {
      return undefined;
    }

    let isActive = true;
    const objectUrls = [];

    const loadDeliveryProofs = async () => {
      try {
        const files = await Promise.all(trade.deliveryProofFiles.map(async (file) => {
          const response = await getDeliveryProofBlob(trade.deliveryId, file.fileId);
          const objectUrl = URL.createObjectURL(response.data);

          objectUrls.push(objectUrl);
          return {
            ...file,
            objectUrl,
          };
        }));

        if (isActive) {
          setDeliveryProofUrls(files);
          setSelectedDeliveryProofIndex(null);
        }
      } catch {
        if (isActive) {
          setDeliveryProofUrls([]);
          setSelectedDeliveryProofIndex(null);
        }
      }
    };

    loadDeliveryProofs();

    return () => {
      isActive = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [hasDeliveryProofFiles, trade?.deliveryId, trade?.deliveryProofFiles]);

  const hasMeetingSchedule = Boolean(
    trade?.meetingDate && trade.meetingDate !== '-'
    && trade?.meetingTime && trade.meetingTime !== '-'
    && trade?.meetingPlace && trade.meetingPlace !== '-',
  );
  // 판매자가 직거래 일정을 제안하면 구매자 화면은 다음 거래 진행 단계로 안내한다.
  const currentStatus = trade?.method === 'OFFLINE'
    && ['IN_PROGRESS', 'DELIVERING'].includes(trade?.status)
    && hasMeetingSchedule
    ? {
      ...statusInfo.WAITING_CONFIRMATION,
      label: '판매자 확인 대기',
      description: '직거래 일정이 제안되었습니다. 거래가 끝난 뒤 서로 완료 확인을 진행해 주세요.',
    }
    : statusInfo[trade?.status] ?? unknownStatus;

  // @ai_generated (담당자1, 2026-08-07): embedded일 때만 계산된 단계값을 부모로 보고한다.
  // 택배와 직거래는 각 거래 방식의 실제 진행 단계에 맞는 공통 진행바 설정을 보고한다.
  // "배송중"과 "구매자 확인 대기"는 백엔드에 이 둘을 구분할 신호(배송 완료/도착 이벤트)가 없어
  // 하나로 합친다 - DELIVERING 상태는 곧 "배송중이며 구매자 확인 대기"를 동시에 뜻한다.
  useEffect(() => {
    if (!embedded || !trade) return;

    if (trade?.method === 'DELIVERY') {
      // ON_HOLD/CANCELED는 기존 3단계 스테퍼(statusInfo의 step: -1)와 동일하게 "어떤 단계도
      // 활성화하지 않음"으로 처리한다.
      const deliveryStepIndex = ['ON_HOLD', 'CANCELED'].includes(trade.status)
        ? -1
        : trade.status === 'COMPLETED'
          ? 3
          : ['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade.status)
            ? 2
            : trade.status === 'DELIVERING'
              ? 1
              : 0;

      onStepperChange?.({
        steps: ['배송준비중', '배송중(구매자 확인 대기)', '판매자 확인 대기', '완료'],
        activeIndex: deliveryStepIndex,
        ariaLabel: '거래 진행 단계',
      });
      return;
    }

    onStepperChange?.(getOfflineTradeProgressConfig(trade, currentTime));
  }, [
    embedded,
    trade,
    currentTime,
    onStepperChange,
  ]);

  const isCompleted = trade?.status === 'COMPLETED';
  const isSellerCompletionRequested = (
    ['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade?.status)
    && trade?.completionRequestedBy === 'SELLER'
  );
  const isBuyerCompletionRequested = (
    ['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade?.status)
    && trade?.completionRequestedBy === 'BUYER'
  );
  const isOfflineCompletionResponsePending = (
    trade?.method === 'OFFLINE'
    && trade?.canRespondToOfflineCompletionRequest
  );
  // 택배 거래는 판매자의 발송 인증으로 배송 중이 된 뒤 구매자가 첫 완료 확인을 요청한다.
  // 직거래는 확정 일정 뒤 양쪽 모두 먼저 요청할 수 있으며, 상대방 요청에는 별도 동의·거절로 응답한다.
  const canRequestBuyerCompletion = (
    trade?.method === 'DELIVERY'
      ? trade?.status === 'DELIVERING' || isSellerCompletionRequested
      : ['IN_PROGRESS', 'DELIVERING'].includes(trade?.status)
  );
  const completionGuide = isCompleted
    ? {
      title: '거래가 완료되었습니다.',
      description: '구매자와 판매자의 완료 확인이 모두 처리되었습니다.',
    }
    : isSellerCompletionRequested
      ? {
        title: '구매자 완료 확인 필요',
        description: trade?.method === 'OFFLINE'
          ? '판매자가 거래 완료를 요청했습니다. 동의하거나 거절해 주세요.'
          : '판매자가 거래 완료를 확인했습니다. 구매자가 확인하면 거래가 완료됩니다.',
      }
      : isBuyerCompletionRequested
        ? {
          title: '판매자 확인 대기',
          description: '구매자의 완료 확인이 전달되었습니다. 판매자의 확인이나 이의제기 없이 일정 기간이 지나기를 기다려 주세요.',
        }
        : trade?.method === 'DELIVERY'
          ? {
        title: '완료 확인',
            description: trade?.status === 'DELIVERING'
              ? '상품을 수령했다면 구매자가 먼저 완료 확인을 진행해 주세요. 판매자 확인까지 끝나면 거래가 완료됩니다.'
              : '판매자의 발송 인증을 기다리고 있습니다. 발송 인증이 등록되면 완료 확인을 요청할 수 있습니다.',
          }
          : {
            title: '상호 완료 확인',
            description: '거래가 완료되었다면 구매자와 판매자 누구나 먼저 완료 확인을 진행할 수 있습니다.',
          };
  // 직거래는 판매자 일정이 확정된 뒤에만 실제 만남과 완료 확인이 가능하다.
  const isOfflineSchedulePending = (
    trade?.method === 'OFFLINE'
    && !hasMeetingSchedule
  );

  // 거래 완료 동의와 본인 확인 순서가 모두 충족될 때만 완료 요청을 허용한다.
  const canRequestCompletion = () => {
    if (!canRequestBuyerCompletion) {
      return false;
    }

    return completionAgreed && !isOfflineSchedulePending;
  };

  // 완료 요청 성공 후에만 화면 상태를 대기 상태로 바꿔 서버 상태와 화면을 맞춘다.
  const handleCompletionRequest = async () => {
    if (!canRequestCompletion()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await requestTradeCompletion(tradeId);
      const updatedTrade = toTradeDetail(response);

      // 서버가 계산한 자동완료 시각까지 다시 반영해 브라우저 시간과 어긋나지 않게 한다.
      setTrade(updatedTrade);
      // @ai_generated (담당자1, 2026-08-07): auctionId가 있으면(embedded) 부모 상세 캐시와
      // 리뷰 상태 캐시를 함께 무효화한다 - 이 컴포넌트는 더 이상 자체 재조회를 하지 않으므로
      // 완료 확인 직후 리뷰 등록 버튼이 새로고침 없이 뜨려면 이게 필요하다.
      if (auctionId) {
        queryClient.invalidateQueries({ queryKey: ['auction-trade', String(auctionId)] });
        queryClient.invalidateQueries({ queryKey: reviewQueryKeys.trade(tradeId) });
      }
      setCompletionAgreed(false);
      setIsCompletionResultOpen(true);
      setNotice(
        updatedTrade.status === 'COMPLETED'
          ? '판매자와 구매자의 완료 확인이 모두 끝나 거래가 완료되었습니다.'
          : '거래 완료 확인을 보냈습니다. 판매자의 확인을 기다려 주세요.',
      );
    } catch (completionError) {
      if (
        trade?.method === 'OFFLINE'
        && completionError.response?.status === 409
        && completionError.response?.data?.message === '상대방의 거래 완료 요청에 동의하거나 거절해 주세요.'
      ) {
        setCompletionRefreshAlertMessage(
          '상대방이 먼저 거래 완료 확인을 요청했습니다.\n확인을 누르면 최신 거래 상태를 불러옵니다.',
        );
        return;
      }
      setNotice(
        completionError.response?.data?.message
          ?? '거래 완료 확인 요청에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOfflineCompletionDecision = async (approve) => {
    if (!isOfflineCompletionResponsePending) return;

    setIsSubmitting(true);
    try {
      const response = await respondOfflineTradeCompletionRequest(tradeId, 'BUYER', approve);
      const updatedTrade = toTradeDetail(response);
      setTrade(updatedTrade);
      setCompletionAgreed(false);
      setNotice(approve
        ? '거래 완료에 동의해 거래가 완료되었습니다.'
        : '거래 완료 요청을 거절했습니다. 거래를 계속 진행하거나 일정 변경을 제안할 수 있습니다.');
    } catch (completionError) {
      setNotice(completionError.response?.data?.message ?? '거래 완료 요청 응답에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletionRefreshConfirm = async () => {
    setCompletionRefreshAlertMessage('');
    await loadTrade();
    if (auctionId) {
      queryClient.invalidateQueries({ queryKey: ['auction-trade', String(auctionId)] });
    }
  };

  if (isLoading && !loadError) {
    return <TradeDetailSkeleton embedded={embedded} role="buyer" />;
  }

  if (loadError || !trade) {
    return <TradeDetailErrorState role="buyer" contentClassName={contentClassName} onRetry={loadTrade} />;
  }

  const overviewStatusMessages = trade.method === 'DELIVERY'
    ? trade.status === 'COMPLETED'
      ? ['거래가 완료되었습니다.', '구매자와 판매자의 완료 확인이 모두 처리되었습니다.']
      : ['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade.status)
        ? ['구매자가 거래 완료를 확인했습니다.', '판매자가 확인하면 거래가 완료됩니다.']
        : trade.status === 'DELIVERING'
          ? ['판매자가 발송 인증사진을 등록했습니다.', '상품을 수령한 뒤 거래 완료 확인을 진행해 주세요.']
          : ['판매자의 발송 인증을 기다리고 있습니다.', '발송 정보가 등록되면 배송 정보에서 확인할 수 있습니다.']
    : splitSentences(currentStatus.description);
  const offlineProgressConfig = getOfflineTradeProgressConfig(trade, currentTime);
  const chatButtonLabel = getTradeChatButtonLabel(trade);
  const chatDescription = getTradeChatDescription(trade);

  return (
    <div className="trade-detail-page trade-detail-page--buyer">
      <div className={contentClassName}>
        {/* embedded면 AuctionTradeDetailPage의 공용 타이틀 행이 제목·뒤로가기를 대신 그린다 -
            여기서도 그리면 제목이 중복 표시된다. */}
        {!embedded && (
          <TradeDetailHeader
            title={trade.productName}
            onBack={handleBackToList}
          />
        )}

        {/* embedded면 AuctionTradeDetailPage의 공용 진행바 행이 대신 그린다(위 onStepperChange로 값 전달). */}
        {!embedded && (
          <TradeProgressSteps
            steps={trade.method === 'OFFLINE'
              ? offlineProgressConfig.steps
              : ['배송·직거래중', '판매자 확인 대기', '완료']}
            activeIndex={trade.method === 'OFFLINE'
              ? offlineProgressConfig.activeIndex
              : currentStatus.step}
            ariaLabel={trade.method === 'OFFLINE'
              ? offlineProgressConfig.ariaLabel
              : '거래 진행 단계'}
          />
        )}

        <div className="trade-detail-grid">
          {/* 1영역은 배송·직거래가 같은 공통 카드 구조를 사용한다. */}
          <TradeDetailOverviewCard
            trade={trade}
            statusLabel={currentStatus.label}
            statusClassName={currentStatus.className}
            statusMessages={overviewStatusMessages}
            counterpartTitle="상대방 정보"
            auctionId={auctionId}
            onReport={handleOpenReport}
          />

          {/* 가운데: 배송 정보/발송 정보(또는 구매자 진행 안내) + 거래 확인을 한 카드에 합친다. */}
          <section className="trade-detail-card">
            {trade.method === 'DELIVERY' ? (
              <>
                <div className="trade-detail-card__block">
                  <h3>배송 정보</h3>
                  <div className="trade-address-grid">
                    <label className="trade-form-field">
                      수령인
                      <input className="input" value={trade.recipientName} readOnly />
                    </label>
                    <label className="trade-form-field">
                      연락처
                      <input className="input" value={trade.recipientPhone} readOnly />
                    </label>
                  </div>
                  <label className="trade-form-field">
                    주소
                    <input className="input" value={trade.deliveryAddress} readOnly />
                  </label>
                  <label className="trade-form-field">
                    배송 요청사항
                    <input className="input" value={trade.deliveryRequest} readOnly />
                  </label>
                </div>
                <div className="trade-detail-card__block">
                  <h3>발송 정보</h3>
                  {visibleDeliveryProofUrls.length > 0 && (
                    <div className="trade-delivery-proof-gallery">
                      <div>
                        {visibleDeliveryProofUrls.map((file, index) => (
                          <button
                            className="trade-delivery-proof-gallery__item"
                            key={file.fileId}
                            type="button"
                            onClick={() => setSelectedDeliveryProofIndex(index)}
                          >
                            <img
                              src={file.objectUrl}
                              alt={`판매자 발송 인증 사진 ${index + 1} 크게 보기`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {trade.deliveryProofRegisteredAt !== '-' && (
                    <p>등록 시간: {trade.deliveryProofRegisteredAt}</p>
                  )}
                  {trade.deliveryMessage !== '-' && (
                    <p>배송 메모: {trade.deliveryMessage}</p>
                  )}
                  {visibleDeliveryProofUrls.length === 0
                    && trade.deliveryProofRegisteredAt === '-'
                    && trade.deliveryMessage === '-' && (
                    <p className="trade-detail-card__muted">
                      판매자의 발송 인증을 기다리고 있습니다.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="trade-detail-card__block">
                  <h3>거래 채팅</h3>
                  <p>{chatDescription}</p>
                  <div className="trade-detail-actions trade-detail-actions--end">
                    <ActionButton
                      onClick={openTradeChat}
                      disabled={!canUseTradeChat(trade)}
                      tone="outline"
                    >
                      {chatButtonLabel}
                    </ActionButton>
                  </div>
                </div>
                <OfflineScheduleProposalPanel
                  key={`${trade.id}-${trade.meetingDate}-${trade.meetingTime}-${trade.meetingPlace}-${trade.meetingAddress}-${trade.pendingScheduleProposalId}`}
                  tradeId={tradeId}
                  trade={trade}
                  onUpdated={handleOfflineScheduleUpdated}
                  onNotice={setNotice}
                  onError={setNotice}
                  onRefresh={loadTrade}
                />
              </>
            )}

            {!isOfflineSchedulePending && (
              <div className="trade-detail-card__block">
                <h3>거래 확인</h3>
                {splitSentences(
                  !isCompleted && isBuyerCompletionRequested && trade.autoCompleteAt !== '-'
                    ? `${trade.autoCompleteAt}까지 판매자 확인이 없으면 자동으로 거래가 완료됩니다.`
                    : completionGuide.description,
                ).map((sentence) => <p key={sentence}>{sentence}</p>)}

                {trade.method === 'OFFLINE' && (
                  <p className="trade-detail-card__muted">
                    내 거래 완료 확인 요청 {trade.myOfflineCompletionRequestCount}/2회 · 남은 요청 {trade.remainingOfflineCompletionRequestCount}회
                  </p>
                )}

                {/* 거래 진행 중 첫 요청 또는 판매자 요청에 대한 응답일 때만 구매자 확인을 받는다. */}
                {!isCompleted && canRequestBuyerCompletion && (
                  <>
                    <label className="trade-complete-card__check">
                      <input
                        type="checkbox"
                        checked={completionAgreed}
                        onChange={(event) => setCompletionAgreed(event.target.checked)}
                      />
                      거래가 완료되었음을 확인합니다
                    </label>
                    <p className="trade-detail-card__muted">
                      확인 요청 이후에는 상대방의 확인이나 이의제기 없이 일정 기간이 지나야 합니다.
                    </p>
                  </>
                )}

                <div className="trade-detail-actions trade-detail-actions--end">
                  {!isCompleted && isOfflineCompletionResponsePending && (
                    <>
                      <ActionButton
                        disabled={isSubmitting}
                        onClick={() => handleOfflineCompletionDecision(false)}
                        tone="danger"
                      >
                        거절
                      </ActionButton>
                      <ActionButton
                        disabled={isSubmitting}
                        onClick={() => handleOfflineCompletionDecision(true)}
                      >
                        동의하고 거래 완료
                      </ActionButton>
                    </>
                  )}
                  {!isCompleted && canRequestBuyerCompletion && (
                    <ActionButton
                      disabled={!canRequestCompletion() || isSubmitting}
                      loading={isSubmitting}
                      onClick={handleCompletionRequest}
                    >
                      {isSubmitting ? '요청 중...' : '거래 완료 확인 요청'}
                    </ActionButton>
                  )}
                </div>
              </div>
            )}

          </section>

          {/* 오른쪽: 거래 리뷰 */}
          {reviewSlot}
        </div>
      </div>

      <PhotoLightbox
        title="발송 인증 사진"
        photoUrls={visibleDeliveryProofUrls.map((file) => file.objectUrl)}
        index={hasDeliveryProofFiles ? selectedDeliveryProofIndex : null}
        onClose={() => setSelectedDeliveryProofIndex(null)}
        onNavigate={setSelectedDeliveryProofIndex}
      />

      {isCompletionResultOpen && (
        <div
          className="trade-modal"
          role="dialog"
          aria-modal="true"
          aria-label="거래 완료 확인 요청 안내"
        >
          <div className="trade-modal__content">
            <div className="trade-modal__header">
              <h2>{isCompleted ? '거래가 완료되었습니다' : '완료 확인 요청을 보냈습니다'}</h2>
              <button
                className="trade-modal__close"
                type="button"
                onClick={() => setIsCompletionResultOpen(false)}
                aria-label="완료 확인 요청 안내 닫기"
              >
                ×
              </button>
            </div>
            <p>
              {isCompleted
                ? '구매자와 판매자의 완료 확인이 모두 처리되었습니다.'
                : '판매자의 확인이나 이의제기 없이 일정 기간이 지나면 거래가 자동으로 완료됩니다. 현재 거래 상태는 판매자 확인 대기입니다.'}
            </p>
            <div className="trade-modal__actions">
              <ActionButton
                onClick={() => setIsCompletionResultOpen(false)}
              >
                거래 상세에서 확인
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        confirmLabel="확인"
        message={completionRefreshAlertMessage}
        onClose={handleCompletionRefreshConfirm}
        open={Boolean(completionRefreshAlertMessage)}
      />

      {!embedded && <ReportModal
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetName={trade.counterpart}
        targetType="trade"
        referenceSn={trade.id}
        reportedUserSn={trade.counterpartUserId}
        contextLabel={`거래 상대: ${trade.counterpart}`}
        tradeReportTypeCodes={trade.method === 'DELIVERY'
          ? ['ABRC0009', 'ABRC0011']
          : ['ABRC0008', 'ABRC0011']}
        redirectAfterSubmit={false}
      />}

      {notice && <Toast message={notice} onClose={() => setNotice('')} />}
    </div>
  );
};

export default TradeDetailBuyer;
