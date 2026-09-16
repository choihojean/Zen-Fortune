/**
 * 답변 → 성향 점수 → 캐릭터 매칭. 순수 함수만 있으며 I/O·프레임워크 의존이 없다.
 * (scripts/simulate-chuseok.ts 가 Node에서 직접 import 하므로 런타임 import를 두지 않는다.)
 *
 * 규칙은 결정적이어야 한다: 같은 답변 조합 → 항상 같은 캐릭터.
 */
import type {
  AnswerMap,
  AnswerValidation,
  Character,
  MatchResult,
  Question,
  TraitDef,
  TraitId,
  TraitScores,
} from './types';

export function validateAnswers(answers: AnswerMap, questions: Question[]): AnswerValidation {
  const missing: string[] = [];
  for (const q of questions) {
    const optionId = answers[q.id];
    if (!optionId) {
      missing.push(q.id);
      continue;
    }
    if (!q.options.some((o) => o.id === optionId)) {
      return { ok: false, code: 'INVALID_OPTION', questionId: q.id, optionId };
    }
  }
  if (missing.length > 0) return { ok: false, code: 'INCOMPLETE_ANSWERS', missing };
  return { ok: true };
}

/** 선택한 옵션들의 태그를 집계한다. 모든 성향은 0으로 초기화되어 항상 키가 존재한다. */
export function calculateTraits(
  answers: AnswerMap,
  questions: Question[],
  traits: TraitDef[]
): TraitScores {
  const scores: TraitScores = {};
  for (const t of traits) scores[t.id] = 0;

  for (const q of questions) {
    const optionId = answers[q.id];
    const option = q.options.find((o) => o.id === optionId);
    if (!option) continue;
    for (const tag of option.tags) {
      scores[tag] = (scores[tag] ?? 0) + 1;
    }
  }
  return scores;
}

/** 점수 내림차순, 동점은 traits 정의 순서로 고정. */
export function getTopTraits(scores: TraitScores, traits: TraitDef[], count = 3): TraitId[] {
  const order = new Map(traits.map((t, i) => [t.id, i]));
  return Object.entries(scores)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (order.get(a[0]) ?? 999) - (order.get(b[0]) ?? 999);
    })
    .slice(0, count)
    .map(([id]) => id);
}

/** 문자열 → 32bit 해시 (djb2). 동점 tie-breaker 를 답변 조합마다 다르게, 그러나 결정적으로 만든다. */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** 답변 맵을 정규화한 문자열 — 키 순서와 무관하게 같은 답변이면 같은 문자열. */
export function canonicalAnswers(answers: AnswerMap): string {
  return Object.keys(answers)
    .sort()
    .map((k) => `${k}=${answers[k]}`)
    .join('&');
}

/**
 * 캐릭터 매칭.
 *  1) affinity = 캐릭터 requiredTraits 에 대한 사용자 점수 합 (높을수록 우선)
 *  2) overlap  = requiredTraits ∩ 사용자 상위 3 성향 개수
 *  3) tieSeed 가 있으면 hash(tieSeed + characterId) — 답변 조합별로 고정된 순서.
 *     특정 캐릭터가 동점에서 항상 이기는 편향을 없앤다. (같은 답변 → 같은 결과는 유지)
 *  4) priority (낮을수록 우선)
 *  5) id 사전순 — 최종 고정 tie-breaker
 * affinity 가 0인 캐릭터만 남으면 fallback.
 */
export function matchCharacter(
  scores: TraitScores,
  characters: Character[],
  traits: TraitDef[],
  fallbackCharacterId: string,
  tieSeed?: string
): MatchResult {
  const topTraits = getTopTraits(scores, traits, 3);
  const topSet = new Set(topTraits);

  const ranking = characters
    .filter((c) => c.requiredTraits.length > 0)
    .map((c) => ({
      characterId: c.id,
      affinity: c.requiredTraits.reduce((sum, t) => sum + (scores[t] ?? 0), 0),
      overlap: c.requiredTraits.filter((t) => topSet.has(t)).length,
      priority: c.priority,
      tie: tieSeed === undefined ? 0 : hashString(`${tieSeed}|${c.id}`),
    }))
    .sort((a, b) => {
      if (b.affinity !== a.affinity) return b.affinity - a.affinity;
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      if (a.tie !== b.tie) return a.tie - b.tie;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.characterId < b.characterId ? -1 : a.characterId > b.characterId ? 1 : 0;
    });

  const best = ranking[0];
  const usedFallback = !best || best.affinity <= 0;

  return {
    characterId: usedFallback ? fallbackCharacterId : best.characterId,
    scores,
    topTraits,
    ranking: ranking.map(({ characterId, affinity, overlap }) => ({ characterId, affinity, overlap })),
    usedFallback,
  };
}

export interface EvaluateInput {
  questions: Question[];
  characters: Character[];
  traits: TraitDef[];
  fallbackCharacterId: string;
}

/** 검증 없이 평가만 수행. API 경로에서는 반드시 validateAnswers 를 먼저 통과시킬 것. */
export function evaluate(answers: AnswerMap, content: EvaluateInput): MatchResult {
  const scores = calculateTraits(answers, content.questions, content.traits);
  return matchCharacter(
    scores,
    content.characters,
    content.traits,
    content.fallbackCharacterId,
    canonicalAnswers(answers)
  );
}
