import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Trash2, PawPrint, Info, Shield, Volume2, Key, Bot, Eye, EyeOff } from 'lucide-react';

interface SettingsPageProps {
  userName: string;
  setUserName: (name: string) => void;
  clearAllData: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export function SettingsPage({ userName, setUserName, clearAllData, apiKey, setApiKey }: SettingsPageProps) {
  const [nameInput, setNameInput] = useState(userName);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleSaveKey = () => {
    setApiKey(keyInput.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleClearData = () => {
    clearAllData();
    setShowConfirm(false);
    setNameInput('');
    setKeyInput('');
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-6 pt-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings size={22} className="text-amber-400" />
            设置
          </h1>
        </motion.div>

        <div className="space-y-4">
          {/* User Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-amber-400" />
              <h3 className="text-sm font-medium">个人信息</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="你的名字"
                className="flex-1 bg-surface-light rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/20 transition-colors"
                maxLength={20}
              />
              <button
                onClick={handleSaveName}
                className="bg-amber-600/20 text-amber-400 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600/30 transition-colors"
              >
                {saved ? '已保存 ✓' : '保存'}
              </button>
            </div>
          </motion.div>

          {/* AI Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Bot size={16} className="text-violet-400" />
              <h3 className="text-sm font-medium">AI 对话配置</h3>
              {apiKey && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  已启用
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mb-3">
              配置 Anthropic API Key 后，萌宠将使用 Claude AI 进行真正的智能对话。不配置则使用预设回复。
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full bg-surface-light rounded-xl px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-violet-500/20 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showKey ? <EyeOff size={14} className="text-text-muted" /> : <Eye size={14} className="text-text-muted" />}
                  </button>
                </div>
                <button
                  onClick={handleSaveKey}
                  className="bg-violet-600/20 text-violet-400 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-600/30 transition-colors shrink-0"
                >
                  {keySaved ? '已保存 ✓' : '保存'}
                </button>
              </div>
              <div className="flex items-start gap-2 mt-2">
                <Key size={12} className="text-text-muted shrink-0 mt-0.5" />
                <p className="text-[10px] text-text-muted leading-relaxed">
                  API Key 仅保存在你的本地浏览器中，不会上传到任何服务器。需要同时启动后端代理服务（npm run server）才能使用 AI 对话功能。
                </p>
              </div>
            </div>
          </motion.div>

          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-amber-400" />
              <h3 className="text-sm font-medium">关于毛茸伙伴</h3>
            </div>
            <div className="space-y-3 text-sm text-text-secondary">
              <div className="flex items-start gap-3">
                <PawPrint size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p>毛茸伙伴 FurryPal 是一款AI萌宠陪伴应用，你可以和可爱的虚拟萌宠互动聊天，获得温暖的情感陪伴。</p>
              </div>
              <div className="flex items-start gap-3">
                <Shield size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <p>我们重视你的隐私。所有聊天记录仅保存在你的本地设备上，不会上传到任何服务器。</p>
              </div>
              <div className="flex items-start gap-3">
                <Volume2 size={16} className="text-pink-400 shrink-0 mt-0.5" />
                <p>如果你正在经历严重的心理困扰，请及时寻求专业的心理咨询帮助。</p>
              </div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <PawPrint size={16} className="text-amber-400" />
              <h3 className="text-sm font-medium">v1.5 功能特色</h3>
            </div>
            <div className="space-y-2">
              {[
                { emoji: '🤖', text: 'Claude AI 智能对话（可选）' },
                { emoji: '🐾', text: '多只萌宠个性化陪伴' },
                { emoji: '💬', text: '智能情绪感知对话' },
                { emoji: '😸', text: '萌宠专属表情贴纸' },
                { emoji: '📅', text: '心情日历热力图' },
                { emoji: '📊', text: '心情统计周报/月报' },
                { emoji: '🔥', text: '连续签到streak奖励' },
                { emoji: '🏆', text: '亲密度成就解锁系统' },
                { emoji: '📔', text: '心情日记与记录' },
                { emoji: '🔒', text: '本地隐私数据保护' },
              ].map(feature => (
                <div key={feature.text} className="flex items-center gap-3 py-1">
                  <span className="text-lg">{feature.emoji}</span>
                  <span className="text-sm text-text-secondary">{feature.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-4 border border-red-500/10"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={16} className="text-red-400" />
              <h3 className="text-sm font-medium text-red-400">危险操作</h3>
            </div>
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-2.5 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                清除所有数据
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-400">确定要清除所有数据吗？这将删除所有聊天记录、心情日记和亲密度数据，且无法恢复。</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm text-text-secondary bg-surface-lighter hover:bg-surface-light transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleClearData}
                    className="flex-1 py-2.5 rounded-xl text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-4"
          >
            <p className="text-text-muted text-xs">毛茸伙伴 FurryPal v1.5.0</p>
            <p className="text-text-muted text-[10px] mt-1">Made with 🐾</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
