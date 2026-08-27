// 담당자 7: 일반·제공자 마이페이지 홈의 상단 프로필과 요약 카드 규격을 공유한다.
// 화면별 데이터와 버튼 동작만 props로 받고 레이아웃과 스타일은 이 파일에서 한 번만 관리한다.
import { assets } from '@components/mypage/assets';
import { ActionButton } from '@components/common/ui';
import { Link } from 'react-router-dom';

export function MyPageDashboardTop({
  profileImageUrl,
  nickname,
  email,
  profilePath,
  actions = [],
  className = '',
}) {
  return (
    <section
      className={`flex items-center ${className}`}
      aria-label="마이페이지 회원 요약"
    >
      <div className="flex shrink-0 items-center gap-5">
        {/* @ai_generated (담당자1, 2026-08-14): 프로필 요약에서 공통 프로필 설정으로 이동한다. */}
        <Link
          to={profilePath}
          className="size-[72px] shrink-0 overflow-hidden rounded-full bg-[#e6f0ff] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0064ff]"
          aria-label="프로필 설정으로 이동"
        >
          <img
            src={profileImageUrl || assets.profile}
            alt=""
            className="size-full object-cover"
          />
        </Link>
        <div>
          <Link
            to={profilePath}
            className="block rounded-sm transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0064ff]"
            aria-label={`${nickname}님의 프로필 설정으로 이동`}
          >
            <p className="flex items-center gap-1.5 text-[16px] font-bold text-[#4e4e4e]">
              <span className="inline-block size-2 rounded-full bg-[#2ecc71]" aria-hidden="true" />
              {nickname}님
            </p>
            <p className="mt-0.5 min-h-5 text-[14px] text-[#969696]">{email}</p>
          </Link>
          <div className="mt-2 flex gap-2">
            {actions.map((action) => (
              <ActionButton
                key={action.key}
                onClick={action.onClick}
                size="sm"
                tone="neutral"
              >
                {action.icon && (
                  <img
                    src={action.icon}
                    alt=""
                    className={action.iconClassName || 'size-3'}
                  />
                )}
                {action.label}
              </ActionButton>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}

export function MyPageDashboardSummaryCards({ items, ariaLabel, columns = 4, className = '' }) {
  const columnClassName = columns === 3
    ? 'md:grid-cols-3 lg:grid-cols-3'
    : 'md:grid-cols-2 lg:grid-cols-4';

  return (
    <section
      className={`grid grid-cols-1 gap-5 ${columnClassName} ${className}`}
      aria-label={ariaLabel}
    >
      {items.map(({ key, ...item }) => (
        <MyPageDashboardSummaryCard key={key} {...item} />
      ))}
    </section>
  );
}

function MyPageDashboardSummaryCard({
  color,
  icon,
  label,
  value,
  unit,
  meta,
  onMore,
}) {
  return (
    <article
      className={`group relative flex h-[150px] flex-col justify-center rounded-[15px] p-5 text-white transition-transform md:mb-5 md:mt-5 ${onMore ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''}`}
      style={{ backgroundColor: color }}
    >
      {onMore && (
        <button
          type="button"
          className="absolute inset-0 z-0 cursor-pointer rounded-[15px] border-none bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0064ff]"
          onClick={onMore}
          aria-label={`${label} 상세 보기`}
        />
      )}
      <div className="pointer-events-none relative z-[1] mb-3 flex items-start gap-3">
        <img src={icon} alt="" className="mt-0.5 size-10 shrink-0 object-contain" />
        <div className="min-w-0 pl-4">
          <p className="text-[16px] font-bold leading-tight opacity-90">{label}</p>
          <p className="mt-0.5 text-[30px] font-bold leading-tight">{value}{unit}</p>
        </div>
      </div>
      {typeof meta === 'string' ? (
        <p className="pointer-events-none relative z-[1] truncate text-[16px] opacity-80">{meta}</p>
      ) : (
        <div className="relative z-10 text-[16px]">{meta}</div>
      )}
    </article>
  );
}
