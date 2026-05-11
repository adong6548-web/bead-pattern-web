import type { BeadColor } from "@/types/pattern";

type FocusProgressPanelProps = {
  completedBeads: number;
  currentColor: BeadColor | null;
  currentColorCompleted: number;
  currentColorTotal: number;
  totalBeads: number;
};

export function FocusProgressPanel({
  completedBeads,
  currentColor,
  currentColorCompleted,
  currentColorTotal,
  totalBeads,
}: FocusProgressPanelProps) {
  const remainingBeads = Math.max(0, totalBeads - completedBeads);
  const progress = totalBeads > 0 ? Math.round((completedBeads / totalBeads) * 100) : 0;
  const currentColorRemaining = Math.max(0, currentColorTotal - currentColorCompleted);

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <Metric label="总豆数" value={totalBeads} />
      <Metric label="已完成" value={completedBeads} />
      <Metric label="剩余" value={remainingBeads} />
      <Metric label="完成进度" value={`${progress}%`} />

      <div className="rounded-2xl border border-[#e8e0d3] bg-white p-3 sm:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            {currentColor ? (
              <span className="h-4 w-4 rounded-full border border-ink/10" style={{ backgroundColor: currentColor.hex }} />
            ) : null}
            <span>{currentColor ? `${currentColor.id} ${currentColor.name}` : "未选择颜色"}</span>
          </div>
          <span className="text-xs text-ink/55">
            当前颜色：{currentColorCompleted}/{currentColorTotal}，剩余 {currentColorRemaining}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#efe8da]">
          <div
            className="h-full rounded-full bg-moss transition-all"
            style={{ width: `${currentColorTotal > 0 ? Math.round((currentColorCompleted / currentColorTotal) * 100) : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#e8e0d3] bg-white p-3 text-center">
      <div className="text-lg font-bold text-ink">{value}</div>
      <div className="mt-1 text-xs text-ink/55">{label}</div>
    </div>
  );
}
