# Agent Feedback

이 문서는 에러 로그 일기장이 아니라 반복 실패를 줄이기 위한 상위 원칙만 둡니다. 새 항목은 특정 사건의 세부 증상이 아니라 앞으로의 작업 판단을 바꾸는 규칙이어야 합니다.

## Principles

- Runtime truth first without browser by default: 재현 가능한 문제는 사용자의 재확인에만 기대지 말고 로컬 서버, API, DB, 결정적 테스트로 확인합니다. 인앱 브라우저 또는 Browser tooling은 현재 턴에서 사용자가 명시적으로 브라우저 QA, 스크린샷, 직접 브라우저 조작을 요청한 경우에만 사용합니다.
- Browser smoke for runtime entrypoints: Auth/session/API bootstrap, app entrypoint, package/runtime config를 바꿀 때는 `npm run dev`를 직접 띄우고 인앱 브라우저 첫 화면과 서버 콘솔을 evidence로 남깁니다.
- Treat stale browser auth as runtime risk: Local Supabase reset 이후 브라우저에 남은 cookie/localStorage/sessionStorage 인증 상태는 별도 실패 경로로 검증합니다.
- Name the gates honestly: "하네스 통과"라고 보고할 때 `harness:guard:verify`, `verify:db:local`, browser smoke 중 무엇이 포함되었고 빠졌는지 명시합니다.
- Preserve existing entrypoints: 새 안전 경로나 래퍼를 추가해도 사용자가 이미 쓰는 기본 명령과 흐름을 깨지 않습니다.
- Respect configured truth: 사용자 설정, `.env.local`, DB 상태, 실제 런타임 값을 기본값이나 추정보다 우선합니다.
- Verify the real path: seed, mock, 타입 통과만 믿지 말고 실제 로그인/API/UI 성공 및 실패 경로 중 영향을 받은 경로를 확인합니다.
- Local DB over mocks: API/Auth/Data 동작의 완료 증거는 mock이 아니라 로컬 Supabase DB/Auth/API 결과여야 합니다.
- Fix UX, do not hide failures: 사용자 입력 오류는 명확한 제품 메시지로 처리하고, 자동 우회나 비밀값 노출로 덮지 않습니다.
- Keep feedback durable and small: 같은 종류의 실수가 반복될 때만 이 문서를 갱신하고, 항목은 일반화된 원칙으로 합칩니다.
- Root cause over bypass: 트러블슈팅은 즉석 우회보다 원인 확인, 클린 아키텍처 경계에 맞는 수정, 회귀 검증을 우선합니다.
- Preserve external assets exactly: 사용자가 외부 asset URL을 명시하면 원본을 그대로 가져오거나 차단 사유를 보고하며, 임의 재제작/변형으로 대체하지 않습니다.
- Split long docs: 반복해서 읽는 하네스 기준 문서는 200줄을 넘기지 않고, 길어지면 요약/분리/참조 구조로 바꿉니다.
- Korean for plans and commits: 사용자가 리뷰하는 구현 계획서(implementation_plan.md) 및 Git 커밋 메시지는 한글(Korean)로 작성합니다.
- Keep harness durable: 하네스에는 장기 유지할 변경 경계, 공유 토큰/컴포넌트, 접근성 계약만 고정합니다. 특정 화면의 최신 기획 디테일은 작업별 테스트와 evidence로 검증하고, 이후 변경을 막는 고정 규칙으로 승격하지 않습니다.
- Do not encode volatile specs in harness: 색상, 아이콘, 문구, 배치, 특정 URL처럼 현재 기획/리뷰 코멘트에 종속된 UI 세부사항은 사용자가 명시적으로 영구 정책화를 요청하지 않는 한 하네스 규칙이나 semantic slot에 추가하지 않습니다.
- Reusable harness feedback only: 특정 기능 구현에서 유효한 코드 패턴을 하네스 개선으로 승격하지 않습니다. 여러 프로젝트와 Agent 작업에 재사용 가능한 판단 기준으로 일반화되는 실패만 기록합니다.
- Strict branch and worktree scoping: 작업 세션이 시작될 때 항상 현재 Git 브랜치 상태를 확인합니다. 사용자의 명시적인 요청이 없는 한 `main` 브랜치에 직접 커밋하거나 푸시하지 않으며, 반드시 `agent/<role>/<task>` 규격 브랜치를 생성하여 작업하고 Git worktree를 사용해 격리를 보장합니다.

