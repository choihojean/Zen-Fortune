# Zen Fortune

Roastery Zen 운세 추천 + 관리자 콘솔. Cloudflare Pages + Supabase.

```
src/
├── pages/
│   ├── index.astro            ← 모바일 운세 페이지 (모노톤)
│   ├── admin/
│   │   ├── login.astro
│   │   ├── index.astro        ← 대시보드
│   │   ├── quotes.astro       ← 문구 CRUD
│   │   └── drinks.astro       ← 음료 CRUD
│   └── api/
│       ├── fortune.ts         ← GET (오늘의 운세)
│       ├── like.ts            ← POST (좋아요 1회/일)
│       └── admin/
│           ├── login.ts | logout.ts
│           ├── stats.ts
│           ├── quotes.ts | quotes/[id].ts
│           └── drinks.ts | drinks/[id].ts
├── lib/
│   ├── supabase.ts | env.ts | auth.ts | date.ts | fortune.ts
├── layouts/  Base.astro · AdminLayout.astro
└── components/ FortuneClient.tsx
supabase/schema.sql
```

## 로컬 개발

### 1. 의존성 설치

```bash
pnpm install      # 또는 npm install / yarn
```

### 2. Supabase 프로젝트 준비

1. https://supabase.com 에서 새 프로젝트 생성
2. SQL Editor 열고 `supabase/schema.sql` 전체 붙여넣기 → Run
3. Project Settings → API 에서 두 키 복사:
   - `Project URL`
   - `service_role` secret key (서버 전용, 노출 금지)
   - `anon` public key (현재 코드는 service_role만 사용하지만 future-proof로 같이 보관)

### 3. 환경 변수

`.dev.vars` 파일을 루트에 생성 (Cloudflare Pages 로컬 dev에서 자동 로드):

```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ADMIN_PASSWORD=강한-비밀번호
SESSION_SECRET=$(openssl rand -base64 32)
```

> `ADMIN_PASSWORD`는 관리자 로그인용. `SESSION_SECRET`은 세션 쿠키 HMAC 서명 키.

### 4. 데이터 시드

관리자 콘솔에서 직접 입력:

```bash
pnpm dev
```

→ http://localhost:4321/admin/login 접속 → 비밀번호 입력 → Drinks/Quotes 추가.

## 배포 (Cloudflare Pages)

### 첫 배포

```bash
pnpm build
npx wrangler pages deploy ./dist --project-name=zen-fortune
```

### 환경 변수 설정 (한 번만)

Cloudflare 대시보드 → Pages → 프로젝트 → Settings → Environment variables 에서
**Production**과 **Preview** 각각에 다섯 개를 모두 등록:

| Key | Type |
| --- | --- |
| `SUPABASE_URL` | Plain text |
| `SUPABASE_ANON_KEY` | Plain text |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** |
| `ADMIN_PASSWORD` | **Secret** |
| `SESSION_SECRET` | **Secret** |

또는 CLI:

```bash
wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name zen-fortune
wrangler pages secret put ADMIN_PASSWORD            --project-name zen-fortune
wrangler pages secret put SESSION_SECRET            --project-name zen-fortune
```

### Git 자동 배포 (선택)

Cloudflare Pages → Connect to Git → Build command `pnpm build`, Output `dist`.

## 도메인 / 첫 사용

- 메인: `https://zen-fortune.pages.dev/`
- 관리자: `https://zen-fortune.pages.dev/admin/login`

## 데이터 모델 메모

| 테이블 | 역할 |
| --- | --- |
| `quotes` | 문구. `drink_override_id`로 특정 음료 강제 |
| `drinks` | 랜덤 페어링 풀 |
| `daily_fortunes` | (date, device) 키로 오늘의 운세 캐시 = view log |
| `likes` | (date, device) 키로 하루 1회 좋아요 |
| `quote_stats` | view (총/7일 노출·좋아요) |
| `drink_usage` | view (총/7일 매칭) |

조회/좋아요 카운터는 별도 테이블 없이 위 두 view에서 집계합니다. 새 분석 차원이 필요해지면 view를 늘리는 방향으로 확장.

## 보안

- 모든 mutation은 CF Pages Functions 안에서 service_role 키로 호출 — 클라이언트에 키가 노출되지 않음.
- RLS는 `enable`만 해두고 정책 미부여 → anon/authenticated로는 어떤 행도 읽거나 쓸 수 없음. service_role만 통과.
- `/admin/**`과 `/api/admin/**`는 미들웨어가 HMAC 서명 쿠키를 검증.
