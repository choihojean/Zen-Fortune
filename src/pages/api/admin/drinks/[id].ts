import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';

export const prerender = false;

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const PATCH: APIRoute = async (ctx) => {
  const id = parseId(ctx.params.id);
  if (!id) return Response.json({ error: 'invalid id' }, { status: 400 });

  try {
    const body = (await ctx.request.json()) as {
      name?: string;
      note?: string | null;
      is_active?: boolean;
    };

    const update: Record<string, unknown> = {};
    if (typeof body.name === 'string') update.name = body.name.trim();
    if (body.note !== undefined) update.note = body.note ? String(body.note).trim() : null;
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active;

    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'no fields to update' }, { status: 400 });
    }

    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb
      .from('drinks')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return Response.json({ drink: data });
  } catch (err: any) {
    console.error('[drinks:update]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const id = parseId(ctx.params.id);
  if (!id) return Response.json({ error: 'invalid id' }, { status: 400 });

  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { error } = await sb.from('drinks').delete().eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('[drinks:delete]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
