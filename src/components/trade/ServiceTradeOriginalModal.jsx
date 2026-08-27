import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { FileText, Image as ImageIcon, X } from 'lucide-react';
import { getMyQuote } from '@api/quoteApi';
import { getServiceRequest } from '@api/serviceRequestApi';
import { toImageUrl } from '@api/fileApi';
import { CategoryTag, DomainStatus } from '@components/common/ui';
import useBodyScrollLock from '@hooks/useBodyScrollLock';

const unwrapData = (response) => response?.data ?? response;
const formatPoint = (amount) => (Number.isFinite(Number(amount)) ? `${Number(amount).toLocaleString('ko-KR')}P` : '-');

function SourceModalFrame({ children, onClose, title, subtitle }) {
  useBodyScrollLock(true);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      aria-labelledby="service-trade-original-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-[700] flex items-center justify-center bg-black/45 p-4 max-sm:p-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="flex h-[86dvh] w-full max-w-[1000px] flex-col overflow-hidden rounded-xl bg-white shadow-[0_22px_70px_rgba(0,0,0,0.28)] max-sm:h-[100dvh] max-sm:rounded-none">
        <header className="flex shrink-0 items-center justify-between border-b border-[#e7eaf0] px-6 py-4">
          <div>
            <h2 className="m-0 text-body-lg font-extrabold text-[#202635]" id="service-trade-original-modal-title">{title}</h2>
            <p className="m-0 mt-1 text-sm text-[#667085]">{subtitle}</p>
          </div>
          <button aria-label={`${title} 닫기`} className="grid size-10 place-items-center rounded-full border-0 bg-transparent text-[#626b7a] transition-colors hover:bg-[#f1f4f8] hover:text-[#202635]" onClick={onClose} type="button">
            <X aria-hidden="true" size={22} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f7f8fa] p-6 max-sm:p-4">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

function RequestSourceContent({ serviceRequestId }) {
  const query = useQuery({
    queryKey: ['service-request', 'original', serviceRequestId],
    queryFn: () => getServiceRequest(serviceRequestId),
    enabled: Boolean(serviceRequestId),
    select: unwrapData,
  });
  const request = query.data;

  if (query.isLoading) return <p className="text-center text-[#667085]">원본 요청서를 불러오는 중입니다.</p>;
  if (query.isError || !request) return <p className="text-center text-[#b42318]">원본 요청서를 불러오지 못했습니다.</p>;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e2e6ee] bg-white shadow-sm">
      <header className="border-b border-[#edf0f4] p-6">
        <CategoryTag tone="warning" variant="soft">{request.catNm || '서비스 요청'}</CategoryTag>
        <h3 className="mt-4 text-2xl font-extrabold text-[#202635]">{request.svcReqTtl}</h3>
        <p className="mt-2 text-lg font-bold text-primary">예산 {formatPoint(request.svcReqBdgtAmt)}</p>
      </header>
      <section className="p-6">
        <h4 className="flex items-center gap-2 text-lg font-extrabold text-[#202635]"><FileText size={19} /> 요청 항목</h4>
        {request.items?.length ? (
          <dl className="mt-4 overflow-hidden rounded-xl border border-[#dce2ed]">
            {request.items.map((item, index) => {
              const [label, ...values] = item.split(': ');
              return <div className="grid grid-cols-[minmax(130px,30%)_1fr] border-b border-[#e8edf4] last:border-b-0" key={`${item}-${index}`}><dt className="bg-[#eef2fb] px-4 py-3 font-bold text-[#5d6471]">{label}</dt><dd className="px-4 py-3 whitespace-pre-line text-[#202635]">{values.join(': ') || label}</dd></div>;
            })}
          </dl>
        ) : <p className="mt-3 text-[#667085]">등록된 요청 항목이 없습니다.</p>}
      </section>
      <section className="border-t border-[#edf0f4] p-6">
        <h4 className="flex items-center gap-2 text-lg font-extrabold text-[#202635]"><ImageIcon size={19} /> 첨부사진</h4>
        {request.imageList?.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{request.imageList.map((image) => <img alt="요청 첨부" className="aspect-square w-full rounded-lg border border-[#e2e6ee] object-cover" key={image.flSn} src={toImageUrl(image.url)} />)}</div> : <p className="mt-3 text-[#667085]">등록된 사진이 없습니다.</p>}
      </section>
    </article>
  );
}

function QuoteSourceContent({ quoteId }) {
  const query = useQuery({
    queryKey: ['quote', 'original', quoteId],
    queryFn: () => getMyQuote(quoteId),
    enabled: Boolean(quoteId),
    select: unwrapData,
  });
  const quote = query.data;

  if (query.isLoading) return <p className="text-center text-[#667085]">내 견적을 불러오는 중입니다.</p>;
  if (query.isError || !quote) return <p className="text-center text-[#b42318]">내 견적을 불러오지 못했습니다.</p>;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e2e6ee] bg-white shadow-sm">
      <header className="border-b border-[#edf0f4] p-6">
        <DomainStatus tone="success" variant="soft">선택된 견적</DomainStatus>
        <h3 className="mt-4 text-2xl font-extrabold text-[#202635]">{quote.svcReqTitle || '서비스 견적'}</h3>
        <p className="mt-2 text-lg font-bold text-primary">견적 금액 {formatPoint(quote.amount)}</p>
      </header>
      <section className="p-6">
        <h4 className="text-lg font-extrabold text-[#202635]">내가 작성한 견적 내용</h4>
        <p className="mt-4 whitespace-pre-line rounded-xl border border-[#dce2ed] bg-[#fafbfd] p-5 leading-7 text-[#202635]">{quote.content || '등록된 견적 내용이 없습니다.'}</p>
      </section>
      {quote.attachments?.length > 0 && <section className="border-t border-[#edf0f4] p-6"><h4 className="flex items-center gap-2 text-lg font-extrabold text-[#202635]"><ImageIcon size={19} /> 견적 첨부파일</h4><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{quote.attachments.map((attachment) => <img alt="견적 첨부" className="aspect-square w-full rounded-lg border border-[#e2e6ee] object-cover" key={attachment.flSn} src={toImageUrl(attachment.url)} />)}</div></section>}
    </article>
  );
}

export default function ServiceTradeOriginalModal({ open, onClose, viewerRole, serviceRequestId, selectedQuoteId }) {
  if (!open) return null;
  const isProvider = viewerRole === 'PROVIDER';

  return <SourceModalFrame onClose={onClose} subtitle={isProvider ? '거래로 선택된 내가 제출한 견적입니다.' : '거래의 기준이 된 의뢰 요청서입니다.'} title={isProvider ? '내 견적' : '원본 요청'}>{isProvider ? <QuoteSourceContent quoteId={selectedQuoteId} /> : <RequestSourceContent serviceRequestId={serviceRequestId} />}</SourceModalFrame>;
}
