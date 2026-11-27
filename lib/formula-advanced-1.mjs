/**
 * ALIMXL Advanced Formula Module 1 (v2) - array / regression functions
 *
 * Excel functions: FREQUENCY, LINEST, LOGEST, TREND, GROWTH
 * They return 2D arrays and plug into the spill system:
 * spill-functions.mjs -> evaluateAdvancedSpill(fn, args, context)
 * (same pattern as evaluateExtraSpill in extra-functions.mjs).
 *
 * LAMBDA, MAP, REDUCE, SCAN, BYROW, BYCOL, MAKEARRAY are NOT in this file:
 * they need parser support for lambda parameters in formula-core.mjs.
 */

import { createArrayResult } from "./spill-engine.mjs";

export const ADVANCED_SPILL_NAMES = ["FREQUENCY", "LINEST", "LOGEST", "TREND", "GROWTH"];
const SPILL_SET = new Set(ADVANCED_SPILL_NAMES);

const ERRORS = new Set(["#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A", "#SPILL!", "#CALC!", "#CIRCULAR!", "#ERROR!"]);
const isErr = (v) => typeof v === "string" && ERRORS.has(v);
const NA = "#N/A";
const MAX_CELLS = 1_000_000;

function toGrid(g) {
  const rows = Array.isArray(g) ? g : g?.rows ?? g?.values;
  if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(rows[0]) || rows[0].length === 0) return null;
  const w = rows[0].length;
  for (const r of rows) if (!Array.isArray(r) || r.length !== w) return null;
  return rows.map((r) => r.slice());
}

function wrap(rows) {
  if (rows.length === 0 || rows[0].length === 0) return "#CALC!";
  if (rows.length * rows[0].length > MAX_CELLS) return "#NUM!";
  return createArrayResult(rows) ?? "#CALC!";
}

function toBool(v, def) {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toUpperCase();
    if (t === "TRUE") return true;
    if (t === "FALSE") return false;
  }
  return null;
}

// numeric cells only (numbers); returns { error } or { values }
function numbersOf(grid) {
  const out = [];
  for (const row of grid) {
    for (const v of row) {
      if (isErr(v)) return { error: v };
      if (typeof v === "number" && Number.isFinite(v)) out.push(v);
    }
  }
  return { values: out };
}

// every cell must be a number (regression inputs)
function strictMatrix(grid) {
  const out = [];
  for (const row of grid) {
    const r = [];
    for (const v of row) {
      if (isErr(v)) return { error: v };
      if (typeof v !== "number" || !Number.isFinite(v)) return { error: "#VALUE!" };
      r.push(v);
    }
    out.push(r);
  }
  return { rows: out };
}

// ---------- FREQUENCY ----------
function frequency(dataGrid, binsGrid) {
  const d = numbersOf(dataGrid);
  if (d.error) return d.error;
  const b = numbersOf(binsGrid);
  if (b.error) return b.error;
  const bins = b.values.map((value, index) => ({ value, index })).sort((p, q) => p.value - q.value || p.index - q.index);
  const counts = new Array(bins.length + 1).fill(0);
  const data = [...d.values].sort((p, q) => p - q);
  let pos = 0;
  for (let i = 0; i < bins.length; i += 1) {
    let c = 0;
    while (pos < data.length && data[pos] <= bins[i].value) { c += 1; pos += 1; }
    counts[i] = c;
  }
  counts[bins.length] = data.length - pos;
  const ordered = new Array(bins.length + 1).fill(0);
  bins.forEach((bin, i) => { ordered[bin.index] = counts[i]; });
  ordered[bins.length] = counts[bins.length];
  return wrap(ordered.map((c) => [c]));
}

// ---------- least squares core ----------
function invert(matrix) {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12 * (Math.abs(matrix[col][col]) || 1)) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const p = a[col][col];
    for (let j = 0; j < 2 * n; j += 1) a[col][j] /= p;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = a[r][col];
      if (f !== 0) for (let j = 0; j < 2 * n; j += 1) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((row) => row.slice(n));
}

// y: values[], X: rows of observations (k columns). Returns fit or { error }
function fitLeastSquares(y, X, k, useConst) {
  const n = y.length;
  const p = k + (useConst ? 1 : 0);
  const design = X.map((row) => (useConst ? [...row, 1] : [...row]));
  const xtx = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty = new Array(p).fill(0);
  for (let i = 0; i < n; i += 1) {
    for (let a = 0; a < p; a += 1) {
      xty[a] += design[i][a] * y[i];
      for (let b = 0; b < p; b += 1) xtx[a][b] += design[i][a] * design[i][b];
    }
  }
  const inv = invert(xtx);
  if (!inv) return { error: "#NUM!" };
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j], 0));
  const fitted = design.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  let ssResid = 0;
  for (let i = 0; i < n; i += 1) ssResid += (y[i] - fitted[i]) ** 2;
  let ssReg = 0;
  if (useConst) {
    const mean = y.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i += 1) ssReg += (fitted[i] - mean) ** 2;
  } else {
    for (let i = 0; i < n; i += 1) ssReg += fitted[i] ** 2;
  }
  return { beta, inv, ssResid, ssReg, df: n - p, k, n, useConst };
}

// Reads y and x grids into { y, X, k, yIsRow } following Excel's orientation rules
function readRegression(yGrid, xGrid) {
  const ym = strictMatrix(yGrid);
  if (ym.error) return ym;
  const yRows = ym.rows.length;
  const yCols = ym.rows[0].length;
  if (yRows !== 1 && yCols !== 1) return { error: "#REF!" };
  const yIsRow = yRows === 1 && yCols > 1;
  const y = ym.rows.flat();
  const n = y.length;
  let X;
  let k;
  if (!xGrid) {
    X = y.map((_, i) => [i + 1]);
    k = 1;
  } else {
    const xm = strictMatrix(xGrid);
    if (xm.error) return xm;
    const rows = xm.rows;
    if (yIsRow) {
      if (rows[0].length !== n) return { error: "#REF!" };
      k = rows.length;
      X = Array.from({ length: n }, (_, i) => rows.map((r) => r[i]));
    } else {
      if (rows.length !== n) return { error: "#REF!" };
      k = rows[0].length;
      X = rows.map((r) => r.slice());
    }
  }
  if (n <= 0) return { error: "#VALUE!" };
  return { y, X, k, yIsRow, n };
}

function regressionOutput(fit, stats, transform) {
  const k = fit.k;
  const coefs = [];
  for (let j = k - 1; j >= 0; j -= 1) coefs.push(fit.beta[j]);
  coefs.push(fit.useConst ? fit.beta[k] : 0);
  const se = [];
  const dfOk = fit.df > 0;
  const sey = dfOk ? Math.sqrt(fit.ssResid / fit.df) : NaN;
  for (let j = k - 1; j >= 0; j -= 1) se.push(dfOk ? sey * Math.sqrt(fit.inv[j][j]) : NaN);
  se.push(fit.useConst ? (dfOk ? sey * Math.sqrt(fit.inv[k][k]) : NaN) : NA);
  const cols = k + 1;
  const first = coefs.map(transform);
  if (!stats) return wrap([first]);
  const pad = (a, b) => [a, b, ...new Array(cols - 2).fill(NA)];
  const finite = (v) => (Number.isFinite(v) ? v : "#NUM!");
  const total = fit.ssReg + fit.ssResid;
  const r2 = total === 0 ? 1 : fit.ssReg / total;
  const F = dfOk && fit.ssResid > 0 ? fit.ssReg / fit.k / (fit.ssResid / fit.df) : "#NUM!";
  return wrap([
    first,
    se.map((v) => (typeof v === "number" ? finite(v) : v)),
    pad(r2, finite(sey)),
    pad(F, fit.df),
    pad(fit.ssReg, fit.ssResid),
  ]);
}

function linestLike(args, context, logMode) {
  const { getGrid, getValue } = context;
  const has = (i) => i < args.length && args[i] !== undefined && args[i] !== null && args[i] !== "";
  if (args.length < 1 || args.length > 4) return "#VALUE!";
  const yGrid = toGrid(getGrid(args[0]));
  if (!yGrid) return "#VALUE!";
  const xGrid = has(1) ? toGrid(getGrid(args[1])) : null;
  if (has(1) && !xGrid) return "#VALUE!";
  const useConst = toBool(has(2) ? getValue(args[2]) : undefined, true);
  const stats = toBool(has(3) ? getValue(args[3]) : undefined, false);
  if (useConst === null || stats === null) return "#VALUE!";
  const data = readRegression(yGrid, xGrid);
  if (data.error) return data.error;
  let y = data.y;
  if (logMode) {
    if (y.some((v) => v <= 0)) return "#NUM!";
    y = y.map(Math.log);
  }
  const fit = fitLeastSquares(y, data.X, data.k, useConst);
  if (fit.error) return fit.error;
  return regressionOutput(fit, stats, logMode ? Math.exp : (v) => v);
}

function trendLike(args, context, logMode) {
  const { getGrid, getValue } = context;
  const has = (i) => i < args.length && args[i] !== undefined && args[i] !== null && args[i] !== "";
  if (args.length < 1 || args.length > 4) return "#VALUE!";
  const yGrid = toGrid(getGrid(args[0]));
  if (!yGrid) return "#VALUE!";
  const xGrid = has(1) ? toGrid(getGrid(args[1])) : null;
  if (has(1) && !xGrid) return "#VALUE!";
  const useConst = toBool(has(3) ? getValue(args[3]) : undefined, true);
  if (useConst === null) return "#VALUE!";
  const data = readRegression(yGrid, xGrid);
  if (data.error) return data.error;
  let y = data.y;
  if (logMode) {
    if (y.some((v) => v <= 0)) return "#NUM!";
    y = y.map(Math.log);
  }
  const fit = fitLeastSquares(y, data.X, data.k, useConst);
  if (fit.error) return fit.error;

  let newX;
  let outRows;
  let outCols;
  if (has(2)) {
    const ng = toGrid(getGrid(args[2]));
    if (!ng) return "#VALUE!";
    const nm = strictMatrix(ng);
    if (nm.error) return nm.error;
    const rows = nm.rows;
    if (data.yIsRow) {
      if (rows.length !== data.k) return "#REF!";
      outRows = 1;
      outCols = rows[0].length;
      newX = Array.from({ length: outCols }, (_, i) => rows.map((r) => r[i]));
    } else {
      if (rows[0].length !== data.k) return "#REF!";
      outRows = rows.length;
      outCols = 1;
      newX = rows.map((r) => r.slice());
    }
  } else {
    newX = data.X;
    outRows = data.yIsRow ? 1 : data.n;
    outCols = data.yIsRow ? data.n : 1;
  }
  const predict = (row) => {
    let s = useConst ? fit.beta[data.k] : 0;
    for (let j = 0; j < data.k; j += 1) s += fit.beta[j] * row[j];
    return logMode ? Math.exp(s) : s;
  };
  const values = newX.map(predict);
  if (!values.every(Number.isFinite)) return "#NUM!";
  return wrap(data.yIsRow ? [values] : values.map((v) => [v]));
}

export function evaluateAdvancedSpill(fn, args, context) {
  if (!SPILL_SET.has(fn)) return null;
  if (!Array.isArray(args) || !context) return "#VALUE!";
  const { getGrid } = context;
  switch (fn) {
    case "FREQUENCY": {
      if (args.length !== 2) return "#VALUE!";
      const d = toGrid(getGrid(args[0]));
      const b = toGrid(getGrid(args[1]));
      if (!d || !b) return "#VALUE!";
      return frequency(d, b);
    }
    case "LINEST": return linestLike(args, context, false);
    case "LOGEST": return linestLike(args, context, true);
    case "TREND": return trendLike(args, context, false);
    case "GROWTH": return trendLike(args, context, true);
    default: return null;
  }
}

export default { ADVANCED_SPILL_NAMES, evaluateAdvancedSpill };
