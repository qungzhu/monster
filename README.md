# 毛茸伙伴 FurryPal 🐾

一款 AI 情感陪伴萌宠 App。单一"活的场景"交互范式——没有传统页面和菜单,用**自然语言**驱动一切:对宠物说话即可喂养、抚摸、领养、聊天。目标质感对标《恋与深空》。

- **AI 新范式交互**:一句话就是 UI。说"喂它""领养""今天有点累"分别触发喂食、图鉴、情绪陪伴
- **冰雪奇缘风格场景**:实时 3D 冬季雪景
- **真实照片复刻宠物**:上传萌宠多角度照片 → Meshy 生成专属 3D 形象
- **真骨骼动画**:6 只猫各有 8 个骨骼动作(走/跑/待机/舔爪/吃/睡/喵/开心)+ 会摆动的尾巴 + 十余种程序化动作(翻肚子/打滚/疯跑/捕猎扑击等)
- **毛绒玩具材质**:MeshPhysicalMaterial + sheen 织物绒感

---

## 快速开始

### 环境要求
- Node.js **18+**(建议 20+)
- npm

### 安装

```bash
# 1. 解压代码包,进入项目根目录
npm install

# 2.（可选)配置密钥 —— 不配也能跑,只是 AI 对话/照片建模功能降级为离线模式
cp .env.example .env
#   编辑 .env,填入你自己的 API key(见下方"密钥说明")
```

> **模型文件**:如果你拿到的是分包(`furrypal-models-*.zip`),把里面所有 `.glb` 解压到 `public/models/custom/` 目录下。从 GitHub 仓库克隆则已自带。

### 运行

```bash
# 前端(开发服务器,默认 http://localhost:5173)
npm run dev

# 后端 API 代理(可选,Meshy 建模 / Claude 对话需要,默认端口 3001)
npm run server

# 或一条命令同时起前后端
npm run dev:all
```

浏览器打开 `http://localhost:5173`。

### 构建生产版本

```bash
npm run build      # 输出到 dist/
npm run preview    # 本地预览生产构建
```

---

## 密钥说明

复制 `.env.example` 为 `.env`,填入:

| 变量 | 用途 | 获取 | 不填的影响 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | AI 对话 + 照片视觉分析 | [console.anthropic.com](https://console.anthropic.com)(需有余额) | 对话走本地模板,照片分析走离线取色 |
| `MESHY_API_KEY` | 照片转 3D 建模 | [meshy.ai](https://www.meshy.ai) → Settings → API | 无法生成新的自定义宠物,已内置的猫不受影响 |

> ⚠️ **安全**:`.env` 已在 `.gitignore` 中,**切勿提交或打包进分发文件**。分享代码时用 `git archive` 或本仓库的分包方式(已自动排除 `.env`)。

---

## 项目结构

```
src/
  pages/
    LivingWorld.tsx        # 核心:AI 新范式"活场景",意图路由 + 3D 舞台
    WelcomePage / ...      # 引导、聊天、心情、档案、设置等
  components/
    pets/
      PetScene.tsx         # 3D 画布:相机/灯光/后期,按尺寸切换世界/预览
      GLBPet.tsx           # ★ GLB 宠物渲染:骨骼动画、程序化情绪动作、
                           #   毛绒材质(sheen)、自动归一化
      CatModel/DogModel/…  # 参数化降级模型(GLB 加载失败时的兜底)
      WinterScene.tsx      # 冰雪奇缘风格雪景
    game/                  # 商店、任务、图鉴、自定义宠物工作室
  data/
    breeds.ts              # 品种注册表(参数化 + Meshy 复刻猫)
    characters.ts          # 角色人设 / AI prompt
  utils/
    intents.ts             # ★ 意图引擎:中文正则 → 动作/卡片/情绪/聊天
    ai.ts / petAnalysis.ts # 后端 API 客户端(对话、Meshy 管线、照片分析)
  store/useStore.ts        # 全局状态(localStorage 持久化)

server/
  index.js                 # Express 代理:/api/chat、/api/analyze-pet、
                           # /api/meshy/*(生成/状态/下载模型)

public/models/custom/      # 3D 模型 GLB(6 只骨骼猫 + 原始复刻猫)

tools/animation-retarget/  # 动画/绑骨工具链(见下)
```

---

## 语音指令速查(对宠物说)

| 说什么 | 触发 |
|---|---|
| 喂它 / 开饭 | 喂食(骨骼吃饭动作) |
| 摸摸头 / 抱抱 | 抚摸(撒娇) |
| 领养 / 图鉴 | 打开品种图鉴 |
| 奔跑 / 散步 / 疯跑 | 跑 / 走 / 暴走(FRAP) |
| 舔爪子 / 睡觉吧 / 喵一个 | 理毛 / 睡觉 / 喵叫 |
| 翻肚子 / 打滚 / 扑一个 | 露肚皮 / 打滚 / 捕猎扑击 |
| 今天有点累 / 好开心 | 情绪陪伴 + 自动记录心情 |

---

## 3D 宠物 & 动画工具链

`tools/animation-retarget/` 下是一套自研的猫咪绑骨/动画管线(Node + gltf-transform + 无头 three.js),踩坑经验都记录在各脚本注释里:

- `transfer-skin.cjs` —— **骨架迁移**:Meshy 对圆胖模型绑骨会失败,此工具把一套可用骨架 + 蒙皮迁移到任意相似体型的网格上
- `retarget.html` / `run.mjs` —— **跨骨骼动画重定向**(世界空间旋转增量法),把任意四足素材的动作移植到目标骨架
- `add-tail-bone.cjs` —— 给绑骨模型**加会摆动的尾巴骨**
- `tail-uv.cjs` / `tail-smooth.cjs` —— 尾巴 UV 重映射到身体毛发 + 表面平滑
- `inject.cjs` / `merge.js` —— 动画剪辑注入/合并

模型来源与授权见 `public/models/custom/CREDITS.md`(Meshy 生成 / Fox CC-BY / Catson 商用授权)。

---

## 技术栈

React 19 · TypeScript · Vite · @react-three/fiber (three.js) · @react-three/drei · @react-three/postprocessing · Tailwind CSS v4 · framer-motion · Express · Anthropic SDK · Meshy API
