import { commonPaletteDefinition } from "./common";
import { mard221PaletteDefinition } from "./generated/mard221";
import type { BeadColor, BeadPalette } from "@/types/pattern";

export const builtInPalettes: BeadPalette[] = [commonPaletteDefinition, mard221PaletteDefinition];

const builtInPaletteMap = new Map(builtInPalettes.map((palette) => [palette.id, palette]));

export const defaultPaletteDefinition = commonPaletteDefinition;

export function getBuiltInPalette(paletteId: string) {
  return builtInPaletteMap.get(paletteId) ?? null;
}

export function getPaletteColors(palette: BeadPalette | BeadColor[]) {
  return Array.isArray(palette) ? palette : palette.colors;
}

export function createPaletteColorMap(palette: BeadPalette | BeadColor[]) {
  return new Map(getPaletteColors(palette).map((color) => [color.id, color]));
}
