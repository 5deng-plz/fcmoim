# Design Tokens — Allowed Palette

이 문서는 UI surface 코드(`src/app/**`, `src/components/**`)에서 사용 가능한 색상 토큰의 **완전한 허용 목록**입니다.
`guard-design.mjs` 스크립트와 Review Agent(DC-1)가 이 목록을 기준으로 위반을 검출합니다.

## 토큰 정의 파일

| 파일 | 역할 |
|------|------|
| `src/app/globals.css` | CSS 변수 정의 (실제 hex/rgba 값) |
| `tailwind.config.ts` | Tailwind 시맨틱 토큰 (CSS 변수 참조) |

## 허용 Tailwind Color 프리픽스

### 기본

- `brand-*` — 브랜드 시맨틱 색상 (새 UI에서는 `fcgreen-*`보다 우선 사용)
- `fcgreen-*` — 브랜드 그린
- `action-*` — 버튼, 링크, 선택/활성, 비활성 등 인터랙션 색상
- `border-*` — 입력, 패널, 카드 등 구조적 테두리 색상
- `divider-*` — 리스트, 섹션, 모달 내부 구분선 색상
- `gray-*`, `slate-*` — 중립색
- `green-*` — 브랜드 확장
- `feedback-*` — 앱 공통 피드백 상태 (success/warning/error 및 bg/border)
- `background`, `foreground` — 앱 기본 표면/텍스트
- `white`, `black`, `transparent`, `current`

### 팀 컬러

- `red-team-*`, `blue-team-*`

### 축구 게임 메타포 (Winning Eleven / FIFA Online)

- `condition-*` — 5단계 컨디션 화살표 (best/good/normal/poor/worst)
- `tier-*` — 선수 카드 등급 (bronze/silver/gold/special)
- `stat-*` — OVR 능력치 등급 (diamond/gold/silver/bronze)
- `pos-*` — 포지션 컬러 (fw/mf/df/gk)
- `chem-*` — 케미스트리 (strong/weak/neutral)
- `stamina-*` — 체력 게이지 (full/mid/low)
- `foot-*` — 주발 아이콘 (active/inactive/stroke)
- `viz-*` — 데이터 시각화 (primary/secondary/tertiary/danger, fill, grid, label)

### 축구 소셜앱 메타포 (플랩풋볼 / 어반풋볼)

- `attend-*` — 참석 상태 (yes/maybe/no)
- `result-*` — 경기 결과 (win/draw/loss)
- `matchst-*` — 경기 상태 (upcoming/live/completed/cancelled)
- `award-*` — 수상 뱃지 (mvp/motm/assist/goals)
- `fee-*` — 회비 상태 (paid/unpaid/partial)
- `skill-*` — 실력 등급 (beginner/intermediate/advanced/pro)
- `trend-*` — 상승/하락 지표 (up/down/flat)

### 공통 피드백

- `feedback-success-*` — 완료/성공 피드백
- `feedback-warning-*` — 경고/주의/투표 진행 강조
- `feedback-error-*` — 오류/파괴적 액션/취소 피드백

## 사용 맥락 제한

- `brand-*`는 브랜드 액센트의 기본 시맨틱입니다. 기존 `fcgreen-*`는 호환성을 위해 유지하지만, 새 UI에서는 `brand-*`를 우선 사용합니다.
- `action-*`는 클릭 가능한 명령, 링크, 선택 상태, 비활성 상태에만 사용합니다. 성공/오류/경고 의미를 전달해야 하면 `feedback-*`를 사용합니다.
- `border-*`와 `divider-*`는 구조적 선 표현에 사용합니다. 도메인 상태나 결과를 나타내는 선에는 `condition-*`, `result-*`, `feedback-*`처럼 의미가 있는 토큰을 사용합니다.
- `feedback-*`는 앱 공통 성공, 경고, 오류, 파괴적 액션 전용입니다. 선수 컨디션, 경기 결과, 회비 상태 같은 축구 도메인 의미에는 사용하지 않습니다.
- `condition-*`는 선수 컨디션/스탯 메타포 전용입니다. `condition-best`의 빨강은 좋은 컨디션을 뜻하므로 폼 오류, 삭제, 경고에는 절대 사용하지 않습니다.
- `foot-*`는 `PreferredFootIcon` 전용 주발 시각 표현입니다. 일반 텍스트, 버튼, 상태 메시지에는 사용하지 않습니다.
- `result-*`는 경기 결과 전용입니다. 일반 성공/실패 메시지나 폼 검증에는 `feedback-*`를 사용합니다.
- `viz-label`은 별도 색상값을 갖지 않고 텍스트 보조색(`--text-secondary`)에 매핑합니다.

## 금지 사항

- 위에 없는 Tailwind 컬러 클래스 (예: `indigo-*`, `amber-*`, `cyan-*`, `purple-*`, `rose-*`, `teal-*`)
- 인라인 hex (예: `bg-[#ff0000]`, `text-[#334155]`)
- 컴포넌트(`.tsx`) 내 직접 rgba/hex 하드코딩 (`globals.css` 토큰 참조만 허용)
- 인라인 SVG path 직접 작성 (`lucide-react` 또는 `src/components/ui/` 공유 컴포넌트 사용)
- 커스텀 SVG는 `src/components/ui/**` 또는 `src/components/brand/**`의 공유 컴포넌트로만 둡니다.

## 의미 슬롯 계약

- 라커룸 스쿼드의 컨디션 열은 `ConditionIcon`을 사용하고, 상태별 `condition-*` 토큰으로 렌더링해야 합니다.
- 컨디션 UI를 일반 성공색(`green-*`) 체크 아이콘으로 대체하지 않습니다.
- 주발 표시는 `PreferredFootIcon`을 사용하고, `foot-*` 토큰으로 렌더링해야 합니다.
- 의미 슬롯을 변경하면 브라우저 QA에서 접근 가능한 이름이나 selector로 실제 렌더링을 증명합니다.

## 토큰 추가 절차

새로운 시맨틱 색상이 필요한 경우:

1. Frontend Agent가 `statePatchSuggestion`으로 토큰 추가를 요청한다.
2. Architect Agent가 `docs/design-tokens.md`와 `globals.css`에 토큰을 추가한다.
3. `docs/agent-rules.json`의 `designPolicy.allowedTailwindColorPrefixes`에 새 프리픽스를 등록한다.
4. `tailwind.config.ts`에 시맨틱 참조를 추가한다.
