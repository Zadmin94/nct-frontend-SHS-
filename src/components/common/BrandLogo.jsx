import temporaryLogo from '@assets/images/negocut-logo-temp.png';
import './BrandLogo.css';

/**
 * 확정 로고가 도착하기 전까지 공통으로 사용하는 에누리컷 임시 브랜드다.
 * 원본 이미지는 보존하고, 여백이 큰 정사각형 이미지의 심볼 영역만 CSS로 잘라 표시한다.
 */
const BrandLogo = ({ admin = false, className = '' }) => (
  <span className={`brand-logo${admin ? ' brand-logo--admin' : ''}${className ? ` ${className}` : ''}`}>
    <span className="brand-logo__mark" aria-hidden="true">
      <img alt="" src={temporaryLogo} />
    </span>
    <span className="brand-logo__name">
      에누리컷
      {admin && <small>Admin</small>}
    </span>
  </span>
);

export default BrandLogo;
