import type { RGB } from "@/types/pattern";

export type TransparentInputQualityClass =
  | "valid-transparent"
  | "subject-dominant-transparent"
  | "needs-review"
  | "likely-dirty-background-removal"
  | "no-alpha-or-jpg-like";

export type AlphaDistribution = {
  totalPixels: number;
  alpha0: number;
  alpha1To23: number;
  alpha24To249: number;
  alpha250Plus: number;
  alpha0Ratio: number;
  alpha1To23Ratio: number;
  alpha24To249Ratio: number;
  alpha250PlusRatio: number;
};

export type OpaqueBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  areaRatio: number;
  touchesBorder: boolean;
  isFullImage: boolean;
} | null;

export type BorderOpaqueMetrics = {
  borderWidth: number;
  count: number;
  ratioOfBorder: number;
  ratioOfAllPixels: number;
  sideRatios: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export type EdgeAdjacentOpaqueMetrics = {
  radius: number;
  count: number;
  ratioOfOpaque: number;
  suspiciousCount: number;
  suspiciousRatioOfEdgeAdjacent: number;
};

export type SuspiciousRetainedColorClusters = {
  referenceClusterCount: number;
  count: number;
  ratioOfOpaque: number;
  borderCount: number;
  borderRatioOfOpaqueBorder: number;
  edgeAdjacentCount: number;
  edgeAdjacentRatio: number;
  matchedReferenceBackground: boolean;
};

export type SubjectDominantSignals = {
  opaqueAreaRatio: number;
  transparentAreaRatio: number;
  semiTransparentAreaRatio: number;
  centralOpaqueRatio: number;
  borderOpaqueRatio: number;
  fullImageOpaqueBBox: boolean;
  touchesMultipleBorders: boolean;
  likelySubjectDominant: boolean;
};

export type TransparentInputQualityReport = {
  classification: TransparentInputQualityClass;
  trueAlphaPresence: boolean;
  alphaDistribution: AlphaDistribution;
  opaqueBBox: OpaqueBoundingBox;
  borderOpaqueRatio: BorderOpaqueMetrics;
  edgeAdjacentOpaquePixels: EdgeAdjacentOpaqueMetrics;
  suspiciousRetainedColorClusters: SuspiciousRetainedColorClusters;
  subjectDominantSignals: SubjectDominantSignals;
  warnings: string[];
  notes: string[];
};

export type AnalyzeTransparentInputQualityOptions = {
  referenceImageData?: ImageData;
  borderWidth?: number;
  edgeRadius?: number;
};

type ColorCluster = {
  rgb: RGB;
  count: number;
};

const OPAQUE_ALPHA = 250;
const TRANSPARENT_ALPHA = 24;
const CLUSTER_BUCKET_SIZE = 32;
const REFERENCE_CLUSTER_DISTANCE = 42;

function ratio(count: number, total: number) {
  return total > 0 ? count / total : 0;
}

function pixelOffset(imageData: ImageData, x: number, y: number) {
  return (y * imageData.width + x) * 4;
}

function readRgb(imageData: ImageData, x: number, y: number): RGB {
  const offset = pixelOffset(imageData, x, y);

  return {
    r: imageData.data[offset],
    g: imageData.data[offset + 1],
    b: imageData.data[offset + 2],
  };
}

function readAlpha(imageData: ImageData, x: number, y: number) {
  return imageData.data[pixelOffset(imageData, x, y) + 3];
}

function colorDistance(a: RGB, b: RGB) {
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;

  return Math.sqrt(red * red + green * green + blue * blue);
}

function colorBucketKey({ r, g, b }: RGB) {
  return `${Math.floor(r / CLUSTER_BUCKET_SIZE)}-${Math.floor(g / CLUSTER_BUCKET_SIZE)}-${Math.floor(b / CLUSTER_BUCKET_SIZE)}`;
}

function isBorderPixel(width: number, height: number, x: number, y: number, borderWidth: number) {
  return x < borderWidth || y < borderWidth || x >= width - borderWidth || y >= height - borderWidth;
}

function isCentralPixel(width: number, height: number, x: number, y: number) {
  const minX = Math.floor(width * 0.25);
  const maxX = Math.ceil(width * 0.75);
  const minY = Math.floor(height * 0.25);
  const maxY = Math.ceil(height * 0.75);

  return x >= minX && x < maxX && y >= minY && y < maxY;
}

function hasTransparentNeighbor(imageData: ImageData, x: number, y: number, radius: number) {
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    const nextY = y + offsetY;

    if (nextY < 0 || nextY >= imageData.height) {
      continue;
    }

    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      const nextX = x + offsetX;

      if (nextX < 0 || nextX >= imageData.width || (offsetX === 0 && offsetY === 0)) {
        continue;
      }

      if (readAlpha(imageData, nextX, nextY) < TRANSPARENT_ALPHA) {
        return true;
      }
    }
  }

  return false;
}

function buildReferenceBorderClusters(referenceImageData: ImageData | undefined, borderWidth: number): ColorCluster[] {
  if (!referenceImageData) {
    return [];
  }

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let y = 0; y < referenceImageData.height; y += 1) {
    for (let x = 0; x < referenceImageData.width; x += 1) {
      if (!isBorderPixel(referenceImageData.width, referenceImageData.height, x, y, borderWidth)) {
        continue;
      }

      const rgb = readRgb(referenceImageData, x, y);
      const key = colorBucketKey(rgb);
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };

      bucket.r += rgb.r;
      bucket.g += rgb.g;
      bucket.b += rgb.b;
      bucket.count += 1;
      buckets.set(key, bucket);
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((bucket) => ({
      count: bucket.count,
      rgb: {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
      },
    }));
}

function matchesReferenceBackground(rgb: RGB, referenceClusters: ColorCluster[]) {
  return referenceClusters.some((cluster) => colorDistance(rgb, cluster.rgb) <= REFERENCE_CLUSTER_DISTANCE);
}

export function analyzeTransparentInputQuality(
  imageData: ImageData,
  options: AnalyzeTransparentInputQualityOptions = {},
): TransparentInputQualityReport {
  const borderWidth = options.borderWidth ?? 5;
  const edgeRadius = options.edgeRadius ?? 3;
  const totalPixels = imageData.width * imageData.height;
  const referenceClusters = buildReferenceBorderClusters(options.referenceImageData, borderWidth);
  const warnings: string[] = [];
  const notes: string[] = [];

  let alpha0 = 0;
  let alpha1To23 = 0;
  let alpha24To249 = 0;
  let alpha250Plus = 0;
  let minOpaqueX = imageData.width;
  let minOpaqueY = imageData.height;
  let maxOpaqueX = -1;
  let maxOpaqueY = -1;
  let borderTotal = 0;
  let borderOpaqueCount = 0;
  let topBorderTotal = 0;
  let rightBorderTotal = 0;
  let bottomBorderTotal = 0;
  let leftBorderTotal = 0;
  let topBorderOpaque = 0;
  let rightBorderOpaque = 0;
  let bottomBorderOpaque = 0;
  let leftBorderOpaque = 0;
  let centralTotal = 0;
  let centralOpaque = 0;
  let edgeAdjacentOpaqueCount = 0;
  let edgeAdjacentSuspiciousCount = 0;
  let suspiciousOpaqueCount = 0;
  let suspiciousBorderCount = 0;
  let suspiciousEdgeAdjacentCount = 0;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const alpha = readAlpha(imageData, x, y);
      const rgb = readRgb(imageData, x, y);
      const isOpaque = alpha >= OPAQUE_ALPHA;
      const isBorder = isBorderPixel(imageData.width, imageData.height, x, y, borderWidth);
      const isTopBorder = y < borderWidth;
      const isRightBorder = x >= imageData.width - borderWidth;
      const isBottomBorder = y >= imageData.height - borderWidth;
      const isLeftBorder = x < borderWidth;
      const central = isCentralPixel(imageData.width, imageData.height, x, y);

      if (alpha === 0) {
        alpha0 += 1;
      } else if (alpha < TRANSPARENT_ALPHA) {
        alpha1To23 += 1;
      } else if (alpha < OPAQUE_ALPHA) {
        alpha24To249 += 1;
      } else {
        alpha250Plus += 1;
      }

      if (isBorder) {
        borderTotal += 1;
      }
      if (isTopBorder) {
        topBorderTotal += 1;
      }
      if (isRightBorder) {
        rightBorderTotal += 1;
      }
      if (isBottomBorder) {
        bottomBorderTotal += 1;
      }
      if (isLeftBorder) {
        leftBorderTotal += 1;
      }
      if (central) {
        centralTotal += 1;
      }

      if (!isOpaque) {
        continue;
      }

      minOpaqueX = Math.min(minOpaqueX, x);
      minOpaqueY = Math.min(minOpaqueY, y);
      maxOpaqueX = Math.max(maxOpaqueX, x);
      maxOpaqueY = Math.max(maxOpaqueY, y);

      const suspicious = matchesReferenceBackground(rgb, referenceClusters);

      if (suspicious) {
        suspiciousOpaqueCount += 1;
      }

      if (isBorder) {
        borderOpaqueCount += 1;

        if (suspicious) {
          suspiciousBorderCount += 1;
        }
      }
      if (isTopBorder) {
        topBorderOpaque += 1;
      }
      if (isRightBorder) {
        rightBorderOpaque += 1;
      }
      if (isBottomBorder) {
        bottomBorderOpaque += 1;
      }
      if (isLeftBorder) {
        leftBorderOpaque += 1;
      }
      if (central) {
        centralOpaque += 1;
      }

      if (hasTransparentNeighbor(imageData, x, y, edgeRadius)) {
        edgeAdjacentOpaqueCount += 1;

        if (suspicious) {
          edgeAdjacentSuspiciousCount += 1;
          suspiciousEdgeAdjacentCount += 1;
        }
      }
    }
  }

  const trueAlphaPresence = alpha0 + alpha1To23 + alpha24To249 > 0;
  const alphaDistribution: AlphaDistribution = {
    alpha0,
    alpha0Ratio: ratio(alpha0, totalPixels),
    alpha1To23,
    alpha1To23Ratio: ratio(alpha1To23, totalPixels),
    alpha24To249,
    alpha24To249Ratio: ratio(alpha24To249, totalPixels),
    alpha250Plus,
    alpha250PlusRatio: ratio(alpha250Plus, totalPixels),
    totalPixels,
  };
  const opaqueBBox: OpaqueBoundingBox =
    maxOpaqueX >= 0
      ? {
          areaRatio: ratio((maxOpaqueX - minOpaqueX + 1) * (maxOpaqueY - minOpaqueY + 1), totalPixels),
          height: maxOpaqueY - minOpaqueY + 1,
          isFullImage: minOpaqueX === 0 && minOpaqueY === 0 && maxOpaqueX === imageData.width - 1 && maxOpaqueY === imageData.height - 1,
          touchesBorder: minOpaqueX === 0 || minOpaqueY === 0 || maxOpaqueX === imageData.width - 1 || maxOpaqueY === imageData.height - 1,
          width: maxOpaqueX - minOpaqueX + 1,
          x: minOpaqueX,
          y: minOpaqueY,
        }
      : null;
  const borderOpaqueRatio: BorderOpaqueMetrics = {
    borderWidth,
    count: borderOpaqueCount,
    ratioOfAllPixels: ratio(borderOpaqueCount, totalPixels),
    ratioOfBorder: ratio(borderOpaqueCount, borderTotal),
    sideRatios: {
      bottom: ratio(bottomBorderOpaque, bottomBorderTotal),
      left: ratio(leftBorderOpaque, leftBorderTotal),
      right: ratio(rightBorderOpaque, rightBorderTotal),
      top: ratio(topBorderOpaque, topBorderTotal),
    },
  };
  const edgeAdjacentOpaquePixels: EdgeAdjacentOpaqueMetrics = {
    count: edgeAdjacentOpaqueCount,
    radius: edgeRadius,
    ratioOfOpaque: ratio(edgeAdjacentOpaqueCount, alpha250Plus),
    suspiciousCount: edgeAdjacentSuspiciousCount,
    suspiciousRatioOfEdgeAdjacent: ratio(edgeAdjacentSuspiciousCount, edgeAdjacentOpaqueCount),
  };
  const suspiciousRetainedColorClusters: SuspiciousRetainedColorClusters = {
    borderCount: suspiciousBorderCount,
    borderRatioOfOpaqueBorder: ratio(suspiciousBorderCount, borderOpaqueCount),
    count: suspiciousOpaqueCount,
    edgeAdjacentCount: suspiciousEdgeAdjacentCount,
    edgeAdjacentRatio: ratio(suspiciousEdgeAdjacentCount, edgeAdjacentOpaqueCount),
    matchedReferenceBackground: suspiciousOpaqueCount > 0,
    ratioOfOpaque: ratio(suspiciousOpaqueCount, alpha250Plus),
    referenceClusterCount: referenceClusters.length,
  };
  const sideTouchCount = [
    borderOpaqueRatio.sideRatios.top > 0.2,
    borderOpaqueRatio.sideRatios.right > 0.2,
    borderOpaqueRatio.sideRatios.bottom > 0.2,
    borderOpaqueRatio.sideRatios.left > 0.2,
  ].filter(Boolean).length;
  const subjectDominantSignals: SubjectDominantSignals = {
    borderOpaqueRatio: borderOpaqueRatio.ratioOfBorder,
    centralOpaqueRatio: ratio(centralOpaque, centralTotal),
    fullImageOpaqueBBox: opaqueBBox?.isFullImage ?? false,
    likelySubjectDominant:
      trueAlphaPresence &&
      alphaDistribution.alpha250PlusRatio >= 0.65 &&
      ratio(centralOpaque, centralTotal) >= 0.65 &&
      suspiciousRetainedColorClusters.edgeAdjacentRatio < 0.12,
    opaqueAreaRatio: alphaDistribution.alpha250PlusRatio,
    semiTransparentAreaRatio: alphaDistribution.alpha1To23Ratio + alphaDistribution.alpha24To249Ratio,
    touchesMultipleBorders: sideTouchCount >= 2,
    transparentAreaRatio: alphaDistribution.alpha0Ratio + alphaDistribution.alpha1To23Ratio,
  };

  let classification: TransparentInputQualityClass;

  if (!trueAlphaPresence || alphaDistribution.alpha250PlusRatio > 0.995) {
    classification = "no-alpha-or-jpg-like";
    notes.push("No meaningful alpha separation was detected; use the normal non-alpha conversion path.");
  } else if (subjectDominantSignals.likelySubjectDominant) {
    classification = "subject-dominant-transparent";
    notes.push("Transparent input is subject-dominant; low transparent area is not treated as failure.");
  } else if (
    suspiciousRetainedColorClusters.borderRatioOfOpaqueBorder >= 0.35 &&
    borderOpaqueRatio.ratioOfBorder >= 0.18 &&
    !subjectDominantSignals.likelySubjectDominant
  ) {
    classification = "likely-dirty-background-removal";
    warnings.push("Opaque border pixels strongly match reference border/background colors.");
  } else if (
    suspiciousRetainedColorClusters.edgeAdjacentRatio >= 0.3 ||
    suspiciousRetainedColorClusters.borderRatioOfOpaqueBorder >= 0.08 ||
    (borderOpaqueRatio.ratioOfBorder >= 0.08 && !subjectDominantSignals.likelySubjectDominant)
  ) {
    classification = "needs-review";
    warnings.push("Some opaque border or transparent-edge pixels may be retained background residue.");
  } else {
    classification = "valid-transparent";
    notes.push("Alpha separation looks usable for transparent-input conversion.");
  }

  if (opaqueBBox?.isFullImage && !subjectDominantSignals.likelySubjectDominant) {
    warnings.push("Opaque bounding box spans the full image; review whether this is subject contact or retained background.");
  }
  if (borderOpaqueRatio.ratioOfBorder >= 0.08 && classification !== "subject-dominant-transparent") {
    warnings.push("Opaque pixels touch the image border; transparent cutout quality should be reviewed.");
  }

  return {
    alphaDistribution,
    borderOpaqueRatio,
    classification,
    edgeAdjacentOpaquePixels,
    notes,
    opaqueBBox,
    subjectDominantSignals,
    suspiciousRetainedColorClusters,
    trueAlphaPresence,
    warnings,
  };
}
