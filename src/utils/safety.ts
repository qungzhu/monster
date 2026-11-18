/**
 * Crisis safety net. An emotional-companion app will meet people who are
 * thinking about hurting themselves; when that shows up the pet must not
 * answer with a cute template or a guess from the model. It answers with
 * care and real places to get help, every time, online or offline.
 *
 * The same patterns live in server/safety.js so the API stays safe for any
 * client. Keep the two lists in sync (server/tests/safety-test.mjs checks
 * them against each other).
 */

export const CRISIS_PATTERNS: RegExp[] = [
  // "想死你了 / 想死我了" means "missed you so much" — not a crisis.
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

export function isCrisisMessage(text: string): boolean {
  return CRISIS_PATTERNS.some(re => re.test(text));
}

/** Help lines shown with every crisis reply (mainland China). */
export const CRISIS_RESOURCES = [
  '📞 全国心理援助热线 12356',
  '📞 希望24热线 400-161-9995(24 小时)',
  '🚨 如果你已经有危险,请马上拨打 120 或 110',
].join('\n');

export function crisisReply(petName: string): string {
  return `${petName}好担心你……你说的话我都认真听到了,你现在一定特别难受。你不用一个人扛着,可以现在就联系能帮到你的人吗?\n${CRISIS_RESOURCES}\n也可以告诉身边信任的人。我会一直在这里陪着你。`;
}
