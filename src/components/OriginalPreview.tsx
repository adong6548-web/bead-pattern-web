type OriginalPreviewProps = {
  imageUrl: string | null;
};

export function OriginalPreview({ imageUrl }: OriginalPreviewProps) {
  return (
    <section className="flex min-h-0 flex-col gap-3 rounded-2xl border border-[#e8e0d3] bg-white/85 p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-ink">原图预览</h2>
        <p className="mt-1 text-xs text-ink/60">仅用于本地取色。</p>
      </div>

      <div className="flex min-h-44 flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#f2eee6] lg:min-h-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="上传的原图预览" className="max-h-64 w-full object-contain lg:max-h-[24rem]" src={imageUrl} />
        ) : (
          <div className="grid h-32 w-32 grid-cols-8 gap-1 p-3">
            {Array.from({ length: 64 }, (_, index) => (
              <span
                aria-hidden="true"
                className="rounded-full border border-ink/10"
                key={index}
                style={{
                  backgroundColor: index % 5 === 0 ? "#df7861" : index % 3 === 0 ? "#5a7d62" : "#ffffff",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
