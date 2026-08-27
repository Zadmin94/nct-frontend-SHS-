// src/pages/user/point/components/PointAmountModal.jsx
import { useEffect, useState } from 'react';
import { ActionButton } from '@components/common/ui';

import { QUICK_AMOUNTS } from './quickAmounts';

/**
 * 포인트 금액 입력 공용 모달 — 환전 신청(지갑·헤더)과 전환(F-PAY-010)에서 사용
 * (충전은 결제위젯 모달 PointChargeWidgetModal로 단일화 — 사용자 결정, 2026-07-16)
 * - 환전: 방식 확정(D-026, 2026-07-17)으로 실연동 — onSubmit이 실제 신청 API를 호출한다
 */
const PointAmountModal = ({ title, submitLabel, infoRow, maxAmount, onSubmit, onClose }) => {
  const [amount, setAmount] = useState('');

  // 모달이 떠 있는 동안 뒤 페이지 스크롤을 잠근다 (위젯 모달과 동일한 처리)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  return (
    <div
      className="user-modal-overlay flex items-center justify-center bg-black/40 p-6"
    >
      <div
        className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto overscroll-contain bg-white rounded-2xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]"
        aria-labelledby="point-amount-modal-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 m-0" id="point-amount-modal-title">{title}</h3>
          <ActionButton
            onClick={onClose}
            size="sm"
            tone="neutral"
          >
            닫기
          </ActionButton>
        </div>

        {infoRow && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 text-sm">{infoRow.label}</span>
            <strong className="text-indigo-700 text-lg">{infoRow.value}</strong>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {QUICK_AMOUNTS.map((quick) => (
            <button
              key={quick}
              type="button"
              className="flex-1 whitespace-nowrap border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => setAmount((prev) => String((Number(prev) || 0) + quick))}
            >
              {quick.toLocaleString()}
            </button>
          ))}
          {maxAmount != null && (
            <button
              type="button"
              className="flex-1 whitespace-nowrap border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => setAmount(String(maxAmount))}
            >
              전체
            </button>
          )}
          <button
            type="button"
            className="flex-1 whitespace-nowrap border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => setAmount('')}
          >
            초기화
          </button>
        </div>

        <input
          type="number"
          min="0"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder={`${submitLabel}할 포인트 입력`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="flex justify-end mt-4">
          <ActionButton
            onClick={() => onSubmit(Number(amount))}
          >
            {submitLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default PointAmountModal;
