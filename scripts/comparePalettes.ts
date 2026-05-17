import * as fs from "node:fs";
import * as path from "node:path";
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
  imageDataPath: string;
  mode: PatternMode;
  outputPath: string | null;
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
  let imageDataPath = "";
  let outputPath: string | null = null;
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
    throw new Error("Missing required --image-data <path> argument.");
  }

  return {
    colorLimit,
    height,
    ignoreWhiteBackground,
    imageDataPath: path.resolve(imageDataPath),
    mode,
    outputPath: outputPath ? path.resolve(outputPath) : null,
    trimWhiteBackground,
    width,
  };
}

function printHelp() {
  process.stdout.write(`Usage:
  node --experimental-strip-types scripts/comparePalettes.ts --image-data <path> [options]

Required:
  --image-data <path>           Path to a local JSON file with { width, height, data }

Optional:
  --width <number>              Output bead width (default: ${DEFAULT_WIDTH})
  --height <number>             Output bead height (default: ${DEFAULT_HEIGHT})
  --color-limit <number>        Max colors (default: ${DEFAULT_COLOR_LIMIT})
  --mode <mode>                 pixel-art | illustration | anime-lineart | pet-photo | portrait-photo
  --ignore-white-background     true | false (default: true)
  --trim-white-background       true | false (default: true)
  --output <path>               Optional JSON summary output path

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
  const imageData = loadSerializableImageData(options.imageDataPath);
  const helpers = await loadProjectHelpers();
  const comparison = {
    imageDataHeight: imageData.height,
    imageDataWidth: imageData.width,
    note: "Current matching still uses the existing RGB-distance path. CIEDE2000/LAB matching remains a later quality step.",
    summaries: [
      summarizePaletteRun("common", imageData, options, helpers),
      summarizePaletteRun("mard221", imageData, options, helpers),
    ],
  };

  const serialized = JSON.stringify(comparison, null, 2);

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, `${serialized}\n`, "utf8");
  }

  process.stdout.write(serialized);
}

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[comparePalettes] ${message}\n`);
  process.exitCode = 1;
}
