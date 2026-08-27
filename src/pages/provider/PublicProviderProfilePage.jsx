import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import {
  ContentPageShell,
  ContentState,
} from '@components/content/ContentUi';
import {
  PortfolioModal,
  ProviderProfile,
} from '@components/service/ServiceUi';
import ReportModal from '@components/common/ReportModal';
import ProfileSkeleton from '@components/skeleton/ProfileSkeleton';
import { usePublicProviderProfile } from '@hooks/useServiceDiscovery';
import './publicProviderProfilePage.css';

/** 담당자 7 · F-COM-002/F-COM-015: 공개 제공자 프로필 조회와 공통 신고 모달 진입을 연결합니다. */
const PublicProviderProfilePage = () => {
  const { providerId: rawProviderId } = useParams();
  const providerId = Number(rawProviderId);
  const validProviderId = Number.isSafeInteger(providerId) && providerId > 0;
  const providerQuery = usePublicProviderProfile(providerId);
  const [activeTab, setActiveTab] = useState('reviews');
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const modalCloseRef = useRef(null);
  const previousFocusRef = useRef(null);
  const modalOpen = Boolean(selectedPortfolio);

  useEffect(() => {
    if (!modalOpen) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => modalCloseRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedPortfolio(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [modalOpen]);

  if (!validProviderId) {
    return (
      <ContentPageShell>
        <Helmet><title>잘못된 제공자 주소 | 에누리컷</title></Helmet>
        <ContentState
          backLabel="메인으로 돌아가기"
          backTo="/"
          title="잘못된 제공자 주소입니다."
          tone="error"
        />
      </ContentPageShell>
    );
  }

  if (providerQuery.isLoading) return <ProfileSkeleton />;

  if (providerQuery.isError) {
    const errorStatus = providerQuery.error?.response?.status ?? providerQuery.error?.status;
    return (
      <ContentPageShell>
        <Helmet><title>제공자 조회 오류 | 에누리컷</title></Helmet>
        <ContentState
          actionLabel={errorStatus === 404 ? undefined : '다시 불러오기'}
          backLabel="메인으로 돌아가기"
          backTo="/"
          description={errorStatus === 404
            ? '존재하지 않거나 공개되지 않은 제공자일 수 있습니다.'
            : '잠시 후 다시 시도해 주세요.'}
          onAction={errorStatus === 404 ? undefined : () => providerQuery.refetch()}
          title={errorStatus === 404 ? '제공자를 찾을 수 없습니다.' : '제공자 프로필을 불러오지 못했습니다.'}
          tone="error"
        />
      </ContentPageShell>
    );
  }

  const provider = providerQuery.data;

  return (
    <ContentPageShell className="provider-public-page">
      <Helmet><title>{provider.name} 제공자 프로필 | 에누리컷</title></Helmet>

      <ProviderProfile
        activeTab={activeTab}
        onOpenPortfolio={setSelectedPortfolio}
        onReport={() => setReportOpen(true)}
        onTabChange={setActiveTab}
        provider={provider}
      />

      <ReportModal
        contextLabel={`제공자: ${provider.name}`}
        onClose={() => setReportOpen(false)}
        open={reportOpen}
        referenceSn={provider.id}
        reportedUserSn={provider.id}
        targetName={provider.name}
        targetType="provider"
      />

      {selectedPortfolio && (
        <PortfolioModal
          closeButtonRef={modalCloseRef}
          onClose={() => setSelectedPortfolio(null)}
          portfolio={selectedPortfolio}
        />
      )}
    </ContentPageShell>
  );
};

export default PublicProviderProfilePage;
