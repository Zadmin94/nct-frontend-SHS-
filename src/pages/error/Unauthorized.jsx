// src/pages/error/Unauthorized.jsx
import { ActionButton } from '@components/common/ui';

const Unauthorized = () => (
  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
    <h1 style={{ fontSize: '80px', margin: 0, color: '#e2e1dc' }}>403</h1>
    <h2 style={{ fontSize: '24px', marginTop: '16px' }}>접근 권한이 없습니다</h2>
    <p style={{ color: '#888', marginTop: '8px' }}>해당 페이지에 접근할 수 있는 권한이 없습니다.</p>
    <ActionButton to="/" style={{ marginTop: '24px' }}>
      홈으로 돌아가기
    </ActionButton>
  </div>
);

export default Unauthorized;
