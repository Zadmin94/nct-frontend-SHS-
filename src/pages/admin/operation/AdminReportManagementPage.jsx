import { useRef, useState } from 'react';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ArrowLeft, Paperclip, ShieldAlert, UnlockKeyhole } from 'lucide-react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { requestReportChatView } from '@api/adminAuditApi';
import {
  decideAdminReport,
  getAdminReportFileBlob,
  getAdminReport,
  getAdminReports,
  releaseAdminReportSanction,
} from '@api/adminReportApi';
import { fetchAdminAuctionOverview } from '@api/adminAuctionApi';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminModal from '@components/admin/AdminModal';
import AdminPagination from '@components/admin/AdminPagination';
import AdminReferenceLink from '@components/admin/AdminReferenceLink';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AuctionOriginalModal from '@components/trade/AuctionOriginalModal';
import PageMeta from '@components/admin/PageMeta';
import CommonTabs from '@components/common/CommonTabs';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import {
  ADMIN_REPORTS_PATH,
  ADMIN_SETTINGS_PATH,
  getAdminReportDetailPath,
  getAdminServiceRequestDetailPath,
  getAdminServiceTradeDetailPath,
} from '@/routes/adminRoutes';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import { toast } from '@utils/common';
import { REPORT_TYPE_FALLBACK_NAMES } from '@/constants/abuseReportTypes';
import '../audit/adminAuditPage.css';
import './adminOperationPages.css';

const REPORT_STATUS = {
  ABSC0001: { label: '접수', tone: 'warning' },
  ABSC0002: { label: '처리 중', tone: 'info' },
  ABSC0003: { label: '완료', tone: 'success' },
  ABSC0004: { label: '반려', tone: 'neutral' },
};

const REPORT_REFERENCE_NAMES = {
  REFC0001: '회원',
  REFC0002: '상품',
  REFC0003: '경매',
  REFC0004: '입찰',
  REFC0005: '거래',
  REFC0006: '거래 분쟁',
  REFC0007: '서비스 요청',
  REFC0008: '견적',
  REFC0009: '포인트 원장',
  REFC0010: '시스템 설정',
  REFC0011: '공지',
  REFC0012: '상품 댓글·문의',
  REFC0013: '1:1 문의',
};

const formatDate = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '-');
const PAGE_SIZE = ADMIN_PAGE_SIZE;
const EMPTY_FILTERS = { statusCode: '', keyword: '' };
const REPORT_CASE_TABS = [
  { value: 'ALL', label: '전체' },
  { value: 'GENERAL', label: '거래 전 신고' },
  { value: 'TRADE_ISSUE', label: '거래 이후 문제' },
];
const ENFORCEMENT_OPTIONS = [
  {
    value: 'NONE',
    label: '제재 없음',
    description: '신고 위반만 확정하고 계정이나 진행 중인 업무는 변경하지 않습니다.',
  },
  {
    value: 'TEMPORARY_SUSPENSION_7_DAYS',
    label: '7일 이용정지',
    description: '계정과 진행 중인 경매, 서비스 요청, 거래를 멈추고 해제 시 남은 기간으로 복구합니다.',
  },
  {
    value: 'PERMANENT_SUSPENSION',
    label: '영구 이용정지',
    description: '취소 가능한 경매와 요청을 종료하고, 안전하게 자동 취소할 수 없는 거래는 관리자 검토 상태로 둡니다.',
  },
];
const IMPACT_ACTION_NAMES = {
  PAUSED: '일시정지',
  CANCELED: '취소',
  BID_CANCELED: '최고입찰 취소',
  HELD_FOR_REVIEW: '관리자 검토 보류',
};
const TRADE_DECISION_OPTIONS = [
  {
    value: 'COMPLETE',
    label: '문제 처리 완료',
    description: '접수 전 거래 상태로 복구하고 이 신고로 보류한 정산과 채팅을 재개합니다.',
  },
  {
    value: 'REFUND',
    label: '거래 취소·전액 환불',
    description: '거래를 취소하고 구매자 또는 의뢰자에게 보관금 전액을 환불합니다.',
  },
];
const IMPACT_STATUS_NAMES = {
  ACTIVE: '적용 중',
  RELEASE_PENDING: '복구 대기',
  RESOLVED: '처리 완료',
  RESTORED: '복구 완료',
  SKIPPED: '자동 복구 제외',
};

/** 담당자 7 · F-OPS-007: 제재 영향 경매의 상품명과 추적 번호를 함께 표시합니다. */
const SanctionImpactList = ({ impacts, onAuctionPreview }) => {
  const auctionIds = [...new Set(
    impacts
      .filter((impact) => impact.referenceTypeCode === 'REFC0003')
      .map((impact) => Number(impact.referenceSn))
      .filter((auctionId) => Number.isInteger(auctionId) && auctionId > 0),
  )];
  const auctionQueries = useQueries({
    queries: auctionIds.map((auctionId) => ({
      queryKey: ['admin-auction-overview', auctionId],
      queryFn: () => fetchAdminAuctionOverview(auctionId),
      retry: false,
      staleTime: 60_000,
    })),
  });
  const auctionNames = new Map(
    auctionIds.map((auctionId, index) => [
      auctionId,
      auctionQueries[index]?.data?.product?.prdNm?.trim()
        || auctionQueries[index]?.data?.auction?.title?.trim()
        || null,
    ]),
  );

  return (
    <ul className="admin-report-sanction__impacts">
      {impacts.map((impact, index) => {
        const referenceName = REPORT_REFERENCE_NAMES[impact.referenceTypeCode]
          ?? impact.referenceTypeCode;
        const auctionId = impact.referenceTypeCode === 'REFC0003'
          ? Number(impact.referenceSn)
          : null;
        const auctionName = auctionNames.get(auctionId);
        const referenceLabel = auctionName
          ? `${auctionName} · ${referenceName} #${impact.referenceSn}`
          : `${referenceName} #${impact.referenceSn}`;
        const canPreviewAuction = Number.isInteger(auctionId)
          && auctionId > 0
          && typeof onAuctionPreview === 'function';

        return (
          <li key={`${impact.referenceTypeCode}-${impact.referenceSn}-${index}`}>
            <div>
              {canPreviewAuction ? (
                <button
                  className="admin-report-sanction__impact-reference"
                  onClick={() => onAuctionPreview(auctionId)}
                  title={`${referenceLabel} 상세 보기`}
                  type="button"
                >
                  {referenceLabel}
                </button>
              ) : (
                <strong>{referenceLabel}</strong>
              )}
              <span>
                {IMPACT_ACTION_NAMES[impact.actionCode] ?? impact.actionCode}
                {' · '}
                {IMPACT_STATUS_NAMES[impact.statusCode] ?? impact.statusCode}
              </span>
            </div>
            <p>{impact.result}</p>
          </li>
        );
      })}
    </ul>
  );
};
const reportTypeName = (code, serverName) => (
  serverName?.trim() || REPORT_TYPE_FALLBACK_NAMES[code] || code || '-'
);
const reportStatus = (code) => REPORT_STATUS[code] ?? { label: code ?? '-', tone: 'neutral' };
const isActionableStatus = (code) => code === 'ABSC0001' || code === 'ABSC0002';
const getReferenceDetailPath = (detailType, detailSn) => {
  if (detailType === 'SERVICE_REQUEST' && detailSn != null) {
    return getAdminServiceRequestDetailPath(detailSn);
  }
  if (detailType === 'SERVICE_TRADE' && detailSn != null) {
    return getAdminServiceTradeDetailPath(detailSn);
  }
  if (detailType === 'SYSTEM_SETTING') return ADMIN_SETTINGS_PATH;
  if (detailType === 'NOTICE' && detailSn != null) return `/admin/notices/${detailSn}`;
  if (detailType === 'CUSTOMER_INQUIRY' && detailSn != null) {
    return `/admin/inquiries?inquirySn=${detailSn}`;
  }
  return null;
};

const getReportReferencePresentation = ({
  fallbackTitle,
  referenceDetailSn,
  referenceDetailType,
  referenceSn,
  referenceTitle,
  referenceTypeCode,
  targetName,
}) => {
  const referenceName = REPORT_REFERENCE_NAMES[referenceTypeCode]
    ?? referenceTypeCode
    ?? '직접 입력';
  const genericNames = new Set([
    referenceName,
    referenceSn == null ? null : `${referenceName} #${referenceSn}`,
    referenceSn == null ? null : `#${referenceSn}`,
  ]);
  const descriptiveTitle = [referenceTitle, targetName, fallbackTitle]
    .map((value) => value?.trim())
    .find((value) => value && !genericNames.has(value));
  const displayName = descriptiveTitle
    || referenceTitle?.trim()
    || targetName?.trim()
    || fallbackTitle?.trim()
    || `${referenceName} 정보를 확인할 수 없습니다`;

  return {
    auctionPreviewId: referenceDetailType === 'AUCTION' && referenceDetailSn != null
      ? referenceDetailSn
      : null,
    detailPath: getReferenceDetailPath(referenceDetailType, referenceDetailSn),
    displayName,
    metaText: referenceSn == null ? referenceName : `${referenceName} · #${referenceSn}`,
  };
};

/** 담당자 7 · F-OPS-007: 모든 신고 참조를 같은 제목·번호·상세 이동 형식으로 표시합니다. */
const renderReportReference = ({
  detailState,
  fallbackTitle,
  isList = false,
  onAuctionPreview,
  referenceDetailSn,
  referenceDetailType,
  referenceTypeCode,
  referenceSn,
  referenceTitle,
  targetName,
}) => {
  if (!referenceTypeCode && referenceSn == null && !referenceTitle?.trim() && !targetName?.trim()) {
    return <span className="admin-operation-reference__empty">관련 항목 없음</span>;
  }

  const {
    auctionPreviewId,
    detailPath,
    displayName,
    metaText,
  } = getReportReferencePresentation({
    fallbackTitle,
    referenceDetailSn,
    referenceDetailType,
    referenceSn,
    referenceTitle,
    referenceTypeCode,
    targetName,
  });
  return (
    <AdminReferenceLink
      centered={isList}
      meta={metaText}
      onClick={auctionPreviewId != null && onAuctionPreview
        ? () => onAuctionPreview(auctionPreviewId)
        : undefined}
      state={detailState}
      title={displayName}
      to={detailPath}
    />
  );
};
const formatProcessor = (value, member) => {
  if (!value) return '-';
  return /^\d+$/.test(String(value))
    ? formatAdminMemberIdentity(member, Number(value))
    : value;
};
const formatChatSender = (message) => {
  const loginId = message.senderLoginId?.trim();
  const nickname = message.senderNickname?.trim();
  if (loginId && nickname && loginId !== nickname) return `${loginId} (${nickname})`;
  return loginId || nickname || '회원 정보 없음';
};
const filtersFromSearch = (searchParams) => ({
  statusCode: searchParams.get('statusCode') ?? '',
  keyword: searchParams.get('keyword') ?? '',
});

const caseTypeFromSearch = (searchParams) => {
  const value = searchParams.get('caseType') ?? 'ALL';
  return REPORT_CASE_TABS.some((tab) => tab.value === value) ? value : 'ALL';
};

// 담당자 7 · F-OPS-007/F-AUTH-013: 위험 이벤트 자동 신고는 거래 분쟁 판정을 보내지 않습니다.
const isTradeIssueReport = (report) => report?.riskEventSn == null
  && (report?.caseType === 'TRADE_ISSUE' || report?.tradeSn != null);

const pageFromSearch = (searchParams) => {
  const value = Number(searchParams.get('page') ?? 1);
  return Number.isInteger(value) && value > 0 ? value : 1;
};

/** 담당자 7 · F-OPS-007: 처리 전후 신고를 한 목록에서 조회하고 관리합니다. */
const AdminReportManagementPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { reportSn: reportSnParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDetailRoute = reportSnParam != null;
  const selectedReportSn = /^\d+$/.test(reportSnParam ?? '') && Number(reportSnParam) > 0
    ? Number(reportSnParam)
    : null;
  const [filterForm, setFilterForm] = useState(() => filtersFromSearch(searchParams));
  const [appliedFilters, setAppliedFilters] = useState(() => filtersFromSearch(searchParams));
  const [caseType, setCaseType] = useState(() => caseTypeFromSearch(searchParams));
  const [page, setPage] = useState(() => pageFromSearch(searchParams));
  const [reason, setReason] = useState('');
  const [tradeDecision, setTradeDecision] = useState('COMPLETE');
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [enforcementAction, setEnforcementAction] = useState('NONE');
  const [permanentConfirmed, setPermanentConfirmed] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [fileViewReason, setFileViewReason] = useState('');
  const [fileError, setFileError] = useState('');
  const [openingFileSn, setOpeningFileSn] = useState(null);
  const [chatReason, setChatReason] = useState('');
  const [chatResult, setChatResult] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [previewAuctionId, setPreviewAuctionId] = useState(null);
  const chatRequestVersionRef = useRef(0);

  const reportsQuery = useQuery({
    queryKey: ['admin', 'reports', 'search', appliedFilters, caseType, page],
    queryFn: () => getAdminReports({
      ...appliedFilters,
      caseType,
      page,
      size: PAGE_SIZE,
    }),
    enabled: !isDetailRoute,
  });
  const reportDetailQuery = useQuery({
    queryKey: ['admin', 'reports', selectedReportSn],
    queryFn: () => getAdminReport(selectedReportSn),
    enabled: selectedReportSn != null,
  });
  const decisionMutation = useMutation({
    mutationFn: decideAdminReport,
    onSuccess: (_, variables) => {
      const actionLabel = variables.decision === 'PROCESSING'
        ? '처리 시작'
        : variables.decision === 'PROCESSED'
          ? '위반 확정'
          : '반려';
      toast({
        icon: 'success',
        title: `신고 #${variables.reportSn}을 ${actionLabel}했습니다.`,
        timer: 2000,
      });
      setReason('');
      setTradeDecision('COMPLETE');
      setRefundConfirmed(false);
      setEnforcementAction('NONE');
      setPermanentConfirmed(false);
      reportsQuery.refetch();
      queryClient.invalidateQueries({
        queryKey: ['admin', 'audit', 'history', 'ABUSE_REPORT', variables.reportSn],
      });
      if (variables.decision === 'PROCESSING' || variables.decision === 'PROCESSED') {
        reportDetailQuery.refetch();
        return;
      }
      navigate(location.state?.from ?? ADMIN_REPORTS_PATH);
    },
  });
  const releaseMutation = useMutation({
    mutationFn: releaseAdminReportSanction,
    onSuccess: (_, variables) => {
      toast({
        icon: 'success',
        title: `신고 #${variables.reportSn}의 7일 이용정지를 해제했습니다.`,
        timer: 2000,
      });
      setReleaseReason('');
      reportsQuery.refetch();
      reportDetailQuery.refetch();
      queryClient.invalidateQueries({
        queryKey: ['admin', 'audit', 'history', 'ABUSE_REPORT', variables.reportSn],
      });
    },
  });
  const chatViewMutation = useMutation({
    mutationFn: ({ reportSn, reason: viewReason, page: requestedPage }) => (
      requestReportChatView(reportSn, {
        reason: viewReason,
        page: requestedPage,
        size: 50,
      })
    ),
    onSuccess: async (data, variables) => {
      if (
        data?.reportSn !== variables.reportSn
        || chatRequestVersionRef.current !== variables.requestVersion
      ) return;
      setChatResult(data);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });

  const syncListPath = (filters, nextCaseType, nextPage) => {
    const nextParams = new URLSearchParams();
    if (filters.statusCode) nextParams.set('statusCode', filters.statusCode);
    if (filters.keyword) nextParams.set('keyword', filters.keyword);
    if (nextCaseType !== 'ALL') nextParams.set('caseType', nextCaseType);
    if (nextPage > 1) nextParams.set('page', String(nextPage));
    setSearchParams(nextParams, { replace: true });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const nextFilters = {
      ...filterForm,
      keyword: filterForm.keyword.trim(),
    };
    setAppliedFilters(nextFilters);
    setPage(1);
    syncListPath(nextFilters, caseType, 1);
  };

  const resetFilters = () => {
    setFilterForm(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
    syncListPath(EMPTY_FILTERS, caseType, 1);
  };

  const changeCaseType = (nextCaseType) => {
    setCaseType(nextCaseType);
    setPage(1);
    syncListPath(appliedFilters, nextCaseType, 1);
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    syncListPath(appliedFilters, caseType, nextPage);
  };

  const openReport = (reportSn) => {
    chatRequestVersionRef.current += 1;
    setReason('');
    setTradeDecision('COMPLETE');
    setRefundConfirmed(false);
    setEnforcementAction('NONE');
    setPermanentConfirmed(false);
    setReleaseReason('');
    setFileViewReason('');
    setFileError('');
    setChatReason('');
    setChatResult(null);
    setChatModalOpen(false);
    decisionMutation.reset();
    releaseMutation.reset();
    chatViewMutation.reset();
    navigate(getAdminReportDetailPath(reportSn), {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  const closeReport = () => {
    if (chatModalOpen || previewAuctionId != null
      || decisionMutation.isPending || releaseMutation.isPending) return;
    chatRequestVersionRef.current += 1;
    setReason('');
    setTradeDecision('COMPLETE');
    setRefundConfirmed(false);
    setEnforcementAction('NONE');
    setPermanentConfirmed(false);
    setReleaseReason('');
    setFileViewReason('');
    setFileError('');
    setChatReason('');
    setChatResult(null);
    setChatModalOpen(false);
    decisionMutation.reset();
    releaseMutation.reset();
    chatViewMutation.reset();
    navigate(location.state?.from ?? ADMIN_REPORTS_PATH);
  };

  const columns = [
    { key: 'reportSn', label: '신고 번호', render: (value) => `#${value}` },
    {
      key: 'reportTypeCode',
      label: '유형',
      render: (value, row) => reportTypeName(value, row.reportTypeName),
    },
    {
      key: 'reporterUserSn',
      label: '신고자',
      className: 'admin-table__compact-text',
      render: (value, row) => (value == null
        ? '시스템'
        : formatAdminMemberIdentity(row.reporterMember, value)),
    },
    {
      key: 'reportedUserSn',
      label: '신고 대상',
      className: 'admin-table__compact-text',
      render: (value, row) => formatAdminMemberIdentity(row.reportedMember, value),
    },
    {
      key: 'referenceTypeCode',
      label: '관련 항목',
      className: 'admin-table__compact-text admin-reference-cell',
      render: (value, row) => renderReportReference({
        isList: true,
        referenceTypeCode: value,
        referenceSn: row.referenceSn,
        referenceTitle: row.referenceTitle,
        referenceDetailType: row.referenceDetailType,
        referenceDetailSn: row.referenceDetailSn,
        detailState: { from: `${location.pathname}${location.search}` },
        onAuctionPreview: setPreviewAuctionId,
        targetName: row.targetName,
        fallbackTitle: value === 'REFC0001'
          ? formatAdminMemberIdentity(row.reportedMember, row.reportedUserSn)
          : null,
      }),
    },
    { key: 'registeredAt', label: '접수일', render: formatDate },
    {
      key: 'processedAt',
      label: '처리일',
      className: 'admin-table__processed-date',
      render: formatDate,
    },
    {
      key: 'statusCode',
      label: '상태',
      render: (value) => {
        const status = reportStatus(value);
        return <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>;
      },
    },
    {
      key: 'manage',
      label: '관리',
      render: (_, row) => (
        <button
          className={`btn ${
            isActionableStatus(row.statusCode) ? 'btn-primary' : 'btn-outline'
          } admin-operation-table__action`}
          onClick={() => openReport(row.reportSn)}
          type="button"
        >
          {isActionableStatus(row.statusCode) ? '처리' : '내역'}
        </button>
      ),
    },
  ];

  const decide = (decision) => {
    const normalizedReason = reason.trim();
    const selectedAction = decision === 'PROCESSED' ? enforcementAction : 'NONE';
    const currentDetail = reportDetailQuery.data;
    const tradeReport = isTradeIssueReport(currentDetail);
    const resolvedTradeDecision = !tradeReport
      ? null
      : decision === 'PROCESSING'
        ? null
        : decision === 'REJECTED'
          ? 'REJECT'
          : tradeDecision;
    if (!selectedReportSn
      || !normalizedReason
      || decisionMutation.isPending
      || (selectedAction === 'PERMANENT_SUSPENSION' && !permanentConfirmed)
      || (tradeReport && decision === 'PROCESSED' && !resolvedTradeDecision)
      || (tradeReport && resolvedTradeDecision === 'REFUND' && !refundConfirmed)
      || (tradeReport
        && selectedAction === 'PERMANENT_SUSPENSION'
        && resolvedTradeDecision !== 'REFUND')) return;
    decisionMutation.mutate({
      reportSn: selectedReportSn,
      decision,
      tradeDecision: resolvedTradeDecision,
      enforcementAction: selectedAction,
      reason: normalizedReason,
    });
  };

  const releaseSanction = () => {
    const normalizedReason = releaseReason.trim();
    if (!selectedReportSn || !normalizedReason || releaseMutation.isPending) return;
    releaseMutation.mutate({ reportSn: selectedReportSn, reason: normalizedReason });
  };

  const closeChatModal = () => {
    chatRequestVersionRef.current += 1;
    setChatModalOpen(false);
    setChatResult(null);
    chatViewMutation.reset();
  };

  /** 담당자 7 · F-OPS-005/014: 신고 사건과 연결된 거래 채팅을 감사 사유와 함께 조회합니다. */
  const viewReportChat = (requestedPage = 1) => {
    const viewReason = chatReason.trim();
    if (!selectedReportSn || !viewReason || chatViewMutation.isPending) return;
    setChatModalOpen(true);
    const requestVersion = chatRequestVersionRef.current + 1;
    chatRequestVersionRef.current = requestVersion;
    chatViewMutation.mutate({
      reportSn: selectedReportSn,
      reason: viewReason,
      page: requestedPage,
      requestVersion,
    });
  };

  const openReportFile = async (file) => {
    const normalizedReason = fileViewReason.trim();
    if (!selectedReportSn || !normalizedReason || openingFileSn != null) {
      setFileError('첨부 원문 열람 사유를 입력해 주세요.');
      return;
    }
    setFileError('');
    setOpeningFileSn(file.fileSn);
    try {
      const response = await getAdminReportFileBlob({
        reportSn: selectedReportSn,
        fileSn: file.fileSn,
        reason: normalizedReason,
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'audit', 'history', 'ABUSE_REPORT', selectedReportSn],
      });
    } catch {
      setFileError('첨부파일을 열지 못했습니다. 권한과 파일 상태를 확인해 주세요.');
    } finally {
      setOpeningFileSn(null);
    }
  };

  const detail = reportDetailQuery.data;
  const detailStatus = reportStatus(detail?.statusCode);
  const canStart = detail?.statusCode === 'ABSC0001';
  const canFinalize = detail?.statusCode === 'ABSC0002';
  const isActionable = canStart || canFinalize;
  const isTradeReport = isTradeIssueReport(detail);
  const selectedTradeDecision = TRADE_DECISION_OPTIONS.find(
    (option) => option.value === tradeDecision,
  );
  const requiresRefundConfirmation = isTradeReport && tradeDecision === 'REFUND';
  const hasInvalidPermanentTradeDecision = isTradeReport
    && enforcementAction === 'PERMANENT_SUSPENSION'
    && tradeDecision !== 'REFUND';
  const selectedEnforcement = ENFORCEMENT_OPTIONS.find(
    (option) => option.value === enforcementAction,
  );
  const hasTemporarySanction = detail?.enforcementAction === 'TEMPORARY_SUSPENSION_7_DAYS';
  const canReleaseSanction = hasTemporarySanction && !detail?.sanctionReleased;
  const detailReference = detail ? getReportReferencePresentation({
    fallbackTitle: detail.referenceTypeCode === 'REFC0001'
      ? formatAdminMemberIdentity(detail.reportedMember, detail.reportedUserSn)
      : null,
    referenceDetailSn: detail.referenceDetailSn,
    referenceDetailType: detail.referenceDetailType,
    referenceSn: detail.referenceSn,
    referenceTitle: detail.referenceTitle,
    referenceTypeCode: detail.referenceTypeCode,
    targetName: detail.targetName,
  }) : null;

  return (
    <div className="admin-bjn-page admin-operation-page">
      <PageMeta title={detail
        ? `${detail.title?.trim() || reportTypeName(detail.reportTypeCode, detail.reportTypeName)} · 신고 #${detail.reportSn}`
        : selectedReportSn ? `신고 상세 · #${selectedReportSn}` : '신고 관리'} />
      <AdminPageHeader
        action={selectedReportSn ? (
          <button
            className="btn btn-outline"
            disabled={decisionMutation.isPending || releaseMutation.isPending}
            onClick={closeReport}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            신고 관리
          </button>
        ) : null}
        title={selectedReportSn ? '신고 상세' : '신고 관리'}
      />

      {isDetailRoute && selectedReportSn == null && (
        <div className="admin-bjn-state is-error">
          올바르지 않은 신고 상세 경로입니다.
          <button className="btn btn-outline" onClick={() => navigate(ADMIN_REPORTS_PATH)} type="button">
            신고 목록
          </button>
        </div>
      )}

      {!isDetailRoute && (
        <>
          <CommonTabs
            activeValue={caseType}
            ariaLabel="신고 사건 분류"
            className="admin-report-case-tabs"
            items={REPORT_CASE_TABS}
            onChange={changeCaseType}
          />

          <form className="admin-bjn-filters admin-operation-search" onSubmit={submitSearch}>
        <label className="admin-operation-search__status">
          처리 상태
          <select
            onChange={(event) => setFilterForm({
              ...filterForm,
              statusCode: event.target.value,
            })}
            value={filterForm.statusCode}
          >
            <option value="">전체 상태</option>
            <option value="ABSC0001">접수</option>
            <option value="ABSC0002">처리 중</option>
            <option value="ABSC0003">완료</option>
            <option value="ABSC0004">반려</option>
          </select>
        </label>
        <label className="admin-operation-search__keyword">
          신고 검색
          <input
            maxLength={100}
            onChange={(event) => setFilterForm({
              ...filterForm,
              keyword: event.target.value,
            })}
            placeholder="신고 번호·내용"
            value={filterForm.keyword}
          />
        </label>
        <AdminFilterActions disabled={reportsQuery.isFetching} onReset={resetFilters} />
          </form>

          {reportsQuery.isError && (
            <div className="admin-bjn-state is-error">
              신고 목록을 불러오지 못했습니다.
              <button className="btn btn-outline" onClick={() => reportsQuery.refetch()} type="button">
                다시 시도
              </button>
            </div>
          )}
          {!reportsQuery.isError && (
            <AdminSectionCard
              action={!reportsQuery.isLoading && <span>총 {reportsQuery.data?.totalItems ?? 0}건</span>}
              description="거래 전 신고와 거래 이후 문제를 구분해 접수부터 처리 결과까지 확인합니다."
              title="신고 목록"
            >
              <div className="admin-bjn-table-scroll">
                <AdminTable
                  columns={columns}
                  data={reportsQuery.data?.items ?? []}
                  emptyMessage="조건에 맞는 신고가 없습니다."
                  loading={reportsQuery.isLoading}
                  rowKey={(row) => row.reportSn}
                />
              </div>
              <AdminPagination
                ariaLabel="신고 목록 페이지 이동"
                disabled={reportsQuery.isFetching}
                onPageChange={changePage}
                page={reportsQuery.data?.page ?? page}
                totalPages={reportsQuery.data?.totalPages ?? 0}
              />
            </AdminSectionCard>
          )}
        </>
      )}

      {selectedReportSn && (
        <section className="admin-report-detail-page">
          <div className="admin-report-detail-page__body">
          <section className="admin-operation-detail">
            {reportDetailQuery.isLoading && <div className="admin-bjn-state">상세 내용을 불러오는 중입니다.</div>}
            {reportDetailQuery.isError && (
              <div className="admin-bjn-state is-error">신고 상세를 불러오지 못했습니다.</div>
            )}
            {detail && (
              <>
                <div className="admin-report-detail-page__summary">
                  <div className="admin-report-detail-page__status-line">
                    <span>신고 #{detail.reportSn}</span>
                    <AdminStatusBadge tone={detailStatus.tone}>{detailStatus.label}</AdminStatusBadge>
                  </div>
                  <h3>{reportTypeName(detail.reportTypeCode, detail.reportTypeName)}</h3>
                  <p>{detailReference?.displayName || '신고 대상과 관련 정보를 확인한 뒤 처리해 주세요.'}</p>
                </div>
                <dl>
                  <dt>신고 번호</dt><dd>#{detail.reportSn}</dd>
                  <dt>유형</dt><dd>{reportTypeName(detail.reportTypeCode, detail.reportTypeName)}</dd>
                  <dt>신고자</dt><dd>{detail.reporterUserSn == null ? '시스템' : formatAdminMemberIdentity(detail.reporterMember, detail.reporterUserSn)}</dd>
                  <dt>신고 대상</dt><dd>{formatAdminMemberIdentity(detail.reportedMember, detail.reportedUserSn)}</dd>
                  <dt>관련 항목</dt>
                  <dd>{renderReportReference({
                    referenceTypeCode: detail.referenceTypeCode,
                    referenceSn: detail.referenceSn,
                    referenceTitle: detail.referenceTitle,
                    referenceDetailType: detail.referenceDetailType,
                    referenceDetailSn: detail.referenceDetailSn,
                    detailState: { from: `${location.pathname}${location.search}` },
                    onAuctionPreview: setPreviewAuctionId,
                    targetName: detail.targetName,
                    fallbackTitle: detail.referenceTypeCode === 'REFC0001'
                      ? formatAdminMemberIdentity(detail.reportedMember, detail.reportedUserSn)
                      : null,
                  })}</dd>
                  <dt>위험 이벤트</dt>
                  <dd>{detail.riskEventSn == null ? '-' : `연결된 위험 이벤트 · #${detail.riskEventSn}`}</dd>
                  <dt>상태</dt>
                  <dd><AdminStatusBadge tone={detailStatus.tone}>{detailStatus.label}</AdminStatusBadge></dd>
                  <dt>접수일</dt><dd>{formatDate(detail.registeredAt)}</dd>
                  <dt>신고 내용</dt><dd className="admin-operation-detail__content">{detail.content || '-'}</dd>
                  {canFinalize && detail.processReason && (
                    <><dt>처리 시작 사유</dt><dd className="admin-operation-detail__content">{detail.processReason}</dd></>
                  )}
                  {!isActionable && (
                    <>
                      <dt>처리자</dt><dd>{formatProcessor(detail.processedBy, detail.processorMember)}</dd>
                      <dt>처리일</dt><dd>{formatDate(detail.processedAt)}</dd>
                      <dt>처리 사유</dt>
                      <dd className="admin-operation-detail__content">{detail.processReason || '-'}</dd>
                    </>
                  )}
                </dl>
                <div className={`admin-report-detail-page__columns${isActionable ? '' : ' is-single'}`}>
                  <main className="admin-report-detail-page__main">
                {detail.sanctionSn && (
                  <section className="admin-report-sanction" aria-label="계정 제재 결과">
                    <div className="admin-report-sanction__heading">
                      <div>
                        <span>계정 제재 #{detail.sanctionSn}</span>
                        <h3>
                          {detail.enforcementAction === 'PERMANENT_SUSPENSION'
                            ? '영구 이용정지'
                            : '7일 이용정지'}
                        </h3>
                      </div>
                      <AdminStatusBadge tone={detail.sanctionReleased ? 'neutral' : 'danger'}>
                        {detail.sanctionReleased ? '해제됨' : '적용 중'}
                      </AdminStatusBadge>
                    </div>
                    <dl className="admin-report-sanction__meta">
                      <dt>시작</dt><dd>{formatDate(detail.sanctionStartedAt)}</dd>
                      <dt>종료 예정</dt>
                      <dd>{detail.sanctionEndedAt ? formatDate(detail.sanctionEndedAt) : '기한 없음'}</dd>
                    </dl>
                    {detail.sanctionImpacts?.length > 0 && (
                      <SanctionImpactList
                        impacts={detail.sanctionImpacts}
                        onAuctionPreview={setPreviewAuctionId}
                      />
                    )}
                    {canReleaseSanction && (
                      <div className="admin-report-sanction__release">
                        <label>
                          조기 해제 사유
                          <textarea
                            className="admin-reason-textarea"
                            disabled={releaseMutation.isPending}
                            maxLength={1000}
                            onChange={(event) => setReleaseReason(event.target.value)}
                            placeholder="7일 이용정지를 조기 해제하는 사유를 입력하세요."
                            value={releaseReason}
                          />
                        </label>
                        {releaseMutation.isError && (
                          <p className="admin-operation-error" role="alert">
                            {releaseMutation.error?.response?.data?.message
                              ?? '이용정지 해제에 실패했습니다. 현재 제재 상태를 확인해 주세요.'}
                          </p>
                        )}
                        <button
                          className="btn btn-outline"
                          disabled={!releaseReason.trim() || releaseMutation.isPending}
                          onClick={releaseSanction}
                          type="button"
                        >
                          <UnlockKeyhole size={16} aria-hidden="true" />
                          {releaseMutation.isPending ? '해제 중…' : '7일 정지 조기 해제'}
                        </button>
                      </div>
                    )}
                  </section>
                )}
                {detail.files?.length > 0 && (
                  <section className="admin-operation-detail__files">
                    <h3><Paperclip size={16} aria-hidden="true" /> 첨부파일</h3>
                    <label>
                      원문 열람 사유
                      <input
                        maxLength={1000}
                        onChange={(event) => {
                          setFileViewReason(event.target.value);
                          setFileError('');
                        }}
                        placeholder="감사로그에 남길 열람 사유를 입력하세요."
                        value={fileViewReason}
                      />
                    </label>
                    <div className="admin-operation-detail__file-list">
                      {detail.files.map((file) => (
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={openingFileSn != null}
                          key={file.fileSn}
                          onClick={() => openReportFile(file)}
                          type="button"
                        >
                          <Paperclip size={14} aria-hidden="true" />
                          {openingFileSn === file.fileSn ? '여는 중…' : file.originalName}
                        </button>
                      ))}
                    </div>
                    {fileError && <p className="admin-operation-error" role="alert">{fileError}</p>}
                  </section>
                )}
                {isTradeReport && (
                  <section className="admin-operation-chat" aria-labelledby="admin-report-chat-title">
                    <div className="admin-operation-chat__heading">
                      <div>
                        <strong id="admin-report-chat-title">채팅 내역 열람</strong>
                        <span>판정 근거가 필요할 때 사유를 기록하고 해당 거래의 대화를 확인합니다.</span>
                      </div>
                    </div>
                    <label className="admin-operation-chat__reason">
                      <span>열람 사유</span>
                      <input
                        maxLength={400}
                        onChange={(event) => {
                          chatRequestVersionRef.current += 1;
                          setChatReason(event.target.value);
                          setChatResult(null);
                          chatViewMutation.reset();
                        }}
                        placeholder="거래 신고 판정에 필요한 채팅 열람 사유를 입력하세요."
                        value={chatReason}
                      />
                      <small>관리자·신고 건·열람 사유·접속 정보가 감사로그에 기록됩니다.</small>
                    </label>
                    <div className="admin-operation-chat__actions">
                      <button
                        className="btn btn-outline"
                        disabled={!chatReason.trim() || chatViewMutation.isPending}
                        onClick={() => viewReportChat(1)}
                        type="button"
                      >
                        {chatViewMutation.isPending ? '불러오는 중…' : '채팅 내역 보기'}
                      </button>
                    </div>
                  </section>
                )}
                <AdminHistoryTimeline
                  referenceSn={detail.reportSn}
                  referenceType="ABUSE_REPORT"
                  title="신고 처리 이력"
                />
                  </main>
                {isActionable && (
                  <aside className="admin-report-detail-page__aside" aria-label="신고 운영 처리">
                    {canFinalize && isTradeReport && (
                      <section className="admin-operation-decision">
                        <div className="admin-operation-decision__heading">
                          <strong>거래 처리</strong>
                          <span>거래·정산·보관금 변경은 신고 판정과 같은 트랜잭션으로 실행됩니다.</span>
                        </div>
                        <label className="admin-operation-decision__select">
                          거래 판정
                          <select
                            disabled={decisionMutation.isPending}
                            onChange={(event) => {
                              setTradeDecision(event.target.value);
                              setRefundConfirmed(false);
                              decisionMutation.reset();
                            }}
                            value={tradeDecision}
                          >
                            {TRADE_DECISION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <p className={tradeDecision === 'REFUND'
                          ? 'admin-operation-decision__warning'
                          : 'admin-operation-decision__description'}>
                          {selectedTradeDecision?.description}
                        </p>
                        {requiresRefundConfirmation && (
                          <label className="admin-operation-confirm admin-operation-confirm--danger">
                            <input
                              checked={refundConfirmed}
                              disabled={decisionMutation.isPending}
                              onChange={(event) => setRefundConfirmed(event.target.checked)}
                              type="checkbox"
                            />
                            거래 취소와 보관금 전액 환불이 실행됨을 확인했습니다.
                          </label>
                        )}
                      </section>
                    )}
                    {canFinalize && (
                      <section className="admin-operation-decision">
                        <div className="admin-operation-decision__heading">
                          <strong>위반 확정 조치</strong>
                          <span>신고를 위반으로 확정할 때 계정과 진행 중인 업무에 적용할 조치를 선택합니다.</span>
                        </div>
                        <label className="admin-operation-decision__select">
                          계정 조치
                          <select
                            disabled={decisionMutation.isPending}
                            onChange={(event) => {
                              setEnforcementAction(event.target.value);
                              setPermanentConfirmed(false);
                              decisionMutation.reset();
                            }}
                            value={enforcementAction}
                          >
                            {ENFORCEMENT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <p className={enforcementAction === 'PERMANENT_SUSPENSION'
                          ? 'admin-operation-decision__warning'
                          : 'admin-operation-decision__description'}>
                          {selectedEnforcement?.description}
                        </p>
                        {enforcementAction === 'PERMANENT_SUSPENSION' && (
                          <label className="admin-operation-confirm admin-operation-confirm--danger">
                            <input
                              checked={permanentConfirmed}
                              disabled={decisionMutation.isPending}
                              onChange={(event) => setPermanentConfirmed(event.target.checked)}
                              type="checkbox"
                            />
                            취소 가능한 경매·요청·견적이 즉시 종료되는 것을 확인했습니다.
                          </label>
                        )}
                        {hasInvalidPermanentTradeDecision && (
                          <p className="admin-operation-validation" role="alert">
                            거래 신고의 영구 이용정지는 거래 취소·전액 환불 판정과 함께 처리해야 합니다.
                          </p>
                        )}
                      </section>
                    )}
                    <label className="admin-operation-detail__reason">
                      {canStart ? '처리 시작 사유' : '최종 판정 사유'}
                      <textarea
                        className="admin-reason-textarea"
                        disabled={decisionMutation.isPending}
                        maxLength={4000}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={canStart
                          ? '처리를 시작하는 이유나 확인 계획을 입력하세요.'
                          : '위반 확정 또는 반려 사유를 입력하세요.'}
                        value={reason}
                      />
                    </label>
                    {!reason.trim() && (
                      <p className="admin-operation-validation" role="alert">
                        {canStart
                          ? '처리 시작 사유를 입력해야 합니다.'
                          : '최종 판정 사유를 입력해야 위반 확정 또는 반려할 수 있습니다.'}
                      </p>
                    )}
                    {decisionMutation.isError && (
                      <p className="admin-operation-error" role="alert">
                        {decisionMutation.error?.response?.data?.message
                          ?? '신고 처리에 실패했습니다. 이미 처리된 신고인지 확인해 주세요.'}
                      </p>
                    )}
                    <div className="admin-operation-actions">
                      {canStart ? (
                        <button
                          className="btn btn-primary"
                          disabled={!reason.trim() || decisionMutation.isPending}
                          onClick={() => decide('PROCESSING')}
                          type="button"
                        >
                          {decisionMutation.isPending ? '변경 중…' : '처리 시작'}
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn-outline"
                            disabled={!reason.trim() || decisionMutation.isPending}
                            onClick={() => decide('REJECTED')}
                            type="button"
                          >
                            반려
                          </button>
                          <button
                            className="btn btn-primary"
                            disabled={!reason.trim()
                              || decisionMutation.isPending
                              || (requiresRefundConfirmation && !refundConfirmed)
                              || hasInvalidPermanentTradeDecision
                              || (enforcementAction === 'PERMANENT_SUSPENSION'
                                && !permanentConfirmed)}
                            onClick={() => decide('PROCESSED')}
                            type="button"
                          >
                            <ShieldAlert size={16} aria-hidden="true" />
                            {decisionMutation.isPending ? '처리 중…' : '위반 확정'}
                          </button>
                        </>
                      )}
                    </div>
                  </aside>
                )}
                </div>
              </>
            )}
          </section>
          </div>
        </section>
      )}

      {chatModalOpen && (
        <div className="admin-operation-chat-modal-layer">
          <AdminModal
            onClose={closeChatModal}
            panelClassName="admin-operation-chat-modal"
            title="채팅 내역"
          >
            <div className="admin-operation-chat-modal__summary">
              <div>
                <span>신고</span>
                <strong>{detail?.title?.trim()
                  || reportTypeName(detail?.reportTypeCode, detail?.reportTypeName)} · 신고 #{selectedReportSn}</strong>
              </div>
              <div>
                <span>거래</span>
                <strong>{detail?.tradeSn == null
                  ? '연결된 거래 없음'
                  : `${detailReference?.displayName || '연결 거래'} · 거래 #${detail.tradeSn}`}</strong>
              </div>
            </div>
            <p className="admin-operation-chat-modal__notice">
              이 신고에 연결된 거래 채팅만 표시되며 모든 열람 기록은 감사로그에 남습니다.
            </p>

            {chatViewMutation.isPending && !chatResult && (
              <div className="admin-bjn-state">채팅 내역을 불러오는 중입니다.</div>
            )}
            {chatViewMutation.isError && (
              <div className="admin-operation-chat-modal__error" role="alert">
                <p>
                  {chatViewMutation.error?.response?.data?.message
                    ?? '채팅 내역을 불러오지 못했습니다.'}
                </p>
                <button className="btn btn-outline" onClick={() => viewReportChat(1)} type="button">
                  다시 시도
                </button>
              </div>
            )}
            {chatResult && !chatResult.chatRoomExists && (
              <p className="admin-operation-chat__empty">이 거래에는 생성된 채팅방이 없습니다.</p>
            )}
            {chatResult?.chatRoomExists && chatResult.totalItems === 0 && (
              <p className="admin-operation-chat__empty">주고받은 채팅이 없습니다.</p>
            )}
            {(chatResult?.messages?.length ?? 0) > 0 && (
              <>
                <div className="admin-operation-chat-modal__count">
                  총 {chatResult.totalItems ?? 0}건
                </div>
                <ol className="admin-operation-chat__messages">
                  {chatResult.messages.map((message) => (
                    <li key={message.messageSn}>
                      <div className="admin-operation-chat__meta">
                        <strong>{formatChatSender(message)}</strong>
                        <time>{message.sentAt || '-'}</time>
                      </div>
                      <p>{message.content || '-'}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {chatResult && chatResult.totalPages > 1 && (
              <div className="admin-operation-chat__pagination">
                <button
                  className="btn btn-outline"
                  disabled={chatViewMutation.isPending || chatResult.page >= chatResult.totalPages}
                  onClick={() => viewReportChat(chatResult.page + 1)}
                  type="button"
                >
                  더 이전 대화
                </button>
                <span>{chatResult.page} / {chatResult.totalPages}</span>
                <button
                  className="btn btn-outline"
                  disabled={chatViewMutation.isPending || chatResult.page <= 1}
                  onClick={() => viewReportChat(chatResult.page - 1)}
                  type="button"
                >
                  더 최근 대화
                </button>
              </div>
            )}
            <div className="admin-operation-chat-modal__actions">
              <button className="btn btn-outline" onClick={closeChatModal} type="button">닫기</button>
            </div>
          </AdminModal>
        </div>
      )}

      <AuctionOriginalModal
        auctionId={previewAuctionId}
        onClose={() => setPreviewAuctionId(null)}
        open={previewAuctionId != null}
        readOnly
      />

    </div>
  );
};

export default AdminReportManagementPage;
