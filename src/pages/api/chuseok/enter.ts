import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';
import { isUuid, normalizeEmail, normalizeName } from '@/lib/chuseok/validation';
import { getEventStatus } from '@/lib/chuseok/event';

export const prerender = false;

/**
 * POST /api/chuseok/enter
 * body: { sessionId: uuid, employeeName: string, employeeEmail: string }
 * 테스트 완료 세션만 응모 가능. 이메일·세션 각각 unique → 서버에서 중복을 최종 차단한다.
 */
export const POST: APIRoute = async (ctx) => {
  let body: { sessionId?: unknown; employeeName?: unknown; employeeEmail?: unknown } = {};
  try {
    body = (await ctx.request.json()) as typeof body;
  } catch {
    return Response.json({ code: 'INVALID_JSON', error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  if (!isUuid(body.sessionId)) {
    return Response.json({ code: 'INVALID_SESSION', error: '세션 정보가 올바르지 않습니다.' }, { status: 400 });
  }
  const name = normalizeName(body.employeeName);
  const email = normalizeEmail(body.employeeEmail);
  if (!name) return Response.json({ code: 'INVALID_NAME', error: '이름을 확인해 주세요.' }, { status: 400 });
  if (!email) return Response.json({ code: 'INVALID_EMAIL', error: '이메일 형식을 확인해 주세요.' }, { status: 400 });

  let env: Env;
  try {
    env = readEnv(ctx);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }

  const status = getEventStatus(env);
  if (!status.drawOpen) {
    return Response.json(
      {
        code: 'DRAW_CLOSED',
        state: status.drawState,
        error:
          status.drawState === 'not_started'
            ? '럭키드로우 응모가 아직 시작되지 않았어요.'
            : '럭키드로우 응모 기간이 종료되었어요.',
      },
      { status: 403 }
    );
  }

  try {
    const sb = createServerClient(env);
    const { data: session } = await sb
      .from('chuseok_sessions')
      .select('id, character_id')
      .eq('id', body.sessionId)
      .maybeSingle();

    if (!session) {
      return Response.json(
        { code: 'SESSION_NOT_FOUND', error: '테스트를 먼저 완료해 주세요.' },
        { status: 404 }
      );
    }

    const { error } = await sb.from('chuseok_entries').insert({
      session_id: session.id,
      employee_name: name,
      employee_email: email,
      character_id: session.character_id,
    });

    if (error) {
      if (error.code === '23505') {
        return Response.json(
          { success: false, code: 'ALREADY_ENTERED', error: '이미 럭키드로우에 참여하셨습니다.' },
          { status: 409 }
        );
      }
      throw error;
    }

    return Response.json({ success: true }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (err: any) {
    console.error('[chuseok:enter]', err);
    return Response.json({ error: '응모를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
};
