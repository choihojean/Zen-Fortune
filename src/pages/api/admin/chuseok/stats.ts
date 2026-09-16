import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';
import { todayKeyKST } from '@/lib/date';
import { chuseokContent, getCharacter } from '@/lib/chuseok/content';
import { getEventStatus } from '@/lib/chuseok/event';

export const prerender = false;

const MAX_ROWS = 20000;

/** GET /api/admin/chuseok/stats — 참여 현황·캐릭터 분포·질문별 선택 비율 */
export const GET: APIRoute = async (ctx) => {
  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const today = todayKeyKST();
    // KST 자정 = UTC 전날 15:00
    const todayStartUtc = new Date(`${today}T00:00:00+09:00`).toISOString();

    const [sessions, sessionsToday, entriesTotal, winners, excluded, sessionRows] = await Promise.all([
      sb.from('chuseok_sessions').select('*', { count: 'exact', head: true }),
      sb.from('chuseok_sessions').select('*', { count: 'exact', head: true }).gte('completed_at', todayStartUtc),
      sb.from('chuseok_entries').select('*', { count: 'exact', head: true }),
      sb.from('chuseok_entries').select('*', { count: 'exact', head: true }).eq('is_winner', true),
      sb.from('chuseok_entries').select('*', { count: 'exact', head: true }).eq('is_excluded', true),
      sb.from('chuseok_sessions').select('character_id, answers').range(0, MAX_ROWS - 1),
    ]);

    const rows = (sessionRows.data ?? []) as { character_id: string; answers: Record<string, string> }[];

    // 캐릭터 분포 — 콘텐츠 순서를 유지하고, 콘텐츠에서 사라진 id 도 "unknown" 으로 노출
    const charCount = new Map<string, number>();
    for (const r of rows) charCount.set(r.character_id, (charCount.get(r.character_id) ?? 0) + 1);
    const characters = chuseokContent.characters.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      count: charCount.get(c.id) ?? 0,
    }));
    for (const [id, count] of charCount) {
      if (!getCharacter(id)) characters.push({ id, name: `(삭제된 캐릭터) ${id}`, emoji: '❔', count });
    }

    // 질문별 선택 비율
    const questions = chuseokContent.questions.map((q) => {
      const counts = new Map<string, number>();
      for (const r of rows) {
        const o = r.answers?.[q.id];
        if (o) counts.set(o, (counts.get(o) ?? 0) + 1);
      }
      const total = q.options.reduce((s, o) => s + (counts.get(o.id) ?? 0), 0);
      return {
        id: q.id,
        text: q.text,
        total,
        options: q.options.map((o) => ({ id: o.id, text: o.text, count: counts.get(o.id) ?? 0 })),
      };
    });

    return Response.json(
      {
        today,
        contentVersion: chuseokContent.version,
        event: getEventStatus(env),
        sessions: { total: sessions.count ?? 0, today: sessionsToday.count ?? 0, sampled: rows.length },
        entries: { total: entriesTotal.count ?? 0, winners: winners.count ?? 0, excluded: excluded.count ?? 0 },
        characters,
        questions,
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('[chuseok:stats]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
