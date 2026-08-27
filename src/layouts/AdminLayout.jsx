// src/layouts/AdminLayout.jsx
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '@components/admin/AdminSidebar';
import './AdminLayout.css';
import '@components/admin/AdminDesignSystem.css';

// 화면을 다시 열어도 관리자 사이드바의 접힘 상태를 유지합니다.
const ADMIN_SIDEBAR_STORAGE_KEY = 'ksteam-admin-sidebar-collapsed';

const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return false;

  const savedState = window.localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY);
  if (savedState !== null) return savedState === '1';

  // 작은 화면에서는 본문을 먼저 볼 수 있도록 메뉴를 닫은 상태로 시작합니다.
  return window.matchMedia('(max-width: 768px)').matches;
};

const AdminLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getInitialSidebarState);

  const setSidebarCollapsed = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
    window.localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
  };

  const toggleSidebar = () => setSidebarCollapsed(!isSidebarCollapsed);

  const closeSidebarAfterMobileNavigation = () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div className={`admin-layout${isSidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <header className="admin-layout__header">
        <button
          aria-controls="admin-navigation"
          aria-expanded={!isSidebarCollapsed}
          aria-label={isSidebarCollapsed ? '관리자 메뉴 열기' : '관리자 메뉴 닫기'}
          className="admin-layout__menu-button"
          onClick={toggleSidebar}
          type="button"
        >
          <Menu aria-hidden="true" />
        </button>
        <span className="admin-layout__header-label">관리자 화면</span>
      </header>

      <AdminSidebar
        collapsed={isSidebarCollapsed}
        id="admin-navigation"
        onNavigate={closeSidebarAfterMobileNavigation}
      />

      <button
        aria-label="관리자 메뉴 닫기"
        className="admin-layout__backdrop"
        onClick={() => setSidebarCollapsed(true)}
        type="button"
      />

      {/* 각 담당자의 관리자 상세 화면은 이 Outlet 자리에 표시됩니다. */}
      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
