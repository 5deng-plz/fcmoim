# Agent Handoff Inbox

이 디렉터리를 수동으로 전체 스캔해 작업을 추론하지 않습니다.

```bash
npm run agents:handoff:inbox -- --role=codex
npm run agents:handoff:inbox -- --role=agy
```

- Handoff 인스턴스는 `.gitignore` 대상이며 Git에 commit하지 않습니다.
- Inbox는 같은 Git 저장소에 등록된 모든 local worktree의 `docs/handoff/*.md`를 읽습니다.
- Inbox가 출력한 `requested` 항목만 새 작업 요청입니다.
- 유효한 handoff는 `YYYYMMDD-<from>-to-<to>-<topic>.md` 형식과 `id`, `from`, `to`, `status`, `updatedAt` metadata를 가집니다.
- `accepted`, `implemented`, `verified`, `integrated`와 metadata가 없는 참고 문서는 새 요청이 아닙니다.
- 과거 참고 문서는 `docs/archive/handoff/`에 보관합니다.
- `README.md`와 `TEMPLATE.md`만 Git에서 추적합니다.
- 다른 장비에는 ignored handoff가 전달되지 않으므로 별도 협업 채널이 필요합니다.
