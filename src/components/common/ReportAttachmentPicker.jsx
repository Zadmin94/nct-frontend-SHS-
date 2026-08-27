import AttachmentPicker from '@components/common/AttachmentPicker';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** 담당자 7 · F-COM-018: 일반 신고 폼과 상황별 신고 모달이 공유하는 첨부 선택기입니다. */
export default function ReportAttachmentPicker(props) {
  return (
    <AttachmentPicker
      {...props}
      accept="image/jpeg,image/png,image/webp,application/pdf"
      acceptedTypes={ACCEPTED_TYPES}
      description="이미지·PDF, 파일당 10MB, 최대 5개"
      inputAriaLabel="신고 첨부파일 선택"
      maxFileBytes={MAX_FILE_BYTES}
      maxFiles={MAX_FILES}
      selectButtonLabel="파일등록"
      title="첨부파일"
      typeErrorMessage="JPG, PNG, WEBP 이미지 또는 PDF 파일만 첨부할 수 있습니다."
    />
  );
}
