/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  /** 한가위 이벤트 — 모두 선택. 없으면 항상 열림. ISO 8601 (예: 2026-09-21T00:00:00+09:00) */
  CHUSEOK_DRAW_OPENS_AT?: string;
  CHUSEOK_DRAW_CLOSES_AT?: string;
  /** "true" 면 테스트 시작 차단 (결과 재확인은 가능) */
  CHUSEOK_TEST_CLOSED?: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    isAdmin: boolean;
  }
}
