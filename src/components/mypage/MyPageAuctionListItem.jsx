// src/components/mypage/MyPageAuctionListItem.jsx
// 마이페이지 "경매" 아코디언 목록(진행 중인 경매/구매 내역/판매 내역)이 공유하는 행 틀 전체.
// MyPageListItem(공통 목록 행) + MyPageListPriceActions(우측 영역)를 이 형태 그대로 고정해서,
// 각 화면은 데이터만 채우면 된다 (제목 확대·가격 영역 구조를 화면마다 따로 안 챙겨도 되게 하기 위함).
import MyPageListItem from './MyPageListItem';
import MyPageListPriceActions from './MyPageListPriceActions';

export default function MyPageAuctionListItem({
  imageSrc,
  imageAlt,
  imageFallback,
  badge,
  title,
  topLine,
  priceItems,
  actionButton,
  tradeMethodLabel,
  categoryLabel,
  detailItems = [],
  to,
  state,
}) {
  return (
    <MyPageListItem
      imageSrc={imageSrc}
      imageAlt={imageAlt}
      imageFallback={imageFallback}
      badge={badge}
      title={<span className="text-2xl">{title}</span>}
      to={to}
      state={state}
      actions={(
        <MyPageListPriceActions topLine={topLine} priceItems={priceItems}>
          {actionButton}
        </MyPageListPriceActions>
      )}
    >
      {tradeMethodLabel && <p>거래 방식 · {tradeMethodLabel}</p>}
      {categoryLabel && <p>카테고리 · {categoryLabel}</p>}
      {/* 담당자 7 · 제공자 견적/거래 내역도 일반회원 목록 틀을 유지하면서 필요한 정보만 덧붙입니다. */}
      {detailItems.map(({ label, value }) => (
        value ? <p key={label}>{label} · {value}</p> : null
      ))}
    </MyPageListItem>
  );
}
