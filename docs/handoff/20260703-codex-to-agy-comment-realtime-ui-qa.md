# Agent Handoff: comment-realtime-ui-qa

- id: `20260703-codex-to-agy-comment-realtime-ui-qa`
- from: `codex`
- to: `agy`
- status: `requested`
- requestedAt: `2026-07-03T00:05:00+09:00`
- updatedAt: `2026-07-03T00:05:00+09:00`

## 요청

- 목표: 구현 변경 없이 시즌 소통방의 최종 visual interaction만 확인합니다.
- 필요한 계약 또는 동작:
  - 승인 회원 두 계정이 같은 소통방을 엽니다.
  - 발신자는 POST 응답 직후 코멘트가 정확히 한 번 표시됩니다.
  - 수신자는 Broadcast 코멘트가 정확히 한 번 표시됩니다.
  - 스크롤을 올린 상태에서는 새 메시지 안내가 유지됩니다.
  - 새로고침 후 DB 목록과 화면이 일치합니다.
  - browser console error와 화면 깨짐이 없어야 합니다.
- 금지 범위:
  - `src/lib/comment-realtime-transport.ts`, API, Supabase, migration을 수정하지 않습니다.
  - 결함이 있으면 임의 수정하지 않고 이 handoff에 재현 절차와 blocker를 기록합니다.

## 영향 범위

- filesOrPatterns: 코드 변경 없음, `docs/handoff/20260703-codex-to-agy-comment-realtime-ui-qa.md`
- apiOrTypes: 변경 없음
- sharedFilesTouched: handoff 문서만

## 구현 결과

- summary:
- sourceCommit:
- integrationCommit:

## 검증

- command: `npm run dev:agy`
- result:
- runtimeOrVisualEvidence:

## 미해결 사항

- blockers:
- nextOwner: `agy`
