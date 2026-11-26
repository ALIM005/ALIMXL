// ALIMXL — Extra Engine (Batch 3): ৫০টি নতুন স্কেলার ফাংশন, একটিই ফাইল।
// formula-core.mjs-এর default শাখা থেকে ডাকা হয়: evalBatch3Function(node, helpers)
// চেনা না গেলে undefined ফেরত দেয় (ইঞ্জিন তখন #NAME? দেখায়)।
// এই ফাইল অন্য কোনো ফাইল import করে না; তাই বিদ্যমান ফাইলের সঙ্গে সংঘাতের ঝুঁকি নেই।

export const BATCH3_NAMES = [
  // গণিত (১৬)
  "SUMX2MY2", "SUMX2PY2", "SUMXMY2", "SERIESSUM", "MULTINOMIAL", "COMBINA", "PERMUTATIONA",
  "ROMAN", "ARABIC", "BASE", "DECIMAL", "COTH", "CSCH", "SECH", "ACOT", "ACOTH",
  // পরিসংখ্যান (১৩)
  "AVEDEV", "HARMEAN", "TRIMMEAN", "FISHER", "FISHERINV", "PEARSON", "STEYX", "GAUSS", "PHI",
  "BINOM.DIST", "POISSON.DIST", "EXPON.DIST", "CONFIDENCE.NORM",
  // আর্থিক (৫)
  "PDURATION", "FVSCHEDULE", "ISPMT", "DOLLARDE", "DOLLARFR",
  // ইঞ্জিনিয়ারিং (১০)
  "ERF", "ERFC", "ERF.PRECISE", "ERFC.PRECISE",
  "BIN2OCT", "BIN2HEX", "OCT2BIN", "OCT2HEX", "HEX2BIN", "HEX2OCT",
  // তথ্য ও টেক্সট (৬)
  "ISREF", "ERROR.TYPE", "FORMULATEXT", "ARRAYTOTEXT", "VALUETOTEXT", "SHEETS",
];
const NAME_SET = new Set(BATCH3_NAMES);

const ERRORS = new Set(["#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A", "#SPILL!", "#CALC!", "#CIRCULAR!", "#ERROR!"]);
const isErr = (v) => typeof v === "string" && ERRORS.has(v);
const MAX_LOOP = 5_000_000;

// ---------- গাণিতিক সাহায্যকারী ----------
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
const erfc = (x) => (x >= 3 ? erfcLarge(x) : 1 - erf(x));
const normCdf = (z) => (z < -8 ? 0 : z > 8 ? 1 : z < 0 ? 0.5 * erfc(-z / Math.SQRT2) : 0.5 * (1 + erf(z / Math.SQRT2)));
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

const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgamma(1 - z);
  z -= 1;
  let x = LANCZOS[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
const LF = [0, 0];
function lfact(n) {
  if (n < 1024) { while (LF.length <= n) LF.push(LF[LF.length - 1] + Math.log(LF.length)); return LF[n]; }
  return lgamma(n + 1);
}

// সঠিক পূর্ণসংখ্যা C(n, k) — BigInt দিয়ে
function bigComb(n, k) {
  if (k < 0 || k > n) return 0n;
  if (k > n - k) k = n - k;
  let r = 1n;
  for (let i = 1; i <= k; i++) r = (r * BigInt(n - k + i)) / BigInt(i);
  return r;
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

// ---------- ভিত্তি রূপান্তর ----------
const BASES = {
  BIN: { radix: 2, digits: 10, bits: 10n, re: /^[01]+$/ },
  OCT: { radix: 8, digits: 10, bits: 30n, re: /^[0-7]+$/ },
  HEX: { radix: 16, digits: 10, bits: 40n, re: /^[0-9a-fA-F]+$/ },
};
function parseBase(text, kind) {
  const { radix, digits, bits, re } = BASES[kind];
  const s = String(text).trim();
  if (s === "") return 0n;
  if (s.length > digits || !re.test(s)) return null;
  let v = 0n;
  for (const ch of s) v = v * BigInt(radix) + BigInt(parseInt(ch, radix));
  const full = 1n << bits;
  if (s.length === digits && v >= full >> 1n) v -= full;
  return v;
}
function formatBase(x, kind, places) {
  const { radix, bits } = BASES[kind];
  const full = 1n << bits;
  const half = full >> 1n;
  if (x < -half || x >= half) return "#NUM!";
  if (x < 0n) return (x + full).toString(radix).toUpperCase();
  let s = x.toString(radix).toUpperCase();
  if (places !== undefined) {
    if (places < 1 || places > 10 || s.length > places) return "#NUM!";
    s = s.padStart(places, "0");
  }
  return s;
}

// ---------- রোমান সংখ্যা ----------
const ROMAN_TABLE = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const ROMAN_VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const ERROR_CODES = { "#NULL!": 1, "#DIV/0!": 2, "#VALUE!": 3, "#REF!": 4, "#NAME?": 5, "#NUM!": 6, "#N/A": 7, "#SPILL!": 9, "#CALC!": 14 };

export function evalBatch3Function(node, h) {
  const name = node.name;
  if (!NAME_SET.has(name)) return undefined;
  const { args, ev, numArg, readGrid, getCell, ctx, evalFn, expandRange, cleanNumber, strictNumber } = h;
  const argc = args.length;
  const bad = "#VALUE!";
  const isRef = (a) => a && (a.kind === "range" || a.kind === "ref");
  const finite = (n, err = "#NUM!") => (Number.isFinite(n) ? cleanNumber(n) : err);
  const N = (i) => numArg(i);
  const need = (lo, hi = lo) => argc >= lo && argc <= hi;

  // রেফারেন্স থেকে মান-তালিকা (সারি-ক্রমে), না হলে একক মান
  function rawCells(a) {
    if (isRef(a)) {
      const g = readGrid(a, getCell, ctx);
      if (!g) return bad;
      if (g.error) return g.error;
      return g.rows.flat();
    }
    const v = evalFn(a, getCell, expandRange);
    return [v];
  }
  // শুধু সংখ্যা (রেফারেন্সে টেক্সট বাদ; সরাসরি আর্গুমেন্টে টেক্সট-সংখ্যা গ্রহণযোগ্য)
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
  // দুই অ্যারের সংখ্যা-জোড়া; দৈর্ঘ্য আলাদা হলে #N/A
  function pairs(i, j) {
    const A = rawCells(args[i]); if (typeof A === "string") return A;
    const B = rawCells(args[j]); if (typeof B === "string") return B;
    if (A.length !== B.length) return "#N/A";
    const xs = [], ys = [];
    for (let k = 0; k < A.length; k++) {
      if (isErr(A[k])) return A[k];
      if (isErr(B[k])) return B[k];
      if (typeof A[k] === "number" && typeof B[k] === "number" && Number.isFinite(A[k]) && Number.isFinite(B[k])) { xs.push(A[k]); ys.push(B[k]); }
    }
    return { xs, ys };
  }
  function boolArg(i) {
    if (!args[i]) return false;
    const v = ev(i);
    if (isErr(v)) return v;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const n = typeof v === "string" ? strictNumber(v) : null;
    if (n === null) return bad;
    return n !== 0;
  }
  function formulaCell() {
    const raw = String(args[0].value);
    const bang = raw.lastIndexOf("!");
    const sheetName = bang >= 0 ? raw.slice(0, bang).replace(/^'|'$/g, "") : "";
    const cellKey = raw.slice(bang + 1).split(":")[0].replace(/\$/g, "").toUpperCase();
    let sheet = ctx?.sheet ?? null;
    if (sheetName && ctx?.allSheets) sheet = ctx.allSheets.find((s) => String(s.name).toLowerCase() === sheetName.toLowerCase()) ?? null;
    const cell = sheet?.cells?.[cellKey];
    const rawVal = cell && typeof cell === "object" ? cell.value : cell;
    return typeof rawVal === "string" && rawVal.trim().length > 1 && rawVal.trim().startsWith("=") ? rawVal.trim() : null;
  }
  const textOf = (v, strict) => {
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    if (typeof v === "number") return String(cleanNumber(v));
    if (isErr(v)) return v;
    const s = String(v ?? "");
    return strict && s !== "" ? `"${s.replace(/"/g, '""')}"` : s;
  };

  switch (name) {
    // ================= গণিত =================
    case "SUMX2MY2": case "SUMX2PY2": case "SUMXMY2": {
      if (argc !== 2) return bad;
      const p = pairs(0, 1); if (typeof p === "string") return p;
      if (p.xs.length === 0) return "#DIV/0!";
      let s = 0;
      for (let k = 0; k < p.xs.length; k++) {
        const x = p.xs[k], y = p.ys[k];
        s += name === "SUMX2MY2" ? x * x - y * y : name === "SUMX2PY2" ? x * x + y * y : (x - y) * (x - y);
      }
      return finite(s);
    }
    case "SERIESSUM": {
      if (argc !== 4) return bad;
      const x = N(0); if (typeof x === "string") return x;
      const n = N(1); if (typeof n === "string") return n;
      const m = N(2); if (typeof m === "string") return m;
      const cs = rawCells(args[3]); if (typeof cs === "string") return cs;
      let s = 0;
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i];
        if (isErr(c)) return c;
        if (typeof c !== "number") { if (c === "" || c === null || c === undefined) continue; return bad; }
        if (x === 0 && n + i * m === 0) { s += c; continue; }
        s += c * Math.pow(x, n + i * m);
      }
      return finite(s);
    }
    case "MULTINOMIAL": {
      if (argc < 1) return bad;
      const a = nums(args); if (typeof a === "string") return a;
      if (a.length === 0) return bad;
      const t = a.map(Math.trunc);
      if (t.some((v) => v < 0)) return "#NUM!";
      const total = t.reduce((s, v) => s + v, 0);
      if (total > 5000) return "#NUM!";
      let run = 0, r = 1n;
      for (const v of t) { run += v; r *= bigComb(run, v); }
      return finite(Number(r));
    }
    case "COMBINA": {
      if (argc !== 2) return bad;
      const n = N(0); if (typeof n === "string") return n;
      const k = N(1); if (typeof k === "string") return k;
      const nn = Math.trunc(n), kk = Math.trunc(k);
      if (nn < 0 || kk < 0) return "#NUM!";
      if (kk === 0) return 1;
      if (nn === 0) return "#NUM!";
      if (nn + kk - 1 > 100000) return "#NUM!";
      return finite(Number(bigComb(nn + kk - 1, kk)));
    }
    case "PERMUTATIONA": {
      if (argc !== 2) return bad;
      const n = N(0); if (typeof n === "string") return n;
      const k = N(1); if (typeof k === "string") return k;
      const nn = Math.trunc(n), kk = Math.trunc(k);
      if (nn < 0 || kk < 0) return "#NUM!";
      return finite(Math.pow(nn, kk));
    }
    case "ROMAN": {
      if (!need(1, 2)) return bad;
      const n = N(0); if (typeof n === "string") return n;
      if (args[1]) {
        const f = boolArg(1); if (typeof f === "string") return f;
        const fn = ev(1);
        if (!(fn === true || Number(fn) === 0)) return bad;
      }
      let x = Math.trunc(n);
      if (x < 0 || x > 3999) return bad;
      let out = "";
      for (const [v, s] of ROMAN_TABLE) while (x >= v) { out += s; x -= v; }
      return out;
    }
    case "ARABIC": {
      if (argc !== 1) return bad;
      const v = ev(0); if (isErr(v)) return v;
      if (typeof v !== "string") return bad;
      let s = v.trim().toUpperCase();
      if (s === "") return 0;
      let neg = false;
      if (s[0] === "-") { neg = true; s = s.slice(1); }
      if (s === "" || s.length > 255 || /[^IVXLCDM]/.test(s)) return bad;
      let total = 0, prev = 0;
      for (let i = s.length - 1; i >= 0; i--) {
        const val = ROMAN_VAL[s[i]];
        if (val < prev) total -= val; else { total += val; prev = val; }
      }
      return neg ? -total : total;
    }
    case "BASE": {
      if (!need(2, 3)) return bad;
      const n = N(0); if (typeof n === "string") return n;
      const radix = N(1); if (typeof radix === "string") return radix;
      let minLen = 0;
      if (args[2]) { minLen = N(2); if (typeof minLen === "string") return minLen; }
      const x = Math.trunc(n), r = Math.trunc(radix), ml = Math.trunc(minLen);
      if (x < 0 || x >= 2 ** 53 || r < 2 || r > 36 || ml < 0 || ml > 255) return "#NUM!";
      return x.toString(r).toUpperCase().padStart(ml, "0");
    }
    case "DECIMAL": {
      if (argc !== 2) return bad;
      const v = ev(0); if (isErr(v)) return v;
      if (typeof v === "boolean") return bad;
      const radix = N(1); if (typeof radix === "string") return radix;
      const r = Math.trunc(radix);
      if (r < 2 || r > 36) return "#NUM!";
      const s = String(v).trim().toUpperCase();
      if (s === "") return 0;
      let total = 0;
      for (const ch of s) {
        const d = parseInt(ch, 36);
        if (!/[0-9A-Z]/.test(ch) || d >= r) return "#NUM!";
        total = total * r + d;
      }
      return Number.isFinite(total) ? total : "#NUM!";
    }
    case "COTH": case "CSCH": case "SECH": case "ACOT": case "ACOTH": {
      if (argc !== 1) return bad;
      const x = N(0); if (typeof x === "string") return x;
      if (name === "COTH") return x === 0 ? "#DIV/0!" : finite(1 / Math.tanh(x));
      if (name === "CSCH") return x === 0 ? "#DIV/0!" : finite(1 / Math.sinh(x));
      if (name === "SECH") return finite(1 / Math.cosh(x));
      if (name === "ACOT") return finite(Math.PI / 2 - Math.atan(x));
      return Math.abs(x) <= 1 ? "#NUM!" : finite(0.5 * Math.log((x + 1) / (x - 1)));
    }

    // ================= পরিসংখ্যান =================
    case "AVEDEV": {
      if (argc < 1) return bad;
      const a = nums(args); if (typeof a === "string") return a;
      if (a.length === 0) return "#NUM!";
      const m = mean(a);
      return finite(a.reduce((s, x) => s + Math.abs(x - m), 0) / a.length);
    }
    case "HARMEAN": {
      if (argc < 1) return bad;
      const a = nums(args); if (typeof a === "string") return a;
      if (a.length === 0 || a.some((x) => x <= 0)) return "#NUM!";
      return finite(a.length / a.reduce((s, x) => s + 1 / x, 0));
    }
    case "TRIMMEAN": {
      if (argc !== 2) return bad;
      const a = nums([args[0]]); if (typeof a === "string") return a;
      const p = N(1); if (typeof p === "string") return p;
      if (p < 0 || p >= 1 || a.length === 0) return "#NUM!";
      const k = Math.floor((a.length * p) / 2);
      const s = a.slice().sort((x, y) => x - y).slice(k, a.length - k);
      return finite(mean(s));
    }
    case "FISHER": {
      if (argc !== 1) return bad;
      const x = N(0); if (typeof x === "string") return x;
      if (x <= -1 || x >= 1) return "#NUM!";
      return finite(0.5 * Math.log((1 + x) / (1 - x)));
    }
    case "FISHERINV": {
      if (argc !== 1) return bad;
      const y = N(0); if (typeof y === "string") return y;
      return finite(Math.tanh(y));
    }
    case "PEARSON": case "STEYX": {
      if (argc !== 2) return bad;
      const p = pairs(0, 1); if (typeof p === "string") return p;
      const n = p.xs.length;
      if (n < (name === "PEARSON" ? 2 : 3)) return "#DIV/0!";
      // STEYX(known_y, known_x): প্রথম আর্গুমেন্ট y, দ্বিতীয়টি x; PEARSON-এ ক্রম গুরুত্বহীন
      const X = name === "STEYX" ? p.ys : p.xs;
      const Y = name === "STEYX" ? p.xs : p.ys;
      const mx = mean(X), my = mean(Y);
      let sxx = 0, syy = 0, sxy = 0;
      for (let i = 0; i < n; i++) { sxx += (X[i] - mx) ** 2; syy += (Y[i] - my) ** 2; sxy += (X[i] - mx) * (Y[i] - my); }
      if (name === "PEARSON") {
        if (sxx === 0 || syy === 0) return "#DIV/0!";
        return finite(sxy / Math.sqrt(sxx * syy));
      }
      if (sxx === 0) return "#DIV/0!";
      return finite(Math.sqrt(Math.max(0, (syy - (sxy * sxy) / sxx) / (n - 2))));
    }
    case "GAUSS": {
      if (argc !== 1) return bad;
      const z = N(0); if (typeof z === "string") return z;
      return finite(normCdf(z) - 0.5);
    }
    case "PHI": {
      if (argc !== 1) return bad;
      const x = N(0); if (typeof x === "string") return x;
      return finite(normPdf(x));
    }
    case "BINOM.DIST": {
      if (argc !== 4) return bad;
      const k0 = N(0); if (typeof k0 === "string") return k0;
      const n0 = N(1); if (typeof n0 === "string") return n0;
      const p = N(2); if (typeof p === "string") return p;
      const cum = boolArg(3); if (typeof cum === "string") return cum;
      const k = Math.trunc(k0), n = Math.trunc(n0);
      if (n < 0 || k < 0 || k > n || p < 0 || p > 1 || n > MAX_LOOP) return "#NUM!";
      const pmf = (i) => {
        if (p === 0) return i === 0 ? 1 : 0;
        if (p === 1) return i === n ? 1 : 0;
        return Math.exp(lfact(n) - lfact(i) - lfact(n - i) + i * Math.log(p) + (n - i) * Math.log1p(-p));
      };
      if (!cum) return finite(pmf(k));
      let s = 0;
      for (let i = 0; i <= k; i++) s += pmf(i);
      return finite(Math.min(1, s));
    }
    case "POISSON.DIST": {
      if (argc !== 3) return bad;
      const x0 = N(0); if (typeof x0 === "string") return x0;
      const m = N(1); if (typeof m === "string") return m;
      const cum = boolArg(2); if (typeof cum === "string") return cum;
      const x = Math.trunc(x0);
      if (x < 0 || m < 0 || x > MAX_LOOP) return "#NUM!";
      const pmf = (i) => (m === 0 ? (i === 0 ? 1 : 0) : Math.exp(-m + i * Math.log(m) - lfact(i)));
      if (!cum) return finite(pmf(x));
      let s = 0;
      for (let i = 0; i <= x; i++) s += pmf(i);
      return finite(Math.min(1, s));
    }
    case "EXPON.DIST": {
      if (argc !== 3) return bad;
      const x = N(0); if (typeof x === "string") return x;
      const lam = N(1); if (typeof lam === "string") return lam;
      const cum = boolArg(2); if (typeof cum === "string") return cum;
      if (x < 0 || lam <= 0) return "#NUM!";
      return finite(cum ? -Math.expm1(-lam * x) : lam * Math.exp(-lam * x));
    }
    case "CONFIDENCE.NORM": {
      if (argc !== 3) return bad;
      const alpha = N(0); if (typeof alpha === "string") return alpha;
      const sd = N(1); if (typeof sd === "string") return sd;
      const size = N(2); if (typeof size === "string") return size;
      const n = Math.trunc(size);
      if (alpha <= 0 || alpha >= 1 || sd <= 0 || n < 1) return "#NUM!";
      return finite((normSInv(1 - alpha / 2) * sd) / Math.sqrt(n));
    }

    // ================= আর্থিক =================
    case "PDURATION": {
      if (argc !== 3) return bad;
      const rate = N(0); if (typeof rate === "string") return rate;
      const pv = N(1); if (typeof pv === "string") return pv;
      const fv = N(2); if (typeof fv === "string") return fv;
      if (rate <= 0 || pv <= 0 || fv <= 0) return "#NUM!";
      return finite((Math.log(fv) - Math.log(pv)) / Math.log1p(rate));
    }
    case "FVSCHEDULE": {
      if (argc !== 2) return bad;
      const pr = N(0); if (typeof pr === "string") return pr;
      const sc = rawCells(args[1]); if (typeof sc === "string") return sc;
      let r = pr;
      for (const v of sc) {
        if (isErr(v)) return v;
        if (v === "" || v === null || v === undefined) continue;
        if (typeof v !== "number") return bad;
        r *= 1 + v;
      }
      return finite(r);
    }
    case "ISPMT": {
      if (argc !== 4) return bad;
      const rate = N(0); if (typeof rate === "string") return rate;
      const per = N(1); if (typeof per === "string") return per;
      const nper = N(2); if (typeof nper === "string") return nper;
      const pv = N(3); if (typeof pv === "string") return pv;
      if (nper === 0) return "#DIV/0!";
      return finite(pv * rate * (per / nper - 1));
    }
    case "DOLLARDE": case "DOLLARFR": {
      if (argc !== 2) return bad;
      const x = N(0); if (typeof x === "string") return x;
      const f0 = N(1); if (typeof f0 === "string") return f0;
      const f = Math.trunc(f0);
      if (f < 0) return "#NUM!";
      if (f === 0) return "#DIV/0!";
      const ip = Math.trunc(x);
      const frac = x - ip;
      const mult = Math.pow(10, Math.ceil(Math.log10(f)));
      return finite(name === "DOLLARDE" ? ip + (frac * mult) / f : ip + (frac * f) / mult);
    }

    // ================= ইঞ্জিনিয়ারিং =================
    case "ERF": {
      if (!need(1, 2)) return bad;
      const lo = N(0); if (typeof lo === "string") return lo;
      if (argc === 1) return finite(erf(lo));
      const hi = N(1); if (typeof hi === "string") return hi;
      return finite(erf(hi) - erf(lo));
    }
    case "ERF.PRECISE": case "ERFC": case "ERFC.PRECISE": {
      if (argc !== 1) return bad;
      const x = N(0); if (typeof x === "string") return x;
      return finite(name === "ERF.PRECISE" ? erf(x) : erfc(x));
    }
    case "BIN2OCT": case "BIN2HEX": case "OCT2BIN": case "OCT2HEX": case "HEX2BIN": case "HEX2OCT": {
      if (!need(1, 2)) return bad;
      const v = ev(0); if (isErr(v)) return v;
      if (typeof v === "boolean") return bad;
      const from = name.slice(0, 3), to = name.slice(4, 7);
      const val = parseBase(typeof v === "number" ? String(v) : v, from);
      if (val === null) return "#NUM!";
      let places;
      if (args[1]) { const p = N(1); if (typeof p === "string") return p; places = Math.trunc(p); }
      return formatBase(val, to, places);
    }

    // ================= তথ্য ও টেক্সট =================
    case "ISREF": {
      if (argc !== 1) return bad;
      return isRef(args[0]);
    }
    case "ERROR.TYPE": {
      if (argc !== 1) return bad;
      const v = ev(0);
      if (isErr(v) && ERROR_CODES[v] !== undefined) return ERROR_CODES[v];
      return "#N/A";
    }
    case "FORMULATEXT": {
      if (argc !== 1) return bad;
      if (!isRef(args[0])) return bad;
      return formulaCell() ?? "#N/A";
    }
    case "ARRAYTOTEXT": {
      if (!need(1, 2)) return bad;
      let strict = false;
      if (args[1]) {
        const f = N(1); if (typeof f === "string") return f;
        if (f !== 0 && f !== 1) return bad;
        strict = f === 1;
      }
      let rows;
      if (isRef(args[0])) {
        const g = readGrid(args[0], getCell, ctx);
        if (!g) return bad;
        if (g.error) return g.error;
        rows = g.rows;
      } else {
        const v = evalFn(args[0], getCell, expandRange);
        rows = [[v]];
      }
      if (!strict) return rows.flat().map((v) => textOf(v, false)).join(", ");
      return "{" + rows.map((r) => r.map((v) => textOf(v, true)).join(",")).join(";") + "}";
    }
    case "VALUETOTEXT": {
      if (!need(1, 2)) return bad;
      let strict = false;
      if (args[1]) {
        const f = N(1); if (typeof f === "string") return f;
        if (f !== 0 && f !== 1) return bad;
        strict = f === 1;
      }
      const v = ev(0);
      if (isErr(v)) return v;
      return textOf(v, strict);
    }
    case "SHEETS": {
      if (argc === 0) return ctx?.allSheets?.length ?? 1;
      if (argc === 1 && isRef(args[0])) return 1;
      return bad;
    }
    default:
      return undefined;
  }
}
