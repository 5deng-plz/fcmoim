# Agent Working Agreement

## 공통

- 항상 사용자를 `형님`이라고 호칭합니다.
- 작업 전 `AGENT.md`, `docs/agent-boundaries.md`와 현재 Harness 상태를 읽습니다.
- 작업 시작 시 `npm run agents:handoff:inbox -- --role=<role>`로 다른 Agent branch의 새 handoff를 확인합니다.
- Agent별 Git worktree와 `agent/<role>/<task>` branch를 사용합니다.
- 상대 Agent 소유 영역은 직접 수정하지 않고 ignored `docs/handoff/` 인스턴스에 요청을 남깁니다.
- 변경은 관련 범위로 제한하고 검증 결과와 한글 커밋 SHA를 local handoff에 기록하되 handoff 인스턴스는 commit하지 않습니다.
- `docs/project-context.json`은 Codex 통합 단계에서만 수정합니다.

## Codex 역할

- Backend, API, service/repository, Auth/RLS, Supabase, migration, client protocol transport, Infra, CI/CD와 통합을 담당합니다.
- `src/app/api/**`, `src/config/**`, `src/lib/**`, `src/services/**`, `supabase/**`, `.github/**`, `scripts/**`를 주 소유 영역으로 봅니다.
- `src/components/**`, `src/stores/**`, UI 중심 `src/app/**`, `public/**`, Frontend 전용 테스트를 수정하지 않습니다.
- UI/UX와 visual state 요구사항은 `docs/handoff/`에 전달하되 `src/lib/**`의 client protocol transport는 직접 담당합니다.
- Local Supabase start/reset/seed/migration과 production 작업은 Codex만 수행합니다.
- Agy 커밋을 검토·통합한 뒤 전체 `verify`, runtime smoke와 Harness full을 실행합니다.

## Agy 역할

- Frontend component, visual client state, UI/UX, 디자인, visual asset과 Frontend 테스트를 담당합니다.
- `src/components/**`, `src/stores/**`, UI 중심 `src/app/**`, `public/**`를 주 소유 영역으로 봅니다.
- Backend, Supabase, migration, Infra와 production 설정을 직접 수정하지 않습니다.
- Backend 계약이나 fixture 변경은 `docs/handoff/`로 Codex에 요청합니다.
- Local Supabase를 공유하되 reset, migration, seed 구조 변경 명령을 실행하지 않습니다.
- Antigravity macOS 브라우저 QA는 Chrome DevTools MCP를 사용하며 `open_browser_url`과 Linux 전용 local Chrome mode를 사용하지 않습니다.
- Agy 전용 상세 규칙은 `.agents/rules/agy-frontend-design.md`를 따릅니다.

## 공유 파일

- `package.json`, 공용 type과 일반 문서는 작업 담당 Agent가 수정할 수 있습니다.
- 공유 파일 변경은 handoff의 `sharedFilesTouched`에 반드시 기록합니다.
- 충돌과 최종 상태 파일은 Codex 통합 단계에서 해결합니다.
