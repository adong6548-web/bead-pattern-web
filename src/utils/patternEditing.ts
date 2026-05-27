import type { BeadCell, ColorCount, PatternResult } from "@/types/pattern";

export function mergePatternColorIntoColor(pattern: PatternResult, sourceColorId: string, targetColorId: string): PatternResult {
  if (sourceColorId === targetColorId) {
    return pattern;
  }

  const targetColor = pattern.colorCounts.find(({ color }) => color.id === targetColorId)?.color;
  if (!targetColor) {
    return pattern;
  }

  const hasSourceColor = pattern.colorCounts.some(({ color }) => color.id === sourceColorId);
  if (!hasSourceColor) {
    return pattern;
  }

  const grid = pattern.grid.map((row) =>
    row.map((cell): BeadCell => {
      if (cell.isIgnoredBackground || cell.color?.id !== sourceColorId) {
        return { ...cell };
      }

      return {
        ...cell,
        color: targetColor,
      };
    }),
  );

  return recalculatePatternCounts({
    ...pattern,
    grid,
  });
}

export function setPatternColorAsIgnoredBackground(pattern: PatternResult, colorId: string): PatternResult {
  const grid = pattern.grid.map((row) =>
    row.map((cell): BeadCell => {
      if (cell.isIgnoredBackground || cell.color?.id !== colorId) {
        return { ...cell };
      }

      return {
        ...cell,
        color: null,
        isDarkLine: false,
        isIgnoredBackground: true,
      };
    }),
  );

  return recalculatePatternCounts({
    ...pattern,
    grid,
  });
}

export function recalculatePatternCounts(pattern: PatternResult): PatternResult {
  const colorCountMap = new Map<string, ColorCount>();
  let totalBeads = 0;
  let ignoredBackgroundCells = 0;
  let darkLineCount = 0;

  for (const row of pattern.grid) {
    for (const cell of row) {
      if (cell.isIgnoredBackground || !cell.color) {
        ignoredBackgroundCells += 1;
        continue;
      }

      totalBeads += 1;

      if (cell.isDarkLine) {
        darkLineCount += 1;
      }

      const current = colorCountMap.get(cell.color.id);
      colorCountMap.set(cell.color.id, {
        color: cell.color,
        count: current ? current.count + 1 : 1,
      });
    }
  }

  const colorCounts = Array.from(colorCountMap.values()).sort((a, b) => b.count - a.count || a.color.id.localeCompare(b.color.id));

  return {
    ...pattern,
    colorCounts,
    darkLineCount,
    darkLineRatio: totalBeads > 0 ? darkLineCount / totalBeads : 0,
    ignoredBackgroundCells,
    totalBeads,
    usedColorCount: colorCounts.length,
  };
}
