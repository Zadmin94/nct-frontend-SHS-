import React from "react";
import { Star } from "lucide-react";

/**
 * 별점 읽기 전용 표시 (5개 중 rating개 채움). Figma는 이 부분을 이미지 1장으로 처리했지만,
 * 실제 데이터(rating)에 따라 달라져야 하므로 아이콘 5개를 조합해서 만든다
 * (StarRating.jsx 와 색상·크기는 맞추되, 클릭 불가능한 표시 전용 버전).
 */
export default function StarRatingDisplay({ rating, size = 18 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`평점 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rating ? "fill-[#e63946] text-[#e63946]" : "fill-none text-[#d9d9d9]"}
        />
      ))}
    </div>
  );
}
