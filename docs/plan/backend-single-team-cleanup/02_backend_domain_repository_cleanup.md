# 02. Backend Domain·Service·Repository 정리

## 문서 상태

- 실행 순서: 2 / 3
- 작업 등급: `full`
- 선행 작업: 1단계 완료 커밋과 필수 gate 통과
- 후속 작업: `03_database_singleton_and_migration_squash.md`
- 단일 진실 범위: Backend 내부 계약, repository 구조, seed와 Backend 테스트 데이터

## 목표

- 호환 API 바깥의 Backend 코드에서 다중 클럽 개념을 제거합니다.
- 모든 도메인 동작이 주입된 FC Guppy `TeamContext`를 사용하게 합니다.
- 비대한 Supabase repository를 도메인 경계로 분리해 Agent 읽기 범위를 축소합니다.
- 로컬 seed와 Backend 통합 테스트를 FC Guppy 한 팀으로 고정합니다.

## 비목표

- `clubs` 또는 `club_id` DB 컬럼 제거
- RLS와 migration history 변경
- 구형 API의 `clubId` 호환 필드 제거
- Frontend 컴포넌트, store, UI/UX 또는 Frontend 전용 테스트 수정

## 선행 확인

다음 조건이 모두 참이어야 시작합니다.

- 1단계 커밋이 현재 branch history에 존재합니다.
- `/api/team`과 `/api/membership/current` 계약 테스트가 통과합니다.
- 팀 생성 API/service가 없습니다.
- 관련 worktree에 이전 단계 미커밋 변경이 없습니다.

조건이 하나라도 거짓이면 구현하지 않습니다.

## 목표 아키텍처

### Service 생성 규칙

모든 팀 범위 service는 다음 형태를 사용합니다.

```ts
createXService(repositories, teamContext)
```

- 공개 service 메서드는 `clubId`를 받지 않습니다.
- `teamContext.teamId`는 factory closure에서만 읽습니다.
- Auth 사용자는 기존처럼 서버 세션에서 읽습니다.
- match, poll, post 등 resource ID는 해당 FC Guppy 소속인지 repository에서 검증합니다.

### Repository 분리

`src/services/supabase-repositories.ts`의 구현을 아래 경계로 분리합니다.

- `repositories/team.ts`: singleton team profile/settings
- `repositories/membership.ts`: account, membership, role, point, trait
- `repositories/schedule.ts`: season, match, attendance, poll, lineup
- `repositories/records.ts`: stats, feedback, MVP, peer rating 집계
- `repositories/community.ts`: announcement, comment, feed, reaction, notification
- `repositories/index.ts`: client와 repository 조합만 담당

파일 간 DB row type을 공유하지 않고 필요한 최소 타입만 각 모듈에 둡니다.

## 타입 계약

### 유지·도입

- `TeamContext { teamId: string }`
- `TeamProfile`
- `CurrentMembership`
- 기존 membership role/status와 경기·일정·기록 도메인 타입

### 제거

- `PublicClubSummaryRow`
- `PublicClubDetailRow`
- `ClubMembershipSummaryRow`
- `ClubCreateInput`, `ClubCreateResult`
- `ownedClubCount`, `canCreate`
- 서비스 반환 모델의 `clubId`

DB row의 `club_id` mapping과 route 호환 DTO의 `clubId`만 예외입니다.

## 제거 Repository 기능

- `listPublic`
- `findPublicDetail`
- `listClubMemberships`
- slug 조회와 중복 검사
- 생성자별 소유 club count
- `create_club_with_owner` 호출
- 외부 입력 `clubId`를 직접 사용하는 find/list/update 메서드

`findByAccountAndClub(accountId, clubId)`는 내부
`findCurrentMembership(accountId, teamContext.teamId)` 구현으로 대체합니다.

## 구현 순서

1. Harness active work와 allowed paths를 2단계 범위로 새로 설정합니다.
2. repository 분리 전에 service별 기존 unit test를 characterization test로 고정합니다.
3. team/membership repository를 먼저 분리하고 current membership 계약을 전환합니다.
4. schedule, records, community 순서로 repository를 분리합니다.
5. 각 service factory에 `TeamContext`를 주입하고 공개 메서드의 `clubId`를 제거합니다.
6. domain type에서 다중 클럽 타입과 `clubId`를 제거합니다.
7. route adapter가 구형 응답에만 canonical `clubId`를 추가하도록 정리합니다.
8. `scripts/seed-local-demo-data.mjs`와 `db:local:seed-demo:legacy`를 제거합니다.
9. `rebuild-local-demo-data.mjs`와 Local Supabase 테스트를 FC Guppy 한 팀으로 축소합니다.
10. 전체 Backend·DB·runtime 검증을 수행합니다.

## Seed·Fixture 계약

- local seed는 FC Guppy singleton, active season, QA membership만 생성합니다.
- FC Orca, FC Lynx UUID·slug·season·membership을 삭제합니다.
- 다중 팀 격리 fixture 대신 임의 외부 `clubId` 무시 계약을 테스트합니다.
- QA 환경 변수 이름과 `QA_LOCAL_ACCOUNT_PASSWORD`는 변경하지 않습니다.
- 운영 seed에는 demo 사용자나 fixture를 추가하지 않습니다.

## Frontend Engineer 전달사항

- 정식 응답에서 사라진 `clubId`와 복수 club 배열 의존 위치를 목록화합니다.
- 구형 adapter를 사용 중인 호출은 `/api/team`, `/api/membership/current`로 전환합니다.
- Backend 세션은 `src/components/**`, `src/stores/**`, Frontend 테스트를 수정하지 않습니다.
- 시각적·상호작용 변경은 요구하지 않습니다.

## 테스트

- membership의 new/pending/approved/rejected/suspended/withdrawn 상태
- admin/operator/member 권한별 관리 API
- 일정·경기·라인업·기록·피드·댓글·알림의 FC Guppy 범위 검증
- 임의 `clubId`가 repository 호출과 결과를 바꾸지 않는 계약
- 다른 team ID로 저장된 resource를 전달했을 때 not-found/forbidden 처리
- repository 분리 전후 응답 동일성
- local reset 후 `clubs`가 FC Guppy 한 건인지 확인

## 검증 명령

```bash
npm run harness:validate
npm run lint
npm run typecheck
npm run db:check
npm run verify:db:local
npm run verify:baseline
npm run harness:guard:full
```

API/service 변경에 대한 dev server, 첫 화면, browser console, server log evidence를 남깁니다.

## 완료 기준

- 호환 route와 DB mapping 외 Backend 공개 계약에 `clubId`가 없습니다.
- 모든 팀 범위 service가 서버 `TeamContext`를 주입받습니다.
- repository가 정의된 5개 도메인 모듈과 composition index로 분리되었습니다.
- 다중 클럽 전용 타입·조회·집계·생성 코드가 없습니다.
- legacy seed 명령과 Orca/Lynx fixture가 없습니다.
- local reset/seed 결과가 FC Guppy 한 팀입니다.
- 권한·기능·임의 ID 보안 테스트와 모든 필수 gate가 통과합니다.
- Frontend 전달사항이 구형 타입·호출·상태 단위로 작성되었습니다.
- 관련 변경만 한글 커밋으로 남고 이번 작업의 미커밋 변경이 없습니다.

## 중단 조건

- 1단계가 완료되지 않음
- repository 분리 전후 API 동작이 달라짐
- Local Supabase 또는 필수 runtime evidence를 수집할 수 없음
- Frontend 파일 수정 없이는 Backend 빌드가 불가능함
- Harness full gate 실패

중단 시 완료로 표시하지 않고 실패 명령, 원인, 영향 surface와 다음 담당자를 보고합니다.
