import React, { useState } from "react";
import { Star } from "lucide-react";

// Figma 디자인에는 "4점(좋아요)" 상태만 노출되어 있었다.
// 나머지 점수의 라벨은 일반적인 5점 만족도 척도로 추정한 것이라, 실제 문구가 정해지면 교체가 필요하다.
const RATING_LABELS = {
  1: "별로예요",
  2: "아쉬워요",
  3: "보통이에요",
  4: "좋아요",
  5: "최고예요",
};

/**
 * 1~5점 별점 선택 컴포넌트.
 * @param {number} value        현재 선택된 점수 (0 = 미선택)
 * @param {(n: number) => void} onChange
 */
export default function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const displayValue = hovered || value;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onClick={() => onChange(n)}
            className="p-0.5 cursor-pointer"
            aria-label={`${n}점`}
          >
            <Star
              size={28}
              className={n <= displayValue ? "fill-[#e63946] text-[#e63946]" : "fill-none text-[#d9d9d9]"}
            />
          </button>
        ))}
      </div>
      {displayValue > 0 && (
        <span className="text-[15px] text-[#e63946]">
          <strong className="font-bold">{displayValue}점</strong>({RATING_LABELS[displayValue]})
        </span>
      )}
    </div>
  );
}
