import type { MoodType } from '../data/characters';

const emotionKeywords: Record<MoodType, string[]> = {
  happy: ['开心', '高兴', '快乐', '哈哈', '嘻嘻', '太棒', '好开心', '幸福', '甜', '爱', '喜欢', '好的', '嗯嗯', '棒', '好耶', '恋爱', 'happy', 'love', 'good', 'great', 'nice', 'wonderful', 'amazing', '谢谢', '感谢', '❤', '😊', '😄', '🥰', '开心死了', '太好了'],
  sad: ['难过', '伤心', '哭', '心痛', '失落', '不开心', '沮丧', '遗憾', '可惜', '唉', '悲伤', 'sad', 'cry', 'hurt', '想哭', '好难过', '心碎', '分手', '失去', '😢', '😭', '💔'],
  angry: ['生气', '愤怒', '烦死', '讨厌', '可恶', '气死', '烦', '恼火', '抓狂', 'angry', 'mad', 'hate', '受不了', '太过分', '混蛋', '无语', '😤', '😡', '🤬'],
  anxious: ['焦虑', '紧张', '担心', '害怕', '恐惧', '不安', '压力', '崩溃', '慌', '怕', 'anxious', 'worried', 'afraid', 'stress', '怎么办', '完了', '来不及', '考试', '面试', '😰', '😨'],
  lonely: ['孤独', '孤单', '寂寞', '一个人', '没人', '想你', '陪我', 'lonely', 'alone', 'miss', '好想', '无聊', '空虚', '冷清', '🥺', '😔'],
  neutral: [],
};

export function detectEmotion(text: string): MoodType {
  const lowerText = text.toLowerCase();
  let maxScore = 0;
  let detected: MoodType = 'neutral';

  for (const [mood, keywords] of Object.entries(emotionKeywords)) {
    if (mood === 'neutral') continue;
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      detected = mood as MoodType;
    }
  }

  return detected === 'neutral' && maxScore === 0 ? 'default' as MoodType : detected;
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}
