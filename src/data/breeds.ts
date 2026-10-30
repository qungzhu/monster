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
  /** Animation clip that loops while this GLB is displayed. */
  glbIdleAnimation?: string;
  /** Walk clip for imported rigs with non-standard animation names. */
  glbWalkAnimation?: string;
  /** Extra vertical correction after automatic fitting. Negative sinks low tails/fur into the ground. */
  glbGroundOffset?: number;
  /** Generated asset contains a disconnected flat display pedestal. */
  glbRemoveFlatBase?: boolean;
  /** Turn the model to face the camera (radians), for meshes exported facing away. */
  glbRotationY?: number;
  /** Plush cat from the Blender pipeline: real-time shell fur, glossy eyes. */
  glbPlushFur?: boolean;
  /** Retargeted head weights tear the face; use safe procedural motion instead. */
  glbDisableSkeletalAnimation?: boolean;
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
    glbUrl: '/models/plush/meshy-ragdoll.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'british', species: 'cat', name: '英国短毛猫', englishName: 'British Shorthair',
    petName: '蓝胖子', emoji: '🫐', rarity: 'common', characterId: 'xiaoxue',
    description: '银虎斑英短，圆脸包子配灰黑条纹，翠绿大眼看穿一切',
    personality: ['稳重', '圆润', '包子脸'],
    params: { bodyColor: '#8E9AAB', pointColor: '#76828F', bellyColor: '#A8B2C0', eyeColor: '#E8A030', earStyle: 'point' } as CatParams,
    glbUrl: '/models/plush/meshy-silvertabby.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'siamese', species: 'cat', name: '暹罗猫', englishName: 'Siamese',
    petName: '煤球', emoji: '⛏️', rarity: 'common', characterId: 'xiaoxue',
    description: '挖煤小能手，话痨属性拉满，走到哪聊到哪',
    personality: ['话痨', '重点色', '黏人'],
    params: { bodyColor: '#F2E3D0', pointColor: '#4A3628', bellyColor: '#F8F0E5', eyeColor: '#4FA8E8', earStyle: 'point' } as CatParams,
    glbUrl: '/models/plush/meshy-siamese.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'orange', species: 'cat', name: '中华橘猫', englishName: 'Orange Tabby',
    petName: '大橘', emoji: '🍊', rarity: 'common', characterId: 'xiaoxue',
    description: '十只橘猫九只胖，还有一只压塌炕，干饭第一名',
    personality: ['贪吃', '大橘为重', '亲人'],
    params: { bodyColor: '#E8923E', pointColor: '#D07828', bellyColor: '#FCE8CE', eyeColor: '#E8B030', earStyle: 'point' } as CatParams,
    glbUrl: '/models/plush/meshy-ginger.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'dragonli', species: 'cat', name: '中华狸花猫', englishName: 'Dragon Li',
    petName: '虎子', emoji: '🐯', rarity: 'common', characterId: 'xiaoxue',
    description: '中华田园之光，捕鼠健将，眼神锐利身手矫健',
    personality: ['矫健', '独立', '虎纹'],
    params: { bodyColor: '#9A8265', pointColor: '#6B563E', bellyColor: '#D8C8B0', eyeColor: '#8FBC44', earStyle: 'point' } as CatParams,
    glbUrl: '/models/plush/meshy-lihua.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'persian', species: 'cat', name: '波斯猫', englishName: 'Persian',
    petName: '雪莉', emoji: '👑', rarity: 'rare', characterId: 'xiaoxue',
    description: '猫中贵族，重点色长毛大毛球，扁脸配蓝眼睛，优雅是刻在骨子里的',
    personality: ['贵族', '慵懒', '优雅'],
    params: { bodyColor: '#F8F4F0', pointColor: '#E8E0D8', bellyColor: '#FFFFFF', eyeColor: '#E8A030', earStyle: 'point' } as CatParams,
    glbUrl: '/models/plush/meshy-persian.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'scottishfold', species: 'cat', name: '苏格兰折耳猫', englishName: 'Scottish Fold',
    petName: '汤圆', emoji: '🥟', rarity: 'rare', characterId: 'xiaoxue',
    description: '折耳圆脸像颗汤圆，安静地陪在你身边',
    personality: ['安静', '折耳', '软萌'],
    params: { bodyColor: '#D8CCC0', pointColor: '#B8A898', bellyColor: '#F0E8E0', eyeColor: '#E8A030', earStyle: 'fold' } as CatParams,
    glbUrl: '/models/plush/meshy-fold.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'bombay', species: 'cat', name: '孟买猫', englishName: 'Bombay',
    petName: '午夜', emoji: '🌑', rarity: 'rare', characterId: 'xiaoxue',
    description: '迷你小黑豹，铜色眼睛在夜里发光',
    personality: ['神秘', '小黑豹', '深邃'],
    params: { bodyColor: '#1E1E22', pointColor: '#0F0F12', bellyColor: '#2E2E34', eyeColor: '#E8A030', earStyle: 'point' } as CatParams,
    glbUrl: '/models/plush/meshy-bombay.glb',
    glbDisableSkeletalAnimation: true,
  },

  // ————— 狐狸 —————
  {
    id: 'redfox', species: 'fox', name: '赤狐', englishName: 'Red Fox',
    petName: '小火', emoji: '🦊', rarity: 'common', characterId: 'tuantuan',
    description: '分布最广的狐狸，火红的毛色像一团跳动的火焰',
    personality: ['机灵', '火红', '敏捷'],
    glbUrl: '/models/generated/red-fox-meshy-rigged-walk-optimized.glb?v=1',
    glbIdleAnimation: '',
    glbWalkAnimation: 'Armature|Unreal Take|baselayer',
    glbGroundOffset: -0.28,
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
    glbUrl: '/models/custom/cat2-rigged-safe.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'meshy-calico', species: 'cat', name: '三花猫', englishName: 'Calico',
    petName: '三花', emoji: '🐱', rarity: 'legendary', characterId: 'xiaoxue',
    description: '黑橘白三色斑块分布，招财又可爱',
    personality: ['招财', '亲人', '甜美'],
    glbUrl: '/models/custom/cat3-rigged-safe.glb',
    glbRotationY: Math.PI,
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'meshy-cream', species: 'cat', name: '奶油长毛', englishName: 'Cream Longhair',
    petName: '奶茶', emoji: '🍮', rarity: 'legendary', characterId: 'xiaoxue',
    description: '蓬松的胸毛、奶茶色调，软绵绵一大团',
    personality: ['温柔', '慵懒', '软萌'],
    glbUrl: '/models/custom/cat4-rigged-safe.glb',
    glbRotationY: Math.PI,
    glbRemoveFlatBase: true,
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'meshy-grey', species: 'cat', name: '灰白虎斑', englishName: 'Grey Tabby',
    petName: '灰灰', emoji: '🐾', rarity: 'legendary', characterId: 'xiaoxue',
    description: '灰色渐变条纹配白手套，粉鼻子圆脸颊',
    personality: ['沉稳', '优雅', '粘人'],
    glbUrl: '/models/custom/cat5-rigged-safe.glb',
    glbRotationY: Math.PI,
    glbDisableSkeletalAnimation: true,
  },

  // ————— 毛绒玩具系列（Blender 管线：干净网格 + 实时绒毛）—————
  {
    id: 'plush-himalayan', species: 'cat', name: '喜马拉雅猫', englishName: 'Himalayan',
    petName: '雪糕', emoji: '🧸', rarity: 'legendary', characterId: 'xiaoxue',
    description: '奶油色长毛配海豹色脸罩、耳朵和小脚，一双蓝宝石大眼睛，抱起来像毛绒玩具',
    personality: ['温柔', '黏人', '软萌'],
    glbUrl: '/models/plush/meshy-himalayan.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-birman', species: 'cat', name: '伯曼猫', englishName: 'Birman',
    petName: '手套', emoji: '🧤', rarity: 'legendary', characterId: 'xiaoxue',
    description: '重点色配四只雪白小手套，蓝眼睛温柔又安静，像穿了袜子的毛绒公仔',
    personality: ['温顺', '安静', '贴心'],
    glbUrl: '/models/plush/meshy-birman.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-angora', species: 'cat', name: '土耳其安哥拉', englishName: 'Turkish Angora',
    petName: '云朵', emoji: '☁️', rarity: 'legendary', characterId: 'xiaoxue',
    description: '一身雪白，蓝宝石眼睛，羽毛一样蓬松的大尾巴，优雅又爱玩',
    personality: ['优雅', '活泼', '聪明'],
    glbUrl: '/models/plush/meshy-angora.glb',
    glbDisableSkeletalAnimation: true,
  },

  {
    id: 'plush-van', species: 'cat', name: '土耳其梵猫', englishName: 'Turkish Van',
    petName: '橘点', emoji: '🧡', rarity: 'legendary', characterId: 'xiaoxue',
    description: '一身雪白，只有头顶两块橘斑和一条橘色大尾巴，爱玩水的小怪猫',
    personality: ['活泼', '爱玩水', '好奇'],
    glbUrl: '/models/plush/meshy-van.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-balinese', species: 'cat', name: '巴厘猫', englishName: 'Balinese',
    petName: '奶咖', emoji: '☕', rarity: 'legendary', characterId: 'xiaoxue',
    description: '长毛版的暹罗猫，奶油色身子配深色耳朵和小脚，蓝眼睛，尾巴像一支羽毛',
    personality: ['话多', '黏人', '优雅'],
    glbUrl: '/models/plush/meshy-balinese.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-bluelonghair', species: 'cat', name: '英国长毛猫', englishName: 'British Longhair',
    petName: '蓝莓', emoji: '🩶', rarity: 'legendary', characterId: 'xiaoxue',
    description: '一身蓝灰色长毛，圆脸配翠绿眼睛，蓬松得像一朵乌云',
    personality: ['温和', '安静', '蓬松'],
    glbUrl: '/models/plush/meshy-bluelonghair.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-exotic', species: 'cat', name: '加菲猫', englishName: 'Exotic Shorthair',
    petName: '团团', emoji: '🍮', rarity: 'legendary', characterId: 'xiaoxue',
    description: '奶油色短毛大圆脸，扁扁的小鼻子配琥珀色圆眼睛，永远一副没睡醒的样子',
    personality: ['慵懒', '憨厚', '贪吃'],
    glbUrl: '/models/plush/meshy-exotic.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-russianblue', species: 'cat', name: '俄罗斯蓝猫', englishName: 'Russian Blue',
    petName: '银灰', emoji: '💚', rarity: 'legendary', characterId: 'xiaoxue',
    description: '一身银蓝色丝绒短毛，翠绿大眼睛，嘴角天生微微上扬，安静又害羞',
    personality: ['害羞', '安静', '忠诚'],
    glbUrl: '/models/plush/meshy-russianblue.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-bengal', species: 'cat', name: '孟加拉豹猫', englishName: 'Bengal',
    petName: '豹豹', emoji: '🐆', rarity: 'legendary', characterId: 'xiaoxue',
    description: '金棕色皮毛上布满豹纹玫瑰斑，大耳朵高高竖起，精力充沛的小探险家',
    personality: ['好动', '聪明', '爱冒险'],
    glbUrl: '/models/plush/meshy-bengal.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-chinchilla', species: 'cat', name: '银色金吉拉', englishName: 'Silver Chinchilla',
    petName: '银霜', emoji: '🤍', rarity: 'legendary', characterId: 'xiaoxue',
    description: '雪白长毛带一层银灰毛尖，翡翠绿大眼睛，抱着像一团蓬松的棉花糖',
    personality: ['高贵', '温柔', '爱干净'],
    glbUrl: '/models/plush/meshy-chinchilla.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-thai', species: 'cat', name: '泰国猫', englishName: 'Thai',
    petName: '可可', emoji: '🥥', rarity: 'legendary', characterId: 'xiaoxue',
    description: '传统的“老式暹罗”，圆圆的苹果脸配巧克力色面罩和小脚，蓝眼睛，爱吐小舌头',
    personality: ['话痨', '热情', '黏人'],
    glbUrl: '/models/plush/meshy-thai.glb',
    glbDisableSkeletalAnimation: true,
  },

  {
    id: 'plush-britishspotted', species: 'cat', name: '英短蓝斑点', englishName: 'British Spotted',
    petName: '芝麻', emoji: '🩶', rarity: 'legendary', characterId: 'xiaoxue',
    description: '蓝灰色圆脸大胖子，身上撒满深灰色小圆点，金铜色眼睛圆溜溜的',
    personality: ['憨厚', '稳重', '爱睡觉'],
    glbUrl: '/models/plush/meshy-britishspotted.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-mau', species: 'cat', name: '埃及猫', englishName: 'Egyptian Mau',
    petName: '法老', emoji: '🔱', rarity: 'legendary', characterId: 'xiaoxue',
    description: '银灰底色配天然黑色斑点，环纹尾巴，眼线像画了眼妆的翠绿大眼睛',
    personality: ['敏捷', '忠诚', '好奇'],
    glbUrl: '/models/plush/meshy-mau.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-oriental', species: 'cat', name: '东方短毛猫', englishName: 'Oriental Shorthair',
    petName: '墨墨', emoji: '🖤', rarity: 'legendary', characterId: 'xiaoxue',
    description: '一身乌黑丝绒，修长的身子配一对超大耳朵，琥珀色眼睛机灵又话多',
    personality: ['话痨', '机灵', '黏人'],
    glbUrl: '/models/plush/meshy-oriental.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-burmese', species: 'cat', name: '缅甸猫', englishName: 'Burmese',
    petName: '可乐', emoji: '🟤', rarity: 'legendary', characterId: 'xiaoxue',
    description: '浓郁的深棕色缎面短毛，圆脸配金色大眼睛，尾巴总是高高翘起',
    personality: ['热情', '黏人', '爱撒娇'],
    glbUrl: '/models/plush/meshy-burmese.glb',
    glbDisableSkeletalAnimation: true,
  },

  {
    id: 'plush-havana', species: 'cat', name: '哈瓦那棕猫', englishName: 'Havana Brown',
    petName: '雪茄', emoji: '🍫', rarity: 'legendary', characterId: 'xiaoxue',
    description: '一身巧克力色丝绒短毛，大耳朵配翠绿色圆眼睛，温柔又爱跟着你转',
    personality: ['温柔', '好奇', '跟屁虫'],
    glbUrl: '/models/plush/meshy-havana.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-korat', species: 'cat', name: '科拉特猫', englishName: 'Korat',
    petName: '福银', emoji: '🍀', rarity: 'legendary', characterId: 'xiaoxue',
    description: '泰国的幸运猫，银蓝色短毛，修长身段配高高翘起的尾巴和绿宝石眼睛',
    personality: ['机灵', '活泼', '幸运'],
    glbUrl: '/models/plush/meshy-korat.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-chartreux', species: 'cat', name: '沙特尔猫', englishName: 'Chartreux',
    petName: '灰灰', emoji: '🫐', rarity: 'legendary', characterId: 'xiaoxue',
    description: '来自法国的蓝灰色圆滚滚，厚实的绒毛，嘴角像在微笑，安静又贴心',
    personality: ['安静', '贴心', '稳重'],
    glbUrl: '/models/plush/meshy-chartreux.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-ocicat', species: 'cat', name: '欧西猫', englishName: 'Ocicat',
    petName: '点点', emoji: '🟠', rarity: 'legendary', characterId: 'xiaoxue',
    description: '金黄色皮毛上整齐排列着深棕色圆斑，环纹尾巴，像一只迷你小豹子',
    personality: ['外向', '聪明', '爱玩'],
    glbUrl: '/models/plush/meshy-ocicat.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-singapura', species: 'cat', name: '新加坡猫', englishName: 'Singapura',
    petName: '小豆', emoji: '🫘', rarity: 'legendary', characterId: 'xiaoxue',
    description: '世界上最小的猫之一，象牙色带细细的棕色毛尖，大耳朵大眼睛，尾尖深色',
    personality: ['好奇', '黏人', '调皮'],
    glbUrl: '/models/plush/meshy-singapura.glb',
    glbDisableSkeletalAnimation: true,
  },

  {
    id: 'plush-browntabby', species: 'cat', name: '棕虎斑', englishName: 'Brown Tabby',
    petName: '栗子', emoji: '🌰', rarity: 'legendary', characterId: 'xiaoxue',
    description: '暖棕色毛衣上一圈圈深色条纹，尾巴高高翘起、尾尖深棕，像只小老虎',
    personality: ['活泼', '好奇', '贪玩'],
    glbUrl: '/models/plush/meshy-browntabby.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-greytabby', species: 'cat', name: '灰虎斑', englishName: 'Grey Tabby',
    petName: '石头', emoji: '🪨', rarity: 'legendary', characterId: 'xiaoxue',
    description: '灰褐色短毛配深色虎纹和米色小爪，额头一个小小的“M”，老实又可靠',
    personality: ['憨厚', '可靠', '亲人'],
    glbUrl: '/models/plush/meshy-greytabby.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-snowshoe', species: 'cat', name: '雪鞋猫', englishName: 'Snowshoe',
    petName: '雪靴', emoji: '🥾', rarity: 'legendary', characterId: 'xiaoxue',
    description: '重点色面罩中间一道白色倒“V”，四只脚穿着雪白小靴子，蓝眼睛',
    personality: ['友善', '爱说话', '黏人'],
    glbUrl: '/models/plush/meshy-snowshoe.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-tonkinese', species: 'cat', name: '东奇尼猫', englishName: 'Tonkinese',
    petName: '奶糖', emoji: '🍬', rarity: 'legendary', characterId: 'xiaoxue',
    description: '奶茶色身子配深棕色脸、耳朵和尾巴，一双碧蓝色眼睛，热情的社交小达人',
    personality: ['热情', '聪明', '爱社交'],
    glbUrl: '/models/plush/meshy-tonkinese.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-toyger', species: 'cat', name: '玩具虎猫', englishName: 'Toyger',
    petName: '虎妞', emoji: '🐯', rarity: 'legendary', characterId: 'xiaoxue',
    description: '亮橙色皮毛上清晰的黑色竖纹，活脱脱一只口袋里的小老虎',
    personality: ['勇敢', '活泼', '温顺'],
    glbUrl: '/models/plush/meshy-toyger.glb',
    glbDisableSkeletalAnimation: true,
  },

  {
    id: 'plush-sokoke', species: 'cat', name: '索科克猫', englishName: 'Sokoke',
    petName: '木纹', emoji: '🪵', rarity: 'legendary', characterId: 'xiaoxue',
    description: '来自肯尼亚森林，琥珀色底上旋涡状的大理石纹，像一块会走路的树木年轮',
    personality: ['敏捷', '独立', '爱探险'],
    glbUrl: '/models/plush/meshy-sokoke.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-silvershaded', species: 'cat', name: '英短银渐层', englishName: 'British Silver Shaded',
    petName: '银宝', emoji: '🤍', rarity: 'legendary', characterId: 'xiaoxue',
    description: '雪白的圆脸大团子，背和尾巴渐渐染上银灰，翡翠绿眼睛，乖巧又爱撒娇',
    personality: ['乖巧', '温柔', '爱撒娇'],
    glbUrl: '/models/plush/meshy-silvershaded.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-australianmist', species: 'cat', name: '澳大利亚雾猫', englishName: 'Australian Mist',
    petName: '雾雾', emoji: '🌫️', rarity: 'legendary', characterId: 'xiaoxue',
    description: '沙金色底上若隐若现的雾状斑点，绿眼睛温柔，最喜欢窝在你怀里',
    personality: ['温和', '亲人', '安静'],
    glbUrl: '/models/plush/meshy-australianmist.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-savannah', species: 'cat', name: '萨凡纳猫', englishName: 'Savannah',
    petName: '草原', emoji: '🌾', rarity: 'legendary', characterId: 'xiaoxue',
    description: '大长腿配一对超大耳朵，金黄色皮毛撒满黑色斑点，像草原上的小猎豹',
    personality: ['好动', '聪明', '爱跳高'],
    glbUrl: '/models/plush/meshy-savannah.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-serval', species: 'cat', name: '薮猫', englishName: 'Serval',
    petName: '耳朵', emoji: '👂', rarity: 'legendary', characterId: 'xiaoxue',
    description: '非洲草原的长腿猎手，大耳朵背后有黑白“假眼”斑，环纹尾巴配黑尾尖',
    personality: ['机警', '敏捷', '神气'],
    glbUrl: '/models/plush/meshy-serval.glb',
    glbDisableSkeletalAnimation: true,
  },

  {
    id: 'plush-cornishrex', species: 'cat', name: '柯尼斯卷毛猫', englishName: 'Cornish Rex',
    petName: '波浪', emoji: '〰️', rarity: 'legendary', characterId: 'xiaoxue',
    description: '一身细细的波浪卷毛，修长的身体和大耳朵，重点色脸配蓝绿色眼睛，像只小灵缇',
    personality: ['活泼', '黏人', '爱跑跳'],
    glbUrl: '/models/plush/meshy-cornishrex.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-spangled', species: 'cat', name: '加州闪亮猫', englishName: 'California Spangled',
    petName: '亮亮', emoji: '✨', rarity: 'legendary', characterId: 'xiaoxue',
    description: '金棕色皮毛上布满圆圆的黑斑，环纹尾巴配黑尾尖，像一只家养小猎豹',
    personality: ['好动', '机灵', '爱玩'],
    glbUrl: '/models/plush/meshy-spangled.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-laperm', species: 'cat', name: '拉邦猫', englishName: 'LaPerm',
    petName: '卷卷', emoji: '🌀', rarity: 'legendary', characterId: 'xiaoxue',
    description: '一身蓬松的橘色小卷毛，像刚烫过头发，尾巴是一把卷卷的羽毛掸子',
    personality: ['温柔', '亲人', '好奇'],
    glbUrl: '/models/plush/meshy-laperm.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-selkirk', species: 'cat', name: '塞尔凯克卷毛猫', englishName: 'Selkirk Rex',
    petName: '羊羊', emoji: '🐑', rarity: 'legendary', characterId: 'xiaoxue',
    description: '灰白相间的厚厚卷毛像一只小绵羊，圆脸大眼睛，抱起来软乎乎的',
    personality: ['憨厚', '温顺', '爱抱抱'],
    glbUrl: '/models/plush/meshy-selkirk.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'plush-devonrex', species: 'cat', name: '德文卷毛猫', englishName: 'Devon Rex',
    petName: '精灵', emoji: '🧝', rarity: 'legendary', characterId: 'xiaoxue',
    description: '超大的蝙蝠耳朵配圆溜溜的大眼睛，一身短短的波浪卷毛，像个调皮的小精灵',
    personality: ['调皮', '黏人', '鬼点子多'],
    glbUrl: '/models/plush/meshy-devonrex.glb',
    glbDisableSkeletalAnimation: true,
  },

  // ————— 多角度三视图重建（front/side/back/quarter 四视角，颜色高保真）—————
  {
    id: 'meshy-eurotabby', species: 'cat', name: '欧洲短毛虎斑', englishName: 'European Tabby',
    petName: '麦茶', emoji: '🐈', rarity: 'legendary', characterId: 'xiaoxue',
    description: '多角度重建的灰褐鲭鱼虎斑，翠绿大眼、蓬松球尾，圆嘟嘟的野性小虎，会8种灵活动作',
    personality: ['机灵', '好动', '爱撒欢'],
    glbUrl: '/models/custom/mesh-tabby2.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'meshy-norwegian', species: 'cat', name: '挪威森林猫', englishName: 'Norwegian Forest',
    petName: '松松', emoji: '🌲', rarity: 'legendary', characterId: 'xiaoxue',
    description: '半长毛棕虎斑配雪白围脖，深色耳尖，森系毛茸茸大尾巴，会8种灵活动作',
    personality: ['温厚', '沉静', '毛茸茸'],
    glbUrl: '/models/plush/meshy-norwegian.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'meshy-mainecoon', species: 'cat', name: '缅因猫', englishName: 'Maine Coon',
    petName: '狮狮', emoji: '🦁', rarity: 'legendary', characterId: 'xiaoxue',
    description: '长毛棕虎斑配猞猁般的黑色耳簇，蓬松条纹大尾，温柔的巨型猫，会8种灵活动作',
    personality: ['威武', '温柔', '大块头'],
    glbUrl: '/models/plush/meshy-mainecoon.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'meshy-persian', species: 'cat', name: '金吉拉波斯', englishName: 'Persian',
    petName: '布丁', emoji: '🍦', rarity: 'legendary', characterId: 'xiaoxue',
    description: '奶油色扁脸大团子，全身软绵绵，铜金色圆眼睛，会8种灵活动作',
    personality: ['慵懒', '高贵', '软糯'],
    glbUrl: '/models/custom/mesh-persian.glb',
    glbDisableSkeletalAnimation: true,
  },
  {
    id: 'meshy-ragdoll', species: 'cat', name: '布偶猫', englishName: 'Ragdoll',
    petName: '雪球', emoji: '💙', rarity: 'legendary', characterId: 'xiaoxue',
    description: '海豹色重点配蔚蓝宝石眼，奶白身子深色手套，温顺的仙女猫，会8种灵活动作',
    personality: ['黏人', '温顺', '仙气'],
    glbUrl: '/models/custom/mesh-ragdoll.glb',
    glbDisableSkeletalAnimation: true,
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
