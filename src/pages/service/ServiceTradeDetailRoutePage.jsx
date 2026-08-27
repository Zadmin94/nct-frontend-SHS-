import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  getServiceTradeDetail,
  decideServiceScheduleCancellation,
  requestServiceScheduleCancellation,
  requestServiceScheduleChange,
} from '@api/serviceTradeApi';
import { reviewQueryKeys } from '@hooks/useReview';
import ServiceTradeDetailSkeleton from '@components/skeleton/ServiceTradeDetailSkeleton';
import { ActionButton } from '@components/common/ui';
import ServiceTradeDetailPage from './ServiceTradeDetailPage';

const serviceTradeDetailQueryKey = (tradeId) => ['service-trade-detail', tradeId];

export default function ServiceTradeDetailRoutePage() {
  const { tradeId: tradeIdParam } = useParams();
  const queryClient = useQueryClient();
  const tradeId = Number(tradeIdParam);
  const isValidTradeId = Number.isSafeInteger(tradeId) && tradeId > 0;
  const detailQuery = useQuery({
    queryKey: serviceTradeDetailQueryKey(tradeId),
    queryFn: () => getServiceTradeDetail(tradeId),
    enabled: isValidTradeId,
    retry: false,
  });
  // 거래 상태 변경 후 상세·목록과 함께 리뷰 작성 가능 상태도 최신화한다.
  // 완료 직전 조회한 UNAVAILABLE 캐시가 남으면, 거래가 완료되어도 리뷰 폼이 잠긴 채 보일 수 있다.
  const refreshTradeData = () => Promise.all([
    queryClient.invalidateQueries({
      queryKey: serviceTradeDetailQueryKey(tradeId),
    }),
    queryClient.invalidateQueries({
      queryKey: ['my-service-trades'],
    }),
    queryClient.invalidateQueries({
      queryKey: reviewQueryKeys.trade(tradeId),
    }),
    queryClient.invalidateQueries({
      queryKey: reviewQueryKeys.counterpartTrade(tradeId),
    }),
    queryClient.invalidateQueries({
      queryKey: reviewQueryKeys.writable,
    }),
  ]);

  if (!isValidTradeId) {
    return (
      <main className="service-trade-detail-page">
        <section className="container service-trade-detail-page__empty">
          <h1>서비스 거래 상세</h1>
          <p>올바른 거래번호가 필요합니다.</p>
        </section>
      </main>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <main className="service-trade-detail-page">
        <section className="container">
          <ServiceTradeDetailSkeleton />
        </section>
      </main>
    );
  }

  if (detailQuery.isError) {
    const status = detailQuery.error?.response?.status;
    const message = status === 403
      ? '이 서비스 거래의 당사자만 상세 내용을 확인할 수 있습니다.'
      : status === 404
        ? '서비스 거래 정보를 찾을 수 없습니다.'
        : detailQuery.error?.response?.data?.message ?? '서비스 거래 정보를 불러오지 못했습니다.';

    return (
      <main className="service-trade-detail-page">
        <section className="container service-trade-detail-page__empty">
          <h1>서비스 거래 상세</h1>
          <p>{message}</p>
          <ActionButton onClick={() => detailQuery.refetch()}>
            다시 시도
          </ActionButton>
        </section>
      </main>
    );
  }

  return (
    <ServiceTradeDetailPage
      onActionCompleted={refreshTradeData}
      onRequestScheduleChange={requestServiceScheduleChange}
      onRequestScheduleCancellation={requestServiceScheduleCancellation}
      onDecideScheduleCancellation={decideServiceScheduleCancellation}
      trade={detailQuery.data}
    />
  );
}
