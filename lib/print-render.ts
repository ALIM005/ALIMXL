// lib/print-render.ts
// ALIMXL Print Engine — Render-data preparation.
//
// Converts validated layout data into page-relative cell positions
// and estimated wrapped text lines.
//
// Does not draw DOM/Canvas content, resolve merged cells,
// render images/charts, or automatically resize rows.
//
// No React, DOM, localStorage, or window.print() usage.

import type {
  PrintCellStyle,
  PrintPageDef,
  PrintSheetLike,
} from "./print-pages";

import type {
  PrintLayoutCell,
  PrintLayoutOptions,
  PrintLayoutPage,
  PrintLayoutRow,
} from "./print-layout";

import {
  buildLayoutCell,
  buildLayoutPage,
  buildLayoutRow,
  buildLayoutRows,
  buildPrintLayout,
} from "./print-layout";

export interface PrintRenderCell {
  row: number;
  col: number;
  key: string;
  value: string;
  hasImage: boolean;
  hasHyperlink: boolean;
    style?: PrintCellStyle;
  width: number;
  height: number;

  /** Page-relative, unscaled CSS pixel coordinates. */
  x: number;
  y: number;

  textLines: string[];

  fontSize: number;
  padding: number;

  /** Line-height multiplier. */
  lineHeight: number;

  /** Estimated height required by text, including padding. */
  textHeight: number;

  /** Based on the selected text-width measurement method. */
  hasHorizontalOverflow: boolean;

  /** Text needs more height than the existing cell provides. */
  hasVerticalOverflow: boolean;
}

export interface PrintRenderRow {
  row: number;
  height: number;
  cells: PrintRenderCell[];
}

export interface PrintRenderPage {
  page: PrintPageDef;
  rows: PrintRenderRow[];
  totalWidth: number;
  totalHeight: number;
  isEmpty: boolean;
}

export interface PrintRenderOptions
  extends PrintLayoutOptions {
  fontSize?: number;

  /** Non-negative CSS pixels. Zero is allowed. */
  padding?: number;

  /** Positive multiplier, such as 1.2. */
  lineHeight?: number;

  /**
   * Return width in unscaled CSS pixels.
   * The caller owns font selection and measurement.
   * The callback must return a finite, non-negative number.
   */
  measureText?: (
    text: string,
    fontSize: number,
    style?: PrintCellStyle,
  ) => number;

  /**
   * Protects text processing from exceptionally large cell values.
   * Exceeding this throws rather than truncating content.
   */
  maxTextLengthPerCell?: number;
}

export interface PrintRenderResult {
  pages: PrintRenderPage[];
  totalCells: number;
  totalRows: number;
  totalColumns: number;
}

interface ResolvedTextOptions {
  fontSize: number;
  padding: number;
  lineHeight: number;
  style?: PrintCellStyle;
  maxTextLengthPerCell: number;
  measureText: (
    text: string,
    fontSize: number,
    style?: PrintCellStyle,
  ) => number;
}

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_PADDING = 4;
const DEFAULT_LINE_HEIGHT = 1.2;
const DEFAULT_MAX_TEXT_LENGTH = 100_000;

function resolvePositiveNumber(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;

  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(
      `${name} must be a finite positive number.`,
    );
  }

  return resolved;
}

function estimateTextWidth(
  text: string,
  fontSize: number,
): number {
  // Approximation only; not actual font/glyph measurement.
  return text.length * fontSize * 0.55;
}

function resolveTextOptions(
  options: PrintRenderOptions,
): ResolvedTextOptions {
  const fontSize = resolvePositiveNumber(
    options.fontSize,
    DEFAULT_FONT_SIZE,
    "fontSize",
  );

  const lineHeight = resolvePositiveNumber(
    options.lineHeight,
    DEFAULT_LINE_HEIGHT,
    "lineHeight",
  );

  const padding = options.padding ?? DEFAULT_PADDING;

  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError(
      "padding must be a finite non-negative number.",
    );
  }

  const maxTextLengthPerCell =
    options.maxTextLengthPerCell ??
    DEFAULT_MAX_TEXT_LENGTH;

  if (
    !Number.isSafeInteger(maxTextLengthPerCell) ||
    maxTextLengthPerCell < 1
  ) {
    throw new RangeError(
      "maxTextLengthPerCell must be a positive safe integer.",
    );
  }

  if (
    !Number.isFinite(fontSize * lineHeight) ||
    !Number.isFinite(padding * 2)
  ) {
    throw new RangeError(
      "Text options exceed the supported numeric range.",
    );
  }

  return {
    fontSize,
    padding,
    lineHeight,
    maxTextLengthPerCell,
    measureText: options.measureText ?? estimateTextWidth,
  };
}

function measureWidth(
  text: string,
  options: ResolvedTextOptions,
): number {
  const width = options.measureText(
    text,
    options.fontSize,
    options.style,
  );

  if (!Number.isFinite(width) || width < 0) {
    throw new RangeError(
      "measureText must return a finite non-negative width.",
    );
  }

  return width;
}

/**
 * Preserves explicit line breaks.
 * Horizontal whitespace is normalized to single spaces.
 * Long unbroken words are kept intact and may overflow.
 */
function wrapText(
  text: string,
  availableWidth: number,
  options: ResolvedTextOptions,
): string[] {
  if (text.length > options.maxTextLengthPerCell) {
    throw new RangeError(
      `Cell text exceeds the ${options.maxTextLengthPerCell}-character limit.`,
    );
  }

  if (text.length === 0) return [];

  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split("\n");

  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.match(/\S+/g) ?? [];

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine
        ? `${currentLine} ${word}`
        : word;

      const candidateWidth = measureWidth(
        candidate,
        options,
      );

      if (
        currentLine &&
        candidateWidth > availableWidth
      ) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    lines.push(currentLine);
  }

  return lines;
}

function assertCoordinate(
  value: number,
  name: string,
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name} must be a finite non-negative number.`,
    );
  }
}

function addDimension(
  position: number,
  dimension: number,
): number {
  const result = position + dimension;

  if (!Number.isFinite(result)) {
    throw new RangeError(
      "Render dimensions exceed the supported numeric range.",
    );
  }

  return result;
}

function renderLayoutCell(
  cell: PrintLayoutCell,
  x: number,
  y: number,
  baseOptions: ResolvedTextOptions,
): PrintRenderCell {
  const style = cell.style;
  const fontSize = style?.fontSize;
  const options: ResolvedTextOptions = {
    ...baseOptions,
    style,
    fontSize: fontSize !== undefined && Number.isFinite(fontSize) && fontSize > 0
      ? fontSize : baseOptions.fontSize,
  };
  const borderWidth = Number.isFinite(style?.borderWidth)
    ? Math.max(0, style?.borderWidth ?? 2) : 2;
  const horizontalBorders =
    (style?.borders?.left ? borderWidth : 0) +
    (style?.borders?.right ? borderWidth : 0);
  const verticalBorders =
    (style?.borders?.top ? borderWidth : 0) +
    (style?.borders?.bottom ? borderWidth : 0);
  const indent = Number.isFinite(style?.indent)
    ? Math.max(0, style?.indent ?? 0) : 0;
  const extraIndent = indent > 0 ? Math.max(0, 8 + indent * 12 - options.padding) : 0;
  const availableWidth = Math.max(
    0,
    cell.width - options.padding * 2 - horizontalBorders - extraIndent,
  );

  if (cell.value.length > options.maxTextLengthPerCell) {
    throw new RangeError(`Cell text exceeds the ${options.maxTextLengthPerCell}-character limit.`);
  }
  // Only explicit Wrap Text requests automatic wrapping. Preserve spacing otherwise.
  const textLines = style?.wrap === true
    ? wrapText(cell.value, availableWidth, options)
    : cell.value.length === 0 ? [] : cell.value.replace(/\r\n?/g, "\n").split("\n");

  const textHeight =
    textLines.length === 0
      ? 0
      : textLines.length *
      options.fontSize *
      options.lineHeight +
      options.padding * 2;

  if (!Number.isFinite(textHeight)) {
    throw new RangeError(
      "Text height exceeds the supported numeric range.",
    );
  }

  return {
    ...cell,
    x,
    y,
    textLines,
    fontSize: options.fontSize,
    padding: options.padding,
    lineHeight: options.lineHeight,
    textHeight,
    hasHorizontalOverflow: textLines.some(
      (line) =>
        measureWidth(line, options) > availableWidth + 0.5,
    ),
    hasVerticalOverflow: textHeight + verticalBorders > cell.height + 0.5,
  };
}

function renderLayoutRow(
  row: PrintLayoutRow,
  y: number,
  options: ResolvedTextOptions,
): PrintRenderRow {
  const cells: PrintRenderCell[] = [];
  let x = 0;

  for (const cell of row.cells) {
    cells.push(renderLayoutCell(cell, x, y, options));
    x = addDimension(x, cell.width);
  }

  return {
    row: row.row,
    height: row.height,
    cells,
  };
}

function renderLayoutRows(
  rows: PrintLayoutRow[],
  options: ResolvedTextOptions,
): PrintRenderRow[] {
  const renderedRows: PrintRenderRow[] = [];
  let y = 0;

  for (const row of rows) {
    renderedRows.push(
      renderLayoutRow(row, y, options),
    );

    y = addDimension(y, row.height);
  }

  return renderedRows;
}

function renderLayoutPage(
  layoutPage: PrintLayoutPage,
  options: ResolvedTextOptions,
): PrintRenderPage {
  // Rows have already been filtered, if requested.
  // Recompute coordinates from those remaining rows.
  const rows = renderLayoutRows(
    layoutPage.rows,
    options,
  );

  return {
    page: { ...layoutPage.page },
    rows,
    totalWidth: calculateRenderPageWidth(rows),
    totalHeight: calculateRenderPageHeight(rows),
    isEmpty: rows.every(isRenderRowEmpty),
  };
}

export function buildRenderCell(
  sheet: PrintSheetLike,
  row: number,
  col: number,
  x: number,
  y: number,
  options: PrintRenderOptions = {},
): PrintRenderCell {
  assertCoordinate(x, "x");
  assertCoordinate(y, "y");

  const textOptions = resolveTextOptions(options);
  const cell = buildLayoutCell(sheet, row, col);

  return renderLayoutCell(cell, x, y, textOptions);
}

export function buildRenderRow(
  sheet: PrintSheetLike,
  row: number,
  startColumn: number,
  endColumn: number,
  y: number,
  options: PrintRenderOptions = {},
): PrintRenderRow {
  assertCoordinate(y, "y");

  const textOptions = resolveTextOptions(options);

  const layoutRow = buildLayoutRow(
    sheet,
    row,
    startColumn,
    endColumn,
    options,
  );

  return renderLayoutRow(layoutRow, y, textOptions);
}

export function buildRenderRows(
  sheet: PrintSheetLike,
  startRow: number,
  endRow: number,
  startColumn: number,
  endColumn: number,
  options: PrintRenderOptions = {},
): PrintRenderRow[] {
  const textOptions = resolveTextOptions(options);

  const layoutRows = buildLayoutRows(
    sheet,
    startRow,
    endRow,
    startColumn,
    endColumn,
    options,
  );

  return renderLayoutRows(layoutRows, textOptions);
}

export function isRenderRowEmpty(
  row: PrintRenderRow,
): boolean {
  return row.cells.every(
    (cell) =>
      !cell.value.trim() &&
      !cell.hasImage &&
      !cell.hasHyperlink,
  );
}

export function calculateRenderPageHeight(
  rows: PrintRenderRow[],
): number {
  return rows.reduce(
    (total, row) => addDimension(total, row.height),
    0,
  );
}

export function calculateRenderPageWidth(
  rows: PrintRenderRow[],
): number {
  let maximumWidth = 0;

  for (const row of rows) {
    const width = row.cells.reduce(
      (total, cell) =>
        addDimension(total, cell.width),
      0,
    );

    maximumWidth = Math.max(maximumWidth, width);
  }

  return maximumWidth;
}

export function buildRenderPage(
  sheet: PrintSheetLike,
  page: PrintPageDef,
  options: PrintRenderOptions = {},
): PrintRenderPage {
  const textOptions = resolveTextOptions(options);

  const layoutPage = buildLayoutPage(
    sheet,
    page,
    options,
  );

  return renderLayoutPage(layoutPage, textOptions);
}

export function buildPrintRender(
  sheet: PrintSheetLike,
  pages: PrintPageDef[],
  options: PrintRenderOptions = {},
): PrintRenderResult {
  const textOptions = resolveTextOptions(options);

  // Validates all page ranges and cell budgets before
  // allocating layout cells. No pages are silently skipped.
  const layout = buildPrintLayout(
    sheet,
    pages,
    options,
  );

  const renderPages = layout.pages.map((page) =>
    renderLayoutPage(page, textOptions),
  );

  return {
    pages: renderPages,
    totalCells: layout.totalCells,
    totalRows: layout.totalRows,
    totalColumns: layout.totalColumns,
  };
}

export function isRenderPageEmpty(
  renderPage: PrintRenderPage,
): boolean {
  return renderPage.isEmpty;
}

export function countRenderCells(
  renderPages: PrintRenderPage[],
): number {
  return renderPages.reduce(
    (total, page) =>
      total +
      page.rows.reduce(
        (rowTotal, row) =>
          rowTotal + row.cells.length,
        0,
      ),
    0,
  );
}

export function getRenderCellTextLines(
  cell: PrintRenderCell,
): string[] {
  return [...cell.textLines];
}

export function getRenderCellPosition(
  cell: PrintRenderCell,
): { x: number; y: number } {
  return { x: cell.x, y: cell.y };
}

export function getRenderCellSize(
  cell: PrintRenderCell,
): { width: number; height: number } {
  return {
    width: cell.width,
    height: cell.height,
  };
}