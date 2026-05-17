import * as fs from "node:fs";
import * as path from "node:path";

type PaletteCsvRow = {
  brand: string;
  palette_id: string;
  version: string;
  code: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  family: string;
  source: string;
  source_url: string;
  last_checked: string;
  confidence: string;
};

const SOURCE_URL = "https://bitbead.pomodiary.com/zh/colors/mard";
const PALETTE_ID = "mard221";
const PALETTE_VERSION = "mard221-public-page-draft-2026-05-17";
const SOURCE_KIND = "reference-page";
const CONFIDENCE = "medium";

const CSV_OUTPUT_PATH = path.join(process.cwd(), "data/palettes/mard221.csv");
const GENERATED_OUTPUT_PATH = path.join(process.cwd(), "src/palettes/generated/mard221.ts");

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  hue = Math.round(hue * 60);
  if (hue < 0) {
    hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return { h: hue, l: lightness, s: saturation };
}

function inferFamily(hex: string) {
  const rgb = hexToRgb(hex);
  const { h, l, s } = rgbToHsl(rgb);
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  if (max <= 28) {
    return "black";
  }

  if (s <= 0.06) {
    if (l >= 0.94) {
      return "white";
    }
    if (l >= 0.82) {
      return "gray";
    }
    if (l <= 0.22) {
      return "black";
    }
    return "gray";
  }

  if (h >= 18 && h < 50) {
    if (l >= 0.84) {
      return "cream";
    }
    if (l >= 0.68 && s <= 0.42) {
      return "tan";
    }
    if (l <= 0.42) {
      return "brown";
    }
    if (s <= 0.5) {
      return "peach";
    }
  }

  if (h >= 0 && h < 12) {
    return l <= 0.38 ? "brown" : "red";
  }

  if (h >= 12 && h < 28) {
    return l <= 0.45 ? "brown" : "orange";
  }

  if (h >= 28 && h < 46) {
    return l <= 0.48 ? "brown" : "orange";
  }

  if (h >= 46 && h < 70) {
    return l >= 0.82 ? "cream" : "yellow";
  }

  if (h >= 70 && h < 95) {
    return "olive";
  }

  if (h >= 95 && h < 155) {
    return "green";
  }

  if (h >= 155 && h < 190) {
    return "cyan";
  }

  if (h >= 190 && h < 255) {
    return "blue";
  }

  if (h >= 255 && h < 320) {
    return l >= 0.7 ? "purple" : "blue";
  }

  if (h >= 320 && h < 345) {
    return l >= 0.7 ? "pink" : "purple";
  }

  if (h >= 345) {
    return l >= 0.7 ? "pink" : "red";
  }

  if (l <= 0.28 && s <= 0.35) {
    return "neutral";
  }

  return "other";
}

function naturalCodeCompare(left: string, right: string) {
  const leftMatch = left.match(/^([A-Za-z]+)(\d+)$/);
  const rightMatch = right.match(/^([A-Za-z]+)(\d+)$/);

  if (!leftMatch || !rightMatch) {
    return left.localeCompare(right);
  }

  if (leftMatch[1] !== rightMatch[1]) {
    return leftMatch[1].localeCompare(rightMatch[1]);
  }

  return Number.parseInt(leftMatch[2], 10) - Number.parseInt(rightMatch[2], 10);
}

function parsePaletteRows(html: string, lastChecked: string) {
  const cardRegex =
    /<a href="\/zh\/colors\/mard\/([A-Za-z0-9]+)"[^>]*>[\s\S]*?<div class="truncate font-medium text-body">\s*([A-Za-z0-9]+)\s*<\/div><div class="font-mono text-body">\s*(#[0-9A-Fa-f]{6})\s*<\/div>[\s\S]*?<\/a>/g;

  const byCode = new Map<string, PaletteCsvRow>();
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null) {
    const hrefCode = match[1].toUpperCase();
    const visibleCode = match[2].toUpperCase();
    const code = hrefCode === visibleCode ? hrefCode : visibleCode;
    const hex = match[3].toUpperCase();
    const rgb = hexToRgb(hex);

    byCode.set(code, {
      brand: "MARD",
      code,
      confidence: CONFIDENCE,
      family: inferFamily(hex),
      g: rgb.g,
      hex,
      last_checked: lastChecked,
      palette_id: PALETTE_ID,
      r: rgb.r,
      source: SOURCE_KIND,
      source_url: SOURCE_URL,
      version: PALETTE_VERSION,
      b: rgb.b,
    });
  }

  const rows = Array.from(byCode.values()).sort((left, right) => naturalCodeCompare(left.code, right.code));

  if (rows.length < 200) {
    throw new Error(
      `Failed to parse enough MARD colors from ${SOURCE_URL}. Expected roughly 221 rows but found ${rows.length}. The page structure may have changed.`,
    );
  }

  return rows;
}

function toCsv(rows: PaletteCsvRow[]) {
  const header = [
    "brand",
    "palette_id",
    "version",
    "code",
    "hex",
    "r",
    "g",
    "b",
    "family",
    "source",
    "source_url",
    "last_checked",
    "confidence",
  ];

  return [
    header.join(","),
    ...rows.map((row) =>
      [
        row.brand,
        row.palette_id,
        row.version,
        row.code,
        row.hex,
        row.r,
        row.g,
        row.b,
        row.family,
        row.source,
        row.source_url,
        row.last_checked,
        row.confidence,
      ].join(","),
    ),
  ].join("\n");
}

function toGeneratedTs(rows: PaletteCsvRow[]) {
  const generatedRows = rows.map((row) => ({
    code: row.code,
    family: row.family,
    hex: row.hex,
    rgb: { r: row.r, g: row.g, b: row.b },
  }));

  const serializedRows = JSON.stringify(generatedRows, null, 2);

  return `import type { BeadColor, BeadColorFamily, BeadPalette, RGB } from "@/types/pattern";

type MardPaletteRow = {
  code: string;
  family: BeadColorFamily;
  hex: string;
  rgb: RGB;
};

const mard221Rows: MardPaletteRow[] = ${serializedRows};

function createMardColor(row: MardPaletteRow): BeadColor {
  return {
    availability: "unknown",
    brand: "MARD",
    code: row.code,
    displayName: row.code,
    family: row.family,
    hex: row.hex,
    id: \`mard221:\${row.code}\`,
    name: row.code,
    rgb: row.rgb,
    source: "reference-page",
  };
}

export const mard221PaletteDefinition: BeadPalette = {
  id: "mard221",
  brand: "MARD",
  colors: mard221Rows.map(createMardColor),
  source: "reference-page",
  version: "${PALETTE_VERSION}",
};

export const mard221Palette = mard221PaletteDefinition.colors;
`;
}

async function main() {
  const lastChecked = new Date().toISOString().slice(0, 10);
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "bead-pattern-web palette importer",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const rows = parsePaletteRows(html, lastChecked);

  fs.mkdirSync(path.dirname(CSV_OUTPUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(GENERATED_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(CSV_OUTPUT_PATH, `${toCsv(rows)}\n`, "utf8");
  fs.writeFileSync(GENERATED_OUTPUT_PATH, toGeneratedTs(rows), "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        colorsImported: rows.length,
        csv: path.relative(process.cwd(), CSV_OUTPUT_PATH),
        generated: path.relative(process.cwd(), GENERATED_OUTPUT_PATH),
        sourceUrl: SOURCE_URL,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[importMardPalette] ${message}\n`);
  process.exitCode = 1;
});
