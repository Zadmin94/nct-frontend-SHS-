import { Camera, FileText, Image as ImageIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ActionButton, StatusBadge } from '@components/common/ui';

function RawImagePreview({ file, name }) {
  const [previewUrl] = useState(() => URL.createObjectURL(file));

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  return (
    <img
      alt={name}
      className="h-full w-full object-cover"
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      src={previewUrl}
      style={{ WebkitUserDrag: 'none', userSelect: 'none' }}
    />
  );
}

const getSourceFile = (item) => (
  item instanceof File
    ? item
    : item?.file instanceof File
      ? item.file
      : null
);

const getFileFingerprint = (item) => {
  const file = getSourceFile(item);
  if (!file) return null;
  return [file.name, file.size, file.type, file.lastModified].join('\u0000');
};

const hasFilePayload = (dataTransfer) => (
  Array.from(dataTransfer?.types ?? []).includes('Files')
);

function AttachmentPreview({ file, getPreviewUrl, index, representativeEnabled }) {
  const name = file.name ?? `첨부파일 ${index + 1}`;
  const explicitUrl = getPreviewUrl?.(file);
  const isImage = file.type?.startsWith('image/') || Boolean(explicitUrl);

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-[#e2e1dc] bg-[#fafaf8]">
      {explicitUrl ? (
        <img
          alt={name}
          className="h-full w-full object-cover"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          src={explicitUrl}
          style={{ WebkitUserDrag: 'none', userSelect: 'none' }}
        />
      ) : isImage && file instanceof File ? (
        <RawImagePreview file={file} key={`${file.name}-${file.size}-${file.lastModified}`} name={name} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
          <FileText aria-hidden="true" className="text-primary" size={28} />
          <span className="line-clamp-2 max-w-full break-all text-[12px] text-[#5f5e5a]">{name}</span>
        </div>
      )}

      {representativeEnabled && index === 0 && (
        <StatusBadge className="absolute left-2 top-2" tone="info" variant="solid">
          대표
        </StatusBadge>
      )}
    </div>
  );
}

/** 담당자 7 · 공통 첨부 UI: 상품·서비스·포트폴리오·신고에 동일한 5칸 슬롯을 제공합니다. */
export default function AttachmentPicker({
  accept,
  acceptedTypes,
  compact = false,
  description,
  error,
  files,
  getPreviewUrl,
  inputAriaLabel = '첨부파일 선택',
  maxFileBytes = 10 * 1024 * 1024,
  maxFiles = 5,
  onChange,
  onError,
  onSetRepresentative,
  required = false,
  selectButtonLabel = '파일등록',
  sizeErrorMessage = '파일은 10MB 이하만 첨부할 수 있습니다.',
  title = '첨부파일',
  typeErrorMessage = '지원하는 형식의 파일만 첨부할 수 있습니다.',
}) {
  const inputRef = useRef(null);
  const [representativeMode, setRepresentativeMode] = useState(false);
  const allowedTypes = new Set(acceptedTypes ?? []);
  const representativeEnabled = typeof onSetRepresentative === 'function';

  const addFiles = (fileList) => {
    const candidates = Array.from(fileList ?? []).filter((file) => file instanceof File);
    if (candidates.length === 0) return;
    const knownFingerprints = new Set(files.map(getFileFingerprint).filter(Boolean));
    const incomingFingerprints = new Set();
    const hasDuplicate = candidates.some((file) => {
      const fingerprint = getFileFingerprint(file);
      if (!fingerprint) return false;
      if (knownFingerprints.has(fingerprint) || incomingFingerprints.has(fingerprint)) return true;
      incomingFingerprints.add(fingerprint);
      return false;
    });
    if (hasDuplicate) {
      onError?.('이미 첨부된 파일은 다시 추가할 수 없습니다.');
      return;
    }
    if (files.length + candidates.length > maxFiles) {
      onError?.(`첨부파일은 최대 ${maxFiles}개까지 선택할 수 있습니다.`);
      return;
    }
    if (allowedTypes.size > 0 && candidates.some((file) => !allowedTypes.has(file.type))) {
      onError?.(typeErrorMessage);
      return;
    }
    if (candidates.some((file) => file.size > maxFileBytes)) {
      onError?.(sizeErrorMessage);
      return;
    }

    onError?.('');
    onChange([...files, ...candidates]);
  };

  const removeFile = (index) => {
    onError?.('');
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
    if (files.length === 1) setRepresentativeMode(false);
  };

  const selectRepresentative = (index) => {
    if (!representativeMode || index === 0) return;
    onSetRepresentative(index);
    setRepresentativeMode(false);
  };

  return (
    <section
      className={`rounded-lg border border-dashed border-[#e2e1dc] bg-white ${compact ? 'p-4' : 'p-5'}`}
      onDragOver={(event) => {
        if (hasFilePayload(event.dataTransfer)) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!hasFilePayload(event.dataTransfer)) return;
        event.preventDefault();
        addFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[15px] font-bold text-[#1a1a18]">
            {title}{required && <span className="text-red-500"> *</span>}
          </p>
          <p className="mt-1 mb-0 text-[13px] text-[#777]">
            {representativeMode
              ? '대표로 지정할 이미지를 선택해 주세요.'
              : `${description} (${files.length}/${maxFiles})`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {representativeEnabled && (
            <ActionButton
              disabled={files.length === 0}
              onClick={() => setRepresentativeMode((current) => !current)}
              size="sm"
              tone={representativeMode ? 'primary' : 'outline'}
            >
              <ImageIcon aria-hidden="true" size={15} />
              대표이미지로 지정
            </ActionButton>
          )}
          <ActionButton
            disabled={files.length >= maxFiles}
            onClick={() => inputRef.current?.click()}
            size="sm"
            tone="outline"
          >
            <Camera aria-hidden="true" size={15} />
            {selectButtonLabel}
          </ActionButton>
        </div>
      </div>

      <input
        ref={inputRef}
        accept={accept}
        aria-label={inputAriaLabel}
        hidden
        multiple
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
        type="file"
      />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {files.map((file, index) => (
          <div
            className="relative"
            key={file.id ?? `${file.name}-${file.size}-${index}`}
            onDragStart={(event) => event.preventDefault()}
          >
            <div
              className={representativeMode && index > 0
                ? 'cursor-pointer rounded-lg ring-2 ring-primary ring-offset-2'
                : ''}
              onClick={() => selectRepresentative(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') selectRepresentative(index);
              }}
              role={representativeMode && index > 0 ? 'button' : undefined}
              tabIndex={representativeMode && index > 0 ? 0 : undefined}
            >
              <AttachmentPreview
                file={file}
                getPreviewUrl={getPreviewUrl}
                index={index}
                representativeEnabled={representativeEnabled}
              />
            </div>
            <button
              aria-label={`${file.name ?? `첨부파일 ${index + 1}`} 삭제`}
              className="absolute -right-1.5 -top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-[#1a1a18] text-white shadow-sm hover:bg-black"
              onClick={(event) => {
                event.stopPropagation();
                removeFile(index);
              }}
              title="삭제"
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        ))}

        {Array.from({ length: Math.max(0, maxFiles - files.length) }, (_, index) => (
          <button
            aria-label={`${files.length + index + 1}번째 첨부파일 추가`}
            className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-[#d8d6cf] bg-[#fafaf8] text-2xl text-[#bbb] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            key={`empty-${index}`}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            +
          </button>
        ))}
      </div>

      {error && <p className="mt-2 mb-0 text-[13px] text-red-500">{error}</p>}
    </section>
  );
}
