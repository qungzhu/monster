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
| 你都记得我什么 | 打开"它记得你的事" |
| 记住我对芒果过敏 / 忘掉考试的事 | 手动记住 / 忘掉一条记忆 |
| 明天下午3点提醒我取快递，再记一下体重60 | 生成执行计划，说"好的"后执行 |
| 快递取到了 / 删掉取快递 / 你当我的老师吧 | 完成 / 删除事项、切换角色(同样先确认) |

---

## 长期记忆("它记得你的事")

宠物会从聊天里自动记下关于你的事，下次聊天自然地用上。

- **自动记住**:名字、生日、职业、学校/公司、喜好与讨厌的东西、身边的人和宠物、要发生的事(考试/面试/出差…)、目标。配了 `OPENAI_API_KEY` 时由 AI 整理(`/api/memory/extract`),没配时用本地规则(`src/data/memory.ts`),离线也能用
- **会追问**:1–14 天前提到的事，它会主动问"后来怎么样啦?",每件只问一次
- **角色生效**:在 AI 中枢选的朋友 / 管家 / 助手 / 老师会改变它说话的方式
- **可查看可修改**:说"你都记得我什么",或在 AI 中枢点"它记得你的事"——按类别展示，可编辑、删除、手动添加、清空，也可关闭自动记住
- **隐私**:记忆只存在本机 localStorage,聊天时作为背景发给 AI;不记录证件号、密码、银行卡、精确住址、病情细节
- 测试:`npm run test:memory`

---

## 任务助手(先确认，再执行)

对宠物说要做的事，它会先理解、拆成具体动作给你确认，确认后才执行。

- **能做的动作**:新建待办 / 快递 / 体重 / 学习事项(可带提醒时间)、把事项标记完成、删除事项、写入 Google 日历(已连接时;没连接就改成本地提醒)、记住一件事、切换陪伴角色
- **一句话多件事**:"明天下午3点提醒我取快递，再记一下体重60" → 两个动作
- **时间理解**:今天 / 明天 / 后天 / 周五 / 下周三 / 11月3号 / 下午3点半 / 30分钟后;只说日期默认 9:00
- **确认方式**:计划卡片上可以取消勾选某一项;点"确认执行"或直接说"好的",说"算了"就放弃
- **两种大脑**:配了 `OPENAI_API_KEY` 时由 AI 理解(`/api/agent/plan`),没配时用本地规则(`src/data/agent.ts`)。AI 只负责提议，所有动作都在本地校验(只认识的动作、只能动已有的事项、最多 6 个)后才会执行
- **提醒**:App 开着时到点宠物会喵一声提醒你;App 关着时的提醒属于下一步(定时与主动任务)
- AI 中枢的"Agent 指令台"也走同一套流程
- 测试:`npm run test:agent`

---

## 雪原广场(多人原型)

所有用户的猫在同一片雪地里实时互动。访问 `/plaza`,或者对宠物说"去广场"。

```bash
npm run plaza      # 实时房间服务器 ws://localhost:3002/plaza-ws
npm run dev        # 前端(Vite 已代理 /plaza-ws)
# 或一起:npm run dev:all
```

- 每个房间最多 20 只猫，满了自动开新房("雪原 2 区"…)
- 只同步位置、朝向和动作(每秒 10 次),骨骼动画在各自设备上播放
- 服务器做防瞬移、限制场地范围、过滤非法动作和刷消息
- **靠近互动**:走到别人的猫旁边(1.3 以内)会出现"🤗 一起蹭蹭 / 🎾 一起玩",对方同意后两只猫一起表演(贴脸蹭蹭 / 绕圈追跑),全场都能看到特效。服务器校验距离、是否正忙、邀请 15 秒有效、防刷
- **好感与成长**:互动完成后由服务器计好感(一起玩 +5,一起蹭蹭 +3,每对每天上限 20)。等级:陌生猫猫 → 点头之交 10 → 好朋友 30 → 好闺蜜 60 → 形影不离 100,名牌上显示徽章，"💞 好友"面板可看全部猫友。同时回馈主场景成长：经验 +2×好感、金币 +好感、和自家宠物亲密度 +1。身份用每台设备的私有随机码识别(只有服务器知道),好感存在 `server/data/plaza-bonds.json`
- **猫咪名片**:点任意一只猫打开名片——品种(中英文名、稀有度、性格、介绍)、主人、正在做什么、你们的好感等级与进度、今天还能加多少。离得远显示"走过去找 TA",靠近后直接邀请一起蹭蹭 / 一起玩；点自己的猫看自己的名片，点雪地关闭
- 测试:`npm run test:plaza`(房间规则 + 好感计分，共 27 项)
- 使用轻量模型 `public/models/lite/`(每只 0.5–1.3MB),保留骨骼和 8 个动作
- 房间逻辑在 `server/plazaRoom.js`,不依赖 Node,可直接搬到 Cloudflare Durable Objects
- 生产环境需要单独部署实时服务器，并通过 `VITE_PLAZA_URL` 指定地址

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
