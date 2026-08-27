// src/pages/user/report/MyReportListPage.jsx
// F-COM-018: 내 신고 내역 (담당자3 황성경 소유)
import React, { useState } from "react";
import { Paperclip } from 'lucide-react';
import Pagination from "@components/common/Pagination";
import { ActionButton, StatusBadge as CommonStatusBadge } from '@components/common/ui';
import MyPageListSectionLayout from "@components/mypage/MyPageListSectionLayout";
import MyPageListSkeleton from "@components/skeleton/MyPageListSkeleton";
import MyPageListEmpty from "@components/mypage/MyPageListEmpty";
import MyPageListError from "@components/mypage/MyPageListError";
import { useMyReportDetail, useMyReports } from "@hooks/useAbuseReport";
import { getMyReportFileBlob } from '@api/abuseReportApi';
import { REPORT_TYPE_FALLBACK_NAMES } from '@/constants/abuseReportTypes';

// ─── 코드 매핑 ────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  ABSC0001: "접수됨",
  ABSC0002: "처리중",
  ABSC0003: "처리완료",
  ABSC0004: "반려",
};

// 담당자 7: 신고 유형과 처리 상태를 목록에서 바로 구분할 수 있도록 배지 색상을 분리한다.
const STATUS_BADGE_TONE = {
  ABSC0001: "warning",
  ABSC0002: "info",
  ABSC0003: "success",
  ABSC0004: "danger",
};

const TYPE_BADGE_TONE = {
  ABRC0001: "warning",
  ABRC0002: "danger",
  ABRC0003: "danger",
  ABRC0004: "danger",
  ABRC0005: "info",
  ABRC0006: "warning",
  ABRC0007: "neutral",
  ABRC0008: "danger",
  ABRC0009: "warning",
  ABRC0010: "info",
  ABRC0011: "warning",
};

const getTypeNames = (report) => {
  if (report.reportTypeNames?.length) return report.reportTypeNames;
  const code = report.reportTypeCode;
  const name = report.reportTypeName ?? REPORT_TYPE_FALLBACK_NAMES[code];
  return name ? [name] : [];
};

const STATUS_TABS = [
  { label: "전체",    status: null },
  { label: "접수됨",  status: "ABSC0001" },
  { label: "처리중",  status: "ABSC0002" },
  { label: "반려",    status: "ABSC0004" },
  { label: "처리완료", status: "ABSC0003" },
];

const PAGE_SIZE = 5;

const fmtDate = (str) => str?.slice(0, 10).replace(/-/g, ".") ?? "-";

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

// 담당자 7 · UI 공통화: 신고 업무 코드는 유지하고 공통 배지의 의미색만 선택합니다.
function StatusBadge({ statusCode }) {
  const label = STATUS_LABEL[statusCode] ?? statusCode;
  return (
    <CommonStatusBadge tone={STATUS_BADGE_TONE[statusCode] ?? "neutral"} variant="soft">
      {label}
    </CommonStatusBadge>
  );
}

function TypeBadge({ typeCode, typeName }) {
  return (
    <CommonStatusBadge tone={TYPE_BADGE_TONE[typeCode] ?? "neutral"} variant="soft">
      {typeName}
    </CommonStatusBadge>
  );
}

function ReportCard({ report, isOpen, onToggle, number }) {
  const [fileError, setFileError] = React.useState('');
  const [openingFileSn, setOpeningFileSn] = React.useState(null);
  const detailQuery = useMyReportDetail(report.reportSn, isOpen);
  const detail = detailQuery.data ?? report;

  const openFile = async (file) => {
    setFileError('');
    setOpeningFileSn(file.fileSn);
    try {
      const response = await getMyReportFileBlob(report.reportSn, file.fileSn);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setFileError(error?.response?.data?.message ?? '첨부파일을 열지 못했습니다.');
    } finally {
      setOpeningFileSn(null);
    }
  };
  return (
    <div className="transition-all bg-white overflow-hidden rounded-[15px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e4e9f2] hover:border-[#a0aec0] cursor-pointer">
      {/* 헤더 행 */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left group bg-white cursor-pointer"
      >
        <div className="py-4 px-5 sm:py-6">

          {/* ── 모바일 전용 (2행) ───────────────────────────────────── */}
          <div className="sm:hidden">
            {/* 1행: 번호 + 타이틀 + 화살표 */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-[14px] font-medium text-[#969696] w-6 text-center">{number}</span>
              <p className="font-bold text-[16px] text-[#333] truncate mb-0 min-w-0 flex-1">
                {report.targetName?.trim() || report.title || '-'}
              </p>
              <svg
                className={`size-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-0 text-[#0064ff]" : "rotate-180 text-[#aaa] group-hover:text-[#0064ff]"}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* 2행: 날짜 + 접수상태 (번호 너비만큼 indent) */}
            <div className="flex items-center gap-2 mt-1.5 pl-8">
              <span className="text-[13px] text-[#969696]">{fmtDate(report.registeredAt)}</span>
              <StatusBadge statusCode={report.statusCode} />
            </div>
            {report.processReason && !isOpen && (
              <div className="flex items-center gap-1 mt-1.5 pl-8">
                <svg className="size-3.5 shrink-0 text-[#0064ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-[13px] text-[#0064ff]">관리자 답변 있음</span>
              </div>
            )}
          </div>

          {/* ── 데스크톱 전용 (1행, 기존 유지) ─────────────────────── */}
          <div className="hidden sm:flex items-center gap-4">
            <span className="shrink-0 text-[14px] font-medium text-[#969696] w-6 text-center">{number}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {getTypeNames(report).map((name) => (
                  <TypeBadge key={name} typeCode={report.reportTypeCode} typeName={name} />
                ))}
                <p className="font-bold text-[18px] text-[#333] truncate mb-0 min-w-0">{report.targetName?.trim() || report.title || '-'}</p>
              </div>
              {report.processReason && !isOpen && (
                <div className="flex items-center gap-1 mt-1.5">
                  <svg className="size-3.5 shrink-0 text-[#0064ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="text-[14px] text-[#0064ff]">관리자 답변 있음</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pl-3 shrink-0">
              <span className="text-[14px] text-[#969696]">{fmtDate(report.registeredAt)}</span>
              <StatusBadge statusCode={report.statusCode} />
              <svg
                className={`size-5 transition-transform duration-200 ${isOpen ? "rotate-0 text-[#0064ff]" : "rotate-180 text-[#aaa] group-hover:text-[#0064ff]"}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* 아코디언 상세 내용 */}
      {isOpen && (
        <div className="pb-5 space-y-4 border-t border-[#e8e9ec] px-5 sm:pl-[60px]" style={{ background: "#F8FAFC" }}>
          <div className="flex items-center justify-between pt-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <p className="font-bold m-0 shrink-0" style={{ fontSize: "16px", color: "#333333" }}>신고 대상</p>
              <p className="font-bold text-[16px] text-[#1a1a18] m-0 truncate">{detail.targetName || "-"}</p>
            </div>
            <p className="text-[13px] text-[#969696] m-0 shrink-0">
              접수번호 <strong className="text-[#333] font-medium">{report.reportSn}</strong>
            </p>
          </div>

          <div className="pb-1">
            <p className="font-bold m-0 mb-2" style={{ fontSize: "16px", color: "#333333" }}>신고 내용</p>
            <p className="text-[16px] text-[#444] leading-relaxed m-0">{detail.content}</p>
          </div>

          {detailQuery.isLoading && <p className="text-[13px] text-[#777]">첨부 정보를 불러오는 중입니다.</p>}
          {detailQuery.isError && <p className="text-[13px] text-red-500">첨부 정보를 불러오지 못했습니다.</p>}
          {detail.files?.length > 0 && (
            <div>
              <p className="font-bold m-0 mb-2" style={{ fontSize: "16px", color: "#333333" }}>첨부파일</p>
              <div className="flex flex-wrap gap-2">
                {detail.files.map((file) => (
                  <ActionButton
                    className="max-w-full"
                    disabled={openingFileSn === file.fileSn}
                    key={file.fileSn}
                    onClick={() => openFile(file)}
                    size="sm"
                    tone="outline"
                  >
                    <Paperclip size={14} aria-hidden="true" />
                    <span className="truncate">{file.originalName}</span>
                  </ActionButton>
                ))}
              </div>
              {fileError && <p className="mt-2 text-[13px] text-red-500" role="alert">{fileError}</p>}
            </div>
          )}

          {detail.processReason && (
            <div className="rounded-[8px] p-4 border border-[#e8e9ec]" style={{ background: "#ffffff" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="size-4 text-[#0064ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-[16px] font-bold text-[#0064ff] m-0">관리자 답변</p>
              </div>
              <p className="text-[16px] text-[#1a1a18] leading-relaxed m-0">{detail.processReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function MyReportListPage({ embedded = false }) {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [openSn, setOpenSn] = useState(null);

  const handleToggle = (sn) => setOpenSn((prev) => (prev === sn ? null : sn));

  const activeTab = STATUS_TABS[activeTabIdx];

  const { data, isLoading, isError, refetch } = useMyReports({
    status: activeTab.status,
    page,
    size: PAGE_SIZE,
  });

  const { data: countAll }      = useMyReports({ status: null,       page: 1, size: 1 });
  const { data: countReceived } = useMyReports({ status: "ABSC0001", page: 1, size: 1 });
  const { data: countProcessing } = useMyReports({ status: "ABSC0002", page: 1, size: 1 });
  const { data: countFinished } = useMyReports({ status: "ABSC0003", page: 1, size: 1 });
  const { data: countRejected } = useMyReports({ status: "ABSC0004", page: 1, size: 1 });

  const TAB_COUNTS = [
    countAll?.totalCount,
    countReceived?.totalCount,
    countProcessing?.totalCount,
    countRejected?.totalCount,
    countFinished?.totalCount,
  ];

  const reports    = data?.content ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleTab = (idx) => { setActiveTabIdx(idx); setPage(1); };

  return (
    <div className={embedded ? "" : "max-w-[1200px] mx-auto px-4 py-10"}>

      <MyPageListSectionLayout
        title="신고"
        summaryItems={[
          { label: '접수됨', value: countReceived?.totalCount ?? 0 },
          { label: '처리중', value: countProcessing?.totalCount ?? 0 },
          { label: '반려', value: countRejected?.totalCount ?? 0 },
          { label: '처리완료', value: countFinished?.totalCount ?? 0 },
        ]}
        filterItems={STATUS_TABS.map((tab, idx) => ({ value: idx, label: tab.label, count: TAB_COUNTS[idx] }))}
        activeFilter={activeTabIdx}
        onFilterChange={handleTab}
        filterAriaLabel="신고 상태"
        isLoading={isLoading}
      />

      {isLoading ? (
        <MyPageListSkeleton count={PAGE_SIZE} />
      ) : isError ? (
        <MyPageListError message="목록을 불러오지 못했습니다." onRetry={() => refetch()} />
      ) : reports.length === 0 ? (
        <MyPageListEmpty message="신고 내역이 없습니다." />
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report, idx) => (
            <ReportCard
              key={report.reportSn}
              report={report}
              isOpen={openSn === report.reportSn}
              onToggle={() => handleToggle(report.reportSn)}
              number={totalCount - (page - 1) * PAGE_SIZE - idx}
            />
          ))}
        </div>
      )}

      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showSinglePage />
      )}

    </div>
  );
}
