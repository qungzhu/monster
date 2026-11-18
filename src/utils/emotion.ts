import type { MoodType } from '../data/characters';

const emotionKeywords: Record<MoodType, string[]> = {
  happy: ['开心', '高兴', '快乐', '哈哈', '嘻嘻', '太棒', '好开心', '幸福', '甜', '爱', '喜欢', '好的', '嗯嗯', '棒', '好耶', '恋爱', 'happy', 'love', 'good', 'great', 'nice', 'wonderful', 'amazing', '谢谢', '感谢', '❤', '😊', '😄', '🥰', '开心死了', '太好了'],
  sad: ['难过', '伤心', '哭', '心痛', '失落', '不开心', '沮丧', '遗憾', '可惜', '唉', '悲伤', 'sad', 'cry', 'hurt', '想哭', '好难过', '心碎', '分手', '失去', '😢', '😭', '💔'],
  angry: ['生气', '愤怒', '烦死', '讨厌', '可恶', '气死', '烦', '恼火', '抓狂', 'angry', 'mad', 'hate', '受不了', '太过分', '混蛋', '无语', '😤', '😡', '🤬'],
  anxious: ['焦虑', '紧张', '担心', '害怕', '恐惧', '不安', '压力', '崩溃', '慌', '怕', 'anxious', 'worried', 'afraid', 'stress', '怎么办', '完了', '来不及', '考试', '面试', '😰', '😨'],
  lonely: ['孤独', '孤单', '寂寞', '一个人', '没人', '想你', '陪我', 'lonely', 'alone', 'miss', '好想', '无聊', '空虚', '冷清', '🥺', '😔'],
  neutral: [],
};

// Negation right before a keyword ("不开心", "没有生气", "一点都不开心")
// or right after it ("开心不起来"). "不是不…" is a double negative.
const NEGATED_BEFORE = /(不|没|没有|别|毫不|并不|不太|不怎么|一点(都|也)不|不是)$/;
const DOUBLE_NEGATIVE_BEFORE = /不是不$/;
const NEGATED_AFTER = /^(不起来|不了|不太起来)/;

function isNegated(text: string, index: number, keyword: string): boolean {
  const before = text.slice(Math.max(0, index - 4), index);
  const after = text.slice(index + keyword.length, index + keyword.length + 4);
  if (NEGATED_AFTER.test(after)) return true;
  if (DOUBLE_NEGATIVE_BEFORE.test(before)) return false;
  return NEGATED_BEFORE.test(before);
}

/**
 * Offline emotion guess from keywords. The AI reply carries the model's
 * own reading of the emotion (see server/index.js), which wins when present;
 * this is the fallback when there is no model.
 *
 * A negated happy word counts as sad ("一点都不开心"); a negated negative
 * word counts for nothing ("我没有生气").
 */
export function detectEmotion(text: string): MoodType {
  const lowerText = text.toLowerCase();
  const scores: Partial<Record<MoodType, number>> = {};

  for (const [mood, keywords] of Object.entries(emotionKeywords) as [MoodType, string[]][]) {
    if (mood === 'neutral') continue;
    for (const keyword of keywords) {
      const k = keyword.toLowerCase();
      let i = lowerText.indexOf(k);
      while (i !== -1) {
        if (!isNegated(lowerText, i, k)) {
          scores[mood] = (scores[mood] ?? 0) + 1;
        } else if (mood === 'happy') {
          scores.sad = (scores.sad ?? 0) + 1;
        }
        i = lowerText.indexOf(k, i + k.length);
      }
    }
  }

  let detected: MoodType | null = null;
  let maxScore = 0;
  for (const [mood, score] of Object.entries(scores) as [MoodType, number][]) {
    if (score > maxScore) {
      maxScore = score;
      detected = mood;
    }
  }
  return detected ?? ('default' as MoodType);
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}
