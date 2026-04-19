'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useScheduleStore } from '@/stores/useScheduleStore';

interface CalendarEvent {
  day: number;
  type: 'past_match' | 'upcoming_match' | 'vote_match' | 'training' | 'seminar' | 'etc';
}

const events: CalendarEvent[] = [
  { day: 7, type: 'past_match' },
  { day: 14, type: 'past_match' },
  { day: 15, type: 'upcoming_match' },
  { day: 21, type: 'vote_match' },
  { day: 22, type: 'training' },
  { day: 28, type: 'seminar' },
];

const dotColor: Record<string, string> = {
  past_match: 'bg-green-500',
  upcoming_match: 'bg-red-500',
  vote_match: 'bg-yellow-500',
  training: 'bg-blue-500',
  seminar: 'bg-purple-500',
  etc: 'bg-gray-400',
};

interface CalendarViewProps {
  value?: number;
  onChange?: (day: number) => void;
  hideLegend?: boolean;
}

export default function CalendarView({ value, onChange, hideLegend = false }: CalendarViewProps) {
  const scheduleStore = useScheduleStore();
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  const selectedDate = value !== undefined ? value : scheduleStore.selectedDate;
  const handleSelect = (day: number) => {
    if (onChange) onChange(day);
    else scheduleStore.setSelectedDate(day);
  };

  return (
    <section className="card p-5">
      <div className="flex justify-between items-center mb-4">
        <button className="p-1 hover:text-gray-900 active:scale-90 transition-all text-gray-400">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-bold text-gray-900 tracking-tight">2026년 3월</h2>
        <button className="p-1 hover:text-gray-900 active:scale-90 transition-all text-gray-400">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="text-[11px] font-bold text-gray-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-sm font-medium text-gray-700">
        <div className="text-transparent">0</div>
        <div className="text-transparent">0</div>
        {days.map((d) => {
          const event = events.find((e) => e.day === d);
          const isSelected = d === selectedDate;
          return (
            <div
              key={d}
              onClick={() => (onChange ? handleSelect(d) : event && handleSelect(d))}
              className={`relative flex justify-center items-center h-8 w-8 mx-auto rounded-full transition-all duration-200 ${
                isSelected
                  ? 'bg-gray-900 text-white font-bold'
                  : event || onChange
                    ? 'hover:bg-gray-100 cursor-pointer'
                    : ''
              }`}
            >
              {d}
              {event && (
                <div
                  className={`absolute bottom-0 w-1.5 h-1.5 rounded-full ${dotColor[event.type]}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {!hideLegend && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50 text-[10px] text-gray-400 font-medium justify-center flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>완료</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>예정</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span>투표</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>전지훈련</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>정신교육</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span>기타</span>
          </div>
        </div>
      )}
    </section>
  );
}
