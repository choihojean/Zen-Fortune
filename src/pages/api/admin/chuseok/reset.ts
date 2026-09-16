import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';

export const prerender = false;

/**
 * POST /api/admin/chuseok/reset
 * body: { confirm: "초기화" }
 * 테스트 세션과 럭키드로우 응모를 모두 삭제한다 (시연·테스트 데이터 정리용). 되돌릴 수 없다.
 */
export const POST: APIRoute = async (ctx) => {
  let body: { confirm?: unknown } = {};
  try {
    body = (await ctx.request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }
  if (body.confirm !== '초기화') {
    return Response.json({ error: '확인 문구가 일치하지 않습니다.' }, { status: 400 });
  }

  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);

    const [{ count: entries }, { count: sessions }] = await Promise.all([
      sb.from('chuseok_entries').select('*', { count: 'exact', head: true }),
      sb.from('chuseok_sessions').select('*', { count: 'exact', head: true }),
    ]);

    // 응모가 세션을 참조(on delete restrict)하므로 응모 → 세션 순서로 지운다.
    const { error: e1 } = await sb.from('chuseok_entries').delete().gte('id', 0);
    if (e1) throw e1;
    const { error: e2 } = await sb.from('chuseok_sessions').delete().not('id', 'is', null);
    if (e2) throw e2;

    return Response.json({ ok: true, deleted: { entries: entries ?? 0, sessions: sessions ?? 0 } });
  } catch (err: any) {
    console.error('[chuseok:reset]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
