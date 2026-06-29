# 03. Multi-Club Ready DB·RLS·Migration Baseline

## 문서 상태

- 실행 순서: 3 / 3
- 작업 등급: `full`
- 선행 작업: Phase 1·2 보정 커밋과 전체 local gate 통과
- 단일 진실 범위: schema/RLS/GRANT, launch data, migration baseline과 원격 history

## 목표

- production은 FC Guppy 한 팀으로 출시합니다.
- schema와 RLS는 두 번째 club을 안전하게 수용합니다.
- 일반 role의 직접 club 생성은 봉인하고 server feature gate와 service-role RPC를 사용합니다.
- 기존 migration을 multi-club 가능한 실행 기준선 하나로 squash합니다.

## 금지 사항

- FC Guppy UUID만 허용하는 CHECK constraint
- 다른 club을 삭제하는 schema migration
- 상수형 `current_team_id()` RLS
- `clubs.slug`, `is_public`, `created_by` 제거
- `club_id` FK 또는 resource 기반 RLS helper 제거
- local 전체 검증 전 production push/history repair

## 목표 Schema

- `clubs`는 여러 행을 허용하며 slug unique와 공개/생성자 metadata를 유지합니다.
- 모든 team-scoped table의 `club_id` FK와 적절한 NOT NULL을 유지합니다.
- 전역 badge 계약이 없으므로 `reward_badges.club_id`는 NOT NULL입니다.
- FC Guppy는 launch data이지만 schema singleton은 아닙니다.

## 목표 RLS·GRANT

- `private.is_member_of_club(target_club_id)`는 해당 club의 approved membership을 검사합니다.
- `private.has_club_role(target_club_id, allowed_roles)`는 해당 club의 approved role을 검사합니다.
- match/poll/comment/feed helper는 resource 관계에서 실제 club을 찾습니다.
- security-definer 함수는 unexposed `private` schema 또는 필요한 RPC에만 두고 `search_path = ''`를 사용합니다.
- 모든 public table은 RLS enabled 상태입니다.
- `anon`과 `authenticated`는 필요한 table privilege만 가지며 `clubs` insert/delete와 생성 RPC execute 권한이 없습니다.
- service_role만 `create_club_with_owner`를 실행할 수 있습니다.
- Storage feed 경로의 첫 segment는 실제 club UUID이며 해당 club membership을 검사합니다.

## Migration Baseline

- `supabase/migrations`에는 실행 가능한 SQL 파일 하나만 둡니다.
- `supabase/stage1_init.sql` 중복 파일은 제거합니다.
- schema-only squash 이후 다음 DML을 baseline에 명시적으로 복원합니다.
  - FC Guppy launch row
  - `club-logos`, `feed-media` bucket
  - trait catalog
  - FC Guppy reward badge catalog
- `supabase/seed.sql`은 로컬 QA seed 역할만 유지합니다.
- contract checker는 migration 1개, 필수 DML, 금지 singleton 객체를 검증합니다.

## 실행 순서

1. local DB에서 multi-club RLS와 일반 role 권한을 검증합니다.
2. `migration squash --local --version <BASELINE_VERSION>`을 실행합니다.
3. 누락 DML과 service-role RPC grant를 baseline에 복원합니다.
4. 빈 local DB reset과 lint/contract/API/Auth/RLS 테스트를 실행합니다.
5. 모든 public table RLS와 GRANT를 SQL로 점검합니다.
6. `verify`, runtime smoke, Harness full을 통과합니다.
7. 그 후에만 linked project identity와 FC Guppy row를 확인합니다.
8. production schema/data 검증 후 baseline을 적용하고 이전 history를 repair합니다.
9. local/remote history가 같은 한 버전인지 확인합니다.
10. linked diff가 비어 있는지 확인합니다.

## 테스트

- baseline 하나로 빈 DB reset 성공
- FC Guppy launch row와 필수 catalog/bucket 존재
- service-role 두 번째 club/season/membership 생성 성공
- 일반 authenticated 직접 club insert 실패
- 비회원 cross-club read/write 실패
- approved membership club별 접근 성공
- resource ID 및 Storage prefix 우회 실패
- 모든 public table RLS enabled
- RPC execute와 table GRANT 최소 권한 확인

## 검증

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

## 완료 기준

- production 데이터는 FC Guppy 한 행이지만 DB는 두 번째 club 삽입을 허용합니다.
- cross-club RLS 격리와 일반 role 생성 봉인이 실제 실패 테스트로 검증됩니다.
- 모든 public table RLS·GRANT 검증이 통과합니다.
- 필수 DML을 포함한 migration baseline이 하나입니다.
- 빈 DB reset, Local Supabase API/Auth, `verify`, runtime, Harness full이 통과합니다.
- local/remote history가 한 버전으로 일치하고 linked diff가 비어 있습니다.
- production 삭제/유지 건수와 migration version을 기록합니다.
- project context evidence, 한글 커밋, 깨끗한 worktree를 확인합니다.

## 즉시 중단 조건

- production project identity 또는 FC Guppy UUID 불일치
- local/remote schema drift를 설명할 수 없음
- baseline에서 bucket/catalog/launch DML 누락
- cross-club 접근 또는 일반 role club 생성 성공
- history repair 전 schema 적용/검증 실패
