// src/components/skeleton/FormSkeleton.jsx
// 라벨+입력창이 세로로 나열된 폼 화면(설정, 작성/수정 화면 등)을 위한 스켈레톤.
import { Skeleton } from './BaseSkeleton';
import './FormSkeleton.css';

const FormSkeleton = ({ fields = 6 }) => (
  <div className="admin-form-skeleton" aria-label="관리자 폼을 불러오는 중">
    <header className="admin-form-skeleton__header">
      <Skeleton height={12} width={110} />
      <Skeleton height={30} width={240} />
      <Skeleton height={15} width="min(520px, 80%)" />
    </header>
    <section className="admin-form-skeleton__card">
      <div className="admin-form-skeleton__grid">
        {Array.from({ length: fields }).map((_, index) => (
          <div className={index === fields - 1 ? 'is-wide' : ''} key={index}>
            <Skeleton height={14} width={96} />
            <Skeleton height={42} />
          </div>
        ))}
      </div>
      <div className="admin-form-skeleton__actions">
        <Skeleton height={40} width={92} />
        <Skeleton height={40} width={112} />
      </div>
    </section>
  </div>
);

export default FormSkeleton;
