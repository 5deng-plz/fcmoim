import type { Position, UserStats } from '@/types';
import { STAT_KEYS } from '@/types';

export type TraitGrade = 'amateur' | 'semi-pro' | 'pro' | 'legend';
export type TraitPositionGroup = Position | 'ALL';
export type TraitIconName =
  | 'anchor'
  | 'badge'
  | 'bolt'
  | 'brain'
  | 'crown'
  | 'flame'
  | 'gauge'
  | 'goal'
  | 'layers'
  | 'map'
  | 'moveDiagonal'
  | 'radar'
  | 'rocket'
  | 'shield'
  | 'sparkles'
  | 'swords'
  | 'target'
  | 'users';

export type TraitCard = {
  id: string;
  name: string;
  grade: TraitGrade;
  category: string;
  positionGroup: TraitPositionGroup;
  price: number;
  isDefault: boolean;
  icon: TraitIconName;
  description: string;
};

export const TRAIT_CATALOG: TraitCard[] = [
  { id: 'target-man', name: '타깃맨', grade: 'amateur', category: '포스트 플레이', positionGroup: 'FW', price: 0, isDefault: true, icon: 'shield', description: '최전방에서 볼을 받아내고 동료에게 연결하는 공격수.' },
  { id: 'anchor-man', name: '앵커맨', grade: 'amateur', category: '포백 수비 보호', positionGroup: 'MF', price: 0, isDefault: true, icon: 'anchor', description: '수비 라인 앞에서 역습 패스 길목을 차단하는 홀더.' },
  { id: 'classic-no10', name: '클래식 No. 10', grade: 'amateur', category: '정통 사령탑', positionGroup: 'MF', price: 0, isDefault: true, icon: 'badge', description: '정적인 위치에서 키핑과 패스 시야로 경기를 푸는 사령탑.' },
  { id: 'build-up-df', name: '빌드업 수비수', grade: 'amateur', category: '최후방 시발점', positionGroup: 'DF', price: 0, isDefault: true, icon: 'map', description: '후방에서 전환 패스와 빌드업을 시작하는 센터백.' },
  { id: 'off-fullback', name: '공격형 사이드백', grade: 'amateur', category: '적극 오버래핑', positionGroup: 'DF', price: 0, isDefault: true, icon: 'rocket', description: '터치라인을 타고 높게 올라가 측면 숫자 싸움을 만드는 수비수.' },
  { id: 'def-fullback', name: '수비형 사이드백', grade: 'amateur', category: '수비 전념', positionGroup: 'DF', price: 0, isDefault: true, icon: 'shield', description: '측면 수비 위치를 지키며 포백의 빈틈을 줄이는 수비수.' },
  { id: 'off-gk', name: '공격형 골키퍼', grade: 'amateur', category: '전진 스윕', positionGroup: 'GK', price: 0, isDefault: true, icon: 'goal', description: '수비 뒷공간을 향해 전진해 걷어내는 적극적인 키퍼.' },
  { id: 'def-gk', name: '수비형 골키퍼', grade: 'amateur', category: '라인 사수', positionGroup: 'GK', price: 0, isDefault: true, icon: 'goal', description: '골라인을 지키며 반사신경으로 슛을 막는 수문장.' },
  { id: 'dummy-runner', name: '미끼 공격수', grade: 'semi-pro', category: '미끼 플레이', positionGroup: 'FW', price: 150, isDefault: false, icon: 'users', description: '수비수를 끌고 움직여 동료 공격진에게 공간을 여는 카드.' },
  { id: 'extra-frontman', name: '오버랩 수비수', grade: 'semi-pro', category: '전진형 센터백', positionGroup: 'DF', price: 150, isDefault: false, icon: 'layers', description: '수비수지만 중앙으로 치고 올라가 공격에 가담하는 카드.' },
  { id: 'prolific-winger', name: '윙 스트라이커', grade: 'amateur', category: '터치라인 돌파', positionGroup: 'FW', price: 200, isDefault: false, icon: 'bolt', description: '측면 돌파 후 중앙 침투와 슛을 노리는 카드.' },
  { id: 'box-to-box', name: '산소탱크', grade: 'semi-pro', category: '전천후 엔진', positionGroup: 'MF', price: 200, isDefault: false, icon: 'gauge', description: '공수 양쪽을 왕복하며 팀 에너지를 끌어올리는 카드.' },
  { id: 'destroyer', name: '하드 워커', grade: 'semi-pro', category: '터프 압박 수비', positionGroup: 'MF', price: 200, isDefault: false, icon: 'swords', description: '강한 압박과 몸싸움으로 상대 공격을 끊는 카드.' },
  { id: 'cross-specialist', name: '크로스 플레이어', grade: 'amateur', category: '측면 배달', positionGroup: 'MF', price: 200, isDefault: false, icon: 'target', description: '측면에서 정확한 크로스로 찬스를 만드는 카드.' },
  { id: 'line-breaker', name: '라인 브레이커', grade: 'pro', category: '침투형 공격', positionGroup: 'FW', price: 250, isDefault: false, icon: 'moveDiagonal', description: '최종 수비 라인을 무너뜨리고 뒷공간으로 침투하는 카드.' },
  { id: 'fox-in-the-box', name: '박스 안의 여우', grade: 'pro', category: '피니셔', positionGroup: 'FW', price: 250, isDefault: false, icon: 'target', description: '박스 안 위치 선정과 슛 감각으로 마무리하는 카드.' },
  { id: 'roaming-flank', name: '인사이드 리시버', grade: 'pro', category: '컷인 플레이', positionGroup: 'FW', price: 250, isDefault: false, icon: 'moveDiagonal', description: '측면에서 중앙 하프스페이스로 좁혀 들어오는 카드.' },
  { id: 'creative-pm', name: '찬스 메이커', grade: 'pro', category: '기회 창출', positionGroup: 'FW', price: 250, isDefault: false, icon: 'sparkles', description: '공격 전역에서 창의적인 라스트 패스를 만드는 카드.' },
  { id: 'fb-finisher', name: '인사이드 사이드백', grade: 'pro', category: '하프스페이스 타격', positionGroup: 'DF', price: 250, isDefault: false, icon: 'rocket', description: '측면 대신 안쪽 공간으로 파고드는 변칙 풀백 카드.' },
  { id: 'hole-player', name: '2선 침투', grade: 'pro', category: '기습 침투', positionGroup: 'MF', price: 300, isDefault: false, icon: 'bolt', description: '미드필더 라인에서 빈 공간으로 폭발적으로 침투하는 카드.' },
  { id: 'orchestrator', name: '플레이메이커', grade: 'pro', category: '경기 조율', positionGroup: 'MF', price: 300, isDefault: false, icon: 'radar', description: '하프라인 부근에서 패스로 경기 속도를 조율하는 카드.' },
  { id: 'captaincy', name: '통솔력', grade: 'legend', category: '리더 패시브', positionGroup: 'ALL', price: 400, isDefault: false, icon: 'crown', description: '그라운드 위의 사령관처럼 팀 중심을 잡는 레전드 카드.' },
  { id: 'fighting-spirit', name: '투지', grade: 'legend', category: '강철 정신력', positionGroup: 'ALL', price: 400, isDefault: false, icon: 'flame', description: '압박과 피로 속에서도 집중력을 유지하는 레전드 카드.' },
  { id: 'super-sub', name: '슈퍼 조커', grade: 'legend', category: '흐름 체인저', positionGroup: 'ALL', price: 450, isDefault: false, icon: 'bolt', description: '후반 흐름을 바꾸는 임팩트를 상징하는 레전드 카드.' },
];

export const PURCHASABLE_TRAITS = TRAIT_CATALOG.filter((trait) => !trait.isDefault);

export function findTraitById(traitId: string | null | undefined) {
  if (!traitId) return null;
  return TRAIT_CATALOG.find((trait) => trait.id === traitId) ?? null;
}

export function getDefaultTraitForProfile(position: Position, stats: UserStats) {
  if (position === 'GK') {
    return stats.speed >= stats.defense ? findTraitById('off-gk')! : findTraitById('def-gk')!;
  }
  if (position === 'FW') {
    return stats.attack >= stats.stamina ? findTraitById('target-man')! : findTraitById('prolific-winger')!;
  }
  if (position === 'DF') {
    if (stats.attack >= stats.defense + 8) return findTraitById('off-fullback')!;
    if (stats.defense >= stats.attack + 8) return findTraitById('def-fullback')!;
    return findTraitById('build-up-df')!;
  }

  const highestKey = STAT_KEYS.reduce((best, key) => (stats[key] > stats[best] ? key : best), STAT_KEYS[0]);
  if (highestKey === 'defense') return findTraitById('anchor-man')!;
  if (highestKey === 'stamina') return findTraitById('box-to-box')!;
  return findTraitById('classic-no10')!;
}

export function getTraitGradeLabel(grade: TraitGrade) {
  if (grade === 'legend') return '레전드';
  if (grade === 'pro') return '프로';
  if (grade === 'semi-pro') return '세미프로';
  return '아마추어';
}

export function getTraitGradeClasses(grade: TraitGrade) {
  if (grade === 'legend') return 'border-tier-gold-border bg-tier-gold-bg text-tier-gold';
  if (grade === 'pro') return 'border-tier-special bg-tier-special-bg text-tier-special';
  if (grade === 'semi-pro') return 'border-tier-silver-border bg-tier-silver-bg text-tier-silver';
  return 'border-tier-bronze-border bg-tier-bronze-bg text-tier-bronze';
}
