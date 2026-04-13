import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb
      .from('drink_usage')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    return Response.json({ drinks: data ?? [] });
  } catch (err: any) {
    console.error('[drinks:list]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};

export const POST: APIRoute = async (ctx) => {
  try {
    const body = (await ctx.request.json()) as {
      name?: string;
      note?: string | null;
      is_active?: boolean;
    };
    if (!body.name?.trim()) {
      return Response.json({ error: '음료 이름을 입력해 주세요.' }, { status: 400 });
    }

    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb
      .from('drinks')
      .insert({
        name: body.name.trim(),
        note: body.note?.trim() || null,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;

    return Response.json({ drink: data }, { status: 201 });
  } catch (err: any) {
    console.error('[drinks:create]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
