"use client";

import { useEffect, useMemo, useState } from "react";
import type { BeadCell, PatternResult } from "@/types/pattern";
import { FocusColorList } from "./FocusColorList";
import { FocusProgressPanel } from "./FocusProgressPanel";
import { FocusRunList, type FocusRun } from "./FocusRunList";

type FocusModeProps = {
  onExit: () => void;
  pattern: PatternResult;
};

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2];
const BASE_CELL_SIZE = 18;
const RUN_LIMIT = 20;

export function FocusMode({ onExit, pattern }: FocusModeProps) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(() => getDefaultFocusColorId(pattern));
  const [completedCells, setCompletedCells] = useState<Set<string>>(() => new Set());
  const [onlyCurrentColor, setOnlyCurrentColor] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const storageKey = useMemo(() => getFocusStorageKey(pattern), [pattern]);
  const selectedColor = pattern.colorCounts.find(({ color }) => color.id === selectedColorId)?.color ?? null;
  const cellSize = BASE_CELL_SIZE * ZOOM_LEVELS[zoomIndex];
  const axisSize = Math.max(34, Math.round(cellSize * 1.35));
  const validCellKeys = useMemo(() => new Set(pattern.grid.flat().filter((cell) => cell.color && !cell.isIgnoredBackground).map(getCellKey)), [pattern]);
  const completedBeads = useMemo(() => {
    let count = 0;
    completedCells.forEach((key) => {
      if (validCellKeys.has(key)) {
        count += 1;
      }
    });
    return count;
  }, [completedCells, validCellKeys]);
  const completedByColor = useMemo(() => getCompletedByColor(pattern, completedCells), [completedCells, pattern]);
  const currentColorTotal = pattern.colorCounts.find(({ color }) => color.id === selectedColorId)?.count ?? 0;
  const currentColorCompleted = selectedColorId ? (completedByColor[selectedColorId] ?? 0) : 0;
  const currentColorRemaining = Math.max(0, currentColorTotal - currentColorCompleted);
  const focusColorCounts = useMemo(() => [...pattern.colorCounts].sort((a, b) => b.count - a.count), [pattern.colorCounts]);
  const runs = useMemo(() => getRunsForColor(pattern, selectedColorId), [pattern, selectedColorId]);

  useEffect(() => {
    setSelectedColorId(getDefaultFocusColorId(pattern));
    setZoomIndex(1);
  }, [pattern]);

  useEffect(() => {
    setLoadedStorageKey(null);
    try {
      const stored = window.localStorage.getItem(storageKey);
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      setCompletedCells(new Set(parsed.filter((key) => validCellKeys.has(key))));
    } catch {
      setCompletedCells(new Set());
    } finally {
      setLoadedStorageKey(storageKey);
    }
  }, [storageKey, validCellKeys]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify([...completedCells].filter((key) => validCellKeys.has(key))));
  }, [completedCells, loadedStorageKey, storageKey, validCellKeys]);

  function handleCellClick(cell: BeadCell) {
    if (!cell.color || cell.isIgnoredBackground) {
      return;
    }

    if (selectedColorId && cell.color.id !== selectedColorId) {
      return;
    }

    const key = getCellKey(cell);
    setCompletedCells((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleClearProgress() {
    if (!window.confirm("确定清空当前图纸的完成进度吗？")) {
      return;
    }

    setCompletedCells(new Set());
    window.localStorage.removeItem(storageKey);
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-[#ede7da] text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="rounded-2xl border border-ink/10 bg-ink p-4 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-coral">Focus Mode</p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">{pattern.width}x{pattern.height} 开拼视图</h1>
              <p className="mt-1 text-sm text-white/65">当前颜色默认选中数量最多的色号，点击对应豆子即可标记完成。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20" type="button" onClick={handleClearProgress}>
                清空进度
              </button>
              <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/90" type="button" onClick={onExit}>
                返回普通模式
              </button>
            </div>
          </div>
        </header>

        <FocusProgressPanel
          completedBeads={completedBeads}
          currentColor={selectedColor}
          currentColorCompleted={currentColorCompleted}
          currentColorTotal={currentColorTotal}
          totalBeads={pattern.totalBeads}
        />

        <div className="grid min-h-0 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="flex min-w-0 flex-col gap-4">
            <FocusColorList
              colorCounts={focusColorCounts}
              completedByColor={completedByColor}
              selectedColorId={selectedColorId}
              onSelectColor={setSelectedColorId}
            />
          </aside>

          <section className="min-w-0 rounded-2xl border border-[#e8e0d3] bg-white/90 p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="rounded-2xl border border-moss/30 bg-moss/10 px-3 py-2 text-sm font-semibold text-ink">
                当前颜色：
                {selectedColor ? (
                  <>
                    <span className="mx-2 inline-flex h-3 w-3 rounded-full border border-ink/10 align-middle" style={{ backgroundColor: selectedColor.hex }} />
                    {selectedColor.id} {selectedColor.name}
                    <span className="ml-2 text-xs text-ink/55">剩余 {currentColorRemaining} / 总数 {currentColorTotal}</span>
                  </>
                ) : (
                  "未选择"
                )}
              </div>
              <div className="flex items-center rounded-xl bg-[#f7f3ea] p-1 text-xs text-ink/70">
                <button
                  className="rounded-lg px-2 py-1 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={zoomIndex === 0}
                  type="button"
                  onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
                >
                  缩小
                </button>
                <span className="px-2 font-semibold text-ink">{Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%</span>
                <button
                  className="rounded-lg px-2 py-1 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                  type="button"
                  onClick={() => setZoomIndex((current) => Math.min(ZOOM_LEVELS.length - 1, current + 1))}
                >
                  放大
                </button>
                <button className="rounded-lg px-2 py-1 transition hover:bg-white" type="button" onClick={() => setZoomIndex(1)}>
                  重置
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e8e0d3] bg-[#fffdf8] px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input checked={onlyCurrentColor} className="h-4 w-4 accent-moss" type="checkbox" onChange={(event) => setOnlyCurrentColor(event.target.checked)} />
                只显示当前颜色
              </label>
              <p className="text-xs text-ink/55">关闭时其他颜色变淡；开启时只保留当前色号。</p>
            </div>

            <div className="overflow-auto rounded-2xl bg-[#f3f0e8] p-3" style={{ touchAction: "pan-x pan-y" }}>
              <FocusBoard
                axisSize={axisSize}
                cellSize={cellSize}
                completedCells={completedCells}
                onlyCurrentColor={onlyCurrentColor}
                pattern={pattern}
                selectedColorId={selectedColorId}
                onCellClick={handleCellClick}
              />
            </div>

            <div className="mt-4">
              <FocusRunList
                colorLabel={selectedColor ? `${selectedColor.id} ${selectedColor.name}` : "未选择颜色"}
                runs={runs.slice(0, RUN_LIMIT)}
                totalRuns={runs.length}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FocusBoard({
  axisSize,
  cellSize,
  completedCells,
  onlyCurrentColor,
  pattern,
  selectedColorId,
  onCellClick,
}: {
  axisSize: number;
  cellSize: number;
  completedCells: Set<string>;
  onlyCurrentColor: boolean;
  pattern: PatternResult;
  selectedColorId: string | null;
  onCellClick: (cell: BeadCell) => void;
}) {
  return (
    <div
      className="grid w-max shrink-0 gap-px"
      style={{
        gridTemplateColumns: `${axisSize}px repeat(${pattern.width}, ${cellSize}px)`,
        gridTemplateRows: `${axisSize}px repeat(${pattern.height}, ${cellSize}px)`,
      }}
    >
      <div className="rounded-tl-xl bg-[#ebe4d7]" />
      {Array.from({ length: pattern.width }, (_, index) => (
        <AxisCell cellSize={cellSize} key={`column-${index}`} label={getAxisLabel(index)} />
      ))}
      {pattern.grid.map((row, rowIndex) => (
        <RowFragment
          cellSize={cellSize}
          completedCells={completedCells}
          key={`row-${rowIndex}`}
          onlyCurrentColor={onlyCurrentColor}
          row={row}
          rowIndex={rowIndex}
          selectedColorId={selectedColorId}
          onCellClick={onCellClick}
        />
      ))}
    </div>
  );
}

function RowFragment({
  cellSize,
  completedCells,
  onlyCurrentColor,
  row,
  rowIndex,
  selectedColorId,
  onCellClick,
}: {
  cellSize: number;
  completedCells: Set<string>;
  onlyCurrentColor: boolean;
  row: BeadCell[];
  rowIndex: number;
  selectedColorId: string | null;
  onCellClick: (cell: BeadCell) => void;
}) {
  return (
    <>
      <AxisCell cellSize={cellSize} label={getAxisLabel(rowIndex)} />
      {row.map((cell) => (
        <FocusCell
          cell={cell}
          cellSize={cellSize}
          isCompleted={completedCells.has(getCellKey(cell))}
          key={getCellKey(cell)}
          onlyCurrentColor={onlyCurrentColor}
          selectedColorId={selectedColorId}
          onClick={() => onCellClick(cell)}
        />
      ))}
    </>
  );
}

function AxisCell({ cellSize, label }: { cellSize: number; label: string }) {
  return (
    <div
      className="flex items-center justify-center bg-[#ebe4d7] text-[10px] font-bold text-ink/55"
      style={{ fontSize: `${Math.max(10, Math.min(13, cellSize * 0.34))}px` }}
    >
      {label}
    </div>
  );
}

function FocusCell({
  cell,
  cellSize,
  isCompleted,
  onlyCurrentColor,
  selectedColorId,
  onClick,
}: {
  cell: BeadCell;
  cellSize: number;
  isCompleted: boolean;
  onlyCurrentColor: boolean;
  selectedColorId: string | null;
  onClick: () => void;
}) {
  if (!cell.color || cell.isIgnoredBackground) {
    return <div className="bg-white/30" style={{ height: `${cellSize}px`, width: `${cellSize}px` }} />;
  }

  const isSelected = !selectedColorId || cell.color.id === selectedColorId;
  const canClick = Boolean(selectedColorId && cell.color.id === selectedColorId);
  const opacityClass = isSelected ? "opacity-100" : onlyCurrentColor ? "opacity-0" : "opacity-25";

  return (
    <button
      aria-label={`${cell.color.id} ${cell.color.name}${isCompleted ? " 已完成" : ""}`}
      className={`relative flex items-center justify-center bg-white transition ${opacityClass} ${
        canClick ? "cursor-pointer hover:bg-moss/10" : "cursor-not-allowed"
      }`}
      disabled={!canClick}
      style={{ height: `${cellSize}px`, width: `${cellSize}px` }}
      title={`${cell.color.id} ${cell.color.name}`}
      type="button"
      onClick={onClick}
    >
      <span
        className={`h-[78%] w-[78%] rounded-full border shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] ${
          canClick ? "border-white ring-2 ring-moss/45" : "border-white/60"
        } ${isCompleted ? "opacity-40 ring-4 ring-moss" : ""}`}
        style={{ backgroundColor: cell.color.hex }}
      />
      {isCompleted ? (
        <span className="absolute flex h-[62%] w-[62%] items-center justify-center rounded-full bg-white text-[11px] font-black text-moss shadow-sm">
          ✓
        </span>
      ) : null}
    </button>
  );
}

function getAxisLabel(index: number) {
  const value = index + 1;
  return value === 1 || value % 5 === 0 ? `${value}` : "";
}

function getCellKey(cell: BeadCell) {
  return `${cell.x},${cell.y}`;
}

function getCompletedByColor(pattern: PatternResult, completedCells: Set<string>) {
  const counts: Record<string, number> = {};
  for (const row of pattern.grid) {
    for (const cell of row) {
      if (!cell.color || cell.isIgnoredBackground || !completedCells.has(getCellKey(cell))) {
        continue;
      }
      counts[cell.color.id] = (counts[cell.color.id] ?? 0) + 1;
    }
  }
  return counts;
}

function getRunsForColor(pattern: PatternResult, selectedColorId: string | null): FocusRun[] {
  if (!selectedColorId) {
    return [];
  }

  const runs: FocusRun[] = [];
  for (const row of pattern.grid) {
    let startX: number | null = null;

    for (let x = 0; x <= pattern.width; x += 1) {
      const cell = x < pattern.width ? row[x] : null;
      const matches = Boolean(cell?.color && !cell.isIgnoredBackground && cell.color.id === selectedColorId);

      if (matches && startX === null) {
        startX = x;
      }

      if ((!matches || x === pattern.width) && startX !== null) {
        const endX = x - 1;
        runs.push({
          count: endX - startX + 1,
          endX: endX + 1,
          row: row[0].y + 1,
          startX: startX + 1,
        });
        startX = null;
      }
    }
  }

  return runs;
}

function getDefaultFocusColorId(pattern: PatternResult) {
  return [...pattern.colorCounts].sort((a, b) => b.count - a.count)[0]?.color.id ?? null;
}

function getFocusStorageKey(pattern: PatternResult) {
  const signature = pattern.grid
    .map((row) => row.map((cell) => (cell.color && !cell.isIgnoredBackground ? cell.color.id : ".")).join(","))
    .join("|");
  return `bead-focus:${pattern.width}x${pattern.height}:${hashString(signature)}`;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
