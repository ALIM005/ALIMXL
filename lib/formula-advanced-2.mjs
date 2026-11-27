/**
 * ALIMXL Advanced Formula Module 2 (v2)
 *
 * Excel functions: F.DIST, F.DIST.RT, F.INV, F.INV.RT
 * Synchronous. All arguments are single numbers.
 *
 * Removed from the old version (not Excel-accurate / need range support):
 * GROWTH, LOGEST, FORECAST.ETS, FORECAST.ETS.CONFINT,
 * FORECAST.ETS.SEASONALITY, FORECAST.ETS.STAT
 */

const ERROR_VALUE = "#VALUE!";
const ERROR_NUM = "#NUM!";

function num(value, fn) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`${fn}: ${ERROR_VALUE}`);
}

function bool(value, fn) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const t = value.trim().toUpperCase();
    if (t === "TRUE") return true;
    if (t === "FALSE") return false;
  }
  throw new Error(`${fn}: ${ERROR_VALUE}`);
}

function bad() {
  throw new Error(ERROR_NUM);
}

function checkArgc(args, count, fn) {
  if (args.length !== count) throw new Error(`${fn}: ${ERROR_VALUE}`);
}

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function logGamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  const z = x - 1;
  let a = LANCZOS[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i += 1) a += LANCZOS[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

function betaCf(a, b, x) {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 1000; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return h;
}

// regularized incomplete beta I_x(a, b)
function betaI(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (front * betaCf(a, b, x)) / a;
  return 1 - (front * betaCf(b, a, 1 - x)) / b;
}

// F cumulative (left tail) and right tail, both computed without cancellation
function fLeft(x, d1, d2) {
  if (x <= 0) return 0;
  return betaI(d1 / 2, d2 / 2, (d1 * x) / (d1 * x + d2));
}
function fRight(x, d1, d2) {
  if (x <= 0) return 1;
  return betaI(d2 / 2, d1 / 2, d2 / (d2 + d1 * x));
}

function fPdf(x, d1, d2) {
  if (x === 0) return d1 < 2 ? bad() : d1 === 2 ? 1 : 0;
  const logPdf =
    0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) -
    Math.log(x) -
    (logGamma(d1 / 2) + logGamma(d2 / 2) - logGamma((d1 + d2) / 2));
  return Math.exp(logPdf);
}

function bisect(cdf, p, hi) {
  let lo = 0;
  while (cdf(hi) < p) { hi *= 2; if (hi > 1e300) bad(); }
  for (let i = 0; i < 300; i += 1) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid; else hi = mid;
    if (hi - lo <= 1e-15 * Math.max(1, mid)) break;
  }
  return (lo + hi) / 2;
}

function dof(value, fn) {
  const n = Math.trunc(num(value, fn));
  if (n < 1 || n > 1e10) bad();
  return n;
}

// F.DIST(x, deg_freedom1, deg_freedom2, cumulative)
function evaluateFDist(args) {
  checkArgc(args, 4, "F.DIST");
  const x = num(args[0], "F.DIST");
  const d1 = dof(args[1], "F.DIST");
  const d2 = dof(args[2], "F.DIST");
  const cumulative = bool(args[3], "F.DIST");
  if (x < 0) bad();
  return cumulative ? fLeft(x, d1, d2) : fPdf(x, d1, d2);
}

// F.DIST.RT(x, deg_freedom1, deg_freedom2)
function evaluateFDistRt(args) {
  checkArgc(args, 3, "F.DIST.RT");
  const x = num(args[0], "F.DIST.RT");
  const d1 = dof(args[1], "F.DIST.RT");
  const d2 = dof(args[2], "F.DIST.RT");
  if (x < 0) bad();
  return fRight(x, d1, d2);
}

// F.INV(probability, deg_freedom1, deg_freedom2)
function evaluateFInv(args) {
  checkArgc(args, 3, "F.INV");
  const p = num(args[0], "F.INV");
  const d1 = dof(args[1], "F.INV");
  const d2 = dof(args[2], "F.INV");
  if (p < 0 || p > 1) bad();
  if (p === 0) return 0;
  if (p === 1) bad();
  return bisect((x) => fLeft(x, d1, d2), p, 10);
}

// F.INV.RT(probability, deg_freedom1, deg_freedom2)
function evaluateFInvRt(args) {
  checkArgc(args, 3, "F.INV.RT");
  const p = num(args[0], "F.INV.RT");
  const d1 = dof(args[1], "F.INV.RT");
  const d2 = dof(args[2], "F.INV.RT");
  if (p <= 0 || p > 1) bad();
  if (p === 1) return 0;
  // solve right tail directly: larger x gives smaller tail
  let lo = 0;
  let hi = 10;
  while (fRight(hi, d1, d2) > p) { hi *= 2; if (hi > 1e300) bad(); }
  for (let i = 0; i < 300; i += 1) {
    const mid = (lo + hi) / 2;
    if (fRight(mid, d1, d2) > p) lo = mid; else hi = mid;
    if (hi - lo <= 1e-15 * Math.max(1, mid)) break;
  }
  return (lo + hi) / 2;
}

const def = (name, minArgs, maxArgs, description, evaluate) => [name, { name, category: "Statistical", description, minArgs, maxArgs, evaluate }];

export const ADVANCED_FORMULA_FUNCTIONS_2 = Object.fromEntries([
  def("F.DIST", 4, 4, "Returns the F probability distribution.", evaluateFDist),
  def("F.DIST.RT", 3, 3, "Returns the right-tailed F probability distribution.", evaluateFDistRt),
  def("F.INV", 3, 3, "Returns the inverse of the F probability distribution.", evaluateFInv),
  def("F.INV.RT", 3, 3, "Returns the inverse of the right-tailed F probability distribution.", evaluateFInvRt),
]);

export default ADVANCED_FORMULA_FUNCTIONS_2;
