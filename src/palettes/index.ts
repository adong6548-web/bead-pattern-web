import { commonPaletteDefinition } from "./common";
import type { BeadColor, BeadPalette } from "@/types/pattern";

export const builtInPalettes: BeadPalette[] = [commonPaletteDefinition];

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
