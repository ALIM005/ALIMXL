import assert from "node:assert/strict";
import test from "node:test";

const {
  importXlsxFile,
  exportXlsxWorkbook,
} = await import("../lib/xlsx-format-io.mjs");

function createTestWorkbook() {
  return {
    workbookName: "ALIM XL Round Trip",
    sheets: [
      {
        id: "sheet_test_1",
        name: "Payroll",
        gridRows: 10,
        gridCols: 6,
        cells: {
          A1: {
            value: "Employee",
            style: {
              bold: true,
              bg: "#E5F1FB",
              color: "#106EBE",
              align: "center",
              wrap: true,
              borders: {
                top: true,
                bottom: true,
                left: true,
                right: true,
              },
              borderColor: "#333333",
              borderStyle: "solid",
            },
          },
          B1: {
            value: "Salary",
            style: {
              bold: true,
              bg: "#E5F1FB",
              color: "#106EBE",
              align: "center",
              wrap: true,
            },
          },
          C1: {
            value: "Bonus",
            style: {
              bold: true,
              bg: "#E5F1FB",
              color: "#106EBE",
              align: "center",
              wrap: true,
            },
          },
          A2: {
            value: "Rahim",
            style: {
              wrap: true,
            },
          },
          B2: {
            value: "25000",
            style: {
              numberFormat: "currency",
              currencyCode: "৳",
              decimals: 2,
            },
          },
          C2: {
            value: "0.15",
            style: {
              numberFormat: "percentage",
              decimals: 0,
            },
          },
          A3: {
            value: "Karim",
            style: {
              wrap: true,
            },
          },
          B3: {
            value: "32000",
            style: {
              numberFormat: "currency",
              currencyCode: "৳",
              decimals: 2,
            },
          },
          C3: {
            value: "0.20",
            style: {
              numberFormat: "percentage",
              decimals: 0,
            },
          },
          A5: {
            value: "Merged Header",
            style: {
              bold: true,
              bg: "#FFF3C4",
              wrap: true,
            },
            rowSpan: 1,
            colSpan: 3,
          },
          B5: {
            value: "",
            style: {
              wrap: true,
            },
            mergedInto: "A5",
          },
          C5: {
            value: "",
            style: {
              wrap: true,
            },
            mergedInto: "A5",
          },
        },
        groups: [],
        colGroups: [],
        hiddenRows: [],
        hiddenCols: [],
        filters: {},
        colWidths: {
          0: 140,
          1: 120,
          2: 100,
        },
        rowHeights: {
          0: 32,
        },
        frozenRows: 1,
        frozenCols: 0,
        charts: [],
        conditionalRules: [],
        namedRanges: {},
        drawings: [],
      },
    ],
  };
}

function createHelpers() {
  return {
    getCellValueInSheet: (sheet, key) => {
      const cell = sheet.cells[key];
      return cell?.value ?? "";
    },
    normalizeDigitsOutsideQuotes: (value) => value,
    parseDateTextToSerial: () => null,
    strictNumber: (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    },
    findCurrency: (code) => ({
      code,
      symbol: code || "৳",
    }),
    FORMULA_ERRORS: new Set(),
  };
}

test("XLSX export creates a valid Excel workbook blob", async () => {
  const workbook = createTestWorkbook();

  const blob = await exportXlsxWorkbook({
    workbookName: workbook.workbookName,
    sheets: workbook.sheets,
    helpers: createHelpers(),
    options: {
      maxRows: 10000,
      maxCols: 200,
      defaultRows: 100,
      defaultCols: 26,
    },
  });

  assert.ok(blob instanceof Blob);
  assert.equal(
    blob.type,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  assert.ok(blob.size > 0);
});

test("XLSX round-trip preserves core formatting", async () => {
  const workbook = createTestWorkbook();

  const exportedBlob = await exportXlsxWorkbook({
    workbookName: workbook.workbookName,
    sheets: workbook.sheets,
    helpers: createHelpers(),
    options: {
      maxRows: 10000,
      maxCols: 200,
      defaultRows: 100,
      defaultCols: 26,
    },
  });

  const buffer = await exportedBlob.arrayBuffer();

  const file = new File([buffer], "round-trip.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const imported = await importXlsxFile(file, {
    maxRows: 10000,
    maxCols: 200,
    defaultRows: 100,
    defaultCols: 26,
  });

  assert.ok(Array.isArray(imported.sheets));
  assert.equal(imported.sheets.length, 1);

 const sheet = imported.sheets[0];

  assert.equal(sheet.name, "Payroll");
  assert.ok(sheet.colWidths[0] > 0);
  assert.ok(sheet.rowHeights[0] > 0);

  assert.equal(sheet.cells.A1?.value, "Employee");
  assert.equal(sheet.cells.A1?.style?.bold, true);
  assert.equal(sheet.cells.A1?.style?.bg, "#E5F1FB");

  assert.equal(sheet.cells.B2?.style?.numberFormat, "currency");
  assert.equal(sheet.cells.C2?.style?.numberFormat, "percentage");

  assert.equal(sheet.cells.B5?.mergedInto, "A5");
  assert.equal(sheet.cells.C5?.mergedInto, "A5");
});

test("XLSX import rejects an invalid workbook", async () => {
  const invalidFile = new File([new Uint8Array([1, 2, 3])], "invalid.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  await assert.rejects(
    () =>
      importXlsxFile(invalidFile, {
        maxRows: 10000,
        maxCols: 200,
        defaultRows: 100,
        defaultCols: 26,
      }),
    (error) => error instanceof Error
  );
});