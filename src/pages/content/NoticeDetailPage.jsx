import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import {
  ContentPageShell,
  ContentState,
  NoticeDetail,
} from '@components/content/ContentUi';
import { usePublicNoticeDetail } from '@hooks/usePublicNotices';
import './noticePage.css';

const NoticeDetailSkeleton = () => (
  <article className="content-page notice-detail public-notice-detail-skeleton" aria-label="공지사항 상세를 불러오는 중">
    <div className="public-notice-detail-skeleton__back" />
    <header className="public-notice-detail-skeleton__header">
      <span />
      <strong />
      <div>
        <span />
      </div>
    </header>
    <div className="public-notice-detail-skeleton__content">
      <span />
      <span />
      <span />
      <span />
    </div>
  </article>
);

/** F-COM-013: 공개 공지 한 건을 안전한 일반 텍스트로 표시합니다. */
const NoticeDetailPage = () => {
  const { noticeId: noticeIdParam } = useParams();
  const noticeId = Number(noticeIdParam);
  const isValidNoticeId = Number.isSafeInteger(noticeId) && noticeId > 0;
  const noticeQuery = usePublicNoticeDetail(noticeId);

  if (!isValidNoticeId) {
    return (
      <ContentPageShell>
        <Helmet><title>잘못된 공지 주소 | 에누리컷</title></Helmet>
        <ContentState
          backLabel="공지 목록으로 돌아가기"
          backTo="/customersupport/notice"
          title="잘못된 공지 주소입니다."
          tone="error"
        />
      </ContentPageShell>
    );
  }

  if (noticeQuery.isLoading) return <NoticeDetailSkeleton />;

  if (noticeQuery.isError) {
    const isNotFound = noticeQuery.error?.response?.status === 404;
    return (
      <ContentPageShell>
        <Helmet><title>공지사항 조회 오류 | 에누리컷</title></Helmet>
        <ContentState
          actionLabel={isNotFound ? undefined : '다시 불러오기'}
          backLabel="공지 목록으로 돌아가기"
          backTo="/customersupport/notice"
          description={isNotFound
            ? '게시 기간이 끝났거나 숨김 처리된 공지일 수 있습니다.'
            : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'}
          onAction={isNotFound ? undefined : () => noticeQuery.refetch()}
          title={isNotFound ? '공지를 찾을 수 없습니다.' : '공지를 불러오지 못했습니다.'}
          tone="error"
        />
      </ContentPageShell>
    );
  }

  const notice = noticeQuery.data;
  return (
    <>
      <Helmet><title>{notice.title} | 에누리컷</title></Helmet>
      <NoticeDetail notice={notice} />
    </>
  );
};

export default NoticeDetailPage;
