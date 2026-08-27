// src/pages/product/steps/AuctionSettingStep.jsx
// 0단계(상품 입력) 하단 영역: 시작가·기간·시작시점·입찰단위·경매정책 동의
// — 예전 3단계 구조의 "Step 1"이었으나 지금은 ProductInfoStep과 같은 0단계 화면에 함께 렌더된다
// Props: form, set, policyAgreed, setPolicyAgreed, auctionRange, setAuctionRange,
//        endDt, bidUnits, submitted, startAmtRef, ibyAmtRef, auctionRangeRef, policyRef
import { useEffect, useState } from 'react';
import DateRangePicker from '@components/product/DateRangePicker';
import {
  addMinutesToTime,
  getNextTenMinuteTime,
} from '@components/common/timeSelectUtils';
import { formatPoint } from '@/utils/common';

const minEndTimeToday = () => getNextTenMinuteTime(new Date(), 60);
const minStartTimeToday = () => getNextTenMinuteTime();

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 예약 당일 종료 모드에서 시작 시간 기준 최소 1시간 이후 종료 시간 계산
const minEndTimeFromStart = (startTime) => addMinutesToTime(startTime, 60);

export default function AuctionSettingStep({
  form, set, policyAgreed, setPolicyAgreed,
  auctionRange, setAuctionRange, endDt,
  bidUnits, submitted,
  startAmtRef, ibyAmtRef, auctionRangeRef, policyRef,
}) {
  const [startAmtTouched, setStartAmtTouched] = useState(false);
  const startAmtInvalid = !!form.prdStartAmt && Number(form.prdStartAmt) % form.bidUnit !== 0;
  // 즉시시작 + 종료일이 당일이면 "등록 시각과 동일한 시:분"으로 자동 계산할 수 없어(이미 지난 시각이 됨) 직접 시간을 받아야 함
  const isSameDayInstant = form.startNow && !!auctionRange.end && auctionRange.end === auctionRange.start;
  // 예약 + 시작일이 오늘이면 이미 지난 시각을 시작 시각으로 고르지 못하게 막아야 함
  const isSameDayReserve = !form.startNow && auctionRange.start === todayStr();
  // 예약 + 시작일 = 종료일이면 날짜와 관계없이 종료 시간을 별도로 선택한다.
  const isSameDayReserveAndEnd = !form.startNow
    && !!auctionRange.end
    && auctionRange.start === auctionRange.end;
  const minimumStartTime = isSameDayInstant
    ? minEndTimeToday()
    : isSameDayReserve
      ? minStartTimeToday()
      : undefined;
  const minimumEndTime = isSameDayReserveAndEnd
    ? minEndTimeFromStart(auctionRange.startTime)
    : undefined;

  // 당일 즉시시작으로 전환되는 순간, 이미 지난 시각이 기본값으로 남아있으면 현재 이후 시각으로 보정
  useEffect(() => {
    if (!isSameDayInstant) return;
    const min = minEndTimeToday();
    if (!min) {
      setAuctionRange(prev => ({ ...prev, startTime: '', endTime: '' }));
      return;
    }
    const current = auctionRange.startTime || '09:00';
    if (current < min) {
      setAuctionRange(prev => ({
        ...prev,
        startTime: min,
        // 복원된 endTime이 min보다 크면 유지 — 임시저장 재개 시 저장해둔 종료 시간을 덮어쓰지 않도록
        endTime: prev.endTime && prev.endTime > min ? prev.endTime : min,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSameDayInstant]);

  // 예약 시작일이 오늘로 바뀌는 순간에도 동일하게 보정
  useEffect(() => {
    if (!isSameDayReserve) return;
    const min = minStartTimeToday();
    if (!min) {
      setAuctionRange(prev => ({ ...prev, startTime: '', endTime: '' }));
      return;
    }
    const current = auctionRange.startTime || '09:00';
    if (current < min) {
      setAuctionRange(prev => ({ ...prev, startTime: min, endTime: min }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSameDayReserve]);

  // 예약 당일 종료 모드: 종료 시간이 시작 시간 + 1시간 미만이면 자동 보정
  useEffect(() => {
    if (!isSameDayReserveAndEnd) return;
    const minEnd = minEndTimeFromStart(auctionRange.startTime);
    if (!minEnd) {
      setAuctionRange(prev => ({ ...prev, endTime: '' }));
      return;
    }
    if (!auctionRange.endTime || auctionRange.endTime < minEnd) {
      setAuctionRange(prev => ({ ...prev, endTime: minEnd }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSameDayReserveAndEnd, auctionRange.startTime]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div className="field" ref={startAmtRef}>
          <label>시작가 <span style={{ color: '#c0392b' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              className="input no-spinner"
              type="text"
              inputMode="numeric"
              value={form.prdStartAmt ? Number(form.prdStartAmt).toLocaleString('ko-KR') : ''}
              onChange={e => set('prdStartAmt', e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => setStartAmtTouched(true)}
              placeholder="0"
            />
            {submitted && !form.prdStartAmt && (
              <span style={{ position: 'absolute', top: '100%', left: 0, fontSize: 17, fontWeight: 700, color: '#c0392b', whiteSpace: 'nowrap' }}>시작가 입력은 필수입니다</span>
            )}
            {(submitted || startAmtTouched) && startAmtInvalid && (
              <span style={{ position: 'absolute', top: '100%', left: 0, fontSize: 17, fontWeight: 700, color: '#c0392b', whiteSpace: 'nowrap' }}>
                입찰 단위({formatPoint(form.bidUnit)})의 배수로 입력해 주세요
              </span>
            )}
          </div>
        </div>
        <div className="field" ref={ibyAmtRef}>
          <label>즉시구매가 <span style={{ fontWeight: 500, color: '#888780' }}>(백 단위 자동절삭)</span></label>
          <input
            className="input no-spinner"
            type="text"
            inputMode="numeric"
            value={form.prdIbyAmt ? Number(form.prdIbyAmt).toLocaleString('ko-KR') : ''}
            onChange={e => set('prdIbyAmt', e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => {
              if (!form.prdIbyAmt) return;
              const rounded = Math.floor(Number(form.prdIbyAmt) / 100) * 100;
              set('prdIbyAmt', String(rounded));
            }}
            placeholder="입력 시 즉시구매 가능"
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>입찰 단위 <span>(최소 입찰 증가액)</span></label>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {bidUnits.map(u => (
            <button
              key={u}
              type="button"
              onClick={() => set('bidUnit', u)}
              className={`chip ${form.bidUnit === u ? 'active' : ''}`}
            >
              {formatPoint(u)}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>시작 시점</label>
        <div className="row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, cursor: 'pointer' }}>
            <input type="radio" checked={form.startNow} onChange={() => set('startNow', true)} />
            즉시 시작
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, cursor: 'pointer' }}>
            <input type="radio" checked={!form.startNow} onChange={() => set('startNow', false)} />
            예약
          </label>
        </div>
      </div>

      <div className="field" ref={auctionRangeRef}>
        <label>경매 기간 <span style={{ color: '#c0392b' }}>*</span></label>
        <div style={{ position: 'relative' }}>
        <DateRangePicker
          key={form.startNow ? 'instant' : 'reserve'}
          startDate={auctionRange.start}
          endDate={auctionRange.end}
          onChange={({ start, end }) => setAuctionRange(prev => ({ ...prev, start: start ?? '', end: end ?? '' }))}
          fixedStart={form.startNow}
          maxDurationDays={14}
          maxNavDate={(() => {
            const pad2 = n => String(n).padStart(2, '0');
            const now = new Date();
            if (form.startNow) {
              // 즉시시작: 종료일 선택 범위가 최대 2주이므로 탐색도 그만큼만 허용
              const d = new Date(now);
              d.setDate(d.getDate() + 14);
              return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
            }
            // 예약: 오늘 기준 2개월까지 탐색 가능 (실제 종료일은 시작일+14일로 제한)
            let m = now.getMonth() + 2; let y = now.getFullYear();
            if (m > 11) { m -= 12; y++; }
            const last = new Date(y, m + 1, 0).getDate();
            return `${y}-${pad2(m+1)}-${pad2(last)}`;
          })()}
          showTime={!form.startNow || isSameDayInstant}
          startTimeValue={auctionRange.startTime}
          onStartTimeChange={val => {
            if (isSameDayReserveAndEnd) {
              const minEnd = minEndTimeFromStart(val);
              setAuctionRange(prev => ({
                ...prev,
                startTime: val,
                endTime: minEnd && prev.endTime && prev.endTime >= minEnd
                  ? prev.endTime
                  : (minEnd ?? ''),
              }));
            } else {
              setAuctionRange(prev => ({ ...prev, startTime: val, endTime: val }));
            }
          }}
          endTimeValue={isSameDayReserveAndEnd
            ? (auctionRange.endTime || minimumEndTime || '')
            : undefined}
          onEndTimeChange={isSameDayReserveAndEnd ? val => setAuctionRange(prev => ({ ...prev, endTime: val })) : undefined}
          minEndTime={minimumEndTime}
          endTimeUnavailable={isSameDayReserveAndEnd && !minimumEndTime}
          timeLabel={isSameDayInstant ? '종료 시간' : '시작 시간'}
          timeHint={isSameDayInstant ? '오늘 등록과 동시에 시작해서 이 시간에 종료됩니다' : '종료 시간은 시작 시간과 동일하게 적용됩니다'}
          minTime={minimumStartTime}
          timeUnavailable={(isSameDayInstant || isSameDayReserve) && !minimumStartTime}
        />
        {submitted && !auctionRange.end && (
          <span style={{ position: 'absolute', top: '100%', left: 0, fontSize: 15, fontWeight: 700, color: '#c0392b', whiteSpace: 'nowrap' }}>경매 기간을 지정해 주세요</span>
        )}
        </div>
      </div>

      <div className="field" style={{ marginTop: 32 }}>
        <label>종료 예정일시</label>
        <p className="mono" style={{ fontSize: 17, color: '#0064ff' }}>
          {endDt
            ? endDt.toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })
            : '—'}
        </p>
      </div>

      <div className="card" ref={policyRef} style={{ background: '#e5efff', border: 'none', marginTop: 16 }}>
        <h4 style={{ marginTop: 0, color: '#0048bf' }}>경매 정책 안내 <span style={{ color: '#c0392b' }}>*</span></h4>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 16, lineHeight: 2, listStyle: 'disc' }}>
          <li>마감 10분 이내 유효 입찰 시 잔여 시간이 10분으로 자동 연장됩니다 (1회)</li>
          <li>상품 등록 후에는 본문을 수정할 수 없으며 변경사항은 별도로 최대 3회까지 추가할 수 있습니다</li>
          <li>즉시구매가는 최고 입찰가보다 반드시 높아야 합니다</li>
          <li>낙찰 후 거래를 정당한 사유 없이 취소하면 포인트 패널티가 부과됩니다</li>
          {/* 거래 수수료 사전 고지 — 팀 합의 요율(경매 5% 단일 고정) (담당자6 BJN, 2026-08-13 추가) */}
          <li>낙찰 시 낙찰가의 5%가 수수료로 차감되어 정산됩니다</li>
        </ul>
        <div className="policy-agree">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={policyAgreed}
              onChange={e => setPolicyAgreed(e.target.checked)}
            />
            위 경매 정책을 확인하였습니다.
          </label>
        </div>
      </div>

    </div>
  );
}
