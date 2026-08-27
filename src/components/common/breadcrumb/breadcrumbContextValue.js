import { createContext } from 'react';

// 담당자 7: Fast Refresh가 Provider 컴포넌트만 갱신하도록 Context 값을 분리합니다.
export const BreadcrumbContext = createContext({ entry: null, setEntry: () => {} });
