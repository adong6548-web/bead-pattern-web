import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { createJiti } from "jiti";

type PatternMode = "pixel-art" | "illustration" | "anime-lineart" | "pet-photo" | "portrait-photo";
type InternalPaletteTestId = "common" | "mard221";
type PaletteColorLike = {
  brand: string;
  code: string;
  name: string;
  displayName: string;
};
type GeneratePatternFn = (
  imageData: ImageData,
  options: {
    width?: number;
    height?: number;
    palette?: PaletteColorLike[];
    ignoreWhiteBackground?: boolean;
    trimWhiteBackground?: boolean;
    mode?: PatternMode;
    colorLimit?: number;
  },
) => {
  usedColorCount: number;
  totalBeads: number;
  ignoredBackgroundCells: number;
  colorCounts: Array<{
    color: PaletteColorLike;
    count: number;
  }>;
};
type GetInternalTestPaletteColorsFn = (paletteId: InternalPaletteTestId) => PaletteColorLike[];

type SerializableImageDataInput = {
  width: number;
  height: number;
  data: number[] | Uint8ClampedArray;
};

type CompareCliOptions = {
  colorLimit: number;
  imagePath: string;
  imageDataPath: string;
  mode: PatternMode;
  outputPath: string;
  trimWhiteBackground: boolean;
  ignoreWhiteBackground: boolean;
  width: number;
  height: number;
};

type PaletteSummary = {
  paletteId: InternalPaletteTestId;
  paletteBrand: string;
  width: number;
  height: number;
  mode: PatternMode;
  colorLimit: number;
  usedColorCount: number;
  totalBeads: number;
  ignoredBackgroundCells: number;
  topColors: Array<{
    code: string;
    name: string;
    count: number;
  }>;
  usesRealMardCodes: boolean;
};

const DEFAULT_WIDTH = 40;
const DEFAULT_HEIGHT = 40;
const DEFAULT_COLOR_LIMIT = 12;
const DEFAULT_MODE: PatternMode = "pixel-art";
const MARD_CODE_PATTERN = /^[A-M]\d+$/;
const DEFAULT_OUTPUT_PATH = path.join(os.tmpdir(), "bead-pattern-palette-comparison.json");
const jiti = createJiti(import.meta.url, {
  alias: {
    "@": path.join(process.cwd(), "src"),
  },
  moduleCache: false,
});

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  throw new Error(`Invalid boolean flag value: ${value}`);
}

function parseArgs(argv: string[]): CompareCliOptions {
  let imagePath = "";
  let imageDataPath = "";
  let outputPath = DEFAULT_OUTPUT_PATH;
  let width = DEFAULT_WIDTH;
  let height = DEFAULT_HEIGHT;
  let colorLimit = DEFAULT_COLOR_LIMIT;
  let mode = DEFAULT_MODE;
  let ignoreWhiteBackground = true;
  let trimWhiteBackground = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--image":
        imagePath = next ?? "";
        index += 1;
        break;
      case "--image-data":
        imageDataPath = next ?? "";
        index += 1;
        break;
      case "--output":
        outputPath = next ?? "";
        index += 1;
        break;
      case "--width":
        width = Number.parseInt(next ?? "", 10);
        index += 1;
        break;
      case "--height":
        height = Number.parseInt(next ?? "", 10);
        index += 1;
        break;
      case "--color-limit":
        colorLimit = Number.parseInt(next ?? "", 10);
        index += 1;
        break;
      case "--mode":
        mode = (next ?? DEFAULT_MODE) as PatternMode;
        index += 1;
        break;
      case "--ignore-white-background":
        ignoreWhiteBackground = parseBooleanFlag(next, true);
        index += 1;
        break;
      case "--trim-white-background":
        trimWhiteBackground = parseBooleanFlag(next, true);
        index += 1;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  if (!imageDataPath) {
    if (!imagePath) {
      throw new Error("Missing required --image <path> or --image-data <path> argument.");
    }
  } else if (imagePath) {
    throw new Error("Use either --image-data or --image, not both.");
  }

  return {
    colorLimit,
    height,
    ignoreWhiteBackground,
    imageDataPath: imageDataPath ? path.resolve(imageDataPath) : "",
    imagePath: imagePath ? path.resolve(imagePath) : "",
    mode,
    outputPath: path.resolve(outputPath),
    trimWhiteBackground,
    width,
  };
}

function printHelp() {
  process.stdout.write(`Usage:
  node --experimental-strip-types scripts/comparePalettes.ts (--image <path> | --image-data <path>) [options]

Required:
  --image <path>                Path to a local PNG / JPG / WebP / other sips-readable image
  --image-data <path>           Path to a local JSON file with { width, height, data }

Optional:
  --width <number>              Output bead width (default: ${DEFAULT_WIDTH})
  --height <number>             Output bead height (default: ${DEFAULT_HEIGHT})
  --color-limit <number>        Max colors (default: ${DEFAULT_COLOR_LIMIT})
  --mode <mode>                 pixel-art | illustration | anime-lineart | pet-photo | portrait-photo
  --ignore-white-background     true | false (default: true)
  --trim-white-background       true | false (default: true)
  --output <path>               JSON summary output path (default: ${DEFAULT_OUTPUT_PATH})

Input JSON shape:
  {
    "width": 64,
    "height": 64,
    "data": [255, 255, 255, 255, ...]
  }
`);
}

function loadSerializableImageData(inputPath: string): ImageData {
  const content = fs.readFileSync(inputPath, "utf8");
  const parsed = JSON.parse(content) as Partial<SerializableImageDataInput>;

  if (!parsed || typeof parsed.width !== "number" || typeof parsed.height !== "number" || !Array.isArray(parsed.data)) {
    throw new Error(`Invalid image-data JSON in ${inputPath}. Expected { width, height, data[] }.`);
  }

  const expectedLength = parsed.width * parsed.height * 4;
  if (parsed.data.length !== expectedLength) {
    throw new Error(
      `Invalid RGBA length in ${inputPath}. Expected ${expectedLength} values for ${parsed.width}x${parsed.height}, got ${parsed.data.length}.`,
    );
  }

  return {
    data: new Uint8ClampedArray(parsed.data),
    height: parsed.height,
    width: parsed.width,
  } as ImageData;
}

function maskShift(mask: number) {
  let shift = 0;
  let workingMask = mask >>> 0;

  while ((workingMask & 1) === 0 && shift < 32) {
    workingMask >>>= 1;
    shift += 1;
  }

  return shift;
}

function maskMax(mask: number, shift: number) {
  return (mask >>> shift) >>> 0;
}

function extractMaskedChannel(pixel: number, mask: number) {
  if (!mask) {
    return 255;
  }

  const shift = maskShift(mask);
  const max = maskMax(mask, shift);
  const value = (pixel & mask) >>> shift;

  if (max <= 0 || max === 255) {
    return value;
  }

  return Math.round((value / max) * 255);
}

function parseBmpImageData(buffer: Buffer): ImageData {
  if (buffer.toString("ascii", 0, 2) !== "BM") {
    throw new Error("Decoded BMP is missing BM header.");
  }

  const pixelOffset = buffer.readUInt32LE(10);
  const dibSize = buffer.readUInt32LE(14);
  const width = buffer.readInt32LE(18);
  const rawHeight = buffer.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const topDown = rawHeight < 0;
  const bitsPerPixel = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);

  if (width <= 0 || height <= 0) {
    throw new Error("Decoded BMP has invalid dimensions.");
  }

  if (bitsPerPixel !== 24 && bitsPerPixel !== 32) {
    throw new Error(`Unsupported BMP bit depth: ${bitsPerPixel}. Expected 24 or 32.`);
  }

  if (compression !== 0 && compression !== 3) {
    throw new Error(`Unsupported BMP compression mode: ${compression}. Expected BI_RGB or BI_BITFIELDS.`);
  }

  let redMask = 0x00ff0000;
  let greenMask = 0x0000ff00;
  let blueMask = 0x000000ff;
  let alphaMask = 0xff000000;

  if (compression === 3) {
    if (dibSize < 52) {
      throw new Error("BMP bitfields header is too small to read channel masks.");
    }

    redMask = buffer.readUInt32LE(54);
    greenMask = buffer.readUInt32LE(58);
    blueMask = buffer.readUInt32LE(62);
    alphaMask = dibSize >= 56 ? buffer.readUInt32LE(66) : 0;
  }

  const bytesPerPixel = bitsPerPixel / 8;
  const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceY = topDown ? y : height - 1 - y;
    const rowOffset = pixelOffset + sourceY * rowSize;

    for (let x = 0; x < width; x += 1) {
      const sourceOffset = rowOffset + x * bytesPerPixel;
      const targetOffset = (y * width + x) * 4;

      if (bitsPerPixel === 24) {
        rgba[targetOffset] = buffer[sourceOffset + 2];
        rgba[targetOffset + 1] = buffer[sourceOffset + 1];
        rgba[targetOffset + 2] = buffer[sourceOffset];
        rgba[targetOffset + 3] = 255;
        continue;
      }

      const pixel = buffer.readUInt32LE(sourceOffset);
      rgba[targetOffset] = extractMaskedChannel(pixel, redMask);
      rgba[targetOffset + 1] = extractMaskedChannel(pixel, greenMask);
      rgba[targetOffset + 2] = extractMaskedChannel(pixel, blueMask);
      rgba[targetOffset + 3] = alphaMask ? extractMaskedChannel(pixel, alphaMask) : 255;
    }
  }

  return {
    data: rgba,
    height,
    width,
  } as ImageData;
}

function decodeLocalImageToImageData(imagePath: string): ImageData {
  const tempBmpPath = path.join(os.tmpdir(), `bead-pattern-compare-${process.pid}-${Date.now()}.bmp`);

  try {
    execFileSync("sips", ["-s", "format", "bmp", imagePath, "--out", tempBmpPath], {
      encoding: "utf8",
      stdio: "pipe",
    });

    const normalizedBmpPath = fs.existsSync(tempBmpPath) ? tempBmpPath : tempBmpPath.replace("/tmp/", "/private/tmp/");
    const bmpBuffer = fs.readFileSync(normalizedBmpPath);
    return parseBmpImageData(bmpBuffer);
  } catch (error: unknown) {
    const errorCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    const message = error instanceof Error ? error.message : String(error);

    if (errorCode === "ENOENT" || message.includes("ENOENT")) {
      throw new Error("Real image input requires macOS sips. Use --image-data instead, or run this helper on macOS.");
    }

    throw new Error(`Failed to decode local image via sips: ${message}`);
  } finally {
    const privateTmpPath = tempBmpPath.replace("/tmp/", "/private/tmp/");

    if (fs.existsSync(tempBmpPath)) {
      fs.unlinkSync(tempBmpPath);
    }
    if (privateTmpPath !== tempBmpPath && fs.existsSync(privateTmpPath)) {
      fs.unlinkSync(privateTmpPath);
    }
  }
}

async function loadProjectHelpers() {
  const generatePatternModule = (await jiti.import(path.join(process.cwd(), "src/engine/generatePattern.ts"))) as {
    generatePattern: GeneratePatternFn;
  };
  const paletteModule = (await jiti.import(path.join(process.cwd(), "src/palettes/index.ts"))) as {
    getInternalTestPaletteColors: GetInternalTestPaletteColorsFn;
  };

  return {
    generatePattern: generatePatternModule.generatePattern,
    getInternalTestPaletteColors: paletteModule.getInternalTestPaletteColors,
  };
}

function summarizePaletteRun(
  paletteId: InternalPaletteTestId,
  imageData: ImageData,
  options: CompareCliOptions,
  helpers: {
    generatePattern: GeneratePatternFn;
    getInternalTestPaletteColors: GetInternalTestPaletteColorsFn;
  },
): PaletteSummary {
  const palette = helpers.getInternalTestPaletteColors(paletteId);
  const pattern = helpers.generatePattern(imageData, {
    colorLimit: options.colorLimit,
    height: options.height,
    ignoreWhiteBackground: options.ignoreWhiteBackground,
    mode: options.mode,
    palette,
    trimWhiteBackground: options.trimWhiteBackground,
    width: options.width,
  });

  return {
    colorLimit: options.colorLimit,
    height: options.height,
    ignoredBackgroundCells: pattern.ignoredBackgroundCells,
    mode: options.mode,
    paletteBrand: palette[0]?.brand ?? paletteId,
    paletteId,
    topColors: pattern.colorCounts.slice(0, 10).map(({ color, count }) => ({
      code: color.code,
      count,
      name: color.displayName || color.name,
    })),
    totalBeads: pattern.totalBeads,
    usedColorCount: pattern.usedColorCount,
    usesRealMardCodes: paletteId === "mard221" && pattern.colorCounts.every(({ color }) => MARD_CODE_PATTERN.test(color.code)),
    width: options.width,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const imageData = options.imagePath ? decodeLocalImageToImageData(options.imagePath) : loadSerializableImageData(options.imageDataPath);
  const helpers = await loadProjectHelpers();
  const comparison = {
    imageInputPath: options.imagePath || options.imageDataPath,
    imageInputType: options.imagePath ? "image-file" : "image-data-json",
    imageDataHeight: imageData.height,
    imageDataWidth: imageData.width,
    note: "Current matching still uses the existing RGB-distance path. CIEDE2000/LAB matching remains a later quality step.",
    summaries: [
      summarizePaletteRun("common", imageData, options, helpers),
      summarizePaletteRun("mard221", imageData, options, helpers),
    ],
  };

  const serialized = JSON.stringify(comparison, null, 2);

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${serialized}\n`, "utf8");

  process.stdout.write(serialized);
}

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[comparePalettes] ${message}\n`);
  process.exitCode = 1;
}
