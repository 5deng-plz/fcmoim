import type { SchedulePoll, SchedulePollOption } from '@/stores/schedulePollClient';
import type { UpcomingMatch } from '@/stores/matchClient';
import type { CalendarEvent } from './CalendarView';

export function buildPollCalendarEvents(polls: SchedulePoll[] | unknown): CalendarEvent[] {
  if (!Array.isArray(polls)) {
    return [];
  }

  return polls.flatMap((poll) => (
    Array.isArray(poll.options) ? poll.options.flatMap((option: SchedulePollOption) => {
      const day = Number(option.optionDate.split('-')[2]);

      if (!Number.isInteger(day) || day < 1 || day > 31) {
        return [];
      }

      return [{
        day,
        date: option.optionDate,
        type: 'poll' as const,
      }];
    }) : []
  ));
}

export function buildMatchCalendarEvents(matches: UpcomingMatch[] | unknown): CalendarEvent[] {
  if (!Array.isArray(matches)) {
    return [];
  }

  return matches.flatMap((match) => {
    const date = match.date.slice(0, 10);
    const day = Number(date.split('-')[2]);

    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return [];
    }

    return [{
      day,
      date,
      type: match.type === 'vote_match' ? 'match' : match.type,
    }];
  });
}
