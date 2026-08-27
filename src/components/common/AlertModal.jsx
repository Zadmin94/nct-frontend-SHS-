import FeedbackDialog from './FeedbackDialog';

// 담당자 7: 기존 호출 계약을 유지하면서 공통 5번 시안의 결과 알림으로 표시합니다.
const AlertModal = ({
  open,
  title,
  message,
  description,
  onClose,
  confirmLabel = '확인',
  variant = 'info',
  size = 'auto',
}) => (
  <FeedbackDialog
    confirmLabel={confirmLabel}
    description={title ? (description ?? message) : description}
    onConfirm={onClose}
    open={open}
    size={size}
    title={title ?? message}
    variant={variant}
  />
);
export default AlertModal;
