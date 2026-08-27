// @ai_generated: 가입 화면들이 같은 숫자 기반 전화번호 계약을 사용하도록 분리한다.
export const toPhoneDigits = (value = '') => value.replace(/\D/g, '').slice(0, 11);

export const formatPhoneNumber = (value = '') => {
  const digits = toPhoneDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export const isValidPhoneNumber = (value = '') => /^0\d{10}$/.test(toPhoneDigits(value));
