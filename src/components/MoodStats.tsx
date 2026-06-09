import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp } from 'lucide-react';
import type { MoodEntry, MoodType } from '../data/characters';
import { moodEmojis, moodLabels, moodColors } from '../data/characters';

interface MoodStatsProps {
  entries: MoodEntry[];
}

const ALL_MOODS: MoodType[] = ['happy', 'sad', 'angry', 'anxious', 'lonely', 'neutral'];

export function MoodStats({ entries }: MoodStatsProps) {
  const weeklyStats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weekEntries = entries.filter(e => new Date(e.date).getTime() > weekAgo);
    return computeStats(weekEntries);
  }, [entries]);

  const monthlyStats = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const monthEntries = entries.filter(e => new Date(e.date).getTime() > monthAgo);
    return computeStats(monthEntries);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      <StatsCard title="近7天心情" icon={<TrendingUp size={14} />} stats={weeklyStats} />
      <StatsCard title="近30天心情" icon={<BarChart3 size={14} />} stats={monthlyStats} />
    </div>
  );
}

interface Stats {
  total: number;
  counts: Record<MoodType, number>;
  dominant: MoodType | null;
}

function computeStats(entries: MoodEntry[]): Stats {
  const counts: Record<MoodType, number> = {
    happy: 0, sad: 0, angry: 0, anxious: 0, lonely: 0, neutral: 0,
  };
  entries.forEach(e => {
    if (counts[e.mood] !== undefined) counts[e.mood]++;
  });
  let dominant: MoodType | null = null;
  let max = 0;
  for (const [mood, count] of Object.entries(counts)) {
    if (count > max) { max = count; dominant = mood as MoodType; }
  }
  return { total: entries.length, counts, dominant };
}

function StatsCard({ title, icon, stats }: { title: string; icon: React.ReactNode; stats: Stats }) {
  const maxCount = Math.max(...Object.values(stats.counts), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2 text-text-primary">
          {icon}
          {title}
        </h3>
        {stats.dominant && (
          <span className="text-xs text-text-muted">
            主要情绪: {moodEmojis[stats.dominant]} {moodLabels[stats.dominant]}
          </span>
        )}
      </div>

      {stats.total === 0 ? (
        <p className="text-xs text-text-muted text-center py-3">暂无记录</p>
      ) : (
        <div className="space-y-2">
          {ALL_MOODS.map(mood => {
            const count = stats.counts[mood];
            if (count === 0) return null;
            const pct = (count / maxCount) * 100;
            return (
              <div key={mood} className="flex items-center gap-2">
                <span className="text-sm w-6 text-center">{moodEmojis[mood]}</span>
                <span className="text-[10px] text-text-muted w-8">{moodLabels[mood]}</span>
                <div className="flex-1 h-4 bg-surface-lighter rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full flex items-center justify-end pr-1.5"
                    style={{ background: moodColors[mood] + '88' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    {pct > 20 && (
                      <span className="text-[9px] text-white font-medium">{count}</span>
                    )}
                  </motion.div>
                </div>
                {pct <= 20 && (
                  <span className="text-[10px] text-text-muted w-4">{count}</span>
                )}
              </div>
            );
          })}
          <div className="text-right mt-1">
            <span className="text-[10px] text-text-muted">共 {stats.total} 条记录</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
