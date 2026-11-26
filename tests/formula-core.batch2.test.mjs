// Batch 2 টেস্ট: ৫৮টি ফাংশন (৪৫ স্কেলার + ১৩ অ্যারে/স্পিল), lib/extra-functions.mjs
//
// প্রত্যাশিত মান নেওয়া হয়েছে Microsoft Excel ডকুমেন্টেশনের উদাহরণ ও গাণিতিক সংজ্ঞা থেকে,
// ইমপ্লিমেন্টেশনের আউটপুট কপি করে নয়। তাই এটি সত্যিকারের রিগ্রেশন সুরক্ষা।
//
// স্কেলার ফাংশন: evaluateFormulaCore দিয়ে (সম্পূর্ণ ইঞ্জিন পথ)।
// অ্যারে ফাংশন: evaluateExtraSpill সরাসরি, কারণ স্পিল ফলাফল গ্রিডে ছড়ানোর কাজ page.tsx করে।
//
// চালাতে: node --test tests/formula-core.batch2.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormulaCore, getCellValueInSheet } from "../lib/formula-core.mjs";
import {
  EXTRA_SCALAR_NAMES,
  EXTRA_SPILL_NAMES,
  EXTRA_FUNCTION_NAMES,
  evaluateExtraSpill,
  bumpRandArrayEpoch,
} from "../lib/extra-functions.mjs";
import { BATCH1_FUNCTION_NAMES } from "../lib/batch1-functions.mjs";
import { BATCH3_NAMES } from "../lib/extra-functions-3.mjs";

// ---------- স্কেলার টেস্ট পরিবেশ ----------
const cells = {
  // SKEW / KURT (Microsoft উদাহরণ)
  A1: 3, A2: 4, A3: 5, A4: 2, A5: 3, A6: 4, A7: 5, A8: 6, A9: 4, A10: 7,
  // COVARIANCE (Microsoft উদাহরণ)
  B1: 3, B2: 2, B3: 4, B4: 5, B5: 6,
  C1: 9, C2: 7, C3: 12, C4: 15, C5: 17,
  // 1..4
  D1: 1, D2: 2, D3: 3, D4: 4,
  // QUARTILE.EXC (Microsoft উদাহরণ)
  E1: 6, E2: 7, E3: 15, E4: 36, E5: 39, E6: 40, E7: 41, E8: 42, E9: 43, E10: 47, E11: 49,
  // PERCENTRANK (Microsoft উদাহরণ)
  F1: 1, F2: 2, F3: 3, F4: 6, F5: 6, F6: 6, F7: 7, F8: 8, F9: 9,
  // মিশ্র: সংখ্যা, টেক্সট, বুলিয়ান
  G1: 1, G2: "a", G3: true, G4: 5,
  // 1..5
  H1: 1, H2: 2, H3: 3, H4: 4, H5: 5,
  // সংখ্যা + টেক্সট
  I1: 2, I2: "a",
  // ISFORMULA
  J1: "=SUM(A1:A3)", J2: 5,
  // LET-এ রেফারেন্স
  K1: 10,
  // PERCENTRANK.INC Microsoft উদাহরণ ডেটা
  L1: 13, L2: 12, L3: 11, L4: 8, L5: 4, L6: 3, L7: 2, L8: 1, L9: 1, L10: 1,
};
const colRow = (k) => [k.match(/[A-Z]+/)[0], Number(k.match(/\d+/)[0])];
const sheet = { name: "Sheet1", cells: Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, { value: v }])) };
const ctx = {
  sheet,
  allSheets: [sheet],
  getCell: (k) => cells[k.split("!").pop().toUpperCase()] ?? "",
  expandRange: (r) => {
    const [a, b] = r.split("!").pop().toUpperCase().split(":");
    const [c1, r1] = colRow(a), [c2, r2] = colRow(b);
    const out = [];
    for (let c = c1.charCodeAt(0); c <= c2.charCodeAt(0); c++)
      for (let rr = r1; rr <= r2; rr++) out.push(cells[String.fromCharCode(c) + rr] ?? "");
    return out;
  },
};
const ev = (f) => evaluateFormulaCore(f, ctx);
const near = (f, expected, tol = 1e-6) => {
  const v = Number(ev(f));
  assert.ok(Math.abs(v - expected) <= tol * Math.max(1, Math.abs(expected)), `${f} => ${v}, expected ${expected}`);
};
const eq = (f, expected) => assert.equal(String(ev(f)), String(expected), f);

// ---------- স্পিল টেস্ট সাহায্যকারী ----------
const spill = (fn, ...args) =>
  evaluateExtraSpill(fn, args, { getGrid: (a) => a, getValue: (a) => a, anchorKey: "Sheet1!0:0" });
const rowsOf = (res) => {
  assert.equal(typeof res, "object", `array আশা করা হয়েছিল, পাওয়া গেছে: ${String(res)}`);
  assert.equal(res.kind, "array");
  return res.values;
};
const G3 = () => [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

// =====================================================================
// কাঠামো
// =====================================================================
test("কাঠামো: ঠিক ৫৮টি (৪৫ স্কেলার + ১৩ স্পিল), ডুপ্লিকেট নেই", () => {
  assert.equal(EXTRA_SCALAR_NAMES.length, 45);
  assert.equal(EXTRA_SPILL_NAMES.length, 13);
  assert.equal(EXTRA_FUNCTION_NAMES.length, 58);
  assert.equal(new Set(EXTRA_FUNCTION_NAMES).size, 58);
});

test("কাঠামো: Batch 1 ও Batch 3-এর সঙ্গে নামের সংঘাত নেই", () => {
  const others = new Set([...BATCH1_FUNCTION_NAMES, ...BATCH3_NAMES]);
  for (const n of EXTRA_FUNCTION_NAMES) assert.ok(!others.has(n), `${n} অন্য ব্যাচেও আছে`);
});

test("কাঠামো: ৪৫টি স্কেলারের প্রতিটি ইঞ্জিনে স্বীকৃত (#NAME? নয়)", () => {
  for (const n of EXTRA_SCALAR_NAMES) {
    assert.notEqual(String(ev(`=${n}(1)`)), "#NAME?", n);
  }
});

test("কাঠামো: ১৩টি স্পিল ফাংশন সরাসরি কল করলে null নয়", () => {
  for (const n of EXTRA_SPILL_NAMES) {
    assert.notEqual(spill(n, [[1]]), null, n);
  }
  assert.equal(evaluateExtraSpill("SUM", [], { getGrid: (a) => a, getValue: (a) => a }), null);
});

// =====================================================================
// LET / ISFORMULA
// =====================================================================
test("LET: মৌলিক ব্যবহার", () => {
  eq("=LET(x,5,x*2)", 10);
  eq("=LET(x,2,y,3,x*y)", 6);
});
test("LET: পরের নাম আগের নামের উপর নির্ভর করতে পারে", () => {
  eq("=LET(x,2,y,x+1,x*y)", 6);
  eq("=LET(a,2,b,a*3,c,b+a,c)", 8);
});
test("LET: রেফারেন্স ও টেক্সট", () => {
  eq("=LET(x,K1,x+1)", 11);
  eq('=LET(t,"ab",t&"cd")', "abcd");
});
test("LET: ভুল আর্গুমেন্ট সংখ্যা ও ভুল নাম", () => {
  eq("=LET(x,5)", "#VALUE!");
  eq("=LET(x,5,y)", "#NAME?");
  eq("=LET(5,5,5)", "#VALUE!");
});
test("ISFORMULA (আসল শিট প্রসঙ্গে, ক্রস-শিট সহ)", () => {
  const s1 = {
    name: "Sheet1",
    cells: {
      A1: { value: "=1+1" }, A2: { value: 5 }, A3: { value: "text" }, A4: { value: "=" },
      B1: { value: "=ISFORMULA(A1)" }, B2: { value: "=ISFORMULA(A2)" }, B3: { value: "=ISFORMULA(A3)" },
      B4: { value: "=ISFORMULA(Z99)" }, B5: { value: "=ISFORMULA(Sheet2!A1)" }, B6: { value: "=ISFORMULA(Sheet2!A2)" },
      B7: { value: "=ISFORMULA(A4)" }, B8: { value: "=ISFORMULA(5)" },
    },
  };
  const s2 = { name: "Sheet2", cells: { A1: { value: "=SUM(1,2)" }, A2: { value: 7 } } };
  const all = [s1, s2];
  const get = (k) => String(getCellValueInSheet(s1, k, undefined, all));
  assert.equal(get("B1"), "true");
  assert.equal(get("B2"), "false");
  assert.equal(get("B3"), "false");
  assert.equal(get("B4"), "false");
  assert.equal(get("B5"), "true");
  assert.equal(get("B6"), "false");
  assert.equal(get("B7"), "false"); // শুধু "=" সূত্র নয়
  assert.equal(get("B8"), "#VALUE!"); // রেফারেন্স নয়
});

// =====================================================================
// স্বাভাবিক বিন্যাস (Microsoft ডক-উদাহরণ)
// =====================================================================
test("NORM.DIST (Microsoft: 42, 40, 1.5)", () => {
  near("=NORM.DIST(42,40,1.5,TRUE)", 0.9087888, 1e-6);
  near("=NORM.DIST(42,40,1.5,FALSE)", 0.1093401, 1e-6);
  near("=NORM.DIST(0,0,1,TRUE)", 0.5, 1e-12);
  eq("=NORM.DIST(1,0,0,TRUE)", "#NUM!");
  eq("=NORM.DIST(1,0,-1,TRUE)", "#NUM!");
});
test("NORM.S.DIST", () => {
  near("=NORM.S.DIST(1.333333,TRUE)", 0.9087888, 1e-6);
  near("=NORM.S.DIST(0,FALSE)", 0.3989422804, 1e-9);
  near("=NORM.S.DIST(1.96,TRUE)", 0.9750021, 1e-6);
  near("=NORM.S.DIST(-1.96,TRUE)", 0.0249979, 1e-6);
});
test("NORM.INV (Microsoft: 0.908789, 40, 1.5 → 42)", () => {
  near("=NORM.INV(0.908789,40,1.5)", 42, 1e-6);
  near("=NORM.INV(0.5,10,3)", 10, 1e-12);
  eq("=NORM.INV(0,0,1)", "#NUM!");
  eq("=NORM.INV(1,0,1)", "#NUM!");
  eq("=NORM.INV(0.5,0,0)", "#NUM!");
});
test("NORM.S.INV", () => {
  near("=NORM.S.INV(0.908789)", 1.3333347, 1e-6);
  near("=NORM.S.INV(0.975)", 1.959964, 1e-6);
  near("=NORM.S.INV(0.5)", 0, 1e-12);
  eq("=NORM.S.INV(1.5)", "#NUM!");
});
test("NORM.DIST ও NORM.INV পরস্পর বিপরীত (round-trip)", () => {
  for (const p of [0.001, 0.025, 0.3, 0.5, 0.77, 0.975, 0.999]) {
    const x = Number(ev(`=NORM.S.INV(${p})`));
    near(`=NORM.S.DIST(${x},TRUE)`, p, 1e-9);
  }
});
test("STANDARDIZE (Microsoft: 42, 40, 1.5 → 1.3333333)", () => {
  near("=STANDARDIZE(42,40,1.5)", 1.3333333, 1e-6);
  eq("=STANDARDIZE(42,40,0)", "#NUM!");
});

// =====================================================================
// SKEW / KURT / পরিসংখ্যান
// =====================================================================
test("SKEW (Microsoft: 0.359543)", () => {
  near("=SKEW(A1:A10)", 0.359543, 1e-6);
  eq("=SKEW(1,2)", "#DIV/0!");
  eq("=SKEW(4,4,4)", "#DIV/0!");
});
test("KURT (Microsoft: -0.151799637)", () => {
  near("=KURT(A1:A10)", -0.151799637, 1e-6);
  eq("=KURT(1,2,3)", "#DIV/0!");
});
test("SKEW: সুষম ডেটায় ঠিক 0", () => {
  eq("=SKEW(1,2,3)", 0);
});
test("COVARIANCE.P / COVARIANCE.S (Microsoft: 5.2 / 6.5)", () => {
  near("=COVARIANCE.P(B1:B5,C1:C5)", 5.2, 1e-9);
  near("=COVARIANCE.S(B1:B5,C1:C5)", 6.5, 1e-9);
  eq("=COVARIANCE.P(B1:B5,C1:C4)", "#N/A");
  eq("=COVARIANCE.S(B1:B1,C1:C1)", "#DIV/0!");
});
test("PERCENTILE.EXC (Microsoft: {1,2,3,4}, 0.25 → 1.25)", () => {
  near("=PERCENTILE.EXC(D1:D4,0.25)", 1.25, 1e-12);
  near("=PERCENTILE.EXC(D1:D4,0.5)", 2.5, 1e-12);
  near("=PERCENTILE.EXC(D1:D4,0.75)", 3.75, 1e-12);
  eq("=PERCENTILE.EXC(D1:D4,0.1)", "#NUM!");
  eq("=PERCENTILE.EXC(D1:D4,0.9)", "#NUM!");
  eq("=PERCENTILE.EXC(D1:D4,0)", "#NUM!");
});
test("QUARTILE.EXC (Microsoft: Q1=15, Q3=43)", () => {
  eq("=QUARTILE.EXC(E1:E11,1)", 15);
  eq("=QUARTILE.EXC(E1:E11,2)", 40);
  eq("=QUARTILE.EXC(E1:E11,3)", 43);
  eq("=QUARTILE.EXC(E1:E11,0)", "#NUM!");
  eq("=QUARTILE.EXC(E1:E11,4)", "#NUM!");
});
test("PERCENTRANK.EXC (ডেটা {1,2,3,6,6,6,7,8,9}; র‍্যাঙ্ক/(n+1), ৩ অঙ্কে ছাঁটা)", () => {
  eq("=PERCENTRANK.EXC(F1:F9,7)", 0.7); // Microsoft: 0.7
  eq("=PERCENTRANK.EXC(F1:F9,8)", 0.8);
  eq("=PERCENTRANK.EXC(F1:F9,1)", 0.1);
  eq("=PERCENTRANK.EXC(F1:F9,5.43)", 0.381); // Microsoft: 0.381
  // x=5: (3 + (5-3)/(6-3)) / 10 = 0.36666... → ছাঁটলে 0.366
  eq("=PERCENTRANK.EXC(F1:F9,5)", 0.366);
  eq("=PERCENTRANK.EXC(F1:F9,5,1)", 0.3);
  eq("=PERCENTRANK.EXC(F1:F9,0)", "#N/A");
  eq("=PERCENTRANK.EXC(F1:F9,10)", "#N/A");
});
test("PERCENTRANK / .INC (Microsoft ডেটা {13,12,11,8,4,3,2,1,1,1}: 2→0.333, 4→0.555, 8→0.666, 5→0.583)", () => {
  eq("=PERCENTRANK(L1:L10,2)", 0.333);
  eq("=PERCENTRANK(L1:L10,4)", 0.555);
  eq("=PERCENTRANK(L1:L10,8)", 0.666);
  eq("=PERCENTRANK(L1:L10,5)", 0.583);
  eq("=PERCENTRANK(L1:L10,1)", 0);
  eq("=PERCENTRANK(L1:L10,13)", 1);
  eq("=PERCENTRANK(L1:L10,14)", "#N/A");
});
test("PERCENTRANK: দ্বিতীয় ডেটা {1,2,3,6,6,6,7,8,9} (র‍্যাঙ্ক/(n-1))", () => {
  eq("=PERCENTRANK(F1:F9,2)", 0.125);
  eq("=PERCENTRANK(F1:F9,8)", 0.875);
  eq("=PERCENTRANK(F1:F9,4)", 0.291); // (2 + 1/3)/8 = 0.29166.. → ছাঁটা
  eq("=PERCENTRANK(F1:F9,5)", 0.333);
});
test("PERCENTRANK ও PERCENTRANK.INC একই ফল দেয়", () => {
  for (const x of [1, 2, 4, 5, 8, 9]) eq(`=PERCENTRANK(F1:F9,${x})`, ev(`=PERCENTRANK.INC(F1:F9,${x})`));
});

// =====================================================================
// A-ভ্যারিয়েন্ট (টেক্সট = 0, TRUE = 1)
// =====================================================================
test("MAXA / MINA / AVERAGEA: টেক্সট 0, TRUE 1", () => {
  // G1:G4 = 1, "a", TRUE, 5
  eq("=MAXA(G1:G4)", 5);
  eq("=MINA(G1:G4)", 0);
  eq("=AVERAGEA(G1:G4)", 1.75);
});
test("MAXA / MINA: আর্গুমেন্ট হিসেবে সরাসরি বুলিয়ান", () => {
  eq("=MAXA(0,TRUE)", 1);
  eq("=MINA(5,TRUE)", 1);
});
test("MAXA / MINA / AVERAGEA: খালি রেঞ্জ", () => {
  eq("=MAXA(Z1:Z3)", 0);
  eq("=MINA(Z1:Z3)", 0);
  eq("=AVERAGEA(Z1:Z3)", "#DIV/0!");
});
test("STDEVA / VARA", () => {
  near("=VARA(H1:H5)", 2.5, 1e-12);
  near("=STDEVA(H1:H5)", 1.5811388300841898, 1e-12);
  // 2 এবং "a"(=0): গড় 1, নমুনা ভ্যারিয়েন্স = (1+1)/1 = 2
  eq("=VARA(I1:I2)", 2);
  eq("=VARA(5)", "#DIV/0!");
  eq("=STDEVA(5)", "#DIV/0!");
});

// =====================================================================
// হাইপারবলিক ও ত্রিকোণমিতি
// =====================================================================
test("SINH / COSH / TANH", () => {
  near("=SINH(1)", 1.1752011936438014, 1e-12);
  near("=COSH(1)", 1.5430806348152437, 1e-12);
  near("=TANH(1)", 0.7615941559557649, 1e-12);
  eq("=SINH(0)", 0);
  eq("=COSH(0)", 1);
  eq("=TANH(0)", 0);
});
test("ASINH / ACOSH / ATANH", () => {
  near("=ASINH(1)", 0.881373587019543, 1e-12);
  near("=ACOSH(10)", 2.993222846126381, 1e-12);
  near("=ATANH(0.5)", 0.5493061443340549, 1e-12);
  eq("=ACOSH(1)", 0);
  eq("=ACOSH(0.5)", "#NUM!");
  eq("=ATANH(1)", "#NUM!");
  eq("=ATANH(-1)", "#NUM!");
});
test("হাইপারবলিক ফাংশন পরস্পর বিপরীত", () => {
  for (const x of [-2, -0.5, 0.3, 1, 3]) near(`=SINH(ASINH(${x}))`, x, 1e-10);
  for (const x of [1, 1.5, 4]) near(`=COSH(ACOSH(${x}))`, x, 1e-10);
  for (const x of [-0.9, 0, 0.4]) near(`=TANH(ATANH(${x}))`, x, 1e-10);
});
test("SEC / CSC / COT", () => {
  near("=SEC(1)", 1.8508157176809255, 1e-12);
  near("=CSC(1)", 1.1883951057781212, 1e-12);
  near("=COT(1)", 0.6420926159343306, 1e-12);
  eq("=SEC(0)", 1);
  eq("=CSC(0)", "#DIV/0!");
  eq("=COT(0)", "#DIV/0!");
});
test("SQRTPI (Microsoft: SQRTPI(2) = 2.506628)", () => {
  near("=SQRTPI(2)", 2.5066282746310002, 1e-12);
  near("=SQRTPI(1)", 1.7724538509055159, 1e-12);
  eq("=SQRTPI(0)", 0);
  eq("=SQRTPI(-1)", "#NUM!");
});
test("FACTDOUBLE (Microsoft: 6!! = 48, 7!! = 105)", () => {
  eq("=FACTDOUBLE(6)", 48);
  eq("=FACTDOUBLE(7)", 105);
  eq("=FACTDOUBLE(0)", 1);
  eq("=FACTDOUBLE(-1)", 1);
  eq("=FACTDOUBLE(-2)", "#NUM!");
  eq("=FACTDOUBLE(7.9)", 105);
});

// =====================================================================
// বিট অপারেশন (Microsoft ডক-উদাহরণ)
// =====================================================================
test("BITAND / BITOR / BITXOR", () => {
  eq("=BITAND(1,5)", 1);
  eq("=BITAND(13,25)", 9);
  eq("=BITOR(23,10)", 31);
  eq("=BITXOR(5,3)", 6);
  eq("=BITAND(-1,1)", "#NUM!");
  eq("=BITOR(1.5,1)", "#NUM!");
  eq("=BITXOR(2^48,1)", "#NUM!");
});
test("BITLSHIFT / BITRSHIFT (Microsoft: 4<<2 = 16, 13>>2 = 3)", () => {
  eq("=BITLSHIFT(4,2)", 16);
  eq("=BITRSHIFT(13,2)", 3);
  eq("=BITLSHIFT(4,-1)", 2);
  eq("=BITRSHIFT(4,-1)", 8);
  eq("=BITLSHIFT(-4,2)", "#NUM!");
  eq("=BITLSHIFT(1,54)", "#NUM!");
});
test("DELTA / GESTEP", () => {
  eq("=DELTA(5,4)", 0);
  eq("=DELTA(5,5)", 1);
  eq("=DELTA(0.5,0)", 0);
  eq("=DELTA(0)", 1);
  eq("=GESTEP(5,4)", 1);
  eq("=GESTEP(3,3)", 1);
  eq("=GESTEP(-1)", 0);
  eq("=GESTEP(0)", 1);
});

// =====================================================================
// ভিত্তি রূপান্তর (Microsoft ডক-উদাহরণ)
// =====================================================================
test("BIN2DEC / OCT2DEC / HEX2DEC", () => {
  eq("=BIN2DEC(1100100)", 100);
  eq('=BIN2DEC("1111111111")', -1);
  eq('=BIN2DEC("1111111110")', -2);
  eq('=BIN2DEC("2")', "#NUM!");
  eq('=BIN2DEC("11111111111")', "#NUM!");
  eq("=OCT2DEC(54)", 44);
  eq('=OCT2DEC("7777777533")', -165);
  eq('=OCT2DEC("8")', "#NUM!");
  eq('=HEX2DEC("A5")', 165);
  eq('=HEX2DEC("FFFFFFFF5B")', -165);
  eq('=HEX2DEC("3DA408B9")', 1034160313);
  eq('=HEX2DEC("G")', "#NUM!");
});
test("DEC2BIN (Microsoft: 9,4 → 0001001? না, 1001; -100 → 1110011100)", () => {
  eq("=DEC2BIN(9,4)", "1001");
  eq("=DEC2BIN(9,8)", "00001001");
  eq("=DEC2BIN(9)", "1001");
  eq("=DEC2BIN(-100)", "1110011100");
  eq("=DEC2BIN(511)", "111111111");
  eq("=DEC2BIN(512)", "#NUM!");
  eq("=DEC2BIN(-512)", "1000000000");
  eq("=DEC2BIN(-513)", "#NUM!");
  eq("=DEC2BIN(9,2)", "#NUM!");
});
test("DEC2OCT / DEC2HEX", () => {
  eq("=DEC2OCT(58)", "72");
  eq("=DEC2OCT(58,3)", "072");
  eq("=DEC2OCT(-100)", "7777777634");
  eq("=DEC2HEX(100,4)", "0064");
  eq("=DEC2HEX(28)", "1C");
  eq("=DEC2HEX(-54)", "FFFFFFFFCA");
  eq("=DEC2HEX(255)", "FF");
  eq("=DEC2HEX(64,1)", "#NUM!");
});
test("ভিত্তি রূপান্তর: DEC2x ও x2DEC পরস্পর বিপরীত", () => {
  for (const n of [-512, -100, -1, 0, 1, 9, 100, 511]) eq(`=BIN2DEC(DEC2BIN(${n}))`, n);
  for (const n of [-1000, -1, 0, 255, 100000]) eq(`=HEX2DEC(DEC2HEX(${n}))`, n);
  for (const n of [-1000, -1, 0, 58, 100000]) eq(`=OCT2DEC(DEC2OCT(${n}))`, n);
});

// =====================================================================
// RRI
// =====================================================================
test("RRI (Microsoft: RRI(96,10000,11000) = 0.0009933)", () => {
  near("=RRI(96,10000,11000)", 0.000993, 1e-3);
  near("=RRI(2,100,121)", 0.1, 1e-12);
  near("=RRI(1,100,100)", 0, 1e-12);
  eq("=RRI(0,100,200)", "#NUM!");
  eq("=RRI(-1,100,200)", "#NUM!");
  eq("=RRI(5,0,200)", "#NUM!");
  eq("=RRI(5,100,-200)", "#NUM!");
});

// =====================================================================
// স্পিল / ডায়নামিক অ্যারে ফাংশন
// =====================================================================
test("VSTACK: উল্লম্ব সংযোজন", () => {
  assert.deepEqual(rowsOf(spill("VSTACK", [[1, 2], [3, 4]], [[5, 6]])), [[1, 2], [3, 4], [5, 6]]);
});
test("VSTACK: কম প্রস্থের অ্যারে #N/A দিয়ে পূর্ণ", () => {
  assert.deepEqual(rowsOf(spill("VSTACK", [[1, 2]], [[3]])), [[1, 2], [3, "#N/A"]]);
});
test("HSTACK: অনুভূমিক সংযোজন", () => {
  assert.deepEqual(rowsOf(spill("HSTACK", [[1], [2]], [[3], [4]])), [[1, 3], [2, 4]]);
});
test("HSTACK: কম উচ্চতার অ্যারে #N/A দিয়ে পূর্ণ", () => {
  assert.deepEqual(rowsOf(spill("HSTACK", [[1], [2]], [[3, 4]])), [[1, 3, 4], [2, "#N/A", "#N/A"]]);
});
test("HSTACK / VSTACK: আর্গুমেন্ট ছাড়া ও ভুল ইনপুট", () => {
  assert.equal(spill("VSTACK"), "#VALUE!");
  assert.equal(spill("HSTACK"), "#VALUE!");
  assert.equal(spill("VSTACK", null), "#VALUE!");
});

test("SORTBY: আরোহী, অবরোহী ও একাধিক কী", () => {
  const data = [["b"], ["a"], ["c"]];
  assert.deepEqual(rowsOf(spill("SORTBY", data, [[2], [3], [1]])), [["c"], ["b"], ["a"]]);
  assert.deepEqual(rowsOf(spill("SORTBY", data, [[2], [3], [1]], -1)), [["a"], ["b"], ["c"]]);
  const rows = [["x", 1], ["y", 2], ["z", 3], ["w", 4]];
  const k1 = [[1], [2], [1], [2]];
  const k2 = [[9], [5], [7], [8]];
  assert.deepEqual(rowsOf(spill("SORTBY", rows, k1, 1, k2, -1)), [["x", 1], ["z", 3], ["w", 4], ["y", 2]]);
});
test("SORTBY: স্থিতিশীল (সমান কী-তে মূল ক্রম বজায়)", () => {
  assert.deepEqual(rowsOf(spill("SORTBY", [["p"], ["q"], ["r"]], [[1], [1], [1]])), [["p"], ["q"], ["r"]]);
});
test("SORTBY: অনুভূমিক ডেটা ও ভুল মাপ/ক্রম", () => {
  assert.deepEqual(rowsOf(spill("SORTBY", [["a", "b", "c"]], [[3, 1, 2]])), [["b", "c", "a"]]);
  assert.equal(spill("SORTBY", [["a"], ["b"]], [[1], [2], [3]]), "#VALUE!");
  assert.equal(spill("SORTBY", [["a"], ["b"]], [[1], [2]], 2), "#VALUE!");
  assert.equal(spill("SORTBY", [["a"]]), "#VALUE!");
});

test("RANDARRAY: মাপ ও সীমা", () => {
  bumpRandArrayEpoch();
  const v = rowsOf(spill("RANDARRAY", 3, 4, 10, 20));
  assert.equal(v.length, 3);
  assert.equal(v[0].length, 4);
  for (const row of v) for (const x of row) assert.ok(x >= 10 && x < 20, String(x));
});
test("RANDARRAY: পূর্ণসংখ্যা মোড", () => {
  bumpRandArrayEpoch();
  const v = rowsOf(spill("RANDARRAY", 20, 5, 1, 6, true));
  for (const row of v) for (const x of row) assert.ok(Number.isInteger(x) && x >= 1 && x <= 6, String(x));
});
test("RANDARRAY: ডিফল্ট 1x1, 0 থেকে 1", () => {
  bumpRandArrayEpoch();
  const v = rowsOf(spill("RANDARRAY"));
  assert.equal(v.length, 1);
  assert.equal(v[0].length, 1);
  assert.ok(v[0][0] >= 0 && v[0][0] < 1);
});
test("RANDARRAY: ত্রুটি অবস্থা", () => {
  assert.equal(spill("RANDARRAY", 0, 1), "#VALUE!");
  assert.equal(spill("RANDARRAY", 1, 0), "#VALUE!");
  assert.equal(spill("RANDARRAY", 1, 1, 5, 1), "#VALUE!");
  assert.equal(spill("RANDARRAY", 1, 1, 1.5, 3, true), "#VALUE!");
  assert.equal(spill("RANDARRAY", 2000, 2000), "#NUM!");
});
test("RANDARRAY: একই সেলে পুনরায় হিসাবে স্থিতিশীল, bump করলে নতুন মান", () => {
  bumpRandArrayEpoch();
  const a = rowsOf(spill("RANDARRAY", 4, 4));
  const b = rowsOf(spill("RANDARRAY", 4, 4));
  assert.deepEqual(a, b);
  bumpRandArrayEpoch();
  const c = rowsOf(spill("RANDARRAY", 4, 4));
  assert.notDeepEqual(a, c);
});

test("TAKE", () => {
  assert.deepEqual(rowsOf(spill("TAKE", G3(), 2)), [[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(rowsOf(spill("TAKE", G3(), -1)), [[7, 8, 9]]);
  assert.deepEqual(rowsOf(spill("TAKE", G3(), "", 2)), [[1, 2], [4, 5], [7, 8]]);
  assert.deepEqual(rowsOf(spill("TAKE", G3(), "", -1)), [[3], [6], [9]]);
  assert.deepEqual(rowsOf(spill("TAKE", G3(), 2, 2)), [[1, 2], [4, 5]]);
  assert.deepEqual(rowsOf(spill("TAKE", G3(), 99)), G3());
});
test("DROP", () => {
  assert.deepEqual(rowsOf(spill("DROP", G3(), 1)), [[4, 5, 6], [7, 8, 9]]);
  assert.deepEqual(rowsOf(spill("DROP", G3(), -1)), [[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(rowsOf(spill("DROP", G3(), "", 1)), [[2, 3], [5, 6], [8, 9]]);
  assert.deepEqual(rowsOf(spill("DROP", G3(), 1, 1)), [[5, 6], [8, 9]]);
  assert.equal(spill("DROP", G3(), 3), "#CALC!");
  assert.equal(spill("DROP", G3(), 99), "#CALC!");
});
test("TAKE / DROP: আর্গুমেন্ট না দিলে #VALUE!", () => {
  assert.equal(spill("TAKE", G3()), "#VALUE!");
  assert.equal(spill("DROP", G3()), "#VALUE!");
});

test("CHOOSECOLS / CHOOSEROWS", () => {
  assert.deepEqual(rowsOf(spill("CHOOSECOLS", G3(), 1, 3)), [[1, 3], [4, 6], [7, 9]]);
  assert.deepEqual(rowsOf(spill("CHOOSECOLS", G3(), -1)), [[3], [6], [9]]);
  assert.deepEqual(rowsOf(spill("CHOOSECOLS", G3(), 2, 2)), [[2, 2], [5, 5], [8, 8]]);
  assert.deepEqual(rowsOf(spill("CHOOSEROWS", G3(), 1, -1)), [[1, 2, 3], [7, 8, 9]]);
  assert.deepEqual(rowsOf(spill("CHOOSEROWS", G3(), 3)), [[7, 8, 9]]);
});
test("CHOOSECOLS / CHOOSEROWS: সূচক 0 বা সীমার বাইরে #VALUE!", () => {
  assert.equal(spill("CHOOSECOLS", G3(), 0), "#VALUE!");
  assert.equal(spill("CHOOSECOLS", G3(), 4), "#VALUE!");
  assert.equal(spill("CHOOSEROWS", G3(), -4), "#VALUE!");
  assert.equal(spill("CHOOSEROWS", G3()), "#VALUE!");
});

test("TOCOL / TOROW", () => {
  const g = [[1, 2], [3, 4]];
  assert.deepEqual(rowsOf(spill("TOCOL", g)), [[1], [2], [3], [4]]);
  assert.deepEqual(rowsOf(spill("TOCOL", g, 0, true)), [[1], [3], [2], [4]]);
  assert.deepEqual(rowsOf(spill("TOROW", g)), [[1, 2, 3, 4]]);
  assert.deepEqual(rowsOf(spill("TOROW", g, 0, true)), [[1, 3, 2, 4]]);
});
test("TOCOL / TOROW: ফাঁকা ও ত্রুটি উপেক্ষা", () => {
  const g = [[1, ""], ["#N/A", 4]];
  assert.deepEqual(rowsOf(spill("TOCOL", g, 1)), [[1], ["#N/A"], [4]]);
  assert.deepEqual(rowsOf(spill("TOCOL", g, 2)), [[1], [""], [4]]);
  assert.deepEqual(rowsOf(spill("TOCOL", g, 3)), [[1], [4]]);
  assert.deepEqual(rowsOf(spill("TOROW", g, 3)), [[1, 4]]);
  assert.equal(spill("TOCOL", [[""]], 1), "#CALC!");
  assert.equal(spill("TOCOL", g, 9), "#VALUE!");
});

test("WRAPROWS / WRAPCOLS", () => {
  assert.deepEqual(rowsOf(spill("WRAPROWS", [[1, 2, 3, 4, 5]], 2)), [[1, 2], [3, 4], [5, "#N/A"]]);
  assert.deepEqual(rowsOf(spill("WRAPROWS", [[1, 2, 3, 4, 5]], 2, 0)), [[1, 2], [3, 4], [5, 0]]);
  assert.deepEqual(rowsOf(spill("WRAPROWS", [[1], [2], [3], [4]], 2)), [[1, 2], [3, 4]]);
  assert.deepEqual(rowsOf(spill("WRAPCOLS", [[1, 2, 3, 4, 5]], 2)), [[1, 3, 5], [2, 4, "#N/A"]]);
  assert.deepEqual(rowsOf(spill("WRAPCOLS", [[1, 2, 3, 4]], 2)), [[1, 3], [2, 4]]);
});
test("WRAPROWS / WRAPCOLS: ভুল ইনপুট", () => {
  assert.equal(spill("WRAPROWS", [[1, 2], [3, 4]], 2), "#VALUE!");
  assert.equal(spill("WRAPROWS", [[1, 2, 3]], 0), "#NUM!");
  assert.equal(spill("WRAPCOLS", [[1, 2, 3]]), "#VALUE!");
});

test("EXPAND", () => {
  const g = [[1, 2], [3, 4]];
  assert.deepEqual(rowsOf(spill("EXPAND", g, 3, 3, 0)), [[1, 2, 0], [3, 4, 0], [0, 0, 0]]);
  assert.deepEqual(rowsOf(spill("EXPAND", g, 3)), [[1, 2], [3, 4], ["#N/A", "#N/A"]]);
  assert.deepEqual(rowsOf(spill("EXPAND", g, 2, 3, "x")), [[1, 2, "x"], [3, 4, "x"]]);
  assert.deepEqual(rowsOf(spill("EXPAND", g, 2, 2)), g);
});
test("EXPAND: ছোট করতে চাইলে #VALUE!", () => {
  assert.equal(spill("EXPAND", [[1, 2], [3, 4]], 1, 2), "#VALUE!");
  assert.equal(spill("EXPAND", [[1, 2], [3, 4]], 2, 1), "#VALUE!");
});

test("স্পিল: ফলাফল সব সময় আয়তাকার (সব সারির প্রস্থ সমান)", () => {
  const checks = [
    spill("VSTACK", [[1, 2, 3]], [[4]], [[5, 6]]),
    spill("HSTACK", [[1], [2], [3]], [[4]], [[5, 6]]),
    spill("WRAPROWS", [[1, 2, 3, 4, 5, 6, 7]], 3),
    spill("WRAPCOLS", [[1, 2, 3, 4, 5, 6, 7]], 3),
    spill("EXPAND", [[1]], 4, 5),
  ];
  for (const r of checks) {
    const v = rowsOf(r);
    assert.equal(r.rows, v.length);
    assert.equal(r.cols, v[0].length);
    for (const row of v) assert.equal(row.length, v[0].length);
  }
});
test("স্পিল: মূল ইনপুট অ্যারে পরিবর্তিত হয় না", () => {
  const g = G3();
  spill("TAKE", g, 1); spill("DROP", g, 1); spill("CHOOSECOLS", g, 1);
  spill("CHOOSEROWS", g, 1); spill("TOCOL", g); spill("EXPAND", g, 5, 5);
  spill("SORTBY", g, [[3], [2], [1]]);
  assert.deepEqual(g, G3());
});

// =====================================================================
// জানা সীমাবদ্ধতা (todo: ফেল করলেও স্যুট ব্যর্থ হয় না, কিন্তু রিপোর্টে দেখা যায়)
// =====================================================================
test("আন্তঃফাংশন: নেস্টেড স্পিল ফাংশন স্কেলার ইঞ্জিনে (জানা সীমাবদ্ধতা)", { todo: "Batch 2-এর স্পিল ফাংশন (VSTACK, SORTBY …) SUM(...)-এর ভেতরে #NAME? দেয়। পুরোনো স্পিল ফাংশনও (SORT, SEQUENCE, UNIQUE) ভেতরে ব্যবহারে শুধু প্রথম মান দেয়, পুরো অ্যারে নয়।" }, () => {
  eq("=SUM(VSTACK(D1:D2,D3:D4))", 10);
  eq("=SUM(SORTBY(D1:D4,D1:D4,-1))", 10);
});