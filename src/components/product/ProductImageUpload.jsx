import { useState } from 'react';
import ImageAttachmentPicker from '@components/common/ImageAttachmentPicker';

// 백엔드 FileStorageService의 product 카테고리는 gif도 허용하므로(FileStorageService.java)
// 공통 컴포넌트의 기본 허용 타입(jpg/png/webp)에 gif를 더해 넘긴다.
const EXTRA_TYPES = ['image/gif'];

/** 담당자 7 · F-AUC-002: 상품 이미지 입력을 공통 5칸 첨부 UI로 제공합니다. */
export default function ProductImageUpload({ images, onChange, maxImages = 5 }) {
  const [error, setError] = useState('');
  return (
    <ImageAttachmentPicker
      error={error}
      extraTypes={EXTRA_TYPES}
      images={images}
      inputAriaLabel="상품 사진 선택"
      maxImages={maxImages}
      onChange={onChange}
      onError={setError}
      required
      title="상품 사진"
    />
  );
}
