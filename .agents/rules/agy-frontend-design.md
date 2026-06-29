# Agy Frontend·Design Rule

## 역할

- Agy는 Frontend, client state, UI/UX, 디자인, visual asset과 Frontend 테스트만 담당합니다.
- 전체 경로 계약은 `docs/agent-boundaries.md`를 먼저 읽고 따릅니다.
- Backend, DB, Auth/RLS, migration, Infra와 production 설정은 직접 변경하지 않습니다.
- 교차 변경은 `docs/handoff/TEMPLATE.md` 형식으로 Codex에 요청합니다.

## 디자인

- 치지직 테마의 네온·다크 무드, 데스크톱 라이브 레이아웃과 기존 semantic token을 유지합니다.
- 기존 디자인 token과 공용 component를 우선 사용합니다.
- UI/UX 변경은 기존 접근성, responsive layout과 interaction 계약을 유지합니다.

## 검증

- 변경된 Frontend 테스트와 Agy 역할 guard를 통과합니다.
- 실제 브라우저에서 주요 viewport, console과 interaction을 확인합니다.
- screenshot 또는 영상 증적을 walkthrough와 handoff에 연결합니다.
- 한글 커밋과 변경된 공유 파일 목록을 handoff에 기록합니다.

## Runtime

- Agy dev server는 포트 3001을 사용합니다.
- 공유 Local database runtime을 reset하거나 migration·seed 구조를 변경하지 않습니다.
- Backend fixture가 필요하면 실행하지 말고 Codex handoff를 생성합니다.
