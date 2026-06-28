# 03. DB 싱글턴·RLS·Migration Squash

## 문서 상태

- 실행 순서: 3 / 3
- 작업 등급: `full`
- 선행 작업: 1·2단계 완료 커밋과 전체 gate 통과
- 후속 작업: 없음
- 단일 진실 범위: 운영 데이터 정리, schema/RLS, migration 기준선과 원격 history

## 목표

- `clubs`를 FC Guppy 한 행만 허용하는 내부 싱글턴 앵커로 고정합니다.
- FC Guppy 외 데이터와 다중 클럽 DB 기능을 제거합니다.
- RLS를 client `clubId`가 없는 현재팀 membership/role 검사로 단순화합니다.
- 기존 migration을 현재 schema 기준 파일 하나로 스쿼시합니다.

## 확정된 파괴적 결정

- FC Guppy 외 운영 데이터는 별도 backup이나 archive 없이 cascade 삭제합니다.
- `clubs`와 직접 참조 `club_id` FK는 유지합니다.
- 기존 migration SQL은 Git history에만 남기고 실행 경로에서 제거합니다.
- 원격 migration history를 새 기준선 버전 하나로 정리합니다.

## 비목표

- `clubs` 테이블 또는 모든 `club_id` 컬럼 제거
- membership 역할·상태 정책 변경
- Frontend/UI/UX 수정
- 운영 Auth 사용자 일괄 삭제

## 실행 전 필수 조건

- 1·2단계 커밋과 필수 gate가 모두 통과했습니다.
- 관련 worktree가 깨끗합니다.
- `supabase migration list --linked`가 현재 파일과 원격 이력을 보여줍니다.
- 연결된 원격 project가 실제 FC Moim 운영 대상임을 확인했습니다.
- FC Guppy UUID 행이 로컬과 원격에 존재합니다.

조건이 하나라도 거짓이면 DB와 migration history를 변경하지 않습니다.

## 목표 Schema

### `public.clubs`

유지 컬럼:

- `id`, `name`, `description`, `logo_url`, `created_at`, `updated_at`

제거 컬럼:

- `slug`, `is_public`, `created_by`

제약:

- `id = '00000000-0000-0000-0000-000000000001'`
- PK로 두 번째 동일 ID 삽입을 차단합니다.
- `anon`, `authenticated`의 직접 insert/delete 권한을 제거합니다.

### 고정 `club_id`

다음 테이블의 `club_id`는 NOT NULL이며 FC Guppy UUID만 허용합니다.

- `team_memberships`
- `seasons`
- `matches`
- `schedule_polls`
- `announcements`
- `reward_badges`
- `feed_posts`

기존 nullable `reward_badges.club_id`는 NULL을 FC Guppy UUID로 보정한 뒤 NOT NULL로 변경합니다.

## 제거 DB 객체

- `public.create_club_with_owner`
- club slug format/unique 제약과 인덱스
- club 생성·공개 catalog·복수 club 관리 policy
- `private.is_member_of_club(target_club_id)`
- `private.has_club_role(target_club_id, allowed_roles)`
- 외부 club ID를 인자로 받는 membership/target helper

## 목표 RLS Helper

- `private.current_team_id()` → 고정 FC Guppy UUID
- `private.is_current_team_member()` → 현재 Auth 사용자의 approved membership 확인
- `private.has_team_role(allowed_roles)` → 현재팀 approved role 확인
- `private.is_current_membership(target_membership_id)` → 현재 Auth 소유 membership 확인

match, poll, comment, feed helper는 resource 관계를 따라가되 외부 `clubId`를 받지 않습니다.
모든 `public` 테이블은 RLS enabled 상태와 명시적 GRANT/policy를 검증합니다.

## 정리 Migration 순서

1. `npx supabase migration new enforce_fc_guppy_singleton`으로 파일을 생성합니다.
2. FC Guppy 행 존재 여부를 SQL에서 assert하고 없으면 transaction을 실패시킵니다.
3. `clubs.id <> FC_GUPPY_ID` 행을 삭제해 FK cascade로 종속 데이터를 제거합니다.
4. `reward_badges.club_id` NULL을 FC Guppy ID로 보정합니다.
5. 제거 대상 RPC, policy, helper를 drop합니다.
6. `clubs` 불필요 컬럼과 관련 constraint/index를 drop합니다.
7. singleton과 직접 `club_id` check/NOT NULL constraint를 추가합니다.
8. 새 helper와 RLS policy, GRANT를 생성합니다.
9. local reset, DB/API/RLS 검증을 수행합니다.
10. 정리 migration만 원격에 push하고 실제 row count와 정책을 검증합니다.

## Migration Squash 순서

정리 migration의 timestamp를 `CLEANUP_VERSION`으로 기록합니다.

1. `npx supabase migration list --linked` 결과를 저장합니다.
2. `npx supabase migration squash --linked --version "$CLEANUP_VERSION"`을 실행합니다.
3. 생성된 schema-only SQL을 검토합니다.
4. squash가 생략한 DML을 기준선에 idempotent SQL로 복원합니다.
   - FC Guppy singleton 행
   - `club-logos` Storage bucket과 정책
   - 필수 trait/reward catalog 초기값
5. `supabase/seed.sql`은 로컬 QA seed 역할만 유지합니다.
6. 빈 로컬 DB를 reset해 기준선 하나만으로 schema가 생성되는지 확인합니다.
7. 원격에 이미 적용된 `CLEANUP_VERSION`은 재실행하지 않습니다.
8. `CLEANUP_VERSION`보다 오래된 원격 version을 한 번에
   `migration repair --status reverted --linked` 처리합니다.
9. `migration list --linked`에서 local/remote 양쪽에 `CLEANUP_VERSION`만 남았는지 확인합니다.
10. `db diff --linked`가 비어 있는지 확인합니다.

`migration repair`는 schema를 변경하지 않고 history table만 변경합니다. schema 검증이 끝나기
전에 실행하지 않습니다.

## 실행 경로 정리

- 기존 `supabase/migrations/*.sql`은 squashed 기준선 하나만 남깁니다.
- 중복 `supabase/stage1_init.sql`을 삭제합니다.
- `scripts/check-supabase-contract.mjs`를 새 기준선 객체에 맞춥니다.
- package DB 명령이 새 기준선과 canonical seed만 사용하도록 확인합니다.

## 테스트

- DB에 `clubs` 한 행만 존재
- 모든 직접 `club_id`가 FC Guppy UUID
- 두 번째 club, 다른 club ID row, NULL reward badge 삽입 실패
- 비회원 read/write 거부
- member의 운영 변경 거부
- admin/operator의 허용된 변경 성공
- 가입 신청·승인·정지·탈퇴 회귀
- Storage upload/read 정책과 canonical prefix 검증
- 기존 DB 정리 결과와 빈 DB 기준선 schema 동일성

## 검증 명령

```bash
npx supabase migration list --local
npx supabase db lint --local --fail-on error
npm run db:local:reset
npm run db:check
npm run verify:db:local
npm run verify
npm run harness:guard:full
npx supabase migration list --linked
npx supabase db diff --linked
```

DB/API runtime 변경이므로 dev server, 첫 화면, browser console, server log evidence도 남깁니다.

## 완료 기준

- 로컬과 원격 `clubs`가 FC Guppy 한 행입니다.
- FC Guppy 외 club과 종속 데이터가 0건입니다.
- 제거 대상 컬럼·RPC·policy·helper가 존재하지 않습니다.
- 직접 `club_id` 테이블의 singleton constraint가 실제 실패 테스트로 검증되었습니다.
- 모든 public table의 RLS와 GRANT 검증이 통과합니다.
- 실행 가능한 migration 기준선이 하나뿐이며 필수 DML이 포함되었습니다.
- local/remote migration history가 같은 한 버전으로 일치합니다.
- linked schema diff가 비어 있습니다.
- 빈 DB reset, Local Supabase API/Auth 테스트, `verify`, Harness full gate가 통과합니다.
- 원격 삭제 건수와 migration version이 최종 보고에 기록됩니다.
- 관련 변경만 한글 커밋으로 남고 이번 작업의 미커밋 변경이 없습니다.

## 즉시 중단 조건

- FC Guppy singleton 행 부재 또는 UUID 불일치
- migration 정리 전 local/remote schema drift
- 정리 migration 원격 적용 실패
- squash 기준선에서 singleton, Storage 또는 catalog DML 누락
- migration history 불일치 또는 linked diff 발생
- RLS/API/Auth 검증 실패

중단 시 추가 파괴 작업과 history repair를 멈추고 현재 DB 상태, 실행 명령, 영향 범위와
복구 가능한 다음 단계를 보고합니다.
