import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyActiveQuote,
  getMyQuotes,
  getMyQuoteSummary,
  getQuoteHistory,
  submitQuote,
  updateQuote,
  withdrawQuote,
} from '../api/quoteApi';

/** 내 견적 목록 — data: PageResponse { content, totalCount, page, size, hasNext } */
export function useMyQuotes({ page = 1, size = 50 } = {}) {
  return useQuery({
    queryKey: ['quotes', 'my', { page, size }],
    queryFn: () => getMyQuotes({ page, size }),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });
}

/** F-PROV-009: 제공자 대시보드용 활성 견적 수 */
export function useMyQuoteSummary() {
  return useQuery({
    queryKey: ['quotes', 'my', 'summary'],
    queryFn: getMyQuoteSummary,
    select: (res) => res.data,
  });
}

/** F-SVC-005: 견적 제출 */
export function useSubmitQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitQuote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes', 'my'] }),
  });
}

/** F-SVC-006: 견적 수정 — mutateAsync({ quoteId, amount, content }) */
export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, ...data }) => updateQuote(quoteId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes', 'my'] }),
  });
}

/** F-SVC-008: 견적 철회 */
export function useWithdrawQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quoteId) => withdrawQuote(quoteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes', 'my'] }),
  });
}

/** 현재 제공자의 서비스 요청별 활성 견적. 새 제출/수정 화면 분기에 사용한다. */
export function useMyActiveQuote(svcReqSn) {
  return useQuery({
    queryKey: ['quotes', 'my', 'service-request', svcReqSn],
    queryFn: () => getMyActiveQuote(svcReqSn),
    select: (res) => res.data,
    enabled: Boolean(svcReqSn),
    retry: false,
  });
}

/** 견적 수정 이력 — data: QuoteHistoryResponse[] */
export function useQuoteHistory(quoteId) {
  return useQuery({
    queryKey: ['quotes', quoteId, 'history'],
    queryFn: () => getQuoteHistory(quoteId),
    select: (res) => res.data,
    enabled: !!quoteId,
  });
}
