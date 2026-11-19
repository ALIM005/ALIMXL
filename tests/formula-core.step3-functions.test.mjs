import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormulaCore } from "../lib/formula-core.mjs";

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
const near = (actual, expected, tol = 1e-7) =>
  assert.ok(typeof actual === "number" && Math.abs(actual - expected) <= tol, `expected ≈ ${expected}, got ${actual}`);

const data = {
  A1: 1, A2: 2, A3: 3, A4: 4, A5: 5,
  B1: 10, B2: 20, B3: 30, B4: 40, B5: 50,
  C1: "x", C2: "y", C3: "z",
  D1: 2, D2: 4, D3: 6, D4: 8, D5: 11,
  E1: "a,b,c", E2: "a;b|c;d", E3: "a;b;c|d;e",
  F1: "A1", F2: "B2:B4",
  G1: 100, G2: 200, G3: 300,
  H1: "14:30:45", H2: 0.75, H3: "2:15 PM",
  // তারিখ (সিরিয়াল): 2026-11-02 সোম = 46328
  I1: 46328, I2: 46335,
  J1: -1000, J2: 300, J3: 400, J4: 500, J5: 600,
  K1: 46023, K2: 46113, K3: 46204, K4: 46296, K5: 46388, // 2026-01-01, 2026-04-01 ...
};
const ev = (f) => evaluateFormulaCore(f, makeCtx(data));

// ---------------------------------------------------------------- OFFSET / INDIRECT / ROWS / COLUMNS
test("OFFSET: single cell, inside SUM, with size", () => {
  assert.equal(ev("=OFFSET(A1,2,1)"), 30);
  assert.equal(ev("=SUM(OFFSET(A1,1,1,3,1))"), 90);
  assert.equal(ev("=SUM(OFFSET(A1:A2,2,0))"), 7);
  assert.equal(ev("=OFFSET(A1,-1,0)"), "#REF!");
  assert.equal(ev("=OFFSET(A1,0,0,0,1)"), "#REF!");
  assert.equal(ev("=IFERROR(OFFSET(A1,-5,0),\"bad\")"), "bad");
});
test("INDIRECT: cell, range, text-built, bad", () => {
  assert.equal(ev('=INDIRECT("B3")'), 30);
  assert.equal(ev('=INDIRECT(F1)'), 1);
  assert.equal(ev('=SUM(INDIRECT(F2))'), 90);
  assert.equal(ev('=INDIRECT("B"&A3)'), 30);
  assert.equal(ev('=SUM(INDIRECT("$A$1:$A$5"))'), 15);
  assert.equal(ev('=INDIRECT("hello")'), "#REF!");
  assert.equal(ev('=INDIRECT("")'), "#REF!");
  assert.equal(ev('=INDIRECT("A1",FALSE)'), "#REF!");
});
test("OFFSET + INDIRECT nesting, VLOOKUP over dynamic range", () => {
  assert.equal(ev('=SUM(OFFSET(INDIRECT("A1"),0,1,5,1))'), 150);
  assert.equal(ev('=VLOOKUP(3,INDIRECT("A1:B5"),2,FALSE)'), 30);
});
test("ROWS / COLUMNS", () => {
  assert.equal(ev("=ROWS(A1:A5)"), 5);
  assert.equal(ev("=COLUMNS(A1:D1)"), 4);
  assert.equal(ev("=ROWS(A1:B5)*COLUMNS(A1:B5)"), 10);
  assert.equal(ev("=ROWS(OFFSET(A1,0,0,3,2))"), 3);
  assert.equal(ev("=COLUMNS(TEXTSPLIT(E1,\",\"))"), 3);
});

// ---------------------------------------------------------------- TRANSPOSE / TEXTSPLIT
test("TRANSPOSE (first value / INDEX)", () => {
  assert.equal(ev("=TRANSPOSE(A1:A3)"), 1);
  assert.equal(ev("=INDEX(TRANSPOSE(A1:B3),2,3)"), 30);
  assert.equal(ev("=ROWS(TRANSPOSE(A1:C1))"), 3);
});
test("TEXTSPLIT", () => {
  assert.equal(ev('=TEXTSPLIT(E1,",")'), "a");
  assert.equal(ev('=INDEX(TEXTSPLIT(E1,","),2)'), "b");
  assert.equal(ev('=INDEX(TEXTSPLIT(E2,";","|"),2,2)'), "d");
  assert.equal(ev('=INDEX(TEXTSPLIT(E3,";","|"),2,3)'), "#N/A");
  assert.equal(ev('=INDEX(TEXTSPLIT(E2,";","|"),2,3)'), "#REF!");
  assert.equal(ev('=INDEX(TEXTSPLIT("a,,b",",","",TRUE),2)'), "b");
  assert.equal(ev('=INDEX(TEXTSPLIT("aXbxc","x","",FALSE,1),3)'), "c");
  assert.equal(ev('=TEXTSPLIT("abc","")'), "#VALUE!");
});

// ---------------------------------------------------------------- সময়
test("HOUR / MINUTE / SECOND / TIME", () => {
  assert.equal(ev("=HOUR(H1)"), 14);
  assert.equal(ev("=MINUTE(H1)"), 30);
  assert.equal(ev("=SECOND(H1)"), 45);
  assert.equal(ev("=HOUR(H2)"), 18);
  assert.equal(ev("=HOUR(H3)"), 14);
  assert.equal(ev("=MINUTE(H3)"), 15);
  assert.equal(ev("=HOUR(0.5)"), 12);
  assert.equal(ev('=HOUR("abc")'), "#VALUE!");
  assert.equal(ev("=HOUR(-1)"), "#NUM!");
  near(ev("=TIME(12,0,0)"), 0.5);
  near(ev("=TIME(14,30,0)"), 14.5 / 24);
  near(ev("=TIME(25,0,0)"), 1 / 24);
  assert.equal(ev("=TIME(0,0,-1)"), "#NUM!");
  assert.equal(ev("=HOUR(TIME(7,45,10))"), 7);
  assert.equal(ev("=SECOND(TIME(7,45,10))"), 10);
});

// ---------------------------------------------------------------- NETWORKDAYS / WORKDAY / WEEKNUM
test("NETWORKDAYS / WORKDAY", () => {
  // সোম ২ নভেম্বর → সোম ৯ নভেম্বর ২০২৬ : ৬ কর্মদিবস
  assert.equal(ev("=NETWORKDAYS(I1,I2)"), 6);
  assert.equal(ev("=NETWORKDAYS(I2,I1)"), -6);
  assert.equal(ev("=NETWORKDAYS(I1,I1)"), 1);
  assert.equal(ev("=NETWORKDAYS(I1,I2,46329)"), 5); // মঙ্গলবার ছুটি
  assert.equal(ev("=NETWORKDAYS(I1,I2,46333)"), 6); // শনিবার ছুটি — প্রভাব নেই
  assert.equal(ev("=NETWORKDAYS(I1,I1+27)"), 20);
  assert.equal(ev("=WORKDAY(I1,5)"), 46333 + 2); // সোম+৫ কর্মদিবস = পরের সোম (46335)
  assert.equal(ev("=WORKDAY(I1,5,46329)"), 46336);
  assert.equal(ev("=WORKDAY(I2,-5)"), 46328);
  assert.equal(ev("=WORKDAY(I1,0)"), 46328);
  assert.equal(ev('=WEEKDAY(WORKDAY(DATE(2026,11,20),1),2)'), 1); // শুক্রের পরের কর্মদিবস = সোম
});
test("WEEKNUM", () => {
  assert.equal(ev("=WEEKNUM(DATE(2026,11,19))"), 47);
  assert.equal(ev("=WEEKNUM(DATE(2026,11,19),2)"), 47);
  assert.equal(ev("=WEEKNUM(DATE(2026,11,19),21)"), 47);
  assert.equal(ev("=WEEKNUM(DATE(2026,1,1))"), 1);
  assert.equal(ev("=WEEKNUM(DATE(2026,1,1),21)"), 1); // ISO: ১ জানুয়ারি ২০২৬ বৃহস্পতিবার → সপ্তাহ ১
  assert.equal(ev("=WEEKNUM(DATE(2027,1,1),21)"), 53); // ISO: ২০২৭-০১-০১ শুক্র → ২০২৬-W53
  assert.equal(ev("=WEEKNUM(DATE(2026,12,31),1)"), 53);
  assert.equal(ev("=WEEKNUM(DATE(2026,11,19),5)"), "#NUM!");
});

// ---------------------------------------------------------------- গণিত
test("FACT / GCD / LCM / MROUND", () => {
  assert.equal(ev("=FACT(0)"), 1);
  assert.equal(ev("=FACT(5)"), 120);
  assert.equal(ev("=FACT(1.9)"), 1);
  assert.equal(ev("=FACT(20)"), 2432902008176640000);
  assert.equal(ev("=FACT(171)"), "#NUM!");
  assert.equal(ev("=FACT(-1)"), "#NUM!");
  assert.equal(ev("=GCD(12,18)"), 6);
  assert.equal(ev("=GCD(24,36,60)"), 12);
  assert.equal(ev("=GCD(A1:A5)"), 1);
  assert.equal(ev("=GCD(0,0)"), 0);
  assert.equal(ev("=GCD(-4,2)"), "#NUM!");
  assert.equal(ev("=LCM(4,6)"), 12);
  assert.equal(ev("=LCM(2,3,4)"), 12);
  assert.equal(ev("=LCM(5,0)"), 0);
  assert.equal(ev("=MROUND(10,3)"), 9);
  assert.equal(ev("=MROUND(11,3)"), 12);
  assert.equal(ev("=MROUND(1.3,0.2)"), 1.4);
  assert.equal(ev("=MROUND(-10,-3)"), -9);
  assert.equal(ev("=MROUND(10,-3)"), "#NUM!");
  assert.equal(ev("=MROUND(5,0)"), 0);
});
test("trigonometry", () => {
  near(ev("=SIN(PI()/2)"), 1);
  near(ev("=COS(0)"), 1);
  near(ev("=TAN(PI()/4)"), 1);
  near(ev("=ASIN(1)"), Math.PI / 2);
  near(ev("=ACOS(0)"), Math.PI / 2);
  near(ev("=ATAN(1)"), Math.PI / 4);
  near(ev("=ATAN2(1,1)"), Math.PI / 4);
  near(ev("=ATAN2(-1,0)"), Math.PI);
  assert.equal(ev("=ATAN2(0,0)"), "#DIV/0!");
  near(ev("=DEGREES(PI())"), 180);
  near(ev("=RADIANS(180)"), Math.PI);
  assert.equal(ev("=ASIN(2)"), "#NUM!");
  assert.equal(ev("=ACOS(-1.5)"), "#NUM!");
  assert.equal(ev('=SIN("x")'), "#VALUE!");
});

// ---------------------------------------------------------------- পরিসংখ্যান
test("CORREL / SLOPE / INTERCEPT / RSQ / FORECAST", () => {
  near(ev("=CORREL(A1:A5,B1:B5)"), 1);
  near(ev("=SLOPE(B1:B5,A1:A5)"), 10);
  near(ev("=INTERCEPT(B1:B5,A1:A5)"), 0);
  near(ev("=RSQ(B1:B5,A1:A5)"), 1);
  near(ev("=FORECAST(6,B1:B5,A1:A5)"), 60);
  near(ev("=FORECAST.LINEAR(6,B1:B5,A1:A5)"), 60);
  // অসম্পূর্ণ সম্পর্ক: x=A1:A5 (1..5), y=D1:D5 (2,4,6,8,11)
  near(ev("=SLOPE(D1:D5,A1:A5)"), 2.2);
  near(ev("=INTERCEPT(D1:D5,A1:A5)"), -0.4);
  near(ev("=CORREL(A1:A5,D1:D5)"), 22 / Math.sqrt(488), 1e-9);
  near(ev("=RSQ(D1:D5,A1:A5)"), 484 / 488, 1e-9);
  near(ev("=FORECAST(6,D1:D5,A1:A5)"), 12.8);
  assert.equal(ev("=CORREL(A1:A5,B1:B4)"), "#N/A");
  assert.equal(ev("=CORREL(A1:A1,B1:B1)"), "#DIV/0!");
  assert.equal(ev("=SLOPE(B1:B5,G1:G1)"), "#N/A");
  assert.equal(ev("=CORREL(A1:A5,C1:C3)"), "#N/A");
});

// ---------------------------------------------------------------- টেক্সট
test("CLEAN / CHAR / CODE / UNICODE / UNICHAR", () => {
  assert.equal(ev('=CLEAN("a"&CHAR(10)&"b"&CHAR(7))'), "ab");
  assert.equal(ev("=CHAR(65)"), "A");
  assert.equal(ev("=CHAR(128)"), "€");
  assert.equal(ev("=CHAR(0)"), "#VALUE!");
  assert.equal(ev("=CHAR(256)"), "#VALUE!");
  assert.equal(ev('=CODE("A")'), 65);
  assert.equal(ev('=CODE("€")'), 128);
  assert.equal(ev('=CODE("")'), "#VALUE!");
  assert.equal(ev('=UNICODE("অ")'), 2437);
  assert.equal(ev("=UNICHAR(2437)"), "অ");
  assert.equal(ev("=UNICHAR(0)"), "#VALUE!");
  assert.equal(ev("=UNICHAR(55296)"), "#VALUE!");
});

// ---------------------------------------------------------------- আর্থিক
test("IPMT / PPMT", () => {
  near(ev("=IPMT(0.1,1,3,1000)"), -100);
  near(ev("=PPMT(0.1,1,3,1000)"), -302.1148036, 1e-6);
  near(ev("=IPMT(0.1,2,3,1000)"), -69.7885196, 1e-6);
  near(ev("=PPMT(0.1,3,3,1000)"), -365.5589124, 1e-6);
  // IPMT + PPMT = PMT
  near(ev("=IPMT(0.08/12,7,60,-250000)+PPMT(0.08/12,7,60,-250000)"), ev("=PMT(0.08/12,60,-250000)"), 1e-6);
  // মূল অংশের যোগফল = -pv (fv=0), type 0 ও 1 দুটিতেই
  let sum0 = 0;
  let sum1 = 0;
  for (let k = 1; k <= 12; k++) {
    sum0 += ev(`=PPMT(0.01,${k},12,5000)`);
    sum1 += ev(`=PPMT(0.01,${k},12,5000,0,1)`);
  }
  near(sum0, -5000, 1e-6);
  near(sum1, -5000, 1e-6);
  near(ev("=IPMT(0.01,1,12,5000,0,1)"), 0);
  near(ev("=IPMT(0,3,12,5000)"), 0);
  assert.equal(ev("=IPMT(0.1,0,3,1000)"), "#NUM!");
  assert.equal(ev("=IPMT(0.1,4,3,1000)"), "#NUM!");
});
test("XNPV / XIRR", () => {
  // একটি পূর্ণ বছর: -1000 → +1100 = ১০% (৩৬৫ দিন)
  const d = { A1: 46023, A2: 46388, B1: -1000, B2: 1100 };
  const e = (f) => evaluateFormulaCore(f, makeCtx(d));
  near(e("=XIRR(B1:B2,A1:A2)"), 0.1, 1e-7);
  near(e("=XNPV(0.1,B1:B2,A1:A2)"), 0, 1e-7);
  near(e("=XNPV(0.05,B1:B2,A1:A2)"), -1000 + 1100 / 1.05, 1e-7);
  // একাধিক প্রবাহ — XNPV(XIRR) ≈ 0
  const r = ev("=XIRR(J1:J5,K1:K5)");
  assert.ok(typeof r === "number" && r > 0, `xirr=${r}`);
  near(evaluateFormulaCore(`=XNPV(${r},J1:J5,K1:K5)`, makeCtx(data)), 0, 1e-4);
  assert.equal(e("=XIRR(B1:B1,A1:A1)"), "#NUM!");
  assert.equal(ev("=XIRR(A1:A5,K1:K5)"), "#NUM!"); // কোনো ঋণাত্মক প্রবাহ নেই
  assert.equal(ev("=XNPV(0.1,J1:J5,K1:K4)"), "#NUM!");
  assert.equal(ev("=XNPV(-1,J1:J5,K1:K5)"), "#NUM!");
});

// ---------------------------------------------------------------- ত্রুটি-প্রবাহ ও বিদ্যমান আচরণ
test("errors propagate and old functions unchanged", () => {
  assert.equal(ev("=SUM(OFFSET(A1,0,0,2,1),10)"), 13);
  assert.equal(ev('=SUM(INDIRECT("zz"))'), "#REF!");
  assert.equal(ev("=NOSUCHFUNC(1)"), "#NAME?");
  assert.equal(ev("=INDEX(A1:A5,3)"), 3);
  assert.equal(ev("=SUM(A1:A5)"), 15);
  assert.equal(ev('=SIN(#DIV/0!)'), "#DIV/0!");
});
