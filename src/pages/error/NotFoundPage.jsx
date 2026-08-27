// src/pages/error/NotFoundPage.jsx
import { ActionButton } from '@components/common/ui';

const NotFoundPage = () => (
  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
    <h1 style={{ fontSize: '80px', margin: 0, color: '#e2e1dc' }}>404</h1>
    <h2 style={{ fontSize: '24px', marginTop: '16px' }}>페이지를 찾을 수 없습니다</h2>
    <p style={{ color: '#888', marginTop: '8px' }}>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
    <ActionButton to="/" style={{ marginTop: '24px' }}>
      홈으로 돌아가기
    </ActionButton>
  </div>
);

export default NotFoundPage;
