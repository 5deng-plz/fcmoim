# 01. FC Guppy 단일 팀 API 계약

## 문서 상태

- 실행 순서: 1 / 3
- 작업 등급: `standard`
- 선행 작업: 없음
- 후속 작업: `02_backend_domain_repository_cleanup.md`
- 단일 진실 범위: 제품의 팀 식별 방식, 공개 API, 구형 API 호환 경계

## 목표

- FC Guppy를 서버가 결정하는 유일한 팀으로 고정합니다.
- 팀 생성·팀 탐색·팀 전환 Backend 기능을 제거합니다.
- 클라이언트의 `clubId`를 조회 범위나 권한 판단에 사용하지 않습니다.
- 기존 클라이언트가 보내는 `clubId`와 구형 endpoint는 호환 어댑터에서 장기 수용합니다.

## 비목표

- `clubs` 테이블과 `club_id` FK 제거
- RLS 및 migration history 재작성
- Frontend 컴포넌트, store, UI/UX 또는 Frontend 전용 테스트 수정
- 입단 신청·승인·정지·탈퇴 정책 변경

## 확정 계약

### 팀 식별

- 운영 FC Guppy UUID는 `00000000-0000-0000-0000-000000000001`입니다.
- 서버 전용 `FC_GUPPY_CLUB_ID`를 `src/config/server-team.ts`에서 검증합니다.
- 로컬 wrapper와 테스트는 위 UUID를 기본값으로 주입합니다.
- 운영 runtime에서는 `FC_GUPPY_CLUB_ID` 누락 또는 다른 UUID를 startup 오류로 처리합니다.
- `NEXT_PUBLIC_DEFAULT_CLUB_ID`는 Frontend 호환 표시값일 뿐 권한 근거가 아닙니다.
- 서비스에는 불변 `TeamContext { teamId }`를 주입합니다.

### 정식 API

| Method | Path | 동작 |
|---|---|---|
| GET | `/api/team` | 공개 가능한 FC Guppy 프로필과 공개 경기 요약 반환 |
| GET | `/api/membership/current` | 현재 Auth 사용자의 FC Guppy 가입 상태 반환 |
| GET | `/api/team/settings` | 승인된 admin/operator에게 팀 설정 반환 |
| PATCH | `/api/team/settings` | 승인된 admin/operator가 설명 등 비시각 설정 수정 |
| POST | `/api/team/logo` | 승인된 admin/operator의 기존 로고 업로드 계약 유지 |

- `GET /api/membership/current`는 `account`, `membership`, `membershipState`를 반환합니다.
- `membershipState`는 `new | pending | approved | rejected | suspended | withdrawn`을 유지합니다.
- 정식 API 요청에는 `clubId`가 없습니다.
- 정식 도메인 응답에는 복수 팀 배열이 없습니다.

### 장기 호환 API

| 기존 Path | 호환 동작 |
|---|---|
| `/api/public/clubs` | FC Guppy 한 건만 담은 배열 반환 |
| `/api/public/clubs/:clubId` | path 값을 무시하고 FC Guppy 반환 |
| `/api/membership/clubs` | 현재 membership이 있으면 한 건, 없으면 빈 배열 반환 |
| `/api/clubs/settings` | 정식 `/api/team/settings`와 동일하게 처리 |
| `/api/clubs/logo` | 정식 `/api/team/logo`와 동일하게 처리 |

- feature API의 query/body `clubId`는 optional로 파싱만 하고 즉시 폐기합니다.
- 호환 응답에 필요한 `clubId`는 항상 서버의 FC Guppy UUID로 생성합니다.
- 호환 처리는 route adapter에만 존재하며 service/repository 입력으로 전달하지 않습니다.

### 제거 API와 코드

- `GET /api/clubs`
- `POST /api/clubs`
- `GET /api/clubs/check-slug`
- `src/services/club-create.ts`
- slug 정규화·중복 검사·소유 팀 개수 제한·팀 생성 RPC 호출 코드
- 팀 생성 API용 unit/integration test

제거 API는 `410` adapter를 남기지 않고 route 자체를 삭제합니다.

## 구현 순서

1. Harness 문서와 현재 diff를 확인하고 `docs/project-context.json`에 허용 경로를 설정합니다.
2. `server-team.ts`와 `TeamContext`를 추가하고 server startup 검증을 작성합니다.
3. 정식 team/current-membership API를 기존 service/repository 위에 먼저 추가합니다.
4. 모든 API route에 공통 호환 parser를 적용해 외부 `clubId`를 폐기합니다.
5. 정식 team settings/logo route를 추가하고 기존 route를 얇은 adapter로 바꿉니다.
6. 팀 생성 API, service, 테스트를 삭제합니다.
7. `docs/README.md`와 `docs/decisions.md`를 단일팀·데스크톱 제품 계약으로 갱신합니다.
8. Backend 계약 테스트와 runtime evidence를 수집합니다.

## Frontend Engineer 전달사항

- `createClub`, `checkClubSlug`, `fetchClubCreationEligibility` 호출과 dead handler를 제거합니다.
- `fetchPublicClubs` 대신 `GET /api/team`을 사용합니다.
- `fetchClubMemberships` 대신 `GET /api/membership/current`를 사용합니다.
- `availableClubs`, `selectedJoinClubId`, `switchClub`, 팀 생성 modal 상태를 제거합니다.
- 입단 신청·대기·승인·정지 화면과 현재 디자인은 유지합니다.
- `tests/frontend-auth-and-schedule-ui.test.tsx`의 다중 클럽·팀 생성 기대값을 새 계약으로 갱신합니다.
- Backend 세션은 위 Frontend 파일을 수정하지 않습니다.

## 테스트

- `clubId` 누락, FC Guppy UUID, 임의 UUID가 모두 FC Guppy만 조회하는 API 계약 테스트
- 임의 UUID가 service/repository 호출 인자에 포함되지 않는 spy 테스트
- 비로그인 공개 team 조회와 로그인 membership 상태 테스트
- member의 설정 변경 거부, admin/operator의 설정 변경 허용 테스트
- 제거한 팀 생성 endpoint가 존재하지 않는 계약 확인

## 검증 명령

```bash
npm run harness:validate
npm run typecheck
npm run db:check
npx vitest run tests/account-membership-service.test.ts tests/club-admin-service.test.ts
npm run harness:guard:standard
```

API/runtime 경로 변경이므로 `npm run dev`와 인앱 브라우저 첫 화면, browser console,
server log를 확인합니다. Frontend 기존 실패는 별도 blocker로 기록하며 필수 guard가 실패하면
완료 처리하지 않습니다.

## 완료 기준

- 서버 `TeamContext`만 팀 범위와 권한을 결정합니다.
- 팀 생성 endpoint/service와 관련 Backend 테스트가 제거되었습니다.
- 정식 API와 호환 API가 위 표의 응답 계약을 만족합니다.
- service/repository가 클라이언트 `clubId`를 받지 않습니다.
- 계획된 Backend 테스트와 필수 Harness/runtime gate가 통과합니다.
- Frontend 전달사항이 최종 보고에 파일·상태·호출 단위로 포함됩니다.
- `docs/project-context.json` evidence가 실제 결과와 일치합니다.
- 관련 변경만 한글 커밋으로 남고 이번 작업의 미커밋 변경이 없습니다.

## 중단 조건

- FC Guppy 운영 UUID가 환경별로 다름
- 구형 `clubId`가 실제로 다른 운영 팀 접근에 필요함
- 필수 Harness gate 또는 runtime smoke 실패
- Frontend 변경 없이는 Backend 계약 검증 자체가 불가능함

중단 시 완료로 표시하지 않고 재현 명령, 원인, 남은 담당 팀을 보고합니다.
