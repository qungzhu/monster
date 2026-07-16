# 跨骨骼动画移植管线 (Animation Retarget Pipeline)

把任意四足动物动画素材（GLB/FBX）的动作移植到 Meshy 自动绑骨的宠物模型上。
已验证案例：Khronos Fox 的 "Survey" 环顾动作 → 斑斑 (cat1-rigged.glb) 的 Idle 剪辑。

## 原理
`SkeletonUtils.retargetClip` 直接复制局部旋转，跨骨架（绑定轴不同）会产出乱麻。
本管线用 **世界空间旋转增量法**：每帧对每根源骨骼算 `Δ = q_world(t) · q_world(bind)⁻¹`，
经朝向对齐旋转 R 映射后叠加到目标骨骼的绑定世界旋转上，再逐骨（父先子后）换回局部空间，30fps 烘焙。
Hips 额外传递按体型比例缩放的位移（坐/卧类动作需要）。

## 用法
1. 把源模型（含动画的 .glb/.fbx）放到 `tools/animation-retarget/assets/`，
   目标模型 `cat1-rigged.glb` 也复制一份进去。
2. 在 `retarget.html` 的 `MAPS` 里为新源骨架加一条映射（源骨名 → Meshy 骨名），
   `front`/`back` 填源模型的前/后脚骨名（用于算朝向轴）。
3. 运行：
   ```
   node tools/animation-retarget/run.mjs "retarget.html?src=<源文件>&clip=<剪辑名>&map=<映射名>" /tmp/tracks.json
   node tools/animation-retarget/inject.js /tmp/tracks.json <新剪辑名> public/models/custom/cat1-rigged.glb public/models/custom/cat1-rigged.glb
   ```
4. 预览：`node tools/animation-retarget/run.mjs` 配 `view.html?f=<文件>&c=<剪辑名或序号>&t=<秒>`（截图用 playwright 另行包装）。

## 已知坑（血泪教训）
- **朝向轴**：目标模型直接硬编码 `(0,0,1)`（App 内模型面向 +Z）。不要用骨骼位置推断——
  Meshy 对"坐姿建模"的猫自动绑骨时，"后腿"骨骼实际全绑在身体前部，位置不可信。
- **蒙皮包围盒**：skinned mesh 的几何数据和渲染结果尺度可能差 20 倍（Meshy 骨架是厘米级），
  测量必须用 `SkinnedMesh.getVertexPosition`（见 GLBPet.tsx 的 normalize 实现）。
- **位置轨道**：除 Hips 外只传旋转——源模型的位移带着自己的尺度，直接抄会爆炸。
- 斑斑绑定姿势本身是坐姿，"坐下"类动作对它无意义；最适合移植的是头部+前爪动作
  （舔爪/吃饭/喵叫），前腿骨骼位置是准确的。

## 素材许可
- Fox "Survey": CC-BY 4.0（见 public/models/custom/CREDITS.md）
- Omabuarts Catson Lite (demo)：仅评估用途，未采用其任何动作。
