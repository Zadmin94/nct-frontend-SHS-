import { X } from 'lucide-react';
import { formatPoint } from '@utils/common';
import { ActionButton } from '@components/common/ui';

const AuctionBuyNowModal = ({
  isOpen,
  auction,
  selectedTradeName,
  isPending,
  isBuyNowAvailable,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="user-modal-overlay flex items-center justify-center bg-[#1d1d1f]/55 p-7"
      id="buyNowModal"
    >
      <div
        className="max-h-[calc(100vh_-_72px)] w-full max-w-[620px] overflow-auto rounded-lg bg-white shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyNowModalTitle"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#e8e8e8] px-6 pt-[22px] pb-4">
          <h2 className="m-0 text-h2 font-bold" id="buyNowModalTitle">즉시구매 확인</h2>
          <button
            className="inline-flex size-[38px] cursor-pointer items-center justify-center rounded-full border border-[#dadada] bg-white text-[#1d1d1f]"
            type="button"
            aria-label="즉시구매 확인 닫기"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-4 px-6 pt-[22px] pb-6 text-[#666]">
          <p className="m-0">선택한 조건으로 즉시구매를 진행하시겠습니까?</p>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            <li className="grid grid-cols-[112px_1fr] gap-3 border-b border-[#e8e8e8] py-2.5 max-sm:grid-cols-[96px_1fr]">
              <strong className="text-[#1d1d1f]">상품명</strong><span>{auction.title}</span>
            </li>
            <li className="grid grid-cols-[112px_1fr] gap-3 border-b border-[#e8e8e8] py-2.5 max-sm:grid-cols-[96px_1fr]">
              <strong className="text-[#1d1d1f]">즉시구매가</strong><span>{formatPoint(auction.instantBuyPrice)}</span>
            </li>
            <li className="grid grid-cols-[112px_1fr] gap-3 border-b border-[#e8e8e8] py-2.5 max-sm:grid-cols-[96px_1fr]">
              <strong className="text-[#1d1d1f]">거래 방식</strong><span>{selectedTradeName}</span>
            </li>
          </ul>
          <div className="grid grid-cols-2 gap-1.5">
            <ActionButton
              onClick={onClose}
              size="lg"
              tone="outline"
            >
              취소
            </ActionButton>
            <ActionButton
              id="buyNowConfirmBtn"
              disabled={!isBuyNowAvailable || isPending}
              loading={isPending}
              onClick={onConfirm}
              size="lg"
            >
              {!isBuyNowAvailable ? '구매 불가' : (isPending ? '처리 중' : '확정')}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionBuyNowModal;
