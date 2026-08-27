// @ai_generated
// 퀵메뉴와 분리된 공통 페이지 상단 이동 버튼이다.
import { useEffect, useState } from 'react';

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 200);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      className="fixed bottom-[50px] right-4 z-[151] flex size-[36px] cursor-pointer items-center justify-center rounded-full bg-[rgba(0,0,0,0.65)] transition-colors hover:bg-[rgba(0,0,0,0.8)] md:right-[48px]"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="TOP"
      type="button"
    >
      <svg fill="none" height="16" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="16">
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;
