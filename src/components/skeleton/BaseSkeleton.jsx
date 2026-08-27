// src/components/skeleton/BaseSkeleton.jsx
// 스켈레톤 라이브러리 연결부(가장 기본 공통 단위) — 형태별 스켈레톤(ListSkeleton, ViewSkeleton 등)은
// 이 컴포넌트를 가져다 자기 화면에 맞는 배치로 조합한다.
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// 다른 형태(테이블 등)의 스켈레톤도 라이브러리를 직접 import하지 않고
// 이 재수출을 통해서만 가져다 쓰도록 한다 — 라이브러리 연결부를 한 곳으로 유지.
export { Skeleton };

const BaseSkeleton = ({ titleHeight = 40, lineHeight = 20, lineCount = 5 }) => (
  <div className="container" style={{ paddingTop: '40px' }}>
    <Skeleton height={titleHeight} style={{ marginBottom: '16px' }} />
    <Skeleton count={lineCount} height={lineHeight} style={{ marginBottom: '8px' }} />
  </div>
);

export default BaseSkeleton;
