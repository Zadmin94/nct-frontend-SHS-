// src/pages/user/point/components/PointChargeWidgetModal.jsx
// Claude Code 작성 (BJN, 2026-07-16)
// 포인트 충전 - 결제위젯(widgets()) 방식 모달 (F-PAY-011)
// 충전 방식은 결제위젯 단일 (사용자 결정, 2026-07-16 — 결제창 방식 제거)
// 금액 선택 후 "다음"을 누르면 토스 결제수단 위젯이 모달 안에 그대로 렌더링된다
// 주의: 결제위젯 전용 클라이언트 키(test_gck_...)가 필요하다 — 결제창용 키(test_ck_...)로는 동작하지 않음
import { useEffect, useRef, useState } from 'react';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { ActionButton } from '@components/common/ui';

import { requestPointCharge, getChargeLimits } from '../../../../api/pointApi';
import { CHARGE_QUICK_EXTRA, QUICK_AMOUNTS } from './quickAmounts';

// infoRow: 모달 상단에 보여줄 현재 잔액 안내 { label, value } — PointAmountModal과 같은 방식.
// 잔액 조회는 호출하는 쪽(헤더·지갑 페이지)이 이미 하고 있어서 여기서 다시 조회하지 않고 받아서 표시만 한다
const PointChargeWidgetModal = ({ infoRow, onClose }) => {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('amount'); // 'amount' | 'widget'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 충전 한도 안내 — 검증에 실제 쓰이는 서버 설정값을 받아 표시 (하드코딩 안내문은 관리자가
  // 한도를 바꾸면 거짓말이 되므로 제거, 2026-07-20). 도착 전에는 안내문을 비워둔다
  const [limits, setLimits] = useState(null); // null | { min, max }

  useEffect(() => {
    getChargeLimits()
      .then((res) => setLimits(res.data))
      .catch(() => setLimits(null)); // 조회 실패 시 안내문 생략 — 검증은 어차피 서버가 한다
  }, []);

  const orderRef = useRef(null); // { orderId, amount, orderName, clientKey }
  const widgetsRef = useRef(null);
  // 화면 표시 전용 주문 금액 — ref는 렌더링 중에 읽으면 안 된다는 React 19 규칙
  // (react-hooks/refs, 2026-07-17 수정) 때문에 표시용 값만 상태로 따로 둔다
  const [orderAmount, setOrderAmount] = useState(null);

  // 모달이 떠 있는 동안 뒤 페이지 스크롤을 잠근다 — 위젯 목록이 길어져도
  // 휠/드래그가 배경으로 새지 않고 모달 안쪽(overflow-y-auto)에서만 스크롤되게
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // ESC로도 닫히게 — 토스 위젯이 세션 만료 등으로 자체 오류 화면을 fixed 오버레이로 덮어씌우면
  // (실사용 중 발견, 2026-07-29) 우리 쪽 닫기 버튼·바깥 클릭이 그 오버레이에 가려 안 먹힐 수 있다.
  // 위젯 내부 iframe에 포커스가 가 있으면 이마저도 안 먹을 수 있어, 아래 fixed 닫기 버튼과
  // 함께 이중 탈출구로 둔다.
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // step이 'widget'으로 바뀌어 DOM에 #toss-payment-methods/#toss-agreement가 실제로
  // 커밋된 뒤에만 렌더링을 호출한다 — setStep 직후 곧바로 호출하면 아직 없는 요소를
  // 찾다 실패한다 (React 상태 갱신은 비동기이므로 커밋 시점이 다르다)
  useEffect(() => {
    if (step !== 'widget' || !widgetsRef.current) return;
    const widgets = widgetsRef.current;
    setLoading(true);
    widgets.setAmount({ currency: 'KRW', value: orderRef.current.amount })
      .then(() => Promise.all([
        widgets.renderPaymentMethods({ selector: '#toss-payment-methods', variantKey: 'DEFAULT' }),
        widgets.renderAgreement({ selector: '#toss-agreement', variantKey: 'AGREEMENT' }),
      ]))
      .catch((err) => {
        setError(err?.message ?? '결제수단 렌더링에 실패했습니다.');
        setStep('amount');
      })
      .finally(() => setLoading(false));
  }, [step]);

  const proceedToWidget = async (chosenAmount) => {
    const amt = Number(chosenAmount);
    if (!Number.isInteger(amt) || amt <= 0) {
      setError('충전 금액은 1P 이상의 정수만 가능합니다.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // 서버가 먼저 신뢰 기준 금액을 기록하고 위젯용(gck) 클라이언트 키를 내려준다 (QSC-PG-01)
      const res = await requestPointCharge(amt);
      orderRef.current = res.data;
      setOrderAmount(res.data.amount); // 위젯 화면의 "N P 충전" 표시용

      const tossPayments = await loadTossPayments(res.data.clientKey);
      widgetsRef.current = tossPayments.widgets({ customerKey: ANONYMOUS });

      setStep('widget'); // 커밋 후 위 useEffect가 실제 렌더링을 이어받는다
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? '결제 준비 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!widgetsRef.current || !orderRef.current) return;
    setLoading(true);
    try {
      // 결제 완료 후 복귀는 항상 계층 경로의 포인트지갑(/user/mypage/wallet)으로 고정돼 있어서,
      // 쇼핑 중이던 페이지로 돌아갈 수 있도록 지금 위치를 기억해 둔다 — 승인 처리가 끝난 뒤
      // PointWalletPage가 이 값을 읽어 돌려보낸다. 전체 리다이렉트를 거치므로 컴포넌트 상태로는
      // 못 들고 가고 sessionStorage에 남겨야 한다.
      sessionStorage.setItem('pointChargeReturnTo', window.location.pathname + window.location.search);

      await widgetsRef.current.requestPayment({
        orderId: orderRef.current.orderId,
        orderName: orderRef.current.orderName,
        successUrl: `${window.location.origin}/user/mypage/wallet?charge=success`,
        failUrl: `${window.location.origin}/user/mypage/wallet?charge=fail`,
      });
      // 성공 시 리다이렉트되므로 이 아래로는 정상 흐름에서 내려오지 않는다
    } catch (err) {
      if (err?.code !== 'USER_CANCEL') {
        setError(err?.message ?? '결제 요청에 실패했습니다.');
      }
      setLoading(false);
    }
  };

  return (
    <>
      {/* 토스 위젯이 세션 만료 등으로 자체 오류 화면을 fixed 오버레이로 덮어씌우는 경우에도
          항상 뚫고 나올 수 있는 탈출구 — 모달 카드 바깥의 별도 요소라 안쪽에 뭐가 그려지든
          영향받지 않고, z-index를 최댓값 근처로 둬서 웬만한 오버레이보다 위에 남는다
          (실사용 중 발견, 2026-07-29). */}
      <button
        type="button"
        aria-label="충전 취소"
        className="fixed top-4 right-4 z-[2147483647] flex size-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:bg-gray-100 hover:text-gray-700 transition-colors text-xl"
        onClick={onClose}
      >
        ×
      </button>
      {/* 결제 주문이 이미 생성된 상태일 수 있어 바깥 클릭으로 실수로 닫히지 않게 한다 —
          닫기는 명시적 버튼(우상단 X, 상단 "닫기", ESC)으로만 가능 */}
      <div className="user-modal-overlay flex items-center justify-center bg-black/40 p-6">
        <div
          className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto overscroll-contain bg-white rounded-2xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]"
          aria-labelledby="point-charge-modal-title"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 m-0" id="point-charge-modal-title">포인트 충전</h3>
            <ActionButton
              onClick={onClose}
              size="sm"
              tone="neutral"
            >
              닫기
            </ActionButton>
          </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {/* 현재 잔액 안내 — 환전 모달(PointAmountModal)의 infoRow와 같은 마크업으로 통일 */}
        {infoRow && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 text-sm">{infoRow.label}</span>
            <strong className="text-indigo-700 text-lg">{infoRow.value}</strong>
          </div>
        )}

        {step === 'amount' && (
          <>
            <div className="flex gap-2 mb-4">
              {/* 충전은 공용 4개 금액에 큰 금액(CHARGE_QUICK_EXTRA) 하나를 더 보여준다 — 마크업이 같아 하나의 map으로 렌더 */}
              {[...QUICK_AMOUNTS, CHARGE_QUICK_EXTRA].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  className="flex-1 whitespace-nowrap border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  onClick={() => setAmount((prev) => String((Number(prev) || 0) + quick))}
                >
                  {quick.toLocaleString()}
                </button>
              ))}
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none mb-1"
              placeholder="충전할 포인트 입력"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {/* 서버가 검증에 실제로 쓰는 한도(SYSTEM_SETTING)를 그대로 안내 — 조회 전/실패 시엔 생략 */}
            {limits ? (
              <p className="text-xs text-gray-400 mb-4">
                {limits.min.toLocaleString()}P ~ {limits.max.toLocaleString()}P 사이로 입력해 주세요.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mb-4">&nbsp;</p>
            )}
            <div className="flex justify-end">
              <ActionButton
                disabled={loading}
                onClick={() => proceedToWidget(amount)}
              >
                {loading ? '결제수단 준비 중...' : '다음'}
              </ActionButton>
            </div>
          </>
        )}

        {step === 'widget' && (
          <>
            <p className="text-sm text-gray-500 mb-3">
              {orderAmount?.toLocaleString()}P 충전 · 결제수단을 선택해 주세요
            </p>
            <div id="toss-payment-methods" className="mb-3" />
            <div id="toss-agreement" className="mb-4" />
            <div className="flex justify-end">
              <ActionButton
                disabled={loading}
                onClick={submitPayment}
              >
                {loading ? '처리 중...' : '결제하기'}
              </ActionButton>
            </div>
          </>
        )}
      </div>
      </div>
    </>
  );
};

export default PointChargeWidgetModal;
