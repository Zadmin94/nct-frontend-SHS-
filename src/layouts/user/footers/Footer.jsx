// src/layouts/user/footers/Footer.jsx
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionButton } from '@components/common/ui';
import { SIGNUP_TERMS } from '@pages/auth/signupTerms';
import { useConfig } from '@hooks/useConfig';

const TermsModal = ({ code, onClose }) => {
  const terms = SIGNUP_TERMS[code];
  if (!terms) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4 md:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="m-0 text-xl font-bold text-[#1a1a18]">{terms.title}</h2>
        <p className="mt-1 text-xs text-[#888780]">시행일자 {terms.effectiveDate}</p>
        <p className="mt-4 text-sm leading-6 text-[#5f5e5a]">{terms.summary}</p>
        <div className="mt-4 grid gap-4 overflow-y-auto pr-1">
          {terms.articles.map((article) => (
            <section key={article.heading}>
              <h3 className="m-0 text-sm font-semibold text-[#1a1a18]">{article.heading}</h3>
              <p className="mt-1.5 whitespace-pre-line text-xs leading-6 text-[#5f5e5a]">{article.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <ActionButton onClick={onClose}>
            닫기
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

/**
 * 사이트 공통 푸터 (LandingLayout, UserLayout에서 공용으로 사용)
 * Figma 디자인(jdFyM2rlNnaVPqeqUTwap3, node 201:405 "FOOTER")을 기반으로 제작.
 */
const Footer = () => {
  const [activeModal, setActiveModal] = useState(null);
  const { getConfig } = useConfig();
  const phone = getConfig('footer.phone');
  const phoneDisplay = phone.replaceAll('-', '.');
  const businessHours = getConfig('footer.businessHours');

  return (
    <>
      <footer className="bg-[#293341] text-[rgba(255,255,255,0.8)] mt-auto md:pb-0">
        <div className="container">
          <div className="flex flex-wrap items-start justify-between gap-8 pt-7 pb-7">
            {/* 좌측: 로고 + 링크 */}
            <div className="flex flex-col gap-4">
              <span className="text-[20px] font-black tracking-[-2px] text-white">에누리컷</span>
              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] tracking-[-0.75px]">
                <Link to="/customersupport/guide" className="text-white/80 hover:text-white transition-colors">
                  서비스소개
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveModal('AGRC0001')}
                  className="text-white/80 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[15px] tracking-[-0.75px]"
                >
                  이용약관
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('AGRC0002')}
                  className="text-white/80 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[15px] tracking-[-0.75px]"
                >
                  개인정보처리방침
                </button>
              </nav>

              <p className="text-[15px] leading-[1.6] tracking-[-0.75px] text-white/50 max-w-[720px]">
                에누리컷은 통신판매중개자로서 통신판매의 당사자가 아니며 개별 판매자가 제공하는 서비스에 대한 이행,
                계약사항 등과 관련한 의무와 책임은 거래당사자에게 있습니다.
              </p>
              <p className="max-w-[720px] text-[13px] leading-[1.6] tracking-[-0.65px] text-white/65">
                {getConfig('footer.portfolioNotice')}
              </p>
            </div>

            {/* 우측: 고객센터 */}
            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              <a href={`tel:${phone}`} className="md:hidden text-[28px] font-bold tracking-[-2px] text-white">
                {phoneDisplay}
              </a>
              <span className="hidden md:block text-[40px] font-bold tracking-[-2px] text-white">
                {phoneDisplay}
              </span>
              <p className="text-[15px] tracking-[-0.75px] text-white/50 text-left md:text-right">
                {businessHours.split('\n').map((line, index) => (
                  <Fragment key={line}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </Fragment>
                ))}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {activeModal && (
        <TermsModal code={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </>
  );
};

export default Footer;
