import test from "node:test";
import assert from "node:assert/strict";

import ExcelJS from "exceljs";

import {
  applyNamedRangesToWorkbook,
  readNamedRangesFromWorkbook,
  buildNamedRangesXml,
} from "../lib/xlsx-named-ranges.mjs";

function createWorkbookData() {
  return {
    sheets: [
      {
        id: "sheet-1",
        name: "Sales",
        cells: {
          A1: { value: "Product" },
          B1: { value: "Amount" },
          A2: { value: "Keyboard" },
          B2: { value: 120 },
          A3: { value: "Mouse" },
          B3: { value: 80 },
        },
      },
    ],
  };
}

async function createWorkbook() {
  const workbook = new ExcelJS.Workbook();

  workbook.addWorksheet("Sales");

  const sheet = workbook.getWorksheet("Sales");

  sheet.getCell("A1").value = "Product";
  sheet.getCell("B1").value = "Amount";
  sheet.getCell("A2").value = "Keyboard";
  sheet.getCell("B2").value = 120;
  sheet.getCell("A3").value = "Mouse";
  sheet.getCell("B3").value = 80;

  return workbook;
}

test("named ranges module exports required functions", () => {
  assert.equal(typeof applyNamedRangesToWorkbook, "function");
  assert.equal(typeof readNamedRangesFromWorkbook, "function");
  assert.equal(typeof buildNamedRangesXml, "function");
});

test("normalizes a valid workbook-level named range", () => {
  const xml = buildNamedRangesXml([
    {
      name: "SalesData",
      reference: "Sales!$A$1:$B$3",
      scope: "workbook",
    },
  ]);

  const workbookData = createWorkbookData();
  const workbook = createWorkbook();

  const result = readNamedRangesFromWorkbook(
    workbookData,
    workbook,
    xml
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "SalesData");
  assert.equal(result[0].reference, "Sales!$A$1:$B$3");
  assert.equal(result[0].scope, "workbook");
});

test("rejects invalid named range names", () => {
  const workbookData = createWorkbookData();

  workbookData.sheets[0].namedRanges = [
    {
      name: "",
      reference: "Sales!$A$1:$B$3",
    },
    {
      name: "Bad:Name",
      reference: "Sales!$A$1:$B$3",
    },
    {
      name: "123",
      reference: "Sales!$A$1:$B$3",
    },
    {
      name: "TRUE",
      reference: "Sales!$A$1:$B$3",
    },
  ];

  const workbook = createWorkbook();

  applyNamedRangesToWorkbook(workbook, workbookData);

  const model = workbook.definedNames?.model;
  const entries = Array.isArray(model) ? model : [];

  assert.equal(entries.length, 0);
});

test("rejects named ranges without a reference", () => {
  const workbookData = createWorkbookData();

  workbookData.sheets[0].namedRanges = [
    {
      name: "EmptyRange",
      reference: "",
    },
    {
      name: "MissingRange",
    },
  ];

  const workbook = createWorkbook();

  applyNamedRangesToWorkbook(workbook, workbookData);

  const model = workbook.definedNames?.model;
  const entries = Array.isArray(model) ? model : [];

  assert.equal(entries.length, 0);
});

test("deduplicates named ranges with the same scope and name", () => {
  const xml = buildNamedRangesXml([
    {
      name: "SalesData",
      reference: "Sales!$A$1:$B$3",
      scope: "workbook",
    },
    {
      name: "salesdata",
      reference: "Sales!$A$1:$B$3",
      scope: "workbook",
    },
  ]);

  const workbookData = createWorkbookData();
  const workbook = createWorkbook();

  const result = readNamedRangesFromWorkbook(
    workbookData,
    workbook,
    xml
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "SalesData");
});

test("builds XML for workbook and worksheet named ranges", () => {
  const xml = buildNamedRangesXml([
    {
      name: "SalesData",
      reference: "Sales!$A$1:$B$3",
      scope: "workbook",
    },
    {
      name: "RegionFilter",
      reference: "Sales!$A$2:$A$3",
      scope: "worksheet",
      sheetName: "Sales",
    },
  ]);

  assert.ok(xml.includes("<definedNames>"));
  assert.ok(xml.includes('name="SalesData"'));
  assert.ok(xml.includes("Sales!$A$1:$B$3"));
  assert.ok(xml.includes('name="RegionFilter"'));
  assert.ok(xml.includes('localSheetId="0"'));
  assert.ok(xml.includes("Sales!$A$2:$A$3"));
});

test("returns empty XML when no named ranges exist", () => {
  assert.equal(buildNamedRangesXml([]), "");
  assert.equal(buildNamedRangesXml(undefined), "");
});

test("escapes XML-sensitive characters in named range metadata", () => {
  const xml = buildNamedRangesXml([
    {
      name: "SafeName",
      reference: "Sales!$A$1",
      comment: 'Contains <tags> & "quotes"',
    },
  ]);

  assert.ok(xml.includes("&lt;tags&gt;"));
  assert.ok(xml.includes("&amp;"));
  assert.ok(xml.includes("&quot;quotes&quot;"));
});

test("parses workbook-level named range from workbook XML", () => {
  const workbookData = createWorkbookData();
  const workbook = createWorkbook();

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <definedNames>
    <definedName name="SalesData">Sales!$A$1:$B$3</definedName>
  </definedNames>
</workbook>`;

  const result = readNamedRangesFromWorkbook(
    workbookData,
    workbook,
    xml
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "SalesData");
  assert.equal(result[0].reference, "Sales!$A$1:$B$3");
  assert.equal(result[0].scope, "workbook");
  assert.equal(workbookData.namedRanges.length, 1);
  assert.equal(workbook.namedRanges.length, 1);
});

test("parses worksheet-level named range and resolves sheet name", () => {
  const workbookData = createWorkbookData();
  const workbook = createWorkbook();

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <definedNames>
    <definedName name="RegionFilter" localSheetId="0">Sales!$A$2:$A$3</definedName>
  </definedNames>
</workbook>`;

  const result = readNamedRangesFromWorkbook(
    workbookData,
    workbook,
    xml
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "RegionFilter");
  assert.equal(result[0].reference, "Sales!$A$2:$A$3");
  assert.equal(result[0].scope, "worksheet");
  assert.equal(result[0].sheetName, "Sales");
  assert.equal(result[0].localSheetId, 0);
});

test("decodes XML entities in named range reference and metadata", () => {
  const workbookData = createWorkbookData();
  const workbook = createWorkbook();

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <definedNames>
    <definedName name="SafeName" comment="Contains &lt;tags&gt; &amp; &quot;quotes&quot;">Sales!$A$1</definedName>
  </definedNames>
</workbook>`;

  const result = readNamedRangesFromWorkbook(
    workbookData,
    workbook,
    xml
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].reference, "Sales!$A$1");
  assert.equal(
    result[0].comment,
    'Contains <tags> & "quotes"'
  );
});

test("round-trips a workbook-level named range through XLSX", async () => {
  const workbookData = createWorkbookData();

  workbookData.sheets[0].namedRanges = [
    {
      name: "SalesData",
      reference: "Sales!$A$1:$B$3",
      scope: "workbook",
    },
  ];

  const sourceWorkbook = await createWorkbook();

  applyNamedRangesToWorkbook(sourceWorkbook, workbookData);

  const buffer = await sourceWorkbook.xlsx.writeBuffer();

  const importedWorkbook = new ExcelJS.Workbook();

  await importedWorkbook.xlsx.load(buffer);

  const importedSheet = importedWorkbook.getWorksheet("Sales");

  assert.ok(importedSheet);

  const model = importedWorkbook.definedNames?.model;
  const entries = Array.isArray(model) ? model : [];

  const salesData = entries.find(
    (item) => item.name === "SalesData"
  );

  assert.ok(salesData);
  assert.ok(
    salesData.ranges.includes("Sales!$A$1:$B$3") ||
      salesData.ranges.includes("Sales!A1:B3")
  );
});

test("round-trips metadata through XML generation and parsing", () => {
  const workbookData = createWorkbookData();
  const workbook = createWorkbook();

  const namedRanges = [
    {
      name: "SalesData",
      reference: "Sales!$A$1:$B$3",
      scope: "workbook",
      comment: "Primary sales range",
      hidden: false,
    },
    {
      name: "HiddenRange",
      reference: "Sales!$A$2:$A$3",
      scope: "worksheet",
      sheetName: "Sales",
      hidden: true,
      status: "active",
    },
  ];

  const xml = buildNamedRangesXml(namedRanges);

  const result = readNamedRangesFromWorkbook(
    workbookData,
    workbook,
    xml
  );

  assert.equal(result.length, 2);

  const salesData = result.find(
    (item) => item.name === "SalesData"
  );

  assert.ok(salesData);
  assert.equal(salesData.comment, "Primary sales range");
  assert.equal(salesData.hidden, false);

  const hiddenRange = result.find(
    (item) => item.name === "HiddenRange"
  );

  assert.ok(hiddenRange);
  assert.equal(hiddenRange.hidden, true);
  assert.equal(hiddenRange.status, "active");
  assert.equal(hiddenRange.sheetName, "Sales");
});