import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getMyReportDetail,
  getMyReports,
  submitCustomerReport,
  submitTradeReport,
} from '../api/abuseReportApi';
import { deleteImage, uploadAbuseReportFile } from '../api/fileApi';
import { fetchReferenceCodes } from '../api/referenceApi';

export function useAbuseReportTypes() {
  return useQuery({
    queryKey: ['reference-codes', 'ABRG01'],
    queryFn: () => fetchReferenceCodes('ABRG01'),
    staleTime: 5 * 60 * 1000,
  });
}

/** 내 신고 목록 — data: PageResponse { content, totalCount, page, size, hasNext } */
export function useMyReports({ status = null, page = 1, size = 5 } = {}) {
  return useQuery({
    queryKey: ['abuse-reports', 'my', { status, page, size }],
    queryFn: () => getMyReports({ status: status || undefined, page, size }),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });
}

/** 담당자 7 · F-COM-018: 파일 업로드와 신고 연결을 묶고 실패 시 미연결 파일을 정리합니다. */
export function useSubmitCustomerReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ files = [], ...report }) => {
      const uploadedFileSns = [];
      let reportCreated = false;
      try {
        for (const file of files) {
          const uploadResponse = await uploadAbuseReportFile(file);
          const uploadedFile = uploadResponse.data ?? uploadResponse;
          if (!uploadedFile.flSn) {
            throw new Error('업로드한 신고 첨부 파일 번호를 확인하지 못했습니다.');
          }
          uploadedFileSns.push(uploadedFile.flSn);
        }
        const response = await submitCustomerReport({
          ...report,
          fileSns: uploadedFileSns,
        });
        reportCreated = true;
        return response;
      } catch (error) {
        if (!reportCreated && uploadedFileSns.length > 0) {
          await Promise.allSettled(uploadedFileSns.map((fileSn) => deleteImage(fileSn)));
        }
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['abuse-reports', 'my'] }),
  });
}

export function useSubmitTradeReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tradeId, files = [], ...report }) => {
      const uploadedFileSns = [];
      let reportCreated = false;
      try {
        for (const file of files) {
          const uploadResponse = await uploadAbuseReportFile(file);
          const uploadedFile = uploadResponse.data ?? uploadResponse;
          if (!uploadedFile.flSn) {
            throw new Error('업로드한 신고 첨부 파일 번호를 확인하지 못했습니다.');
          }
          uploadedFileSns.push(uploadedFile.flSn);
        }
        const response = await submitTradeReport(tradeId, {
          ...report,
          fileSns: uploadedFileSns,
        });
        reportCreated = true;
        return response;
      } catch (error) {
        if (!reportCreated && uploadedFileSns.length > 0) {
          await Promise.allSettled(uploadedFileSns.map((fileSn) => deleteImage(fileSn)));
        }
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['abuse-reports', 'my'] }),
  });
}

/** 담당자 7 · F-COM-018: 펼친 신고 한 건의 첨부를 포함한 상세를 조회합니다. */
export function useMyReportDetail(reportSn, enabled = true) {
  return useQuery({
    queryKey: ['abuse-reports', 'my', 'detail', reportSn],
    queryFn: () => getMyReportDetail(reportSn),
    select: (res) => res.data,
    enabled: enabled && Number.isSafeInteger(Number(reportSn)) && Number(reportSn) > 0,
  });
}
