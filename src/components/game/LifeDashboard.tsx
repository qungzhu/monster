import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, CalendarDays, Check, LoaderCircle, Pencil, Play, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { companionRoles, lifeItemMeta } from '../../data/companion';
import { formatDue, formatRepeat } from '../../data/agent';
import type { AgentRun, CompanionRole, LifeItem, LifeItemType } from '../../data/companion';
import {
  disconnectGoogleCalendar,
  getGoogleCalendarEvents,
  getGoogleCalendarStatus,
} from '../../utils/googleCalendar';
import type { GoogleCalendarEvent, GoogleCalendarStatus } from '../../utils/googleCalendar';

interface LifeDashboardProps {
  show: boolean;
  onClose: () => void;
  userName: string;
  petName: string;
  hubName: string;
  onHubNameChange: (name: string) => void;
  agentRuns: AgentRun[];
  chatCount: number;
  moodCount: number;
  role: CompanionRole;
  onRoleChange: (role: CompanionRole) => void;
  memoryCount: number;
  onOpenMemories: () => void;
  /** Hand a request to the pet's task agent (plan → confirm → run). */
  onCommand: (command: string) => void;
  /** Extra section under the memory entry (proactive settings). */
  extra?: ReactNode;
  items: LifeItem[];
  onAdd: (item: Omit<LifeItem, 'id' | 'createdAt' | 'completed'>) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const addTypes: LifeItemType[] = ['todo', 'package', 'weight', 'study', 'mood'];

const starterPlan: Array<Omit<LifeItem, 'id' | 'createdAt' | 'completed'>> = [
  { type: 'todo', title: '选出今天最重要的一件事' },
  { type: 'study', title: '专注学习 25 分钟' },
  { type: 'mood', title: '睡前记录今天的心情' },
];

export function LifeDashboard({
  show, onClose, userName, petName, hubName, onHubNameChange, agentRuns, chatCount, moodCount,
  role, onRoleChange, memoryCount, onOpenMemories, onCommand, extra, items, onAdd, onToggle, onRemove,
}: LifeDashboardProps) {
  const [type, setType] = useState<LifeItemType>('todo');
  const [title, setTitle] = useState('');
  const [isEditingHubName, setIsEditingHubName] = useState(false);
  // Rarely used settings stay folded so the hub opens on what matters today.
  const [showMore, setShowMore] = useState(false);
  const [hubNameDraft, setHubNameDraft] = useState('');
  const [agentState, setAgentState] = useState<'idle' | 'working' | 'done'>('idle');
  const [agentCommand, setAgentCommand] = useState('');
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = useMemo(() => items.filter(item => !item.completed).length, [items]);
  const completed = items.length - pending;
  const displayHubName = hubName || `${petName} AI 中枢`;

  const loadCalendarConnection = async () => {
    setCalendarLoading(true);
    setCalendarError('');
    try {
      const status = await getGoogleCalendarStatus();
      setCalendarStatus(status);
      if (status.connected) setCalendarEvents(await getGoogleCalendarEvents());
      else setCalendarEvents([]);
    } catch {
      setCalendarStatus(null);
      setCalendarEvents([]);
      setCalendarError('连接器服务暂时不可用');
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (show) void loadCalendarConnection();
  }, [show]);

  const saveHubName = () => {
    onHubNameChange(hubNameDraft);
    setIsEditingHubName(false);
  };

  const submit = () => {
    const value = title.trim();
    if (!value) return;
    onAdd({ type, title: type === 'weight' && !/kg|公斤|千克/i.test(value) ? `${value} kg` : value });
    setTitle('');
  };

  const chooseSkill = (nextType: LifeItemType) => {
    setType(nextType);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const generatePlan = () => {
    if (agentState === 'working') return;
    setAgentState('working');
    setTimeout(() => {
      starterPlan
        .filter(suggestion => !items.some(item => item.title === suggestion.title))
        .forEach(onAdd);
      setAgentState('done');
    }, 850);
  };

  const sendCommand = () => {
    const command = agentCommand.trim();
    if (!command) return;
    setAgentCommand('');
    onCommand(command);
  };

  const disconnectCalendar = async () => {
    if (!window.confirm('确定断开 Google Calendar 吗？')) return;
    setCalendarLoading(true);
    try {
      await disconnectGoogleCalendar();
      setCalendarStatus({ configured: true, connected: false });
      setCalendarEvents([]);
    } catch {
      setCalendarError('断开失败，请稍后重试');
    } finally {
      setCalendarLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <motion.section
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="game-panel fp-stagger relative w-full max-w-lg overflow-y-auto rounded-t-3xl"
            style={{ height: 'min(90vh, 760px)' }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div>
                <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" />
                  {petName}在线陪着你
                </div>
                {isEditingHubName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={hubNameDraft}
                      onChange={event => setHubNameDraft(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') saveHubName();
                        if (event.key === 'Escape') setIsEditingHubName(false);
                      }}
                      maxLength={20}
                      aria-label="中枢名称"
                      className="min-w-0 max-w-[220px] rounded-lg border border-violet-400/35 bg-white/8 px-2.5 py-1 text-base font-bold text-text-primary outline-none focus:border-violet-300"
                    />
                    <button
                      type="button"
                      aria-label="保存中枢名称"
                      onClick={saveHubName}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-white"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-lg font-bold text-text-primary">{displayHubName}</h2>
                    <button
                      type="button"
                      aria-label="编辑中枢名称"
                      onClick={() => {
                        setHubNameDraft(displayHubName);
                        setIsEditingHubName(true);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-text-muted">陪伴、记忆和行动集中在这里</p>
              </div>
              <button aria-label="关闭 AI 中枢" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <X size={15} />
              </button>
            </div>

            <div className="px-5 py-2">
              <div className="rounded-2xl border border-violet-400/25 fp-aurora p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-200">
                      <Sparkles size={12} /> 主动简报
                    </div>
                    <p className="mt-1.5 text-sm font-semibold leading-snug text-text-primary">
                      {pending > 0
                        ? `${userName}，今天还有 ${pending} 项，我会陪你一件件完成。`
                        : `${userName}，今天还没有安排。要我先帮你搭一个轻量计划吗？`}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      已完成 {completed} 项 · 已记住 {items.length} 条生活事项
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generatePlan}
                    disabled={agentState === 'working'}
                    className="shrink-0 rounded-xl bg-violet-500 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-70"
                  >
                    {agentState === 'working' ? (
                      <span className="flex items-center gap-1"><LoaderCircle size={12} className="animate-spin" />规划中</span>
                    ) : agentState === 'done' ? '计划已就绪' : '安排今天'}
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2 text-[11px] text-text-secondary">
                  <span className={`h-1.5 w-1.5 rounded-full ${agentState === 'working' ? 'animate-pulse bg-amber-300' : agentState === 'done' ? 'bg-emerald-400' : 'bg-violet-300'}`} />
                  {agentState === 'working'
                    ? '正在帮你理一理…'
                    : agentState === 'done'
                      ? '好啦，今天的小计划放在下面了'
                      : '有事随时吩咐我~'}
                </div>
              </div>
            </div>

            <div className="px-5 py-2">
              <button
                type="button"
                onClick={onOpenMemories}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-left"
              >
                <Brain size={18} className="shrink-0 text-violet-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-text-primary">{petName}记得你的事</span>
                  <span className="block text-[11px] text-text-muted">
                    {memoryCount ? `已记住 ${memoryCount} 条 · 聊天时会用上` : '聊着聊着就会记住你'}
                  </span>
                </span>
                <span className="text-xs text-text-muted">›</span>
              </button>
            </div>

            <div className="px-5 py-2">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-text-primary"><Play size={12} className="text-emerald-300" />交给我办</p>
                  <span className="text-[11px] text-text-muted">我先说怎么做，你点头再办</span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={agentCommand}
                    onChange={event => setAgentCommand(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter') sendCommand(); }}
                    placeholder="例如：明天下午3点提醒我取快递，再记一下体重"
                    aria-label="交给我办"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-primary outline-none focus:border-violet-400/50"
                  />
                  <button
                    type="button"
                    onClick={sendCommand}
                    disabled={!agentCommand.trim()}
                    className="rounded-xl bg-white/10 px-3 text-[11px] font-semibold text-text-primary disabled:opacity-40"
                  >
                    分析
                  </button>
                </div>

                {agentRuns.length > 0 && (
                  <div className="mt-2 border-t border-white/6 pt-2">
                    <p className="mb-1 text-[11px] text-text-muted">最近执行</p>
                    {agentRuns.slice(0, 2).map(run => (
                      <div key={run.id} className="flex items-center gap-2 py-1 text-[11px]">
                        <Check size={10} className="shrink-0 text-emerald-300" />
                        <span className="min-w-0 flex-1 truncate text-text-secondary">{run.summary}</span>
                        <span className="shrink-0 text-text-muted">{new Date(run.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-2">
              <button
                type="button"
                onClick={() => setShowMore(v => !v)}
                aria-expanded={showMore}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-left"
              >
                <span>
                  <span className="block text-xs font-bold text-text-primary">更多设置</span>
                  <span className="block text-[11px] text-text-muted">提醒与主动关心 · 日历 · 技能 · 陪伴角色（{companionRoles[role].label}）</span>
                </span>
                <span className="text-xs text-text-muted">{showMore ? '收起' : '展开'}</span>
              </button>
            </div>

            {showMore && (
              <>
              {extra && <div className="px-5 py-2">{extra}</div>}

              <div className="px-5 py-2">
                <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[.07] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-600">G</span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-bold text-text-primary"><CalendarDays size={12} />Google Calendar</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                          {calendarError
                            ? calendarError
                            : calendarLoading
                              ? '正在检查连接状态…'
                              : calendarStatus?.connected
                                ? '已授权，可读取和创建日程'
                                : calendarStatus?.identityRequired
                                  ? '请先登录 FurryPal 账户'
                                  : calendarStatus?.configured
                                    ? '等待你的 Google 授权'
                                    : '等待服务器端 OAuth 配置'}
                        </p>
                      </div>
                    </div>
                    {calendarStatus?.connected ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="刷新 Google 日历"
                          onClick={() => void loadCalendarConnection()}
                          disabled={calendarLoading}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8 text-text-secondary disabled:opacity-40"
                        >
                          <RefreshCw size={12} className={calendarLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void disconnectCalendar()}
                          disabled={calendarLoading}
                          className="rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] text-text-secondary disabled:opacity-40"
                        >
                          断开
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => window.location.assign('/api/connectors/google/start?returnTo=/')}
                        disabled={calendarLoading || !calendarStatus?.configured || calendarStatus.identityRequired}
                        className="shrink-0 rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:bg-white/10 disabled:text-text-muted"
                      >
                        {calendarStatus?.configured ? '连接' : '待配置'}
                      </button>
                    )}
                  </div>
                  {calendarStatus?.connected && calendarEvents.length > 0 && (
                    <div className="mt-2 border-t border-white/6 pt-2">
                      <p className="mb-1 text-[11px] text-text-muted">接下来</p>
                      {calendarEvents.slice(0, 2).map(event => (
                        <div key={event.id} className="flex items-center gap-2 py-1 text-[11px]">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" />
                          <span className="min-w-0 flex-1 truncate text-text-secondary">{event.summary}</span>
                          <span className="shrink-0 text-text-muted">
                            {event.start ? new Date(event.start).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-text-primary">技能</p>
                  <p className="text-[11px] text-text-muted">点一下，直接开始记录</p>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {addTypes.map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => chooseSkill(key)}
                      className="rounded-xl border border-white/8 bg-white/5 px-1 py-2 text-center transition-colors hover:bg-white/10"
                    >
                      <span className="block text-base leading-none">{lifeItemMeta[key].emoji}</span>
                      <span className="mt-1 block text-[11px] text-text-secondary">{lifeItemMeta[key].label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-white/6 bg-white/[.03] px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-text-secondary"><Brain size={12} className="text-fuchsia-300" />我记得：你希望我做你的{companionRoles[role].label}</span>
                  <span className="text-[11px] text-text-muted">{chatCount} 次对话 · {moodCount} 条心情</span>
                </div>
                <p className="mt-1.5 text-center text-[11px] text-text-muted">Google 日历已支持连接 · 物流和其他 App 持续接入中</p>
              </div>

              <div className="flex gap-2 overflow-x-auto px-5 py-2">
                {(Object.keys(companionRoles) as CompanionRole[]).map(key => {
                  const item = companionRoles[key];
                  return (
                    <button
                      key={key}
                      onClick={() => onRoleChange(key)}
                      className="min-w-[112px] rounded-2xl p-3 text-left transition-colors"
                      style={{
                        background: role === key ? 'rgba(139,92,246,.24)' : 'rgba(255,255,255,.05)',
                        border: `1px solid ${role === key ? 'rgba(167,139,250,.55)' : 'rgba(255,255,255,.08)'}`,
                      }}
                    >
                      <span className="text-xl">{item.emoji}</span>
                      <span className="mt-1 block text-xs font-bold text-text-primary">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">{item.description}</span>
                    </button>
                  );
                })}
              </div>

              </>
            )}

            <div className="px-5 py-3">
              <div className="mb-2 flex gap-1.5 overflow-x-auto">
                {addTypes.map(key => (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px]"
                    style={{ background: type === key ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.06)' }}
                  >
                    {lifeItemMeta[key].emoji} {lifeItemMeta[key].label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') submit(); }}
                  placeholder={type === 'weight' ? '例如：58.6' : `添加${lifeItemMeta[type].label}…`}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none"
                />
                <button onClick={submit} disabled={!title.trim()} className="rounded-xl bg-violet-500 px-3 disabled:opacity-40">
                  <Plus size={17} />
                </button>
              </div>
            </div>

            <div className="max-h-[30vh] space-y-2 overflow-y-auto px-5 pb-7">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-3">
                  <button
                    onClick={() => onToggle(item.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20"
                    style={{ background: item.completed ? 'rgba(34,197,94,.28)' : 'transparent' }}
                  >
                    {item.completed && <Check size={14} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs ${item.completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {lifeItemMeta[item.type].emoji} {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {item.due
                        ? `⏰ ${item.repeat ? `${formatRepeat(item.due, item.repeat)} · 下次 ${formatDue(item.due)}` : formatDue(item.due)}${!item.repeat && item.remindedAt ? ' · 已提醒' : ''}`
                        : new Date(item.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => onRemove(item.id)} className="p-1.5 text-text-muted hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-3xl">🌱</p>
                  <p className="mt-2 text-xs text-text-muted">告诉{petName}“提醒我拿快递”或“记录体重58.6”</p>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
