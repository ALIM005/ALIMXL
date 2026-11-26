import assert from "node:assert/strict";
import test from "node:test";

const {
  importXlsxFile,
  exportXlsxWorkbook,
} = await import("../lib/xlsx-format-io.mjs");

function createSheet() {
  return {
    id: "conditional_test_sheet",
    name: "Conditional",
    gridRows: 10,
    gridCols: 6,
    cells: {
      A1: {
        value: "Score",
        style: {
          bold: true,
          wrap: true,
        },
      },
      A2: {
        value: "80",
      },
      A3: {
        value: "40",
      },
    },
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
    conditionalRules: [
      {
        ref: "A2:A3",
        rules: [
          {
            type: "cellIs",
            operator: "greaterThan",
            formulae: ["70"],
            priority: 1,
            style: {
              bg: "#22C55E",
              color: "#FFFFFF",
              bold: true,
            },
          },
        ],
      },
      {
        ref: "A2:A3",
        rules: [
          {
            type: "expression",
            formulae: ["A2<50"],
            priority: 2,
            style: {
              bg: "#EF4444",
            },
          },
        ],
      },
    ],
    namedRanges: {},
    dataValidations: [],
    drawings: [],
  };
}

function createHelpers() {
  return {
    getCellValueInSheet: (sheet, key) => sheet.cells[key]?.value ?? "",
    normalizeDigitsOutsideQuotes: (value) => value,
    parseDateTextToSerial: () => null,
    strictNumber: (value) => {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : null;
    },
    FORMULA_ERRORS: new Set(),
  };
}

test("XLSX round-trip preserves conditional formatting", async () => {
  const exported = await exportXlsxWorkbook({
    workbookName: "Conditional Format Test",
    sheets: [createSheet()],
    helpers: createHelpers(),
  });

  const buffer = await exported.arrayBuffer();
  const file = new File([buffer], "conditional.xlsx", {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const imported = await importXlsxFile(file);

  assert.equal(imported.sheets.length, 1);

  const rules = imported.sheets[0].conditionalRules;

  assert.ok(Array.isArray(rules));
  assert.equal(rules.length, 2);

  const cellRule = rules.find(
    (item) =>
      item.ref === "A2:A3" &&
      item.rules.some((rule) => rule.type === "cellIs")
  );

  assert.ok(cellRule);

  const greaterThanRule = cellRule.rules.find(
    (rule) => rule.type === "cellIs"
  );

  assert.equal(greaterThanRule.operator, "greaterThan");
  assert.deepEqual(greaterThanRule.formulae, ["70"]);
  assert.equal(greaterThanRule.style.bg, "#22C55E");
  assert.equal(greaterThanRule.style.color, "#FFFFFF");
  assert.equal(greaterThanRule.style.bold, true);

  const expressionRule = rules
    .flatMap((item) => item.rules)
    .find((rule) => rule.type === "expression");

  assert.ok(expressionRule);
  assert.deepEqual(expressionRule.formulae, ["A2<50"]);
  assert.equal(expressionRule.style.bg, "#EF4444");
});