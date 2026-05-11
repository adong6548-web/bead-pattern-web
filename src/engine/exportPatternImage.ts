import {
  CODE_MIN_CELL_SIZE,
  PATTERN_EXPORT_BACKGROUND_COLORS,
  PATTERN_EXPORT_KIND_PRESETS,
  PATTERN_EXPORT_MARGIN_PRESETS,
  PATTERN_EXPORT_SCALE_PRESETS,
} from "@/config/patternPresets";
import type { BeadColor, ColorCount, PatternResult } from "@/types/pattern";

export type PatternExportKind = "color" | "code" | "color-code";
export type PatternExportScale = "standard" | "hd" | "ultra";
export type PatternExportBackground = "white" | "transparent" | "warm";
export type PatternExportGrid = "none" | "fine" | "standard";
export type PatternExportLegendSort = "code" | "count";
export type PatternExportMargin = "compact" | "standard" | "loose";

export type PatternExportOptions = {
  background?: PatternExportBackground;
  grid?: PatternExportGrid;
  kind: PatternExportKind;
  legendSort?: PatternExportLegendSort;
  margin?: PatternExportMargin;
  paletteName?: string;
  scale: PatternExportScale;
  showColorCodes?: boolean;
  showCoordinates?: boolean;
  showLegend?: boolean;
  showTitle?: boolean;
};

export const PATTERN_EXPORT_KINDS = PATTERN_EXPORT_KIND_PRESETS;
export const PATTERN_EXPORT_SCALES = PATTERN_EXPORT_SCALE_PRESETS;

const BACKGROUND_COLORS = PATTERN_EXPORT_BACKGROUND_COLORS;
const MARGIN_PRESETS = PATTERN_EXPORT_MARGIN_PRESETS;

export function canExportPatternKind(kind: PatternExportKind, scale: PatternExportScale) {
  return kind === "color" || PATTERN_EXPORT_SCALES[scale].cellSize >= CODE_MIN_CELL_SIZE;
}

export function getPatternExportFileName(pattern: PatternResult, kind: PatternExportKind) {
  return `bead-pattern-${pattern.width}x${pattern.height}-${PATTERN_EXPORT_KINDS[kind].fileSuffix}.png`;
}

export async function exportPatternImage(pattern: PatternResult, options: PatternExportOptions) {
  if (!canExportPatternKind(options.kind, options.scale)) {
    throw new Error("请选择高清或超清导出色号版。");
  }

  const paletteName = options.paletteName ?? "common";
  const cellSize = PATTERN_EXPORT_SCALES[options.scale].cellSize;
  const canvas = renderPatternExport(pattern, {
    background: options.background,
    cellSize,
    grid: options.grid,
    kind: options.kind,
    legendSort: options.legendSort,
    margin: options.margin,
    paletteName,
    showColorCodes: options.showColorCodes,
    showCoordinates: options.showCoordinates,
    showLegend: options.showLegend,
    showTitle: options.showTitle,
  });

  const blob = await canvasToBlob(canvas);
  return {
    blob,
    fileName: getPatternExportFileName(pattern, options.kind),
  };
}

export async function downloadPatternImage(pattern: PatternResult, options: PatternExportOptions) {
  const { blob, fileName } = await exportPatternImage(pattern, options);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return fileName;
}

function renderPatternExport(
  pattern: PatternResult,
  {
    background = "white",
    cellSize,
    grid = "standard",
    kind,
    legendSort = "code",
    margin = "standard",
    paletteName,
    showColorCodes = kind !== "color",
    showCoordinates = true,
    showLegend = true,
    showTitle = true,
  }: {
    background?: PatternExportBackground;
    cellSize: number;
    grid?: PatternExportGrid;
    kind: PatternExportKind;
    legendSort?: PatternExportLegendSort;
    margin?: PatternExportMargin;
    paletteName: string;
    showColorCodes?: boolean;
    showCoordinates?: boolean;
    showLegend?: boolean;
    showTitle?: boolean;
  },
) {
  const settings = MARGIN_PRESETS[margin];
  const sortedColorCounts = sortColorCounts(pattern.colorCounts, legendSort);
  const forcedShowCodes = kind === "code" || kind === "color-code";
  const shouldShowCodes = forcedShowCodes || showColorCodes;
  const axisSize = showCoordinates ? Math.max(30, Math.min(48, Math.round(cellSize * 0.85))) : 0;
  const patternWidth = pattern.width * cellSize;
  const patternHeight = pattern.height * cellSize;
  const patternBlockWidth = axisSize + patternWidth;
  const patternBlockHeight = axisSize + patternHeight;
  const outerMargin = settings.outer;
  const headerHeight = showTitle ? settings.headerHeight : outerMargin;
  const tableTitleHeight = 38;
  const tableHeaderHeight = 34;
  const tableRowHeight = 32;
  const tableHeight = showLegend ? tableTitleHeight + tableHeaderHeight + sortedColorCounts.length * tableRowHeight + settings.legendPadding * 2 : 0;
  const legendGap = showLegend ? settings.legendGap : 0;
  const canvasWidth = Math.ceil(Math.max(patternBlockWidth + outerMargin * 2, 900));
  const canvasHeight = Math.ceil(headerHeight + patternBlockHeight + legendGap + tableHeight + outerMargin);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 导出。");
  }

  if (background !== "transparent") {
    context.fillStyle = BACKGROUND_COLORS[background];
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  if (showTitle) {
    drawHeader(context, {
      canvasWidth,
      kindLabel: PATTERN_EXPORT_KINDS[kind].label,
      margin: outerMargin,
      paletteName,
      pattern,
    });
  }

  const patternBlockX = Math.round((canvasWidth - patternBlockWidth) / 2);
  const patternY = headerHeight;
  drawPattern(context, pattern, {
    axisSize,
    background,
    cellSize,
    grid,
    kind,
    showCodes: shouldShowCodes,
    showCoordinates,
    x: patternBlockX,
    y: patternY,
  });

  if (showLegend) {
    const tableY = patternY + patternBlockHeight + legendGap;
    drawColorTable(context, sortedColorCounts, {
      canvasWidth,
      padding: settings.legendPadding,
      margin: outerMargin,
      tableY,
    });
  }

  return canvas;
}

function drawHeader(
  context: CanvasRenderingContext2D,
  {
    canvasWidth,
    kindLabel,
    margin,
    paletteName,
    pattern,
  }: {
    canvasWidth: number;
    kindLabel: string;
    margin: number;
    paletteName: string;
    pattern: PatternResult;
  },
) {
  context.fillStyle = "#1f2a24";
  context.font = "700 30px Arial, sans-serif";
  context.textBaseline = "top";
  context.fillText("拼豆图纸", margin, 34);

  context.fillStyle = "#5f675f";
  context.font = "16px Arial, sans-serif";
  context.fillText(`尺寸：${pattern.width}x${pattern.height}`, margin, 78);

  const badges = [`总豆数 ${pattern.totalBeads}`, `使用颜色 ${pattern.usedColorCount}`, `色卡 ${paletteName}`, `导出类型 ${kindLabel}`];
  let badgeX = margin;
  const badgeY = 108;
  context.font = "14px Arial, sans-serif";
  for (const badge of badges) {
    const badgeWidth = Math.ceil(context.measureText(badge).width) + 24;
    if (badgeX + badgeWidth > canvasWidth - margin) {
      break;
    }

    drawRoundedRect(context, badgeX, badgeY, badgeWidth, 28, 14, "#efe9dc", "#ddd3c1");
    context.fillStyle = "#344038";
    context.fillText(badge, badgeX + 12, badgeY + 7);
    badgeX += badgeWidth + 10;
  }
}

function drawPattern(
  context: CanvasRenderingContext2D,
  pattern: PatternResult,
  {
    axisSize,
    background,
    cellSize,
    grid,
    kind,
    showCodes,
    showCoordinates,
    x,
    y,
  }: {
    axisSize: number;
    background: PatternExportBackground;
    cellSize: number;
    grid: PatternExportGrid;
    kind: PatternExportKind;
    showCodes: boolean;
    showCoordinates: boolean;
    x: number;
    y: number;
  },
) {
  const patternWidth = pattern.width * cellSize;
  const patternHeight = pattern.height * cellSize;
  const gridX = x + axisSize;
  const gridY = y + axisSize;
  drawRoundedRect(
    context,
    x - 12,
    y - 12,
    patternWidth + axisSize + 24,
    patternHeight + axisSize + 24,
    18,
    getPanelFill(background),
    background === "transparent" ? "rgba(31, 42, 36, 0.14)" : "#e5dccf",
  );

  if (showCoordinates) {
    drawCoordinates(context, pattern, {
      axisSize,
      cellSize,
      gridX,
      gridY,
      x,
      y,
    });
  }

  for (const row of pattern.grid) {
    for (const cell of row) {
      const cellX = gridX + cell.x * cellSize;
      const cellY = gridY + cell.y * cellSize;

      if (background !== "transparent") {
        context.fillStyle = "#ffffff";
        context.fillRect(cellX, cellY, cellSize, cellSize);
      }
      drawGridLine(context, grid, cellX, cellY, cellSize);

      if (cell.isIgnoredBackground || !cell.color) {
        continue;
      }

      if (kind === "code") {
        drawCodeCell(context, cell.color, cellX, cellY, cellSize);
        drawGridLine(context, grid, cellX, cellY, cellSize);
        continue;
      }

      drawColorBead(context, cell.color, cellX, cellY, cellSize);

      if (showCodes) {
        drawCenteredCode(context, cell.color.id, cellX, cellY, cellSize, getReadableTextColor(cell.color));
      }
    }
  }
}

function drawCoordinates(
  context: CanvasRenderingContext2D,
  pattern: PatternResult,
  {
    axisSize,
    cellSize,
    gridX,
    gridY,
    x,
    y,
  }: {
    axisSize: number;
    cellSize: number;
    gridX: number;
    gridY: number;
    x: number;
    y: number;
  },
) {
  context.fillStyle = "#5f675f";
  context.font = `700 ${Math.max(10, Math.min(14, Math.floor(cellSize * 0.32)))}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let column = 0; column < pattern.width; column += 1) {
    const label = column + 1;
    if (label !== 1 && label % 5 !== 0) {
      continue;
    }
    context.fillText(`${label}`, gridX + column * cellSize + cellSize / 2, y + axisSize / 2);
  }

  context.textAlign = "right";
  for (let row = 0; row < pattern.height; row += 1) {
    const label = row + 1;
    if (label !== 1 && label % 5 !== 0) {
      continue;
    }
    context.fillText(`${label}`, x + axisSize - 8, gridY + row * cellSize + cellSize / 2);
  }

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function drawGridLine(context: CanvasRenderingContext2D, grid: PatternExportGrid, x: number, y: number, cellSize: number) {
  if (grid === "none") {
    return;
  }

  context.strokeStyle = grid === "fine" ? "rgba(95, 103, 95, 0.18)" : "rgba(95, 103, 95, 0.38)";
  context.lineWidth = grid === "fine" ? 1 : Math.max(1, Math.round(cellSize * 0.04));
  const offset = context.lineWidth % 2 === 1 ? 0.5 : 0;
  context.strokeRect(x + offset, y + offset, cellSize - context.lineWidth, cellSize - context.lineWidth);
}

function drawColorBead(context: CanvasRenderingContext2D, color: BeadColor, x: number, y: number, cellSize: number) {
  const radius = cellSize * 0.39;
  const center = cellSize / 2;
  context.beginPath();
  context.arc(x + center, y + center, radius, 0, Math.PI * 2);
  context.fillStyle = color.hex;
  context.fill();
  context.strokeStyle = "rgba(0, 0, 0, 0.10)";
  context.lineWidth = Math.max(1, cellSize * 0.035);
  context.stroke();
}

function drawCodeCell(context: CanvasRenderingContext2D, color: BeadColor, x: number, y: number, cellSize: number) {
  context.fillStyle = "#fffdf9";
  context.fillRect(x, y, cellSize, cellSize);
  drawCenteredCode(context, color.id, x, y, cellSize, "#1f2a24");
}

function drawCenteredCode(context: CanvasRenderingContext2D, code: string, x: number, y: number, cellSize: number, color: string) {
  context.fillStyle = color;
  context.font = `700 ${Math.max(10, Math.min(18, Math.floor(cellSize * 0.34)))}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(code, x + cellSize / 2, y + cellSize / 2 + 1);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function drawColorTable(
  context: CanvasRenderingContext2D,
  colorCounts: ColorCount[],
  {
    canvasWidth,
    margin,
    padding,
    tableY,
  }: {
    canvasWidth: number;
    margin: number;
    padding: number;
    tableY: number;
  },
) {
  const tableWidth = canvasWidth - margin * 2;
  const rowHeight = 32;
  const headerHeight = 34;
  const titleHeight = 38;
  const tableHeight = titleHeight + headerHeight + colorCounts.length * rowHeight + padding * 2;
  drawRoundedRect(context, margin, tableY, tableWidth, tableHeight, 18, "#ffffff", "#e5dccf");

  context.fillStyle = "#1f2a24";
  context.font = "700 20px Arial, sans-serif";
  context.textBaseline = "top";
  context.fillText("颜色统计", margin + 22, tableY + padding);

  const headerY = tableY + padding + titleHeight;
  context.fillStyle = "#f4efe6";
  context.fillRect(margin + 1, headerY, tableWidth - 2, headerHeight);
  context.fillStyle = "#5f675f";
  context.font = "700 14px Arial, sans-serif";
  context.fillText("颜色名称", margin + 22, headerY + 10);
  context.fillText("色号", margin + tableWidth * 0.58, headerY + 10);
  context.fillText("数量", margin + tableWidth * 0.78, headerY + 10);

  context.font = "14px Arial, sans-serif";
  colorCounts.forEach(({ color, count }, index) => {
    const rowY = headerY + headerHeight + index * rowHeight;
    if (index % 2 === 1) {
      context.fillStyle = "#fbfaf7";
      context.fillRect(margin + 1, rowY, tableWidth - 2, rowHeight);
    }

    context.fillStyle = color.hex;
    context.beginPath();
    context.arc(margin + 34, rowY + rowHeight / 2, 8, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(0, 0, 0, 0.14)";
    context.stroke();

    context.fillStyle = "#253026";
    context.fillText(color.name, margin + 54, rowY + 10);
    context.fillText(color.id, margin + tableWidth * 0.58, rowY + 10);
    context.fillText(`${count}`, margin + tableWidth * 0.78, rowY + 10);
  });
}

function getPanelFill(background: PatternExportBackground) {
  if (background === "transparent") {
    return "rgba(255, 255, 255, 0.82)";
  }

  return background === "warm" ? "#fffdf9" : "#ffffff";
}

function sortColorCounts(colorCounts: ColorCount[], legendSort: PatternExportLegendSort) {
  return [...colorCounts].sort((a, b) => {
    if (legendSort === "count") {
      return b.count - a.count || a.color.id.localeCompare(b.color.id, undefined, { numeric: true });
    }

    return a.color.id.localeCompare(b.color.id, undefined, { numeric: true });
  });
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.stroke();
  }
}

function getReadableTextColor(color: BeadColor) {
  const brightness = color.rgb.r * 0.299 + color.rgb.g * 0.587 + color.rgb.b * 0.114;
  return brightness > 175 ? "#1f2a24" : "#ffffff";
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG 生成失败，请重试。"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
