// src/api/pointApi.js
// 포인트 API 모듈 (담당자6 BJN)
// - 백엔드 응답은 ApiResponse 래핑 구조: { timestamp, status, httpCode, message, data }
// - authApi.js 관례대로 res.data(=ApiResponse)까지 벗겨서 반환하고,
//   실데이터(data) 추출은 훅(usePoint.js)의 select에서 담당한다
import api from './axios';

/** 내 포인트 잔액 조회 — { available, hold, settleable, total, exchangeable } */
export const getPointBalance = () =>
  api.get('/point/balance').then(res => res.data);

/** 내 포인트 원장 목록 조회 (최신순 100건) */
export const getPointLedger = () =>
  api.get('/point/ledger').then(res => res.data);

/** 현재 충전 한도 조회 — data: { min, max }. 검증에 실제 쓰이는 서버 설정값이라 안내문이 스테일해질 수 없다 */
export const getChargeLimits = () =>
  api.get('/point/charge/limits').then(res => res.data);

/** 충전 주문 생성 — 결제위젯을 띄우기 전에 서버가 신뢰 기준 금액을 먼저 기록한다 (F-PAY-011)
 *  응답 data: { orderId, amount, orderName, clientKey(위젯 전용 gck) } — 이 값 그대로 토스 위젯 SDK를 호출한다 */
export const requestPointCharge = (amount) =>
  api.post('/point/charge/request', { amount }).then(res => res.data);

/** 결제 승인 확정 — 결제창 성공 리다이렉트 후 호출. 최종 지급 판단은 서버가 한다 */
export const confirmPointCharge = ({ orderId, paymentKey }) =>
  api.post('/point/charge/confirm', { orderId, paymentKey }).then(res => res.data);

/** 내 충전 주문 이력 조회 (실패·취소·대기 포함, 최신순 100건) */
export const getPointChargeOrders = () =>
  api.get('/point/charge/orders').then(res => res.data);

/** 환전 신청 (F-PAY-012) — 서버가 즉시 차감 + 등록 계좌 스냅샷 기록.
 *  계좌는 보내지 않는다 — 서버가 회원의 등록 계좌를 직접 읽는다 (계좌 조작 차단) */
export const requestPointExchange = (amount) =>
  api.post('/point/exchange', { amount }).then(res => res.data);

/** 정산가능→사용가능 전환 (F-PAY-010) — 진행 중 거래 문제가 있으면 서버가 409로 거절한다 */
export const convertPoint = (amount) =>
  api.post('/point/convert', { amount }).then(res => res.data);

/** 내 환전 신청 이력 조회 (신청·완료·반려, 최신순 100건) */
export const getPointExchangeOrders = () =>
  api.get('/point/exchange/orders').then(res => res.data);
