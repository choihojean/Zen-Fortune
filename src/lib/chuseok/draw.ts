/**
 * 럭키드로우 추첨. crypto.getRandomValues 기반 — Math.random 을 쓰지 않는다.
 * Cloudflare Workers / Node 모두 전역 crypto 를 제공한다.
 */

/** [0, maxExclusive) 균등 정수. 편향을 피하기 위해 rejection sampling. */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive must be a positive integer');
  }
  if (maxExclusive === 1) return 0;
  const range = 0x100000000; // 2^32
  const limit = range - (range % maxExclusive);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % maxExclusive;
  }
}

/** 비복원 추출. 부분 Fisher–Yates. pool 이 count 보다 작으면 전부 반환. */
export function pickWinners<T>(pool: readonly T[], count: number): T[] {
  const arr = pool.slice();
  const n = Math.min(Math.max(0, Math.floor(count)), arr.length);
  for (let i = 0; i < n; i++) {
    const j = i + secureRandomInt(arr.length - i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

export interface PrizeTier {
  name: string;
  count: number;
}

export interface PrizeAssignment<T> {
  winner: T;
  prize: string;
}

/** 상품 등급을 순서대로 처리한다. 앞 등급 당첨자는 뒤 등급 풀에서 제외된다. */
export function assignPrizes<T>(pool: readonly T[], tiers: PrizeTier[]): PrizeAssignment<T>[] {
  let remaining = pool.slice();
  const result: PrizeAssignment<T>[] = [];
  for (const tier of tiers) {
    if (tier.count <= 0 || remaining.length === 0) continue;
    const winners = pickWinners(remaining, tier.count);
    const picked = new Set(winners);
    remaining = remaining.filter((p) => !picked.has(p));
    for (const w of winners) result.push({ winner: w, prize: tier.name });
  }
  return result;
}

export function parsePrizeTiers(
  input: unknown
): { ok: true; tiers: PrizeTier[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: '상품 목록이 비어 있습니다.' };
  }
  const tiers: PrizeTier[] = [];
  for (const raw of input as Array<{ name?: unknown; count?: unknown }>) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    const count = Number(raw?.count);
    if (!name) return { ok: false, error: '상품 이름이 비어 있습니다.' };
    if (!Number.isInteger(count) || count <= 0 || count > 500) {
      return { ok: false, error: `"${name}" 의 수량이 올바르지 않습니다.` };
    }
    tiers.push({ name: name.slice(0, 60), count });
  }
  return { ok: true, tiers };
}
