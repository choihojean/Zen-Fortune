import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';

export const prerender = false;

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** PATCH — 수동 제외 토글, 메모 */
export const PATCH: APIRoute = async (ctx) => {
  const id = parseId(ctx.params.id);
  if (!id) return Response.json({ error: 'invalid id' }, { status: 400 });

  try {
    const body = (await ctx.request.json()) as { is_excluded?: boolean; note?: string | null };
    const update: Record<string, unknown> = {};
    if (typeof body.is_excluded === 'boolean') update.is_excluded = body.is_excluded;
    if (body.note !== undefined) update.note = body.note === null ? null : String(body.note).slice(0, 200);
    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'no fields to update' }, { status: 400 });
    }

    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb.from('chuseok_entries').update(update).eq('id', id).select().single();
    if (error) throw error;
    return Response.json({ entry: data });
  } catch (err: any) {
    console.error('[chuseok:entry:update]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};

/** DELETE — 응모 삭제 (해당 이메일은 다시 응모할 수 있게 된다) */
export const DELETE: APIRoute = async (ctx) => {
  const id = parseId(ctx.params.id);
  if (!id) return Response.json({ error: 'invalid id' }, { status: 400 });

  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { error } = await sb.from('chuseok_entries').delete().eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('[chuseok:entry:delete]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
