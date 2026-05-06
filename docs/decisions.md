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
- `verify` is the deterministic local gate: harness structure, lint, typecheck, tests, and tracked Supabase SQL contract checks.
- Runtime-affecting UI, API, auth, Supabase, and data access changes require matching Browser Use, API, and Supabase evidence.
- Review Agent approval with no blockers is required before Main Orchestrator marks work complete.
- If required evidence cannot be collected, the work remains blocked or conditional.

### Reusable Harness Guardrails

- `.agents/` is reusable harness engine only; project paths, commands, stack names, and evidence providers live in `docs/agent-rules.json`.
- Agent path ownership, forbidden paths, required evidence, and Review verdicts are enforced by guard scripts and repo-tracked hooks.
- Hooks must read project commands from `docs/agent-rules.json`; they must not hard-code project-specific commands.
- CI must run the project rules `commands.ci` guard path, so local hook bypass cannot be the final quality gate.
- Local bypass requires an explicit reason and is not accepted for pre-push, CI, or handoff guards.
