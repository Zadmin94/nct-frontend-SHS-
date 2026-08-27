import { useSearchParams } from 'react-router-dom';
import CommonTabs from '@components/common/CommonTabs';
import OperationsIntegrationPreview from '@pages/admin/OperationsIntegrationPreview';
import AdminAuditLogPage from '@pages/admin/audit/AdminAuditLogPage';
import './adminOperationsRecordPage.css';

const TABS = [
  { key: 'risk', label: '위험 이벤트' },
  { key: 'audit', label: '감사 로그' },
];

/** 담당자 7 · F-OPS-011: 담당자 6의 F-OPS-016 화면을 변경하지 않고 운영 기록 탐색에 연결합니다. */
const AdminOperationsRecordPage = () => {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'audit' ? 'audit' : 'risk';

  return (
    <div className="admin-operations-records">
      <CommonTabs
        activeValue={activeTab}
        ariaLabel="운영 기록 종류"
        className="admin-operations-records__tabs"
        items={TABS.map((tab) => ({
          value: tab.key,
          label: tab.label,
          to: `?tab=${tab.key}`,
        }))}
      />

      <section>
        {activeTab === 'risk'
          ? <OperationsIntegrationPreview />
          : <AdminAuditLogPage />}
      </section>
    </div>
  );
};

export default AdminOperationsRecordPage;
