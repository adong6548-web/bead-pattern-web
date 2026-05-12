"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PATTERN_COLOR_STYLE, DEFAULT_PATTERN_MODE, getDefaultColorLimitForMode } from "@/config/patternPresets";
import { generatePattern } from "@/engine/generatePattern";
import { recommendPatternPlans } from "@/engine/recommendPatternSizes";
import type { PatternColorStyle, PatternMode, PatternVariant } from "@/types/pattern";
import { imageFileToSafeImageData, validateImageFile } from "@/utils/imageProcessing";
import {
  clearExportDraft,
  clearSessionDraft,
  createPatternSnapshot,
  readExportDraft,
  readSessionDraft,
  restorePatternVariantFromSnapshot,
  type PersistedExportDraft,
  type PersistedExportSettings,
  type PersistedSessionDraft,
  writeExportDraft,
  writeSessionDraft,
} from "@/utils/persistence";
import { AspectRatioNotice } from "./AspectRatioNotice";
import { BackgroundOptions } from "./BackgroundOptions";
import { ColorStats } from "./ColorStats";
import { GenerationSettings } from "./GenerationSettings";
import { ImageUploader } from "./ImageUploader";
import { PatternExportPanel } from "./PatternExportPanel";
import { PatternGrid } from "./PatternGrid";
import { PatternVariantCards } from "./PatternVariantCards";

const SAVE_DEBOUNCE_MS = 350;

export function PatternTool() {
  const uploadRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
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
  const [notice, setNotice] = useState<string | null>(null);
  const [restoredVariant, setRestoredVariant] = useState<PatternVariant | null>(null);
  const [exportDraft, setExportDraft] = useState<PersistedExportSettings | null>(null);
  const [initialExportDraft, setInitialExportDraft] = useState<PersistedExportSettings | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    exportDraft: PersistedExportDraft | null;
    restoredVariant: PatternVariant;
    session: PersistedSessionDraft;
  } | null>(null);
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
  const availableVariants = useMemo(() => (variants.length > 0 ? variants : restoredVariant ? [restoredVariant] : []), [restoredVariant, variants]);
  const resolvedSelectedVariantId = useMemo(() => {
    if (availableVariants.length === 0) {
      return null;
    }

    if (selectedVariantId && availableVariants.some((variant) => variant.plan.id === selectedVariantId)) {
      return selectedVariantId;
    }

    return availableVariants.find((variant) => variant.plan.isRecommended)?.plan.id ?? availableVariants[0].plan.id;
  }, [availableVariants, selectedVariantId]);
  const selectedVariant =
    availableVariants.find((variant) => variant.plan.id === resolvedSelectedVariantId) ??
    availableVariants.find((variant) => variant.plan.isRecommended) ??
    availableVariants[0] ??
    null;
  const pattern = selectedVariant?.pattern ?? null;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const storedSession = readSessionDraft();
    if (!storedSession?.snapshot) {
      return;
    }

    const restored = restorePatternVariantFromSnapshot(storedSession.snapshot);
    if (!restored) {
      clearSessionDraft();
      clearExportDraft();
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingRestore({
        exportDraft: readExportDraft(),
        restoredVariant: restored,
        session: storedSession,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!selectedVariant) {
      return;
    }

    const timer = window.setTimeout(() => {
      writeSessionDraft({
        savedAt: new Date().toISOString(),
        selection: {
          selectedVariantId: selectedVariant.plan.id,
        },
        settings: {
          colorLimit,
          colorStyle,
          ignoreWhiteBackground,
          patternMode,
        },
        snapshot: createPatternSnapshot(selectedVariant.plan, selectedVariant.pattern),
        version: 1,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [colorLimit, colorStyle, ignoreWhiteBackground, patternMode, selectedVariant]);

  useEffect(() => {
    if (!exportDraft) {
      return;
    }

    const timer = window.setTimeout(() => {
      writeExportDraft({
        savedAt: new Date().toISOString(),
        settings: exportDraft,
        version: 1,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [exportDraft]);

  async function handleFileSelect(file: File) {
    if (isProcessing) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      setNotice(null);
      return;
    }

    const requestId = uploadRequestIdRef.current + 1;
    uploadRequestIdRef.current = requestId;
    setIsProcessing(true);
    setError(null);
    setNotice(null);

    try {
      const nextImage = await imageFileToSafeImageData(file);
      if (!isMountedRef.current || uploadRequestIdRef.current !== requestId) {
        return;
      }

      const nextPreviewUrl = URL.createObjectURL(file);
      setSelectedFileName(file.name);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return nextPreviewUrl;
      });
      setSelectedVariantId(null);
      setImageData(nextImage.imageData);
      setRestoredVariant(null);
      setPendingRestore(null);
      setInitialExportDraft(null);
      setError(null);
      setNotice(nextImage.warnings.length > 0 ? nextImage.warnings.join(" ") : null);
    } catch (currentError) {
      if (!isMountedRef.current || uploadRequestIdRef.current !== requestId) {
        return;
      }

      setError(currentError instanceof Error ? currentError.message : "生成过程中出现问题，请换一张图片或降低颜色数量后再试。");
      setNotice(null);
    } finally {
      if (isMountedRef.current && uploadRequestIdRef.current === requestId) {
        setIsProcessing(false);
      }
    }
  }

  function handlePatternModeChange(nextMode: PatternMode) {
    setPatternMode(nextMode);
    setColorLimit(getDefaultColorLimitForMode(nextMode));
  }

  function handleRestoreDraft() {
    if (!pendingRestore) {
      return;
    }

    setPatternMode(pendingRestore.session.settings.patternMode);
    setColorLimit(pendingRestore.session.settings.colorLimit);
    setColorStyle(pendingRestore.session.settings.colorStyle);
    setIgnoreWhiteBackground(pendingRestore.session.settings.ignoreWhiteBackground);
    setSelectedVariantId(pendingRestore.session.selection.selectedVariantId);
    setImageData(null);
    setSelectedFileName(null);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setError(null);
    setNotice(null);
    setRestoredVariant(pendingRestore.restoredVariant);
    setExportDraft(pendingRestore.exportDraft?.settings ?? null);
    setInitialExportDraft(pendingRestore.exportDraft?.settings ?? null);
    setPendingRestore(null);
  }

  function handleDiscardDraft() {
    clearSessionDraft();
    clearExportDraft();
    setPendingRestore(null);
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

        {pendingRestore ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">发现上次未完成的本地草稿</h2>
                <p className="mt-1 text-sm text-ink/65">
                  可恢复上次生成的图纸结果、当前设置和导出选项。原始上传图片不会恢复，如需重新生成请重新上传图片。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-stone-50"
                  type="button"
                  onClick={handleDiscardDraft}
                >
                  丢弃
                </button>
                <button
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  type="button"
                  onClick={handleRestoreDraft}
                >
                  恢复
                </button>
              </div>
            </div>
          </section>
        ) : null}

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

            {notice ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                {notice}
              </div>
            ) : null}

            <AspectRatioNotice pattern={pattern} />

            <PatternVariantCards
              selectedVariantId={resolvedSelectedVariantId}
              variants={availableVariants}
              onSelectVariant={setSelectedVariantId}
            />
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            <PatternGrid key={pattern ? `${pattern.width}x${pattern.height}` : "empty-pattern"} pattern={pattern} />
            {pattern ? <PatternExportPanel initialDraft={initialExportDraft} pattern={pattern} onDraftChange={setExportDraft} /> : null}
            <ColorStats pattern={pattern} />
          </section>
        </div>
      </div>
    </main>
  );
}
