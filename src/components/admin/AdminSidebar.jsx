import { createElement } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import {
  ADMIN_OPERATIONS_RECORDS_PATH,
  ADMIN_FUNDS_PATH,
  ADMIN_PROVIDER_APPLICATIONS_PATH,
  ADMIN_SERVICE_REQUESTS_PATH,
  ADMIN_SETTINGS_PATH,
} from '@/routes/adminRoutes';
import {
  Bell,
  CircleDollarSign,
  BriefcaseBusiness,
  ClipboardCheck,
  Gavel,
  Grid2X2,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Megaphone,
  ScrollText,
  Settings,
  Siren,
  Users,
  WalletCards,
} from 'lucide-react';
import './AdminSidebar.css';

// 관리자 전체 화면에서 공통으로 사용하는 탐색 메뉴입니다.
// route가 없는 화면은 클릭을 막아 미완성 경로에서 404가 나지 않게 합니다.
const MENU_SECTIONS = [
  [
    { label: '대시보드', icon: LayoutDashboard, to: '/admin' },
    { label: '알림', icon: Bell, to: '/admin/notifications' },
  ],
  [
    { label: '회원 관리', icon: Users, to: '/admin/members' },
    { label: '제공자 심사', icon: ClipboardCheck, to: ADMIN_PROVIDER_APPLICATIONS_PATH },
  ],
  [{ label: '경매 관리', icon: Gavel, to: '/admin/auctions' }],
  [
    { label: '견적 요청 관리', icon: BriefcaseBusiness, to: ADMIN_SERVICE_REQUESTS_PATH },
    { label: '카테고리 관리', icon: Grid2X2, to: '/admin/categories' },
  ],
  [
    { label: '자금 관리', icon: CircleDollarSign, to: ADMIN_FUNDS_PATH },
    { label: '정산 관리', icon: WalletCards, to: '/admin/settlements' },
    { label: '환전 관리', icon: WalletCards, to: '/admin/exchanges' },
  ],
  [
    { label: '공지 관리', icon: Megaphone, to: '/admin/notices' },
  ],
  [
    { label: '신고 관리', icon: Siren, to: '/admin/reports' },
    { label: '문의 관리', icon: MessageSquareText, to: '/admin/inquiries' },
  ],
  [
    { label: '운영 기록', icon: ScrollText, to: ADMIN_OPERATIONS_RECORDS_PATH },
    { label: '시스템 설정', icon: Settings, to: ADMIN_SETTINGS_PATH },
  ],
];

const AdminSidebar = ({ collapsed = false, id, onNavigate }) => {
  // 담당자 7: 관리자 공통 화면에서 기존 인증 계약을 소비해 로그아웃 진입점만 제공합니다.
  const { logout, loading } = useAuth();

  return (
    <aside
      aria-label="관리자 메뉴 미리보기"
      className={`admin-sidebar${collapsed ? ' is-collapsed' : ''}`}
      id={id}
    >
      <nav className="admin-nav" aria-label="관리자 화면 목록">
        {MENU_SECTIONS.map((section, sectionIndex) => (
          <div className="admin-nav__section" key={`admin-menu-${sectionIndex}`}>
            {section.map(({ label, icon: Icon, to }) => (
              to ? (
                <NavLink
                  className={({ isActive }) => `admin-nav__item${isActive ? ' is-active' : ''}`}
                  end={to === '/admin'}
                  key={label}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  to={to}
                >
                  {createElement(Icon, { 'aria-hidden': true })}
                  <span><strong>{label}</strong></span>
                </NavLink>
              ) : (
                <div
                  aria-disabled="true"
                  className="admin-nav__item is-pending"
                  key={label}
                  title={collapsed ? label : undefined}
                >
                  {createElement(Icon, { 'aria-hidden': true })}
                  <span><strong>{label}</strong></span>
                </div>
              )
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <button
          aria-label="관리자 로그아웃"
          className="admin-nav__item admin-sidebar__logout"
          disabled={loading}
          onClick={() => void logout()}
          title={collapsed ? '로그아웃' : undefined}
          type="button"
        >
          <LogOut aria-hidden="true" />
          <span><strong>{loading ? '로그아웃 중...' : '로그아웃'}</strong></span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
