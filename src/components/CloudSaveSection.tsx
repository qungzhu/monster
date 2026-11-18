import { useState } from 'react';
import { createCloudSave, deleteCloudSave, disableCloudSave, pushCloudSave, restoreCloudSave, syncCode } from '../sync/cloudSave';

/** Settings block: turn on cloud save, show the sync code, or restore from one. */
export function CloudSaveSection() {
  const [code, setCode] = useState(() => syncCode());
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setNote(null);
    try {
      await job();
    } catch {
      setNote('网络好像不太好,稍后再试试~');
    } finally {
      setBusy(false);
    }
  };

  const turnOn = () => run(async () => {
    setCode(await createCloudSave());
    setNote('已开启!换手机时输入下面的同步码就能找回一切。');
  });

  const restore = () => run(async () => {
    if (!input.trim()) return;
    if (!confirm('用这个同步码的存档替换本机的数据吗?本机现在的进度会被覆盖。')) return;
    if (await restoreCloudSave(input)) {
      setNote('找回来啦!正在载入…');
      setTimeout(() => location.reload(), 800);
    } else {
      setNote('没找到这个同步码,检查一下有没有输错?');
    }
  });

  const syncNow = () => run(async () => {
    const r = await pushCloudSave();
    if (r === 'replaced') {
      setNote('另一台设备有更新的进度,正在载入…');
      setTimeout(() => location.reload(), 800);
    } else if (r === 'error') {
      setNote('同步失败,稍后会自动再试。');
    } else if (r === 'off') {
      setCode(null);
      setNote('这个存档已在别处删除,本机已停止同步。');
    } else {
      setNote('已同步 ✓');
    }
  });

  const turnOff = () => {
    disableCloudSave();
    setCode(null);
    setNote('本机已停止同步,云端存档还在,用同步码随时能找回。');
  };

  const remove = () => run(async () => {
    if (!confirm('删除云端存档吗?本机数据不受影响,但同步码会失效。')) return;
    await deleteCloudSave();
    setCode(null);
    setNote('云端存档已删除。');
  });

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setNote('同步码已复制');
    } catch {
      setNote('复制失败,请手动记下同步码');
    }
  };

  return (
    <section className="mb-4 rounded-xl bg-surface-light p-3" aria-labelledby="cloud-save-title">
      <h3 id="cloud-save-title" className="text-sm font-semibold text-text-primary mb-1">☁️ 云端存档</h3>
      {code ? (
        <>
          <p className="text-xs text-text-muted mb-2">已开启自动同步。新手机上在这里输入同步码即可恢复宠物、记忆和心情日记。</p>
          <div className="flex items-center gap-2 mb-2">
            <code className="flex-1 select-all rounded-lg bg-black/10 px-3 py-2 text-center font-mono text-base tracking-wider text-text-primary">{code}</code>
            <button onClick={copy} className="glass rounded-lg px-3 py-2 text-xs text-text-secondary">复制</button>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} onClick={syncNow} className="flex-1 glass rounded-lg py-2 text-xs text-text-secondary disabled:opacity-50">立即同步</button>
            <button disabled={busy} onClick={turnOff} className="flex-1 glass rounded-lg py-2 text-xs text-text-secondary disabled:opacity-50">本机停止同步</button>
            <button disabled={busy} onClick={remove} className="flex-1 rounded-lg py-2 text-xs text-red-400 bg-red-500/10 disabled:opacity-50">删除云端</button>
          </div>
          <p className="mt-2 text-[11px] text-text-muted">同步码就是钥匙,请不要发给别人。API Key 不会上传。</p>
        </>
      ) : (
        <>
          <p className="text-xs text-text-muted mb-2">数据现在只存在这台设备上。开启后换手机、清缓存都不会丢。</p>
          <button disabled={busy} onClick={turnOn} className="w-full glass rounded-lg py-2 text-sm text-text-secondary mb-2 disabled:opacity-50">开启云端存档</button>
          <label htmlFor="sync-code-input" className="block text-xs text-text-muted mb-1">已有同步码?</label>
          <div className="flex gap-2">
            <input
              id="sync-code-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="off"
              className="flex-1 min-w-0 bg-black/10 rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted outline-none"
            />
            <button disabled={busy || !input.trim()} onClick={restore} className="glass rounded-lg px-3 py-2 text-xs text-text-secondary disabled:opacity-50">恢复</button>
          </div>
        </>
      )}
      {note && <p role="status" className="mt-2 text-xs text-text-secondary">{note}</p>}
    </section>
  );
}
