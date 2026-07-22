/**
 * 비밀번호 복잡도 정책 (사내 보안통제 2.2)
 * - 영문 / 숫자 / 특수문자 혼합
 * - 8자 이상
 * 서버 web/utils/passwordPolicy.js 와 동일 규칙 유지
 */

export const PASSWORD_POLICY_HINT =
  '영문, 숫자, 특수문자를 포함하여 8자 이상';

export function validatePasswordComplexity(password) {
  if (password === undefined || password === null || typeof password !== 'string' || password.length === 0) {
    return { valid: false, error: '비밀번호를 입력해주세요' };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: '비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다',
    };
  }

  if (password.length > 100) {
    return { valid: false, error: '비밀번호는 최대 100자까지 가능합니다' };
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasLetter || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      error: '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다',
    };
  }

  return { valid: true };
}
