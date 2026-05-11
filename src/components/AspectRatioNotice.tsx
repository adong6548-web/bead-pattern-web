import type { PatternResult } from "@/types/pattern";

type AspectRatioNoticeProps = {
  pattern: PatternResult | null;
};

export function AspectRatioNotice({ pattern }: AspectRatioNoticeProps) {
  if (!pattern?.aspectRatioWarning) {
    return null;
  }

  const message =
    pattern.aspectRatioWarning === "wide"
      ? "当前图片偏宽，推荐使用横向尺寸，能保留更多角色细节。"
      : "当前图片偏高，建议使用更高尺寸或调整裁剪。";

  return (
    <div className="w-full rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-5 text-ink/75">
      {message}
    </div>
  );
}
