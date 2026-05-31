import type { TransparentInputQualityReport } from "@/engine/analyzeTransparentInputQuality";

type TransparentInputQualityNoticeProps = {
  report: TransparentInputQualityReport | null;
};

const QUALITY_COPY: Record<
  TransparentInputQualityReport["classification"],
  {
    message: string;
    tone: "info" | "success" | "warning" | "strong-warning";
  }
> = {
  "likely-dirty-background-removal": {
    message: "透明背景可能残留了不透明背景块。建议重新抠图；仍可继续生成，但结果可能需要较多清理。",
    tone: "strong-warning",
  },
  "needs-review": {
    message: "透明图可能有少量边缘残留。可以继续生成，若背景碎块明显，建议重新抠图或生成后清理。",
    tone: "warning",
  },
  "no-alpha-or-jpg-like": {
    message: "未检测到有效透明背景，将按普通图片处理。",
    tone: "info",
  },
  "subject-dominant-transparent": {
    message: "主体占画面较大，透明区域较少但可继续转换。",
    tone: "info",
  },
  "valid-transparent": {
    message: "透明背景质量良好，可用于后续转换。",
    tone: "success",
  },
};

const TONE_CLASS_NAMES: Record<(typeof QUALITY_COPY)[keyof typeof QUALITY_COPY]["tone"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  "strong-warning": "border-orange-300 bg-orange-50 text-orange-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export function TransparentInputQualityNotice({ report }: TransparentInputQualityNoticeProps) {
  if (!report) {
    return null;
  }

  const copy = QUALITY_COPY[report.classification];

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${TONE_CLASS_NAMES[copy.tone]}`}>
      <p className="font-semibold">透明输入检查</p>
      <p className="mt-1 leading-6">{copy.message}</p>
    </div>
  );
}
