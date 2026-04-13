import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';

export const prerender = false;

const MAX_ITEMS = 200;

/**
 * Accepts either:
 *   { items: string[] }                              ← each line, "Name | note" or just "Name"
 *   { items: { name: string, note?: string }[] }    ← structured
 */
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

  const parsed: { name: string; note: string | null }[] = [];
  for (const raw of body.items as unknown[]) {
    if (typeof raw === 'string') {
      const line = raw.trim();
      if (!line) continue;
      const [namePart, ...rest] = line.split('|');
      const name = namePart.trim();
      const note = rest.join('|').trim() || null;
      if (name) parsed.push({ name, note });
    } else if (raw && typeof raw === 'object') {
      const obj = raw as { name?: unknown; note?: unknown };
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const note = typeof obj.note === 'string' && obj.note.trim() ? obj.note.trim() : null;
      if (name) parsed.push({ name, note });
    }
  }

  if (parsed.length === 0) {
    return Response.json({ error: '추가할 음료가 없어요.' }, { status: 400 });
  }
  if (parsed.length > MAX_ITEMS) {
    return Response.json({ error: `한 번에 최대 ${MAX_ITEMS}개까지 추가할 수 있어요.` }, { status: 400 });
  }

  const isActive = body.is_active ?? true;

  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb
      .from('drinks')
      .insert(parsed.map((d) => ({ ...d, is_active: isActive })))
      .select('id');

    if (error) throw error;

    return Response.json({ inserted: data?.length ?? 0 }, { status: 201 });
  } catch (err: any) {
    console.error('[drinks:bulk]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
