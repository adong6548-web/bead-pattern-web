"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PATTERN_COLOR_STYLE, DEFAULT_PATTERN_MODE, getDefaultColorLimitForMode } from "@/config/patternPresets";
import { generatePattern } from "@/engine/generatePattern";
import { recommendPatternPlans } from "@/engine/recommendPatternSizes";
import type { PatternColorStyle, PatternMode, PatternVariant } from "@/types/pattern";
import { AspectRatioNotice } from "./AspectRatioNotice";
import { BackgroundOptions } from "./BackgroundOptions";
import { ColorStats } from "./ColorStats";
import { GenerationSettings } from "./GenerationSettings";
import { ImageUploader } from "./ImageUploader";
import { PatternExportPanel } from "./PatternExportPanel";
import { PatternGrid } from "./PatternGrid";
import { PatternVariantCards } from "./PatternVariantCards";

async function fileToImageData(file: File): Promise<ImageData> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("图片读取失败，请换一张图片重试。"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("当前浏览器不支持图片处理。");
    }

    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function PatternTool() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [ignoreWhiteBackground, setIgnoreWhiteBackground] = useState(true);
  const [patternMode, setPatternMode] = useState<PatternMode>(DEFAULT_PATTERN_MODE);
  const [colorLimit, setColorLimit] = useState(getDefaultColorLimitForMode(DEFAULT_PATTERN_MODE));
  const [colorStyle, setColorStyle] = useState<PatternColorStyle>(DEFAULT_PATTERN_COLOR_STYLE);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const variants = useMemo<PatternVariant[]>(() => {
    if (!imageData) {
      return [];
    }

    const baseOptions = {
      colorLimit,
      colorStyle,
      ignoreWhiteBackground,
      mode: patternMode,
      trimMargin: 4,
      trimWhiteBackground: true,
    };
    const novicePattern = generatePattern(imageData, { ...baseOptions, width: 40, height: 40 });
    const plans = recommendPatternPlans(novicePattern.sourceAspectRatio);

    return plans.map((plan) => ({
      plan,
      pattern:
        plan.width === 40 && plan.height === 40
          ? novicePattern
          : generatePattern(imageData, { ...baseOptions, width: plan.width, height: plan.height }),
    }));
  }, [colorLimit, colorStyle, imageData, ignoreWhiteBackground, patternMode]);
  const selectedVariant =
    variants.find((variant) => variant.plan.id === selectedVariantId) ??
    variants.find((variant) => variant.plan.isRecommended) ??
    variants[0] ??
    null;
  const pattern = selectedVariant?.pattern ?? null;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (variants.length === 0) {
      if (selectedVariantId !== null) {
        setSelectedVariantId(null);
      }
      return;
    }

    if (!variants.some((variant) => variant.plan.id === selectedVariantId)) {
      setSelectedVariantId(variants.find((variant) => variant.plan.isRecommended)?.plan.id ?? variants[0].plan.id);
    }
  }, [selectedVariantId, variants]);

  async function handleFileSelect(file: File) {
    setIsProcessing(true);
    setError(null);

    const nextPreviewUrl = URL.createObjectURL(file);
    setSelectedFileName(file.name);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return nextPreviewUrl;
    });

    try {
      const nextImageData = await fileToImageData(file);
      setSelectedVariantId(null);
      setImageData(nextImageData);
    } catch (currentError) {
      setImageData(null);
      setSelectedFileName(null);
      setError(currentError instanceof Error ? currentError.message : "生成失败，请换一张图片重试。");
    } finally {
      setIsProcessing(false);
    }
  }

  function handlePatternModeChange(nextMode: PatternMode) {
    setPatternMode(nextMode);
    setColorLimit(getDefaultColorLimitForMode(nextMode));
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex min-w-0 flex-col gap-3 rounded-2xl border border-stone-200 bg-white/75 p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-coral">Bead Pattern</p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-[32px] sm:leading-tight">图片转拼豆图纸</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70 sm:text-[15px]">
              上传图片后，自动生成可导出的拼豆图纸。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/65">
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5">本地处理</span>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5">无登录</span>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5">高清 PNG</span>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] 2xl:gap-6">
          <aside className="flex min-w-0 flex-col gap-4 2xl:sticky 2xl:top-4 2xl:self-start">
            <ImageUploader fileName={selectedFileName} imageUrl={previewUrl} isProcessing={isProcessing} onFileSelect={handleFileSelect} />

            <GenerationSettings
              colorLimit={colorLimit}
              colorStyle={colorStyle}
              mode={patternMode}
              onColorLimitChange={setColorLimit}
              onColorStyleChange={setColorStyle}
              onModeChange={handlePatternModeChange}
            />

            <BackgroundOptions
              ignoreWhiteBackground={ignoreWhiteBackground}
              onIgnoreWhiteBackgroundChange={setIgnoreWhiteBackground}
            />

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                {error}
              </div>
            ) : null}

            <AspectRatioNotice pattern={pattern} />

            <PatternVariantCards
              selectedVariantId={selectedVariant?.plan.id ?? null}
              variants={variants}
              onSelectVariant={setSelectedVariantId}
            />
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            <PatternGrid pattern={pattern} />
            {pattern ? <PatternExportPanel pattern={pattern} /> : null}
            <ColorStats pattern={pattern} />
          </section>
        </div>
      </div>
    </main>
  );
}
