// Pure print snapshot: formatted values and optional row fitting never mutate the workbook.
import type { PrintScaleRequest, PrintSheetLike } from "./print-pages";
import { computePrintPages, resolvePrintScale } from "./print-pages";
import { getLayoutContentRange } from "./print-layout";
import { buildPrintRender, buildRenderPage, buildRenderRow, type PrintRenderOptions } from "./print-render";

export interface PrintPreparationSettings extends PrintScaleRequest {
  autoFitRowHeight?: boolean;
  wrapTextForPrint?: boolean;
}
export function preparePrintDocument<T extends PrintPreparationSettings>(
  source: PrintSheetLike, requested: T, getDisplayValue: (key: string) => string,
  measureText?: PrintRenderOptions["measureText"],
) {
  const range = getLayoutContentRange(source, requested.printArea);
  const limit = 200_000;
  if (range && (range.r2 - range.r1 + 1) > Math.floor(limit / (range.c2 - range.c1 + 1))) {
    throw new RangeError("Print preparation-এর 200,000 cell limit ছাড়িয়েছে। Print area ছোট করুন।");
  }
  const snapshot: PrintSheetLike = { ...source, cells: {}, colWidths: { ...source.colWidths }, rowHeights: { ...source.rowHeights } };
  if (range) {
    for (let row = range.r1; row <= range.r2; row += 1) for (let col = range.c1; col <= range.c2; col += 1) {
      const key = createKey(row, col);
      const cell = source.cells[key];
      if (!cell) continue;
      snapshot.cells[key] = { ...cell, value: getDisplayValue(key), style: {
        ...cell.style,
        ...(cell.style?.borders ? { borders: { ...cell.style.borders } } : {}),
        ...(requested.wrapTextForPrint ? { wrap: true } : {}),
      } };
    }
    if (requested.autoFitRowHeight) {
      for (let row = range.r1; row <= range.r2; row += 1) {
        const rendered = buildRenderRow(snapshot, row, range.c1, range.c2, 0, { measureText });
        let height = rendered.height;
        for (const cell of rendered.cells) {
          const border = Number.isFinite(cell.style?.borderWidth) ? Math.max(0, cell.style?.borderWidth ?? 2) : 2;
          const extra = (cell.style?.borders?.top ? border : 0) + (cell.style?.borders?.bottom ? border : 0);
          height = Math.max(height, Math.ceil(cell.textHeight + extra + 1));
        }
        snapshot.rowHeights[row] = height;
      }
    }
  }
  // Preserve the source range even when a formula displays an empty string.
  const effectiveArea = range ? `${createKey(range.r1, range.c1)}:${createKey(range.r2, range.c2)}` : requested.printArea;
  const settings = { ...requested, margins: { ...requested.margins }, scale: resolvePrintScale(snapshot, { ...requested, printArea: effectiveArea }) };
  const definitions = computePrintPages(snapshot, settings.paperSize, settings.orientation, settings.margins, settings.scale, effectiveArea, settings);
  const rendered = buildPrintRender(snapshot, definitions, { includeEmptyCells: true, maxTotalCells: limit, measureText });
  const count = range ? (range.r2 - range.r1 + 1) * (range.c2 - range.c1 + 1) : 0;
  const canEdit = !!range && count <= 5_000 && range.r2 - range.r1 < 500 && range.c2 - range.c1 < 100;
  const overview = canEdit && range ? buildRenderPage(snapshot, { ...range, pageNumber: 1 }, { measureText, maxCellsPerPage: 5_000 }) : undefined;
  return { settings, pages: rendered.pages, overview,
    overviewMessage: !canEdit && range ? "বড় range-এর drag editor বন্ধ (সর্বোচ্চ 5,000 cell, 500 row, 100 column)। Print area ছোট করুন; সংখ্যায় break নিয়ন্ত্রণ ব্যবহার করতে পারবেন।" : undefined };
}

function createKey(row: number, col: number): string {
  let n = col + 1, letters = "";
  while (n > 0) { letters = String.fromCharCode(65 + (n - 1) % 26) + letters; n = Math.floor((n - 1) / 26); }
  return `${letters}${row + 1}`;
}
