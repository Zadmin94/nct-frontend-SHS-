import './AdminPageHeader.css';

// 관리자 화면의 제목과 우측 작업 영역을 동일한 규격으로 제공하는 공통 헤더입니다.
const AdminPageHeader = ({ title, action }) => (
  <section className="admin-page-header">
    <div>
      <h1>{title}</h1>
    </div>
    {action && <div className="admin-page-header__action">{action}</div>}
  </section>
);

export default AdminPageHeader;
