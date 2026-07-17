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
  | 'emote-run' | 'emote-roll' | 'emote-groom' | 'emote-cute'
  | 'emote-stretch' | 'emote-pounce' | 'emote-rub' | 'emote-knead' | 'emote-sploot'
  | 'emote-walk' | 'emote-sleep' | 'emote-meow' | 'emote-zoomies'
  | 'chat';

export interface Intent {
  type: IntentType;
  /** For mood intent: the detected emotion */
  emotion?: MoodType;
  /** Original text to forward to chat when applicable */
  text: string;
}

const intentPatterns: Array<{ type: IntentType; patterns: RegExp }> = [
  { type: 'emote-run', patterns: /奔跑|跑一个|跑起来|快跑|冲刺/ },
  { type: 'emote-roll', patterns: /翻肚子|打滚|躺下|露肚皮|翻身/ },
  { type: 'emote-groom', patterns: /舔爪子|舔毛|洗脸|理毛|舔一舔/ },
  { type: 'emote-cute', patterns: /撒娇|卖萌|求抱抱|可爱一个|来个萌的/ },
  { type: 'emote-stretch', patterns: /伸懒腰|懒腰|拉伸|舒展/ },
  { type: 'emote-pounce', patterns: /捕猎|狩猎|扑一个|扑过来|抓老鼠|逮老鼠|匍匐/ },
  { type: 'emote-rub', patterns: /蹭蹭|贴贴|蹭一蹭/ },
  { type: 'emote-knead', patterns: /踩奶|踩一踩|按摩/ },
  { type: 'emote-sploot', patterns: /板鸭|趴下|趴着|趴一个|趴好/ },
  { type: 'emote-walk', patterns: /散步|走两步|遛弯|走一走|溜达/ },
  { type: 'emote-sleep', patterns: /睡觉|睡吧|午睡|去睡|睡一会/ },
  { type: 'emote-meow', patterns: /喵一个|叫一声|喵喵叫|学猫叫|叫一下/ },
  { type: 'emote-zoomies', patterns: /疯跑|暴走|撒欢|上蹿下跳|跑酷|发疯/ },
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
