import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, MessageSquareText, Plus } from 'lucide-react';
import { getMyPageInquiryCreatePath } from '@/routes/myPageRoutes';
import Pagination from '@components/common/Pagination';
import { ActionButton, StatusBadge } from '@components/common/ui';
import MyPageListEmpty from '@components/mypage/MyPageListEmpty';
import MyPageListError from '@components/mypage/MyPageListError';
import MyPageListSectionLayout from '@components/mypage/MyPageListSectionLayout';
import MyPageListSkeleton from '@components/skeleton/MyPageListSkeleton';
import {
  useMyCustomerInquiries,
  useMyCustomerInquiry,
} from '@hooks/useCustomerInquiry';
import { useAuth } from '@hooks/useAuth';
import { formatDateTime } from '@utils/common';
import './MyInquiryListPage.css';

const PAGE_SIZE = 5;
const STATUS = {
  INQC0007: { label: '접수', tone: 'warning' },
  INQC0008: { label: '처리중', tone: 'info' },
  INQC0009: { label: '답변완료', tone: 'success' },
};
const STATUS_TABS = [
  { label: '전체', statusCode: '' },
  { label: '접수', statusCode: 'INQC0007' },
  { label: '처리중', statusCode: 'INQC0008' },
  { label: '답변완료', statusCode: 'INQC0009' },
];

const InquiryCard = ({ inquiry, isOpen, number, onToggle }) => {
  const detailQuery = useMyCustomerInquiry(inquiry.inquirySn, isOpen);
  const detail = detailQuery.data;
  const status = STATUS[inquiry.statusCode] ?? { label: inquiry.statusCode ?? '-', tone: 'neutral' };

  return (
    <article className={`my-inquiry-card${isOpen ? ' is-open' : ''}`}>
      <button aria-expanded={isOpen} className="my-inquiry-card__summary" onClick={onToggle} type="button">
        <span className="my-inquiry-card__number">{number}</span>
        <div className="my-inquiry-card__title">
          <span>{inquiry.inquiryTypeName || inquiry.inquiryTypeCode || '문의'}</span>
          <strong>{inquiry.title}</strong>
        </div>
        <time>{formatDateTime(inquiry.registeredAt)}</time>
        <StatusBadge className="my-inquiry-card__status" tone={status.tone} variant="soft">
          {status.label}
        </StatusBadge>
        <ChevronDown aria-hidden="true" className="my-inquiry-card__chevron" />
      </button>

      {isOpen && (
        <div className="my-inquiry-card__detail">
          {detailQuery.isLoading && <p className="my-inquiry-card__state">문의 내용을 불러오는 중입니다.</p>}
          {detailQuery.isError && (
            <MyPageListError message="문의 상세를 불러오지 못했습니다." onRetry={() => detailQuery.refetch()} />
          )}
          {detail && (
            <>
              <div className="my-inquiry-card__meta">
                <span>문의 번호 <strong>{detail.inquirySn}</strong></span>
                <span>접수일 {formatDateTime(detail.registeredAt)}</span>
              </div>
              <section>
                <h3>문의 내용</h3>
                <p>{detail.content}</p>
              </section>
              {detail.statusCode === 'INQC0009' && detail.answer && (
                <section className="my-inquiry-card__answer">
                  <h3><MessageSquareText aria-hidden="true" /> 관리자 답변</h3>
                  <p>{detail.answer}</p>
                  <time>{formatDateTime(detail.answeredAt)}</time>
                </section>
              )}
              {detail.statusCode !== 'INQC0009' && (
                <p className="my-inquiry-card__pending">
                  {detail.statusCode === 'INQC0008'
                    ? '담당 관리자가 문의를 확인하고 있습니다.'
                    : '문의가 접수되었습니다. 처리 시작 전입니다.'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
};

/** 담당자 7 · 관리자 대상 1:1 문의: 신고 내역과 분리된 본인 문의 목록·상태·답변 아코디언입니다. */
const MyInquiryListPage = ({ embedded = false }) => {
  const { isProvider } = useAuth();
  const inquiryCreatePath = getMyPageInquiryCreatePath(isProvider);
  const [searchParams, setSearchParams] = useSearchParams();
  // @ai_generated 문의 상태 탭은 공통코드 쿼리를 검증해 복원한다.
  const requestedStatus = searchParams.get('status') ?? '';
  const activeTab = Math.max(
    0,
    STATUS_TABS.findIndex(({ statusCode: tabStatus }) => tabStatus === requestedStatus),
  );
  const [page, setPage] = useState(1);
  const [openInquirySn, setOpenInquirySn] = useState(null);
  const statusCode = STATUS_TABS[activeTab].statusCode;

  const inquiriesQuery = useMyCustomerInquiries({ statusCode, page, size: PAGE_SIZE });
  const allCountQuery = useMyCustomerInquiries({ page: 1, size: 1 });
  const receivedCountQuery = useMyCustomerInquiries({ statusCode: 'INQC0007', page: 1, size: 1 });
  const processingCountQuery = useMyCustomerInquiries({ statusCode: 'INQC0008', page: 1, size: 1 });
  const answeredCountQuery = useMyCustomerInquiries({ statusCode: 'INQC0009', page: 1, size: 1 });

  const pageData = inquiriesQuery.data;
  const inquiries = pageData?.content ?? [];
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const counts = [
    allCountQuery.data?.totalCount,
    receivedCountQuery.data?.totalCount,
    processingCountQuery.data?.totalCount,
    answeredCountQuery.data?.totalCount,
  ];
  const countsLoading = [allCountQuery, receivedCountQuery, processingCountQuery, answeredCountQuery]
    .some((query) => query.isLoading);

  const changeTab = (nextTab) => {
    const nextStatus = STATUS_TABS[nextTab]?.statusCode ?? '';
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextStatus) nextSearchParams.set('status', nextStatus);
    else nextSearchParams.delete('status');
    setSearchParams(nextSearchParams, { replace: true });
    setPage(1);
    setOpenInquirySn(null);
  };

  return (
    <div className={embedded ? '' : 'mx-auto max-w-[1200px] px-4 py-10'}>
      <MyPageListSectionLayout
        activeFilter={activeTab}
        filterAriaLabel="1:1 문의 상태"
        filterItems={STATUS_TABS.map((tab, index) => ({
          value: index,
          label: tab.label,
          count: counts[index],
        }))}
        headerActions={(
          <ActionButton className="my-inquiry-create" size="sm" to={inquiryCreatePath}>
            <Plus aria-hidden="true" /> 문의하기
          </ActionButton>
        )}
        isLoading={inquiriesQuery.isLoading || countsLoading}
        onFilterChange={changeTab}
        summaryItems={[
          { label: '접수', value: receivedCountQuery.data?.totalCount ?? 0 },
          { label: '처리중', value: processingCountQuery.data?.totalCount ?? 0 },
          { label: '답변완료', value: answeredCountQuery.data?.totalCount ?? 0 },
        ]}
        title="1:1 문의"
      />

      {inquiriesQuery.isLoading ? (
        <MyPageListSkeleton count={PAGE_SIZE} />
      ) : inquiriesQuery.isError ? (
        <MyPageListError message="문의 목록을 불러오지 못했습니다." onRetry={() => inquiriesQuery.refetch()} />
      ) : inquiries.length === 0 ? (
        <MyPageListEmpty
          action={<ActionButton tone="outline" to={inquiryCreatePath}>문의 작성</ActionButton>}
          message="조건에 맞는 문의가 없습니다."
        />
      ) : (
        <div className="my-inquiry-list">
          {inquiries.map((inquiry, index) => (
            <InquiryCard
              inquiry={inquiry}
              isOpen={openInquirySn === inquiry.inquirySn}
              key={inquiry.inquirySn}
              number={totalCount - (page - 1) * PAGE_SIZE - index}
              onToggle={() => setOpenInquirySn((current) => (
                current === inquiry.inquirySn ? null : inquiry.inquirySn
              ))}
            />
          ))}
        </div>
      )}

      {!inquiriesQuery.isLoading && (
        <Pagination
          ariaLabel="1:1 문의 목록 페이지 이동"
          disabled={inquiriesQuery.isFetching}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            setOpenInquirySn(null);
          }}
          page={page}
          showSinglePage
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default MyInquiryListPage;
