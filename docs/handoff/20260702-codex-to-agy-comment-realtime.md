# Agent Handoff: comment-realtime-transport

- id: `20260702-codex-to-agy-comment-realtime`
- from: `codex`
- to: `agy`
- status: `requested`
- requestedAt: `2026-07-02T22:51:00+09:00`
- updatedAt: `2026-07-02T22:51:00+09:00`

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

- summary: Backend publisher와 private channel RLS 구현 및 Local Supabase 통합 검증 완료
- sourceCommit: `1d34cb8`
- integrationCommit:

## 검증

- command: `node scripts/with-local-supabase-env.mjs npx vitest run tests/local-supabase-realtime.test.ts`
- result: 승인 회원 구독, 비회원 거부, API 저장 후 단일 event 수신 통과
- runtimeOrVisualEvidence: Backend는 50명·10분·초당 1건에서 30000/30000 전달, p95 17ms, 연결 오류 0건. Agy에서 발신·수신 2개 UI 세션과 재연결 복구를 추가 검증해야 함.

## 미해결 사항

- blockers: Frontend는 현재 `postgres_changes` 구독 상태
- nextOwner: `agy`
