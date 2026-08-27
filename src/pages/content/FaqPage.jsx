import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown } from 'lucide-react';
import {
  ContentPageShell,
  ContentPagination,
  ContentState,
} from '@components/content/ContentUi';
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import { usePublicNoticeDetail, usePublicNoticeList } from '@hooks/usePublicNotices';
import './noticePage.css';

const FAQ_TYPE_CODE = 'NTCC0008';
const PAGE_SIZE = 10;

const FaqListSkeleton = () => (
  <section className="faq-list faq-list--skeleton" aria-label="FAQ를 불러오는 중">
    {Array.from({ length: 5 }).map((_, index) => (
      <div className="faq-item faq-item--skeleton" key={index}>
        <Skeleton borderRadius={10} height={34} width={34} />
        <Skeleton height={18} width={`${72 - index * 7}%`} />
        <Skeleton circle height={20} width={20} />
      </div>
    ))}
  </section>
);

/** 담당자 7 | F-COM-013 확장: 질문을 열 때만 기존 공지 상세 API로 답변 본문을 읽는다. */
const FaqItem = ({ faq }) => {
  const [isOpen, setIsOpen] = useState(false);
  const detailQuery = usePublicNoticeDetail(isOpen ? faq.id : null);
  const answer = detailQuery.data?.content ?? faq.summary;

  return (
    <details className="faq-item" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span aria-hidden="true">Q</span>
        <strong>{faq.title}</strong>
        <ChevronDown aria-hidden="true" className="faq-item__chevron" />
      </summary>
      <div className="faq-item__answer">
        <span aria-hidden="true">A</span>
        {answer && <p>{answer}</p>}
        {!answer && detailQuery.isLoading && <p>답변을 불러오는 중입니다.</p>}
        {!answer && detailQuery.isError && (
          <p>답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        )}
      </div>
    </details>
  );
};

/** 담당자 7 | F-COM-013 확장: NOTICE의 FAQ 유형만 질문·답변 형태로 공개한다. */
const FaqPage = () => {
  const [page, setPage] = useState(1);
  const faqQuery = usePublicNoticeList({
    typeCode: FAQ_TYPE_CODE,
    keyword: '',
    page,
    size: PAGE_SIZE,
  });
  const faqPage = faqQuery.data;

  return (
    <ContentPageShell className="public-faq-page">
      <Helmet><title>에누리컷</title></Helmet>
      <header className="customer-support-page-header customer-support-page-header--plain">
        <h1>자주 묻는 질문</h1>
      </header>

      <section className="public-faq-board" aria-label="자주 묻는 질문">
        {faqQuery.isLoading && <FaqListSkeleton />}

        {faqQuery.isError && (
          <ContentState
            actionLabel="다시 불러오기"
            description="잠시 후 다시 시도해 주세요."
            onAction={() => faqQuery.refetch()}
            title="FAQ를 불러오지 못했습니다."
            tone="error"
          />
        )}

        {!faqQuery.isLoading && !faqQuery.isError && faqPage?.items?.length === 0 && (
          <ContentState
            description="관리자가 FAQ를 등록하면 이곳에서 확인할 수 있습니다."
            title="현재 게시 중인 FAQ가 없습니다."
          />
        )}

        {faqPage?.items?.length > 0 && (
          <div className="faq-list" aria-label="자주 묻는 질문 목록">
            {faqPage.items.map((faq) => (
              <FaqItem faq={faq} key={faq.id} />
            ))}
          </div>
        )}

        {faqPage?.totalPages > 0 && (
          <ContentPagination
            ariaLabel="FAQ 페이지 이동"
            onChange={setPage}
            page={page}
            totalPages={faqPage.totalPages}
          />
        )}
      </section>
    </ContentPageShell>
  );
};

export default FaqPage;
