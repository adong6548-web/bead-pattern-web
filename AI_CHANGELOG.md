# AI_CHANGELOG.md

> 用途：记录 AI 修改历史与重要决策，避免后续 AI 重复踩坑。

## 记录格式
日期 / 阶段 / 修改内容 / 修改文件 / 风险 / 是否影响 engine / 是否影响导出

---

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
