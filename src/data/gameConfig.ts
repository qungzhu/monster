export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  reward: { coins: number; xp: number; intimacy?: number };
  type: 'chat' | 'feed' | 'pet' | 'play' | 'checkin' | 'mood';
}

export interface GameItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  type: 'food' | 'toy' | 'clean' | 'accessory';
  effect: { stat: 'hunger' | 'mood' | 'cleanliness'; amount: number };
}

export interface LevelConfig {
  level: number;
  xpRequired: number;
  title: string;
}

export interface PetStats {
  hunger: number;
  mood: number;
  cleanliness: number;
}

export const DEFAULT_PET_STATS: PetStats = {
  hunger: 80,
  mood: 80,
  cleanliness: 80,
};

export const STAT_DECAY_PER_HOUR = 2;

export const dailyQuests: Quest[] = [
  {
    id: 'chat3',
    title: '与萌宠聊天',
    description: '和你的萌宠对话3次',
    icon: '💬',
    target: 3,
    reward: { coins: 20, xp: 30, intimacy: 3 },
    type: 'chat',
  },
  {
    id: 'feed2',
    title: '投喂小零食',
    description: '喂萌宠吃2次东西',
    icon: '🍖',
    target: 2,
    reward: { coins: 15, xp: 20 },
    type: 'feed',
  },
  {
    id: 'pet5',
    title: '摸摸头大师',
    description: '摸摸萌宠的头5次',
    icon: '🐾',
    target: 5,
    reward: { coins: 10, xp: 15, intimacy: 2 },
    type: 'pet',
  },
  {
    id: 'play1',
    title: '快乐玩耍',
    description: '和萌宠玩耍1次',
    icon: '🎾',
    target: 1,
    reward: { coins: 15, xp: 25 },
    type: 'play',
  },
  {
    id: 'checkin1',
    title: '每日签到',
    description: '完成今日签到',
    icon: '📅',
    target: 1,
    reward: { coins: 10, xp: 10 },
    type: 'checkin',
  },
  {
    id: 'mood1',
    title: '心情记录',
    description: '记录一次今日心情',
    icon: '📝',
    target: 1,
    reward: { coins: 10, xp: 15 },
    type: 'mood',
  },
];

export const shopItems: GameItem[] = [
  {
    id: 'kibble',
    name: '营养狗粮',
    icon: '🥣',
    description: '基础口粮，管饱',
    price: 5,
    type: 'food',
    effect: { stat: 'hunger', amount: 20 },
  },
  {
    id: 'treat',
    name: '美味小零食',
    icon: '🍖',
    description: '好吃到停不下来',
    price: 10,
    type: 'food',
    effect: { stat: 'hunger', amount: 35 },
  },
  {
    id: 'cake',
    name: '特制蛋糕',
    icon: '🎂',
    description: '生日限定！超级满足',
    price: 25,
    type: 'food',
    effect: { stat: 'hunger', amount: 60 },
  },
  {
    id: 'ball',
    name: '彩色小球',
    icon: '🎾',
    description: '经典玩具，百玩不腻',
    price: 8,
    type: 'toy',
    effect: { stat: 'mood', amount: 20 },
  },
  {
    id: 'yarn',
    name: '毛线团',
    icon: '🧶',
    description: '猫猫最爱的毛线球',
    price: 12,
    type: 'toy',
    effect: { stat: 'mood', amount: 30 },
  },
  {
    id: 'plush',
    name: '豪华毛绒玩具',
    icon: '🧸',
    description: '抱着睡觉超安心',
    price: 30,
    type: 'toy',
    effect: { stat: 'mood', amount: 50 },
  },
  {
    id: 'brush',
    name: '柔软毛刷',
    icon: '🪮',
    description: '梳毛好舒服~',
    price: 8,
    type: 'clean',
    effect: { stat: 'cleanliness', amount: 25 },
  },
  {
    id: 'bath',
    name: '泡泡浴',
    icon: '🛁',
    description: '洗香香变干净',
    price: 20,
    type: 'clean',
    effect: { stat: 'cleanliness', amount: 50 },
  },
];

export const levelConfigs: LevelConfig[] = [
  { level: 1, xpRequired: 0, title: '萌新铲屎官' },
  { level: 2, xpRequired: 50, title: '见习饲养员' },
  { level: 3, xpRequired: 120, title: '合格铲屎官' },
  { level: 4, xpRequired: 220, title: '萌宠达人' },
  { level: 5, xpRequired: 350, title: '资深饲养员' },
  { level: 6, xpRequired: 520, title: '萌宠专家' },
  { level: 7, xpRequired: 750, title: '传说铲屎官' },
  { level: 8, xpRequired: 1050, title: '宠物之王' },
  { level: 9, xpRequired: 1450, title: '萌界至尊' },
  { level: 10, xpRequired: 2000, title: '万兽之灵' },
];

export function getLevelFromXP(xp: number): { level: number; title: string; currentXP: number; nextLevelXP: number; progress: number } {
  let currentLevel = levelConfigs[0];
  let nextLevel = levelConfigs[1];

  for (let i = levelConfigs.length - 1; i >= 0; i--) {
    if (xp >= levelConfigs[i].xpRequired) {
      currentLevel = levelConfigs[i];
      nextLevel = levelConfigs[i + 1] || levelConfigs[i];
      break;
    }
  }

  const currentXP = xp - currentLevel.xpRequired;
  const nextLevelXP = nextLevel.xpRequired - currentLevel.xpRequired;
  const progress = nextLevelXP > 0 ? Math.min(currentXP / nextLevelXP, 1) : 1;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    currentXP,
    nextLevelXP,
    progress,
  };
}

export const petReactions: Record<string, Record<string, string[]>> = {
  tuantuan: {
    feed: ['汪汪！好好吃！🐾', '尾巴摇得像螺旋桨！', '还想要还想要！嗷呜~'],
    pet: ['呜~好舒服...继续摸...', '翻肚皮！求摸摸！', '开心到原地转圈！'],
    play: ['接住了！汪汪！', '再扔一次再扔一次！', '跑得太开心忘记刹车了...砰！'],
    clean: ['不要洗澡！...好吧其实还挺舒服', '甩水甩水！你也湿了哈哈', '变香香了，可以去撩妹了'],
  },
  xiaoxue: {
    feed: ['...还行吧（但是吃得很快）', '优雅地舔了舔嘴角', '喵~这个可以多来点'],
    pet: ['呼噜呼噜...别停', '用脸蹭了蹭你的手', '假装不在意地靠过来'],
    play: ['懒洋洋地拨了一下', '突然来了精神疯狂拍打！', '够了，本喵需要休息（躺）'],
    clean: ['讨厌水！...呼噜呼噜好暖和', '舔舔毛，保持优雅', '变成毛茸茸的白色奶油球'],
  },
  mianhuatang: {
    feed: ['塞进腮帮子！鼓鼓的！', '转转圈找瓜子~', '小爪爪捧着吃，太可爱了'],
    pet: ['缩成一个小毛球...', '从指缝间偷看你', '小鼻子一抖一抖的'],
    play: ['在跑轮上疯狂跑步！', '钻进纸筒探险！', '滚成球球从滑梯上溜下来~'],
    clean: ['用小爪爪洗脸脸', '蓬松度UP！变成棉花糖！', '抖抖毛~变干净了'],
  },
};
