// src/components/landing/NoticeStrip.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import micIcon from '@assets/img/notice_icon_w.png';
import { usePublicNoticeList } from '@hooks/usePublicNotices';
import '@assets/css/landing.css';

const ROTATE_MS = 3500;

/**
 * 상단 공지 띠 배너 — 최신 공지 최대 5건을 롤링 표시, 클릭 시 해당 상세 페이지로 이동.
 */
const NoticeStrip = () => {
  const { data, isLoading } = usePublicNoticeList({ page: 1, size: 5 });
  const notices = data?.items ?? [];
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (notices.length <= 1) return;
    const timer = setInterval(() => {
      // fade out → swap → fade in
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % notices.length);
        setVisible(true);
      }, 300);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [notices.length]);

  if (isLoading) return null;

  const notice = notices[idx];
  const badge = notice?.typeName ?? '공지';
  const text  = notice?.title   ?? '서비스 점검 안내';
  const link  = notice?.id
    ? `/customersupport/notice/${notice.id}`
    : '/customersupport/notice';

  return (
    <div className="home-notice-strip">
      <div className="container">
        <div className="home-notice-strip-inner">
          <Link
            to={link}
            style={{ transition: 'opacity 0.3s', opacity: visible ? 1 : 0 }}
          >
            <img src={micIcon} alt="" width={18} height={18} />
            [{badge}] {text}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NoticeStrip;
