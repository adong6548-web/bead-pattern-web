"use client";

import { COLOR_LIMIT_PRESETS, COLOR_STYLE_PRESETS, getPatternModePreset, PATTERN_MODE_PRESETS } from "@/config/patternPresets";
import type { PatternColorStyle, PatternMode } from "@/types/pattern";

type GenerationSettingsProps = {
  colorLimit: number;
  colorStyle: PatternColorStyle;
  mode: PatternMode;
  onColorLimitChange: (colorLimit: number) => void;
  onColorStyleChange: (colorStyle: PatternColorStyle) => void;
  onModeChange: (mode: PatternMode) => void;
};

export function GenerationSettings({
  colorLimit,
  colorStyle,
  mode,
  onColorLimitChange,
  onColorStyleChange,
  onModeChange,
}: GenerationSettingsProps) {
  const activeMode = getPatternModePreset(mode);

  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">生成设置</h2>
          <p className="mt-1 text-xs text-ink/60">根据图片类型调整取色、压色和清理策略。</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-ink/60">当前：{activeMode.label}</span>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-ink/60">图像类型</p>
          <div className="grid grid-cols-1 gap-2">
            {PATTERN_MODE_PRESETS.map((option) => {
              const isSelected = mode === option.value;
              return (
                <button
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-50 font-semibold text-ink shadow-sm"
                      : "border-stone-200 bg-stone-50 text-ink/70 hover:bg-white"
                  }`}
                  key={option.value}
                  type="button"
                  onClick={() => onModeChange(option.value)}
                >
                  <span className="block font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 rounded-xl bg-stone-50 px-3 py-2 text-xs leading-5 text-ink/65">
            <p>{activeMode.description}</p>
            <p className="text-ink/50">{activeMode.sizeHint}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-ink/60">颜色数量</p>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-stone-50 p-1">
              {COLOR_LIMIT_PRESETS.map((option) => {
                const isSelected = colorLimit === option.value;
                return (
                  <button
                    className={`min-w-[4.25rem] flex-1 rounded-lg px-2 py-1.5 text-sm transition ${
                      isSelected ? "bg-emerald-50 font-semibold text-ink ring-1 ring-emerald-300" : "border border-transparent bg-white text-ink/65 hover:bg-stone-100"
                    }`}
                    key={option.value}
                    type="button"
                    onClick={() => onColorLimitChange(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-ink/60">颜色风格</p>
            <div className="grid grid-cols-1 gap-2">
              {COLOR_STYLE_PRESETS.map((option) => {
                const isSelected = colorStyle === option.value;
                return (
                  <button
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50 text-ink shadow-sm"
                        : "border-stone-200 bg-stone-50 text-ink/70 hover:bg-white"
                    }`}
                    key={option.value}
                    type="button"
                    onClick={() => onColorStyleChange(option.value)}
                  >
                    <span className="block font-semibold">{option.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-ink/50">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
