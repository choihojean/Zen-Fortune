import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb
      .from('quote_stats')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;

    const { data: quotes } = await sb
      .from('quotes')
      .select('id, drink_override_id, created_at');

    const map = new Map(quotes?.map((q) => [q.id, q]) ?? []);
    const merged = (data ?? []).map((row) => ({
      ...row,
      drink_override_id: map.get(row.id)?.drink_override_id ?? null,
      created_at: map.get(row.id)?.created_at ?? null,
    }));

    return Response.json({ quotes: merged });
  } catch (err: any) {
    console.error('[quotes:list]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};

export const POST: APIRoute = async (ctx) => {
  try {
    const body = (await ctx.request.json()) as {
      content?: string;
      drink_override_id?: number | null;
      is_active?: boolean;
    };
    if (!body.content?.trim()) {
      return Response.json({ error: '문구를 입력해 주세요.' }, { status: 400 });
    }

    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb
      .from('quotes')
      .insert({
        content: body.content.trim(),
        drink_override_id: body.drink_override_id ?? null,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;

    return Response.json({ quote: data }, { status: 201 });
  } catch (err: any) {
    console.error('[quotes:create]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
