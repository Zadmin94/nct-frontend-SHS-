// @ai_generated: 인증 입력 화면의 공통 헤더·본문·푸터 조립을 담당한다.
import { Outlet } from 'react-router-dom';
import Header from '@layouts/user/headers/Header';
import Footer from '@layouts/user/footers/Footer';

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AuthLayout;
