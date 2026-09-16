import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';
import { chuseokContent, getCharacter, getFallbackCharacter } from '@/lib/chuseok/content';
import { evaluate, validateAnswers } from '@/lib/chuseok/scoring';
import { isAnswerMap, isUuid } from '@/lib/chuseok/validation';
import { getEventStatus } from '@/lib/chuseok/event';

export const prerender = false;

/**
 * POST /api/chuseok/complete
 * body: { sessionId: uuid, answers: {qid: oid}, startedAt?: ISO }
 * 전체 답변을 검증하고 캐릭터를 계산해 세션으로 저장한다. 같은 sessionId 재전송은 기존 결과를 돌려준다.
 */
export const POST: APIRoute = async (ctx) => {
  let body: { sessionId?: unknown; answers?: unknown; startedAt?: unknown } = {};
  try {
    body = (await ctx.request.json()) as typeof body;
  } catch {
    return Response.json({ code: 'INVALID_JSON', error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  if (!isUuid(body.sessionId)) {
    return Response.json({ code: 'INVALID_SESSION', error: '세션 정보가 올바르지 않습니다.' }, { status: 400 });
  }
  if (!isAnswerMap(body.answers)) {
    return Response.json({ code: 'INVALID_ANSWERS', error: '답변 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const validation = validateAnswers(body.answers, chuseokContent.questions);
  if (!validation.ok) {
    const status = 400;
    if (validation.code === 'INCOMPLETE_ANSWERS') {
      return Response.json(
        { code: validation.code, error: '모든 질문에 답해 주세요.', missing: validation.missing },
        { status }
      );
    }
    return Response.json({ code: validation.code, error: '선택지 정보가 올바르지 않습니다.' }, { status });
  }

  let env: Env;
  try {
    env = readEnv(ctx);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }

  if (!getEventStatus(env).testOpen) {
    return Response.json({ code: 'TEST_CLOSED', error: '테스트가 종료되었습니다.' }, { status: 403 });
  }

  // 정답 조합 외 키는 버린다 (콘텐츠에 없는 질문 id 가 섞여 들어오는 경우)
  const answers: Record<string, string> = {};
  for (const q of chuseokContent.questions) answers[q.id] = body.answers[q.id];

  const result = evaluate(answers, chuseokContent);
  const character = getCharacter(result.characterId) ?? getFallbackCharacter();

  const startedAt =
    typeof body.startedAt === 'string' && !Number.isNaN(new Date(body.startedAt).getTime())
      ? new Date(body.startedAt).toISOString()
      : null;

  try {
    const sb = createServerClient(env);
    const { error } = await sb.from('chuseok_sessions').insert({
      id: body.sessionId,
      answers,
      scores: result.scores,
      character_id: character.id,
      content_version: chuseokContent.version,
      started_at: startedAt,
      user_agent: ctx.request.headers.get('user-agent')?.slice(0, 300) ?? null,
    });

    if (error) {
      if (error.code === '23505') {
        // 같은 세션 재전송 → 기존 결과 유지 (결과 고정 정책)
        const { data: existing } = await sb
          .from('chuseok_sessions')
          .select('id, character_id, scores')
          .eq('id', body.sessionId)
          .single();
        const c = getCharacter(existing?.character_id) ?? getFallbackCharacter();
        return Response.json({
          resultId: body.sessionId,
          character: { id: c.id, name: c.name },
          scores: existing?.scores ?? result.scores,
        });
      }
      throw error;
    }

    return Response.json(
      {
        resultId: body.sessionId,
        character: { id: character.id, name: character.name },
        scores: result.scores,
        topTraits: result.topTraits,
      },
      { status: 201, headers: { 'cache-control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('[chuseok:complete]', err);
    return Response.json({ error: '결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
};
