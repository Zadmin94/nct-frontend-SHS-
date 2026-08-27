// src/pages/product/steps/RegisterConfirmStep.jsx
// 1단계(등록 확인): 등록 전 상품정보·경매조건 요약 확인 + 최종 동의 (예전 3단계 구조의 "Step 2")
// Props: form, agreed, setAgreed, images, selectedCat, selectedTrade, endDt, auctionRange, agreedRef(동의 미체크 시 스크롤 포커스용)
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { SANITIZE_OPTS, resolveDescriptionImagesForDisplay } from '@components/product/richTextEditorImages';
import { formatDateTimeAmPm, formatPoint } from '@/utils/common';

// endDt(Date 객체)를 formatDateTime이 기대하는 오프셋 없는 로컬 ISO 문자열로 변환
const toNaiveIso = (date) => {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

export default function RegisterConfirmStep({ form, agreed, setAgreed, images, selectedCat, selectedTrade, endDt, auctionRange, agreedRef }) {
  const [descOpen, setDescOpen] = useState(false);
  return (
    <div>
      <div className="grid-2" style={{ margin: '20px 0' }}>
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>상품 정보</h4>
          <table style={{ border: '1px solid #d8d6cf', borderRadius: 10 }}>
            <tbody>
              {[
                ['상품명', form.prdNm],
                ['카테고리', selectedCat?.catNm || '—'],
                ['거래 방식', selectedTrade?.label || '—'],
                ['이미지', `${images.length}장 등록됨`],
              ].map(([k, v], i, arr) => (
                <tr key={k}><th style={{ background: '#eef2fb', borderBottom: i === arr.length - 1 ? 'none' : '1px solid #d8d6cf', borderRight: '1px solid #d8d6cf' }}>{k}</th><td style={{ borderLeft: '1px solid #d8d6cf' }}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>경매 조건</h4>
          <table style={{ border: '1px solid #d8d6cf', borderRadius: 10 }}>
            <tbody>
              {[
                ['시작가', form.prdStartAmt ? formatPoint(form.prdStartAmt) : '—'],
                ['즉시구매가', form.prdIbyAmt ? formatPoint(form.prdIbyAmt) : '미설정'],
                ['입찰 단위', formatPoint(form.bidUnit)],
                ['경매 기간', (() => {
                  if (!auctionRange?.start || !auctionRange?.end) return '—';
                  const startPart = form.startNow
                    ? '즉시 시작'
                    : formatDateTimeAmPm(`${auctionRange.start}T${auctionRange.startTime || '00:00'}:00`);
                  const endPart = endDt ? formatDateTimeAmPm(toNaiveIso(endDt)) : auctionRange.end;
                  return `${startPart} ~ ${endPart}`;
                })()],
                ['종료 예정', endDt ? formatDateTimeAmPm(toNaiveIso(endDt)) : '—'],
              ].map(([k, v], i, arr) => (
                <tr key={k}><th style={{ background: '#eef2fb', borderBottom: i === arr.length - 1 ? 'none' : '1px solid #d8d6cf', borderRight: '1px solid #d8d6cf' }}>{k}</th><td style={{ borderLeft: '1px solid #d8d6cf' }}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 구매자 화면에서 보이는 것과 동일한 형태의 상품 설명 미리보기 */}
      {form.prdCn && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>상품 설명</h4>
          <div
            className="rich-text-editor-body"
            style={{ fontSize: 16, lineHeight: 1.7, color: '#1a1a18', overflow: 'hidden', maxHeight: descOpen ? 'none' : 120, padding: 0 }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolveDescriptionImagesForDisplay(form.prdCn), SANITIZE_OPTS) }}
          />
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setDescOpen(v => !v)}
              style={{ fontSize: 13, color: '#5f5e5a', background: '#fff', border: '1px solid #e2e1dc', borderRadius: 8, padding: '6px 24px', cursor: 'pointer' }}
            >
              {descOpen ? '접기 ▲' : '더보기 ▼'}
            </button>
          </div>
        </div>
      )}

      <div className="policy-agree" ref={agreedRef}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ flexShrink: 0 }}
          />
          <span>위 상품등록 정보를 확인하였으며, 경매시작 후 본문수정이 불가능함에 동의합니다.</span>
        </label>
      </div>
    </div>
  );
}
