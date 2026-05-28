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
- 生成后清理 MVP：可将选中的颜色全局设为 ignored background，或合并到另一个当前图纸已有颜色；预览、材料统计和 PNG 导出使用编辑后的图纸，且可重置回原始生成结果

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

## 近期阶段状态
- 当前稳定提交：`3c7ee39 feat: allow merging pattern colors`
- Phase 4J 已停止本地 pet-photo 启发式路线：subject mask / framing、cell-only hybrid sampling、pre-quantization value separation、region-map detail/noise route、single-image tuning 均已停止，Phase 4J-8 engine integration 不成立。
- Phase 4K 当前方向：从“自动生成完美宠物图”转为“自动初稿 + 用户可控修整”的产品级清理流。
- Phase 4K-1 已完成：用户可在颜色 / 材料列表中将选中颜色设为 ignored background；可编辑图纸状态与原始生成结果分离；预览、材料统计和导出使用编辑后的 grid；reset 可恢复原始生成结果；手动 QA 已通过，导出 PNG 反映编辑后的图纸。
- Phase 4K-2 已完成：用户可将选中颜色全局合并到另一个当前图纸已有颜色；source color 会从颜色 / 材料列表消失，target color 数量增加；预览、材料统计和导出继续使用编辑后的 grid；reset 可恢复原始生成结果。

## 当前下一步路线
1. 暂不启动 Phase 4K-3；候选方向仅包括 local erase / restore、undo stack、改进编辑 UX、autosave edited pattern
2. 保持 `generatePattern` 稳定，暂不继续宠物照片启发式算法调参
3. 后续再评估 AI / 像素化预处理增强路径，不与 4K 混做

## MVP 稳定性目标
- 页面在断网环境也可继续本地生成图纸
- 刷新后尽量保留用户当前工作状态
- 图片处理过程中不崩溃、不长时间卡死
- 图纸预览、导出、颜色统计始终围绕同一份 `PatternResult`
- 生成后编辑必须保持预览、材料统计、导出结果一致

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
