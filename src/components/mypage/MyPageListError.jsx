import { ActionButton } from '@components/common/ui';

export default function MyPageListError({ message, onRetry, retryIcon }) {
  return (
    <div
      className="flex min-h-[220px] flex-col items-center justify-center gap-[9px] rounded-lg border border-[#e9edf4] bg-white px-6 py-10 text-center"
      role="alert"
    >
      <strong className="text-[#344054]">{message}</strong>
      {onRetry && (
        <ActionButton
          className="mt-2 min-h-[38px] rounded-lg px-3.5 text-[15px]"
          onClick={onRetry}
          preserveSize
          tone="outline"
        >
          {retryIcon}
          다시 시도
        </ActionButton>
      )}
    </div>
  );
}
