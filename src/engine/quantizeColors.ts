import type { RGB } from "@/types/pattern";

export function rgbDistance(a: RGB, b: RGB) {
  const r = a.r - b.r;
  const g = a.g - b.g;
  const blue = a.b - b.b;

  return Math.sqrt(r * r + g * g + blue * blue);
}

function rgbKey({ r, g, b }: RGB) {
  return `${r},${g},${b}`;
}

function luminance({ r, g, b }: RGB) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function findNearestRgb(color: RGB, candidates: RGB[]) {
  if (candidates.length === 0) {
    throw new Error("Candidates must contain at least one color.");
  }

  return candidates.reduce((nearest, candidate) => (rgbDistance(color, candidate) < rgbDistance(color, nearest) ? candidate : nearest), candidates[0]);
}

export function quantizeColors(colors: RGB[], maxColors = 12, iterations = 10): RGB[] {
  if (colors.length === 0 || maxColors <= 0) {
    return [];
  }

  const unique = Array.from(new Map(colors.map((color) => [rgbKey(color), color])).values());
  const colorCount = Math.min(maxColors, unique.length);

  if (unique.length <= colorCount) {
    return unique;
  }

  const sorted = [...unique].sort((a, b) => luminance(a) - luminance(b) || a.r - b.r || a.g - b.g || a.b - b.b);
  let centers = Array.from({ length: colorCount }, (_, index) => {
    const sortedIndex = Math.min(sorted.length - 1, Math.floor(((index + 0.5) * sorted.length) / colorCount));
    return sorted[sortedIndex];
  });

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const buckets = centers.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    for (const color of colors) {
      const nearestIndex = centers.reduce(
        (nearest, center, index) => (rgbDistance(color, center) < rgbDistance(color, centers[nearest]) ? index : nearest),
        0,
      );
      buckets[nearestIndex].r += color.r;
      buckets[nearestIndex].g += color.g;
      buckets[nearestIndex].b += color.b;
      buckets[nearestIndex].count += 1;
    }

    centers = centers.map((center, index) => {
      const bucket = buckets[index];

      if (bucket.count === 0) {
        return center;
      }

      return {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
      };
    });
  }

  return centers;
}
