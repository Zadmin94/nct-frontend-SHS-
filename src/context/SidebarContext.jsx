// src/context/SidebarContext.jsx
import { useState } from 'react';
import { SidebarContext } from './sidebarContextValue';

export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(prev => !prev);
  const openSidebar   = () => setIsOpen(true);
  const closeSidebar  = () => setIsOpen(false);

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar, openSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};
