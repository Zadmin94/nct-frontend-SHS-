import { Skeleton } from './BaseSkeleton';

export default function InlineSkeleton({
  width = 28,
  height = 20,
  borderRadius = 6,
}) {
  return (
    <span className="inline-flex" aria-hidden="true">
      <Skeleton width={width} height={height} borderRadius={borderRadius} />
    </span>
  );
}
