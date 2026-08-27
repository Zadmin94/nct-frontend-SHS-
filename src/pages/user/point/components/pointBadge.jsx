// Claude Code 작성 (BJN, 2026-08-05)
// 상태/유형 배지 렌더러 — 원장·충전·전환·환전 네 내역 테이블(PointLedgerTable 등)이 같은
// 배지 마크업을 4벌 복사해 쓰던 것을 통합 (2026-08-05 코드 점검 후속). 표마다 다른 건
// 라벨→색 클래스 매핑뿐이라 colorMap만 받아 badge 함수를 돌려준다. 매핑에 없는 라벨은
// 회색 기본값. PointTable.jsx에 두지 않은 이유: 컴포넌트 파일에 비컴포넌트 export를 섞으면
// 개발 중 화면 자동 새로고침(fast refresh) 경고가 생겨서 quickAmounts.js처럼 별도 파일로 분리.
//
// 사용: const badge = pointBadge(STATUS_BADGE);  →  badge('완료')

import { StatusBadge } from '@components/common/ui';

const resolveBadgeTone = (colorClassName = '') => {
  if (/(green|teal)/.test(colorClassName)) return 'success';
  if (/(yellow|amber|orange)/.test(colorClassName)) return 'warning';
  if (/red/.test(colorClassName)) return 'danger';
  if (/(blue|indigo|purple|cyan)/.test(colorClassName)) return 'info';
  return 'neutral';
};

// 담당자 7 · UI 공통화: 포인트 유형별 기존 팔레트를 공통 상태 배지의 의미색으로 연결합니다.
const pointBadge = (colorMap) => {
  const badge = (label) => (
    <StatusBadge tone={resolveBadgeTone(colorMap[label])} variant="soft">
      {label}
    </StatusBadge>
  );
  return badge;
};

export default pointBadge;
