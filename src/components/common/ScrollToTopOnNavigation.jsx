import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * 담당자 7: 링크·버튼으로 새 화면에 진입하면 이전 화면의 스크롤 위치를 이어받지 않습니다.
 * 브라우저 뒤로가기·앞으로가기(POP)는 브라우저의 원래 위치 복원을 그대로 사용합니다.
 */
const ScrollToTopOnNavigation = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  const previousUrlRef = useRef(currentUrl);
  const preserveScrollPosition = location.state?.preserveScrollPosition === true;

  useLayoutEffect(() => {
    const urlChanged = previousUrlRef.current !== currentUrl;
    previousUrlRef.current = currentUrl;

    if (urlChanged && navigationType !== 'POP' && !preserveScrollPosition) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [currentUrl, navigationType, preserveScrollPosition]);

  return null;
};

export default ScrollToTopOnNavigation;
