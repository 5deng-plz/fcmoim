# Agent Harness Guide

## Purpose

- This file is the short map for the reusable Agent harness.
- Project knowledge, path ownership, commands, and evidence policy live in `docs/`.
- `.agents/` stays reusable across projects.

## Core Files

- Harness manifest: `.agents/manifest.json`
- Ownership contracts: `.agents/contracts/agent-contracts.json`
- Role prompts: `.agents/agents/*`
- Project state schema: `.agents/state/project-context.schema.json`
- Harness validator: `.agents/scripts/validate-harness.mjs`
- Project rules: `docs/agent-rules.json`
- Project overview: `docs/README.md`
- Durable decisions: `docs/decisions.md`
- Current state: `docs/project-context.json`

## Session Loop

1. Orient: read `AGENT.md`, `.agents/manifest.json`, `.agents/contracts/agent-contracts.json`, `docs/agent-rules.json`, the project docs named in that rules file, project state, and the relevant role prompt.
2. Verify baseline before changing code when practical: use the configured `commands.baseline`.
3. Select one task and stay within the responsible Agent's owned paths from `docs/agent-rules.json`.
4. Implement without placeholder behavior unless the task explicitly asks for a stub.
5. Run deterministic checks: use the narrowest relevant command, then broaden to configured `commands.verify` for handoff-sized changes.
6. Capture runtime evidence required by `evidencePolicy`.
7. Review gate: run the Review Agent on the diff and evidence. Any Review Agent blocker keeps the task open.
8. Update `docs/project-context.json` only as Main Orchestrator; Worker Agents leave `statePatchSuggestion`.

## Quality Gates

- `npm run harness:validate` means reusable harness structure and purity passed. It does not mean the app is release-ready.
- `npm run harness:validate-project` means project-specific rules are valid.
- `commands.baseline` means the configured deterministic baseline checks passed.
- `commands.verify` means the configured project verification checks passed.
- Runtime/database readiness requires relevant Browser Use, Supabase, and API evidence plus Review Agent approval.
- If a required tool or environment is unavailable, mark the task blocked or conditional instead of calling it complete.

## Operating Rules

- Repository files are the system of record; do not rely on chat history for durable facts.
- Keep `AGENT.md` compact. Add project knowledge to `docs/`, not here.
- Read `docs/decisions.md` before changing architecture, data, auth, deployment, quality gates, or Agent operations.
- Run `npm run harness:validate` after harness, Agent, decision log, contract, or state changes.
- Run configured guard profiles before handoff-sized code changes unless the task is explicitly documentation-only or environment-blocked.
- Do not mark a runtime-affecting task complete without QA evidence and a Review Agent result.
- Preserve role boundaries. If another Agent owns the affected path, document the needed change instead of silently crossing ownership.
