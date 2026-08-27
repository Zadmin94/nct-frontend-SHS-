import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
} from 'lucide-react';
import { getCategories } from '@api/categoryApi';
import { ActionButton } from '@components/common/ui';
import { StatusBadge } from '@components/common/ui';
import { useMyProviderApplications } from '@hooks/useProviderApplications';
import { useMyProviderProfile } from '@hooks/useProviderProfile';

const SERVICE_DOMAIN_CD = 'CATC0002';

const STATUS_VIEW = {
  approved: {
    label: '견적 제출 가능',
    icon: CheckCircle2,
    iconClass: 'bg-[#eaf8ef] text-[#18864b]',
    tone: 'success',
  },
  pending: {
    label: '심사 중',
    icon: Clock3,
    iconClass: 'bg-[#fff7e6] text-[#b26a00]',
    tone: 'warning',
  },
  rejected: {
    label: '재신청 가능',
    icon: AlertCircle,
    iconClass: 'bg-[#fff0f0] text-[#c33b3b]',
    tone: 'danger',
  },
  unrequested: {
    label: '미신청',
    icon: CircleDashed,
    iconClass: 'bg-[#f2f4f7] text-[#667085]',
    tone: 'neutral',
  },
  verification: {
    label: '권한 확인 필요',
    icon: AlertCircle,
    iconClass: 'bg-[#fff0f0] text-[#c33b3b]',
    tone: 'danger',
  },
};

const categoryStatus = ({ approved, application }) => {
  if (approved) return 'approved';
  if (!application) return 'unrequested';
  if (application.statusCode === 'PRVC0002') return 'pending';
  if (application.statusCode === 'PRVC0004') return 'rejected';
  if (application.statusCode === 'PRVC0003') return 'verification';
  return 'unrequested';
};

/**
 * 담당자 7 · F-PROV-007/013: 서비스 요청 카테고리별 실제 견적 제출 권한과
 * 최신 심사 상태를 제공자 대시보드에서 확인하고 추가 심사 신청 화면으로 연결합니다.
 */
export default function ProviderApprovedCategorySection() {
  const profileQuery = useMyProviderProfile();
  const applicationsQuery = useMyProviderApplications();
  const categoriesQuery = useQuery({
    queryKey: ['provider-service-categories', SERVICE_DOMAIN_CD],
    queryFn: () => getCategories(SERVICE_DOMAIN_CD)
      .then((response) => response.data.filter((category) => category.catParentSn !== null)),
  });

  const approvedCategoryNames = useMemo(
    () => new Set((profileQuery.data?.categories ?? []).map((name) => name.trim())),
    [profileQuery.data?.categories],
  );
  const latestApplicationByCategory = useMemo(() => {
    const latest = new Map();
    (applicationsQuery.data ?? []).forEach((application) => {
      const categorySn = Number(application.categorySn);
      if (!latest.has(categorySn)) latest.set(categorySn, application);
    });
    return latest;
  }, [applicationsQuery.data]);
  const categories = (categoriesQuery.data ?? []).map((category) => {
    const application = latestApplicationByCategory.get(Number(category.catSn));
    const status = categoryStatus({
      approved: approvedCategoryNames.has(category.catNm.trim()),
      application,
    });
    return { ...category, application, status };
  });
  const approvedCount = categories.filter((category) => category.status === 'approved').length;
  const hasApplicableCategory = categories.some((category) => (
    category.status === 'unrequested' || category.status === 'rejected'
  ));
  const isLoading = profileQuery.isLoading
    || applicationsQuery.isLoading
    || categoriesQuery.isLoading;
  const isError = profileQuery.isError
    || applicationsQuery.isError
    || categoriesQuery.isError;

  return (
    <article
      className="rounded-[15px] border border-[#e3e8f0] bg-white p-6 shadow-sm lg:col-span-2"
      aria-labelledby="provider-category-permission-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="provider-category-permission-title" className="text-lg font-bold text-[#1f2937]">
            제공자 권한
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {!isLoading && !isError && (
            <span className="text-sm font-semibold text-[#50627a]">
              승인 {approvedCount} / 전체 {categories.length}
            </span>
          )}
          {/* 신청 가능한 카테고리가 남아있으면 주 버튼이 "새 분야 심사 신청"으로 바뀌면서
              반려 사유를 보는 화면(신청 이력)으로 가는 길이 사라졌다. 반려된 카테고리가
              있는 상태에서도 항상 갈 수 있도록 보조 버튼을 추가한다
              (QA 발견, 백종남/Claude, 2026-08-16) */}
          {hasApplicableCategory && (
            <ActionButton className="shrink-0" to="/provider/applications/status" tone="outline">
              신청 이력 확인
            </ActionButton>
          )}
          <ActionButton
            className="shrink-0"
            to={hasApplicableCategory ? '/provider/apply' : '/provider/applications/status'}
          >
            {hasApplicableCategory ? '새 분야 심사 신청' : '신청 이력 확인'}
            <ArrowRight aria-hidden="true" className="size-4" />
          </ActionButton>
        </div>
      </div>

      {isLoading && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="제공자 권한을 불러오는 중">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-[68px] animate-pulse rounded-xl bg-[#f3f6fa]" />
          ))}
        </div>
      )}

      {isError && (
        <div className="mt-5 flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl bg-[#fff5f5] px-6 text-center">
          <p className="text-[15px] text-[#b42318]">제공자 권한을 불러오지 못했습니다.</p>
          <button
            type="button"
            className="text-sm font-semibold text-[#0064ff] hover:underline"
            onClick={() => {
              profileQuery.refetch();
              applicationsQuery.refetch();
              categoriesQuery.refetch();
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}

      {!isLoading && !isError && categories.length === 0 && (
        <div className="mt-5 flex min-h-64 items-center justify-center rounded-xl bg-[#fafbfc] px-6 text-center">
          <p className="text-[15px] text-[#6b7788]">현재 신청 가능한 서비스 카테고리가 없습니다.</p>
        </div>
      )}

      {!isLoading && !isError && categories.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {categories.map((category) => {
            const status = STATUS_VIEW[category.status];
            const StatusIcon = status.icon;

            return (
              <li
                key={category.catSn}
                className="flex min-h-[68px] items-center gap-3 rounded-xl border border-[#dce7f8] bg-[#fbfdff] px-4 py-3"
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${status.iconClass}`}>
                  <StatusIcon aria-hidden="true" className="size-5" />
                </span>
                <strong className="min-w-0 flex-1 truncate text-[16px] text-[#27364b]">
                  {category.catNm}
                </strong>
                <StatusBadge tone={status.tone} variant="soft">
                  {status.label}
                </StatusBadge>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
