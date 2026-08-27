// Claude Code 작성 (BJN, 2026-08-05)
// 환전/전환 제출 공통 로직 — 포인트지갑 페이지(PointWalletPage)와 헤더 POINT 드롭다운(Header)이
// 같은 흐름("검증 → 모달 닫기 → API 호출 → 포인트 캐시 갱신 → 결과 안내")을 각자 복사해 갖고 있어
// 문구·정책이 바뀔 때 두 파일을 같이 고쳐야 했다(2026-08-05 코드 점검에서 확인). 차이(API·문구)는
// SUBMIT_ACTIONS에, 공통 흐름은 submitPointAmount 하나에 모아 양쪽이 공유한다.
// 컴포넌트 파일에서 export하면 개발 중 화면 자동 새로고침(fast refresh) 경고가 생겨서
// quickAmounts.js와 같은 방식으로 별도 파일로 분리했다.
import { convertPoint, requestPointExchange } from '@api/pointApi';
import { notify } from '@utils/common';

/** axios 오류에서 백엔드 ApiResponse의 message를 꺼낸다 (없으면 일반 안내) */
export const errorMessage = (err) =>
  err?.response?.data?.message ?? '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

/**
 * 환전/전환 제출 설정 — 두 기능은 구조가 완전히 같고 API와 문구만 달라서 차이만 여기 모았다
 * (환전 F-PAY-012: 신청 즉시 차감·관리자 수동 지급 / 전환 F-PAY-010: 분쟁 없을 때만 서버가 허용)
 */
export const SUBMIT_ACTIONS = {
  exchange: {
    api: requestPointExchange,
    invalidText: '환전 금액은 1P 이상의 정수만 가능합니다.',
    successTitle: '환전 신청 완료',
    successText: '신청 금액이 차감되었고, 등록하신 계좌로 며칠 내 지급될 예정입니다.',
    failTitle: '환전 신청 실패',
  },
  convert: {
    api: convertPoint,
    invalidText: '전환 금액은 1P 이상의 정수만 가능합니다.',
    successTitle: '전환 완료',
    successText: '정산 가능 포인트가 사용 가능 포인트로 전환되었습니다.',
    failTitle: '전환 실패',
  },
};

/**
 * 환전/전환 공통 제출 흐름 — 검증(1P 이상 정수) → 모달 닫기 → API 호출 → 포인트 캐시 갱신 → 결과 안내.
 * 서버가 검증(계좌·잔액·분쟁)을 전부 하므로 프론트는 정수 확인만 하고 실패 사유는 서버 응답을 그대로 안내한다.
 *
 * @param {'exchange'|'convert'} kind 어느 기능인지 — SUBMIT_ACTIONS의 API·문구를 갈아끼운다
 * @param {number} amount 제출 금액
 * @param {object} deps 호출하는 화면이 넘겨주는 의존성
 * @param {import('@tanstack/react-query').QueryClient} deps.queryClient 포인트 캐시(['point']) 갱신용
 * @param {() => void} deps.closeModal 금액 입력 모달 닫기 콜백
 */
export const submitPointAmount = (kind, amount, { queryClient, closeModal }) => {
  const action = SUBMIT_ACTIONS[kind];
  if (!Number.isInteger(amount) || amount <= 0) {
    notify({
      icon: 'warning',
      title: '금액을 확인해 주세요',
      text: action.invalidText,
    });
    return;
  }
  closeModal();
  action.api(amount)
    .then(() => {
      // 잔액·원장·내역이 전부 바뀌므로 포인트 캐시 전체 갱신
      queryClient.invalidateQueries({ queryKey: ['point'] });
      notify({
        icon: 'success',
        title: action.successTitle,
        text: action.successText,
      });
    })
    .catch((err) => {
      // 계좌 미등록·잔액 부족·분쟁 진행 중 등 서버가 알려준 사유를 그대로 안내
      notify({
        icon: 'error',
        title: action.failTitle,
        text: errorMessage(err),
      });
    });
};
