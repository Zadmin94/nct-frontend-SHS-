// @ai_generated
// 각 페이지가 소유한 검색 기능을 공통 사이트 헤더의 검색 슬롯에 렌더링한다.
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

export const SITE_HEADER_SEARCH_SLOT_ID = 'site-header-search-slot';
export const HEADER_SEARCH_FORM_CLASS = 'grid w-full grid-cols-[minmax(0,1fr)_56px] overflow-hidden rounded-[40px] border-2 border-primary bg-white';
export const HEADER_SEARCH_INPUT_CLASS = 'min-h-10 min-w-0 border-0 px-[18px] text-body-sm text-[#1a1a18] outline-none placeholder:text-[#8b8b88] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden md:text-body-md';
export const HEADER_SEARCH_BUTTON_CLASS = 'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-primary transition-colors hover:bg-primary/10';

export const SimpleHeaderSearch = ({ onSearch, placeholder }) => {
  const [keyword, setKeyword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword) onSearch(trimmedKeyword);
  };

  return (
    <form className={HEADER_SEARCH_FORM_CLASS} onSubmit={handleSubmit} role="search">
      <input
        aria-label={placeholder}
        className={HEADER_SEARCH_INPUT_CLASS}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={keyword}
      />
      <button className={HEADER_SEARCH_BUTTON_CLASS} title="검색" type="submit">
        <Search aria-hidden="true" size={23} />
        <span className="sr-only">검색</span>
      </button>
    </form>
  );
};

const HeaderSearchPortal = ({ children }) => {
  const [target, setTarget] = useState(null);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTarget(document.getElementById(SITE_HEADER_SEARCH_SLOT_ID));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return target ? createPortal(children, target) : null;
};

export default HeaderSearchPortal;
