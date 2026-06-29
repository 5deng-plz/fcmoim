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
- Harness guard profiles are tiered: `quick` for small UI/test/docs work, `standard` for scoped implementation work, and `full` for DB/Auth/RLS/package/runtime-entrypoint or release-readiness work.
- `harness:guard:verify` remains as a compatibility alias for the full policy gate. It is not a product runtime guarantee by itself and does not automatically include Local Supabase runtime tests.
- `verify` is the full local gate and includes Local Supabase reset/seed/API integration checks.
- Runtime-affecting UI changes require matching SDD-based deterministic test evidence; API, auth, Supabase, and data access changes require matching API or Supabase evidence.
- Auth/API/Data, app entrypoint, or package/runtime config changes require affected-runtime evidence: `verify:baseline`, `verify:db:local` when database/Auth/API behavior changes, and `npm run dev` plus in-app browser smoke for changed startup/session paths.
- Dev server smoke is affected-runtime evidence, not a replacement for release readiness or database verification.
- `docs/project-context.json` and retrospective are not required for `quick` work. Standard/full work records concise active work state; reusable harness improvements stay as proposals until the user explicitly approves promotion into durable rules or guard changes.
- Verifier approval with no blockers is required before Orchestrator marks work complete.
- If required evidence cannot be collected, the work remains blocked or conditional.

### Reusable Harness Guardrails

- `.agents/` is reusable harness engine only; project paths, commands, stack names, and evidence providers live in `docs/agent-rules.json`.
- Agent path ownership, forbidden paths, and required evidence are enforced by guard scripts and CI.
- CI may run the `verify` guard profile as a full policy check; local Git integration is intentionally not part of the harness.

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
- Browser smoke minimum: start `npm run dev`, open `http://localhost:3000/` in the in-app browser, confirm the first screen renders, and confirm the server console has no app errors or avoidable startup warnings.
- Mocks are allowed for pure UI rendering and pure unit tests, but not as completion evidence for API/Auth/Data behavior.
- Rich demo data is local-only and must be seeded through localhost-guarded scripts, never through production reset or shared SQL seed paths.
- Production reset must use `--no-seed`, write backups outside the repo, and clean Auth/Storage separately with explicit confirmation variables.

### Agent Feedback Memory

- Repeat Agent failures must be converted into durable prevention rules in `docs/agent-feedback.md`.
- Future sessions must read `docs/agent-feedback.md` through the `AGENT.md` Session Loop before changing runtime, auth, environment, or UI behavior.

### Harness Document Size And Troubleshooting

- Human-read harness 기준 문서는 200줄 이하로 유지하고, 초과하면 삭제가 아니라 분리, 요약, 참조 구조로 해결합니다.
- 트러블슈팅 완료 기준은 증상 우회가 아니라 근본 원인 확인, 클린 아키텍처 경계에 맞는 수정, 재검증 evidence입니다.

### FC Guppy Single-Team Backend

- FC Guppy is the only launch-visible product team while `MULTI_CLUB_ENABLED` is disabled.
- Database schema, RLS, and repository boundaries remain multi-club capable; launch data is not a permanent singleton constraint.
- A server-only `TeamContextProvider` resolves the data scope. Single mode uses the canonical FC Guppy UUID, while multi mode requires a public team or approved membership.
- Legacy `clubId` request fields and club-shaped response fields are compatibility adapters only and must not influence authorization or repository scope.
- Club creation RPC remains service-role only, and its API surface returns 404 while the multi-club feature flag is disabled.
- `clubs`, `club_id`, slug, visibility, and creator metadata are durable tenant boundaries.
