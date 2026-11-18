import { test } from "node:test";
import assert from "node:assert/strict";
import { getCellValueInSheet, FORMULA_CORE_VERSION } from "../lib/formula-core.mjs";

const sheet1 = {
  id: "S1",
  name: "Sheet1",
  cells: {
    A1: { value: "2" },
    A2: { value: "3" },
    A3: { value: "4" },
    B1: { value: "=SUM(A1:A3)" },
    B2: { value: "=Sheet2!A1*2" },
    C1: { value: "=B1+B2" },
    D1: { value: "=D1" },
    E1: { value: "=1/0" },
    F1: { value: "=E1+1" },
    G1: { value: "=SUM(Sheet2!A1:A2)" },
  },
};

const sheet2 = {
  id: "S2",
  name: "Sheet2",
  cells: {
    A1: { value: "10" },
    A2: { value: "5" },
  },
};

const allSheets = [sheet1, sheet2];

test("exports version", () => {
  assert.equal(FORMULA_CORE_VERSION, "formula-core-1");
});

test("sums local range", () => {
  assert.equal(getCellValueInSheet(sheet1, "B1", undefined, allSheets), 9);
});

test("cross-sheet reference", () => {
  assert.equal(getCellValueInSheet(sheet1, "B2", undefined, allSheets), 20);
});

test("dependent chain across sheets", () => {
  assert.equal(getCellValueInSheet(sheet1, "C1", undefined, allSheets), 29);
});

test("cross-sheet range sum", () => {
  assert.equal(getCellValueInSheet(sheet1, "G1", undefined, allSheets), 15);
});

test("self reference is circular", () => {
  assert.equal(getCellValueInSheet(sheet1, "D1", undefined, allSheets), "#CIRCULAR!");
});

test("error propagates through dependency", () => {
  assert.equal(getCellValueInSheet(sheet1, "E1", undefined, allSheets), "#DIV/0!");
  assert.equal(getCellValueInSheet(sheet1, "F1", undefined, allSheets), "#DIV/0!");
});
