/**
 * ALIM XL — XLSX named range preservation.
 */

const MAX_NAME_LENGTH = 255;

const RESERVED_NAMES = new Set([
  "C",
  "c",
  "R",
  "r",
  "TRUE",
  "FALSE",
]);

const INVALID_NAME_PATTERN = /[\\/?*[\]:]/;

function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, code) => {
      const characterCode = Number(code);

      if (
        !Number.isInteger(characterCode) ||
        characterCode < 0 ||
        characterCode > 0x10ffff
      ) {
        return match;
      }

      try {
        return String.fromCodePoint(characterCode);
      } catch {
        return match;
      }
    })
    .replace(/&amp;/g, "&");
}

function encodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeName(name) {
  const value = String(name ?? "").trim();

  if (!value) return null;
  if (value.length > MAX_NAME_LENGTH) return null;
  if (INVALID_NAME_PATTERN.test(value)) return null;
  if (RESERVED_NAMES.has(value.toUpperCase())) return null;
  if (/^\d+$/.test(value)) return null;

  return value;
}

function normalizeSheetName(sheetName) {
  const value = String(sheetName ?? "").trim();

  if (!value) return null;

  return value;
}

function normalizeReference(reference) {
  const value = String(reference ?? "").trim();

  if (!value) return null;

  return value;
}

function normalizeScope(scope) {
  const value = String(scope ?? "workbook").trim().toLowerCase();

  if (value === "workbook" || value === "worksheet") {
    return value;
  }

  return "workbook";
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;

  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;

  return fallback;
}

function normalizeNamedRange(item) {
  if (!item || typeof item !== "object") return null;

  const name = normalizeName(item.name);

  if (!name) return null;

  const reference = normalizeReference(item.reference ?? item.ref);

  if (!reference) return null;

  const result = {
    name,
    reference,
    scope: normalizeScope(item.scope),
  };

  const sheetName = normalizeSheetName(item.sheetName ?? item.sheet);

  if (sheetName) {
    result.sheetName = sheetName;
  }

  if (item.comment !== undefined && item.comment !== null) {
    result.comment = decodeXmlEntities(item.comment);
  }

  if (item.hidden !== undefined) {
    result.hidden = normalizeBoolean(item.hidden, false);
  }

  if (item.status !== undefined && item.status !== null) {
    const status = String(item.status).trim().toLowerCase();

    if (status) {
      result.status = status;
    }
  }

  return result;
}

function normalizeAppNamedRanges(sheet) {
  const source = Array.isArray(sheet?.namedRanges)
    ? sheet.namedRanges
    : [];
  const result = [];
  const seen = new Set();

  for (const item of source) {
    const namedRange = normalizeNamedRange(item);

    if (!namedRange) continue;

    const key = `${namedRange.scope}|${
      namedRange.sheetName || ""
    }|${namedRange.name.toLowerCase()}`;

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(namedRange);
  }

  return result;
}

function addNamedRangeToExcelWorkbook(workbook, item) {
  if (!workbook || typeof workbook !== "object") return;

  const reference = item.reference;

  if (!reference) return;

  const definition = {
    name: item.name,
    reference,
  };

  if (item.comment) {
    definition.comment = item.comment;
  }

  if (item.hidden !== undefined) {
    definition.hidden = item.hidden;
  }

  if (item.status) {
    definition.status = item.status;
  }

  if (item.scope === "worksheet" && item.sheetName) {
    definition.sheetName = item.sheetName;
  }

  if (
    workbook.definedNames &&
    typeof workbook.definedNames.add === "function"
  ) {
    workbook.definedNames.add(reference, item.name);
    return;
  }

  if (
    workbook.definedNames &&
    typeof workbook.definedNames.push === "function"
  ) {
    workbook.definedNames.push(definition);
    return;
  }

  if (!workbook.definedNames) {
    workbook.definedNames = [];
  }

  workbook.definedNames.push(definition);
}

export function applyNamedRangesToWorkbook(workbook, workbookData) {
  const sheets = Array.isArray(workbookData?.sheets)
    ? workbookData.sheets
    : [];

  const sheetNameById = new Map();

  for (const sheet of sheets) {
    if (sheet?.id !== undefined && sheet?.name) {
      sheetNameById.set(String(sheet.id), sheet.name);
    }
  }

  const namedRanges = [];

  for (const sheet of sheets) {
    const sheetNamedRanges = normalizeAppNamedRanges(sheet);

    for (const item of sheetNamedRanges) {
      const sheetName =
        item.sheetName ||
        sheetNameById.get(String(sheet?.id)) ||
        sheet?.name;

      namedRanges.push({
        ...item,
        sheetName,
      });
    }
  }

    const workbookLevelNamedRanges = Array.isArray(workbookData?.namedRanges)
    ? workbookData.namedRanges
    : [];

  const seenNamedRangeKeys = new Set(
    namedRanges.map(
      (item) =>
        `${item.scope}|${item.sheetName || ""}|${item.name.toLowerCase()}`
    )
  );

  for (const rawItem of workbookLevelNamedRanges) {
    const item = normalizeNamedRange(rawItem);

    if (!item) continue;

    const key = `${item.scope}|${
      item.sheetName || ""
    }|${item.name.toLowerCase()}`;

    if (seenNamedRangeKeys.has(key)) continue;

    seenNamedRangeKeys.add(key);
    namedRanges.push(item);
  }


  if (!namedRanges.length) return;

  for (const item of namedRanges) {
    addNamedRangeToExcelWorkbook(workbook, item);
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

function extractDefinedNamesFromWorkbookXml(xml) {
  const result = [];
  const definedNamePattern =
    /<definedName\b([^>]*)(?:\/>|>([\s\S]*?)<\/definedName>)/gi;

  let match;

  while ((match = definedNamePattern.exec(xml || "")) !== null) {
    const attributes = match[1] || "";
    const content = decodeXmlEntities(match[2] || "").trim();

    const name = normalizeName(
      extractAttribute(attributes, "name")
    );

    if (!name || !content) continue;

    const localSheetId = extractAttribute(
      attributes,
      "localSheetId"
    );

    const namedRange = normalizeNamedRange({
      name,
      reference: content,
      scope: localSheetId === undefined ? "workbook" : "worksheet",
      hidden: extractAttribute(attributes, "hidden"),
      status: extractAttribute(attributes, "status"),
      comment: extractAttribute(attributes, "comment"),
    });

    if (!namedRange) continue;

    if (localSheetId !== undefined) {
      const sheetIndex = Number(localSheetId);

      if (Number.isInteger(sheetIndex) && sheetIndex >= 0) {
        namedRange.localSheetId = sheetIndex;
      }
    }

    result.push(namedRange);
  }

  return result;
}

export function readNamedRangesFromWorkbook(
  workbookData,
  workbook,
  workbookXml = ""
) {
  const definedNames = extractDefinedNamesFromWorkbookXml(workbookXml);

  const sheetNames = Array.isArray(workbookData?.sheets)
    ? workbookData.sheets.map((sheet) => sheet?.name)
    : [];

  const result = [];
  const seen = new Set();

  for (const item of definedNames) {
    const namedRange = {
      name: item.name,
      reference: item.reference,
      scope: item.scope,
    };

    if (item.sheetName) {
      namedRange.sheetName = item.sheetName;
    }

    if (item.comment) {
      namedRange.comment = item.comment;
    }

    if (item.hidden !== undefined) {
      namedRange.hidden = item.hidden;
    }

    if (item.status) {
      namedRange.status = item.status;
    }

    if (item.localSheetId !== undefined) {
      namedRange.localSheetId = item.localSheetId;
    }

    if (
      item.scope === "worksheet" &&
      item.localSheetId !== undefined
    ) {
      const sheetName = sheetNames[item.localSheetId];

      if (sheetName) {
        namedRange.sheetName = sheetName;
      }
    }

    const key = `${namedRange.scope}|${
      namedRange.sheetName || ""
    }|${namedRange.name.toLowerCase()}`;

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(namedRange);
  }

  workbookData.namedRanges = result;

  if (workbook) {
    workbook.namedRanges = result;
  }

  return result;
}

export function buildNamedRangesXml(namedRanges) {
  const items = Array.isArray(namedRanges) ? namedRanges : [];
  const lines = [];

  for (const item of items) {
    const namedRange = normalizeNamedRange(item);

    if (!namedRange) continue;

    const attributes = [
      `name="${encodeXmlEntities(namedRange.name)}"`,
    ];

    if (namedRange.scope === "worksheet" && namedRange.sheetName) {
      attributes.push(`localSheetId="0"`);
    }

    if (namedRange.hidden !== undefined) {
      attributes.push(`hidden="${namedRange.hidden ? "1" : "0"}"`);
    }

    if (namedRange.status) {
      attributes.push(
        `status="${encodeXmlEntities(namedRange.status)}"`
      );
    }

    if (namedRange.comment) {
      attributes.push(
        `comment="${encodeXmlEntities(namedRange.comment)}"`
      );
    }

    lines.push(
      `    <definedName ${attributes.join(" ")}>${encodeXmlEntities(
        namedRange.reference
      )}</definedName>`
    );
  }

  if (!lines.length) return "";

  return `  <definedNames>\n${lines.join("\n")}\n  </definedNames>`;
}