// @ai_generated
// 사진 크게 보기 모달. TradeDetailBuyer/Seller의 발송 인증 사진 모달(.trade-modal.trade-image-modal)과
// 같은 마크업/CSS를 공유 컴포넌트로 뽑아, 리뷰 사진에도 그대로 재사용한다.
export default function PhotoLightbox({ title, photoUrls, index, onClose, onNavigate }) {
  if (index === null || index === undefined || !photoUrls?.[index]) return null;

  return (
    <div className="trade-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="trade-modal__content trade-image-modal">
        <div className="trade-modal__header">
          <h2>{title}</h2>
          <button className="trade-modal__close" type="button" onClick={onClose} aria-label="사진 크게 보기 닫기">
            ×
          </button>
        </div>
        <img src={photoUrls[index]} alt={`${title} 크게 보기`} />
        {photoUrls.length > 1 && (
          <div className="trade-image-modal__navigation">
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => onNavigate(index === 0 ? photoUrls.length - 1 : index - 1)}
            >
              ← 이전 사진
            </button>
            <span>{index + 1} / {photoUrls.length}</span>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => onNavigate(index === photoUrls.length - 1 ? 0 : index + 1)}
            >
              다음 사진 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
