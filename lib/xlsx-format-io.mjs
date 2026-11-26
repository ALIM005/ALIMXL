/**
 * ALIM XL — ExcelJS-based XLSX import/export with formatting preservation.
 */
import {
  applyConditionalFormattingToWorksheet,
  readConditionalFormattingFromWorksheet,
} from "./xlsx-conditional-formatting.mjs";

import {
  applyDataValidationsToWorksheet,
  readDataValidationsFromWorksheet,
} from "./xlsx-data-validation.mjs";

import {
  applyNamedRangesToWorkbook,
  readNamedRangesFromWorkbook,
} from "./xlsx-named-ranges.mjs";

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

const DEFAULT_OPTIONS = {
  maxRows: 10000,
  maxCols: 200,
  defaultRows: 100,
  defaultCols: 26,
};

function normalizeOptions(options = {}) {
  return { ...DEFAULT_OPTIONS, ...options };
}

function columnToName(column) {
  let name = "";
  let value = column;

  while (value >= 0) {
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26) - 1;
  }

  return name;
}

function makeCellKey(row, column) {
  return `${columnToName(column)}${row + 1}`;
}

function parseA1(key) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(String(key || "").trim());

  if (!match) return null;

  const column = match[1]
    .toUpperCase()
    .split("")
    .reduce(
      (total, character) =>
        total * 26 + (character.charCodeAt(0) - 64),
      0
    ) - 1;

  return {
    row: Number(match[2]) - 1,
    column,
  };
}

function parseRange(range) {
  const match =
    /^([A-Za-z]+\d+):([A-Za-z]+\d+)$/.exec(String(range || "").trim());

  if (!match) return null;

  const start = parseA1(match[1]);
  const end = parseA1(match[2]);

  if (!start || !end) return null;

  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
    startColumn: Math.min(start.column, end.column),
    endColumn: Math.max(start.column, end.column),
  };
}

function safeSheetName(name, usedNames) {
  const base =
    String(name || "Sheet")
      .replace(/[\\/?*[\]:]/g, "_")
      .replace(/^'+|'+$/g, "")
      .trim()
      .slice(0, 31) || "Sheet";

  let sheetName = base;
  let suffix = 2;

  while (usedNames.has(sheetName.toLowerCase())) {
    const tail = ` (${suffix++})`;
    sheetName = base.slice(0, 31 - tail.length) + tail;
  }

  usedNames.add(sheetName.toLowerCase());
  return sheetName;
}

function argbToHex(argb) {
  if (!argb) return undefined;

  const value = String(argb).toUpperCase().replace("#", "");

  if (value.length === 8) return `#${value.slice(2)}`;
  if (value.length === 6) return `#${value}`;

  return undefined;
}

function hexToArgb(hex) {
  if (!hex) return undefined;

  const value = String(hex).trim().replace("#", "").toUpperCase();

  if (value.length === 6) return `FF${value}`;
  if (value.length === 8) return value;

  return undefined;
}

function normalizeBorderStyle(style) {
  if (style === "dashed") return "dashed";
  if (style === "dotted") return "dotted";
  if (style === "double") return "double";

  return "thin";
}

function appBordersToExcel(style) {
  const borders = style?.borders;

  if (!borders) return undefined;

  const color = {
    argb: hexToArgb(style.borderColor || "#000000"),
  };
  const borderStyle = normalizeBorderStyle(style.borderStyle);
  const result = {};

  for (const side of ["top", "bottom", "left", "right"]) {
    if (borders[side]) {
      result[side] = {
        style: borderStyle,
        color,
      };
    }
  }

  return Object.keys(result).length ? result : undefined;
}

function excelBordersToApp(borders) {
  if (!borders) return undefined;

  const bordersPresent = {};
  let firstColor;
  let firstStyle;

  for (const side of ["top", "bottom", "left", "right"]) {
    const border = borders[side];

    if (!border?.style) continue;

    bordersPresent[side] = true;

    if (!firstColor && border.color?.argb) {
      firstColor = argbToHex(border.color.argb);
    }

    if (!firstStyle) {
      firstStyle = border.style;
    }
  }

  if (!Object.keys(bordersPresent).length) return undefined;

  return {
    borders: bordersPresent,
    borderColor: firstColor || "#000000",
    borderStyle:
      firstStyle === "dashed" ||
        firstStyle === "dotted" ||
        firstStyle === "double"
        ? firstStyle
        : "solid",
    borderWidth: 1,
  };
}

function excelNumFmtToAppStyle(numFmt) {
  const format = String(numFmt || "").trim();

  if (!format || format === "General") return {};

  const percentMatch = format.match(/0(?:\.(0+))?\s*%/);
  const decimalMatch = format.match(/0\.(0+)/);

  if (percentMatch) {
    return {
      numberFormat: "percentage",
      decimals: percentMatch[1] ? percentMatch[1].length : 0,
    };
  }

  if (/[#$€£¥৳]/.test(format)) {
    const symbolMatch =
      format.match(/"([^"]+)"|'([^']+)'|([#$€£¥৳])/);
    const symbol =
      symbolMatch?.[1] ||
      symbolMatch?.[2] ||
      symbolMatch?.[3] ||
      "$";

    return {
      numberFormat: "currency",
      currencyCode: symbol.trim(),
      decimals: decimalMatch ? decimalMatch[1].length : 2,
    };
  }

  if (/[yYdDmMhHsS]/.test(format) && !/^[0#.,]+$/.test(format)) {
    return {
      numberFormat: "text",
      customFormat: format,
    };
  }

  if (decimalMatch) {
    return {
      customFormat: format,
      decimals: decimalMatch[1].length,
    };
  }

  return {
    customFormat: format,
  };
}

function appNumberFormatToExcel(style) {
  if (!style?.numberFormat) return style?.customFormat || undefined;

  if (style.numberFormat === "text") return "@";

  if (style.numberFormat === "percentage") {
    const decimals = Math.max(0, Math.min(style.decimals ?? 0, 10));

    return `0${decimals ? `.${"0".repeat(decimals)}` : ""}%`;
  }

  if (style.numberFormat === "currency") {
    const decimals = Math.max(0, Math.min(style.decimals ?? 2, 10));
    const symbol = style.currencyCode || "$";

    return `"${symbol}"#,##0${decimals ? `.${"0".repeat(decimals)}` : ""}`;
  }

  return style.customFormat || undefined;
}

function excelAlignmentToApp(alignment) {
  if (!alignment) return {};

  const result = {};

  if (alignment.horizontal) result.align = alignment.horizontal;
  if (alignment.vertical) result.verticalAlign = alignment.vertical;
  if (alignment.wrapText) result.wrap = true;

  if (typeof alignment.indent === "number") {
    result.indent = Math.max(0, Math.min(alignment.indent, 15));
  }

  return result;
}

function appAlignmentToExcel(style) {
  const alignment = {};

  if (style?.align) alignment.horizontal = style.align;
  if (style?.verticalAlign) alignment.vertical = style.verticalAlign;
  if (style?.wrap) alignment.wrapText = true;

  if (typeof style?.indent === "number") {
    alignment.indent = style.indent;
  }

  return Object.keys(alignment).length ? alignment : undefined;
}

function excelCellToAppCell(cell) {
  const style = {
    wrap: true,
  };

  const font = cell.font;

  if (font) {
    if (font.bold) style.bold = true;
    if (font.italic) style.italic = true;
    if (font.underline) style.underline = true;
    if (font.size) style.fontSize = font.size;
    if (font.name) style.fontFamily = font.name;

    const color = argbToHex(font.color?.argb);

    if (color) style.color = color;
  }

  const fill = cell.fill;

  if (fill?.type === "pattern" && fill.pattern !== "none") {
    const background = argbToHex(fill.fgColor?.argb);

    if (background) style.bg = background;
  }

  Object.assign(style, excelBordersToApp(cell.border));
  Object.assign(style, excelAlignmentToApp(cell.alignment));
  Object.assign(style, excelNumFmtToAppStyle(cell.numFmt));

  let value = "";
  let formula;

  if (cell.formula) {
    formula = String(cell.formula).replace(/^=/, "");
    value = `=${formula}`;
  } else if (cell.value instanceof Date) {
    value = cell.value.toISOString().slice(0, 10);
    style.numberFormat = "text";
  } else if (typeof cell.value === "boolean") {
    value = cell.value ? "TRUE" : "FALSE";
  } else if (cell.value?.error) {
    value = cell.value.error;
  } else if (cell.value?.richText) {
    value = cell.value.richText
      .map((part) => part.text || "")
      .join("");
  } else if (cell.value?.text !== undefined) {
    value = String(cell.value.text);
  } else if (cell.value?.result !== undefined) {
    value = String(cell.value.result);
  } else {
    value = cell.value == null ? "" : String(cell.value);
  }

  if (
    !formula &&
    typeof cell.value === "string" &&
    cell.value.trim() !== "" &&
    Number.isNaN(Number(cell.value))
  ) {
    style.numberFormat = style.numberFormat || "text";
  }

  return {
    value,
    style,
  };
}

function createEmptySheet(name, options) {
  return {
    id: crypto.randomUUID(),
    name,
    gridRows: options.defaultRows,
    gridCols: options.defaultCols,
    cells: {},
    groups: [],
    colGroups: [],
    hiddenRows: [],
    hiddenCols: [],
    filters: {},
    colWidths: {},
    rowHeights: {},
    frozenRows: 0,
    frozenCols: 0,
    charts: [],
    conditionalRules: [],
    namedRanges: {},
    dataValidations: [],
    drawings: [],
  };
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  return [value];
}

async function readWorksheetXmlFromXlsx(buffer) {
  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default || JSZipModule;
  const XMLParserModule = await import("fast-xml-parser");
  const XMLParser = XMLParserModule.XMLParser;

  const zip = await JSZip.loadAsync(buffer);
  const result = new Map();

  const workbookXml = await zip
    .file("xl/workbook.xml")
    ?.async("string");

  if (!workbookXml) {
    return {
      worksheetXmlMap: result,
      workbookXml: "",
    };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsedWorkbook = parser.parse(workbookXml);
  const sheets = toArray(
    parsedWorkbook?.workbook?.sheets?.sheet
  );

  const relationshipsXml = await zip
    .file("xl/_rels/workbook.xml.rels")
    ?.async("string");

  if (!relationshipsXml) {
    return {
      worksheetXmlMap: result,
      workbookXml,
    };
  }

  const parsedRelationships = parser.parse(relationshipsXml);
  const relationships = toArray(
    parsedRelationships?.Relationships?.Relationship
  );

  const relationshipMap = new Map();

  for (const relationship of relationships) {
    relationshipMap.set(
      relationship?.["@_Id"],
      relationship?.["@_Target"]
    );
  }

  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = sheets[index];
    const relationshipId = sheet?.["@_r:id"];
    const target = relationshipMap.get(relationshipId);

    if (!target) continue;

    const normalizedTarget = target.startsWith("/")
      ? target.slice(1)
      : `xl/${target.replace(/^xl\//, "")}`;

    const xml = await zip.file(normalizedTarget)?.async("string");

    if (xml) {
      result.set(index, xml);
    }
  }

  return {
    worksheetXmlMap: result,
    workbookXml,
  };
}

export async function importXlsxFile(file, options = {}) {
  const config = normalizeOptions(options);
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const { worksheetXmlMap, workbookXml } =
    await readWorksheetXmlFromXlsx(buffer);

  const importedSheets = [];

  for (const [sheetIndex, sourceSheet] of workbook.worksheets.entries()) {
    const sheet = createEmptySheet(sourceSheet.name, config);
    let maxRow = 0;
    let maxCol = 0;

    const mergedCells = new Map();

    for (const mergeRange of sourceSheet.model?.merges || []) {
      const range = parseRange(mergeRange);

      if (!range) continue;

      const anchorKey = makeCellKey(range.startRow, range.startColumn);

      for (
        let row = range.startRow;
        row <= range.endRow;
        row += 1
      ) {
        for (
          let column = range.startColumn;
          column <= range.endColumn;
          column += 1
        ) {
          const key = makeCellKey(row, column);

          if (key !== anchorKey) {
            mergedCells.set(key, anchorKey);
          }
        }
      }

      const anchorCell = sheet.cells[anchorKey] || {
        value: "",
        style: {
          wrap: true,
        },
      };

      anchorCell.rowSpan = range.endRow - range.startRow + 1;
      anchorCell.colSpan = range.endColumn - range.startColumn + 1;

      sheet.cells[anchorKey] = anchorCell;

      maxRow = Math.max(maxRow, range.endRow);
      maxCol = Math.max(maxCol, range.endColumn);
    }

    for (const [key, anchorKey] of mergedCells.entries()) {
      sheet.cells[key] = {
        value: "",
        style: {
          wrap: true,
        },
        mergedInto: anchorKey,
      };

      const position = parseA1(key);

      if (position) {
        maxRow = Math.max(maxRow, position.row);
        maxCol = Math.max(maxCol, position.column);
      }
    }

    sourceSheet.eachRow(
      {
        includeEmpty: false,
      },
      (row, rowNumber) => {
        row.eachCell(
          {
            includeEmpty: false,
          },
          (cell, columnNumber) => {
            const rowIndex = rowNumber - 1;
            const columnIndex = columnNumber - 1;

            if (
              rowIndex < 0 ||
              columnIndex < 0 ||
              rowIndex >= config.maxRows ||
              columnIndex >= config.maxCols
            ) {
              return;
            }

            const key = makeCellKey(rowIndex, columnIndex);
            const imported = excelCellToAppCell(cell);

            if (mergedCells.has(key)) {
              imported.mergedInto = mergedCells.get(key);
              imported.value = "";
              imported.style = {
                wrap: true,
              };
            }

            sheet.cells[key] = imported;

            maxRow = Math.max(maxRow, rowIndex);
            maxCol = Math.max(maxCol, columnIndex);
          }
        );
      }
    );

    for (let index = 1; index <= config.maxCols; index += 1) {
      const column = sourceSheet.getColumn(index);
      const zeroIndex = index - 1;

      if (column?.width) {
        sheet.colWidths[zeroIndex] = Math.max(
          20,
          Math.round(column.width * 7 + 5)
        );
      }

      if (column?.hidden) {
        sheet.hiddenCols.push(zeroIndex);
      }
    }

    for (
      let row = 1;
      row <= Math.min(sourceSheet.rowCount, config.maxRows);
      row += 1
    ) {
      const sourceRow = sourceSheet.getRow(row);
      const zeroIndex = row - 1;

      if (sourceRow?.height) {
        sheet.rowHeights[zeroIndex] = Math.max(
          1,
          Math.round(sourceRow.height * (96 / 72))
        );
      }

      if (sourceRow?.hidden) {
        sheet.hiddenRows.push(zeroIndex);
      }
    }

    readConditionalFormattingFromWorksheet(sheet, sourceSheet);

    const worksheetXml = worksheetXmlMap.get(sheetIndex) || "";

    readDataValidationsFromWorksheet(
      sheet,
      sourceSheet,
      worksheetXml
    );

    const view = sourceSheet.views?.[0];

    if (view?.state === "frozen") {
      sheet.frozenRows = Math.max(0, view.ySplit || 0);
      sheet.frozenCols = Math.max(0, view.xSplit || 0);
    }

    sheet.gridRows = Math.min(
      config.maxRows,
      Math.max(config.defaultRows, maxRow + 1)
    );

    sheet.gridCols = Math.min(
      config.maxCols,
      Math.max(config.defaultCols, maxCol + 1)
    );

    importedSheets.push(sheet);
  }

  const namedRanges = readNamedRangesFromWorkbook(
    {
      sheets: importedSheets,
    },
    workbook,
    workbookXml
  );

  return {
    sheets: importedSheets.length
      ? importedSheets
      : [createEmptySheet("Sheet 1", config)],
    namedRanges,
  };
}


function excelSerialToDate(serial) {
  const value = Number(serial);

  if (!Number.isFinite(value) || value < 0) return null;

  return new Date(
    EXCEL_EPOCH_MS + Math.round(value * 24 * 60 * 60 * 1000)
  );
}

export async function exportXlsxWorkbook({
  workbookName = "workbook",
  sheets,
  helpers,
  namedRanges = /** @type {any[]} */ ([]),
  options = {},
}) {
  const config = normalizeOptions(options);
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;

  if (!Array.isArray(sheets) || !sheets.length) {
    throw new Error("এক্সপোর্টের জন্য কোনো শিট নেই।");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ALIM XL";
  workbook.created = new Date();

  const usedNames = new Set();

  for (const sourceSheet of sheets) {
    const worksheet = workbook.addWorksheet(
      safeSheetName(sourceSheet.name, usedNames)
    );

    const columnCount = Math.max(
      config.defaultCols,
      sourceSheet.gridCols || 0
    );

    for (let index = 0; index < columnCount; index += 1) {
      const column = worksheet.getColumn(index + 1);
      const width = sourceSheet.colWidths?.[index];

      column.width = width ? Math.max(1, (width - 5) / 7) : 8.43;
      column.hidden = Boolean(sourceSheet.hiddenCols?.includes(index));
    }

    for (const [rowKey, height] of Object.entries(
      sourceSheet.rowHeights || {}
    )) {
      const rowIndex = Number(rowKey);

      if (
        Number.isInteger(rowIndex) &&
        rowIndex >= 0 &&
        height > 0
      ) {
        worksheet.getRow(rowIndex + 1).height = height * (72 / 96);
      }
    }

    for (const rowIndex of sourceSheet.hiddenRows || []) {
      if (Number.isInteger(rowIndex) && rowIndex >= 0) {
        worksheet.getRow(rowIndex + 1).hidden = true;
      }
    }

    if (sourceSheet.frozenRows || sourceSheet.frozenCols) {
      worksheet.views = [
        {
          state: "frozen",
          ySplit: sourceSheet.frozenRows || 0,
          xSplit: sourceSheet.frozenCols || 0,
          topLeftCell: makeCellKey(
            sourceSheet.frozenRows || 0,
            sourceSheet.frozenCols || 0
          ),
        },
      ];
    }

    for (const [key, cell] of Object.entries(sourceSheet.cells || {})) {
      const position = parseA1(key);

      if (!position) continue;

      const { row, column } = position;

      if (
        row < 0 ||
        column < 0 ||
        row >= sourceSheet.gridRows ||
        column >= sourceSheet.gridCols
      ) {
        continue;
      }

      if (cell.mergedInto) continue;

      const target = worksheet.getCell(row + 1, column + 1);
      const raw = String(cell.value ?? "");
      const style = cell.style || {};

      if (
        raw.startsWith("=") &&
        style.numberFormat !== "text" &&
        helpers?.getCellValueInSheet
      ) {
        const evaluated = helpers.getCellValueInSheet(
          sourceSheet,
          key,
          new Set(),
          sheets
        );

        const formula = String(
          helpers.normalizeDigitsOutsideQuotes?.(raw.slice(1)) ??
          raw.slice(1)
        );

        const usesAppOnlyFunction =
          /\bCONVERT\s*\(/i.test(formula);

        if (evaluated instanceof Date) {
          target.value = evaluated;
        } else if (typeof evaluated === "boolean") {
          target.value = evaluated;
        } else if (typeof evaluated === "number") {
          target.value = evaluated;
        } else if (
          typeof evaluated === "string" &&
          helpers.FORMULA_ERRORS?.has(evaluated)
        ) {
          target.value = {
            error: evaluated,
          };
        } else {
          target.value = String(evaluated ?? "");
        }

        if (!usesAppOnlyFunction) {
          target.value = {
            formula,
            result: target.value,
          };
        }
      } else if (style.numberFormat === "text") {
        target.value = raw;
      } else {
        const trimmed = raw.trim();
        const dateSerial =
          helpers?.parseDateTextToSerial?.(trimmed);
        const parsedNumber = helpers?.strictNumber?.(raw);

        if (dateSerial !== null && dateSerial !== undefined) {
          const date = excelSerialToDate(dateSerial);

          if (date) {
            target.value = date;
            target.numFmt = style.customFormat || "yyyy-mm-dd";
          } else {
            target.value = raw;
          }
        } else if (typeof parsedNumber === "number") {
          target.value = parsedNumber;
        } else {
          target.value = raw;
        }
      }

      const numberFormat = appNumberFormatToExcel(style);

      if (numberFormat && !(target.value instanceof Date)) {
        target.numFmt = numberFormat;
      }

      const font = {};

      if (style.bold) font.bold = true;
      if (style.italic) font.italic = true;
      if (style.underline) font.underline = true;
      if (style.fontSize) font.size = style.fontSize;
      if (style.fontFamily) font.name = style.fontFamily;

      const fontColor = hexToArgb(style.color);

      if (fontColor) {
        font.color = {
          argb: fontColor,
        };
      }

      if (Object.keys(font).length) {
        target.font = font;
      }

      const background = hexToArgb(style.bg);

      if (background) {
        target.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: background,
          },
        };
      }

      const borders = appBordersToExcel(style);

      if (borders) {
        target.border = borders;
      }

      const alignment = appAlignmentToExcel(style);

      if (alignment) {
        target.alignment = alignment;
      }

      const rowSpan = Number(cell.rowSpan || 1);
      const colSpan = Number(cell.colSpan || 1);

      if (rowSpan > 1 || colSpan > 1) {
        worksheet.mergeCells(
          row + 1,
          column + 1,
          row + rowSpan,
          column + colSpan
        );
      }
    }

    applyConditionalFormattingToWorksheet(worksheet, sourceSheet);
    applyDataValidationsToWorksheet(worksheet, sourceSheet);
  }

  applyNamedRangesToWorkbook(workbook, {
    namedRanges,
    sheets: sheets.map((sheet) => ({
      ...sheet,
      namedRanges: Array.isArray(sheet.namedRanges)
        ? sheet.namedRanges
        : Object.values(sheet.namedRanges || {}),
    })),
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Blob([buffer], {
    type: EXCEL_MIME,
  });
}