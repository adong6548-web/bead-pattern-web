import type { BeadColor, BeadColorFamily, BeadPalette, RGB } from "@/types/pattern";

type CommonPaletteColorInput = {
  id: string;
  name: string;
  family: BeadColorFamily;
  hex: string;
  rgb: RGB;
};

function createCommonColor({ id, name, family, hex, rgb }: CommonPaletteColorInput): BeadColor {
  return {
    availability: "available",
    brand: "common",
    code: id,
    displayName: name,
    family,
    hex,
    id,
    name,
    rgb,
    source: "built-in",
  };
}

const commonPaletteColors: BeadColor[] = [
  createCommonColor({ id: "C01", name: "White", family: "white", hex: "#ffffff", rgb: { r: 255, g: 255, b: 255 } }),
  createCommonColor({ id: "C02", name: "Cream", family: "cream", hex: "#f6e7c9", rgb: { r: 246, g: 231, b: 201 } }),
  createCommonColor({ id: "C03", name: "Light Yellow", family: "yellow", hex: "#f8e36c", rgb: { r: 248, g: 227, b: 108 } }),
  createCommonColor({ id: "C04", name: "Yellow", family: "yellow", hex: "#f5c542", rgb: { r: 245, g: 197, b: 66 } }),
  createCommonColor({ id: "C05", name: "Orange", family: "orange", hex: "#ef8a35", rgb: { r: 239, g: 138, b: 53 } }),
  createCommonColor({ id: "C06", name: "Coral", family: "red", hex: "#ef6f61", rgb: { r: 239, g: 111, b: 97 } }),
  createCommonColor({ id: "C07", name: "Red", family: "red", hex: "#d93a32", rgb: { r: 217, g: 58, b: 50 } }),
  createCommonColor({ id: "C08", name: "Deep Red", family: "red", hex: "#9f2f2f", rgb: { r: 159, g: 47, b: 47 } }),
  createCommonColor({ id: "C09", name: "Pink", family: "pink", hex: "#f3a7c4", rgb: { r: 243, g: 167, b: 196 } }),
  createCommonColor({ id: "C10", name: "Hot Pink", family: "pink", hex: "#e85c9e", rgb: { r: 232, g: 92, b: 158 } }),
  createCommonColor({ id: "C11", name: "Lavender", family: "purple", hex: "#bda7e8", rgb: { r: 189, g: 167, b: 232 } }),
  createCommonColor({ id: "C12", name: "Purple", family: "purple", hex: "#7c5bb8", rgb: { r: 124, g: 91, b: 184 } }),
  createCommonColor({ id: "C13", name: "Navy", family: "blue", hex: "#25365f", rgb: { r: 37, g: 54, b: 95 } }),
  createCommonColor({ id: "C14", name: "Blue", family: "blue", hex: "#2f6fb3", rgb: { r: 47, g: 111, b: 179 } }),
  createCommonColor({ id: "C15", name: "Sky Blue", family: "cyan", hex: "#68b8df", rgb: { r: 104, g: 184, b: 223 } }),
  createCommonColor({ id: "C16", name: "Ice Blue", family: "cyan", hex: "#b9e3ee", rgb: { r: 185, g: 227, b: 238 } }),
  createCommonColor({ id: "C17", name: "Teal", family: "cyan", hex: "#2e9a9a", rgb: { r: 46, g: 154, b: 154 } }),
  createCommonColor({ id: "C18", name: "Mint", family: "green", hex: "#9edec0", rgb: { r: 158, g: 222, b: 192 } }),
  createCommonColor({ id: "C19", name: "Green", family: "green", hex: "#3f9a4d", rgb: { r: 63, g: 154, b: 77 } }),
  createCommonColor({ id: "C20", name: "Light Green", family: "green", hex: "#9ccc65", rgb: { r: 156, g: 204, b: 101 } }),
  createCommonColor({ id: "C21", name: "Olive", family: "olive", hex: "#758545", rgb: { r: 117, g: 133, b: 69 } }),
  createCommonColor({ id: "C22", name: "Tan", family: "tan", hex: "#c49a6c", rgb: { r: 196, g: 154, b: 108 } }),
  createCommonColor({ id: "C23", name: "Brown", family: "brown", hex: "#8a5a3c", rgb: { r: 138, g: 90, b: 60 } }),
  createCommonColor({ id: "C24", name: "Dark Brown", family: "brown", hex: "#56372b", rgb: { r: 86, g: 55, b: 43 } }),
  createCommonColor({ id: "C25", name: "Peach", family: "peach", hex: "#f2bd9b", rgb: { r: 242, g: 189, b: 155 } }),
  createCommonColor({ id: "C26", name: "Skin", family: "skin", hex: "#e6a57e", rgb: { r: 230, g: 165, b: 126 } }),
  createCommonColor({ id: "C27", name: "Gray", family: "gray", hex: "#8c9396", rgb: { r: 140, g: 147, b: 150 } }),
  createCommonColor({ id: "C28", name: "Light Gray", family: "gray", hex: "#c7ced1", rgb: { r: 199, g: 206, b: 209 } }),
  createCommonColor({ id: "C29", name: "Charcoal", family: "neutral", hex: "#3f4648", rgb: { r: 63, g: 70, b: 72 } }),
  createCommonColor({ id: "C30", name: "Black", family: "black", hex: "#151515", rgb: { r: 21, g: 21, b: 21 } }),
  createCommonColor({ id: "C31", name: "Aqua", family: "cyan", hex: "#50c8c8", rgb: { r: 80, g: 200, b: 200 } }),
  createCommonColor({ id: "C32", name: "Burgundy", family: "red", hex: "#7b2741", rgb: { r: 123, g: 39, b: 65 } }),
];

export const commonPaletteDefinition: BeadPalette = {
  id: "common",
  brand: "Common",
  colors: commonPaletteColors,
  source: "built-in",
  version: "2026-05-common-v1",
};

export const commonPalette = commonPaletteDefinition.colors;
