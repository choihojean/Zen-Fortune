/**
 * 결과 분포 시뮬레이션 (기획서 §15).
 *   node scripts/simulate-chuseok.ts [iterations]
 * 랜덤 응답을 N회 생성해 캐릭터별 비율을 출력한다. 특정 캐릭터가 30% 이상이거나
 * 거의 나오지 않으면 questions.json 의 tags 나 characters.json 의 requiredTraits 를 조정한다.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluate, validateAnswers } from '../src/lib/chuseok/scoring.ts';
import type { AnswerMap, Character, Question, TraitDef } from '../src/lib/chuseok/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'src', 'data', 'chuseok');
const questionsJson = JSON.parse(readFileSync(join(contentDir, 'questions.json'), 'utf8'));
const charactersJson = JSON.parse(readFileSync(join(contentDir, 'characters.json'), 'utf8'));

const questions = questionsJson.questions as Question[];
const characters = charactersJson.characters as Character[];
const traits = charactersJson.traits as TraitDef[];
const fallbackCharacterId = charactersJson.fallbackCharacterId as string;
const content = { questions, characters, traits, fallbackCharacterId };

const iterations = Number(process.argv[2]) || 50_000;
const counts = new Map<string, number>();
let fallbacks = 0;

// 결정성 확인: 동일 답변 → 동일 결과
const probe: AnswerMap = Object.fromEntries(questions.map((q) => [q.id, q.options[0].id]));
const v = validateAnswers(probe, questions);
if (!v.ok) throw new Error('probe answers invalid: ' + JSON.stringify(v));
const r1 = evaluate(probe, content).characterId;
const r2 = evaluate(probe, content).characterId;
if (r1 !== r2) throw new Error('non-deterministic result!');

for (let i = 0; i < iterations; i++) {
  const answers: AnswerMap = {};
  for (const q of questions) {
    answers[q.id] = q.options[Math.floor(Math.random() * q.options.length)].id;
  }
  const result = evaluate(answers, content);
  counts.set(result.characterId, (counts.get(result.characterId) ?? 0) + 1);
  if (result.usedFallback) fallbacks++;
}

const rows = characters
  .map((c) => ({ id: c.id, name: c.name, n: counts.get(c.id) ?? 0 }))
  .sort((a, b) => b.n - a.n);

console.log(`\n질문 ${questions.length}개 · 캐릭터 ${characters.length}개 · 랜덤 응답 ${iterations.toLocaleString()}회\n`);
for (const row of rows) {
  const pct = (row.n / iterations) * 100;
  const bar = '█'.repeat(Math.round(pct / 2));
  const flag = pct >= 30 ? '  ⚠ 과다' : pct > 0 && pct < 3 ? '  ⚠ 희소' : '';
  console.log(`${row.name.padEnd(10, ' ')} ${pct.toFixed(1).padStart(5)}%  ${bar}${flag}`);
}
console.log(`\nfallback 사용: ${fallbacks}회`);

// 태그 분포도 함께 출력 — 특정 성향이 과다 노출되면 결과가 치우친다.
const tagCount = new Map<string, number>();
for (const q of questions) for (const o of q.options) for (const t of o.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
console.log('\n태그 노출 횟수:', Object.fromEntries([...tagCount.entries()].sort()));

// 서로 다른 두 태그가 같은 선택지에 붙은 횟수. 축 모델에서는 12개 조합이 비슷해야 축이 독립적으로 갈린다.
const pairCount = new Map<string, number>();
for (const q of questions) for (const o of q.options) {
  const tags = [...o.tags].sort();
  for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
    const k = `${tags[i]}+${tags[j]}`;
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
  }
}
console.log('\n태그 쌍 동시 출현:', Object.fromEntries([...pairCount.entries()].sort()));
