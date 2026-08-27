// src/pages/user/point/components/PointHistoryDetailModal.jsx
// Claude Code 작성 (BJN, 2026-07-29)
import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * 포인트지갑 요약 카드의 "+" 버튼으로 여는 전체 내역 모달 — 포인트/충전/환전 내역 공용 셸.
 * 내용(children)이 이미 자기 제목을 가진 PointTable이라 모달 자체엔 별도 헤더를 안 두고
 * 닫기 수단(바깥 클릭·X 버튼·ESC)만 제공한다 (PointChargeWidgetModal의 탈출구 패턴과 동일).
 */
const PointHistoryDetailModal = ({ title, onClose, children }) => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="user-modal-overlay flex items-center justify-center bg-black/40 p-6"
    >
      <div
        className="w-full max-w-[1200px] max-h-[85vh] flex flex-col overflow-hidden bg-white rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.25)]"
        aria-label={title}
        aria-modal="true"
        role="dialog"
      >
        <header className="flex shrink-0 items-center justify-between bg-[#0064ff] px-6 py-4">
          <h2 className="m-0 text-[20px] font-bold text-white">{title}</h2>
          <button
            type="button"
            aria-label="닫기"
            className="inline-flex size-8 items-center justify-center rounded text-white hover:bg-white/15"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PointHistoryDetailModal;
