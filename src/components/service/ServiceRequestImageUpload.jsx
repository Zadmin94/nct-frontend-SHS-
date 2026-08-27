import { useState } from 'react';
import ImageAttachmentPicker from '@components/common/ImageAttachmentPicker';

// 백엔드 FileStorageService의 service-request 카테고리는 gif도 허용하므로(FileStorageService.java)
// 공통 컴포넌트의 기본 허용 타입(jpg/png/webp)에 gif를 더해 넘긴다.
const EXTRA_TYPES = ['image/gif'];

/** 담당자 7 · F-SVC-001: 견적 요청 이미지를 공통 5칸 첨부 UI로 제공합니다. */
export default function ServiceRequestImageUpload({ images, onChange, maxImages = 5 }) {
  const [error, setError] = useState('');
  return (
    <ImageAttachmentPicker
      compact
      description="사진을 첨부하면 더 정확한 견적을 받을 수 있어요."
      error={error}
      extraTypes={EXTRA_TYPES}
      images={images}
      inputAriaLabel="견적 요청 사진 선택"
      maxImages={maxImages}
      onChange={onChange}
      onError={setError}
      title="요청 사진"
    />
  );
}
