import { commonPalette } from "@/palettes/common";
import type { BeadColor, HueFamily, PatternColorStyle, PatternMode, PatternResult, RGB } from "@/types/pattern";
import { findNearestRgb, quantizeColors, rgbDistance } from "./quantizeColors";
import { getTrimmedBounds, isNearWhite, readCompositedPixel, type TrimBounds } from "./trimBackground";

export type GeneratePatternOptions = {
  width?: number;
  height?: number;
  palette?: BeadColor[];
  ignoreWhiteBackground?: boolean;
  trimWhiteBackground?: boolean;
  trimMargin?: number;
  mode?: PatternMode;
  colorLimit?: number;
  colorStyle?: PatternColorStyle;
};

const DEFAULT_SIZE = 40;
const DEFAULT_COLOR_LIMIT = 12;
const DARK_COLOR_IDS = new Set(["C08", "C13", "C24", "C29", "C30", "C32"]);
const OUTLINE_COLOR_IDS = new Set(["C29", "C30"]);
const DARK_LINE_COLOR_IDS = new Set(["C29", "C30"]);
const SOFT_NEUTRAL_COLOR_IDS = new Set(["C27", "C28", "C29", "C30"]);
const MUDDY_WARM_COLOR_IDS = new Set(["C21", "C23", "C24", "C27", "C28", "C29", "C30"]);

type GenerationStrategy = {
  analyzeMethod: "dominant" | "average";
  darkLineProtection: boolean;
  hueProtection: boolean;
  darkLine: {
    nearBlackMax: number;
    neutralBrightness: number;
    neutralSaturation: number;
    deepBrightness: number;
    deepSaturation: number;
    darkSampleRatio: number;
  };
  maxDarkLineRatio: number;
  targetDarkLineRatio: number;
  rareNoiseRatio: number;
  smoothNeighborThreshold: number;
  similarMergeRatio: number;
  similarMergeDistance: number;
};

type WorkingCell = {
  x: number;
  y: number;
  rgb: RGB | null;
  color: BeadColor | null;
  isIgnoredBackground: boolean;
  isDarkLine: boolean;
  hueFamily: HueFamily | null;
};

type CellColorAnalysis = {
  rgb: RGB;
  whiteRatio: number;
  isLikelyDarkLine: boolean;
  hueFamily: HueFamily;
};

function colorDistance(a: RGB, b: RGB) {
  const rMean = (a.r + b.r) / 2;
  const r = a.r - b.r;
  const g = a.g - b.g;
  const blue = a.b - b.b;

  return ((512 + rMean) * r * r) / 256 + 4 * g * g + ((767 - rMean) * blue * blue) / 256;
}

function luminance({ r, g, b }: RGB) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getGenerationStrategy(mode: PatternMode, colorStyle: PatternColorStyle): GenerationStrategy {
  const styleTuning: Record<
    PatternColorStyle,
    Pick<GenerationStrategy, "rareNoiseRatio" | "smoothNeighborThreshold" | "similarMergeRatio" | "similarMergeDistance">
  > = {
    clean: {
      rareNoiseRatio: 0.018,
      similarMergeDistance: 42,
      similarMergeRatio: 0.04,
      smoothNeighborThreshold: 4,
    },
    balanced: {
      rareNoiseRatio: 0.01,
      similarMergeDistance: 35,
      similarMergeRatio: 0.03,
      smoothNeighborThreshold: 5,
    },
    faithful: {
      rareNoiseRatio: 0.004,
      similarMergeDistance: 26,
      similarMergeRatio: 0.015,
      smoothNeighborThreshold: 6,
    },
  };

  const base = styleTuning[colorStyle];

  switch (mode) {
    case "illustration":
      return {
        ...base,
        analyzeMethod: "dominant",
        darkLine: {
          darkSampleRatio: 0.26,
          deepBrightness: 64,
          deepSaturation: 0.36,
          nearBlackMax: 50,
          neutralBrightness: 74,
          neutralSaturation: 0.3,
        },
        darkLineProtection: true,
        hueProtection: true,
        maxDarkLineRatio: 0.24,
        targetDarkLineRatio: 0.2,
      };
    case "anime-lineart":
      return {
        ...base,
        analyzeMethod: "dominant",
        darkLine: {
          darkSampleRatio: 0.2,
          deepBrightness: 74,
          deepSaturation: 0.42,
          nearBlackMax: 64,
          neutralBrightness: 90,
          neutralSaturation: 0.36,
        },
        darkLineProtection: true,
        hueProtection: true,
        maxDarkLineRatio: 0.28,
        targetDarkLineRatio: 0.24,
      };
    case "pet-photo":
      return {
        ...base,
        analyzeMethod: "average",
        darkLine: {
          darkSampleRatio: 0.34,
          deepBrightness: 50,
          deepSaturation: 0.3,
          nearBlackMax: 44,
          neutralBrightness: 62,
          neutralSaturation: 0.24,
        },
        darkLineProtection: true,
        hueProtection: false,
        maxDarkLineRatio: 0.16,
        rareNoiseRatio: Math.min(base.rareNoiseRatio, 0.006),
        similarMergeDistance: Math.min(base.similarMergeDistance, 30),
        similarMergeRatio: Math.min(base.similarMergeRatio, 0.02),
        smoothNeighborThreshold: Math.max(base.smoothNeighborThreshold, 6),
        targetDarkLineRatio: 0.12,
      };
    case "portrait-photo":
      return {
        ...base,
        analyzeMethod: "average",
        darkLine: {
          darkSampleRatio: 0.36,
          deepBrightness: 52,
          deepSaturation: 0.32,
          nearBlackMax: 44,
          neutralBrightness: 64,
          neutralSaturation: 0.26,
        },
        darkLineProtection: true,
        hueProtection: false,
        maxDarkLineRatio: 0.18,
        rareNoiseRatio: Math.min(base.rareNoiseRatio, 0.005),
        similarMergeDistance: Math.min(base.similarMergeDistance, 28),
        similarMergeRatio: Math.min(base.similarMergeRatio, 0.018),
        smoothNeighborThreshold: Math.max(base.smoothNeighborThreshold, 6),
        targetDarkLineRatio: 0.14,
      };
    case "pixel-art":
    default:
      return {
        ...base,
        analyzeMethod: "dominant",
        darkLine: {
          darkSampleRatio: 0.22,
          deepBrightness: 70,
          deepSaturation: 0.46,
          nearBlackMax: 56,
          neutralBrightness: 82,
          neutralSaturation: 0.34,
        },
        darkLineProtection: true,
        hueProtection: true,
        maxDarkLineRatio: 0.3,
        targetDarkLineRatio: 0.28,
      };
  }
}

function createIgnoredCell(x: number, y: number) {
  return {
    x,
    y,
    rgb: null,
    color: null,
    isIgnoredBackground: true,
    isDarkLine: false,
    hueFamily: null,
  };
}

function calculateContainFit(bounds: TrimBounds, outputWidth: number, outputHeight: number) {
  const sourceAspectRatio = bounds.width / bounds.height;
  const targetAspectRatio = outputWidth / outputHeight;
  let fittedWidth: number;
  let fittedHeight: number;

  if (sourceAspectRatio >= targetAspectRatio) {
    fittedWidth = outputWidth;
    fittedHeight = Math.max(1, Math.round(outputWidth / sourceAspectRatio));
  } else {
    fittedHeight = outputHeight;
    fittedWidth = Math.max(1, Math.round(outputHeight * sourceAspectRatio));
  }

  fittedWidth = Math.min(outputWidth, fittedWidth);
  fittedHeight = Math.min(outputHeight, fittedHeight);

  return {
    sourceAspectRatio,
    fittedWidth,
    fittedHeight,
    fittedOffsetX: Math.floor((outputWidth - fittedWidth) / 2),
    fittedOffsetY: Math.floor((outputHeight - fittedHeight) / 2),
    aspectRatioWarning: sourceAspectRatio > 1.5 ? "wide" : sourceAspectRatio < 0.67 ? "tall" : null,
  } as const;
}

export function findNearestColor(rgb: RGB, palette: BeadColor[] = commonPalette) {
  if (palette.length === 0) {
    throw new Error("Palette must contain at least one color.");
  }

  const protectedPalette =
    rgb.r < 60 && rgb.g < 60 && rgb.b < 60
      ? palette.filter((color) => OUTLINE_COLOR_IDS.has(color.id))
      : luminance(rgb) < 80
        ? palette.filter((color) => DARK_COLOR_IDS.has(color.id))
        : palette;
  const candidates = protectedPalette.length > 0 ? protectedPalette : palette;

  return candidates.reduce((nearest, color) => {
    const nearestDistance = colorDistance(rgb, nearest.rgb);
    const currentDistance = colorDistance(rgb, color.rgb);

    return currentDistance < nearestDistance ? color : nearest;
  }, candidates[0]);
}

function findNearestDarkLineColor(rgb: RGB, palette: BeadColor[]) {
  const darkPalette = palette.filter((color) => DARK_LINE_COLOR_IDS.has(color.id));

  return findNearestColor(rgb, darkPalette.length > 0 ? darkPalette : palette);
}

function colorStats({ r, g, b }: RGB) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
    brightness: luminance({ r, g, b }),
  };
}

function isHighSaturationWarm(rgb: RGB) {
  const stats = colorStats(rgb);

  return stats.saturation > 0.45 && stats.value > 0.34 && (stats.hue < 48 || stats.hue >= 345);
}

function isDarkLineCandidate(rgb: RGB, strategy: GenerationStrategy) {
  const stats = colorStats(rgb);
  const nearBlack = rgb.r < strategy.darkLine.nearBlackMax && rgb.g < strategy.darkLine.nearBlackMax && rgb.b < strategy.darkLine.nearBlackMax;
  const neutralDark = stats.brightness < strategy.darkLine.neutralBrightness && stats.saturation < strategy.darkLine.neutralSaturation;
  const deepGray = stats.brightness < strategy.darkLine.deepBrightness && stats.saturation < strategy.darkLine.deepSaturation;

  return !isHighSaturationWarm(rgb) && (nearBlack || neutralDark || deepGray);
}

function getHueFamily(rgb: RGB): HueFamily {
  const stats = colorStats(rgb);

  if (stats.brightness < 62 && !isHighSaturationWarm(rgb)) {
    return "dark";
  }

  if (stats.saturation < 0.16) {
    return "neutral";
  }

  if (stats.hue >= 345 || stats.hue < 15) {
    return "red";
  }

  if (stats.hue < 45) {
    return "orange";
  }

  if (stats.hue < 75) {
    return "yellow";
  }

  if (stats.hue < 155) {
    return "green";
  }

  if (stats.hue < 200) {
    return "cyan";
  }

  if (stats.hue < 255) {
    return "blue";
  }

  return "purple";
}

function allowedHueFamilies(family: HueFamily): HueFamily[] {
  switch (family) {
    case "red":
      return ["red", "orange", "purple"];
    case "orange":
      return ["orange", "yellow"];
    case "yellow":
      return ["yellow", "orange"];
    case "green":
      return ["green", "yellow", "cyan"];
    case "cyan":
      return ["cyan", "green", "blue"];
    case "blue":
      return ["blue", "cyan", "purple"];
    case "purple":
      return ["purple", "blue", "red"];
    case "dark":
      return ["dark", "neutral"];
    case "neutral":
    default:
      return ["neutral", "dark"];
  }
}

function findNearestQuantizedColor(rgb: RGB, palette: BeadColor[], sourceFamily: HueFamily, hueProtection = true) {
  const maxChannel = Math.max(rgb.r, rgb.g, rgb.b);
  const minChannel = Math.min(rgb.r, rgb.g, rgb.b);
  const chroma = maxChannel - minChannel;
  const brightness = luminance(rgb);
  const allowedFamilies = new Set(allowedHueFamilies(sourceFamily));
  let candidates = palette;

  if (hueProtection) {
    candidates = candidates.filter((color) => allowedFamilies.has(getHueFamily(color.rgb)));
  }

  if (hueProtection && sourceFamily !== "red") {
    candidates = candidates.filter((color) => getHueFamily(color.rgb) !== "red");
  }

  if (sourceFamily !== "dark") {
    candidates = candidates.filter((color) => color.id !== "C30");
  }

  if (hueProtection && brightness > 90 && chroma > 35) {
    candidates = candidates.filter((color) => !SOFT_NEUTRAL_COLOR_IDS.has(color.id));
  }

  if (hueProtection && rgb.r > rgb.b + 45 && rgb.g > rgb.b + 25 && rgb.r > 120 && rgb.g > 80) {
    candidates = candidates.filter((color) => !MUDDY_WARM_COLOR_IDS.has(color.id));
  }

  const fallbackPalette = (hueProtection && sourceFamily !== "red" ? palette.filter((color) => getHueFamily(color.rgb) !== "red") : palette).filter(
    (color) => sourceFamily === "dark" || color.id !== "C30",
  );

  return findNearestColor(rgb, candidates.length > 0 ? candidates : fallbackPalette.length > 0 ? fallbackPalette : palette);
}

function getNeighborCells(grid: WorkingCell[][], x: number, y: number) {
  const neighbors: WorkingCell[] = [];

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }

      const neighbor = grid[y + offsetY]?.[x + offsetX];

      if (neighbor && !neighbor.isIgnoredBackground && neighbor.color) {
        neighbors.push(neighbor);
      }
    }
  }

  return neighbors;
}

function getRawNeighborCells(grid: WorkingCell[][], x: number, y: number) {
  const neighbors: Array<WorkingCell | null> = [];

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }

      neighbors.push(grid[y + offsetY]?.[x + offsetX] ?? null);
    }
  }

  return neighbors;
}

function getBoundaryInfo(grid: WorkingCell[][], cell: WorkingCell) {
  const neighbors = getRawNeighborCells(grid, cell.x, cell.y);
  let backgroundNeighbors = 0;
  let colorBoundaryNeighbors = 0;
  let darkNeighbors = 0;
  let similarDarkNeighbors = 0;
  let colorfulNeighbors = 0;

  for (const neighbor of neighbors) {
    if (!neighbor || neighbor.isIgnoredBackground) {
      backgroundNeighbors += 1;
      continue;
    }

    if (neighbor.isDarkLine) {
      darkNeighbors += 1;
    }

    if (neighbor.rgb && cell.rgb) {
      const distance = rgbDistance(cell.rgb, neighbor.rgb);

      if (distance < 42) {
        similarDarkNeighbors += neighbor.isDarkLine ? 1 : 0;
      }

      if (distance > 72 || neighbor.hueFamily !== cell.hueFamily) {
        colorBoundaryNeighbors += 1;
      }

      if (!neighbor.isDarkLine && neighbor.hueFamily !== "dark" && neighbor.hueFamily !== "neutral") {
        colorfulNeighbors += 1;
      }
    }
  }

  return {
    backgroundNeighbors,
    colorBoundaryNeighbors,
    darkNeighbors,
    similarDarkNeighbors,
    colorfulNeighbors,
  };
}

function demoteDarkLine(cell: WorkingCell) {
  cell.isDarkLine = false;
  const family = cell.rgb ? getHueFamily(cell.rgb) : null;

  cell.hueFamily = family === "dark" ? "neutral" : family;
}

function refineDarkLines(grid: WorkingCell[][], cells: WorkingCell[], strategy: GenerationStrategy) {
  const darkLineCandidates = cells.filter((cell) => cell.isDarkLine && cell.rgb);

  for (const cell of darkLineCandidates) {
    if (!cell.rgb) {
      continue;
    }

    const stats = colorStats(cell.rgb);
    const nearBlack =
      cell.rgb.r < strategy.darkLine.nearBlackMax &&
      cell.rgb.g < strategy.darkLine.nearBlackMax &&
      cell.rgb.b < strategy.darkLine.nearBlackMax;
    const boundary = getBoundaryInfo(grid, cell);
    const nearBackground = boundary.backgroundNeighbors > 0;
    const nearColorBoundary = boundary.colorBoundaryNeighbors >= 2;
    const interiorDarkMass =
      !nearBackground &&
      boundary.colorBoundaryNeighbors <= 1 &&
      boundary.similarDarkNeighbors >= 4 &&
      boundary.colorfulNeighbors <= 2;
    const weakDark = stats.brightness > strategy.darkLine.deepBrightness || stats.saturation > strategy.darkLine.deepSaturation;

    if (interiorDarkMass || (!nearBlack && weakDark && !nearColorBoundary) || (!nearBackground && !nearColorBoundary && !nearBlack)) {
      demoteDarkLine(cell);
    }
  }

  const maxDarkLineRatio = strategy.maxDarkLineRatio;
  let darkLineCells = cells.filter((cell) => cell.isDarkLine && cell.rgb);

  if (cells.length > 0 && darkLineCells.length / cells.length > maxDarkLineRatio) {
    const targetDarkLineCount = Math.floor(cells.length * strategy.targetDarkLineRatio);
    const cellsToDemote = darkLineCells
      .map((cell) => {
        const boundary = getBoundaryInfo(grid, cell);
        const stats = cell.rgb ? colorStats(cell.rgb) : { brightness: 255, saturation: 0 };
        const keepScore =
          boundary.backgroundNeighbors * 4 +
          boundary.colorBoundaryNeighbors * 3 -
          boundary.similarDarkNeighbors * 2 -
          stats.brightness / 20;

        return { cell, keepScore };
      })
      .sort((a, b) => a.keepScore - b.keepScore)
      .slice(0, Math.max(0, darkLineCells.length - targetDarkLineCount));

    for (const { cell } of cellsToDemote) {
      demoteDarkLine(cell);
    }
  }

  darkLineCells = cells.filter((cell) => cell.isDarkLine && cell.rgb);

  return {
    darkLineCount: darkLineCells.length,
    darkLineRatio: cells.length > 0 ? darkLineCells.length / cells.length : 0,
  };
}

function mostCommonNeighborColor(grid: WorkingCell[][], x: number, y: number, excludeDarkLines = false) {
  const colorCounts = new Map<string, { color: BeadColor; count: number }>();

  for (const neighbor of getNeighborCells(grid, x, y)) {
    if (excludeDarkLines && neighbor.isDarkLine) {
      continue;
    }

    if (!neighbor.color) {
      continue;
    }

    const current = colorCounts.get(neighbor.color.id);
    colorCounts.set(neighbor.color.id, {
      color: neighbor.color,
      count: current ? current.count + 1 : 1,
    });
  }

  return Array.from(colorCounts.values()).sort((a, b) => b.count - a.count)[0] ?? null;
}

function countColors(cells: WorkingCell[]) {
  const counts = new Map<string, { color: BeadColor; count: number }>();

  for (const cell of cells) {
    if (!cell.color || cell.isIgnoredBackground) {
      continue;
    }

    const current = counts.get(cell.color.id);
    counts.set(cell.color.id, {
      color: cell.color,
      count: current ? current.count + 1 : 1,
    });
  }

  return counts;
}

function assignQuantizedColors(cells: WorkingCell[], palette: BeadColor[], colorLimit: number, strategy: GenerationStrategy) {
  const darkLineCells = cells.filter((cell) => cell.isDarkLine && cell.rgb);

  for (const cell of darkLineCells) {
    if (cell.rgb) {
      cell.color = findNearestDarkLineColor(cell.rgb, palette);
    }
  }

  const darkLineColorCount = new Set(darkLineCells.map((cell) => cell.color?.id).filter(Boolean)).size;
  const normalColorLimit = Math.max(1, colorLimit - darkLineColorCount);
  const normalCells = cells.filter((cell) => !cell.isDarkLine && cell.rgb);
  const groups = Array.from(
    normalCells.reduce((groupMap, cell) => {
      const family = cell.hueFamily ?? getHueFamily(cell.rgb as RGB);
      const group = groupMap.get(family) ?? [];

      group.push(cell);
      groupMap.set(family, group);

      return groupMap;
    }, new Map<HueFamily, WorkingCell[]>()),
  ).sort((a, b) => b[1].length - a[1].length);
  const limitForGroups = Math.max(groups.length, normalColorLimit);
  let remainingColors = limitForGroups;
  let remainingCells = normalCells.length;

  for (let index = 0; index < groups.length; index += 1) {
    const [family, groupCells] = groups[index];
    const remainingGroups = groups.length - index;
    const reservedForRest = Math.max(0, remainingGroups - 1);
    const proportionalLimit = Math.max(1, Math.round((groupCells.length / Math.max(1, remainingCells)) * remainingColors));
    const groupLimit = Math.max(1, Math.min(remainingColors - reservedForRest, proportionalLimit));
    const centers = quantizeColors(
      groupCells.map((cell) => cell.rgb as RGB),
      groupLimit,
      10,
    );
    const centerColorMap = new Map<RGB, BeadColor>();

    for (const center of centers) {
      centerColorMap.set(center, findNearestQuantizedColor(center, palette, family, strategy.hueProtection));
    }

    for (const cell of groupCells) {
      if (!cell.rgb || centers.length === 0) {
        continue;
      }

      const center = findNearestRgb(cell.rgb, centers);
      cell.color = centerColorMap.get(center) ?? findNearestQuantizedColor(center, palette, family, strategy.hueProtection);
    }

    remainingColors -= centers.length;
    remainingCells -= groupCells.length;
  }
}

function mergeSimilarRareColors(cells: WorkingCell[], totalBeads: number, strategy: GenerationStrategy) {
  let mergedSimilarColorCells = 0;
  let changed = true;

  if (totalBeads === 0) {
    return mergedSimilarColorCells;
  }

  while (changed) {
    changed = false;
    const counts = Array.from(countColors(cells).values()).sort((a, b) => a.count - b.count);

    for (const small of counts) {
      if (small.count / totalBeads >= strategy.similarMergeRatio) {
        continue;
      }

      const target = counts
        .filter((candidate) => candidate.color.id !== small.color.id && candidate.count > small.count)
        .sort((a, b) => rgbDistance(small.color.rgb, a.color.rgb) - rgbDistance(small.color.rgb, b.color.rgb))[0];

      if (!target || rgbDistance(small.color.rgb, target.color.rgb) >= strategy.similarMergeDistance) {
        continue;
      }

      let replacements = 0;

      for (const cell of cells) {
        if (!cell.isDarkLine && cell.color?.id === small.color.id) {
          cell.color = target.color;
          replacements += 1;
        }
      }

      if (replacements > 0) {
        mergedSimilarColorCells += replacements;
        changed = true;
        break;
      }
    }
  }

  return mergedSimilarColorCells;
}

function enforceColorLimit(cells: WorkingCell[], colorLimit: number) {
  let mergedCells = 0;

  while (countColors(cells).size > colorLimit) {
    const counts = Array.from(countColors(cells).values()).sort((a, b) => a.count - b.count);
    const small = counts.find(({ color }) => cells.some((cell) => !cell.isDarkLine && cell.color?.id === color.id));

    if (!small) {
      break;
    }

    const target = counts
      .filter((candidate) => candidate.color.id !== small.color.id && candidate.count >= small.count)
      .sort((a, b) => {
        const distanceDifference = rgbDistance(small.color.rgb, a.color.rgb) - rgbDistance(small.color.rgb, b.color.rgb);

        return distanceDifference !== 0 ? distanceDifference : b.count - a.count;
      })[0];

    if (!target) {
      break;
    }

    let replacements = 0;

    for (const cell of cells) {
      if (!cell.isDarkLine && cell.color?.id === small.color.id) {
        cell.color = target.color;
        replacements += 1;
      }
    }

    if (replacements === 0) {
      break;
    }

    mergedCells += replacements;
  }

  return mergedCells;
}

function cleanRareNoiseColors(grid: WorkingCell[][], cells: WorkingCell[], totalBeads: number, strategy: GenerationStrategy) {
  if (totalBeads === 0) {
    return 0;
  }

  const counts = countColors(cells);
  const rareColorIds = new Set(
    Array.from(counts.values())
      .filter(({ count }) => count / totalBeads < strategy.rareNoiseRatio)
      .map(({ color }) => color.id),
  );
  let cleanedNoiseCells = 0;

  if (rareColorIds.size === 0) {
    return cleanedNoiseCells;
  }

  for (const cell of cells) {
    if (cell.isDarkLine || !cell.color || !rareColorIds.has(cell.color.id)) {
      continue;
    }

    const replacement = mostCommonNeighborColor(grid, cell.x, cell.y, true);

    if (replacement && replacement.color.id !== cell.color.id) {
      cell.color = replacement.color;
      cleanedNoiseCells += 1;
    }
  }

  return cleanedNoiseCells;
}

function smoothIsolatedCells(grid: WorkingCell[][], cells: WorkingCell[], strategy: GenerationStrategy) {
  let smoothedCells = 0;

  for (const cell of cells) {
    if (cell.isDarkLine || !cell.color) {
      continue;
    }

    const replacement = mostCommonNeighborColor(grid, cell.x, cell.y, true);

    if (replacement && replacement.color.id !== cell.color.id && replacement.count >= strategy.smoothNeighborThreshold) {
      cell.color = replacement.color;
      smoothedCells += 1;
    }
  }

  return smoothedCells;
}

function getCellSourceRange(
  bounds: TrimBounds,
  cellX: number,
  cellY: number,
  fittedWidth: number,
  fittedHeight: number,
) {
  const startX = bounds.x + Math.floor((cellX * bounds.width) / fittedWidth);
  const endX = Math.max(startX + 1, bounds.x + Math.floor(((cellX + 1) * bounds.width) / fittedWidth));
  const startY = bounds.y + Math.floor((cellY * bounds.height) / fittedHeight);
  const endY = Math.max(startY + 1, bounds.y + Math.floor(((cellY + 1) * bounds.height) / fittedHeight));

  return { startX, endX, startY, endY };
}

function averageRgb(colors: RGB[]): RGB {
  if (colors.length === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  const sum = colors.reduce(
    (total, color) => ({
      r: total.r + color.r,
      g: total.g + color.g,
      b: total.b + color.b,
    }),
    { r: 0, g: 0, b: 0 },
  );

  return {
    r: Math.round(sum.r / colors.length),
    g: Math.round(sum.g / colors.length),
    b: Math.round(sum.b / colors.length),
  };
}

function colorBucketKey({ r, g, b }: RGB) {
  const bucketSize = 32;

  return `${Math.floor(r / bucketSize)}-${Math.floor(g / bucketSize)}-${Math.floor(b / bucketSize)}`;
}

function analyzePixelArtCellColor(
  imageData: ImageData,
  bounds: TrimBounds,
  cellX: number,
  cellY: number,
  fittedWidth: number,
  fittedHeight: number,
  strategy: GenerationStrategy,
): CellColorAnalysis {
  const { startX, endX, startY, endY } = getCellSourceRange(bounds, cellX, cellY, fittedWidth, fittedHeight);
  const samplesPerAxis = 5;
  const buckets = new Map<string, RGB[]>();
  const darkSamples: RGB[] = [];
  let whiteSamples = 0;
  let totalSamples = 0;

  for (let sampleY = 0; sampleY < samplesPerAxis; sampleY += 1) {
    for (let sampleX = 0; sampleX < samplesPerAxis; sampleX += 1) {
      const x = Math.min(
        imageData.width - 1,
        Math.max(startX, Math.floor(startX + ((sampleX + 0.5) * (endX - startX)) / samplesPerAxis)),
      );
      const y = Math.min(
        imageData.height - 1,
        Math.max(startY, Math.floor(startY + ((sampleY + 0.5) * (endY - startY)) / samplesPerAxis)),
      );
      const pixel = readCompositedPixel(imageData, x, y);

      totalSamples += 1;

      if (isNearWhite(pixel)) {
        whiteSamples += 1;
        continue;
      }

      if (isDarkLineCandidate(pixel, strategy)) {
        darkSamples.push(pixel);
      }

      const key = colorBucketKey(pixel);
      const bucket = buckets.get(key) ?? [];

      bucket.push(pixel);
      buckets.set(key, bucket);
    }
  }

  const nonWhiteSampleCount = totalSamples - whiteSamples;
  const whiteRatio = totalSamples > 0 ? whiteSamples / totalSamples : 1;

  if (nonWhiteSampleCount === 0) {
    return {
      rgb: { r: 255, g: 255, b: 255 },
      whiteRatio,
      isLikelyDarkLine: false,
      hueFamily: "neutral",
    };
  }

  const darkSampleRatio = darkSamples.length / nonWhiteSampleCount;

  if (darkSamples.length >= 3 && darkSampleRatio >= strategy.darkLine.darkSampleRatio) {
    const rgb = averageRgb(darkSamples);

    return {
      rgb,
      whiteRatio,
      isLikelyDarkLine: true,
      hueFamily: "dark",
    };
  }

  const dominantBucket = Array.from(buckets.values()).sort((a, b) => {
    const countDifference = b.length - a.length;

    if (countDifference !== 0) {
      return countDifference;
    }

    return colorStats(averageRgb(b)).saturation - colorStats(averageRgb(a)).saturation;
  })[0];
  const rgb = averageRgb(dominantBucket ?? []);
  const isLikelyDarkLine = isDarkLineCandidate(rgb, strategy);

  return {
    rgb,
    whiteRatio,
    isLikelyDarkLine,
    hueFamily: isLikelyDarkLine ? "dark" : getHueFamily(rgb),
  };
}

function analyzeAverageCellColor(
  imageData: ImageData,
  bounds: TrimBounds,
  cellX: number,
  cellY: number,
  fittedWidth: number,
  fittedHeight: number,
  strategy: GenerationStrategy,
): CellColorAnalysis {
  const { startX, endX, startY, endY } = getCellSourceRange(bounds, cellX, cellY, fittedWidth, fittedHeight);

  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;
  let whitePixels = 0;

  for (let y = startY; y < Math.min(endY, imageData.height); y += 1) {
    for (let x = startX; x < Math.min(endX, imageData.width); x += 1) {
      const pixel = readCompositedPixel(imageData, x, y);

      r += pixel.r;
      g += pixel.g;
      b += pixel.b;
      weight += 1;

      if (isNearWhite(pixel)) {
        whitePixels += 1;
      }
    }
  }

  const rgb = {
    r: Math.round(r / Math.max(1, weight)),
    g: Math.round(g / Math.max(1, weight)),
    b: Math.round(b / Math.max(1, weight)),
  };

  const isLikelyDarkLine = isDarkLineCandidate(rgb, strategy);

  return {
    rgb,
    whiteRatio: weight > 0 ? whitePixels / weight : 1,
    isLikelyDarkLine,
    hueFamily: isLikelyDarkLine ? "dark" : getHueFamily(rgb),
  };
}

function analyzeCellColor(
  imageData: ImageData,
  bounds: TrimBounds,
  cellX: number,
  cellY: number,
  fittedWidth: number,
  fittedHeight: number,
  strategy: GenerationStrategy,
): CellColorAnalysis {
  if (strategy.analyzeMethod === "dominant") {
    return analyzePixelArtCellColor(imageData, bounds, cellX, cellY, fittedWidth, fittedHeight, strategy);
  }

  return analyzeAverageCellColor(imageData, bounds, cellX, cellY, fittedWidth, fittedHeight, strategy);
}

export function generatePattern(imageData: ImageData, options: GeneratePatternOptions = {}): PatternResult {
  const width = options.width ?? DEFAULT_SIZE;
  const height = options.height ?? DEFAULT_SIZE;
  const palette = options.palette ?? commonPalette;
  const mode = options.mode ?? "pixel-art";
  const colorStyle = options.colorStyle ?? "balanced";
  const colorLimit = options.colorLimit ?? DEFAULT_COLOR_LIMIT;
  const strategy = getGenerationStrategy(mode, colorStyle);
  const ignoreWhiteBackground = options.ignoreWhiteBackground ?? true;
  const shouldTrimWhiteBackground = options.trimWhiteBackground ?? true;
  const bounds = shouldTrimWhiteBackground
    ? getTrimmedBounds(imageData, options.trimMargin ?? 4)
    : {
        x: 0,
        y: 0,
        width: imageData.width,
        height: imageData.height,
      };
  const fit = calculateContainFit(bounds, width, height);
  let ignoredBackgroundCells = 0;
  const drawableCells: WorkingCell[] = [];

  const grid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const fittedX = x - fit.fittedOffsetX;
      const fittedY = y - fit.fittedOffsetY;
      const isOutsideFittedArea =
        fittedX < 0 || fittedX >= fit.fittedWidth || fittedY < 0 || fittedY >= fit.fittedHeight;

      if (isOutsideFittedArea) {
        ignoredBackgroundCells += 1;

        return createIgnoredCell(x, y);
      }

      const cell = analyzeCellColor(imageData, bounds, fittedX, fittedY, fit.fittedWidth, fit.fittedHeight, strategy);
      const isIgnoredBackground =
        ignoreWhiteBackground && !cell.isLikelyDarkLine && (cell.whiteRatio >= 0.85 || isNearWhite(cell.rgb));

      if (isIgnoredBackground) {
        ignoredBackgroundCells += 1;

        return createIgnoredCell(x, y);
      }

      const workingCell: WorkingCell = {
        x,
        y,
        rgb: cell.rgb,
        color: null,
        isIgnoredBackground: false,
        isDarkLine: cell.isLikelyDarkLine,
        hueFamily: cell.hueFamily,
      };

      drawableCells.push(workingCell);

      return workingCell;
    }),
  );

  const darkLineStats = strategy.darkLineProtection
    ? refineDarkLines(grid, drawableCells, strategy)
    : {
        darkLineCount: drawableCells.filter((cell) => cell.isDarkLine).length,
        darkLineRatio: drawableCells.length > 0 ? drawableCells.filter((cell) => cell.isDarkLine).length / drawableCells.length : 0,
      };

  assignQuantizedColors(drawableCells, palette, colorLimit, strategy);

  const cleanedNoiseCells = cleanRareNoiseColors(grid, drawableCells, drawableCells.length, strategy);
  const smoothedCells = smoothIsolatedCells(grid, drawableCells, strategy);
  const mergedSimilarColorCells =
    mergeSimilarRareColors(drawableCells, drawableCells.length, strategy) + enforceColorLimit(drawableCells, colorLimit);
  const finalCounts = countColors(drawableCells);
  const colorCounts = Array.from(finalCounts.values()).sort((a, b) => b.count - a.count || a.color.id.localeCompare(b.color.id));

  return {
    width,
    height,
    grid,
    colorCounts,
    totalBeads: drawableCells.length,
    ignoredBackgroundCells,
    usedColorCount: colorCounts.length,
    colorLimit,
    cleanedNoiseCells,
    smoothedCells,
    mergedSimilarColorCells,
    darkLineCount: darkLineStats.darkLineCount,
    darkLineRatio: darkLineStats.darkLineRatio,
    mode,
    colorStyle,
    darkLineProtectionEnabled: strategy.darkLineProtection,
    hueProtectionEnabled: strategy.hueProtection,
    sourceAspectRatio: fit.sourceAspectRatio,
    fittedWidth: fit.fittedWidth,
    fittedHeight: fit.fittedHeight,
    fittedOffsetX: fit.fittedOffsetX,
    fittedOffsetY: fit.fittedOffsetY,
    aspectRatioWarning: fit.aspectRatioWarning,
  };
}
