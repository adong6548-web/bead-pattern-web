"use client";

import { useEffect, useState } from "react";
import type { PatternResult } from "@/types/pattern";
import { PatternCanvas } from "./PatternCanvas";

type PatternGridProps = {
  pattern: PatternResult | null;
};

type PreviewMode = "draft" | "bead";

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];
const BASE_CELL_SIZE = 10;

export function PatternGrid({ pattern }: PatternGridProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("draft");
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoom = ZOOM_LEVELS[zoomIndex];
  const cellSize = BASE_CELL_SIZE * zoom;
  const isDraftPreview = previewMode === "draft";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Pre-existing PatternGrid behavior: when the rendered pattern dimensions change, the preview zoom intentionally resets to 100%. This autosave PR preserves that behavior without changing preview interactions.
    setZoomIndex(2);
  }, [pattern?.width, pattern?.height]);

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">
            {pattern ? `${pattern.width}×${pattern.height}` : "40×40"} 可编辑拼豆初稿
          </h2>
          <p className="mt-1 text-xs text-ink/60">
            {isDraftPreview ? "方格用于判断轮廓和色块，透明格为忽略背景。" : "圆点模拟拼豆观感，淡灰圆为忽略背景。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pattern ? (
            <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 p-1 text-sm text-ink/70">
              <button
                className="rounded-lg px-2 py-1 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={zoomIndex === 0}
                type="button"
                onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
              >
                缩小
              </button>
              <span className="px-2 font-semibold text-ink">{Math.round(zoom * 100)}%</span>
              <button
                className="rounded-lg px-2 py-1 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                type="button"
                onClick={() => setZoomIndex((current) => Math.min(ZOOM_LEVELS.length - 1, current + 1))}
              >
                放大
              </button>
              <button className="rounded-lg px-2 py-1 transition hover:bg-white" type="button" onClick={() => setZoomIndex(2)}>
                重置
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-sm font-semibold text-moss">
            <span>{pattern ? `${pattern.totalBeads} 颗` : "等待上传"}</span>
            {pattern ? <span className="text-ink/45">· {pattern.usedColorCount} 色</span> : null}
          </div>
        </div>
      </div>

      {pattern ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div
            aria-label="预览方式"
            className="inline-flex shrink-0 rounded-xl border border-stone-200 bg-stone-50 p-1 text-xs font-semibold text-ink/65"
            role="group"
          >
            <button
              aria-pressed={isDraftPreview}
              className={`rounded-lg px-3 py-1.5 transition ${
                isDraftPreview ? "bg-white text-ink shadow-sm" : "hover:bg-white/70"
              }`}
              type="button"
              onClick={() => setPreviewMode("draft")}
            >
              初稿视图
            </button>
            <button
              aria-pressed={!isDraftPreview}
              className={`rounded-lg px-3 py-1.5 transition ${
                !isDraftPreview ? "bg-white text-ink shadow-sm" : "hover:bg-white/70"
              }`}
              type="button"
              onClick={() => setPreviewMode("bead")}
            >
              圆珠预览
            </button>
          </div>
          <p className="min-w-0 text-xs text-ink/45">仅改变页面查看方式，不影响颜色统计或导出图纸。</p>
        </div>
      ) : null}

      <p className="text-xs text-ink/50">
        {pattern ? "这是可编辑初稿；如果背景或碎色偏多，可以从颜色列表中设为背景或合并颜色。" : "上传图片后生成可编辑初稿。"}
      </p>

      <div className="w-full overflow-x-auto overflow-y-hidden rounded-2xl bg-[#f3f0e8] p-3" style={{ touchAction: "pan-x pan-y" }}>
        <div className="mx-auto flex min-h-64 w-fit min-w-max items-center justify-center sm:min-h-72">
          {pattern ? (
            <PatternCanvas
              cellSize={cellSize}
              pattern={pattern}
              rounded={isDraftPreview ? "soft" : "circle"}
              showGap={!isDraftPreview}
            />
          ) : (
            <div className="text-sm text-ink/55">上传图片后生成可编辑初稿</div>
          )}
        </div>
      </div>
    </section>
  );
}
