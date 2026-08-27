const MINUTE_STEP = 10;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

const pad = (value) => String(value).padStart(2, '0');

export const toTimeParts = (value) => {
  const match = TIME_PATTERN.exec(value ?? '');
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
};

export const toTimeString = (hour, minute) => `${pad(hour)}:${pad(minute)}`;

export const normalizeMinimumTime = (value) => {
  const parts = toTimeParts(value);
  if (!parts) return value == null ? null : undefined;

  const totalMinutes = (parts.hour * 60) + parts.minute;
  const roundedMinutes = Math.ceil(totalMinutes / MINUTE_STEP) * MINUTE_STEP;
  if (roundedMinutes >= 24 * 60) return undefined;

  return toTimeString(
    Math.floor(roundedMinutes / 60),
    roundedMinutes % 60,
  );
};

/** 담당자 7 | 현재 시각보다 늦은 첫 10분 단위 시각을 반환합니다. */
export const getNextTenMinuteTime = (now = new Date(), leadMinutes = 0) => {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null;

  const safeLeadMinutes = Math.max(0, Math.ceil(Number(leadMinutes) || 0));
  const minimumMinutes = (now.getHours() * 60) + now.getMinutes() + safeLeadMinutes + 1;
  const roundedMinutes = Math.ceil(minimumMinutes / MINUTE_STEP) * MINUTE_STEP;
  if (roundedMinutes >= 24 * 60) return null;

  return toTimeString(
    Math.floor(roundedMinutes / 60),
    roundedMinutes % 60,
  );
};

/** 담당자 7 | 기준 시각에 분을 더한 뒤 선택 가능한 10분 단위로 올립니다. */
export const addMinutesToTime = (value, minutes) => {
  const parts = toTimeParts(value);
  if (!parts) return null;

  const safeMinutes = Math.max(0, Math.ceil(Number(minutes) || 0));
  const totalMinutes = (parts.hour * 60) + parts.minute + safeMinutes;
  const roundedMinutes = Math.ceil(totalMinutes / MINUTE_STEP) * MINUTE_STEP;
  if (roundedMinutes >= 24 * 60) return null;

  return toTimeString(
    Math.floor(roundedMinutes / 60),
    roundedMinutes % 60,
  );
};

export const isTenMinuteTime = (value) => {
  const parts = toTimeParts(value);
  return Boolean(parts && parts.minute % MINUTE_STEP === 0);
};

export { MINUTE_STEP, pad };
