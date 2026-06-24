'use client';

import { ChevronLeft, ChevronRight, Vote } from 'lucide-react';
import { useState } from 'react';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { isHoliday } from 'korean-holidays';
import { getScheduleEventTheme, scheduleEventLegendTypes } from './scheduleEventTheme';

export interface CalendarEvent {
  day: number;
  date?: string;
  type: 'match' | 'training' | 'seminar' | 'etc' | 'poll';
}

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
          className="p-1 hover:text-primary active:scale-90 transition-all text-tertiary"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-bold text-primary tracking-tight">{monthLabel}</h2>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="다음 달"
          className="p-1 hover:text-primary active:scale-90 transition-all text-tertiary"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`text-[11px] font-bold ${i === 0 ? 'text-result-loss' : i === 6 ? 'text-pos-df' : 'text-tertiary'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-sm font-medium">
        {leadingBlanks.map((key) => (
          <div key={key} aria-hidden="true" className="h-11 w-8" />
        ))}
        {days.map((d) => {
          const dayEvents = events.filter((e) => (
            e.day === d && isEventInVisibleMonth(e, year, monthIndex)
          ));
          const markerTypes = getMarkerEventTypes(dayEvents);
          const isSelected = selectedDates.includes(d);
          
          const dateObj = new Date(year, monthIndex, d);
          const dayOfWeek = dateObj.getDay();
          const isRedDay = dayOfWeek === 0 || isHoliday(dateObj);
          const isBlueDay = dayOfWeek === 6 && !isRedDay;
          
          const textColor = isSelected
            ? 'text-[#00ffa3]'
            : isRedDay
            ? 'text-result-loss'
            : isBlueDay
            ? 'text-pos-df'
            : 'text-primary';

          const dayBgClassName = isSelected
            ? '-skew-x-12 border border-[#00ffa3] bg-black/40 shadow-[0_0_10px_rgba(0,255,163,0.5)] font-bold'
            : 'rounded-full hover:bg-surface-hover';

          return (
            <button
              type="button"
              key={d}
              onClick={() => handleSelect(d)}
              aria-label={`${monthIndex + 1}월 ${d}일${dayEvents.length > 0 ? `, ${dayEvents.length}개 일정` : ''}`}
              aria-pressed={isSelected}
              className="relative mx-auto flex h-11 w-8 cursor-pointer flex-col items-center justify-start transition-all duration-200"
            >
              <span className={`flex h-8 w-8 items-center justify-center transition-all ${dayBgClassName} ${textColor}`}>
                {d}
              </span>
              {markerTypes.length > 0 ? (
                <span className="mt-1 flex h-1.5 items-center justify-center gap-1" aria-hidden="true">
                  {markerTypes.map((type) => {
                    let dotColorClass = 'bg-[#00ffa3] shadow-[0_0_6px_rgba(0,255,163,0.8)]';
                    if (type === 'poll') {
                      dotColorClass = 'bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.8)]';
                    } else if (type === 'training') {
                      dotColorClass = 'bg-[#c084fc] shadow-[0_0_6px_rgba(192,132,252,0.8)]';
                    } else if (type === 'seminar') {
                      dotColorClass = 'bg-[#f97316] shadow-[0_0_6px_rgba(249,115,22,0.8)]';
                    } else if (type === 'etc') {
                      dotColorClass = 'bg-[#9ca3af] shadow-[0_0_6px_rgba(156,163,175,0.8)]';
                    }
                    return (
                      <span
                        key={type}
                        className={`h-1.5 w-1.5 rounded-full ${dotColorClass} animate-pulse`}
                      />
                    );
                  })}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {!hideLegend && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border text-[10px] text-tertiary font-medium justify-center flex-wrap">
          {scheduleEventLegendTypes.map((type) => {
            const meta = getScheduleEventTheme(type);
            const Icon = meta.Icon || Vote;
            return (
              <div key={type} className="flex items-center gap-1">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full ${meta.legendClassName}`}>
                  <Icon aria-hidden="true" size={9} />
                </span>
                <span>{meta.label}</span>
              </div>
            );
          })}
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

function getMarkerEventTypes(events: CalendarEvent[]) {
  const priority: CalendarEvent['type'][] = ['match', 'poll', 'seminar', 'training', 'etc'];
  return priority.filter((type) => events.some((event) => event.type === type)).slice(0, 3);
}
