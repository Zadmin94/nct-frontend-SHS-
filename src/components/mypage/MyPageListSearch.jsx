import { useState } from 'react';
import { ActionButton } from '@components/common/ui';

export default function MyPageListSearch({
  onSearch,
  placeholder = '상품명 검색',
  ariaLabel = '상품명 검색',
}) {
  const [value, setValue] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-9 min-w-0 flex-1 rounded-lg border border-[#dce2ed] bg-white px-3 text-sm outline-none focus:border-[#1466f5] sm:w-[180px]"
      />
      <ActionButton
        className="shrink-0"
        size="sm"
        type="submit"
      >
        검색
      </ActionButton>
    </form>
  );
}
