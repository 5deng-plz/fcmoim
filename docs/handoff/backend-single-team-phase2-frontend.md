# Backend 단일팀화 2단계 Frontend 전달사항

## 정식 API 타입 변경

- `GET /api/team`
  - 제거: `id`, `slug`
  - 유지: FC Guppy 프로필, 시즌 요약, 최근·예정 경기
- `GET /api/membership/current`
  - `membership.clubId` 제거
  - `membershipState`의 `new | pending | approved | rejected | suspended | withdrawn` 계약은 유지
- 일정·경기·투표·공지·피드 응답
  - 정식 응답의 `clubId` 제거
  - resource ID와 기존 기능 상태는 유지

## 구형 호환 호출

- `/api/public/clubs`, `/api/public/clubs/:clubId`
  - 계속 FC Guppy 한 팀만 반환
  - 호환 DTO의 `id`, `slug`는 route adapter가 추가
- `/api/membership/clubs`
  - 현재 membership이 있으면 FC Guppy 한 건, 없으면 빈 배열 반환
  - 호환 DTO의 `clubId`는 route adapter가 추가
- 요청 query/body의 `clubId`
  - 호환을 위해 수용하지만 Backend 범위·권한 판단에는 사용하지 않음

## 제거 대상 Frontend 상태·호출

- 구형 타입: `PublicClubSummaryRow`, `PublicClubDetailRow`, `ClubMembershipSummaryRow`
- 복수 팀 상태: `availableClubs`, 선택된 club ID, club switch 상태
- 생성 상태: `ownedClubCount`, `canCreate`, club slug 중복 검사 및 생성 handler
- 정식 API 응답의 `clubId`를 store scope로 복사하는 코드

## UI/UX 범위

- 이 Backend 변경은 시각적·상호작용 변경을 요구하지 않습니다.
- 입단 상태 화면과 기존 데스크톱 디자인은 유지합니다.
