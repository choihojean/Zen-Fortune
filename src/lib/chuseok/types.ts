/**
 * 한가위 캐릭터 테스트 — 콘텐츠·로직 공용 타입.
 * 콘텐츠(JSON) ↔ 로직(scoring) ↔ UI 사이의 계약. 콘텐츠가 바뀌어도 이 타입만 지키면 로직/UI는 그대로다.
 */

export type TraitId = string;

export interface TraitDef {
  id: TraitId;
  label: string;
  description?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  /** 성향 태그 1개 이상. characters.json의 traits id만 허용. */
  tags: TraitId[];
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

/** 클라이언트로 내려보내는 질문 — 태그를 제거해 결과를 미리 추측하기 어렵게 한다. */
export interface PublicQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  shortDescription: string;
  description: string;
  /** 매칭 규칙: 이 성향들의 점수 합이 가장 높은 캐릭터가 선택된다. 빈 배열이면 fallback 전용. */
  requiredTraits: TraitId[];
  /** 동점 시 낮은 숫자가 우선. */
  priority: number;
  stats: Record<string, number>;
  catchphrase?: string;
  goodMatch?: string | null;
  badMatch?: string | null;
  tip?: string;
}

export interface ChuseokContent {
  version: string;
  traits: TraitDef[];
  fallbackCharacterId: string;
  questions: Question[];
  characters: Character[];
}

/** questionId → optionId */
export type AnswerMap = Record<string, string>;

export type TraitScores = Record<TraitId, number>;

export interface MatchResult {
  characterId: string;
  scores: TraitScores;
  topTraits: TraitId[];
  /** 디버깅·시뮬레이션용 순위. */
  ranking: { characterId: string; affinity: number; overlap: number }[];
  usedFallback: boolean;
}

export type AnswerValidation =
  | { ok: true }
  | { ok: false; code: 'INCOMPLETE_ANSWERS'; missing: string[] }
  | { ok: false; code: 'INVALID_OPTION'; questionId: string; optionId: string };
