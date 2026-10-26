import { Bell, BellOff } from 'lucide-react';
import { formatDue } from '../data/agent';
import type { Job, ProactiveSettings } from './jobs';
import type { PushStatus } from './useProactive';

interface ProactiveCardProps {
  petName: string;
  settings: ProactiveSettings;
  onSettings: (patch: Partial<ProactiveSettings>) => void;
  status: PushStatus;
  upcoming: Job[];
  error: string;
  onEnable: () => void;
  onDisable: () => void;
  onTest: () => void;
}

const statusText: Record<PushStatus, string> = {
  checking: '正在检查…',
  unsupported: '这个浏览器不支持离线通知;App 开着时我照样会提醒你',
  off: '关着 App 也能收到提醒',
  denied: '通知被浏览器屏蔽了,请在浏览器设置里允许本站通知',
  on: '已开启 · 关着 App 也会按时提醒你',
  unavailable: '提醒服务器没有运行,暂时只能在 App 开着时提醒',
};

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="block text-xs text-text-primary">{label}</span>
        <span className="block text-[10px] text-text-muted">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={label} className="h-4 w-4 shrink-0 accent-violet-500" />
    </label>
  );
}

/** Settings for what the pet does on its own, plus offline notifications. */
export function ProactiveCard({ petName, settings, onSettings, status, upcoming, error, onEnable, onDisable, onTest }: ProactiveCardProps) {
  const on = status === 'on';
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[.06] p-3" aria-label="主动关心与提醒">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
            {on ? <Bell size={13} className="text-amber-300" /> : <BellOff size={13} className="text-text-muted" />}
            离线通知
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-text-muted">{statusText[status]}</p>
        </div>
        {on ? (
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={onTest} className="rounded-lg bg-white/8 px-2.5 py-1.5 text-[10px] text-text-secondary">测试</button>
            <button type="button" onClick={onDisable} className="rounded-lg bg-white/8 px-2.5 py-1.5 text-[10px] text-text-secondary">关闭</button>
          </div>
        ) : (status === 'off' || status === 'unavailable') && (
          <button type="button" onClick={onEnable} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-semibold text-white">开启通知</button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[10px] text-rose-300">{error}</p>}

      <div className="mt-2 border-t border-white/8 pt-1.5">
        <p className="text-[10px] font-semibold text-text-secondary">{petName}会主动…</p>
        <label className="flex items-center justify-between gap-3 py-1.5">
          <span className="min-w-0">
            <span className="block text-xs text-text-primary">早安问候</span>
            <span className="block text-[10px] text-text-muted">每天这个时间跟你说早安</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <input
              type="time"
              value={settings.morningTime}
              onChange={e => e.target.value && onSettings({ morningTime: e.target.value })}
              disabled={!settings.morning}
              aria-label="早安时间"
              className="rounded-md border border-white/10 bg-white/6 px-1.5 py-0.5 text-[11px] text-text-primary disabled:opacity-40"
            />
            <input type="checkbox" checked={settings.morning} onChange={e => onSettings({ morning: e.target.checked })} aria-label="早安问候" className="h-4 w-4 accent-violet-500" />
          </span>
        </label>
        <Toggle label="重要日子关心" hint="考试、面试当天早上为你加油,晚上问问怎么样" checked={settings.eventCare} onChange={v => onSettings({ eventCare: v })} />
        <Toggle label="想你了" hint="两天没来看它,它会想你" checked={settings.missYou} onChange={v => onSettings({ missYou: v })} />
      </div>

      {upcoming.length > 0 && (
        <div className="mt-1.5 border-t border-white/8 pt-2">
          <p className="mb-1 text-[10px] font-semibold text-text-secondary">接下来</p>
          {upcoming.slice(0, 4).map(j => (
            <div key={j.id} className="flex items-center gap-2 py-0.5 text-[10px]">
              <span className="w-[74px] shrink-0 text-text-muted">{formatDue(new Date(j.at).toISOString())}</span>
              <span className="min-w-0 flex-1 truncate text-text-secondary">{j.body}</span>
              {j.repeat && <span className="shrink-0 text-text-muted">↻</span>}
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-[9px] leading-relaxed text-text-muted">
        🔒 开启通知后，要提醒的内容会存到提醒服务器，只用于按时发给你;关闭通知即全部删除。
      </p>
    </div>
  );
}
