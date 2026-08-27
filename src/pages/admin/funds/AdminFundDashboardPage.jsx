import { createElement, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Landmark,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { getAdminFundSummary } from '@api/adminFundApi';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import PageMeta from '@components/admin/PageMeta';
import DateRangePicker from '@components/product/DateRangePicker';
import './adminFundDashboardPage.css';

const MAX_PERIOD_DAYS = 366;

const FUND_COLORS = {
  available: '#2563eb',
  hold: '#d97706',
  escrow: '#0f766e',
  settleable: '#16a34a',
  exchange: '#7c3aed',
  auction: '#2563eb',
  service: '#7c3aed',
};

const FLOW_METRICS = [
  {
    key: 'charge',
    label: '충전 완료',
    summaryField: 'periodChargeAmount',
    icon: ArrowDownToLine,
    color: '#2563eb',
  },
  {
    key: 'trade',
    label: '완료 거래액',
    icon: CircleDollarSign,
    color: '#0f766e',
  },
  {
    key: 'exchange',
    label: '환전 지급',
    summaryField: 'periodExchangePaidAmount',
    icon: ArrowUpFromLine,
    color: '#dc2626',
  },
  {
    key: 'commission',
    label: '수수료 수익',
    summaryField: 'periodCommissionAmount',
    icon: Landmark,
    color: '#7c3aed',
  },
];

const formatPoint = (value) => `${Number(value ?? 0).toLocaleString('ko-KR')}P`;
const formatCount = (value) => `${Number(value ?? 0).toLocaleString('ko-KR')}건`;
const formatPercent = (value, total) => (
  total > 0 ? `${((Number(value) / total) * 100).toFixed(1)}%` : '0.0%'
);
const formatAxisPoint = (value) => {
  const amount = Number(value ?? 0);
  if (amount >= 100000000) {
    const hundredMillions = amount / 100000000;
    return `${Number.isInteger(hundredMillions) ? hundredMillions : hundredMillions.toFixed(1)}억P`;
  }
  if (amount >= 10000) {
    const tenThousands = amount / 10000;
    return `${Number.isInteger(tenThousands) ? tenThousands : tenThousands.toFixed(1)}만P`;
  }
  return formatPoint(amount);
};
const getNiceAxisMax = (value) => {
  const amount = Number(value ?? 0);
  if (amount <= 0) return 1;

  const target = amount * 1.1;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
};
const getDateLabelStep = (count) => {
  if (count <= 14) return 1;
  if (count <= 31) return 5;
  if (count <= 92) return 14;
  return 30;
};
const formatDate = (value) => {
  if (!value) return '-';
  const [, month, date] = String(value).split('-');
  return `${Number(month)}/${Number(date)}`;
};
const formatDateTime = (value) => (
  value ? String(value).replace('T', ' ').slice(0, 16) : '-'
);
const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const createDefaultPeriod = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: formatDateInput(from), to: formatDateInput(to) };
};
const countPeriodDays = ({ from, to }) => {
  if (!from || !to || from > to) return 0;
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((toTime - fromTime) / 86400000) + 1;
};
const getPeriodError = (period, maxDate) => {
  if (!period.from || !period.to) return '시작일과 종료일을 모두 선택해 주세요.';
  if (period.from > period.to) return '시작일은 종료일보다 늦을 수 없습니다.';
  if (period.to > maxDate) return '종료일은 오늘보다 늦을 수 없습니다.';
  if (countPeriodDays(period) > MAX_PERIOD_DAYS) return '조회 기간은 최대 1년까지 선택할 수 있습니다.';
  return '';
};
const getDailyMetricValue = (flow, metricKey) => {
  if (!flow) return 0;
  if (metricKey === 'trade') {
    return Number(flow.auctionTradeAmount ?? 0) + Number(flow.serviceTradeAmount ?? 0);
  }
  if (metricKey === 'charge') return Number(flow.chargeAmount ?? 0);
  if (metricKey === 'exchange') return Number(flow.exchangePaidAmount ?? 0);
  return Number(flow.commissionAmount ?? 0);
};
const getPeriodMetricValue = (summary, metric) => {
  if (!summary) return 0;
  if (metric.key === 'trade') {
    return Number(summary.periodAuctionTradeAmount ?? 0)
      + Number(summary.periodServiceTradeAmount ?? 0);
  }
  return Number(summary[metric.summaryField] ?? 0);
};

const AdminFundDashboardPage = () => {
  const [periodForm, setPeriodForm] = useState(createDefaultPeriod);
  const [appliedPeriod, setAppliedPeriod] = useState(createDefaultPeriod);
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [selectedFlowMetric, setSelectedFlowMetric] = useState('trade');
  const [hoveredFlowDate, setHoveredFlowDate] = useState(null);
  const [pinnedFlowDate, setPinnedFlowDate] = useState(null);
  const [hoveredPositionKey, setHoveredPositionKey] = useState(null);
  const [selectedPositionKey, setSelectedPositionKey] = useState(null);
  const today = formatDateInput(new Date());
  const periodError = getPeriodError(periodForm, today);
  const periodDays = countPeriodDays(appliedPeriod);
  const summaryQuery = useQuery({
    placeholderData: (previousData) => previousData,
    queryKey: ['admin', 'funds', 'summary', appliedPeriod.from, appliedPeriod.to],
    queryFn: () => getAdminFundSummary(appliedPeriod),
  });
  const summary = summaryQuery.data;

  const pointPositions = useMemo(() => [
    {
      key: 'available',
      label: '사용 가능 포인트',
      value: Math.max(0, Number(summary?.availablePointBalance ?? 0)),
      detail: '회원이 바로 사용할 수 있는 잔액',
      color: FUND_COLORS.available,
    },
    {
      key: 'hold',
      label: '입찰 홀딩',
      value: Math.max(0, Number(summary?.holdPointBalance ?? 0)),
      detail: '진행 중인 입찰에 묶여 있는 포인트',
      color: FUND_COLORS.hold,
    },
    {
      key: 'escrow',
      label: '거래 보관금',
      value: Math.max(0, Number(summary?.activeEscrowAmount ?? 0)),
      detail: '정산 또는 환불 전 플랫폼 보관 금액',
      color: FUND_COLORS.escrow,
    },
    {
      key: 'settleable',
      label: '정산 가능 포인트',
      value: Math.max(0, Number(summary?.settleablePointBalance ?? 0)),
      detail: '판매자·제공자가 전환할 수 있는 잔액',
      color: FUND_COLORS.settleable,
    },
    {
      key: 'exchange',
      label: '환전 지급 대기',
      value: Math.max(0, Number(summary?.pendingExchangeAmount ?? 0)),
      detail: '신청 차감 후 실제 지급을 기다리는 금액',
      color: FUND_COLORS.exchange,
    },
  ], [summary]);
  const managedPointTotal = pointPositions.reduce((sum, item) => sum + item.value, 0);
  const donutSegments = useMemo(() => {
    if (managedPointTotal <= 0) return [];

    let offset = 0;
    return pointPositions.filter((position) => position.value > 0).map((position) => {
      const percent = (position.value / managedPointTotal) * 100;
      const gap = Math.min(.7, percent * .18);
      const segment = {
        ...position,
        offset,
        percent,
        visiblePercent: Math.max(.2, percent - gap),
      };
      offset += percent;
      return segment;
    });
  }, [managedPointTotal, pointPositions]);
  const activePositionKey = hoveredPositionKey ?? selectedPositionKey;
  const activePosition = pointPositions.find((item) => item.key === activePositionKey);

  const selectedMetric = FLOW_METRICS.find((metric) => metric.key === selectedFlowMetric)
    ?? FLOW_METRICS[0];
  const dailyFlows = useMemo(() => summary?.dailyFlows ?? [], [summary?.dailyFlows]);
  const maxDailyAmount = useMemo(() => getNiceAxisMax(Math.max(
    0,
    ...dailyFlows.map((flow) => getDailyMetricValue(flow, selectedFlowMetric)),
  )), [dailyFlows, selectedFlowMetric]);
  const activeFlowDate = hoveredFlowDate ?? pinnedFlowDate;
  const activeDailyFlow = dailyFlows.find((flow) => flow.date === activeFlowDate) ?? null;
  const displayedDailyFlow = activeDailyFlow ?? dailyFlows.at(-1);
  const activeDailyAmount = getDailyMetricValue(displayedDailyFlow, selectedFlowMetric);
  const dateLabelStep = getDateLabelStep(dailyFlows.length);

  const tradeUsage = [
    {
      key: 'auction',
      label: '경매 거래',
      value: Math.max(0, Number(summary?.periodAuctionTradeAmount ?? 0)),
      color: FUND_COLORS.auction,
    },
    {
      key: 'service',
      label: '서비스 거래',
      value: Math.max(0, Number(summary?.periodServiceTradeAmount ?? 0)),
      color: FUND_COLORS.service,
    },
  ];
  const periodTradeTotal = tradeUsage.reduce((sum, item) => sum + item.value, 0);

  const adminActions = [
    {
      key: 'hold',
      title: '반환 확인 필요 홀딩',
      description: '입찰·경매 상태와 맞지 않는 홀딩',
      count: Number(summary?.attentionHoldCount ?? 0),
      amount: summary?.attentionHoldAmount,
      icon: LockKeyhole,
      tone: 'hold',
      link: '/admin/auctions',
      linkLabel: '경매 관리',
    },
    {
      key: 'held-settlement',
      title: '정산 보류',
      description: '분쟁 또는 관리자 확인으로 멈춘 정산',
      count: Number(summary?.heldSettlementCount ?? 0),
      amount: summary?.heldSettlementAmount,
      icon: ShieldCheck,
      tone: 'danger',
      link: '/admin/settlements',
      linkLabel: '정산 관리',
    },
    {
      key: 'pending-exchange',
      title: '환전 지급 대기',
      description: '계좌 지급 처리가 필요한 환전 신청',
      count: Number(summary?.pendingExchangeCount ?? 0),
      amount: summary?.pendingExchangeAmount,
      icon: Clock3,
      tone: 'primary',
      link: '/admin/exchanges',
      linkLabel: '환전 관리',
    },
  ].filter((item) => item.count > 0);

  const togglePosition = (key) => {
    setSelectedPositionKey((current) => (current === key ? null : key));
  };

  const handlePositionKeyDown = (event, key) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    togglePosition(key);
  };

  useEffect(() => {
    const clearPositionSelection = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(
        '.admin-fund-donut-chart__segment, .admin-fund-position-legend > button',
      )) return;
      setSelectedPositionKey(null);
    };

    document.addEventListener('pointerdown', clearPositionSelection);
    return () => document.removeEventListener('pointerdown', clearPositionSelection);
  }, []);

  return (
    <div className="admin-fund-page">
      <PageMeta title="자금 운영 대시보드" />
      <AdminPageHeader
        action={(
          <div className="admin-fund-header-actions">
            {summary?.generatedAt && (
              <span className="admin-fund-generated-at">
                {formatDateTime(summary.generatedAt)} 기준
              </span>
            )}
            <button
              aria-label="자금 현황 새로고침"
              className="admin-fund-refresh"
              disabled={summaryQuery.isFetching}
              onClick={() => summaryQuery.refetch()}
              type="button"
            >
              <RefreshCw aria-hidden="true" />
            </button>
          </div>
        )}
        title="자금 운영 대시보드"
      />

      {summaryQuery.isLoading && (
        <div className="admin-fund-state" aria-live="polite">자금 현황을 불러오는 중입니다.</div>
      )}

      {summaryQuery.isError && (
        <div className="admin-fund-state is-error" role="alert">
          <strong>자금 현황을 불러오지 못했습니다.</strong>
          <button onClick={() => summaryQuery.refetch()} type="button">다시 시도</button>
        </div>
      )}

      {summary && (
        <>
          <section className="admin-fund-panel admin-fund-position" aria-labelledby="fund-position-title">
            <div className="admin-fund-panel__heading">
              <div>
                <h2 id="fund-position-title">현재 포인트 현황</h2>
                <p>현재 시점에 플랫폼이 관리하고 있는 포인트의 위치입니다.</p>
              </div>
            </div>

            <div className="admin-fund-position__content">
              <div className="admin-fund-donut-area">
                <div
                  className={`admin-fund-donut-chart${activePositionKey ? ' has-active' : ''}`}
                  role="group"
                  aria-label="현재 포인트 구성"
                >
                  <svg viewBox="0 0 100 100">
                    <circle
                      className="admin-fund-donut-chart__track"
                      cx="50"
                      cy="50"
                      fill="none"
                      pathLength="100"
                      r="38"
                    />
                    {donutSegments.map((segment) => (
                      <circle
                        aria-label={`${segment.label} ${formatPoint(segment.value)}, ${formatPercent(segment.value, managedPointTotal)}`}
                        className={`admin-fund-donut-chart__segment${activePositionKey === segment.key ? ' is-active' : ''}${selectedPositionKey === segment.key ? ' is-selected' : ''}`}
                        cx="50"
                        cy="50"
                        fill="none"
                        key={segment.key}
                        onBlur={() => setHoveredPositionKey(null)}
                        onClick={() => togglePosition(segment.key)}
                        onFocus={() => setHoveredPositionKey(segment.key)}
                        onKeyDown={(event) => handlePositionKeyDown(event, segment.key)}
                        onMouseEnter={() => setHoveredPositionKey(segment.key)}
                        onMouseLeave={() => setHoveredPositionKey(null)}
                        pathLength="100"
                        r="38"
                        role="button"
                        stroke={segment.color}
                        strokeDasharray={`${segment.visiblePercent} ${100 - segment.visiblePercent}`}
                        strokeDashoffset={-segment.offset}
                        tabIndex={0}
                        transform="rotate(-90 50 50)"
                      />
                    ))}
                  </svg>
                  <div className="admin-fund-donut-chart__center" aria-live="polite">
                    <span>{activePosition?.label ?? '플랫폼 관리 포인트'}</span>
                    <strong>{formatPoint(activePosition?.value ?? managedPointTotal)}</strong>
                    <small>
                      {activePosition
                        ? `전체의 ${formatPercent(activePosition.value, managedPointTotal)}`
                        : '현재 총액'}
                    </small>
                  </div>
                </div>
              </div>

              <div className="admin-fund-position__visual">
                <div className="admin-fund-position-legend">
                  {pointPositions.map((position) => (
                    <button
                      aria-pressed={selectedPositionKey === position.key}
                      className={`${activePositionKey === position.key ? 'is-active' : ''}${selectedPositionKey === position.key ? ' is-selected' : ''}`.trim()}
                      key={position.key}
                      onBlur={() => setHoveredPositionKey(null)}
                      onClick={() => togglePosition(position.key)}
                      onFocus={() => setHoveredPositionKey(position.key)}
                      onMouseEnter={() => setHoveredPositionKey(position.key)}
                      onMouseLeave={() => setHoveredPositionKey(null)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="admin-fund-legend-dot"
                        style={{ backgroundColor: position.color }}
                      />
                      <span>
                        <b>{position.label}</b>
                        <small>{position.detail}</small>
                      </span>
                      <strong>{formatPoint(position.value)}</strong>
                      <em>{formatPercent(position.value, managedPointTotal)}</em>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="admin-fund-position__note">
              환전 신청 금액은 신청 즉시 사용 가능 잔액에서 차감됩니다. 정산 보류는 거래 보관금의 처리 상태이므로 현재 포인트 합계에 다시 더하지 않습니다.
            </p>
          </section>

          <section className="admin-fund-panel admin-fund-actions" aria-labelledby="fund-actions-title">
            <div className="admin-fund-panel__heading">
              <div>
                <h2 id="fund-actions-title">관리자 처리 필요</h2>
                <p>정상 처리 중인 건을 제외하고 확인이 필요한 자금만 표시합니다.</p>
              </div>
            </div>
            <div className="admin-fund-action-list">
              {adminActions.length > 0 ? adminActions.map((action) => (
                <div key={action.key}>
                  <span className={`is-${action.tone}`}>
                    {createElement(action.icon, { 'aria-hidden': true })}
                  </span>
                  <div>
                    <strong>{action.title}</strong>
                    <small>{action.description}</small>
                  </div>
                  <b>{formatCount(action.count)}</b>
                  <em>{formatPoint(action.amount)}</em>
                  <Link to={action.link}>{action.linkLabel}</Link>
                </div>
              )) : (
                <p className="admin-fund-action-list__empty">현재 확인이 필요한 자금 항목이 없습니다.</p>
              )}
            </div>
          </section>

          <section className="admin-fund-panel admin-fund-flow" aria-labelledby="fund-flow-title">
            <div className="admin-fund-panel__heading admin-fund-flow__heading">
              <div>
                <h2 id="fund-flow-title">기간 자금 흐름</h2>
                <p>선택 기간의 충전·거래·환전·수수료를 일별로 집계합니다.</p>
              </div>
              <div className="admin-fund-period-picker">
                <span>조회 기간</span>
                <button
                  aria-expanded={isPeriodPickerOpen}
                  aria-haspopup="dialog"
                  className="admin-fund-period-picker__trigger"
                  onClick={() => {
                    setPeriodForm({ ...appliedPeriod });
                    setIsPeriodPickerOpen((current) => !current);
                  }}
                  type="button"
                >
                  <CalendarDays aria-hidden="true" />
                  <b>{appliedPeriod.from} ~ {appliedPeriod.to}</b>
                  <ChevronDown aria-hidden="true" />
                </button>
                {isPeriodPickerOpen && (
                  <div
                    aria-label="자금 흐름 조회 기간 선택"
                    className="admin-fund-period-picker__popover"
                    role="dialog"
                  >
                    <DateRangePicker
                      allowPast
                      endDate={periodForm.to || null}
                      extendMaxNavForDuration={false}
                      footer={(
                        <div className="admin-fund-period-picker__actions">
                          <button
                            onClick={() => {
                              setPeriodForm({ ...appliedPeriod });
                              setIsPeriodPickerOpen(false);
                            }}
                            type="button"
                          >
                            취소
                          </button>
                          <button
                            disabled={Boolean(periodError) || summaryQuery.isFetching}
                            onClick={() => {
                              if (periodError) return;
                              setAppliedPeriod({ ...periodForm });
                              setHoveredFlowDate(null);
                              setPinnedFlowDate(null);
                              setIsPeriodPickerOpen(false);
                            }}
                            type="button"
                          >
                            조회
                          </button>
                        </div>
                      )}
                      gridPadding="18px 16px 24px"
                      initialViewDate={periodForm.from}
                      maxDurationDays={MAX_PERIOD_DAYS - 1}
                      maxNavDate={today}
                      onChange={({ start, end }) => setPeriodForm({
                        from: start || '',
                        to: end || '',
                      })}
                      startDate={periodForm.from || null}
                    />
                    {periodError && <small role="alert">{periodError}</small>}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-fund-flow-metrics" role="tablist" aria-label="차트 지표">
              {FLOW_METRICS.map((metric) => (
                <button
                  aria-selected={selectedFlowMetric === metric.key}
                  className={selectedFlowMetric === metric.key ? 'is-active' : ''}
                  key={metric.key}
                  onClick={() => {
                    setSelectedFlowMetric(metric.key);
                    setHoveredFlowDate(null);
                    setPinnedFlowDate(null);
                  }}
                  role="tab"
                  style={{ '--fund-flow-color': metric.color }}
                  type="button"
                >
                  <span>{createElement(metric.icon, { 'aria-hidden': true })}{metric.label}</span>
                  <strong>{formatPoint(getPeriodMetricValue(summary, metric))}</strong>
                  <small>{periodDays}일 합계</small>
                </button>
              ))}
            </div>

            <div className="admin-fund-chart-detail" aria-live="polite">
              <div>
                <span>{displayedDailyFlow?.date ?? '-'}</span>
                <strong style={{ color: selectedMetric.color }}>
                  {selectedMetric.label} {formatPoint(activeDailyAmount)}
                </strong>
              </div>
              <small>{summary.periodStart} ~ {summary.periodEnd}</small>
            </div>

            <div className="admin-fund-chart-layout">
              <div className="admin-fund-chart-axis" aria-hidden="true">
                <span>{formatAxisPoint(maxDailyAmount)}</span>
                <span>{formatAxisPoint(maxDailyAmount / 2)}</span>
                <span>0P</span>
              </div>
              <div className="admin-fund-chart-scroll">
                <div
                  className="admin-fund-chart"
                  style={{
                    '--fund-chart-count': dailyFlows.length,
                    '--fund-flow-color': selectedMetric.color,
                  }}
                >
                  {dailyFlows.map((flow, index) => {
                    const amount = getDailyMetricValue(flow, selectedFlowMetric);
                    const isActive = activeFlowDate === flow.date;
                    const showDateLabel = index === 0
                      || index === dailyFlows.length - 1
                      || index % dateLabelStep === 0;
                    return (
                      <button
                        aria-label={`${flow.date} ${selectedMetric.label} ${formatPoint(amount)}`}
                        aria-pressed={pinnedFlowDate === flow.date}
                        className={isActive ? 'is-active' : ''}
                        key={flow.date}
                        onBlur={() => setHoveredFlowDate(null)}
                        onClick={() => setPinnedFlowDate((current) => (
                          current === flow.date ? null : flow.date
                        ))}
                        onFocus={() => setHoveredFlowDate(flow.date)}
                        onMouseEnter={() => setHoveredFlowDate(flow.date)}
                        onMouseLeave={() => setHoveredFlowDate(null)}
                        type="button"
                      >
                        <span className="admin-fund-chart__bar-track">
                          <i
                            style={{
                              height: `${Math.max(amount > 0 ? 2 : 0, (amount / maxDailyAmount) * 100)}%`,
                            }}
                          />
                        </span>
                        <time dateTime={flow.date}>{showDateLabel ? formatDate(flow.date) : ''}</time>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="admin-fund-panel admin-fund-trade-usage" aria-labelledby="trade-usage-title">
            <div className="admin-fund-panel__heading">
              <div>
                <h2 id="trade-usage-title">기간 거래액 비중</h2>
                <p>최근 {periodDays}일 동안 완료된 경매·서비스 거래액의 비중입니다.</p>
              </div>
              <strong>{formatPoint(periodTradeTotal)}</strong>
            </div>
            <div className="admin-fund-trade-share">
              <div
                aria-label={`경매 거래 ${formatPercent(tradeUsage[0].value, periodTradeTotal)}, 서비스 거래 ${formatPercent(tradeUsage[1].value, periodTradeTotal)}`}
                className="admin-fund-trade-share__bar"
                role="img"
              >
                {periodTradeTotal > 0 ? tradeUsage.map((usage) => (
                  <span
                    key={usage.key}
                    style={{
                      backgroundColor: usage.color,
                      width: formatPercent(usage.value, periodTradeTotal),
                    }}
                  />
                )) : <span className="is-empty" />}
              </div>
              <div className="admin-fund-trade-share__legend">
                {tradeUsage.map((usage) => (
                  <div key={usage.key}>
                    <span>
                      <i aria-hidden="true" style={{ backgroundColor: usage.color }} />
                      {usage.label}
                    </span>
                    <strong>{formatPoint(usage.value)}</strong>
                    <em>{formatPercent(usage.value, periodTradeTotal)}</em>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminFundDashboardPage;
