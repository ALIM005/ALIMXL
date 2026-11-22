// lib/print-layout.ts
// ALIMXL Print Engine — Layout data preparation.
//
// Builds cell, row, and page layout data from existing sheet dimensions.
// Does not measure text, resolve merged cells, or render images/charts.
// No React, DOM, localStorage, or window.print() usage.

import type {
  PrintCellStyle,
  PrintPageDef,
  PrintPageRange,
  PrintSheetLike,
} from "./print-pages";

import {
  computeSheetBoundingBox,
  createCellKey,
  getSafeColumnWidth,
  getSafeRowHeight,
  normalizePrintRange,
  parseCellReference,
} from "./print-pages";

export interface PrintLayoutCell {
  row: number;
  col: number;
  key: string;
  value: string;
  hasImage: boolean;
  hasHyperlink: boolean;
    style?: PrintCellStyle;
  width: number;
  height: number;
}

export interface PrintLayoutRow {
  row: number;
  height: number;
  cells: PrintLayoutCell[];
}

export interface PrintLayoutPage {
  page: PrintPageDef;
  rows: PrintLayoutRow[];
  totalWidth: number;
  totalHeight: number;
  isEmpty: boolean;
}

export interface PrintLayoutOptions {
  /**
   * true: preserve every row and cell in the requested page.
   * false: remove completely empty rows and compact the layout.
   *
   * This legacy option does not remove individual empty cells.
   * Keep true for spreadsheet print geometry.
   */
  includeEmptyCells?: boolean;

  /**
   * Maximum requested cells per page/build operation.
   * Checked before constructing layout cells.
   */
  maxCellsPerPage?: number;

  /**
   * Maximum requested cells across one buildPrintLayout() call.
   * Includes empty cells, even if empty rows will be removed.
   */
  maxTotalCells?: number;
}

export interface PrintLayoutResult {
  pages: PrintLayoutPage[];

  /** Materialized cells across all returned pages. */
  totalCells: number;

  /** Materialized rows across pages; repeated rows count again. */
  totalRows: number;

  /** Maximum materialized column count in any returned row. */
  totalColumns: number;
}

const DEFAULT_MAX_CELLS_PER_PAGE = 20_000;
const DEFAULT_MAX_TOTAL_CELLS = 200_000;

function resolvePositiveInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  if (value === undefined) return fallback;

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer.`);
  }

  return value;
}

function getCellLimit(options: PrintLayoutOptions): number {
  return resolvePositiveInteger(
    options.maxCellsPerPage,
    DEFAULT_MAX_CELLS_PER_PAGE,
    "maxCellsPerPage",
  );
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

function assertIndex(
  value: number,
  upperExclusive: number,
  name: string,
): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value >= upperExclusive
  ) {
    throw new RangeError(
      `${name} must be an integer within the sheet bounds.`,
    );
  }
}

function assertRange(
  sheet: PrintSheetLike,
  range: PrintPageRange,
): void {
  assertGridDimensions(sheet);

  assertIndex(range.r1, sheet.gridRows, "r1");
  assertIndex(range.r2, sheet.gridRows, "r2");
  assertIndex(range.c1, sheet.gridCols, "c1");
  assertIndex(range.c2, sheet.gridCols, "c2");

  if (range.r1 > range.r2 || range.c1 > range.c2) {
    throw new RangeError(
      "Layout range start must not exceed its end.",
    );
  }
}

function assertPage(
  sheet: PrintSheetLike,
  page: PrintPageDef,
): void {
  assertRange(sheet, page);
  if (page.repeatRows) {
    if (new Set(page.repeatRows).size !== page.repeatRows.length) throw new RangeError("Duplicate repeated rows.");
    for (const row of page.repeatRows) {
      assertIndex(row, sheet.gridRows, "repeatRow");
      if (row >= page.r1 && row <= page.r2) throw new RangeError("Repeated row overlaps body.");
    }
  }

  if (
    !Number.isSafeInteger(page.pageNumber) ||
    page.pageNumber < 1
  ) {
    throw new RangeError(
      "pageNumber must be a positive safe integer.",
    );
  }
}

function getRangeCellCount(
  range: PrintPageRange,
  limit: number,
): number {
  const rowCount = range.r2 - range.r1 + 1 + ((range as PrintPageDef).repeatRows?.length ?? 0);
  const columnCount = range.c2 - range.c1 + 1;

  // Check before multiplication to avoid an unsafe large product.
  if (rowCount > Math.floor(limit / columnCount)) {
    throw new RangeError(
      `Requested layout exceeds the ${limit}-cell limit.`,
    );
  }

  return rowCount * columnCount;
}

function hasLayoutContent(cell: PrintLayoutCell): boolean {
  return Boolean(
    cell.value.trim() || cell.hasImage || cell.hasHyperlink,
  );
}

function buildCellUnchecked(
  sheet: PrintSheetLike,
  row: number,
  col: number,
): PrintLayoutCell {
  const key = createCellKey(row, col);
  const cell = sheet.cells[key];

  return {
    row,
    col,
    key,
    value: cell?.value ?? "",
    hasImage: Boolean(cell?.image),
    hasHyperlink: Boolean(cell?.hyperlink),
        ...(cell?.style
      ? { style: { ...cell.style } }
      : {}),
    width: getSafeColumnWidth(sheet, col),
    height: getSafeRowHeight(sheet, row),
  };
}

function buildRowUnchecked(
  sheet: PrintSheetLike,
  row: number,
  startColumn: number,
  endColumn: number,
): PrintLayoutRow {
  const cells: PrintLayoutCell[] = [];

  for (let col = startColumn; col <= endColumn; col += 1) {
    cells.push(buildCellUnchecked(sheet, row, col));
  }

  return {
    row,
    height: getSafeRowHeight(sheet, row),
    cells,
  };
}

function buildRowsUnchecked(
  sheet: PrintSheetLike,
  range: PrintPageRange,
): PrintLayoutRow[] {
  const rows: PrintLayoutRow[] = [];

  for (let row = range.r1; row <= range.r2; row += 1) {
    rows.push(
      buildRowUnchecked(sheet, row, range.c1, range.c2),
    );
  }

  return rows;
}

function buildPageUnchecked(
  sheet: PrintSheetLike,
  page: PrintPageDef,
  options: PrintLayoutOptions,
): PrintLayoutPage {
  const allRows = [
    ...(page.repeatRows ?? []).map(row => buildRowUnchecked(sheet, row, page.c1, page.c2)),
    ...buildRowsUnchecked(sheet, page),
  ];

  const rows =
    options.includeEmptyCells === false
      ? allRows.filter((row) => !isLayoutRowEmpty(row))
      : allRows;

  return {
    page: { ...page },
    rows,
    totalWidth: calculateLayoutPageWidth(rows),
    totalHeight: calculateLayoutPageHeight(rows),
    isEmpty: rows.every(isLayoutRowEmpty),
  };
}

export function buildLayoutCell(
  sheet: PrintSheetLike,
  row: number,
  col: number,
): PrintLayoutCell {
  assertGridDimensions(sheet);
  assertIndex(row, sheet.gridRows, "row");
  assertIndex(col, sheet.gridCols, "col");

  return buildCellUnchecked(sheet, row, col);
}

export function buildLayoutRow(
  sheet: PrintSheetLike,
  row: number,
  startColumn: number,
  endColumn: number,
  options: PrintLayoutOptions = {},
): PrintLayoutRow {
  const range: PrintPageRange = {
    r1: row,
    r2: row,
    c1: startColumn,
    c2: endColumn,
  };

  assertRange(sheet, range);
  getRangeCellCount(range, getCellLimit(options));

  return buildRowUnchecked(
    sheet,
    row,
    startColumn,
    endColumn,
  );
}

export function buildLayoutRows(
  sheet: PrintSheetLike,
  startRow: number,
  endRow: number,
  startColumn: number,
  endColumn: number,
  options: PrintLayoutOptions = {},
): PrintLayoutRow[] {
  const range: PrintPageRange = {
    r1: startRow,
    r2: endRow,
    c1: startColumn,
    c2: endColumn,
  };

  assertRange(sheet, range);
  getRangeCellCount(range, getCellLimit(options));

  return buildRowsUnchecked(sheet, range);
}

export function isLayoutRowEmpty(
  row: PrintLayoutRow,
): boolean {
  return row.cells.every((cell) => !hasLayoutContent(cell));
}

export function calculateLayoutPageHeight(
  rows: PrintLayoutRow[],
): number {
  return rows.reduce(
    (total, row) => total + row.height,
    0,
  );
}

export function calculateLayoutPageWidth(
  rows: PrintLayoutRow[],
): number {
  let maximumWidth = 0;

  for (const row of rows) {
    const width = row.cells.reduce(
      (total, cell) => total + cell.width,
      0,
    );

    maximumWidth = Math.max(maximumWidth, width);
  }

  return maximumWidth;
}

export function buildLayoutPage(
  sheet: PrintSheetLike,
  page: PrintPageDef,
  options: PrintLayoutOptions = {},
): PrintLayoutPage {
  assertPage(sheet, page);
  getRangeCellCount(page, getCellLimit(options));

  return buildPageUnchecked(sheet, page, options);
}

export function buildPrintLayout(
  sheet: PrintSheetLike,
  pages: PrintPageDef[],
  options: PrintLayoutOptions = {},
): PrintLayoutResult {
  assertGridDimensions(sheet);

  const maxCellsPerPage = getCellLimit(options);

  const maxTotalCells = resolvePositiveInteger(
    options.maxTotalCells,
    DEFAULT_MAX_TOTAL_CELLS,
    "maxTotalCells",
  );

  // Validate the entire request before allocating layout cells.
  let requestedCells = 0;

  for (const page of pages) {
    assertPage(sheet, page);

    const cellCount = getRangeCellCount(
      page,
      maxCellsPerPage,
    );

    if (cellCount > maxTotalCells - requestedCells) {
      throw new RangeError(
        `Print layout exceeds the ${maxTotalCells}-cell total limit.`,
      );
    }

    requestedCells += cellCount;
  }

  const layoutPages: PrintLayoutPage[] = [];
  let totalCells = 0;
  let totalRows = 0;
  let totalColumns = 0;

  for (const page of pages) {
    const layoutPage = buildPageUnchecked(
      sheet,
      page,
      options,
    );

    layoutPages.push(layoutPage);
    totalRows += layoutPage.rows.length;

    for (const row of layoutPage.rows) {
      totalCells += row.cells.length;
      totalColumns = Math.max(
        totalColumns,
        row.cells.length,
      );
    }
  }

  return {
    pages: layoutPages,
    totalCells,
    totalRows,
    totalColumns,
  };
}

export function getLayoutContentRange(
  sheet: PrintSheetLike,
  printArea: string,
): PrintPageRange | null {
  assertGridDimensions(sheet);

  if (sheet.gridRows === 0 || sheet.gridCols === 0) {
    return null;
  }

  const explicitArea = printArea.trim();

  const range = explicitArea
    ? normalizePrintRange(explicitArea)
    : computeSheetBoundingBox(sheet);

  if (!range) {
    if (explicitArea) {
      throw new RangeError(
        "Invalid print area. Use a cell or range such as A1 or A1:D20.",
      );
    }

    return null;
  }

  if (
    ![range.r1, range.r2, range.c1, range.c2].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    range.r1 > range.r2 ||
    range.c1 > range.c2
  ) {
    throw new RangeError("Invalid print range coordinates.");
  }

  const boundedRange: PrintPageRange = {
    r1: Math.max(0, range.r1),
    c1: Math.max(0, range.c1),
    r2: Math.min(sheet.gridRows - 1, range.r2),
    c2: Math.min(sheet.gridCols - 1, range.c2),
  };

  if (
    boundedRange.r1 > boundedRange.r2 ||
    boundedRange.c1 > boundedRange.c2
  ) {
    return null;
  }

  return boundedRange;
}

export function getLayoutCellPosition(
  key: string,
): { row: number; col: number } | null {
  const position = parseCellReference(key);

  if (
    !position ||
    !Number.isSafeInteger(position.row) ||
    !Number.isSafeInteger(position.col) ||
    position.row < 0 ||
    position.col < 0
  ) {
    return null;
  }

  return position;
}

export function getLayoutCellSize(
  sheet: PrintSheetLike,
  row: number,
  col: number,
): { width: number; height: number } {
  assertGridDimensions(sheet);
  assertIndex(row, sheet.gridRows, "row");
  assertIndex(col, sheet.gridCols, "col");

  return {
    width: getSafeColumnWidth(sheet, col),
    height: getSafeRowHeight(sheet, row),
  };
}

export function isLayoutPageEmpty(
  layoutPage: PrintLayoutPage,
): boolean {
  return layoutPage.isEmpty;
}

export function countLayoutCells(
  layoutPages: PrintLayoutPage[],
): number {
  return layoutPages.reduce(
    (total, page) =>
      total +
      page.rows.reduce(
        (rowTotal, row) => rowTotal + row.cells.length,
        0,
      ),
    0,
  );
}