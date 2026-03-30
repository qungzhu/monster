import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Trash2, Heart, Info, Shield, Volume2 } from 'lucide-react';

interface SettingsPageProps {
  userName: string;
  setUserName: (name: string) => void;
  clearAllData: () => void;
}

export function SettingsPage({ userName, setUserName, clearAllData }: SettingsPageProps) {
  const [nameInput, setNameInput] = useState(userName);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClearData = () => {
    clearAllData();
    setShowConfirm(false);
    setNameInput('');
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
            <Settings size={22} className="text-primary-light" />
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
              <User size={16} className="text-primary-light" />
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
                className="bg-primary/20 text-primary-light px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/30 transition-colors"
              >
                {saved ? '已保存 ✓' : '保存'}
              </button>
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
              <Info size={16} className="text-primary-light" />
              <h3 className="text-sm font-medium">关于心语</h3>
            </div>
            <div className="space-y-3 text-sm text-text-secondary">
              <div className="flex items-start gap-3">
                <Heart size={16} className="text-pink-400 shrink-0 mt-0.5" />
                <p>心语 SoulWhisper 是一款AI情绪陪伴应用，旨在为你提供温暖的情感支持和陪伴。</p>
              </div>
              <div className="flex items-start gap-3">
                <Shield size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <p>我们重视你的隐私。所有聊天记录仅保存在你的本地设备上，不会上传到任何服务器。</p>
              </div>
              <div className="flex items-start gap-3">
                <Volume2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
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
              <Heart size={16} className="text-primary-light" />
              <h3 className="text-sm font-medium">功能特色</h3>
            </div>
            <div className="space-y-2">
              {[
                { emoji: '💬', text: '智能情绪感知对话' },
                { emoji: '📔', text: '心情日记与记录' },
                { emoji: '💕', text: '亲密度成长系统' },
                { emoji: '🎭', text: '多角色个性化陪伴' },
                { emoji: '📅', text: '每日签到与问候' },
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
            <p className="text-text-muted text-xs">心语 SoulWhisper v1.0.0</p>
            <p className="text-text-muted text-[10px] mt-1">Made with ❤️</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
