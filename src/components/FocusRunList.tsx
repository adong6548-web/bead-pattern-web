type FocusRun = {
  count: number;
  endX: number;
  row: number;
  startX: number;
};

type FocusRunListProps = {
  colorLabel: string;
  runs: FocusRun[];
  totalRuns: number;
};

export function FocusRunList({ colorLabel, runs, totalRuns }: FocusRunListProps) {
  return (
    <div className="rounded-2xl border border-[#e8e0d3] bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">连续豆数提示</h3>
          <p className="mt-1 text-xs text-ink/50">{colorLabel}</p>
        </div>
        <span className="text-xs text-ink/50">{totalRuns} 段</span>
      </div>

      {runs.length > 0 ? (
        <div className="max-h-72 space-y-1 overflow-auto pr-1 text-xs leading-5 text-ink/70">
          {runs.map((run) => (
            <div className="rounded-lg bg-[#f7f3ea] px-2 py-1" key={`${run.row}-${run.startX}-${run.endX}`}>
              第 {run.row} 行：第 {run.startX}-{run.endX} 列，共 {run.count} 颗
            </div>
          ))}
          {totalRuns > runs.length ? <p className="px-1 pt-1 text-ink/45">还有 {totalRuns - runs.length} 条未显示。</p> : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-ink/15 px-3 py-6 text-center text-sm text-ink/45">请选择颜色查看连续区间</div>
      )}
    </div>
  );
}

export type { FocusRun };
