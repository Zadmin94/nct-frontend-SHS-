// @ai_generated (담당자1, 2026-08-07)
// TradeDetailBuyer/Seller(직거래·배송 두 분기) 3곳에 똑같이 반복되던 헤더를 공통 컴포넌트로
// 추출했다. 제목이 "거래 상세" 리터럴에서 productName으로 바뀌는 수정을 3곳에 따로 적용해야
// 했던 게 계기. 거래종류·거래방식·거래상태는 이후 TradeInfoSection으로 옮겨서 여기는
// 제목·뒤로가기만 남았다.
// onBack이 없으면(embedded 경로 - AuctionTradeDetailPage가 공용 타이틀 행에서 뒤로가기를
// 대신 그린다) 버튼을 렌더링하지 않는다. 독립 라우트(/trades/:tradeId, 미리보기 등)에서는
// 그런 공용 타이틀 행이 없어서 onBack을 그대로 넘겨받아 버튼을 계속 보여준다.
import { ActionButton } from '@components/common/ui';

export default function TradeDetailHeader({ title, onBack }) {
  return (
    <header className="trade-detail-page__header">
      <div>
        <h1>{title}</h1>
      </div>
      {onBack && (
        <ActionButton
          onClick={onBack}
          tone="neutral"
        >
          ← 목록으로
        </ActionButton>
      )}
    </header>
  );
}
