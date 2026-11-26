/**
 * ALIM XL — XLSX conditional formatting preservation.
 */

function hexToArgb(hex) {
  if (!hex) return undefined;

  const value = String(hex).trim().replace("#", "").toUpperCase();

  if (value.length === 6) return `FF${value}`;
  if (value.length === 8) return value;

  return undefined;
}

function argbToHex(argb) {
  if (!argb) return undefined;

  const value = String(argb).toUpperCase().replace("#", "");

  if (value.length === 8) return `#${value.slice(2)}`;
  if (value.length === 6) return `#${value}`;

  return undefined;
}

function normalizeRef(ref) {
  const value = String(ref || "").trim();

  return /^[A-Za-z]+\d+(?::[A-Za-z]+\d+)?$/.test(value) ? value : null;
}

function appStyleToExcelStyle(style) {
  if (!style) return undefined;

  const result = {};

  if (style.bg) {
    result.fill = {
      type: "pattern",
      pattern: "solid",
      bgColor: {
        argb: hexToArgb(style.bg),
      },
    };
  }

  const font = {};

  if (style.color) {
    font.color = {
      argb: hexToArgb(style.color),
    };
  }

  if (style.bold) font.bold = true;
  if (style.italic) font.italic = true;

  if (Object.keys(font).length) {
    result.font = font;
  }

  return Object.keys(result).length ? result : undefined;
}

function excelStyleToAppStyle(style) {
  if (!style) return undefined;

  const result = {};

  const background = argbToHex(
    style.fill?.bgColor?.argb || style.fill?.fgColor?.argb
  );

  if (background) result.bg = background;

  const color = argbToHex(style.font?.color?.argb);

  if (color) result.color = color;
  if (style.font?.bold) result.bold = true;
  if (style.font?.italic) result.italic = true;

  return Object.keys(result).length ? result : undefined;
}

function normalizeAppRule(rule, index) {
  if (!rule || typeof rule !== "object") return null;

  const type = String(rule.type || "").trim();
  const allowedTypes = new Set([
    "expression",
    "cellIs",
    "colorScale",
    "dataBar",
    "iconSet",
  ]);

  if (!allowedTypes.has(type)) return null;

  const normalized = {
    type,
    priority: Number.isFinite(rule.priority) ? rule.priority : index + 1,
  };

  if (rule.operator) normalized.operator = String(rule.operator);

  if (rule.stopIfTrue !== undefined) {
    normalized.stopIfTrue = Boolean(rule.stopIfTrue);
  }

  if (Array.isArray(rule.formulae)) {
    normalized.formulae = rule.formulae.map((formula) => String(formula));
  }

  const style = appStyleToExcelStyle(rule.style);

  if (style) normalized.style = style;

  if (type === "colorScale" && rule.colorScale) {
    normalized.colorScale = rule.colorScale;
  }

  if (type === "dataBar" && rule.dataBar) {
    normalized.dataBar = rule.dataBar;
  }

  if (type === "iconSet" && rule.iconSet) {
    normalized.iconSet = rule.iconSet;
  }

  return normalized;
}

function normalizeAppConditionalRules(sheet) {
  const source = Array.isArray(sheet?.conditionalRules)
    ? sheet.conditionalRules
    : [];
  const result = [];

  for (const item of source) {
    const ref = normalizeRef(item?.ref);

    if (!ref || !Array.isArray(item?.rules)) continue;

    const rules = item.rules
      .map((rule, index) => normalizeAppRule(rule, index))
      .filter(Boolean);

    if (rules.length) {
      result.push({
        ref,
        rules,
      });
    }
  }

  return result;
}

function excelRuleToAppRule(rule, index) {
  if (!rule || typeof rule !== "object") return null;

  const type = String(rule.type || "").trim();
  const allowedTypes = new Set([
    "expression",
    "cellIs",
    "colorScale",
    "dataBar",
    "iconSet",
  ]);

  if (!allowedTypes.has(type)) return null;

  const normalized = {
    type,
    priority: Number.isFinite(rule.priority) ? rule.priority : index + 1,
  };

  if (rule.operator) normalized.operator = String(rule.operator);

  if (rule.stopIfTrue !== undefined) {
    normalized.stopIfTrue = Boolean(rule.stopIfTrue);
  }

  if (Array.isArray(rule.formulae)) {
    normalized.formulae = rule.formulae.map((formula) => String(formula));
  }

  const style = excelStyleToAppStyle(rule.style);

  if (style) normalized.style = style;

  if (type === "colorScale" && rule.colorScale) {
    normalized.colorScale = rule.colorScale;
  }

  if (type === "dataBar" && rule.dataBar) {
    normalized.dataBar = rule.dataBar;
  }

  if (type === "iconSet" && rule.iconSet) {
    normalized.iconSet = rule.iconSet;
  }

  return normalized;
}

export function applyConditionalFormattingToWorksheet(worksheet, sheet) {
  const conditionalRules = normalizeAppConditionalRules(sheet);

  for (const item of conditionalRules) {
    worksheet.addConditionalFormatting(item);
  }
}

export function readConditionalFormattingFromWorksheet(sheet, worksheet) {
  const source = Array.isArray(worksheet?.conditionalFormattings)
    ? worksheet.conditionalFormattings
    : [];
  const result = [];

  for (const item of source) {
    const ref = normalizeRef(item?.ref);

    if (!ref || !Array.isArray(item?.rules)) continue;

    const rules = item.rules
      .map((rule, index) => excelRuleToAppRule(rule, index))
      .filter(Boolean);

    if (rules.length) {
      result.push({
        ref,
        rules,
      });
    }
  }

  sheet.conditionalRules = result;
}