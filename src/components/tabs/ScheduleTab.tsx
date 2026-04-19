'use client';

import CalendarView from '@/components/features/CalendarView';
import MatchStatus from '@/components/features/MatchStatus';
import { useScheduleStore } from '@/stores/useScheduleStore';

export default function ScheduleTab() {
  const { selectedDate } = useScheduleStore();

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <CalendarView />
      {selectedDate === 7 && <MatchStatus status="종료" />}
      {selectedDate === 14 && <MatchStatus status="종료" />}
      {selectedDate === 15 && <MatchStatus status="라커룸" />}
      {selectedDate === 21 && <MatchStatus status="예정" type="vote_match" />}
      {selectedDate === 22 && <MatchStatus status="예정" type="training" />}
      {selectedDate === 28 && <MatchStatus status="예정" type="seminar" />}
    </div>
  );
}
