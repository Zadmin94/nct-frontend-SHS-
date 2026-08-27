// 마이페이지 목록 5종 공통 모바일 카드 틀. 관심 경매에서 쓰던 AuctionCard(경매 도메인 전용)와
// 같은 시각 언어(상단 이미지, 제목+코너 배지, 강조 가격, 2열 정보 박스, 하단 메타 줄)를
// 다른 도메인(구매/판매 내역, 견적 요청)에도 유지하기 위한 틀 — AuctionCard.jsx 구조를 그대로 이식.
import { ImageIcon } from 'lucide-react';

const MyPageMobileCard = ({
  imageSrc,
  imageAlt,
  imageFallbackLabel = '이미지 없음',
  badge,
  title,
  price,
  priceSuffix,
  priceItems = [],
  infoItems = [],
  footerLeft,
  footerRight,
  actionButton,
}) => (
  <article className="flex w-full flex-col overflow-hidden rounded-lg border border-[#f0efec] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]">
    <div className="flex h-[180px] items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#e8f0fe,#f8f8f6)] text-[#5f5e5a]">
      {imageSrc ? (
        <img className="block size-full object-cover" src={imageSrc} alt={imageAlt || title} />
      ) : (
        <span className="inline-flex size-20 items-center justify-center rounded-full bg-white/60 text-center text-sm font-extrabold">
          <ImageIcon className="mr-1.5" size={16} aria-hidden="true" />
          {imageFallbackLabel}
        </span>
      )}
    </div>

    <div className="mt-3 mb-3 flex items-start justify-between gap-3">
      <strong className="min-w-0 overflow-hidden text-base font-bold text-[#1a1a18] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        {title}
      </strong>
      {badge && <div className="shrink-0">{badge}</div>}
    </div>

    {/* @ai_generated 복수 가격은 구매·판매 목록이 명시적으로 전달할 때만 사용하며 기존 가격 경로는 보존한다. */}
    {priceItems.length > 0 ? (
      <dl className="mt-2 flex min-w-0 flex-wrap gap-x-5 gap-y-2">
        {priceItems.map(({ label, value }) => (
          <div className="min-w-0" key={label}>
            <dt className="mb-0.5 text-xs font-semibold text-[#85847f]">{label}</dt>
            <dd className="m-0 whitespace-nowrap text-xl font-extrabold text-primary-dark">{value}</dd>
          </div>
        ))}
      </dl>
    ) : price ? (
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong className="whitespace-nowrap text-xl font-extrabold text-primary-dark">{price}</strong>
        {priceSuffix && (
          <span className="whitespace-nowrap text-xs font-semibold text-[#85847f]">{priceSuffix}</span>
        )}
      </div>
    ) : null}

    {infoItems.length > 0 && (
      <dl className="mt-2 mb-3.5 grid grid-cols-2 gap-2 text-xs text-[#5f5e5a]">
        {infoItems.map(({ icon: Icon, label, value }) => (
          <div className="min-w-0 rounded-lg bg-[#f8f8f6] px-2.5 py-2" key={label}>
            <dt className="mb-1 flex items-center gap-1 text-xs font-bold text-[#85847f]">
              {Icon && <Icon size={13} aria-hidden="true" />}
              {label}
            </dt>
            <dd className="m-0 truncate font-semibold text-[#3f3f3c]">{value}</dd>
          </div>
        ))}
      </dl>
    )}

    {(footerLeft || footerRight) && (
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#f0efec] pt-3.5">
        {footerLeft && <span className="truncate text-[14px] font-semibold text-[#5f5e5a]">{footerLeft}</span>}
        {footerRight && <span className="shrink-0 text-xs font-semibold text-[#5f5e5a]">{footerRight}</span>}
      </div>
    )}

    {actionButton && <div className="mt-4 grid gap-2 [&_.btn]:w-full [&_.ui-action-button]:w-full">{actionButton}</div>}
  </article>
);

export default MyPageMobileCard;
