"use client";

// Prepares embedded preview data after commit, never during render.
import { useEffect, useMemo, useState } from "react";
import type { PrintDialogOptions } from "./PrintDialog";
import type { PrintPageSetup } from "./PageSetupDialog";
import PrintBreakEditor from "./PrintBreakEditor";
import { usePrintI18n } from "./usePrintI18n";
import { getPrintErrorMessage } from "../../lib/print-i18n";
import {
  PrintPreviewPane,
  type PrintPreviewPaneProps,
} from "./PrintPreviewModal";

interface LivePrintPreviewProps {
  options: PrintDialogOptions;
  onPrepared?: (session: PrintPreviewPaneProps, options: PrintDialogOptions) => void;
  onSettingsChange?: (settings: PrintPageSetup) => void;
  prepareSession: (
    options?: PrintDialogOptions,
  ) => PrintPreviewPaneProps;
}

type PreparationState = {
  options: PrintDialogOptions;
  prepareSession: LivePrintPreviewProps["prepareSession"];
} & (
  | { status: "ready"; session: PrintPreviewPaneProps }
  | { status: "error"; message: unknown }
);

export default function LivePrintPreview({
  options,
  prepareSession,
  onSettingsChange,
  onPrepared,
}: LivePrintPreviewProps) {
  const { t, language } = usePrintI18n();
  const [editingBreaks, setEditingBreaks] = useState(false);
  const showGridlines = options.showGridlines;
  const headerLeft = options.headerFooter.header.left;
  const headerCenter = options.headerFooter.header.center;
  const headerRight = options.headerFooter.header.right;
  const footerLeft = options.headerFooter.footer.left;
  const footerCenter = options.headerFooter.footer.center;
  const footerRight = options.headerFooter.footer.right;

  // PrintDialog supplies a fresh copy on render. Compare scalar fields,
  // not that fresh object's identity, to avoid preparation loops.
  const stableOptions = useMemo<PrintDialogOptions>(() => ({
    showGridlines,
    headerFooter: {
      header: {
        left: headerLeft,
        center: headerCenter,
        right: headerRight,
      },
      footer: {
        left: footerLeft,
        center: footerCenter,
        right: footerRight,
      },
    },
  }), [
    showGridlines,
    headerLeft,
    headerCenter,
    headerRight,
    footerLeft,
    footerCenter,
    footerRight,
  ]);

  const [result, setResult] = useState<PreparationState | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    // Debounce typing and keep preparation out of the render callback.
    const timer = window.setTimeout(() => {
      if (!active) return;

      try {
        const session = prepareSession({
          showGridlines: stableOptions.showGridlines,
          headerFooter: {
            header: { ...stableOptions.headerFooter.header },
            footer: { ...stableOptions.headerFooter.footer },
          },
        });

        if (active) {
          onPrepared?.(session, stableOptions);
          setResult({
            options: stableOptions,
            prepareSession,
            status: "ready",
            session,
          });
        }
      } catch (error: unknown) {
        if (active) {
          setResult({
            options: stableOptions,
            prepareSession,
            status: "error",
            message: error,
          });
        }
      }
    }, 150);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [stableOptions, prepareSession, retry, onPrepared]);

  // Do not display old pages under newly edited options/settings.
  const current = result &&
    result.options === stableOptions &&
    result.prepareSession === prepareSession
      ? result
      : null;

  if (!current) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-full min-h-60 items-center justify-center p-6 text-center text-sm text-slate-600"
      >
        {t("loadingPreview")}
      </div>
    );
  }

  if (current.status === "error") {
    return (
      <div className="p-5">
        <p
          role="alert"
          className="wrap-break-word rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {getPrintErrorMessage(current.message, language)}
        </p>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setRetry((previous) => previous + 1);
          }}
          className="mt-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return <div className="flex h-full min-h-0 flex-col">
    {onSettingsChange && <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs">
      <button type="button" onClick={() => setEditingBreaks(value => !value)} className="rounded border border-green-800 bg-white px-3 py-1 text-green-950">
        {editingBreaks ? t("paperPreview") : t("openBreakEditor")}
      </button>
      <span>{editingBreaks ? t("breakEditorHelp") : t("openEditorHint")}</span>
    </div>}
    <div className="min-h-0 flex-1">
      {editingBreaks && onSettingsChange ? <PrintBreakEditor
        overview={current.session.overview} message={current.session.overviewMessage}
        pages={current.session.pages} settings={current.session.settings} onChange={onSettingsChange}
      /> : <PrintPreviewPane {...current.session} />}
    </div>
  </div>;
}
