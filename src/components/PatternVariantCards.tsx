import type { PatternVariant } from "@/types/pattern";
import { PatternCanvas } from "./PatternCanvas";

type PatternVariantCardsProps = {
  selectedVariantId: string | null;
  variants: PatternVariant[];
  onSelectVariant: (variantId: string) => void;
};

function MiniPatternPreview({ variant }: { variant: PatternVariant }) {
  const cellSize = Math.max(1, Math.min(2.4, 180 / variant.pattern.width, 72 / variant.pattern.height));

  return (
    <div className="flex h-full w-full items-center justify-center">
      <PatternCanvas backgroundStyle="blank" cellSize={cellSize} pattern={variant.pattern} rounded="soft" showGap={false} />
    </div>
  );
}

export function PatternVariantCards({ selectedVariantId, variants, onSelectVariant }: PatternVariantCardsProps) {
  if (variants.length === 0) {
    return null;
  }

  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">尺寸方案</h2>
          <p className="mt-1 text-xs text-ink/60">选择更适合当前图片比例的拼豆尺寸。</p>
        </div>
      </div>

      <div className="grid gap-3">
        {variants.map((variant) => {
          const isSelected = variant.plan.id === selectedVariantId;

          return (
            <div
              aria-pressed={isSelected}
              className={`min-w-0 cursor-pointer rounded-2xl border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-200 ${
                isSelected
                  ? "border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200"
                  : "border-stone-200 bg-white hover:bg-stone-50"
              }`}
              key={variant.plan.id}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectVariant(variant.plan.id);
                }
              }}
              onClick={() => onSelectVariant(variant.plan.id)}
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 text-sm font-semibold text-ink">{variant.plan.name}</div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {variant.plan.isRecommended ? (
                    <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-semibold text-white">推荐</span>
                  ) : null}
                  {isSelected ? (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">当前</span>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5 text-center text-[11px] text-ink/65 sm:grid-cols-4">
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-1 py-1.5">
                  <div className="font-semibold text-ink">{variant.pattern.width}×{variant.pattern.height}</div>
                  <div>尺寸</div>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-1 py-1.5">
                  <div className="font-semibold text-ink">{variant.pattern.totalBeads}</div>
                  <div>豆数</div>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-1 py-1.5">
                  <div className="font-semibold text-ink">{variant.pattern.usedColorCount}</div>
                  <div>颜色</div>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-1 py-1.5">
                  <div className="font-semibold text-ink">{Math.round(variant.pattern.darkLineRatio * 100)}%</div>
                  <div>黑边</div>
                </div>
              </div>

              <div className="mt-2 flex h-16 w-full items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-2 sm:h-20">
                <MiniPatternPreview variant={variant} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
