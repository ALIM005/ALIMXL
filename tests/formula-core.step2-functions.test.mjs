import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormulaCore, getCellValueInSheet } from "../lib/formula-core.mjs";

// ---- সহায়ক: সেল-ম্যাপ থেকে ফর্মুলা-কনটেক্সট ----
function colToNum(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
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
        for (let c = colToNum(pa[1]); c <= colToNum(pb[1]); c++) {
          let s = "";
          let n = c;
          while (n > 0) {
            s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
            n = Math.floor((n - 1) / 26);
          }
          out.push(get(`${s}${r}`));
        }
      return out;
    },
  };
}
const near = (actual, expected, tol = 1e-7) =>
  assert.ok(typeof actual === "number" && Math.abs(actual - expected) <= tol, `expected ≈ ${expected}, got ${actual}`);

const data = {
  A1: "apple", A2: "banana", A3: "cherry", A4: "date", A5: "elder",
  B1: 10, B2: 20, B3: 30, B4: 40, B5: 50,
  D1: 10, E1: 20, F1: 30, D2: "a", E2: "b", F2: "c",
  G1: "x", G2: "y", G3: "x", G4: "y", G5: "x",
  H1: 5, H2: 9, H3: 7, H4: 3, H5: 8,
  I1: 1, I3: 3, I5: 5, // I2, I4 ফাঁকা
  J1: 3, J2: 1, J3: 2,
  K1: "007", K2: "7",
};
const ctx = makeCtx(data);
const ev = (f) => evaluateFormulaCore(f, ctx);

// ------------------------------------------------------------ INDEX / MATCH / HLOOKUP / CHOOSE
test("MATCH: exact, case-insensitive, wildcard, approximate", () => {
  assert.equal(ev('=MATCH("cherry",A1:A5,0)'), 3);
  assert.equal(ev('=MATCH("CHERRY",A1:A5,0)'), 3);
  assert.equal(ev('=MATCH("ch*",A1:A5,0)'), 3);
  assert.equal(ev('=MATCH("zzz",A1:A5,0)'), "#N/A");
  assert.equal(ev("=MATCH(25,B1:B5,1)"), 2);
  assert.equal(ev("=MATCH(5,B1:B5,1)"), "#N/A");
  assert.equal(ev("=MATCH(20,D1:F1,0)"), 2);
  assert.equal(ev("=MATCH(1,A1:B5,0)"), "#N/A"); // ২-মাত্রার রেঞ্জ
});
test("MATCH: text '007' and '7' are different (like Excel)", () => {
  assert.equal(ev('=MATCH("7",K1:K2,0)'), 2);
  assert.equal(ev('=MATCH("007",K1:K2,0)'), 1);
});
test("INDEX: basic, vectors, bounds", () => {
  assert.equal(ev("=INDEX(B1:B5,3)"), 30);
  assert.equal(ev("=INDEX(A1:B5,2,2)"), 20);
  assert.equal(ev("=INDEX(D1:F1,2)"), 20);
  assert.equal(ev("=INDEX(A1:B5,9,1)"), "#REF!");
  assert.equal(ev("=INDEX(A1:B5,1,3)"), "#REF!");
  assert.equal(ev("=INDEX(A1:B5,-1,1)"), "#VALUE!");
  assert.equal(ev("=INDEX(B1:B5,MATCH(\"cherry\",A1:A5,0))"), 30);
  assert.equal(ev("=INDEX(A1:B5,MATCH(\"date\",A1:A5,0),2)"), 40);
});
test("HLOOKUP: exact and approximate", () => {
  assert.equal(ev("=HLOOKUP(20,D1:F2,2,FALSE)"), "b");
  assert.equal(ev("=HLOOKUP(25,D1:F2,2)"), "b");
  assert.equal(ev("=HLOOKUP(5,D1:F2,2)"), "#N/A");
  assert.equal(ev("=HLOOKUP(20,D1:F2,3,FALSE)"), "#REF!");
  assert.equal(ev("=HLOOKUP(20,D1:F2,0,FALSE)"), "#VALUE!");
});
test("CHOOSE", () => {
  assert.equal(ev('=CHOOSE(2,"a","b","c")'), "b");
  assert.equal(ev('=CHOOSE(4,"a","b","c")'), "#VALUE!");
  assert.equal(ev("=CHOOSE(1,5,1/0)"), 5);
});

// ------------------------------------------------------------ তারিখ
test("DATE / YEAR / MONTH / DAY", () => {
  assert.equal(ev("=DATE(2024,1,15)"), 45306);
  assert.equal(ev("=DATE(2024,14,1)"), 45689); // ২০২৫-০২-০১
  assert.equal(ev("=DATE(2024,2,30)"), 45352); // ২০২৪-০৩-০১
  assert.equal(ev("=DATE(1900,1,1)"), 1);
  assert.equal(ev("=DATE(1900,3,1)"), 61);
  assert.equal(ev("=DATE(10000,1,1)"), "#NUM!");
  assert.equal(ev("=YEAR(45306)"), 2024);
  assert.equal(ev("=MONTH(45306)"), 1);
  assert.equal(ev("=DAY(45306)"), 15);
  assert.equal(ev('=YEAR("2024-05-01")'), 2024);
  assert.equal(ev("=YEAR(DATE(2030,12,31))"), 2030);
  assert.equal(ev('=YEAR("abc")'), "#VALUE!");
  assert.equal(ev("=YEAR(-1)"), "#NUM!");
});
test("WEEKDAY (সোমবার = ২০২৪-০১-১৫)", () => {
  assert.equal(ev("=WEEKDAY(45306)"), 2);
  assert.equal(ev("=WEEKDAY(45306,2)"), 1);
  assert.equal(ev("=WEEKDAY(45306,3)"), 0);
  assert.equal(ev("=WEEKDAY(45306,11)"), 1);
  assert.equal(ev("=WEEKDAY(45306,12)"), 7);
  assert.equal(ev("=WEEKDAY(45306,17)"), 2);
  assert.equal(ev("=WEEKDAY(45312)"), 1); // রবিবার ২০২৪-০১-২১
  assert.equal(ev("=WEEKDAY(45306,9)"), "#NUM!");
});
test("EOMONTH / EDATE / DAYS", () => {
  assert.equal(ev("=EOMONTH(DATE(2024,1,15),0)"), 45322);
  assert.equal(ev("=EOMONTH(DATE(2024,1,15),1)"), 45351); // ২০২৪-০২-২৯
  assert.equal(ev("=EOMONTH(DATE(2024,1,15),-1)"), 45291); // ২০২৩-১২-৩১
  assert.equal(ev("=EOMONTH(DATE(2024,12,5),2)"), ev("=DATE(2025,2,28)"));
  assert.equal(ev("=EDATE(DATE(2024,1,31),1)"), 45351);
  assert.equal(ev("=EDATE(DATE(2024,3,15),-3)"), ev("=DATE(2023,12,15)"));
  assert.equal(ev("=DAYS(DATE(2024,3,1),DATE(2024,1,1))"), 60);
});
test("DATEDIF", () => {
  const a = "DATE(2020,1,15)";
  const b = "DATE(2024,3,10)";
  assert.equal(ev(`=DATEDIF(${a},${b},"Y")`), 4);
  assert.equal(ev(`=DATEDIF(${a},${b},"M")`), 49);
  assert.equal(ev(`=DATEDIF(${a},${b},"D")`), 1516);
  assert.equal(ev(`=DATEDIF(${a},${b},"YM")`), 1);
  assert.equal(ev(`=DATEDIF(${a},${b},"MD")`), 24);
  assert.equal(ev(`=DATEDIF(${a},${b},"YD")`), 55);
  assert.equal(ev(`=DATEDIF(${b},${a},"Y")`), "#NUM!");
  assert.equal(ev(`=DATEDIF(${a},${b},"Q")`), "#NUM!");
  assert.equal(ev('=DATEDIF(DATE(2000,5,20),DATE(2024,5,19),"Y")'), 23);
  assert.equal(ev('=DATEDIF(DATE(2000,5,20),DATE(2024,5,20),"Y")'), 24);
});

// ------------------------------------------------------------ COUNTBLANK / MAXIFS / MINIFS
test("COUNTBLANK", () => {
  assert.equal(ev("=COUNTBLANK(I1:I5)"), 2);
  assert.equal(ev("=COUNTBLANK(A1:A5)"), 0);
  assert.equal(ev("=COUNTBLANK(Z1:Z10)"), 10);
});
test("MAXIFS / MINIFS", () => {
  assert.equal(ev('=MAXIFS(H1:H5,G1:G5,"x")'), 8);
  assert.equal(ev('=MINIFS(H1:H5,G1:G5,"x")'), 5);
  assert.equal(ev('=MAXIFS(H1:H5,G1:G5,"y",H1:H5,">3")'), 9);
  assert.equal(ev('=MAXIFS(H1:H5,G1:G5,"zzz")'), 0);
  assert.equal(ev("=MAXIFS(H1:H5,G1:G4,\"x\")"), "#VALUE!");
  assert.equal(ev("=MAXIFS(H1:H5,G1:G5)"), "#VALUE!");
});

// ------------------------------------------------------------ SUBTOTAL (শিট সহ)
test("SUBTOTAL: all functions, nested SUBTOTAL ignored, hidden rows", () => {
  const sheet = {
    id: "s1",
    name: "Sheet1",
    hiddenRows: [],
    filters: {},
    cells: {
      B1: { value: "10" }, B2: { value: "20" }, B3: { value: "30" }, B4: { value: "40" }, B5: { value: "50" },
      B6: { value: "=SUBTOTAL(9,B1:B5)" },
      B7: { value: "=SUBTOTAL(9,B1:B6)" },
      C1: { value: "=SUBTOTAL(1,B1:B5)" },
      C2: { value: "=SUBTOTAL(2,B1:B5)" },
      C3: { value: "=SUBTOTAL(3,B1:B5)" },
      C4: { value: "=SUBTOTAL(4,B1:B5)" },
      C5: { value: "=SUBTOTAL(5,B1:B5)" },
      C6: { value: "=SUBTOTAL(6,B1:B3)" },
      C7: { value: "=SUBTOTAL(109,B1:B5)" },
      C8: { value: "=SUBTOTAL(9,B1:B5)" },
      C9: { value: "=SUBTOTAL(101,B1:B5)" },
      C10: { value: "=SUBTOTAL(10,B1:B5)" },
      C11: { value: "=SUBTOTAL(8,B1:B5)" },
      C12: { value: "=SUBTOTAL(99,B1:B5)" },
    },
  };
  const get = (s, k) => getCellValueInSheet(s, k, new Set(), [s]);
  assert.equal(get(sheet, "B6"), 150);
  assert.equal(get(sheet, "B7"), 150); // B6 (SUBTOTAL) বাদ
  assert.equal(get(sheet, "C1"), 30);
  assert.equal(get(sheet, "C2"), 5);
  assert.equal(get(sheet, "C3"), 5);
  assert.equal(get(sheet, "C4"), 50);
  assert.equal(get(sheet, "C5"), 10);
  assert.equal(get(sheet, "C6"), 6000);
  assert.equal(get(sheet, "C10"), 250);
  near(get(sheet, "C11"), Math.sqrt(200), 1e-9);
  assert.equal(get(sheet, "C12"), "#VALUE!");

  // সারি ২ (ইনডেক্স ১) লুকানো — ফিল্টার ছাড়া হাতে-লুকানো
  const hiddenManual = { ...sheet, hiddenRows: [1] };
  assert.equal(get(hiddenManual, "C8"), 150); // ৯ → লুকানো সারি ধরে
  assert.equal(get(hiddenManual, "C7"), 130); // ১০৯ → লুকানো সারি বাদ
  assert.equal(get(hiddenManual, "C9"), 32.5); // ১০১ → গড় ৪ সারির

  // ফিল্টার সক্রিয়: ৯-ও লুকানো সারি বাদ দেয়
  const hiddenFiltered = { ...sheet, hiddenRows: [1], filters: { B: ["10", "30", "40", "50"] } };
  assert.equal(get(hiddenFiltered, "C8"), 130);
});

// ------------------------------------------------------------ তথ্য / লজিক
test("ISERROR / ISERR / ISNA / ISTEXT / IFNA", () => {
  assert.equal(ev("=ISERROR(1/0)"), true);
  assert.equal(ev("=ISERROR(5)"), false);
  assert.equal(ev('=ISERROR(MATCH("zzz",A1:A5,0))'), true);
  assert.equal(ev('=ISNA(MATCH("zzz",A1:A5,0))'), true);
  assert.equal(ev("=ISNA(1/0)"), false);
  assert.equal(ev("=ISERR(1/0)"), true);
  assert.equal(ev('=ISERR(MATCH("zzz",A1:A5,0))'), false);
  assert.equal(ev('=ISTEXT("a")'), true);
  assert.equal(ev("=ISTEXT(5)"), false);
  assert.equal(ev("=ISTEXT(A1)"), true);
  assert.equal(ev("=ISTEXT(B1)"), false);
  assert.equal(ev("=ISTEXT(Z9)"), false);
  assert.equal(ev('=IFNA(MATCH("zzz",A1:A5,0),"none")'), "none");
  assert.equal(ev("=IFNA(5,1)"), 5);
  assert.equal(ev("=IFNA(1/0,7)"), "#DIV/0!"); // শুধু #N/A ধরে
});

// ------------------------------------------------------------ গণিত
test("LOG / LN / EXP / PI / SIGN / TRUNC", () => {
  assert.equal(ev("=LOG(100)"), 2);
  assert.equal(ev("=LOG(8,2)"), 3);
  assert.equal(ev("=LOG10(1000)"), 3);
  near(ev("=LOG(10,3)"), Math.log(10) / Math.log(3), 1e-12);
  assert.equal(ev("=LOG(0)"), "#NUM!");
  assert.equal(ev("=LOG(5,1)"), "#DIV/0!");
  assert.equal(ev("=LN(1)"), 0);
  near(ev("=LN(2.718281828459045)"), 1, 1e-12);
  assert.equal(ev("=LN(-1)"), "#NUM!");
  assert.equal(ev("=EXP(0)"), 1);
  near(ev("=EXP(1)"), Math.E, 1e-12);
  assert.equal(ev("=EXP(1000)"), "#NUM!");
  near(ev("=PI()"), Math.PI, 1e-14);
  assert.equal(ev("=SIGN(-3)"), -1);
  assert.equal(ev("=SIGN(0)"), 0);
  assert.equal(ev("=SIGN(9)"), 1);
  assert.equal(ev("=TRUNC(8.9)"), 8);
  assert.equal(ev("=TRUNC(-8.9)"), -8);
  assert.equal(ev("=TRUNC(3.14159,2)"), 3.14);
  assert.equal(ev("=TRUNC(1234,-2)"), 1200);
  assert.equal(ev("=TRUNC(-0.5)"), 0);
});
test("RANDBETWEEN stays in range and errors when reversed", () => {
  for (let i = 0; i < 300; i++) {
    const v = ev("=RANDBETWEEN(1,6)");
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 6);
  }
  assert.equal(ev("=RANDBETWEEN(5,5)"), 5);
  assert.equal(ev("=RANDBETWEEN(5,1)"), "#NUM!");
});

// ------------------------------------------------------------ আর্থিক (Excel ডকুমেন্টেশনের উদাহরণ)
test("FV / PV / NPER / NPV", () => {
  near(ev("=FV(0.06/12,10,-200,-500,1)"), 2581.4033740601362, 1e-6);
  assert.equal(ev("=FV(0,10,-100)"), 1000);
  near(ev("=PV(0.08/12,240,500)"), -59777.14585118777, 1e-6);
  assert.equal(ev("=PV(0,10,-100)"), 1000);
  near(ev("=NPER(0.12/12,-100,-1000,10000,1)"), 59.67386567429457, 1e-9);
  near(ev("=NPV(0.1,-10000,3000,4200,6800)"), 1188.4434123352212, 1e-6);
  assert.equal(ev("=NPV(-1,100)"), "#DIV/0!");
});
test("IRR / RATE", () => {
  const cf = makeCtx({ A1: -70000, A2: 12000, A3: 15000, A4: 18000, A5: 21000, A6: 26000, B1: 100, B2: 200 });
  const e = (f) => evaluateFormulaCore(f, cf);
  near(e("=IRR(A1:A5)"), -0.021244848273405503, 1e-7);
  near(e("=IRR(A1:A6)"), 0.08663094803653155, 1e-7);
  near(e("=IRR(A1:A4,-0.1)"), -0.1821374641455271, 1e-6);
  assert.equal(e("=IRR(B1:B2)"), "#NUM!"); // শুধু ধনাত্মক
  near(ev("=RATE(48,-200,8000)"), 0.0077014724882010785, 1e-9);
  assert.equal(ev("=RATE(0,-200,8000)"), "#NUM!");
  assert.equal(ev("=RATE(12,100,1000)"), "#NUM!"); // সমাধান নেই
  // ঋণ: PMT → RATE ফিরে পাওয়া
  const pmt = ev("=PMT(0.01,36,-10000)");
  near(ev(`=RATE(36,${pmt},-10000)`), 0.01, 1e-9);
});

// ------------------------------------------------------------ টেক্সট
test("REPLACE / REPT / EXACT", () => {
  assert.equal(ev('=REPLACE("abcdefghijk",6,5,"*")'), "abcde*k");
  assert.equal(ev('=REPLACE("2009",3,2,"10")'), "2010");
  assert.equal(ev('=REPLACE("abc",0,1,"x")'), "#VALUE!");
  assert.equal(ev('=REPLACE("আলিম",1,1,"আ")'), "আলিম");
  assert.equal(ev('=REPT("ab",3)'), "ababab");
  assert.equal(ev('=REPT("x",0)'), "");
  assert.equal(ev('=REPT("x",-1)'), "#VALUE!");
  assert.equal(ev('=REPT("x",40000)'), "#VALUE!");
  assert.equal(ev('=EXACT("a","A")'), false);
  assert.equal(ev('=EXACT("a","a")'), true);
  assert.equal(ev('=EXACT(1,"1")'), true);
});

// ------------------------------------------------------------ পরিসংখ্যান
test("PERCENTILE / QUARTILE / MODE and dotted names", () => {
  assert.equal(ev("=PERCENTILE(J1:J3,0.5)"), 2);
  near(ev("=PERCENTILE(H1:H5,0.3)"), 5.4, 1e-12); // sorted 3,5,7,8,9 → pos 1.2 → 5 + 0.2×2
  assert.equal(ev("=PERCENTILE(J1:J3,1.5)"), "#NUM!");
  const q = makeCtx({ A1: 1, A2: 2, A3: 4, A4: 7, A5: 8, A6: 9, A7: 10, A8: 12, B1: 1, B2: 2, B3: 3, B4: 4 });
  const e = (f) => evaluateFormulaCore(f, q);
  assert.equal(e("=QUARTILE(A1:A8,1)"), 3.5);
  assert.equal(e("=QUARTILE(A1:A8,0)"), 1);
  assert.equal(e("=QUARTILE(A1:A8,4)"), 12);
  assert.equal(e("=QUARTILE(A1:A8,5)"), "#NUM!");
  near(e("=PERCENTILE(B1:B4,0.3)"), 1.9, 1e-12);
  near(e("=PERCENTILE.INC(B1:B4,0.3)"), 1.9, 1e-12);
  assert.equal(e("=QUARTILE.INC(A1:A8,1)"), 3.5);
  assert.equal(ev("=MODE(5.6,4,4,3,2,4)"), 4);
  assert.equal(ev("=MODE.SNGL(1,2,2,3,3)"), 2); // সমান হলে প্রথমটি
  assert.equal(ev("=MODE(1,2,3)"), "#N/A");
  assert.equal(ev("=RANK.EQ(3,J1:J3)"), 1);
  assert.equal(ev("=RANK.EQ(1,J1:J3,1)"), 1);
});

// ------------------------------------------------------------ নিরাপত্তা-জাল
test("unknown functions still give #NAME? and old functions still work", () => {
  assert.equal(ev("=ZZZNOPE(1)"), "#NAME?");
  assert.equal(ev("=SUM(B1:B5)"), 150);
  assert.equal(ev('=VLOOKUP(20,B1:B5,1,FALSE)'), 20);
  assert.equal(ev("=PMT(0.01,36,-10000)") > 0, true);
});
test("works with sheet-qualified ranges through getCellValueInSheet", () => {
  const s1 = { id: "a", name: "Data", hiddenRows: [], filters: {}, cells: { A1: { value: "x" }, A2: { value: "y" }, B1: { value: "1" }, B2: { value: "2" } } };
  const s2 = { id: "b", name: "Report", hiddenRows: [], filters: {}, cells: { A1: { value: '=INDEX(Data!B1:B2,MATCH("y",Data!A1:A2,0))' }, A2: { value: "=COUNTBLANK(Data!A1:A5)" }, A3: { value: "=DATE(2024,1,15)+1" } } };
  const all = [s1, s2];
  assert.equal(getCellValueInSheet(s2, "A1", new Set(), all), 2);
  assert.equal(getCellValueInSheet(s2, "A2", new Set(), all), 3);
  assert.equal(getCellValueInSheet(s2, "A3", new Set(), all), 45307);
});
