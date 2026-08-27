import { Skeleton } from './BaseSkeleton';
import './ServiceTradeDetailSkeleton.css';

/** 담당자 7: 서비스 거래 상세의 실제 헤더·진행 단계·3열 카드·이력 배치를 유지하는 로딩 화면입니다. */
const ServiceTradeDetailSkeleton = () => (
  <div
    aria-label="서비스 거래 상세를 불러오는 중"
    aria-live="polite"
    aria-busy="true"
    className="service-trade-detail-skeleton"
    role="status"
  >
    <header className="service-trade-detail-skeleton__header">
      <Skeleton borderRadius={6} height={36} width={150} />
    </header>

    <ol aria-hidden="true" className="service-trade-detail-skeleton__steps">
      {Array.from({ length: 4 }).map((_, index) => (
        <li className="service-trade-detail-skeleton__step" key={index}>
          <Skeleton circle height={26} width={26} />
          <Skeleton borderRadius={5} height={13} width={index === 1 ? 74 : 54} />
        </li>
      ))}
    </ol>

    <div className="trade-detail-grid service-trade-detail-grid service-trade-detail-skeleton__cards">
      <section className="trade-detail-card service-trade-detail-skeleton__card">
        <div className="service-trade-detail-skeleton__block">
          <div className="service-trade-detail-skeleton__title-row">
            <Skeleton borderRadius={5} height={20} width={112} />
            <Skeleton borderRadius={14} height={28} width={64} />
          </div>
          <Skeleton borderRadius={5} height={14} width="82%" />
        </div>
        <div className="service-trade-detail-skeleton__block">
          <div className="service-trade-detail-skeleton__title-row">
            <Skeleton borderRadius={5} height={20} width={90} />
            <Skeleton borderRadius={7} height={40} width={92} />
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="service-trade-detail-skeleton__detail-row" key={index}>
              <Skeleton borderRadius={5} height={14} width={72} />
              <Skeleton borderRadius={5} height={14} width={index === 0 ? '88%' : '70%'} />
            </div>
          ))}
        </div>
        <div className="service-trade-detail-skeleton__block">
          <Skeleton borderRadius={5} height={20} width={104} />
          <div className="service-trade-detail-skeleton__profile">
            <Skeleton circle height={52} width={52} />
            <div>
              <Skeleton borderRadius={5} height={16} width={108} />
              <Skeleton borderRadius={5} height={13} width={148} />
            </div>
          </div>
        </div>
      </section>

      <section className="trade-detail-card service-trade-detail-skeleton__card">
        <div className="service-trade-detail-skeleton__block">
          <Skeleton borderRadius={5} height={20} width={86} />
          <Skeleton borderRadius={5} height={14} width="92%" />
          <Skeleton borderRadius={7} height={44} />
        </div>
        <div className="service-trade-detail-skeleton__block">
          <Skeleton borderRadius={5} height={20} width={86} />
          <Skeleton borderRadius={5} height={14} width="68%" />
          <Skeleton borderRadius={8} height={124} />
          <Skeleton borderRadius={7} height={44} />
        </div>
      </section>

      <section className="trade-detail-card service-trade-detail-skeleton__card">
        <div className="service-trade-detail-skeleton__title-row">
          <Skeleton borderRadius={5} height={20} width={74} />
          <Skeleton borderRadius={5} height={14} width={52} />
        </div>
        <Skeleton borderRadius={6} height={72} />
        <Skeleton borderRadius={6} height={72} />
        <Skeleton borderRadius={6} height={72} />
      </section>
    </div>

    <section className="service-trade-card service-trade-card--schedule service-trade-detail-skeleton__history">
      <Skeleton borderRadius={5} height={20} width={138} />
      <div className="service-trade-detail-skeleton__history-lines">
        <Skeleton borderRadius={5} height={14} width="34%" />
        <Skeleton borderRadius={5} height={14} width="55%" />
      </div>
    </section>
  </div>
);

export default ServiceTradeDetailSkeleton;
