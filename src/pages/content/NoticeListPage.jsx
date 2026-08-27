import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import {
  ContentPageShell,
  ContentPagination,
  ContentState,
  NoticeFilterBar,
  NoticeList,
  NoticeListSummary,
} from '@components/content/ContentUi';
import { ActionButton } from '@components/common/ui';
import { usePublicNoticeList, usePublicNoticeTypes } from '@hooks/usePublicNotices';
import './noticePage.css';

const PAGE_SIZE = 10;

/** 담당자 7 · F-COM-013: 검색 도구 영역의 크기를 유지해 로딩 전후 흔들림을 줄입니다. */
const NoticeToolbarSkeleton = () => (
  <div
    aria-hidden="true"
    className="public-notice-list-toolbar public-notice-list-toolbar--loading"
  >
    <span className="public-notice-skeleton__summary" />
    <div className="public-notice-skeleton__search">
      <span />
      <span />
    </div>
  </div>
);

/** 담당자 7 · F-COM-013: 실제 공지 표와 같은 열 구조를 유지하는 목록 전용 로딩 화면입니다. */
const NoticeListSkeleton = () => (
  <section className="public-notice-skeleton" aria-label="공지사항 목록을 불러오는 중">
    <div className="public-notice-skeleton__table">
      <div className="public-notice-skeleton__row public-notice-skeleton__row--head">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="public-notice-skeleton__row" key={index}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  </section>
);


/** F-COM-013: 공개 조건을 만족한 공지만 보여 주는 목록 화면입니다. */
const NoticeListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeCode = searchParams.get('type') || '';
  const keyword = searchParams.get('keyword') || '';
  const [keywordInput, setKeywordInput] = useState(keyword);
  const requestedPage = Number(searchParams.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const typesQuery = usePublicNoticeTypes();
  const noticesQuery = usePublicNoticeList({ typeCode, keyword, page, size: PAGE_SIZE });
  const noticePage = noticesQuery.data;

  const setParams = ({ nextTypeCode = typeCode, nextKeyword = keyword, nextPage = 1 }) => {
    const next = {};
    if (nextTypeCode) next.type = nextTypeCode;
    if (nextKeyword) next.keyword = nextKeyword;
    if (nextPage > 1) next.page = String(nextPage);
    setSearchParams(next);
  };

  const changeFilter = (nextTypeCode) => setParams({ nextTypeCode });

  const submitSearch = (event) => {
    event.preventDefault();
    setParams({ nextKeyword: keywordInput.trim() });
  };

  const changePage = (nextPage) => {
    setParams({ nextPage });
  };

  return (
    <ContentPageShell className="public-notice-page">
      <Helmet><title>에누리컷</title></Helmet>
      <header className="customer-support-page-header customer-support-page-header--plain">
        <h1>공지사항</h1>
      </header>

      <section className="public-notice-board" aria-label="공지사항 검색 및 목록">
        <div className="public-notice-controls">
          <NoticeFilterBar
            hasError={typesQuery.isError}
            onChange={changeFilter}
            onRetry={() => typesQuery.refetch()}
            selectedTypeCode={typeCode}
            types={typesQuery.data ?? []}
          />

          {noticesQuery.isLoading && <NoticeToolbarSkeleton />}

          {!noticesQuery.isLoading && !noticesQuery.isError && (
            <div className="public-notice-list-toolbar">
              {noticePage?.items?.length > 0 && (
                <NoticeListSummary total={noticePage.totalItems} />
              )}
              <form className="public-notice-search" onSubmit={submitSearch}>
                <input
                  aria-label="공지 제목 또는 내용 검색"
                  maxLength={100}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="제목 또는 내용 검색"
                  value={keywordInput}
                />
                <ActionButton type="submit">
                  검색
                </ActionButton>
              </form>
            </div>
          )}
        </div>

        <div className="public-notice-board__body">
          {noticesQuery.isLoading && <NoticeListSkeleton />}

          {noticesQuery.isError && (
            <ContentState
              actionLabel="다시 불러오기"
              description="잠시 후 다시 시도해 주세요."
              onAction={() => noticesQuery.refetch()}
              title="공지사항을 불러오지 못했습니다."
              tone="error"
            />
          )}

          {!noticesQuery.isLoading && !noticesQuery.isError && noticePage?.items?.length === 0 && (
            <ContentState
              description="새로운 안내가 등록되면 이곳에 표시됩니다."
              title="현재 게시 중인 공지가 없습니다."
            />
          )}

          {!noticesQuery.isLoading && noticePage?.items?.length > 0 && (
            <>
              {keyword && <p className="public-notice-search__result" aria-live="polite"><strong>“{keyword}”</strong> 검색 결과입니다.</p>}
              <NoticeList notices={noticePage.items} />

              {noticePage.totalPages > 0 && (
                <ContentPagination
                  ariaLabel="공지사항 페이지 이동"
                  onChange={changePage}
                  page={page}
                  totalPages={noticePage.totalPages}
                />
              )}
            </>
          )}
        </div>
      </section>
    </ContentPageShell>
  );
};

export default NoticeListPage;
