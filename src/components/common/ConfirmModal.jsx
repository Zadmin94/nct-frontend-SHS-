import FeedbackDialog from './FeedbackDialog';

// 담당자 7: 기존 호출 계약을 유지하면서 공통 소·중·대 선택 확인창으로 표시합니다.
const ConfirmModal = ({
  open,
  title,
  message,
  subMessage,
  onConfirm,
  onCancel,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'warning',
  confirmTone = 'danger',
  size = 'auto',
}) => (
  <FeedbackDialog
    cancelLabel={cancelLabel}
    confirmLabel={confirmLabel}
    confirmTone={confirmTone}
    description={title ? (subMessage ?? message) : subMessage}
    onCancel={onCancel}
    onConfirm={onConfirm}
    open={open}
    showCancelButton
    size={size}
    title={title ?? message}
    variant={variant}
  />
);
export default ConfirmModal;
