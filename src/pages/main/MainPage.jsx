// src/pages/main/MainPage.jsx
import { useParams } from 'react-router-dom';

const MainPage = () => {
  const { region } = useParams();
  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <h1>{region} 지역 메인</h1>
      <p style={{ color: '#888' }}>구현 예정입니다.</p>
    </div>
  );
};
export default MainPage;
