import type { BeadColor, ColorCount } from "@/types/pattern";

type FocusColorListProps = {
  colorCounts: ColorCount[];
  completedByColor: Record<string, number>;
  selectedColorId: string | null;
  onSelectColor: (colorId: string) => void;
};

export function FocusColorList({ colorCounts, completedByColor, selectedColorId, onSelectColor }: FocusColorListProps) {
  return (
    <div className="rounded-2xl border border-[#e8e0d3] bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">颜色选择</h3>
          <p className="mt-1 text-xs text-ink/50">点击色号卡片，切换当前要拼的颜色。</p>
        </div>
        <span className="text-xs text-ink/50">{colorCounts.length} 色</span>
      </div>

      <div className="grid max-h-72 gap-2 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
        {colorCounts.map(({ color, count }) => (
          <ColorButton
            color={color}
            completed={completedByColor[color.id] ?? 0}
            count={count}
            isSelected={selectedColorId === color.id}
            key={color.id}
            onClick={() => onSelectColor(color.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ColorButton({
  color,
  completed,
  count,
  isSelected,
  onClick,
}: {
  color: BeadColor;
  completed: number;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-xl border p-2 text-left transition ${
        isSelected ? "border-2 border-moss bg-moss/10 shadow-sm" : "border border-[#e8e0d3] bg-[#fffdf8] hover:border-moss/50"
      }`}
      type="button"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full border border-ink/10" style={{ backgroundColor: color.hex }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold text-ink">{color.id}</span>
            {isSelected ? <span className="rounded-full bg-moss px-2 py-0.5 text-[10px] font-semibold text-white">当前</span> : null}
            <span className="text-xs tabular-nums text-ink/55">
              {completed}/{count}
            </span>
          </div>
          <div className="truncate text-xs text-ink/60">{color.name}</div>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#efe8da]">
        <div className="h-full rounded-full bg-moss" style={{ width: `${count > 0 ? Math.round((completed / count) * 100) : 0}%` }} />
      </div>
    </button>
  );
}
