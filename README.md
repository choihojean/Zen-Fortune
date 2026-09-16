# Junior Board

오로라월드 주니어보드 사내 서비스 모음 + 관리자 콘솔. Astro 5 · Cloudflare Pages · Supabase.

| 경로 | 서비스 |
| --- | --- |
| `/` | 주니어보드 허브 (서비스 목록) |
| `/chuseok` | **나만의 한가위 캐릭터 테스트 + 럭키드로우** (2026 추석 이벤트) |
| `/zen` | Zen Fortune — Roastery Zen 오늘의 문장 |
| `/admin` | 관리자 콘솔 (비밀번호 로그인) |

```
src/
├── pages/
│   ├── index.astro                 ← 주니어보드 허브
│   ├── zen/index.astro             ← Zen Fortune 운세 페이지
│   ├── chuseok/
│   │   ├── index.astro             ← 이벤트 랜딩
│   │   ├── test.astro              ← 질문 화면 (ChuseokTest 아일랜드)
│   │   └── result/[id].astro       ← 캐릭터 결과 + 럭키드로우 응모 (EntryForm 아일랜드)
│   ├── admin/
│   │   ├── login.astro · index.astro
│   │   ├── chuseok.astro           ← 참여 현황·분포·응모자·CSV·추첨
│   │   └── quotes.astro · drinks.astro
│   └── api/
│       ├── chuseok/complete.ts     ← POST 답변 제출 → 캐릭터 계산·세션 저장
│       ├── chuseok/enter.ts        ← POST 럭키드로우 응모 (이메일·세션 unique)
│       ├── admin/chuseok/{stats,entries,entries/[id],draw}.ts
│       ├── fortune.ts · like.ts
│       └── admin/{login,logout,stats,quotes*,drinks*}.ts
├── data/chuseok/
│   ├── questions.json              ← 질문·선택지·성향 태그 (콘텐츠만 교체)
│   └── characters.json             ← 성향 정의·캐릭터·매칭 규칙·fallback
├── lib/chuseok/
│   ├── scoring.ts                  ← 답변 → 성향 점수 → 캐릭터 (순수 함수, 결정적)
│   ├── content.ts                  ← JSON 로드 + 형태 검증
│   ├── draw.ts                     ← crypto 기반 비복원 추첨·상품 등급
│   ├── event.ts                    ← 운영 기간 (env)
│   └── validation.ts               ← 입력 검증
├── components/chuseok/ ChuseokTest.tsx · EntryForm.tsx
├── components/        FortuneClient.tsx · (구 추첨기 컴포넌트는 보관만, 라우트 없음)
├── styles/            global.css · chuseok.css
└── layouts/           Base.astro · AdminLayout.astro
scripts/simulate-chuseok.ts          ← 결과 분포 시뮬레이션
supabase/schema.sql · supabase/chuseok_schema.sql
```

## 한가위 캐릭터 테스트 — 콘텐츠 교체

질문/캐릭터는 코드에 없고 `src/data/chuseok/*.json` 에만 있다.

1. `characters.json` 의 `traits` 에 성향을 정의한다 (id 는 대문자 영문). 현재는 3축 6개: HANDS↔REST, SOCIAL↔SOLO, PLAN↔FLOW.
2. `questions.json` 에 질문을 넣는다. 선택지 수는 질문마다 달라도 되고, 각 선택지 `tags` 에 **서로 다른 축**의 성향 id 2개. 12개 축 조합이 고르게 나오도록 배치하면 축이 독립적으로 갈린다.
3. `characters.json` 의 `characters[]` 에 캐릭터를 넣고 `requiredTraits` 에 축마다 하나씩(3개) 준다. 세 성향 점수 합이 최대인 캐릭터 = 축별 다수결이므로 2×2×2 = 8종이 된다.
   - `imageUrl` 이 `null` 이면 결과 화면은 `emoji` 타일을 보여준다. 이미지는 `public/chuseok/characters/` 에 넣고 경로만 채우면 된다.
   - `fallbackCharacterId` 는 매칭 실패 시 보여줄 캐릭터 (`requiredTraits: []`).
4. 분포를 확인한다:

```bash
npm run simulate:chuseok
```

캐릭터 비중이 대략 5~20% 안에 들면 OK. 치우치면 출력 끝의 "태그 쌍 동시 출현" 표를 보고 적게 나온 축 조합에 선택지를 재배치한다.

매칭 규칙 (`lib/chuseok/scoring.ts`): 선택한 태그를 집계 → 캐릭터별 `requiredTraits` 점수 합(affinity)이 가장 높은 캐릭터 → 동점이면 상위 3 성향과의 겹침 → 답변 조합 해시 → priority → id. 같은 답변은 항상 같은 캐릭터.

### 운영 기간 (선택)

| Key | 의미 |
| --- | --- |
| `CHUSEOK_DRAW_OPENS_AT` | 이 시각 전에는 응모 불가 (ISO 8601, 예 `2026-09-21T00:00:00+09:00`) |
| `CHUSEOK_DRAW_CLOSES_AT` | 이 시각 후에는 응모 불가 |
| `CHUSEOK_TEST_CLOSED` | `true` 면 테스트 시작 차단 (결과 재확인은 가능) |

비우면 항상 열려 있다.

### 정책

- 테스트는 여러 번 가능. 결과 URL 은 `/chuseok/result/<sessionId>`.
- 럭키드로우는 **이메일 1인 1응모 + 세션 1응모** (DB unique). 응모 데이터에는 최초 응모 시점의 캐릭터가 남는다.
- 이메일은 형식만 검증하고 도메인 제한은 없다 (사외 메일을 쓰는 직원 참여 허용).
- 추첨은 `/admin/chuseok` 에서 상품 등급별로 실행. `crypto.getRandomValues` 비복원 추출. 이미 당첨된 사람·수동 제외자는 풀에서 빠진다.

## 로컬 개발

### 1. 의존성 설치

```bash
pnpm install      # 또는 npm install / yarn
```

### 2. Supabase 프로젝트 준비

1. https://supabase.com 에서 새 프로젝트 생성
2. SQL Editor 열고 `supabase/schema.sql` 전체 붙여넣기 → Run, 이어서 `supabase/chuseok_schema.sql` 도 Run
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
npx wrangler pages deploy ./dist --project-name=juniorboard
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
wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name juniorboard
wrangler pages secret put ADMIN_PASSWORD            --project-name juniorboard
wrangler pages secret put SESSION_SECRET            --project-name juniorboard
```

### Git 자동 배포 (선택)

Cloudflare Pages → Connect to Git → Build command `pnpm build`, Output `dist`.

## 도메인 / 첫 사용

- 허브: `https://juniorboard.pages.dev/`
- 한가위 이벤트: `https://juniorboard.pages.dev/chuseok`
- Zen Fortune: `https://juniorboard.pages.dev/zen`
- 관리자: `https://juniorboard.pages.dev/admin/login`

> Cloudflare Pages 는 프로젝트 이름 변경을 지원하지 않는다. `juniorboard` 프로젝트를 새로 만들어 배포하고, 기존 `zen-fortune.pages.dev` 는 유지하거나 정리한다.

## 데이터 모델 메모

| 테이블 | 역할 |
| --- | --- |
| `quotes` | 문구. `drink_override_id`로 특정 음료 강제 |
| `drinks` | 랜덤 페어링 풀 |
| `daily_fortunes` | (date, device) 키로 오늘의 운세 캐시 = view log |
| `likes` | (date, device) 키로 하루 1회 좋아요 |
| `quote_stats` | view (총/7일 노출·좋아요) |
| `drink_usage` | view (총/7일 매칭) |
| `chuseok_sessions` | 한가위 테스트 완료 세션 (답변·점수·캐릭터) |
| `chuseok_entries` | 럭키드로우 응모 (이메일·세션 unique, 당첨·제외 상태) |

조회/좋아요 카운터는 별도 테이블 없이 위 두 view에서 집계합니다. 새 분석 차원이 필요해지면 view를 늘리는 방향으로 확장.

## 보안

- 모든 mutation은 CF Pages Functions 안에서 service_role 키로 호출 — 클라이언트에 키가 노출되지 않음.
- RLS는 `enable`만 해두고 정책 미부여 → anon/authenticated로는 어떤 행도 읽거나 쓸 수 없음. service_role만 통과.
- `/admin/**`과 `/api/admin/**`는 미들웨어가 HMAC 서명 쿠키를 검증.
