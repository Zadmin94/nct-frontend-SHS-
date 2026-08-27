import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  submitTradeDeliveryProof,
} from '@api/tradeApi';
import { requestAuctionCancel } from '@api/auctionApi';
import { startTradeChat } from '@api/tradeChatApi';
import {
  deleteImage,
  getDeliveryProofBlob,
  uploadDeliveryProof,
} from '@api/fileApi';
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
import { ActionButton } from '@components/common/ui';
import TradeDetailErrorState from '@components/trade/TradeDetailErrorState';
import PhotoLightbox from '@components/common/PhotoLightbox';
import AlertModal from '@components/common/AlertModal';
import ReportModal from '@components/common/ReportModal';
import '@assets/css/trade-detail.css';

const CANCEL_REASONS = ['상품 상태 변경', '상품 정보 오류', '판매 진행 불가', '기타'];
const CANCELABLE_TRADE_STATUSES = ['IN_PROGRESS', 'DELIVERING', 'WAITING_CONFIRMATION'];

const MAX_SHIPPING_PROOF_FILE_SIZE = 10 * 1024 * 1024;
const MAX_SHIPPING_PROOF_FILES = 5;
const SHIPPING_PROOF_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const TradeDetailSeller = ({
  embedded = false,
  tradeId: selectedTradeId,
  // @ai_generated (담당자1, 2026-08-07): AuctionTradeDetailPage가 이미 조회한 상세를 그대로
  // 주입하면 이 컴포넌트는 같은 tradeId를 다시 GET하지 않는다(P2-2, 3중 API 호출 제거).
  initialTrade,
  // @ai_generated (담당자1, 2026-08-07): 재조회를 멈춘 대신, 발송 인증/완료 확인/일정 저장 성공 시
  // 부모의 useAuctionTrade 캐시와 리뷰 상태 캐시를 직접 무효화해야 새로고침 없이도 문구·리뷰
  // 버튼이 갱신된다(독립 검수에서 발견 - 재조회 제거의 부작용이었다).
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
  // @ai_generated (담당자1, 2026-08-07): 발송 인증/완료 확인/일정 저장 성공 시 공통으로 호출한다.
  const invalidateAuctionTradeCaches = () => {
    if (!auctionId) return;
    queryClient.invalidateQueries({ queryKey: ['auction-trade', String(auctionId)] });
    queryClient.invalidateQueries({ queryKey: reviewQueryKeys.trade(tradeId) });
  };
  // @ai_generated (담당자1, 2026-08-07): initialTrade가 있으면 최초 렌더에서 한 번만 어댑팅해
  // 아래 각 상태 초기값을 채운다 - loadTrade의 상태 초기화 로직과 동일하게 맞춘다. useMemo로
  // 감싸는 이유: 이 값은 useState 초기값 5곳에서만 쓰이고 첫 렌더 이후엔 버려지는데, 그냥 본문에
  // 두면 매 렌더마다 toTradeDetail을 다시 계산한다(TradeDetailBuyer는 useState(() => ...) 지연
  // 초기화 하나로 끝나 이 문제가 없다 - Seller는 상태가 여러 개라 같은 값을 공유해야 해서
  // useMemo로 "한 번만 계산" 시맨틱을 맞췄다. useRef를 쓰면 이 프로젝트 lint 규칙
  // react-hooks/refs("렌더 중 ref 접근 금지")에 걸린다).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 의도적으로 최초 렌더 값만 쓴다
  const initialDetail = useMemo(() => (initialTrade ? toTradeDetail(initialTrade) : null), []);
  const [trade, setTrade] = useState(initialDetail);
  const [isLoading, setIsLoading] = useState(!initialTrade);
  const [loadError, setLoadError] = useState('');
  const [shippingMemo, setShippingMemo] = useState('');
  const [shippingProofFiles, setShippingProofFiles] = useState([]);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [shippingProofError, setShippingProofError] = useState('');
  const [completionAgreed, setCompletionAgreed] = useState(false);
  const [isCompletionSubmitting, setIsCompletionSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [completionRefreshAlertMessage, setCompletionRefreshAlertMessage] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [timeRefreshSignal, setTimeRefreshSignal] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const shippingProofFilesRef = useRef(shippingProofFiles);
  const handleOpenReport = () => {
    if (onReport) {
      onReport();
      return;
    }

    setIsReportOpen(true);
  };

  // 낙찰 이후 거래로 넘어온 경매도 배송·직거래 진행중~완료확인대기 구간에서는
  // 판매자가 여전히 취소를 요청할 수 있다 (TradeService.isCancellableTradeStatus와 동일 기준).
  const closeCancel = () => { setCancelOpen(false); setCancelReason(''); };
  const handleCancelSubmit = async () => {
    if (!cancelReason) { setNotice('취소 사유를 선택해 주세요.'); return; }
    if (!auctionId) { setNotice('경매 정보를 불러오지 못했습니다.'); return; }
    setCancelSubmitting(true);
    try {
      await requestAuctionCancel(auctionId, { reason: cancelReason });
      setNotice('취소 요청이 완료되었습니다.');
      closeCancel();
    } catch (err) {
      setNotice(err.response?.data?.message || '취소 요청에 실패했습니다.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const hasMeetingSchedule = Boolean(
    trade?.meetingDate && trade.meetingDate !== '-'
      && trade?.meetingTime && trade.meetingTime !== '-'
      && trade?.meetingPlace && trade.meetingPlace !== '-',
  );

  // 렌더 중이 아니라 커밋 이후에 ref를 최신 shippingProofFiles로 동기화한다(react-hooks/refs 규칙 준수).
  useEffect(() => {
    shippingProofFilesRef.current = shippingProofFiles;
  });

  // 업로드는 선택 즉시 끝나지만, 미리보기 blob URL은 제출/삭제 없이 페이지를 벗어나면
  // 해제될 기회가 없다 — 언마운트 시 남아있는 파일들의 미리보기 URL을 정리한다.
  useEffect(() => () => {
    shippingProofFilesRef.current.forEach((file) => URL.revokeObjectURL(file.previewUrl));
  }, []);

  // 발송 인증 제출 뒤에는 shippingProofFiles(업로드 폼 미리보기)가 비워지므로, 판매자 본인
  // 화면에서도 등록한 사진을 계속 볼 수 있게 TradeDetailBuyer와 같은 방식으로 다시 불러온다.
  const [submittedProofUrls, setSubmittedProofUrls] = useState([]);
  // 구매자 화면과 동일하게 사진을 눌러 크게 볼 수 있게 한다.
  const [selectedProofIndex, setSelectedProofIndex] = useState(null);
  const hasSubmittedProofFiles = Boolean(
    trade?.deliveryId && trade?.deliveryProofFiles?.length,
  );
  const visibleSubmittedProofUrls = hasSubmittedProofFiles ? submittedProofUrls : [];

  useEffect(() => {
    if (!hasSubmittedProofFiles) {
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
          return { ...file, objectUrl };
        }));

        if (isActive) {
          setSubmittedProofUrls(files);
          setSelectedProofIndex(null);
        }
      } catch {
        if (isActive) {
          setSubmittedProofUrls([]);
          setSelectedProofIndex(null);
        }
      }
    };

    loadDeliveryProofs();

    return () => {
      isActive = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [hasSubmittedProofFiles, trade?.deliveryId, trade?.deliveryProofFiles]);

  const contentClassName = embedded ? 'trade-detail-page__content' : 'container';
  // 판매자 상세도 구매자 상세와 같은 상태 카드 기준을 사용한다.
  const sellerTradeStatusInfo = (() => {
    if (trade?.status === 'COMPLETED') {
      return { label: '거래 완료', description: '거래가 정상적으로 완료되었습니다.', className: 'trade-status--complete' };
    }
    if (['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade?.status)) {
      // 택배 거래는 구매자가 먼저 완료 확인을 해야 하므로, 이 상태에 도달했다는 것 자체가
      // 이미 구매자 확인이 끝났다는 뜻이다(판매자 확인만 남음). 직거래는 먼저 요청한 쪽에 따라 갈린다.
      if (trade?.method === 'DELIVERY' || trade?.completionRequestedBy === 'BUYER') {
        return { label: '판매자 확인 대기', description: '구매자가 거래 완료를 확인했습니다. 판매자가 확인하면 거래가 완료됩니다.', className: 'trade-status--pending' };
      }
      return { label: '구매자 확인 대기', description: '판매자의 완료 확인이 전달되었습니다. 구매자 확인을 기다려 주세요.', className: 'trade-status--pending' };
    }
    if (trade?.status === 'ON_HOLD') {
      return { label: '거래 보류', description: '거래 문제를 확인하는 동안 거래와 정산이 보류됩니다.', className: 'trade-status--problem' };
    }
    if (trade?.status === 'CANCELED') {
      return { label: '거래 취소', description: '취소된 거래입니다. 거래 내역에서 취소 사유를 확인해 주세요.', className: 'trade-status--canceled' };
    }
    if (trade?.method === 'OFFLINE' && hasMeetingSchedule) {
      return { label: '직거래 중', description: '구매자와 약속한 일정과 장소에서 직거래를 진행해 주세요.', className: 'trade-status--progress' };
    }
    if (trade?.method === 'DELIVERY' && trade?.status === 'DELIVERING') {
      return { label: '배송 중', description: '배송 인증을 등록했고 구매자의 수령·완료 확인을 기다리고 있습니다.', className: 'trade-status--progress' };
    }
    return { label: '거래 진행 중', description: '거래 진행에 필요한 정보를 확인해 주세요.', className: 'trade-status--progress' };
  })();
  const sellerOfflineNextStep = (() => {
    if (trade?.status === 'COMPLETED') {
      return { label: '거래 완료', description: '구매자와 판매자의 완료 확인이 모두 처리되었습니다.', className: 'trade-status--complete' };
    }
    if (['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade?.status)) {
      if (trade?.completionRequestedBy === 'BUYER') {
        return { label: '판매자 완료 확인 필요', description: '구매자가 거래 완료를 확인했습니다. 판매자가 확인하면 거래가 완료됩니다.', className: 'trade-status--pending' };
      }
      return { label: '구매자 완료 확인 대기', description: '판매자의 완료 확인이 전달되었습니다. 구매자 확인을 기다려 주세요.', className: 'trade-status--pending' };
    }
    return { label: '일정 전달 완료', description: '약속한 일시와 장소에서 거래한 뒤 완료 확인을 진행해 주세요.', className: 'trade-status--progress' };
  })();
  // 발송 인증 뒤에는 판매자·구매자가 각각 한 번씩 완료 확인을 진행한다.
  const isDeliveryProofSubmitted = [
    'DELIVERING',
    'CONFIRM_PENDING',
    'WAITING_CONFIRMATION',
    'COMPLETED',
  ].includes(trade?.status);
  // 배송 인증 또는 직거래 일정 저장 뒤, 판매자는 첫 확인을 시작하거나 구매자 요청에 응답할 수 있다.
  const isSellerCompletionReady = (
    (trade?.method === 'DELIVERY' && isDeliveryProofSubmitted)
    || (trade?.method === 'OFFLINE' && hasMeetingSchedule)
  );

  // @ai_generated (담당자1, 2026-08-07): embedded일 때만 계산된 단계값을 부모로 보고한다.
  // 직거래/배송 두 분기 중 실제 렌더되는 쪽 기준으로 하나만 보고하면 된다.
  useEffect(() => {
    if (!embedded || !trade) return;
    if (trade.method === 'OFFLINE') {
      onStepperChange?.(getOfflineTradeProgressConfig(trade));
    } else if (trade.method === 'DELIVERY') {
      // 택배 거래는 구매자가 먼저 완료 확인을 해야 하므로, CONFIRM_PENDING/WAITING_CONFIRMATION에
      // 도달했다는 것 자체가 구매자 확인이 이미 끝났다는 뜻이다(canRequestSellerCompletion의
      // 순서 강제와 짝을 이룬다). "배송중"과 "구매자 확인 대기"는 백엔드에 이 둘을 구분할 신호
      // (배송 완료/도착 이벤트)가 없어 하나로 합친다.
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
    }
  }, [embedded, trade, hasMeetingSchedule, timeRefreshSignal, isDeliveryProofSubmitted, onStepperChange]);

  // 택배 거래는 구매자가 먼저 완료 확인을 해야 하므로, 판매자는 구매자가 이미 요청한
  // 뒤(completionRequestedBy === 'BUYER')에만 확인할 수 있다 - 직거래 이전처럼 먼저 요청하는
  // 경로는 제거한다. 직거래는 기존대로 누구든 먼저 확인을 진행할 수 있다.
  const canRequestSellerCompletion = isSellerCompletionReady
    && (
      trade?.method === 'DELIVERY'
        ? (
          ['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade?.status)
          && trade?.completionRequestedBy === 'BUYER'
        )
        : (
            ['IN_PROGRESS', 'DELIVERING'].includes(trade?.status)
        )
    );
  const isOfflineCompletionResponsePending = (
    trade?.method === 'OFFLINE'
    && trade?.canRespondToOfflineCompletionRequest
  );
  const chatPath = `/trades/${tradeId}/chat?from=seller`;

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
    invalidateAuctionTradeCaches();
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

    navigate('/user/mypage/auctions/sales');
  };

  // URL의 거래 번호로 서버 상세를 조회해 새로고침해도 같은 거래를 표시한다.
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

  // 거래 번호가 바뀌면 렌더링 완료 뒤에 배송 폼을 해당 거래 정보로 다시 초기화한다.
  // initialTrade가 주입된 경우(embedded)는 이미 데이터가 있으므로 다시 조회하지 않는다.
  useEffect(() => {
    if (initialTrade) {
      return undefined;
    }

    const requestTimer = window.setTimeout(loadTrade, 0);

    return () => window.clearTimeout(requestTimer);
  }, [loadTrade, initialTrade]);

  // 파일을 고른 즉시 업로드하고, 제출 전까지는 파일 번호와 로컬 미리보기만 유지한다.
  const handleShippingProofChange = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    if (shippingProofFiles.length + selectedFiles.length > MAX_SHIPPING_PROOF_FILES) {
      setShippingProofError(`인증 사진은 최대 ${MAX_SHIPPING_PROOF_FILES}장까지 등록할 수 있습니다.`);
      event.target.value = '';
      return;
    }

    for (const selectedFile of selectedFiles) {
      if (!SHIPPING_PROOF_IMAGE_TYPES.includes(selectedFile.type)) {
        setShippingProofError('JPG, PNG, WEBP 이미지 파일만 선택할 수 있습니다.');
        event.target.value = '';
        return;
      }

      if (selectedFile.size > MAX_SHIPPING_PROOF_FILE_SIZE) {
        setShippingProofError('인증 사진은 10MB 이하 파일만 등록할 수 있습니다.');
        event.target.value = '';
        return;
      }
    }

    setShippingProofError('');
    setIsUploadingProof(true);

    try {
      const uploadedFiles = await Promise.all(selectedFiles.map(async (file) => {
        const uploadResponse = await uploadDeliveryProof(file);
        // 파일 API는 공통 응답 래퍼의 data 안에 flSn을 담아 반환한다.
        // 실제 파일 번호를 보관해야 삭제와 발송 인증 제출에 같은 파일을 사용할 수 있다.
        const uploadedFile = uploadResponse.data ?? uploadResponse;

        if (!uploadedFile.flSn) {
          throw new Error('업로드한 인증 사진 번호를 확인하지 못했습니다.');
        }

        return {
          ...uploadedFile,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
        };
      }));

      setShippingProofFiles((currentFiles) => [
        ...currentFiles,
        ...uploadedFiles,
      ]);
    } catch (uploadError) {
      setShippingProofError(
        uploadError.response?.data?.message
          ?? '인증 사진 업로드에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      event.target.value = '';
      setIsUploadingProof(false);
    }
  };

  // 제출 전 사진을 지우면 서버의 고아 파일도 함께 정리한다. 연결 완료 파일은 서버가 삭제를 거부한다.
  const removeShippingProof = async (fileToRemove) => {
    setShippingProofError('');

    try {
      await deleteImage(fileToRemove.flSn);
      URL.revokeObjectURL(fileToRemove.previewUrl);
      setShippingProofFiles((currentFiles) => currentFiles.filter(
        (file) => file.flSn !== fileToRemove.flSn,
      ));
    } catch (deleteError) {
      setShippingProofError(
        deleteError.response?.data?.message
          ?? '인증 사진 삭제에 실패했습니다. 다시 시도해 주세요.',
      );
    }
  };

  // 파일과 메모를 한 트랜잭션으로 제출해 메모만 저장되는 반쪽 상태를 막는다.
  const submitDeliveryProof = async () => {
    if (!shippingMemo.trim()) {
      setShippingProofError('배송 메모를 작성해 주세요.');
      return;
    }

    if (!shippingProofFiles.length) {
      setShippingProofError('발송 인증 사진을 한 장 이상 등록해 주세요.');
      return;
    }

    setShippingProofError('');
    setIsSubmitting(true);

    try {
      const response = await submitTradeDeliveryProof(tradeId, {
        deliveryMessage: shippingMemo.trim(),
        fileIds: shippingProofFiles.map((file) => file.flSn),
      });

      shippingProofFiles.forEach((file) => URL.revokeObjectURL(file.previewUrl));
      setShippingProofFiles([]);
      setTrade(toTradeDetail(response));
      invalidateAuctionTradeCaches();
      setNotice('발송 인증을 등록했습니다. 구매자가 인증 사진을 확인할 수 있습니다.');
    } catch (submitError) {
      setShippingProofError(
        submitError.response?.data?.message
          ?? '발송 인증 등록에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 판매자·구매자의 두 번째 완료 확인이 모두 끝나면 서버가 거래 완료와 정산 대기를 함께 처리한다.
  const requestSellerCompletion = async () => {
    if (!completionAgreed || !canRequestSellerCompletion) {
      return;
    }

    setIsCompletionSubmitting(true);

    try {
      const response = await requestTradeCompletion(tradeId);
      const updatedTrade = toTradeDetail(response);

      setTrade(updatedTrade);
      invalidateAuctionTradeCaches();
      setCompletionAgreed(false);
      setNotice(
        updatedTrade.status === 'COMPLETED'
          ? '구매자와 판매자의 완료 확인이 모두 끝나 거래가 완료되었습니다.'
          : '거래 완료 확인을 보냈습니다. 구매자의 확인을 기다려 주세요.',
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
          ?? '거래 완료 확인에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setIsCompletionSubmitting(false);
    }
  };

  const handleOfflineCompletionDecision = async (approve) => {
    if (!isOfflineCompletionResponsePending) return;

    setIsCompletionSubmitting(true);
    try {
      const response = await respondOfflineTradeCompletionRequest(tradeId, 'SELLER', approve);
      const updatedTrade = toTradeDetail(response);
      setTrade(updatedTrade);
      invalidateAuctionTradeCaches();
      setCompletionAgreed(false);
      setNotice(approve
        ? '거래 완료에 동의해 거래가 완료되었습니다.'
        : '거래 완료 요청을 거절했습니다. 거래를 계속 진행하거나 일정 변경을 제안할 수 있습니다.');
    } catch (completionError) {
      setNotice(completionError.response?.data?.message ?? '거래 완료 요청 응답에 실패했습니다.');
    } finally {
      setIsCompletionSubmitting(false);
    }
  };

  const handleCompletionRefreshConfirm = async () => {
    setCompletionRefreshAlertMessage('');
    await loadTrade();
    invalidateAuctionTradeCaches();
  };

  // 오늘 화면을 오래 열어 둔 경우에도 과거 시간대가 남지 않게 목록을 분 단위로 갱신한다.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeRefreshSignal((current) => current + 1);
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  if (isLoading && !loadError) {
    return <TradeDetailSkeleton embedded={embedded} role="seller" />;
  }

  if (loadError || !trade) {
    return <TradeDetailErrorState role="seller" contentClassName={contentClassName} onRetry={loadTrade} />;
  }

  const offlineProgressConfig = getOfflineTradeProgressConfig(trade);

  const overviewStatusMessages = trade.method === 'OFFLINE'
    ? splitSentences(sellerOfflineNextStep.description)
    : trade.status === 'COMPLETED'
      ? ['거래가 완료되었습니다.', '구매자와 판매자의 완료 확인이 모두 처리되었습니다.']
      : ['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade.status)
        ? ['구매자가 거래 완료를 확인했습니다.', '판매자가 확인하면 거래가 완료됩니다.']
        : trade.status === 'DELIVERING'
          ? ['발송 인증을 등록했습니다.', '구매자의 확인을 기다리고 있습니다.']
          : ['발송 인증을 등록해 주세요.', '등록하면 구매자가 확인할 수 있습니다.'];
  const chatButtonLabel = getTradeChatButtonLabel(trade);
  const chatDescription = getTradeChatDescription(trade);

  if (trade.method === 'OFFLINE') {
    return (
      <div className="trade-detail-page trade-detail-page--seller">
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
              steps={offlineProgressConfig.steps}
              activeIndex={offlineProgressConfig.activeIndex}
              ariaLabel={offlineProgressConfig.ariaLabel}
            />
          )}

          <div className="trade-detail-grid">
            {/* 1영역은 배송·직거래가 같은 공통 카드 구조를 사용한다. */}
            <TradeDetailOverviewCard
              trade={trade}
              statusLabel={sellerOfflineNextStep.label}
              statusClassName={sellerOfflineNextStep.className}
              statusMessages={overviewStatusMessages}
              counterpartTitle="구매자 정보"
              auctionId={auctionId}
              onReport={handleOpenReport}
              onCancelRequest={
                auctionId && CANCELABLE_TRADE_STATUSES.includes(trade.status)
                  ? () => setCancelOpen(true)
                  : undefined
              }
            />

            {/* 가운데: 직거래 일정 협의와 거래 확인을 카드 하나로 합친다. */}
            <section className="trade-detail-card">
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
              {hasMeetingSchedule && (
                  <div className="trade-detail-card__block">
                    <h3>거래 확인</h3>
                    {splitSentences(
                      trade.status === 'COMPLETED'
                        ? '구매자와 판매자의 완료 확인이 모두 처리되었습니다.'
                        : trade.autoCompleteAt !== '-'
                        ? `${trade.autoCompleteAt}까지 ${trade.completionRequestedBy === 'BUYER' ? '판매자' : '구매자'} 확인이 없으면 자동으로 거래가 완료됩니다.`
                        : '거래가 완료되었다면 구매자와 서로 완료 확인을 진행해 주세요.',
                    ).map((sentence) => <p key={sentence}>{sentence}</p>)}
                    <p className="trade-detail-card__muted">
                      내 거래 완료 확인 요청 {trade.myOfflineCompletionRequestCount}/2회 · 남은 요청 {trade.remainingOfflineCompletionRequestCount}회
                    </p>
                    {trade.status !== 'COMPLETED' && canRequestSellerCompletion && (
                      <>
                        <label className="trade-complete-card__check">
                          <input
                            type="checkbox"
                            checked={completionAgreed}
                            onChange={(event) => setCompletionAgreed(event.target.checked)}
                            disabled={isCompletionSubmitting}
                          />
                          거래가 완료되었음을 확인합니다
                        </label>
                        <p className="trade-detail-card__muted">
                          확인 요청 이후에는 구매자의 확인이나 이의제기 없이 일정 기간이 지나야 합니다.
                        </p>
                        <div className="trade-detail-actions trade-detail-actions--end">
                          <ActionButton
                            disabled={!completionAgreed || isCompletionSubmitting}
                            loading={isCompletionSubmitting}
                            onClick={requestSellerCompletion}
                          >
                            {isCompletionSubmitting ? '확인 중...' : '거래 완료 확인 요청'}
                          </ActionButton>
                        </div>
                      </>
                    )}
                    {trade.status !== 'COMPLETED' && isOfflineCompletionResponsePending && (
                      <div className="trade-detail-actions trade-detail-actions--end">
                        <ActionButton
                          disabled={isCompletionSubmitting}
                          onClick={() => handleOfflineCompletionDecision(false)}
                          tone="danger"
                        >
                          거절
                        </ActionButton>
                        <ActionButton
                          disabled={isCompletionSubmitting}
                          onClick={() => handleOfflineCompletionDecision(true)}
                        >
                          동의하고 거래 완료
                        </ActionButton>
                      </div>
                    )}
                  </div>

              )}
            </section>

            {/* 오른쪽: 거래 리뷰 */}
            {reviewSlot}
          </div>

        </div>
        {notice && <Toast message={notice} onClose={() => setNotice('')} />}
        <AlertModal
          confirmLabel="확인"
          message={completionRefreshAlertMessage}
          onClose={handleCompletionRefreshConfirm}
          open={Boolean(completionRefreshAlertMessage)}
        />
        <div className={`modal ${cancelOpen ? 'open' : ''}`} onClick={e => { if (e.target === e.currentTarget) closeCancel(); }}>
          <div className="modal-box">
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>경매 취소 요청</h3>
            <div className="field">
              <label>취소 사유 선택</label>
              <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                <option value="">사유를 선택해 주세요</option>
                {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <p className="muted small" style={{ marginBottom: 16 }}>
              취소 요청은 관리자 승인 후 처리됩니다. 승인 전까지 구매자의 포인트 보관금은 유지됩니다.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <ActionButton onClick={closeCancel} tone="neutral">닫기</ActionButton>
              <ActionButton loading={cancelSubmitting} onClick={handleCancelSubmit} tone="danger">
                {cancelSubmitting ? '요청 중...' : '취소 요청 제출'}
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 택배 거래가 아닌 알 수 없는 방식은 계약 확정 전 안내 화면으로 분리한다.
  if (trade.method !== 'DELIVERY') {
    return (
      <div className="trade-detail-page trade-detail-page--seller">
        <main className={`${contentClassName} trade-detail-page__state`}>
          <section className="trade-detail-card">
            <h1>거래 방식 확인</h1>
            <p>현재 이 거래의 상세 정보를 표시할 수 없습니다. 거래 목록에서 다시 확인해 주세요.</p>
            <ActionButton
              onClick={handleBackToList}
              tone="neutral"
            >
              ← 목록으로
            </ActionButton>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="trade-detail-page trade-detail-page--seller">
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
            steps={['배송 등록', '구매자 확인 대기', '완료']}
            activeIndex={!isDeliveryProofSubmitted ? 0 : trade.status === 'COMPLETED' ? 2 : 1}
            ariaLabel="거래 진행 단계"
          />
        )}

        <div className="trade-detail-grid">
          {/* 1영역은 배송·직거래가 같은 공통 카드 구조를 사용한다. */}
          <TradeDetailOverviewCard
            trade={trade}
            statusLabel={sellerTradeStatusInfo.label}
            statusClassName={sellerTradeStatusInfo.className}
            statusMessages={overviewStatusMessages}
            counterpartTitle="구매자 정보"
            auctionId={auctionId}
            onReport={handleOpenReport}
            onCancelRequest={
              auctionId && CANCELABLE_TRADE_STATUSES.includes(trade.status)
                ? () => setCancelOpen(true)
                : undefined
            }
          />

          {/* 가운데: 구매자 배송지 + (발송 인증 등록 또는 거래 완료 확인)을 카드 하나로 합친다. */}
          <section className="trade-detail-card">
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
              {visibleSubmittedProofUrls.length > 0 && (
                <div className="trade-delivery-proof-gallery">
                  <div>
                    {visibleSubmittedProofUrls.map((file, index) => (
                      <button
                        className="trade-delivery-proof-gallery__item"
                        key={file.fileId}
                        type="button"
                        onClick={() => setSelectedProofIndex(index)}
                      >
                        <img
                          src={file.objectUrl}
                          alt={`발송 인증 사진 ${index + 1} 크게 보기`}
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
              {visibleSubmittedProofUrls.length === 0
                && trade.deliveryProofRegisteredAt === '-'
                && trade.deliveryMessage === '-' && (
                <p className="trade-detail-card__muted">
                  아직 발송 인증을 등록하지 않았습니다.
                </p>
              )}
            </div>

            {isDeliveryProofSubmitted ? (
              <div className="trade-detail-card__block">
                <h3>거래 확인</h3>
                {/* 택배 거래는 구매자가 먼저 완료 확인을 해야 하므로, CONFIRM_PENDING/
                    WAITING_CONFIRMATION은 항상 구매자가 이미 확인한 뒤라 판매자 확인만 남는다. */}
                {splitSentences(
                  trade.status === 'COMPLETED'
                    ? '구매자와 판매자의 완료 확인이 모두 처리되었습니다.'
                    : ['CONFIRM_PENDING', 'WAITING_CONFIRMATION'].includes(trade.status)
                      ? '구매자가 거래 완료를 확인했습니다. 판매자가 확인하면 거래가 완료됩니다.'
                      : '구매자가 상품을 수령한 뒤 완료 확인을 하면, 판매자 확인 절차로 넘어갑니다.',
                ).map((sentence) => <p key={sentence}>{sentence}</p>)}
                {trade.status !== 'COMPLETED' && canRequestSellerCompletion && (
                  <>
                    <label className="trade-complete-card__check">
                      <input
                        type="checkbox"
                        checked={completionAgreed}
                        onChange={(event) => setCompletionAgreed(event.target.checked)}
                        disabled={isCompletionSubmitting}
                      />
                      거래가 완료되었음을 확인합니다
                    </label>
                    <p className="trade-detail-card__muted">
                      확인 요청 이후에는 구매자의 확인이나 이의제기 없이 일정 기간이 지나야 합니다.
                    </p>
                    <div className="trade-detail-actions trade-detail-actions--end">
                      <ActionButton
                        disabled={!completionAgreed || isCompletionSubmitting}
                        loading={isCompletionSubmitting}
                        onClick={requestSellerCompletion}
                      >
                        {isCompletionSubmitting ? '확인 중...' : '거래 완료 확인'}
                      </ActionButton>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="trade-detail-card__block">
                <h3>발송 인증 등록</h3>
                <p className="trade-notice">
                  발송한 상품과 포장 상태가 보이도록 사진을 최대 5장 등록하고, 배송 메모를 작성해 주세요.
                </p>

                <div className="trade-proof-upload-area">
                  <div className="trade-proof-upload-box">
                    <label className="trade-proof-upload" htmlFor={`shipping-proof-${trade.id}`}>
                      <input
                        id={`shipping-proof-${trade.id}`}
                        className="trade-proof-upload__input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleShippingProofChange}
                        disabled={isUploadingProof || isSubmitting}
                      />
                      <span className="trade-proof-upload__icon" aria-hidden="true">
                        ↑
                      </span>
                      <strong>발송 인증 사진 선택</strong>
                      <span>JPG, PNG, WEBP · 장당 최대 10MB · 최대 5장</span>
                    </label>

                    {shippingProofFiles.length > 0 && (
                      <ul className="trade-proof-thumbnail-list" aria-label="업로드한 발송 인증 사진">
                        {shippingProofFiles.map((file, index) => (
                          <li key={file.flSn}>
                            <img src={file.previewUrl} alt={`발송 인증 사진 ${index + 1}`} />
                            <button
                              type="button"
                              onClick={() => removeShippingProof(file)}
                              disabled={isSubmitting}
                              aria-label={`발송 인증 사진 ${index + 1} 삭제`}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {isUploadingProof && <p className="trade-proof-upload__filename">사진을 업로드하는 중입니다.</p>}
                </div>

                <label className="trade-form-field">
                  배송 메모
                  <textarea
                    className="input trade-form-field__textarea trade-delivery-memo"
                    value={shippingMemo}
                    onChange={(event) => setShippingMemo(event.target.value)}
                    placeholder="예: 7월 20일 오후에 발송했습니다. 포장 상태는 사진으로 확인해 주세요."
                    maxLength={500}
                  />
                  <span className="trade-form-field__count">
                    {shippingMemo.length.toLocaleString()} / 500
                  </span>
                </label>

                {shippingProofError && (
                  <p className="trade-form-error" role="alert">
                    {shippingProofError}
                  </p>
                )}

                <div className="trade-proof-submit-actions">
                  <ActionButton
                    onClick={submitDeliveryProof}
                    disabled={isUploadingProof}
                    loading={isSubmitting}
                  >
                    {isSubmitting ? '발송 인증 등록 중...' : '발송 인증 등록하기'}
                  </ActionButton>
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
        photoUrls={visibleSubmittedProofUrls.map((file) => file.objectUrl)}
        index={hasSubmittedProofFiles ? selectedProofIndex : null}
        onClose={() => setSelectedProofIndex(null)}
        onNavigate={setSelectedProofIndex}
      />

      {notice && <Toast message={notice} onClose={() => setNotice('')} />}
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
      <div className={`modal ${cancelOpen ? 'open' : ''}`} onClick={e => { if (e.target === e.currentTarget) closeCancel(); }}>
        <div className="modal-box">
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>경매 취소 요청</h3>
          <div className="field">
            <label>취소 사유 선택</label>
            <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
              <option value="">사유를 선택해 주세요</option>
              {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <p className="muted small" style={{ marginBottom: 16 }}>
            취소 요청은 관리자 승인 후 처리됩니다. 승인 전까지 구매자의 포인트 보관금은 유지됩니다.
          </p>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <ActionButton onClick={closeCancel} tone="neutral">닫기</ActionButton>
            <ActionButton loading={cancelSubmitting} onClick={handleCancelSubmit} tone="danger">
              {cancelSubmitting ? '요청 중...' : '취소 요청 제출'}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeDetailSeller;
