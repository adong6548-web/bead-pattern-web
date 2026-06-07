# PROJECT_STATE.md

## 项目定位
这是一个图片转拼豆图纸的 Web MVP 工具。用户上传图片后，系统在浏览器本地生成拼豆图纸，支持：
- 图纸预览
- 多尺寸方案
- 颜色统计
- 高清 PNG 导出
- 导出设置增强

当前暂时不做后端。

## 当前已完成功能
- 图片上传
- 浏览器本地图片处理
- 白底裁剪与忽略背景
- 保持比例 contain 适配
- 多尺寸方案生成与切换
- 图纸预览与缩放
- 颜色统计
- 高清 PNG 导出
- 导出设置增强
- 图像类型 / 颜色数量 / 颜色风格设置
- 参数配置化基础（`patternPresets.ts`）
- 生成后清理 MVP：可将选中的颜色全局设为 ignored background，或合并到另一个当前图纸已有颜色；支持撤销上一步清理编辑；有已编辑状态提示、全局操作风险提示和编辑后导出说明；预览、材料统计和 PNG 导出使用当前编辑后的图纸，且可重置回原始生成结果

## 当前暂停功能
- FocusMode：代码保留，入口隐藏，暂不继续推进

## 当前不做功能
- 后端 / 登录 / 数据库
- 小程序实现
- PDF 导出
- 分区导出
- zip 打包
- 云同步
- 复杂拖拽查看
- 库存管理
- 社区功能
- 完整编辑器 / 画笔 / 橡皮

## 当前主要风险
1. `src_backup_before_bead_mvp` 是旧备份目录，容易误导 AI，不应作为当前主代码入口。
2. FocusMode 相关代码仍在 `src/components` 中，若无文档提醒，后续 AI 很容易错误恢复入口。
3. `OriginalPreview.tsx` 可能是遗留组件，需确认是否还有业务价值。
4. `patternPresets.ts` 通过 type import 引用了 `exportPatternImage.ts` 的类型；长期看应把共享导出类型沉到 `src/types`。
5. Tailwind 4 曾因配置写法问题导致页面退回默认 HTML 样式，这类问题以后仍可能复发。
6. `generatePattern.ts` 已经较长，后续继续加模式或策略时，维护复杂度会上升。
7. 宠物照片自动算法已多轮验证未达到稳定质量，后续不应继续单图启发式调参或把已停止的实验路线接入引擎。
8. 透明 PNG 不等于“干净可转换”输入；如果背景残留已经是不透明像素，引擎无法安全判断它是背景还是主体，必须先做输入质量判断。

## 近期阶段状态
- 当前稳定提交：`7962403 feat: add draft and bead preview modes`
- Phase 4J 已停止本地 pet-photo 启发式路线：subject mask / framing、cell-only hybrid sampling、pre-quantization value separation、region-map detail/noise route、single-image tuning 均已停止，Phase 4J-8 engine integration 不成立。
- Phase 4K 当前方向：从“自动生成完美宠物图”转为“自动初稿 + 用户可控修整”的产品级清理流。
- Phase 4K-1 已完成：用户可在颜色 / 材料列表中将选中颜色设为 ignored background；可编辑图纸状态与原始生成结果分离；预览、材料统计和导出使用编辑后的 grid；reset 可恢复原始生成结果；手动 QA 已通过，导出 PNG 反映编辑后的图纸。
- Phase 4K-2 已完成：用户可将选中颜色全局合并到另一个当前图纸已有颜色；source color 会从颜色 / 材料列表消失，target color 数量增加；预览、材料统计和导出继续使用编辑后的 grid；reset 可恢复原始生成结果。
- Phase 4K-3 已完成：用户可撤销上一步清理编辑；设为背景、颜色合并都会写入 edit history；撤销后预览、颜色 / 材料统计和导出使用回退后的当前 grid；reset 恢复原始生成结果并清空 edit history；新生成、切换尺寸或修改生成设置会清空 edit history；手动浏览器 QA 已通过。
- Phase 4K-4 已完成：清理编辑 UX 已 polish；编辑后显示“已编辑图纸”状态；全局操作说明明确区分设为背景和合并颜色；合并目标必须手动选择；撤销和 reset 会关闭残留合并 UI；手动浏览器 QA 已通过，导出仍匹配当前 displayed grid。
- Phase 4K-5 已完成：导出区域在图纸被编辑后显示 edited-export note，明确 PNG 图纸和材料统计会按当前预览 / edited grid 计算；未编辑时不显示；undo / reset 清除编辑状态后提示消失；手动浏览器 QA 已通过，导出仍匹配当前 displayed grid。
- Phase 4L 当前方向：暂停继续 4K 功能扩展，重新聚焦 first-draft desirability；当前阻塞不是缺少清理工具，而是复杂 / 多色输入的第一版图纸不够值得用户继续清理。
- Phase 4L-0 / 4L-2 结论：source simplification / pixel-art-like draft 是较有希望的方向，但 pixel-art v2 仍未达到跨测试集验收标准，不能直接集成。
- Phase 4L-3 / 4L-7 结论：alpha-aware transparent input 是正确方向，能避免透明像素被合成白色并误伤白色 / 浅色主体；但 retained opaque chunks 多数属于输入质量 / 不透明残留歧义，不应继续通过 engine 阈值硬清。alpha-aware core 已备份到 `/tmp/bead-4l7-alpha-aware-core-wip.diff`，暂未集成。
- Phase 4L-9 已完成：新增 `src/engine/analyzeTransparentInputQuality.ts`，提交 `a34d175 feat: add transparent input quality analysis utility`。这是 util-only change；未接 UI，未改 `generatePattern.ts`，未改 `trimBackground.ts`，未改 `PatternResult` public shape。检查通过：`npx tsc --noEmit`；`npm run lint` 仅保留既有 `ImageUploader.tsx` `<img>` warning；`npm run build` 仅保留既有 Tailwind module-type warning；`git diff --check` 通过。
- Phase 4L-11 已完成：新增上传后的 transparent input quality notice，提交 `249b104 feat: add transparent input quality upload notice`，改动文件为 `src/components/PatternTool.tsx` 和 `src/components/TransparentInputQualityNotice.tsx`。上传后读取 `ImageData` 并调用 `analyzeTransparentInputQuality`，展示五类透明输入质量提示；不弹 modal，不阻止生成，不承诺透明 PNG 一定生成更好。未改 `generatePattern.ts`、`trimBackground.ts`、export / palette / autosave / cleanup flow，也未改 `PatternResult` public shape。检查通过：`npx tsc --noEmit`；`npm run lint` 仅保留既有 `ImageUploader.tsx` `<img>` warning；`npm run build` 仅保留既有 Tailwind module-type warning；`git diff --check` 通过。
- Phase 4L-12 已完成 upload notice core path validation。由于当前会话没有可用浏览器自动化工具，本轮不是 full browser automation QA；验证路径为读取测试图片为 `ImageData`、调用 `analyzeTransparentInputQuality`、核对对应 UI 文案存在、调用 `generatePattern` 确认不阻止生成。结果：普通 JPG `pet-light-on-busy-background.jpg` 分类为 `no-alpha-or-jpg-like`，文案为“未检测到有效透明背景，将按普通图片处理。”，生成未阻止，`totalBeads 1080`；subject-dominant PNG `pet-clean-background-control.png` 分类为 `subject-dominant-transparent`，文案为“主体占画面较大，透明区域较少但可继续转换。”，无 warning / 不表现为错误，生成未阻止，`totalBeads 1008`；needs-review PNG `pet-light-on-busy-background.png` 分类为 `needs-review`，文案为“透明图可能有少量边缘残留...”，warning 存在，生成未阻止，`totalBeads 196`。验证过程中 `next-env.d.ts` 曾被 Next 自动触碰，已恢复；最终 git status clean。
- Phase 4L-13 已完成 manual visual QA / smoke check。用户在 in-app browser 中手动测试 transparent input quality upload notice，反馈基本无问题；这是 user manual visual/smoke test，不是 automated browser QA。保留 4L-12 core path validation 结论：ordinary JPG -> `no-alpha-or-jpg-like`、subject-dominant PNG -> `subject-dominant-transparent`、needs-review PNG -> warning，且 generation not blocked。当前 UI notice 可作为稳定 checkpoint；alpha-aware conversion 仍未集成。
- Phase 4L-15 已完成 minimal alpha-aware engine spike，结论为 failed / non-integrated experiment。Spike 期间临时改过 `src/engine/generatePattern.ts` 和 `src/engine/trimBackground.ts`，WIP diff 已备份到 `/tmp/bead-4l15-alpha-aware-engine-spike.diff`，最终 retained code changes 为 none。检查通过：`npx tsc --noEmit`；`npm run lint` 仅保留既有 `ImageUploader.tsx` `<img>` warning；`npm run build` 仅保留既有 Tailwind module-type warning；`git diff --check` 通过。结果：JPG baseline passed，所有 JPG hash same；`pet-light` passed core alpha fix，白色 / 浅色主体被救回；`pet-dark` acceptable，未误清空；但 `pet-clean` 触发 stop condition，出现 top / edge dark strips regression。决策：不集成 4L-15 WIP，不继续 blind threshold tuning；alpha-aware core 仍有希望，但被 clean-control regression / retained edge ambiguity 阻塞。当前稳定产品状态仍只包括 transparent input quality notice，alpha-aware conversion 仍未集成。
- Phase 4M-1 已完成 preview-only conversion baseline simplification experiment，结论为 failed / non-integrated。测试路线为 edge-preserving image simplification before bead quantization；临时脚本为 `/tmp/previewConversionBaselineV3.ts`，输出目录为 `/tmp/bead-preview-4m1-conversion-baseline-v3`，repo code changes 为 none。结果：`pet-light` C -> C，busy background 仍然主导，不更值得 cleanup；`pet-clean` B -> C，clean-control regression，出现更多 brown / teal contamination 和 structure pollution；`pet-dark` B -> B，基本中性，没有明显收益。决策：不集成 simplification-v3，不继续 blind threshold tuning，不把这一路线当成 first-draft baseline improvement。
- Phase 4M-3 已完成 preview-only crop-first baseline experiment，结论为 failed / non-integrated。测试路线为 hybrid safe crop / subject framing before bead quantization；临时脚本为 `/tmp/previewCropFirstBaseline.ts`，输出目录为 `/tmp/bead-preview-4m3-crop-first-baseline`，repo code changes 为 none。Crop method 使用 edge / contrast density + border contrast saliency proxy、generous padding、target aspect ratio `0.5`、minimum retained source area `0.58`、weak or near-full-source crop skip guards，并使用一套全局参数。结果：`pet-light` skipped，C -> C，busy background still competitive；`pet-clean` skipped，B -> B，无退化但无收益；`pet-dark` crop applied，retained about 85.5% source，B -> B，无明显 cut-off 但也无 meaningful first-draft improvement。决策：不集成 crop-first v1，不继续 blind crop tuning；crop-first as tested does not solve first-draft desirability。
- Phase 4M-5 已完成 preview-only region-aware background handling experiment，结论为 failed / non-integrated。测试路线为 `region-bg-quiet`；临时脚本为 `/tmp/previewRegionAwareBackground.ts`，输出目录为 `/tmp/bead-preview-4m5-region-aware-background`，repo code changes 为 none。方法：基于当前 pet-photo 输出构建 connected bead-cell regions，使用 border / corner-seeded background confidence，结合 color similarity 与 edge/detail density，将 high-confidence background regions quiet 成一个 background color cluster；不 hard-delete cells，不创建 subject mask。结果：`pet-light` C -> B，busy background 变安静且主体更易读，是有用信号；`pet-clean` B -> C，触发 stop condition，large subject/body regions 被误判为 background 并 flatten；`pet-dark` B -> B，基本中性。决策：不集成 region-bg-quiet v1，不继续 blind threshold tuning；region-aware direction 有信号，但当前 border/corner model 对 subject-dominant / frame-touching subject 存在严重 false positive。
- Phase 4M-7 已完成 preview-only quantization-order redesign experiment，结论为 failed / non-integrated。测试路线为 pre-palette cluster stabilization / quantization-order candidate；临时脚本为 `/tmp/previewQuantizationOrderRedesign.ts`，输出目录为 `/tmp/bead-preview-4m7-quantization-order`，repo code changes 为 none。方法：source cells -> draft RGB cells -> connected local clusters -> low-support cluster merge -> protected detail / edge cells -> common palette mapping；不使用 crop / mask / background removal / alpha-aware conversion / per-image tuning。结果：`pet-light` C -> C，无明确收益，background still dominant 且出现 harder black / red contamination；`pet-clean` B -> C，tan / gray contamination 与 structure pollution 增加；`pet-dark` B -> C，ignored background 被重新引入成 cyan field。诊断显示 cluster merge 几乎没有有效发生（`pet-light` 146 -> 145 / 170 -> 170；`pet-clean` 397 -> 390 / 647 -> 639；`pet-dark` 211 -> 211 / 284 -> 283），detail protection 太保守，candidate path 产生新污染而不是稳定颜色。决策：不集成 quantization-order v1，不继续 blind merge / protection threshold tuning，不把这一路线视为 first-draft baseline improvement。
- Phase 4M-10 已完成 editable-first-draft copy-only UX implementation，提交 `6e714c1 copy: frame generated patterns as editable drafts`。改动文件为 `src/components/PatternTool.tsx`、`src/components/ImageUploader.tsx`、`src/components/PatternGrid.tsx`、`src/components/ColorStats.tsx`、`src/components/PatternExportPanel.tsx`。变更性质仅为 copy-only UX framing：产品叙事从“一键完美转换”调整为“生成可编辑拼豆初稿 -> 清理颜色 -> 导出图纸”，cleanup 被定位为核心流程而不是失败补救。未改 engine、`generatePattern.ts`、`trimBackground.ts`、export algorithm、types、palette / MARD 或 cleanup 行为逻辑。检查通过：`npx tsc --noEmit`；`npm run lint` 仅保留既有 `ImageUploader.tsx` `<img>` warning；`npm run build` 仅保留既有 Tailwind module-type warning；`git diff --check` 通过。alpha-aware conversion 仍未集成。
- Phase 4M-12 已完成 preview-only rendering mode comparison，结论为 PASS。临时脚本为 `/tmp/previewRenderingModeComparison.ts`，输出目录为 `/tmp/bead-preview-4m12-rendering-mode-comparison`，repo code changes 为 none。对同一份 `PatternResult` 比较 `current-round-gap`、`square-no-gap` 和 `round-no-gap`：`pet-light` 在 square-no-gap 下 C -> B；`pet-clean` B -> B，无退化；`pet-dark` B -> A。所有模式的 pattern statistics 完全一致。诊断显示 current round+gap preview 的 visible shape coverage 约为 64.9%，gap area 约为 17.4%，round cell coverage 约为 78.5%；gap 会增加碎裂感，但 circular corner loss 是更大的可读性惩罚，当前主预览可能让 first draft 看起来比 underlying grid 更差。决策：进入 4M-13 implementation planning；默认主编辑预览应优先考虑 square / pixel draft，round bead view 保留为 optional realistic preview；第一实现切片不改变 export behavior。alpha-aware conversion 仍未集成，conversion algorithm 无改动。
- Phase 4M-14 已完成 rendering mode toggle implementation，提交 `7962403 feat: add draft and bead preview modes`，改动文件仅为 `src/components/PatternGrid.tsx`。新增本地 `PreviewMode`：`draft | bead`，默认 `draft`；draft 使用 soft square + no gap，bead 使用 round bead + gap，并新增“初稿视图 / 圆珠预览”切换。切换只影响页面查看方式，不影响颜色统计、导出图纸、cleanup history 或 pattern 数据。未改 engine、`PatternCanvas.tsx`、export / `PatternExportPanel` / `exportPatternImage`、`PatternResult`、persistence / autosave、FocusMode 或 cleanup 行为逻辑。检查通过：`npx tsc --noEmit`；`npm run lint` 仅保留既有 `<img>` warning；`npm run build` 仅保留既有 Tailwind module-type warning；`git diff --check` 通过。alpha-aware conversion 仍未集成。
- Phase 4M-15 已完成 draft / bead preview toggle manual UI smoke check，结论为 PASS with sample-upload limitation。测试使用 Codex 内置浏览器、`http://localhost:3002`、desktop viewport 和 `390x844` narrow viewport，并通过恢复的 80x80 草稿验证：默认显示“初稿视图”，使用 soft square / no gap；可切换到使用 round bead / 1px gap 的“圆珠预览”；设背景、合并颜色、撤销和恢复后，两种视图均使用当前 edited grid；切换前后统计保持 `6157 / 10 色 / 243 忽略格`；导出文件名及导出状态不变；窄屏无页面横向溢出，toggle 与缩放控件无重叠；辅助文案明确说明切换仅改变页面查看方式，不影响颜色统计或导出图纸。限制：Codex browser API 无法上传本地文件，本轮未重新逐张上传 `pet-light` / `pet-clean` / `pet-dark`，视觉改善判断沿用 Phase 4M-12 对照实验；`next-env.d.ts` 曾被 dev server 自动触碰并已恢复。决策：rendering mode checkpoint 可关闭；默认编辑预览保持 draft / square view，round bead preview 保留为 optional realistic view，export behavior 保持不变。alpha-aware conversion 仍未集成。

## 当前下一步路线
1. Transparent input quality notice checkpoint 可收口；仅当用户观察到具体文案 / 布局问题时，再单独开启 UI polish。
2. 关闭当前 4L alpha-aware engine integration attempt；未来若重开 alpha-aware conversion，必须有新的设计，不应继续 threshold stacking。
3. Phase 4M 当前保持 editable-first-draft 产品叙事；4M-15 manual UI smoke check 已通过，rendering mode checkpoint 已关闭。默认编辑预览为 draft / square view，round bead preview 为 optional realistic view，export behavior 不变。
4. 保持 `generatePattern` / `trimBackground` 稳定，alpha-aware core 暂不集成。
5. 暂不启动 Phase 4K-6；候选方向仍仅包括 evaluate local erase / restore、autosave edited pattern、export/material QA checklist、edit history UX polish。
6. 当前不继续算法实验；MVP 可继续定位为 editable draft workflow。仅在出现具体 UI 问题或真实用户样本问题时，再开启独立后续任务。

## MVP 稳定性目标
- 页面在断网环境也可继续本地生成图纸
- 刷新后尽量保留用户当前工作状态
- 图片处理过程中不崩溃、不长时间卡死
- 图纸预览、导出、颜色统计始终围绕同一份 `PatternResult`
- 生成后编辑和撤销必须保持预览、材料统计、导出结果一致

## 智能推荐目标
后续的智能推荐应该做两件事：
1. 根据图片内容推荐更合适的图像类型 / 颜色数量 / 颜色风格
2. 把主界面收敛成更简单的用户语言，例如：更简单 / 平衡 / 更细节

这一步尚未开始，当前只是完成了参数配置化准备。

## 颜色算法优化目标
后续专项优化方向：
- 不同图像类型下更稳定的主色提取
- 更稳的黑边保护与收敛
- 减少脏色和误判色
- 宠物 / 真人图的专门策略

当前宠物照片算法路线已暂停继续启发式调参，优先推进可验证的产品级清理能力。

## 小程序复用考虑
后续小程序优先复用：
- `src/engine`
- `src/config`
- `src/types`
- `src/palettes`

原则：
- 配置文件不依赖 React
- engine 不依赖 DOM（浏览器导出除外）
- React 组件层只负责状态和展示，不承载核心算法

## 模块职责梳理
### 图片上传
负责接收本地图片文件、建立预览 URL、读取原始 `ImageData`。

### 图像处理
负责裁白边、背景忽略、缩放适配、颜色量化、杂色清理、黑边保护。

### 颜色匹配
负责把采样或量化得到的颜色匹配到 common 色卡。

### 图纸生成
负责输出统一的 `PatternResult`，供预览、统计、导出共同使用。

### 图纸预览
负责把 `PatternResult.grid` 渲染成网页中的可查看图纸，并提供缩放查看。

### 多尺寸变体卡片
负责展示不同尺寸方案，并切换当前选中图纸。

### 导出 PNG
负责基于 `PatternResult` 重新绘制高清 PNG，而不是截图网页。

### 生成设置项
负责把图像类型、颜色数量、颜色风格映射到 engine 参数。

### 导出设置项
负责把导出类型、清晰度、网格、背景、边距、图例排序等映射到导出参数。

### 颜色统计
负责从 `PatternResult.colorCounts` 展示颜色数量、总豆数、黑边占比等信息。

### 类型定义
负责统一 pattern、color、plan、variant 等中间数据结构。

### 色卡 / palette
负责提供 common 色卡数据，当前是主要颜色来源。

### 未来智能推荐
负责从图片特征自动生成更合适的默认参数，但应建立在 `PatternConfig` 配置层之上，而不是散落在 UI 中。

### 未来小程序复用
应复用 engine/config/types/palette，尽量避免复用 Web 专属组件层。

## 核心中间数据协议（文档协议，不是当前代码强制类型）

### PatternInput
**代表什么**：图像进入生成引擎前的输入载体。

**由哪个模块产生**：上传与图片读取模块产生。

**被哪些模块消费**：图像处理引擎、未来的自动保存与推荐逻辑。

**核心字段**：
- 原始 `ImageData`
- 原始宽高
- 文件来源信息（可选）

**未来扩展**：
- 文件名
- MIME 类型
- EXIF / 方向信息
- 用户裁剪信息

**是否适合小程序复用**：适合。只要定义成纯数据，不依赖 DOM。

### PatternConfig
**代表什么**：一次图纸生成所需的配置参数集合。

**由哪个模块产生**：生成设置 UI、未来智能推荐模块。

**被哪些模块消费**：`generatePattern`、多尺寸方案生成逻辑、自动保存。

**核心字段**：
- `mode`
- `colorLimit`
- `colorStyle`
- `ignoreWhiteBackground`
- `trimWhiteBackground`
- `trimMargin`
- 输出尺寸（或计划尺寸）

**未来扩展**：
- 主界面三档抽象模式
- 推荐来源
- 用户偏好
- 高级参数覆盖

**是否适合小程序复用**：非常适合，应保持纯 TypeScript 数据结构。

### PatternResult
**代表什么**：一次完整生成后的统一输出结果。

**由哪个模块产生**：`generatePattern`。

**被哪些模块消费**：图纸预览、尺寸方案卡片、颜色统计、PNG 导出、未来 FocusMode、自动保存。

**核心字段**：
- `width`
- `height`
- `grid`
- `colorCounts`
- `totalBeads`
- `usedColorCount`
- `ignoredBackgroundCells`
- `mode`
- `colorStyle`

**未来扩展**：
- 生成耗时
- 质量评分
- 推荐原因
- 用户编辑痕迹

**是否适合小程序复用**：是，属于跨端核心协议。

### BeadColor
**代表什么**：单个拼豆颜色定义。

**由哪个模块产生**：palette 模块提供，engine 引用。

**被哪些模块消费**：颜色匹配、图纸渲染、颜色统计、PNG 导出。

**核心字段**：
- `id`
- `name`
- `hex`
- `rgb`

**未来扩展**：
- 品牌色号
- 库存信息
- 替代色
- 是否可购买

**是否适合小程序复用**：非常适合。

### Palette
**代表什么**：一组可用于匹配的拼豆颜色集合。

**由哪个模块产生**：`src/palettes`。

**被哪些模块消费**：engine、统计、导出、未来库存系统。

**核心字段**：
- 调色板名称
- 颜色数组

**未来扩展**：
- 多品牌 palette
- 用户自定义 palette
- 可用性标签

**是否适合小程序复用**：非常适合。

### ExportSpec
**代表什么**：一次 PNG 导出的完整参数集合。

**由哪个模块产生**：导出面板 UI。

**被哪些模块消费**：`exportPatternImage` / `downloadPatternImage`。

**核心字段**：
- `kind`
- `scale`
- `grid`
- `background`
- `legendSort`
- `margin`
- `showColorCodes`
- `showCoordinates`
- `showLegend`
- `showTitle`

**未来扩展**：
- 多语言导出
- 页眉模板
- 水印
- 分区导出参数

**是否适合小程序复用**：大部分适合；真正下载文件的部分需要小程序侧适配。
