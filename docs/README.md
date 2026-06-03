# FC Moim 프로젝트 노트

## 개요

FC Moim은 축구·풋살 클럽 운영을 위한 모바일 우선 웹앱입니다. 현재 목표는 기존 프로토타입을 실제 회원 운영 제품으로 전환하는 것입니다. 제품 계약, 인증, 데이터 접근, 권한, 배포, 검증 체계를 함께 안정화합니다.

## 제품 범위

- 회원 가입, 가입 신청, 승인 대기, 승인 완료, 차단 상태 관리
- 계정 식별과 클럽 멤버십 상태 관리
- 클럽 일정, 참석, 일정 투표, 운영자용 일정 관리
- 경기 기록과 선수 통계
- 공지와 회원 커뮤니케이션
- 회원용 라커룸과 게임화 개념
- 모바일 우선 PWA 경험

## 현재 방향

| 영역 | 방향 |
|---|---|
| 프론트엔드 | Next.js App Router |
| 인증 | Supabase Auth, 이메일/Google/Kakao 로그인 |
| 데이터 | Supabase Postgres와 RLS |
| 배포 | Firebase App Hosting |
| 푸시 | Firebase Cloud Messaging |
| 검증 | Harness guard, Vitest, Testing Library, Local Supabase CLI |

## 제품 규칙

- 로그인 UI는 이메일, Google, Kakao 선택지를 노출합니다. 로컬 QA는 Supabase 이메일/비밀번호를 우선 사용합니다.
- Google 로그인 버튼은 표준 Google G 마크 기반의 흰색 테두리 버튼을 사용합니다.
- 비로그인 사용자는 팀 둘러보기를 할 수 있고, 헤더 로고를 눌러 로그인 화면으로 돌아갈 수 있습니다.
- 계정 식별과 클럽 멤버십은 분리합니다.
- 클럽별 역할, 승인 상태, 프로필, OVR, 포인트는 멤버십 데이터에 속합니다.
- 서버 라우트는 클라이언트가 보낸 식별자 필드가 아니라 현재 Supabase 서버 사용자로 권한을 확인해야 합니다.
- 실제 프로필 값을 모르면 `null`로 유지합니다. 임의 기본값을 만들지 않습니다.
- UI 상태와 서버 상태는 분리합니다. 클라이언트의 역할 또는 상태 값은 운영 권한의 근거가 아닙니다.
- 일정 생성과 일정 투표 생성은 별도 흐름입니다.
- Home은 활성 투표 참여를 보여줄 수 있고, Schedule은 운영자의 생성·관리 화면으로 유지합니다.

## 런타임 기준

- Firebase App Hosting, Supabase Postgres, Kakao OAuth, Google OAuth, 비밀 환경 변수 설정을 기준으로 운영합니다.
- `src/config/app.config.ts`는 `local`과 `prod` 프로필을 지원하고, localhost와 hosted Supabase 설정이 섞이면 런타임에서 차단합니다.
- `npm run dev`와 `npm run dev:local`은 로컬 Supabase 환경 변수를 주입해 실행합니다.
- API/Auth/Data 런타임 증적은 mock이 아니라 Local Supabase 스택에서 수집합니다.
- Local Supabase 검증에는 Supabase CLI와 Docker 호환 런타임이 필요합니다.

## 문서

- `AGENT.md`: 저장소 루트의 Harness 세션 가이드
- `docs/README.md`: 프로젝트 개요, 제품 범위, 현재 운영 기준
- `docs/agent-rules.json`: Agent 소유권, 명령 맵, surface 분류, evidence 정책
- `docs/agent-feedback.md`: 반복 실패와 예방 규칙
- `docs/decisions.md`: 장기 유지할 의사결정 로그
- `docs/design-tokens.md`: 허용 UI 색상 토큰과 디자인 guard 정책
- `docs/project-context.json`: Agent 복구용 현재 작업 상태
- `docs/user/design-harness-workflow.md`: 디자인 하네스 철학, workflow, gate, evidence, review 기준

## Agent 작업 흐름

1. `AGENT.md`를 읽습니다.
2. `docs/agent-rules.json`, `docs/agent-feedback.md`, `docs/project-context.json`을 확인합니다.
3. 필요한 경우 `.agents/manifest.json`, `.agents/contracts/agent-contracts.json`, 관련 role prompt를 확인합니다.
4. 디자인 또는 UI 작업이면 `docs/design-tokens.md`와 `docs/user/design-harness-workflow.md`를 함께 확인합니다.
5. 아키텍처, 데이터, 인증, 배포, 품질 gate를 바꾸기 전에는 `docs/decisions.md`를 확인합니다.
6. 예상 변경 파일이 현재 작업의 `allowedPaths`와 Agent 소유 범위에 들어가는지 확인합니다.
7. 가능하면 변경 전에 baseline을 실행합니다.
8. 한 번에 하나의 좁은 작업을 구현하고, 관련 runtime surface의 evidence를 수집합니다.
9. Verifier 기준으로 diff, design rule, evidence를 자체 점검합니다.
10. Orchestrator만 `docs/project-context.json`의 완료 상태를 갱신합니다.

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local
npm run lint
npm run dev
```

로컬 Supabase가 필요한 작업은 한 번 스택을 시작한 뒤 검증합니다.

```bash
npm run db:local:start
npm run verify:db:local
```

## 검증

```bash
npm run harness:validate
npm run verify:baseline
npm run db:check
npm run verify:db:local
npm run harness:guard:verify
npm run verify
```

- `harness:validate`는 재사용 가능한 Harness 구조와 purity만 확인합니다. 앱 품질이나 릴리스 준비 상태를 의미하지 않습니다.
- `verify:baseline`은 Harness validation, lint, typecheck, Vitest 테스트를 실행합니다.
- `db:check`는 추적 중인 Supabase SQL 계약을 확인합니다.
- `verify:db:local`은 Local Supabase를 reset하고, QA Auth 사용자와 데모 데이터를 seed한 뒤 API 통합 테스트를 실행합니다.
- `harness:guard:verify`는 기본 완료 gate입니다. Harness validation, design guard, diff ownership, lint, typecheck, tests, SQL contract check를 포함합니다.
- `verify`는 전체 로컬 gate입니다. `verify:baseline`, `db:check`, `verify:db:local`을 포함하며 API/Auth/Data/Supabase 변경, 릴리스 준비, 명시적 전체 검증에 사용합니다.

문서만 바꾸는 작은 작업은 보통 `npm run harness:validate`로 구조 검증을 끝낼 수 있습니다. 런타임이나 하네스 완료 상태를 다루는 작업은 `docs/project-context.json`을 실제 evidence와 맞춘 뒤 마지막에 `npm run harness:guard:verify`를 실행합니다.

## 프로덕션 초기화

프로덕션 초기화 명령은 의도적으로 분리되어 있습니다.

```bash
npm run prod:backup
npm run prod:reset:db
npm run prod:cleanup:auth-storage
npm run prod:verify-empty
```

먼저 `npm run prod:backup`을 실행합니다. 파괴적 명령은 명시적 확인 환경 변수가 있어야 실행됩니다. DB reset은 `FC_PROD_RESET_CONFIRM=DELETE_PRODUCTION_DATA`, Auth/Storage cleanup은 `FC_PROD_CLEANUP_CONFIRM=DELETE_PRODUCTION_DATA`가 필요합니다.

프로덕션 명령은 localhost Supabase URL을 거부해야 하며, 로컬 데모 seed 용도로 사용하지 않습니다.
