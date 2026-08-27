import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useBodyScrollLock from '@hooks/useBodyScrollLock';
import { AuctionDetailPageContent } from '@pages/auction/AuctionDetailPage';

/** 담당자 7 · 관리자 호출에서는 원본 경매를 읽기 전용으로 재사용합니다. */
export default function AuctionOriginalModal({ auctionId, open, onClose, readOnly = false }) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || !auctionId) return null;

  return createPortal(
    <div
      aria-labelledby="auction-original-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-[700] flex items-center justify-center bg-black/45 p-4 max-sm:p-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="flex h-[92dvh] w-full max-w-[1500px] flex-col overflow-hidden rounded-xl bg-white shadow-[0_22px_70px_rgba(0,0,0,0.28)] max-sm:h-[100dvh] max-sm:rounded-none">
        <header className="flex shrink-0 items-center justify-between border-b border-[#e7eaf0] px-5 py-3">
          <h2 className="m-0 text-body-lg font-extrabold text-[#202635]" id="auction-original-modal-title">
            원본 경매
          </h2>
          <button
            aria-label="원본 경매 닫기"
            className="grid size-10 place-items-center rounded-full border-0 bg-transparent text-[#626b7a] transition-colors hover:bg-[#f1f4f8] hover:text-[#202635]"
            onClick={onClose}
            title="닫기"
            type="button"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f7f8fa]">
          <AuctionDetailPageContent auctionId={auctionId} embedded readOnly={readOnly} />
        </div>
      </section>
    </div>,
    document.body,
  );
}
