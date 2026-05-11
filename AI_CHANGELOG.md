# AI_CHANGELOG.md

> 用途：记录 AI 修改历史与重要决策，避免后续 AI 重复踩坑。

## 记录格式
日期 / 阶段 / 修改内容 / 修改文件 / 风险 / 是否影响 engine / 是否影响导出

---

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
