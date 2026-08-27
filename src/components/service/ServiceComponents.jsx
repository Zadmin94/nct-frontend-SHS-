import {
  BadgeCheck,
  BriefcaseBusiness,
  Flag,
  Star,
  X,
} from 'lucide-react';
import { toImageUrl } from '@api/fileApi';
import {
  ActionButton,
  CategoryTag,
  StatusBadge,
} from '@components/common/ui';
import './ServicePages.css';

export const ProviderProfile = ({
  activeTab,
  onOpenPortfolio,
  onReport,
  onTabChange,
  provider,
}) => (
  <div className="provider-public-layout">
    <aside className="provider-public-card">
      {/* 담당자 7 · F-COM-015: 공개 제공자 프로필에서 공통 신고 접수 모달을 엽니다. */}
      <ActionButton
        aria-label={`${provider.name} 제공자 신고하기`}
        className="provider-public-report-button"
        onClick={onReport}
        preserveSize
        size="sm"
        tone="danger-outline"
      >
        <Flag aria-hidden="true" />
        신고
      </ActionButton>
      <div className="provider-public-avatar" aria-hidden="true">
        {provider.profileImageUrl
          ? <img src={toImageUrl(provider.profileImageUrl)} alt="" />
          : provider.name.slice(0, 1)}
      </div>
      <div className="provider-public-name">
        <h1>{provider.name}</h1>
        {provider.verified && (
          <StatusBadge tone="success" variant="soft">
            <BadgeCheck aria-hidden="true" />승인
          </StatusBadge>
        )}
      </div>
      <p className="provider-public-rating"><Star aria-hidden="true" />{provider.rating} <span>리뷰 {provider.reviewCount}개</span></p>
      <div className="provider-public-tags">
        {provider.categories.map((category) => (
          <CategoryTag key={category} tone="info" variant="soft">{category}</CategoryTag>
        ))}
      </div>
      <p className="provider-public-stats">
        {provider.regions.join(', ')}
        {provider.completedCount != null && ` · 완료 ${provider.completedCount}건`}
        {provider.responseRate != null && ` · 응답률 ${provider.responseRate}%`}
      </p>
      <section>
        <h2>소개</h2>
        <p>{provider.intro}</p>
      </section>
    </aside>

    <section className="provider-public-content">
      <div className="provider-public-tabs" role="tablist" aria-label="제공자 상세 정보">
        <button aria-selected={activeTab === 'reviews'} className={activeTab === 'reviews' ? 'is-active' : ''} onClick={() => onTabChange('reviews')} role="tab" type="button">리뷰</button>
        <button aria-selected={activeTab === 'portfolio'} className={activeTab === 'portfolio' ? 'is-active' : ''} onClick={() => onTabChange('portfolio')} role="tab" type="button">포트폴리오</button>
      </div>

      {activeTab === 'reviews' && (
        <div className="provider-review-list" role="tabpanel">
          {provider.reviews.length > 0 ? provider.reviews.map((review) => (
            <article key={review.id}>
              <strong>{'★'.repeat(review.score)}</strong>
              <p>{review.content}</p>
              <small>{review.author} · {review.date}</small>
            </article>
          )) : <p className="provider-panel-empty">표시할 리뷰가 없습니다.</p>}
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="provider-portfolio-grid" role="tabpanel">
          {provider.portfolios.length > 0 ? provider.portfolios.map((portfolio) => (
            <button key={portfolio.id} onClick={() => onOpenPortfolio(portfolio)} type="button">
              {portfolio.imageUrl
                ? <img src={toImageUrl(portfolio.imageUrl)} alt="" className="provider-portfolio-thumbnail" />
                : <span><BriefcaseBusiness aria-hidden="true" /></span>}
              <strong>{portfolio.title}</strong>
              {portfolio.category && (
                <CategoryTag tone="info" variant="soft">{portfolio.category}</CategoryTag>
              )}
              <p>{portfolio.description}</p>
            </button>
          )) : <p className="provider-panel-empty">등록된 포트폴리오가 없습니다.</p>}
        </div>
      )}
    </section>
  </div>
);

export const PortfolioModal = ({ closeButtonRef, onClose, portfolio }) => (
  <div className="service-modal" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section aria-labelledby="portfolio-title" aria-modal="true" className="service-modal__panel service-modal__panel--portfolio" role="dialog">
      <div className="service-modal__heading">
        <div>
          {portfolio.category && (
            <CategoryTag tone="info" variant="soft">{portfolio.category}</CategoryTag>
          )}
          <h2 id="portfolio-title">{portfolio.title}</h2>
        </div>
        <button aria-label="포트폴리오 창 닫기" onClick={onClose} ref={closeButtonRef} type="button"><X aria-hidden="true" /></button>
      </div>
      {portfolio.imageUrl
        ? <img src={toImageUrl(portfolio.imageUrl)} alt="" className="provider-portfolio-modal-image" />
        : <div className="provider-portfolio-placeholder"><BriefcaseBusiness aria-hidden="true" /></div>}
      <p>{portfolio.description}</p>
    </section>
  </div>
);
