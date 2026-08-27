// src/layouts/LandingLayout.jsx
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@context/ThemeContext';
import Header from '@layouts/user/headers/Header';
import Footer from '@layouts/user/footers/Footer';
const LandingLayout = () => {
  return (
    <ThemeProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fff' }}>
        {/* 헤더 */}
        <Header />

        <main style={{ flex: 1 }}>
          <Outlet />
        </main>

        {/* 푸터 */}
        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default LandingLayout;
