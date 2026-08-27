/** 담당자 7 · F-COM-015/018: 신규 고객 신고에 허용하는 세부 사유 코드입니다. */
export const CUSTOMER_REPORT_TYPE_CODES = Object.freeze([
  'ABRC0001',
  'ABRC0002',
  'ABRC0003',
  'ABRC0004',
  'ABRC0005',
  'ABRC0006',
  'ABRC0007',
]);

export const TRADE_REPORT_TYPE_CODES = Object.freeze([
  'ABRC0008',
  'ABRC0009',
  'ABRC0010',
  'ABRC0011',
]);

const CUSTOMER_REPORT_TYPE_CODE_SET = new Set(CUSTOMER_REPORT_TYPE_CODES);
const TRADE_REPORT_TYPE_CODE_SET = new Set(TRADE_REPORT_TYPE_CODES);

export const isCustomerReportTypeCode = (code) => (
  CUSTOMER_REPORT_TYPE_CODE_SET.has(String(code ?? '').trim().toUpperCase())
);

export const isTradeReportTypeCode = (code) => (
  TRADE_REPORT_TYPE_CODE_SET.has(String(code ?? '').trim().toUpperCase())
);

// 공통코드명이 응답에 없을 때 사용하는 표시명입니다.
export const REPORT_TYPE_FALLBACK_NAMES = Object.freeze({
  ABRC0001: '허위 정보·사기 의심',
  ABRC0002: '외부 연락·결제 유도',
  ABRC0003: '욕설·비방·괴롭힘',
  ABRC0004: '금지 품목·불법 거래',
  ABRC0005: '개인정보 노출·침해',
  ABRC0006: '스팸·광고·도배',
  ABRC0007: '기타',
  ABRC0008: '거래 미이행·연락두절',
  ABRC0009: '배송·파손·오배송',
  ABRC0010: '서비스 품질·일정',
  ABRC0011: '환불·보관금·정산',
});
