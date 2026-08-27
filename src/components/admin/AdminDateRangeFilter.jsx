/** 담당자 7 · 관리자 목록 공통: 시작일·종료일을 하나의 날짜 범위 필터로 표시합니다. */
const AdminDateRangeFilter = ({
  fromValue,
  onFromChange,
  onToChange,
  toValue,
}) => (
  <fieldset className="admin-date-range-filter">
    <legend>등록일</legend>
    <div className="admin-date-range-filter__controls">
      <input
        aria-label="등록 시작일"
        onChange={(event) => onFromChange(event.target.value)}
        type="date"
        value={fromValue}
      />
      <span aria-hidden="true">~</span>
      <input
        aria-label="등록 종료일"
        onChange={(event) => onToChange(event.target.value)}
        type="date"
        value={toValue}
      />
    </div>
  </fieldset>
);

export default AdminDateRangeFilter;
