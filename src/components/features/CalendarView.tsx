'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { isHoliday } from 'korean-holidays';

interface CalendarEvent {
  day: number;
  type: 'match' | 'training' | 'seminar' | 'etc' | 'poll';
}

const events: CalendarEvent[] = [
  { day: 7, type: 'match' },
  { day: 14, type: 'match' },
  { day: 15, type: 'match' },
  { day: 21, type: 'poll' },
  { day: 22, type: 'poll' },
  { day: 22, type: 'training' },
  { day: 28, type: 'seminar' },
];

const dotColor: Record<string, string> = {
  match: 'bg-green-500',
  training: 'bg-orange-500',
  seminar: 'bg-purple-500',
  etc: 'bg-gray-500',
  poll: 'bg-yellow-500',
};

interface CalendarViewProps {
  value?: number | number[];
  onChange?: (val: number) => void;
  onChangeMulti?: (val: number[]) => void;
  hideLegend?: boolean;
  isMulti?: boolean;
  maxSelections?: number;
}

export default function CalendarView({
  value,
  onChange,
  onChangeMulti,
  hideLegend = false,
  isMulti = false,
  maxSelections,
}: CalendarViewProps) {
  const scheduleStore = useScheduleStore();
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  const selectedDates = value !== undefined 
    ? (Array.isArray(value) ? value : [value])
    : [scheduleStore.selectedDate];

  const handleSelect = (day: number) => {
    if (isMulti) {
      if (onChangeMulti) {
        const currentVals = Array.isArray(value) ? value : [];
        if (currentVals.includes(day)) {
          onChangeMulti(currentVals.filter((d) => d !== day));
        } else {
          if (maxSelections && currentVals.length >= maxSelections) return;
          onChangeMulti([...currentVals, day]);
        }
      }
    } else {
      if (onChange) onChange(day);
      else scheduleStore.setSelectedDate(day);
    }
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
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`text-[11px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-sm font-medium">
        {days.map((d) => {
          const dayEvents = events.filter((e) => e.day === d);
          const isSelected = selectedDates.includes(d);
          
          const dateObj = new Date(2026, 2, d); // 2026년 3월
          const dayOfWeek = dateObj.getDay();
          const isRedDay = dayOfWeek === 0 || isHoliday(dateObj);
          const isBlueDay = dayOfWeek === 6 && !isRedDay;
          
          const textColor = isSelected
            ? 'text-white'
            : isRedDay
            ? 'text-red-500'
            : isBlueDay
            ? 'text-blue-500'
            : 'text-gray-700';

          return (
            <button
              type="button"
              key={d}
              onClick={() => handleSelect(d)}
              aria-label={`3월 ${d}일${dayEvents.length > 0 ? `, ${dayEvents.length}개 일정` : ''}`}
              aria-pressed={isSelected}
              className={`relative flex justify-center items-center h-8 w-8 mx-auto rounded-full transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-gray-900 font-bold'
                  : 'hover:bg-gray-100'
              } ${textColor}`}
            >
              {d}
              {dayEvents.length > 0 && (
                <div className="absolute bottom-0 flex gap-0.5">
                  {dayEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${dotColor[event.type]}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!hideLegend && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50 text-[10px] text-gray-400 font-medium justify-center flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>경기</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>전지훈련</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>정신교육</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            <span>기타</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span>투표중</span>
          </div>
        </div>
      )}
    </section>
  );
}
