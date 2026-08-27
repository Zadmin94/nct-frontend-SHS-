import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarClock, Eye, EyeOff, FilePlus2 } from 'lucide-react';
import AdminFilterActions from '@components/admin/AdminFilterActions';
import AdminPagination from '@components/admin/AdminPagination';
import AdminTable from '@components/admin/AdminTable';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import {
  useAdminNoticeList,
  useAdminNoticeOptions,
  useHideAdminNotice,
  usePublishAdminNotice,
} from '@hooks/useAdminNotices';
import { confirm, formatDateTime, toast } from '@utils/common';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import './adminContentPages.css';

const PAGE_SIZE = ADMIN_PAGE_SIZE;
const PUBLISHED_STATUS = 'NTCC0006';

const statusTone = (statusCode) => {
  if (statusCode === 'NTCC0006') return 'success';
  if (statusCode === 'NTCC0007') return 'danger';
  return 'neutral';
};

const getErrorMessage = (error) => error?.response?.status === 409
  ? '다른 관리자가 먼저 공지를 변경했습니다. 목록을 새로 불러온 뒤 다시 시도해 주세요.'
  : error?.response?.data?.message || '공지 공개 상태 변경 중 오류가 발생했습니다.';

/** F-OPS-023: 임시저장·게시·숨김을 모두 확인하는 관리자 공지 목록입니다. */
const AdminNoticeListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterForm, setFilterForm] = useState({
    typeCode: searchParams.get('typeCode') || '',
    statusCode: searchParams.get('statusCode') || '',
    keyword: searchParams.get('keyword') || '',
  });
  const [visibilityError, setVisibilityError] = useState('');
  const typeCode = searchParams.get('typeCode') || '';
  const statusCode = searchParams.get('statusCode') || '';
  const keyword = searchParams.get('keyword') || '';
  const requestedPage = Number(searchParams.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const filters = { typeCode, statusCode, keyword, page, size: PAGE_SIZE };
  const optionsQuery = useAdminNoticeOptions();
  const noticesQuery = useAdminNoticeList(filters);
  const publishMutation = usePublishAdminNotice();
  const hideMutation = useHideAdminNotice();
  const noticePage = noticesQuery.data;
  const isVisibilityPending = publishMutation.isPending || hideMutation.isPending;

  const changeFilters = (changes) => {
    const next = { typeCode, statusCode, keyword, ...changes };
    const params = {};
    if (next.typeCode) params.typeCode = next.typeCode;
    if (next.statusCode) params.statusCode = next.statusCode;
    if (next.keyword) params.keyword = next.keyword;
    if (next.page && next.page > 1) params.page = String(next.page);
    setSearchParams(params);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    changeFilters({
      ...filterForm,
      keyword: filterForm.keyword.trim(),
      page: 1,
    });
  };

  const resetFilters = () => {
    const emptyFilters = { typeCode: '', statusCode: '', keyword: '' };
    setFilterForm(emptyFilters);
    changeFilters({ ...emptyFilters, page: 1 });
  };

  /** 담당자 7 | F-OPS-023: 게시 기간은 보존하고 상태만 게시로 바꿔 감사 가능한 즉시 노출을 제공합니다. */
  const publishNotice = async (notice) => {
    setVisibilityError('');
    try {
      const published = await publishMutation.mutateAsync({
        noticeId: notice.noticeId,
        expectedRevision: notice.revisionToken,
      });
      toast({
        icon: published.visibleNow ? 'success' : 'warning',
        title: published.visibleNow
          ? '공지가 공개되었습니다.'
          : '게시 상태는 변경됐지만 게시 기간 때문에 현재 비공개입니다.',
        timer: published.visibleNow ? 1800 : 3000,
      });
    } catch (error) {
      setVisibilityError(getErrorMessage(error));
    }
  };

  /** 담당자 7 | F-OPS-023: 목록에서도 게시 내용과 기간을 유지한 채 공개 상태만 숨김으로 전환합니다. */
  const hideNotice = async (notice) => {
    const confirmed = await confirm({
      title: '공지를 비공개 처리할까요?',
      text: '공지 내용과 게시 기간은 유지됩니다.',
      confirmButtonText: '비공개',
    });
    if (!confirmed) return;

    setVisibilityError('');
    try {
      await hideMutation.mutateAsync({ noticeId: notice.noticeId });
      toast({ icon: 'success', title: '공지가 비공개 처리되었습니다.', timer: 1800 });
    } catch (error) {
      setVisibilityError(getErrorMessage(error));
    }
  };

  const columns = [
    { key: 'noticeId', label: '번호' },
    { key: 'typeName', label: '유형' },
    {
      key: 'title', label: '제목', className: 'admin-notice-list__title admin-table__long-text',
      render: (value, row) => (
        <Link to={`/admin/notices/${row.noticeId}`}>
          {row.pinned && <span aria-label="중요 공지">[중요] </span>}{value}
        </Link>
      ),
    },
    {
      key: 'statusName', label: '상태',
      render: (value, row) => <AdminStatusBadge tone={statusTone(row.statusCode)}>{value}</AdminStatusBadge>,
    },
    {
      key: 'visibleNow', label: '공개',
      render: (value, row) => {
        const canPublishNow = !value && row.statusCode !== PUBLISHED_STATUS;
        return (
          <div className="admin-notice-list__visibility">
            <AdminStatusBadge tone={value ? 'success' : 'neutral'}>
              {value ? '공개' : '비공개'}
            </AdminStatusBadge>
            {value && (
              <button
                aria-label={`${row.title} 공지 비공개 처리`}
                className="admin-notice-list__hide-button"
                disabled={isVisibilityPending}
                onClick={() => hideNotice(row)}
                type="button"
              >
                <EyeOff aria-hidden="true" />
                비공개
              </button>
            )}
            {canPublishNow && (
              <button
                aria-label={`${row.title} 공지 공개하기`}
                className="admin-notice-list__publish-button"
                disabled={isVisibilityPending}
                onClick={() => publishNotice(row)}
                type="button"
              >
                <Eye aria-hidden="true" />
                공개하기
              </button>
            )}
            {!value && !canPublishNow && (
              <Link
                aria-label={`${row.title} 공지 게시 기간 수정`}
                className="admin-notice-list__period-link"
                to={`/admin/notices/${row.noticeId}`}
              >
                <CalendarClock aria-hidden="true" />
                기간 수정
              </Link>
            )}
          </div>
        );
      },
    },
    { key: 'postingStartAt', label: '게시 시작', render: formatDateTime },
    { key: 'postingEndAt', label: '게시 종료', render: formatDateTime },
    {
      key: 'writerUserId',
      label: '작성자',
      className: 'admin-table__compact-text',
      render: (value, row) => formatAdminMemberIdentity(row.writerMember, value),
    },
    {
      key: 'updatedAt',
      label: '최종 처리',
      render: (value, row) => `${formatAdminMemberIdentity(
        row.updaterMember,
        row.updaterUserId,
      )} · ${formatDateTime(value)}`,
    },
  ];

  return (
    <div className="admin-content-page">
      <PageMeta title="공지 관리" />
      <AdminPageHeader
        action={(
          <Link className="btn btn-primary admin-content-page__primary-action" to="/admin/notices/new">
            <FilePlus2 aria-hidden="true" /> 공지 작성
          </Link>
        )}
        title="공지사항 관리"
      />

      <form className="card admin-notice-filters" onSubmit={submitSearch}>
        <label>
          <span>유형</span>
          <select
            onChange={(event) => setFilterForm({ ...filterForm, typeCode: event.target.value })}
            value={filterForm.typeCode}
          >
            <option value="">전체 유형</option>
            {(optionsQuery.data?.types ?? []).map((option) => (
              <option key={option.code} value={option.code}>{option.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>게시 상태</span>
          <select
            onChange={(event) => setFilterForm({ ...filterForm, statusCode: event.target.value })}
            value={filterForm.statusCode}
          >
            <option value="">전체 상태</option>
            {(optionsQuery.data?.statuses ?? []).map((option) => (
              <option key={option.code} value={option.code}>{option.name}</option>
            ))}
          </select>
        </label>
        <label className="admin-notice-filters__search">
          <span>제목·내용 검색</span>
          <input
            maxLength={100}
            onChange={(event) => setFilterForm({ ...filterForm, keyword: event.target.value })}
            placeholder="검색어를 입력하세요"
            value={filterForm.keyword}
          />
        </label>
        <AdminFilterActions disabled={noticesQuery.isFetching} onReset={resetFilters} />
      </form>

      {noticesQuery.isError && (
        <div className="card admin-content-state is-error">
          <strong>공지 목록을 불러오지 못했습니다.</strong>
          <button className="btn btn-outline" onClick={() => noticesQuery.refetch()} type="button">다시 시도</button>
        </div>
      )}

      {!noticesQuery.isError && (
        <section className="card admin-notice-list" aria-label="관리자 공지 목록">
          {!noticesQuery.isLoading && (
            <div className="admin-notice-list__summary">
              <p>총 <strong>{noticePage?.totalItems ?? 0}</strong>건</p>
              <small>임시저장·숨김 공지는 목록에서 게시로 전환하고, 예약·종료 기간은 상세에서 수정합니다.</small>
            </div>
          )}
          {visibilityError && (
            <p
              className="admin-notice-list__feedback is-error"
              role="alert"
            >
              {visibilityError}
            </p>
          )}
          <div className="admin-table-scroll">
            <AdminTable
              columns={columns}
              data={noticePage?.items ?? []}
              emptyMessage="조건에 맞는 공지가 없습니다."
              loading={noticesQuery.isLoading}
              rowKey={(notice) => notice.noticeId}
            />
          </div>

          <AdminPagination
            onPageChange={(nextPage) => changeFilters({ page: nextPage })}
            page={page}
            totalPages={noticePage?.totalPages ?? 0}
          />
        </section>
      )}
    </div>
  );
};

export default AdminNoticeListPage;
