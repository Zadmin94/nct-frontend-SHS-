// src/components/common/ErrorMessage.jsx
// 임시 공통 컴포넌트 — 에러 메시지 표시 박스 (추후 디자인 시스템 기준으로 교체)
const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-base font-semibold">
      {message}
    </div>
  );
};
export default ErrorMessage;
