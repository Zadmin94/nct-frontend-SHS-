import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { KOREA_REGIONS } from '@/constants/koreaRegions';

const normalizeSearchText = (value) => String(value ?? '')
  .replace(/\s+/g, '')
  .toLocaleLowerCase('ko-KR');

const formatOptionName = (name, count) => {
  const numericCount = Number(count);
  return Number.isFinite(numericCount)
    ? `${name} (${numericCount.toLocaleString('ko-KR')})`
    : name;
};

const createSelection = (region, district = null) => ({
  code: district?.code ?? region.code,
  level: district ? 'sigungu' : 'sido',
  sidoCode: region.code,
  sidoName: region.name,
  sigunguCode: district?.code ?? '',
  sigunguName: district?.name ?? '',
  label: district ? `${region.name} ${district.name}` : region.name,
  breadcrumb: district ? [region.name, district.name] : [region.name],
});

const findSelectionByLabel = (regions, label) => {
  const normalizedLabel = normalizeSearchText(label);
  if (!normalizedLabel) return null;

  for (const region of regions) {
    if (normalizeSearchText(region.name) === normalizedLabel) {
      return createSelection(region);
    }

    const district = region.districts.find((item) => (
      normalizeSearchText(`${region.name}${item.name}`) === normalizedLabel
    ));
    if (district) return createSelection(region, district);
  }

  return null;
};

const normalizeSelections = (value, regions) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values
    .map((item) => {
      if (item && typeof item === 'object' && item.code) return item;
      return findSelectionByLabel(regions, item);
    })
    .filter(Boolean);
};

const RegionCheckbox = ({
  checked,
  count,
  label,
  onChange,
}) => (
  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-base text-[#272725] transition-colors hover:bg-[#f3f7ff]">
    <input
      checked={checked}
      className="size-4 shrink-0 accent-primary"
      onChange={onChange}
      type="checkbox"
    />
    <span className="min-w-0 flex-1 truncate">{formatOptionName(label, count)}</span>
  </label>
);

const RegionSelector = ({
  className = '',
  counts = {},
  disabled = false,
  label = '지역',
  maxSelections = null,
  multiple = true,
  onChange,
  placeholder = '지역을 선택해 주세요',
  regions = KOREA_REGIONS,
  size = 'md',
  value = [],
}) => {
  const panelId = useId();
  const searchId = `${panelId}-search`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selections = useMemo(
    () => normalizeSelections(value, regions),
    [regions, value],
  );
  const [activeSidoCode, setActiveSidoCode] = useState(
    selections[0]?.sidoCode ?? regions[0]?.code ?? '',
  );
  const [panelStyle, setPanelStyle] = useState({});

  const activeRegion = useMemo(
    () => regions.find((region) => region.code === activeSidoCode) ?? regions[0],
    [activeSidoCode, regions],
  );

  const selectedCodes = useMemo(
    () => new Set(selections.map((selection) => selection.code)),
    [selections],
  );

  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];

    return regions.flatMap((region) => {
      const regionSelection = createSelection(region);
      const districtSelections = region.districts.map((district) => (
        createSelection(region, district)
      ));

      return [regionSelection, ...districtSelections].filter((selection) => (
        normalizeSearchText(selection.label).includes(normalizedQuery)
      ));
    });
  }, [query, regions]);

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(680, window.innerWidth - (viewportPadding * 2));
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    const top = rect.bottom + 6;
    const availableHeight = Math.max(220, window.innerHeight - top - viewportPadding);

    setPanelStyle({
      left,
      maxHeight: Math.min(520, availableHeight),
      top,
      width,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    updatePanelPosition();
    const handlePointerDown = (event) => {
      if (
        !rootRef.current?.contains(event.target)
        && !panelRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition]);

  const emitSelections = (nextSelections) => {
    onChange?.(multiple ? nextSelections : nextSelections.slice(-1));
  };

  const toggleSelection = (selection) => {
    setActiveSidoCode(selection.sidoCode);
    const alreadySelected = selectedCodes.has(selection.code);
    if (alreadySelected) {
      emitSelections(selections.filter((item) => item.code !== selection.code));
      return;
    }

    if (!multiple) {
      emitSelections([selection]);
      return;
    }

    if (maxSelections && selections.length >= maxSelections) return;

    const withoutSameRegion = selection.level === 'sido'
      ? selections.filter((item) => item.sidoCode !== selection.sidoCode)
      : selections.filter((item) => !(
        item.sidoCode === selection.sidoCode && item.level === 'sido'
      ));
    emitSelections([...withoutSameRegion, selection]);
  };

  const removeSelection = (code) => {
    emitSelections(selections.filter((selection) => selection.code !== code));
  };

  const triggerLabel = selections.length === 0
    ? placeholder
    : selections.length === 1
      ? selections[0].breadcrumb.join(' > ')
      : `${selections[0].breadcrumb.join(' > ')} 외 ${selections.length - 1}곳`;

  const panel = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed z-[1000] flex overflow-hidden rounded-[5px] border border-[#cfcfcd] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.14)]"
      id={panelId}
      ref={panelRef}
      role="dialog"
      style={panelStyle}
    >
      <div className="flex min-h-0 w-full flex-col">
        <div className="border-b border-[#e6e6e3] p-3">
          <label className="relative block" htmlFor={searchId}>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#777773]"
              size={19}
            />
            <input
              autoComplete="off"
              className="h-12 w-full rounded-[5px] border border-[#cfcfcd] bg-white pl-10 pr-10 text-base text-[#272725] outline-none focus:border-primary"
              id={searchId}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="시·도 또는 시·군·구 검색"
              type="search"
              value={query}
            />
            {query && (
              <button
                aria-label="검색어 지우기"
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-[#777773] hover:text-[#272725]"
                onClick={() => setQuery('')}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            )}
          </label>
        </div>

        {query ? (
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {searchResults.length > 0 ? searchResults.map((selection) => (
              <RegionCheckbox
                checked={selectedCodes.has(selection.code)}
                count={counts[selection.code]}
                key={selection.code}
                label={selection.breadcrumb.join(' > ')}
                onChange={() => toggleSelection(selection)}
              />
            )) : (
              <p className="px-4 py-8 text-center text-base text-[#777773]">
                일치하는 지역이 없습니다.
              </p>
            )}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[190px_minmax(0,1fr)] max-sm:grid-cols-[140px_minmax(0,1fr)]">
            <div className="overflow-y-auto border-r border-[#e6e6e3] py-1">
              {regions.map((region) => {
                const active = region.code === activeRegion?.code;
                return (
                  <button
                    className={`flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-base transition-colors ${
                      active
                        ? 'bg-[#edf4ff] font-bold text-primary'
                        : 'text-[#272725] hover:bg-[#f6f6f4]'
                    }`}
                    key={region.code}
                    onClick={() => setActiveSidoCode(region.code)}
                    type="button"
                  >
                    <span className="truncate">{region.name}</span>
                    {active && <ChevronRight aria-hidden="true" size={18} />}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 overflow-y-auto py-1">
              {activeRegion && (
                <>
                  <RegionCheckbox
                    checked={selectedCodes.has(activeRegion.code)}
                    count={counts[activeRegion.code]}
                    label={`${activeRegion.name} 전체`}
                    onChange={() => toggleSelection(createSelection(activeRegion))}
                  />
                  <div className="mx-3 border-t border-[#ececea]" />
                  <div className="grid grid-cols-2 max-sm:grid-cols-1">
                    {activeRegion.districts.map((district) => (
                      <RegionCheckbox
                        checked={selectedCodes.has(district.code)}
                        count={counts[district.code]}
                        key={district.code}
                        label={district.name}
                        onChange={() => toggleSelection(createSelection(activeRegion, district))}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex min-h-12 items-center justify-between gap-3 border-t border-[#e6e6e3] px-3 py-2">
          <span className="text-base font-semibold text-[#555552]">
            {selections.length > 0 ? `${selections.length}곳 선택` : '선택된 지역 없음'}
          </span>
          <div className="flex items-center gap-2">
            {selections.length > 0 && (
              <button
                className="h-10 px-3 text-base font-semibold text-[#555552] hover:text-[#272725]"
                onClick={() => emitSelections([])}
                type="button"
              >
                전체 해제
              </button>
            )}
            <button
              className="h-10 rounded-[5px] bg-primary px-4 text-base font-bold text-white hover:bg-[#0058dc]"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              선택 완료
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <fieldset className={`min-w-0 ${className}`} disabled={disabled} ref={rootRef}>
      <legend className={size === 'sm' ? 'mb-1.5 text-sm font-semibold text-[#5f5e5a]' : 'mb-2 text-base font-bold text-[#272725]'}>{label}</legend>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className={`flex w-full items-center gap-2 rounded-[5px] border border-[#cfcfcd] bg-white text-left outline-none transition-colors hover:border-[#8aaef5] focus:border-primary disabled:cursor-not-allowed disabled:bg-[#f5f5f3] disabled:text-[#92928e] ${size === 'sm' ? 'h-[42px] px-3 text-sm' : 'h-12 px-3 text-base'}`}
        onClick={() => {
          if (!isOpen && selections[0]?.sidoCode) {
            setActiveSidoCode(selections[0].sidoCode);
          }
          setIsOpen((open) => !open);
          setQuery('');
        }}
        ref={triggerRef}
        type="button"
      >
        <MapPin aria-hidden="true" className="shrink-0 text-primary" size={19} />
        <span className={`min-w-0 flex-1 truncate ${selections.length ? 'text-[#272725]' : 'text-[#777773]'}`}>
          {triggerLabel}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`shrink-0 text-[#777773] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          size={19}
        />
      </button>

      {selections.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selections.map((selection) => (
            <span
              className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-[5px] bg-[#edf4ff] px-2 text-base font-semibold text-[#064fc4]"
              key={selection.code}
            >
              <span className="truncate">{selection.breadcrumb.join(' > ')}</span>
              <button
                aria-label={`${selection.breadcrumb.join(' > ')} 선택 해제`}
                className="flex size-7 shrink-0 items-center justify-center hover:text-[#003b96]"
                onClick={() => removeSelection(selection.code)}
                type="button"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </span>
          ))}
        </div>
      )}
      {panel}
    </fieldset>
  );
};

export default RegionSelector;
