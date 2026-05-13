# CODEX.md

## Mandatory AI Guardrails
Before coding, read `AI_DEVELOPMENT_GUARDRAILS.md`.

For non-trivial tasks, follow the plan / scope / approval workflow in that document. These guardrails are mandatory, not optional.

## 项目简介
这是一个图片转拼豆图纸的 Web MVP 工具。用户上传图片后，系统在浏览器本地生成拼豆图纸，支持图纸预览、多尺寸方案、颜色统计和高清 PNG 导出。

## 当前技术栈
- Next.js 16.2.6
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- @tailwindcss/postcss
- Canvas / ImageData 前端本地图片处理

## 当前阶段
MVP 稳定性强化。

## 当前优先级
1. 离线可用
2. 自动保存
3. 不崩不卡
4. 智能推荐
5. 颜色算法优化

## 产品原则
1. 本地处理优先，暂时不做后端。
2. 普通用户界面保持简单。
3. 主界面后续只暴露“更简单 / 平衡 / 更细节”。
4. 图像类型、颜色数量、颜色风格放进高级设置。
5. UI 和图像处理引擎必须解耦。
6. 算法逻辑不能写死在 React 组件里。
7. 参数配置化，方便未来迁移小程序。
8. FocusMode 暂停推进，入口隐藏，代码保留。
9. PDF 导出暂不优先。
10. 云同步暂不优先。
11. 复杂横向拖拽暂不优先。
12. 分区导出暂不优先。
13. PNG 导出是当前主要交付方式。

## 禁止事项
- 不要默认新增依赖。
- 不要把图片处理算法写进 React 组件。
- 不要无故改 PNG 导出逻辑。
- 不要恢复 FocusMode 入口，除非产品决策明确变更。
- 不要把 Tailwind 4 改回 Tailwind 3。
- 不要把 `src_backup_before_bead_mvp` 当成当前主代码入口。
- 不要在没有明确目标时同时改 engine、UI、导出链路。

## 修改代码前必须阅读
至少先读这些文件：
- `src/components/PatternTool.tsx`
- `src/engine/generatePattern.ts`
- `src/engine/exportPatternImage.ts`
- `src/config/patternPresets.ts`
- `src/types/pattern.ts`
- `src/app/globals.css`
- `tailwind.config.ts`
- `postcss.config.mjs`

如果任务涉及导出，再补读：
- `src/components/PatternExportPanel.tsx`

如果任务涉及多尺寸方案，再补读：
- `src/engine/recommendPatternSizes.ts`
- `src/components/PatternVariantCards.tsx`

## Tailwind 4 注意事项
真实项目是 Tailwind 4。

`src/app/globals.css` 应保持：

```css
@config "../../tailwind.config.ts";
@import "tailwindcss";
```

不要改回 Tailwind 3 的：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

同时注意：
- PostCSS 依赖的是 `@tailwindcss/postcss`
- `postcss.config.mjs` 不要切回 Tailwind 3 写法
- 如果页面退回原生 HTML 样式，优先检查 Tailwind 编译链，而不是先怀疑组件点击逻辑

## 当前协作提醒
- FocusMode 代码保留，但当前属于暂停状态。
- `OriginalPreview.tsx` 可能是遗留组件，修改上传预览前先确认是否仍被引用。
- `patternPresets.ts` 当前通过 type import 引用了 `exportPatternImage.ts` 的类型；后续如果继续做跨端复用，建议把共享导出类型沉到 `src/types`。

## 每次修改后必须输出
1. 修改文件
2. 是否改 engine
3. 是否改导出
4. 是否改 UI
5. 是否新增依赖
6. 手动测试建议

建议附带说明：
- 修改范围是否仅限 Web
- 是否影响未来小程序复用
