// @ai_generated (담당자1, 2026-08-07)
// TradeDetailBuyer/Seller 3곳의 진행 단계 표시줄을 공통화했다. 기존 trade-progress(박스+알약형
// 탭)와 서비스 거래 상세의 service-trade-progress(같은 목적의 기존 스테퍼) 둘 다 재사용하지
// 않고, 원형 마커 + 연결선 스테퍼로 새로 디자인했다(trade-detail.css의 .trade-stepper).
// 라벨 문구는 화면마다 다르지만("배송·직거래중" vs "일정 제안" vs "배송 등록" 등), 셋 다
// 정확히 하나의 단계만 "현재"인 구조라 activeIndex 하나로 표현할 수 있었다.
import { Check } from 'lucide-react';

export default function TradeProgressSteps({ steps, activeIndex, ariaLabel }) {
  return (
    <ol className="trade-stepper" aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming';

        return (
          <li className={`trade-stepper__item trade-stepper__item--${state}`} key={step}>
            <span className="trade-stepper__marker">
              {state === 'done' ? <Check aria-hidden="true" size={14} /> : index + 1}
            </span>
            <span className="trade-stepper__label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
