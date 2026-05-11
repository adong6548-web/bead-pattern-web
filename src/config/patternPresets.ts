import type { PatternColorStyle, PatternMode, PatternPlan } from "@/types/pattern";
import type {
  PatternExportBackground,
  PatternExportGrid,
  PatternExportKind,
  PatternExportLegendSort,
  PatternExportMargin,
  PatternExportScale,
} from "@/engine/exportPatternImage";

type PatternModePreset = {
  defaultColorLimit: number;
  defaultColorStyle: PatternColorStyle;
  description: string;
  label: string;
  recommendedFor?: string[];
  sizeHint: string;
  value: PatternMode;
};

type ColorLimitPreset = {
  description?: string;
  label: string;
  level: "balanced" | "detail" | "simple";
  value: number;
};

type ColorStylePreset = {
  description: string;
  label: string;
  value: PatternColorStyle;
};

type ExportKindPreset = {
  description?: string;
  fileSuffix: string;
  label: string;
  requiresCodeReadable: boolean;
};

type ExportScalePreset = {
  allowCodeExport: boolean;
  cellSize: number;
  description?: string;
  label: string;
};

type ExportOptionPreset<TValue extends string> = {
  label: string;
  value: TValue;
};

type PatternPlanPreset = Pick<PatternPlan, "id" | "name"> & {
  description?: string;
  priority: number;
};

export const PATTERN_MODE_PRESETS: PatternModePreset[] = [
  {
    defaultColorLimit: 12,
    defaultColorStyle: "balanced",
    description: "适合边缘清楚、颜色较少的图。",
    label: "像素图 / 图标",
    recommendedFor: ["宝可梦", "像素图", "logo", "卡通图标"],
    sizeHint: "尺寸建议：40x40 / 80x40 常用。",
    value: "pixel-art",
  },
  {
    defaultColorLimit: 24,
    defaultColorStyle: "balanced",
    description: "适合多色插画，保留更多主色层次。",
    label: "插画",
    recommendedFor: ["商插", "儿童插画", "多色图案"],
    sizeHint: "尺寸建议：60x60 以上。",
    value: "illustration",
  },
  {
    defaultColorLimit: 16,
    defaultColorStyle: "balanced",
    description: "适合线稿明显的动漫头像，优先保留线条和脸部。",
    label: "二次元线稿",
    recommendedFor: ["动漫头像", "平涂线稿"],
    sizeHint: "尺寸建议：60x80 或更高。",
    value: "anime-lineart",
  },
  {
    defaultColorLimit: 24,
    defaultColorStyle: "balanced",
    description: "适合猫狗照片，尝试保留五官和毛发层次。",
    label: "宠物照片",
    recommendedFor: ["猫狗照片", "毛绒主体"],
    sizeHint: "尺寸建议：60x80 / 80x80 以上。",
    value: "pet-photo",
  },
  {
    defaultColorLimit: 32,
    defaultColorStyle: "faithful",
    description: "实验模式，真人图建议使用更高尺寸，效果可能不稳定。",
    label: "真人人像（实验）",
    recommendedFor: ["真人照片"],
    sizeHint: "尺寸建议：80x100 以上，当前为实验模式。",
    value: "portrait-photo",
  },
];

export const COLOR_LIMIT_PRESETS: ColorLimitPreset[] = [
  { label: "8 色", level: "simple", value: 8 },
  { label: "12 色", level: "balanced", value: 12 },
  { label: "16 色", level: "balanced", value: 16 },
  { label: "24 色", level: "detail", value: 24 },
  { label: "32 色", level: "detail", value: 32 },
];

export const COLOR_STYLE_PRESETS: ColorStylePreset[] = [
  { description: "减少杂色，更多近色合并。", label: "更干净", value: "clean" },
  { description: "兼顾干净度和层次。", label: "平衡", value: "balanced" },
  { description: "保留更多颜色层次。", label: "更接近原图", value: "faithful" },
];

export const DEFAULT_PATTERN_MODE: PatternMode = "pixel-art";
export const DEFAULT_PATTERN_COLOR_STYLE: PatternColorStyle = "balanced";

export const PATTERN_PLAN_PRESETS: Record<string, PatternPlanPreset> = {
  "fine-square": { description: "适合保留更多方形主体细节。", id: "fine-square", name: "精细版", priority: 3 },
  "fine-tall": { description: "适合保留更多竖向细节。", id: "fine-tall", name: "精细版", priority: 3 },
  "fine-wide": { description: "适合保留更多横向细节。", id: "fine-wide", name: "精细版", priority: 3 },
  "novice-square": { description: "入门尝试最省心。", id: "novice-square", name: "新手版", priority: 1 },
  "recommended-square": { description: "方形主体的默认推荐。", id: "recommended-square", name: "推荐版", priority: 2 },
  "recommended-tall": { description: "竖向主体的默认推荐。", id: "recommended-tall", name: "推荐版", priority: 2 },
  "recommended-wide": { description: "横向主体的默认推荐。", id: "recommended-wide", name: "推荐版", priority: 2 },
};

export const PATTERN_EXPORT_KIND_PRESETS: Record<PatternExportKind, ExportKindPreset> = {
  color: { description: "仅导出彩色图纸。", fileSuffix: "color", label: "彩色图纸", requiresCodeReadable: false },
  code: { description: "导出仅含色号的图纸。", fileSuffix: "code", label: "色号图纸", requiresCodeReadable: true },
  "color-code": {
    description: "导出带颜色和色号的施工图。",
    fileSuffix: "color-code",
    label: "彩色+色号图纸",
    requiresCodeReadable: true,
  },
};

export const PATTERN_EXPORT_SCALE_PRESETS: Record<PatternExportScale, ExportScalePreset> = {
  hd: { allowCodeExport: true, cellSize: 40, description: "默认推荐。", label: "高清" },
  standard: { allowCodeExport: false, cellSize: 24, description: "仅适合彩色图纸。", label: "标准" },
  ultra: { allowCodeExport: true, cellSize: 60, description: "适合放大查看细节。", label: "超清" },
};

export const PATTERN_EXPORT_GRID_OPTIONS: ExportOptionPreset<PatternExportGrid>[] = [
  { label: "无网格", value: "none" },
  { label: "细网格", value: "fine" },
  { label: "标准网格", value: "standard" },
];

export const PATTERN_EXPORT_BACKGROUND_OPTIONS: ExportOptionPreset<PatternExportBackground>[] = [
  { label: "白底", value: "white" },
  { label: "透明背景", value: "transparent" },
  { label: "浅米白背景", value: "warm" },
];

export const PATTERN_EXPORT_MARGIN_OPTIONS: ExportOptionPreset<PatternExportMargin>[] = [
  { label: "紧凑", value: "compact" },
  { label: "标准", value: "standard" },
  { label: "宽松", value: "loose" },
];

export const PATTERN_EXPORT_LEGEND_SORT_OPTIONS: ExportOptionPreset<PatternExportLegendSort>[] = [
  { label: "按色号排序", value: "code" },
  { label: "按数量降序", value: "count" },
];

export const PATTERN_EXPORT_KIND_OPTIONS = Object.keys(PATTERN_EXPORT_KIND_PRESETS) as PatternExportKind[];
export const PATTERN_EXPORT_SCALE_OPTIONS = Object.keys(PATTERN_EXPORT_SCALE_PRESETS) as PatternExportScale[];
export const CODE_MIN_CELL_SIZE = 32;

export const PATTERN_EXPORT_BACKGROUND_COLORS: Record<Exclude<PatternExportBackground, "transparent">, string> = {
  warm: "#fbfaf7",
  white: "#ffffff",
};

export const PATTERN_EXPORT_MARGIN_PRESETS: Record<
  PatternExportMargin,
  {
    headerHeight: number;
    legendGap: number;
    legendPadding: number;
    outer: number;
  }
> = {
  compact: { headerHeight: 126, legendGap: 16, legendPadding: 12, outer: 16 },
  loose: { headerHeight: 176, legendGap: 96, legendPadding: 28, outer: 96 },
  standard: { headerHeight: 142, legendGap: 48, legendPadding: 16, outer: 48 },
};

export function getPatternModePreset(mode: PatternMode) {
  return PATTERN_MODE_PRESETS.find((option) => option.value === mode) ?? PATTERN_MODE_PRESETS[0];
}

export function getDefaultColorLimitForMode(mode: PatternMode) {
  return getPatternModePreset(mode).defaultColorLimit;
}

export function getDefaultColorStyleForMode(mode: PatternMode) {
  return getPatternModePreset(mode).defaultColorStyle;
}

export function getPatternModeLabel(mode: PatternMode) {
  return getPatternModePreset(mode).label;
}

export function getColorStyleLabel(colorStyle: PatternColorStyle) {
  return COLOR_STYLE_PRESETS.find((option) => option.value === colorStyle)?.label ?? colorStyle;
}

export function getPatternPlanPreset(planId: string) {
  return PATTERN_PLAN_PRESETS[planId];
}

export function getExportTypeLabel(kind: PatternExportKind) {
  return PATTERN_EXPORT_KIND_PRESETS[kind].label;
}

export function getExportScaleLabel(scale: PatternExportScale) {
  return PATTERN_EXPORT_SCALE_PRESETS[scale].label;
}
