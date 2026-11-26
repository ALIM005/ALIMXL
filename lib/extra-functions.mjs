// ALIMXL — Extra Engine (Batch 2): ৫৮টি নতুন ফাংশন, একটিই ইঞ্জিন ফাইল ("কর্মচারী")।
// app/page.tsx ("ম্যানেজার") শুধু এই ফাইলকে ডাকে; গণনার লজিক এখানেই থাকে।
//
// স্কেলার ফাংশন (৪৫টি): evalBatch2Function(node, h)  — formula-core.mjs-এর default শাখা থেকে।
// অ্যারে/স্পিল ফাংশন (১৩টি): evaluateExtraSpill(name, args, context) — spill-functions.mjs থেকে।
// চেনা না গেলে স্কেলার ফাংশন undefined ফেরত দেয় (ইঞ্জিন তখন #NAME? দেখায়)।

import { createArrayResult } from "./spill-engine.mjs";

export const EXTRA_SPILL_NAMES = [
  "HSTACK", "VSTACK", "SORTBY", "RANDARRAY", "TAKE", "DROP", "CHOOSECOLS",
  "CHOOSEROWS", "TOCOL", "TOROW", "WRAPROWS", "WRAPCOLS", "EXPAND",
];

export const EXTRA_SCALAR_NAMES = [
  "LET", "ISFORMULA",
  "NORM.DIST", "NORM.S.DIST", "NORM.INV", "NORM.S.INV", "STANDARDIZE", "SKEW", "KURT",
  "MAXA", "MINA", "AVERAGEA", "STDEVA", "VARA", "COVARIANCE.P", "COVARIANCE.S",
  "PERCENTILE.EXC", "QUARTILE.EXC", "PERCENTRANK.EXC", "PERCENTRANK",
  "SINH", "COSH", "TANH", "ASINH", "ACOSH", "ATANH", "SQRTPI", "FACTDOUBLE", "SEC", "CSC", "COT",
  "BITAND", "BITOR", "BITXOR", "BITLSHIFT", "BITRSHIFT", "DELTA", "GESTEP",
  "BIN2DEC", "DEC2BIN", "HEX2DEC", "DEC2HEX", "OCT2DEC", "DEC2OCT",
  "RRI",
];

export const EXTRA_FUNCTION_NAMES = [...EXTRA_SCALAR_NAMES, ...EXTRA_SPILL_NAMES];
const SCALAR_SET = new Set(EXTRA_SCALAR_NAMES);
const SPILL_SET = new Set(EXTRA_SPILL_NAMES);

export const isExtraSpillFunction = (n) => SPILL_SET.has(String(n).toUpperCase());

const ERRORS = new Set(["#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A", "#SPILL!", "#CALC!", "#CIRCULAR!", "#ERROR!"]);
const isErr = (v) => typeof v === "string" && ERRORS.has(v);

function erf(x) {
  const ax = Math.abs(x);
  if (ax < 3) {
    let sum = ax, term = ax;
    for (let n = 1; n < 200; n++) {
      term *= (-ax * ax) / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    const r = (2 / Math.sqrt(Math.PI)) * sum;
    return x < 0 ? -r : r;
  }
  const r = 1 - erfcLarge(ax);
  return x < 0 ? -r : r;
}
function erfcLarge(x) {
  let f = 0;
  for (let k = 60; k >= 1; k--) f = (k / 2) / (x + f);
  return Math.exp(-x * x) / (Math.sqrt(Math.PI) * (x + f));
}
const normCdf = (z) => (z < -8 ? 0 : z > 8 ? 1 : z < 0 ? 0.5 * (1 - erf(-z / Math.SQRT2)) : 0.5 * (1 + erf(z / Math.SQRT2)));
const normPdf = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

function normSInv(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  let x;
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p > 1 - 0.02425) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else {
    const q = p - 0.5, r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  for (let i = 0; i < 3; i++) {
    const e = normCdf(x) - p;
    const u = e / normPdf(x);
    x = x - u / (1 + (x * u) / 2);
  }
  return x;
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sumSq = (a) => { const m = mean(a); return a.reduce((s, x) => s + (x - m) * (x - m), 0); };

const BASES = {
  BIN: { radix: 2, digits: 10, re: /^[01]+$/ },
  OCT: { radix: 8, digits: 10, re: /^[0-7]+$/ },
  HEX: { radix: 16, digits: 10, re: /^[0-9a-fA-F]+$/ },
};
function baseToDec(text, kind) {
  const { radix, digits, re } = BASES[kind];
  const s = String(text).trim();
  if (s === "") return 0;
  if (s.length > digits || !re.test(s)) return "#NUM!";
  let v = 0n;
  for (const ch of s) v = v * BigInt(radix) + BigInt(parseInt(ch, radix));
  const bits = BigInt(digits * Math.log2(radix));
  const full = 1n << bits;
  if (s.length === digits && v >= full >> 1n) v -= full;
  return Number(v);
}
function decToBase(n, kind, places) {
  const { radix, digits } = BASES[kind];
  const bits = BigInt(digits * Math.log2(radix));
  const full = 1n << bits;
  const half = full >> 1n;
  const x = BigInt(Math.trunc(n));
  if (x < -half || x >= half) return "#NUM!";
  if (x < 0n) return (x + full).toString(radix).toUpperCase();
  let s = x.toString(radix).toUpperCase();
  if (places !== undefined) {
    if (places < 1 || places > 10 || s.length > places) return "#NUM!";
    s = s.padStart(places, "0");
  }
  return s;
}

export function evalBatch2Function(node, h) {
  const name = node.name;
  if (!SCALAR_SET.has(name)) return undefined;
  const { args, ev, numArg, readGrid, getCell, ctx, evalFn, expandRange } = h;
  const { cleanNumber, strictNumber } = h;
  const argc = args.length;
  const bad = "#VALUE!";
  const isRef = (a) => a && (a.kind === "range" || a.kind === "ref");
  const finite = (n, err = "#NUM!") => (Number.isFinite(n) ? cleanNumber(n) : err);

  function nums(argNodes) {
    const out = [];
    for (const a of argNodes) {
      if (isRef(a)) {
        const g = readGrid(a, getCell, ctx);
        if (!g) return bad;
        if (g.error) return g.error;
        for (const row of g.rows) for (const v of row) {
          if (isErr(v)) return v;
          if (typeof v === "number" && Number.isFinite(v)) out.push(v);
        }
      } else {
        const v = evalFn(a, getCell, expandRange);
        if (isErr(v)) return v;
        if (typeof v === "number") out.push(v);
        else if (typeof v === "boolean") out.push(v ? 1 : 0);
        else { const n = typeof v === "string" ? strictNumber(v) : null; if (n === null) return bad; out.push(n); }
      }
    }
    return out;
  }
  function numsA(argNodes) {
    const out = [];
    for (const a of argNodes) {
      if (isRef(a)) {
        const g = readGrid(a, getCell, ctx);
        if (!g) return bad;
        if (g.error) return g.error;
        for (const row of g.rows) for (const v of row) {
          if (isErr(v)) return v;
          if (v === "" || v === null || v === undefined) continue;
          if (typeof v === "number") out.push(v);
          else if (typeof v === "boolean") out.push(v ? 1 : 0);
          else out.push(0);
        }
      } else {
        const v = evalFn(a, getCell, expandRange);
        if (isErr(v)) return v;
        if (typeof v === "number") out.push(v);
        else if (typeof v === "boolean") out.push(v ? 1 : 0);
        else { const n = typeof v === "string" ? strictNumber(v) : null; if (n === null) return bad; out.push(n); }
      }
    }
    return out;
  }
  const numsFrom = (i) => {
    if (!isRef(args[i])) { const v = ev(i); if (isErr(v)) return v; return typeof v === "number" ? [v] : bad; }
    return nums([args[i]]);
  };
  const need = (lo, hi = lo) => argc >= lo && argc <= hi;
  const N = (i) => numArg(i);

  switch (name) {
    case "LET": {
      if (argc < 3 || argc % 2 === 0) return bad;
      const subst = (n, scope) => {
        if (!n || typeof n !== "object") return n;
        if (Array.isArray(n)) return n.map((x) => subst(x, scope));
        if (n.kind === "call" && Array.isArray(n.args) && n.args.length === 0 && scope.has(n.name)) return scope.get(n.name);
        const out = {};
        for (const k of Object.keys(n)) out[k] = subst(n[k], scope);
        return out;
      };
      const literal = (v, original) => {
        if (original && (original.kind === "ref" || original.kind === "range")) return original;
        if (typeof v === "number") return { kind: "num", value: v };
        if (typeof v === "boolean") return { kind: "call", name: v ? "TRUE" : "FALSE", args: [] };
        return { kind: "str", value: String(v ?? "") };
      };
      const scope = new Map();
      for (let i = 0; i < argc - 1; i += 2) {
        const nm = args[i];
        if (!nm || nm.kind !== "call" || nm.args.length !== 0) return bad;
        const valueNode = subst(args[i + 1], scope);
        const v = isRef(valueNode) ? null : evalFn(valueNode, getCell, expandRange);
        if (isErr(v)) return v;
        scope.set(nm.name, literal(v, valueNode));
      }
      return evalFn(subst(args[argc - 1], scope), getCell, expandRange);
    }
    case "ISFORMULA": {
      if (argc !== 1) return bad;
      if (!isRef(args[0])) return bad;
      const raw = String(args[0].value);
      const bang = raw.lastIndexOf("!");
      const sheetName = bang >= 0 ? raw.slice(0, bang).replace(/^'|'$/g, "") : "";
      const cellKey = raw.slice(bang + 1).split(":")[0].replace(/\$/g, "").toUpperCase();
      let sheet = ctx?.sheet ?? null;
      if (sheetName && ctx?.allSheets) sheet = ctx.allSheets.find((s) => String(s.name).toLowerCase() === sheetName.toLowerCase()) ?? null;
      if (!sheet?.cells) return false;
      const cell = sheet.cells[cellKey];
      const rawVal = cell && typeof cell === "object" ? cell.value : cell;
      return typeof rawVal === "string" && rawVal.trim().startsWith("=") && rawVal.trim().length > 1;
    }
    case "NORM.DIST": {
      if (argc !== 4) return bad;
      const x = N(0); if (typeof x === "string") return x;
      const m = N(1); if (typeof m === "string") return m;
      const sd = N(2); if (typeof sd === "string") return sd;
      const cum = ev(3); if (isErr(cum)) return cum;
      if (sd <= 0) return "#NUM!";
      const z = (x - m) / sd;
      const isCum = typeof cum === "boolean" ? cum : Number(cum) !== 0;
      return finite(isCum ? normCdf(z) : normPdf(z) / sd);
    }
    case "NORM.S.DIST": {
      if (argc !== 2) return bad;
      const z = N(0); if (typeof z === "string") return z;
      const cum = ev(1); if (isErr(cum)) return cum;
      const isCum = typeof cum === "boolean" ? cum : Number(cum) !== 0;
      return finite(isCum ? normCdf(z) : normPdf(z));
    }
    case "NORM.INV": {
      if (argc !== 3) return bad;
      const p = N(0); if (typeof p === "string") return p;
      const m = N(1); if (typeof m === "string") return m;
      const sd = N(2); if (typeof sd === "string") return sd;
      if (p <= 0 || p >= 1 || sd <= 0) return "#NUM!";
      return finite(m + sd * normSInv(p));
    }
    case "NORM.S.INV": {
      if (argc !== 1) return bad;
      const p = N(0); if (typeof p === "string") return p;
      if (p <= 0 || p >= 1) return "#NUM!";
      return finite(normSInv(p));
    }
    case "STANDARDIZE": {
      if (argc !== 3) return bad;
      const x = N(0); if (typeof x === "string") return x;
      const m = N(1); if (typeof m === "string") return m;
      const sd = N(2); if (typeof sd === "string") return sd;
      if (sd <= 0) return "#NUM!";
      return finite((x - m) / sd);
    }
    case "SKEW":
    case "KURT": {
      if (argc < 1) return bad;
      const a = nums(args); if (typeof a === "string") return a;
      const n = a.length;
      const isSkew = name === "SKEW";
      if (n < (isSkew ? 3 : 4)) return "#DIV/0!";
      const s = Math.sqrt(sumSq(a) / (n - 1));
      if (s === 0) return "#DIV/0!";
      const m = mean(a);
      if (isSkew) { const sk = (n / ((n - 1) * (n - 2))) * a.reduce((t, x) => t + Math.pow((x - m) / s, 3), 0); return Math.abs(sk) < 1e-12 ? 0 : finite(sk); }
      const f = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
      return finite(f * a.reduce((t, x) => t + Math.pow((x - m) / s, 4), 0) - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3)));
    }
    case "MAXA":
    case "MINA": {
      if (argc < 1) return bad;
      const a = numsA(args); if (typeof a === "string") return a;
      if (a.length === 0) return 0;
      return name === "MAXA" ? Math.max(...a) : Math.min(...a);
    }
    case "AVERAGEA": {
      if (argc < 1) return bad;
      const a = numsA(args); if (typeof a === "string") return a;
      if (a.length === 0) return "#DIV/0!";
      return finite(mean(a));
    }
    case "STDEVA":
    case "VARA": {
      if (argc < 1) return bad;
      const a = numsA(args); if (typeof a === "string") return a;
      if (a.length < 2) return "#DIV/0!";
      const v = sumSq(a) / (a.length - 1);
      return finite(name === "STDEVA" ? Math.sqrt(v) : v);
    }
    case "COVARIANCE.P":
    case "COVARIANCE.S": {
      if (argc !== 2) return bad;
      const x = numsFrom(0); if (typeof x === "string") return x;
      const y = numsFrom(1); if (typeof y === "string") return y;
      if (x.length !== y.length) return "#N/A";
      const n = x.length;
      const sample = name === "COVARIANCE.S";
      if (n < (sample ? 2 : 1)) return "#DIV/0!";
      const mx = mean(x), my = mean(y);
      let s = 0;
      for (let i = 0; i < n; i++) s += (x[i] - mx) * (y[i] - my);
      return finite(s / (sample ? n - 1 : n));
    }
    case "PERCENTILE.EXC":
    case "QUARTILE.EXC": {
      if (argc !== 2) return bad;
      const a = numsFrom(0); if (typeof a === "string") return a;
      let k = N(1); if (typeof k === "string") return k;
      if (name === "QUARTILE.EXC") {
        k = Math.trunc(k);
        if (k < 1 || k > 3) return "#NUM!";
        k = k / 4;
      }
      const n = a.length;
      if (n === 0) return "#NUM!";
      if (k < 1 / (n + 1) - 1e-12 || k > n / (n + 1) + 1e-12) return "#NUM!";
      const s = a.slice().sort((p, q) => p - q);
      const pos = k * (n + 1);
      const lo = Math.floor(pos + 1e-12);
      const frac = pos - lo;
      if (lo < 1) return s[0];
      if (lo >= n) return s[n - 1];
      return finite(s[lo - 1] + frac * (s[lo] - s[lo - 1]));
    }
    case "PERCENTRANK":
    case "PERCENTRANK.EXC": {
      if (argc < 2 || argc > 3) return bad;
      const a = numsFrom(0); if (typeof a === "string") return a;
      const x = N(1); if (typeof x === "string") return x;
      let sig = 3;
      if (args[2]) { const s = N(2); if (typeof s === "string") return s; sig = Math.trunc(s); }
      if (sig < 1) return "#NUM!";
      const n = a.length;
      if (n === 0) return "#NUM!";
      const s = a.slice().sort((p, q) => p - q);
      if (x < s[0] || x > s[n - 1]) return "#N/A";
      const exc = name === "PERCENTRANK.EXC";
      let r;
      const idx = s.indexOf(x);
      if (!exc) {
        if (n === 1) r = 1;
        else if (idx >= 0) r = idx / (n - 1);
        else { let i = 0; while (s[i + 1] < x) i++; r = (i + (x - s[i]) / (s[i + 1] - s[i])) / (n - 1); }
      } else if (idx >= 0) r = (idx + 1) / (n + 1);
      else { let i = 0; while (s[i + 1] < x) i++; r = (i + 1 + (x - s[i]) / (s[i + 1] - s[i])) / (n + 1); }
      const f = Math.pow(10, sig);
      return cleanNumber(Math.floor(r * f + 1e-9) / f);
    }
    case "SINH": case "COSH": case "TANH": case "ASINH": case "ACOSH": case "ATANH":
    case "SQRTPI": case "SEC": case "CSC": case "COT": {
      if (argc !== 1) return bad;
      const x = N(0); if (typeof x === "string") return x;
      switch (name) {
        case "SINH": return finite(Math.sinh(x), "#NUM!");
        case "COSH": return finite(Math.cosh(x), "#NUM!");
        case "TANH": return finite(Math.tanh(x));
        case "ASINH": return finite(Math.asinh(x));
        case "ACOSH": return x < 1 ? "#NUM!" : finite(Math.acosh(x));
        case "ATANH": return Math.abs(x) >= 1 ? "#NUM!" : finite(Math.atanh(x));
        case "SQRTPI": return x < 0 ? "#NUM!" : finite(Math.sqrt(x * Math.PI));
        case "SEC": return finite(1 / Math.cos(x));
        case "CSC": return x === 0 ? "#DIV/0!" : finite(1 / Math.sin(x));
        default: return x === 0 ? "#DIV/0!" : finite(1 / Math.tan(x));
      }
    }
    case "FACTDOUBLE": {
      if (argc !== 1) return bad;
      const x = N(0); if (typeof x === "string") return x;
      const n = Math.trunc(x);
      if (n < -1) return "#NUM!";
      let r = 1;
      for (let i = n; i > 1; i -= 2) r *= i;
      return finite(r);
    }
    case "BITAND": case "BITOR": case "BITXOR": {
      if (argc !== 2) return bad;
      const a = N(0); if (typeof a === "string") return a;
      const b = N(1); if (typeof b === "string") return b;
      const lim = 2 ** 48;
      if (a < 0 || b < 0 || a !== Math.trunc(a) || b !== Math.trunc(b) || a >= lim || b >= lim) return "#NUM!";
      const A = BigInt(a), B = BigInt(b);
      return Number(name === "BITAND" ? A & B : name === "BITOR" ? A | B : A ^ B);
    }
    case "BITLSHIFT": case "BITRSHIFT": {
      if (argc !== 2) return bad;
      const a = N(0); if (typeof a === "string") return a;
      const s = N(1); if (typeof s === "string") return s;
      if (a < 0 || a !== Math.trunc(a) || a >= 2 ** 48 || Math.abs(Math.trunc(s)) > 53) return "#NUM!";
      let sh = BigInt(Math.trunc(s));
      if (name === "BITRSHIFT") sh = -sh;
      const A = BigInt(a);
      const r = sh >= 0n ? A << sh : A >> -sh;
      if (r >= 1n << 48n) return "#NUM!";
      return Number(r);
    }
    case "DELTA": {
      if (!need(1, 2)) return bad;
      const a = N(0); if (typeof a === "string") return a;
      let b = 0;
      if (args[1]) { b = N(1); if (typeof b === "string") return b; }
      return a === b ? 1 : 0;
    }
    case "GESTEP": {
      if (!need(1, 2)) return bad;
      const a = N(0); if (typeof a === "string") return a;
      let b = 0;
      if (args[1]) { b = N(1); if (typeof b === "string") return b; }
      return a >= b ? 1 : 0;
    }
    case "BIN2DEC": case "OCT2DEC": case "HEX2DEC": {
      if (argc !== 1) return bad;
      const v = ev(0); if (isErr(v)) return v;
      if (typeof v === "boolean") return bad;
      return baseToDec(typeof v === "number" ? String(v) : v, name.slice(0, 3));
    }
    case "DEC2BIN": case "DEC2OCT": case "DEC2HEX": {
      if (!need(1, 2)) return bad;
      const x = N(0); if (typeof x === "string") return x;
      let places;
      if (args[1]) { const p = N(1); if (typeof p === "string") return p; places = Math.trunc(p); }
      return decToBase(x, name.slice(4), places);
    }
    case "RRI": {
      if (argc !== 3) return bad;
      const n = N(0); if (typeof n === "string") return n;
      const pv = N(1); if (typeof pv === "string") return pv;
      const fv = N(2); if (typeof fv === "string") return fv;
      if (n <= 0 || pv === 0) return "#NUM!";
      const ratio = fv / pv;
      if (ratio < 0) return "#NUM!";
      return finite(Math.pow(ratio, 1 / n) - 1);
    }
    default:
      return undefined;
  }
}

const MAX_CELLS = 1_000_000;
const NA = "#N/A";

function toGrid(g) {
  const rows = Array.isArray(g) ? g : g?.rows ?? g?.values;
  if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(rows[0]) || rows[0].length === 0) return null;
  const w = rows[0].length;
  for (const r of rows) if (!Array.isArray(r) || r.length !== w) return null;
  return rows.map((r) => r.slice());
}
const toNum = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v !== "string") return null;
  const n = Number(v.trim());
  return Number.isFinite(n) ? n : null;
};
const toInt = (v, def = NaN) => { const n = toNum(v); return n === null ? def : Math.trunc(n); };
const toBool = (v, def = false) => (typeof v === "boolean" ? v : (() => { const n = toNum(v); return n === null ? def : n !== 0; })());
const wrap = (rows) => {
  if (rows.length === 0 || rows[0].length === 0) return "#CALC!";
  if (rows.length * rows[0].length > MAX_CELLS) return "#NUM!";
  return createArrayResult(rows);
};
const rank = (v) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : typeof v === "boolean" ? 2 : 3);
function cmp(a, b) {
  const ra = a === "" || a == null ? 4 : rank(a), rb = b === "" || b == null ? 4 : rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return a - b;
  if (ra === 1) { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  if (ra === 2) return Number(a) - Number(b);
  return 0;
}
const pick = (i, len) => (i > 0 && i <= len ? i - 1 : i < 0 && -i <= len ? len + i : -1);
const RAND_CACHE = new Map();
export function bumpRandArrayEpoch() { RAND_CACHE.clear(); }
export function evaluateExtraSpill(fn, args, context) {
  if (!SPILL_SET.has(fn)) return null;
  if (!Array.isArray(args) || !context) return "#VALUE!";
  const { getGrid, getValue } = context;
  const has = (i) => i < args.length && args[i] !== undefined && args[i] !== null && args[i] !== "";
  const grid = (i) => toGrid(getGrid(args[i]));
  const val = (i) => getValue(args[i]);
  const firstErr = (...vs) => vs.find(isErr);

  switch (fn) {
    case "HSTACK":
    case "VSTACK": {
      if (args.length < 1) return "#VALUE!";
      const gs = [];
      for (let i = 0; i < args.length; i++) {
        const g = grid(i); if (!g) return "#VALUE!";
        gs.push(g);
      }
      if (fn === "HSTACK") {
        const h = Math.max(...gs.map((g) => g.length));
        const out = Array.from({ length: h }, (_, r) => gs.flatMap((g) => (r < g.length ? g[r] : Array(g[0].length).fill(NA))));
        return wrap(out);
      }
      const w = Math.max(...gs.map((g) => g[0].length));
      const out = gs.flatMap((g) => g.map((row) => row.concat(Array(w - row.length).fill(NA))));
      return wrap(out);
    }
    case "SORTBY": {
      if (args.length < 2) return "#VALUE!";
      const g = grid(0); if (!g) return "#VALUE!";
      const keys = [];
      for (let i = 1; i < args.length; i += 2) {
        const by = grid(i); if (!by) return "#VALUE!";
        const ord = has(i + 1) ? toInt(val(i + 1), NaN) : 1;
        if (ord !== 1 && ord !== -1) return "#VALUE!";
        keys.push({ by, ord });
      }
      const rowsN = g.length, colsN = g[0].length;
      const vertical = keys.every((k) => k.by.length === rowsN && k.by[0].length === 1);
      const horizontal = keys.every((k) => k.by.length === 1 && k.by[0].length === colsN);
      if (!vertical && !horizontal) return "#VALUE!";
      const n = vertical ? rowsN : colsN;
      const idx = Array.from({ length: n }, (_, i) => i);
      const kv = (k, i) => (vertical ? k.by[i][0] : k.by[0][i]);
      for (const k of keys) for (let i = 0; i < n; i++) if (isErr(kv(k, i))) return kv(k, i);
      idx.sort((p, q) => { for (const k of keys) { const c = cmp(kv(k, p), kv(k, q)) * k.ord; if (c) return c; } return p - q; });
      return wrap(vertical ? idx.map((i) => g[i].slice()) : g.map((row) => idx.map((i) => row[i])));
    }
    case "RANDARRAY": {
      const r = has(0) ? toInt(val(0), NaN) : 1;
      const c = has(1) ? toInt(val(1), NaN) : 1;
      const lo = has(2) ? toNum(val(2)) : 0;
      const hi = has(3) ? toNum(val(3)) : 1;
      const whole = has(4) ? toBool(val(4)) : false;
      const e = firstErr(...[0, 1, 2, 3].filter(has).map(val)); if (e) return e;
      if (![r, c, lo, hi].every(Number.isFinite) || r < 1 || c < 1) return "#VALUE!";
      if (lo > hi) return "#VALUE!";
      if (r * c > MAX_CELLS) return "#NUM!";
      if (whole && (lo !== Math.trunc(lo) || hi !== Math.trunc(hi))) return "#VALUE!";
      const key = `${context.anchorKey ?? ""}|${r}|${c}|${lo}|${hi}|${whole}`;
      let out = RAND_CACHE.get(key);
      if (!out) {
        out = Array.from({ length: r }, () => Array.from({ length: c }, () =>
          whole ? lo + Math.floor(Math.random() * (hi - lo + 1)) : lo + Math.random() * (hi - lo)));
        if (RAND_CACHE.size >= 200) RAND_CACHE.delete(RAND_CACHE.keys().next().value);
        RAND_CACHE.set(key, out);
      }
      return wrap(out);
    }
    case "TAKE":
    case "DROP": {
      if (!has(0) || (!has(1) && !has(2))) return "#VALUE!";
      const g = grid(0); if (!g) return "#VALUE!";
      const R = g.length, C = g[0].length;
      const rr = has(1) ? toInt(val(1), NaN) : null;
      const cc = has(2) ? toInt(val(2), NaN) : null;
      if ((rr !== null && !Number.isFinite(rr)) || (cc !== null && !Number.isFinite(cc))) return "#VALUE!";
      let r0 = 0, r1 = R, c0 = 0, c1 = C;
      const apply = (n, len) => {
        if (fn === "TAKE") return n >= 0 ? [0, Math.min(n, len)] : [Math.max(len + n, 0), len];
        return n >= 0 ? [Math.min(n, len), len] : [0, Math.max(len + n, 0)];
      };
      if (rr !== null) { if (fn === "TAKE" && rr === 0) return "#VALUE!";[r0, r1] = apply(rr, R); }
      if (cc !== null) { if (fn === "TAKE" && cc === 0) return "#VALUE!";[c0, c1] = apply(cc, C); }
      return wrap(g.slice(r0, r1).map((row) => row.slice(c0, c1)));
    }
    case "CHOOSECOLS":
    case "CHOOSEROWS": {
      if (args.length < 2) return "#VALUE!";
      const g = grid(0); if (!g) return "#VALUE!";
      const idxs = [];
      for (let i = 1; i < args.length; i++) {
        const v = val(i);
        if (isErr(v)) return v;
        const n = toInt(v, NaN);
        if (!Number.isFinite(n) || n === 0) return "#VALUE!";
        idxs.push(n);
      }
      if (fn === "CHOOSECOLS") {
        const cols = idxs.map((n) => pick(n, g[0].length));
        if (cols.some((c) => c < 0)) return "#VALUE!";
        return wrap(g.map((row) => cols.map((c) => row[c])));
      }
      const rows = idxs.map((n) => pick(n, g.length));
      if (rows.some((r) => r < 0)) return "#VALUE!";
      return wrap(rows.map((r) => g[r].slice()));
    }
    case "TOCOL":
    case "TOROW": {
      if (!has(0)) return "#VALUE!";
      const g = grid(0); if (!g) return "#VALUE!";
      const ignore = has(1) ? toInt(val(1), NaN) : 0;
      const byCol = has(2) ? toBool(val(2)) : false;
      if (![0, 1, 2, 3].includes(ignore)) return "#VALUE!";
      const flat = [];
      const R = g.length, C = g[0].length;
      if (byCol) { for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) flat.push(g[r][c]); }
      else for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) flat.push(g[r][c]);
      const kept = flat.filter((v) => !((ignore === 1 || ignore === 3) && (v === "" || v == null)) && !((ignore === 2 || ignore === 3) && isErr(v)));
      if (kept.length === 0) return "#CALC!";
      return wrap(fn === "TOCOL" ? kept.map((v) => [v]) : [kept]);
    }
    case "WRAPROWS":
    case "WRAPCOLS": {
      if (!has(0) || !has(1)) return "#VALUE!";
      const g = grid(0); if (!g) return "#VALUE!";
      if (g.length !== 1 && g[0].length !== 1) return "#VALUE!";
      const flat = g.length === 1 ? g[0] : g.map((r) => r[0]);
      const k = toInt(val(1), NaN);
      if (!Number.isFinite(k) || k < 1) return "#NUM!";
      const pad = has(2) ? val(2) : NA;
      const chunks = [];
      for (let i = 0; i < flat.length; i += k) {
        const part = flat.slice(i, i + k);
        while (part.length < k) part.push(pad);
        chunks.push(part);
      }
      if (fn === "WRAPROWS") return wrap(chunks);
      return wrap(Array.from({ length: k }, (_, r) => chunks.map((ch) => ch[r])));
    }
    case "EXPAND": {
      if (!has(0) || !has(1)) return "#VALUE!";
      const g = grid(0); if (!g) return "#VALUE!";
      const R = toInt(val(1), NaN);
      const C = has(2) ? toInt(val(2), NaN) : g[0].length;
      const pad = has(3) ? val(3) : NA;
      if (!Number.isFinite(R) || !Number.isFinite(C)) return "#VALUE!";
      if (R < g.length || C < g[0].length) return "#VALUE!";
      if (R * C > MAX_CELLS) return "#NUM!";
      return wrap(Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => (r < g.length && c < g[0].length ? g[r][c] : pad))));
    }
    default:
      return null;
  }
}
