import { memo, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
  resolveDescriptionImagesForDisplay,
  SANITIZE_OPTS,
} from '@components/product/richTextEditorImages';

const TempComment = ({ content = '' }) => {
  const normalizedContent = typeof content === 'string' ? content : '';
  const displayContent = useMemo(
    () => resolveDescriptionImagesForDisplay(normalizedContent),
    [normalizedContent],
  );
  const sanitizedContent = useMemo(
    () => DOMPurify.sanitize(displayContent, SANITIZE_OPTS),
    [displayContent],
  );

  return (
    <div
      className="mt-8 min-h-[160px] bg-[#f8f9fb] px-5 py-6 max-sm:min-h-32 max-sm:px-4 max-sm:py-5"
      aria-label="상품 상세 내용"
    >
      {sanitizedContent.trim() ? (
        <div
          className="min-w-0 whitespace-pre-wrap break-words text-body-sm text-[#1d1d1f] md:text-body-md [&_div]:my-3 [&_img]:my-5 [&_img]:block [&_img]:h-auto [&_img]:max-w-full [&_img]:object-contain [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      ) : (
        <p className="m-0 text-body-sm text-[#777] md:text-body-md">등록된 상품 설명이 없습니다.</p>
      )}
    </div>
  );
};

export default memo(TempComment);
