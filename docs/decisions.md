# Decision Log

This file starts clean for `prototype v0.1`.

## Rules

- Record only durable decisions that future Agent sessions must know.
- Do not record migration history, cleanup history, temporary review notes, or implementation journals.
- Add new decisions at the end.
- Keep each decision short, current, and verifiable from repository files.

## Current Decisions

### Quality Gate Policy

- `harness:validate` is structure-only and must not be described as app quality or release readiness.
- `harness:guard:verify` is the default completion gate: harness structure, design guard, diff guard, lint, typecheck, tests, and tracked Supabase SQL contract checks.
- `verify` is the full local gate and includes Local Supabase reset/seed/API integration checks.
- Runtime-affecting UI changes require matching SDD-based deterministic test evidence; API, auth, Supabase, and data access changes require matching API or Supabase evidence.
- Verifier approval with no blockers is required before Orchestrator marks work complete.
- If required evidence cannot be collected, the work remains blocked or conditional.

### Reusable Harness Guardrails

- `.agents/` is reusable harness engine only; project paths, commands, stack names, and evidence providers live in `docs/agent-rules.json`.
- Agent path ownership, forbidden paths, and required evidence are enforced by guard scripts and CI.
- CI runs the `verify` guard profile; local Git integration is intentionally not part of the harness.

### Design Token Enforcement

- UI surface colors must use the allowed palette documented in `docs/design-tokens.md`.
- `guard-design.mjs` blocks hardcoded component colors, inline SVG paths, and disallowed Tailwind color prefixes on changed UI lines.
- Builder and Verifier outputs must include design token compliance evidence before completion is considered ready.
- Semantic design slots in `docs/agent-rules.json` are binding contracts; matching files must contain required semantic markers and avoid forbidden generic substitutes.

### Local Supabase Evidence

- Prefer Local Supabase CLI evidence for routine database, RLS, and API integration verification.
- Remote Supabase MCP/plugin evidence is reserved for hosted project diagnostics, production parity checks, or cases local CLI cannot reproduce.
- `npm run verify:db:local` is the reproducible local DB gate: reset local Supabase, seed QA Auth users, then run local API integration tests.
- `npm run verify` must include local Supabase verification so API/Auth/Data runtime behavior is not accepted on mock evidence alone, but routine completion checks use `npm run harness:guard:verify`.
- Mocks are allowed for pure UI rendering and pure unit tests, but not as completion evidence for API/Auth/Data behavior.
- Rich demo data is local-only and must be seeded through localhost-guarded scripts, never through production reset or shared SQL seed paths.
- Production reset must use `--no-seed`, write backups outside the repo, and clean Auth/Storage separately with explicit confirmation variables.

### Agent Feedback Memory

- Repeat Agent failures must be converted into durable prevention rules in `docs/agent-feedback.md`.
- Future sessions must read `docs/agent-feedback.md` through the `AGENT.md` Session Loop before changing runtime, auth, environment, or UI behavior.

### Harness Document Size And Troubleshooting

- Human-read harness 기준 문서는 200줄 이하로 유지하고, 초과하면 삭제가 아니라 분리, 요약, 참조 구조로 해결합니다.
- 트러블슈팅 완료 기준은 증상 우회가 아니라 근본 원인 확인, 클린 아키텍처 경계에 맞는 수정, 재검증 evidence입니다.
