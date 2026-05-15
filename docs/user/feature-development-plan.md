# FC Moim 빠른 개발/배포 우선 기능 반영 계획

## Summary
- 목표는 리뷰에서 제외한 고위험 기능을 빼고, 빠르게 구현/배포 가능한 UI/UX 개선과 중간 난이도 기능 3개를 단계적으로 반영하는 것입니다.
- 개발 순서는 `홈/입력 UX → 라커룸/스탯 → 라인업 → 시즌/명예의 전당 → 모바일 제스처/테마` 순서로 진행합니다.
- 계획서 작성 작업은 `architect` 소유의 `docs/**` 변경으로 처리하고, 기존 [feature-proposals.md](/Users/5deng/work/fcmoim/docs/feature-proposals.md)는 구현 시작 전 `docs/user/feature-proposals.md`로 이동합니다.
- 제외 범위: 투표 자동 마감/푸시 리마인드, 세분화 권한 재설계, 회비/페널티, MOM 보상 정책, 스토리 공유 이미지, AI 매치 리포트.

## Phase 0: 문서 정리 및 실행 기준
- `docs/user/` 디렉터리를 만들고 기존 `docs/feature-proposals.md`를 `docs/user/feature-proposals.md`로 이동합니다.
- 새 계획서는 `docs/feature-development-plan.md`에 작성합니다.
- 계획서에는 이 문서의 Phase 구조, 제외 범위, agent ownership, 검증 명령, 런타임 증거 요구사항을 포함합니다.
- 변경 소유자: `architect`.
- 검증: 문서 이동 후 `npm run harness:validate-project`를 실행하고, 필요 시 `npm run harness:guard:diff`로 docs 범위만 변경됐는지 확인합니다.

## Phase 1: 홈 대시보드와 입력 UX 빠른 개선
- 홈 화면을 위젯형 대시보드로 정리합니다: 다음 일정 D-day, 내 출석률, 진행 중 투표, 현재 시즌 요약을 작은 카드 단위로 표시합니다.
- 기존 데이터 흐름을 우선 재사용합니다: `useScheduleStore.upcomingMatches`, `useScheduleStore.activePolls`, `SeasonStats`, `UpcomingMatch`, `RecentNotice`.
- 참석/투표/댓글/취소 등 기존 모달성 입력은 모바일 바텀시트 컴포넌트로 전환 가능한 공통 UI를 추가합니다.
- API나 DB 변경 없이 프론트 상태와 기존 엔드포인트만 사용합니다.
- 변경 소유자: `frontend`.
- 검증: `npm run lint`, `npm run typecheck`, 관련 컴포넌트 테스트 추가/수정, Browser Use로 모바일 폭 홈/투표/모달 입력 확인.

## Phase 2: 라커룸 선수 카드와 스탯 시각화
- `LockerProfile`을 디지털 선수 카드 느낌으로 개선합니다: 사진, 이름, 포지션, 신체 정보, OVR, Match Points, 장착 배지 영역을 더 선명하게 배치합니다.
- `HexagonRadar`와 `SeasonStats`를 재사용해 개인 능력치/시즌 기록을 시각화합니다.
- `LockerRoomTab`의 빈 스쿼드 영역은 실제 멤버 데이터 연동 전까지 현재 로그인 멤버 카드 중심으로 구성하고, 없는 값은 프로젝트 규칙대로 `null`/빈 상태를 유지합니다.
- 축하 애니메이션은 사진 업로드 성공, 카드 업데이트, 전술 공개 완료 같은 클라이언트 이벤트에만 제한해서 적용합니다. 포인트/OVR 자동 보상은 구현하지 않습니다.
- 변경 소유자: `frontend`.
- 검증: `npm run lint`, `npm run typecheck`, 카드/레이더 렌더링 테스트, Browser Use로 모바일/데스크톱 레이아웃과 텍스트 넘침 확인.

## Phase 3: 라인업 보드 저장과 공유
- 기존 `TacticsDragBuilder`와 `@dnd-kit` 기반을 유지하되, 빈 `initialPlayers` 대신 참석자 또는 승인 멤버 데이터를 주입할 수 있는 인터페이스를 정리합니다.
- 라인업 확정 시 `matches.tactics_completed`와 `match_teams` 테이블을 기준으로 저장/조회하는 API를 추가합니다.
- 공유는 외부 SNS 공유가 아니라 앱 내부 공개로 한정합니다: 운영진이 확정하면 멤버가 라커룸/일정 화면에서 Red/Blue 팀 편성을 읽을 수 있습니다.
- 권한은 기존 `admin | operator`만 라인업 수정/확정 가능, `member`는 확정된 라인업 읽기만 가능으로 유지합니다.
- 변경 소유자: `frontend` for UI/store, `backend` for API/service/types, `data` only if existing SQL contract lacks required save/read behavior.
- 검증: `npm run verify:baseline`, API 테스트, 필요한 경우 `npm run db:check`, Browser Use로 드래그/확정/읽기 화면 확인.

## Phase 4: 시즌제와 명예의 전당
- 기존 `seasons`, `matches`, `player_stats`, `team_memberships` 데이터를 기반으로 시즌 기록 화면을 채웁니다.
- `RecordsTab`에 현재 시즌 요약, 선수 랭킹, 명예의 전당 섹션을 추가합니다.
- v1 정책은 단순화합니다: 시즌 기록은 현재 DB 집계 결과를 보여주고, “시즌 종료 시 스냅샷 고정”은 이번 범위에서 제외합니다.
- 명예의 전당은 최다 출장, 득점왕, 도움왕, 최고 OVR 또는 최고 승점처럼 기존 데이터로 계산 가능한 항목만 표시합니다.
- 변경 소유자: `frontend` for records UI, `backend` if aggregate API is needed, `data` only if 집계에 필요한 인덱스/뷰가 없어 성능 문제가 확인될 때.
- 검증: 집계 유닛 테스트, 빈 시즌/경기 없는 시즌/동률 랭킹 시나리오, Browser Use로 Records 탭 확인.

## Phase 5: 모바일 제스처와 다크 모드
- Pull-to-refresh는 홈/일정/기록 화면에서 기존 store reload 함수만 호출하도록 구현합니다.
- Swipe 액션은 낮은 위험 화면부터 적용합니다: 투표 옵션 선택 또는 탭 내부 카드 액션에 한정하고, destructive action에는 확인 UI를 유지합니다.
- 다크 모드는 Tailwind/global CSS 기준으로 토큰을 정리하고, 카드/바텀내비/모달/바텀시트/선수 카드/라인업 보드가 모두 읽히도록 조정합니다.
- 제스처는 모바일 PWA 감성 개선 목적이며, 새 서버 기능이나 알림 자동화와 연결하지 않습니다.
- 변경 소유자: `frontend`.
- 검증: `npm run lint`, `npm run typecheck`, Browser Use로 iPhone급 폭과 데스크톱 폭에서 pull/swipe/dark mode 확인.

## Agentic Development Context
- 프로젝트 방향: Next.js App Router, Supabase Auth/Postgres/RLS, Firebase App Hosting, FCM 준비 상태.
- 주요 기존 파일:
  - 홈/대시보드: `src/components/tabs/HomeTab.tsx`, `src/components/features/UpcomingMatch.tsx`, `src/components/features/SeasonStats.tsx`, `src/components/features/RecentNotice.tsx`
  - 라커룸/스탯: `src/components/features/LockerProfile.tsx`, `src/components/tabs/LockerRoomTab.tsx`, `src/components/features/HexagonRadar.tsx`
  - 라인업: `src/components/features/TacticsDragBuilder.tsx`, `src/stores/matchClient.ts`, `src/services/matches.ts`
  - 기록/시즌: `src/components/tabs/RecordsTab.tsx`, `supabase/stage1_init.sql`
- Ownership:
  - `architect`: `docs/**`
  - `frontend`: `src/app/**`, `src/components/**`, `src/stores/**`, `tests/**`
  - `backend`: `src/app/api/**`, `src/lib/**`, `src/services/**`, `src/types/**`, `tests/**`
  - `data`: `supabase/**`, generated DB types, DB decisions
- Quality gates:
  - Baseline before code changes when practical: `npm run verify:baseline`
  - Full handoff-sized verification: `npm run verify`
  - DB changes: `npm run db:check`
  - Runtime UI changes require Browser Use evidence.
  - Review Agent must report no blockers before completion.
- Product constraints:
  - Server routes authorize through current Supabase server user, not client-submitted identity.
  - UI role/status is not production authorization.
  - Unknown real profile values stay `null`; do not invent defaults.
  - Schedule creation and schedule poll creation remain separate.
  - Home may show active poll participation; Schedule remains operator creation/management surface.
