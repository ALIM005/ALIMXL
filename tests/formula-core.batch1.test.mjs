// Batch 1 টেস্ট: ৫০টি নতুন ফাংশন
//
// ১) LibreOffice oracle (tests/oracle/batch1.oracle.json), যেখানে Excel আলাদা সেখানে OVERRIDES
// ২) Microsoft ডকুমেন্টেশনের উদাহরণ (MANUAL)
// ৩) পুরোনো ফাংশনের সঙ্গে সামঞ্জস্য (STDEV.S == STDEV ইত্যাদি)
// ৪) কাঠামোগত যাচাই: ৫০টি, ডুপ্লিকেট নেই, বিদ্যমান ১৬০-এর সঙ্গে সংঘাত নেই
//
// oracle নতুন করে বানাতে: python3 tests/oracle/build-oracle.py

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateFormulaCore } from "../lib/formula-core.mjs";
import { BATCH1_FUNCTION_NAMES } from "../lib/batch1-functions.mjs";

const oracle = JSON.parse(fs.readFileSync(new URL("./oracle/batch1.oracle.json", import.meta.url), "utf8"));

function colToNum(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function numToCol(c) {
  let s = "";
  let n = c;
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
function makeCtx(map) {
  const get = (key) => {
    const ref = key.includes("!") ? key.split("!")[1] : key;
    return Object.prototype.hasOwnProperty.call(map, ref) ? map[ref] : "";
  };
  return {
    getCell: get,
    expandRange: (range) => {
      const ref = range.includes("!") ? range.split("!")[1] : range;
      const [a, b = a] = ref.split(":");
      const pa = /^([A-Z]+)(\d+)$/.exec(a);
      const pb = /^([A-Z]+)(\d+)$/.exec(b);
      const out = [];
      for (let r = +pa[2]; r <= +pb[2]; r++)
        for (let c = colToNum(pa[1]); c <= colToNum(pb[1]); c++) out.push(get(`${numToCol(c)}${r}`));
      return out;
    },
  };
}

const sheet = { ...oracle.data };
for (const k of oracle.errorCells) sheet[k] = "#N/A";
const ctx = makeCtx(sheet);
const calc = (f) => evaluateFormulaCore(f, ctx);

const ERRORS = new Set(["#DIV/0!", "#NAME?", "#ERROR!", "#CIRCULAR!", "#VALUE!", "#REF!", "#N/A", "#NUM!"]);
const isErr = (v) => typeof v === "string" && ERRORS.has(v);

function loToJs(s) {
  if (s === "TRUE") return true;
  if (s === "FALSE") return false;
  if (s !== "" && !Number.isNaN(Number(s))) return Number(s);
  return s;
}
function sameValue(got, exp, relTol = 1e-9) {
  if (typeof got === "number" && typeof exp === "number") return Math.abs(got - exp) <= Math.max(relTol * Math.abs(exp), 1e-12);
  if (typeof got === "string") return got === String(exp); // টেক্সট-ফল ("1234.6") সংখ্যার মতো দেখালেও টেক্সট
  if (typeof got === "boolean" && typeof exp === "number") return got === (exp !== 0); // LO CSV বুলিয়ানকে 1/0 লেখে
  return got === exp;
}

const overrides = new Map(oracle.overrides.map((o) => [o.formula, o]));

test("oracle: প্রতিটি কেস LibreOffice/Excel-এর সঙ্গে মেলে", () => {
  const failures = [];
  let anyErrorChecks = 0;
  let compared = 0;
  for (const c of oracle.cases) {
    if (c.lo === null || c.lo === "") continue; // LibreOffice ফাঁকা দিলে যাচাই-অযোগ্য
    const ov = overrides.get(c.formula);
    let got;
    try {
      got = calc(c.formula);
    } catch (e) {
      got = `THROW:${e.message}`;
    }
    if (ov) {
      compared++;
      if (!sameValue(got, ov.expected)) failures.push(`${c.formula}  →  পেয়েছি ${JSON.stringify(got)}, প্রত্যাশিত ${JSON.stringify(ov.expected)} (${ov.reason})`);
      continue;
    }
    if (/^Err:\d+$/.test(c.lo)) {
      // LibreOffice নির্দিষ্ট Excel-এরর ধরন দেয় না → শুধু "এরর" হওয়া যাচাই
      anyErrorChecks++;
      if (!isErr(got)) failures.push(`${c.formula}  →  এরর প্রত্যাশিত (LO ${c.lo}), পেয়েছি ${JSON.stringify(got)}`);
      continue;
    }
    compared++;
    if (!sameValue(got, loToJs(c.lo))) failures.push(`${c.formula}  →  পেয়েছি ${JSON.stringify(got)}, LO ${JSON.stringify(c.lo)}`);
  }
  assert.equal(failures.length, 0, `\n${failures.length}টি অমিল (তুলনা ${compared}, এরর-যাচাই ${anyErrorChecks}):\n` + failures.join("\n"));
  assert.ok(compared > 300, `পর্যাপ্ত কেস তুলনা হয়নি: ${compared}`);
});

test("Microsoft ডক-উদাহরণ ও হাতে-যাচাই করা কেস", () => {
  const failures = [];
  for (const m of oracle.manual) {
    let got;
    try {
      got = calc(m.formula);
    } catch (e) {
      got = `THROW:${e.message}`;
    }
    if (!sameValue(got, m.expected, 1e-6)) failures.push(`${m.formula}  →  পেয়েছি ${JSON.stringify(got)}, প্রত্যাশিত ${JSON.stringify(m.expected)}`);
  }
  assert.equal(failures.length, 0, `\n` + failures.join("\n"));
});

test("সামঞ্জস্য: STDEV.S/STDEV.P/VAR.S/VAR.P বিদ্যমান STDEV/STDEVP/VAR/VARP-এর সমান", () => {
  const pairs = [["STDEV.S", "STDEV"], ["STDEV.P", "STDEVP"], ["VAR.S", "VAR"], ["VAR.P", "VARP"]];
  for (const range of ["A1:A8", "N1:N7", "C1:C5", "B1:B6", "M1:M5"]) {
    for (const [nu, old] of pairs) {
      const a = calc(`=${nu}(${range})`);
      const b = calc(`=${old}(${range})`);
      assert.deepEqual(a, b, `${nu}(${range}) ≠ ${old}(${range}): ${a} vs ${b}`);
    }
  }
});

test("সামঞ্জস্য: RANK.AVG ও বিদ্যমান RANK; ISNONTEXT বনাম ISTEXT", () => {
  assert.equal(calc("=RANK.AVG(7,M1:M5)"), calc("=RANK(7,M1:M5)"));
  for (const arg of ["5", '"a"', "A1", "B2", "A9", "G2", "TRUE"]) {
    assert.equal(calc(`=ISNONTEXT(${arg})`), !calc(`=ISTEXT(${arg})`), `ISNONTEXT(${arg})`);
  }
  // WORKDAY.INTL(…,1) ডিফল্ট সপ্তাহান্ত = বিদ্যমান WORKDAY
  assert.equal(calc("=WORKDAY.INTL(DATE(2024,1,5),3)"), calc("=WORKDAY(DATE(2024,1,5),3)"));
  assert.equal(calc("=NETWORKDAYS.INTL(DATE(2024,1,1),DATE(2024,3,31))"), calc("=NETWORKDAYS(DATE(2024,1,1),DATE(2024,3,31))"));
});

test("কাঠামো: ঠিক ৫০টি, ডুপ্লিকেট নেই, বিদ্যমান ফাংশনের সঙ্গে সংঘাত নেই", () => {
  assert.equal(BATCH1_FUNCTION_NAMES.length, 50);
  assert.equal(new Set(BATCH1_FUNCTION_NAMES).size, 50);
  const core = fs.readFileSync(new URL("../lib/formula-core.mjs", import.meta.url), "utf8");
  const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const spill = fs.readFileSync(new URL("../lib/spill-functions.mjs", import.meta.url), "utf8");
  const caseNames = new Set();
  for (const src of [core, page, spill]) for (const m of src.matchAll(/case\s+["']([A-Z][A-Z0-9_.]*)["']\s*:/g)) caseNames.add(m[1]);
  const clash = BATCH1_FUNCTION_NAMES.filter((n) => caseNames.has(n));
  assert.deepEqual(clash, [], `বিদ্যমান ইঞ্জিনে আগে থেকেই আছে: ${clash.join(", ")}`);
});

test("কাঠামো: ৫০টির প্রতিটি ইঞ্জিনে স্বীকৃত (#NAME? নয়)", () => {
  // প্রতিটিকে বৈধ আর্গুমেন্ট দিয়ে ডাকা; #NAME? না এলেই ইঞ্জিন চিনেছে
  const sample = {
    SUMSQ: "1,2", EVEN: "1", ODD: "1", QUOTIENT: "5,2", "CEILING.MATH": "1.2", "FLOOR.MATH": "1.2", COMBIN: "5,2", PERMUT: "5,2",
    "STDEV.S": "A1:A8", "STDEV.P": "A1:A8", "VAR.S": "A1:A8", "VAR.P": "A1:A8", GEOMEAN: "2,8", DEVSQ: "A1:A8", "RANK.AVG": "4,A1:A8", "PERCENTRANK.INC": "A1:A8,5",
    TEXTBEFORE: '"a-b","-"', TEXTAFTER: '"a-b","-"', NUMBERVALUE: '"1"', FIXED: "1.5", DOLLAR: "1.5", T: '"x"',
    DATEVALUE: '"2024-03-15"', TIMEVALUE: '"10:00"', YEARFRAC: "DATE(2024,1,1),DATE(2024,6,1)", DAYS360: "DATE(2024,1,1),DATE(2024,6,1)", ISOWEEKNUM: "DATE(2024,1,1)", "NETWORKDAYS.INTL": "DATE(2024,1,1),DATE(2024,1,9)", "WORKDAY.INTL": "DATE(2024,1,1),2",
    ISODD: "3", ISEVEN: "3", ISLOGICAL: "TRUE", ISNONTEXT: "1", N: "1", TYPE: "1", NA: "", XOR: "TRUE,FALSE",
    LOOKUP: "3,H1:H3,I1:I3", ADDRESS: "1,1", HYPERLINK: '"u","n"', AGGREGATE: "9,6,A1:A8",
    SLN: "100,10,5", DB: "1000,100,5,1", DDB: "1000,100,5,1", SYD: "1000,100,5,1", CUMIPMT: "0.01,12,1000,1,2,0", CUMPRINC: "0.01,12,1000,1,2,0", EFFECT: "0.1,4", NOMINAL: "0.1,4", MIRR: "E1:E6,0.1,0.1",
  };
  assert.deepEqual(Object.keys(sample).sort(), [...BATCH1_FUNCTION_NAMES].sort());
  for (const [fn, args] of Object.entries(sample)) {
    const got = calc(`=${fn}(${args})`);
    assert.notEqual(got, "#NAME?", `${fn} চেনা যায়নি`);
  }
});

test("নিরাপত্তা: ভুল আর্গুমেন্ট সংখ্যা ও অদ্ভুত ইনপুটে ক্র্যাশ নয়", () => {
  for (const fn of BATCH1_FUNCTION_NAMES) {
    for (const args of ["", "1", "1,2,3,4,5,6,7,8", '"abc"', "G2", "A1:A8,A1:A8,A1:A8", "1E308,1E308", "-1,-1", '"",""']) {
      assert.doesNotThrow(() => calc(`=${fn}(${args})`), `${fn}(${args}) ক্র্যাশ করেছে`);
    }
  }
});
