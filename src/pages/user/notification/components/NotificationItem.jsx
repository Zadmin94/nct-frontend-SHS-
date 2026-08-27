// src/pages/user/notification/components/NotificationItem.jsx

// 일반/제공자 구분 배지 — 필터(F-COM-011)는 있는데 목록 항목 자체엔 구분 표시가 없어서
// "전체" 탭에서 어떤 알림이 어느 쪽인지 못 알아본다는 제보로 추가했다 (2026-08-10).
// 코드값은 NotificationPage.jsx의 AUDIENCE_TO_CODE와 동일 기준(NTFG04).
const AUDIENCE_BADGE = {
  NTFC0015: { label: '일반', className: 'bg-gray-100 text-gray-500' },
  NTFC0016: { label: '제공자', className: 'bg-amber-50 text-amber-700' },
};

/**
 * 알림 한 건 — 미읽음이면 파란 배경 + 좌측 강조선 (목업 20_notification.html)
 * 클릭하면 읽음 처리와 함께 상세 팝업(NotificationDetailModal)이 뜬다.
 */
const NotificationItem = ({ item, onClick }) => {
  const audienceBadge = AUDIENCE_BADGE[item.audienceCd];

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={`w-full text-left border rounded-2xl p-4 transition-colors flex items-start justify-between gap-3
        ${item.read
          ? 'bg-white border-gray-100 hover:bg-gray-50'
          : 'bg-blue-50 border-blue-100 border-l-4 border-l-blue-700 hover:bg-blue-100'}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-900 m-0">
          {audienceBadge && (
            <span className={`mr-1.5 inline-block shrink-0 rounded-lg px-2 py-0.5 text-xs align-middle ${audienceBadge.className}`}>
              {audienceBadge.label}
            </span>
          )}
          <strong>[{item.type}] {item.title}</strong>
          {item.content && <span className="text-gray-500 font-normal"> · {item.content}</span>}
        </p>
        <p className="text-xs text-gray-500 mt-1.5 mb-0 flex items-center gap-2">
          {item.time}
          {item.ref && (
            <span className="inline-block px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500">
              {item.ref}
            </span>
          )}
        </p>
      </div>
      {item.read && (
        <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-500">읽음</span>
      )}
    </button>
  );
};

export default NotificationItem;
