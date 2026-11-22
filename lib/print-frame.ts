// Same-page print transport. No popup/tab and no worksheet mutation.
import { makePrintError } from "./print-i18n";
let active = false;
const LOAD_TIMEOUT_MS = 15000;
export interface PrintFrameOptions { title: string; fontCss?: string; }
/** Resolves when the print dialog closes, not confirmation that paper was printed. */
export async function runPrintFrame(html: string, options: PrintFrameOptions): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined" || !document.body) throw makePrintError("printUnavailable");
  if (active) throw makePrintError("printInProgress");
  const frame = document.createElement("iframe");
  const previousFocus = document.activeElement;
  frame.setAttribute("data-alimxl-print-frame", ""); frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", options.title); frame.tabIndex = -1;
  // display:none can prevent a browser from laying out or printing the document.
  Object.assign(frame.style, { position: "fixed", left: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0", pointerEvents: "none" });
  let detachPrintListeners: (() => void) | undefined;
  let restoreFocus = false;
  active = true;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { clear(); reject(makePrintError("printTimedOut")); }, LOAD_TIMEOUT_MS);
      const clear = () => { window.clearTimeout(timer); frame.removeEventListener("load", loaded); frame.removeEventListener("error", failed); };
      const loaded = () => { clear(); resolve(); };
      const failed = () => { clear(); reject(makePrintError("printFrameFailed")); };
      frame.addEventListener("load", loaded); frame.addEventListener("error", failed); frame.srcdoc = html;
      try { document.body.appendChild(frame); } catch (error) { clear(); reject(error); }
    });
    const win = frame.contentWindow, doc = frame.contentDocument;
    if (!win || !doc?.body) throw makePrintError("printFrameFailed");
    doc.title = options.title;
    const base = doc.createElement("base"); base.href = document.baseURI; doc.head.prepend(base);
    if (options.fontCss) { const style = doc.createElement("style"); style.textContent = options.fontCss; doc.head.appendChild(style); }
    void doc.body.getBoundingClientRect();
    if (doc.fonts) await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(makePrintError("printTimedOut")), LOAD_TIMEOUT_MS);
      doc.fonts.ready.then(() => { window.clearTimeout(timer); resolve(); }, () => { window.clearTimeout(timer); reject(makePrintError("fontsFailed")); });
    });
    await new Promise<void>(resolve => window.setTimeout(resolve, 100));
    if (!frame.isConnected) throw makePrintError("printFrameFailed");
    void doc.body.getBoundingClientRect();
    await new Promise<void>((resolve, reject) => {
      let finished = false, started = false, sawBlur = false;
      let focusTimer: number | undefined;
      const media = typeof win.matchMedia === "function" ? win.matchMedia("print") : undefined;
      const finish = () => { if (finished) return; finished = true; restoreFocus = true; resolve(); };
      const blur = () => { if (started) sawBlur = true; };
      const focus = () => {
        if (!started || !sawBlur) return;
        if (focusTimer !== undefined) window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(() => { if (document.hasFocus() && !media?.matches) finish(); }, 750);
      };
      let sawPrintMedia = false;
      const mediaChange = (event: MediaQueryListEvent) => { if (event.matches) sawPrintMedia = true; else if (started && sawPrintMedia) finish(); };
      win.addEventListener("afterprint", finish); window.addEventListener("afterprint", finish);
      window.addEventListener("blur", blur); window.addEventListener("focus", focus); media?.addEventListener?.("change", mediaChange);
      detachPrintListeners = () => {
        win.removeEventListener("afterprint", finish); window.removeEventListener("afterprint", finish);
        window.removeEventListener("blur", blur); window.removeEventListener("focus", focus); media?.removeEventListener?.("change", mediaChange);
        if (focusTimer !== undefined) window.clearTimeout(focusTimer);
      };
      try { restoreFocus = true; win.focus(); started = true; win.print(); } catch (error) { reject(error); }
      // No blind timeout removes a snapshot while a print dialog may still be open.
    });
  } finally {
    detachPrintListeners?.(); frame.remove(); active = false;
    if (restoreFocus && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  }
}
