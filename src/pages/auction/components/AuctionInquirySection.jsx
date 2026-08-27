import { memo, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Pencil, RotateCcw, Send, X } from 'lucide-react';
import { fetchActiveManualAbuseReportReferences } from '@api/abuseReportApi';
import {
  fetchBannedKeywords,
  fetchProductInquiries,
  postProductInquiry,
  updateProductInquiry,
} from '@api/productApi';
import Pagination from '@components/common/Pagination';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import useCountdown from '@hooks/useCountdown';
import { confirm as confirmAction } from '@utils/common';
import { ActionButton } from '@components/common/ui';

const INQUIRY_TYPE_CODE = 'PRDC0006';
const ANSWER_TYPE_CODE = 'PRDC0007';
const PRODUCT_COMMENT_REFERENCE_TYPE = 'REFC0012';
const MAX_INQUIRY_LENGTH = 500;
const INQUIRIES_PER_PAGE = 4;
const INQUIRY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const findBannedKeyword = (value, keywords) => {
  const normalizedValue = String(value || '').toLowerCase();

  return (Array.isArray(keywords) ? keywords : []).find((keyword) => {
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    return normalizedKeyword && normalizedValue.includes(normalizedKeyword);
  });
};

const formatBannedKeywordError = (keyword) => (
  keyword ? `'${keyword}'은(는) 등록할 수 없는 문의 내용입니다.` : ''
);

const formatRegisteredAt = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const formatCooldownRemaining = (remainingMs) => {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  return `${minutes}분`;
};

const groupInquiryRows = (rows) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const answersByParent = new Map(
    safeRows
      .filter((row) => row.prdCmtTypeCd === ANSWER_TYPE_CODE && row.prdCmtParentSn != null)
      .map((row) => [String(row.prdCmtParentSn), row]),
  );

  return safeRows
    .filter((row) => row.prdCmtTypeCd === INQUIRY_TYPE_CODE)
    .map((inquiry) => ({
      ...inquiry,
      answer: answersByParent.get(String(inquiry.prdCmtSn)) ?? null,
    }));
};

const AuctionInquirySection = ({
  sectionId,
  productId,
  isAuthenticated,
  isOwnAuction,
  isInquiryAvailable = true,
  currentUserId,
  enabled = true,
  onLoginRequired,
  onToast,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [page, setPage] = useState(1);
  const [editingInquirySn, setEditingInquirySn] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingError, setEditingError] = useState('');
  const queryKey = useMemo(() => ['productInquiries', productId], [productId]);

  const inquiryQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetchProductInquiries(productId);
      return response?.data ?? [];
    },
    enabled: Boolean(enabled && productId),
  });

  const bannedKeywordQuery = useQuery({
    queryKey: ['productBannedKeywords'],
    queryFn: async () => {
      const response = await fetchBannedKeywords();
      return Array.isArray(response?.data) ? response.data : [];
    },
    enabled: Boolean(enabled && isAuthenticated),
    staleTime: 10 * 60 * 1000,
  });

  const inquiryMutation = useMutation({
    mutationFn: (inquiryContent) => postProductInquiry(productId, { cn: inquiryContent }),
    onSuccess: async () => {
      setContent('');
      await queryClient.invalidateQueries({ queryKey });
      onToast('문의가 등록되었습니다');
    },
    onError: (error) => {
      onToast(error?.response?.data?.message || '문의 등록에 실패했습니다');
    },
  });

  const updateInquiryMutation = useMutation({
    mutationFn: ({ inquirySn, inquiryContent }) => (
      updateProductInquiry(productId, inquirySn, { cn: inquiryContent })
    ),
    onSuccess: async () => {
      setEditingInquirySn(null);
      setEditingContent('');
      setEditingError('');
      await queryClient.invalidateQueries({ queryKey });
      onToast('문의가 수정되었습니다');
    },
    onError: async (error) => {
      const message = error?.response?.data?.message || '문의 수정에 실패했습니다';
      setEditingError(message);
      onToast(message);
      if (error?.response?.status === 409) {
        await queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const inquiries = useMemo(
    () => groupInquiryRows(inquiryQuery.data),
    [inquiryQuery.data],
  );
  const latestOwnInquiryAt = useMemo(() => {
    if (!isAuthenticated || currentUserId == null) return null;

    return inquiries.reduce((latest, inquiry) => {
      if (inquiry.usrSn == null || String(inquiry.usrSn) !== String(currentUserId)) {
        return latest;
      }

      const registeredAt = new Date(inquiry.prdCmtRegDt).getTime();
      if (Number.isNaN(registeredAt)) return latest;
      return latest == null || registeredAt > latest ? registeredAt : latest;
    }, null);
  }, [currentUserId, inquiries, isAuthenticated]);
  const nextInquiryAvailableAt = latestOwnInquiryAt == null
    ? null
    : latestOwnInquiryAt + INQUIRY_COOLDOWN_MS;
  const cooldownNow = useCountdown(Boolean(nextInquiryAvailableAt), nextInquiryAvailableAt);
  const cooldownRemainingMs = nextInquiryAvailableAt == null
    ? 0
    : Math.max(0, nextInquiryAvailableAt - cooldownNow);
  const isInquiryCooldown = cooldownRemainingMs > 0;
  const cooldownMessage = isInquiryCooldown
    ? `${formatCooldownRemaining(cooldownRemainingMs)} 뒤에 다시 문의할 수 있습니다.`
    : '';
  const totalPages = Math.ceil(inquiries.length / INQUIRIES_PER_PAGE);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const pagedInquiries = useMemo(() => {
    const startIndex = (currentPage - 1) * INQUIRIES_PER_PAGE;
    return inquiries.slice(startIndex, startIndex + INQUIRIES_PER_PAGE);
  }, [currentPage, inquiries]);

  const inquiryReferenceSns = useMemo(
    () => inquiries.map((inquiry) => inquiry.prdCmtSn).filter(Boolean),
    [inquiries],
  );
  const activeReportStatusQueryKey = useMemo(
    () => [
      'activeAbuseReportReferences',
      PRODUCT_COMMENT_REFERENCE_TYPE,
      inquiryReferenceSns.join(','),
    ],
    [inquiryReferenceSns],
  );
  const activeReportStatusQuery = useQuery({
    queryKey: activeReportStatusQueryKey,
    queryFn: async () => {
      const response = await fetchActiveManualAbuseReportReferences(
        PRODUCT_COMMENT_REFERENCE_TYPE,
        inquiryReferenceSns,
      );
      return response?.data ?? [];
    },
    enabled: Boolean(enabled && inquiryQuery.isSuccess && inquiryReferenceSns.length > 0),
  });

  const activeReportedReferenceSns = useMemo(
    () => new Set(
      (Array.isArray(activeReportStatusQuery.data) ? activeReportStatusQuery.data : [])
        .map((report) => String(report.referenceSn)),
    ),
    [activeReportStatusQuery.data],
  );
  const isInquiryAvailabilityLoading = isAuthenticated
    && (!enabled || inquiryQuery.isLoading);
  const trimmedContent = content.trim();
  const bannedKeywords = bannedKeywordQuery.data ?? [];
  const contentBannedKeyword = findBannedKeyword(trimmedContent, bannedKeywords);
  const contentBannedKeywordError = formatBannedKeywordError(contentBannedKeyword);
  const isInquiryInputDisabled = !isAuthenticated
    || isOwnAuction
    || !isInquiryAvailable
    || isInquiryAvailabilityLoading
    || isInquiryCooldown
    || inquiryMutation.isPending;
  const isSubmitDisabled = isOwnAuction
    || !isInquiryAvailable
    || isInquiryAvailabilityLoading
    || isInquiryCooldown
    || inquiryMutation.isPending
    || (isAuthenticated && (!trimmedContent || Boolean(contentBannedKeyword)));
  const isReportStatusWaiting = inquiryQuery.isSuccess
    && inquiryReferenceSns.length > 0
    && activeReportStatusQuery.isPending;
  const isWaiting = !enabled || inquiryQuery.isLoading || isReportStatusWaiting;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    if (isOwnAuction) {
      onToast('본인이 등록한 상품에는 문의할 수 없습니다');
      return;
    }
    if (!isInquiryAvailable) {
      onToast('종료된 경매에는 문의를 등록할 수 없습니다');
      return;
    }
    if (!trimmedContent) {
      onToast('문의 내용을 입력해 주세요');
      return;
    }
    if (contentBannedKeywordError) {
      onToast(contentBannedKeywordError);
      return;
    }

    const confirmed = await confirmAction({
      title: '문의 내용을 확인해 주세요',
      html: '상품 문의 등록 후 6시간이 지나야 다시 문의할 수 있으며,<br>판매자가 답변을 등록하면 해당 문의는 더 이상 수정할 수 없습니다.',
      icon: 'info',
      confirmButtonText: '문의 등록',
      cancelButtonText: '취소',
      reverseButtons: false,
    });
    if (!confirmed) return;

    inquiryMutation.mutate(trimmedContent);
  };

  const startEditing = (inquiry) => {
    setEditingInquirySn(inquiry.prdCmtSn);
    setEditingContent(inquiry.prdCmtCn || '');
    setEditingError('');
  };

  const cancelEditing = () => {
    if (updateInquiryMutation.isPending) return;
    setEditingInquirySn(null);
    setEditingContent('');
    setEditingError('');
  };

  const handleEditSubmit = (event, inquiry) => {
    event.preventDefault();
    const normalizedContent = editingContent.trim();
    if (!normalizedContent) {
      setEditingError('문의 내용을 입력해 주세요');
      return;
    }
    const bannedKeyword = findBannedKeyword(normalizedContent, bannedKeywords);
    if (bannedKeyword) {
      setEditingError(formatBannedKeywordError(bannedKeyword));
      return;
    }
    if (normalizedContent === (inquiry.prdCmtCn || '').trim()) {
      setEditingError('변경된 문의 내용이 없습니다');
      return;
    }
    setEditingError('');
    updateInquiryMutation.mutate({
      inquirySn: inquiry.prdCmtSn,
      inquiryContent: normalizedContent,
    });
  };

  return (
    <section
      className="scroll-mt-[208px] border-b border-[#e2e5ea] py-10 md:scroll-mt-[82px] md:py-14"
      id={sectionId}
      aria-labelledby="auction-inquiry-title"
    >
      <div className="mb-5 flex items-start justify-between gap-6 max-sm:gap-3">
        <div>
          <h2 className="m-0 text-h2 font-bold text-[#1d1d1f]" id="auction-inquiry-title">
            상품 문의
          </h2>
        </div>
        <strong className="text-body-md whitespace-nowrap text-primary-dark">{inquiries.length}건</strong>
      </div>

      {!readOnly && (
        <form className="rounded-lg border border-[#e8e8e8] bg-[#f7f8fa] p-[18px] max-sm:p-3.5" onSubmit={handleSubmit}>
        <label className="mb-2.5 block text-body-md font-bold text-[#1d1d1f]" htmlFor="auction-inquiry-content">
          {!isAuthenticated
            ? '로그인 후 판매자에게 문의할 수 있습니다.'
            : (isOwnAuction
              ? '구매자 문의는 판매자 상품 관리에서 답변할 수 있습니다.'
              : (!isInquiryAvailable
                ? '종료된 경매에는 문의를 등록할 수 없습니다.'
                : (isInquiryAvailabilityLoading
                  ? '문의 가능 여부를 확인하고 있습니다.'
                  : (isInquiryCooldown ? '다음 문의를 기다려 주세요.' : '판매자에게 문의하기'))))}
        </label>
        <textarea
          className={`min-h-28 w-full resize-y rounded-lg border bg-white px-3.5 py-[13px] text-body-sm text-[#1d1d1f] outline-none transition-shadow focus:shadow-[0_0_0_3px_#e5efff] disabled:cursor-not-allowed disabled:bg-[#eeeeef] disabled:text-[#8a8a8a] md:text-body-md ${
            contentBannedKeyword ? 'border-[#c5221f] focus:border-[#c5221f]' : 'border-[#dadada] focus:border-primary'
          }`}
          id="auction-inquiry-content"
          aria-describedby={contentBannedKeywordError ? 'auction-inquiry-banned-keyword-error' : undefined}
          aria-invalid={Boolean(contentBannedKeyword)}
          value={content}
          maxLength={MAX_INQUIRY_LENGTH}
          disabled={isInquiryInputDisabled}
          placeholder={!isAuthenticated
            ? '로그인 후 문의 내용을 입력할 수 있습니다.'
            : (isOwnAuction
              ? '본인 상품에는 문의를 등록할 수 없습니다.'
              : (!isInquiryAvailable
                ? '경매가 종료되어 새 문의를 등록할 수 없습니다.'
                : (isInquiryAvailabilityLoading
                  ? '문의 가능 여부를 확인하고 있습니다.'
                  : (isInquiryCooldown ? '같은 상품에는 6시간마다 문의할 수 있습니다.' : '문의 내용을 입력해 주세요.'))))}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="mt-2.5 flex min-h-10 items-center justify-end gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
          {contentBannedKeywordError ? (
            <p
              className="mr-auto mb-0 text-[13px] leading-[1.5] font-bold text-[#c5221f]"
              id="auction-inquiry-banned-keyword-error"
              role="alert"
            >
              {contentBannedKeywordError}
            </p>
          ) : isInquiryCooldown ? (
            <p className="mr-auto mb-0 inline-flex items-center gap-1.5 text-[13px] leading-[1.5] font-bold text-[#8a5a00]" role="status">
              <Clock3 aria-hidden="true" size={15} />
              {cooldownMessage}
            </p>
          ) : (
            <span className="text-[13px] leading-[1.5] tabular-nums text-[#666] max-sm:text-right">{content.length}/{MAX_INQUIRY_LENGTH}</span>
          )}
          <ActionButton
            className="max-sm:w-full"
            type="submit"
            disabled={isSubmitDisabled}
            loading={inquiryMutation.isPending}
            aria-busy={inquiryMutation.isPending}
          >
            <Send size={16} aria-hidden="true" />
            {inquiryMutation.isPending
              ? '등록 중'
              : (!isInquiryAvailable
                ? '문의 종료'
                : (isInquiryAvailabilityLoading
                  ? '확인 중'
                  : (isInquiryCooldown
                    ? '문의 대기 중'
                    : (isAuthenticated ? '문의 등록' : '로그인 후 문의하기'))))}
          </ActionButton>
        </div>
        </form>
      )}

      <div className="mt-6 grid gap-3" aria-live="polite">
        {isWaiting && (
          <>
            {Array.from({ length: INQUIRIES_PER_PAGE }).map((_, index) => (
              <Skeleton height={148} key={index} style={{ borderRadius: 8 }} />
            ))}
          </>
        )}

        {inquiryQuery.isError && (
          <div className="grid min-h-24 place-items-center content-center gap-2.5 border-y border-[#e8e8e8] text-center text-body-sm text-[#666]">
            <p className="m-0">문의 목록을 불러오지 못했습니다.</p>
            <ActionButton
              onClick={() => inquiryQuery.refetch()}
              size="sm"
              tone="outline"
            >
              <RotateCcw size={15} aria-hidden="true" />
              다시 불러오기
            </ActionButton>
          </div>
        )}

        {!isWaiting && !inquiryQuery.isError && inquiries.length === 0 && (
          <p className="m-0 grid min-h-24 place-items-center border-y border-[#e8e8e8] text-center text-body-sm text-[#666]">
            등록된 문의가 없습니다.
          </p>
        )}

        {!isWaiting && !inquiryQuery.isError && inquiries.length > 0 && pagedInquiries.map((inquiry) => {
          const hasActiveReport = activeReportedReferenceSns.has(String(inquiry.prdCmtSn));
          const isAuthor = currentUserId != null
            && inquiry.usrSn != null
            && String(currentUserId) === String(inquiry.usrSn);
          const canEdit = !readOnly && isAuthenticated && isAuthor && !inquiry.answer;
          const isEditing = canEdit
            && String(editingInquirySn) === String(inquiry.prdCmtSn);
          const normalizedEditingContent = editingContent.trim();
          const editingBannedKeyword = isEditing
            ? findBannedKeyword(normalizedEditingContent, bannedKeywords)
            : null;
          const displayedEditingError = formatBannedKeywordError(editingBannedKeyword)
            || editingError;
          const isEditSubmitDisabled = updateInquiryMutation.isPending
            || !normalizedEditingContent
            || Boolean(editingBannedKeyword)
            || normalizedEditingContent === (inquiry.prdCmtCn || '').trim();

          return (
          <article className="min-h-[148px] rounded-lg border border-[#e8e8e8] bg-white p-[18px]" key={inquiry.prdCmtSn}>
            <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-2">
              <strong className="text-body-sm text-[#1d1d1f]">
                {inquiry.usrNm || '구매자'}
                {hasActiveReport && (
                  <>
                    {' - '}
                    <span className="text-[#c5221f]">신고 접수된 문의</span>
                  </>
                )}
              </strong>
              <div className="flex items-center gap-3">
                <time className="text-caption whitespace-nowrap text-[#666]" dateTime={inquiry.prdCmtRegDt}>
                  {formatRegisteredAt(inquiry.prdCmtRegDt)}
                </time>
                {canEdit && !isEditing && (
                  <ActionButton
                    disabled={updateInquiryMutation.isPending}
                    onClick={() => startEditing(inquiry)}
                    size="sm"
                    tone="neutral"
                  >
                    <Pencil aria-hidden="true" size={14} />
                    수정
                  </ActionButton>
                )}
              </div>
            </div>

            {isEditing ? (
              <form className="mt-3 grid gap-2.5" onSubmit={(event) => handleEditSubmit(event, inquiry)}>
                <textarea
                  aria-label="문의 내용 수정"
                  aria-invalid={Boolean(displayedEditingError)}
                  autoFocus
                  className="min-h-24 w-full resize-y rounded-lg border border-primary bg-white px-3.5 py-3 text-body-sm text-[#353535] outline-none shadow-[0_0_0_3px_#e5efff] md:text-body-md"
                  disabled={updateInquiryMutation.isPending}
                  maxLength={MAX_INQUIRY_LENGTH}
                  onChange={(event) => {
                    setEditingContent(event.target.value);
                    if (editingError) setEditingError('');
                  }}
                  value={editingContent}
                />
                <div className="flex min-h-9 items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
                  <div>
                    <span className="text-caption tabular-nums text-[#666]">{editingContent.length}/{MAX_INQUIRY_LENGTH}</span>
                    {displayedEditingError && <p className="mt-1 mb-0 text-caption text-[#c5221f]" role="alert">{displayedEditingError}</p>}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <ActionButton
                      disabled={updateInquiryMutation.isPending}
                      onClick={cancelEditing}
                      size="sm"
                      tone="neutral"
                    >
                      <X aria-hidden="true" size={15} />
                      취소
                    </ActionButton>
                    <ActionButton
                      disabled={isEditSubmitDisabled}
                      loading={updateInquiryMutation.isPending}
                      size="sm"
                      type="submit"
                    >
                      <Check aria-hidden="true" size={15} />
                      {updateInquiryMutation.isPending ? '저장 중' : '저장'}
                    </ActionButton>
                  </div>
                </div>
              </form>
            ) : (
              <p className="mt-3 mb-0 whitespace-pre-wrap text-body-sm text-[#353535] [overflow-wrap:anywhere] md:text-body-md">
                {inquiry.prdCmtCn}
              </p>
            )}

            {inquiry.answer ? (
              <div className="mt-4 border-l-[3px] border-[#18a36b] bg-[#f2faf6] px-4 py-3.5">
                <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-2">
                  <strong className="text-body-sm text-[#0b7049]">판매자 답변</strong>
                  <time className="text-caption whitespace-nowrap text-[#666]" dateTime={inquiry.answer.prdCmtRegDt}>
                    {formatRegisteredAt(inquiry.answer.prdCmtRegDt)}
                  </time>
                </div>
                <p className="mt-3 mb-0 whitespace-pre-wrap text-body-sm text-[#353535] [overflow-wrap:anywhere] md:text-body-md">
                  {inquiry.answer.prdCmtCn}
                </p>
              </div>
            ) : (
              <span className="mt-3.5 inline-flex text-[13px] leading-[1.5] font-bold text-[#666]">답변 대기</span>
            )}
          </article>
          );
        })}
      </div>

      <div className="pt-7 max-sm:pt-6 [&_button]:transition-colors [&_button:not(:disabled)]:cursor-pointer [&_button:not(:disabled):hover]:border-primary [&_button:not(:disabled):hover]:bg-[#f2f7ff] [&_button:not(:disabled):hover]:text-primary-dark">
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          showSinglePage
          className="!my-0"
        />
      </div>

    </section>
  );
};

export default memo(AuctionInquirySection);
