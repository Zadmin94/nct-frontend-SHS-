// 담당자 7 · 공통 브레드크럼 계산
// ─────────────────────────────────────────────────────────────────────────────
// 현재 화면에 표시할 브레드크럼 항목 배열을 계산하는 훅.
//
// 우선순위:
//  1. 페이지가 Context로 주입한 오버라이드 (마이페이지 중첩 상세 등)
//  2. 검증된 마이페이지 메뉴에서 진입했다면 해당 메뉴를 상위 경로로 사용
//  3. 중앙 맵(BREADCRUMB_ROUTES)에 정의한 고정 정보 구조
//  4. 맵에 없으면 null → BreadcrumbBar가 아무것도 렌더하지 않음
//     (목록·랜딩·인증·에러 페이지는 맵에 등록하지 않는 것만으로 자동 제외)
//
// 알림·검색·홈 등의 state.from은 정보 구조가 아니므로 브레드크럼 계산에 사용하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
import { matchPath, useLocation } from 'react-router-dom';
import {
  BREADCRUMB_ROUTES,
  HOME_ITEM,
  buildMyPageTrail,
} from './breadcrumbRoutes';
import { useBreadcrumbContext } from './useBreadcrumbContext';
import { getMyPageSection } from '@/routes/myPageRoutes';

const resolveMyPageEntryTrail = (rawFrom) => {
  if (typeof rawFrom !== 'string'
    || !rawFrom.startsWith('/user/mypage')
    || rawFrom.startsWith('//')) {
    return null;
  }

  const pathname = rawFrom.split(/[?#]/)[0];
  const section = getMyPageSection(pathname);
  if (!section) return null;

  const trail = buildMyPageTrail(
    section,
    pathname.startsWith('/user/mypage/provider/inquiries'),
  );

  // 검색·필터·페이지 쿼리를 유지하도록 마지막 메뉴 링크에는 검증된 원래 경로를 쓴다.
  return trail.map((item, index) => (
    index === trail.length - 1 ? { ...item, to: rawFrom } : item
  ));
};

export default function useBreadcrumbTrail() {
  const location = useLocation();
  const { entry } = useBreadcrumbContext();

  // 1순위: 현재 location에서 설정된 오버라이드만 인정 (이전 화면의 잔재는 key 불일치로 무시)
  if (entry && entry.locationKey === location.key) {
    return entry.items;
  }

  // 2순위: 중앙 맵 매치 — 배열 순서대로 첫 매치 사용
  const matchedRoute = BREADCRUMB_ROUTES
    .map((route) => ({ route, match: matchPath(route.pattern, location.pathname) }))
    .find(({ match }) => match);
  if (!matchedRoute || matchedRoute.route.hidden) return null;

  const { route, match } = matchedRoute;

  // 마이페이지의 실제 메뉴에서 들어온 경우에만 그 메뉴를 상위 계층으로 인정한다.
  const myPageTrail = resolveMyPageEntryTrail(location.state?.from);
  const defaultTrail = typeof route.defaultTrail === 'function'
    ? route.defaultTrail(match.params)
    : route.defaultTrail;

  return [
    HOME_ITEM,
    ...(myPageTrail ?? defaultTrail ?? []),
    { label: route.pageLabel },
  ];
}
