// src/components/common/Toast.jsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import { normalizeFeedbackText } from '@utils/common';
import { useFeedbackExit } from './feedbackMotion';

const ICONS = {
  success: CircleCheck,
  warning: CircleAlert,
  error: CircleX,
  info: Info,
};

const ToastItem = ({ message, duration, onClose, variant }) => {
  const [rendered, setRendered] = useState(true);
  const closeRef = useRef(onClose);
  const { beginExit, handleExitAnimationEnd, isExiting } = useFeedbackExit();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      beginExit(() => {
        setRendered(false);
        closeRef.current?.();
      });
    }, duration);
    return () => clearTimeout(timer);
  }, [beginExit, duration, message]);

  if (!rendered || !message || typeof document === 'undefined') return null;

  const Icon = ICONS[variant] ?? ICONS.info;
  const normalizedMessage = normalizeFeedbackText(message);
  return createPortal(
    <div
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`feedback-toast feedback-toast--${variant}${isExiting ? ' feedback-toast--leaving' : ''}`}
      onAnimationEnd={handleExitAnimationEnd}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span className="feedback-toast__icon" aria-hidden="true"><Icon /></span>
      <span className="feedback-toast__message">{normalizedMessage}</span>
    </div>,
    document.body,
  );
};

// 담당자 7: 짧은 비차단 알림은 공통 알림의 소형 카드 형태로 자동 종료합니다.
const Toast = ({ message, duration = 1800, onClose, variant = 'info' }) => (
  <ToastItem
    duration={duration}
    key={`${variant}:${message}`}
    message={message}
    onClose={onClose}
    variant={variant}
  />
);

export default Toast;
