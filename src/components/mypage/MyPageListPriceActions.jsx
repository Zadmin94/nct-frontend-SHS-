// src/components/mypage/MyPageListPriceActions.jsx
// 마이페이지 목록 행(MyPageListItem)의 우측 영역 공통 형태.
// 위쪽 보조 정보 한 줄(topLine, 예: 남은시간 · 날짜 요약) + 아래쪽 가격류 정보(라벨이 숫자 위,
// 항상 같은 최소 너비로 정렬) + 액션 버튼을 한 묶음으로 재사용한다 (진행 중인 경매에서 먼저 확정한 형태).
const PRICE_MIN_WIDTH = 120; // "999,999P"(6자리) 실측 기준 — 이보다 길면 자연스럽게 늘어난다.

export default function MyPageListPriceActions({ topLine, topLineClassName, priceItems = [], children }) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-end gap-3">
        {topLine && (
          <span className={`text-lg font-bold whitespace-nowrap ${topLineClassName ?? 'text-[#667085]'}`}>{topLine}</span>
        )}
        {priceItems.length > 0 && (
          <div className="flex items-end gap-4">
            {priceItems.map(({ label, value, highlight }) => (
              <div className="flex flex-col items-end" key={label}>
                <span className="text-xs font-semibold whitespace-nowrap text-[#667085]">{label}</span>
                <span
                  className={`inline-block text-right text-2xl font-bold whitespace-nowrap ${
                    highlight ? 'text-primary' : 'text-[#151923]'
                  }`}
                  style={{ minWidth: PRICE_MIN_WIDTH }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {children && (
        // 버튼 라벨 길이가 제각각(등록재개/삭제/판매 기록/취소 상품 보기 등)이라 내용 기준으로 폭을
        // 정하면 버튼마다 크기가 들쭉날쭉해진다. 고정 폭 칼럼으로 묶어 전부 같은 크기로 맞춘다.
        <div className="flex w-28 flex-col gap-2 [&_.btn]:w-full [&_.ui-action-button]:w-full">
          {children}
        </div>
      )}
    </div>
  );
}
