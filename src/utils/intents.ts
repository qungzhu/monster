import type { MoodType } from '../data/characters';
import { detectEmotion } from './emotion';

/**
 * The intent engine behind the AI-native interface: every user
 * utterance routes to either a direct action, a summoned card,
 * or free-form chat. No menus, no pages — language is the UI.
 */
export type IntentType =
  | 'feed'
  | 'pet'
  | 'play'
  | 'clean'
  | 'checkin'
  | 'quests'
  | 'shop'
  | 'adopt'
  | 'custom'
  | 'memories'
  | 'bond'
  | 'settings'
  | 'help'
  | 'mood'
  | 'chat';

export interface Intent {
  type: IntentType;
  /** For mood intent: the detected emotion */
  emotion?: MoodType;
  /** Original text to forward to chat when applicable */
  text: string;
}

const intentPatterns: Array<{ type: IntentType; patterns: RegExp }> = [
  { type: 'feed', patterns: /喂|吃的|吃饭|投食|零食|饿了吗|开饭/ },
  { type: 'pet', patterns: /摸摸|摸头|撸|抱抱|亲亲|rua/i },
  { type: 'play', patterns: /玩|接球|逗|游戏时间|遛/ },
  { type: 'clean', patterns: /洗澡|清洁|梳毛|刷毛|洗洗|干净/ },
  { type: 'checkin', patterns: /签到|打卡/ },
  { type: 'quests', patterns: /任务|挑战|今天要做|待办/ },
  { type: 'shop', patterns: /商店|购买|买东西|物品|背包|道具/ },
  { type: 'custom', patterns: /照片|照相|拍照|上传|定制|复刻|我家的?[猫狗宠]|自己的[猫狗宠]|专属/ },
  { type: 'adopt', patterns: /领养|换伙伴|新伙伴|换宠|图鉴|品种|其他宠物|别的宠物/ },
  { type: 'memories', patterns: /回忆|日记|历史|记录|日历|以前|心情统计/ },
  { type: 'bond', patterns: /档案|资料|羁绊|亲密度|成就|等级|我们的关系/ },
  { type: 'settings', patterns: /设置|api|清除数据|改名/i },
  { type: 'help', patterns: /帮助|能做什么|怎么玩|指令|功能/ },
];

/** Emotional words route to comfort + automatic mood journaling. */
const emotionalPattern = /难过|伤心|哭|委屈|沮丧|失落|开心|高兴|兴奋|太棒|生气|气死|烦死|焦虑|紧张|压力|害怕|孤独|寂寞|无聊|想你|累了|好累|疲惫/;

export function parseIntent(input: string): Intent {
  const text = input.trim();

  for (const { type, patterns } of intentPatterns) {
    if (patterns.test(text)) {
      return { type, text };
    }
  }

  if (emotionalPattern.test(text)) {
    const emotion = detectEmotion(text) as MoodType;
    return { type: 'mood', emotion, text };
  }

  return { type: 'chat', text };
}

/** Contextual quick-suggestion chips shown above the input. */
export function getSuggestions(opts: {
  hour: number;
  isCheckedIn: boolean;
  lowStat: 'hunger' | 'mood' | 'cleanliness' | null;
  hasClaimableQuest: boolean;
}): string[] {
  const chips: string[] = [];

  if (!opts.isCheckedIn) chips.push('签到');
  if (opts.hasClaimableQuest) chips.push('看任务');

  if (opts.lowStat === 'hunger') chips.push('喂好吃的');
  else if (opts.lowStat === 'mood') chips.push('陪它玩');
  else if (opts.lowStat === 'cleanliness') chips.push('洗香香');

  if (opts.hour >= 5 && opts.hour < 11) chips.push('早安！');
  else if (opts.hour >= 21 || opts.hour < 2) chips.push('晚安~');

  chips.push('摸摸头');
  if (chips.length < 4) chips.push('今天有点累');
  if (chips.length < 5) chips.push('我们的回忆');

  return chips.slice(0, 4);
}
