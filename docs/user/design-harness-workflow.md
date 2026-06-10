# Design Harness Workflow

이 문서는 FC Moim 디자인 하네스의 철학, 적용 범위, 작업 흐름을 팀원이 이해할 수 있도록 정리한 운영 문서입니다.
초안 문서가 아니라 현재 프로젝트에 적용된 guard, rules, review workflow를 기준으로 합니다.

## Why

디자인 하네스의 목적은 Agent나 사람이 UI를 수정할 때 디자인 품질을 말로만 약속하지 않고, 실패 가능한 규칙으로 만드는 것입니다.

특히 다음 문제를 막습니다.

- 색상, 아이콘, 상태 표현이 화면마다 임의로 흩어지는 문제
- 런타임 확인 없이 UI 작업을 완료 처리하는 문제
- Review가 실제 diff와 evidence를 보지 않고 통과되는 문제
- 금지 경로 또는 소유권 규칙이 임시 예외로 우회되는 문제

핵심 원칙은 단순합니다. 디자인 결정은 문서에 남기고, 반복 가능한 규칙은 guard script와 CI에서 강제합니다.

## Source Of Truth

디자인 하네스는 다음 파일을 기준으로 동작합니다.

| 파일 | 역할 |
|---|---|
| `docs/design-tokens.md` | 사용 가능한 색상 토큰과 의미 슬롯 정책 |
| `docs/agent-rules.json` | 디자인 guard 설정, guarded path, semantic slot 계약 |
| `.agents/scripts/guard-design.mjs` | 디자인 규칙 위반을 실패로 만드는 범용 guard |
| `.agents/scripts/guard-diff.mjs` | 현재 변경 파일이 active work의 allowed path 안에 있는지 검사 |
| `docs/project-context.json` | 현재 작업, 변경 파일, evidence 요약, review 상태 |

`.agents/`는 재사용 가능한 하네스 엔진입니다. 프로젝트 고유 토큰, 경로, evidence provider 이름은 `docs/agent-rules.json`과 `docs/design-tokens.md`에 둡니다.

## Design Rules

UI surface는 `src/app/**`, `src/components/**`를 중심으로 관리합니다.

디자인 guard는 다음 위반을 막습니다.

- 컴포넌트 코드의 hardcoded hex color
- 컴포넌트 코드의 직접 `rgb()` 또는 `rgba()`
- 허용 목록에 없는 Tailwind color class
- inline SVG path 직접 작성
- semantic slot 계약 위반

허용 색상 프리픽스와 토큰 추가 절차는 `docs/design-tokens.md`를 따릅니다.

## Semantic Slots

Semantic slot은 “이 화면의 이 의미는 반드시 특정 컴포넌트와 토큰으로 표현한다”는 계약입니다.

예시:

- 라커룸 스쿼드의 컨디션 표시는 `ConditionIcon`을 사용합니다.
- 컨디션 상태는 `condition-*` 토큰을 사용합니다.
- 일반 성공색 체크 아이콘으로 컨디션을 표현하지 않습니다.

Semantic slot은 단순 취향 문제가 아니라 제품 의미의 일관성 문제입니다. slot을 바꾸려면 먼저 `docs/design-tokens.md`와 `docs/agent-rules.json`의 정책을 함께 갱신해야 합니다.

## Required Workflow

UI 또는 디자인 관련 코드를 수정할 때는 아래 순서를 따릅니다.

1. `AGENT.md`, `docs/agent-rules.json`, `docs/design-tokens.md`를 확인합니다.
2. 변경할 파일이 현재 Agent의 owned path인지 확인합니다.
3. `docs/project-context.json`의 `activeWork.allowedPaths`와 예상 변경 범위를 맞춥니다.
4. 새 색상이나 상태 표현이 필요하면 기존 토큰을 먼저 찾습니다.
5. 필요한 토큰이 없으면 구현보다 먼저 토큰 추가 정책을 갱신합니다.
6. UI를 수정합니다.
7. SDD acceptance scenario를 기준으로 관련 Vitest/Testing Library 테스트를 추가하거나 갱신하고 통과시킵니다.
8. evidence에는 확인 대상, provider, command 요약을 간단히 남깁니다.
9. Verifier가 diff, design rule, evidence를 확인합니다.
10. `harness:guard:verify`가 통과해야 완료할 수 있습니다.
11. 한 턴의 작업이 완료되면 변경 내용을 요약한 Git 커밋을 남깁니다. 변경량이 크면 기능/정책/테스트처럼 리뷰 가능한 단위로 나누어 커밋합니다.

## Accepted Operating Principles

최근 하네스 리뷰에서 아래 운영 원칙만 수용합니다. 이 원칙들은 현재 하네스의 단순성과 재현성을 유지하면서, 실제로 확인된 취약점만 단계적으로 보강하기 위한 기준입니다.

- `guard-design.mjs`는 당분간 regex 기반 검사를 유지합니다. 새 디자인 규칙을 추가할 때는 구현보다 먼저 `.agents/fixtures/negative-fixtures.json`에 실패해야 하는 fixture를 추가합니다.
- AST 또는 ESLint 기반 검사는 실제 false positive나 false negative가 확인된 규칙부터 단계적으로 도입합니다. 전면 전환은 현재 범위가 아닙니다.
- full-stack 작업은 새 `feature` Agent를 만들지 않고 `docs/project-context.json`의 `activeWork.allowedPaths`로 처리합니다. forbidden path를 우회할 수 없습니다.
- 구현 증적은 `docs/project-context.json`의 경량 필드에만 남깁니다. `changedFiles`, `changedSurfaces`, `evidence`, `reviewStatus`, `loopCounters`가 기준입니다.
- 완료된 턴의 변경은 커밋으로 경계를 남깁니다. 커밋 메시지는 작업 요약을 담고, 서로 다른 관심사는 가능한 한 별도 커밋으로 분리합니다.
- guard 실패는 CI나 guard script 안에서 자동 수정하지 않습니다. `loopPolicy.maxGuardRetries`를 초과하면 현재 상태, 실패 원인, 다음 단계를 사용자에게 보고하고 중단합니다.
- `docs/project-context.json`의 `updateVersion`은 orchestrator가 상태를 갱신할 때마다 증가시킵니다. 이번 정책은 lightweight versioning이며 JSON Patch 또는 RFC 6902 도입을 의미하지 않습니다.

## Gates

현재 기본 경로에서 실행되는 디자인 관련 gate는 다음과 같습니다.

| Profile | Design Harness Gate |
|---|---|
| `preCommit` | harness validation, staged design guard, lint |
| `verify` | harness validation, full design guard, diff ownership, project verify |

로컬 Git 자동 실행은 기본 Harness 경로에서 사용하지 않습니다. CI와 수동 검증은 `verify` guard profile을 기준으로 합니다.

## Evidence Standard

UI evidence는 단순히 “봤다”는 문장이 아닙니다. 다음을 포함해야 합니다.

- `status: "passed"`
- `provider`: 예를 들어 Vitest, Testing Library, SDD acceptance tests
- `target`: 테스트 파일, 시나리오 이름, API contract 등
- `command`: 실행한 검증 명령
- `summary`: assertion 또는 확인 결과 요약

인앱 브라우저 검증은 기본 UI evidence 요구가 아닙니다. 기본 provider는 SDD 기반 결정적 테스트입니다.

다만 Auth/session/API bootstrap, app entrypoint, package/runtime config처럼 런타임 엔트리포인트를 바꾼 턴은 예외입니다. 이 경우에는 `npm run dev` 실행, 인앱 브라우저 첫 화면 확인, 서버 콘솔 상태 확인을 `browserRuntime` evidence로 남겨야 합니다.

## Review Standard

Review는 구현자가 작성한 자기 선언이 아닙니다.

Review 결과는 `ready`, `needs-changes`, `blocked` 중 하나로 요약합니다.

Verifier는 디자인 규칙, semantic slot, evidence 누락, runtime risk를 blocker로 다룹니다. 반복 리뷰가 `loopPolicy.maxReviewRounds`를 초과하면 현재 상태, 실패 원인, 다음 단계를 사용자에게 보고하고 중단합니다.

## How To Add A Design Rule

새로운 디자인 규칙이 필요할 때는 아래 순서로 추가합니다.

1. `docs/design-tokens.md`에 사람이 이해할 수 있는 정책을 추가합니다.
2. `docs/agent-rules.json`의 `designPolicy`에 기계적으로 검사할 수 있는 조건을 추가합니다.
3. 필요한 경우 `guard-design.mjs`를 확장합니다.
4. `.agents/fixtures/negative-fixtures.json`에 실패해야 하는 회귀 케이스를 추가합니다.
5. `npm run harness:test`로 새 규칙이 실제 실패하는지 확인합니다.
6. `npm run harness:guard:verify`로 전체 경로를 확인합니다.

## What Not To Do

- `// design-exempt`를 일반적인 탈출구로 사용하지 않습니다.
- forbidden path를 `activeWork.allowedPaths`로 우회하지 않습니다.
- 새 UI 상태를 임의 색상이나 일반 아이콘으로 표현하지 않습니다.
- evidence 없이 `docs/project-context.json`의 상태만 `ready`로 바꾸지 않습니다.
- Review verdict를 active work agent가 직접 만든 것으로 처리하지 않습니다.

디자인 하네스는 창의성을 막기 위한 장치가 아닙니다. 제품 의미와 품질 기준을 반복 가능한 형태로 보존하기 위한 장치입니다.
