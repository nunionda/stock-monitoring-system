'use client';

import { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
} from 'date-fns';

interface CalendarProps {
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    entryDates: Date[];
}

export default function Calendar({ selectedDate, onDateSelect, entryDates }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const hasEntry = (day: Date) => {
        return entryDates.some((date) => isSameDay(date, day));
    };

    return (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-serif font-bold text-stone-900">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex space-x-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-stone-50 rounded-full transition-colors text-stone-400 hover:text-stone-900"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-stone-50 rounded-full transition-colors text-stone-400 hover:text-stone-900"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="text-center text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());
                    const hasDiary = hasEntry(day);

                    return (
                        <button
                            key={idx}
                            onClick={() => onDateSelect(day)}
                            className={`
                relative h-10 w-full flex items-center justify-center rounded-lg text-sm transition-all
                ${!isCurrentMonth ? 'text-stone-200' : 'text-stone-600'}
                ${isSelected ? 'bg-stone-900 !text-white' : 'hover:bg-stone-50'}
                ${isToday && !isSelected ? 'text-stone-900 font-bold underline decoration-2' : ''}
              `}
                        >
                            {format(day, 'd')}
                            {hasDiary && !isSelected && (
                                <span className="absolute bottom-1 w-1 h-1 bg-stone-300 rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
