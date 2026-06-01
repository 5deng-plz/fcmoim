# FC Moim Project Notes

## Overview

FC Moim is a mobile-first web app prototype for football and futsal club operations. The project goal is to turn the existing prototype into a real member operations product backed by durable product contracts, authentication, data access, authorization, deployment, and verification.

## Product Scope

- Member onboarding and club membership status management
- Club schedules, attendance, and schedule planning
- Match records and player statistics
- Notices and member communication
- Member-facing locker room and gamification concepts
- Mobile-first PWA experience

## Current Direction

| Area | Direction |
|---|---|
| Frontend | Next.js App Router |
| Auth | Supabase Auth |
| Data | Supabase Postgres with RLS |
| Hosting | Firebase App Hosting |
| Push | Firebase Cloud Messaging |

## Product Rules

- Authentication UI exposes email, Google, and Kakao login choices. Local QA uses Supabase email/password first.
- Account identity and club membership stay separated.
- Club-specific role, approval status, profile, OVR, and points belong to membership data.
- Server routes must authorize through the current Supabase server user, not client-submitted identity fields.
- Unknown real profile values stay `null`; do not invent default profile data.
- UI state and server state stay separate; client-side role or status is not a production authorization source.
- Schedule creation and schedule poll creation are separate flows.
- Home can show active poll participation; Schedule remains the operator creation and management surface.

## Runtime Reality

- Infrastructure setup for Firebase App Hosting, Supabase Postgres, Kakao OAuth, and secret environment configuration has been prepared.
- `src/config/app.config.ts` supports `local` and `prod` profiles and blocks localhost/hosted Supabase mixups at runtime.

## Docs

- `docs/README.md`: consolidated project overview, scope, and current direction
- `docs/agent-rules.json`: project-specific Agent ownership, command map, surface classification, and evidence policy
- `docs/agent-feedback.md`: repeat failure feedback and prevention rules for future Agent sessions
- `docs/decisions.md`: durable decision log
- `docs/design-tokens.md`: allowed UI color token palette and design guard policy
- `docs/project-context.json`: current project state for Agent recovery
- `docs/user/design-harness-workflow.md`: design harness philosophy, workflow, gates, evidence, and review standard

## Agent Workflow

1. Read `AGENT.md`.
2. Read `.agents/manifest.json` and `.agents/contracts/agent-contracts.json`.
3. Read `docs/agent-rules.json`.
4. Read `docs/agent-feedback.md`.
5. Read the project docs named by `docs/agent-rules.json`.
6. Read the current role prompt under `.agents/agents/`.
7. Run baseline checks before code changes when practical.
8. Implement one task inside the responsible Agent's owned paths.
9. Collect QA evidence for changed runtime surfaces.
10. Run Verifier on the diff and evidence.
11. Worker Agents leave `statePatchSuggestion`; Orchestrator updates `docs/project-context.json`.

## Quick Start

```bash
npm install
cp .env.local.example .env.local
npm run lint
npm run dev
```

## Verification

```bash
npm run harness:validate
npm run harness:test
npm run harness:guard:precommit
npm run harness:guard:diff
npm run harness:guard:verify
npm run verify:baseline
npm run verify:harness
npm run db:check
npm run db:local:start
npm run db:local:seed-demo
npm run verify:db:local
npm run prod:backup
npm run prod:reset:db
npm run prod:cleanup:auth-storage
npm run prod:verify-empty
npm run lint
npm run typecheck
npm run test
npm run verify
```

`harness:validate` only confirms reusable harness structure and purity. The default completion gate is `harness:guard:verify`, which runs the `verify` guard profile without resetting Local Supabase. API/Auth/Data runtime readiness additionally needs `npm run verify:db:local` or full `npm run verify` when Local Supabase is available.

Local Supabase verification uses the Supabase CLI and a Docker-compatible runtime such as OrbStack. Start the stack once with `npm run db:local:start`; `npm run dev` and `npm run dev:local` both inject local Supabase env automatically. `npm run verify:db:local` resets local schema/data, seeds QA Auth users plus rich demo data, and runs API integration tests without touching the hosted Supabase project. `npm run verify` includes that runtime gate and is reserved for API/Auth/Data/Supabase changes, release readiness, or explicit full verification. API/Auth/Data runtime evidence must come from the local Supabase stack, not mocks.

Production reset commands are intentionally split. Run `npm run prod:backup` first, then destructive commands require explicit confirmation environment variables: `FC_PROD_RESET_CONFIRM=DELETE_PRODUCTION_DATA` for DB reset and `FC_PROD_CLEANUP_CONFIRM=DELETE_PRODUCTION_DATA` for Auth/Storage cleanup. Production commands refuse localhost Supabase URLs and must not be used for local demo seeding.
