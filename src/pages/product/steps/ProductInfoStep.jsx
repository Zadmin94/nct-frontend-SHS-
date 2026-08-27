// src/pages/product/steps/ProductInfoStep.jsx
// Step 0: 상품명·카테고리·거래형태·설명·이미지 입력
// Props: form, set, categories, bannedKeywordError, bannedKeywordCnError, images, onChange, tradeMethods, maxImages,
//        submitted, imgSectionRef, prdNmRef, catRef, tradeRef, descRef, onTradeRegionsChange
import ProductImageUpload from '@components/product/ProductImageUpload';
import RichTextEditor from '@components/product/RichTextEditor';
import RegionSelector from '@components/common/RegionSelector';

// 이 값일 때만 희망 거래지역 선택 UI 노출 — 직거래(TRDC0010)
const REGION_REQUIRED_TRADE_METHODS = ['TRDC0010'];

export default function ProductInfoStep({ form, set, categories, bannedKeywordError, bannedKeywordCnError, images, onChange, tradeMethods, maxImages, submitted, imgSectionRef, prdNmRef, catRef, tradeRef, descRef, onTradeRegionsChange }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="field" ref={prdNmRef}>
        <label>상품명 <span style={{ color: '#c0392b' }}>*</span> <span>{form.prdNm.length}/100</span></label>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type="text"
            value={form.prdNm}
            onChange={e => set('prdNm', e.target.value)}
            maxLength={100}
            placeholder="다이슨 V11 청소기"
          />
          {submitted && !form.prdNm.trim() && (
            <span style={{ position: 'absolute', top: '100%', left: 0, fontSize: 17, fontWeight: 700, color: '#c0392b', whiteSpace: 'nowrap' }}>상품명을 입력해 주세요.</span>
          )}
          {bannedKeywordError && (
            <span style={{ position: 'absolute', top: '100%', left: 0, fontSize: 17, fontWeight: 700, color: '#c0392b', whiteSpace: 'nowrap' }}>{bannedKeywordError}</span>
          )}
        </div>
      </div>

      <div className="field" ref={catRef} style={{ marginTop: 12 }}>
        <label>카테고리 <span style={{ color: '#c0392b' }}>*</span></label>
        <div style={{ position: 'relative' }}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat.catSn}
                type="button"
                onClick={() => set('catSn', String(cat.catSn))}
                className={`chip ${String(form.catSn) === String(cat.catSn) ? 'active' : ''}`}
              >
                {cat.catNm}
              </button>
            ))}
          </div>
          {submitted && !form.catSn && (
            <span style={{ position: 'absolute', top: '100%', left: 0, fontSize: 17, fontWeight: 700, color: '#c0392b', whiteSpace: 'nowrap' }}>카테고리를 선택해 주세요.</span>
          )}
        </div>
      </div>

      <div className="field deal-options" ref={tradeRef} style={{ marginTop: 20 }}>
        <label>거래 형태 <span style={{ color: '#c0392b' }}>*</span></label>
        <div className="row">
          {tradeMethods.map((method) => (
            <label
              key={method.value}
              className={`line-option ${form.prdTrdMethodCd === method.value ? 'checked' : ''}`}
            >
              <input
                type="radio"
                name="prdTrdMethodCd"
                value={method.value}
                checked={form.prdTrdMethodCd === method.value}
                onChange={() => set('prdTrdMethodCd', method.value)}
              />
              <method.Icon />
              {method.label}
            </label>
          ))}
        </div>
      </div>

      {REGION_REQUIRED_TRADE_METHODS.includes(form.prdTrdMethodCd) && (
        <div className="field" style={{ marginTop: 20 }}>
          <RegionSelector
            label="희망 거래지역 (최대 5곳)"
            placeholder="희망 거래지역을 선택해 주세요"
            value={form.tradeRegions.map(r => r.name)}
            onChange={onTradeRegionsChange}
          />
        </div>
      )}

      <div className="field" ref={descRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <label>상품 설명</label>
        <RichTextEditor value={form.prdCn} onChange={html => set('prdCn', html)} />
        {bannedKeywordCnError && (
          <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#c0392b' }}>{bannedKeywordCnError}</p>
        )}
      </div>

      {/* 이미지 업로드 (F-AUC-002) — 선택 시엔 로컬 미리보기만, 첫 장이 대표이미지 */}
      <div ref={imgSectionRef}>
        <ProductImageUpload images={images} onChange={onChange} maxImages={maxImages} />
        {submitted && images.length === 0 && (
          <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#c0392b' }}>상품 사진을 1개 이상 등록해 주세요.</p>
        )}
      </div>
    </div>
  );
}
