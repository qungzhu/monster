import { motion } from 'framer-motion';
import { PawPrint } from 'lucide-react';

interface IntimacyBarProps {
  level: number;
  maxLevel: number;
}

function getIntimacyTitle(level: number): string {
  if (level < 20) return '初见';
  if (level < 40) return '熟悉';
  if (level < 60) return '信任';
  if (level < 80) return '依赖';
  return '最佳拍档';
}

export function IntimacyBar({ level, maxLevel }: IntimacyBarProps) {
  const percentage = (level / maxLevel) * 100;
  const title = getIntimacyTitle(level);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <PawPrint size={14} style={{ color: 'var(--char-primary, #d97706)' }} fill="currentColor" />
          <span className="text-xs text-text-secondary">{title}</span>
        </div>
        <span className="text-xs text-text-muted">{level}/{maxLevel}</span>
      </div>
      <div className="w-full h-2 bg-surface-lighter rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--char-gradient, linear-gradient(135deg, #e91e8c, #ff6eb4))' }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
