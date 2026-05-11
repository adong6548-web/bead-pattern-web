export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type PatternMode = "pixel-art" | "illustration" | "anime-lineart" | "pet-photo" | "portrait-photo";

export type PatternColorStyle = "clean" | "balanced" | "faithful";

export type HueFamily = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "neutral" | "dark";

export type BeadColor = {
  id: string;
  name: string;
  hex: string;
  rgb: RGB;
};

export type BeadCell = {
  x: number;
  y: number;
  color: BeadColor | null;
  isIgnoredBackground: boolean;
  isDarkLine: boolean;
};

export type ColorCount = {
  color: BeadColor;
  count: number;
};

export type PatternResult = {
  width: number;
  height: number;
  grid: BeadCell[][];
  colorCounts: ColorCount[];
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

export type PatternPlan = {
  id: string;
  name: string;
  width: number;
  height: number;
  isRecommended: boolean;
};

export type PatternVariant = {
  plan: PatternPlan;
  pattern: PatternResult;
};
