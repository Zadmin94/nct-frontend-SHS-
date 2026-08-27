import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchPublicGuides } from '@api/guideApi';
import {
  ContentPageShell,
  ContentState,
  GuideJourneyOverview,
} from '@components/content/ContentUi';
import { GUIDE_FLOW_PRESENTATION, GUIDE_JOURNEYS } from './guideData';

/** 담당자 7, F-COM-014: 실제 이용 흐름과 단계별 화면 예시를 제공하는 정적 이용가이드입니다. */
const GuidePage = () => {
  const [searchParams] = useSearchParams();
  const requestedFlowId = searchParams.get('flow');
  const guidesQuery = useQuery({
    queryKey: ['public-guides'],
    queryFn: fetchPublicGuides,
    staleTime: 30 * 60 * 1000,
  });
  const guides = (guidesQuery.data ?? [])
    .filter((guide) => GUIDE_FLOW_PRESENTATION[guide.guideId])
    .map((guide) => ({
      id: guide.guideId,
      order: guide.sortOrder,
      title: guide.title,
      summary: guide.summary,
      ...GUIDE_FLOW_PRESENTATION[guide.guideId],
    }))
    .sort((first, second) => first.order - second.order);
  const highlightedFlowId = guides.some((guide) => guide.id === requestedFlowId)
    ? requestedFlowId
    : null;

  return (
    <ContentPageShell className="public-guide-page">
      <Helmet><title>이용가이드 | 에누리컷</title></Helmet>
      {guidesQuery.isLoading && <ContentState title="이용가이드를 불러오는 중입니다." />}
      {guidesQuery.isError && (
        <ContentState
          actionLabel="다시 불러오기"
          description="잠시 후 다시 시도해 주세요."
          onAction={() => guidesQuery.refetch()}
          title="이용가이드를 불러오지 못했습니다."
          tone="error"
        />
      )}
      {guides.length > 0 && (
        <GuideJourneyOverview
          guides={guides}
          highlightedFlowId={highlightedFlowId}
          journeys={GUIDE_JOURNEYS}
        />
      )}
    </ContentPageShell>
  );
};

export default GuidePage;
