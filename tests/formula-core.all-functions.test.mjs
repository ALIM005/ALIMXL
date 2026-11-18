import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormulaCore, FORMULA_CORE_VERSION } from "../lib/formula-core.mjs";

const cells = {
  A1: { value: "2" }, A2: { value: "3" }, A3: { value: "4" },
  B1: { value: "10" }, B2: { value: "20" },
  C1: { value: "hello" }, C2: { value: "WORLD" }, D1: { value: "0" },
  F1: { value: "apple" }, F2: { value: "banana" }, F3: { value: "cherry" },
  G1: { value: "1" }, G2: { value: "2" }, G3: { value: "3" },
  H1: { value: "5" }, H2: { value: "5" }, H3: { value: "5" },
  N1: { value: 5 },
};

const ctx = {
  getCell: (key) => {
    const ref = key.includes("!") ? key.split("!")[1] : key;
    const cell = cells[ref];
    return cell ? cell.value : "";
  },
  expandRange: (range) => {
    const ref = range.includes("!") ? range.split("!")[1] : range;
    const map = {
      "A1:A3": [2, 3, 4],
      "B1:B2": [10, 20],
      "F1:F3": ["apple", "banana", "cherry"],
      "G1:G3": [1, 2, 3],
      "H1:H3": [5, 5, 5],
    };
    return map[ref] ?? [];
  },
};

const ev = (f) => evaluateFormulaCore(f, ctx);

test("exports version", () => {
  assert.equal(FORMULA_CORE_VERSION, "formula-core-1");
});

test("math functions", () => {
  assert.equal(ev("=ABS(-5)"), 5);
  assert.equal(ev("=CEILING(2.3,1)"), 3);
  assert.equal(ev("=FLOOR(2.7,1)"), 2);
  assert.equal(ev("=INT(2.7)"), 2);
  assert.equal(ev("=MOD(10,3)"), 1);
  assert.equal(ev("=POWER(2,3)"), 8);
  assert.equal(ev("=PRODUCT(A1:A3)"), 24);
  assert.equal(ev("=ROUND(2.5,0)"), 3);
  assert.equal(ev("=ROUNDDOWN(2.7,0)"), 2);
  assert.equal(ev("=ROUNDUP(2.3,0)"), 3);
  assert.equal(ev("=SQRT(9)"), 3);
  assert.equal(ev("=SUM(A1:A3)"), 9);
});

test("statistical functions", () => {
  assert.equal(ev("=AVERAGE(A1:A3)"), 3);
  assert.equal(ev("=COUNT(A1:A3)"), 3);
  assert.equal(ev("=COUNTA(A1:A3)"), 3);
  assert.equal(ev("=LARGE(A1:A3,1)"), 4);
  assert.equal(ev("=MAX(A1:A3)"), 4);
  assert.equal(ev("=MEDIAN(A1:A3)"), 3);
  assert.equal(ev("=MIN(A1:A3)"), 2);
  assert.equal(ev("=SMALL(A1:A3,1)"), 2);
  assert.equal(ev("=STDEV(A1:A3)"), 1);
  assert.ok(Math.abs(ev("=STDEVP(A1:A3)") - 0.816496580927726) < 1e-12);
  assert.equal(ev("=VAR(A1:A3)"), 1);
  assert.ok(Math.abs(ev("=VARP(A1:A3)") - 0.666666666666667) < 1e-12);
  assert.equal(ev("=RANK(3,A1:A3)"), 2);
});

test("conditional aggregates", () => {
  assert.equal(ev('=AVERAGEIF(A1:A3,">2")'), 3.5);
  assert.equal(ev('=AVERAGEIFS(A1:A3,A1:A3,">2")'), 3.5);
  assert.equal(ev('=COUNTIF(A1:A3,">2")'), 2);
  assert.equal(ev('=COUNTIFS(A1:A3,">2")'), 2);
  assert.equal(ev('=SUMIF(A1:A3,">2")'), 7);
  assert.equal(ev('=SUMIFS(A1:A3,A1:A3,">2")'), 7);
  assert.equal(ev("=SUMPRODUCT(A1:A3,G1:G3)"), 20);
});

test("text functions", () => {
  assert.equal(ev('=CONCAT("a","b")'), "ab");
  assert.equal(ev('=CONCATENATE("a","b")'), "ab");
  assert.equal(ev('=FIND("l",C1)'), 3);
  assert.equal(ev("=LEFT(C1,2)"), "he");
  assert.equal(ev("=LEN(C1)"), 5);
  assert.equal(ev("=LOWER(C1)"), "hello");
  assert.equal(ev("=PROPER(C1)"), "Hello");
  assert.equal(ev('=SEARCH("L",C1)'), 3);
  assert.equal(ev('=SUBSTITUTE(C1,"l","L")'), "heLLo");
  assert.equal(ev('=TEXT(1234.5,"0.00")'), "1,234.50");
  assert.equal(ev('=TEXTJOIN(",",TRUE,A1:A3)'), "2,3,4");
  assert.equal(ev('=TRIM("  x  ")'), "x");
  assert.equal(ev("=UPPER(C1)"), "HELLO");
  assert.equal(ev('=VALUE("123")'), 123);
});

test("lookup functions", () => {
  assert.equal(ev('=VLOOKUP("banana",F1:F3,1,FALSE)'), "banana");
  assert.equal(ev('=XLOOKUP("banana",F1:F3,F1:F3)'), "banana");
  assert.equal(ev('=XMATCH("cherry",F1:F3)'), 3);
});

test("logical functions", () => {
  assert.equal(ev("=AND(TRUE,TRUE)"), true);
  assert.equal(ev("=FALSE()"), false);
  assert.equal(ev("=IF(1<2,1,2)"), 1);
  assert.equal(ev('=IFERROR(1/0,"e")'), "e");
  assert.equal(ev('=IFS(1<2,"a",TRUE,"b")'), "a");
  assert.equal(ev("=ISBLANK(Z1)"), true);
  assert.equal(ev("=ISNUMBER(N1)"), true);
  assert.equal(ev("=NOT(FALSE)"), true);
  assert.equal(ev("=OR(FALSE,TRUE)"), true);
  assert.equal(ev('=SWITCH(1,1,"one",2,"two")'), "one");
  assert.equal(ev("=TRUE()"), true);
});

test("row and column", () => {
  assert.equal(ev("=COLUMN(B1)"), 2);
  assert.equal(ev("=ROW(B1)"), 1);
});

test("financial functions", () => {
  const pmt = ev("=PMT(0.01,12,1000)");
  assert.equal(typeof pmt, "number");
  assert.ok(Math.abs(pmt + 88.8487886783417) < 1e-9);
});

test("dynamic array behavior (first value returned)", () => {
  assert.equal(ev("=SEQUENCE(3)"), 1);
  assert.equal(ev("=SORT(A1:A3)"), "2");
  assert.equal(ev("=UNIQUE(H1:H3)"), "5");
});

test("known limitations", () => {
  assert.equal(ev('=CONVERT(1,"m","cm")'), "#VALUE!");
  assert.equal(ev("=FILTER(F1:F3,A1:A3>2)"), "#VALUE!");
});

test("non-deterministic functions return valid types", () => {
  const rand = ev("=RAND()");
  assert.equal(typeof rand, "number");
  assert.ok(rand >= 0 && rand < 1);
  assert.equal(typeof ev("=NOW()"), "string");
  assert.equal(typeof ev("=TODAY()"), "number");
});
