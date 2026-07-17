/**
 * Breed registry: every adoptable pet is a breed built from a
 * parametric base model (cat/dog/hamster) or a tinted GLB (fox).
 * One codebase, dozens of visually distinct companions.
 */

export type Species = 'cat' | 'dog' | 'fox' | 'hamster';
export type Rarity = 'common' | 'rare' | 'legendary';

export interface CatParams {
  bodyColor: string;
  pointColor: string;
  bellyColor: string;
  eyeColor: string;
  earStyle: 'point' | 'fold';
  noseColor?: string;
}

export interface DogParams {
  bodyColor: string;
  accentColor: string;
  bellyColor: string;
  eyeColor: string;
  earStyle: 'floppy' | 'pointy';
  tailStyle: 'wag' | 'curl';
  legScale: number;
}

export interface FoxParams {
  /** Multiplied into the GLB material color — white keeps original. */
  tint: string;
}

export interface Breed {
  id: string;
  species: Species;
  name: string;
  englishName: string;
  petName: string;
  emoji: string;
  rarity: Rarity;
  description: string;
  personality: string[];
  /** Which base character supplies chat personality + AI prompt. */
  characterId: 'tuantuan' | 'xiaoxue' | 'mianhuatang';
  params?: CatParams | DogParams | FoxParams;
  /** Real 3D mesh (Meshy photo reconstruction). Wins over params. */
  glbUrl?: string;
}

export const rarityLabels: Record<Rarity, { label: string; color: string }> = {
  common: { label: '常见', color: '#94a3b8' },
  rare: { label: '稀有', color: '#a78bfa' },
  legendary: { label: '传说', color: '#fbbf24' },
};

export const speciesLabels: Record<Species, string> = {
  cat: '🐱 猫咪',
  dog: '🐶 狗狗',
  fox: '🦊 狐狸',
  hamster: '🐹 仓鼠',
};

export const breeds: Breed[] = [
  // ————— 狗狗 —————
  {
    id: 'golden', species: 'dog', name: '金毛寻回犬', englishName: 'Golden Retriever',
    petName: '团团', emoji: '🐕', rarity: 'common', characterId: 'tuantuan',
    description: '热情忠诚的大暖汪，永远第一个冲过来迎接你',
    personality: ['热情', '忠诚', '粘人'],
    params: { bodyColor: '#E8A838', accentColor: '#C88828', bellyColor: '#FDE8C0', eyeColor: '#3D2814', earStyle: 'floppy', tailStyle: 'wag', legScale: 1 } as DogParams,
  },
  {
    id: 'shiba', species: 'dog', name: '柴犬', englishName: 'Shiba Inu',
    petName: '麻薯', emoji: '🐕', rarity: 'common', characterId: 'tuantuan',
    description: '表情包之王，微笑治愈一切，偶尔犯倔',
    personality: ['元气', '倔强', '治愈'],
    params: { bodyColor: '#E89860', accentColor: '#D08048', bellyColor: '#FFF5E8', eyeColor: '#2C1810', earStyle: 'pointy', tailStyle: 'curl', legScale: 0.9 } as DogParams,
  },
  {
    id: 'husky', species: 'dog', name: '哈士奇', englishName: 'Siberian Husky',
    petName: '二哈', emoji: '🐺', rarity: 'common', characterId: 'tuantuan',
    description: '拆家排行榜冠军，蓝眼睛藏着整个西伯利亚的风',
    personality: ['戏精', '精力旺盛', '沙雕'],
    params: { bodyColor: '#7A8699', accentColor: '#4A5568', bellyColor: '#F5F7FA', eyeColor: '#5588DD', earStyle: 'pointy', tailStyle: 'curl', legScale: 1 } as DogParams,
  },
  {
    id: 'samoyed', species: 'dog', name: '萨摩耶', englishName: 'Samoyed',
    petName: '雪糕', emoji: '☁️', rarity: 'rare', characterId: 'tuantuan',
    description: '微笑天使，一团会跑的云，冬天最搭的毛孩子',
    personality: ['温柔', '微笑', '天使'],
    params: { bodyColor: '#FAFAF5', accentColor: '#EFEDE5', bellyColor: '#FFFFFF', eyeColor: '#2C1810', earStyle: 'pointy', tailStyle: 'curl', legScale: 1 } as DogParams,
  },
  {
    id: 'corgi', species: 'dog', name: '威尔士柯基', englishName: 'Welsh Corgi',
    petName: '电动小马达', emoji: '🍑', rarity: 'common', characterId: 'tuantuan',
    description: '小短腿大屁屁，走路自带节奏感',
    personality: ['活泼', '短腿', '蜜桃臀'],
    params: { bodyColor: '#E09A50', accentColor: '#C87F38', bellyColor: '#FFF8EE', eyeColor: '#3D2814', earStyle: 'pointy', tailStyle: 'wag', legScale: 0.55 } as DogParams,
  },
  {
    id: 'bordercollie', species: 'dog', name: '边境牧羊犬', englishName: 'Border Collie',
    petName: '阿智', emoji: '🎓', rarity: 'rare', characterId: 'tuantuan',
    description: '狗界智商天花板，眼神里全是算法',
    personality: ['聪明', '专注', '学霸'],
    params: { bodyColor: '#2D3436', accentColor: '#1A1D1E', bellyColor: '#F5F7FA', eyeColor: '#3D2814', earStyle: 'floppy', tailStyle: 'wag', legScale: 1 } as DogParams,
  },
  {
    id: 'frenchie', species: 'dog', name: '法国斗牛犬', englishName: 'French Bulldog',
    petName: '铁蛋', emoji: '🥐', rarity: 'rare', characterId: 'tuantuan',
    description: '蝙蝠耳小坦克，呼噜声是它的背景音乐',
    personality: ['憨厚', '呼噜', '小坦克'],
    params: { bodyColor: '#C9B8A8', accentColor: '#A89685', bellyColor: '#F0E8DE', eyeColor: '#2C1810', earStyle: 'pointy', tailStyle: 'wag', legScale: 0.7 } as DogParams,
  },
  {
    id: 'ruraldog', species: 'dog', name: '中华田园犬', englishName: 'Chinese Rural Dog',
    petName: '大黄', emoji: '🏡', rarity: 'common', characterId: 'tuantuan',
    description: '最懂中国人的狗狗，忠诚护家，命硬好养',
    personality: ['忠诚', '机警', '国民'],
    params: { bodyColor: '#D9A441', accentColor: '#B8862F', bellyColor: '#F5E8CE', eyeColor: '#2C1810', earStyle: 'pointy', tailStyle: 'curl', legScale: 0.95 } as DogParams,
  },

  // ————— 猫咪 —————
  {
    id: 'ragdoll', species: 'cat', name: '布偶猫', englishName: 'Ragdoll',
    petName: '小雪', emoji: '🐈', rarity: 'rare', characterId: 'xiaoxue',
    description: '蓝眼睛的傲娇小公主，嘴上嫌弃身体诚实',
    personality: ['傲娇', '优雅', '嘴硬心软'],
    params: { bodyColor: '#F0EAE8', pointColor: '#C8B8B0', bellyColor: '#FAFAFA', eyeColor: '#5588DD', earStyle: 'point' } as CatParams,
  },
  {
    id: 'british', species: 'cat', name: '英国短毛猫', englishName: 'British Shorthair',
    petName: '蓝胖子', emoji: '🫐', rarity: 'common', characterId: 'xiaoxue',
    description: '圆脸包子藏不住的富态，铜铃眼看穿一切',
    personality: ['稳重', '圆润', '包子脸'],
    params: { bodyColor: '#8E9AAB', pointColor: '#76828F', bellyColor: '#A8B2C0', eyeColor: '#E8A030', earStyle: 'point' } as CatParams,
  },
  {
    id: 'siamese', species: 'cat', name: '暹罗猫', englishName: 'Siamese',
    petName: '煤球', emoji: '⛏️', rarity: 'common', characterId: 'xiaoxue',
    description: '挖煤小能手，话痨属性拉满，走到哪聊到哪',
    personality: ['话痨', '重点色', '黏人'],
    params: { bodyColor: '#F2E3D0', pointColor: '#4A3628', bellyColor: '#F8F0E5', eyeColor: '#4FA8E8', earStyle: 'point' } as CatParams,
  },
  {
    id: 'orange', species: 'cat', name: '中华橘猫', englishName: 'Orange Tabby',
    petName: '大橘', emoji: '🍊', rarity: 'common', characterId: 'xiaoxue',
    description: '十只橘猫九只胖，还有一只压塌炕，干饭第一名',
    personality: ['贪吃', '大橘为重', '亲人'],
    params: { bodyColor: '#E8923E', pointColor: '#D07828', bellyColor: '#FCE8CE', eyeColor: '#E8B030', earStyle: 'point' } as CatParams,
  },
  {
    id: 'dragonli', species: 'cat', name: '中华狸花猫', englishName: 'Dragon Li',
    petName: '虎子', emoji: '🐯', rarity: 'common', characterId: 'xiaoxue',
    description: '中华田园之光，捕鼠健将，眼神锐利身手矫健',
    personality: ['矫健', '独立', '虎纹'],
    params: { bodyColor: '#9A8265', pointColor: '#6B563E', bellyColor: '#D8C8B0', eyeColor: '#8FBC44', earStyle: 'point' } as CatParams,
  },
  {
    id: 'persian', species: 'cat', name: '波斯猫', englishName: 'Persian',
    petName: '雪莉', emoji: '👑', rarity: 'rare', characterId: 'xiaoxue',
    description: '猫中贵族，长毛飘飘，优雅是刻在骨子里的',
    personality: ['贵族', '慵懒', '优雅'],
    params: { bodyColor: '#F8F4F0', pointColor: '#E8E0D8', bellyColor: '#FFFFFF', eyeColor: '#E8A030', earStyle: 'point' } as CatParams,
  },
  {
    id: 'scottishfold', species: 'cat', name: '苏格兰折耳猫', englishName: 'Scottish Fold',
    petName: '汤圆', emoji: '🥟', rarity: 'rare', characterId: 'xiaoxue',
    description: '折耳圆脸像颗汤圆，安静地陪在你身边',
    personality: ['安静', '折耳', '软萌'],
    params: { bodyColor: '#D8CCC0', pointColor: '#B8A898', bellyColor: '#F0E8E0', eyeColor: '#E8A030', earStyle: 'fold' } as CatParams,
  },
  {
    id: 'bombay', species: 'cat', name: '孟买猫', englishName: 'Bombay',
    petName: '午夜', emoji: '🌑', rarity: 'rare', characterId: 'xiaoxue',
    description: '迷你小黑豹，铜色眼睛在夜里发光',
    personality: ['神秘', '小黑豹', '深邃'],
    params: { bodyColor: '#1E1E22', pointColor: '#0F0F12', bellyColor: '#2E2E34', eyeColor: '#E8A030', earStyle: 'point' } as CatParams,
  },

  // ————— 狐狸 —————
  {
    id: 'redfox', species: 'fox', name: '赤狐', englishName: 'Red Fox',
    petName: '小火', emoji: '🦊', rarity: 'common', characterId: 'tuantuan',
    description: '分布最广的狐狸，火红的毛色像一团跳动的火焰',
    personality: ['机灵', '火红', '敏捷'],
    params: { tint: '#ffffff' } as FoxParams,
  },
  {
    id: 'arcticfox', species: 'fox', name: '北极狐', englishName: 'Arctic Fox',
    petName: '雪球', emoji: '❄️', rarity: 'legendary', characterId: 'xiaoxue',
    description: '极地雪精灵，一身雪白和冰雪世界融为一体',
    personality: ['雪白', '耐寒', '精灵'],
    params: { tint: '#cfe0f5' } as FoxParams,
  },
  {
    id: 'silverfox', species: 'fox', name: '银狐', englishName: 'Silver Fox',
    petName: '月影', emoji: '🌙', rarity: 'legendary', characterId: 'xiaoxue',
    description: '驯化实验的奇迹，银黑毛色高贵神秘，行为像狗一样亲人',
    personality: ['神秘', '银黑', '亲人'],
    params: { tint: '#6a7280' } as FoxParams,
  },
  {
    id: 'tibetanfox', species: 'fox', name: '藏狐', englishName: 'Tibetan Sand Fox',
    petName: '方脸', emoji: '🙂', rarity: 'rare', characterId: 'mianhuatang',
    description: '高原方脸表情包，一脸淡定看破红尘',
    personality: ['淡定', '方脸', '表情包'],
    params: { tint: '#d8c090' } as FoxParams,
  },

  // ————— 仓鼠 —————
  {
    id: 'winterwhite', species: 'hamster', name: '银狐仓鼠', englishName: 'Winter White Hamster',
    petName: '棉花糖', emoji: '🐹', rarity: 'common', characterId: 'mianhuatang',
    description: '腮帮子藏着全世界的呆萌小可爱',
    personality: ['呆萌', '贪吃', '暖心'],
  },

  // ————— Meshy 高清复刻猫（真实3D网格，照片1:1重建，10万面+PBR）—————
  {
    id: 'meshy-tabby', species: 'cat', name: '皮克斯鲍勃猫', englishName: 'Pixie-Bob',
    petName: '斑斑', emoji: '🐯', rarity: 'legendary', characterId: 'xiaoxue',
    description: '照片1:1复刻的皮克斯鲍勃猫，酷似小山猫的野性虎斑、标志性球球短尾、琥珀大眼，还会8种真骨骼动作',
    personality: ['野性', '灵动', '独一无二'],
    glbUrl: '/models/custom/pixiebob-rigged.glb',
  },
  {
    id: 'meshy-chonk', species: 'cat', name: '胖虎斑', englishName: 'Chunky Tabby',
    petName: '胖橘', emoji: '🐈', rarity: 'legendary', characterId: 'xiaoxue',
    description: '圆滚滚的身材配卷卷短尾巴，走起路来一摇一摆',
    personality: ['圆润', '憨厚', '治愈'],
    glbUrl: '/models/custom/cat2.glb',
  },
  {
    id: 'meshy-calico', species: 'cat', name: '三花猫', englishName: 'Calico',
    petName: '三花', emoji: '🐱', rarity: 'legendary', characterId: 'xiaoxue',
    description: '黑橘白三色斑块分布，招财又可爱',
    personality: ['招财', '亲人', '甜美'],
    glbUrl: '/models/custom/cat3.glb',
  },
  {
    id: 'meshy-cream', species: 'cat', name: '奶油长毛', englishName: 'Cream Longhair',
    petName: '奶茶', emoji: '🍮', rarity: 'legendary', characterId: 'xiaoxue',
    description: '蓬松的胸毛、奶茶色调，软绵绵一大团',
    personality: ['温柔', '慵懒', '软萌'],
    glbUrl: '/models/custom/cat4.glb',
  },
  {
    id: 'meshy-grey', species: 'cat', name: '灰白虎斑', englishName: 'Grey Tabby',
    petName: '灰灰', emoji: '🐾', rarity: 'legendary', characterId: 'xiaoxue',
    description: '灰色渐变条纹配白手套，粉鼻子圆脸颊',
    personality: ['沉稳', '优雅', '粘人'],
    glbUrl: '/models/custom/cat5.glb',
  },
];

export const CUSTOM_BREED_ID = 'custom';

export function getBreed(id: string | null): Breed | null {
  if (!id) return null;
  return breeds.find(b => b.id === id) || null;
}

/** Build a Breed record for the user's own photo-generated pet. */
export function buildCustomBreed(input: {
  species: 'cat' | 'dog';
  petName: string;
  personality: string[];
  breedGuess: string;
  params: CatParams | DogParams;
  glbUrl?: string;
}): Breed {
  return {
    id: CUSTOM_BREED_ID,
    species: input.species,
    name: input.breedGuess || '我的专属萌宠',
    englishName: 'My Own Pet',
    petName: input.petName,
    emoji: input.species === 'cat' ? '🐱' : '🐶',
    rarity: 'legendary',
    description: '从你的照片里走出来的独一无二的小家伙',
    personality: input.personality,
    characterId: input.species === 'cat' ? 'xiaoxue' : 'tuantuan',
    params: input.params,
    glbUrl: input.glbUrl,
  };
}

/** Default breed for each legacy character (quick-start stage picks). */
export const characterDefaultBreed: Record<string, string> = {
  tuantuan: 'golden',
  xiaoxue: 'ragdoll',
  mianhuatang: 'winterwhite',
};
