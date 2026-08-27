// 상품(PRODUCT) 관련 공통 상수 — ProductRegisterPage / MyProductList / ProductDetailSellerPage 공유
// F-AUC-005 거래 상태(TRDC) 라벨·배지 — 정민재(4) 연계
export const TRADE_STATUS_LABEL = {
  TRDC0003: '거래 진행중',
  TRDC0004: '배송중',
  TRDC0005: '구매자 확인 대기',
  TRDC0006: '거래 완료',
  TRDC0007: '거래 보류/분쟁',
  TRDC0008: '거래 취소',
};


export const TRADE_LABEL = {
  TRDC0009: '배송',
  TRDC0010: '직거래',
  TRDC0015: '둘 다 가능',
};

export const STATUS_LABEL = {
  PRDC0001: '임시저장',
  PRDC0002: '경매 진행중',
  PRDC0003: '종료',
  PRDC0004: '삭제',
};

export const STATUS_BADGE = {
  PRDC0001: 'badge-gray',
  PRDC0002: 'badge-success',
  PRDC0003: 'badge-gray',
  PRDC0004: 'badge-danger',
};

// 경매 실제 진행 상태(AUCTION.AUC_STATUS_CD) 라벨·배지 — PRODUCT.PRD_STATUS_CD는 등록 후
// 계속 PRDC0002로 남아있어서 유찰·낙찰·취소 여부를 못 담는다. 상태 표시가 필요한 화면은
// auctionStatus가 있으면 이쪽을, 없으면(임시저장 등 경매 자체가 없는 경우) 위 STATUS_LABEL을 쓴다.
export const AUC_STATUS_LABEL = {
  AUCC0001: '예약',
  AUCC0002: '경매중',
  AUCC0003: '낙찰',
  AUCC0004: '유찰',
  AUCC0005: '취소',
  AUCC0006: '취소요청',
  AUCC0013: '운영 보류',
  AUCC9001: '관리자 일시중지',
};

export const AUC_STATUS_BADGE = {
  AUCC0001: 'badge-gray',
  AUCC0002: 'badge-success',
  AUCC0003: 'badge-gray',
  AUCC0004: 'badge-gray',
  AUCC0005: 'badge-danger',
  AUCC0006: 'badge-danger',
  AUCC0013: 'badge-warning',
  AUCC9001: 'badge-warning',
};
