"use client";

import { useState } from "react";
import { getColorStyleLabel, getPatternModeLabel } from "@/config/patternPresets";
import type { PatternResult } from "@/types/pattern";

type ColorStatsProps = {
  canResetPattern?: boolean;
  canUndoPattern?: boolean;
  onMergeColor?: (sourceColorId: string, targetColorId: string) => void;
  onResetPattern?: () => void;
  onSetColorAsBackground?: (colorId: string) => void;
  onUndoPattern?: () => void;
  pattern: PatternResult | null;
};

export function ColorStats({
  canResetPattern = false,
  canUndoPattern = false,
  onMergeColor,
  onResetPattern,
  onSetColorAsBackground,
  onUndoPattern,
  pattern,
}: ColorStatsProps) {
  const [mergeSourceColorId, setMergeSourceColorId] = useState<string | null>(null);
  const [mergeTargetColorId, setMergeTargetColorId] = useState("");
  const canMergeColors = Boolean(onMergeColor && pattern && pattern.colorCounts.length > 1);

  function openMergePicker(sourceColorId: string) {
    if (!pattern) {
      return;
    }

    const firstTargetColorId = pattern.colorCounts.find(({ color }) => color.id !== sourceColorId)?.color.id ?? "";
    setMergeSourceColorId(sourceColorId);
    setMergeTargetColorId(firstTargetColorId);
  }

  function closeMergePicker() {
    setMergeSourceColorId(null);
    setMergeTargetColorId("");
  }

  function confirmMergeColor(sourceColorId: string) {
    if (!onMergeColor || !mergeTargetColorId || sourceColorId === mergeTargetColorId) {
      return;
    }

    onMergeColor(sourceColorId, mergeTargetColorId);
    closeMergePicker();
  }

  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">颜色统计</h2>
          <p className="mt-1 truncate text-xs text-ink/60">
            {pattern ? `common 色卡 · ${getPatternModeLabel(pattern.mode)} · ${getColorStyleLabel(pattern.colorStyle)}` : "色号来自 common 色卡。"}
          </p>
        </div>
        {pattern && (canUndoPattern || canResetPattern) ? (
          <div className="flex flex-wrap gap-2">
            {canUndoPattern && onUndoPattern ? (
              <button
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-white"
                type="button"
                onClick={onUndoPattern}
              >
                撤销上一步
              </button>
            ) : null}
            {canResetPattern && onResetPattern ? (
              <button
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-white"
                type="button"
                onClick={onResetPattern}
              >
                恢复原图纸
              </button>
            ) : null}
          </div>
        ) : null}
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

          {onSetColorAsBackground || canMergeColors ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              设为背景或合并颜色会全局修改该色所有格，可能影响眼睛、鼻子、嘴巴或轮廓细节。
            </p>
          ) : null}

          <div className="flex min-w-0 flex-col gap-2">
            {pattern.colorCounts.map(({ color, count }) => {
              const isMergePickerOpen = mergeSourceColorId === color.id;
              const mergeTargetOptions = pattern.colorCounts.filter(({ color: targetColor }) => targetColor.id !== color.id);

              return (
                <div
                  className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
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
                  {canMergeColors ? (
                    <button
                      className="ml-auto shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-white"
                      type="button"
                      onClick={() => (isMergePickerOpen ? closeMergePicker() : openMergePicker(color.id))}
                    >
                      合并到...
                    </button>
                  ) : null}
                  {onSetColorAsBackground ? (
                    <button
                      className="shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-white"
                      type="button"
                      onClick={() => onSetColorAsBackground(color.id)}
                    >
                      设为背景
                    </button>
                  ) : null}
                  {isMergePickerOpen ? (
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 border-t border-stone-100 pt-2">
                      <label className="shrink-0 text-xs font-semibold text-ink/55" htmlFor={`merge-target-${color.id}`}>
                        目标颜色
                      </label>
                      <select
                        className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-ink/75 outline-none transition focus:border-emerald-300 focus:bg-white"
                        id={`merge-target-${color.id}`}
                        value={mergeTargetColorId}
                        onChange={(event) => setMergeTargetColorId(event.target.value)}
                      >
                        {mergeTargetOptions.map(({ color: targetColor }) => (
                          <option key={targetColor.id} value={targetColor.id}>
                            {targetColor.name} ({targetColor.id})
                          </option>
                        ))}
                      </select>
                      <button
                        className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        disabled={!mergeTargetColorId || mergeTargetColorId === color.id}
                        type="button"
                        onClick={() => confirmMergeColor(color.id)}
                      >
                        合并
                      </button>
                      <button
                        className="shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-white"
                        type="button"
                        onClick={closeMergePicker}
                      >
                        取消
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-ink/55">暂无统计</div>
      )}
    </section>
  );
}
