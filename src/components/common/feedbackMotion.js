import { useCallback, useEffect, useRef, useState } from 'react';

export const FEEDBACK_EXIT_DURATION_MS = 180;

export const SWEET_ALERT_FEEDBACK_MOTION = Object.freeze({
  showClass: {
    popup: 'feedback-swal-in',
    backdrop: 'feedback-swal-backdrop-in',
  },
  hideClass: {
    popup: 'feedback-swal-out',
    backdrop: 'feedback-swal-backdrop-out',
  },
});

// 담당자 7: 모든 공통 피드백은 퇴장 애니메이션이 끝난 뒤 종료 콜백을 실행합니다.
export const useFeedbackExit = () => {
  const [isExiting, setIsExiting] = useState(false);
  const isExitingRef = useRef(false);
  const exitCallbackRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  const finishExit = useCallback(() => {
    if (!isExitingRef.current) return;

    window.clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
    isExitingRef.current = false;
    setIsExiting(false);

    const callback = exitCallbackRef.current;
    exitCallbackRef.current = null;
    callback?.();
  }, []);

  const beginExit = useCallback((onExited) => {
    if (isExitingRef.current) return;

    isExitingRef.current = true;
    exitCallbackRef.current = onExited;
    setIsExiting(true);
    fallbackTimerRef.current = window.setTimeout(
      finishExit,
      FEEDBACK_EXIT_DURATION_MS + 50,
    );
  }, [finishExit]);

  const handleExitAnimationEnd = useCallback((event) => {
    if (event.target !== event.currentTarget) return;
    finishExit();
  }, [finishExit]);

  useEffect(() => () => {
    window.clearTimeout(fallbackTimerRef.current);
  }, []);

  return {
    beginExit,
    handleExitAnimationEnd,
    isExiting,
  };
};
