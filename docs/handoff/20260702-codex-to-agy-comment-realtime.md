# Agent Handoff: comment-realtime-transport

- id: `20260702-codex-to-agy-comment-realtime`
- from: `codex`
- to: `agy`
- status: `verified`
- requestedAt: `2026-07-02T22:51:00+09:00`
- updatedAt: `2026-07-03T00:09:02+09:00`

## 요청

- 목표: 시즌 코멘트 화면을 Backend의 private Broadcast 계약으로 전환합니다.
- 필요한 계약 또는 동작:
  - topic: `comments:feed_post:<postId>`
  - event: `comment.created.v1`
  - payload: 기존 `EventComment` (`id`, `targetType`, `targetId`, `membershipId`, `authorName`, `content`, `createdAt`)
  - 구독 전 `supabase.realtime.setAuth()`를 호출하고 `{ config: { private: true } }`로 channel을 생성합니다.
  - `postgres_changes` 구독을 제거하고, POST 응답을 즉시 추가한 뒤 Broadcast 수신은 `id`로 중복 제거합니다.
  - 최초 접속과 재연결 시 `GET /api/comments`로 DB 원본을 다시 동기화합니다.
- 금지 범위: API 계약, Backend publisher, RLS migration은 변경하지 않습니다.

## 영향 범위

- filesOrPatterns: `src/components/features/SeasonChatRoom.tsx`, Frontend transport 또는 store, 관련 Frontend 테스트
- apiOrTypes: `comment.created.v1`, `comments:feed_post:<postId>`, 기존 `EventComment`
- sharedFilesTouched: Frontend 구현 시 발생하면 이 문서에 기록

## 구현 결과

- summary:
  - Backend publisher와 private channel RLS 구현 완료
  - Codex가 `CommentRealtimeTransport`를 `src/lib/comment-realtime-transport.ts`로 분리
  - payload 검증, auth 선행, channel 오류 처리와 id 중복 제거 계약 적용
  - `SeasonChatRoom`은 최신 UI 상태를 ref로 읽어 스크롤 변경 시 재구독하지 않도록 연결
- sourceCommit: `df3b9f9` (transport), `464368a` (component wiring)
- integrationCommit: `df3b9f9`

## 검증

- command: `npx vitest run tests/comment-realtime-transport.test.ts; node scripts/with-local-supabase-env.mjs npx vitest run tests/local-supabase-realtime.test.ts; npm run verify:baseline`
- result: transport 3개 단위 테스트, Local Supabase API 저장→client transport 수신, 전체 255개 테스트 통과
- runtimeOrVisualEvidence: Codex runtime smoke 후 별도 `20260703-codex-to-agy-comment-realtime-ui-qa.md`에서 visual interaction 확인

## 미해결 사항

- blockers: 없음
- nextOwner: `agy` (코드 구현 없이 visual interaction QA만 수행)
