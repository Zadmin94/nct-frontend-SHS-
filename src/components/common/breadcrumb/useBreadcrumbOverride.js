import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBreadcrumbContext } from './useBreadcrumbContext';

// 담당자 7: 현재 화면이 살아 있는 동안에만 브레드크럼을 교체합니다.
export const useBreadcrumbOverride = (items) => {
  const { setEntry } = useBreadcrumbContext();
  const { key: locationKey } = useLocation();
  const itemsJson = items && items.length > 0 ? JSON.stringify(items) : null;

  useLayoutEffect(() => {
    if (!itemsJson) return undefined;

    setEntry({ locationKey, items: JSON.parse(itemsJson) });
    return () => {
      setEntry((prev) => (prev?.locationKey === locationKey ? null : prev));
    };
  }, [itemsJson, locationKey, setEntry]);
};
