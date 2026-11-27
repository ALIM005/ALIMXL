/**
 * ALIMXL Advanced Formula Module 4 (v2)
 *
 * Excel functions: NORM.DIST, NORM.INV, NORM.S.DIST, NORM.S.INV
 * Synchronous (no async/Promise), as required by formula-core.mjs.
 * STDEV.P / STDEV.S are NOT here: they already exist in batch1-functions.mjs
 * and handle ranges correctly.
 */

const ERROR_VALUE = "#VALUE!";
const ERROR_NUM = "#NUM!";

function requireNumber(value, functionName) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`${functionName}: ${ERROR_VALUE}`);
}

function requireBoolean(value, functionName) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const t = value.trim().toUpperCase();
    if (t === "TRUE") return true;
    if (t === "FALSE") return false;
  }
  throw new Error(`${functionName}: ${ERROR_VALUE}`);
}

function requireProbabilityOpen(value, functionName) {
  const p = requireNumber(value, functionName);
  if (p <= 0 || p >= 1) throw new Error(`${functionName}: ${ERROR_NUM}`);
  return p;
}

function requirePositive(value, functionName) {
  const n = requireNumber(value, functionName);
  if (n <= 0) throw new Error(`${functionName}: ${ERROR_NUM}`);
  return n;
}

const SQRT_PI = Math.sqrt(Math.PI);

// erf for 0 <= x < 3 (all-positive series, numerically stable)
function erfSmall(x) {
  let term = x;
  let sum = x;
  for (let n = 1; n < 200; n += 1) {
    term *= (2 * x * x) / (2 * n + 1);
    sum += term;
    if (term < sum * 1e-17) break;
  }
  return (2 / SQRT_PI) * Math.exp(-x * x) * sum;
}

// erfc for x >= 3 (continued fraction)
function erfcLarge(x) {
  let t = x;
  for (let k = 60; k >= 1; k -= 1) t = x + k / 2 / t;
  return Math.exp(-x * x) / (SQRT_PI * t);
}

// erfc for any x
function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 3) return 1 - erfSmall(x);
  return erfcLarge(x);
}

// standard normal CDF
function stdNormalCdf(z) {
  return 0.5 * erfc(-z / Math.SQRT2);
}

function stdNormalPdf(z) {
  return Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
}

// inverse standard normal CDF (Acklam + one Halley refinement)
function stdNormalInverse(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  let x;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pLow) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = stdNormalCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

// NORM.DIST(x, mean, standard_dev, cumulative)
function evaluateNormDist(args) {
  if (args.length !== 4) throw new Error(`NORM.DIST: ${ERROR_VALUE}`);
  const x = requireNumber(args[0], "NORM.DIST");
  const mean = requireNumber(args[1], "NORM.DIST");
  const sd = requirePositive(args[2], "NORM.DIST");
  const cumulative = requireBoolean(args[3], "NORM.DIST");
  const z = (x - mean) / sd;
  return cumulative ? stdNormalCdf(z) : stdNormalPdf(z) / sd;
}

// NORM.INV(probability, mean, standard_dev)
function evaluateNormInv(args) {
  if (args.length !== 3) throw new Error(`NORM.INV: ${ERROR_VALUE}`);
  const p = requireProbabilityOpen(args[0], "NORM.INV");
  const mean = requireNumber(args[1], "NORM.INV");
  const sd = requirePositive(args[2], "NORM.INV");
  return mean + sd * stdNormalInverse(p);
}

// NORM.S.DIST(z, cumulative)
function evaluateNormSDist(args) {
  if (args.length !== 2) throw new Error(`NORM.S.DIST: ${ERROR_VALUE}`);
  const z = requireNumber(args[0], "NORM.S.DIST");
  const cumulative = requireBoolean(args[1], "NORM.S.DIST");
  return cumulative ? stdNormalCdf(z) : stdNormalPdf(z);
}

// NORM.S.INV(probability)
function evaluateNormSInv(args) {
  if (args.length !== 1) throw new Error(`NORM.S.INV: ${ERROR_VALUE}`);
  const p = requireProbabilityOpen(args[0], "NORM.S.INV");
  return stdNormalInverse(p);
}

export const ADVANCED_FORMULA_FUNCTIONS_4 = {
  "NORM.DIST": { name: "NORM.DIST", category: "Statistical", description: "Returns the normal distribution.", minArgs: 4, maxArgs: 4, evaluate: evaluateNormDist },
  "NORM.INV": { name: "NORM.INV", category: "Statistical", description: "Returns the inverse of the normal cumulative distribution.", minArgs: 3, maxArgs: 3, evaluate: evaluateNormInv },
  "NORM.S.DIST": { name: "NORM.S.DIST", category: "Statistical", description: "Returns the standard normal distribution.", minArgs: 2, maxArgs: 2, evaluate: evaluateNormSDist },
  "NORM.S.INV": { name: "NORM.S.INV", category: "Statistical", description: "Returns the inverse of the standard normal cumulative distribution.", minArgs: 1, maxArgs: 1, evaluate: evaluateNormSInv },
};

export default ADVANCED_FORMULA_FUNCTIONS_4;
