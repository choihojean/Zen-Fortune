/**
 * 콘텐츠 로더. JSON 을 읽어 형태를 검증하고 앱 전역에서 쓸 단일 객체를 만든다.
 * 콘텐츠가 깨져 있으면 빌드/기동 시점에 바로 throw 되어 빈 화면이 배포되는 일을 막는다.
 */
import questionsJson from '@/data/chuseok/questions.json';
import charactersJson from '@/data/chuseok/characters.json';
import type { Character, ChuseokContent, PublicQuestion, Question, TraitDef } from './types';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`[chuseok content] ${msg}`);
}

function buildContent(): ChuseokContent {
  const traits = charactersJson.traits as TraitDef[];
  const characters = charactersJson.characters as Character[];
  const questions = questionsJson.questions as Question[];
  const fallbackCharacterId = charactersJson.fallbackCharacterId as string;

  assert(Array.isArray(traits) && traits.length > 0, 'traits 가 비어 있습니다.');
  assert(Array.isArray(questions) && questions.length > 0, 'questions 가 비어 있습니다.');
  assert(Array.isArray(characters) && characters.length > 0, 'characters 가 비어 있습니다.');

  const traitIds = new Set(traits.map((t) => t.id));
  const questionIds = new Set<string>();
  for (const q of questions) {
    assert(q.id && q.text, `질문에 id/text 가 없습니다: ${JSON.stringify(q).slice(0, 80)}`);
    assert(!questionIds.has(q.id), `질문 id 중복: ${q.id}`);
    questionIds.add(q.id);
    assert(Array.isArray(q.options) && q.options.length >= 2, `${q.id}: 선택지는 2개 이상이어야 합니다.`);
    const optionIds = new Set<string>();
    for (const o of q.options) {
      assert(o.id && o.text, `${q.id}: 선택지 id/text 누락`);
      assert(!optionIds.has(o.id), `${q.id}: 선택지 id 중복 ${o.id}`);
      optionIds.add(o.id);
      assert(Array.isArray(o.tags) && o.tags.length > 0, `${q.id}/${o.id}: tags 가 비어 있습니다.`);
      for (const t of o.tags) assert(traitIds.has(t), `${q.id}/${o.id}: 정의되지 않은 trait ${t}`);
    }
  }

  const characterIds = new Set<string>();
  for (const c of characters) {
    assert(c.id && c.name, `캐릭터 id/name 누락: ${JSON.stringify(c).slice(0, 80)}`);
    assert(!characterIds.has(c.id), `캐릭터 id 중복: ${c.id}`);
    characterIds.add(c.id);
    assert(Array.isArray(c.requiredTraits), `${c.id}: requiredTraits 배열 필요`);
    for (const t of c.requiredTraits) assert(traitIds.has(t), `${c.id}: 정의되지 않은 trait ${t}`);
    assert(typeof c.priority === 'number', `${c.id}: priority 숫자 필요`);
  }
  assert(characterIds.has(fallbackCharacterId), `fallbackCharacterId ${fallbackCharacterId} 가 캐릭터 목록에 없습니다.`);

  return {
    version: `${questionsJson.version}+${charactersJson.version}`,
    traits,
    fallbackCharacterId,
    questions,
    characters,
  };
}

export const chuseokContent: ChuseokContent = buildContent();

/** 태그를 제거한 질문 — 클라이언트로 전달용. */
export function getPublicQuestions(): PublicQuestion[] {
  return chuseokContent.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  }));
}

export function getCharacter(id: string): Character | undefined {
  return chuseokContent.characters.find((c) => c.id === id);
}

export function getFallbackCharacter(): Character {
  return getCharacter(chuseokContent.fallbackCharacterId)!;
}

export function getTraitLabel(id: string): string {
  return chuseokContent.traits.find((t) => t.id === id)?.label ?? id;
}
