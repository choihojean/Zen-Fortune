import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';
import { todayKeyKST } from '@/lib/date';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const today = todayKeyKST();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    const sevenAgoKey = sevenDaysAgo.toISOString().slice(0, 10);

    const [
      viewsToday,
      viewsWeek,
      viewsTotal,
      likesToday,
      likesWeek,
      likesTotal,
      quotesActive,
      quotesTotal,
      drinksActive,
      topQuotes,
      drinkPool,
    ] = await Promise.all([
      sb.from('daily_fortunes').select('*', { count: 'exact', head: true }).eq('date_key', today),
      sb.from('daily_fortunes').select('*', { count: 'exact', head: true }).gte('date_key', sevenAgoKey),
      sb.from('daily_fortunes').select('*', { count: 'exact', head: true }),
      sb.from('likes').select('*', { count: 'exact', head: true }).eq('date_key', today),
      sb.from('likes').select('*', { count: 'exact', head: true }).gte('date_key', sevenAgoKey),
      sb.from('likes').select('*', { count: 'exact', head: true }),
      sb.from('quotes').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('quotes').select('*', { count: 'exact', head: true }),
      sb.from('drinks').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('quote_stats').select('*').order('likes_7d', { ascending: false }).order('views_7d', { ascending: false }).limit(5),
      sb.from('drink_usage').select('*').order('usage_7d', { ascending: false }).order('usage_total', { ascending: false }).limit(8),
    ]);

    return Response.json({
      today,
      views: { today: viewsToday.count ?? 0, week: viewsWeek.count ?? 0, total: viewsTotal.count ?? 0 },
      likes: { today: likesToday.count ?? 0, week: likesWeek.count ?? 0, total: likesTotal.count ?? 0 },
      quotes: { active: quotesActive.count ?? 0, total: quotesTotal.count ?? 0 },
      drinks: { active: drinksActive.count ?? 0 },
      topQuotes: topQuotes.data ?? [],
      drinkPool: drinkPool.data ?? [],
    });
  } catch (err: any) {
    console.error('[stats]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
