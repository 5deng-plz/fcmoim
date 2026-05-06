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

- Authentication UI exposes Kakao login for the current release path.
- Account identity and club membership stay separated.
- Club-specific role, approval status, profile, OVR, and points belong to membership data.
- Server routes must authorize through the current Supabase server user, not client-submitted identity fields.
- Unknown real profile values stay `null`; do not invent default profile data.
- UI state and server state stay separate; client-side role or status is not a production authorization source.
- Schedule creation and schedule poll creation are separate flows.
- Home can show active poll participation; Schedule remains the operator creation and management surface.

## Runtime Reality

- Infrastructure setup for Firebase App Hosting, Supabase Postgres, Kakao OAuth, and secret environment configuration has been prepared.
- `src/config/app.config.ts` supports `local` and `prod` profiles for real runtime configuration.

## Docs

- `docs/README.md`: consolidated project overview, scope, and current direction
- `docs/agent-rules.json`: project-specific Agent ownership, command map, surface classification, and evidence policy
- `docs/decisions.md`: durable decision log
- `docs/project-context.json`: current project state for Agent recovery

## Agent Workflow

1. Read `AGENT.md`.
2. Read `.agents/manifest.json` and `.agents/contracts/agent-contracts.json`.
3. Read `docs/agent-rules.json`.
4. Read the project docs named by `docs/agent-rules.json`.
5. Read the current role prompt under `.agents/agents/`.
6. Run baseline checks before code changes when practical.
7. Implement one task inside the responsible Agent's owned paths.
8. Collect QA evidence for changed runtime surfaces.
9. Run Review Agent on the diff and evidence.
10. Worker Agents leave `statePatchSuggestion`; Main Orchestrator updates `docs/project-context.json`.

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
npm run harness:validate-project
npm run harness:test
npm run harness:guard:precommit
npm run harness:guard:handoff
npm run harness:guard:prepush
npm run harness:ci
npm run verify:baseline
npm run db:check
npm run lint
npm run typecheck
npm run test
npm run verify
```

`harness:validate` only confirms reusable harness structure and purity. Runtime readiness additionally needs fresh evidence required by `docs/agent-rules.json`, hook installation, CI guard, and a Review Agent verdict with no blockers.
