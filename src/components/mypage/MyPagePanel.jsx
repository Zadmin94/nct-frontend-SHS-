export default function MyPagePanel({
  title,
  count,
  action,
  children,
  className = '',
  bodyClassName = 'px-6 pb-6',
  variant = 'home',
  headerPaddingClassName = 'px-5',
  titleClassName = '',
}) {
  const isProfile = variant === 'profile';

  return (
    <section
      className={`overflow-hidden border border-[#e4e9f2] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${
        isProfile ? 'rounded-[20px]' : 'rounded-[15px]'
      } ${className}`}
    >
      <header className={`flex h-[60px] items-end justify-between gap-4 border-b border-[#e8e9ec] bg-[#f5f7fc] pb-3 ${headerPaddingClassName}`}>
        <h3 className={`m-0 min-w-0 font-bold ${isProfile ? 'text-[17px] text-[#404040]' : 'text-[18px] text-[#1a1a1a]'} ${titleClassName}`}>
          {title}
          {count != null && (
            <span className="ml-2 text-[15px] font-bold text-[#0064ff]">
              {count}건
            </span>
          )}
        </h3>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
