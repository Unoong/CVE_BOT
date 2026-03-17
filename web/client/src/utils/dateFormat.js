/**
 * 날짜/시간 포맷 유틸리티 (한국 시간 UTC+9 / Asia/Seoul)
 * 서버에서 한국 시간으로 저장된 datetime.now() 값을 올바르게 표시
 */

const TZ_KR = 'Asia/Seoul';

/**
 * 서버에서 받은 날짜 문자열을 정규화
 * collect_time 등은 Python datetime.now()로 저장 → 한국 로컬 시간
 * "2026-03-16 08:00:09" = 08:00 KST → +09:00 붙여 해석
 */
function normalizeToUTC(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  const str = String(dateInput).trim();
  if (!str) return null;
  // 이미 Z 또는 +00:00 등 타임존 있으면 그대로 사용
  if (/Z$|[\+\-]\d{2}:?\d{2}$|[\+\-]\d{4}$/.test(str)) {
    return new Date(str);
  }
  // "2026-03-16 08:00:09" → 서버가 한국 시간으로 저장 → +09:00 붙임
  let normalized = str.replace(' ', 'T');
  if (!/T\d/.test(normalized)) normalized += 'T00:00:00';
  return new Date(normalized + '+09:00');
}

/**
 * 날짜+시간 전체 표시 (예: 2026. 3. 10. 오후 2:56:34)
 * @param {string|Date} dateInput - ISO 문자열 또는 Date 객체
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  const d = normalizeToUTC(dateInput);
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { timeZone: TZ_KR });
}

/**
 * 날짜만 표시 (예: 2026. 3. 10.)
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  const d = normalizeToUTC(dateInput);
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { timeZone: TZ_KR });
}

/**
 * 시간만 표시 (예: 오후 2:56:34)
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatTime(dateInput) {
  const d = normalizeToUTC(dateInput);
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('ko-KR', { timeZone: TZ_KR });
}

/**
 * 날짜 상세 (년, 월, 일, 요일)
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDateLong(dateInput) {
  const d = normalizeToUTC(dateInput);
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: TZ_KR
  });
}

/**
 * 짧은 날짜+시간 (이벤트 로그용)
 */
export function formatDateTimeShort(dateInput) {
  const d = normalizeToUTC(dateInput);
  if (!d || isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TZ_KR
  });
}
