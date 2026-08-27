// src/components/skeleton/MediaDetailSkeleton.jsx
// 이미지/미디어 박스 + 텍스트 정보가 나란히 배치되고, 옆에 별도 관리 패널이 있는
// 2단 상세 화면(예: 상품 상세)을 위한 스켈레톤.
import { Skeleton } from './BaseSkeleton';

const MediaDetailSkeleton = () => (
  <div
    className="container"
    style={{
      paddingTop: '40px',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
      gap: 20,
      alignItems: 'start',
    }}
  >
    {/* 왼쪽: 이미지 박스 + 정보 텍스트 */}
    <div style={{ border: '1px solid #f0efec', borderRadius: 8, padding: 20, display: 'flex', gap: 20 }}>
      <Skeleton height={180} style={{ flexShrink: 0, width: 180 }} />
      <div style={{ flex: 1 }}>
        <Skeleton height={20} style={{ marginBottom: 12, maxWidth: 120 }} />
        <Skeleton height={28} style={{ marginBottom: 10, maxWidth: '70%' }} />
        <Skeleton height={24} style={{ marginBottom: 10, maxWidth: 160 }} />
        <Skeleton height={16} style={{ maxWidth: '50%' }} />
      </div>
    </div>

    {/* 오른쪽: 관리 패널(박스 2개) */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton height={120} />
      <Skeleton height={160} />
    </div>
  </div>
);

export default MediaDetailSkeleton;
