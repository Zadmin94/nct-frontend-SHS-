// 담당자 7: 알림 내용의 길이와 중요도에 따라 공통 소·중·대 크기를 결정합니다.
export const FEEDBACK_DIALOG_SIZES = ['sm', 'md', 'lg'];

export const resolveFeedbackDialogSize = ({
  size = 'auto',
  title = '',
  description = '',
  hasCancelButton = false,
} = {}) => {
  if (FEEDBACK_DIALOG_SIZES.includes(size)) return size;

  const titleLength = String(title).trim().length;
  const descriptionLength = String(description).trim().length;
  const totalLength = titleLength + descriptionLength;

  if (!hasCancelButton && descriptionLength === 0 && titleLength <= 32) return 'sm';
  if (descriptionLength > 90 || totalLength > 130) return 'lg';
  return 'md';
};
