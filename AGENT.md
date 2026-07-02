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
- Current state: `docs/project-context.json` (standard/full work only)
- Cross-agent ownership: `docs/agent-boundaries.md`
- Handoff template: `docs/handoff/TEMPLATE.md`

## Session Loop

1. **Orient**: read `AGENT.md`, `docs/agent-rules.json`, `docs/agent-feedback.md`, `docs/user/design-harness-workflow.md`, and the relevant role prompt. Run `npm run agents:handoff:inbox -- --role=<role>` before planning. Read `docs/project-context.json` when the task is standard/full.
2. **Plan & Scope**: choose a work level. For standard/full, list expected changed files and confirm they fall within `allowedPaths`; quick work does not update project state by default.
   Run the current session role guard (`npm run guard:role:codex` or `npm run guard:role:agy`) before implementation and commit.
3. **Implement & Verify**: implement the task and run deterministic checks (`lint`, `typecheck`, `test`). Retry up to `loopPolicy.maxGuardRetries` times on guard failures, then escalate to user.
4. **Self-Review**: run `guard-design`, compare changed files vs plan, confirm tests pass. Retry up to `loopPolicy.maxReviewRounds` times, then escalate to user.
5. **Complete**: run the selected guard profile, commit the work, and summarize passed gates separately from omitted or blocked gates. Only standard/full work updates `docs/project-context.json`; retrospective is required only when reusable harness guidance is being proposed or full evidence guard is used.

## Quality Gates

- `npm run harness:validate` — harness structure and purity.
- `npm run verify:baseline` — lint, typecheck, and tests.
- `npm run harness:guard:quick` — lightweight policy gate for small UI/test/docs changes; no project state or evidence guard.
- `npm run harness:guard:standard` — scoped policy gate for API/service/store or multi-surface work; checks diff ownership and project verification, but skips evidence guard.
- `npm run harness:guard:full` — full policy gate for DB/Auth/RLS/package/runtime-entrypoint/release-readiness work; includes evidence guard.
- `npm run harness:guard:verify` — compatibility alias for the full policy gate. It is not a product runtime guarantee by itself.
- Evidence guard — included only in full/verify; blocks ready/complete state when required evidence is missing.
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
- Treat Harness improvement feedback as reusable Agent-process guidance, not project-local implementation advice.
- Preserve role boundaries. If another Agent owns the affected path, document the needed change instead of silently crossing ownership.
