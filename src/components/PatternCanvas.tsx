import type { PatternResult } from "@/types/pattern";

type PatternCanvasProps = {
  backgroundStyle?: "blank" | "faint";
  cellSize: number;
  pattern: PatternResult;
  rounded?: "circle" | "soft";
  showGap?: boolean;
};

export function PatternCanvas({
  backgroundStyle = "faint",
  cellSize,
  pattern,
  rounded = "circle",
  showGap = true,
}: PatternCanvasProps) {
  const beadClass =
    rounded === "circle"
      ? "rounded-full border border-white/50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
      : "rounded-[2px]";
  const backgroundClass =
    backgroundStyle === "blank"
      ? "bg-transparent"
      : rounded === "circle"
        ? "rounded-full border border-[#d8d0c3]/25 bg-transparent opacity-20"
        : "bg-transparent";

  const gapSize = showGap ? 1 : 0;

  return (
    <div
      aria-label="拼豆图纸网格"
      className={`grid shrink-0 ${showGap ? "gap-px" : "gap-0"}`}
      style={{
        gridTemplateColumns: `repeat(${pattern.width}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${pattern.height}, ${cellSize}px)`,
        width: `${pattern.width * cellSize + gapSize * (pattern.width - 1)}px`,
        height: `${pattern.height * cellSize + gapSize * (pattern.height - 1)}px`,
      }}
    >
      {pattern.grid.flat().map((cell) => (
        <span
          aria-label={cell.color ? `${cell.color.id} ${cell.color.name}` : "忽略背景"}
          className={cell.color ? beadClass : backgroundClass}
          key={`${cell.x}-${cell.y}`}
          style={cell.color ? { backgroundColor: cell.color.hex } : undefined}
          title={cell.color ? `${cell.color.id} ${cell.color.name}` : "忽略背景"}
        />
      ))}
    </div>
  );
}
