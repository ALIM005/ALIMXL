import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormulaCore, FORMULA_CORE_VERSION } from "../lib/formula-core.mjs";

const cells = {
  A1: { value: "2" },
  A2: { value: "3" },
  A3: { value: "4" },
  B1: { value: "\u09E6\u09E9" },
  C1: { value: "\u0661\u0662" },
  D1: { value: "$A$1" },
  E1: { value: "#REF!" },
  F1: { value: "abc" },
  G1: { value: 5 },
};

const ctx = {
  getCell: (key) => {
    const ref = key.includes("!") ? key.split("!")[1] : key;
    const cell = cells[ref];
    return cell ? cell.value : "";
  },
  expandRange: (range) => {
    const ref = range.includes("!") ? range.split("!")[1] : range;
    if (ref === "A1:A3") return [2, 3, 4];
    return [];
  },
};

const ev = (f) => evaluateFormulaCore(f, ctx);

test("exports version", () => {
  assert.equal(FORMULA_CORE_VERSION, "formula-core-1");
});

test("localization: Bengali digits normalized", () => {
  assert.equal(ev("=B1+1"), 4);
});

test("localization: Arabic-Indic digits normalized", () => {
  assert.equal(ev("=C1+1"), 13);
});

test("error literal passes through", () => {
  assert.equal(ev("=E1"), "#REF!");
  assert.equal(ev('=IFERROR(E1,"err")'), "err");
});

test("text and number coercion", () => {
  assert.equal(ev("=F1&1"), "abc1");
  assert.equal(ev("=G1+1"), 6);
  assert.equal(ev("=ISNUMBER(G1)"), true);
});

test("row and column", () => {
  assert.equal(ev("=COLUMN(B1)"), 2);
  assert.equal(ev("=ROW(B1)"), 1);
});

test("population variance and stdev", () => {
  assert.ok(Math.abs(ev("=VARP(A1:A3)") - 0.666666666666667) < 1e-12);
  assert.ok(Math.abs(ev("=STDEVP(A1:A3)") - 0.816496580927726) < 1e-12);
});

test("CONVERT unit codes not supported (known limitation)", () => {
  assert.equal(ev('=CONVERT(1,"m","cm")'), "#VALUE!");
});
