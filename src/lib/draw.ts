export interface Participant {
  id: string;
  name: string;
  department?: string;
  count: number;
}

export interface ParsedNames {
  participants: Participant[];
  warnings: string[];
}

export function parseCsv(input: string): ParsedNames {
  const warnings: string[] = [];
  const rows = input
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0 && !row.startsWith('#'));

  if (rows.length === 0) {
    return { participants: [], warnings: ['입력된 데이터가 없습니다.'] };
  }

  const firstCols = splitRow(rows[0]);
  const looksLikeHeader =
    firstCols.length >= 2 &&
    firstCols.some((c) => /name|이름/i.test(c)) &&
    firstCols.some((c) => /count|횟수|cnt/i.test(c));

  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  const seen = new Map<string, Participant>();

  dataRows.forEach((row, idx) => {
    const cols = splitRow(row);
    if (cols.length < 2) {
      warnings.push(`${idx + 1}행: 열이 부족합니다 → "${row}"`);
      return;
    }
    const name = cols[0];
    const hasDept = cols.length >= 3;
    const department = hasDept ? cols[1] : undefined;
    const countRaw = hasDept ? cols[2] : cols[1];
    const count = Number(countRaw.replace(/[^\d.-]/g, ''));
    if (!name || !Number.isFinite(count) || count <= 0) {
      warnings.push(`${idx + 1}행: 이름·횟수 형식이 올바르지 않습니다 → "${row}"`);
      return;
    }
    const key = `${name}__${department ?? ''}`;
    const existing = seen.get(key);
    if (existing) {
      existing.count += count;
    } else {
      seen.set(key, {
        id: `p${idx}`,
        name,
        department,
        count,
      });
    }
  });

  return { participants: Array.from(seen.values()), warnings };
}

function splitRow(row: string): string[] {
  const delim = row.includes('\t') ? '\t' : ',';
  return row.split(delim).map((c) => c.trim().replace(/^["']|["']$/g, ''));
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightedPick(
  participants: Participant[],
  rand: () => number
): Participant | null {
  if (participants.length === 0) return null;
  const total = participants.reduce((sum, p) => sum + p.count, 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const p of participants) {
    r -= p.count;
    if (r <= 0) return p;
  }
  return participants[participants.length - 1];
}

export const DEMO_CSV = `이름,부서,응모권
김도윤,프로덕트,3
이서연,디자인,4
박지호,개발플랫폼,5
최민재,데이터,2
정유진,마케팅,3
한지우,운영,2
오세훈,QA,1
강예린,피플팀,5
윤재희,영업,1
서태민,재무,1
임하늘,개발플랫폼,5
배소율,프로덕트,2
조은우,디자인,1
신지안,운영,4
홍석현,데이터,2
구하진,마케팅,2
나경원,QA,1
도현우,피플팀,1
류지원,개발플랫폼,3
문혜린,프로덕트,2`;
