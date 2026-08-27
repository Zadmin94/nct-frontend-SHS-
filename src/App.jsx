// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 앱 진입점 — BrowserRouter(라우터), HelmetProvider(페이지 title 관리),
//             전역 스타일(App.css · common.css) 적용
// 전역 상태(user, config)는 ConfigContext 대신
// useConfig / useAuth (TanStack Query 기반)로 관리합니다.
// ─────────────────────────────────────────────────────────────────────────────
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import AppRoutes from '@routes/AppRoutes';
import ScrollToTopOnNavigation from '@components/common/ScrollToTopOnNavigation';
import './App.css';
import '@assets/css/common.css';
import '@components/common/FeedbackDialog.css';

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <title>에누리컷</title>
      </Helmet>
      <BrowserRouter>
        <ScrollToTopOnNavigation />
        <AppRoutes />
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
