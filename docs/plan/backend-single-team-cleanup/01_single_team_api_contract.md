# 01. 단일 출시·Multi-Club Ready API 계약 보정

## 문서 상태

- 실행 순서: 1 / 3
- 작업 등급: `full`
- 적용 방식: 기존 Phase 1 커밋을 되돌리지 않고 forward 보정
- 후속 작업: `02_backend_domain_repository_cleanup.md`
- 단일 진실 범위: 제품 모드, TeamContext 해석, club API 노출 경계

## 목표

- 최초 출시는 FC Guppy 한 팀만 노출합니다.
- DB와 Backend 내부 계약은 향후 여러 club을 안전하게 수용합니다.
- `MULTI_CLUB_ENABLED=false`에서는 생성·탐색·전환 API를 404로 숨깁니다.
- 외부 `clubId`는 검증 전에는 데이터 범위나 권한 근거로 사용하지 않습니다.

## 비목표

- Frontend, store, UI/UX 또는 Frontend 전용 테스트 변경
- DB singleton constraint 추가
- JWT active-club claim 도입
- production migration history 변경

## 확정 계약

### 제품 모드

- `MULTI_CLUB_ENABLED`는 서버 전용이며 문자열 `true`일 때만 활성화됩니다.
- 누락, 빈 값, `false`는 모두 single mode입니다.
- single mode의 고정 team은 `FC_GUPPY_CLUB_ID`이며 production에서 필수입니다.
- flag가 비활성화된 multi-club endpoint는 인증 여부와 무관하게 404입니다.

### TeamContext

- 도메인 service에는 검증 완료된 `TeamContext { teamId }`만 주입합니다.
- `FixedTeamContextProvider`는 요청 ID를 무시하고 FC Guppy를 반환합니다.
- `MembershipTeamContextProvider`는 다음 중 하나를 만족할 때만 요청 team을 반환합니다.
  - 공개 조회: `clubs.is_public = true`
  - 회원 기능: 현재 account의 approved membership 존재
- 누락 team ID는 400, 접근 불가능 team은 정보 노출을 막기 위해 404입니다.

### API

- `/api/team`, `/api/membership/current`의 single mode 응답은 기존 계약을 유지합니다.
- `/api/public/clubs`와 `/api/public/clubs/:clubId`는 single mode에서 FC Guppy만 반환합니다.
- multi mode에서는 route의 후보 ID를 resolver로 전달하고 검증된 context만 service에 주입합니다.
- `POST /api/clubs`, `GET /api/clubs`, `GET /api/clubs/check-slug`는 flag 뒤에 둡니다.
- club 생성 route는 인증 후 server-only privileged client로 service-role RPC를 호출합니다.
- 일반 클라이언트는 RPC 또는 `clubs` insert/delete 권한을 직접 갖지 않습니다.

## 구현 순서

1. Harness full active work 범위를 Backend·DB·테스트·문서로 제한합니다.
2. feature flag와 두 provider, resolver를 추가합니다.
3. 공개 team과 current membership route에 resolver를 연결합니다.
4. club 생성·eligibility·slug service와 route를 flag 뒤에 복원합니다.
5. single mode 회귀와 multi mode 승인/거부 계약 테스트를 추가합니다.
6. Frontend handoff에는 향후 flag 활성화 전 필요한 작업만 기록합니다.

## 테스트

- flag 기본값과 `false`가 multi-club endpoint를 404 처리
- single mode가 임의 UUID를 무시하고 FC Guppy 반환
- multi mode의 공개 team 허용과 private team 거부
- approved membership 허용, 비회원·pending membership 거부
- team ID 누락 400
- 일반 role의 직접 RPC 및 club insert 거부

## 검증

```bash
npm run typecheck
npx vitest run tests/server-team.test.ts tests/single-team-api-contract.test.ts
npm run verify:db:local
npm run harness:guard:full
```

runtime 변경이므로 유지 중인 `npm run dev`에서 첫 화면, browser console과 server log를 확인합니다.

## 완료 기준

- single mode의 기존 API 응답과 권한이 변하지 않습니다.
- multi mode context는 공개 상태 또는 approved membership으로 검증됩니다.
- flag 비활성 시 생성·탐색·전환 Backend surface가 노출되지 않습니다.
- 클라이언트 입력 ID가 repository에 직접 전달되지 않습니다.
- Frontend 파일을 수정하지 않고 관련 테스트와 full gate가 통과합니다.
- 관련 변경만 한글 커밋으로 남습니다.

## 중단 조건

- production FC Guppy UUID 불일치
- 검증되지 않은 요청 ID가 service/repository 범위에 사용됨
- flag 비활성 상태에서 multi-club endpoint가 404 외 응답
- Local Supabase 또는 필수 runtime evidence 실패
