# FC Moim 입단신청 온보딩 PRD

## Summary

기존 단일 팀 중심의 "합류하기/가입 신청" 흐름을 팀 탐색, 공개 정보 확인, 선택 팀 입단신청, 라커룸 운영진 심사 흐름으로 재설계한다.

신규 사용자는 로그인 전에도 팀을 확인하고 공개 프로필을 둘러본 뒤 원하는 팀에 입단신청을 제출할 수 있어야 한다. 운영진은 라커룸 탭에서 신청자를 승인 또는 반려한다.

현재 QA에서 확인된 실제 인증 모드 이슈도 선행 수정 범위에 포함한다.

- 신규 카카오 로그인 후 입단신청 폼까지 진입 가능해야 한다.
- `/api/membership` POST의 `409 Failed to create pending membership` 실패를 해결한다.
- `GET /api/membership` 초기 `Failed to bootstrap account` 실패를 해결한다.
- 로컬 개발 기본값의 auth bypass가 신규 유저 QA를 왜곡하지 않도록 테스트 실행 조건을 명확히 한다.

## Product Requirements

### 1. 팀 탐색

- 비로그인 사용자도 첫 랜딩에서 팀 목록을 볼 수 있어야 한다.
- 랜딩 CTA는 `팀 둘러보기`, `카카오로 시작하기`를 중심으로 구성한다.
- 팀 카드에는 최소 공개 정보만 표시한다:
  - 팀명
  - 로고 또는 기본 로고
  - 지역/소개 문구
  - 승인 멤버 수
  - 공개 시즌/경기 요약
- 기존 `FC Moim` 고정 문구는 DB 기반 실제 팀 데이터로 대체한다.

### 2. 팀 공개 프로필

- 팀 상세 화면은 비로그인 사용자도 접근 가능해야 한다.
- 공개 정보 범위는 팀명, 로고, 소개, 지역성 문구, 멤버 수, 현재 시즌 요약, 공개 가능한 최근/예정 경기 요약, 공개 공지 또는 운영 메모로 제한한다.
- 개인정보성 데이터는 노출하지 않는다:
  - 개별 멤버 프로필
  - 출석 여부
  - 투표 응답
  - 내부 라인업
  - 미승인 신청자 정보
- 하단 CTA는 `입단신청`으로 통일한다.

### 3. 선택 팀 입단신청

- 입단신청은 반드시 선택된 팀 기준으로 제출된다.
- 비로그인 상태에서 `입단신청`을 누르면 카카오 로그인으로 이동하고, 로그인 후 원래 선택한 팀의 입단신청 폼으로 복귀한다.
- 로그인 상태에서 해당 팀 멤버십이 없으면 입단신청 폼을 보여준다.
- 이미 pending이면 승인 대기 화면을 보여준다.
- rejected 또는 suspended이면 차단/반려 상태 화면을 보여준다.
- approved이면 해당 팀 앱 홈으로 진입한다.

### 4. 입단신청 폼 UX

- 사용자-facing UI의 "합류하기", "가입 신청" 표현은 `입단신청`으로 정리한다.
- 폼은 단일 섹션 `프로필`로 단순화한다.
- 항목명 텍스트를 줄이고 lucide/SVG 아이콘 중심으로 구성한다:
  - 이름: `User`
  - 포지션: `Shield` 또는 `MapPin`
  - 키: `Ruler`
  - 몸무게: `Scale`
  - 주발: `Footprints`
  - 출생연월: `Calendar`
- 필수 입력은 이름과 주 포지션만 유지한다.
- 선택 입력은 키, 몸무게, 주발, 출생연월이다.
- 제출 버튼 문구는 `입단신청 보내기`이다.
- 제출 성공 시 `입단신청이 접수되었어요. 운영진 승인을 기다려주세요.`를 표시하고 pending 화면으로 전환한다.

### 5. 운영진 심사

- 운영진 승인/반려는 라커룸 탭에 배치한다.
- admin/operator에게만 `입단 대기` 섹션을 표시한다.
- member, guest, pending 사용자는 볼 수 없다.
- 신청자 카드에는 이름, 주 포지션, 키/몸무게, 주발, 신청일을 표시한다.
- 액션은 `승인`, `반려`만 제공한다.
- 승인/반려 후 목록을 즉시 갱신한다.
- 반려 사유 입력은 MVP에서 제외한다.

## API And Service Contract

- `GET /api/public/clubs`
  - 인증 없이 호출 가능해야 한다.
  - 공개 팀 목록과 집계 정보만 반환한다.
- `GET /api/public/clubs/:clubId`
  - 인증 없이 호출 가능해야 한다.
  - 공개 팀 상세와 공개 집계 데이터만 반환한다.
- `POST /api/membership`
  - 선택된 `clubId`로 pending membership을 생성한다.
  - 클라이언트 제출 identity가 아니라 현재 Supabase server user를 기준으로 authorize한다.
- `GET /api/membership/pending?clubId=...`
  - admin/operator만 접근 가능하다.
  - 라커룸 운영진 UI에서 사용한다.
- `PATCH /api/membership/review`
  - 기존 review 계약을 유지하되 라커룸 심사 UI에서 호출한다.

## Data And RLS Contract

- `clubs` 공개 목록/상세 조회 정책을 명확히 한다.
- 신규 사용자의 `accounts` upsert와 `team_memberships` pending insert가 실제 Supabase Auth 세션에서 성공해야 한다.
- `team_memberships` insert 정책은 다음 조건을 허용해야 한다:
  - 현재 인증 유저가 자신의 `account_id`로 신청한다.
  - 선택한 `club_id`에 신청한다.
  - `role = member`이다.
  - `status = pending`이다.
  - 중복 멤버십이 없다.

## Frontend Contract

- 랜딩/게스트 화면은 팀 탐색 중심으로 재구성한다.
- `GuestDashboard`와 `HomeTab`의 단일 팀 고정 소개 UI를 팀 선택형 공개 프로필 UI와 분리한다.
- `JoinRequestForm`은 `clubId`를 props 또는 store의 `selectedJoinClubId`로 받아야 하며 default club 고정 제출을 금지한다.
- `useAppStore`에는 approved 앱 진입용 `activeClubId`와 입단신청용 `selectedJoinClubId`를 분리한다.
- `Header`의 서브페이지 제목은 `가입 신청`이 아니라 `입단신청`으로 변경한다.
- 라커룸 탭에 운영진 전용 `입단 대기` 섹션을 추가한다.

## Harness Implementation Plan

1. `architect`: 이 PRD와 구현 순서, acceptance criteria를 유지한다.
2. `data`: Supabase RLS/SQL contract와 신규 유저 pending insert 실패를 먼저 수정한다.
3. `backend`: public clubs API, pending list API, membership create/review service contract를 구현한다.
4. `frontend`: 랜딩, 팀 탐색, 공개 프로필, 입단신청 폼, 라커룸 심사 UI를 구현한다.
5. `qa`: `DEV_TEST=true` 이메일 로그인으로 실제 Supabase Auth 세션과 Supabase DB 상태를 검증한다.

실제 신규 유저 QA 시 dev server는 auth bypass를 끄고 `DEV_TEST=true` 이메일 로그인만 사용한다.

```bash
DEV_TEST=true ENABLE_E2E_TEST_AUTH_BYPASS=false npm run dev
```

## Test Plan

### Deterministic

- `npm run verify:baseline`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- DB/RLS 변경 시 `npm run db:check`
- 하네스 handoff 전 `npm run verify`

### Backend And Data

- 비로그인 `GET /api/public/clubs` 성공
- 비로그인 `GET /api/public/clubs/:clubId` 성공
- 공개 API가 개인정보성 멤버 데이터를 반환하지 않음
- 로그인 신규 유저가 `POST /api/membership`으로 pending 신청 생성
- 중복 신청 시 명확한 conflict 메시지 반환
- admin/operator만 pending 목록 조회 가능
- admin/operator만 승인/반려 가능
- member는 승인/반려 API 접근 불가

### UI

- 첫 랜딩에서 팀 둘러보기 가능
- 팀 목록에서 팀 상세로 이동 가능
- 팀 상세에서 `입단신청` CTA 표시
- 비로그인 입단신청 클릭 시 카카오 로그인으로 이동
- 로그인 후 선택 팀 입단신청 폼으로 복귀
- 입단신청 폼이 `프로필` 단일 섹션과 아이콘 중심으로 표시
- 신청 성공 후 pending 화면 표시
- 라커룸 탭에서 운영진만 `입단 대기` 섹션 표시
- 승인/반려 후 pending 목록 갱신
- 기존 승인 멤버의 홈/일정/기록/라커룸 경험 유지

### Manual QA Scenario

1. Supabase에서 `chamggae427@gmail.com` 기존 Auth user와 관련 app data를 삭제한다.
2. dev server를 auth bypass OFF로 실행한다.
3. 랜딩 접속
4. 팀 둘러보기에서 `FC Guppy` 확인
5. 공개 팀 상세 확인
6. `입단신청` 클릭
7. 카카오 간편로그인 계정으로 로그인
8. 입단신청 폼 작성
9. 제출
10. DB에서 `team_memberships.status = pending` 확인
11. 운영진 계정으로 로그인
12. 라커룸 `입단 대기`에서 신청자 승인
13. 신규 유저 재접속 후 approved 앱 홈 진입 확인

## Assumptions

- 공개 팀 탐색은 비로그인 사용자에게 허용한다.
- 운영진 심사는 라커룸 탭에 배치한다.
- MVP에서는 반려 사유 입력, 팀 생성 기능, 팀 검색/필터, 초대코드, 비공개 팀 정책은 제외한다.
- 공개 정보는 팀 단위 집계와 소개 정보로 제한한다.
- `입단신청`은 기존 `team_memberships` pending/approved/rejected/suspended 모델을 유지하며 확장한다.
- 현재 QA에서 발견된 RLS/API 실패는 이 PRD 구현의 선행 필수 수정으로 본다.
