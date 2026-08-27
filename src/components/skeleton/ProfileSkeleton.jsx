// src/components/skeleton/ProfileSkeleton.jsx
// 왼쪽 프로필 카드(아바타+정보) + 오른쪽 탭 콘텐츠 카드로 구성된 화면(예: 공개 제공자 프로필)을 위한 스켈레톤.
import { Skeleton } from './BaseSkeleton';

const ProfileSkeleton = () => (
  <div
    className="container"
    style={{
      paddingTop: '40px',
      display: 'grid',
      gridTemplateColumns: '330px minmax(0, 1fr)',
      gap: 24,
      alignItems: 'start',
    }}
  >
    {/* 왼쪽: 프로필 카드 */}
    <div style={{ border: '1px solid #e2e1dc', borderRadius: 20, padding: 28 }}>
      <Skeleton borderRadius={20} height={92} style={{ marginBottom: 18, width: 92 }} />
      <Skeleton height={24} style={{ marginBottom: 10, maxWidth: '70%' }} />
      <Skeleton height={16} style={{ marginBottom: 14, maxWidth: '50%' }} />
      <Skeleton height={14} style={{ marginBottom: 20, maxWidth: '90%' }} />
      <Skeleton count={3} height={14} style={{ marginBottom: 8 }} />
    </div>

    {/* 오른쪽: 탭 + 콘텐츠 카드 */}
    <div style={{ border: '1px solid #e2e1dc', borderRadius: 20, padding: 24 }}>
      <Skeleton height={20} style={{ marginBottom: 20, maxWidth: 160 }} />
      <Skeleton count={3} height={80} style={{ marginBottom: 12 }} />
    </div>
  </div>
);

export default ProfileSkeleton;
