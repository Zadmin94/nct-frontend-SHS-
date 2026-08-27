// src/hooks/usePoint.js
// 포인트 조회 훅 (TanStack Query — 프로젝트 첫 사용례)
// - queryKey로 캐시가 관리되고, 전역 기본값(staleTime 5분)이 적용된다
// - select로 ApiResponse 껍질({status, data, ...})에서 실데이터만 꺼내
//   컴포넌트는 백엔드 래핑 구조를 몰라도 되게 한다
import { useQuery } from '@tanstack/react-query';

import { getPointBalance, getPointLedger, getPointChargeOrders, getPointExchangeOrders } from '../api/pointApi';

/** 내 포인트 잔액 — data: { available, hold, settleable, total, exchangeable }
 *  options로 useQuery 옵션을 덧붙일 수 있다 — 헤더처럼 비로그인 화면에서도 렌더링되는 곳은
 *  { enabled: 로그인여부 }를 넘겨 401 요청 자체를 막는다 */
export function usePointBalance(options = {}) {
  return useQuery({
    queryKey: ['point', 'balance'],
    queryFn: getPointBalance,
    select: (res) => res.data,
    ...options,
  });
}

/** 내 포인트 원장 목록 — data: [{ id, date, type, category, amount, balanceAfter, ref, reason, ... }] */
export function usePointLedger() {
  return useQuery({
    queryKey: ['point', 'ledger'],
    queryFn: getPointLedger,
    select: (res) => res.data,
  });
}

/** 내 충전 주문 이력 — data: [{ id, date, orderNo, amount, status, statusCd, failReason, payMethod }]
 *  원장과 달리 실패·취소·대기 시도까지 포함한다 (가이드라인 §9: 실패 이벤트도 기록·표시) */
export function usePointChargeOrders() {
  return useQuery({
    queryKey: ['point', 'chargeOrders'],
    queryFn: getPointChargeOrders,
    select: (res) => res.data,
  });
}

/** 내 환전 신청 이력 (F-PAY-012) — data: [{ id, date, amount, status, statusCd, bankName, accountNo, rejectReason, processedDate }] */
export function usePointExchangeOrders() {
  return useQuery({
    queryKey: ['point', 'exchangeOrders'],
    queryFn: getPointExchangeOrders,
    select: (res) => res.data,
  });
}
