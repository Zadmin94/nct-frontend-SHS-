// src/pages/user/notification/components/NotificationDetailModal.jsx
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getServiceTradeDetailPath } from '@/routes/myPageRoutes';
import { getServiceRequestDetailPath } from '@/routes/serviceRequestRoutes';
import { getProductSnByInquirySn } from '@/api/productApi';
import { fetchAuctionStatusByProduct } from '@/api/auctionApi';
import { getAuctionStatus } from '@/api/auctionApi';

// 참조유형공통코드(REFG01) → 이동할 화면 경로. 페이지가 없는 참조 유형(입찰·견적·거래문제 등)은
// null을 돌려주고, 이 경우 모달에 "이동" 버튼 없이 내용만 보여준다 (사용자 결정, 2026-07-28).
// REFC0002(구매자 문의 등록/판매자 답변)는 refSn이 상품이 아니라 문의(prdCmtSn)라 여기서 동기로
// 계산할 수 없다 — prdSn 변환 API가 필요해 컴포넌트 쪽 useEffect에서 별도로 처리한다.
const resolveLink = (item) => {
  if (!item.refTypeCd || item.refSn == null) return null;
  switch (item.refTypeCd) {
    case 'REFC0003': // 경매
      return `/auction/${item.refSn}`;
    case 'REFC0005': // 거래 — 서비스 도메인은 역할과 무관하게 서비스 거래 상세로 보낸다
      if (item.domainCd === 'NTFC0012') return getServiceTradeDetailPath(item.refSn);
      // 물건 거래 제공자 대상 알림(audienceCd=NTFC0016)은 판매자 화면으로 보낸다.
      return item.audienceCd === 'NTFC0016' ? `/trades/${item.refSn}/seller` : `/trades/${item.refSn}`;
    case 'REFC0007': // 서비스 요청
      return getServiceRequestDetailPath(item.refSn);
    case 'REFC0011': // 공지사항
      return `/customersupport/notice/${item.refSn}`;
    default:
      return null;
  }
};

/**
 * 알림 클릭 시 뜨는 상세 팝업 — 목록에서는 제목만 보이던 알림의 본문(content)을 보여준다.
 * 이동할 화면이 있는 알림(경매·거래·서비스·공지)은 내용을 확인한 뒤 눌러서 이동할 수 있는
 * 버튼을 같이 보여준다 — 클릭 즉시 이동이 아니라 내용을 먼저 보고 선택하게 하기 위함 (사용자 결정).
 * item이 null이면 렌더링하지 않는다 (선택된 알림 없음 = 닫힌 상태).
 */
const NotificationDetailModal = ({ item, onClose }) => {
  // 담당자 7: 현재 경로는 대상 화면의 뒤로가기 문맥으로만 전달하며 브레드크럼에는 반영하지 않는다.
  const location = useLocation();

  // 문의 등록/답변 알림(REFC0002)은 prdCmtSn → prdSn 변환 API를 먼저 호출해야 이동 경로가 나온다.
  // refSn을 결과와 함께 들고 있다가 현재 item과 비교해서, 알림이 바뀌었는데 이전 알림의 변환
  // 결과가 그대로 남는 것을 막는다(별도의 리셋 setState 없이 렌더링 시점에 자연히 무효화).
  const [resolvedInquiry, setResolvedInquiry] = useState({ refSn: null, link: null });

  useEffect(() => {
    if (!item || item.refTypeCd !== 'REFC0002' || item.refSn == null) return undefined;

    let cancelled = false;
    getProductSnByInquirySn(item.refSn)
      .then(async (res) => {
        if (cancelled || res.data == null) return;
        const prdSn = res.data;

        // 새 구매자 문의(NTFC0030, 판매자 수신) — 답변은 판매자 상품 관리 화면에서만 등록 가능
        // (AuctionInquirySection도 "판매자 상품 관리에서 답변할 수 있습니다"로 안내한다).
        if (item.evtCd === 'NTFC0030') {
          if (!cancelled) setResolvedInquiry({ refSn: item.refSn, link: `/product/${prdSn}/seller` });
          return;
        }
        // 문의 답변 등록(NTFC0031, 구매자 수신) — 답변 확인은 공개 경매 상세 화면에서.
        // /auction/:auctionId는 aucSn을 쓰므로 prdSn을 한 번 더 변환해야 한다(담당자2 확인, 2026-08-18).
        if (item.evtCd === 'NTFC0031') {
          const status = await fetchAuctionStatusByProduct(prdSn);
          if (!cancelled && status?.aucSn != null) {
            setResolvedInquiry({ refSn: item.refSn, link: `/auction/${status.aucSn}` });
          }
        }
      })
      .catch(() => {}); // 상품이 이미 삭제된 경우 등 — 이동 버튼 없이 내용만 보여준다

    return () => { cancelled = true; };
  }, [item]);

  if (!item) return null;

  const link = item.refTypeCd === 'REFC0002'
    ? (resolvedInquiry.refSn === item.refSn ? resolvedInquiry.link : null)
    : resolveLink(item);

  return (
    <div
      className="user-modal-overlay flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-white rounded-2xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]"
        aria-labelledby="notification-detail-modal-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="inline-block px-2 py-0.5 rounded-lg bg-gray-100 text-xs text-gray-500">
            {item.type}
          </span>
          <button
            type="button"
            className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <h3 className="text-lg font-bold text-gray-900 m-0 mb-2" id="notification-detail-modal-title">{item.title}</h3>
        <p className="text-xs text-gray-400 mb-4">{item.time}</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed m-0">
          {item.content}
        </p>
        {link && (
          <div className="flex justify-end mt-4">
            <Link
              to={link}
              state={{ from: location.pathname + location.search }}
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors no-underline"
            >
              이동
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDetailModal;
