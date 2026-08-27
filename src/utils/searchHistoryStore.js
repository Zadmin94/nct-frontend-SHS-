const DEFAULT_MAX_HISTORY = 7;

const getLocalStorage = () => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const normalizeSearchTerm = (term) => (
  typeof term === 'string' ? term.trim() : ''
);

/** storageKey별로 완전히 분리된 최근 검색어 저장소를 만든다 (예: 경매/서비스가 서로 다른 키를 사용). */
export const createSearchHistoryStore = (storageKey, maxItems = DEFAULT_MAX_HISTORY) => {
  const get = () => {
    const storage = getLocalStorage();
    if (!storage) return [];

    try {
      const stored = JSON.parse(storage.getItem(storageKey) || '[]');
      if (!Array.isArray(stored)) return [];

      return stored
        .map(normalizeSearchTerm)
        .filter(Boolean)
        .filter((term, index, terms) => (
          terms.findIndex((candidate) => (
            candidate.toLocaleLowerCase() === term.toLocaleLowerCase()
          )) === index
        ))
        .slice(0, maxItems);
    } catch {
      storage.removeItem(storageKey);
      return [];
    }
  };

  const add = (term) => {
    const storage = getLocalStorage();
    const normalizedTerm = normalizeSearchTerm(term);
    if (!storage || !normalizedTerm) return get();

    const normalizedKey = normalizedTerm.toLocaleLowerCase();
    const updatedHistory = [
      normalizedTerm,
      ...get().filter((item) => item.toLocaleLowerCase() !== normalizedKey),
    ].slice(0, maxItems);

    storage.setItem(storageKey, JSON.stringify(updatedHistory));
    return updatedHistory;
  };

  const remove = (term) => {
    const storage = getLocalStorage();
    if (!storage) return [];

    const normalizedKey = normalizeSearchTerm(term).toLocaleLowerCase();
    const updatedHistory = get().filter((item) => item.toLocaleLowerCase() !== normalizedKey);
    storage.setItem(storageKey, JSON.stringify(updatedHistory));
    return updatedHistory;
  };

  return { get, add, remove };
};
