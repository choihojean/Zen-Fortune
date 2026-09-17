import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createServerClient } from '@/lib/supabase';
import { getCharacter } from '@/lib/chuseok/content';
import { formatPhone } from '@/lib/chuseok/validation';

export const prerender = false;

export type EntryRow = {
  id: number;
  session_id: string;
  employee_name: string;
  employee_phone: string | null;
  employee_email: string | null;
  character_id: string;
  entered_at: string;
  is_winner: boolean;
  prize: string | null;
  drawn_at: string | null;
  is_excluded: boolean;
  note: string | null;
};

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fmtKST(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso));
}

/** GET /api/admin/chuseok/entries[?format=csv] — 응모자 목록 */
export const GET: APIRoute = async (ctx) => {
  try {
    const env = readEnv(ctx);
    const sb = createServerClient(env);
    const { data, error } = await sb
      .from('chuseok_entries')
      .select('*')
      .order('entered_at', { ascending: false })
      .range(0, 9999);
    if (error) throw error;

    const entries = ((data ?? []) as EntryRow[]).map((e) => ({
      ...e,
      phone_display: e.employee_phone ? formatPhone(e.employee_phone) : (e.employee_email ?? ''),
      character_name: getCharacter(e.character_id)?.name ?? e.character_id,
    }));

    const url = new URL(ctx.request.url);
    if (url.searchParams.get('format') === 'csv') {
      const header = ['id', '이름', '연락처', '캐릭터', '캐릭터ID', '응모시각(KST)', '당첨', '상품', '추첨시각(KST)', '제외', '메모'];
      const lines = entries.map((e) =>
        [
          e.id, e.employee_name, e.phone_display, e.character_name, e.character_id,
          fmtKST(e.entered_at), e.is_winner ? 'Y' : '', e.prize ?? '', fmtKST(e.drawn_at),
          e.is_excluded ? 'Y' : '', e.note ?? '',
        ].map(csvCell).join(',')
      );
      const body = '\uFEFF' + [header.join(','), ...lines].join('\r\n'); // BOM: Excel 한글 깨짐 방지
      const stamp = fmtKST(new Date().toISOString()).replace(/[^\d]/g, '').slice(0, 12);
      return new Response(body, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="chuseok-entries-${stamp}.csv"`,
          'cache-control': 'no-store',
        },
      });
    }

    return Response.json({ entries }, { headers: { 'cache-control': 'no-store' } });
  } catch (err: any) {
    console.error('[chuseok:entries]', err);
    return Response.json({ error: err?.message ?? 'failed' }, { status: 500 });
  }
};
