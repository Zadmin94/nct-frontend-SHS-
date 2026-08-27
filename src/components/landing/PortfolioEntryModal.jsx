import { useEffect, useRef } from 'react';
import { ShieldCheck, UserRound, Wrench, X } from 'lucide-react';
import { DEMO_ACCOUNT_KEYS } from '@/constants/demoAccounts';

// @author 황희준
// @intent 비로그인 포트폴리오 방문자에게 역할별 체험 진입점과 키보드·배경·명시적 닫기 동작을 제공한다.
const ENTRY_OPTIONS = [
  {
    key: DEMO_ACCOUNT_KEYS.USER,
    title: '일반 회원 로그인',
    description: '경매 참여와 구매 기능을 체험합니다.',
    icon: <UserRound aria-hidden="true" size={22} />,
    className: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100',
  },
  {
    key: DEMO_ACCOUNT_KEYS.PROVIDER,
    title: '제공자 계정 로그인',
    description: '서비스 견적과 제공자 기능을 체험합니다.',
    icon: <Wrench aria-hidden="true" size={22} />,
    className: 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100',
  },
  {
    key: DEMO_ACCOUNT_KEYS.ADMIN,
    title: '관리자 로그인',
    description: '운영 및 관리 기능을 체험합니다.',
    icon: <ShieldCheck aria-hidden="true" size={22} />,
    className: 'border-slate-300 bg-slate-100 text-slate-800 hover:border-slate-500 hover:bg-slate-200',
  },
];

const GitHubMark = () => (
  <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
    <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.95 10.95 0 0 1 5.76 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.71 5.4-5.29 5.69.42.36.79 1.07.79 2.16v3.22c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
  </svg>
);

export default function PortfolioEntryModal({ open, onClose, onSelectDemoAccount }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/65 px-4 py-8 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-describedby="portfolio-entry-description"
        aria-labelledby="portfolio-entry-title"
        aria-modal="true"
        className="relative w-full max-w-150 rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="포트폴리오 안내 닫기"
          className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <X aria-hidden="true" size={22} />
        </button>

        <div className="pr-10">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            PORTFOLIO PROJECT
          </span>
          <h2 id="portfolio-entry-title" className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            에누리컷을 체험해 보세요
          </h2>
          <p id="portfolio-entry-description" className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            에누리컷은 물품 경매·거래와 서비스 요청·견적을 하나의 계정 및 포인트 체계로 연결한 팀 프로젝트입니다.
            원하는 역할을 선택하면 준비된 데모 계정으로 주요 기능을 확인할 수 있습니다.
          </p>
        </div>

        {/* @author 황희준 | @intent 포트폴리오 평가자가 프론트·백엔드 소스 저장소를 새 탭에서 바로 확인하게 한다. */}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <a
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            href="https://github.com/Pim-fy/nct-frontend"
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitHubMark />
            Frontend GitHub
          </a>
          <a
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            href="https://github.com/Pim-fy/nct-backend"
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitHubMark />
            Backend GitHub
          </a>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {ENTRY_OPTIONS.map(({ key, title, description, icon, className }) => (
            <button
              className={`flex min-h-35 cursor-pointer flex-col items-start rounded-2xl border p-4 text-left transition ${className}`}
              key={key}
              onClick={() => onSelectDemoAccount(key)}
              type="button"
            >
              {icon}
              <strong className="mt-4 text-sm font-bold">{title}</strong>
              <span className="mt-1 text-xs leading-5 opacity-80">{description}</span>
            </button>
          ))}
        </div>

        <button
          className="mt-4 h-12 w-full cursor-pointer rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={onClose}
          type="button"
        >
          비회원으로 진행
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-slate-400">
          데모 계정은 입력만 제공되며, 로그인 버튼을 직접 눌러야 접속됩니다.
        </p>
      </section>
    </div>
  );
}
