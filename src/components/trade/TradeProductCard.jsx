// @ai_generated (담당자1, 2026-08-07)
// TradeDetailBuyer/Seller 3곳의 "상품 정보" 카드(이미지·상품명·낙찰가)를 공통화했다.
// @ai_generated: 요약 정보(이미지·이름·가격)만으로는 부족하다는 지적에 따라
// 카테고리·확정일·완료일·원본 경매 링크를 추가했다(마이페이지 거래내역 목록이 보여주는
// 정보를 참고해 상세 화면에도 맞춰 넣었다). 거래방식 뱃지는 바로 아래 "정보 섹션" 카드의
// 부제(예: "물건 거래 · 배송 거래")와 중복이라 뺐다.
import { useState } from 'react';
import { toImageUrl } from '@api/fileApi';
import AuctionOriginalModal from '@components/trade/AuctionOriginalModal';
import { ActionButton } from '@components/common/ui';

// bare: 상품·정보·상대방 정보를 하나의 trade-detail-card로 합칠 때, 이 컴포넌트 자체의
// 카드 테두리(section.trade-detail-card) 없이 내부 구획(div.trade-detail-card__block)만 그린다.
export default function TradeProductCard({
  productImageUrl,
  productName,
  price,
  category,
  createdDate,
  completedDate,
  auctionId,
  bare = false,
}) {
  const [isAuctionOriginalOpen, setIsAuctionOriginalOpen] = useState(false);
  const Wrapper = bare ? 'div' : 'section';
  const Heading = bare ? 'h3' : 'h2';

  return (
    <Wrapper className={bare ? 'trade-detail-card__block' : 'trade-detail-card'}>
      <Heading>상품 정보</Heading>
      <div className="trade-product">
        <div className="trade-product__image">
          {productImageUrl
            ? <img src={toImageUrl(productImageUrl)} alt={productName} />
            : '상품 이미지'}
        </div>
        <div className="trade-product__info">
          <strong>{productName}</strong>
          {category && category !== '-' && (
            <p>카테고리 · {category}</p>
          )}
          {createdDate !== '-' && (
            <p>확정일 {createdDate}</p>
          )}
          {completedDate !== '-' && (
            <p>완료일 {completedDate}</p>
          )}
        </div>
        <div className="trade-product__price">
          <span>낙찰가</span>
          <strong>{price}</strong>
        </div>
      </div>
      {auctionId && (
        <div className="trade-detail-actions trade-detail-actions--end">
          <ActionButton
            onClick={() => setIsAuctionOriginalOpen(true)}
          >
            원본 경매 보기
          </ActionButton>
        </div>
      )}
      <AuctionOriginalModal
        auctionId={auctionId}
        onClose={() => setIsAuctionOriginalOpen(false)}
        open={isAuctionOriginalOpen}
      />
    </Wrapper>
  );
}
