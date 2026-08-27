// @ai_generated
// 마이페이지 각 섹션의 제목과 선택적 우측 액션을 같은 레이아웃으로 표시한다.
const MyPageContentHeader = ({ title, actions }) => (
    <div className="flex items-start justify-between gap-4 mb-5">
    <h1
      className="text-gray-900 m-0"
      style={{
        fontSize: 30,
        fontWeight: 700,
        lineHeight: '36px',
        letterSpacing: 0,
      }}
    >
      {title}
    </h1>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

export default MyPageContentHeader;
