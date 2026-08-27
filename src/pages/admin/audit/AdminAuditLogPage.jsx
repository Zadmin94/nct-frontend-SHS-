// Claude Code 작성 (BJN, 2026-07-18)
// 관리자 감사로그 화면 (F-OPS-016)
// 민감정보 원문 제한 조회(F-OPS-014)는 감사로그 조회와 분리하여
// 거래 분쟁 상세의 대상 채팅·첨부자료에서 실행하도록 연결한다.
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminPagination from '@components/admin/AdminPagination';
import AdminTable from '@components/admin/AdminTable';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import { useAuditLogs } from '@hooks/useAdminAudit';
import useClientPagination from '@hooks/useClientPagination';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import './adminAuditPage.css';

// 감사 행위 유형 필터 옵션 — 공통코드 AUDG01(기초데이터 v3)과 일치해야 한다
const TYPE_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'AUDC0001', label: '생성' },
  { value: 'AUDC0002', label: '수정' },
  { value: 'AUDC0003', label: '삭제' },
  { value: 'AUDC0004', label: '원문조회' },
  { value: 'AUDC0005', label: '관리자승인' },
  { value: 'AUDC0006', label: '관리자반려' },
  { value: 'AUDC0007', label: '상태변경' },
];
const PAGE_SIZE = ADMIN_PAGE_SIZE;
const EMPTY_FILTER_FORM = { usrSn: '', typeCd: '', from: '', to: '' };

const hasInvalidUsrSn = (value) => {
  const normalized = value.trim();
  if (!normalized) return false;
  return !/^[1-9]\d*$/.test(normalized);
};

const hasReversedDateRange = ({ from, to }) => Boolean(from && to && from > to);

const validateFilterForm = (form) => {
  if (hasInvalidUsrSn(form.usrSn)) {
    return '행위자 회원번호는 1 이상의 정수로 입력해 주세요.';
  }
  if (hasReversedDateRange(form)) {
    return '시작일은 종료일보다 늦을 수 없습니다.';
  }
  return '';
};

const auditDetails = (value) => {
  const raw = value?.trim() || '-';
  const match = raw.match(/^reason=(.*?); before=(.*?); after=(.*?); requestId=(.*)$/s);
  if (match) {
    return {
      reason: match[1], before: match[2], after: match[3], requestId: match[4],
    };
  }

  // 공지 변경 이력은 "공지 변경 사유=...; before=...; after=..." 형식으로 저장된다.
  const noticeMatch = raw.match(/^(.*?사유)=(.*?); before=(.*?); after=(.*)$/s);
  if (noticeMatch) {
    return {
      reason: `${noticeMatch[1]}=${noticeMatch[2]}`,
      before: noticeMatch[3], after: noticeMatch[4], requestId: null,
    };
  }
  return { reason: raw, before: null, after: null, requestId: null };
};

const reasonPreview = (reason) => {
  const normalized = reason.replaceAll(/\s+/g, ' ').trim() || '-';
  return normalized.length > 72 ? `${normalized.slice(0, 72)}…` : normalized;
};

const AdminAuditLogPage = () => {
  // 입력 중 값과 "조회 버튼을 누른 시점의 값"을 분리 — 타이핑할 때마다 서버를 찌르지 않기 위해
  const [form, setForm] = useState(EMPTY_FILTER_FORM);
  const [filters, setFilters] = useState({});
  const [filterError, setFilterError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const logsQuery = useAuditLogs(filters);
  const logs = logsQuery.data ?? [];
  const {
    page,
    pagedItems: pagedLogs,
    resetPage,
    setPage,
    totalPages,
  } = useClientPagination(logs, PAGE_SIZE);

  /** 담당자 7 · F-OPS-015/016: 입력 직후 잘못된 회원번호와 역전 날짜를 안내합니다. */
  const updateFilter = (name, value) => {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setFilterError(validateFilterForm(nextForm));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const nextError = validateFilterForm(form);
    setFilterError(nextError);
    if (nextError) return;

    const next = {};
    if (form.usrSn.trim()) next.usrSn = form.usrSn.trim();
    if (form.typeCd) next.typeCd = form.typeCd;
    if (form.from) next.from = form.from;
    if (form.to) next.to = form.to;
    resetPage();
    setFilters(next);
  };

  const resetFilters = () => {
    setForm(EMPTY_FILTER_FORM);
    setFilters({});
    setFilterError('');
    resetPage();
  };

  const columns = useMemo(() => [
    { key: 'date', label: '일시' },
    {
      key: 'userName', label: '행위자', className: 'admin-table__compact-text',
      render: (_, row) => (row.userSn == null
        ? '시스템'
        : formatAdminMemberIdentity(row.actorMember, row.userSn)),
    },
    { key: 'type', label: '행위 유형' },
    {
      key: 'refType', label: '대상',
      render: (value, row) => (value ? `${value} #${row.refSn}` : '-'),
    },
    { key: 'ipAddr', label: 'IP', render: (value) => value ?? '-' },
    {
      key: 'reason', label: '사유·내용', className: 'is-wrap admin-table__long-text',
      render: (_, row) => (
        <button
          className="admin-bjn-reason-preview"
          onClick={() => setSelectedLog(row)}
          title="사유 전체 보기"
          type="button"
        >
          {reasonPreview(auditDetails(row.reason).reason)}
        </button>
      ),
    },
  ], []);

  return (
    <div className="admin-bjn-page">
      <AdminPageHeader
        title="감사 로그"
      />

      {/* 조건 필터 (F-OPS-016) */}
      <form className="admin-bjn-filters" onSubmit={submitSearch}>
        <label>
          행위자 회원번호
          <input
            name="usrSn"
            type="number"
            min="1"
            placeholder="예: 183"
            step="1"
            value={form.usrSn}
            aria-invalid={hasInvalidUsrSn(form.usrSn)}
            onChange={(e) => updateFilter('usrSn', e.target.value)}
          />
        </label>
        <label>
          행위 유형
          <select
            name="typeCd"
            value={form.typeCd}
            onChange={(e) => updateFilter('typeCd', e.target.value)}
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>
          시작일
          <input
            name="from"
            type="date"
            value={form.from}
            aria-invalid={hasReversedDateRange(form)}
            onChange={(e) => updateFilter('from', e.target.value)}
          />
        </label>
        <label>
          종료일
          <input
            name="to"
            type="date"
            value={form.to}
            aria-invalid={hasReversedDateRange(form)}
            onChange={(e) => updateFilter('to', e.target.value)}
          />
        </label>
        <AdminFilterActions disabled={logsQuery.isFetching} onReset={resetFilters} />
      </form>
      {filterError && (
        <p className="admin-bjn-filter-error" role="alert">{filterError}</p>
      )}

      {/* 감사로그 표 */}
      {logsQuery.isError && <div className="admin-bjn-state is-error">감사로그 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.</div>}
      {!logsQuery.isError && (
        <div className="admin-bjn-table-scroll">
          <AdminTable
            columns={columns}
            data={pagedLogs}
            emptyMessage="조건에 맞는 감사로그가 없습니다."
            loading={logsQuery.isLoading}
            rowKey={(log) => log.id}
          />
        </div>
      )}
      {!logsQuery.isError && (
        <AdminPagination
          ariaLabel="감사 로그 목록 페이지 이동"
          disabled={logsQuery.isFetching}
          onPageChange={setPage}
          page={page}
          totalPages={totalPages}
        />
      )}

      {selectedLog && (
        <div className="admin-bjn-reason-dialog" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedLog(null);
        }} role="presentation">
          <section aria-labelledby="audit-reason-title" aria-modal="true" role="dialog">
            <div>
              <h2 id="audit-reason-title">감사 사유 상세</h2>
              <button aria-label="닫기" onClick={() => setSelectedLog(null)} type="button"><X aria-hidden="true" /></button>
            </div>
            <p>{selectedLog.type} · {selectedLog.date}</p>
            <dl className="admin-bjn-reason-details">
              <div><dt>사유</dt><dd>{auditDetails(selectedLog.reason).reason}</dd></div>
              {auditDetails(selectedLog.reason).before && <div><dt>변경 전</dt><dd>{auditDetails(selectedLog.reason).before}</dd></div>}
              {auditDetails(selectedLog.reason).after && <div><dt>변경 후</dt><dd>{auditDetails(selectedLog.reason).after}</dd></div>}
              {auditDetails(selectedLog.reason).requestId && <div><dt>요청 ID</dt><dd>{auditDetails(selectedLog.reason).requestId}</dd></div>}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogPage;
