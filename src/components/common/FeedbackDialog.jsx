import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import { normalizeFeedbackText } from '@utils/common';
import { resolveFeedbackDialogSize } from './feedbackDialogConfig';
import { useFeedbackExit } from './feedbackMotion';

const ICONS = {
  success: CircleCheck,
  warning: CircleAlert,
  error: CircleX,
  info: Info,
};

const CONFIRM_BUTTON_CLASSES = {
  primary: 'btn-primary',
  danger: 'btn-danger',
  dark: 'btn-dark',
};

/**
 * 담당자 7: 확인 알림과 선택 확인창을 5번 시안의 한 디자인으로 보여 주는 공통 모달입니다.
 * 내용에 따라 자동으로 소·중·대 크기를 고르며 size="sm|md|lg"로 명시할 수도 있습니다.
 */
export default function FeedbackDialog({
  open,
  title,
  description,
  variant = 'info',
  size = 'auto',
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  showCancelButton = false,
  confirmTone = 'primary',
}) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmButtonRef = useRef(null);
  const { beginExit, handleExitAnimationEnd, isExiting } = useFeedbackExit();
  // onConfirm/onCancel은 호출부에서 매 렌더링마다 새로 만들어지는 인라인 함수인 경우가 많다.
  // 아래 포커스 관리 effect가 이 값들을 의존성으로 들고 있으면, 모달이 열려 있는 동안 부모가
  // 리렌더링될 때마다 effect가 정리→재실행되면서 포커스가 뒤 화면↔확인 버튼 사이를 왔다갔다
  // 한다 — ref에 최신 값만 담아두고 effect는 open 변화에만 반응하게 분리한다.
  const handlersRef = useRef({ onConfirm, onCancel });
  useEffect(() => {
    handlersRef.current = { onConfirm, onCancel };
  });
  const normalizedTitle = normalizeFeedbackText(title);
  const normalizedDescription = normalizeFeedbackText(description);
  const resolvedSize = resolveFeedbackDialogSize({
    size,
    title: normalizedTitle,
    description: normalizedDescription,
    hasCancelButton: showCancelButton,
  });
  const Icon = ICONS[variant] ?? ICONS.info;
  const confirmButtonClass = CONFIRM_BUTTON_CLASSES[confirmTone]
    ?? CONFIRM_BUTTON_CLASSES.primary;

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const focusFrame = window.requestAnimationFrame(() => confirmButtonRef.current?.focus({ preventScroll: true }));
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      beginExit(handlersRef.current.onCancel ?? handlersRef.current.onConfirm);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      // preventScroll 없이 포커스를 되돌리면, 검증 실패 시 특정 입력 필드로 스크롤시켜둔 페이지가
      // "열기 전 포커스였던 하단 제출 버튼"으로 다시 스크롤되며 방금 한 스크롤을 덮어써버린다
      // (ProductRegisterPage 등 검증+scrollIntoView 패턴 다수 존재) — 포커스만 복원하고 스크롤은 건드리지 않는다.
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [beginExit, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`feedback-dialog__overlay${isExiting ? ' feedback-dialog__overlay--leaving' : ''}`}
      onAnimationEnd={handleExitAnimationEnd}
    >
      <section
        aria-describedby={normalizedDescription ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`feedback-dialog feedback-dialog--${resolvedSize} feedback-dialog--${variant}${isExiting ? ' feedback-dialog--leaving' : ''}`}
        role="alertdialog"
      >
        <div className="feedback-dialog__icon" aria-hidden="true">
          <Icon />
        </div>
        <h2 className="feedback-dialog__title" id={titleId}>{normalizedTitle}</h2>
        {normalizedDescription ? (
          <p className="feedback-dialog__description" id={descriptionId}>{normalizedDescription}</p>
        ) : null}
        <div className="feedback-dialog__actions">
          {showCancelButton ? (
            <button
              className="btn btn-ghost feedback-dialog__button"
              disabled={isExiting}
              onClick={() => beginExit(onCancel)}
              type="button"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            className={`btn ${confirmButtonClass} feedback-dialog__button`}
            disabled={isExiting}
            onClick={() => beginExit(onConfirm)}
            ref={confirmButtonRef}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
