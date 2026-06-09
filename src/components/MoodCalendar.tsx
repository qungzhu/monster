import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { MoodEntry, MoodType } from '../data/characters';
import { moodEmojis, moodColors } from '../data/characters';

interface MoodCalendarProps {
  entries: MoodEntry[];
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function MoodCalendar({ entries }: MoodCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);

  const { year, month, days, firstDayOffset, monthLabel } = useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const y = target.getFullYear();
    const m = target.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let firstDay = new Date(y, m, 1).getDay();
    if (firstDay === 0) firstDay = 7; // Monday-based
    return {
      year: y,
      month: m,
      days: daysInMonth,
      firstDayOffset: firstDay - 1,
      monthLabel: `${y}年${m + 1}月`,
    };
  }, [monthOffset]);

  const moodMap = useMemo(() => {
    const map: Record<string, MoodType> = {};
    entries.forEach(entry => {
      const d = new Date(entry.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = entry.mood;
    });
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDayOffset; i++) result.push(null);
    for (let d = 1; d <= days; d++) result.push(d);
    return result;
  }, [firstDayOffset, days]);

  const today = new Date();
  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  return (
    <div className="glass rounded-2xl p-4">
      {/* Month Nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonthOffset(prev => prev - 1)}
          className="p-1.5 rounded-lg hover:bg-surface-lighter transition-colors"
        >
          <ChevronLeft size={16} className="text-text-muted" />
        </button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <button
          onClick={() => setMonthOffset(prev => Math.min(prev + 1, 0))}
          disabled={monthOffset >= 0}
          className="p-1.5 rounded-lg hover:bg-surface-lighter transition-colors disabled:opacity-30"
        >
          <ChevronRight size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-[10px] text-text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const key = `${year}-${month}-${day}`;
          const mood = moodMap[key];

          return (
            <motion.div
              key={`${key}-${day}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.01 }}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs relative ${
                isToday(day) ? 'ring-1 ring-primary-light/50' : ''
              }`}
              style={mood ? {
                background: `${moodColors[mood]}22`,
                boxShadow: `inset 0 0 8px ${moodColors[mood]}15`,
              } : undefined}
            >
              {mood ? (
                <span className="text-sm" title={day.toString()}>
                  {moodEmojis[mood]}
                </span>
              ) : (
                <span className={`text-[11px] ${isToday(day) ? 'text-primary-light font-bold' : 'text-text-muted'}`}>
                  {day}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
