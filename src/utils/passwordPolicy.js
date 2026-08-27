export const PASSWORD_POLICY_GUIDE = '8~64자, 영문·숫자·특수문자 중 2종 이상, 공백 없이 입력해주세요.';

const NON_ASCII_PRINTABLE_PATTERN = /[^\x21-\x7E]/;
const LETTER_PATTERN = /[A-Za-z]/;
const NUMBER_PATTERN = /[0-9]/;
const SPECIAL_PATTERN = /[^A-Za-z0-9]/;

export const isValidNewPassword = (value) => {
  if (value.length < 8 || value.length > 64 || NON_ASCII_PRINTABLE_PATTERN.test(value)) return false;

  const categoryCount = [
    LETTER_PATTERN.test(value),
    NUMBER_PATTERN.test(value),
    SPECIAL_PATTERN.test(value),
  ].filter(Boolean).length;

  return categoryCount >= 2;
};
