// src/components/skeleton/CardGridSkeleton.jsx
// 균일한 카드가 격자로 나열되는 목록 화면(예: 서비스/제공자 검색 결과)을 위한 스켈레톤.
import { Skeleton } from './BaseSkeleton';

const CardGridSkeleton = ({ columns = 2, count = 6, cardHeight = 200 }) => (
  <div
    className="container"
    style={{
      paddingTop: '40px',
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: 18,
    }}
  >
    {Array.from({ length: count }).map((_, index) => (
      <Skeleton borderRadius={18} height={cardHeight} key={index} />
    ))}
  </div>
);

export default CardGridSkeleton;
