// src/components/skeleton/CardGroupSkeleton.jsx
// 제목 + 카드 목록으로 구성된 그룹이 여러 개 격자로 배치되는 화면(예: 관리자 알림)을 위한 스켈레톤.
import { Skeleton } from './BaseSkeleton';

const CardGroupSkeleton = ({ groups = 4, cardsPerGroup = 2 }) => (
  <div
    className="container"
    style={{
      paddingTop: '40px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: 20,
    }}
  >
    {Array.from({ length: groups }).map((_, groupIndex) => (
      <div
        key={groupIndex}
        style={{ padding: 16, border: '1px solid #eef0f7', borderRadius: 12 }}
      >
        <Skeleton height={18} style={{ marginBottom: 12, maxWidth: 100 }} />
        {Array.from({ length: cardsPerGroup }).map((_, cardIndex) => (
          <Skeleton height={54} key={cardIndex} style={{ marginBottom: 10 }} />
        ))}
      </div>
    ))}
  </div>
);

export default CardGroupSkeleton;
