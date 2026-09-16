-- 한가위 캐릭터 테스트 + 럭키드로우 · Supabase schema
-- 기존 Zen Fortune 프로젝트 DB의 SQL Editor 에서 실행. (schema.sql 은 그대로 두고 이 파일만 추가 실행)

-- 테스트 완료 세션. 세션 id 는 클라이언트가 생성한 uuid 이며 결과 URL 로도 쓰인다.
create table if not exists chuseok_sessions (
  id               uuid primary key,
  answers          jsonb       not null,        -- {"q1":"q1_a", ...}
  scores           jsonb       not null,        -- {"HELPER":3, ...}
  character_id     text        not null,
  content_version  text,
  started_at       timestamptz,
  completed_at     timestamptz not null default now(),
  user_agent       text
);

-- 럭키드로우 응모. 이메일 1인 1응모 — 서버에서 lower/trim 후 저장하고 unique 로 강제.
create table if not exists chuseok_entries (
  id              bigserial primary key,
  session_id      uuid        not null references chuseok_sessions(id) on delete restrict,
  employee_name   text        not null,
  employee_email  text        not null,
  character_id    text        not null,          -- 응모 시점의 결과 (재테스트해도 유지)
  entered_at      timestamptz not null default now(),
  is_winner       boolean     not null default false,
  prize           text,
  drawn_at        timestamptz,
  is_excluded     boolean     not null default false,  -- 운영자 수동 제외 (추첨 풀에서 빠짐)
  note            text
);

create unique index if not exists chuseok_entries_email_uidx   on chuseok_entries (employee_email);
create unique index if not exists chuseok_entries_session_uidx on chuseok_entries (session_id);
create index        if not exists chuseok_entries_winner_idx   on chuseok_entries (is_winner) where is_winner;
create index        if not exists chuseok_sessions_char_idx    on chuseok_sessions (character_id);
create index        if not exists chuseok_sessions_done_idx    on chuseok_sessions (completed_at);

-- RLS: 정책 없이 enable 만 → anon/authenticated 는 접근 불가, service_role 만 통과 (기존 테이블과 동일 정책)
alter table chuseok_sessions enable row level security;
alter table chuseok_entries  enable row level security;
