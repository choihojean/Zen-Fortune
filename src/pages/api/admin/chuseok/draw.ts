import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';
import { assignPrizes, parsePrizeTiers } from '@/lib/chuseok/draw';
import { getCharacter } from '@/lib/chuseok/content';

export const prerender = false;

type PoolRow = { id: number; employee_name: string; employee_email: string; character_id: string };

/**
 * POST /api/admin/chuseok/draw
 * body: { prizes: [{ name, count }] }
 * 풀 = 제외되지 않았고 아직 당첨되지 않은 응모자. 암호학적 난수로 비복원 추출 후 저장.
 * 이미 당첨된 사람은 풀에서 빠지므로 여러 번 호출하면 "추가 추첨" 이 된다.
 */
export const POST: APIRoute = async (ctx) => {
  let body: { prizes?: unknown } = {};
  try {
    body = (await ctx.request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = parsePrizeTiers(body.prizes);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);

    const { data: pool, error } = await sb
      .from('chuseok_entries')
      .select('id, employee_name, employee_email, character_id')
      .eq('is_excluded', false)
      .eq('is_winner', false)
      .order('id', { ascending: true })
      .range(0, 9999);
    if (error) throw error;

    const rows = (pool ?? []) as PoolRow[];
    if (rows.length === 0) {
      return Response.json({ error: '추첨 가능한 응모자가 없습니다.' }, { status: 400 });
    }

    const requested = parsed.tiers.reduce((s, t) => s + t.count, 0);
    const assignments = assignPrizes(rows, parsed.tiers);
    const drawnAt = new Date().toISOString();

    // 상품이 등급별로 다르므로 행마다 update. 규모가 작아(수십 명) 순차 처리로 충분하다.
    for (const a of assignments) {
      const { error: upErr } = await sb
        .from('chuseok_entries')
        .update({ is_winner: true, prize: a.prize, drawn_at: drawnAt })
        .eq('id', a.winner.id)
        .eq('is_winner', false);
      if (upErr) throw upErr;
    }

    return Response.json({
      drawnAt,
      poolSize: rows.length,
      requested,
      winners: assignments.map((a) => ({
        id: a.winner.id,
        employee_name: a.winner.employee_name,
        employee_email: a.winner.employee_email,
        character_id: a.winner.character_id,
        character_name: getCharacter(a.winner.character_id)?.name ?? a.winner.character_id,
        prize: a.prize,
      })),
      shortfall: Math.max(0, requested - assignments.length),
    });
  } catch (err: any) {
    console.error('[chuseok:draw]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};

/** DELETE /api/admin/chuseok/draw — 당첨 결과 전체 초기화 (재추첨 전용) */
export const DELETE: APIRoute = async (ctx) => {
  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { error } = await sb
      .from('chuseok_entries')
      .update({ is_winner: false, prize: null, drawn_at: null })
      .eq('is_winner', true);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('[chuseok:draw:reset]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
