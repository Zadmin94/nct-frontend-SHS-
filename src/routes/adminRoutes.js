/** 담당자 7 · F-OPS-005/010/011/024: 관리자 UI의 하이픈 없는 경로 계약을 한곳에서 관리합니다. */
export const ADMIN_PROVIDER_APPLICATIONS_ROUTE = 'providers/applications';
export const ADMIN_PROVIDER_APPLICATIONS_PATH = `/admin/${ADMIN_PROVIDER_APPLICATIONS_ROUTE}`;

export const ADMIN_OPERATIONS_RECORDS_ROUTE = 'operations/records';
export const ADMIN_OPERATIONS_RECORDS_PATH = `/admin/${ADMIN_OPERATIONS_RECORDS_ROUTE}`;

export const ADMIN_SETTINGS_ROUTE = 'settings';
export const ADMIN_SETTINGS_PATH = `/admin/${ADMIN_SETTINGS_ROUTE}`;

export const ADMIN_FUNDS_ROUTE = 'funds';
export const ADMIN_FUNDS_PATH = `/admin/${ADMIN_FUNDS_ROUTE}`;

export const ADMIN_REPORTS_ROUTE = 'reports';
export const ADMIN_REPORTS_PATH = `/admin/${ADMIN_REPORTS_ROUTE}`;
export const ADMIN_REPORT_DETAIL_ROUTE = `${ADMIN_REPORTS_ROUTE}/:reportSn`;
export const getAdminReportDetailPath = (reportSn) => `${ADMIN_REPORTS_PATH}/${reportSn}`;

export const ADMIN_SERVICE_REQUESTS_ROUTE = 'services/requests';
export const ADMIN_SERVICE_REQUESTS_PATH = `/admin/${ADMIN_SERVICE_REQUESTS_ROUTE}`;
export const ADMIN_SERVICE_REQUEST_DETAIL_ROUTE = `${ADMIN_SERVICE_REQUESTS_ROUTE}/:serviceRequestId`;
export const getAdminServiceRequestDetailPath = (serviceRequestId) => (
  `${ADMIN_SERVICE_REQUESTS_PATH}/${serviceRequestId}`
);

export const ADMIN_AUCTIONS_ROUTE = 'auctions';
export const ADMIN_AUCTIONS_PATH = `/admin/${ADMIN_AUCTIONS_ROUTE}`;
export const ADMIN_AUCTION_DETAIL_ROUTE = `${ADMIN_AUCTIONS_ROUTE}/:auctionId`;
export const getAdminAuctionDetailPath = (auctionId) => `${ADMIN_AUCTIONS_PATH}/${auctionId}`;

export const ADMIN_SERVICE_TRADE_DETAIL_ROUTE = 'services/trades/:tradeId';

export const getAdminServiceTradeDetailPath = (tradeId) => (
  `/admin/services/trades/${tradeId}`
);
