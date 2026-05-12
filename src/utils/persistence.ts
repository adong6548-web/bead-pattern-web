import { commonPalette } from "@/palettes/common";
import type { PatternExportBackground, PatternExportGrid, PatternExportKind, PatternExportLegendSort, PatternExportMargin, PatternExportScale } from "@/engine/exportPatternImage";
import type { BeadCell, BeadColor, ColorCount, PatternColorStyle, PatternMode, PatternPlan, PatternResult, PatternVariant } from "@/types/pattern";

export const SESSION_STORAGE_KEY = "bead-pattern:session:v1";
export const EXPORT_STORAGE_KEY = "bead-pattern:export:v1";
export const STORAGE_VERSION = 1;
export const MAX_SNAPSHOT_CELLS = 12000;

const PATTERN_MODES = new Set<PatternMode>(["pixel-art", "illustration", "anime-lineart", "pet-photo", "portrait-photo"]);
const COLOR_STYLES = new Set<PatternColorStyle>(["clean", "balanced", "faithful"]);
const EXPORT_KINDS = new Set<PatternExportKind>(["color", "code", "color-code"]);
const EXPORT_SCALES = new Set<PatternExportScale>(["standard", "hd", "ultra"]);
const EXPORT_BACKGROUNDS = new Set<PatternExportBackground>(["white", "transparent", "warm"]);
const EXPORT_GRIDS = new Set<PatternExportGrid>(["none", "fine", "standard"]);
const EXPORT_LEGEND_SORTS = new Set<PatternExportLegendSort>(["code", "count"]);
const EXPORT_MARGINS = new Set<PatternExportMargin>(["compact", "standard", "loose"]);

type PersistedCellSnapshot = {
  colorId: string | null;
  isDarkLine: boolean;
  isIgnoredBackground: boolean;
};

type PersistedColorCount = {
  colorId: string;
  count: number;
};

type PersistedPatternSnapshot = {
  width: number;
  height: number;
  grid: PersistedCellSnapshot[][];
  colorCounts: PersistedColorCount[];
  totalBeads: number;
  ignoredBackgroundCells: number;
  usedColorCount: number;
  colorLimit: number;
  cleanedNoiseCells: number;
  smoothedCells: number;
  mergedSimilarColorCells: number;
  darkLineCount: number;
  darkLineRatio: number;
  mode: PatternMode;
  colorStyle: PatternColorStyle;
  darkLineProtectionEnabled: boolean;
  hueProtectionEnabled: boolean;
  sourceAspectRatio: number;
  fittedWidth: number;
  fittedHeight: number;
  fittedOffsetX: number;
  fittedOffsetY: number;
  aspectRatioWarning: "wide" | "tall" | null;
};

export type PersistedGenerationSettings = {
  patternMode: PatternMode;
  colorLimit: number;
  colorStyle: PatternColorStyle;
  ignoreWhiteBackground: boolean;
};

export type PersistedExportSettings = {
  kind: PatternExportKind;
  scale: PatternExportScale;
  background: PatternExportBackground;
  grid: PatternExportGrid;
  legendSort: PatternExportLegendSort;
  margin: PatternExportMargin;
  showColorCodes: boolean;
  showCoordinates: boolean;
  showLegend: boolean;
  showTitle: boolean;
};

export type PersistedPatternSelection = {
  plan: PatternPlan;
  pattern: PersistedPatternSnapshot;
};

export type PersistedSessionDraft = {
  version: 1;
  savedAt: string;
  settings: PersistedGenerationSettings;
  selection: {
    selectedVariantId: string | null;
  };
  snapshot: PersistedPatternSelection | null;
};

export type PersistedExportDraft = {
  version: 1;
  savedAt: string;
  settings: PersistedExportSettings;
};

export function readSessionDraft() {
  return readStoredValue<PersistedSessionDraft>(SESSION_STORAGE_KEY, isPersistedSessionDraft);
}

export function writeSessionDraft(draft: PersistedSessionDraft) {
  writeStoredValue(SESSION_STORAGE_KEY, draft);
}

export function clearSessionDraft() {
  clearStoredValue(SESSION_STORAGE_KEY);
}

export function readExportDraft() {
  return readStoredValue<PersistedExportDraft>(EXPORT_STORAGE_KEY, isPersistedExportDraft);
}

export function writeExportDraft(draft: PersistedExportDraft) {
  writeStoredValue(EXPORT_STORAGE_KEY, draft);
}

export function clearExportDraft() {
  clearStoredValue(EXPORT_STORAGE_KEY);
}

export function createPatternSnapshot(plan: PatternPlan, pattern: PatternResult): PersistedPatternSelection | null {
  const totalCells = pattern.width * pattern.height;
  if (totalCells > MAX_SNAPSHOT_CELLS) {
    return null;
  }

  return {
    plan: {
      height: plan.height,
      id: plan.id,
      isRecommended: plan.isRecommended,
      name: plan.name,
      width: plan.width,
    },
    pattern: {
      aspectRatioWarning: pattern.aspectRatioWarning,
      cleanedNoiseCells: pattern.cleanedNoiseCells,
      colorCounts: pattern.colorCounts.map(({ color, count }) => ({ colorId: color.id, count })),
      colorLimit: pattern.colorLimit,
      colorStyle: pattern.colorStyle,
      darkLineCount: pattern.darkLineCount,
      darkLineProtectionEnabled: pattern.darkLineProtectionEnabled,
      darkLineRatio: pattern.darkLineRatio,
      fittedHeight: pattern.fittedHeight,
      fittedOffsetX: pattern.fittedOffsetX,
      fittedOffsetY: pattern.fittedOffsetY,
      fittedWidth: pattern.fittedWidth,
      grid: pattern.grid.map((row) =>
        row.map((cell) => ({
          colorId: cell.color?.id ?? null,
          isDarkLine: cell.isDarkLine,
          isIgnoredBackground: cell.isIgnoredBackground,
        })),
      ),
      height: pattern.height,
      hueProtectionEnabled: pattern.hueProtectionEnabled,
      ignoredBackgroundCells: pattern.ignoredBackgroundCells,
      mergedSimilarColorCells: pattern.mergedSimilarColorCells,
      mode: pattern.mode,
      smoothedCells: pattern.smoothedCells,
      sourceAspectRatio: pattern.sourceAspectRatio,
      totalBeads: pattern.totalBeads,
      usedColorCount: pattern.usedColorCount,
      width: pattern.width,
    },
  };
}

export function restorePatternVariantFromSnapshot(snapshot: PersistedPatternSelection, palette: BeadColor[] = commonPalette): PatternVariant | null {
  if (!isPersistedPatternSelection(snapshot)) {
    return null;
  }

  if (snapshot.pattern.grid.length !== snapshot.pattern.height) {
    return null;
  }

  const colorMap = new Map(palette.map((color) => [color.id, color]));
  const restoredGrid: BeadCell[][] = [];

  for (let y = 0; y < snapshot.pattern.grid.length; y += 1) {
    const row = snapshot.pattern.grid[y];
    if (!Array.isArray(row) || row.length !== snapshot.pattern.width) {
      return null;
    }

    const restoredRow: BeadCell[] = [];
    for (let x = 0; x < row.length; x += 1) {
      const cell = row[x];
      if (!isPersistedCellSnapshot(cell)) {
        return null;
      }

      const color = cell.colorId ? colorMap.get(cell.colorId) ?? null : null;
      if (cell.colorId && !color) {
        return null;
      }

      restoredRow.push({
        color,
        isDarkLine: cell.isDarkLine,
        isIgnoredBackground: cell.isIgnoredBackground,
        x,
        y,
      });
    }
    restoredGrid.push(restoredRow);
  }

  const restoredColorCounts: ColorCount[] = [];
  for (const item of snapshot.pattern.colorCounts) {
    if (!isPersistedColorCount(item)) {
      return null;
    }

    const color = colorMap.get(item.colorId);
    if (!color) {
      return null;
    }

    restoredColorCounts.push({ color, count: item.count });
  }

  return {
    pattern: {
      aspectRatioWarning: snapshot.pattern.aspectRatioWarning,
      cleanedNoiseCells: snapshot.pattern.cleanedNoiseCells,
      colorCounts: restoredColorCounts,
      colorLimit: snapshot.pattern.colorLimit,
      colorStyle: snapshot.pattern.colorStyle,
      darkLineCount: snapshot.pattern.darkLineCount,
      darkLineProtectionEnabled: snapshot.pattern.darkLineProtectionEnabled,
      darkLineRatio: snapshot.pattern.darkLineRatio,
      fittedHeight: snapshot.pattern.fittedHeight,
      fittedOffsetX: snapshot.pattern.fittedOffsetX,
      fittedOffsetY: snapshot.pattern.fittedOffsetY,
      fittedWidth: snapshot.pattern.fittedWidth,
      grid: restoredGrid,
      height: snapshot.pattern.height,
      hueProtectionEnabled: snapshot.pattern.hueProtectionEnabled,
      ignoredBackgroundCells: snapshot.pattern.ignoredBackgroundCells,
      mergedSimilarColorCells: snapshot.pattern.mergedSimilarColorCells,
      mode: snapshot.pattern.mode,
      smoothedCells: snapshot.pattern.smoothedCells,
      sourceAspectRatio: snapshot.pattern.sourceAspectRatio,
      totalBeads: snapshot.pattern.totalBeads,
      usedColorCount: snapshot.pattern.usedColorCount,
      width: snapshot.pattern.width,
    },
    plan: snapshot.plan,
  };
}

function readStoredValue<T>(key: string, validate: (value: unknown) => value is T): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!validate(parsed)) {
      clearStoredValue(key);
      return null;
    }

    return parsed;
  } catch {
    clearStoredValue(key);
    return null;
  }
}

function writeStoredValue<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota and serialization errors to avoid blocking the UI.
  }
}

function clearStoredValue(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore localStorage failures during cleanup.
  }
}

function isPersistedSessionDraft(value: unknown): value is PersistedSessionDraft {
  if (!isRecord(value) || value.version !== STORAGE_VERSION || typeof value.savedAt !== "string") {
    return false;
  }

  return isPersistedGenerationSettings(value.settings) && isPersistedSelection(value.selection) && (value.snapshot === null || isPersistedPatternSelection(value.snapshot));
}

function isPersistedExportDraft(value: unknown): value is PersistedExportDraft {
  if (!isRecord(value) || value.version !== STORAGE_VERSION || typeof value.savedAt !== "string") {
    return false;
  }

  return isPersistedExportSettings(value.settings);
}

function isPersistedGenerationSettings(value: unknown): value is PersistedGenerationSettings {
  return (
    isRecord(value) &&
    PATTERN_MODES.has(value.patternMode as PatternMode) &&
    typeof value.colorLimit === "number" &&
    Number.isFinite(value.colorLimit) &&
    COLOR_STYLES.has(value.colorStyle as PatternColorStyle) &&
    typeof value.ignoreWhiteBackground === "boolean"
  );
}

function isPersistedExportSettings(value: unknown): value is PersistedExportSettings {
  return (
    isRecord(value) &&
    EXPORT_KINDS.has(value.kind as PatternExportKind) &&
    EXPORT_SCALES.has(value.scale as PatternExportScale) &&
    EXPORT_BACKGROUNDS.has(value.background as PatternExportBackground) &&
    EXPORT_GRIDS.has(value.grid as PatternExportGrid) &&
    EXPORT_LEGEND_SORTS.has(value.legendSort as PatternExportLegendSort) &&
    EXPORT_MARGINS.has(value.margin as PatternExportMargin) &&
    typeof value.showColorCodes === "boolean" &&
    typeof value.showCoordinates === "boolean" &&
    typeof value.showLegend === "boolean" &&
    typeof value.showTitle === "boolean"
  );
}

function isPersistedSelection(value: unknown): value is PersistedSessionDraft["selection"] {
  return isRecord(value) && (typeof value.selectedVariantId === "string" || value.selectedVariantId === null);
}

function isPersistedPatternSelection(value: unknown): value is PersistedPatternSelection {
  return isRecord(value) && isPersistedPlan(value.plan) && isPersistedPatternSnapshot(value.pattern);
}

function isPersistedPlan(value: unknown): value is PatternPlan {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    typeof value.isRecommended === "boolean"
  );
}

function isPersistedPatternSnapshot(value: unknown): value is PersistedPatternSnapshot {
  return (
    isRecord(value) &&
    typeof value.width === "number" &&
    value.width > 0 &&
    typeof value.height === "number" &&
    value.height > 0 &&
    Array.isArray(value.grid) &&
    Array.isArray(value.colorCounts) &&
    typeof value.totalBeads === "number" &&
    typeof value.ignoredBackgroundCells === "number" &&
    typeof value.usedColorCount === "number" &&
    typeof value.colorLimit === "number" &&
    typeof value.cleanedNoiseCells === "number" &&
    typeof value.smoothedCells === "number" &&
    typeof value.mergedSimilarColorCells === "number" &&
    typeof value.darkLineCount === "number" &&
    typeof value.darkLineRatio === "number" &&
    PATTERN_MODES.has(value.mode as PatternMode) &&
    COLOR_STYLES.has(value.colorStyle as PatternColorStyle) &&
    typeof value.darkLineProtectionEnabled === "boolean" &&
    typeof value.hueProtectionEnabled === "boolean" &&
    typeof value.sourceAspectRatio === "number" &&
    typeof value.fittedWidth === "number" &&
    typeof value.fittedHeight === "number" &&
    typeof value.fittedOffsetX === "number" &&
    typeof value.fittedOffsetY === "number" &&
    (value.aspectRatioWarning === "wide" || value.aspectRatioWarning === "tall" || value.aspectRatioWarning === null)
  );
}

function isPersistedCellSnapshot(value: unknown): value is PersistedCellSnapshot {
  return (
    isRecord(value) &&
    (typeof value.colorId === "string" || value.colorId === null) &&
    typeof value.isDarkLine === "boolean" &&
    typeof value.isIgnoredBackground === "boolean"
  );
}

function isPersistedColorCount(value: unknown): value is PersistedColorCount {
  return isRecord(value) && typeof value.colorId === "string" && typeof value.count === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
