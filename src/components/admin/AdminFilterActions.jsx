import { RotateCcw, Search } from 'lucide-react';

/** 담당자 7: 관리자 검색 영역의 조회·초기화 동작을 동일한 순서와 모양으로 제공합니다. */
const AdminFilterActions = ({ disabled = false, onReset }) => (
  <div className="admin-filter-actions">
    <button className="btn btn-primary" disabled={disabled} type="submit">
      <Search aria-hidden="true" />
      조회
    </button>
    <button className="btn btn-outline" disabled={disabled} onClick={onReset} type="button">
      <RotateCcw aria-hidden="true" />
      초기화
    </button>
  </div>
);

export default AdminFilterActions;
