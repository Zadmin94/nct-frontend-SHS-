// src/pages/service/QuoteDetailPage.jsx
// 담당자 7 연결 · F-SVC-005~010: 요청자는 신고·선택, 제공자는 본인 견적 조회·수정을 하는 공용 상세 화면
// 라우트: /services/requests/:svcReqSn/quotes/:quoteId
//
// 목록에서 클릭할 때 넘겨준 견적 데이터를 우선 쓰고(location.state.quote), 새로고침 등으로
// state가 없으면 역할별 단건·목록 조회 계약으로 quoteId를 복구한다.
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { getMyQuote, getReceivedQuotes, getQuoteHistory, selectQuoteAndCreateTrade } from '@api/quoteApi';
import { getServiceRequest } from '@api/serviceRequestApi';
import { usePublicProviderProfile } from '@hooks/useProviderProfile';
import { useAuth } from '@hooks/useAuth';
import { toImageUrl } from '@api/fileApi';
import ReportModal from '@components/common/ReportModal';
import {
  ActionButton,
  CategoryTag,
  DomainStatus,
} from '@components/common/ui';
import ErrorMessage from '@components/common/ErrorMessage';
import ViewSkeleton from '@components/skeleton/ViewSkeleton';
import Toast from '@components/common/Toast';
import { formatBudget } from '@utils/common';
import { getServiceTradeDetailPath } from '@/routes/myPageRoutes';
import {
  getServiceRequestDetailPath,
  getServiceRequestQuoteEditPath,
} from '@/routes/serviceRequestRoutes';

const QUOTE_STATUS_LABEL = {
  QUTC0001: '제출됨',
  QUTC0002: '수정됨',
  QUTC0003: '만료됨',
  QUTC0004: '선택됨',
  QUTC0005: '철회됨',
};
const QUOTE_STATUS_TONE = {
  QUTC0001: 'info',
  QUTC0002: 'info',
  QUTC0003: 'neutral',
  QUTC0004: 'success',
  QUTC0005: 'neutral',
};

const REQUEST_STATUS_LABEL = {
  SVCC0001: '임시저장',
  SVCC0002: '공개',
  SVCC0003: '매칭완료',
  SVCC0004: '종료',
  SVCC0005: '운영 보류',
  SVCC0006: '취소',
};

const REQUEST_STATUS_TONE = {
  SVCC0001: 'neutral',
  SVCC0002: 'info',
  SVCC0003: 'success',
  SVCC0004: 'neutral',
  SVCC0005: 'warning',
  SVCC0006: 'danger',
};

const REQUEST_ITEM_PREVIEW_LIMIT = 8;

function fmtDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// 복수 선택(예: 추가 옵션) 답변은 DB에 선택지마다 한 줄씩 따로 저장되므로,
// 같은 단계 제목이 연달아 나오면 값을 합쳐서 한 항목으로 보여준다
function groupRequestItems(items) {
  const grouped = [];
  (items ?? []).forEach(raw => {
    const sepIdx = raw.indexOf(': ');
    const title = sepIdx === -1 ? raw : raw.slice(0, sepIdx);
    const value = sepIdx === -1 ? '' : raw.slice(sepIdx + 2);
    const prev = grouped[grouped.length - 1];
    if (prev && prev.title === title) {
      prev.value = prev.value ? `${prev.value}, ${value}` : value;
    } else {
      grouped.push({ title, value });
    }
  });
  return grouped;
}

export default function QuoteDetailPage() {
  const { svcReqSn, quoteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isProvider, loading: authLoading } = useAuth();

  const [quote, setQuote] = useState(location.state?.quote ?? null);
  const [loading, setLoading] = useState(!location.state?.quote);
  const [error, setError] = useState('');

  const [request, setRequest] = useState(location.state?.requestSummary ?? null);

  const [quoteHistoryResult, setQuoteHistoryResult] = useState({ quoteId: null, items: [] });
  const [reportTarget, setReportTarget] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [toast, setToast] = useState('');
  const [contentExpanded, setContentExpanded] = useState(false);

  const currentUserSn = Number(user?.id ?? user?.userId ?? user?.userSn ?? user?.usrSn);
  const providerUserSn = Number(quote?.providerUsrSn ?? (isProvider ? currentUserSn : NaN));
  const providerQuery = usePublicProviderProfile(providerUserSn);
  const provider = providerQuery.data;
  const providerName = quote?.providerNm
    ?? provider?.displayName
    ?? (isProvider ? user?.nickname : null)
    ?? '제공자';
  const returnPath = typeof location.state?.from === 'string' ? location.state.from : null;
  const canEditOwnQuote = isProvider
    && ['QUTC0001', 'QUTC0002'].includes(quote?.statusCode)
    && Number(quote?.reviseCnt ?? 0) < 3;
  const canSelectQuote = !isProvider
    && ['QUTC0001', 'QUTC0002'].includes(quote?.statusCode)
    && request?.svcReqStatusCd === 'SVCC0002';
  const quoteHistoryTargetId = Number(quote?.qutSn);
  const hasQuoteHistory = Number(quote?.reviseCnt ?? 0) > 0;
  const quoteHistory = quoteHistoryResult.quoteId === quoteHistoryTargetId
    ? quoteHistoryResult.items
    : [];
  const quoteHistoryLoading = hasQuoteHistory
    && quoteHistoryResult.quoteId !== quoteHistoryTargetId;
  const groupedRequestItems = groupRequestItems(request?.items);

  // 이 견적이 속한 요청서 요약 — 영역에 비해 견적 내용만으로는 휑해서 참고용으로 같이 보여준다.
  // 목록에서 넘어올 때 이미 요청서 상세를 불러온 상태라 그걸 그대로 받아쓰고, 새로고침 등으로
  // state가 없을 때만(무거운 이미지·주소복호화까지 포함된) 전체 조회 API를 다시 부른다.
  useEffect(() => {
    if (request) return;
    let cancelled = false;
    getServiceRequest(svcReqSn)
      .then(res => {
        if (cancelled) return;
        setRequest(res.data ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [request, svcReqSn]);

  // state로 못 받은 경우(새로고침 등) 역할에 맞는 조회 계약으로 상세를 복구한다.
  useEffect(() => {
    if (quote || authLoading) return;
    let cancelled = false;
    const detailRequest = isProvider
      ? getMyQuote(quoteId).then(res => res.data ?? null)
      : getReceivedQuotes(svcReqSn).then(res => (
        (res.data ?? []).find(item => String(item.qutSn) === String(quoteId)) ?? null
      ));

    detailRequest
      .then(found => {
        if (cancelled) return;
        if (!found) {
          setError('견적 정보를 찾을 수 없습니다.');
        } else {
          setQuote(found);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError('견적 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authLoading, isProvider, quote, quoteId, svcReqSn]);

  useEffect(() => {
    if (!hasQuoteHistory || !Number.isSafeInteger(quoteHistoryTargetId)) return;
    let cancelled = false;
    getQuoteHistory(quoteHistoryTargetId)
      .then(res => {
        if (cancelled) return;
        setQuoteHistoryResult({ quoteId: quoteHistoryTargetId, items: res.data ?? [] });
      })
      .catch(() => {
        if (cancelled) return;
        setQuoteHistoryResult({ quoteId: quoteHistoryTargetId, items: [] });
      });
    return () => { cancelled = true; };
  }, [hasQuoteHistory, quoteHistoryTargetId]);

  // F-SVC-009/010: 조우진(7)이 통합한 선택+거래생성 계약 — 성공하면 서비스 거래 상세로 이동
  const handleSelectQuote = async () => {
    setSelecting(true);
    try {
      const result = await selectQuoteAndCreateTrade(svcReqSn, quote.qutSn);
      navigate(getServiceTradeDetailPath(result.data.tradeId));
    } catch (err) {
      setToast(err.response?.data?.message || '견적 선택에 실패했습니다.');
    } finally {
      setSelecting(false);
    }
  };

  const handleEditOwnQuote = () => {
    navigate(getServiceRequestQuoteEditPath(svcReqSn, quote.qutSn), {
      state: {
        from: returnPath || '/user/mypage/services/quotes',
        quoteTitle: quote.qutTtl || '',
      },
    });
  };

  if (authLoading || loading) return <ViewSkeleton />;
  if (error || !quote) {
    return (
      <div className="container py-10">
        <ErrorMessage message={error || '견적 정보를 불러오지 못했습니다.'} />
      </div>
    );
  }

  return (
    <div className="bg-white pb-14 text-sm leading-[1.6] text-[#1d1d1f]">
      <div className="container max-w-5xl">

        <div className="grid grid-cols-1 items-start gap-6 pt-9 lg:grid-cols-[1fr_300px]">

        <article className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e5efff] text-xl font-bold text-primary">
                {provider?.profileImageUrl
                  ? <img src={toImageUrl(provider.profileImageUrl)} alt={providerName} className="h-full w-full object-cover" />
                  : (providerName.trim()?.[0] ?? '?')}
              </div>
              <div>
                {Number.isSafeInteger(providerUserSn) && providerUserSn > 0 ? (
                  <Link
                    to={`/providers/${providerUserSn}`}
                    className="text-xl font-bold text-[#1d1d1f] hover:text-primary hover:underline"
                  >
                    {providerName}
                  </Link>
                ) : (
                  <span className="text-xl font-bold text-[#1d1d1f]">{providerName}</span>
                )}
                <p className="mt-0.5 text-sm text-[#5f5e5a]">
                  ★{Number(provider?.reviewAverageScore ?? 0).toFixed(1)} · 리뷰 {provider?.reviewCount ?? 0}개
                  {` · ${provider?.availableArea || '활동 지역 미등록'}`}
                </p>
              </div>
            </div>
            {['QUTC0004', 'QUTC0005'].includes(quote.statusCode) && (
              <DomainStatus
                className="shrink-0"
                tone={QUOTE_STATUS_TONE[quote.statusCode] ?? 'neutral'}
                variant="soft"
              >
                {QUOTE_STATUS_LABEL[quote.statusCode] ?? quote.statusCode}
              </DomainStatus>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#f9fafb] px-4 py-3">
              <span className="text-xs font-semibold text-[#9a9ba5]">견적 금액</span>
              <p className="mt-0.5 text-2xl font-bold text-primary">{formatBudget(quote.amount)}</p>
            </div>
            <div className="rounded-xl bg-[#f9fafb] px-4 py-3">
              <span className="text-xs font-semibold text-[#9a9ba5]">제출일</span>
              <p className="mt-0.5 text-2xl font-bold text-[#1d1d1f]">{fmtDate(quote.registeredAt)}</p>
              {quote.reviseCnt > 0 && (
                <p className="mt-0.5 text-xs text-[#9a9ba5]">{quote.reviseCnt}회 수정됨 · 최종 수정 {fmtDate(quote.updatedAt)}</p>
              )}
            </div>
          </div>

          {quote.content && (
            <div className="mt-4">
              <h2 className="mb-1.5 text-sm font-semibold text-[#5f5e5a]">견적 내용</h2>
              <p className={`whitespace-pre-line leading-relaxed text-[#1d1d1f] ${!contentExpanded && quote.content.length > 300 ? 'line-clamp-6' : ''}`}>
                {quote.content}
              </p>
              {quote.content.length > 300 && (
                <button
                  type="button"
                  onClick={() => setContentExpanded(v => !v)}
                  className="mt-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {contentExpanded ? '접기' : '더보기'}
                </button>
              )}
            </div>
          )}

          {quote.attachments?.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-1.5 text-sm font-semibold text-[#5f5e5a]">첨부파일</h2>
              <div className="flex flex-wrap gap-2">
                {quote.attachments.map(f => (
                  <a
                    key={f.flSn}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e1dc] px-3 py-2 text-sm font-medium text-[#0048bf] hover:border-primary hover:bg-[#e5efff]"
                  >
                    📎 {f.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}

          {quote.reviseCnt > 0 && (
            <div className="mt-5 border-t border-[#e8e8e8] pt-4">
              <h2 className="mb-2 text-sm font-semibold text-[#5f5e5a]">수정 이력</h2>
              {quoteHistoryLoading ? (
                <p className="text-sm text-[#9a9ba5]">불러오는 중...</p>
              ) : quoteHistory.length === 0 ? (
                <p className="text-sm text-[#9a9ba5]">이력이 없습니다.</p>
              ) : (
                <ul className="space-y-3">
                  {/* 수정 이력은 오래된순으로 오므로, 각 항목의 "이후 금액"은 다음 이력의 금액(마지막이면 현재 견적 금액)이다 */}
                  {quoteHistory.map((h, i) => {
                    const nextAmount = quoteHistory[i + 1]?.amount ?? quote.amount;
                    return (
                      <li key={h.qutHstSn} className="rounded-lg bg-[#f9fafb] p-3">
                        <p className="flex flex-wrap items-center gap-1.5 font-semibold text-[#1d1d1f]">
                          <span className="text-[#9a9ba5] line-through">{formatBudget(h.amount)}</span>
                          <span className="text-[#9a9ba5]">→</span>
                          <span>{formatBudget(nextAmount)}</span>
                        </p>
                        {h.content && <p className="mt-1 whitespace-pre-line text-sm text-[#5f5e5a]">{h.content}</p>}
                        <p className="mt-1 text-xs text-[#9a9ba5]">{fmtDate(h.registeredAt)} 수정 전 내용</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* 요청자는 신고·선택, 제공자 본인은 수정 가능한 상태에서만 수정 액션을 사용한다. */}
          {(!isProvider || canEditOwnQuote) && (
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#e8e8e8] pt-5">
              {isProvider ? (
                <ActionButton
                  onClick={handleEditOwnQuote}
                  size="sm"
                >
                  견적 수정하기
                </ActionButton>
              ) : (
                <>
                  <ActionButton
                    onClick={() => setReportTarget({
                      qutSn: quote.qutSn,
                      providerUsrSn: quote.providerUsrSn,
                      providerNm: providerName,
                      svcReqSn,
                    })}
                    size="sm"
                    tone="danger-outline"
                  >
                    신고
                  </ActionButton>
                  {canSelectQuote && (
                    <ActionButton
                      onClick={handleSelectQuote}
                      disabled={selecting}
                      size="sm"
                    >
                      {selecting ? '처리 중...' : '이 견적 선택하기'}
                    </ActionButton>
                  )}
                </>
              )}
            </div>
          )}
        </article>

        <aside className="sticky top-6 rounded-2xl border border-[#e8e8e8] bg-[#f9fafb] p-4">
          <div className="flex items-center justify-between gap-2">
            {request && (
              <DomainStatus tone={REQUEST_STATUS_TONE[request.svcReqStatusCd] ?? 'neutral'} variant="soft">
                {REQUEST_STATUS_LABEL[request.svcReqStatusCd] ?? request.svcReqStatusCd}
              </DomainStatus>
            )}
            {groupedRequestItems.length > REQUEST_ITEM_PREVIEW_LIMIT && (
              <ActionButton
                to={getServiceRequestDetailPath(svcReqSn)}
                aria-label={`요청 항목 ${groupedRequestItems.length}개 보기`}
                className="shrink-0"
                size="sm"
              >
                항목 보기
              </ActionButton>
            )}
          </div>
          <div className="mt-2">
            <h2 className="line-clamp-2 text-lg font-bold leading-7 text-[#1d1d1f]">
              {request?.svcReqTtl ?? '요청서 상세로'}
            </h2>
          </div>
          {request && (
            <>
              <dl className="mt-2 space-y-1.5 border-t border-[#e2e1dc] pt-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#9a9ba5]">카테고리</dt>
                  <dd>
                    <CategoryTag tone="info" variant="soft">{request.catNm || '-'}</CategoryTag>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#9a9ba5]">요청 예산</dt>
                  <dd className="font-semibold text-[#1d1d1f]">{formatBudget(request.svcReqBdgtAmt)}</dd>
                </div>
              </dl>
              {request.items?.length > 0 && (
                <div className="mt-2 border-t border-[#e2e1dc] pt-2">
                  <ul className="space-y-1.5">
                    {groupedRequestItems.slice(0, REQUEST_ITEM_PREVIEW_LIMIT).map((entry, i) => (
                      <li key={i} className="min-w-0 text-sm">
                        <p className="truncate text-xs leading-4 text-[#9a9ba5]" title={entry.title}>
                          {entry.title}
                        </p>
                        {entry.value && (
                          <p className="truncate font-medium leading-5 text-[#1d1d1f]" title={entry.value}>
                            {entry.value}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </aside>

        </div>

      </div>

      {!isProvider && reportTarget && (
        <ReportModal
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetName={reportTarget.providerNm}
          targetType="service"
          referenceSn={reportTarget.svcReqSn}
          reportedUserSn={reportTarget.providerUsrSn}
          contextLabel={`견적 제공자: ${reportTarget.providerNm}`}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
