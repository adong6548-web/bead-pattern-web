import { getColorStyleLabel, getPatternModeLabel } from "@/config/patternPresets";
import type { PatternResult } from "@/types/pattern";

type ColorStatsProps = {
  pattern: PatternResult | null;
};

export function ColorStats({ pattern }: ColorStatsProps) {
  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">颜色统计</h2>
          <p className="mt-1 truncate text-xs text-ink/60">
            {pattern ? `common 色卡 · ${getPatternModeLabel(pattern.mode)} · ${getColorStyleLabel(pattern.colorStyle)}` : "色号来自 common 色卡。"}
          </p>
        </div>
      </div>

      {pattern ? (
        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
              <div className="font-semibold text-ink">{pattern.totalBeads}</div>
              <div className="mt-1 text-xs text-ink/55">总豆数</div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
              <div className="font-semibold text-ink">{pattern.usedColorCount}</div>
              <div className="mt-1 text-xs text-ink/55">使用颜色</div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
              <div className="font-semibold text-ink">{pattern.ignoredBackgroundCells}</div>
              <div className="mt-1 text-xs text-ink/55">忽略格</div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
              <div className="font-semibold text-ink">{Math.round(pattern.darkLineRatio * 100)}%</div>
              <div className="mt-1 text-xs text-ink/55">黑边占比</div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            {pattern.colorCounts.map(({ color, count }) => (
              <div
                className="flex min-w-0 items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                key={color.id}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-md border border-black/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{color.name}</div>
                </div>
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 font-mono text-xs text-ink/70">{color.id}</span>
                <span className="shrink-0 text-right font-semibold tabular-nums text-ink">{count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-ink/55">暂无统计</div>
      )}
    </section>
  );
}
