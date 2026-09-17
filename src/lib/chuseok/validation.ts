/** 사용자 입력 검증. 서버에서 반드시 통과시킨다 — 클라이언트 검증은 UX 용일 뿐이다. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// 실용적 이메일 검사. 도메인 제한은 하지 않는다(사외 메일을 쓰는 직원도 참여 가능).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// 제어문자 (C0 + DEL)
const CONTROL_RE = /[\u0000-\u001f\u007f]/g;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.replace(CONTROL_RE, '').trim().toLowerCase();
  if (email.length < 5 || email.length > 120) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

// 휴대폰 번호: 숫자만 남겨 010XXXXXXXX (10~11자리) 만 허용. 하이픈·공백·+82 표기는 정규화한다.
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let digits = value.replace(CONTROL_RE, '').replace(/\D/g, '');
  if (digits.startsWith('82')) digits = '0' + digits.slice(2);
  if (!/^01[016789]\d{7,8}$/.test(digits)) return null;
  return digits;
}

/** 표시용 하이픈 포맷: 01012345678 → 010-1234-5678 */
export function formatPhone(digits: string): string {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

/** 관리자 외 노출용 마스킹: 010-1234-5678 → 010-****-5678 */
export function maskPhone(digits: string): string {
  const f = formatPhone(digits);
  return f.replace(/-(\d{3,4})-/, (m, mid) => `-${'*'.repeat(mid.length)}-`);
}

export function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.replace(CONTROL_RE, '').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > 30) return null;
  return name;
}

export function isAnswerMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 100) return false;
  return entries.every(
    ([k, v]) => typeof k === 'string' && k.length <= 40 && typeof v === 'string' && v.length <= 40
  );
}
