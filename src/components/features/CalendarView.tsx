'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { isHoliday } from 'korean-holidays';

interface CalendarEvent {
  day: number;
  date?: string;
  type: 'match' | 'training' | 'seminar' | 'etc' | 'poll';
}

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
  events?: CalendarEvent[];
  monthDate?: Date;
  onMonthDateChange?: (date: Date) => void;
}

export default function CalendarView({
  value,
  onChange,
  onChangeMulti,
  hideLegend = false,
  isMulti = false,
  maxSelections,
  events = [],
  monthDate,
  onMonthDateChange,
}: CalendarViewProps) {
  const scheduleStore = useScheduleStore();
  const [internalMonthDate, setInternalMonthDate] = useState(() => startOfMonth(new Date()));
  const visibleMonth = startOfMonth(monthDate ?? internalMonthDate);
  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const monthLabel = `${year}년 ${monthIndex + 1}월`;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday }, (_, i) => `blank-${i}`);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
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

  const moveMonth = (direction: -1 | 1) => {
    const nextMonth = startOfMonth(new Date(year, monthIndex + direction, 1));
    if (onMonthDateChange) {
      onMonthDateChange(nextMonth);
      return;
    }
    setInternalMonthDate(nextMonth);
  };

  return (
    <section className="card p-5">
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label="이전 달"
          className="p-1 hover:text-gray-900 active:scale-90 transition-all text-gray-400"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-bold text-gray-900 tracking-tight">{monthLabel}</h2>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="다음 달"
          className="p-1 hover:text-gray-900 active:scale-90 transition-all text-gray-400"
        >
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
        {leadingBlanks.map((key) => (
          <div key={key} aria-hidden="true" className="h-8 w-8" />
        ))}
        {days.map((d) => {
          const dayEvents = events.filter((e) => (
            e.day === d && isEventInVisibleMonth(e, year, monthIndex)
          ));
          const isSelected = selectedDates.includes(d);
          
          const dateObj = new Date(year, monthIndex, d);
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
              aria-label={`${monthIndex + 1}월 ${d}일${dayEvents.length > 0 ? `, ${dayEvents.length}개 일정` : ''}`}
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isEventInVisibleMonth(event: CalendarEvent, year: number, monthIndex: number) {
  if (!event.date) {
    return true;
  }

  const [eventYear, eventMonth] = event.date.split('-').map(Number);
  return eventYear === year && eventMonth === monthIndex + 1;
}
