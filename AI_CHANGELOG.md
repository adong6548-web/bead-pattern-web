# AI_CHANGELOG.md

> 用途：记录 AI 修改历史与重要决策，避免后续 AI 重复踩坑。

## 记录格式
日期 / 阶段 / 修改内容 / 修改文件 / 风险 / 是否影响 engine / 是否影响导出

---

## 2026-05-14 / Milestone 4.6 Phase 3 / 基础离线 App Shell 支持
- 修改内容：新增最小 Web App Manifest、第一方 Service Worker 与客户端注册组件，让用户在线打开一次后可在离线刷新时加载基础 app shell，并继续使用 Phase 1 本地草稿恢复
- 修改文件：
  - `src/app/manifest.ts`
  - `public/sw.js`
  - `src/components/ServiceWorkerRegister.tsx`
  - `src/app/layout.tsx`
  - `AI_CHANGELOG.md`
- 关键行为：
  - 新增最小 manifest：`Bead Pattern Web` / `Bead Pattern`，`start_url` 与 `scope` 均为 `/`
  - Service Worker 使用 `bead-pattern-app-shell-v1` 与 `bead-pattern-runtime-v1` 两个 cache
  - install 时缓存 `/`、`/favicon.ico`、`/manifest.webmanifest`，并从首页 HTML 中提取 `/_next/static/...` 资源做首轮 app shell 预缓存
  - navigation 请求采用 network-first，离线失败时回退到缓存的 `/`
  - 同源静态资源采用 cache-first，成功响应进入 runtime cache
  - 仅处理 GET 请求，不处理跨域、`blob:`、`data:` 请求，不刻意缓存用户导出的 PNG 或上传原图
  - 客户端仅在浏览器中注册 `/sw.js`，注册失败不会影响应用
- 有意不改：
  - `src/engine/generatePattern.ts`
  - `src/engine/exportPatternImage.ts`
  - PNG 导出逻辑
  - FocusMode 入口 / 可见性
  - 自动保存 schema / storage model
  - 图片守护阈值与逻辑
  - IndexedDB、后端、云同步、PWA 插件、Web Worker、智能推荐、颜色算法
- 测试建议：
  - 使用 `npm run build` + `npm start` 做生产近似环境测试
  - 在线打开一次页面，生成图纸并等待本地自动保存
  - 在线刷新确认恢复提示仍可用
  - 在 DevTools Network 中切换 Offline 后刷新，页面应加载 cached app shell 而不是浏览器离线错误
  - 若有有效本地草稿，离线刷新后应能显示恢复提示并恢复已保存快照
  - 恢复在线后确认图片上传、生成、PNG 导出和上传守护提示仍正常
- 风险：中（手写 Service Worker 只能缓存已访问过的同源静态资源；完整 PWA 产品化仍需后续专项设计）
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-14 / 文档治理 / 新增 AI 开发防失控规则
- 修改内容：新增 `AI_DEVELOPMENT_GUARDRAILS.md`，并在 `CODEX.md` 与 `AGENTS.md` 中加入强制阅读指针，约束后续 Codex / Claude / AI 编码会话的计划、范围、git hygiene、项目边界和最终报告流程
- 修改文件：
  - `AI_DEVELOPMENT_GUARDRAILS.md`
  - `CODEX.md`
  - `AGENTS.md`
  - `AI_CHANGELOG.md`
- 关键行为：
  - 明确非平凡任务编码前必须检查 git 状态、阅读相关文件、定义范围、列出约束并提出计划
  - 明确一次会话只做一个任务，禁止把 autosave、离线、UI 重设计、算法、导出、engine 等无关事项混在一起
  - 明确禁止自发扩 scope、无请求重构、静默加依赖、恢复 FocusMode、修改受保护边界
  - 明确上下文过载时应暂停并建议新会话或连续性审计
  - 明确每次编码任务结束必须报告修改文件、行为变化、未改内容、约束验证、检查结果、手动 QA、剩余风险和是否可提交
- 测试建议：
  - 文档变更无运行时行为，检查重点是确认指针清楚、规则完整、没有触碰源码
- 风险：低
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-11 / Milestone 4.6 Phase 1 / 本地自动保存与恢复草稿
- 修改内容：新增基于 `localStorage` 的本地草稿保存与恢复机制，保存生成设置、当前选中方案的轻量图纸快照，以及导出面板设置
- 修改文件：
  - `src/utils/persistence.ts`
  - `src/components/PatternTool.tsx`
  - `src/components/PatternExportPanel.tsx`
  - `AI_CHANGELOG.md`
- 关键行为：
  - 使用版本化 key：
    - `bead-pattern:session:v1`
    - `bead-pattern:export:v1`
  - 刷新后不自动恢复，先显示恢复 / 丢弃提示
  - 图纸快照只保存轻量 cell 信息：`colorId`、`isIgnoredBackground`、`isDarkLine`
  - 恢复时通过现有 palette 把 `colorId` 映射回颜色对象
  - 保存增加 debounce，避免频繁写入
  - 对异常 JSON / 版本不匹配 / 损坏草稿做安全清理，不允许草稿损坏导致页面崩溃
- 测试建议：
  - 生成一张图纸后刷新页面，应出现恢复提示
  - 点击恢复，应找回上次图纸结果、设置和导出选项
  - 点击丢弃，应清空本地草稿并回到干净状态
  - 手动篡改 localStorage 为非法 JSON，页面不应崩溃
- 风险：中
- 是否影响 engine：否
- 是否影响导出：否（只保存导出面板设置，不改导出逻辑）

## 2026-05-11 / Milestone 4.6 Phase 2 / 大图与异常图片稳定性防护
- 修改内容：为图片上传、解码和 ImageData 创建增加守护逻辑，拦截不支持文件、过大文件、坏图、极端比例图，并在过大但可处理的情况下先安全降采样后再进入图纸生成
- 修改文件：
  - `src/utils/imageProcessing.ts`
  - `src/components/PatternTool.tsx`
  - `AI_CHANGELOG.md`
- 关键行为：
  - 新增文件类型 / 文件大小校验
  - 新增图片解码失败、零尺寸、canvas/context 失败、drawImage / getImageData 失败的友好错误提示
  - 对超出安全处理像素但仍在源图上限内的图片先降采样，再生成 `ImageData`
  - 对极端宽高比图片显示提示，不直接崩溃
  - 上传处理增加请求 id 防护，避免旧的异步结果覆盖新的结果
  - 失败不会清掉上一次有效的图纸结果，也不会覆盖已有本地草稿
- 测试建议：
  - 上传普通 JPG/PNG，应能正常生成
  - 上传不支持文件，应显示友好错误
  - 上传损坏或无法解码的图片，应显示读取失败提示
  - 上传很大的图片，应避免白屏卡死；若可处理则显示已压缩提示
  - 先生成一张有效图，再尝试坏图，刷新后仍应能恢复上次有效草稿
- 风险：中
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-13 / Milestone 4.6 Phase 2.1 / 上传提示位置与恢复草稿说明补强
- 修改内容：把上传相关的错误 / 警告提示移动到上传卡片正下方，并在仅恢复了单个本地草稿尺寸方案时补充说明文案
- 修改文件：
  - `src/components/PatternTool.tsx`
  - `AI_CHANGELOG.md`
- 关键行为：
  - 上传守护提示就近显示在上传区域下方，不再落到尺寸方案或结果区域附近
  - 恢复本地草稿且只存在上次选中方案快照时，显示：
    - `本地草稿仅恢复上次选中的尺寸方案。如需生成其他尺寸，请重新上传原图。`
  - 文件选择器继续保留 `accept="image/*"`，不为了测试开放 TXT / PDF 等非图片文件
  - 像素压缩提示和源图像素拦截提示的手动测试条件补充说明：
    - 压缩提示：文件小于 12MB，像素大于 4,000,000 且小于 16,000,000，例如约 `3000×2000` JPG
    - 源图拦截：文件小于 12MB，像素大于 16,000,000，例如约 `5000×4000` 的低压缩 JPG
- 测试建议：
  - 上传大于 12MB 的图片，红色错误提示应直接出现在上传卡片下方
  - 上传损坏图片，读取失败提示应直接出现在上传卡片下方
  - 恢复本地草稿后，如果仅恢复了一个尺寸方案，应看到单独说明
  - 成功生成后的刷新恢复、PNG 导出与自动保存逻辑应保持不变
- 风险：低
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-14 / Milestone 4.6 Phase 2.1 / 恢复草稿说明位置微调
- 修改内容：将“本地草稿仅恢复上次选中的尺寸方案。如需生成其他尺寸，请重新上传原图。”从尺寸方案区域上方移动到上传卡片下方，与上传错误 / 警告提示保持同一位置层级
- 修改文件：
  - `src/components/PatternTool.tsx`
  - `AI_CHANGELOG.md`
- 关键行为：
  - 恢复草稿说明仍只在本地草稿仅包含上次选中尺寸方案时显示
  - 尺寸方案渲染逻辑不变
  - 自动保存 schema、图片处理守护逻辑、PNG 导出逻辑均不变
- 测试建议：
  - 恢复本地草稿后，说明应出现在上传卡片下方
  - 新上传图片并完整生成多尺寸方案后，不应显示该说明
- 风险：低
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-11 / 文档初始化 / 建立 AI 可维护项目文档基线
- 修改内容：新增 `CODEX.md`、`PROJECT_STATE.md`、`FILE_MAP.md`、`AI_CHANGELOG.md`
- 修改文件：
  - `CODEX.md`
  - `PROJECT_STATE.md`
  - `FILE_MAP.md`
  - `AI_CHANGELOG.md`
- 风险：低
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-11 / 历史问题归档 / Tailwind 4 编译链问题
- 修改内容：历史上曾因 Tailwind 配置写法不匹配，导致页面退回默认 HTML 样式（原生按钮、粗黑边框、utility class 不生效）
- 关键结论：真实项目是 Tailwind 4，不是 Tailwind 3
- 关键规则：`src/app/globals.css` 应保持 Tailwind 4 写法，不要改回 `@tailwind base/components/utilities`
- 相关文件：
  - `src/app/globals.css`
  - `tailwind.config.ts`
  - `postcss.config.mjs`
- 风险：高
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-11 / 历史决策归档 / FocusMode 暂停推进
- 修改内容：FocusMode 相关代码保留，但入口隐藏，当前不作为 MVP 核心功能
- 相关文件：
  - `src/components/FocusMode.tsx`
  - `src/components/FocusColorList.tsx`
  - `src/components/FocusProgressPanel.tsx`
  - `src/components/FocusRunList.tsx`
- 风险：中（容易被后续 AI 错误恢复）
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-11 / 历史决策归档 / 分区导出取消
- 修改内容：分区 PNG 导出、A1/A2/B1 分块、zip、PDF 暂不推进
- 当前结论：整张高清 PNG 导出是当前主要交付方式
- 相关文件：
  - `src/components/PatternExportPanel.tsx`
  - `src/engine/exportPatternImage.ts`
- 风险：低
- 是否影响 engine：否
- 是否影响导出：否（保留整图导出）

## 2026-05-11 / 历史决策归档 / PNG 导出保留与增强
- 修改内容：继续保留整张图纸导出，支持彩色图纸 / 色号图纸 / 彩色+色号图纸，以及标准 / 高清 / 超清清晰度
- 当前结论：不要截图网页，必须基于 `PatternResult` 重新绘制 PNG
- 相关文件：
  - `src/components/PatternExportPanel.tsx`
  - `src/engine/exportPatternImage.ts`
- 风险：高
- 是否影响 engine：否
- 是否影响导出：是（这是核心导出链路）

## 2026-05-11 / 历史阶段归档 / UI-1 可测试版
- 修改内容：主界面已形成可测试版结构，包含上传、生成设置、尺寸方案、图纸预览、导出、颜色统计
- 当前注意：后续 UI 修复不要误伤 Tailwind 4 编译链
- 相关文件：
  - `src/components/PatternTool.tsx`
  - `src/components/ImageUploader.tsx`
  - `src/components/GenerationSettings.tsx`
  - `src/components/PatternVariantCards.tsx`
  - `src/components/PatternGrid.tsx`
  - `src/components/ColorStats.tsx`
- 风险：中
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-11 / 历史风险归档 / 备份目录与遗留组件
- 修改内容：明确记录这些容易误导后续 AI 的对象
  - `src_backup_before_bead_mvp`：旧备份目录，不是当前主代码入口
  - `OriginalPreview.tsx`：可能是遗留组件，后续需确认是否仍被使用
- 风险：中
- 是否影响 engine：否
- 是否影响导出：否

## 2026-05-11 / 历史阶段归档 / 参数配置化准备
- 修改内容：项目已引入 `src/config/patternPresets.ts`，用于集中管理图像类型、颜色数量、颜色风格、尺寸方案文案与导出 preset
- 当前注意：`patternPresets.ts` 通过 type import 依赖 `exportPatternImage.ts` 中的类型，后续建议把共享导出类型沉到 `src/types`
- 相关文件：
  - `src/config/patternPresets.ts`
  - `src/engine/exportPatternImage.ts`
  - `src/engine/recommendPatternSizes.ts`
- 风险：中
- 是否影响 engine：轻微（配置层）
- 是否影响导出：轻微（配置来源）

---

## 后续要求
从这份文件开始，后续每次 AI 修改都应继续追加记录，至少包括：
- 日期
- 阶段
- 修改内容
- 修改文件
- 风险
- 是否影响 engine
- 是否影响导出
