import PageMeta from '@components/admin/PageMeta';
import { ActionButton } from '@components/common/ui';
import { ContentPageHeader, ContentPageShell, ContentState } from '@components/content/ContentUi';
import { useMyProviderApplications } from '@hooks/useProviderApplications';
import { formatDate } from '@utils/common';
import './providerApplyPage.css';

const statusLabel = (item) => ({
  PRVC0002: '심사 대기',
  PRVC0003: '승인됨',
  PRVC0004: '반려됨',
})[item.statusCode] ?? item.statusName ?? '확인 필요';

const tone = (code) => ({ PRVC0003: 'approved', PRVC0004: 'danger' })[code] ?? 'warning';

/** 담당자 7 · F-PROV-012/014: 마이페이지에서 연결하는 제공자 신청 상태 확인 화면입니다. */
const ProviderApplicationStatusPage = () => {
  const { data = [], isError, isLoading } = useMyProviderApplications();

  if (isLoading) {
    return (
      <ContentPageShell>
        <PageMeta title="제공자 신청 상태" />
        <ContentState
          description="백엔드에서 내 제공자 신청 목록을 불러오고 있습니다."
          title="신청 상태를 확인하는 중입니다."
        />
      </ContentPageShell>
    );
  }

  if (isError) {
    return (
      <ContentPageShell>
        <PageMeta title="제공자 신청 상태" />
        <ContentState
          actionLabel="제공자 권한 신청"
          actionTo="/provider/apply"
          description="로그인 상태와 백엔드 연결을 확인해 주세요."
          title="신청 상태를 불러오지 못했습니다."
        />
      </ContentPageShell>
    );
  }

  if (!data.length) {
    return (
      <ContentPageShell>
        <PageMeta title="제공자 신청 상태" />
        <ContentState
          actionLabel="제공자 권한 신청"
          actionTo="/provider/apply"
          description="신청서를 작성하면 심사 진행 상태와 결과를 이곳에서 확인할 수 있습니다."
          title="진행 중인 제공자 신청이 없습니다."
        />
      </ContentPageShell>
    );
  }

  const latest = data[0];
  const message = latest.statusCode === 'PRVC0003'
    ? '승인된 카테고리에서 제공자 활동을 시작할 수 있습니다.'
    : latest.statusCode === 'PRVC0004'
      ? `반려 사유: ${latest.rejectReason || '관리자 보완 요청을 확인해 주세요.'}`
      : '관리자가 제출 정보와 신청 카테고리를 검토하고 있습니다.';

  return (
    <ContentPageShell className="provider-apply-page">
      <PageMeta title="제공자 신청 상태" />
      <section className="provider-apply-hero">
        <ContentPageHeader title="제공자 신청 상태" />
      </section>

      <section className={`provider-status-preview ${tone(latest.statusCode)}`}>
        <span>최근 신청 상태</span>
        <h2>{statusLabel(latest)}</h2>
        <p>{message}</p>

        <dl>
          <dt>신청번호</dt>
          <dd>{latest.applicationSn}</dd>

          <dt>신청 카테고리</dt>
          <dd>{latest.categoryName}</dd>

          {/* 서버가 내려주는 ISO 형식(2026-07-24T22:07:26)이 그대로 노출되던 것을
              공용 날짜 포맷(YYYY-MM-DD)으로 교체 (담당자6 BJN, 2026-07-24) */}
          <dt>신청일</dt>
          <dd>{latest.requestedAt ? formatDate(latest.requestedAt) : '-'}</dd>
        </dl>

        <ActionButton to="/provider/apply">
          {latest.statusCode === 'PRVC0004' ? '보완 후 다시 신청' : '다른 카테고리 신청하기'}
        </ActionButton>
      </section>

      {data.length > 1 && (
        <section className="provider-status-preview">
          <span>전체 신청</span>
          <dl>
            {data.map((item) => (
              <div key={item.applicationSn}>
                <dt>{item.categoryName}</dt>
                <dd>
                  {statusLabel(item)}
                  {/* 위쪽 요약 카드는 가장 최근 신청 1건만 보여줘서, 그보다 예전에 반려된
                      다른 카테고리는 사유·재신청 경로가 아예 없었다. 반려된 건마다 각각
                      사유와 재신청 버튼을 노출한다 (QA 발견, 백종남/Claude, 2026-08-16) */}
                  {item.statusCode === 'PRVC0004' && (
                    <div className="provider-status-reject-detail">
                      <p>반려 사유: {item.rejectReason || '관리자 보완 요청을 확인해 주세요.'}</p>
                      <ActionButton to="/provider/apply" size="sm">보완 후 다시 신청</ActionButton>
                    </div>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </ContentPageShell>
  );
};

export default ProviderApplicationStatusPage;
