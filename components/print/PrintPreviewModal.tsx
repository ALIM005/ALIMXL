"use client";

// components/print/PrintPreviewModal.tsx
// Shared screen preview for standalone and embedded use.
// Parent owns prepared pages, committed settings and print actions.

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  getPrintablePageDimensions,
  getSafePrintMargins,
  PRINT_PX_PER_MM,
} from "../../lib/print-pages";

import type {
  PrintRenderCell,
  PrintRenderPage,
} from "../../lib/print-render";

import type { PrintPageSetup } from "./PageSetupDialog";

import PrintHeaderFooter from "./PrintHeaderFooter";
import { usePrintI18n } from "./usePrintI18n";
import PrintLanguageSetting from "./PrintLanguageSetting";
import { DEFAULT_PRINT_LANGUAGE, getPrintTranslator, formatPrintNumber, formatPrintPercent, type PrintLanguage } from "../../lib/print-i18n";
import { collectPrintBorders } from "../../lib/print-borders";

import type {
  PrintHeaderFooterSettings,
} from "./PrintHeaderFooter";

export interface PrintPreviewModalProps {
  open: boolean;

  /**
   * Immutable prepared pages using the supplied settings.
   * Page numbers must start at 1 and be consecutive.
   */
  pages: PrintRenderPage[];
  /** Unpaginated snapshot only for the bounded drag editor. */
  overview?: PrintRenderPage;
  overviewMessage?: string;

  settings: PrintPageSetup;
  headerFooter: PrintHeaderFooterSettings;

  sheetName?: string;
  workbookName?: string;

  /** One timestamp shared by the complete session. */
  printTime: Date;

  showGridlines?: boolean;

  onClose: () => void;
  onPageSetup?: () => void;
  onPrint?: () => void;
}

export type PrintPreviewPaneProps = Omit<
  PrintPreviewModalProps,
  "open" | "onClose" | "onPageSetup" | "onPrint"
>;

interface PagePreviewProps {
  language?: PrintLanguage;
  page: PrintRenderPage;
  totalPages: number;

  settings: PrintPageSetup;
  headerFooter: PrintHeaderFooterSettings;

  sheetName: string;
  workbookName: string;
  printTime: Date;
  showGridlines: boolean;

  /** Screen zoom only; does not change print scale. */
  zoom?: number;
}

interface NavigationState {
  pages: PrintRenderPage[];
  index: number;
}

type ZoomMode = "fit-page" | "fit-width" | "manual";

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-green-700";

const BUTTON_CLASS =
  "inline-flex min-h-9 items-center justify-center " +
  "rounded-md border border-amber-200 bg-white px-3 py-2 " +
  "text-sm font-medium text-slate-800 hover:bg-slate-100 " +
  "disabled:cursor-not-allowed disabled:opacity-40 " +
  FOCUS_CLASS;

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-9 items-center justify-center " +
  "rounded-md bg-[#005500] px-4 py-2 text-sm font-medium " +
  "text-white hover:bg-green-900 " +
  "disabled:cursor-not-allowed disabled:opacity-40 " +
  FOCUS_CLASS;

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200];

function clampZoom(value: number): number {
  return Math.min(
    2,
    Math.max(0.1, Number.isFinite(value) ? value : 1),
  );
}

function PreviewCell({
  cell,
  showGridlines,
}: {
  cell: PrintRenderCell;
  showGridlines: boolean;
}) {
  const style = cell.style;
  const borderWidth = Number.isFinite(style?.borderWidth)
    ? Math.max(0, style?.borderWidth ?? 2) : 2;
  const indent = Number.isFinite(style?.indent) ? Math.max(0, style?.indent ?? 0) : 0;
  const vertical = style?.verticalAlign || "top";
  return (
    <div
      data-cell-key={cell.key}
      style={{
        position: "absolute",
        left: cell.x,
        top: cell.y,
        width: cell.width,
        height: cell.height,
        boxSizing: "border-box",
        overflow: "hidden",
        // Gridlines do not consume cell geometry; explicit borders do.
        outline: showGridlines && !Object.values(style?.borders ?? {}).some(Boolean)
          ? "1px solid #cbd5e1" : undefined,
        outlineOffset: -1,
        color: style?.color || "#0f172a",
        backgroundColor: style?.bg || "#ffffff",
        fontFamily: style?.fontFamily || "Arial, sans-serif",
        fontSize: cell.fontSize,
        fontWeight: style?.bold ? 700 : 400,
        fontStyle: style?.italic ? "italic" : "normal",
        lineHeight: cell.lineHeight,
      }}
    >
      <div
        dir={style?.textDirection || "ltr"}
        style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: vertical === "middle" ? "center" : vertical === "bottom" ? "flex-end" : "flex-start",
          width: "100%",
          height: "100%",
          paddingTop: cell.padding + (style?.borders?.top ? borderWidth : 0),
          paddingRight: cell.padding + (style?.borders?.right ? borderWidth : 0),
          paddingBottom: cell.padding + (style?.borders?.bottom ? borderWidth : 0),
          paddingLeft: (indent > 0 ? 8 + indent * 12 : cell.padding) + (style?.borders?.left ? borderWidth : 0),
          overflow: "hidden",
          textAlign: style?.align || (style?.textDirection === "rtl" ? "right" : "left"),
          unicodeBidi: "isolate",
        }}
      >
        <div style={{
          flexShrink: 0,
          whiteSpace: "pre",
          textDecoration: style?.underline ? "underline" : "none",
        }}>
          {cell.textLines.join("\n")}
        </div>
      </div>
    </div>
  );
}

export function PagePreview({
  page,
  totalPages,
  settings,
  headerFooter,
  sheetName,
  workbookName,
  printTime,
  showGridlines,
  zoom = 1,
  language = DEFAULT_PRINT_LANGUAGE,
}: PagePreviewProps) {
  const t = getPrintTranslator(language);
  const paper = getPrintablePageDimensions(
    settings.paperSize,
    settings.orientation,
  );

  const margins = getSafePrintMargins(settings.margins);

  const width = paper.width * PRINT_PX_PER_MM;
  const height = paper.height * PRINT_PX_PER_MM;

  const top = margins.top * PRINT_PX_PER_MM;
  const right = margins.right * PRINT_PX_PER_MM;
  const bottom = margins.bottom * PRINT_PX_PER_MM;
  const left = margins.left * PRINT_PX_PER_MM;

  const contentWidth = width - left - right;
  const contentHeight = height - top - bottom;

  const screenZoom = clampZoom(zoom);

  const contentScale =
    Math.min(
      400,
      Math.max(
        10,
        Number.isFinite(settings.scale)
          ? settings.scale
          : 100,
      ),
    ) / 100;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(contentWidth) ||
    !Number.isFinite(contentHeight) ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return (
      <p
        role="alert"
        className="rounded-md bg-white p-4 text-sm text-red-800"
      >
        {t("invalidMargins")}
      </p>
    );
  }

  if (
    !Number.isFinite(page.totalWidth) ||
    !Number.isFinite(page.totalHeight) ||
    page.totalWidth < 0 ||
    page.totalHeight < 0
  ) {
    return (
      <p
        role="alert"
        className="rounded-md bg-white p-4 text-sm text-red-800"
      >
        {t("invalidDimensions")}
      </p>
    );
  }


  return (
    <div
      className="awm-print-page-wrapper space-y-3"
      style={{ width: width * screenZoom }}
    >


      <div
        style={{
          position: "relative",
          width: width * screenZoom,
          height: height * screenZoom,
          flexShrink: 0,
        }}
      >
        <div
          className="awm-print-paper"
          role="group"
          aria-label={t("previewPageLabel", { page: page.page.pageNumber })}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            overflow: "hidden",
            direction: "ltr",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            fontFamily: "Arial, sans-serif",
            boxShadow: "0 2px 12px rgb(0 0 0 / 18%)",
            transform: `scale(${screenZoom})`,
            transformOrigin: "top left",
          }}
        >
          {top > 0 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left,
                width: contentWidth,
                height: top,
                overflow: "hidden",
              }}
            >
              <PrintHeaderFooter
                position="header"
                templates={headerFooter.header}
                pageNumber={page.page.pageNumber}
                totalPages={totalPages}
                sheetName={sheetName}
                workbookName={workbookName}
                printTime={printTime}
                height={top}
              />
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top,
              left,
              width: contentWidth,
              height: contentHeight,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "relative",
                width: page.totalWidth,
                height: page.totalHeight,
                transform: `scale(${contentScale})`,
                transformOrigin: "top left",
              }}
            >
              {page.rows.map((row) => (
                <Fragment key={row.row}>
                  {row.cells.map((cell) => (
                    <PreviewCell
                      key={cell.key}
                      cell={cell}
                      showGridlines={showGridlines}
                    />
                  ))}
                </Fragment>
              ))}
              {collectPrintBorders(page).map((edge) => (
                <div key={edge.key} aria-hidden="true" style={{
                  position: "absolute", pointerEvents: "none", zIndex: 2,
                  left: edge.axis === "vertical" ? Math.max(0, Math.min(page.totalWidth - edge.width, edge.x - edge.width / 2)) : edge.x,
                  top: edge.axis === "horizontal" ? Math.max(0, Math.min(page.totalHeight - edge.width, edge.y - edge.width / 2)) : edge.y,
                  width: edge.axis === "horizontal" ? edge.length : 0,
                  height: edge.axis === "vertical" ? edge.length : 0,
                  borderTop: edge.axis === "horizontal" ? `${edge.width}px ${edge.style} ${edge.color}` : undefined,
                  borderLeft: edge.axis === "vertical" ? `${edge.width}px ${edge.style} ${edge.color}` : undefined,
                }} />
              ))}
            </div>
          </div>

          {bottom > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left,
                width: contentWidth,
                height: bottom,
                overflow: "hidden",
              }}
            >
              <PrintHeaderFooter
                position="footer"
                templates={headerFooter.footer}
                pageNumber={page.page.pageNumber}
                totalPages={totalPages}
                sheetName={sheetName}
                workbookName={workbookName}
                printTime={printTime}
                height={bottom}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Shared preview body.
 * Does not open a dialog and does not print.
 */
function PageDiagnostics({ page, settings }: { page: PrintRenderPage; settings: PrintPageSetup }) {
  const { t } = usePrintI18n();
  const issues: string[] = [];
  let count = 0;
  let images = 0;
  let links = 0;
  for (const row of page.rows) for (const cell of row.cells) {
    if (cell.hasHorizontalOverflow || cell.hasVerticalOverflow) {
      count += 1;
      if (issues.length < 30) issues.push(`${cell.key}: ${[
        cell.hasHorizontalOverflow ? t("horizontalOverflow") : "",
        cell.hasVerticalOverflow ? t("verticalOverflow") : "",
      ].filter(Boolean).join("; ")}`);
    }
    if (cell.hasImage) images += 1;
    if (cell.hasHyperlink) links += 1;
  }
  const paper = getPrintablePageDimensions(settings.paperSize, settings.orientation);
  const margins = getSafePrintMargins(settings.margins);
  const scale = settings.scale / 100;
  const exceeds = page.totalWidth * scale > (paper.width - margins.left - margins.right) * PRINT_PX_PER_MM + 0.5
    || page.totalHeight * scale > (paper.height - margins.top - margins.bottom) * PRINT_PX_PER_MM + 0.5;
  if (!count && !images && !links && !exceeds) return null;
  return <details className="awm-print-warning mx-3 my-1 max-h-28 shrink-0 overflow-auto rounded border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-950">
    <summary className="cursor-pointer">{count ? t("overflowCount", { count }) : t("pageLimitations")} — {t("details")}</summary>
    <ul className="list-disc space-y-1 py-2 pl-5">
      {issues.map((issue) => <li key={issue}>{issue}</li>)}
      {count > issues.length && <li>{t("moreCells", { count: count - issues.length })}</li>}
      {exceeds && <li>{t("contentExceeds")}</li>}
      {images > 0 && <li>{t("imagesNotPrinted", { count: images })}</li>}
      {links > 0 && <li>{t("linksTextOnly")}</li>}
      {count > 0 && <li>{t("overflowHelp")}</li>}
    </ul>
  </details>;
}

export function PrintPreviewPane({
  pages,
  settings,
  headerFooter,
  sheetName = "",
  workbookName = "",
  printTime,
  showGridlines = true,
}: PrintPreviewPaneProps) {
  const { t, language, dir } = usePrintI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [navigation, setNavigation] =
    useState<NavigationState>(() => ({
      pages,
      index: 0,
    }));

  const [zoomMode, setZoomMode] =
    useState<ZoomMode>("fit-page");

  const [manualZoom, setManualZoom] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const id = useId();
  const viewportId = `${id}-viewport`;

  const requestedIndex =
    navigation.pages === pages ? navigation.index : 0;

  const safeIndex = Math.min(
    Math.max(0, requestedIndex),
    Math.max(0, pages.length - 1),
  );

  const pageNumbersValid = pages.every(
    (page, index) => page.page.pageNumber === index + 1,
  );

  const printTimeValid =
    printTime instanceof Date &&
    Number.isFinite(printTime.getTime());

  const previewError = !pageNumbersValid
    ? t("invalidPageList")
    : !printTimeValid
      ? t("invalidTimestamp")
      : null;

  const currentPage = previewError
    ? undefined
    : pages[safeIndex];

  const paper = getPrintablePageDimensions(
    settings.paperSize,
    settings.orientation,
  );

  const paperWidth = paper.width * PRINT_PX_PER_MM;
  const paperHeight = paper.height * PRINT_PX_PER_MM;

  // The viewport uses 24px padding on both sides.
  const fitZoom =
    Number.isFinite(paperWidth) &&
    paperWidth > 0 &&
    viewportWidth > 48
      ? clampZoom((viewportWidth - 48) / paperWidth)
      : 1;

  const fitPageZoom = paperWidth > 0 && paperHeight > 0 && viewportWidth > 48 && viewportHeight > 48
    ? clampZoom(Math.min((viewportWidth - 48) / paperWidth, (viewportHeight - 48) / paperHeight))
    : 1;
  const zoom = zoomMode === "fit-page" ? fitPageZoom
    : zoomMode === "fit-width" ? fitZoom : clampZoom(manualZoom);

  const zoomPercent = Math.round(zoom * 100);
  const hasPreset = ZOOM_PRESETS.includes(zoomPercent);

  useEffect(() => {
    const viewport = scrollRef.current;

    if (!viewport) return;

    const measure = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      setViewportHeight((previous) => previous === height ? previous : height);

      setViewportWidth((previous) =>
        previous === width ? previous : width,
      );
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(viewport);

      return () => observer.disconnect();
    }

    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current;

    if (viewport) {
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
    }
  }, [safeIndex, pages]);

  function goToPage(index: number) {
    if (
      pages.length === 0 ||
      previewError ||
      !Number.isFinite(index)
    ) {
      return;
    }

    setNavigation({
      pages,
      index: Math.min(
        pages.length - 1,
        Math.max(0, Math.trunc(index)),
      ),
    });
  }

  function changeZoom(nextZoom: number) {
    setManualZoom(clampZoom(nextZoom));
    setZoomMode("manual");
  }

  return (
    <div lang={language} dir={dir} className="flex h-full min-h-0 min-w-0 flex-col">
      <nav
        aria-label={t("navigation")}
        className={
          "flex shrink-0 flex-wrap items-center justify-between " +
          "gap-3 border-b border-slate-300 bg-slate-100 p-3"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title={t("firstPage")}
            aria-label={t("firstPage")}
            aria-controls={viewportId}
            disabled={!currentPage || safeIndex === 0}
            onClick={() => goToPage(0)}
            className={BUTTON_CLASS}
          >
            «
          </button>

          <button
            type="button"
            title={t("previousPage")}
            aria-label={t("previousPage")}
            aria-controls={viewportId}
            disabled={!currentPage || safeIndex === 0}
            onClick={() => goToPage(safeIndex - 1)}
            className={BUTTON_CLASS}
          >
            ‹
          </button>

          <label className="flex items-center gap-2 text-xs">
            <span>{t("page")}</span>

            <input
              key={`${safeIndex}-${pages.length}`}
              type="number" dir="ltr"
              min={1}
              max={Math.max(1, pages.length)}
              step={1}
              defaultValue={currentPage ? safeIndex + 1 : ""}
              disabled={!currentPage}
              aria-label={t("goToPage")}
              aria-controls={viewportId}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              onBlur={(event) => {
                const input = event.currentTarget;
                const requestedPage = input.valueAsNumber;

                if (
                  Number.isInteger(requestedPage) &&
                  requestedPage >= 1 &&
                  requestedPage <= pages.length
                ) {
                  goToPage(requestedPage - 1);
                } else {
                  input.value = currentPage
                    ? String(safeIndex + 1)
                    : "";
                }
              }}
              className={
                "h-9 w-16 rounded-md border border-slate-300 " +
                "bg-white px-2 text-center text-sm " +
                "disabled:opacity-40 " +
                FOCUS_CLASS
              }
            />

            <span>/ {formatPrintNumber(language, pages.length)}</span>
          </label>

          <button
            type="button"
            title={t("nextPage")}
            aria-label={t("nextPage")}
            aria-controls={viewportId}
            disabled={
              !currentPage || safeIndex >= pages.length - 1
            }
            onClick={() => goToPage(safeIndex + 1)}
            className={BUTTON_CLASS}
          >
            ›
          </button>

          <button
            type="button"
            title={t("lastPage")}
            aria-label={t("lastPage")}
            aria-controls={viewportId}
            disabled={
              !currentPage || safeIndex >= pages.length - 1
            }
            onClick={() => goToPage(pages.length - 1)}
            className={BUTTON_CLASS}
          >
            »
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={t("zoomOut")}
            disabled={!currentPage || zoom <= 0.1}
            onClick={() => changeZoom(zoom - 0.1)}
            className={BUTTON_CLASS}
          >
            −
          </button>

          <select
            aria-label={t("previewZoom")}
            disabled={!currentPage}
            value={
              zoomMode !== "manual"
                ? zoomMode
                : String(zoomPercent)
            }
            onChange={(event) => {
              const selected = event.currentTarget.value;

              if (selected === "fit-width" || selected === "fit-page") {
                setZoomMode(selected);
              } else {
                changeZoom(Number(selected) / 100);
              }
            }}
            className={
              "h-9 rounded-md border border-slate-300 " +
              "bg-white px-2 text-xs disabled:opacity-40 " +
              FOCUS_CLASS
            }
          >
            <option value="fit-page">{t("fitPageView")}{zoomMode === "fit-page" ? ` (${formatPrintPercent(language, zoomPercent)})` : ""}</option>
            <option value="fit-width">{t("fitWidthView")}{zoomMode === "fit-width" ? ` (${formatPrintPercent(language, zoomPercent)})` : ""}</option>

            {!hasPreset && zoomMode === "manual" && (
              <option value={String(zoomPercent)}>
                {formatPrintPercent(language, zoomPercent)}
              </option>
            )}

            {ZOOM_PRESETS.map((percent) => (
              <option key={percent} value={String(percent)}>
                {formatPrintPercent(language, percent)}
              </option>
            ))}
          </select>

          <button
            type="button"
            aria-label={t("zoomIn")}
            disabled={!currentPage || zoom >= 2}
            onClick={() => changeZoom(zoom + 0.1)}
            className={BUTTON_CLASS}
          >
            +
          </button>
        </div>
      </nav>

      {currentPage && <PageDiagnostics page={currentPage} settings={settings} />}
      <div
        ref={scrollRef}
        id={viewportId}
        role="region"
        aria-label={t("preview")}
        tabIndex={0}
        className={
          "min-h-0 flex-1 overflow-auto bg-slate-200 p-6 " +
          "focus-visible:outline-2 " +
          "focus-visible:-outline-offset-2 " +
          "focus-visible:outline-green-700"
        }
      >
        {previewError ? (
          <p
            role="alert"
            className="rounded-md bg-white p-5 text-sm text-red-800"
          >
            {previewError}
          </p>
        ) : currentPage ? (
          <div className="mx-auto w-max">
            <PagePreview
              page={currentPage}
              totalPages={pages.length}
              settings={settings}
              headerFooter={headerFooter}
              sheetName={sheetName}
              workbookName={workbookName}
              printTime={printTime}
              showGridlines={showGridlines}
              zoom={zoom}
              language={language}
            />
          </div>
        ) : (
          <p
            role="status"
            className="rounded-md bg-white p-5 text-center text-sm"
          >
            {t("noPages")}
          </p>
        )}
      </div>

      <div
        role="status"
        aria-atomic="true"
        className={
          "shrink-0 border-t border-slate-300 " +
          "bg-slate-50 px-4 py-2 text-xs text-slate-600"
        }
      >
        {previewError
          ? t("previewNotReady")
          : currentPage
            ? `Page ${safeIndex + 1} of ${pages.length} · Preview zoom ${formatPrintPercent(language, zoomPercent)} · Print scale ${Number(settings.scale.toFixed(2))}%`
            : t("noPages")}
      </div>
    </div>
  );
}

function PrintPreviewContent({
  onClose,
  onPageSetup,
  onPrint,
  ...previewProps
}: Omit<PrintPreviewModalProps, "open">) {
  const { t, language, dir } = usePrintI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const { pages, settings, printTime } = previewProps;

  const canRequestPrint =
    pages.length > 0 &&
    pages.every(
      (page, index) => page.page.pageNumber === index + 1,
    ) &&
    printTime instanceof Date &&
    Number.isFinite(printTime.getTime());

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      lang={language} dir={dir}
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      style={{ maxWidth: 1400 }}
      className={
        "m-auto h-[94dvh] max-h-[94dvh] w-[96vw] " +
        "overflow-hidden rounded-xl border border-slate-300 " +
        "bg-white p-0 text-slate-900 shadow-2xl " +
        "backdrop:bg-black/50 print:hidden"
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <header
          className={
            "flex shrink-0 flex-wrap items-center justify-between " +
            "gap-3 border-b border-slate-200 px-4 py-3"
          }
        >
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold"
            >
              {t("preview")}
            </h2>

            <p
              id={descriptionId}
              className="mt-1 text-xs text-slate-600"
            >
              {settings.paperSize}
              {" · "}
              {t(settings.orientation)}
              {" · "}
              {t("scaleValue", { scale: formatPrintPercent(language, settings.scale) })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintLanguageSetting />
            {onPrint && (
              <button
                type="button"
                disabled={!canRequestPrint}
                onClick={onPrint}
                className={PRIMARY_BUTTON_CLASS}
                style={{ color: "#ffd54f", backgroundColor: "#005500" }}
              >
                {t("printOptions")}
              </button>
            )}

            {onPageSetup && (
              <button
                type="button"
                onClick={onPageSetup}
                className={BUTTON_CLASS}
              >
                {t("pageSetup")}
              </button>
            )}

            <button
              type="button"
              autoFocus
              onClick={onClose}
              className={BUTTON_CLASS}
            >
              {t("close")}
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <PrintPreviewPane {...previewProps} />
        </div>

        <footer
          className={
            "shrink-0 border-t border-slate-200 " +
            "bg-white px-4 py-3 text-xs leading-5 text-slate-600"
          }
        >
          {t("previewLimitations")}
        </footer>
      </div>
    </dialog>
  );
}

export function PrintPreviewModal({
  open,
  ...props
}: PrintPreviewModalProps) {
  if (!open) return null;

  return <PrintPreviewContent {...props} />;
}

export default PrintPreviewModal;