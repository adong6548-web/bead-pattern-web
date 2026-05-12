export const MAX_IMAGE_FILE_SIZE_MB = 12;
export const MAX_IMAGE_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 16_000_000;
export const MAX_PROCESSING_PIXELS = 4_000_000;
export const MAX_ASPECT_RATIO = 6;

const UNSUPPORTED_FILE_MESSAGE = "文件格式暂不支持，请上传常见图片格式。";
const FILE_TOO_LARGE_MESSAGE = "图片文件过大，建议换一张体积更小的图片后再试。";
const DECODE_FAILED_MESSAGE = "图片读取失败，可能是文件损坏或浏览器无法解析。";
const CANVAS_UNSUPPORTED_MESSAGE = "当前浏览器不支持图片处理，请换一个浏览器后再试。";
const SOURCE_TOO_LARGE_MESSAGE = "图片尺寸过大，建议换一张尺寸更小的图片后再试。";
const DOWNSCALED_MESSAGE = "图片尺寸过大，已尝试压缩后处理。";
const EXTREME_RATIO_MESSAGE = "图片比例过于极端，可能不适合生成拼豆图纸。";

export type SafeImageDimensions = {
  width: number;
  height: number;
  wasDownscaled: boolean;
  scale: number;
};

export type SafeImageDataResult = {
  imageData: ImageData;
  sourceWidth: number;
  sourceHeight: number;
  processingWidth: number;
  processingHeight: number;
  wasDownscaled: boolean;
  warnings: string[];
};

export function validateImageFile(file: File | null | undefined): string | null {
  if (!file) {
    return "请先选择一张图片。";
  }

  if (!file.type || !file.type.startsWith("image/")) {
    return UNSUPPORTED_FILE_MESSAGE;
  }

  if (file.size <= 0) {
    return DECODE_FAILED_MESSAGE;
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return FILE_TOO_LARGE_MESSAGE;
  }

  return null;
}

export function getSafeImageDimensions(width: number, height: number): SafeImageDimensions {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(DECODE_FAILED_MESSAGE);
  }

  const sourcePixels = width * height;
  if (sourcePixels > MAX_SOURCE_PIXELS) {
    throw new Error(SOURCE_TOO_LARGE_MESSAGE);
  }

  if (sourcePixels <= MAX_PROCESSING_PIXELS) {
    return {
      height,
      scale: 1,
      wasDownscaled: false,
      width,
    };
  }

  const scale = Math.sqrt(MAX_PROCESSING_PIXELS / sourcePixels);
  return {
    height: Math.max(1, Math.round(height * scale)),
    scale,
    wasDownscaled: true,
    width: Math.max(1, Math.round(width * scale)),
  };
}

export async function imageFileToSafeImageData(file: File): Promise<SafeImageDataResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error(DECODE_FAILED_MESSAGE);
    }

    const warnings: string[] = [];
    const aspectRatio = Math.max(sourceWidth / sourceHeight, sourceHeight / sourceWidth);
    if (aspectRatio > MAX_ASPECT_RATIO) {
      warnings.push(EXTREME_RATIO_MESSAGE);
    }

    const safeDimensions = getSafeImageDimensions(sourceWidth, sourceHeight);
    if (safeDimensions.wasDownscaled) {
      warnings.unshift(DOWNSCALED_MESSAGE);
    }

    const canvas = document.createElement("canvas");
    canvas.width = safeDimensions.width;
    canvas.height = safeDimensions.height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error(CANVAS_UNSUPPORTED_MESSAGE);
    }

    try {
      context.drawImage(image, 0, 0, safeDimensions.width, safeDimensions.height);
    } catch {
      throw new Error(DECODE_FAILED_MESSAGE);
    }

    let imageData: ImageData;
    try {
      imageData = context.getImageData(0, 0, safeDimensions.width, safeDimensions.height);
    } catch {
      throw new Error(DECODE_FAILED_MESSAGE);
    }

    return {
      imageData,
      processingHeight: safeDimensions.height,
      processingWidth: safeDimensions.width,
      sourceHeight,
      sourceWidth,
      warnings,
      wasDownscaled: safeDimensions.wasDownscaled,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function loadImage(imageUrl: string) {
  const image = new Image();
  image.decoding = "async";

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(DECODE_FAILED_MESSAGE));
    image.src = imageUrl;
  });
}
