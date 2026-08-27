import { useContext } from 'react';
import { BreadcrumbContext } from './breadcrumbContextValue';

export const useBreadcrumbContext = () => useContext(BreadcrumbContext);
