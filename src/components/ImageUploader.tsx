"use client";

type ImageUploaderProps = {
  fileName: string | null;
  imageUrl: string | null;
  isProcessing: boolean;
  onFileSelect: (file: File) => void;
};

export function ImageUploader({ fileName, imageUrl, isProcessing, onFileSelect }: ImageUploaderProps) {
  return (
    <label
      className="block min-w-0 cursor-pointer rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm transition hover:bg-stone-50"
      title={fileName ?? undefined}
    >
      <input
        accept="image/*"
        className="sr-only"
        disabled={isProcessing}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFileSelect(file);
          }
        }}
      />
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">上传图片</h2>
          <p className="mt-1 text-sm text-ink/60">JPG / PNG / WebP，本地生成可编辑初稿</p>
        </div>
        <span className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm">
          {isProcessing ? "生成中..." : imageUrl ? "更换图片" : "选择图片"}
        </span>
      </div>

      {imageUrl ? (
        <div className="mt-3 flex min-w-0 items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white bg-white">
            <img alt="原图缩略图" className="h-full w-full object-contain p-1.5" src={imageUrl} />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-ink">已选择图片</p>
            <p className="mt-1 text-xs text-ink/50">本地处理，不上传服务器；初稿生成后可继续清理颜色。</p>
            <p className="mt-2 text-xs font-medium text-ink/45">再次点击卡片可更换图片</p>
          </div>
        </div>
      ) : null}
    </label>
  );
}
