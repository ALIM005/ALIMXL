/**
 * ALIMXL Advanced Formula Module 5 (v2)
 *
 * 10 new Excel functions that were not in the engine:
 * GAMMA, GAMMALN, GAMMALN.PRECISE, GAMMA.DIST, GAMMA.INV,
 * BETA.DIST, BETA.INV, WEIBULL.DIST, LOGNORM.DIST, LOGNORM.INV
 *
 * Synchronous. All arguments are single values (no ranges needed).
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
  throw new Error(`${ERROR_NUM}`);
}

function checkArgc(args, min, max, fn) {
  if (args.length < min || args.length > max) throw new Error(`${fn}: ${ERROR_VALUE}`);
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

function gammaFn(x) {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x));
  return Math.exp(logGamma(x));
}

// regularized lower incomplete gamma P(a, x)
function gammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 1000; n += 1) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

// regularized incomplete beta I_x(a, b)
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

// standard normal CDF via erfc
function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 3) {
    let term = x;
    let sum = x;
    for (let n = 1; n < 200; n += 1) {
      term *= (2 * x * x) / (2 * n + 1);
      sum += term;
      if (term < sum * 1e-17) break;
    }
    return 1 - (2 / Math.sqrt(Math.PI)) * Math.exp(-x * x) * sum;
  }
  let t = x;
  for (let k = 60; k >= 1; k -= 1) t = x + k / 2 / t;
  return Math.exp(-x * x) / (Math.sqrt(Math.PI) * t);
}
const stdCdf = (z) => 0.5 * erfc(-z / Math.SQRT2);

function stdInv(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  let x;
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - 0.02425) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = stdCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

// monotone inverse by bisection on [lo, hi]
function bisect(cdf, p, lo, hi) {
  for (let i = 0; i < 300; i += 1) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid; else hi = mid;
    if (hi - lo <= 1e-15 * Math.max(1, Math.abs(mid))) break;
  }
  return (lo + hi) / 2;
}

// ---------- functions ----------
function fGamma(args) {
  checkArgc(args, 1, 1, "GAMMA");
  const x = num(args[0], "GAMMA");
  if (x <= 0 && Number.isInteger(x)) bad();
  const r = gammaFn(x);
  if (!Number.isFinite(r)) bad();
  return r;
}

function fGammaLn(name) {
  return (args) => {
    checkArgc(args, 1, 1, name);
    const x = num(args[0], name);
    if (x <= 0) bad();
    return logGamma(x);
  };
}

function fGammaDist(args) {
  checkArgc(args, 4, 4, "GAMMA.DIST");
  const x = num(args[0], "GAMMA.DIST");
  const alpha = num(args[1], "GAMMA.DIST");
  const beta = num(args[2], "GAMMA.DIST");
  const cumulative = bool(args[3], "GAMMA.DIST");
  if (x < 0 || alpha <= 0 || beta <= 0) bad();
  if (cumulative) return gammaP(alpha, x / beta);
  if (x === 0) return alpha < 1 ? bad() : alpha === 1 ? 1 / beta : 0;
  return Math.exp((alpha - 1) * Math.log(x) - x / beta - alpha * Math.log(beta) - logGamma(alpha));
}

function fGammaInv(args) {
  checkArgc(args, 3, 3, "GAMMA.INV");
  const p = num(args[0], "GAMMA.INV");
  const alpha = num(args[1], "GAMMA.INV");
  const beta = num(args[2], "GAMMA.INV");
  if (p < 0 || p > 1 || alpha <= 0 || beta <= 0) bad();
  if (p === 0) return 0;
  if (p === 1) bad();
  let hi = Math.max(1, alpha);
  while (gammaP(alpha, hi) < p) { hi *= 2; if (hi > 1e300) bad(); }
  return beta * bisect((x) => gammaP(alpha, x), p, 0, hi);
}

function betaBounds(args, from, fn) {
  const A = args.length > from && args[from] !== undefined ? num(args[from], fn) : 0;
  const B = args.length > from + 1 && args[from + 1] !== undefined ? num(args[from + 1], fn) : 1;
  if (A >= B) bad();
  return [A, B];
}

function fBetaDist(args) {
  checkArgc(args, 4, 6, "BETA.DIST");
  const x = num(args[0], "BETA.DIST");
  const alpha = num(args[1], "BETA.DIST");
  const beta = num(args[2], "BETA.DIST");
  const cumulative = bool(args[3], "BETA.DIST");
  const [A, B] = betaBounds(args, 4, "BETA.DIST");
  if (alpha <= 0 || beta <= 0 || x < A || x > B) bad();
  const t = (x - A) / (B - A);
  if (cumulative) return betaI(alpha, beta, t);
  if (t === 0 || t === 1) {
    const edge = t === 0 ? alpha : beta;
    if (edge < 1) bad();
    if (edge > 1) return 0;
  }
  const logPdf = (alpha - 1) * Math.log(t) + (beta - 1) * Math.log(1 - t) + logGamma(alpha + beta) - logGamma(alpha) - logGamma(beta);
  return Math.exp(logPdf) / (B - A);
}

function fBetaInv(args) {
  checkArgc(args, 3, 5, "BETA.INV");
  const p = num(args[0], "BETA.INV");
  const alpha = num(args[1], "BETA.INV");
  const beta = num(args[2], "BETA.INV");
  const [A, B] = betaBounds(args, 3, "BETA.INV");
  if (p <= 0 || p > 1 || alpha <= 0 || beta <= 0) bad();
  return A + (B - A) * bisect((x) => betaI(alpha, beta, x), p, 0, 1);
}

function fWeibull(args) {
  checkArgc(args, 4, 4, "WEIBULL.DIST");
  const x = num(args[0], "WEIBULL.DIST");
  const alpha = num(args[1], "WEIBULL.DIST");
  const beta = num(args[2], "WEIBULL.DIST");
  const cumulative = bool(args[3], "WEIBULL.DIST");
  if (x < 0 || alpha <= 0 || beta <= 0) bad();
  if (cumulative) return 1 - Math.exp(-Math.pow(x / beta, alpha));
  if (x === 0) return alpha < 1 ? bad() : alpha === 1 ? 1 / beta : 0;
  return (alpha / Math.pow(beta, alpha)) * Math.pow(x, alpha - 1) * Math.exp(-Math.pow(x / beta, alpha));
}

function fLognormDist(args) {
  checkArgc(args, 4, 4, "LOGNORM.DIST");
  const x = num(args[0], "LOGNORM.DIST");
  const mean = num(args[1], "LOGNORM.DIST");
  const sd = num(args[2], "LOGNORM.DIST");
  const cumulative = bool(args[3], "LOGNORM.DIST");
  if (x <= 0 || sd <= 0) bad();
  const z = (Math.log(x) - mean) / sd;
  if (cumulative) return stdCdf(z);
  return Math.exp(-(z * z) / 2) / (x * sd * Math.sqrt(2 * Math.PI));
}

function fLognormInv(args) {
  checkArgc(args, 3, 3, "LOGNORM.INV");
  const p = num(args[0], "LOGNORM.INV");
  const mean = num(args[1], "LOGNORM.INV");
  const sd = num(args[2], "LOGNORM.INV");
  if (p <= 0 || p >= 1 || sd <= 0) bad();
  return Math.exp(mean + sd * stdInv(p));
}

const def = (name, minArgs, maxArgs, description, evaluate) => [name, { name, category: "Statistical", description, minArgs, maxArgs, evaluate }];

export const ADVANCED_FORMULA_FUNCTIONS_5 = Object.fromEntries([
  def("GAMMA", 1, 1, "Returns the gamma function value.", fGamma),
  def("GAMMALN", 1, 1, "Returns the natural logarithm of the gamma function.", fGammaLn("GAMMALN")),
  def("GAMMALN.PRECISE", 1, 1, "Returns the natural logarithm of the gamma function.", fGammaLn("GAMMALN.PRECISE")),
  def("GAMMA.DIST", 4, 4, "Returns the gamma distribution.", fGammaDist),
  def("GAMMA.INV", 3, 3, "Returns the inverse of the gamma cumulative distribution.", fGammaInv),
  def("BETA.DIST", 4, 6, "Returns the beta distribution.", fBetaDist),
  def("BETA.INV", 3, 5, "Returns the inverse of the beta cumulative distribution.", fBetaInv),
  def("WEIBULL.DIST", 4, 4, "Returns the Weibull distribution.", fWeibull),
  def("LOGNORM.DIST", 4, 4, "Returns the lognormal distribution.", fLognormDist),
  def("LOGNORM.INV", 3, 3, "Returns the inverse of the lognormal cumulative distribution.", fLognormInv),
]);

export default ADVANCED_FORMULA_FUNCTIONS_5;
