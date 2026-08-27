// @ai_generated: 인증 화면의 기본 카드 외형을 제공하고 화면별 폭·정렬 클래스 확장을 허용한다.
const AuthCard = ({ children, className = '' }) => {
  return (
    <div className={`w-full rounded-2xl bg-white px-8 py-10 shadow-lg ${className}`}>
      {children}
    </div>
  );
};

export default AuthCard;
