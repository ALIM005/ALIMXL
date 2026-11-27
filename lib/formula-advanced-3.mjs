/**
 * ALIMXL Advanced Formula Module 3 (v2)
 *
 * Excel functions: T.DIST, T.DIST.2T, T.DIST.RT, T.INV, T.INV.2T,
 * CHISQ.DIST, CHISQ.DIST.RT, CHISQ.INV, CHISQ.INV.RT
 * Synchronous. All arguments are single numbers.
 *
 * CHISQ.TEST removed from this version: it needs range support,
 * which the registry does not provide yet.
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

function dof(value, fn) {
  const n = Math.trunc(num(value, fn));
  if (n < 1 || n > 1e10) bad();
  return n;
}

// ---------- math core ----------
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

// regularized incomplete gamma: returns [P, Q] (lower and upper)
function gammaPQ(a, x) {
  if (x <= 0) return [0, 1];
  const lead = Math.exp(-x + a * Math.log(x) - logGamma(a));
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 2000; n += 1) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    const p = sum * lead;
    return [p, 1 - p];
  }
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 2000; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  const q = lead * h;
  return [1 - q, q];
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

function betaI(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (front * betaCf(a, b, x)) / a;
  return 1 - (front * betaCf(b, a, 1 - x)) / b;
}

// ---------- Student t ----------
// P(T > |x|) for df
function tTail(absX, df) {
  if (absX === 0) return 0.5;
  return 0.5 * betaI(df / 2, 0.5, df / (df + absX * absX));
}

function tCdf(x, df) {
  const tail = tTail(Math.abs(x), df);
  return x >= 0 ? 1 - tail : tail;
}

function tPdf(x, df) {
  const logC = logGamma((df + 1) / 2) - logGamma(df / 2) - 0.5 * Math.log(df * Math.PI);
  return Math.exp(logC - ((df + 1) / 2) * Math.log(1 + (x * x) / df));
}

// positive x such that P(T > x) = q, with 0 < q < 0.5
function tQuantileTail(q, df) {
  let lo = 0;
  let hi = 1;
  while (tTail(hi, df) > q) { hi *= 2; if (hi > 1e300) bad(); }
  for (let i = 0; i < 300; i += 1) {
    const mid = (lo + hi) / 2;
    if (tTail(mid, df) > q) lo = mid; else hi = mid;
    if (hi - lo <= 1e-15 * Math.max(1, mid)) break;
  }
  return (lo + hi) / 2;
}

// T.DIST(x, deg_freedom, cumulative)
function evaluateTDist(args) {
  checkArgc(args, 3, "T.DIST");
  const x = num(args[0], "T.DIST");
  const df = dof(args[1], "T.DIST");
  const cumulative = bool(args[2], "T.DIST");
  return cumulative ? tCdf(x, df) : tPdf(x, df);
}

// T.DIST.2T(x, deg_freedom)
function evaluateTDist2T(args) {
  checkArgc(args, 2, "T.DIST.2T");
  const x = num(args[0], "T.DIST.2T");
  const df = dof(args[1], "T.DIST.2T");
  if (x < 0) bad();
  return 2 * tTail(x, df);
}

// T.DIST.RT(x, deg_freedom)
function evaluateTDistRT(args) {
  checkArgc(args, 2, "T.DIST.RT");
  const x = num(args[0], "T.DIST.RT");
  const df = dof(args[1], "T.DIST.RT");
  const tail = tTail(Math.abs(x), df);
  return x >= 0 ? tail : 1 - tail;
}

// T.INV(probability, deg_freedom)
function evaluateTInv(args) {
  checkArgc(args, 2, "T.INV");
  const p = num(args[0], "T.INV");
  const df = dof(args[1], "T.INV");
  if (p <= 0 || p >= 1) bad();
  if (p === 0.5) return 0;
  const q = Math.min(p, 1 - p);
  const x = tQuantileTail(q, df);
  return p < 0.5 ? -x : x;
}

// T.INV.2T(probability, deg_freedom)
function evaluateTInv2T(args) {
  checkArgc(args, 2, "T.INV.2T");
  const p = num(args[0], "T.INV.2T");
  const df = dof(args[1], "T.INV.2T");
  if (p <= 0 || p > 1) bad();
  if (p === 1) return 0;
  return tQuantileTail(p / 2, df);
}

// ---------- chi-squared ----------
function chiPdf(x, df) {
  if (x === 0) return df < 2 ? bad() : df === 2 ? 0.5 : 0;
  return Math.exp((df / 2 - 1) * Math.log(x) - x / 2 - (df / 2) * Math.log(2) - logGamma(df / 2));
}

// CHISQ.DIST(x, deg_freedom, cumulative)
function evaluateChiDist(args) {
  checkArgc(args, 3, "CHISQ.DIST");
  const x = num(args[0], "CHISQ.DIST");
  const df = dof(args[1], "CHISQ.DIST");
  const cumulative = bool(args[2], "CHISQ.DIST");
  if (x < 0) bad();
  return cumulative ? gammaPQ(df / 2, x / 2)[0] : chiPdf(x, df);
}

// CHISQ.DIST.RT(x, deg_freedom)
function evaluateChiDistRT(args) {
  checkArgc(args, 2, "CHISQ.DIST.RT");
  const x = num(args[0], "CHISQ.DIST.RT");
  const df = dof(args[1], "CHISQ.DIST.RT");
  if (x < 0) bad();
  return gammaPQ(df / 2, x / 2)[1];
}

// right-tail quantile: x with Q(df/2, x/2) = q
function chiQuantileRight(q, df) {
  let lo = 0;
  let hi = Math.max(1, df);
  while (gammaPQ(df / 2, hi / 2)[1] > q) { hi *= 2; if (hi > 1e300) bad(); }
  for (let i = 0; i < 300; i += 1) {
    const mid = (lo + hi) / 2;
    if (gammaPQ(df / 2, mid / 2)[1] > q) lo = mid; else hi = mid;
    if (hi - lo <= 1e-15 * Math.max(1, mid)) break;
  }
  return (lo + hi) / 2;
}

// left-tail quantile: x with P(df/2, x/2) = p
function chiQuantileLeft(p, df) {
  let lo = 0;
  let hi = Math.max(1, df);
  while (gammaPQ(df / 2, hi / 2)[0] < p) { hi *= 2; if (hi > 1e300) bad(); }
  for (let i = 0; i < 300; i += 1) {
    const mid = (lo + hi) / 2;
    if (gammaPQ(df / 2, mid / 2)[0] < p) lo = mid; else hi = mid;
    if (hi - lo <= 1e-15 * Math.max(1, mid)) break;
  }
  return (lo + hi) / 2;
}

// CHISQ.INV(probability, deg_freedom)
function evaluateChiInv(args) {
  checkArgc(args, 2, "CHISQ.INV");
  const p = num(args[0], "CHISQ.INV");
  const df = dof(args[1], "CHISQ.INV");
  if (p < 0 || p >= 1) bad();
  if (p === 0) return 0;
  return p < 0.5 ? chiQuantileLeft(p, df) : chiQuantileRight(1 - p, df);
}

// CHISQ.INV.RT(probability, deg_freedom)
function evaluateChiInvRT(args) {
  checkArgc(args, 2, "CHISQ.INV.RT");
  const p = num(args[0], "CHISQ.INV.RT");
  const df = dof(args[1], "CHISQ.INV.RT");
  if (p <= 0 || p > 1) bad();
  if (p === 1) return 0;
  return chiQuantileRight(p, df);
}

const def = (name, minArgs, maxArgs, description, evaluate) => [name, { name, category: "Statistical", description, minArgs, maxArgs, evaluate }];

export const ADVANCED_FORMULA_FUNCTIONS_3 = Object.fromEntries([
  def("T.DIST", 3, 3, "Returns the Student t-distribution.", evaluateTDist),
  def("T.DIST.2T", 2, 2, "Returns the two-tailed Student t-distribution.", evaluateTDist2T),
  def("T.DIST.RT", 2, 2, "Returns the right-tailed Student t-distribution.", evaluateTDistRT),
  def("T.INV", 2, 2, "Returns the left-tailed inverse of the Student t-distribution.", evaluateTInv),
  def("T.INV.2T", 2, 2, "Returns the two-tailed inverse of the Student t-distribution.", evaluateTInv2T),
  def("CHISQ.DIST", 3, 3, "Returns the chi-squared distribution.", evaluateChiDist),
  def("CHISQ.DIST.RT", 2, 2, "Returns the right-tailed chi-squared distribution.", evaluateChiDistRT),
  def("CHISQ.INV", 2, 2, "Returns the inverse of the left-tailed chi-squared distribution.", evaluateChiInv),
  def("CHISQ.INV.RT", 2, 2, "Returns the inverse of the right-tailed chi-squared distribution.", evaluateChiInvRT),
]);

export default ADVANCED_FORMULA_FUNCTIONS_3;
