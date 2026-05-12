"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PATTERN_EXPORT_BACKGROUND_OPTIONS,
  PATTERN_EXPORT_GRID_OPTIONS,
  PATTERN_EXPORT_KIND_OPTIONS,
  PATTERN_EXPORT_KIND_PRESETS,
  PATTERN_EXPORT_LEGEND_SORT_OPTIONS,
  PATTERN_EXPORT_MARGIN_OPTIONS,
  PATTERN_EXPORT_SCALE_OPTIONS,
  PATTERN_EXPORT_SCALE_PRESETS,
} from "@/config/patternPresets";
import {
  canExportPatternKind,
  downloadPatternImage,
  getPatternExportFileName,
  type PatternExportBackground,
  type PatternExportGrid,
  type PatternExportKind,
  type PatternExportLegendSort,
  type PatternExportMargin,
  type PatternExportScale,
} from "@/engine/exportPatternImage";
import type { PatternResult } from "@/types/pattern";
import type { PersistedExportSettings } from "@/utils/persistence";

type PatternExportPanelProps = {
  initialDraft?: PersistedExportSettings | null;
  onDraftChange?: (draft: PersistedExportSettings) => void;
  pattern: PatternResult;
};

export function PatternExportPanel({ initialDraft, onDraftChange, pattern }: PatternExportPanelProps) {
  const [kind, setKind] = useState<PatternExportKind>(() => initialDraft?.kind ?? "color");
  const [scale, setScale] = useState<PatternExportScale>(() => initialDraft?.scale ?? "hd");
  const [background, setBackground] = useState<PatternExportBackground>(() => initialDraft?.background ?? "white");
  const [grid, setGrid] = useState<PatternExportGrid>(() => initialDraft?.grid ?? "standard");
  const [legendSort, setLegendSort] = useState<PatternExportLegendSort>(() => initialDraft?.legendSort ?? "code");
  const [margin, setMargin] = useState<PatternExportMargin>(() => initialDraft?.margin ?? "standard");
  const [showColorCodes, setShowColorCodes] = useState(() => initialDraft?.showColorCodes ?? false);
  const [showCoordinates, setShowCoordinates] = useState(() => initialDraft?.showCoordinates ?? true);
  const [showLegend, setShowLegend] = useState(() => initialDraft?.showLegend ?? true);
  const [showTitle, setShowTitle] = useState(() => initialDraft?.showTitle ?? true);
  const [message, setMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canDownload = canExportPatternKind(kind, scale);
  const colorCodesAreForced = kind !== "color";
  const selectedScale = PATTERN_EXPORT_SCALE_PRESETS[scale];
  const fileName = useMemo(() => getPatternExportFileName(pattern, kind), [kind, pattern]);

  useEffect(() => {
    onDraftChange?.({
      background,
      grid,
      kind,
      legendSort,
      margin,
      scale,
      showColorCodes,
      showCoordinates,
      showLegend,
      showTitle,
    });
  }, [background, grid, kind, legendSort, margin, onDraftChange, scale, showColorCodes, showCoordinates, showLegend, showTitle]);

  async function handleDownload() {
    if (!canDownload) {
      setMessage("色号图纸需要更大的单格尺寸，请选择高清或超清导出。");
      return;
    }

    try {
      setIsExporting(true);
      setMessage(null);
      const downloadedFileName = await downloadPatternImage(pattern, {
        background,
        grid,
        kind,
        legendSort,
        margin,
        paletteName: "common",
        scale,
        showColorCodes: colorCodesAreForced || showColorCodes,
        showCoordinates,
        showLegend,
        showTitle,
      });
      setMessage(`已生成 ${downloadedFileName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PNG 导出失败，请重试。");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-w-0 rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">导出 PNG</h3>
          <p className="mt-1 text-xs leading-5 text-ink/55">根据当前选中的整张图纸数据高清重绘，不截取网页画面。</p>
        </div>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          disabled={isExporting || !canDownload}
          type="button"
          onClick={handleDownload}
        >
          {isExporting ? "生成中..." : "下载 PNG"}
        </button>
      </div>

      <div className="mt-3 grid gap-3 2xl:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="mb-2 text-xs font-semibold text-ink/60">导出类型</p>
          <div className="flex flex-wrap gap-2">
            {PATTERN_EXPORT_KIND_OPTIONS.map((option) => {
              const isSelected = kind === option;
              const kindPreset = PATTERN_EXPORT_KIND_PRESETS[option];
              return (
                <button
                  className={`min-w-[8.5rem] flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected ? "border-emerald-300 bg-emerald-50 text-ink" : "border-stone-200 bg-stone-50 text-ink/70 hover:bg-white"
                  }`}
                  key={option}
                  type="button"
                  onClick={() => {
                    setKind(option);
                    setMessage(null);
                    setShowColorCodes(option !== "color");
                  }}
                >
                  <span className="block font-semibold">{kindPreset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-ink/60">清晰度</p>
          <div className="flex flex-wrap gap-2">
            {PATTERN_EXPORT_SCALE_OPTIONS.map((option) => {
              const isSelected = scale === option;
              const scaleOption = PATTERN_EXPORT_SCALE_PRESETS[option];
              return (
                <button
                  className={`min-w-[6.5rem] flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected ? "border-emerald-300 bg-emerald-50 text-ink" : "border-stone-200 bg-stone-50 text-ink/70 hover:bg-white"
                  }`}
                  key={option}
                  type="button"
                  onClick={() => {
                    setScale(option);
                    setMessage(null);
                  }}
                >
                  <span className="block font-semibold">{scaleOption.label}</span>
                  <span className="mt-0.5 block text-[11px] text-ink/50">{scaleOption.cellSize}px/格</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 2xl:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-ink/60">显示网格</p>
          <div className="flex flex-wrap gap-2">
            {PATTERN_EXPORT_GRID_OPTIONS.map((option) => {
              const isSelected = grid === option.value;
              return (
                <button
                  className={`min-w-[5.5rem] flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected ? "border-emerald-300 bg-emerald-50 font-semibold text-ink" : "border-stone-200 bg-stone-50 text-ink/70 hover:bg-white"
                  }`}
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setGrid(option.value);
                    setMessage(null);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-ink/60">图例排序</p>
          <div className="flex flex-wrap gap-2">
            {PATTERN_EXPORT_LEGEND_SORT_OPTIONS.map((option) => {
              const isSelected = legendSort === option.value;
              return (
                <button
                  className={`min-w-[7.5rem] flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected ? "border-emerald-300 bg-emerald-50 font-semibold text-ink" : "border-stone-200 bg-stone-50 text-ink/70 hover:bg-white"
                  }`}
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setLegendSort(option.value);
                    setMessage(null);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 2xl:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-ink/60">背景</p>
          <div className="flex flex-wrap gap-2">
            {PATTERN_EXPORT_BACKGROUND_OPTIONS.map((option) => {
              const isSelected = background === option.value;
              return (
                <button
                  className={`min-w-[5.75rem] flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected ? "border-emerald-300 bg-emerald-50 font-semibold text-ink" : "border-stone-200 bg-stone-50 text-ink/70 hover:bg-white"
                  }`}
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setBackground(option.value);
                    setMessage(null);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-ink/60">边距</p>
          <div className="flex flex-wrap gap-2">
            {PATTERN_EXPORT_MARGIN_OPTIONS.map((option) => {
              const isSelected = margin === option.value;
              return (
                <button
                  className={`min-w-[5.5rem] flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected ? "border-emerald-300 bg-emerald-50 font-semibold text-ink" : "border-stone-200 bg-stone-50 text-ink/70 hover:bg-white"
                  }`}
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setMargin(option.value);
                    setMessage(null);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-ink/45">边距只影响导出图片四周和版式间距，不会裁剪图纸空白格。</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2 2xl:grid-cols-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-ink/70">
          <input checked={showCoordinates} className="h-4 w-4 accent-moss" type="checkbox" onChange={(event) => setShowCoordinates(event.target.checked)} />
          显示坐标轴
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink/70">
          <input checked={showLegend} className="h-4 w-4 accent-moss" type="checkbox" onChange={(event) => setShowLegend(event.target.checked)} />
          显示图例
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink/70">
          <input checked={showTitle} className="h-4 w-4 accent-moss" type="checkbox" onChange={(event) => setShowTitle(event.target.checked)} />
          显示标题信息
        </label>
        <label className={`flex items-center gap-2 text-xs font-semibold ${colorCodesAreForced ? "text-ink/40" : "text-ink/70"}`}>
          <input
            checked={colorCodesAreForced || showColorCodes}
            className="h-4 w-4 accent-moss"
            disabled={colorCodesAreForced}
            type="checkbox"
            onChange={(event) => setShowColorCodes(event.target.checked)}
          />
          显示色号
        </label>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs text-ink/55">
        <span className="max-w-full truncate" title={fileName}>
          文件名：{fileName}
        </span>
        <span>当前单格：{selectedScale.cellSize}px</span>
        {colorCodesAreForced ? <span>当前导出类型必须显示色号。</span> : null}
        {!canDownload ? <span className="font-semibold text-[#a64b2a]">请选择高清或超清导出色号版。</span> : null}
        {message ? <span className={message.startsWith("已生成") ? "font-semibold text-moss" : "font-semibold text-[#a64b2a]"}>{message}</span> : null}
      </div>
    </div>
  );
}
