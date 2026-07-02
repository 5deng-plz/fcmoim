# Agent Handoff Inbox

이 디렉터리를 수동으로 전체 스캔해 작업을 추론하지 않습니다.

```bash
npm run agents:handoff:inbox -- --role=codex
npm run agents:handoff:inbox -- --role=agy
```

- Inbox가 출력한 `requested` 항목만 새 작업 요청입니다.
- 유효한 handoff는 `YYYYMMDD-<from>-to-<to>-<topic>.md` 형식과 `id`, `from`, `to`, `status`, `updatedAt` metadata를 가집니다.
- `accepted`, `implemented`, `verified`, `integrated`와 metadata가 없는 참고 문서는 새 요청이 아닙니다.
- 과거 참고 문서는 `docs/archive/handoff/`에 보관합니다.
- 다른 장비에서는 source branch 또는 main을 fetch한 뒤 Inbox를 실행합니다.
