import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MyPageSidebar from '@components/mypage/MyPageSidebar';
import './CustomerSupportLayout.css';

const CUSTOMER_SUPPORT_MENU = [
  {
    key: 'notice',
    label: '공지사항',
    to: '/customersupport/notice',
    type: 'section',
    isActive: (pathname) => pathname.startsWith('/customersupport/notice'),
  },
  {
    key: 'guide',
    label: '이용가이드',
    to: '/customersupport/guide',
    type: 'section',
    isActive: (pathname) => pathname === '/customersupport/guide',
  },
  {
    key: 'faq',
    label: 'FAQ',
    to: '/customersupport/faq',
    type: 'section',
    isActive: (pathname) => pathname === '/customersupport/faq',
  },
];

/**
 * 담당자 7 · F-COM-013/F-COM-014
 * 공지사항·이용가이드·FAQ에서 마이페이지와 같은 좌측 메뉴 규격을 공유한다.
 */
const CustomerSupportLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeSection = CUSTOMER_SUPPORT_MENU.find((item) => item.isActive(pathname))?.key
    ?? 'notice';

  const selectSection = (sectionKey) => {
    const selectedItem = CUSTOMER_SUPPORT_MENU.find((item) => item.key === sectionKey);
    if (selectedItem) navigate(selectedItem.to);
  };

  return (
    <div className="container py-6 lg:py-10">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start">
        <MyPageSidebar
          activeSection={activeSection}
          menuItems={CUSTOMER_SUPPORT_MENU}
          onSelect={selectSection}
          title="고객센터"
        />

        <div className="customer-support-layout__content flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default CustomerSupportLayout;
