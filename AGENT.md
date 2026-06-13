# Agent Harness Guide

## Purpose

- This file is the short map for the reusable Agent harness.
- Project knowledge, path ownership, commands, and evidence policy live in `docs/`.
- `.agents/` stays reusable across projects.

## Core Files

- Harness manifest: `.agents/manifest.json`
- Contracts: `.agents/contracts/agent-contracts.json`
- Role prompts: `.agents/agents/*`
- Project rules: `docs/agent-rules.json`
- Project overview: `docs/README.md`
- Durable decisions: `docs/decisions.md`
- Agent feedback log: `docs/agent-feedback.md`
- Harness workflow: `docs/user/design-harness-workflow.md`
- Design tokens: `docs/design-tokens.md`
- Current state: `docs/project-context.json`

## Session Loop

1. **Orient**: read `AGENT.md`, `docs/agent-rules.json`, `docs/agent-feedback.md`, `docs/user/design-harness-workflow.md`, `docs/project-context.json`, and the relevant role prompt.
2. **Plan & Scope**: list expected changed files, confirm they fall within `allowedPaths`. Do not touch files outside scope.
3. **Implement & Verify**: implement the task and run deterministic checks (`lint`, `typecheck`, `test`). Retry up to `loopPolicy.maxGuardRetries` times on guard failures, then escalate to user.
4. **Self-Review**: run `guard-design`, compare changed files vs plan, confirm tests pass. Retry up to `loopPolicy.maxReviewRounds` times, then escalate to user.
5. **Complete**: update `docs/project-context.json` with evidence and retrospective (orchestrator only), sync the active work before the final guard, rerun `npm run harness:guard:verify`, and summarize which gates were or were not included.

## Quality Gates

- `npm run harness:validate` — harness structure and purity.
- `npm run verify:baseline` — lint, typecheck, and tests.
- `npm run harness:guard:verify` — default completion gate: harness validation, design guard, diff guard, lint, typecheck, tests, and tracked SQL contract checks.
- Evidence guard — included in `harness:guard:verify`; blocks ready/complete state when required evidence or completion retrospective is missing.
- `npm run verify:db:local` — DB runtime gate for API/Auth/Data/Supabase changes when Local Supabase is available.
- Runtime smoke — browser tooling is otherwise optional, but for Auth/session/API bootstrap, app entrypoint, or package/runtime config changes, run `npm run dev`, open the first screen, and check the server log; after local resets, treat stale browser auth state as a separate runtime risk to verify.
- `npm run verify` — full verification, including the DB runtime gate, for release readiness or explicit full checks.
- Guard failures beyond `maxGuardRetries` → stop and report to user.
- Review rounds beyond `maxReviewRounds` → stop and report to user.

## Operating Rules

- Repository files are the system of record; do not rely on chat history for durable facts.
- Keep `AGENT.md` compact. Add project knowledge to `docs/`, not here.
- Treat `docs/plan/**` as planning input. Verify it against current code and promote only durable, confirmed rules into harness policy.
- When user feedback exposes a repeatable Agent failure, record the prevention rule in `docs/agent-feedback.md`.
- Read `docs/decisions.md` before changing architecture, data, auth, deployment, or quality gates.
- Run `npm run harness:validate` after harness, Agent, or contract changes.
- Do not mark a runtime-affecting task complete without configured QA evidence.
- For global DOM side effects, reuse scoped utilities or document an equivalent cleanup contract before writing body/document state directly.
- Preserve role boundaries. If another Agent owns the affected path, document the needed change instead of silently crossing ownership.
