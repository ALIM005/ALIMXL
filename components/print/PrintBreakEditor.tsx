"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { PrintRenderPage } from "../../lib/print-render";
import type { PrintPageSetup } from "./PageSetupDialog";
import { columnIndexToLetters } from "../../lib/print-pages";

import { usePrintI18n } from "./usePrintI18n";
import { formatPrintNumber, formatPrintPercent } from "../../lib/print-i18n";
type Axis = "row" | "column";
interface Boundary { index: number; position: number }
interface DragState { axis: Axis; original: number; target: number; pointerId: number }
export default function PrintBreakEditor({ overview, pages, settings, onChange, message }: {
  overview?: PrintRenderPage; pages: PrintRenderPage[]; settings: PrintPageSetup;
  onChange: (settings: PrintPageSetup) => void; message?: string;
}) {
  const { t, language, dir } = usePrintI18n();
  const host = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [insertAxis, setInsertAxis] = useState<Axis>("row");
  const [insertBefore, setInsertBefore] = useState(2);
  const [inputError, setInputError] = useState(false);
  if (!overview) return <p className="p-6 text-sm text-slate-700">{message ? t("editorLimit", { cells: 5000, rows: 500, columns: 100 }) : t("selectPrintArea")}</p>;
  const range = overview.page;
  const header = settings.repeatFirstRow ? range.r1 : null;
  const rowBounds: Boundary[] = overview.rows.filter(row => row.row > range.r1 && row.row !== (header === null ? -1 : header + 1))
    .map(row => ({ index: row.row, position: row.cells[0]?.y ?? 0 }));
  const colBounds: Boundary[] = (overview.rows[0]?.cells ?? []).filter(cell => cell.col > range.c1)
    .map(cell => ({ index: cell.col, position: cell.x }));
  const rowBreaks = Array.from(new Set(pages.map(page => page.page.r1).filter(row => row > range.r1 && row !== (header === null ? -1 : header + 1)))).sort((a, b) => a - b);
  const colBreaks = Array.from(new Set(pages.map(page => page.page.c1).filter(col => col > range.c1))).sort((a, b) => a - b);
  const bodyTop = 30, bodyLeft = 48;
  const nearest = (event: PointerEvent<HTMLDivElement>, axis: Axis) => {
    const box = host.current?.getBoundingClientRect();
    const bounds = axis === "row" ? rowBounds : colBounds;
    if (!box || !bounds.length) return null;
    const point = axis === "row" ? (event.clientY - box.top) / zoom - bodyTop : (event.clientX - box.left) / zoom - bodyLeft;
    return bounds.reduce((best, item) => Math.abs(item.position - point) < Math.abs(best.position - point) ? item : best).index;
  };
  const commit = (axis: Axis, original: number | null, target: number | null) => {
    const current = axis === "row" ? rowBreaks : colBreaks;
    const next = Array.from(new Set([...current.filter(index => index !== original), ...(target === null ? [] : [target])])).sort((a, b) => a - b);
    // Freeze current effective scale, then let engine shrink if a manual segment needs it.
    onChange({ ...settings, scale: settings.scale, scalingMode: "percentage",
      ...(axis === "row" ? { rowBreaksBefore: next, manualRowBreaks: true, rowsPerPage: 0 } : { columnBreaksBefore: next, manualColumnBreaks: true }) });
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>, axis: Axis, index: number) => {
    event.preventDefault(); event.stopPropagation();
    const state = { axis, original: index, target: index, pointerId: event.pointerId };
    dragRef.current = state; setDrag(state);
    host.current?.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = dragRef.current;
    if (!current) return;
    const target = nearest(event, current.axis);
    if (target !== null) { const next = { ...current, target }; dragRef.current = next; setDrag(next); }
  };
  const finish = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const current = dragRef.current;
    if (!current) return;
    dragRef.current = null; setDrag(null);
    if (host.current?.hasPointerCapture(event.pointerId)) host.current.releasePointerCapture(event.pointerId);
    if (!cancelled && current.target !== current.original) commit(current.axis, current.original, current.target);
  };
  const pos = (axis: Axis, index: number) => (axis === "row" ? rowBounds : colBounds).find(bound => bound.index === index)?.position ?? 0;
  const line = (axis: Axis, index: number) => {
    const selected = drag?.axis === axis && drag.original === index;
    const position = pos(axis, selected ? drag.target : index);
    return <div key={`${axis}:${index}`} role="separator" tabIndex={0}
      aria-label={`${axis === "row" ? t("breakBeforeRow", { row: index + 1 }) : t("breakBeforeColumn", { column: columnIndexToLetters(index) })}. ${t("breakEditorHint")}`}
      aria-orientation={axis === "row" ? "horizontal" : "vertical"}
      aria-valuenow={index + 1}
      aria-valuemin={(axis === "row" ? rowBounds : colBounds)[0]?.index === undefined ? 1 : (axis === "row" ? rowBounds : colBounds)[0].index + 1}
      aria-valuemax={(axis === "row" ? rowBounds : colBounds).at(-1)?.index === undefined ? 1 : ((axis === "row" ? rowBounds : colBounds).at(-1)?.index ?? 0) + 1}
      title={axis === "row" ? t("breakBeforeRow", { row: index + 1 }) : t("breakBeforeColumn", { column: columnIndexToLetters(index) })}
      onPointerDown={event => startDrag(event, axis, index)}
      onKeyDown={event => {
        if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); commit(axis, index, null); return; }
        const delta = axis === "row" ? event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0
          : event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
        if (delta) {
          event.preventDefault();
          const bounds = axis === "row" ? rowBounds : colBounds;
          const at = bounds.findIndex(bound => bound.index === index);
          const next = bounds[at + delta]; if (next) commit(axis, index, next.index);
        }
      }}
      style={{ position: "absolute", zIndex: selected ? 8 : 5, touchAction: "none",
        left: axis === "row" ? bodyLeft : bodyLeft + position - 6,
        top: axis === "row" ? bodyTop + position - 6 : bodyTop,
        width: axis === "row" ? overview.totalWidth : 12,
        height: axis === "row" ? 12 : overview.totalHeight,
        cursor: axis === "row" ? "row-resize" : "col-resize",
        background: `linear-gradient(${axis === "row" ? "to bottom" : "to right"}, transparent 5px, ${selected ? "#c2410c" : "#0057b7"} 5px, ${selected ? "#c2410c" : "#0057b7"} 8px, transparent 8px)`,
      }} />;
  };
  return <div lang={language} dir={dir} className="flex h-full min-h-0 flex-col">
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-200 bg-white p-2 text-xs">
      <label>{t("previewZoom")} <select value={zoom} onChange={event => setZoom(Number(event.currentTarget.value))} className="rounded border p-1">
        {[0.3, 0.45, 0.6, 0.8, 1].map(value => <option key={value} value={value}>{formatPrintPercent(language, value * 100)}</option>)}
      </select></label>
      <select aria-label={t("breakAxis")} value={insertAxis} onChange={e => setInsertAxis(e.currentTarget.value as Axis)} className="rounded border p-1">
        <option value="row">{t("beforeRow")}</option><option value="column">{t("beforeColumn")}</option>
      </select>
      <input aria-label={t("boundaryIndex")} type="number" dir="ltr" min={1} value={insertBefore} onChange={e => setInsertBefore(e.currentTarget.valueAsNumber || 1)} className="w-16 rounded border p-1" />
      <button type="button" className="rounded border border-green-800 px-2 py-1 text-green-950" onClick={() => {
        const index = insertBefore - 1;
        const allowed = insertAxis === "row" ? rowBounds : colBounds;
        if (allowed.some(item => item.index === index)) { setInputError(false); commit(insertAxis, null, index); }
        else setInputError(true);
      }}>{t("addBreak")}</button>
      <button type="button" className="rounded border px-2 py-1" onClick={() => onChange({ ...settings, rowBreaksBefore: [], columnBreaksBefore: [], manualRowBreaks: false, manualColumnBreaks: false, rowsPerPage: 0 })}>{t("resetBreaks")}</button>
      <span role="status">{drag ? (drag.axis === "row" ? t("dropBeforeRow", { row: drag.target + 1 }) : t("dropBeforeColumn", { column: columnIndexToLetters(drag.target) })) : t("breakEditorHint")}</span>
    </div>
    {inputError && <p role="alert" className="shrink-0 bg-red-50 p-2 text-xs text-red-800">{t("invalidBoundary")}</p>}
    <p className="shrink-0 bg-amber-50 px-3 py-1 text-xs text-amber-950">{t("breakPlanningNote")} {t("breakScaleHelp")}</p>
    <div className="min-h-0 flex-1 overflow-auto bg-slate-200 p-4">
      <div style={{ width: (overview.totalWidth + bodyLeft + 10) * zoom, height: (overview.totalHeight + bodyTop + 10) * zoom }}>
        <div ref={host} dir="ltr" onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
          style={{ position: "relative", width: overview.totalWidth + bodyLeft + 10, height: overview.totalHeight + bodyTop + 10, transform: `scale(${zoom})`, transformOrigin: "top left", background: "white", userSelect: "none" }}>
          {overview.rows.map(row => <div key={`r${row.row}`} style={{ position: "absolute", left: 0, top: bodyTop + (row.cells[0]?.y ?? 0), width: bodyLeft, height: row.height, fontSize: 12, background: "#ecfdf5", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>{formatPrintNumber(language, row.row + 1)}</div>)}
          {(overview.rows[0]?.cells ?? []).map(cell => <div key={`c${cell.col}`} style={{ position: "absolute", left: bodyLeft + cell.x, top: 0, width: cell.width, height: bodyTop, fontSize: 12, background: "#ecfdf5", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>{columnIndexToLetters(cell.col)}</div>)}
          {overview.rows.flatMap(row => row.cells.map(cell => <div key={cell.key} title={`${cell.key}: ${cell.value}`} style={{ position: "absolute", left: bodyLeft + cell.x, top: bodyTop + cell.y, width: cell.width, height: cell.height, overflow: "hidden", boxSizing: "border-box", border: "1px solid #cbd5e1", padding: 3, fontSize: cell.fontSize, fontFamily: cell.style?.fontFamily, fontWeight: cell.style?.bold ? 700 : 400, color: cell.style?.color || "#0f172a", background: cell.style?.bg || "white", whiteSpace: "pre" }}>{cell.textLines.join("\n")}</div>))}
          {rowBreaks.map(index => line("row", index))}
          {colBreaks.map(index => line("column", index))}
        </div>
      </div>
    </div>
  </div>;
}
