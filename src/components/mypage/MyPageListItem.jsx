import { Link } from 'react-router-dom';

export default function MyPageListItem({
  imageSrc,
  imageAlt = '',
  imageFallback,
  badge,
  title,
  children,
  actions,
  to,
  onImageClick,
  state,
}) {
  const ImageContainer = onImageClick ? 'button' : 'div';
  const content = (
    <article className="flex flex-col gap-5 rounded-xl border border-[#dce2ed] bg-white p-5 transition-all hover:border-[#c9d9ff] hover:shadow-[0_12px_28px_rgba(20,38,79,0.09)] sm:h-[160px] sm:flex-row sm:items-center">
      <ImageContainer
        {...(onImageClick ? { type: 'button', onClick: onImageClick, 'aria-label': `${imageAlt || title} 상세보기` } : {})}
        className={`mx-auto flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#dce6ff] bg-[#f2f6ff] p-0 text-xs font-bold text-[#4b6cae] sm:mx-0 ${onImageClick ? 'cursor-pointer' : ''}`}
      >
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
        ) : (
          imageFallback
        )}
      </ImageContainer>

      <div className="min-w-0 flex-1">
        {badge && (
          <div className="mb-2 flex h-6 items-center gap-2 overflow-hidden whitespace-nowrap">
            {badge}
          </div>
        )}
        {title && (
          <h2 className="m-0 truncate text-lg leading-6 font-bold text-[#151923]">{title}</h2>
        )}
        {children && (
          <div className="mt-2 grid max-h-11 gap-1 overflow-hidden text-sm leading-5 text-[#667085] [&_p]:m-0 [&_p]:text-sm [&_p]:leading-5">
            {children}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </article>
  );

  return to ? (
    <Link className="block text-inherit no-underline" state={state} to={to}>
      {content}
    </Link>
  ) : content;
}
