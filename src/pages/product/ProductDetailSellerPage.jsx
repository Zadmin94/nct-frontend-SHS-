// src/pages/product/ProductDetailSellerPage.jsx
// 판매자 경매 상세 페이지 — 등록한 상품의 경매 현황 및 상태별 관리 화면
// 라우트: /product/:prdSn/seller
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { toImageUrl } from '@api/fileApi';
import { resolveDescriptionImagesForDisplay } from '@components/product/richTextEditorImages';
import { getProduct, postProductComment, fetchProductComments, fetchProductInquiries, postInquiryReply, updateInquiryReply } from '@api/productApi';
import { getAuctionStatus, requestAuctionCancel, fetchAuctionFavoriteStatus, fetchAuctionDetail } from '@api/auctionApi';
import { submitInquiryReport } from '@api/abuseReportApi';
import { TRADE_LABEL, STATUS_LABEL, AUC_STATUS_LABEL } from '@/constants/productConstants';
import { formatPoint } from '@/utils/common';
import useCountdown from '@hooks/useCountdown';
import ErrorMessage from '@components/common/ErrorMessage';
import MediaDetailSkeleton from '@components/skeleton/MediaDetailSkeleton';
import Toast from '@components/common/Toast';
import AlertModal from '@components/common/AlertModal';
import ConfirmModal from '@components/common/ConfirmModal';
import Pagination from '@components/common/Pagination';
import ImageLightbox from '@components/common/ImageLightbox';
import {
  ActionButton,
  CategoryTag,
  DomainStatus,
} from '@components/common/ui';

const CANCEL_REASONS = ['상품 상태 변경', '상품 정보 오류', '판매 진행 불가', '기타'];
const HISTORY_PAGE_SIZE = 5;
const PRODUCT_STATUS_TONE = {
  PRDC0001: 'neutral',
  PRDC0002: 'success',
  PRDC0003: 'neutral',
  PRDC0004: 'danger',
};
const AUCTION_STATUS_TONE = {
  AUCC0001: 'neutral',
  AUCC0002: 'success',
  AUCC0003: 'neutral',
  AUCC0004: 'neutral',
  AUCC0005: 'danger',
  AUCC0006: 'danger',
};
// 답변 등록 후 수정 가능한 시간 — 백엔드 ProductService.REPLY_EDIT_WINDOW_MINUTES와 동일해야 함
const REPLY_EDIT_WINDOW_MS = 10 * 60 * 1000;

function groupInquiries(rawList) {
  const replies = rawList.filter(r => r.prdCmtTypeCd === 'PRDC0007');
  return rawList
    .filter(r => r.prdCmtTypeCd === 'PRDC0006')
    .map(q => {
      const replyRow = replies.find(r => r.prdCmtParentSn === q.prdCmtSn);
      return {
        inquirySn: q.prdCmtSn,
        usrNm: q.usrNm,
        content: q.prdCmtCn,
        regDt: new Date(q.prdCmtRegDt).toLocaleDateString('ko-KR'),
        reply: replyRow?.prdCmtCn ?? null,
        replyRegDt: replyRow?.prdCmtRegDt ?? null,
      };
    });
}

export default function ProductDetailSellerPage() {
  const { prdSn } = useParams();

  const [product, setProduct]           = useState(null);
  const [auctionStatus, setAuctionStatus] = useState(null);
  const [loadedPrdSn, setLoadedPrdSn]   = useState(null);
  const [error, setError]               = useState('');
  const [imgIdx, setImgIdx]             = useState(0); // 상품 이미지 슬라이드 현재 인덱스
  const [lightboxOpen, setLightboxOpen] = useState(false); // 상품 이미지 확대뷰

  // 예약(AUCC0001, 시작 전)은 "시작까지" 남은 시간을, 그 외(경매중 등)는 "종료까지" 남은 시간을
  // 카운트다운한다 — 둘 다 "종료까지"로만 보여주면 시작 전 경매도 곧 끝나는 것처럼 오해할 수 있다.
  const isReadyAuction = auctionStatus?.aucStatusCd === 'AUCC0001';
  const countdownTargetDt = isReadyAuction ? auctionStatus?.aucStartDt : auctionStatus?.aucEndDt;
  const now = useCountdown(!!countdownTargetDt);
  const remainTime = (() => {
    if (!countdownTargetDt) return '';
    const diff = new Date(countdownTargetDt) - now;
    if (diff <= 0) return isReadyAuction ? '시작' : '종료';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    return d > 0 ? `${d}일 ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  })();

  // 상품 수정 이력 (F-AUC-007)
  const [favoriteCount, setFavoriteCount] = useState(null);
  const [bids, setBids] = useState([]); // 입찰 이력 — 경매 상세 조회(옥동민5, GET /auctions/{auctionId})의 bids 그대로 사용
  const [bidsPage, setBidsPage] = useState(1);

  const [comments, setComments]         = useState([]);
  const [cmtTtl, setCmtTtl]             = useState('');
  const [cmtCn, setCmtCn]               = useState('');
  const [cmtSubmitting, setCmtSubmitting] = useState(false);

  // 구매자 문의 — 리스트 형식, 문의마다 독립적으로 답변 입력/수정 상태를 가짐
  const [inquiries, setInquiries]       = useState([]);
  const [inquiriesPage, setInquiriesPage] = useState(1);
  const [expandedSn, setExpandedSn]     = useState(null); // 클릭해서 펼친 문의 inquirySn — 펼쳤을 때만 답변/신고 UI 표시
  const [replyDrafts, setReplyDrafts]   = useState({}); // { [inquirySn]: 답변 입력중인 텍스트 }
  const [editingSn, setEditingSn]       = useState(null); // 현재 답변 수정 중인 inquirySn
  const [editDrafts, setEditDrafts]     = useState({}); // { [inquirySn]: 수정 중인 텍스트 }
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [reportOpen, setReportOpen]           = useState(false);
  const [reportTargetSn, setReportTargetSn]   = useState(null); // 신고 대상 inquirySn
  const [reportContent, setReportContent]     = useState(''); // 신고 사유
  const [reportSubmitting, setReportSubmitting] = useState(false);
  // 답변 수정 가능 시간(10분) 판단용 — 1초마다 갱신해 시간이 지나면 수정 버튼이 실시간으로 사라지게 함
  const replyClock = useCountdown(true);

  // 취소 요청 모달 (F-AUC-008)
  const [cancelOpen, setCancelOpen]     = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [toast, setToast]               = useState('');
  const [alertMsg, setAlertMsg]         = useState(''); // 화면 중앙 알림 모달 — 취소 요청 완료 안내용
  const [commentConfirmOpen, setCommentConfirmOpen] = useState(false); // 변경사항 추가 — 등록 전 "수정 불가" 안내
  const [pendingReplySn, setPendingReplySn] = useState(null); // 답변 등록 — 등록 전 "10분 이내 수정 가능" 안내 대상 inquirySn

  const rightColRef  = useRef(null);
  const loading = loadedPrdSn !== prdSn;

  useEffect(() => {
    let cancelled = false;
    const applyIfCurrent = (callback) => {
      if (!cancelled) callback();
    };

    getProduct(prdSn)
      .then(res => {
        if (cancelled) return [];

        const p = res.data;
        setProduct(p);
        setError('');
        setAuctionStatus(null);
        setFavoriteCount(null);
        setBids([]);
        setComments([]);
        setInquiries([]);
        const sideLoads = [
          fetchProductComments(prdSn)
            .then(r => applyIfCurrent(() => setComments(r.data)))
            .catch(() => {}),
          fetchProductInquiries(prdSn)
            .then(r => applyIfCurrent(() => setInquiries(groupInquiries(r.data))))
            .catch(() => {}),
        ];
        if (p.prdStatusCd !== 'PRDC0001') {
          sideLoads.push(
            getAuctionStatus(prdSn)
              .then(auc => {
                if (cancelled) return null;
                setAuctionStatus(auc);
                fetchAuctionDetail(auc.aucSn)
                  .then(res => applyIfCurrent(() => setBids(res.bids ?? [])))
                  .catch(() => {});
                return fetchAuctionFavoriteStatus(auc.aucSn);
              })
              .then(fav => {
                if (fav) applyIfCurrent(() => setFavoriteCount(fav.favoriteCount));
              })
              .catch(() => {})
          );
        }
        return Promise.all(sideLoads);
      })
      .catch(() => applyIfCurrent(() => {
        setProduct(null);
        setError('상품 정보를 불러오지 못했습니다.');
      }))
      .finally(() => applyIfCurrent(() => setLoadedPrdSn(prdSn)));

    return () => {
      cancelled = true;
    };
  }, [prdSn]);

  const handleCancelSubmit = async () => {
    if (!cancelReason) { setAlertMsg('취소 사유를 선택해 주세요.'); return; }
    if (!auctionStatus?.aucSn) { setToast('경매 정보를 불러오지 못했습니다.'); return; }
    setCancelSubmitting(true);
    try {
      await requestAuctionCancel(auctionStatus.aucSn, { reason: cancelReason });
      setAlertMsg('취소 요청이 완료되었습니다.');
      setCancelOpen(false);
      setCancelReason('');
      getAuctionStatus(prdSn).then(auc => setAuctionStatus(auc)).catch(() => {});
    } catch (err) {
      setToast(err.response?.data?.message || '취소 요청에 실패했습니다.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportContent.trim()) { setAlertMsg('신고 사유를 입력해 주세요.'); return; }
    setReportSubmitting(true);
    try {
      await submitInquiryReport({
        targetType: 'INQUIRY',
        targetSn: reportTargetSn,
        reportContent: reportContent.trim(),
      });
      setToast('신고가 접수되었습니다.');
      setReportOpen(false);
      setReportTargetSn(null);
      setReportContent('');
    } catch (err) {
      setToast(err.response?.data?.message || '신고 접수에 실패했습니다.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const requestCommentSubmit = () => {
    if (!cmtTtl.trim()) { setAlertMsg('제목을 입력해 주세요.'); return; }
    setCommentConfirmOpen(true);
  };

  const handleCommentSubmit = async () => {
    setCommentConfirmOpen(false);
    setCmtSubmitting(true);
    try {
      await postProductComment(prdSn, { ttl: cmtTtl.trim(), cn: cmtCn.trim() || null });
      const updated = await fetchProductComments(prdSn);
      setComments(updated.data);
      setCmtTtl('');
      setCmtCn('');
      setToast('수정 이력이 등록되었습니다.');
    } catch (err) {
      setAlertMsg(err.response?.data?.message || '추가 공지 등록에 실패했습니다.');
    } finally {
      setCmtSubmitting(false);
    }
  };

  const requestReplySubmit = (inquirySn) => {
    const text = (replyDrafts[inquirySn] || '').trim();
    if (!text) { setAlertMsg('답변 내용을 입력해 주세요.'); return; }
    setPendingReplySn(inquirySn);
  };

  const handleReplySubmit = async (inquirySn) => {
    const text = (replyDrafts[inquirySn] || '').trim();
    setPendingReplySn(null);
    setReplySubmitting(true);
    try {
      await postInquiryReply(prdSn, inquirySn, { cn: text });
      const updated = await fetchProductInquiries(prdSn);
      setInquiries(groupInquiries(updated.data));
      setReplyDrafts(prev => { const next = { ...prev }; delete next[inquirySn]; return next; });
      setToast('답변이 등록되었습니다.');
    } catch (err) {
      setAlertMsg(err.response?.data?.message || '답변 등록에 실패했습니다.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleReplyEditSubmit = async (inquirySn) => {
    const text = (editDrafts[inquirySn] || '').trim();
    if (!text) { setAlertMsg('답변 내용을 입력해 주세요.'); return; }
    setReplySubmitting(true);
    try {
      await updateInquiryReply(prdSn, inquirySn, { cn: text });
      const updated = await fetchProductInquiries(prdSn);
      setInquiries(groupInquiries(updated.data));
      setEditingSn(null);
      setToast('답변이 수정되었습니다.');
    } catch (err) {
      setAlertMsg(err.response?.data?.message || '답변 수정에 실패했습니다. 등록 후 10분이 지났을 수 있습니다.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const closeCancel = () => { setCancelOpen(false); setCancelReason(''); };

  if (loading) return <MediaDetailSkeleton />;
  if (error || !product) {
    return (
      <main className="container">
        <ErrorMessage message={error || '상품 정보를 불러오지 못했습니다.'} />
      </main>
    );
  }

  // PRODUCT.PRD_STATUS_CD는 등록 후 계속 PRDC0002로 남아있고(백엔드에 PRDC0003 전이 로직 자체가 없음),
  // 실제 진행 상태는 AUCTION.AUC_STATUS_CD에만 있어서 그쪽을 기준으로 판정한다.
  const isDraft         = product.prdStatusCd === 'PRDC0001';
  const isActive        = !isDraft && ['AUCC0001', 'AUCC0002'].includes(auctionStatus?.aucStatusCd);
  const isEnded         = auctionStatus?.aucStatusCd === 'AUCC0004'; // 유찰
  const isCancelPending = auctionStatus?.aucStatusCd === 'AUCC0006';
  const isCancelled     = auctionStatus?.aucStatusCd === 'AUCC0005'; // 관리자 승인으로 취소 확정된 경매
  // 낙찰(AUCC0003) 이후로는 거래 화면이 이 상품의 진행 상황을 담당한다 — 취소 요청도 그쪽에서 처리한다.
  const isSold          = auctionStatus?.aucStatusCd === 'AUCC0003';

  const priceLabel = isActive ? '현재가' : '시작가';
  const priceAmt   = isActive && auctionStatus?.aucCurAmt != null ? auctionStatus.aucCurAmt : product.prdStartAmt;

  const hasBids = (auctionStatus?.bidCount ?? 0) > 0;

  const resultText = isCancelled
    ? '관리자 승인으로 취소가 확정된 상품입니다.'
    : isCancelPending
    ? '취소 요청 검토 중입니다.'
    : isSold    ? '낙찰되어 거래가 진행 중입니다.'
    : isActive  ? ''
    : isEnded   ? '유효 입찰 없이 경매가 종료되었습니다.'
    : '임시저장 상태입니다. 경매 설정을 완료해 공개할 수 있습니다.';

  const noticeClass = (isCancelPending || isCancelled) ? 'danger-note' : 'notice';
  const noticeText  = isCancelled
    ? '취소된 상품은 재등록할 수 없습니다.'
    : isCancelPending
    ? '취소 요청이 접수되었습니다. 관리자 검토 중이며 승인 전까지 입찰·즉시구매가 차단됩니다.'
    : isSold    ? '거래 취소 요청을 포함한 이후 진행 상황은 거래 페이지에서 확인할 수 있습니다.'
    : isActive  ? (hasBids
        ? '입찰자의 포인트가 보류(홀딩)되어 있어, 취소하려면 관리자 승인이 필요합니다.'
        : '아직 입찰이 없어 취소해도 다른 회원에게 영향이 없습니다.')
    : isEnded   ? '유찰 건은 거래와 정산이 생성되지 않습니다.'
    : '임시저장 상품은 경매 설정 완료 후 공개됩니다.';

  const productImages = product.imageList?.length > 0 ? product.imageList : (product.prdImgUrl ? [{ url: product.prdImgUrl }] : []);

  return (
    <main className="container">
      <div style={{ position: 'relative', marginTop: 24 }}>

      {/* 2컬럼 레이아웃 — flex-start: 왼쪽 상품설명이 더보기로 늘어나도 오른쪽 카드들은 그대로 둠 */}
      <div className="seller-auction-layout" style={{ alignItems: 'flex-start', marginBottom: 48 }}>

        {/* 왼쪽: 상품 상세내용 + 입찰 이력을 별개 카드로 세로로 쌓는다 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: '#eef2fb', padding: '14px 20px' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>상품 상세내용</h3>
          </div>
          <div style={{ padding: '20px' }}>
          <div className="seller-product" style={{ alignItems: 'flex-start' }}>
            {(() => {
              const images = productImages;
              const hasMultiple = images.length > 1;
              const current = images[imgIdx];
              return (
                <div className="seller-product-img" style={{ position: 'relative' }}>
                  {current && (
                    <img
                      src={toImageUrl(current.url)}
                      alt={product.prdNm}
                      onClick={() => setLightboxOpen(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                    />
                  )}
                  {imgIdx === 0 && current && (
                    <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,100,255,0.82)', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '3px 0', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>대표이미지</span>
                  )}
                  {hasMultiple && (
                    <>
                      <button
                        type="button"
                        onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                        style={{ position: 'absolute', top: '50%', left: 4, transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setImgIdx(i => (i + 1) % images.length)}
                        style={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
              );
            })()}
            <div className="seller-info-split">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="seller-status-row">
                  <DomainStatus
                    tone={auctionStatus?.aucStatusCd
                      ? (AUCTION_STATUS_TONE[auctionStatus.aucStatusCd] ?? 'neutral')
                      : (PRODUCT_STATUS_TONE[product.prdStatusCd] ?? 'neutral')}
                    variant="soft"
                  >
                    {auctionStatus?.aucStatusCd ? (AUC_STATUS_LABEL[auctionStatus.aucStatusCd] ?? auctionStatus.aucStatusCd) : (STATUS_LABEL[product.prdStatusCd] ?? product.prdStatusCd)}
                  </DomainStatus>
                  <CategoryTag tone="neutral" variant="soft">판매</CategoryTag>
                </div>
                <h2 style={{ fontSize: 22, lineHeight: 1.4, margin: '8px 0 0' }}>{product.prdNm}</h2>
                {resultText && <p className="muted small" style={{ margin: '2px 0 0' }}>{resultText}</p>}

                <div className="seller-metrics" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 'auto', paddingTop: 14 }}>
                  <div className="seller-metric-compact" style={{ minHeight: 0, padding: '6px 12px' }}><span>입찰 현황</span><strong>{auctionStatus ? `${auctionStatus.bidCount}건` : '—'}</strong></div>
                  <div className="seller-metric-compact" style={{ minHeight: 0, padding: '6px 12px' }}><span>관심 인원</span><strong>{favoriteCount != null ? `${favoriteCount}명` : '—'}</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: '#1a1a18' }}>
                <p style={{ margin: 0 }}>카테고리 : {product.catNm || '-'}</p>
                <p style={{ margin: 0 }}>거래형태 : {TRADE_LABEL[product.prdTrdMethodCd] ?? product.prdTrdMethodCd}</p>
                <div className="seller-price-row" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <p className="seller-price" style={{ margin: 0 }}>{priceLabel} {priceAmt != null ? formatPoint(priceAmt) : '-'}</p>
                  <span className="seller-price-divider" style={{ width: 1, height: 20, background: '#e2e1dc' }} />
                  <p className="seller-price" style={{ margin: 0 }}>즉시구매가 {product.prdIbyAmt != null ? formatPoint(product.prdIbyAmt) : '-'}</p>
                </div>
                <p style={{ margin: 0 }}>등록일자 : {product.prdRegDt ? new Date(product.prdRegDt).toLocaleDateString('ko-KR') : '-'}</p>
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: 'block', color: '#5f5e5a', fontSize: 13 }}>{isReadyAuction ? '시작까지' : '남은시간'}</span>
                  <strong style={{ display: 'block', fontSize: 17, marginTop: 2 }}>{remainTime || '—'}</strong>
                  {countdownTargetDt && (
                    <small className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                      {new Date(countdownTargetDt).toLocaleString('ko-KR')} {isReadyAuction ? '시작' : '종료'}
                      {!isReadyAuction && auctionStatus.aucExtCnt > 0 && ` · 자동연장 ${auctionStatus.aucExtCnt}회`}
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 팜플렛형 긴 설명은 넣지 않기로 해서, 고정 높이 안에서만 스크롤되게 둔다 */}
          <div style={{ marginTop: 18, borderTop: '1px solid #f0efec', paddingTop: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#5f5e5a', fontWeight: 600 }}>상품 설명</p>
            {product.prdCn ? (
              <div
                className="rich-text-editor-body"
                style={{ fontSize: 16, lineHeight: 1.7, color: '#1a1a18', minHeight: 120, maxHeight: 120, overflowY: 'auto', padding: 0 }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolveDescriptionImagesForDisplay(product.prdCn), { ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'img', 'div', 'span'], ALLOWED_ATTR: ['src', 'style'] }) }}
              />
            ) : (
              <p style={{ margin: 0, fontSize: 15, color: '#a8a79f' }}>상품설명이 없습니다.</p>
            )}
          </div>

          </div>{/* /padding div */}

        </section>

        {/* 입찰 이력·구매자 문의 — 상세내용과 별개로, 한 줄에 절반씩 나란히 배치 */}
        <div className="seller-history-split">
        <aside className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 420 }}>
          <div style={{ background: '#eef2fb', padding: '14px 20px' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>입찰 이력</h3>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {bids.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>등록된 입찰이 없습니다.</p>
            ) : (
              <>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {bids
                  .slice((bidsPage - 1) * HISTORY_PAGE_SIZE, bidsPage * HISTORY_PAGE_SIZE)
                  .map((b, i) => (
                  <li key={b.bidId} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: '1px solid #f0efec' }}>
                    <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: '#0064ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                      {(bidsPage - 1) * HISTORY_PAGE_SIZE + i + 1}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 15 }}>{b.bidderName}</p>
                        <p className="muted small" style={{ margin: 0, fontSize: 13 }}>{new Date(b.bidDateTime).toLocaleString('ko-KR')}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: '#0048bf' }}>{formatPoint(b.bidPrice)}</p>
                        <DomainStatus tone="neutral" variant="outline">{b.bidStatusName}</DomainStatus>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                page={bidsPage}
                totalPages={Math.ceil(bids.length / HISTORY_PAGE_SIZE)}
                onPageChange={setBidsPage}
              />
              </>
            )}
          </div>
        </aside>

        {/* 구매자 문의 — 리스트 형식, 문의마다 답변 1회 + 등록 후 10분 이내 수정 가능 */}
        <aside className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 420 }}>
          <div style={{ background: '#eef2fb', padding: '14px 20px' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>구매자 문의</h3>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {inquiries.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>등록된 문의가 없습니다.</p>
            ) : (
              <>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                {inquiries
                  .slice((inquiriesPage - 1) * HISTORY_PAGE_SIZE, inquiriesPage * HISTORY_PAGE_SIZE)
                  .map(inq => {
                  const hasReply = !!inq.reply;
                  const withinEditWindow = hasReply && !!inq.replyRegDt
                    && (replyClock - new Date(inq.replyRegDt).getTime() < REPLY_EDIT_WINDOW_MS);
                  const isEditing = editingSn === inq.inquirySn;
                  const isExpanded = expandedSn === inq.inquirySn;

                  return (
                    <li key={inq.inquirySn} style={{ border: '1px solid #f0efec', borderRadius: 10, padding: '14px 16px' }}>
                      {/* 클릭해서 펼치기/접기 — 펼쳐야 답변 작성·조회·신고 UI가 나온다 */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedSn(prev => prev === inq.inquirySn ? null : inq.inquirySn)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpandedSn(prev => prev === inq.inquirySn ? null : inq.inquirySn); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                          <p style={{ margin: '0 0 4px', fontSize: 13, color: '#969696' }}>{inq.usrNm} · {inq.regDt}</p>
                          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: hasReply ? '#0064ff' : '#c0392b' }}>
                            {hasReply ? '답변완료' : '미답변'}
                          </span>
                        </div>
                        <p style={{ margin: isExpanded ? '0 0 10px' : 0, fontSize: 15, lineHeight: 1.6 }}>{inq.content}</p>
                      </div>

                      {isExpanded && (hasReply ? (
                        isEditing ? (
                          <div>
                            <textarea
                              rows={2}
                              value={editDrafts[inq.inquirySn] ?? inq.reply}
                              onChange={e => setEditDrafts(prev => ({ ...prev, [inq.inquirySn]: e.target.value }))}
                              style={{ width: '100%', fontSize: 14, resize: 'none', borderRadius: 6, border: '1px solid #d1d0cc', padding: '8px 10px' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                              <ActionButton onClick={() => setEditingSn(null)} size="sm" tone="neutral">취소</ActionButton>
                              <ActionButton loading={replySubmitting} onClick={() => handleReplyEditSubmit(inq.inquirySn)} size="sm">
                                {replySubmitting ? '저장 중...' : '저장'}
                              </ActionButton>
                            </div>
                          </div>
                        ) : (
                          <div style={{ background: '#f8f8f6', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#0064ff' }}>판매자 답변</p>
                                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{inq.reply}</p>
                              </div>
                              {withinEditWindow && (
                                <ActionButton
                                  className="shrink-0"
                                  size="sm"
                                  tone="neutral"
                                  onClick={() => {
                                    setEditingSn(inq.inquirySn);
                                    setEditDrafts(prev => ({ ...prev, [inq.inquirySn]: inq.reply }));
                                  }}
                                >
                                  수정
                                </ActionButton>
                              )}
                            </div>
                          </div>
                        )
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <textarea
                            rows={2}
                            placeholder="답변 내용을 입력해 주세요"
                            value={replyDrafts[inq.inquirySn] ?? ''}
                            onChange={e => setReplyDrafts(prev => ({ ...prev, [inq.inquirySn]: e.target.value }))}
                            style={{ flex: 1, fontSize: 14, resize: 'none', borderRadius: 6, border: '1px solid #d1d0cc', padding: '8px 10px' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                            <ActionButton
                              onClick={() => { setReportTargetSn(inq.inquirySn); setReportOpen(true); }}
                              size="sm"
                              tone="danger-outline"
                              className="!border-[#e8a0a0] !bg-[#fcebeb] !text-[#a32d2d]"
                            >
                              신고
                            </ActionButton>
                            <ActionButton
                              onClick={() => requestReplySubmit(inq.inquirySn)}
                              loading={replySubmitting}
                              size="sm"
                            >
                              {replySubmitting ? '등록 중...' : '답변 등록'}
                            </ActionButton>
                          </div>
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>
              <Pagination
                page={inquiriesPage}
                totalPages={Math.ceil(inquiries.length / HISTORY_PAGE_SIZE)}
                onPageChange={setInquiriesPage}
              />
              </>
            )}
          </div>
        </aside>
        </div>{/* /입찰이력·구매자문의 grid */}
        </div>{/* /왼쪽 컬럼 wrapper */}

        {/* 오른쪽: 상태별 관리 + 상품 수정 이력 */}
        <div ref={rightColRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <aside className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#eef2fb', padding: '14px 20px' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>상태별 관리</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {isCancelPending && <p className="muted small" style={{ marginBottom: 18, lineHeight: 1.65 }}>취소 요청 검토 중입니다. 승인 시 경매가 취소되며, 반려 시 요청 전 상태로 복구됩니다(종료시각이 이미 지났다면 반려 시점 기준 1시간 연장됩니다).</p>}
              {isActive && !isCancelPending && <p className="muted small" style={{ marginBottom: 18, lineHeight: 1.65 }}>입찰이 시작된 상품은 핵심 정보 수정이 제한됩니다.</p>}
              {isDraft && <p className="muted small" style={{ marginBottom: 18, lineHeight: 1.65 }}>경매 설정을 완료해 공개할 수 있습니다.</p>}
              <div className="seller-action-list">
                {isActive && (
                  isCancelPending
                    ? <ActionButton disabled fullWidth tone="danger">취소 요청 검토 중</ActionButton>
                    : <ActionButton fullWidth onClick={() => setCancelOpen(true)} tone="danger">경매 취소 요청</ActionButton>
                )}
                {isSold && <ActionButton disabled={!auctionStatus?.aucSn} fullWidth to={`/auction/${auctionStatus?.aucSn}/trade`}>거래 페이지로 이동</ActionButton>}
                {isEnded && <ActionButton disabled={!auctionStatus?.aucSn} fullWidth to={`/auction/${auctionStatus?.aucSn}`} tone="outline">종료 화면 보기</ActionButton>}
                {isEnded && <ActionButton fullWidth state={{ relistFromPrdSn: Number(prdSn) }} to="/product/register">재등록</ActionButton>}
                {isDraft && <ActionButton fullWidth state={{ prdSn: Number(prdSn) }} to="/product/register">상품 등록 재개</ActionButton>}
              </div>
              <div className={noticeClass} style={{ marginTop: 16 }}>{noticeText}</div>
            </div>
          </aside>

          {/* 상품 변경사항 추가 (F-AUC-007) — 사이즈 고정, 왼쪽 컬럼 높이에 맞춰 늘어나지 않음 */}
          <aside className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#eef2fb', padding: '14px 20px' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>상품 설명 변경사항 추가</h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {isActive && comments.length >= 3 && (
                <p className="muted" style={{ fontSize: 14, margin: 0 }}>변경 내역은 최대 3개까지 등록할 수 있습니다.</p>
              )}
              {isActive && comments.length < 3 && (
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="제목 (필수)"
                    value={cmtTtl}
                    onChange={e => setCmtTtl(e.target.value)}
                    style={{ width: '100%', fontSize: 16 }}
                  />
                  <p style={{ margin: '2px 0 6px', fontSize: 12, color: cmtTtl.length >= 30 ? '#c0392b' : '#969696', textAlign: 'right' }}>{cmtTtl.length}/30</p>
                  <hr style={{ border: 'none', borderTop: '1px solid #f0efec', margin: '0 0 8px' }} />
                  <textarea
                    rows={3}
                    maxLength={100}
                    placeholder="내용 (선택)"
                    value={cmtCn}
                    onChange={e => setCmtCn(e.target.value)}
                    style={{ width: '100%', fontSize: 16, resize: 'none', overflowY: 'auto' }}
                  />
                  <p style={{ margin: '2px 0 4px', fontSize: 12, color: cmtCn.length >= 100 ? '#c0392b' : '#969696', textAlign: 'right' }}>{cmtCn.length}/100</p>
                  <p className="muted" style={{ fontSize: 14, margin: '0 0 4px' }}>변경사항은 최대 3개까지 등록할 수 있습니다.</p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                    <ActionButton loading={cmtSubmitting} onClick={requestCommentSubmit} size="sm">
                      {cmtSubmitting ? '등록 중...' : '등록'}
                    </ActionButton>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* 수정 내역 — 상품 변경사항 추가 바로 아래, 고정 위치 */}
          <aside className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#eef2fb', padding: '14px 20px' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>변경 내역</h3>
            </div>
            <div style={{ padding: '6px 20px', minHeight: 250, display: 'flex', flexDirection: 'column' }}>
              {comments.length === 0 ? (
                <p className="muted" style={{ fontSize: 14 }}>등록된 수정 내역이 없습니다.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {comments.map((c, i) => (
                      <li key={c.prdCmtSn} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 4, borderBottom: '1px solid #f0efec' }}>
                        <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: '#0064ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                          {i + 1}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 16 }}>{c.prdCmtTtl}</p>
                          {c.prdCmtCn && <p style={{ margin: '0 0 4px', fontSize: 14, color: '#5f5e5a', whiteSpace: 'pre-wrap' }}>{c.prdCmtCn}</p>}
                          <p className="muted small" style={{ margin: 0, fontSize: 13 }}>{new Date(c.prdCmtRegDt).toLocaleDateString('ko-KR')}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
              )}
            </div>
          </aside>
        </div>
      </div>

      </div>

      {/* 구매자 문의 신고 모달 */}
      <div className={`modal ${reportOpen ? 'open' : ''}`} onClick={e => { if (e.target === e.currentTarget) { setReportOpen(false); setReportTargetSn(null); setReportContent(''); } }}>
        <div className="modal-box">
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>구매자 문의 신고</h3>
          <p className="muted small" style={{ marginBottom: 16 }}>
            "{inquiries.find(i => i.inquirySn === reportTargetSn)?.content ?? ''}" — 욕설 및 할인 요청 등 불필요한 문의내용이 포함되어 있을때 신고해주세요.
          </p>
          <div className="field">
            <label>신고 사유</label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="신고 사유를 입력해 주세요."
              value={reportContent}
              onChange={e => setReportContent(e.target.value)}
            />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <ActionButton onClick={() => { setReportOpen(false); setReportTargetSn(null); setReportContent(''); }} tone="neutral">취소</ActionButton>
            <ActionButton loading={reportSubmitting} onClick={handleReportSubmit} tone="danger">
              {reportSubmitting ? '접수 중...' : '신고하기'}
            </ActionButton>
          </div>
        </div>
      </div>

      {/* 경매 취소 요청 모달 (F-AUC-008) */}
      <div className={`modal ${cancelOpen ? 'open' : ''}`} onClick={e => { if (e.target === e.currentTarget) closeCancel(); }}>
        <div className="modal-box">
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>경매 취소 요청</h3>
          <div className="notice" style={{ marginBottom: 16 }}>
            {product.prdNm} · 시작가 {formatPoint(product.prdStartAmt)}
          </div>
          <div className="field">
            <label>취소 사유 선택</label>
            <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
              <option value="">사유를 선택해 주세요</option>
              {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <p className="muted small" style={{ marginBottom: 16 }}>
            취소 요청은 관리자 승인 후 처리됩니다. 승인 전까지 경매와 입찰자의 포인트 홀딩은 유지됩니다.
          </p>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <ActionButton onClick={closeCancel} tone="neutral">닫기</ActionButton>
            <ActionButton loading={cancelSubmitting} onClick={handleCancelSubmit} tone="danger">
              {cancelSubmitting ? '요청 중...' : '취소 요청 제출'}
            </ActionButton>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <AlertModal open={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg('')} />
      <ConfirmModal
        open={commentConfirmOpen}
        message="등록 후에는 수정할 수 없습니다."
        subMessage="이대로 등록하시겠습니까?"
        confirmLabel="등록"
        confirmTone="primary"
        onCancel={() => setCommentConfirmOpen(false)}
        onConfirm={handleCommentSubmit}
      />
      <ConfirmModal
        open={!!pendingReplySn}
        message="답변은 등록 후 10분까지만 수정할 수 있습니다."
        subMessage="이대로 등록하시겠습니까?"
        confirmLabel="등록"
        confirmTone="primary"
        onCancel={() => setPendingReplySn(null)}
        onConfirm={() => handleReplySubmit(pendingReplySn)}
      />
      <ImageLightbox
        images={productImages.map(img => toImageUrl(img.url))}
        initialIndex={imgIdx}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </main>
  );
}
