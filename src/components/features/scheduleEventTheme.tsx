'use client';

import type { ElementType } from 'react';
import { Beer, Guitar, Tent, Vote } from 'lucide-react';
import FootballIcon from '@/components/ui/FootballIcon';
import type { EventType } from '@/types';

export type ScheduleEventThemeType = EventType | 'poll';

type IconComponent = ElementType<{ size?: number; className?: string; strokeWidth?: number }>;

export type ScheduleEventTheme = {
  type: Exclude<ScheduleEventThemeType, 'vote_match'>;
  label: string;
  title: string;
  badge: string;
  Icon: IconComponent;
  markerClassName: string;
  legendClassName: string;
  cardClassName: string;
  iconClassName: string;
  detailClassName: string;
  mapAccentClassName: string;
  badgeClassName: string;
  comment: {
    border: string;
    bg: string;
    text: string;
    iconBg: string;
    iconText: string;
    inputFocus: string;
    sendButtonBg: string;
    sendButtonHover: string;
  };
};

const themes = {
  match: {
    type: 'match',
    label: '경기',
    title: '경기',
    badge: '경기',
    Icon: FootballIcon,
    markerClassName: 'bg-event-match-icon-bg text-event-match-icon-text',
    legendClassName: 'bg-event-match-icon-bg text-event-match-icon-text',
    cardClassName: 'border-event-match-border bg-event-match-bg',
    iconClassName: 'bg-event-match-icon-bg text-event-match-icon-text',
    detailClassName: 'border-event-match-detail-border bg-white/78',
    mapAccentClassName: 'bg-event-match-map-accent text-white',
    badgeClassName: 'bg-event-match-icon-bg text-event-match-icon-text',
    comment: {
      border: 'border-event-match-border',
      bg: 'bg-event-match-bg',
      text: 'text-event-match-text',
      iconBg: 'bg-event-match-icon-bg',
      iconText: 'text-event-match-icon-text',
      inputFocus: 'focus-within:border-event-match-meta-icon focus-within:ring-event-match-meta-icon',
      sendButtonBg: 'bg-event-match-meta-icon',
      sendButtonHover: 'hover:brightness-110',
    },
  },
  poll: {
    type: 'poll',
    label: '투표중',
    title: '투표',
    badge: '투표중',
    Icon: Vote,
    markerClassName: 'bg-event-vote-icon-bg text-event-vote-icon-text',
    legendClassName: 'bg-event-vote-icon-bg text-event-vote-icon-text',
    cardClassName: 'border-event-vote-border bg-event-vote-bg',
    iconClassName: 'bg-event-vote-icon-bg text-event-vote-icon-text',
    detailClassName: 'border-event-vote-detail-border bg-white/78',
    mapAccentClassName: 'bg-event-vote-map-accent text-white',
    badgeClassName: 'bg-event-vote-icon-bg text-event-vote-icon-text',
    comment: {
      border: 'border-event-vote-border',
      bg: 'bg-event-vote-bg',
      text: 'text-event-vote-text',
      iconBg: 'bg-event-vote-icon-bg',
      iconText: 'text-event-vote-icon-text',
      inputFocus: 'focus-within:border-event-vote-meta-icon focus-within:ring-event-vote-meta-icon',
      sendButtonBg: 'bg-event-vote-meta-icon',
      sendButtonHover: 'hover:brightness-110',
    },
  },
  training: {
    type: 'training',
    label: '전지훈련',
    title: '전지훈련',
    badge: '훈련',
    Icon: Tent,
    markerClassName: 'bg-event-training-icon-bg text-event-training-icon-text',
    legendClassName: 'bg-event-training-icon-bg text-event-training-icon-text',
    cardClassName: 'border-event-training-border bg-event-training-bg',
    iconClassName: 'bg-event-training-icon-bg text-event-training-icon-text',
    detailClassName: 'border-event-training-detail-border bg-white/78',
    mapAccentClassName: 'bg-event-training-map-accent text-white',
    badgeClassName: 'bg-event-training-icon-bg text-event-training-icon-text',
    comment: {
      border: 'border-event-training-border',
      bg: 'bg-event-training-bg',
      text: 'text-event-training-text',
      iconBg: 'bg-event-training-icon-bg',
      iconText: 'text-event-training-icon-text',
      inputFocus: 'focus-within:border-event-training-meta-icon focus-within:ring-event-training-meta-icon',
      sendButtonBg: 'bg-event-training-meta-icon',
      sendButtonHover: 'hover:brightness-110',
    },
  },
  seminar: {
    type: 'seminar',
    label: '정신교육',
    title: '정신교육',
    badge: '교육',
    Icon: Beer,
    markerClassName: 'bg-event-seminar-icon-bg text-event-seminar-icon-text',
    legendClassName: 'bg-event-seminar-icon-bg text-event-seminar-icon-text',
    cardClassName: 'border-event-seminar-border bg-event-seminar-bg',
    iconClassName: 'bg-event-seminar-icon-bg text-event-seminar-icon-text',
    detailClassName: 'border-event-seminar-detail-border bg-white/78',
    mapAccentClassName: 'bg-event-seminar-map-accent text-white',
    badgeClassName: 'bg-event-seminar-icon-bg text-event-seminar-icon-text',
    comment: {
      border: 'border-event-seminar-border',
      bg: 'bg-event-seminar-bg',
      text: 'text-event-seminar-text',
      iconBg: 'bg-event-seminar-icon-bg',
      iconText: 'text-event-seminar-icon-text',
      inputFocus: 'focus-within:border-event-seminar-meta-icon focus-within:ring-event-seminar-meta-icon',
      sendButtonBg: 'bg-event-seminar-meta-icon',
      sendButtonHover: 'hover:brightness-110',
    },
  },
  etc: {
    type: 'etc',
    label: '기타',
    title: '기타 일정',
    badge: '기타',
    Icon: Guitar,
    markerClassName: 'bg-event-etc-icon-bg text-event-etc-icon-text',
    legendClassName: 'bg-event-etc-icon-bg text-event-etc-icon-text',
    cardClassName: 'border-event-etc-border bg-event-etc-bg',
    iconClassName: 'bg-event-etc-icon-bg text-event-etc-icon-text',
    detailClassName: 'border-event-etc-detail-border bg-white/78',
    mapAccentClassName: 'bg-event-etc-map-accent text-white',
    badgeClassName: 'bg-event-etc-icon-bg text-event-etc-icon-text',
    comment: {
      border: 'border-event-etc-border',
      bg: 'bg-event-etc-bg',
      text: 'text-event-etc-text',
      iconBg: 'bg-event-etc-icon-bg',
      iconText: 'text-event-etc-icon-text',
      inputFocus: 'focus-within:border-event-etc-meta-icon focus-within:ring-event-etc-meta-icon',
      sendButtonBg: 'bg-event-etc-meta-icon',
      sendButtonHover: 'hover:brightness-110',
    },
  },
} satisfies Record<Exclude<ScheduleEventThemeType, 'vote_match'>, ScheduleEventTheme>;

export const scheduleEventLegendTypes = ['match', 'poll', 'seminar', 'training', 'etc'] as const;
export const manualScheduleEventTypes = ['match', 'training', 'seminar', 'etc'] as const;

export function getScheduleEventTheme(type: ScheduleEventThemeType): ScheduleEventTheme {
  return themes[type === 'vote_match' ? 'poll' : type];
}
