# Codex·Agy 역할과 공유 환경

## 목적

Codex와 Agy가 같은 저장소를 병렬 작업하되 경로, runtime, 커밋과 상태 파일 충돌을 방지합니다.

## 역할

| 영역 | Codex | Agy |
|---|---|---|
| Backend API·service·repository | 소유 | handoff 요청 |
| Auth·RLS·DB·migration | 소유 | 변경 금지 |
| Infra·CI/CD·배포 | 소유 | 변경 금지 |
| Frontend component·store | handoff 요청 | 소유 |
| UI/UX·디자인·asset | 변경 금지 | 소유 |
| Backend 테스트 | 소유 | 변경 금지 |
| Frontend 테스트·브라우저 QA | 비소유 | 소유 |
| 최종 통합·Harness full | 소유 | 증적 제공 |

`package.json`, 공용 type과 일반 문서는 작업 담당 Agent가 수정할 수 있지만 handoff에 기록합니다.
`docs/project-context.json`은 Codex가 통합 단계에서만 수정합니다.

## Worktree

```bash
npm run agents:worktree:create -- --role=codex --task=<task-slug>
npm run agents:worktree:create -- --role=agy --task=<task-slug>
```

- 대상 경로는 저장소 형제 디렉터리 `fcmoim-codex`, `fcmoim-agy`입니다.
- branch 이름은 `agent/codex/<task-slug>`, `agent/agy/<task-slug>`입니다.
- 기존 worktree, branch 또는 dirty target은 helper가 덮어쓰지 않습니다.
- 최초 생성 후 각 worktree에서 `npm ci`를 실행합니다. Turbopack 호환을 위해 `node_modules`를 다른 worktree에서 symlink하지 않습니다.
- 다음 작업은 기존 worktree에서 main을 fast-forward한 뒤 새 `agent/<role>/<task>` branch를 생성합니다.
- 두 Agent는 같은 branch나 worktree에서 동시에 작업하지 않습니다.

## Runtime

### Codex

- Local Supabase의 start/reset/migration/seed를 독점합니다.
- 기본 dev server 포트는 `3000`입니다.
- DB/API/Auth gate와 production 작업을 담당합니다.

### Agy

- 기존 Local Supabase를 사용하며 reset/migration/seed 구조 변경을 하지 않습니다.
- 전용 worktree에서 `npm run dev:agy`로 포트 `3001`을 사용합니다.
- 기존 QA 계정과 fixture로 UI를 검증합니다.
- 새 fixture나 API 계약이 필요하면 Codex handoff를 작성합니다.

## 역할 Guard

```bash
npm run guard:role:codex
npm run guard:role:agy
```

- 기본값은 unstaged와 untracked worktree 변경을 검사합니다.
- commit 전에는 `-- --staged`를 추가합니다.
- 상대 역할의 금지 경로가 포함되면 실패합니다.
- `docs/handoff/**`는 양쪽 역할에서 허용됩니다.

## Handoff

- template: `docs/handoff/TEMPLATE.md`
- 파일명: `YYYYMMDD-<from>-to-<to>-<topic>.md`
- 상태: `requested`, `accepted`, `implemented`, `verified`, `integrated`
- 요청·결과·검증 명령·commit SHA·공유 파일을 단일 문서에서 갱신합니다.
- 각 세션은 `npm run agents:handoff:inbox -- --role=codex|agy`로 시작합니다.
- 디렉터리 수동 전체 스캔 결과로 작업을 추론하지 않으며 Inbox가 출력한 `requested`만 새 요청으로 처리합니다.
- Inbox는 shared Git의 `main`, `agent/*`, `origin/agent/*` refs를 직접 읽으며 checkout, merge 또는 worktree 파일 변경을 하지 않습니다.
- 동일 handoff는 가장 진행된 상태를 우선하므로 다른 branch에 남은 오래된 `requested` 항목을 다시 표시하지 않습니다.
- 같은 장비에서는 commit만으로 공유됩니다. 다른 장비의 Agent에게 전달할 때만 source branch를 push하고 상대가 fetch합니다.
- `main`은 최종 통합 branch이며 handoff 전달용 message bus로 사용하지 않습니다.

## 통합

1. Agy가 역할 guard, Frontend 테스트와 visual evidence를 통과합니다.
2. Agy가 한글 커밋과 handoff를 Codex에 전달합니다.
3. Codex가 diff와 금지 경로를 검토하고 통합 branch에 cherry-pick합니다.
4. Codex가 공유 파일 충돌을 해결합니다.
5. Codex가 전체 verify, runtime smoke와 Harness full을 실행합니다.
6. Codex가 `docs/project-context.json`과 handoff를 최종 상태로 갱신합니다.
7. 관련 변경만 main에 반영하고 worktree를 정리합니다.

## 완료 기준

- 두 Agent가 각자 지속 지침을 자동 로드합니다.
- 역할 guard의 허용·차단 fixture가 모두 통과합니다.
- worktree helper가 안전하게 경로와 branch 충돌을 거부합니다.
- Local Supabase reset/migration은 Codex 경로에만 존재합니다.
- handoff와 commit SHA만으로 통합 범위와 검증 결과를 확인할 수 있습니다.
