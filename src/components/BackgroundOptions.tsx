type BackgroundOptionsProps = {
  ignoreWhiteBackground: boolean;
  onIgnoreWhiteBackgroundChange: (value: boolean) => void;
};

export function BackgroundOptions({
  ignoreWhiteBackground,
  onIgnoreWhiteBackgroundChange,
}: BackgroundOptionsProps) {
  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">背景处理</h2>
          <p className="mt-1 text-xs text-ink/60">白边自动裁剪；开启后白色背景格不计入豆数。</p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-ink">
          <input
            checked={ignoreWhiteBackground}
            className="h-3.5 w-3.5 accent-moss"
            type="checkbox"
            onChange={(event) => onIgnoreWhiteBackgroundChange(event.target.checked)}
          />
          忽略白色背景
        </label>
      </div>
    </section>
  );
}
