/**
 * 이벤트 운영 기간. 모두 선택 사항 — 설정이 없으면 항상 열려 있다.
 *
 *   CHUSEOK_DRAW_OPENS_AT   ISO 8601 (예: 2026-09-21T00:00:00+09:00) — 이 시각 전에는 응모 불가
 *   CHUSEOK_DRAW_CLOSES_AT  ISO 8601 — 이 시각 후에는 응모 불가
 *   CHUSEOK_TEST_CLOSED     "true" 면 테스트 자체를 닫는다 (결과 재확인은 가능)
 */

export type DrawState = 'open' | 'not_started' | 'ended';

export interface EventStatus {
  testOpen: boolean;
  drawOpen: boolean;
  drawState: DrawState;
  drawOpensAt: string | null;
  drawClosesAt: string | null;
}

type EventEnv = Partial<
  Pick<Env, 'CHUSEOK_DRAW_OPENS_AT' | 'CHUSEOK_DRAW_CLOSES_AT' | 'CHUSEOK_TEST_CLOSED'>
>;

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getEventStatus(env: EventEnv, now: Date = new Date()): EventStatus {
  const opens = parseDate(env.CHUSEOK_DRAW_OPENS_AT);
  const closes = parseDate(env.CHUSEOK_DRAW_CLOSES_AT);

  let drawState: DrawState = 'open';
  if (opens && now < opens) drawState = 'not_started';
  else if (closes && now > closes) drawState = 'ended';

  return {
    testOpen: String(env.CHUSEOK_TEST_CLOSED ?? '').toLowerCase() !== 'true',
    drawOpen: drawState === 'open',
    drawState,
    drawOpensAt: opens?.toISOString() ?? null,
    drawClosesAt: closes?.toISOString() ?? null,
  };
}

export function formatKST(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
