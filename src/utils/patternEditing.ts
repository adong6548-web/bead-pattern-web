import type { BeadCell, ColorCount, PatternResult } from "@/types/pattern";

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
