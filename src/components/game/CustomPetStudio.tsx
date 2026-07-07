import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Sparkles, Heart, RefreshCw } from 'lucide-react';
import { buildCustomBreed } from '../../data/breeds';
import type { Breed, CatParams, DogParams } from '../../data/breeds';
import type { PetAnalysis } from '../../utils/petAnalysis';
import { analyzeLocally, analyzeWithAI, extractVideoFrame, readImageScaled, startMeshyGeneration, pollMeshyStatus, fetchMeshyModel } from '../../utils/petAnalysis';
import { PetScene } from '../pets/PetScene';

interface CustomPetStudioProps {
  show: boolean;
  onClose: () => void;
  onSave: (pet: Breed) => void;
  apiKey: string;
}

type Stage = 'upload' | 'analyzing' | 'result';

/**
 * The photo studio: upload a photo or video of your real pet and the
 * app rebuilds it as a living 3D companion. Claude vision reads the
 * photo when an API key is set; otherwise colors are extracted
 * locally and everything stays adjustable.
 */
export function CustomPetStudio({ show, onClose, onSave, apiKey }: CustomPetStudioProps) {
  const [stage, setStage] = useState<Stage>('upload');
  const [photo, setPhoto] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PetAnalysis | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hdState, setHdState] = useState<'idle' | 'generating' | 'done' | 'failed'>('idle');
  const [hdProgress, setHdProgress] = useState(0);
  const [hdUrl, setHdUrl] = useState<string | null>(null);
  const hdPolling = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewBreed: Breed | null = useMemo(() => {
    if (!analysis) return null;
    const params = analysis.species === 'cat'
      ? {
          bodyColor: analysis.bodyColor,
          pointColor: analysis.accentColor,
          bellyColor: analysis.bellyColor,
          eyeColor: analysis.eyeColor,
          earStyle: analysis.earStyle === 'fold' ? 'fold' : 'point',
        } as CatParams
      : {
          bodyColor: analysis.bodyColor,
          accentColor: analysis.accentColor,
          bellyColor: analysis.bellyColor,
          eyeColor: analysis.eyeColor,
          earStyle: analysis.earStyle === 'pointy' ? 'pointy' : 'floppy',
          tailStyle: analysis.tailStyle,
          legScale: analysis.legScale,
        } as DogParams;
    return buildCustomBreed({
      species: analysis.species,
      petName: name || analysis.suggestedName,
      personality: analysis.personality,
      breedGuess: analysis.breedGuess,
      params,
      glbUrl: hdUrl ?? undefined,
    });
  }, [analysis, name, hdUrl]);

  const reset = () => {
    setStage('upload');
    setPhoto(null);
    setAnalysis(null);
    setName('');
    setError(null);
    setHdState('idle');
    setHdProgress(0);
    setHdUrl(null);
    hdPolling.current = false;
  };

  /** Meshy photo-to-mesh: kicks off generation and polls every 10s
   *  (a task usually takes 2-5 minutes and consumes Meshy credits). */
  const startHD = async () => {
    if (!photo || hdState === 'generating') return;
    setHdState('generating');
    setHdProgress(2);
    hdPolling.current = true;
    try {
      const taskId = await startMeshyGeneration(photo);
      while (hdPolling.current) {
        await new Promise(r => setTimeout(r, 10000));
        const s = await pollMeshyStatus(taskId);
        setHdProgress(Math.max(5, s.progress));
        if (s.status === 'SUCCEEDED' && s.glbUrl) {
          const localUrl = await fetchMeshyModel(s.glbUrl, taskId);
          setHdUrl(localUrl);
          setHdState('done');
          return;
        }
        if (s.status === 'FAILED') throw new Error(s.error || 'generation failed');
      }
    } catch (e) {
      setHdState('failed');
      setError(String(e).includes('no_meshy_key')
        ? '未配置Meshy Key：请在项目根目录 .env 里设置 MESHY_API_KEY 并重启后端'
        : '高清复刻失败了，稍后再试或继续用Q版形象');
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const dataUrl = file.type.startsWith('video/')
        ? await extractVideoFrame(file)
        : await readImageScaled(file);
      setPhoto(dataUrl);
      setStage('analyzing');

      let result: PetAnalysis;
      if (apiKey) {
        try {
          result = await analyzeWithAI(dataUrl, apiKey);
        } catch {
          // Backend down or key invalid — fall back to local extraction
          result = await analyzeLocally(dataUrl, 'dog');
        }
      } else {
        result = await analyzeLocally(dataUrl, 'dog');
      }
      setAnalysis(result);
      setName(result.suggestedName);
      setStage('result');
    } catch {
      setError('文件读取失败，换一张试试？');
      setStage('upload');
    }
  };

  const patchAnalysis = (patch: Partial<PetAnalysis>) => {
    setAnalysis(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSave = () => {
    if (!previewBreed) return;
    onSave({ ...previewBreed, petName: name || previewBreed.petName });
    reset();
    onClose();
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
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="relative w-full max-w-lg rounded-t-3xl overflow-hidden game-panel"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 relative">
              <div className="w-10 h-1 rounded-full bg-white/20" />
              <button onClick={onClose} className="absolute right-4 top-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X size={15} className="text-text-muted" />
              </button>
            </div>

            <div className="px-5 pt-2 pb-3">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Camera size={17} className="text-pink-400" /> 萌宠照相馆
              </h2>
              <p className="text-[11px] text-text-muted">上传你家宝贝的照片或视频，让它走进这个世界</p>
            </div>

            <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              {/* Stage: upload */}
              {stage === 'upload' && (
                <div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-2xl border-2 border-dashed border-white/20 py-12 flex flex-col items-center gap-3 hover:border-pink-400/50 transition-colors"
                  >
                    <span className="text-4xl">📸</span>
                    <span className="text-sm text-text-secondary">点击选择照片或视频</span>
                    <span className="text-[10px] text-text-muted">支持 JPG / PNG / MP4，正脸清晰效果最好</span>
                  </button>
                  <input
                    ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                  />
                  {error && <p className="text-xs text-red-400 mt-3 text-center">{error}</p>}
                  <p className="text-[10px] text-text-muted mt-4 text-center leading-relaxed">
                    🔒 照片只在你的设备上处理{apiKey ? '，AI识别时仅发送给Claude用于分析' : ''}，不会被存储或上传到其他地方
                  </p>
                </div>
              )}

              {/* Stage: analyzing */}
              {stage === 'analyzing' && (
                <div className="py-10 text-center">
                  {photo && (
                    <img src={photo} alt="pet" className="w-32 h-32 object-cover rounded-2xl mx-auto mb-5 border border-white/15" />
                  )}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="inline-block mb-3"
                  >
                    <Sparkles size={22} className="text-pink-400" />
                  </motion.div>
                  <p className="text-sm text-text-secondary">
                    {apiKey ? 'AI正在端详你家宝贝的模样...' : '正在提取毛色...'}
                  </p>
                </div>
              )}

              {/* Stage: result */}
              {stage === 'result' && analysis && previewBreed && (
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    {/* Live 3D preview */}
                    <div className="shrink-0 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <PetScene characterId={previewBreed.characterId} customBreed={previewBreed} size="medium" interactive={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {photo && (
                        <img src={photo} alt="original" className="w-14 h-14 object-cover rounded-xl border border-white/15 mb-2" />
                      )}
                      {analysis.breedGuess && (
                        <p className="text-[10px] text-text-muted mb-1">AI识别：{analysis.breedGuess}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {analysis.personality.map(tag => (
                          <span key={tag} className="text-[9px] text-text-muted bg-white/8 rounded-full px-2 py-0.5">{tag}</span>
                        ))}
                      </div>
                      <label className="text-[10px] text-text-muted block mb-1">给它起个名字</label>
                      <input
                        type="text" value={name} onChange={e => setName(e.target.value)} maxLength={12}
                        className="w-full bg-surface-light rounded-lg px-3 py-2 text-sm text-text-primary outline-none border border-transparent focus:border-pink-400/40"
                      />
                    </div>
                  </div>

                  {/* Adjustments */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-text-muted w-14 shrink-0">物种</span>
                      {(['dog', 'cat'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => patchAnalysis({ species: s, earStyle: s === 'cat' ? 'point' : 'floppy' })}
                          className={`rounded-full px-3 py-1 text-xs ${analysis.species === s ? 'bg-white/20 text-text-primary' : 'bg-white/5 text-text-muted'}`}
                        >
                          {s === 'dog' ? '🐶 狗狗' : '🐱 猫咪'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-text-muted w-14 shrink-0">耳朵</span>
                      {(analysis.species === 'cat' ? [['point', '尖耳'], ['fold', '折耳']] : [['floppy', '垂耳'], ['pointy', '立耳']]).map(([v, label]) => (
                        <button
                          key={v}
                          onClick={() => patchAnalysis({ earStyle: v })}
                          className={`rounded-full px-3 py-1 text-xs ${analysis.earStyle === v ? 'bg-white/20 text-text-primary' : 'bg-white/5 text-text-muted'}`}
                        >
                          {label}
                        </button>
                      ))}
                      {analysis.species === 'dog' && (
                        <>
                          <span className="text-[11px] text-text-muted shrink-0 ml-2">尾巴</span>
                          {([['wag', '直尾'], ['curl', '卷尾']] as const).map(([v, label]) => (
                            <button
                              key={v}
                              onClick={() => patchAnalysis({ tailStyle: v })}
                              className={`rounded-full px-3 py-1 text-xs ${analysis.tailStyle === v ? 'bg-white/20 text-text-primary' : 'bg-white/5 text-text-muted'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-text-muted w-14 shrink-0">毛色</span>
                      {([['bodyColor', '主色'], ['accentColor', '深色'], ['bellyColor', '肚皮'], ['eyeColor', '眼睛']] as const).map(([key, label]) => (
                        <label key={key} className="flex flex-col items-center gap-1 cursor-pointer">
                          <input
                            type="color"
                            value={analysis[key]}
                            onChange={e => patchAnalysis({ [key]: e.target.value } as Partial<PetAnalysis>)}
                            className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                          />
                          <span className="text-[9px] text-text-muted">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* HD photo-to-mesh reconstruction */}
                  <div className="mb-3 rounded-xl p-3" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                    {hdState === 'idle' && (
                      <button onClick={startHD} className="w-full text-left">
                        <p className="text-xs font-medium text-violet-300">✨ 高清3D复刻（Meshy）</p>
                        <p className="text-[10px] text-text-muted mt-0.5">用真实3D网格重建你家宝贝的模样，约2-5分钟 · 消耗Meshy额度 · 点击开始</p>
                      </button>
                    )}
                    {hdState === 'generating' && (
                      <div>
                        <p className="text-xs text-violet-300 mb-1.5">✨ 正在雕刻中... {hdProgress}%</p>
                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-pink-400 transition-all duration-700" style={{ width: `${hdProgress}%` }} />
                        </div>
                        <p className="text-[10px] text-text-muted mt-1.5">可以先关掉面板去陪它玩，回来再看</p>
                      </div>
                    )}
                    {hdState === 'done' && (
                      <p className="text-xs text-green-400">✅ 高清模型完成！左侧预览已切换为真实3D网格</p>
                    )}
                    {hdState === 'failed' && (
                      <button onClick={() => { setHdState('idle'); setError(null); }} className="w-full text-left">
                        <p className="text-xs text-red-400">{error || '复刻失败'}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">点击重试</p>
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={reset}
                      className="rounded-xl px-4 py-2.5 text-xs text-text-secondary bg-white/8 flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} /> 换一张
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleSave}
                      className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white flex items-center justify-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
                    >
                      <Heart size={13} fill="currentColor" />
                      让{name || '它'}住进冰雪世界
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
