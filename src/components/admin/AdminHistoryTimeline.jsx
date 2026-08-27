import { ChevronDown, History, RefreshCw } from 'lucide-react';

import { useAdminHistory } from '@hooks/useAdminAudit';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import './AdminHistoryTimeline.css';

const LEGACY_AUDIT_PATTERN = /^reason=(.*?); before=(.*?); after=(.*?); requestId=(.*)$/s;

const SUMMARY_FIELD_LABELS = {
  action: '계정 조치',
  amount: '금액',
  code: '코드',
  decision: '거래 판정',
  formVersion: '양식 버전',
  heldSettlements: '보류 정산',
  memberStatus: '회원 상태',
  name: '이름',
  published: '게시 여부',
  released: '제재 해제',
  report: '신고 번호',
  reportSn: '신고 번호',
  reportStatus: '신고 상태',
  restrictedTrades: '제한 처리된 거래',
  sanction: '제재 번호',
  sort: '표시 순서',
  status: '처리 상태',
  title: '제목',
  tradeStatus: '거래 상태',
  use: '사용 여부',
};

const SUMMARY_VALUE_LABELS = {
  ABSC0001: '접수',
  ABSC0002: '처리 중',
  ABSC0003: '처리 완료',
  ABSC0004: '반려',
  TRDC0003: '진행 중',
  TRDC0004: '배송 중',
  TRDC0005: '구매 확정 대기',
  TRDC0006: '완료',
  TRDC0007: '보류',
  TRDC0008: '취소',
  USRC0001: '활성',
  USRC0002: '정지',
  COMPLETE: '처리 완료',
  REFUND: '전액 환불',
  HOLD: '보류',
  REJECT: '반려',
  NONE: '제재 보류',
  TEMPORARY_SUSPENSION_7_DAYS: '7일 일시정지',
  PERMANENT_SUSPENSION: '영구정지',
  Y: '예',
  N: '아니요',
  true: '예',
  false: '아니요',
};

const SUMMARY_COUNT_FIELDS = new Set(['heldSettlements', 'restrictedTrades']);

const legacyFields = (item) => {
  if (item.before != null || item.after != null || item.requestId != null) {
    return item;
  }
  const match = String(item.reason ?? '').match(LEGACY_AUDIT_PATTERN);
  if (!match) return item;
  return {
    ...item,
    reason: match[1] === '-' ? null : match[1],
    before: match[2] === '-' ? null : match[2],
    after: match[3] === '-' ? null : match[3],
    requestId: match[4] === '-' ? null : match[4],
  };
};

const referenceLabel = (name, code, sn) => {
  if (!name && !code && sn == null) return null;
  return `${name || code || '대상'}${sn == null ? '' : ` #${sn}`}`;
};

const summaryValue = (key, value) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '-';
  if (SUMMARY_VALUE_LABELS[normalized]) return SUMMARY_VALUE_LABELS[normalized];
  if (SUMMARY_COUNT_FIELDS.has(key) && /^\d+$/.test(normalized)) {
    return `${normalized}건`;
  }
  if (/Sn$/.test(key) || ['report', 'sanction'].includes(key)) {
    return /^\d+$/.test(normalized) ? `#${normalized}` : normalized;
  }
  return normalized;
};

const summaryFields = (summary) => {
  const text = String(summary ?? '').trim();
  if (!text) return [];

  const fields = text
    .split(/,\s*(?=[A-Za-z][A-Za-z0-9]*=)/)
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator < 1) return null;
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      return {
        key,
        label: SUMMARY_FIELD_LABELS[key] ?? key,
        value: summaryValue(key, value),
      };
    });

  return fields.every(Boolean) ? fields : [{ key: 'summary', label: '내용', value: text }];
};

const AuditSummary = ({ value }) => (
  <div className="admin-history__summary">
    {summaryFields(value).map((field) => (
      <span key={`${field.key}-${field.value}`}>
        <b>{field.label}</b>
        {field.value}
      </span>
    ))}
  </div>
);

const historyDate = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]} ${match[4]}` : value || '-';
};

const HistoryItem = ({ item }) => {
  const mainReference = referenceLabel(item.refType, item.refTypeCd, item.refSn);
  const relatedReference = referenceLabel(
    item.relatedRefType,
    item.relatedRefTypeCd,
    item.relatedRefSn,
  );
  const actor = item.userSn == null
    ? '시스템 자동 처리'
    : formatAdminMemberIdentity(item.actorMember, item.userSn);

  return (
    <li>
      <span className="admin-history__dot" aria-hidden="true" />
      <details className="admin-history__entry">
        <summary>
          <span className="admin-history__type">
            {item.type || item.typeCd || '관리자 작업'}
          </span>
          <span className="admin-history__entry-content">
            <strong>{item.reason || '처리 내용이 기록되었습니다.'}</strong>
            <small>{actor}</small>
          </span>
          <time>{historyDate(item.date)}</time>
          <ChevronDown aria-hidden="true" size={16} />
        </summary>
        <div className="admin-history__entry-detail">
          {(item.before || item.after) && (
            <dl className="admin-history__change">
              <dt>변경 전</dt><dd>{item.before ? <AuditSummary value={item.before} /> : '-'}</dd>
              <dt>변경 후</dt><dd>{item.after ? <AuditSummary value={item.after} /> : '-'}</dd>
            </dl>
          )}
          <div className="admin-history__references">
            {mainReference && <span>대상: {mainReference}</span>}
            {relatedReference && <span>연관: {relatedReference}</span>}
          </div>
        </div>
      </details>
    </li>
  );
};

const VISIBLE_HISTORY_COUNT = 3;

/** 담당자 7 · F-OPS-016: 관리자 상세 화면용 공통 처리 이력 타임라인입니다. */
const AdminHistoryTimeline = ({ limit = 100, referenceSn, referenceType, title = '처리 이력' }) => {
  const historyQuery = useAdminHistory(referenceType, referenceSn, limit);
  const items = (historyQuery.data ?? []).map(legacyFields);
  const visibleItems = items.slice(0, VISIBLE_HISTORY_COUNT);
  const additionalItems = items.slice(VISIBLE_HISTORY_COUNT);

  return (
    <section className="admin-history" aria-labelledby={`admin-history-${referenceType}-${referenceSn}`}>
      <div className="admin-history__heading">
        <div>
          <History aria-hidden="true" size={18} />
          <h3 id={`admin-history-${referenceType}-${referenceSn}`}>{title}</h3>
          {!historyQuery.isLoading && !historyQuery.isError && <span>{items.length}건</span>}
        </div>
        <button
          aria-label="처리 이력 새로고침"
          className="admin-history__refresh"
          disabled={historyQuery.isFetching}
          onClick={() => historyQuery.refetch()}
          title="새로고침"
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
        </button>
      </div>

      {historyQuery.isLoading && (
        <div className="admin-history__skeleton" aria-label="처리 이력을 불러오는 중입니다.">
          {[0, 1, 2].map((item) => <span key={item} />)}
        </div>
      )}
      {historyQuery.isError && (
        <div className="admin-history__state is-error">
          처리 이력을 불러오지 못했습니다.
          <button className="btn btn-outline btn-sm" onClick={() => historyQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      )}
      {!historyQuery.isLoading && !historyQuery.isError && items.length === 0 && (
        <div className="admin-history__state">기록된 처리 이력이 없습니다.</div>
      )}
      {items.length > 0 && (
        <>
          <ol className="admin-history__list">
            {visibleItems.map((item) => <HistoryItem item={item} key={item.id} />)}
          </ol>
          {additionalItems.length > 0 && (
            <details className="admin-history__additional">
              <summary>
                <ChevronDown aria-hidden="true" size={16} />
                이전 이력 {additionalItems.length}건 더 보기
              </summary>
              <ol className="admin-history__list admin-history__list--additional">
                {additionalItems.map((item) => <HistoryItem item={item} key={item.id} />)}
              </ol>
            </details>
          )}
        </>
      )}
    </section>
  );
};

export default AdminHistoryTimeline;
