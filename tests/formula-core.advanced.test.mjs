// Advanced (Batch 4) টেস্ট: lib/formula-advanced-1..5.mjs + formula-advanced-registry.mjs
//
// কভারেজ: ২৭টি স্কেলার ফাংশন + ৫টি অ্যারে/রিগ্রেশন ফাংশন (FREQUENCY, LINEST, LOGEST, TREND, GROWTH)
//
// প্রত্যাশিত মানের উৎস (ইমপ্লিমেন্টেশনের আউটপুট কপি করা হয়নি):
//   ১) SciPy 1.18 / NumPy 2.5 দিয়ে স্বাধীনভাবে হিসাব করা ১১৮টি রেফারেন্স মান (REFERENCE)
//   ২) Microsoft Excel ডকুমেন্টেশনের উদাহরণ
//   ৩) গাণিতিক সম্পর্ক (যেমন T.DIST.2T = 2 × T.DIST.RT, GAMMA(n) = (n-1)!) ও উল্টো-ফাংশন রাউন্ড-ট্রিপ
//   ৪) রিগ্রেশনের জন্য NumPy lstsq / SciPy linregress
//
// দ্রষ্টব্য: T.DIST.2T / T.INV.2T-এর জন্য formula-core.mjs-এর টোকেনাইজার ঠিক করা আছে (ডটের পরে সংখ্যা অনুমোদিত)।
// চালাতে: node --test tests/formula-core.advanced.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormulaCore } from "../lib/formula-core.mjs";
import { ADVANCED_FUNCTION_NAMES } from "../lib/formula-advanced-registry.mjs";
import { ADVANCED_SPILL_NAMES, evaluateAdvancedSpill } from "../lib/formula-advanced-1.mjs";

const ctx = { getCell: () => "", expandRange: () => [], currentSheet: "Sheet1", sheets: {} };
const ev = (f) => evaluateFormulaCore(f, ctx);
const closeTo = (a, b, tol = 1e-9) => Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const near = (f, expected, tol = 1e-9) => {
  const v = ev(f);
  assert.ok(closeTo(Number(v), expected, tol), `${f} => ${v}, প্রত্যাশিত ${expected}`);
};
const err = (f, code) => assert.equal(String(ev(f)), code, f);

const REFERENCE = [
  ["=T.DIST(1,10,TRUE)", 0.8295534338489701],
  ["=T.DIST(1,10,FALSE)", 0.23036198922913867],
  ["=T.DIST(-1.5,7,TRUE)", 0.088649243494985],
  ["=T.DIST(-1.5,7,FALSE)", 0.12626306128596107],
  ["=T.DIST(60,1,TRUE)", 0.9946953263673767],
  ["=T.DIST(60,1,FALSE)", 8.839485870141359e-05],
  ["=T.DIST(0.3,25,TRUE)", 0.6166712531734713],
  ["=T.DIST(0.3,25,FALSE)", 0.3769465671543608],
  ["=T.DIST.2T(1.959999998,60)", 0.0546449299759209],
  ["=T.DIST.RT(1.959999998,60)", 0.02732246498796045],
  ["=T.DIST.2T(2.5,8)", 0.03694203771362412],
  ["=T.DIST.RT(2.5,8)", 0.01847101885681206],
  ["=T.DIST.2T(0,5)", 1.0],
  ["=T.DIST.RT(0,5)", 0.5],
  ["=T.DIST.RT(-1,10)", 0.8295534338489701],
  ["=T.INV(0.75,2)", 0.8164965809277261],
  ["=T.INV(0.975,30)", 2.0422724563012378],
  ["=T.INV(0.1,5)", -1.4758840488244813],
  ["=T.INV(0.5,9)", 0.0],
  ["=T.INV.2T(0.546449,60)", 0.6065330758257549],
  ["=T.INV.2T(0.05,20)", 2.085963447265864],
  ["=T.INV.2T(0.5,10)", 0.6998120613124317],
  ["=T.INV.2T(0.01,4)", 4.604094871349992],
  ["=CHISQ.DIST(0.5,1,TRUE)", 0.5204998778130466],
  ["=CHISQ.DIST(0.5,1,FALSE)", 0.43939128946772243],
  ["=CHISQ.DIST.RT(0.5,1)", 0.47950012218695337],
  ["=CHISQ.DIST(3,2,TRUE)", 0.7768698398515702],
  ["=CHISQ.DIST(3,2,FALSE)", 0.11156508007421491],
  ["=CHISQ.DIST.RT(3,2)", 0.22313016014842982],
  ["=CHISQ.DIST(10,5,TRUE)", 0.9247647538534878],
  ["=CHISQ.DIST(10,5,FALSE)", 0.028334555341734475],
  ["=CHISQ.DIST.RT(10,5)", 0.07523524614651217],
  ["=CHISQ.DIST(25,12,TRUE)", 0.9851771254025584],
  ["=CHISQ.DIST(25,12,FALSE)", 0.004738684555153747],
  ["=CHISQ.DIST.RT(25,12)", 0.014822874597441575],
  ["=CHISQ.INV(0.93,1)", 3.283020286759539],
  ["=CHISQ.INV(0.5,4)", 3.3566939800333224],
  ["=CHISQ.INV(0.99,10)", 23.209251158954356],
  ["=CHISQ.INV.RT(0.050001,10)", 18.30697345696106],
  ["=CHISQ.INV.RT(0.05,3)", 7.814727903251178],
  ["=CHISQ.INV.RT(0.5,7)", 6.345811195521515],
  ["=F.DIST(15.2069,6,4,TRUE)", 0.9900000430027627],
  ["=F.DIST(15.2069,6,4,FALSE)", 0.00122379170878318],
  ["=F.DIST.RT(15.2069,6,4)", 0.009999956997237313],
  ["=F.DIST(2,5,10,TRUE)", 0.8358050491002611],
  ["=F.DIST(2,5,10,FALSE)", 0.16200574218011515],
  ["=F.DIST.RT(2,5,10)", 0.16419495089973887],
  ["=F.DIST(0.7,3,12,TRUE)", 0.43009803635477584],
  ["=F.DIST(0.7,3,12,FALSE)", 0.5490117753332464],
  ["=F.DIST.RT(0.7,3,12)", 0.5699019636452242],
  ["=F.INV(0.01,6,4)", 0.10930991412457852],
  ["=F.INV.RT(0.01,6,4)", 15.206864861157523],
  ["=F.INV(0.5,5,10)", 0.931933160851048],
  ["=F.INV.RT(0.5,5,10)", 0.931933160851048],
  ["=F.INV(0.95,3,12)", 3.490294819497605],
  ["=F.INV.RT(0.95,3,12)", 0.11435575671012613],
  ["=GAMMA(2.5)", 1.329340388179137],
  ["=GAMMA(5)", 24.0],
  ["=GAMMA(0.5)", 1.7724538509055159],
  ["=GAMMA(10)", 362880.0],
  ["=GAMMA(-3.75)", 0.26786612886141653],
  ["=GAMMA(-0.5)", -3.5449077018110318],
  ["=GAMMA(1)", 1.0],
  ["=GAMMA(7)", 720.0],
  ["=GAMMALN(4)", 1.791759469228055],
  ["=GAMMALN.PRECISE(4)", 1.791759469228055],
  ["=GAMMALN(0.5)", 0.5723649429247],
  ["=GAMMALN.PRECISE(0.5)", 0.5723649429247],
  ["=GAMMALN(10)", 12.801827480081469],
  ["=GAMMALN.PRECISE(10)", 12.801827480081469],
  ["=GAMMALN(100)", 359.1342053695754],
  ["=GAMMALN.PRECISE(100)", 359.1342053695754],
  ["=GAMMALN(2.5)", 0.2846828704729192],
  ["=GAMMALN.PRECISE(2.5)", 0.2846828704729192],
  ["=GAMMA.DIST(10.00001131,9,2,TRUE)", 0.0680940038697872],
  ["=GAMMA.DIST(10.00001131,9,2,FALSE)", 0.03263913041829396],
  ["=GAMMA.DIST(2,3,2,TRUE)", 0.08030139707139418],
  ["=GAMMA.DIST(2,3,2,FALSE)", 0.09196986029286057],
  ["=GAMMA.DIST(0.5,1,1,TRUE)", 0.3934693402873665],
  ["=GAMMA.DIST(0.5,1,1,FALSE)", 0.6065306597126334],
  ["=GAMMA.DIST(5,2.5,0.7,TRUE)", 0.9861071566905958],
  ["=GAMMA.DIST(5,2.5,0.7,FALSE)", 0.01621699058462043],
  ["=GAMMA.INV(0.068094,9,2)", 10.000011191437181],
  ["=GAMMA.INV(0.5,3,2)", 5.348120627447118],
  ["=GAMMA.INV(0.99,2.5,0.7)", 5.280195364286146],
  ["=BETA.DIST(2,8,10,TRUE,1,3)", 0.6854705810546875],
  ["=BETA.DIST(2,8,10,FALSE,1,3)", 1.4837646484374996],
  ["=BETA.DIST(0.5,2,3,TRUE,0,1)", 0.6875],
  ["=BETA.DIST(0.5,2,3,FALSE,0,1)", 1.5000000000000004],
  ["=BETA.DIST(0.2,1.5,4,TRUE,0,1)", 0.404281090331962],
  ["=BETA.DIST(0.2,1.5,4,FALSE,0,1)", 2.253956521319788],
  ["=BETA.DIST(0.5,2,3,TRUE)", 0.6875],
  ["=BETA.DIST(0.5,2,3,FALSE)", 1.5000000000000004],
  ["=BETA.INV(0.6854706,8,10,1,3)", 2.000000012768408],
  ["=BETA.INV(0.5,2,3,0,1)", 0.3857275681323895],
  ["=BETA.INV(0.9,1.5,4,0,1)", 0.5229971671145806],
  ["=BETA.INV(0.5,2,3)", 0.3857275681323895],
  ["=WEIBULL.DIST(105,20,100,TRUE)", 0.9295813900692769],
  ["=WEIBULL.DIST(105,20,100,FALSE)", 0.035588864024504334],
  ["=WEIBULL.DIST(2,1,1,TRUE)", 0.8646647167633873],
  ["=WEIBULL.DIST(2,1,1,FALSE)", 0.1353352832366127],
  ["=WEIBULL.DIST(1.5,2,1,TRUE)", 0.8946007754381357],
  ["=WEIBULL.DIST(1.5,2,1,FALSE)", 0.316197673685593],
  ["=LOGNORM.DIST(4,3.5,1.2,TRUE)", 0.03908355570680047],
  ["=LOGNORM.DIST(4,3.5,1.2,FALSE)", 0.01761759668181923],
  ["=LOGNORM.DIST(1,0,1,TRUE)", 0.5],
  ["=LOGNORM.DIST(1,0,1,FALSE)", 0.3989422804014327],
  ["=LOGNORM.DIST(10,2,0.5,TRUE)", 0.7274670383157373],
  ["=LOGNORM.DIST(10,2,0.5,FALSE)", 0.06643761295957624],
  ["=LOGNORM.INV(0.0390836,3.5,1.2)", 4.000002514145024],
  ["=LOGNORM.INV(0.5,2,0.5)", 7.38905609893065],
  ["=LOGNORM.INV(0.9,0,1)", 3.6022244792791573],
  ["=NORM.DIST(42,40,1.5,TRUE)", 0.9087887802741321],
  ["=NORM.DIST(42,40,1.5,FALSE)", 0.10934004978399577],
  ["=NORM.S.DIST(1.96,TRUE)", 0.9750021048517795],
  ["=NORM.S.DIST(0.5,FALSE)", 0.35206532676429947],
  ["=NORM.INV(0.908789,40,1.5)", 42.00000200956616],
  ["=NORM.S.INV(0.975)", 1.959963984540054],
];

// =====================================================================
// কাঠামো
// =====================================================================
const EXPECTED_SCALAR = [
  "F.DIST", "F.DIST.RT", "F.INV", "F.INV.RT",
  "T.DIST", "T.DIST.2T", "T.DIST.RT", "T.INV", "T.INV.2T",
  "CHISQ.DIST", "CHISQ.DIST.RT", "CHISQ.INV", "CHISQ.INV.RT",
  "NORM.DIST", "NORM.INV", "NORM.S.DIST", "NORM.S.INV",
  "GAMMA", "GAMMALN", "GAMMALN.PRECISE", "GAMMA.DIST", "GAMMA.INV",
  "BETA.DIST", "BETA.INV", "WEIBULL.DIST", "LOGNORM.DIST", "LOGNORM.INV",
];

test("কাঠামো: রেজিস্ট্রিতে ঠিক ২৭টি স্কেলার ফাংশন, ডুপ্লিকেট নেই", () => {
  assert.equal(ADVANCED_FUNCTION_NAMES.length, 27);
  assert.equal(new Set(ADVANCED_FUNCTION_NAMES).size, 27);
  assert.deepEqual([...ADVANCED_FUNCTION_NAMES].sort(), [...EXPECTED_SCALAR].sort());
});

test("কাঠামো: অ্যারে ফাংশন ঠিক ৫টি", () => {
  assert.deepEqual([...ADVANCED_SPILL_NAMES].sort(), ["FREQUENCY", "GROWTH", "LINEST", "LOGEST", "TREND"]);
});

test("কাঠামো: প্রতিটি স্কেলার ইঞ্জিনে স্বীকৃত (#NAME? নয়)", () => {
  for (const n of ADVANCED_FUNCTION_NAMES) {
    assert.notEqual(String(ev(`=${n}(1)`)), "#NAME?", n);
  }
});

test("কাঠামো: রেফারেন্স তালিকা ২৭টি ফাংশনের সবগুলো ঢেকেছে", () => {
  const covered = new Set(REFERENCE.map(([f]) => /^=([A-Z0-9.]+)\(/.exec(f)[1]));
  for (const n of EXPECTED_SCALAR) assert.ok(covered.has(n), `${n}-এর কোনো রেফারেন্স কেস নেই`);
});

test("কাঠামো: ভুল আর্গুমেন্ট সংখ্যা #VALUE! দেয়, ক্র্যাশ নয়", () => {
  for (const n of ADVANCED_FUNCTION_NAMES) {
    for (const args of ["", "1,2,3,4,5,6,7,8"]) {
      const v = String(ev(`=${n}(${args})`));
      assert.ok(v.startsWith("#"), `${n}(${args}) => ${v}`);
      assert.notEqual(v, "#NAME?", n);
    }
  }
});

test("কাঠামো: টেক্সট আর্গুমেন্টে ক্র্যাশ নয়", () => {
  for (const n of ADVANCED_FUNCTION_NAMES) {
    const v = String(ev(`=${n}("abc","abc","abc","abc")`));
    assert.ok(v.startsWith("#"), `${n} => ${v}`);
  }
});

// =====================================================================
// রেফারেন্স মান: SciPy-র সঙ্গে ফাংশন-ভিত্তিক তুলনা
// =====================================================================
const byFunction = new Map();
for (const [formula, expected] of REFERENCE) {
  const name = /^=([A-Z0-9.]+)\(/.exec(formula)[1];
  if (!byFunction.has(name)) byFunction.set(name, []);
  byFunction.get(name).push([formula, expected]);
}
for (const [name, items] of byFunction) {
  test(`রেফারেন্স (SciPy): ${name} — ${items.length}টি কেস`, () => {
    for (const [formula, expected] of items) near(formula, expected, 1e-9);
  });
}

// =====================================================================
// Microsoft ডক-উদাহরণ (ডকে প্রকাশিত মান, তাই সহনশীলতা বেশি)
// =====================================================================
test("Microsoft ডক-উদাহরণ", () => {
  near("=T.DIST(60,1,TRUE)", 0.99469533, 1e-7);
  near("=T.DIST.RT(1.959999998,60)", 0.027322465, 1e-7);
  near("=T.INV(0.75,2)", 0.816496581, 1e-7);
  near("=CHISQ.DIST(0.5,1,TRUE)", 0.52049988, 1e-7);
  near("=CHISQ.DIST.RT(18.307,10)", 0.0500006, 1e-6);
  near("=CHISQ.INV(0.93,1)", 3.283020287, 1e-7);
  near("=F.DIST(15.2069,6,4,TRUE)", 0.99, 1e-5);
  near("=F.INV(0.01,6,4)", 0.10930991, 1e-6);
  near("=F.INV.RT(0.01,6,4)", 15.20686486, 1e-7);
  near("=GAMMA(2.5)", 1.329340388, 1e-8);
  near("=GAMMA(-3.75)", 0.267866129, 1e-6);
  near("=GAMMALN(4)", 1.791759469, 1e-8);
  near("=GAMMA.DIST(10.00001131,9,2,TRUE)", 0.068094, 1e-5);
  near("=GAMMA.DIST(10.00001131,9,2,FALSE)", 0.032639, 1e-4);
  near("=BETA.DIST(2,8,10,TRUE,1,3)", 0.6854706, 1e-7);
  near("=BETA.DIST(2,8,10,FALSE,1,3)", 1.4837646, 1e-7);
  near("=BETA.INV(0.6854706,8,10,1,3)", 2, 1e-6);
  near("=WEIBULL.DIST(105,20,100,TRUE)", 0.929581, 1e-6);
  near("=WEIBULL.DIST(105,20,100,FALSE)", 0.035589, 1e-5);
  near("=LOGNORM.DIST(4,3.5,1.2,TRUE)", 0.0390836, 1e-6);
  near("=LOGNORM.DIST(4,3.5,1.2,FALSE)", 0.0176176, 1e-5);
  near("=LOGNORM.INV(0.0390836,3.5,1.2)", 4, 1e-5); // Microsoft ডকে 4.000025 লেখা, গণিতে 4.0000025 (SciPy রেফারেন্সে যাচাইকৃত)
  near("=NORM.DIST(42,40,1.5,TRUE)", 0.9087888, 1e-6);
  near("=NORM.INV(0.908789,40,1.5)", 42, 1e-6);
});

// =====================================================================
// গাণিতিক সম্পর্ক ও রাউন্ড-ট্রিপ
// =====================================================================
test("সম্পর্ক: T.DIST.2T = 2 × T.DIST.RT, T.DIST(-x) = 1 − T.DIST(x)", () => {
  for (const [x, df] of [[0.5, 3], [1.7, 12], [3.2, 40]]) {
    near(`=T.DIST.2T(${x},${df})`, 2 * Number(ev(`=T.DIST.RT(${x},${df})`)));
    near(`=T.DIST(${-x},${df},TRUE)`, 1 - Number(ev(`=T.DIST(${x},${df},TRUE)`)));
  }
});
test("সম্পর্ক: F.DIST + F.DIST.RT = 1, CHISQ.DIST + CHISQ.DIST.RT = 1", () => {
  for (const [x, a, b] of [[0.4, 3, 7], [2.5, 6, 11], [9, 2, 30]]) {
    near(`=F.DIST(${x},${a},${b},TRUE)+F.DIST.RT(${x},${a},${b})`, 1);
  }
  for (const [x, k] of [[0.7, 1], [4, 3], [20, 9]]) {
    near(`=CHISQ.DIST(${x},${k},TRUE)+CHISQ.DIST.RT(${x},${k})`, 1);
  }
});
test("সম্পর্ক: CHISQ.DIST(x,k) = GAMMA.DIST(x,k/2,2)", () => {
  for (const [x, k] of [[1.3, 2], [6, 5], [14, 8]]) {
    near(`=CHISQ.DIST(${x},${k},TRUE)`, Number(ev(`=GAMMA.DIST(${x},${k / 2},2,TRUE)`)));
    near(`=CHISQ.DIST(${x},${k},FALSE)`, Number(ev(`=GAMMA.DIST(${x},${k / 2},2,FALSE)`)));
  }
});
test("সম্পর্ক: WEIBULL (α=1) = সূচকীয় বিন্যাস, BETA(1,1) = সমবিন্যাস", () => {
  for (const [x, b] of [[0.5, 1], [2, 3], [10, 4]]) {
    near(`=WEIBULL.DIST(${x},1,${b},TRUE)`, 1 - Math.exp(-x / b));
    near(`=WEIBULL.DIST(${x},1,${b},FALSE)`, Math.exp(-x / b) / b);
  }
  for (const x of [0.1, 0.5, 0.9]) near(`=BETA.DIST(${x},1,1,TRUE)`, x);
});
test("সম্পর্ক: GAMMA(n) = (n−1)!, GAMMALN = LN(GAMMA), GAMMALN.PRECISE = GAMMALN", () => {
  const fact = [1, 1, 2, 6, 24, 120, 720]; // fact[k] = k!
  for (let n = 1; n <= 7; n++) near(`=GAMMA(${n})`, fact[n - 1]);
  for (const x of [0.5, 1.5, 3.3, 12]) {
    near(`=GAMMALN(${x})`, Math.log(Number(ev(`=GAMMA(${x})`))));
    near(`=GAMMALN.PRECISE(${x})`, Number(ev(`=GAMMALN(${x})`)), 1e-12);
  }
});
test("সম্পর্ক: GAMMA প্রতিফলন-সূত্র (ঋণাত্মক অ-পূর্ণসংখ্যা)", () => {
  // Γ(x)·Γ(1−x) = π / sin(πx)
  for (const x of [-0.5, -1.25, -2.75, 0.3]) {
    near(`=GAMMA(${x})*GAMMA(${1 - x})`, Math.PI / Math.sin(Math.PI * x), 1e-9);
  }
});
test("রাউন্ড-ট্রিপ: INV(DIST(x)) = x", () => {
  for (const x of [0.2, 1, 2.7]) {
    near(`=T.INV(T.DIST(${x},9,TRUE),9)`, x, 1e-8);
    near(`=CHISQ.INV(CHISQ.DIST(${x},4,TRUE),4)`, x, 1e-8);
    near(`=F.INV(F.DIST(${x},5,8,TRUE),5,8)`, x, 1e-8);
    near(`=GAMMA.INV(GAMMA.DIST(${x},2.5,1.5,TRUE),2.5,1.5)`, x, 1e-8);
    near(`=LOGNORM.INV(LOGNORM.DIST(${x},0.3,0.8,TRUE),0.3,0.8)`, x, 1e-8);
    near(`=BETA.INV(BETA.DIST(${x / 3},2,5,TRUE),2,5)`, x / 3, 1e-8);
  }
});
test("রাউন্ড-ট্রিপ: RT ও 2T উল্টো-ফাংশন", () => {
  for (const p of [0.01, 0.05, 0.3]) {
    near(`=CHISQ.DIST.RT(CHISQ.INV.RT(${p},6),6)`, p, 1e-8);
    near(`=F.DIST.RT(F.INV.RT(${p},4,9),4,9)`, p, 1e-8);
    near(`=T.DIST.2T(T.INV.2T(${p},15),15)`, p, 1e-8);
  }
});
test("BETA.DIST/BETA.INV: A, B ডিফল্ট 0 ও 1", () => {
  near("=BETA.DIST(0.3,2,5,TRUE)", Number(ev("=BETA.DIST(0.3,2,5,TRUE,0,1)")));
  near("=BETA.INV(0.4,2,5)", Number(ev("=BETA.INV(0.4,2,5,0,1)")));
});
test("NORM.* (রেজিস্ট্রির সংস্করণ) = Batch 2 সংস্করণ", () => {
  near("=NORM.S.DIST(0,TRUE)", 0.5, 1e-12);
  near("=NORM.S.INV(0.5)", 0, 1e-12);
  near("=NORM.DIST(40,40,1.5,FALSE)", 1 / (1.5 * Math.sqrt(2 * Math.PI)), 1e-12);
});

// =====================================================================
// ত্রুটি অবস্থা (Excel-এর নিয়ম অনুযায়ী)
// =====================================================================
test("ত্রুটি: T ফাংশন", () => {
  err("=T.DIST(1,0,TRUE)", "#NUM!");
  err("=T.DIST.2T(-1,10)", "#NUM!");
  err("=T.DIST.2T(1,0)", "#NUM!");
  err("=T.INV(0,10)", "#NUM!");
  err("=T.INV(1,10)", "#NUM!");
  err("=T.INV(0.5,0)", "#NUM!");
  err("=T.INV.2T(0,10)", "#NUM!");
  err("=T.INV.2T(1.5,10)", "#NUM!");
});
test("ত্রুটি: CHISQ ও F ফাংশন", () => {
  err("=CHISQ.DIST(-1,2,TRUE)", "#NUM!");
  err("=CHISQ.DIST(1,0,TRUE)", "#NUM!");
  err("=CHISQ.DIST.RT(-1,2)", "#NUM!");
  err("=CHISQ.INV(1.5,2)", "#NUM!");
  err("=CHISQ.INV.RT(-0.1,2)", "#NUM!");
  err("=CHISQ.INV(0.5,0)", "#NUM!");
  err("=F.DIST(-1,2,3,TRUE)", "#NUM!");
  err("=F.DIST(1,0,3,TRUE)", "#NUM!");
  err("=F.INV(1.5,2,3)", "#NUM!");
  err("=F.INV.RT(-0.1,2,3)", "#NUM!");
});
test("ত্রুটি: GAMMA পরিবার", () => {
  err("=GAMMA(0)", "#NUM!");
  err("=GAMMA(-1)", "#NUM!");
  err("=GAMMA(-4)", "#NUM!");
  err("=GAMMALN(0)", "#NUM!");
  err("=GAMMALN(-2)", "#NUM!");
  err("=GAMMALN.PRECISE(-1)", "#NUM!");
  err("=GAMMA.DIST(-1,2,2,TRUE)", "#NUM!");
  err("=GAMMA.DIST(1,0,2,TRUE)", "#NUM!");
  err("=GAMMA.DIST(1,2,0,TRUE)", "#NUM!");
  err("=GAMMA.INV(1.5,2,2)", "#NUM!");
  err("=GAMMA.INV(0.5,-1,2)", "#NUM!");
});
test("ত্রুটি: BETA / WEIBULL / LOGNORM", () => {
  err("=BETA.DIST(5,2,3,TRUE,0,1)", "#NUM!");
  err("=BETA.DIST(0.5,0,3,TRUE)", "#NUM!");
  err("=BETA.DIST(0.5,2,3,TRUE,1,1)", "#NUM!");
  err("=BETA.INV(0,2,3)", "#NUM!");
  err("=BETA.INV(1.5,2,3)", "#NUM!");
  err("=WEIBULL.DIST(-1,2,3,TRUE)", "#NUM!");
  err("=WEIBULL.DIST(1,0,3,TRUE)", "#NUM!");
  err("=WEIBULL.DIST(1,2,0,TRUE)", "#NUM!");
  err("=LOGNORM.DIST(0,0,1,TRUE)", "#NUM!");
  err("=LOGNORM.DIST(-1,0,1,TRUE)", "#NUM!");
  err("=LOGNORM.DIST(1,0,0,TRUE)", "#NUM!");
  err("=LOGNORM.INV(0,0,1)", "#NUM!");
  err("=LOGNORM.INV(1,0,1)", "#NUM!");
  err("=LOGNORM.INV(0.5,0,-1)", "#NUM!");
});
test("ত্রুটি: ত্রুটি-মান আর্গুমেন্ট থেকে প্রচারিত হয়", () => {
  err("=T.DIST(#N/A,5,TRUE)", "#N/A");
  err("=GAMMA(#DIV/0!)", "#DIV/0!");
  err("=F.DIST(1,#VALUE!,3,TRUE)", "#VALUE!");
});
test("ডিগ্রি-অব-ফ্রিডম দশমিক হলে ছাঁটা হয় (Excel-এর নিয়ম)", () => {
  near("=T.DIST(1,10.9,TRUE)", Number(ev("=T.DIST(1,10,TRUE)")), 1e-12);
  near("=CHISQ.DIST(3,4.7,TRUE)", Number(ev("=CHISQ.DIST(3,4,TRUE)")), 1e-12);
  near("=F.DIST(2,5.9,8.2,TRUE)", Number(ev("=F.DIST(2,5,8,TRUE)")), 1e-12);
});
test("চরম মান: ক্র্যাশ নয়, সসীম বা ত্রুটি কোড", () => {
  for (const f of ["=T.DIST(1E10,5,TRUE)", "=T.DIST(-1E10,5,TRUE)", "=CHISQ.DIST(1E6,3,TRUE)", "=F.DIST(1E8,3,4,TRUE)",
    "=GAMMA(170)", "=GAMMA(171.7)", "=GAMMALN(1E10)", "=NORM.S.DIST(40,TRUE)", "=NORM.S.DIST(-40,TRUE)",
    "=WEIBULL.DIST(1E5,2,3,TRUE)", "=BETA.DIST(1E-12,2,3,TRUE)", "=LOGNORM.DIST(1E-300,0,1,TRUE)"]) {
    const v = ev(f);
    assert.ok(typeof v === "number" ? Number.isFinite(v) : String(v).startsWith("#"), `${f} => ${v}`);
    assert.notEqual(String(v), "#NAME?", f);
  }
  near("=T.DIST(1E10,5,TRUE)", 1, 1e-9);
  near("=CHISQ.DIST(1E6,3,TRUE)", 1, 1e-9);
});

// =====================================================================
// অ্যারে ফাংশন: FREQUENCY / LINEST / LOGEST / TREND / GROWTH
// =====================================================================
const spill = (fn, ...args) => evaluateAdvancedSpill(fn, args, { getGrid: (a) => a, getValue: (a) => a });
const rowsOf = (res) => {
  assert.equal(typeof res, "object", `array আশা করা হয়েছিল, পাওয়া গেছে: ${String(res)}`);
  assert.equal(res.kind, "array");
  return res.values;
};
const matrixClose = (actual, expected, tol = 1e-9, label = "") => {
  assert.equal(actual.length, expected.length, `${label} সারির সংখ্যা`);
  expected.forEach((row, i) => {
    assert.equal(actual[i].length, row.length, `${label} সারি ${i} প্রস্থ`);
    row.forEach((exp, j) => {
      const got = actual[i][j];
      if (typeof exp === "number") assert.ok(closeTo(Number(got), exp, tol), `${label}[${i}][${j}] = ${got}, প্রত্যাশিত ${exp}`);
      else assert.equal(got, exp, `${label}[${i}][${j}]`);
    });
  });
};
const col = (...v) => v.map((x) => [x]);

// ডেটাসেট (NumPy lstsq / SciPy linregress দিয়ে যাচাইকৃত)
const X6 = col(1, 2, 3, 4, 5, 6);
const Y6 = col(2.1, 3.9, 6.2, 7.8, 10.1, 12.2);
const YEXP = col(2.2, 4.1, 8.3, 15.8, 32.5, 63.0);
const X1 = [1, 2, 3, 4, 5, 6, 7], X2 = [2, 1, 4, 3, 6, 5, 9];
const XM = X1.map((v, i) => [v, X2[i]]);
const YM = col(5.2, 5.9, 10.1, 10.8, 16.2, 15.9, 24.0);

test("কাঠামো: অ্যারে ফাংশন নাম ছাড়া অন্য ফাংশনে null", () => {
  assert.equal(evaluateAdvancedSpill("SUM", [], { getGrid: (a) => a, getValue: (a) => a }), null);
  assert.equal(evaluateAdvancedSpill("FREQUENCY", null, null), "#VALUE!");
});

// ---------- FREQUENCY ----------
test("FREQUENCY (Microsoft: ডেটা {79,85,78,85,50,81,95,88,97}, বিন {70,79,89} → 1,2,4,2)", () => {
  const data = col(79, 85, 78, 85, 50, 81, 95, 88, 97);
  assert.deepEqual(rowsOf(spill("FREQUENCY", data, col(70, 79, 89))), col(1, 2, 4, 2));
});
test("FREQUENCY: ফলাফলে সারি = বিন + ১, মোট = ডেটার সংখ্যা", () => {
  const data = col(1, 5, 5, 9, 12, 12, 12, 30, -4);
  const r = rowsOf(spill("FREQUENCY", data, col(0, 5, 10, 20)));
  assert.equal(r.length, 5);
  assert.deepEqual(r, col(1, 3, 1, 3, 1)); // ≤0:{-4}, ≤5:{1,5,5}, ≤10:{9}, ≤20:{12×3}, >20:{30}
  assert.equal(r.reduce((s, [c]) => s + c, 0), 9);
});
test("FREQUENCY: অবিন্যস্ত বিন (ফলাফল বিনের মূল ক্রম অনুসরণ করে)", () => {
  const data = col(79, 85, 78, 85, 50, 81, 95, 88, 97);
  assert.deepEqual(rowsOf(spill("FREQUENCY", data, col(89, 70, 79))), col(4, 1, 2, 2));
});
test("FREQUENCY: বিনের সমান মান নিচের বিনে যায় (≤)", () => {
  assert.deepEqual(rowsOf(spill("FREQUENCY", col(5, 5, 5), col(5))), col(3, 0));
  assert.deepEqual(rowsOf(spill("FREQUENCY", col(6, 6), col(5))), col(0, 2));
});
test("FREQUENCY: টেক্সট ও ফাঁকা উপেক্ষা, অনুভূমিক ইনপুট", () => {
  assert.deepEqual(rowsOf(spill("FREQUENCY", [[1, "a", "", 7, true]], [[2, 5]])), col(1, 0, 1));
});
test("FREQUENCY: কোনো সংখ্যা না থাকলে সব ০, ত্রুটি প্রচার, ভুল ইনপুট", () => {
  assert.deepEqual(rowsOf(spill("FREQUENCY", [["a"]], col(1, 2))), col(0, 0, 0));
  assert.equal(spill("FREQUENCY", [[1, "#N/A"]], col(1)), "#N/A");
  assert.equal(spill("FREQUENCY", col(1, 2)), "#VALUE!");
  assert.equal(spill("FREQUENCY", null, col(1)), "#VALUE!");
});

// ---------- LINEST ----------
test("LINEST: একক চলক, stats=FALSE → [ঢাল, ছেদ]", () => {
  matrixClose(rowsOf(spill("LINEST", Y6, X6)), [[2.0199999999999987, -0.01999999999999951]], 1e-9, "LINEST");
});
test("LINEST: Microsoft উদাহরণ (সঠিক রৈখিক ডেটা) y=2x+1", () => {
  matrixClose(rowsOf(spill("LINEST", col(1, 9, 5, 7), col(0, 4, 2, 3))), [[2, 1]], 1e-9, "exact");
});
test("LINEST: x বাদ দিলে x = 1,2,3… ধরা হয়", () => {
  matrixClose(rowsOf(spill("LINEST", Y6)), rowsOf(spill("LINEST", Y6, X6)), 1e-12, "x-omitted");
});
test("LINEST: stats=TRUE → ৫×২ ম্যাট্রিক্স (SciPy/NumPy-এর সঙ্গে মিলিত)", () => {
  matrixClose(rowsOf(spill("LINEST", Y6, X6, true, true)), [
    [2.0199999999999987, -0.01999999999999951],
    [0.04276179870598791, 0.16653327995729067],
    [0.9982106661074999, 0.17888543819998318],
    [2231.4687499999995, 4],
    [71.40699999999998, 0.128],
  ], 1e-9, "LINEST stats");
});
test("LINEST: const=FALSE (মূলবিন্দু দিয়ে), stats সহ — অ-কেন্দ্রিক R²", () => {
  matrixClose(rowsOf(spill("LINEST", Y6, X6, false, true)), [
    [2.0153846153846153, 0],
    [0.016802769163558155, "#N/A"],
    [0.9996525719040933, 0.16028820197477947],
    [14386.46706586826, 5],
    [369.6215384615385, 0.1284615384615385],
  ], 1e-9, "LINEST noconst");
});
test("LINEST: বহু-চলক — সহগ উল্টো ক্রমে [m₂, m₁, b] (Excel-এর নিয়ম)", () => {
  matrixClose(rowsOf(spill("LINEST", YM, XM, true, true)), [
    [1.4152941176470604, 1.3794957983193263, 1.002184873949584],
    [0.21127612482891234, 0.2631232220891753, 0.5397065131225921],
    [0.9938159617115275, 0.6375900002378972, "#N/A"],
    [321.4132627749294, 4, "#N/A"],
    [261.322487394958, 1.626084033613447, "#N/A"],
  ], 1e-9, "LINEST multi");
});
test("LINEST: অনুভূমিক (সারি) y ও x", () => {
  matrixClose(rowsOf(spill("LINEST", [[2.1, 3.9, 6.2, 7.8, 10.1, 12.2]], [[1, 2, 3, 4, 5, 6]])),
    [[2.0199999999999987, -0.01999999999999951]], 1e-9, "row");
});
test("LINEST: ভুল ইনপুট", () => {
  assert.equal(typeof spill("LINEST", Y6, col(1, 2, 3)), "string"); // দৈর্ঘ্য মেলে না → ত্রুটি
  assert.ok(String(spill("LINEST", Y6, col(1, 2, 3))).startsWith("#"));
  assert.equal(spill("LINEST"), "#VALUE!");
  assert.equal(spill("LINEST", Y6, X6, true, true, true), "#VALUE!");
  assert.equal(spill("LINEST", Y6, X6, "maybe"), "#VALUE!");
  assert.ok(String(spill("LINEST", col(1, "x", 3), col(1, 2, 3))).startsWith("#"));
});

// ---------- LOGEST ----------
test("LOGEST: [m, b] (y = b·m^x), stats সহ — se লগ-স্কেলে (Excel-এর নিয়ম)", () => {
  matrixClose(rowsOf(spill("LOGEST", YEXP, X6, true, true)), [
    [1.9641957506705447, 1.0911411121892094],
    [0.0060111231570084515, 0.023409961364035527],
    [0.9996829561382151, 0.025146332300211433],
    [12612.550837732279, 4],
    [7.975395526706768, 0.002529352112610627],
  ], 1e-9, "LOGEST");
});
test("LOGEST: সঠিক সূচকীয় ডেটা y = 3·2^x → [2, 3]", () => {
  matrixClose(rowsOf(spill("LOGEST", col(6, 12, 24, 48), col(1, 2, 3, 4))), [[2, 3]], 1e-9, "exact");
});
test("LOGEST: y ≤ 0 হলে #NUM!", () => {
  assert.equal(spill("LOGEST", col(1, 0, 3), col(1, 2, 3)), "#NUM!");
  assert.equal(spill("LOGEST", col(1, -2, 3), col(1, 2, 3)), "#NUM!");
});

// ---------- TREND ----------
test("TREND: নতুন x-এর পূর্বাভাস (x=7,8,10 → 14.12, 16.14, 20.18)", () => {
  matrixClose(rowsOf(spill("TREND", Y6, X6, col(7, 8, 10))), col(14.12, 16.14, 20.18), 1e-9, "TREND new_x");
});
test("TREND: new_x বাদ দিলে ফিটেড মান", () => {
  matrixClose(rowsOf(spill("TREND", Y6, X6)), col(2, 4.02, 6.04, 8.06, 10.08, 12.1), 1e-9, "TREND fitted");
});
test("TREND: const=FALSE", () => {
  // মূলবিন্দু দিয়ে ঢাল = 2.0153846153846153
  matrixClose(rowsOf(spill("TREND", Y6, X6, col(10), false)), col(20.153846153846153), 1e-9, "TREND noconst");
});
test("TREND: বহু-চলক (x₁,x₂) = (8,7), (9,8)", () => {
  matrixClose(rowsOf(spill("TREND", YM, XM, [[8, 7], [9, 8]])), col(21.945210084033615, 24.740000000000006), 1e-9, "TREND multi");
});
test("TREND: সারি-ভিত্তিক y হলে ফলাফলও সারি", () => {
  matrixClose(rowsOf(spill("TREND", [[2.1, 3.9, 6.2, 7.8, 10.1, 12.2]], [[1, 2, 3, 4, 5, 6]], [[7, 8, 10]])),
    [[14.12, 16.14, 20.18]], 1e-9, "TREND row");
});
test("TREND: new_x-এর কলাম সংখ্যা চলকের সমান না হলে #REF!", () => {
  assert.equal(spill("TREND", YM, XM, [[8, 7, 1]]), "#REF!");
});

// ---------- GROWTH ----------
test("GROWTH: নতুন x-এর পূর্বাভাস (x=7,8)", () => {
  matrixClose(rowsOf(spill("GROWTH", YEXP, X6, col(7, 8))), col(123.07625972250528, 241.74586635536915), 1e-9, "GROWTH new_x");
});
test("GROWTH: new_x বাদ দিলে ফিটেড মান", () => {
  matrixClose(rowsOf(spill("GROWTH", YEXP, X6)), col(
    2.1432147359439773, 4.209693277115654, 8.268661646536925, 16.241270069860338, 31.901033656712386, 62.6598747505125,
  ), 1e-9, "GROWTH fitted");
});
test("GROWTH: সঠিক সূচকীয় ডেটা, y ≤ 0 হলে #NUM!", () => {
  matrixClose(rowsOf(spill("GROWTH", col(6, 12, 24, 48), col(1, 2, 3, 4), col(5))), col(96), 1e-9, "GROWTH exact");
  assert.equal(spill("GROWTH", col(1, 0, 3), col(1, 2, 3)), "#NUM!");
});

// ---------- সামঞ্জস্য ----------
test("সামঞ্জস্য: TREND = LINEST-এর ঢাল/ছেদ দিয়ে হিসাব, GROWTH = LOGEST দিয়ে", () => {
  const [[m, b]] = rowsOf(spill("LINEST", Y6, X6));
  const tr = rowsOf(spill("TREND", Y6, X6, col(11)));
  assert.ok(closeTo(tr[0][0], m * 11 + b, 1e-12));
  const [[mm, bb]] = rowsOf(spill("LOGEST", YEXP, X6));
  const gr = rowsOf(spill("GROWTH", YEXP, X6, col(11)));
  assert.ok(closeTo(gr[0][0], bb * Math.pow(mm, 11), 1e-9));
});
test("অ্যারে: ফলাফলের কাঠামো আয়তাকার ও ইনপুট অপরিবর্তিত", () => {
  const y = Y6.map((r) => r.slice()), x = X6.map((r) => r.slice());
  const res = spill("LINEST", y, x, true, true);
  assert.equal(res.rows, 5);
  assert.equal(res.cols, 2);
  assert.deepEqual(y, Y6);
  assert.deepEqual(x, X6);
});