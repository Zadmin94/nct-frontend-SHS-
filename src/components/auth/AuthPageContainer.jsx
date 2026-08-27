// @ai_generated: 일반 인증 화면의 공통 배경·중앙 정렬·여백을 제공한다.
const AuthPageContainer = ({ children, className = '' }) => {
  return (
    <section className={`flex flex-1 items-center justify-center bg-gray-50 px-4 py-10 ${className}`}>
      {children}
    </section>
  );
};

export default AuthPageContainer;
