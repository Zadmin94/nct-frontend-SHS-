/**
 * 담당자 7 · F-SVC-001~010
 * 브라우저용 서비스 요청·견적 경로를 계층형 URL로 중앙 관리합니다.
 * 백엔드 API 경로(`/api/service-requests`)와는 별도 계약입니다.
 */
export const SERVICE_REQUESTS_PATH = '/services/requests';
export const SERVICE_REQUEST_CREATE_PATH = `${SERVICE_REQUESTS_PATH}/new`;
export const SERVICE_REQUEST_DETAIL_ROUTE = `${SERVICE_REQUESTS_PATH}/:svcReqSn`;

export const getServiceRequestDetailPath = (svcReqSn) =>
  `${SERVICE_REQUESTS_PATH}/${svcReqSn}`;

export const getServiceRequestQuoteCreatePath = (svcReqSn) =>
  `${getServiceRequestDetailPath(svcReqSn)}/quotes/new`;

export const getServiceRequestQuoteDetailPath = (svcReqSn, quoteId) =>
  `${getServiceRequestDetailPath(svcReqSn)}/quotes/${quoteId}`;

export const getServiceRequestQuoteEditPath = (svcReqSn, quoteId) =>
  `${getServiceRequestQuoteDetailPath(svcReqSn, quoteId)}/edit`;
