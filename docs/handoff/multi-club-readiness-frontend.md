# Multi-Club 활성화 전 Frontend 전달사항

- 현재 UI와 store는 FC Guppy 단일팀 상태를 유지합니다.
- Backend `MULTI_CLUB_ENABLED` 기본값은 `false`이며 생성·slug·eligibility API는 404입니다.
- 향후 flag 활성화 전 Frontend가 team 후보를 선택하고 canonical team/current-membership 요청에 `clubId`를 전달해야 합니다.
- team 생성 UI는 `POST /api/clubs`, slug 검사는 `GET /api/clubs/check-slug`, 생성 가능 여부는 `GET /api/clubs`를 사용합니다.
- 비회원/private team은 Backend가 404로 처리하므로 별도의 존재 여부 추정 UI를 만들지 않습니다.
- 이번 Backend 작업은 Frontend 컴포넌트, store, UI/UX, Frontend 전용 테스트를 변경하지 않습니다.
