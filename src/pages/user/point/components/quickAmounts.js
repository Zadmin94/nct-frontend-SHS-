// Claude Code 작성 (BJN, 2026-07-20)
// 지갑 모달들의 빠른 금액 버튼 공용 상수 — 충전(PointChargeWidgetModal)·금액 입력(PointAmountModal)이 함께 쓴다.
// 컴포넌트 파일에서 export하면 개발 중 화면 자동 새로고침(fast refresh) 경고가 생겨 별도 파일로 분리했다.
// 기존 [100000, 300000, 500000]은 액수가 너무 커서 낮은 단위로 조정 (사용자 결정, 2026-08-05)
export const QUICK_AMOUNTS = [10000, 30000, 50000, 100000];
// 충전만 "포인트 전체" 버튼이 의미가 없어(잔액에서 빼는 게 아니라 새로 채우는 동작이라) 대신
// 큰 금액 버튼 하나를 더 둬서 전환·환전(QUICK_AMOUNTS 4개 + 전체 1개)과 버튼 개수를 맞춘다
export const CHARGE_QUICK_EXTRA = 300000;
