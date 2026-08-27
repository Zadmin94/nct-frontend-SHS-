// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { getMyPagePath } from './myPageRoutes';

/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 * @param {string[]} allowedRoles - 허용할 역할 목록
 * @param {string} unauthenticatedTo - 비로그인 사용자를 보낼 로그인 경로
 */
const ProtectedRoute = ({ allowedRoles = [], unauthenticatedTo = '/login' }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 인증 정보 로딩 중
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 font-bold">
        인증 정보를 확인 중입니다...
      </div>
    );
  }

  // 비로그인 → 로그인 페이지로
  if (!isAuthenticated) {
    return <Navigate to={unauthenticatedTo} state={{ from: location }} replace />;
  }

  // @ai_generated CHG-032: 현재 DB ROLE과 정확히 일치하는 화면만 통과한다.
  // 역할 검사 - 백엔드 응답 필드: role (단수).
  if (allowedRoles.length > 0) {
    const currentRole = user?.role;
    const hasRole = allowedRoles.includes(currentRole);
    if (!hasRole) {
      // @ai_generated: (2026-08-12) ROLE_USER/ROLE_SERVICE는 사용자가 언제든 자유롭게 전환하는
      // "모드"일 뿐 진짜 접근 제한이 아니다 - 모드 전환 직후 이전 모드 화면이 열려 있던 탭에서
      // 흔히 발생하며, 양쪽 모드가 공통으로 접근 가능한 마이페이지로 조용히 보내는 편이 사용자
      // 경험상 자연스럽다. ROLE_ADMIN이 관련된 불일치(둘 중 하나라도 ADMIN)는 사용자가 스스로
      // 전환할 수 없는 진짜 권한 등급 문제라 기존 403 안내 화면(/unauthorized)을 그대로 유지한다.
      const isModeMismatch =
        !allowedRoles.includes('ROLE_ADMIN') &&
        currentRole !== 'ROLE_ADMIN' &&
        (currentRole === 'ROLE_USER' || currentRole === 'ROLE_SERVICE');
      if (isModeMismatch) {
        return <Navigate to={getMyPagePath()} replace />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
