// Claude Code 작성 (BJN, 260805)
// ─────────────────────────────────────────────────────────────────────────────
// 브레드크럼 오버라이드 통로 — 마이페이지처럼 URL만으로는 현재 위치를 표현할 수 없는
// 화면(?section= + 로컬 state 중첩 상세)이 트레일 전체를 직접 지정할 때 쓴다.
// 일반 상세 페이지는 이 Context를 쓸 필요 없이 중앙 맵(breadcrumbRoutes.js) 등록만으로 동작한다.
//
// location.key 스코핑: 오버라이드에 "설정 당시의 location.key"를 함께 저장해 두고,
// 트레일 계산 시 현재 key와 일치할 때만 사용한다. 이렇게 하면 라우트가 바뀌는 순간
// 이전 페이지의 오버라이드가 자동으로 무효화된다.
// (Provider 쪽 effect로 초기화하면 부모 effect가 자식보다 늦게 실행되어
//  새 페이지가 방금 설정한 값을 지워버리는 순서 버그가 생기므로 이 방식을 쓴다)
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { BreadcrumbContext } from './breadcrumbContextValue';

export const BreadcrumbProvider = ({ children }) => {
  // entry: { locationKey, items } | null
  const [entry, setEntry] = useState(null);
  const value = useMemo(() => ({ entry, setEntry }), [entry]);
  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
};
