# Agent Handoff: comments-realtime-replication

- id: `20260630-agy-to-codex-realtime-comments`
- from: `agy`
- to: `codex`
- status: `verified`
- requestedAt: `2026-06-30T01:40:00+09:00`
- updatedAt: `2026-07-02T22:51:00+09:00`

## 요청

- **목표**: 
  - 치지직 스타일의 실시간 시즌 채팅방을 안정적으로 구현하기 위해, Supabase `comments` 테이블의 **Realtime replication(복제) 활성화**가 필요합니다.
- **필요한 계약 또는 동작**:
  - `comments` 테이블을 `supabase_realtime` publication에 등록하는 SQL 마이그레이션 적용:
    ```sql
    alter publication supabase_realtime add table comments;
    ```
  - 로컬 Supabase 환경에서 해당 스택을 재기동하거나 마이그레이션을 적용하여, 클라이언트(`agy`)가 `supabase.channel`을 통해 `comments` 테이블의 `INSERT` 이벤트를 실시간 웹소켓으로 수신할 수 있도록 조치 부탁드립니다.
- **금지 범위**:
  - agy 측의 UI 컴포넌트, 훅 및 프론트엔드 상태 파일은 직접 수정하지 말아주십시오.

## 영향 범위

- **filesOrPatterns**: 
  - `supabase/migrations/*` (새 마이그레이션 생성)
- **apiOrTypes**: 
  - 없음 (기본 Supabase Realtime 웹소켓 기능 활성화)
- **sharedFilesTouched**: 
  - 없음

## 구현 결과

- summary: 최초 publication 요청은 이후 합의된 provider-neutral Publisher 구조로 대체했습니다. `comments` publication이나 DB trigger는 추가하지 않고, API 저장 성공 후 Backend의 Supabase REST Broadcast adapter가 private event를 발행합니다.
- sourceCommit: eac450db34c9796089d1d8cca14ac7c6c114cd89
- integrationCommit: 9a21094

## 검증

- command: `npx vitest run tests/comments-service.test.ts tests/comment-realtime.test.ts; node scripts/with-local-supabase-env.mjs npx vitest run tests/local-supabase-realtime.test.ts`
- result: 서비스·adapter 15개 테스트와 Local Supabase private Broadcast 통합 테스트 통과
- runtimeOrVisualEvidence: 승인 회원 구독, 비회원 거부, API 저장 후 `comment.created.v1` 수신 확인

## 미해결 사항

- blockers: 최초 Postgres Changes/publication 방식은 superseded
- nextOwner: `agy` (`20260702-codex-to-agy-comment-realtime.md` 적용)
