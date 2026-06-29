# 02. Multi-Club Ready Domain·Repository 경계 보정

## 문서 상태

- 실행 순서: 2 / 3
- 작업 등급: `full`
- 선행 작업: Phase 1 보정 커밋과 필수 gate 통과
- 적용 방식: 기존 Phase 2 커밋을 되돌리지 않고 forward 보정
- 후속 작업: `03_database_singleton_and_migration_squash.md`
- 단일 진실 범위: service context, repository tenant 범위, 격리 fixture

## 목표

- 현재 단일팀 API를 유지하면서 service/repository를 특정 UUID에서 분리합니다.
- 모든 팀 범위 동작은 검증된 `TeamContext`를 사용합니다.
- 동일 사용자가 여러 club membership을 가져도 데이터와 권한이 club별로 격리되게 합니다.
- 팀 생성·공개 조회에 필요한 최소 Backend port만 유지합니다.

## 비목표

- 복수 팀 선택 UI 또는 Frontend 상태 복원
- 도메인 feature 메서드에 임의 `clubId` 재도입
- FC Orca/Lynx 같은 상시 demo seed 복원
- repository 모듈 재통합

## 목표 아키텍처

### Provider

- `TeamContextProvider.resolve(request)`가 공통 인터페이스입니다.
- fixed provider와 membership provider는 동일한 `TeamContext`를 반환합니다.
- Supabase authorizer는 공개 club 여부와 approved membership만 조회합니다.
- FC Guppy 상수는 fixed provider와 canonical launch data에만 존재합니다.

### Service

- 팀 범위 service factory는 `createXService(repositories, teamContext)`를 유지합니다.
- 공개 feature 메서드는 `clubId`를 받지 않습니다.
- resource ID를 받는 동작은 해당 resource가 context team에 속하는지 repository에서 검증합니다.

### Repository

- 기존 team, membership, schedule, records, community 분리를 유지합니다.
- 모든 team-scoped query와 mutation은 전달된 context ID로 필터링합니다.
- 특정 FC Guppy UUID를 repository에 하드코딩하지 않습니다.
- club 생성 service는 service-role RPC만 호출합니다.

### Seed와 fixture

- canonical seed와 기본 local demo는 FC Guppy 한 팀만 생성합니다.
- multi-club 격리 테스트는 임시 두 번째 club, season, membership을 생성합니다.
- fixture는 service-role로 준비하고 테스트 종료 시 club cascade 삭제로 정리합니다.
- production seed에는 QA 사용자나 두 번째 club을 포함하지 않습니다.

## 구현 순서

1. Phase 1 resolver와 provider 계약 테스트 통과를 확인합니다.
2. Supabase `TeamContextAuthorizer` adapter를 repository 계층에 추가합니다.
3. 공개 team/current membership route가 resolver 결과를 service에 주입하게 합니다.
4. repository 전체에서 FC Guppy UUID 하드코딩과 외부 ID 직접 사용을 검색합니다.
5. 임시 두 번째 club을 사용하는 Local Supabase 격리 테스트를 추가합니다.
6. single mode 기존 API 17개와 multi-club 격리 테스트를 함께 실행합니다.

## 테스트

- service-role 두 번째 club과 종속 row 생성 성공
- 비회원이 두 번째 club의 season/resource를 읽거나 쓰지 못함
- 동일 account에 두 번째 approved membership 추가 후 해당 club만 접근 가능
- FC Guppy membership이 다른 club의 운영 권한을 부여하지 않음
- direct authenticated club insert 거부
- single mode 임의 `clubId` 무시 계약 유지
- 테스트 종료 후 두 번째 club과 종속 데이터 0건

## Frontend Engineer 전달사항

- 현재 UI는 FC Guppy 고정 상태를 유지합니다.
- flag 활성화 전 team 후보 선택과 `clubId` 전달 규격을 연결해야 합니다.
- team 생성/slug 검사/eligibility API는 flag가 켜지기 전까지 404입니다.
- Backend 세션은 Frontend 파일이나 Frontend 전용 테스트를 수정하지 않습니다.

## 검증

```bash
npm run typecheck
npx vitest run tests/backend-single-team-domain-contract.test.ts
npm run verify:db:local
npm run verify:baseline
npm run harness:guard:full
```

## 완료 기준

- repository에 FC Guppy 상수가 없습니다.
- 모든 team-scoped service가 검증된 context를 주입받습니다.
- 두 club을 사용한 실제 RLS 격리 테스트가 통과합니다.
- canonical seed 결과는 FC Guppy 한 팀입니다.
- single mode API 회귀가 없습니다.
- Frontend handoff와 project context evidence가 실제 결과와 일치합니다.
- 관련 변경만 한글 커밋으로 남습니다.

## 중단 조건

- context 없이 team-scoped repository가 호출됨
- 임시 두 번째 club 데이터가 테스트 후 남음
- cross-club read/write 또는 resource ID 우회 성공
- Frontend 수정 없이는 Backend 검증 불가
