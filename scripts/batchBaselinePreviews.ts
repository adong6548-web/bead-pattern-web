import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { createJiti } from "jiti";

type PatternMode = "pixel-art" | "illustration" | "anime-lineart" | "pet-photo" | "portrait-photo";

type BeadColorLike = {
  code: string;
  name: string;
  displayName: string;
  hex: string;
};

type BeadCellLike = {
  color: BeadColorLike | null;
  isIgnoredBackground: boolean;
};

type PatternResultLike = {
  width: number;
  height: number;
  grid: BeadCellLike[][];
  colorCounts: Array<{
    color: BeadColorLike;
    count: number;
  }>;
  totalBeads: number;
  ignoredBackgroundCells: number;
  usedColorCount: number;
};

type GeneratePatternFn = (
  imageData: ImageData,
  options: {
    width: number;
    height: number;
    mode: PatternMode;
    colorLimit: number;
  },
) => PatternResultLike;

type CliOptions = {
  baselineDir: string;
  inputDir: string;
  outputDir: string;
};

type TestImage = {
  filename: string;
  required: boolean;
  modes: PatternMode[];
};

type CaseSummary = {
  sourceImagePath: string;
  mode: PatternMode;
  width: number;
  height: number;
  colorLimit: number;
  usedColorCount: number;
  totalBeads: number;
  ignoredBackgroundCells: number;
  topColors: Array<{
    code: string;
    name: string;
    count: number;
  }>;
  before?: {
    previewPath: string;
    jsonPath: string;
    usedColorCount: number | null;
  };
  previewPath: string;
  jsonPath: string;
};

const DEFAULT_INPUT_DIR = "/Users/jinnianfadacai/Desktop/bead-test-set";
const DEFAULT_OUTPUT_DIR = "/Users/jinnianfadacai/Desktop/bead-preview-4j1-baseline";
const COLOR_LIMIT = 24;
const SIZES = [
  { width: 40, height: 80 },
  { width: 48, height: 96 },
];
const TEST_IMAGES: TestImage[] = [
  { filename: "pet-light-on-busy-background.jpg", required: true, modes: ["pet-photo"] },
  { filename: "pet-dark-on-dark-background.jpg", required: true, modes: ["pet-photo"] },
  { filename: "pet-clean-background-control.jpg", required: true, modes: ["pet-photo"] },
  { filename: "pet-warm-on-warm-background.jpg", required: false, modes: ["pet-photo"] },
  { filename: "non-pet-portrait-control.jpg", required: false, modes: ["portrait-photo", "pet-photo"] },
];

const jiti = createJiti(import.meta.url, {
  alias: {
    "@": path.join(process.cwd(), "src"),
  },
  moduleCache: false,
});

function parseArgs(argv: string[]): CliOptions {
  let baselineDir = "";
  let inputDir = DEFAULT_INPUT_DIR;
  let outputDir = DEFAULT_OUTPUT_DIR;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--baseline-dir":
        baselineDir = next ?? "";
        index += 1;
        break;
      case "--input-dir":
        inputDir = next ?? "";
        index += 1;
        break;
      case "--output-dir":
        outputDir = next ?? "";
        index += 1;
        break;
      case "--help":
        process.stdout.write(`Usage:
  node --experimental-strip-types scripts/batchBaselinePreviews.ts [options]

Options:
  --baseline-dir <path> Baseline output folder to copy as before-* artifacts
  --input-dir <path>    Test image folder (default: ${DEFAULT_INPUT_DIR})
  --output-dir <path>   Output folder (default: ${DEFAULT_OUTPUT_DIR})
`);
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  return {
    baselineDir: baselineDir ? path.resolve(baselineDir) : "",
    inputDir: path.resolve(inputDir),
    outputDir: path.resolve(outputDir),
  };
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

function extractMaskedChannel(pixel: number, mask: number) {
  if (!mask) {
    return 255;
  }

  const shift = maskShift(mask);
  const max = (mask >>> shift) >>> 0;
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
  const tempBmpPath = path.join(os.tmpdir(), `bead-pattern-baseline-${process.pid}-${Date.now()}.bmp`);

  try {
    execFileSync("sips", ["-s", "format", "bmp", imagePath, "--out", tempBmpPath], {
      encoding: "utf8",
      stdio: "pipe",
    });

    const normalizedBmpPath = fs.existsSync(tempBmpPath) ? tempBmpPath : tempBmpPath.replace("/tmp/", "/private/tmp/");
    return parseBmpImageData(fs.readFileSync(normalizedBmpPath));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decode local image via macOS sips: ${message}`);
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

async function loadGeneratePattern() {
  const generatePatternModule = (await jiti.import(path.join(process.cwd(), "src/engine/generatePattern.ts"))) as {
    generatePattern: GeneratePatternFn;
  };

  return generatePatternModule.generatePattern;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function writeBmpPreview(pattern: PatternResultLike, bmpPath: string, cellSize = 10) {
  const width = pattern.width * cellSize;
  const height = pattern.height * cellSize;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);

  buffer.write("BM", 0, "ascii");
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelDataSize, 34);

  for (let y = 0; y < height; y += 1) {
    const sourceY = pattern.height - 1 - Math.floor(y / cellSize);
    const rowOffset = 54 + y * rowSize;

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.floor(x / cellSize);
      const cell = pattern.grid[sourceY]?.[sourceX];
      const rgb = cell?.isIgnoredBackground || !cell?.color ? { r: 255, g: 255, b: 255 } : hexToRgb(cell.color.hex);
      const offset = rowOffset + x * 3;

      buffer[offset] = rgb.b;
      buffer[offset + 1] = rgb.g;
      buffer[offset + 2] = rgb.r;
    }
  }

  fs.writeFileSync(bmpPath, buffer);
}

function writePngPreview(pattern: PatternResultLike, outputPath: string) {
  const tempBmpPath = path.join(os.tmpdir(), `bead-pattern-preview-${process.pid}-${Date.now()}.bmp`);

  try {
    writeBmpPreview(pattern, tempBmpPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    execFileSync("sips", ["-s", "format", "png", tempBmpPath, "--out", outputPath], {
      encoding: "utf8",
      stdio: "pipe",
    });
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

function summarizePattern(sourceImagePath: string, mode: PatternMode, pattern: PatternResultLike, previewPath: string, jsonPath: string): CaseSummary {
  return {
    colorLimit: COLOR_LIMIT,
    height: pattern.height,
    ignoredBackgroundCells: pattern.ignoredBackgroundCells,
    jsonPath,
    mode,
    previewPath,
    sourceImagePath,
    topColors: pattern.colorCounts.slice(0, 10).map(({ color, count }) => ({
      code: color.code,
      count,
      name: color.displayName || color.name,
    })),
    totalBeads: pattern.totalBeads,
    usedColorCount: pattern.usedColorCount,
    width: pattern.width,
  };
}

function readUsedColorCount(jsonPath: string) {
  if (!fs.existsSync(jsonPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as { usedColorCount?: unknown };

    return typeof parsed.usedColorCount === "number" ? parsed.usedColorCount : null;
  } catch {
    return null;
  }
}

function copyBaselineArtifacts(options: CliOptions, imageBaseName: string, outputBaseName: string, caseDir: string) {
  if (!options.baselineDir) {
    return null;
  }

  const sourcePreviewPath = path.join(options.baselineDir, imageBaseName, `${outputBaseName}.png`);
  const sourceJsonPath = path.join(options.baselineDir, imageBaseName, `${outputBaseName}.json`);
  const previewPath = path.join(caseDir, `before-${outputBaseName}.png`);
  const jsonPath = path.join(caseDir, `before-${outputBaseName}.json`);

  if (!fs.existsSync(sourcePreviewPath) || !fs.existsSync(sourceJsonPath)) {
    return null;
  }

  fs.copyFileSync(sourcePreviewPath, previewPath);
  fs.copyFileSync(sourceJsonPath, jsonPath);

  return {
    jsonPath,
    previewPath,
    usedColorCount: readUsedColorCount(sourceJsonPath),
  };
}

function writeCaseMarkdown(caseDir: string, imageName: string, summaries: CaseSummary[]) {
  const lines = [
    `# ${imageName}`,
    "",
    "| Mode | Size | Before colors | After colors | Total beads | Ignored background | Before preview | After preview | After JSON |",
    "|---|---:|---:|---:|---:|---:|---|---|---|",
    ...summaries.map(
      (summary) =>
        `| ${summary.mode} | ${summary.width}x${summary.height} | ${summary.before?.usedColorCount ?? "n/a"} | ${summary.usedColorCount} | ${summary.totalBeads} | ${summary.ignoredBackgroundCells} | ${summary.before ? path.basename(summary.before.previewPath) : "n/a"} | ${path.basename(summary.previewPath)} | ${path.basename(summary.jsonPath)} |`,
    ),
    "",
  ];

  fs.writeFileSync(path.join(caseDir, "CASE.md"), `${lines.join("\n")}\n`, "utf8");
}

function writeSummary(outputDir: string, allSummaries: Map<string, CaseSummary[]>, missingOptional: string[]) {
  const lines = [
    "# Batch Pattern Preview Summary",
    "",
    "This report contains batch outputs generated through `generatePattern`. When before artifacts are present, they are copied from the supplied baseline folder.",
    "",
  ];

  if (missingOptional.length > 0) {
    lines.push("Optional files not present:");
    lines.push("");
    for (const filename of missingOptional) {
      lines.push(`- ${filename}`);
    }
    lines.push("");
  }

  for (const [imageName, summaries] of allSummaries) {
    lines.push(`## ${imageName}`);
    lines.push("");
    lines.push("| Mode | Size | Before colors | After colors | Total beads | Ignored background | Before preview | After preview | After JSON | Visual QA focus |");
    lines.push("|---|---:|---:|---:|---:|---:|---|---|---|---|");

    for (const summary of summaries) {
      const qaFocus = [
        "check subject recognizability",
        "silhouette clarity",
        "background distraction",
        "photo-thumbnail vs clean-draft feel",
      ].join("; ");
      lines.push(
        `| ${summary.mode} | ${summary.width}x${summary.height} | ${summary.before?.usedColorCount ?? "n/a"} | ${summary.usedColorCount} | ${summary.totalBeads} | ${summary.ignoredBackgroundCells} | ${summary.before?.previewPath ?? "n/a"} | ${summary.previewPath} | ${summary.jsonPath} | ${qaFocus} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Cross-Case Notes");
  lines.push("");
  lines.push("- Use the generated PNGs for visual scoring from 1 to 5 on recognizability, silhouette, color block cleanliness, detail preservation, background distraction, and material practicality.");
  lines.push("- A candidate should beat the before outputs across the set, not just on one image.");
  lines.push("");

  fs.writeFileSync(path.join(outputDir, "SUMMARY.md"), `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(options.inputDir)) {
    throw new Error(`Missing input directory: ${options.inputDir}`);
  }

  const missingRequired = TEST_IMAGES.filter((image) => image.required && !fs.existsSync(path.join(options.inputDir, image.filename))).map(
    (image) => image.filename,
  );
  if (missingRequired.length > 0) {
    throw new Error(`Missing required test images:\n${missingRequired.map((filename) => `- ${filename}`).join("\n")}`);
  }

  const missingOptional = TEST_IMAGES.filter((image) => !image.required && !fs.existsSync(path.join(options.inputDir, image.filename))).map(
    (image) => image.filename,
  );

  fs.mkdirSync(options.outputDir, { recursive: true });
  const generatePattern = await loadGeneratePattern();
  const allSummaries = new Map<string, CaseSummary[]>();

  for (const testImage of TEST_IMAGES) {
    const sourceImagePath = path.join(options.inputDir, testImage.filename);
    if (!fs.existsSync(sourceImagePath)) {
      continue;
    }

    const imageBaseName = path.basename(testImage.filename, path.extname(testImage.filename));
    const caseDir = path.join(options.outputDir, imageBaseName);
    const imageData = decodeLocalImageToImageData(sourceImagePath);
    const caseSummaries: CaseSummary[] = [];

    fs.mkdirSync(caseDir, { recursive: true });

    for (const mode of testImage.modes) {
      for (const size of SIZES) {
        const pattern = generatePattern(imageData, {
          colorLimit: COLOR_LIMIT,
          height: size.height,
          mode,
          width: size.width,
        });
        const outputBaseName = `${mode}-${size.width}x${size.height}`;
        const before = copyBaselineArtifacts(options, imageBaseName, outputBaseName, caseDir);
        const currentOutputBaseName = options.baselineDir ? `after-${outputBaseName}` : outputBaseName;
        const previewPath = path.join(caseDir, `${currentOutputBaseName}.png`);
        const jsonPath = path.join(caseDir, `${currentOutputBaseName}.json`);
        const summary = summarizePattern(sourceImagePath, mode, pattern, previewPath, jsonPath);

        if (before) {
          summary.before = before;
        }
        writePngPreview(pattern, previewPath);
        fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
        caseSummaries.push(summary);
      }
    }

    writeCaseMarkdown(caseDir, imageBaseName, caseSummaries);
    allSummaries.set(imageBaseName, caseSummaries);
  }

  writeSummary(options.outputDir, allSummaries, missingOptional);

  process.stdout.write(
    `${JSON.stringify(
      {
        outputDir: options.outputDir,
        missingOptional,
        generatedCases: Array.from(allSummaries.entries()).map(([imageName, summaries]) => ({
          imageName,
          summaries,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[batchBaselinePreviews] ${message}\n`);
  process.exitCode = 1;
}
