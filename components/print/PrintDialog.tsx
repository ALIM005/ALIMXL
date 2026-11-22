"use client";

// One print workspace: preview on the left, committed page settings on the right.
// Workbook data is never modified here. Browser/system dialog selects the printer.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { PrintPageSetup } from "./PageSetupDialog";
import type { PrintHeaderFooterSettings } from "./PrintHeaderFooter";
import { PRINT_PAPER_SIZES, type PrintPaperSize, type PrintScalingMode } from "../../lib/print-pages";

import { usePrintI18n } from "./usePrintI18n";
import PrintLanguageSetting from "./PrintLanguageSetting";
import { getPrintErrorMessage, getPrintPaperLabel } from "../../lib/print-i18n";
export interface PrintDialogOptions {
  showGridlines: boolean;
  headerFooter: PrintHeaderFooterSettings;
}
export interface PrintDialogProps {
  open: boolean;
  settings: PrintPageSetup;
  onSettingsChange?: (settings: PrintPageSetup) => void;
  value: PrintDialogOptions;
  sheetName?: string;
  workbookName?: string;
  busy?: boolean;
  error?: unknown;
  onPageSetup: (options: PrintDialogOptions) => void;
  onPreview: (options: PrintDialogOptions) => void;
  onPrint: (options: PrintDialogOptions) => void;
  onClose: () => void;
  renderPreview?: (options: PrintDialogOptions) => ReactNode;
}
const inputClass = "mt-1 w-full rounded-md border border-amber-200 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-2 focus:outline-green-700 disabled:opacity-50";
const buttonClass = "rounded-md border border-amber-300 bg-white px-4 py-2 text-sm text-green-950 hover:bg-amber-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-green-700";
const primaryClass = "rounded-md border border-green-900 bg-[#005500] px-6 py-2 text-sm font-semibold text-[#ffd54f] hover:bg-green-900 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-amber-500";
function copyOptions(options: PrintDialogOptions): PrintDialogOptions {
  return { showGridlines: options.showGridlines, headerFooter: {
    header: { ...options.headerFooter.header }, footer: { ...options.headerFooter.footer },
  } };
}
function NumberSetting({ label, value, min, max, step = "any", disabled, onChange }: {
  label: string; value: number; min: number; max?: number; step?: number | "any";
  disabled?: boolean; onChange: (value: number) => void;
}) {
  const [draftValue, setDraftValue] = useState({ committed: value, text: String(value) });
  const text = draftValue.committed === value ? draftValue.text : String(value);
  return <label className="block text-xs text-slate-700">{label}
    <input className={inputClass} type="number" dir="ltr" required min={min} max={max} step={step}
      value={text} disabled={disabled}
      onBlur={() => { if (!text.trim()) setDraftValue({ committed: value, text: String(value) }); }}
      onChange={(event) => {
        const next = event.currentTarget.valueAsNumber;
        const valid = Number.isFinite(next) && next >= min && (max === undefined || next <= max);
        setDraftValue({ committed: valid ? next : value, text: event.currentTarget.value });
        if (valid) onChange(next);
      }} />
  </label>;
}
function PrintDialogContent({ settings, onSettingsChange, value, sheetName, workbookName,
  busy = false, error, onPageSetup, onPreview, onPrint, onClose, renderPreview,
}: Omit<PrintDialogProps, "open">) {
  const { t, language, dir } = usePrintI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [draft, setDraft] = useState(() => copyOptions(value));
  const id = useId();
  const message = error ? getPrintErrorMessage(error, language) : "";
  const mode = settings.scalingMode ?? "percentage";
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  useEffect(() => { if (message && !busy) errorRef.current?.focus(); }, [message, busy]);
  const close = () => { if (!busy) onClose(); };
  const action = (callback: (options: PrintDialogOptions) => void) => {
    if (!busy) callback(copyOptions(draft));
  };
  const change = (patch: Partial<PrintPageSetup>) => {
    if (!busy) onSettingsChange?.({ ...settings, ...patch, margins: { ...(patch.margins ?? settings.margins) } });
  };
  return <dialog lang={language} dir={dir} ref={dialogRef} aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); close(); }}
    className="m-auto h-[95dvh] max-h-[95dvh] w-[98vw] max-w-[1800px] overflow-hidden rounded-xl border border-amber-300 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/50 print:hidden">
    <form className="flex h-full min-h-0 flex-col" onSubmit={(event) => { event.preventDefault(); action(onPrint); }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-300 bg-[#005500] px-5 py-3 text-[#ffd54f]">
        <div className="min-w-0"><h2 id={`${id}-title`} className="truncate text-lg font-semibold">{t("printTitle", { name: workbookName?.trim() || t("workbook") })}</h2>
          <p id={`${id}-help`} className="mt-1 text-xs text-amber-100">{sheetName || t("sheet")} · {t("workspaceDescription")}</p></div>
        <button type="button" autoFocus disabled={busy} onClick={close} className={buttonClass}>{t("close")} </button>
      </header>
      {message && <p ref={errorRef} role="alert" tabIndex={-1} className="max-h-24 shrink-0 overflow-auto whitespace-pre-wrap border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{message}</p>}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
        <section aria-label={t("preview")} className="flex min-h-[45dvh] min-w-0 flex-col bg-slate-200 lg:min-h-0">
          <div className="min-h-0 flex-1">
            {renderPreview ? renderPreview(copyOptions(draft)) : <div className="flex h-full items-center justify-center p-8">
              <button type="button" disabled={busy} className={buttonClass} onClick={() => action(onPreview)}>{t("preview")} </button>
            </div>}
          </div>
        </section>
        <aside aria-label={t("settings")} className="min-h-0 border-t border-amber-200 bg-[#fffdf4] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <fieldset disabled={busy} className="space-y-4 p-4">
            <legend className="sr-only">{t("settings")}</legend>
            <section className="rounded-lg border border-amber-200 bg-white p-3"><PrintLanguageSetting disabled={busy} /></section>
            <section className="rounded-lg border border-amber-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-green-950">{t("printer")} </h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{t("printerHelp")} </p>
            </section>
            <section className="space-y-3 rounded-lg border border-amber-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-green-950">{t("paperAndLayout")} </h3>
              <label className="block text-xs">{t("paperSize")} <select className={inputClass} value={settings.paperSize} disabled={!onSettingsChange}
                onChange={(e) => change({ paperSize: e.currentTarget.value as PrintPaperSize })}>
                {(Object.keys(PRINT_PAPER_SIZES) as PrintPaperSize[]).map((paper) => <option key={paper} value={paper}>{getPrintPaperLabel(language, paper)}</option>)}
              </select></label>
              <label className="block text-xs">{t("orientation")} <select className={inputClass} value={settings.orientation} disabled={!onSettingsChange}
                onChange={(e) => change({ orientation: e.currentTarget.value as "portrait" | "landscape" })}>
                <option value="portrait">{t("portrait")} </option><option value="landscape">{t("landscape")} </option>
              </select></label>
              <details><summary className="cursor-pointer text-xs font-medium text-green-900">{t("margins")} </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">{([
                  ["top", "top"], ["right", "right"], ["bottom", "bottom"], ["left", "left"],
                ] as const).map(([side, label]) => <NumberSetting key={side} label={t(label)} min={0} value={settings.margins[side]} disabled={!onSettingsChange}
                    onChange={(next) => change({ margins: { ...settings.margins, [side]: next } })} />)}</div>
              </details>
            </section>
            <section className="space-y-3 rounded-lg border border-amber-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-green-950">{t("areaAndScaling")} </h3>
              <label className="block text-xs">{t("printArea")} <input className={inputClass} dir="ltr" value={settings.printArea} placeholder={t("printAreaPlaceholder")} spellCheck={false} disabled={!onSettingsChange}
                onChange={(e) => change({ printArea: e.currentTarget.value })} /></label>
              <label className="block text-xs">{t("scaling")} <select className={inputClass} value={mode} disabled={!onSettingsChange}
                onChange={(e) => {
                  const scalingMode = e.currentTarget.value as PrintScalingMode;
                  change({ scalingMode,
                    ...(scalingMode === "fit-width" || scalingMode === "fit-page" ? { columnBreaksBefore: [], manualColumnBreaks: false } : {}),
                    ...(scalingMode === "fit-page" ? { rowBreaksBefore: [], manualRowBreaks: false, rowsPerPage: 0 } : {}),
                  });
                }}>
                <option value="percentage">{t("percentage")} </option><option value="fit-width">{t("fitWidth")} </option><option value="fit-page">{t("fitRange")} </option>
              </select></label>
              {mode === "percentage" ? <NumberSetting label={t("printScale")} min={10} max={400} step="any" value={settings.scale} disabled={!onSettingsChange} onChange={(scale) => change({ scale })} />
                : <p className="text-xs leading-5 text-slate-600">{t("scalingHelp")} </p>}
            </section>
            <section className="space-y-3 rounded-lg border border-amber-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-green-950">{t("breaksAndHeading")} </h3>
              <label className="block text-xs">{t("bodyRowsPerPage")} <select className={inputClass} value={settings.rowsPerPage ?? 0} disabled={!onSettingsChange}
                onChange={event => {
                  const rowsPerPage = Number(event.currentTarget.value);
                  change({ rowsPerPage, repeatFirstRow: rowsPerPage > 0 ? true : settings.repeatFirstRow,
                    rowBreaksBefore: [], manualRowBreaks: false,
                    scalingMode: rowsPerPage > 0 && mode === "fit-page" ? "fit-width" : mode });
                }}>
                <option value={0}>{t("automatic")} </option><option value={10}>{t("rowsPerPageOption", { count: 10 })}</option><option value={15}>{t("rowsPerPageOption", { count: 15 })}</option><option value={20}>{t("rowsPerPageOption", { count: 20 })}</option>
              </select></label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.repeatFirstRow ?? false} disabled={!onSettingsChange} onChange={event => change({ repeatFirstRow: event.currentTarget.checked })} />{t("repeatFirstRow")} </label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.lastRowIsTotal ?? false} disabled={!onSettingsChange} onChange={event => change({ lastRowIsTotal: event.currentTarget.checked })} />{t("lastRowIsTotal")} </label>
              <p className="text-xs leading-5 text-slate-600">{t("breakScaleHelp")} </p>
              <button type="button" className={buttonClass} onClick={() => change({ rowBreaksBefore: [], columnBreaksBefore: [], rowsPerPage: 0, manualRowBreaks: false, manualColumnBreaks: false })}>{t("resetBreaks")} </button>
            </section>
            <section className="space-y-3 rounded-lg border border-amber-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-green-950">{t("textFit")} </h3>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.autoFitRowHeight ?? false} disabled={!onSettingsChange} onChange={event => change({ autoFitRowHeight: event.currentTarget.checked })} />{t("autoFitRows")} </label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.wrapTextForPrint ?? false} disabled={!onSettingsChange} onChange={event => change({ wrapTextForPrint: event.currentTarget.checked, ...(event.currentTarget.checked ? { autoFitRowHeight: true } : {}) })} />{t("wrapText")} </label>
              <p className="text-xs leading-5 text-slate-600">{t("textFitHelp")} </p>
            </section>
            <section className="space-y-3 rounded-lg border border-amber-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-green-950">{t("appearance")} </h3>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-green-800" checked={draft.showGridlines}
                onChange={(e) => { const checked = e.currentTarget.checked; setDraft((prev) => ({ ...prev, showGridlines: checked })); }} />{t("showGridlines")} </label>
              <p className="text-xs text-slate-500">{t("borderHelp")} </p>
              {(["header", "footer"] as const).map((section) => <details key={section}>
                <summary className="cursor-pointer text-sm font-medium capitalize">{t(section)}</summary>
                <div className="mt-2 space-y-2">{([["left", "left"], ["center", "center"], ["right", "right"]] as const).map(([region, label]) => <label key={region} className="block text-xs">{t(label)}
                  <input className={inputClass} dir="auto" value={draft.headerFooter[section][region]} spellCheck={false} onChange={(e) => {
                    const text = e.currentTarget.value;
                    setDraft((prev) => ({ ...prev, headerFooter: { ...prev.headerFooter, [section]: { ...prev.headerFooter[section], [region]: text } } }));
                  }} /></label>)}</div>
              </details>)}
              <details><summary className="cursor-pointer text-xs text-slate-600">{t("tokens")} </summary>
                <p className="mt-2 text-xs leading-6 text-slate-600">{t("tokenHelp")} </p>
              </details>
            </section>
            <button type="button" onClick={() => action(onPageSetup)} className={`${buttonClass} w-full`}>{t("openPageSetup")} </button>
          </fieldset>
        </aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-amber-200 bg-[#fff8dc] px-5 py-3">
        <p role="status" className="text-xs text-green-950">{busy ? t("printPreparingHelp") : t("worksheetUnchanged")}</p>
        <div className="flex gap-2"><button type="button" disabled={busy} onClick={close} className={buttonClass}>{t("cancel")} </button>
          <button type="submit" disabled={busy} className={primaryClass} style={{ color: "#ffd54f", backgroundColor: "#005500" }}>{busy ? t("preparing") : t("printerAndPrint")}</button></div>
      </footer>
    </form>
  </dialog>;
}
export function PrintDialog({ open, ...props }: PrintDialogProps) {
  return open ? <PrintDialogContent {...props} /> : null;
}
export default PrintDialog;
