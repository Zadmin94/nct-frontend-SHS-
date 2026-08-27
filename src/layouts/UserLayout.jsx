// src/layouts/UserLayout.jsx
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@context/ThemeContext';
import Header from '@layouts/user/headers/Header';
import Footer from '@layouts/user/footers/Footer';
// 전역 브레드크럼 (BJN, 260805): 대상 페이지 목록은 breadcrumbRoutes.js에서 관리, 미등록 경로는 표시 안 됨
import { BreadcrumbProvider } from '@components/common/breadcrumb/BreadcrumbContext';
import BreadcrumbBar from '@components/common/breadcrumb/BreadcrumbBar';
const UserLayout = () => {
  return (
    <ThemeProvider>
      <BreadcrumbProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* 헤더 */}
        <Header />

        {/* 브레드크럼 — 헤더와 콘텐츠 사이 고정 위치, 페이지 콘텐츠와 분리 관리 */}
        <BreadcrumbBar />

        <main style={{ flex: 1 }}>
          <Outlet />
        </main>

        {/* 푸터 */}
        <Footer />
      </div>
      </BreadcrumbProvider>
    </ThemeProvider>
  );
};

export default UserLayout;
