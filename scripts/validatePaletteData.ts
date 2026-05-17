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

const DEFAULT_CSV_PATH = path.join(process.cwd(), "data/palettes/mard221.csv");

function parseCsvRow(line: string): PaletteCsvRow {
  const [brand, palette_id, version, code, hex, r, g, b, family, source, source_url, last_checked, confidence] =
    line.split(",");

  return {
    b: Number.parseInt(b, 10),
    brand,
    code,
    confidence,
    family,
    g: Number.parseInt(g, 10),
    hex,
    last_checked,
    palette_id,
    r: Number.parseInt(r, 10),
    source,
    source_url,
    version,
  };
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function main() {
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH;
  const content = fs.readFileSync(inputPath, "utf8").trim();
  const [header, ...lines] = content.split(/\r?\n/);

  if (!header.includes("brand,palette_id,version,code,hex")) {
    throw new Error(`Unexpected CSV header in ${inputPath}`);
  }

  const rows = lines.filter(Boolean).map(parseCsvRow);
  const anomalies: string[] = [];
  const seenCodes = new Set<string>();

  for (const row of rows) {
    if (seenCodes.has(row.code)) {
      anomalies.push(`Duplicate code: ${row.code}`);
    }
    seenCodes.add(row.code);

    if (!/^#[0-9A-F]{6}$/i.test(row.hex)) {
      anomalies.push(`Invalid HEX for ${row.code}: ${row.hex}`);
      continue;
    }

    const fromHex = hexToRgb(row.hex);
    if (fromHex.r !== row.r || fromHex.g !== row.g || fromHex.b !== row.b) {
      anomalies.push(
        `RGB mismatch for ${row.code}: hex=${row.hex} csv=(${row.r},${row.g},${row.b}) expected=(${fromHex.r},${fromHex.g},${fromHex.b})`,
      );
    }

    if (!row.source_url) {
      anomalies.push(`Missing source_url for ${row.code}`);
    }

    if (!row.confidence) {
      anomalies.push(`Missing confidence for ${row.code}`);
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        anomalies,
        csv: path.relative(process.cwd(), inputPath),
        totalColors: rows.length,
      },
      null,
      2,
    ),
  );

  if (anomalies.length > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[validatePaletteData] ${message}\n`);
  process.exitCode = 1;
}
