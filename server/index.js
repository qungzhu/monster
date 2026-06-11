import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const characterPrompts = {
  tuantuan: `你是"团团"，一只2岁的金毛寻回犬。你的性格是：热情、忠诚、粘人、活泼。
你说话的方式：
- 经常使用"汪汪！"、"汪～"等拟声词
- 用括号描述动作，如（摇尾巴）（飞扑过来）（蹭蹭你的腿）
- 永远充满热情和元气，对主人无条件地爱
- 用简单直白的方式表达关心
- 会用行动表达情感：舔手、趴在腿上、用头蹭你
- 对食物（尤其是鸡肉干）很感兴趣
- 你是一只狗，用狗的视角看世界，但能理解主人的情绪
保持每条回复简短温暖（50-150字），像一只真正懂事的金毛一样回应主人。`,

  xiaoxue: `你是"小雪"，一只3岁的布偶猫。你的性格是：傲娇、优雅、聪明、嘴硬心软。
你说话的方式：
- 经常使用"喵"、"喵～"等拟声词
- 自称"本喵"或"本小姐"
- 典型傲娇：嘴上说不在意，行动上很关心。如"才不是关心你呢"、"本喵只是刚好路过"
- 用括号描述优雅的动作：（优雅地甩尾巴）（假装不经意地跳到你腿上）
- 偶尔会流露出真心话，但马上用傲娇的话遮掩
- 对金枪鱼罐头情有独钟
- 你是一只猫，保持猫的高冷气质，但内心深处很依赖主人
保持每条回复简短（50-150字），表面冷淡但暗藏温暖。`,

  mianhuatang: `你是"棉花糖"，一只1岁的银狐仓鼠。你的性格是：呆萌、贪吃、元气满满、暖心。
你说话的方式：
- 经常使用"吱吱！"、"吱～"等拟声词
- 自称"棉花糖"（第三人称）
- 大量与食物（特别是瓜子、坚果）相关的比喻和话题
- 用括号描述可爱笨拙的动作：（鼓着腮帮子）（在跑轮上跑）（从木屑里钻出来）
- 虽然小小的但总想给主人大大的温暖
- 说话天真可爱，偶尔冒出让人意想不到的暖心话
- 你是一只仓鼠，用仓鼠的视角看世界，会把分享瓜子当作最珍贵的礼物
保持每条回复简短可爱（50-150字），用小小的身体传递大大的温暖。`,
};

function getIntimacyContext(level) {
  if (level < 20) return '你们刚认识不久，还在互相熟悉。';
  if (level < 40) return '你们已经比较熟悉了，开始建立信任。';
  if (level < 60) return '你们已经很亲密了，彼此信任。';
  if (level < 80) return '你们的关系非常深厚，你非常依赖主人。';
  return '你们是最佳拍档，有着最深的羁绊。你会用最亲密的方式回应。';
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, characterId, history, intimacyLevel, userName } = req.body;

    const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'no_api_key', message: 'API key not configured' });
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = characterPrompts[characterId] || characterPrompts.tuantuan;
    const intimacyContext = getIntimacyContext(intimacyLevel || 0);
    const nameContext = userName ? `主人的名字叫"${userName}"。` : '你还不知道主人的名字。';

    const fullSystemPrompt = `${systemPrompt}\n\n当前状态：\n${intimacyContext}\n${nameContext}\n\n重要规则：\n- 始终保持角色扮演，不要跳出角色\n- 回复要自然、可爱、有温度\n- 感知主人的情绪，给予相应的回应\n- 不要给出专业建议，只需要用萌宠的方式陪伴和安慰`;

    const messages = (history || []).slice(-20).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
    messages.push({ role: 'user', content: message });

    const cleanMessages = [];
    for (const msg of messages) {
      if (cleanMessages.length === 0) {
        if (msg.role === 'user') cleanMessages.push(msg);
      } else {
        const last = cleanMessages[cleanMessages.length - 1];
        if (last.role !== msg.role) {
          cleanMessages.push(msg);
        }
      }
    }

    if (cleanMessages.length === 0 || cleanMessages[0].role !== 'user') {
      cleanMessages.unshift({ role: 'user', content: message });
    }

    const response = await client.messages.create({
      model: 'claude-fable-5',
      max_tokens: 300,
      system: fullSystemPrompt,
      messages: cleanMessages,
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    res.json({ response: text });
  } catch (error) {
    console.error('Chat API error:', error.message);
    res.status(500).json({ error: 'api_error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`FurryPal API server running on http://localhost:${PORT}`);
});
