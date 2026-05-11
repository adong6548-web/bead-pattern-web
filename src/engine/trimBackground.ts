import type { RGB } from "@/types/pattern";

export type TrimBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function isNearWhite({ r, g, b }: RGB) {
  return r > 245 && g > 245 && b > 245;
}

export function readCompositedPixel(imageData: ImageData, x: number, y: number): RGB {
  const index = (y * imageData.width + x) * 4;
  const alpha = imageData.data[index + 3] / 255;
  const background = 255 * (1 - alpha);

  return {
    r: Math.round(imageData.data[index] * alpha + background),
    g: Math.round(imageData.data[index + 1] * alpha + background),
    b: Math.round(imageData.data[index + 2] * alpha + background),
  };
}

export function getTrimmedBounds(imageData: ImageData, margin = 4): TrimBounds {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      if (!isNearWhite(readCompositedPixel(imageData, x, y))) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: 0,
      y: 0,
      width: imageData.width,
      height: imageData.height,
    };
  }

  const x = Math.max(0, minX - margin);
  const y = Math.max(0, minY - margin);
  const right = Math.min(imageData.width - 1, maxX + margin);
  const bottom = Math.min(imageData.height - 1, maxY + margin);

  return {
    x,
    y,
    width: right - x + 1,
    height: bottom - y + 1,
  };
}
