import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminPagination from '@components/admin/AdminPagination';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import {
  useAdminRiskEvents,
  useAdminRiskEventSummary,
} from '@hooks/useAdminRiskEvents';
import { formatDateTime } from '@utils/common';
import './operationsIntegrationPreview.css';

const EMPTY_FILTERS = {
  typeCode: '',
  processed: '',
  keyword: '',
  dateFrom: '',
  dateTo: '',
};

// 담당자 7 · ISSUE-T7-013: 관리자 화면에는 다형성 참조 코드를 도메인명으로 표시합니다.
const REFERENCE_TYPE_LABELS = {
  REFC0001: '회원',
  REFC0002: '상품',
  REFC0003: '경매',
  REFC0004: '입찰',
  REFC0005: '거래',
  REFC0007: '서비스 요청',
  REFC0008: '견적',
  REFC0009: '포인트 원장',
  REFC0010: '시스템 설정',
  REFC0011: '공지',
  REFC0012: '상품 문의',
  REFC0013: '1:1 문의',
  REFC0014: '카테고리',
  REFC0015: '제공자 신청',
  REFC0016: '환전 신청',
  REFC0017: '정산',
  REFC0018: '신고',
  REFC0019: '제재',
  REFC0020: '공통 코드',
};

/** 담당자 7 · F-OPS-011/013: 운영 위험 이벤트를 읽기 전용으로 확인하는 화면입니다. */
const OperationsIntegrationPreview = () => {
  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const {
    keyword,
    processed,
    typeCode,
    dateFrom,
    dateTo,
  } = appliedFilters;

  const filters = useMemo(
    () => ({
      typeCode: typeCode || undefined,
      processed: processed || undefined,
      keyword: keyword || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      size: ADMIN_PAGE_SIZE,
    }),
    [dateFrom, dateTo, keyword, page, processed, typeCode],
  );

  const summaryFilters = useMemo(
    () => ({
      typeCode: typeCode || undefined,
      processed: processed || undefined,
      keyword: keyword || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo, keyword, processed, typeCode],
  );

  const eventsQuery = useAdminRiskEvents(filters);
  const summaryQuery = useAdminRiskEventSummary(summaryFilters);
  const typeOptionsQuery = useAdminRiskEventSummary();

  const columns = useMemo(() => [
    {
      key: 'riskEventId',
      label: '이벤트 번호',
      className: 'operations-table__id',
    },
    { key: 'typeName', label: '유형' },
    {
      key: 'referenceTypeCode',
      label: '관련 대상',
      render: (value, row) => (
        value && row.referenceSn != null
          ? `${REFERENCE_TYPE_LABELS[value] ?? '관련 대상'} #${row.referenceSn}`
          : '전체 범위'
      ),
    },
    {
      key: 'content',
      label: '내용',
      className: 'operations-table__content admin-table__long-text',
    },
    {
      key: 'registeredAt',
      label: '등록일',
      render: formatDateTime,
    },
    {
      key: 'processedYn',
      label: '처리 상태',
      render: (value) => (
        <AdminStatusBadge tone={value === 'Y' ? 'success' : 'warning'}>
          {value === 'Y' ? '처리 완료' : '미처리'}
        </AdminStatusBadge>
      ),
    },
  ], []);

  const submitSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({
      ...filterForm,
      keyword: filterForm.keyword.trim(),
    });
    setPage(1);
  };

  const resetFilters = () => {
    setFilterForm(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };


  return (
    <div className="operations-preview">
      <PageMeta title="위험 이벤트 조회" />

      <AdminPageHeader title="위험 이벤트" />

      <section
        className={`operations-summary${summaryQuery.isLoading ? ' is-loading' : ''}`}
        aria-label="위험 이벤트 유형별 건수"
      >
        {summaryQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <article className="operations-summary__card" key={index}>
              <Skeleton circle height={42} style={{ flexShrink: 0, width: 42 }} />
              <div>
                <Skeleton height={13} style={{ maxWidth: 90 }} />
                <Skeleton height={25} style={{ maxWidth: 60 }} />
              </div>
            </article>
          ))
        ) : summaryQuery.isError ? (
          <div className="admin-content-state operations-summary__state is-error" role="alert">
            <strong>위험 이벤트 유형별 집계를 불러오지 못했습니다.</strong>
            <button
              className="btn btn-outline"
              disabled={summaryQuery.isFetching}
              onClick={() => summaryQuery.refetch()}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : (summaryQuery.data ?? []).length === 0 ? (
          <div className="admin-content-state operations-summary__state">
            조회 조건에 해당하는 위험 이벤트 집계가 없습니다.
          </div>
        ) : (
          (summaryQuery.data ?? []).map((item) => (
            <article className="operations-summary__card" key={item.typeCode}>
              <div className="operations-summary__icon operations-summary__icon--danger">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span>{item.typeName}</span>
                <strong>{item.count}건</strong>
                <small>조회 조건 기준</small>
              </div>
            </article>
          ))
        )}
      </section>

      <AdminSectionCard
        action={!eventsQuery.isLoading && !eventsQuery.isError
          ? <span>총 {eventsQuery.data?.totalItems ?? 0}건</span>
          : null}
        className="operations-card"
        description="내용에는 원문 개인정보 대신 서버에서 마스킹된 정보만 표시됩니다."
        title="위험 이벤트 목록"
      >
        <form className="operations-filters" onSubmit={submitSearch}>
          {typeOptionsQuery.isError && (
            <div className="operations-filter-error" role="alert">
              <span>위험 이벤트 유형을 불러오지 못했습니다.</span>
              <button
                className="btn btn-outline"
                disabled={typeOptionsQuery.isFetching}
                onClick={() => typeOptionsQuery.refetch()}
                type="button"
              >
                다시 시도
              </button>
            </div>
          )}

          <label>
            <span>유형</span>
            <select
              disabled={typeOptionsQuery.isLoading || typeOptionsQuery.isError}
              onChange={(event) => setFilterForm({
                ...filterForm,
                typeCode: event.target.value,
              })}
              value={filterForm.typeCode}
            >
              <option value="">전체</option>
              {(typeOptionsQuery.data ?? []).map((item) => (
                <option key={item.typeCode} value={item.typeCode}>
                  {item.typeName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>처리 상태</span>
            <select
              onChange={(event) => setFilterForm({
                ...filterForm,
                processed: event.target.value,
              })}
              value={filterForm.processed}
            >
              <option value="">전체</option>
              <option value="N">미처리</option>
              <option value="Y">처리 완료</option>
            </select>
          </label>

          <label className="operations-date">
            <span>시작일</span>
            <input
              max={filterForm.dateTo || undefined}
              onChange={(event) => setFilterForm({
                ...filterForm,
                dateFrom: event.target.value,
              })}
              type="date"
              value={filterForm.dateFrom}
            />
          </label>

          <label className="operations-date">
            <span>종료일</span>
            <input
              min={filterForm.dateFrom || undefined}
              onChange={(event) => setFilterForm({
                ...filterForm,
                dateTo: event.target.value,
              })}
              type="date"
              value={filterForm.dateTo}
            />
          </label>

          <label className="operations-search">
            <span>검색</span>
            <input
              onChange={(event) => setFilterForm({
                ...filterForm,
                keyword: event.target.value,
              })}
              maxLength={100}
              placeholder="번호, 유형, 내용 검색"
              value={filterForm.keyword}
            />
          </label>
          <AdminFilterActions disabled={eventsQuery.isFetching} onReset={resetFilters} />
        </form>

        {eventsQuery.isError ? (
          <div className="admin-content-state is-error" role="alert">
            <strong>위험 이벤트 목록을 불러오지 못했습니다.</strong>
            <button
              className="btn btn-outline"
              disabled={eventsQuery.isFetching}
              onClick={() => eventsQuery.refetch()}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            <div className="operations-table-wrap">
              <AdminTable
                columns={columns}
                data={eventsQuery.data?.items ?? []}
                emptyMessage="조건에 맞는 위험 이벤트가 없습니다."
                loading={eventsQuery.isLoading}
                rowKey={(item) => item.riskEventId}
              />
            </div>

            <AdminPagination
              ariaLabel="위험 이벤트 페이지 이동"
              className="operations-pagination"
              disabled={eventsQuery.isFetching}
              onPageChange={setPage}
              page={eventsQuery.data?.page ?? page}
              totalPages={eventsQuery.data?.totalPages ?? 0}
            />
          </>
        )}
      </AdminSectionCard>
    </div>
  );
};

export default OperationsIntegrationPreview;
