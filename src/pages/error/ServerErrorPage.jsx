// src/pages/error/ServerErrorPage.jsx
import { ActionButton } from '@components/common/ui';

const ServerErrorPage = () => (
  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
    <h1 style={{ fontSize: '80px', margin: 0, color: '#e2e1dc' }}>500</h1>
    <h2 style={{ fontSize: '24px', marginTop: '16px' }}>서버 오류가 발생했습니다</h2>
    <p style={{ color: '#888', marginTop: '8px' }}>잠시 후 다시 시도해 주세요.</p>
    <ActionButton to="/" style={{ marginTop: '24px' }}>
      홈으로 돌아가기
    </ActionButton>
  </div>
);

export default ServerErrorPage;
