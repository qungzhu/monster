// Server copy of src/utils/safety.ts — keep the patterns in sync
// (server/tests/safety-test.mjs fails when they drift apart).

export const CRISIS_PATTERNS = [
  /想死(?![你您他她它]|我了)/,
  /不想活/,
  /活不下去/,
  /活着(真)?没(有)?意思/,
  /活着有什么意思/,
  /不如死了/,
  /自杀/,
  /轻生/,
  /寻死/,
  /结束(我的|自己的)?生命/,
  /了结(我)?自己/,
  /割腕/,
  /跳楼/,
  /自残/,
  /伤害自己/,
  /(吃|吞)了?(好多|一整瓶|很多)?(安眠药|药片)/,
  /\bkill(ing)? myself\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend (my|it all|my life)\b/i,
  /\bwant(s|ed)? to die\b/i,
  /\bself[- ]?harm\b/i,
];

export const isCrisisMessage = text => CRISIS_PATTERNS.some(re => re.test(String(text ?? '')));

export const CRISIS_RESOURCES = [
  '📞 全国心理援助热线 12356',
  '📞 希望24热线 400-161-9995(24 小时)',
  '🚨 如果你已经有危险,请马上拨打 120 或 110',
].join('\n');

/** Added to every chat system prompt. */
export const SAFETY_RULES = `- 如果主人流露出伤害自己、轻生或活不下去的念头:认真、温柔地回应,不淡化、不开玩笑、不讲道理;鼓励主人现在就联系心理援助热线 12356 或身边信任的人,有危险时拨打 120/110;不要提供任何伤害自己的方法
- 你是陪伴者,不是医生或心理咨询师;主人长期情绪低落时,温和地建议寻求专业帮助`;
