// src/pages/service/ServiceRequestDetailPage.jsx
// 서비스 요청서 상세 — 일반회원 본인 관리 / 제공자 공개 요청 조회·견적 제출
// 라우트: /services/requests/:svcReqSn
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import {
  closeServiceRequest,
  getServiceRequest,
  addServiceRequestComment,
  getServiceRequestComments,
  reregisterServiceRequest,
} from '@api/serviceRequestApi';
import { getReceivedQuotes } from '@api/quoteApi';
import { fetchMyProviderQuoteAccess } from '@api/providerProfileApi';
import { useMyActiveQuote } from '@hooks/useQuote';
import { toImageUrl } from '@api/fileApi';
import { formatBudget, formatPoint, formatPointUnitText } from '@utils/common';
import ImageLightbox from '@components/common/ImageLightbox';
import ErrorMessage from '@components/common/ErrorMessage';
import ViewSkeleton from '@components/skeleton/ViewSkeleton';
import Toast from '@components/common/Toast';
import ConfirmModal from '@components/common/ConfirmModal';
import ReportModal from '@components/common/ReportModal';
import {
  ActionButton,
  CategoryTag,
  DomainStatus,
} from '@components/common/ui';
import Pagination from '@components/common/Pagination';
import HeaderSearchPortal, {
  SimpleHeaderSearch,
} from '@components/common/HeaderSearchPortal';
import {
  getServiceRequestDetailPath,
  getServiceRequestQuoteCreatePath,
  getServiceRequestQuoteDetailPath,
  getServiceRequestQuoteEditPath,
  SERVICE_REQUEST_CREATE_PATH,
  SERVICE_REQUESTS_PATH,
} from '@/routes/serviceRequestRoutes';

const STATUS_LABEL = {
  SVCC0001: '임시저장',
  SVCC0002: '공개',
  SVCC0003: '매칭완료',
  SVCC0004: '종료',
  SVCC0005: '운영 보류',
  SVCC0006: '취소',
};

const STATUS_TONE = {
  SVCC0001: 'neutral',
  SVCC0002: 'info',
  SVCC0003: 'success',
  SVCC0004: 'neutral',
  SVCC0005: 'warning',
  SVCC0006: 'danger',
};

const QUOTE_STATUS_LABEL = {
  QUTC0001: '제출됨',
  QUTC0002: '수정됨',
  QUTC0004: '선택됨',
  QUTC0005: '철회됨',
};
const QUOTE_STATUS_TONE = {
  QUTC0001: 'info',
  QUTC0002: 'info',
  QUTC0004: 'success',
  QUTC0005: 'neutral',
};

const QUOTES_PAGE_SIZE = 5;
const MONEY_ANSWER_LABEL = /예산|금액|가격|비용|단가/;

const formatServiceAnswerValue = (title, label, value) => {
  const contextLabel = label || title || '';
  if (!MONEY_ANSWER_LABEL.test(contextLabel)) return value;
  const text = String(value ?? '').trim();
  if (/^[\d,]+$/.test(text)) return formatPoint(Number(text.replaceAll(',', '')));
  return formatPointUnitText(value);
};

function parseItem(raw) {
  const idx = raw.indexOf(': ');
  if (idx === -1) return { label: null, value: raw };
  return { label: raw.slice(0, idx), value: raw.slice(idx + 2) };
}

// 위저드에서 넘어오는 원본 형태: "{단계 제목}: {필드1}: {값1} / {필드2}: {값2} / ..."
// 맨 앞 단계 제목을 떼어내고, 나머지를 " / " 기준으로 필드별로 나눈다
function parseItemGroup(raw) {
  const titleIdx = raw.indexOf(': ');
  if (titleIdx === -1) return { title: raw, fields: [] };
  const title = raw.slice(0, titleIdx);
  const rest = raw.slice(titleIdx + 2);
  const fields = rest.split(' / ').map(parseItem);
  return { title, fields };
}

// "출발지 주소" → { prefix: "출발지", suffix: "주소" } — 접두어가 없으면 prefix는 null
function splitLabel(label) {
  if (!label) return { prefix: null, suffix: null };
  const spaceIdx = label.indexOf(' ');
  if (spaceIdx === -1) return { prefix: null, suffix: label };
  return { prefix: label.slice(0, spaceIdx), suffix: label.slice(spaceIdx + 1) };
}

// 같은 접두어(예: "출발지")가 필드 라벨 2개 이상에서 반복될 때만 "출발지"/"도착지"처럼
// 묶음 제목으로 보여주고 나머지 라벨만 표시한다. 1번만 나오는 접두어는 원래 라벨 그대로 둔다
// (예: "거주 인원"을 "거주"+"인원"으로 잘못 쪼개는 걸 방지)
function groupByLabelPrefix(fields) {
  const prefixCounts = new Map();
  fields.forEach(f => {
    const { prefix } = splitLabel(f.label);
    if (prefix) prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
  });

  const groups = [];
  const indexByPrefix = new Map();
  fields.forEach(f => {
    const { prefix, suffix } = splitLabel(f.label);
    const isRealGroup = prefix && prefixCounts.get(prefix) >= 2;
    if (isRealGroup && indexByPrefix.has(prefix)) {
      groups[indexByPrefix.get(prefix)].items.push({ label: suffix, value: f.value });
    } else if (isRealGroup) {
      indexByPrefix.set(prefix, groups.length);
      groups.push({ title: prefix, items: [{ label: suffix, value: f.value }] });
    } else {
      groups.push({ title: null, items: [{ label: f.label, value: f.value }] });
    }
  });
  return groups;
}

// "옮길 가전 (복수 선택)"처럼 뒤에 괄호 안내문이 붙는 제목은 두 줄로 자연스럽게 나눠 보여준다
function renderStepTitle(title) {
  const suffix = ' (복수 선택)';
  if (!title.endsWith(suffix)) return title;
  return (
    <>
      {title.slice(0, -suffix.length)}
      <br />
      (복수 선택)
    </>
  );
}

// 위저드에서 답변한 순서를 확인할 수 있도록 제목 앞에 번호를 붙인다
function renderThLabel(entry) {
  return (
    <>
      <span className="mr-1.5 text-[#9a9ba5]">{entry.number}.</span>
      {renderStepTitle(entry.title)}
    </>
  );
}

// 옮길 가전/추가 옵션처럼 라벨 없이 선택값만 여러 개 나열되는 다중선택 항목 — 선택 개수만큼
// 열을 나누면 개수가 늘어날수록 칸이 좁아져 텍스트가 줄바꿈되므로, 칩으로 만들어 줄바꿈되게 둔다
function renderMultiSelectValue(fields, title) {
  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((f, i) => (
        <span key={i} className="rounded-lg bg-[#f5f5f3] px-3 py-1.5 font-semibold text-[#1d1d1f]">
          {formatServiceAnswerValue(title, f.label, f.value)}
        </span>
      ))}
    </div>
  );
}

// 항목 하나의 값 영역 — 출발지/도착지처럼 실제로 묶이는 필드는 옅은 구분선으로 나눠 보여준다
// (양쪽 다 같은 간격을 갖도록 첫 칸엔 오른쪽 여백, 이후 칸엔 왼쪽 여백+구분선을 준다 — 폭이 한쪽으로 치우쳐 보이는 것 방지)
function renderEntryValue(entry) {
  if (entry.fields.length > 1 && entry.fields.every(f => !f.label)) {
    return renderMultiSelectValue(entry.fields, entry.title);
  }
  const subGroups = groupByLabelPrefix(entry.fields);
  return (
    <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${subGroups.length || 1}, minmax(0, 1fr))` }}>
      {subGroups.map((sub, k) => (
        <div
          key={k}
          className={`flex flex-col gap-2 divide-y divide-[#eee] ${k > 0 ? 'border-l border-[#e2e1dc] pl-5' : ''} ${k < subGroups.length - 1 ? 'pr-5' : ''}`}
        >
          {sub.title && (
            <span className="pb-2 text-sm font-bold text-[#1d1d1f]">{sub.title}</span>
          )}
          {sub.items.map((item, j) => (
            <div key={j} className={j === 0 ? '' : 'pt-2'}>
              {item.label && (
                <span className="mb-0.5 block text-sm text-[#888780]">{item.label}</span>
              )}
              <strong className="block whitespace-pre-line font-semibold text-[#1d1d1f]">{formatServiceAnswerValue(entry.title, item.label, item.value)}</strong>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// 특이사항 메모 단계의 필드 라벨 — 미입력 시 request.items에 빠지므로 아래에서 빈 상태로 보강한다
const MEMO_TITLE = '메모';

// 짝을 지어도 되는데도 항상 한 행 전체를 써야 하는 항목 — 선택 항목이 많아질 수 있어 공간이 필요함
const ALWAYS_FULL_WIDTH_TITLES = ['추가 옵션 (복수 선택)', MEMO_TITLE];

// 옆 항목과 성격이 안 맞아 항상 혼자(빈 칸과) 두는 항목 — 옮길 가전/가구끼리 짝지어지도록 사이에 끼지 않게 함
const ALWAYS_ALONE_TITLES = ['평수·거주 인원'];

// 필드가 적은 단순 항목(건물 유형, 옮길 가전, 옮길 가구 등)은 내용이 짧아 한 줄을 다 차지하면
// 허전하므로 한 행에 2개씩 짝지어 채운다. 짝이 없이 하나만 남으면 나머지 절반은 빈 칸으로 둔다.
// 필드가 많은 항목(출발지·도착지 등)과 ALWAYS_FULL_WIDTH_TITLES는 그대로 한 행 전체를 쓴다.
// ALWAYS_ALONE_TITLES는 다른 항목과 짝짓지 않고 항상 혼자(빈 칸과 짝) 둔다
function buildTableRows(entries) {
  const rows = [];
  let pending = null;
  entries.forEach(entry => {
    const isFullWidth = ALWAYS_FULL_WIDTH_TITLES.includes(entry.title) || entry.fields.length > 2;
    const isAlone = ALWAYS_ALONE_TITLES.includes(entry.title);
    const isSimple = !isFullWidth && !isAlone;
    if (isSimple) {
      if (pending) {
        rows.push([pending, entry]);
        pending = null;
      } else {
        pending = entry;
      }
    } else {
      if (pending) { rows.push([pending, null]); pending = null; }
      rows.push(isAlone ? [entry, null] : [entry]);
    }
  });
  if (pending) rows.push([pending, null]);
  return rows;
}

function fmtDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function ServiceRequestDetailPage() {
  const { svcReqSn } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isProvider } = useAuth();
  const authenticatedUserId = user?.id ?? user?.userId ?? user?.userSn ?? user?.usrSn;
  const { data: myActiveQuote, isLoading: myQuoteLoading } = useMyActiveQuote(
    isProvider && isAuthenticated ? svcReqSn : null,
  );

  const [request, setRequest] = useState(null);
  const [loadedRequestSn, setLoadedRequestSn] = useState(null);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [reregistering, setReregistering] = useState(false);
  const [toast, setToast] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [quotesLoadedRequestSn, setQuotesLoadedRequestSn] = useState(null);
  // 페이지 번호를 URL 쿼리스트링(?quotePage=)에 반영 — 견적 상세 페이지 갔다가 뒤로가기로
  // 돌아왔을 때 보던 페이지 그대로 복원되게 하기 위함(컴포넌트가 다시 마운트되면 상태는 사라지므로)
  const quotePage = Number(searchParams.get('quotePage')) || 1;
  const setQuotePage = (page) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (page <= 1) next.delete('quotePage');
      else next.set('quotePage', String(page));
      return next;
    }, { replace: true });
  };
  const [lightboxIndex, setLightboxIndex] = useState(null); // 첨부사진 확대뷰 — null이면 닫힘
  const [comments, setComments] = useState([]);
  const [cmtTtl, setCmtTtl] = useState('');
  const [cmtCn, setCmtCn] = useState('');
  const [cmtSubmitting, setCmtSubmitting] = useState(false);
  const [commentConfirmOpen, setCommentConfirmOpen] = useState(false);
  const quoteAccessQuery = useQuery({
    queryKey: ['provider', 'quote-access', request?.catSn],
    queryFn: () => fetchMyProviderQuoteAccess(request.catSn),
    enabled: Boolean(
      isProvider
      && isAuthenticated
      && request?.svcReqStatusCd === 'SVCC0002'
      && Number(request?.catSn) > 0,
    ),
    retry: false,
  });
  const loading = String(loadedRequestSn) !== String(svcReqSn);
  const requestOwner = !isProvider
    && request
    && authenticatedUserId != null
    && String(authenticatedUserId) === String(request.usrSn);
  const quotesLoading = Boolean(
    requestOwner && String(quotesLoadedRequestSn) !== String(svcReqSn),
  );
  const headerSearch = isProvider ? (
    <HeaderSearchPortal>
      <SimpleHeaderSearch
        onSearch={(keyword) => navigate(`${SERVICE_REQUESTS_PATH}?keyword=${encodeURIComponent(keyword)}`)}
        placeholder="필요한 서비스 요청을 검색하세요"
      />
    </HeaderSearchPortal>
  ) : null;

  useEffect(() => {
    let cancelled = false;
    getServiceRequest(svcReqSn)
      .then(res => {
        if (cancelled) return;
        setRequest(res.data);
        setError('');
        setLoadedRequestSn(svcReqSn);
      })
      .catch(() => {
        if (cancelled) return;
        setRequest(null);
        setError('요청서 정보를 불러오지 못했습니다.');
        setLoadedRequestSn(svcReqSn);
      });
    return () => {
      cancelled = true;
    };
  }, [svcReqSn]);

  // 견적 목록은 요청서 본인만 조회 가능(백엔드에서 NOT_RESOURCE_OWNER로 차단) — 요청서 로드 후 본인 확인되면 조회
  useEffect(() => {
    if (!request) return;
    const owner = !isProvider
      && authenticatedUserId != null
      && String(authenticatedUserId) === String(request.usrSn);
    if (!owner) return;
    let cancelled = false;
    getReceivedQuotes(svcReqSn)
      .then(res => {
        if (cancelled) return;
        setQuotes(res.data ?? []);
        setQuotesLoadedRequestSn(svcReqSn);
      })
      .catch(() => {
        if (cancelled) return;
        setQuotes([]);
        setQuotesLoadedRequestSn(svcReqSn);
      });
    return () => {
      cancelled = true;
    };
  }, [request, svcReqSn, authenticatedUserId, isProvider]);

  // 변경사항 목록은 요청자·제공자 누구나 조회 가능 — 요청서 로드 후 함께 조회
  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    getServiceRequestComments(svcReqSn)
      .then(res => {
        if (cancelled) return;
        setComments(res.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [request, svcReqSn]);

  // 상품 변경사항 추가(ProductDetailSellerPage)와 동일하게, 등록 전 "등록 후 수정 불가" 확인을 한 번 거친다
  const requestCommentSubmit = () => {
    if (!cmtTtl.trim()) {
      setToast('제목을 입력해 주세요.');
      return;
    }
    setCommentConfirmOpen(true);
  };

  const handleCommentSubmit = async () => {
    setCommentConfirmOpen(false);
    setCmtSubmitting(true);
    try {
      await addServiceRequestComment(svcReqSn, { ttl: cmtTtl.trim(), cn: cmtCn.trim() || null });
      const updated = await getServiceRequestComments(svcReqSn);
      setComments(updated.data ?? []);
      setCmtTtl('');
      setCmtCn('');
      setToast('변경사항이 등록되었습니다.');
    } catch (err) {
      setToast(err.response?.data?.message || '변경사항 등록에 실패했습니다.');
    } finally {
      setCmtSubmitting(false);
    }
  };

  const handleClose = async () => {
    setCloseConfirmOpen(false);
    setClosing(true);
    try {
      await closeServiceRequest(svcReqSn);
      setRequest(prev => ({ ...prev, svcReqStatusCd: 'SVCC0004' }));
      setToast('요청서를 마감했습니다.');
    } catch (err) {
      setToast(err.response?.data?.message || '마감에 실패했습니다.');
    } finally {
      setClosing(false);
    }
  };

  const handleReregister = async () => {
    setReregistering(true);
    try {
      const newRequest = await reregisterServiceRequest(svcReqSn);
      navigate(getServiceRequestDetailPath(newRequest.data?.svcReqSn));
    } catch (err) {
      setToast(err.response?.data?.message || '재등록에 실패했습니다.');
      setReregistering(false);
    }
  };

  const handleQuoteClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (quoteAccessQuery.data !== true) return;
    navigate(getServiceRequestQuoteCreatePath(svcReqSn), {
      state: {
        svcReqSn,
        svcReqTitle: request.svcReqTtl,
        category: request.catNm,
        budget: formatBudget(request.svcReqBdgtAmt),
      },
    });
  };

  const handleQuoteEdit = () => {
    if (!myActiveQuote?.qutSn) return;
    navigate(getServiceRequestQuoteEditPath(svcReqSn, myActiveQuote.qutSn), {
      state: {
        quoteId: myActiveQuote.qutSn,
        svcReqSn,
        svcReqTitle: request.svcReqTtl,
        category: request.catNm,
        budget: formatBudget(request.svcReqBdgtAmt),
        amount: myActiveQuote.amount,
        content: myActiveQuote.content,
        duration: myActiveQuote.duration,
        reviseCnt: myActiveQuote.reviseCnt,
      },
    });
  };

  if (loading) {
    return (
      <>
        {headerSearch}
        <ViewSkeleton />
      </>
    );
  }
  if (error || !request) {
    return (
      <>
        {headerSearch}
        <div className="container py-10">
          <ErrorMessage message={error || '요청서 정보를 불러오지 못했습니다.'} />
        </div>
      </>
    );
  }

  const isOwner = !isProvider
    && authenticatedUserId != null
    && String(authenticatedUserId) === String(request.usrSn);
  // 자기거래 차단(F-SVC-005/006) — 일반회원으로 작성한 본인 요청서를 제공자 모드로 봐도
  // 견적 제출 영역이 안 뜨게 하려면 모드와 무관하게 "진짜 작성자인지"를 따로 알아야 한다
  const isActualCreator = authenticatedUserId != null
    && String(authenticatedUserId) === String(request.usrSn);
  const isDraft  = request.svcReqStatusCd === 'SVCC0001';
  const isOpen   = request.svcReqStatusCd === 'SVCC0002';
  const isClosed = ['SVCC0004', 'SVCC0006'].includes(request.svcReqStatusCd);
  const canAddComment = isOwner && isOpen && comments.length < 3;
  const quoteTotalPages = Math.max(1, Math.ceil(quotes.length / QUOTES_PAGE_SIZE));
  const pagedQuotes = quotes.slice((quotePage - 1) * QUOTES_PAGE_SIZE, quotePage * QUOTES_PAGE_SIZE);
  const quoteAccessPending = quoteAccessQuery.isLoading || quoteAccessQuery.isFetching;
  const canSubmitQuote = quoteAccessQuery.data === true;

  // 복수 선택(예: 추가 옵션) 답변은 DB에 선택지마다 한 줄씩 따로 저장되므로,
  // 같은 단계 제목이 연달아 나오면 한 항목으로 합쳐서 보여준다 (그대로 두면 같은 제목이 여러 번 번호 매겨짐)
  const parsedItems = [];
  (request.items ?? []).forEach(raw => {
    const parsed = parseItemGroup(raw);
    const prev = parsedItems[parsedItems.length - 1];
    if (prev && prev.title === parsed.title) {
      prev.fields.push(...parsed.fields);
    } else {
      parsedItems.push(parsed);
    }
  });
  // 메모는 선택 입력이라 미입력 시 SVC_REQ_ITEM 행 자체가 생성되지 않는다 — 모든 폼 템플릿에
  // 공통으로 존재하는 필드라, 응답에 없으면 빈 상태로라도 항목을 보여준다.
  if (!parsedItems.some(item => item.title === MEMO_TITLE)) {
    parsedItems.push({ title: MEMO_TITLE, fields: [{ label: null, value: '(입력 없음)' }] });
  }

  const statusLabel      = STATUS_LABEL[request.svcReqStatusCd] ?? request.svcReqStatusCd;

  return (
    <>
      {headerSearch}
      <div className="bg-white pb-14 text-sm leading-[1.6] text-[#1d1d1f]">
        <div className="container">

        {/* 2열 레이아웃 */}
        <div className="grid grid-cols-1 items-start gap-6 pt-9 lg:grid-cols-[1fr_minmax(340px,420px)]">

          {/* ── 왼쪽: 요청 정보 카드 ── */}
          <article className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm">

            {/* 헤더 */}
            <div className="border-b border-[#e8e8e8] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {request.catNm && (
                    <CategoryTag
                      className="!h-7 !gap-1.5 !px-3 !text-[14px]"
                      tone="info"
                      variant="soft"
                    >
                      {request.catNm}
                    </CategoryTag>
                  )}
                  <DomainStatus
                    className="!h-7 !gap-1.5 !px-3 !text-[14px]"
                    tone={STATUS_TONE[request.svcReqStatusCd] ?? 'neutral'}
                    variant="soft"
                  >
                    {statusLabel}
                  </DomainStatus>
                </div>

                {/* 요청자 본인 액션 */}
                {isOwner && isDraft && (
                  <ActionButton
                    className="shrink-0"
                    size="lg"
                    state={{ svcReqSn: Number(svcReqSn) }}
                    to={SERVICE_REQUEST_CREATE_PATH}
                    tone="neutral"
                  >
                    작성재개
                  </ActionButton>
                )}
                {isOwner && isClosed && (
                  <ActionButton
                    className="shrink-0"
                    onClick={handleReregister}
                    disabled={reregistering}
                    size="lg"
                  >
                    {reregistering ? '재등록 중...' : '재등록'}
                  </ActionButton>
                )}
                {isOwner && isOpen && (
                  <ActionButton
                    className="shrink-0"
                    onClick={() => setCloseConfirmOpen(true)}
                    disabled={closing}
                    size="lg"
                    tone="danger-outline"
                  >
                    {closing ? '마감 중...' : '요청 마감'}
                  </ActionButton>
                )}
                {/* 담당자 7 · F-COM-018: 제공자는 요청서 작성자를 공통 회원 신고로 접수합니다. */}
                {isProvider && isAuthenticated && !isActualCreator && request.usrSn && (
                  <button
                    aria-label="서비스 요청 작성자 신고하기"
                    className="inline-flex min-h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[#dadada] bg-white px-3 py-0.5 text-[13px] leading-[1.4] font-bold text-[#666] transition-colors hover:border-[#999] hover:text-[#1d1d1f]"
                    onClick={() => setIsReportOpen(true)}
                    type="button"
                  >
                    <Flag size={14} aria-hidden="true" />
                    신고
                  </button>
                )}
              </div>

              <h1 className="mt-3 text-3xl font-bold leading-[1.4]">{request.svcReqTtl}</h1>
              <p className="mt-2 text-lg text-[#5f5e5a]">
                {formatBudget(request.svcReqBdgtAmt)}
                {request.svcReqRegDt && <span className="ml-2">· {fmtDate(request.svcReqRegDt)} 등록</span>}
              </p>
            </div>

            {/* 요청 항목 (위저드 답변) — 경매등록 확인탭·위저드 확인탭과 동일한 신청서 표 양식
                필드가 1개뿐인 단순 항목은 2개씩 한 행에 짝지어 표시한다.
                모바일(md 미만)에서는 2열이 너무 좁아져서 표 대신 항목별 1줄 카드로 따로 보여준다. */}
            {parsedItems.length > 0 && (() => {
              const numberedItems = parsedItems.map((entry, idx) => ({ ...entry, number: idx + 1 }));
              return (
              <div className="border-b border-[#e8e8e8] px-6 py-5">
                <h2 className="mb-4 text-lg font-semibold text-[#5f5e5a]">요청 항목</h2>

                {/* 모바일 전용: 항목마다 한 줄(라벨 위, 값 아래) */}
                <div className="flex flex-col divide-y divide-[#d8d6cf] rounded-[10px] border border-[#d8d6cf] text-lg md:hidden">
                  {numberedItems.map((entry, i) => (
                    <div key={i} className="px-4 py-4">
                      <p className="mb-1.5 font-semibold text-[#5f5e5a]">{renderThLabel(entry)}</p>
                      <div className="text-[#1d1d1f]">{renderEntryValue(entry)}</div>
                    </div>
                  ))}
                </div>

                {/* PC 전용: 기존 2열 표 그대로 */}
                <table className="hidden w-full table-fixed overflow-hidden rounded-[10px] border border-[#d8d6cf] text-lg md:table">
                  <colgroup>
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '33%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '33%' }} />
                  </colgroup>
                  <tbody>
                    {(() => {
                      const tableRows = buildTableRows(numberedItems);
                      return tableRows.map((group, i) => {
                        const isLast = i === tableRows.length - 1;
                        const borderCls = isLast ? '' : 'border-b border-[#d8d6cf]';
                        const thCls = `break-keep px-4 py-4 text-left font-semibold border-r border-[#d8d6cf] ${borderCls}`;
                        const tdCls = `px-4 py-4 text-[#1d1d1f] ${borderCls}`;
                        // th 배경색·글자색·줄바꿈은 전역 CSS(th { ...; white-space: nowrap })가
                        // Tailwind 유틸리티보다 우선순위가 높아서 인라인 스타일로 덮어써야 실제로 반영된다.
                        // white-space를 안 덮어쓰면 긴 라벨이 줄바꿈 못 하고 좁은 칸 밖으로 겹쳐 나온다.
                        const thStyle = {
                          verticalAlign: 'middle',
                          backgroundColor: '#eef2fb',
                          color: '#5f5e5a',
                          whiteSpace: 'normal',
                        };
                        if (group.length === 2) {
                          const second = group[1];
                          return (
                            <tr key={i}>
                              <th className={thCls} style={thStyle}>{renderThLabel(group[0])}</th>
                              <td className={`${tdCls} border-r border-[#d8d6cf]`}>{renderEntryValue(group[0])}</td>
                              <th className={thCls} style={thStyle}>{second ? renderThLabel(second) : ''}</th>
                              <td className={tdCls}>{second ? renderEntryValue(second) : ''}</td>
                            </tr>
                          );
                        }
                        const entry = group[0];
                        return (
                          <tr key={i}>
                            <th className={thCls} style={thStyle}>{renderThLabel(entry)}</th>
                            <td className={tdCls} colSpan={3}>{renderEntryValue(entry)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              );
            })()}

            {/* 첨부사진 — 요청 원문은 위 "요청 항목" 표의 "특이사항 메모" 행으로 이동함 */}
            <div className="px-6 py-5">
              <h2 className="mb-4 text-lg font-semibold text-[#5f5e5a]">첨부사진</h2>
              {request.imageList?.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {request.imageList.map((img, i) => (
                    <img
                      key={img.flSn}
                      src={toImageUrl(img.url)}
                      alt="요청 사진"
                      onClick={() => setLightboxIndex(i)}
                      className="aspect-square w-full cursor-pointer rounded-lg border border-[#e2e1dc] object-cover transition-opacity hover:opacity-90"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-[#d8d6cf] bg-[#fafaf8] text-center text-sm text-[#888780]"
                    >
                      {i === 0 && '등록된 사진이 없습니다'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 변경사항 작성 — 본문 수정 불가 대신 견적 요청 정책상 최대 3개까지 별도 등록. 본인에게만 노출 */}
            {isOwner && isOpen && (
              <div className="border-t border-[#e8e8e8] px-6 py-5">
                <h2 className="mb-4 text-lg font-semibold text-[#5f5e5a]">변경사항 추가</h2>
                {canAddComment ? (
                  <div className="rounded-lg border border-[#e2e1dc] p-4">
                    <input
                      type="text"
                      maxLength={30}
                      placeholder="제목 (필수)"
                      value={cmtTtl}
                      onChange={e => setCmtTtl(e.target.value)}
                      className="w-full rounded-lg border border-[#e2e1dc] px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <p className={`mt-1 text-right text-xs ${cmtTtl.length >= 30 ? 'text-[#c0392b]' : 'text-[#9a9ba5]'}`}>{cmtTtl.length}/30</p>
                    <textarea
                      rows={3}
                      maxLength={100}
                      placeholder="내용 (선택)"
                      value={cmtCn}
                      onChange={e => setCmtCn(e.target.value)}
                      className="mt-2 w-full resize-none rounded-lg border border-[#e2e1dc] px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <p className={`mt-1 text-right text-xs ${cmtCn.length >= 100 ? 'text-[#c0392b]' : 'text-[#9a9ba5]'}`}>{cmtCn.length}/100</p>
                    <p className="mt-1 text-sm text-[#9a9ba5]">변경사항은 최대 3개까지 등록할 수 있습니다.</p>
                    <div className="mt-2 flex justify-end">
                      <ActionButton
                        onClick={requestCommentSubmit}
                        disabled={cmtSubmitting}
                        size="sm"
                      >
                        {cmtSubmitting ? '등록 중...' : '등록'}
                      </ActionButton>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#9a9ba5]">변경사항은 최대 3개까지 등록할 수 있습니다.</p>
                )}
              </div>
            )}

            {/* 변경 내역 — 등록된 변경사항 조회, 요청자·제공자 누구나 확인 가능 */}
            <div className="border-t border-[#e8e8e8] px-6 py-5">
              <h2 className="mb-4 text-lg font-semibold text-[#5f5e5a]">변경 내역</h2>
              {comments.length === 0 ? (
                <p className="text-sm text-[#9a9ba5]">등록된 변경사항이 없습니다.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {comments.map((c, i) => (
                    <li key={c.svcReqCmtSn} className="flex gap-3 border-b border-[#f0efec] pb-3 last:border-b-0 last:pb-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1d1d1f]">{c.svcReqCmtTtl}</p>
                        {c.svcReqCmtCn && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[#5f5e5a]">{c.svcReqCmtCn}</p>
                        )}
                        <p className="mt-1 text-xs text-[#9a9ba5]">{fmtDate(c.svcReqCmtRegDt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>

          {/* ── 오른쪽: 견적 패널 ── */}
          <aside className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm lg:sticky lg:top-[84px]">

            {/* 패널 헤더 */}
            <div className="border-b border-[#e8e8e8] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">도착한 견적</h2>
                </div>
              </div>
            </div>

            {/* 액션 영역 */}
            {!isOwner && isProvider && !isActualCreator && (
              <div className="border-b border-[#e8e8e8] px-5 py-4">
                {isAuthenticated ? (
                  isOpen ? (
                    myQuoteLoading ? (
                      <p className="text-center text-lg text-[#888780]">내 견적을 확인하는 중입니다.</p>
                    ) : myActiveQuote ? (
                      <div className="rounded-2xl border-2 border-primary bg-[#e5efff] px-6 py-6 text-center">
                        <p className="mb-4 text-lg font-medium text-[#0048bf]">이 요청에 제출한 견적이 있습니다.</p>
                        <ActionButton
                          className="min-h-14 rounded-lg px-4 text-[16px] font-bold"
                          fullWidth
                          onClick={handleQuoteEdit}
                          preserveSize
                        >
                          내 견적 수정
                        </ActionButton>
                      </div>
                    ) : quoteAccessPending ? (
                      <p className="text-center text-lg text-[#888780]">견적 제출 권한을 확인하는 중입니다.</p>
                    ) : canSubmitQuote ? (
                    <div className="rounded-2xl border-2 border-primary bg-[#e5efff] px-6 py-6 text-center">
                      <p className="mb-4 text-lg font-medium text-[#0048bf]">
                        이 요청에 아직 견적을 제출하지 않았습니다
                      </p>
                      <ActionButton
                        className="min-h-14 rounded-lg px-4 text-[16px] font-bold"
                        fullWidth
                        onClick={handleQuoteClick}
                        preserveSize
                      >
                        견적 제출하기
                      </ActionButton>
                    </div>
                    ) : (
                      <p className="text-center text-lg text-[#888780]">이 서비스 분야의 제공자 승인 후 견적을 제출할 수 있습니다.</p>
                    )
                  ) : (
                    <p className="text-center text-lg text-[#888780]">견적 접수가 종료된 요청입니다.</p>
                  )
                ) : (
                  <div className="rounded-2xl border-2 border-primary bg-[#e5efff] px-6 py-6 text-center">
                    <p className="mb-4 text-lg font-medium text-[#0048bf]">
                      견적을 제출하려면 로그인이 필요합니다
                    </p>
                    <ActionButton
                      className="min-h-14 rounded-lg px-4 text-[16px] font-bold"
                      fullWidth
                      preserveSize
                      state={{ from: location }}
                      to="/login"
                    >
                      로그인하기
                    </ActionButton>
                  </div>
                )}
              </div>
            )}

            {/* 견적 목록 — 본인 요청서일 때만 조회(GET /quotes/service-request/{svcReqSn}) */}
            {isOwner && (
              quotesLoading ? (
                <div className="px-5 py-6 text-center text-lg text-[#888780]">불러오는 중...</div>
              ) : quotes.length === 0 ? (
                <div className="px-5 py-6 text-center text-lg text-[#888780]">
                  아직 도착한 견적이 없습니다.
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-[#e8e8e8]">
                    {pagedQuotes.map(q => (
                      <li
                        key={q.qutSn}
                        className="cursor-pointer px-5 py-4 transition-colors hover:bg-[#f9fafb]"
                        onClick={() => navigate(getServiceRequestQuoteDetailPath(svcReqSn, q.qutSn), {
                          state: {
                            quote: q,
                            requestSummary: {
                              svcReqTtl: request.svcReqTtl,
                              catNm: request.catNm,
                              svcReqBdgtAmt: request.svcReqBdgtAmt,
                              svcReqStatusCd: request.svcReqStatusCd,
                              items: request.items,
                            },
                          },
                        })}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-semibold text-[#1d1d1f]">{q.providerNm}</span>
                          <DomainStatus
                            className="shrink-0"
                            tone={QUOTE_STATUS_TONE[q.statusCode] ?? 'neutral'}
                            variant="soft"
                          >
                            {QUOTE_STATUS_LABEL[q.statusCode] ?? q.statusCode}
                          </DomainStatus>
                        </div>
                        <p className="mt-1 text-xl font-bold text-primary">{formatBudget(q.amount)}</p>
                        {q.content && (
                          <p className="mt-1 line-clamp-2 text-sm text-[#5f5e5a]">{q.content}</p>
                        )}
                        {q.registeredAt && (
                          <p className="mt-1 text-sm text-[#9a9ba5]">{fmtDate(q.registeredAt)} 제출</p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {quoteTotalPages > 1 && (
                    <Pagination page={quotePage} totalPages={quoteTotalPages} onPageChange={setQuotePage} />
                  )}
                </>
              )
            )}
          </aside>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      <ConfirmModal
        open={closeConfirmOpen}
        message="이 요청서를 마감하시겠습니까?"
        subMessage="마감하면 더 이상 견적을 받을 수 없습니다."
        confirmLabel="마감"
        onConfirm={handleClose}
        onCancel={() => setCloseConfirmOpen(false)}
      />

      <ConfirmModal
        open={commentConfirmOpen}
        message="등록 후에는 수정할 수 없습니다."
        subMessage="이대로 등록하시겠습니까?"
        confirmLabel="등록"
        confirmTone="primary"
        onConfirm={handleCommentSubmit}
        onCancel={() => setCommentConfirmOpen(false)}
      />

      <ImageLightbox
        images={(request.imageList ?? []).map(img => toImageUrl(img.url))}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
      <ReportModal
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetName="서비스 요청 작성자"
        targetLabel="신고 대상 회원"
        targetType="direct"
        reportedUserSn={request.usrSn}
        contextLabel={`서비스 요청: ${request.svcReqTtl}`}
        redirectAfterSubmit={false}
      />
      </div>
    </>
  );
}
