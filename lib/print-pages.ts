// lib/print-pages.ts
// ALIMXL Print Engine — Pagination.
//
// Computes page ranges using existing sheet row/column dimensions.
// Does not measure text, resolve merged cells, or render content.
// No React, DOM, localStorage, or window.print() usage.
//
// Units:
// - Paper dimensions and margins: millimeters.
// - Sheet row heights and column widths: unscaled CSS pixels.
// - Scale: content magnification percentage, from 10 to 400.
// - Cell coordinates: zero-based and inclusive.

export type PrintPaperSize =
  | "A4"
  | "Letter"
  | "Legal"
  | "A5"
  | "Executive";

export type PrintOrientation = "portrait" | "landscape";

export interface PrintMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PrintPageRange {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface PrintPageDef extends PrintPageRange {
  pageNumber: number;
  /** Source rows inserted before the body on every page (not part of r1:r2). */
  repeatRows?: number[];
}

export interface PrintCellStyle {
  bg?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string;
  /** CSS pixels, matching the worksheet renderer. */
  fontSize?: number;
  align?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  textDirection?: "ltr" | "rtl";
  wrap?: boolean;
  indent?: number;
  borders?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
  borderStyle?: "solid" | "dashed" | "dotted" | "double" | "ridge" | "groove" | "inset" | "outset";
  borderColor?: string;
  borderWidth?: number;
}

export interface PrintSheetLike {
  gridRows: number;
  gridCols: number;

  /**
   * Canonical, uppercase A1 keys, such as A1 or BC25.
   * Cell values are strings.
   */
  cells: Record<
    string,
    | {
         value?: string;
        image?: string;
        hyperlink?: string;
        style?: PrintCellStyle;
      }
    | undefined
  >;

  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
}

export type PrintScalingMode = "percentage" | "fit-width" | "fit-page";

export interface PrintBreakSettings {
  /** Zero-based source indices: start a new page BEFORE these rows/columns. */
  rowBreaksBefore?: number[];
  columnBreaksBefore?: number[];
  repeatFirstRow?: boolean;
  /** Body rows per page; the last total row is also a body row. 0 = automatic. */
  rowsPerPage?: number;
  manualRowBreaks?: boolean;
  manualColumnBreaks?: boolean;
  lastRowIsTotal?: boolean;
}

export function normalizePageBreaks(values: number[] | undefined, start: number, end: number): number[] {
  if (!values) return [];
  if (!Array.isArray(values) || values.length > DEFAULT_MAX_AXIS_ITEMS ||
      values.some(value => !Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError("Page break indices সঠিক নয়।");
  }
  return Array.from(new Set(values.filter(value => value > start && value <= end))).sort((a, b) => a - b);
}

export interface PrintScaleRequest extends PrintBreakSettings {
  paperSize: PrintPaperSize;
  orientation: PrintOrientation;
  margins: PrintMargins;
  scale: number;
  printArea: string;
  scalingMode?: PrintScalingMode;
}

/** Resolve fit modes once. Pass this same percentage to pagination and rendering. */
export function resolvePrintScale(sheet: PrintSheetLike, settings: PrintScaleRequest): number {
  const mode = settings.scalingMode ?? "percentage";
  if (mode !== "percentage" && mode !== "fit-width" && mode !== "fit-page") {
    throw new RangeError("Unsupported print scaling mode.");
  }
  assertGridDimensions(sheet);
  const explicit = settings.printArea.trim();
  const range = explicit ? normalizePrintRange(explicit) : computeSheetBoundingBox(sheet);
  if (explicit && !range) throw new RangeError("Print area সঠিক নয়।");
  const base = mode === "percentage" ? clampNumber(settings.scale, 10, 400) / 100 : 1;
  if (!range || !sheet.gridRows || !sheet.gridCols) return base * 100;
  const r1 = Math.max(0, range.r1), c1 = Math.max(0, range.c1);
  const r2 = Math.min(sheet.gridRows - 1, range.r2), c2 = Math.min(sheet.gridCols - 1, range.c2);
  if (r1 > r2 || c1 > c2) return base * 100;
  if (r2 - r1 + c2 - c1 + 2 > DEFAULT_MAX_AXIS_ITEMS) throw new RangeError("Print area অতিরিক্ত বড়।");
  const area = getPrintableAreaPixels(settings.paperSize, settings.orientation, settings.margins, 100);
  let width = 0, height = 0;
  for (let c = c1; c <= c2; c += 1) width += getSafeColumnWidth(sheet, c);
  for (let r = r1; r <= r2; r += 1) height += getSafeRowHeight(sheet, r);
  let ratio = Math.min(base, mode !== "percentage" ? (area.width - 0.1) / width : base,
    mode === "fit-page" ? (area.height - 0.1) / height : base);
  const header = settings.repeatFirstRow && r2 > r1 ? r1 : null;
  const bodyStart = header === null ? r1 : r1 + 1;
  const rowsPerPage = settings.rowsPerPage ?? 0;
  if (!Number.isSafeInteger(rowsPerPage) || rowsPerPage < 0) throw new RangeError("Rows per page সঠিক নয়।");
  const rowBreaks = normalizePageBreaks(settings.rowBreaksBefore, bodyStart, r2);
  const colBreaks = normalizePageBreaks(settings.columnBreaksBefore, c1, c2);
  const largestSegment = (start: number, end: number, breaks: number[], getSize: (i: number) => number) => {
    const starts = new Set(breaks); let current = 0, maximum = 0;
    for (let i = start; i <= end; i += 1) {
      if (starts.has(i)) { maximum = Math.max(maximum, current); current = 0; }
      current += getSize(i);
    }
    return Math.max(maximum, current);
  };
  // Fit deliberate manual segments rather than silently adding a break inside them.
  if (rowsPerPage || rowBreaks.length || settings.manualRowBreaks) {
    const forced = rowsPerPage ? Array.from({ length: Math.floor((r2 - bodyStart) / rowsPerPage) }, (_, i) => bodyStart + (i + 1) * rowsPerPage).filter(row => !settings.lastRowIsTotal || row !== r2) : rowBreaks;
    const segmentHeight = largestSegment(bodyStart, r2, forced, row => getSafeRowHeight(sheet, row))
      + (header === null ? 0 : getSafeRowHeight(sheet, header));
    ratio = Math.min(ratio, (area.height - 0.1) / segmentHeight);
  }
  if (colBreaks.length || settings.manualColumnBreaks) ratio = Math.min(ratio, (area.width - 0.1) / largestSegment(c1, c2, colBreaks, col => getSafeColumnWidth(sheet, col)));
  const percentage = Math.floor(ratio * 10000) / 100;
  if (!Number.isFinite(percentage) || percentage < 10) throw new RangeError("এই বিন্যাস 10% scale-এও ফিট হচ্ছে না। Print area ছোট করুন।");
  return percentage;
}

export interface PrintPaginationOptions extends PrintBreakSettings {
  /** Maximum returned pages. Exceeding this throws. */
  maxPages?: number;

  /** Maximum rows plus columns scanned for page breaks. */
  maxAxisItems?: number;
}

export interface PrintHeaderFooterContext {
  sheetName?: string;
  workbookName?: string;

  /**
   * Pass the same Date for every page to keep timestamps consistent.
   * If omitted, the current time is used.
   */
  now?: Date;
}

export const PRINT_PX_PER_MM = 96 / 25.4;

export const PRINT_PAPER_SIZES: Record<
  PrintPaperSize,
  { width: number; height: number; label: string }
> = {
  A4: {
    width: 210,
    height: 297,
    label: "A4 — 210 × 297 mm",
  },
  Letter: {
    width: 216,
    height: 279,
    label: "Letter — 216 × 279 mm",
  },
  Legal: {
    width: 216,
    height: 356,
    label: "Legal — 216 × 356 mm",
  },
  A5: {
    width: 148,
    height: 210,
    label: "A5 — 148 × 210 mm",
  },
  Executive: {
    width: 184,
    height: 267,
    label: "Executive — 184 × 267 mm",
  },
};

export const DEFAULT_PRINT_COL_WIDTH = 120;
export const DEFAULT_PRINT_ROW_HEIGHT = 36;

const DEFAULT_MAX_PAGES = 5_000;
const DEFAULT_MAX_AXIS_ITEMS = 200_000;

interface AxisBreak {
  start: number;
  end: number;
}

export function clampNumber(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    minimum > maximum
  ) {
    throw new RangeError("Invalid numeric clamp bounds.");
  }

  if (!Number.isFinite(value)) return minimum;

  return Math.min(maximum, Math.max(minimum, value));
}

function resolvePositiveInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  if (value === undefined) return fallback;

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(
      `${name} must be a positive safe integer.`,
    );
  }

  return value;
}

function assertGridDimensions(sheet: PrintSheetLike): void {
  if (
    !Number.isSafeInteger(sheet.gridRows) ||
    !Number.isSafeInteger(sheet.gridCols) ||
    sheet.gridRows < 0 ||
    sheet.gridCols < 0
  ) {
    throw new RangeError(
      "gridRows and gridCols must be non-negative safe integers.",
    );
  }
}

function assertCellIndex(
  value: number,
  name: string,
): void {
  // Reserve one integer step for converting to one-based indices.
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value >= Number.MAX_SAFE_INTEGER
  ) {
    throw new RangeError(
      `${name} must be a non-negative supported integer.`,
    );
  }
}

export function columnLettersToIndex(
  letters: string,
): number {
  const normalized = letters.trim().toUpperCase();

  if (!/^[A-Z]+$/.test(normalized)) {
    throw new RangeError("Invalid column letters.");
  }

  let oneBasedIndex = 0;

  for (const character of normalized) {
    const digit = character.charCodeAt(0) - 64;

    if (
      oneBasedIndex >
      Math.floor((Number.MAX_SAFE_INTEGER - digit) / 26)
    ) {
      throw new RangeError(
        "Column reference exceeds the supported integer range.",
      );
    }

    oneBasedIndex = oneBasedIndex * 26 + digit;
  }

  return oneBasedIndex - 1;
}

export function columnIndexToLetters(index: number): string {
  assertCellIndex(index, "Column index");

  let value = index + 1;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;

    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

export function parseCellReference(
  reference: string,
): { row: number; col: number } | null {
  const match = /^([A-Za-z]+)([0-9]+)$/.exec(
    reference.trim(),
  );

  if (!match) return null;

  const oneBasedRow = Number(match[2]);

  if (
    !Number.isSafeInteger(oneBasedRow) ||
    oneBasedRow < 1
  ) {
    return null;
  }

  try {
    return {
      row: oneBasedRow - 1,
      col: columnLettersToIndex(match[1]),
    };
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

export function createCellKey(
  row: number,
  col: number,
): string {
  assertCellIndex(row, "Row index");

  return `${columnIndexToLetters(col)}${row + 1}`;
}

export function normalizePrintRange(
  range: string,
): PrintPageRange | null {
  const normalized = range.trim().toUpperCase();

  if (!normalized) return null;

  const match =
    /^([A-Z]+[0-9]+)(?::([A-Z]+[0-9]+))?$/.exec(
      normalized,
    );

  if (!match) return null;

  const start = parseCellReference(match[1]);
  const end = match[2]
    ? parseCellReference(match[2])
    : start;

  if (!start || !end) return null;

  return {
    r1: Math.min(start.row, end.row),
    c1: Math.min(start.col, end.col),
    r2: Math.max(start.row, end.row),
    c2: Math.max(start.col, end.col),
  };
}

export function computeSheetBoundingBox(
  sheet: PrintSheetLike,
): PrintPageRange | null {
  assertGridDimensions(sheet);

  if (sheet.gridRows === 0 || sheet.gridCols === 0) {
    return null;
  }

  let minRow = Number.POSITIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxRow = -1;
  let maxCol = -1;

  for (const key in sheet.cells) {
    if (
      !Object.prototype.hasOwnProperty.call(sheet.cells, key)
    ) {
      continue;
    }

    const cell = sheet.cells[key];

    if (
      !cell?.value?.trim() &&
      !cell?.image &&
      !cell?.hyperlink
    ) {
      continue;
    }

    const position = parseCellReference(key);

    if (
      !position ||
      position.row >= sheet.gridRows ||
      position.col >= sheet.gridCols
    ) {
      continue;
    }

    minRow = Math.min(minRow, position.row);
    minCol = Math.min(minCol, position.col);
    maxRow = Math.max(maxRow, position.row);
    maxCol = Math.max(maxCol, position.col);
  }

  if (maxRow < 0 || maxCol < 0) return null;

  return {
    r1: minRow,
    c1: minCol,
    r2: maxRow,
    c2: maxCol,
  };
}

/**
 * Returns null for empty or syntactically invalid input.
 * computePrintPages() distinguishes those cases.
 */
export function parsePrintAreaBox(
  printArea: string,
): PrintPageRange | null {
  return normalizePrintRange(printArea);
}

export function getSafeColumnWidth(
  sheet: PrintSheetLike,
  column: number,
): number {
  const width = sheet.colWidths[column];

  return Number.isFinite(width) && width > 0
    ? width
    : DEFAULT_PRINT_COL_WIDTH;
}

export function getSafeRowHeight(
  sheet: PrintSheetLike,
  row: number,
): number {
  const height = sheet.rowHeights[row];

  return Number.isFinite(height) && height > 0
    ? height
    : DEFAULT_PRINT_ROW_HEIGHT;
}

export function getPrintablePageDimensions(
  paperSize: PrintPaperSize,
  orientation: PrintOrientation,
): { width: number; height: number } {
  if (
    !Object.prototype.hasOwnProperty.call(
      PRINT_PAPER_SIZES,
      paperSize,
    )
  ) {
    throw new RangeError("Unsupported print paper size.");
  }

  if (
    orientation !== "portrait" &&
    orientation !== "landscape"
  ) {
    throw new RangeError("Unsupported print orientation.");
  }

  const dimensions = PRINT_PAPER_SIZES[paperSize];

  return orientation === "landscape"
    ? {
        width: dimensions.height,
        height: dimensions.width,
      }
    : {
        width: dimensions.width,
        height: dimensions.height,
      };
}

export function getSafePrintMargins(
  margins: PrintMargins,
): PrintMargins {
  const safe = (value: number): number =>
    Number.isFinite(value) ? Math.max(0, value) : 0;

  return {
    top: safe(margins.top),
    right: safe(margins.right),
    bottom: safe(margins.bottom),
    left: safe(margins.left),
  };
}

/**
 * Returns capacity in unscaled sheet CSS pixels, not the physical
 * CSS width/height of the page container.
 *
 * The renderer must apply the same scale to content exactly once.
 */
export function getPrintableAreaPixels(
  paperSize: PrintPaperSize,
  orientation: PrintOrientation,
  margins: PrintMargins,
  scale: number,
): { width: number; height: number } {
  const page = getPrintablePageDimensions(
    paperSize,
    orientation,
  );

  const safeMargins = getSafePrintMargins(margins);

  const scaleFactor =
    clampNumber(
      Number.isFinite(scale) ? scale : 100,
      10,
      400,
    ) / 100;

  const widthMm =
    page.width - safeMargins.left - safeMargins.right;

  const heightMm =
    page.height - safeMargins.top - safeMargins.bottom;

  if (
    !Number.isFinite(widthMm) ||
    !Number.isFinite(heightMm) ||
    widthMm <= 0 ||
    heightMm <= 0
  ) {
    throw new RangeError(
      "Print margins leave no usable page area.",
    );
  }

  return {
    width: (widthMm * PRINT_PX_PER_MM) / scaleFactor,
    height: (heightMm * PRINT_PX_PER_MM) / scaleFactor,
  };
}

function buildAxisBreaks(
  start: number,
  end: number,
  capacity: number,
  getSize: (index: number) => number,
  maxBreaks: number,
  axisName: string,
  forcedBefore: number[] = [],
): AxisBreak[] {
  const breaks: AxisBreak[] = [];

  let currentStart = start;
  let accumulatedSize = 0;
  const forced = new Set(forcedBefore);

  for (let index = start; index <= end; index += 1) {
    const size = getSize(index);

    // This engine does not split one row/column across pages.
    if (size > capacity) {
      throw new RangeError(
        `${axisName} ${index + 1} is larger than the printable ` +
          "capacity. Reduce scale, adjust its size, or change page setup.",
      );
    }

    if (
      index > currentStart &&
      (forced.has(index) || size > capacity - accumulatedSize)
    ) {
      breaks.push({
        start: currentStart,
        end: index - 1,
      });

      // At least one additional break is still needed.
      if (breaks.length >= maxBreaks) {
        throw new RangeError(
          "Pagination exceeds the configured page limit.",
        );
      }

      currentStart = index;
      accumulatedSize = 0;
    }

    accumulatedSize += size;
  }

  breaks.push({ start: currentStart, end });

  return breaks;
}

export function computePrintPages(
  sheet: PrintSheetLike,
  paperSize: PrintPaperSize,
  orientation: PrintOrientation,
  margins: PrintMargins,
  scale: number,
  printArea: string,
  options: PrintPaginationOptions = {},
): PrintPageDef[] {
  assertGridDimensions(sheet);

  const maxPages = resolvePositiveInteger(
    options.maxPages,
    DEFAULT_MAX_PAGES,
    "maxPages",
  );

  const maxAxisItems = resolvePositiveInteger(
    options.maxAxisItems,
    DEFAULT_MAX_AXIS_ITEMS,
    "maxAxisItems",
  );

  const explicitArea = printArea.trim();
  const parsedArea = parsePrintAreaBox(explicitArea);

  if (explicitArea && !parsedArea) {
    throw new RangeError(
      "Invalid print area. Use a cell or range such as A1 or A1:D20.",
    );
  }

  const printableArea = getPrintableAreaPixels(
    paperSize,
    orientation,
    margins,
    scale,
  );

  if (sheet.gridRows === 0 || sheet.gridCols === 0) {
    return [];
  }

  const printRange =
    parsedArea ?? computeSheetBoundingBox(sheet);

  if (!printRange) return [];

  const boundedRange: PrintPageRange = {
    r1: Math.max(0, printRange.r1),
    c1: Math.max(0, printRange.c1),
    r2: Math.min(sheet.gridRows - 1, printRange.r2),
    c2: Math.min(sheet.gridCols - 1, printRange.c2),
  };

  if (
    boundedRange.r1 > boundedRange.r2 ||
    boundedRange.c1 > boundedRange.c2
  ) {
    return [];
  }

  const rowCount = boundedRange.r2 - boundedRange.r1 + 1;
  const columnCount = boundedRange.c2 - boundedRange.c1 + 1;

  if (
    rowCount > maxAxisItems ||
    columnCount > maxAxisItems - rowCount
  ) {
    throw new RangeError(
      `Pagination exceeds the ${maxAxisItems}-item axis scan limit.`,
    );
  }

  const columnBreaks = buildAxisBreaks(
    boundedRange.c1,
    boundedRange.c2,
    printableArea.width,
    (column) => getSafeColumnWidth(sheet, column),
    maxPages,
    "Column",
    normalizePageBreaks(options.columnBreaksBefore, boundedRange.c1, boundedRange.c2),
  );

  const headerRow = options.repeatFirstRow && boundedRange.r2 > boundedRange.r1 ? boundedRange.r1 : null;
  const bodyStart = headerRow === null ? boundedRange.r1 : boundedRange.r1 + 1;
  const rowsPerPage = options.rowsPerPage ?? 0;
  if (!Number.isSafeInteger(rowsPerPage) || rowsPerPage < 0) throw new RangeError("Rows per page সঠিক নয়।");
  const forcedRows = rowsPerPage > 0
    ? Array.from({ length: Math.floor((boundedRange.r2 - bodyStart) / rowsPerPage) }, (_, i) => bodyStart + (i + 1) * rowsPerPage).filter(row => !options.lastRowIsTotal || row !== boundedRange.r2)
    : normalizePageBreaks(options.rowBreaksBefore, bodyStart, boundedRange.r2);
  const headerHeight = headerRow === null ? 0 : getSafeRowHeight(sheet, headerRow);
  if (headerHeight >= printableArea.height) throw new RangeError("Heading-এর জন্য পুরো পৃষ্ঠা লাগছে; scale কমান।");
  const rowBreaks = buildAxisBreaks(
    bodyStart, boundedRange.r2, printableArea.height - headerHeight,
    (row) => getSafeRowHeight(sheet, row), maxPages, "Row", forcedRows,
  );

  if (
    columnBreaks.length >
    Math.floor(maxPages / rowBreaks.length)
  ) {
    throw new RangeError(
      `Pagination exceeds the ${maxPages}-page limit.`,
    );
  }

  const pages: PrintPageDef[] = [];

  // Preserve the original ordering:
  // down the rows first, then move to the next column block.
  for (const columnBreak of columnBreaks) {
    for (const rowBreak of rowBreaks) {
      pages.push({
        r1: rowBreak.start,
        c1: columnBreak.start,
        r2: rowBreak.end,
        c2: columnBreak.end,
        pageNumber: pages.length + 1,
        ...(headerRow === null ? {} : { repeatRows: [headerRow] }),
      });
    }
  }

  return pages;
}

export function resolveHeaderFooterTemplate(
  template: string,
  pageNumber: number,
  totalPages: number,
  context: PrintHeaderFooterContext = {},
): string {
  if (
    !Number.isSafeInteger(totalPages) ||
    totalPages < 1 ||
    !Number.isSafeInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > totalPages
  ) {
    throw new RangeError(
      "Header/footer page numbers must satisfy " +
        "1 <= pageNumber <= totalPages.",
    );
  }

  const now = context.now ?? new Date();

  if (!Number.isFinite(now.getTime())) {
    throw new RangeError("Invalid header/footer date.");
  }

  const replacements: Record<string, string> = {
    "&&": "&",
    "&P": String(pageNumber),
    "&N": String(totalPages),
    "&D": now.toLocaleDateString(),
    "&T": now.toLocaleTimeString(),
    "&A": context.sheetName ?? "",
    "&F": context.workbookName ?? "",
  };

  return template.replace(
    /&&|&[PNDTAF]/g,
    (token) => replacements[token] ?? token,
  );
}