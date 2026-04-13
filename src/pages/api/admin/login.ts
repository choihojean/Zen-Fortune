import type { APIRoute } from 'astro';
import { readEnv } from '@/lib/env';
import { createSessionCookie, timingSafeEqual } from '@/lib/auth';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  let body: { password?: string } = {};
  try {
    body = (await ctx.request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body.password) {
    return Response.json({ error: 'password required' }, { status: 400 });
  }

  let env: Env;
  try {
    env = readEnv(ctx);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }

  if (!timingSafeEqual(body.password, env.ADMIN_PASSWORD)) {
    // throttle a touch to take the edge off naive brute force
    await new Promise((r) => setTimeout(r, 600));
    return Response.json({ error: '비밀번호가 일치하지 않아요.' }, { status: 401 });
  }

  const cookie = await createSessionCookie(env.SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'set-cookie': cookie,
    },
  });
};
