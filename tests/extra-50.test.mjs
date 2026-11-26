import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormulaCore, getCellValueInSheet } from "../lib/formula-core.mjs";
import { BATCH3_NAMES } from "../lib/extra-functions-3.mjs";

const cells = {
  A1: 2, A2: 3, A3: 9, A4: 1, A5: 8, A6: 7, A7: 5,
  B1: 6, B2: 5, B3: 11, B4: 7, B5: 5, B6: 4, B7: 4,
  C1: 9, C2: 7, C3: 5, C4: 3, C5: 1,
  D1: 10, D2: 6, D3: 1, D4: 5, D5: 3,
  E1: 4, E2: 5, E3: 6, E4: 7, E5: 2, E6: 3, E7: 4, E8: 5, E9: 1, E10: 2, E11: 3,
  F1: 4, F2: 5, F3: 8, F4: 7, F5: 11, F6: 4, F7: 3,
  G1: 0.09, G2: 0.11, G3: 0.1,
  H1: 1, H2: -0.5, H3: 0.041666667, H4: -0.001388889,
  I1: 1, I2: "a", I3: 2, I4: "b",
  J1: "=SUM(A1:A3)", J2: 5,
  K1: "x", K2: 1, K3: 2,
};
const colRow = (k) => [k.match(/[A-Z]+/)[0], Number(k.match(/\d+/)[0])];
const sheet = { name: "Sheet1", cells: Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, { value: v }])) };
const sheet2 = { name: "Data", cells: {} };
const ctx = {
  sheet, allSheets: [sheet, sheet2],
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
const near = (f, expected, tol = 1e-9) => {
  const v = Number(ev(f));
  assert.ok(Math.abs(v - expected) <= tol * Math.max(1, Math.abs(expected)), `${f} => ${v}, expected ${expected}`);
};
const eq = (f, expected) => assert.equal(String(ev(f)), String(expected), f);

test("কাঠামো: ঠিক ৫০টি, ডুপ্লিকেট নেই", () => {
  assert.equal(BATCH3_NAMES.length, 50);
  assert.equal(new Set(BATCH3_NAMES).size, 50);
});

test("কাঠামো: ৫০টির প্রতিটি ইঞ্জিনে স্বীকৃত (#NAME? নয়)", () => {
  const sample = {
    SERIESSUM: "=SERIESSUM(1,0,1,H1:H2)", FVSCHEDULE: "=FVSCHEDULE(1,G1:G3)",
    FORMULATEXT: "=FORMULATEXT(J1)", ISREF: "=ISREF(A1)", SHEETS: "=SHEETS()",
  };
  for (const n of BATCH3_NAMES) {
    const f = sample[n] ?? `=${n}(1)`;
    assert.notEqual(String(ev(f)), "#NAME?", n);
  }
});

test("গণিত: SUMX2MY2 / SUMX2PY2 / SUMXMY2 (Microsoft ডক-উদাহরণ)", () => {
  eq("=SUMX2MY2(A1:A7,B1:B7)", -55);
  eq("=SUMX2PY2(A1:A7,B1:B7)", 521);
  eq("=SUMXMY2(A1:A7,B1:B7)", 79);
  eq("=SUMXMY2(A1:A3,B1:B4)", "#N/A");
});
test("গণিত: SERIESSUM", () => {
  near("=SERIESSUM(PI()/4,0,2,H1:H4)", 0.7071032149236011, 1e-9);
  eq("=SERIESSUM(2,1,1,K2:K3)", 10);
});
test("গণিত: MULTINOMIAL / COMBINA / PERMUTATIONA", () => {
  eq("=MULTINOMIAL(2,3,4)", 1260);
  eq("=MULTINOMIAL(1,1,1)", 6);
  eq("=MULTINOMIAL(-1,2)", "#NUM!");
  eq("=COMBINA(4,3)", 20);
  eq("=COMBINA(10,3)", 220);
  eq("=COMBINA(5,0)", 1);
  eq("=COMBINA(-1,2)", "#NUM!");
  eq("=PERMUTATIONA(3,2)", 9);
  eq("=PERMUTATIONA(2,10)", 1024);
  eq("=PERMUTATIONA(0,0)", 1);
});
test("গণিত: ROMAN / ARABIC", () => {
  eq("=ROMAN(499)", "CDXCIX");
  eq("=ROMAN(1994)", "MCMXCIV");
  eq("=ROMAN(3999)", "MMMCMXCIX");
  eq("=ROMAN(4000)", "#VALUE!");
  eq("=ARABIC(\"LVII\")", 57);
  eq("=ARABIC(\"mcmxii\")", 1912);
  eq("=ARABIC(\"-IV\")", -4);
  eq("=ARABIC(\"ABC\")", "#VALUE!");
  eq("=ARABIC(\"\")", 0);
});
test("গণিত: BASE / DECIMAL", () => {
  eq("=BASE(7,2)", "111");
  eq("=BASE(100,16,4)", "0064");
  eq("=BASE(255,16)", "FF");
  eq("=BASE(5,1)", "#NUM!");
  eq("=DECIMAL(\"FF\",16)", 255);
  eq("=DECIMAL(\"111\",2)", 7);
  eq("=DECIMAL(\"zap\",36)", 45745);
  eq("=DECIMAL(\"2\",2)", "#NUM!");
});
test("গণিত: COTH / CSCH / SECH / ACOT / ACOTH", () => {
  near("=COTH(1)", 1.3130352854993315);
  near("=CSCH(1)", 0.8509181282393216);
  near("=SECH(1)", 0.6480542736638855);
  eq("=COTH(0)", "#DIV/0!");
  eq("=CSCH(0)", "#DIV/0!");
  near("=ACOT(1)", Math.PI / 4);
  near("=ACOT(-1)", 2.356194490192345);
  near("=ACOT(0)", Math.PI / 2);
  near("=ACOTH(2)", 0.5493061443340549);
  near("=ACOTH(3)", 0.34657359027997264);
  eq("=ACOTH(1)", "#NUM!");
});

test("পরিসংখ্যান: AVEDEV / HARMEAN / TRIMMEAN", () => {
  near("=AVEDEV(F1:F7)", 2.2857142857142856);
  near("=HARMEAN(F1:F7)", 5.028375962061728);
  eq("=HARMEAN(1,0)", "#NUM!");
  near("=TRIMMEAN(E1:E11,0.2)", 3.7777777777777777);
  eq("=TRIMMEAN(E1:E11,1)", "#NUM!");
});
test("পরিসংখ্যান: FISHER / FISHERINV", () => {
  near("=FISHER(0.75)", 0.9729550745276566);
  eq("=FISHER(1)", "#NUM!");
  near("=FISHERINV(0.9729550745276566)", 0.75);
});
test("পরিসংখ্যান: PEARSON / STEYX (Microsoft ডক-উদাহরণ)", () => {
  near("=PEARSON(C1:C5,D1:D5)", 0.6993786061802353);
  near("=STEYX(A1:A7,B1:B7)", 3.305718950210041);
  eq("=PEARSON(A1:A3,B1:B4)", "#N/A");
  eq("=PEARSON(A1,B1)", "#DIV/0!");
});
test("পরিসংখ্যান: GAUSS / PHI", () => {
  near("=GAUSS(2)", 0.4772498680518208);
  near("=PHI(0.75)", 0.30113743215480443);
});
test("পরিসংখ্যান: BINOM.DIST / POISSON.DIST / EXPON.DIST / CONFIDENCE.NORM", () => {
  near("=BINOM.DIST(6,10,0.5,FALSE)", 0.2050781249999999, 1e-10);
  near("=BINOM.DIST(6,10,0.5,TRUE)", 0.828125, 1e-10);
  eq("=BINOM.DIST(11,10,0.5,TRUE)", "#NUM!");
  near("=POISSON.DIST(2,5,FALSE)", 0.08422433748856832, 1e-10);
  near("=POISSON.DIST(2,5,TRUE)", 0.12465201948308108, 1e-10);
  near("=EXPON.DIST(0.2,10,TRUE)", 0.8646647167633873);
  near("=EXPON.DIST(0.2,10,FALSE)", 1.353352832366127);
  eq("=EXPON.DIST(1,0,TRUE)", "#NUM!");
  near("=CONFIDENCE.NORM(0.05,2.5,50)", 0.6929519121748389, 1e-9);
});

test("আর্থিক: PDURATION / FVSCHEDULE / ISPMT / DOLLARDE / DOLLARFR", () => {
  near("=PDURATION(0.025,2000,2200)", 3.859866162622662, 1e-9);
  eq("=PDURATION(0,2000,2200)", "#NUM!");
  near("=FVSCHEDULE(1,G1:G3)", 1.33089, 1e-9);
  near("=ISPMT(0.1/12,1,36,8000000)", -64814.81481481482, 1e-9);
  eq("=DOLLARDE(1.02,16)", 1.125);
  eq("=DOLLARDE(1.1,32)", 1.3125);
  eq("=DOLLARFR(1.125,16)", 1.02);
  eq("=DOLLARDE(1.02,0)", "#DIV/0!");
  eq("=DOLLARDE(1.02,-1)", "#NUM!");
});

test("ইঞ্জিনিয়ারিং: ERF / ERFC", () => {
  near("=ERF(1)", 0.8427007929497148, 1e-12);
  near("=ERF(0.5,1)", 0.32220091513666826, 1e-12);
  near("=ERF.PRECISE(1)", 0.8427007929497148, 1e-12);
  near("=ERFC(1)", 0.15729920705028516, 1e-12);
  near("=ERFC.PRECISE(1)", 0.15729920705028516, 1e-12);
  near("=ERFC(4)", 1.541725790028002e-08, 1e-9);
});
test("ইঞ্জিনিয়ারিং: বেস রূপান্তর", () => {
  eq("=BIN2OCT(\"1001\")", "11");
  eq("=BIN2HEX(\"11111011\")", "FB");
  eq("=BIN2HEX(\"1111111111\")", "FFFFFFFFFF");
  eq("=OCT2BIN(\"7\")", "111");
  eq("=OCT2BIN(\"7\",5)", "00111");
  eq("=OCT2HEX(\"17\")", "F");
  eq("=HEX2BIN(\"F\")", "1111");
  eq("=HEX2BIN(\"FFFFFFFFFF\")", "1111111111");
  eq("=HEX2OCT(\"F\")", "17");
  eq("=HEX2BIN(\"FF0\")", "#NUM!");
  eq("=BIN2OCT(\"102\")", "#NUM!");
});

test("তথ্য: ISREF / ERROR.TYPE", () => {
  eq("=ISREF(A1)", true);
  eq("=ISREF(A1:B2)", true);
  eq("=ISREF(5)", false);
  eq("=ISREF(\"A1\")", false);
  eq("=ERROR.TYPE(1/0)", 2);
  eq("=ERROR.TYPE(NA())", 7);
  eq("=ERROR.TYPE(5)", "#N/A");
});
test("তথ্য: SHEETS / FORMULATEXT (আসল শিটে, কনটেক্সট সহ)", () => {
  const s1 = {
    id: "S1", name: "Sheet1",
    cells: {
      A1: { value: "2" }, A2: { value: "3" }, A3: { value: "4" },
      B1: { value: "=SUM(A1:A3)" },
      C1: { value: "=SHEETS()" },
      C2: { value: "=SHEETS(A1)" },
      C3: { value: "=FORMULATEXT(B1)" },
      C4: { value: "=FORMULATEXT(A1)" },
      C5: { value: "=FORMULATEXT(Sheet2!A1)" },
      C6: { value: "=FORMULATEXT(5)" },
    },
  };
  const s2 = { id: "S2", name: "Sheet2", cells: { A1: { value: "=1+1" } } };
  const all = [s1, s2];
  const get = (k) => getCellValueInSheet(s1, k, undefined, all);
  assert.equal(get("C1"), 2);
  assert.equal(get("C2"), 1);
  assert.equal(get("C3"), "=SUM(A1:A3)");
  assert.equal(get("C4"), "#N/A");
  assert.equal(get("C5"), "=1+1");
  assert.equal(get("C6"), "#VALUE!");
});
test("টেক্সট: ARRAYTOTEXT / VALUETOTEXT", () => {
  eq("=ARRAYTOTEXT(I1:I4)", "1, a, 2, b");
  eq("=ARRAYTOTEXT(I1:I4,1)", "{1;\"a\";2;\"b\"}");
  eq("=ARRAYTOTEXT(A1:B2,1)", "{2,6;3,5}");
  eq("=ARRAYTOTEXT(A1:B2)", "2, 6, 3, 5");
  eq("=ARRAYTOTEXT(A1,2)", "#VALUE!");
  eq("=VALUETOTEXT(K1)", "x");
  eq("=VALUETOTEXT(K1,1)", "\"x\"");
  eq("=VALUETOTEXT(42)", "42");
  eq("=VALUETOTEXT(TRUE)", "TRUE");
});

test("নিরাপত্তা: ভুল আর্গুমেন্ট সংখ্যা ও অদ্ভুত ইনপুটে ক্র্যাশ নয়", () => {
  const inputs = ["", "1", "1,2", "1,2,3", "1,2,3,4", "\"x\"", "\"x\",\"y\"", "A1:A3", "A1:A3,B1:B3", "1/0", "TRUE", "-1", "0", "1E308", "A1:A3,B1:B3,C1:C3,D1:D3"];
  for (const n of BATCH3_NAMES) {
    for (const a of inputs) {
      let v;
      assert.doesNotThrow(() => { v = ev(`=${n}(${a})`); }, `${n}(${a})`);
      assert.ok(["number", "string", "boolean"].includes(typeof v), `${n}(${a}) => ${typeof v}`);
    }
  }
});
test("পুরনো ফাংশন অপরিবর্তিত", () => {
  eq("=SUM(1,2,3)", 6);
  eq("=SKEW(1,2,3)", 0);
  eq("=UNKNOWNFN(1)", "#NAME?");
});
