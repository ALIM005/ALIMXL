// Pure border preparation. Never changes workbook cells.
import type { PrintRenderPage } from "./print-render";
import type { PrintCellStyle } from "./print-pages";
export interface PrintBorderEdge {
  key: string; axis: "horizontal" | "vertical";
  x: number; y: number; length: number;
  width: number; color: string;
  style: NonNullable<PrintCellStyle["borderStyle"]>;
}
export function collectPrintBorders(page: PrintRenderPage): PrintBorderEdge[] {
  const edges = new Map<string, PrintBorderEdge>();
  for (const row of page.rows) for (const cell of row.cells) {
    const s = cell.style;
    if (!s?.borders) continue;
    const width = Number.isFinite(s.borderWidth) ? Math.max(0, s.borderWidth ?? 2) : 2;
    if (width === 0) continue;
    const add = (key: string, axis: PrintBorderEdge["axis"], x: number, y: number, length: number) => {
      const candidate: PrintBorderEdge = { key, axis, x, y, length, width, color: s.borderColor || "#000000", style: s.borderStyle || "solid" };
      const geometryKey = `${axis}:${x}:${y}:${length}`;
      const previous = edges.get(geometryKey);
      // Equal-width conflicts use the later (lower/right) cell deterministically.
      if (!previous || candidate.width >= previous.width) edges.set(geometryKey, candidate);
    };
    if (s.borders.top) add(`h:${cell.row}:${cell.col}`, "horizontal", cell.x, cell.y, cell.width);
    if (s.borders.bottom) add(`h:${cell.row + 1}:${cell.col}`, "horizontal", cell.x, cell.y + cell.height, cell.width);
    if (s.borders.left) add(`v:${cell.row}:${cell.col}`, "vertical", cell.x, cell.y, cell.height);
    if (s.borders.right) add(`v:${cell.row}:${cell.col + 1}`, "vertical", cell.x + cell.width, cell.y, cell.height);
  }
  return Array.from(edges.values());
}
