// Browser-side print measurement. Use the same font descriptor as PagePreview.
import type { PrintCellStyle } from "./print-pages";

export function createPrintTextMeasurer(): (
  text: string, fontSize: number, style?: PrintCellStyle,
) => number {
  if (typeof document === "undefined") {
    throw new Error("Print text measurement requires a browser.");
  }
  const context = document.createElement("canvas").getContext("2d");
  if (!context) throw new Error("Print text measurement is unavailable.");
  const cache = new Map<string, number>();
  return (text, fontSize, style) => {
    const font = `${style?.italic ? "italic " : ""}${style?.bold ? "700" : "400"} ${fontSize}px ${style?.fontFamily || "Arial, sans-serif"}`;
    const direction = style?.textDirection || "ltr";
    const key = `${font}\u0000${direction}\u0000${text}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    context.font = font;
    context.direction = direction;
    const width = context.measureText(text).width;
    if (!Number.isFinite(width) || width < 0) {
      throw new Error("Invalid measured text width.");
    }
    if (cache.size < 20000) cache.set(key, width);
    return width;
  };
}
