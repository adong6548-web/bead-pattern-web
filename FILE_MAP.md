# FILE_MAP.md

## 目录总览

### `src/app`
负责 Next App Router 入口、页面壳和全局样式。

### `src/components`
负责 Web 界面展示与交互。

### `src/config`
负责生成与导出相关的配置预设，目标是跨端可复用。

### `src/engine`
负责图像处理、图纸生成、导出绘制等核心逻辑。

### `src/palettes`
负责色卡数据。

### `src/types`
负责核心中间类型定义。

### `src/workers`
预留目录，当前尚未正式承载 Web Worker 逻辑。

## 根配置文件

### `package.json`
- 主要职责：定义 Next / React / Tailwind / TypeScript 依赖与脚本
- 是否属于 UI：否
- 是否属于 engine：否
- 是否适合小程序复用：否
- 修改风险：中
- 相关依赖文件：`postcss.config.mjs`、`tailwind.config.ts`

### `tailwind.config.ts`
- 主要职责：Tailwind 扫描路径、自定义颜色、safelist
- 是否属于 UI：是（构建层）
- 是否属于 engine：否
- 是否适合小程序复用：低
- 修改风险：高（会直接影响整站样式是否生效）
- 相关依赖文件：`src/app/globals.css`

### `postcss.config.mjs`
- 主要职责：接入 `@tailwindcss/postcss`
- 是否属于 UI：是（构建层）
- 是否属于 engine：否
- 是否适合小程序复用：否
- 修改风险：高
- 相关依赖文件：`tailwind.config.ts`、`src/app/globals.css`

### `src_backup_before_bead_mvp/`
- 主要职责：旧备份目录
- 是否属于 UI：历史遗留
- 是否属于 engine：否
- 是否适合小程序复用：否
- 修改风险：高（容易误导 AI）
- 相关依赖文件：无，当前不应作为主代码入口

## `src/app`

### `src/app/layout.tsx`
- 主要职责：根布局，挂载 `globals.css`，定义 metadata
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：否
- 修改风险：中
- 相关依赖文件：`src/app/globals.css`

### `src/app/page.tsx`
- 主要职责：首页入口，当前只渲染 `PatternTool`
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：否
- 修改风险：低
- 相关依赖文件：`src/components/PatternTool.tsx`

### `src/app/globals.css`
- 主要职责：Tailwind 4 入口与少量全局基础样式
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：否
- 修改风险：高（Tailwind 编译链关键文件）
- 相关依赖文件：`tailwind.config.ts`、`postcss.config.mjs`

## `src/components`

### `src/components/PatternTool.tsx`
- 主要职责：页面主编排组件，连接上传、生成、方案、预览、导出、统计
- 是否属于 UI：是
- 是否属于 engine：否（但强依赖 engine）
- 是否适合小程序复用：低
- 修改风险：高
- 相关依赖文件：`generatePattern.ts`、`recommendPatternSizes.ts`、`GenerationSettings.tsx`、`PatternGrid.tsx`、`PatternExportPanel.tsx`

### `src/components/ImageUploader.tsx`
- 主要职责：图片选择与缩略图显示
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：低
- 修改风险：低
- 相关依赖文件：`PatternTool.tsx`

### `src/components/GenerationSettings.tsx`
- 主要职责：图像类型、颜色数量、颜色风格设置 UI
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：中（配置数据可复用，组件不可直接复用）
- 修改风险：中
- 相关依赖文件：`src/config/patternPresets.ts`

### `src/components/BackgroundOptions.tsx`
- 主要职责：白底忽略开关与相关提示
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：低
- 修改风险：低
- 相关依赖文件：`PatternTool.tsx`

### `src/components/AspectRatioNotice.tsx`
- 主要职责：展示偏宽 / 偏高提示
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：中
- 修改风险：低
- 相关依赖文件：`PatternResult`

### `src/components/PatternVariantCards.tsx`
- 主要职责：展示多尺寸方案卡片并切换当前图纸
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：中
- 修改风险：中
- 相关依赖文件：`PatternCanvas.tsx`、`PatternVariant`

### `src/components/PatternGrid.tsx`
- 主要职责：当前选中图纸的大预览与缩放控制
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：中
- 修改风险：中
- 相关依赖文件：`PatternCanvas.tsx`、`PatternResult`

### `src/components/PatternCanvas.tsx`
- 主要职责：把 `PatternResult.grid` 渲染成网页中的 bead 网格
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：思路可复用，组件本身不可直接复用
- 修改风险：中
- 相关依赖文件：`PatternResult`

### `src/components/PatternExportPanel.tsx`
- 主要职责：导出设置面板与触发导出
- 是否属于 UI：是
- 是否属于 engine：否（调 engine 导出）
- 是否适合小程序复用：中
- 修改风险：高（容易误改导出链路）
- 相关依赖文件：`exportPatternImage.ts`、`patternPresets.ts`

### `src/components/ColorStats.tsx`
- 主要职责：展示总豆数、颜色数量、色号列表
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：中
- 修改风险：低
- 相关依赖文件：`PatternResult`、`patternPresets.ts`

### `src/components/OriginalPreview.tsx`
- 主要职责：原图预览的旧实现或遗留组件
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：低
- 修改风险：中（先确认是否仍被使用）
- 相关依赖文件：待确认

### `src/components/FocusMode.tsx`
- 主要职责：专注模式容器
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：低
- 修改风险：高（当前产品决策为暂停推进）
- 相关依赖文件：`FocusColorList.tsx`、`FocusProgressPanel.tsx`、`FocusRunList.tsx`

### `src/components/FocusColorList.tsx`
### `src/components/FocusProgressPanel.tsx`
### `src/components/FocusRunList.tsx`
- 主要职责：FocusMode 的子组件
- 是否属于 UI：是
- 是否属于 engine：否
- 是否适合小程序复用：低
- 修改风险：高（入口隐藏，当前不应继续推进）
- 相关依赖文件：`FocusMode.tsx`

## `src/engine`

### `src/engine/generatePattern.ts`
- 主要职责：核心图纸生成逻辑，包含裁白边、比例适配、颜色分析、量化、黑边保护、统计输出
- 是否属于 UI：否
- 是否属于 engine：是
- 是否适合小程序复用：非常适合
- 修改风险：很高
- 相关依赖文件：`quantizeColors.ts`、`trimBackground.ts`、`common.ts`、`types/pattern.ts`

### `src/engine/quantizeColors.ts`
- 主要职责：颜色量化、颜色距离、最近色计算辅助
- 是否属于 UI：否
- 是否属于 engine：是
- 是否适合小程序复用：高
- 修改风险：中高
- 相关依赖文件：`generatePattern.ts`

### `src/engine/trimBackground.ts`
- 主要职责：白底检测、裁白边、像素读取辅助
- 是否属于 UI：否
- 是否属于 engine：是
- 是否适合小程序复用：高
- 修改风险：中
- 相关依赖文件：`generatePattern.ts`

### `src/engine/recommendPatternSizes.ts`
- 主要职责：基于主体宽高比生成尺寸方案
- 是否属于 UI：否
- 是否属于 engine：是（轻逻辑）
- 是否适合小程序复用：高
- 修改风险：中
- 相关依赖文件：`patternPresets.ts`、`types/pattern.ts`

### `src/engine/exportPatternImage.ts`
- 主要职责：基于 `PatternResult` 重新绘制高清 PNG，并处理下载
- 是否属于 UI：否
- 是否属于 engine：是
- 是否适合小程序复用：部分适合（绘制逻辑可迁移，下载方式需平台适配）
- 修改风险：很高
- 相关依赖文件：`PatternExportPanel.tsx`、`patternPresets.ts`、`types/pattern.ts`

## `src/config`

### `src/config/patternPresets.ts`
- 主要职责：集中维护图像类型、颜色数量、颜色风格、尺寸方案文案、导出清晰度与导出选项 preset
- 是否属于 UI：否（纯配置）
- 是否属于 engine：否（但被 engine/UI 共用）
- 是否适合小程序复用：非常适合
- 修改风险：中
- 相关依赖文件：`GenerationSettings.tsx`、`PatternTool.tsx`、`ColorStats.tsx`、`PatternExportPanel.tsx`、`recommendPatternSizes.ts`

## `src/palettes`

### `src/palettes/common.ts`
- 主要职责：定义 common 色卡
- 是否属于 UI：否
- 是否属于 engine：是（数据依赖）
- 是否适合小程序复用：非常适合
- 修改风险：中高（会影响颜色匹配结果）
- 相关依赖文件：`generatePattern.ts`、`types/pattern.ts`

## `src/types`

### `src/types/pattern.ts`
- 主要职责：定义 `PatternMode`、`PatternColorStyle`、`BeadColor`、`PatternResult`、`PatternPlan`、`PatternVariant` 等核心类型
- 是否属于 UI：否
- 是否属于 engine：否（共享类型层）
- 是否适合小程序复用：非常适合
- 修改风险：高（会波及组件、engine、导出）
- 相关依赖文件：几乎所有核心模块
