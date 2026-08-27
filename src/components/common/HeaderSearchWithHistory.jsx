// @ai_generated
// 헤더 검색 슬롯에 꽂는 "검색어 입력 + 최근 검색 기록" 공용 컴포넌트.
// 필터를 keyword와 합쳐 쿼리파라미터로 만드는 건 각 페이지 책임이며, 이 컴포넌트는 keyword만 다룬다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { History, Search, X } from 'lucide-react';
import {
  HEADER_SEARCH_BUTTON_CLASS,
  HEADER_SEARCH_FORM_CLASS,
  HEADER_SEARCH_INPUT_CLASS,
} from './HeaderSearchPortal';
import { createSearchHistoryStore } from '@utils/searchHistoryStore';

const HeaderSearchWithHistory = ({
  storageKey,
  dropdownId,
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
}) => {
  const store = useMemo(() => createSearchHistoryStore(storageKey), [storageKey]);
  const containerRef = useRef(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(() => store.get());
  const showHistory = historyOpen && history.length > 0;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current?.contains(event.target)) return;
      setHistoryOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const runSearch = (keyword) => {
    const trimmed = keyword.trim();
    if (trimmed) setHistory(store.add(trimmed));
    setHistoryOpen(false);
    onSubmit(trimmed);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    runSearch(value);
  };

  const handleRecentSearch = (term) => {
    onChange(term);
    runSearch(term);
  };

  const handleRemoveRecentSearch = (term) => {
    setHistory(store.remove(term));
  };

  return (
    <div ref={containerRef} className="relative mx-auto w-full">
      <form
        className={`${HEADER_SEARCH_FORM_CLASS} relative z-[141] ${
          showHistory
            ? '![border-radius:22px_22px_0_0] !border-b-transparent'
            : ''
        }`}
        onSubmit={handleSubmit}
      >
        <input
          className={HEADER_SEARCH_INPUT_CLASS}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setHistoryOpen(true)}
          onClick={() => setHistoryOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setHistoryOpen(false);
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-controls={dropdownId}
          aria-expanded={showHistory}
          autoComplete="off"
        />

        <button
          className={HEADER_SEARCH_BUTTON_CLASS}
          type="submit"
          aria-label="검색"
        >
          <Search size={24} strokeWidth={2.4} />
        </button>
      </form>

      {showHistory && (
        <div
          id={dropdownId}
          className="absolute inset-x-0 top-[calc(100%_-_2px)] z-[142] overflow-hidden rounded-b-[22px] border-2 border-t-0 border-primary bg-white shadow-[0_12px_24px_rgba(0,0,0,0.14)]"
        >
          <ul className="m-0 list-none p-0">
            {history.map((term) => (
              <li
                className="flex min-h-11 items-center hover:bg-[#f7f8fa]"
                key={term}
              >
                <button
                  className="flex min-w-0 flex-1 cursor-pointer items-center self-stretch overflow-hidden border-0 bg-transparent text-left text-body-sm text-[#333] md:text-body-md"
                  type="button"
                  onClick={() => handleRecentSearch(term)}
                >
                  <History
                    className="ml-3 shrink-0 text-[#777]"
                    size={17}
                    aria-hidden="true"
                  />

                  <span className="min-w-0 overflow-hidden px-3 text-ellipsis whitespace-nowrap">
                    {term}
                  </span>
                </button>

                <button
                  className="mr-1 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#999] hover:bg-white hover:text-[#333]"
                  type="button"
                  onClick={() => handleRemoveRecentSearch(term)}
                  aria-label={`${term} 검색 기록 삭제`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HeaderSearchWithHistory;
