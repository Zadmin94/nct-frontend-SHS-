import { MYPAGE_PROFILE_TAB_PATHS } from '@/routes/myPageRoutes';
import CommonTabs from '@components/common/CommonTabs';
import MyPageContentHeader from '@components/mypage/MyPageContentHeader';
import MyPageProfileEdit from '@components/mypage/MyPageProfileEdit';
import ProviderProfilePage from '@pages/provider/ProviderProfilePage';

const PROFILE_TABS = [
  { value: 'account', label: '계정 프로필', to: MYPAGE_PROFILE_TAB_PATHS.account },
  { value: 'provider', label: '제공자 프로필', to: MYPAGE_PROFILE_TAB_PATHS.provider },
  { value: 'portfolio', label: '포트폴리오', to: MYPAGE_PROFILE_TAB_PATHS.portfolio },
];

/** 담당자 7 · F-PROV-004/005: 계정·제공자·포트폴리오 편집을 하나의 프로필 화면으로 묶습니다. */
export default function MyPageProfileManagement({ user, initialTab = 'account' }) {
  const activeTab = MYPAGE_PROFILE_TAB_PATHS[initialTab] ? initialTab : 'account';
  const tabs = PROFILE_TABS.map((tab) => ({
    ...tab,
    id: `mypage-profile-tab-${tab.value}`,
    ariaControls: 'mypage-profile-panel',
  }));

  return (
    <section className="mypage-profile-management">
      <MyPageContentHeader title="프로필" />
      <CommonTabs
        activeValue={activeTab}
        ariaLabel="프로필 관리 항목"
        className="common-tabs--panel"
        items={tabs}
      />

      <div
        id="mypage-profile-panel"
        role="tabpanel"
        aria-labelledby={`mypage-profile-tab-${activeTab}`}
        className="mypage-profile-panel"
      >
        {activeTab === 'account' && <MyPageProfileEdit user={user} showHeader={false} />}
        {activeTab === 'provider' && (
          <ProviderProfilePage embedded showHeader={false} view="provider" />
        )}
        {activeTab === 'portfolio' && (
          <ProviderProfilePage embedded showHeader={false} view="portfolio" />
        )}
      </div>
    </section>
  );
}
