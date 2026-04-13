import { defineMiddleware } from 'astro:middleware';
import { readEnv } from './lib/env';
import { verifyRequest } from './lib/auth';

const PROTECTED_PAGE = /^\/admin(\/|$)/;
const PROTECTED_API = /^\/api\/admin\//;
const PUBLIC_ADMIN_API = new Set(['/api/admin/login']);

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const isAdminPage = PROTECTED_PAGE.test(path) && path !== '/admin/login';
  const isAdminApi = PROTECTED_API.test(path) && !PUBLIC_ADMIN_API.has(path);

  if (!isAdminPage && !isAdminApi) {
    context.locals.isAdmin = false;
    return next();
  }

  let env: Env;
  try {
    env = readEnv(context);
  } catch (err) {
    return new Response('Server is not configured. Set required env vars.', { status: 500 });
  }

  const ok = await verifyRequest(context.request, env.SESSION_SECRET);
  context.locals.isAdmin = ok;

  if (!ok) {
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    return context.redirect(`/admin/login?next=${encodeURIComponent(path)}`, 302);
  }

  return next();
});
