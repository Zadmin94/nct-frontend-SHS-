// src/components/product/MyProductList.jsx
// 내 판매 목록 순수 목록 컴포넌트 — MyProductListPage · MyPage 아코디언에서 재사용
// 마이페이지 공통 목록 컴포넌트를 사용하며 가격·날짜 표시 형식을 유지한다.
import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CalendarDays } from 'lucide-react';
import { toImageUrl } from '@api/fileApi';
import { deleteProduct } from '@api/productApi';
import { formatDate, formatPoint } from '@utils/common';
import { TRADE_LABEL, TRADE_STATUS_LABEL, AUC_STATUS_LABEL } from '@/constants/productConstants';
import { useMyProducts, useMyProductsSummary } from '@hooks/useProduct';
import Pagination from '@components/common/Pagination';
import Toast from '@components/common/Toast';
import ConfirmModal from '@components/common/ConfirmModal';
import MyPageListSectionLayout from '@components/mypage/MyPageListSectionLayout';
import MyPageAuctionListItem from '@components/mypage/MyPageAuctionListItem';
import MyPageListEmpty from '@components/mypage/MyPageListEmpty';
import MyPageListError from '@components/mypage/MyPageListError';
import MyPageContentHeader from '@components/mypage/MyPageContentHeader';
import MyPageStatusBadge from '@components/mypage/MyPageStatusBadge';
import MyPageListSkeleton from '@components/skeleton/MyPageListSkeleton';
import MyPageMobileCard from '@components/mypage/MyPageMobileCard';
import { ActionButton } from '@components/common/ui';

// ─── 필터 ────────────────────────────────────────────────────────────────────

const FILTERS = [
  { value: null,      label: '전체' },
  { value: 'DRAFT',   label: '임시저장' },
  { value: 'RESERVED', label: '예약' },
  { value: 'ACTIVE',  label: '경매중' },
  { value: 'TRADING', label: '거래중' },
  { value: 'DISPUTE', label: '보류/분쟁' },
  { value: 'CLOSED',  label: '종료' },
];

const CLOSED_SUB_FILTERS = [
  { value: '',         label: '전체 종료' },
  { value: 'DONE',     label: '완료' },
  { value: 'CANCELED', label: '취소' },
  { value: 'ENDED',    label: '유찰' },
];

// ─── 배지 ────────────────────────────────────────────────────────────────────
// AUC_STATUS_LABEL(라벨 문구)은 productConstants.js가 단일 소스 — 다른 화면과 표기 어긋남 방지.
// 배지 클래스는 이 목록 안의 TRADE_BADGE·PRD_STATUS_BADGE와 시각적으로 맞춰야 해서 로컬로 유지.

const AUC_STATUS_BADGE = {
  AUCC0001: 'badge-outline-gray',
  AUCC0002: 'badge-outline-orange',
  AUCC0003: 'badge-outline-gray',
  AUCC0004: 'badge-outline-gray',
  AUCC0005: 'badge-danger',
  AUCC0006: 'badge-danger', // 취소요청도 취소(AUCC0005)와 같은 색으로 — 둘 다 위험/주의 상태
  AUCC0013: 'badge-warning',
  AUCC9001: 'badge-warning',
};

const TRADE_BADGE = {
  TRDC0003: 'badge-teal',
  TRDC0004: 'badge-orange',
  TRDC0005: 'badge-orange',
  TRDC0006: 'badge-outline-gray',
  TRDC0007: 'badge-danger',
  TRDC0008: 'badge-danger',
};

// 상품이 혼합 방식이어도 실제 낙찰 시 선택한 거래 방식으로 현재 상태를 표시한다.
const getTradeStatusLabel = (product) => {
  if (product.tradeStatusCd === 'TRDC0004') {
    if (product.tradeMethodCd === 'TRDC0009') return '배송 중';
    if (product.tradeMethodCd === 'TRDC0010') return '직거래 중';
    return '배송·직거래 중';
  }

  return TRADE_STATUS_LABEL[product.tradeStatusCd] ?? product.tradeStatusCd;
};

const PRD_STATUS_LABEL = {
  PRDC0001: '임시저장',
  PRDC0002: '경매중',
  PRDC0003: '종료',
};

const PRD_STATUS_BADGE = {
  PRDC0001: 'badge-outline-gray',
  PRDC0002: 'badge-outline-orange',
  PRDC0003: 'badge-outline-gray',
};

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

// 임시저장(PRDC0001)은 예약 시작시각을 입력해뒀어도 아직 AUCTION이 생성되지 않은 초안일 뿐이라
// '예약'이라고 표시하지 않는다 — 실제로 서버에 경매가 잡혀 자동 시작되는 건 AUCC0001(READY)뿐이다.
const getProductStatusLabel = (product) => {
  if (product.tradeSn) return getTradeStatusLabel(product);
  if (product.aucStatusCd === 'AUCC0002') return '경매중';
  if (product.aucStatusCd === 'AUCC0003') return '거래중';
  if (product.aucStatusCd) return AUC_STATUS_LABEL[product.aucStatusCd] ?? product.aucStatusCd;

  return PRD_STATUS_LABEL[product.prdStatusCd] ?? product.prdStatusCd;
};

const getProductStatusBadgeClass = (product) => {
  if (product.tradeSn) return TRADE_BADGE[product.tradeStatusCd] ?? 'badge-outline-gray';
  if (product.aucStatusCd === 'AUCC0002') return 'badge-outline-orange';
  if (product.aucStatusCd === 'AUCC0003') return 'badge-teal';
  if (product.aucStatusCd) return AUC_STATUS_BADGE[product.aucStatusCd] ?? 'badge-outline-gray';

  return PRD_STATUS_BADGE[product.prdStatusCd] ?? 'badge-outline-gray';
};

// 데스크톱·모바일 두 렌더 블록에서 공통으로 쓰는 배지·상태 판정 — 규칙은 여기 한 곳에서만 정의한다
// (TradeHistory.jsx의 getStatusInfo()와 동일한 패턴, 호출은 블록마다 반복해도 로직은 하나로 유지)
const getProductStatusDisplay = (p) => ({
  badgeLabel: getProductStatusLabel(p),
  badgeClass: getProductStatusBadgeClass(p),
  isActive: p.prdStatusCd === 'PRDC0002',
  isDraft: p.prdStatusCd === 'PRDC0001',
  isEnded: p.prdStatusCd === 'PRDC0003',
});

// @ai_generated 거래 전에는 경매 가격, 거래 생성 후에는 확정 금액을 표시해 가격 의미를 섞지 않는다.
const getSalePriceItems = (product) => {
  if (product.tradeSn) {
    return [{ label: '확정 금액', value: formatPoint(product.tradeAmount) }];
  }

  if (product.aucStatusCd === 'AUCC0003') {
    return [{ label: '거래 정보 확인 필요', value: '-' }];
  }

  if (product.aucStatusCd === 'AUCC0004') {
    return [{ label: '시작가', value: formatPoint(product.prdStartAmt) }];
  }

  if (product.aucStatusCd === 'AUCC0005') {
    return Number(product.bidCount) > 0
      ? [{ label: '취소 시점 최고가', value: formatPoint(product.currentPrice) }]
      : [{ label: '시작가', value: formatPoint(product.prdStartAmt) }];
  }

  const hasBid = Number(product.bidCount) > 0;
  const primaryPrice = hasBid
    ? { label: '현재 최고가', value: formatPoint(product.currentPrice) }
    : { label: '시작가', value: formatPoint(product.prdStartAmt) };
  const priceItems = [primaryPrice];

  if (product.prdIbyAmt != null) {
    priceItems.push({ label: '즉시구매가', value: formatPoint(product.prdIbyAmt) });
  }

  return priceItems;
};

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function MyProductList() {
  const queryClient = useQueryClient();
  // 담당자 7: 상세·등록 화면에서 목록으로 돌아올 수 있도록 현재 경로를 전달한다.
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnState = { from: location.pathname + location.search };
  // @ai_generated 판매 목록 탭과 종료 하위 필터를 URL에서 복원하되 정의된 값만 허용한다.
  const requestedFilter = searchParams.get('tab');
  const filter = FILTERS.some(({ value }) => value === requestedFilter)
    ? requestedFilter
    : null;
  const requestedSubFilter = searchParams.get('sub') ?? '';
  const subFilter = CLOSED_SUB_FILTERS.some(({ value }) => value === requestedSubFilter)
    ? requestedSubFilter
    : '';
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage]           = useState(1);
  const [toast, setToast]         = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  const activeFilterType = filter === 'CLOSED' && subFilter
    ? subFilter
    : filter;

  const { data, isLoading, isError, refetch } = useMyProducts(page, 10, activeFilterType);
  const { data: summaryData, isLoading: isSummaryLoading } = useMyProductsSummary();
  const list       = data?.list       ?? [];
  const totalPages = data?.totalPages ?? 1;
  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();
  const visibleList = normalizedSearchKeyword
    ? list.filter((product) => String(product.prdNm ?? '').toLowerCase().includes(normalizedSearchKeyword))
    : list;
  const handleFilterChange = (value) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (value) nextSearchParams.set('tab', value);
    else nextSearchParams.delete('tab');
    nextSearchParams.delete('sub');
    setSearchParams(nextSearchParams, { replace: true });
    setPage(1);
  };

  const handleSubFilterChange = (value) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (value) nextSearchParams.set('sub', value);
    else nextSearchParams.delete('sub');
    setSearchParams(nextSearchParams, { replace: true });
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    window.scrollTo(0, 0);
  };

  const handleDeleteConfirm = async () => {
    const { prdSn } = confirmTarget;
    setConfirmTarget(null);
    try {
      await deleteProduct(prdSn);
      queryClient.invalidateQueries({ queryKey: ['products', 'my'] }); // 목록·필터 탭 개수 둘 다 갱신
    } catch (err) {
      setToast(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  if (isError) {
    return (
      <>
        <MyPageContentHeader title="상품 판매 목록" />
        <MyPageListError message="목록을 불러오지 못했습니다." onRetry={() => refetch()} />
      </>
    );
  }

  return (
    <>
      <MyPageListSectionLayout
        title="상품 판매 목록"
        summaryItems={[
          { label: '경매중', value: summaryData?.active ?? 0 },
          { label: '거래중', value: summaryData?.trading ?? 0 },
          { label: '종료', value: summaryData?.closed ?? 0 },
        ]}
        filterItems={FILTERS.map((item) => ({
          ...item,
          count: {
            DRAFT: summaryData?.draft,
            RESERVED: summaryData?.reserved,
            ACTIVE: summaryData?.active,
            TRADING: summaryData?.trading,
            DISPUTE: summaryData?.dispute,
            CLOSED: summaryData?.closed,
          }[item.value] ?? (item.value === null ? summaryData?.total : 0),
        }))}
        activeFilter={filter}
        onFilterChange={handleFilterChange}
        filterAriaLabel="판매 목록 상태"
        onSearch={setSearchKeyword}
        searchAriaLabel="판매 상품명 검색"
        extraControls={filter === 'CLOSED' ? (
          <select
            value={subFilter}
            onChange={e => handleSubFilterChange(e.target.value)}
            aria-label="종료 상태"
            className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#dce2ed] bg-white px-3 text-sm outline-none focus:border-[#1466f5]"
          >
            {CLOSED_SUB_FILTERS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        ) : null}
        isLoading={isLoading || isSummaryLoading}
      />

      {isLoading ? (
        <MyPageListSkeleton count={4} />
      ) : visibleList.length === 0 ? (
        <MyPageListEmpty
          message="해당 조건의 판매 내역이 없습니다."
          action={filter === null ? (
            <ActionButton
              state={returnState}
              to="/product/register"
            >
              경매 등록하기
            </ActionButton>
          ) : null}
        />
      ) : (
          <>
          {/* history-list의 display:grid가 불레이어 CSS라 Tailwind hidden(@layer utilities)보다 우선
              적용된다 — hidden/lg:block은 별도 래퍼에 둬서 두 display 선언이 충돌하지 않게 한다. */}
          <div className="hidden lg:block">
          <div className="history-list">
            {visibleList.map((p) => {
              const { badgeLabel, badgeClass, isActive, isDraft, isEnded } = getProductStatusDisplay(p);
              const priceItems = getSalePriceItems(p);

              return (
                <MyPageAuctionListItem
                  key={p.prdSn}
                  imageSrc={p.prdImgUrl ? toImageUrl(p.prdImgUrl) : ''}
                  imageAlt={p.prdNm}
                  imageFallback="상품 이미지"
                  badge={<MyPageStatusBadge className={badgeClass}>{badgeLabel}</MyPageStatusBadge>}
                  title={p.prdNm}
                  topLine={`확정날짜 ${formatDate(p.tradeCreatedAt ?? p.prdRegDt)} / 완료날짜 ${formatDate(p.tradeCompletedAt)}`}
                  priceItems={priceItems}
                  tradeMethodLabel={TRADE_LABEL[p.prdTrdMethodCd] ?? p.prdTrdMethodCd}
                  actionButton={(
                    <>
                    {p.tradeSn && (
                      <ActionButton
                        size="sm"
                        state={returnState}
                        to={p.aucSn
                          ? `/auction/${p.aucSn}/trade`
                          : `/trades/${p.tradeSn}/seller`}
                      >
                        거래 관리
                      </ActionButton>
                    )}
                    {!p.tradeSn && isActive && p.aucStatusCd === 'AUCC0005' && (
                      <ActionButton size="sm" state={returnState} to={`/product/${p.prdSn}/seller`} tone="neutral">
                        취소 상품 보기
                      </ActionButton>
                    )}
                    {!p.tradeSn && isActive && p.aucStatusCd !== 'AUCC0005' && (
                      <ActionButton size="sm" state={returnState} to={`/product/${p.prdSn}/seller`}>
                        판매 관리
                      </ActionButton>
                    )}
                    {isDraft && (
                      <ActionButton size="sm" state={{ prdSn: p.prdSn, ...returnState }} to="/product/register" tone="neutral">
                        등록재개
                      </ActionButton>
                    )}
                    {!p.tradeSn && isEnded && (
                      <ActionButton size="sm" state={returnState} to={`/product/${p.prdSn}/seller`} tone="neutral">
                        판매 기록
                      </ActionButton>
                    )}
                    {(isDraft || isEnded) && !p.tradeSn && p.aucStatusCd !== 'AUCC0003' && (
                      <ActionButton onClick={() => setConfirmTarget({ prdSn: p.prdSn, prdNm: p.prdNm })} size="sm" tone="danger">
                        삭제
                      </ActionButton>
                    )}
                    </>
                  )}
                />
              );
            })}
          </div>
          </div>
          <div className="grid gap-4 lg:hidden">
            {visibleList.map((p) => {
              const { badgeLabel, badgeClass, isActive, isDraft, isEnded } = getProductStatusDisplay(p);
              const priceItems = getSalePriceItems(p);

              return (
                <MyPageMobileCard
                  key={p.prdSn}
                  imageSrc={p.prdImgUrl ? toImageUrl(p.prdImgUrl) : ''}
                  imageAlt={p.prdNm}
                  imageFallbackLabel="상품 이미지"
                  badge={<MyPageStatusBadge className={badgeClass}>{badgeLabel}</MyPageStatusBadge>}
                  title={p.prdNm}
                  priceItems={priceItems}
                  infoItems={[
                    { icon: CalendarDays, label: '확정날짜', value: formatDate(p.tradeCreatedAt ?? p.prdRegDt) },
                    { icon: CalendarCheck, label: '완료날짜', value: formatDate(p.tradeCompletedAt) },
                  ]}
                  footerLeft={`거래 방식 · ${TRADE_LABEL[p.prdTrdMethodCd] ?? p.prdTrdMethodCd}`}
                  actionButton={(
                    <>
                      {p.tradeSn && (
                        <ActionButton
                          size="sm"
                          state={returnState}
                          to={p.aucSn ? `/auction/${p.aucSn}/trade` : `/trades/${p.tradeSn}/seller`}
                        >
                          거래 관리
                        </ActionButton>
                      )}
                      {!p.tradeSn && isActive && (
                        <ActionButton
                          size="sm"
                          state={returnState}
                          to={`/product/${p.prdSn}/seller`}
                          tone={p.aucStatusCd === 'AUCC0005' ? 'neutral' : 'primary'}
                        >
                          {p.aucStatusCd === 'AUCC0005' ? '취소 상품 보기' : '판매 관리'}
                        </ActionButton>
                      )}
                      {isDraft && (
                        <ActionButton size="sm" state={{ prdSn: p.prdSn, ...returnState }} to="/product/register" tone="neutral">등록재개</ActionButton>
                      )}
                      {!p.tradeSn && isEnded && (
                        <ActionButton size="sm" state={returnState} to={`/product/${p.prdSn}/seller`} tone="neutral">판매 기록</ActionButton>
                      )}
                      {(isDraft || isEnded) && !p.tradeSn && p.aucStatusCd !== 'AUCC0003' && (
                        <ActionButton onClick={() => setConfirmTarget({ prdSn: p.prdSn, prdNm: p.prdNm })} size="sm" tone="danger">삭제</ActionButton>
                      )}
                    </>
                  )}
                />
              );
            })}
          </div>
          </>
      )}
      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} showSinglePage />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <ConfirmModal
        open={!!confirmTarget}
        message={confirmTarget ? `"${confirmTarget.prdNm}" 상품을 삭제하시겠습니까?` : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
