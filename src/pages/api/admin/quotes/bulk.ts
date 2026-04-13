import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';

export const prerender = false;

const MAX_ITEMS = 200;

export const POST: APIRoute = async (ctx) => {
  let body: { items?: unknown; is_active?: boolean } = {};
  try {
    body = (await ctx.request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return Response.json({ error: 'items must be an array' }, { status: 400 });
  }

  const items = (body.items as unknown[])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0);

  if (items.length === 0) {
    return Response.json({ error: '추가할 문구가 없어요.' }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return Response.json({ error: `한 번에 최대 ${MAX_ITEMS}개까지 추가할 수 있어요.` }, { status: 400 });
  }

  const isActive = body.is_active ?? true;

  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb
      .from('quotes')
      .insert(items.map((content) => ({ content, is_active: isActive })))
      .select('id');

    if (error) throw error;

    return Response.json({ inserted: data?.length ?? 0 }, { status: 201 });
  } catch (err: any) {
    console.error('[quotes:bulk]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
