// @ai_generated
import { useLocation, useNavigate } from 'react-router-dom';
import { ActionButton } from '@components/common/ui';

const ERROR_MESSAGES = {
  401: '로그인이 만료되었거나 로그인이 필요합니다.',
  403: '이 화면에 접근할 권한이 없습니다.',
  404: '요청한 거래 또는 리뷰 정보를 찾을 수 없습니다.',
};

export default function AsyncRouteError({ error, onRetry, compact = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const status = error?.response?.status ?? error?.status;
  const message = ERROR_MESSAGES[status]
    ?? (error?.response ? '정보를 불러오는 중 오류가 발생했습니다.' : '네트워크 연결을 확인해 주세요.');

  return (
    <div className={compact ? 'mt-5 border-t border-[#ebebeb] pt-5' : 'container py-16 text-center'}>
      <p className="text-[#c62828]">{message}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {status === 401 && (
          <ActionButton
            // @ai_generated (담당자1, 2026-08-07): LoginPage는 from을 location 객체로 읽는다
            // (Header.jsx, ServiceRequestDetailPage.jsx와 동일 계약). 문자열을 넘기면
            // returnLocation?.pathname이 없어 로그인 후 항상 홈으로 튕겼다.
            onClick={() => navigate('/login', { state: { from: location } })}
          >
            로그인
          </ActionButton>
        )}
        {onRetry && (
          <ActionButton onClick={onRetry} tone="outline">
            다시 시도
          </ActionButton>
        )}
      </div>
    </div>
  );
}
