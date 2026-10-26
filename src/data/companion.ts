import type { Repeat } from '../../shared/recurrence';

export type CompanionRole = 'friend' | 'butler' | 'assistant' | 'teacher';
export type LifeItemType = 'todo' | 'package' | 'weight' | 'study' | 'mood';

export interface LifeItem {
  id: string;
  type: LifeItemType;
  title: string;
  detail?: string;
  createdAt: string;
  completed: boolean;
  /** When to remind (ISO). */
  due?: string;
  /** Set once the pet has reminded the owner (one-off items). */
  remindedAt?: string;
  /** Repeating reminder; `due` always holds the next occurrence. */
  repeat?: Repeat;
}

export interface AgentRun {
  id: string;
  command: string;
  summary: string;
  createdAt: string;
}

export const companionRoles: Record<CompanionRole, {
  label: string;
  emoji: string;
  description: string;
}> = {
  friend: { label: '朋友', emoji: '💛', description: '陪你聊天，也记得你的心情' },
  butler: { label: '管家', emoji: '🗓️', description: '照看日程、快递和生活提醒' },
  assistant: { label: '助手', emoji: '✅', description: '整理工作与今天的待办事项' },
  teacher: { label: '老师', emoji: '📚', description: '陪你学习、复习和持续进步' },
};

export const lifeItemMeta: Record<LifeItemType, { label: string; emoji: string }> = {
  todo: { label: '待办', emoji: '✅' },
  package: { label: '快递', emoji: '📦' },
  weight: { label: '体重', emoji: '⚖️' },
  study: { label: '学习', emoji: '📚' },
  mood: { label: '心情', emoji: '💭' },
};

export function parseLifeCommand(text: string): Omit<LifeItem, 'id' | 'createdAt' | 'completed'> | null {
  const weight = text.match(/(?:记录|今天|我的)?体重(?:是|为|：|:)?\s*(\d+(?:\.\d+)?)\s*(?:公斤|千克|kg|KG)?/);
  if (weight) return { type: 'weight', title: `体重 ${weight[1]} kg`, detail: text };

  if (/快递|取件|包裹/.test(text)) {
    return { type: 'package', title: text.replace(/^(帮我|请|记录一下|记录|提醒我)\s*/, '') };
  }
  if (/学习|复习|背单词|看书|课程|刷题/.test(text)) {
    return { type: 'study', title: text.replace(/^(帮我|请|记录一下|记录|提醒我)\s*/, '') };
  }
  if (/待办|提醒我|记得|别忘了|要做/.test(text)) {
    return { type: 'todo', title: text.replace(/^(帮我|请|添加待办|待办|提醒我|记得)\s*/, '') };
  }
  return null;
}
