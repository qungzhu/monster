# iOS 版：锁屏宠物

iOS 不允许 App 自己画壁纸，所以 iPhone 上的「锁屏宠物」分两部分：

1. **实况照片锁屏**：App 用和首页同一套 3D 模型，给宠物拍一段 3 秒的实况照片（Live Photo）存进相册。拿它设为锁屏墙纸后，屏幕亮起或按一下屏幕时宠物会动。
2. **锁屏 / 桌面小组件**：「毛茸伙伴」小组件显示宠物、名字和一句随时间变化的话。换宠物后 App 会自动刷新小组件。

需要 iOS 16 以上。实况照片墙纸要 iOS 17 以上才会动（iOS 16 只显示静态图）。

## 代码在哪里

| 部分 | 位置 |
| --- | --- |
| 渲染实况照片的帧、小组件图片（网页端，复用 PetScene） | `src/native/LockScreenCapture.tsx` |
| 「锁屏宠物」卡片（iOS） | `src/native/IosLockScreenCard.tsx` |
| JS 接口 | `src/native/petLockScreen.ts` |
| 原生插件：合成实况照片、存相册、写小组件数据 | `ios/App/App/PetLockScreen/` |
| 小组件扩展 | `ios/App/PetWidget/` |
| App 和小组件共用的数据（App Group） | `ios/App/Shared/PetWidgetStore.swift` |
| 往 Xcode 工程里加上面这些文件和小组件 target 的脚本 | `scripts/ios-add-lock-screen.rb` |

## 在自己的 iPhone 上安装（需要 Mac）

1. 在 Mac 上：`npm ci && npm run build:ios`
2. 用 Xcode 打开 `ios/App/App.xcodeproj`（第一次会下载 Capacitor 的 Swift 包）。
3. 分别选中 **App** 和 **PetWidget** 两个 target → Signing & Capabilities → Team 选你的开发者账号。
   - 如果 `com.furrypal.app` 被占用，两个 target 的 Bundle Identifier 都改成你自己的前缀，小组件保持「App 的 ID + `.PetWidget`」。
   - App Group `group.com.furrypal.app` 也要随之改成你自己的，同时改 `ios/App/Shared/PetWidgetStore.swift` 里的 `appGroup`。
4. 连上 iPhone，选它作为运行目标，点 ▶︎。
5. 第一次运行要在 iPhone 的「设置 → 通用 → VPN 与设备管理」里信任你的开发者证书。

App Group 需要付费的 Apple 开发者账号（99 美元/年）。用免费账号签名，App 能装，但小组件可能读不到宠物图片。

## 不用 Mac 的情况

GitHub Actions 的「iOS build」每次推送都会在苹果电脑上编译一次，并上传一个**未签名**的 `FurryPal-unsigned.ipa`。
未签名的包不能直接装，要先用 Sideloadly、AltStore 之类的工具和你的 Apple ID 重新签名。免费 Apple ID 签出来的包 7 天后过期。

## 已知的不确定点

- **实况照片作为墙纸会不会动**：iOS 17 以后，苹果会判断一张实况照片「适不适合做动态墙纸」，判断标准不公开。代码里写入了相机拍摄时会带的元数据（`live-photo.vitality-score` 等），但如果设墙纸时「实况」按钮是灰的，就说明这一条没过，需要调整视频参数。
- **生成速度**：实况照片在手机上用 WebGL 逐帧渲染（1080 宽、90 帧），预计十几秒到一分钟，取决于机型。
