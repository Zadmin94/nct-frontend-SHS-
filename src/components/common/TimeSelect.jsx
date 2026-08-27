import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Clock3, X } from 'lucide-react';
import './TimeSelect.css';
import {
  MINUTE_STEP,
  normalizeMinimumTime,
  pad,
  toTimeParts,
  toTimeString,
} from './timeSelectUtils';

const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => (
  index * MINUTE_STEP
));
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const toHour24 = (period, hour12) => (
  period === 'am'
    ? (hour12 === 12 ? 0 : hour12)
    : (hour12 === 12 ? 12 : hour12 + 12)
);

const formatSelectedTime = (parts) => {
  if (!parts) return '시간을 선택해 주세요';
  const period = parts.hour < 12 ? '오전' : '오후';
  return `${period} ${parts.hour % 12 || 12}:${pad(parts.minute)}`;
};

/** 담당자 7 | 일정 입력 화면에서 공통으로 사용하는 10분 단위 시간 선택기입니다. */
export default function TimeSelect({
  value,
  onChange,
  minTime,
  disabled = false,
  unavailable = false,
  unavailableMessage = '선택 가능한 시간이 없습니다. 날짜를 다시 선택해 주세요.',
  ariaLabel = '시간 선택',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const parsedValue = toTimeParts(value);
  const normalizedMinimum = normalizeMinimumTime(minTime);
  const hasUnavailableMinimum = minTime != null && normalizedMinimum === undefined;
  const minimumParts = toTimeParts(normalizedMinimum);
  const minimumMinutes = minimumParts
    ? (minimumParts.hour * 60) + minimumParts.minute
    : null;
  const isSelectedValueValid = Boolean(
    parsedValue
      && parsedValue.minute % MINUTE_STEP === 0
      && (minimumMinutes == null || (parsedValue.hour * 60) + parsedValue.minute >= minimumMinutes),
  );
  const selectedParts = isSelectedValueValid ? parsedValue : null;
  const fallbackParts = minimumParts ?? { hour: 9, minute: 0 };
  const activeParts = selectedParts ?? fallbackParts;
  const period = activeParts.hour >= 12 ? 'pm' : 'am';
  const hour12 = activeParts.hour % 12 || 12;
  const selectedMinute = MINUTE_OPTIONS.includes(activeParts.minute)
    ? activeParts.minute
    : fallbackParts.minute;
  const isUnavailable = unavailable || hasUnavailableMinimum;
  const isDisabled = disabled || isUnavailable;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    const focusFrame = window.requestAnimationFrame(() => {
      const selectedButton = panelRef.current?.querySelector('[aria-pressed="true"]');
      const firstEnabledSelect = panelRef.current?.querySelector('select:not(:disabled)');
      const firstEnabledButton = panelRef.current?.querySelector('button:not(:disabled)');
      (selectedButton ?? firstEnabledSelect ?? firstEnabledButton)?.focus();
    });

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isMinuteDisabled = (nextPeriod, nextHour12, minute) => {
    if (minimumMinutes == null) return false;
    return (toHour24(nextPeriod, nextHour12) * 60) + minute < minimumMinutes;
  };

  const isHourDisabled = (nextPeriod, nextHour12) => (
    MINUTE_OPTIONS.every((minute) => isMinuteDisabled(nextPeriod, nextHour12, minute))
  );

  const isPeriodDisabled = (nextPeriod) => (
    HOUR_OPTIONS.every((nextHour12) => isHourDisabled(nextPeriod, nextHour12))
  );

  const emit = (nextPeriod, nextHour12, nextMinute) => {
    if (!onChange || isDisabled) return;

    const nextValue = toTimeString(toHour24(nextPeriod, nextHour12), nextMinute);
    onChange(
      normalizedMinimum && nextValue < normalizedMinimum
        ? normalizedMinimum
        : nextValue,
    );
  };

  const rootClassName = ['common-time-select', className].filter(Boolean).join(' ');
  const closeAfterSelection = () => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  // @ai_generated (담당자4 정민재, 2026-08-13): 콤보박스에서도 기존 최소 가능 시각 정책을 option 단위의 비활성화로 동일하게 유지한다.

  return (
    <div className={rootClassName} ref={rootRef} role="group" aria-label={ariaLabel}>
      <button
        aria-expanded={isOpen && !isDisabled}
        aria-haspopup="dialog"
        className="input common-time-select__trigger"
        disabled={isDisabled}
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <Clock3 aria-hidden="true" size={17} />
        <span>{formatSelectedTime(selectedParts)}</span>
        <ChevronDown aria-hidden="true" className={isOpen ? 'common-time-select__chevron common-time-select__chevron--open' : 'common-time-select__chevron'} size={17} />
      </button>

      {isOpen && !isDisabled && (
        <div
          aria-label={`${ariaLabel} 10분 단위 선택`}
          className="common-time-select__panel"
          ref={panelRef}
          role="dialog"
        >
          <div className="common-time-select__header">
            <div>
              <strong>시간 선택</strong>
              <span>10분 단위</span>
            </div>
            <button
              aria-label="시간 선택 닫기"
              className="common-time-select__close"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </button>
          </div>

          <div className="common-time-select__section" role="group" aria-label={`${ariaLabel} 오전 또는 오후`}>
            <span className="common-time-select__label">오전 · 오후</span>
            <div className="common-time-select__options common-time-select__options--period">
              {[
                ['am', '오전'],
                ['pm', '오후'],
              ].map(([nextPeriod, label]) => (
                <button
                  aria-pressed={Boolean(selectedParts && period === nextPeriod)}
                  className="common-time-select__option"
                  disabled={isPeriodDisabled(nextPeriod)}
                  key={nextPeriod}
                  onClick={() => emit(nextPeriod, hour12, selectedMinute)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="common-time-select__section" role="group" aria-label={`${ariaLabel} 시`}>
            <span className="common-time-select__label">시</span>
            <select
              aria-label={`${ariaLabel} 시 선택`}
              className="common-time-select__select"
              onChange={(event) => emit(period, Number(event.target.value), selectedMinute)}
              value={hour12}
            >
              {HOUR_OPTIONS.map((nextHour12) => (
                <option
                  disabled={isHourDisabled(period, nextHour12)}
                  key={nextHour12}
                  value={nextHour12}
                >
                  {nextHour12}시
                </option>
              ))}
            </select>
          </div>

          <div className="common-time-select__section" role="group" aria-label={`${ariaLabel} 분`}>
            <span className="common-time-select__label">분</span>
            <select
              aria-label={`${ariaLabel} 분 선택`}
              className="common-time-select__select"
              onChange={(event) => {
                emit(period, hour12, Number(event.target.value));
                closeAfterSelection();
              }}
              value={selectedMinute}
            >
              {MINUTE_OPTIONS.map((minute) => (
                <option
                  disabled={isMinuteDisabled(period, hour12, minute)}
                  key={minute}
                  value={minute}
                >
                  {pad(minute)}분
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isUnavailable && (
        <p className="common-time-select__unavailable" role="status">
          {unavailableMessage}
        </p>
      )}
    </div>
  );
}
