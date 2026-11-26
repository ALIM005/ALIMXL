/**
 * ALIM XL — XLSX data validation preservation.
 */

const ALLOWED_TYPES = new Set([
  "list",
  "whole",
  "decimal",
  "date",
  "time",
  "textLength",
  "custom",
]);

function columnToLetter(column) {
  let name = "";
  let value = column;

  while (value > 0) {
    const remainder = (value - 1) % 26;

    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function letterToColumn(letter) {
  let value = 0;

  for (const character of String(letter || "").toUpperCase()) {
    value = value * 26 + (character.charCodeAt(0) - 64);
  }

  return value;
}

function parseSingleRef(ref) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(String(ref || "").trim());

  if (!match) return null;

  return {
    row: Number(match[2]),
    column: letterToColumn(match[1]),
  };
}

function normalizeRef(ref) {
  const value = String(ref || "").trim();

  if (/^[A-Za-z]+\d+$/.test(value)) return value;

  const match = /^([A-Za-z]+\d+):([A-Za-z]+\d+)$/.exec(value);

  if (!match) return null;

  const start = parseSingleRef(match[1]);
  const end = parseSingleRef(match[2]);

  if (!start || !end) return null;

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minColumn = Math.min(start.column, end.column);
  const maxColumn = Math.max(start.column, end.column);

  return `${columnToLetter(minColumn)}${minRow}:${columnToLetter(
    maxColumn
  )}${maxRow}`;
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeValidation(validation) {
  if (!validation || typeof validation !== "object") return null;

  const type = String(validation.type || "").trim();

  if (!ALLOWED_TYPES.has(type)) return null;

  const result = {
    type,
  };

  const defaultOperators = new Set([
    "whole",
    "decimal",
    "date",
    "time",
    "textLength",
  ]);

  if (validation.operator) {
    result.operator = String(validation.operator);
  } else if (defaultOperators.has(type)) {
    result.operator = "between";
  }

  if (Array.isArray(validation.formulae)) {
    result.formulae = validation.formulae
      .map((formula) => decodeXmlEntities(formula))
      .filter((formula) => formula !== "");
  }

  if (validation.allowBlank !== undefined) {
    result.allowBlank = Boolean(validation.allowBlank);
  } else {
    result.allowBlank = true;
  }

  if (validation.showInputMessage !== undefined) {
    result.showInputMessage = Boolean(validation.showInputMessage);
  }

  if (validation.showErrorMessage !== undefined) {
    result.showErrorMessage = Boolean(validation.showErrorMessage);
  }

  for (const key of [
    "promptTitle",
    "prompt",
    "errorTitle",
    "error",
  ]) {
    if (validation[key] !== undefined && validation[key] !== null) {
      result[key] = decodeXmlEntities(validation[key]);
    }
  }

  return result;
}

function normalizeAppDataValidations(sheet) {
  const source = Array.isArray(sheet?.dataValidations)
    ? sheet.dataValidations
    : [];
  const result = [];

  for (const item of source) {
    const ref = normalizeRef(item?.ref);
    const validation = normalizeValidation(item?.validation);

    if (!ref || !validation) continue;

    result.push({
      ref,
      validation,
    });
  }

  return result;
}

export function applyDataValidationsToWorksheet(worksheet, sheet) {
  const validations = normalizeAppDataValidations(sheet);

  for (const item of validations) {
    worksheet.dataValidations.add(item.ref, {
      ...item.validation,
    });
  }
}

function extractAttribute(block, name) {
  const match = new RegExp(
    `${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    "i"
  ).exec(block);

  if (!match) return undefined;

  return match[1] !== undefined ? match[1] : match[2];
}

function extractValidationsFromWorksheetXml(xml) {
  const result = [];
  const validationPattern =
    /<dataValidation\b([^>]*)(?:\/>|>([\s\S]*?)<\/dataValidation>)/gi;

  let match;

  while ((match = validationPattern.exec(xml || "")) !== null) {
    const attributes = match[1] || "";
    const content = match[2] || "";
    const ref = normalizeRef(
      extractAttribute(attributes, "sqref")
    );

    const formula1Match =
      /<formula1>([\s\S]*?)<\/formula1>/i.exec(content);
    const formula2Match =
      /<formula2>([\s\S]*?)<\/formula2>/i.exec(content);

    const formulae = [];

    if (formula1Match) {
      formulae.push(formula1Match[1].trim());
    }

    if (formula2Match) {
      formulae.push(formula2Match[1].trim());
    }

    const validation = normalizeValidation({
      type: extractAttribute(attributes, "type"),
      operator: extractAttribute(attributes, "operator"),
      allowBlank: extractAttribute(attributes, "allowBlank"),
      showInputMessage: extractAttribute(
        attributes,
        "showInputMessage"
      ),
      showErrorMessage: extractAttribute(
        attributes,
        "showErrorMessage"
      ),
      promptTitle: extractAttribute(attributes, "promptTitle"),
      prompt: extractAttribute(attributes, "prompt"),
      errorTitle: extractAttribute(attributes, "errorTitle"),
      error: extractAttribute(attributes, "error"),
      formulae,
    });

    if (!ref || !validation) continue;

    result.push({
      ref,
      validation,
    });
  }

  return result;
}

export function readDataValidationsFromWorksheet(
  sheet,
  worksheet,
  worksheetXml = ""
) {
  let result = extractValidationsFromWorksheetXml(worksheetXml);

  if (!result.length) {
    const cells = [];

    worksheet?.eachRow?.(
      {
        includeEmpty: true,
      },
      (row, rowNumber) => {
        row?.eachCell?.(
          {
            includeEmpty: true,
          },
          (cell, columnNumber) => {
            const validation = normalizeValidation(
              cell?.dataValidation
            );

            if (!validation) return;

            cells.push({
              row: rowNumber,
              column: columnNumber,
              validation,
            });
          }
        );
      }
    );

    result = groupCellValidations(cells);
  }

  sheet.dataValidations = result;
}

function validationSignature(validation) {
  return JSON.stringify(validation, Object.keys(validation).sort());
}

function groupCellValidations(cells) {
  const groups = new Map();

  for (const item of cells) {
    const signature = validationSignature(item.validation);
    const columnKey = String(item.column);
    const key = `${signature}|${columnKey}`;

    if (!groups.has(key)) {
      groups.set(key, {
        validation: item.validation,
        column: item.column,
        rows: [],
      });
    }

    groups.get(key).rows.push(item.row);
  }

  const result = [];

  for (const group of groups.values()) {
    const rows = [...new Set(group.rows)].sort((a, b) => a - b);
    let rangeStart = rows[0];
    let previousRow = rows[0];

    const flushRange = (endRow) => {
      const columnLetter = columnToLetter(group.column);
      const ref =
        rangeStart === endRow
          ? `${columnLetter}${rangeStart}`
          : `${columnLetter}${rangeStart}:${columnLetter}${endRow}`;

      result.push({
        ref,
        validation: group.validation,
      });
    };

    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index];

      if (row === previousRow + 1) {
        previousRow = row;
        continue;
      }

      flushRange(previousRow);

      rangeStart = row;
      previousRow = row;
    }

    flushRange(previousRow);
  }

  return result;
}