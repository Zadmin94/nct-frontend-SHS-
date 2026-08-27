import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { fetchReferenceCodes } from '@api/referenceApi';
import {
  createCustomerInquiry,
  getMyCustomerInquiries,
  getMyCustomerInquiry,
} from '@api/customerInquiryApi';

export const customerInquiryQueryKeys = {
  all: ['customer-inquiries'],
  types: () => [...customerInquiryQueryKeys.all, 'types'],
  myLists: () => [...customerInquiryQueryKeys.all, 'my'],
  myList: ({ statusCode, page, size }) => [
    ...customerInquiryQueryKeys.myLists(),
    statusCode || 'all',
    page,
    size,
  ],
  myDetail: (inquirySn) => [...customerInquiryQueryKeys.myLists(), 'detail', inquirySn],
};

/** 담당자 7 · 관리자 대상 1:1 문의: 공개 공통코드와 본인 문의 캐시를 같은 규칙으로 관리합니다. */
export const useCustomerInquiryTypes = () => useQuery({
  queryKey: customerInquiryQueryKeys.types(),
  queryFn: () => fetchReferenceCodes('INQG01'),
  staleTime: 5 * 60 * 1000,
});

export const useMyCustomerInquiries = ({ statusCode = '', page = 1, size = 5 } = {}) => useQuery({
  queryKey: customerInquiryQueryKeys.myList({ statusCode, page, size }),
  queryFn: () => getMyCustomerInquiries({ statusCode, page, size }),
  placeholderData: keepPreviousData,
});

export const useMyCustomerInquiry = (inquirySn, enabled = true) => useQuery({
  queryKey: customerInquiryQueryKeys.myDetail(inquirySn),
  queryFn: () => getMyCustomerInquiry(inquirySn),
  enabled: enabled && Number.isSafeInteger(Number(inquirySn)) && Number(inquirySn) > 0,
});

export const useCreateCustomerInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomerInquiry,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: customerInquiryQueryKeys.myLists(),
    }),
  });
};
