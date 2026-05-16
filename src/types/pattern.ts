export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type PatternMode = "pixel-art" | "illustration" | "anime-lineart" | "pet-photo" | "portrait-photo";

export type PatternColorStyle = "clean" | "balanced" | "faithful";

export type HueFamily = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "neutral" | "dark";

export type BeadColorFamily =
  | "white"
  | "cream"
  | "yellow"
  | "orange"
  | "red"
  | "pink"
  | "purple"
  | "blue"
  | "cyan"
  | "green"
  | "olive"
  | "tan"
  | "brown"
  | "peach"
  | "skin"
  | "gray"
  | "black"
  | "neutral"
  | "other";

export type BeadPaletteSource = "built-in" | "verified-brand" | "user-owned" | "cross-brand-substitute" | "sample";

export type BeadColorAvailability = "available" | "limited" | "retired" | "unknown";

export type LAB = {
  l: number;
  a: number;
  b: number;
};

export type BeadColor = {
  id: string;
  brand: string;
  code: string;
  name: string;
  displayName: string;
  hex: string;
  rgb: RGB;
  lab?: LAB;
  family: BeadColorFamily;
  availability?: BeadColorAvailability;
  source?: BeadPaletteSource;
};

export type BeadPalette = {
  id: string;
  brand: string;
  version: string;
  source: BeadPaletteSource;
  colors: BeadColor[];
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
