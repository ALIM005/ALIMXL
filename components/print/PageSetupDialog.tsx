"use client";

// components/print/PageSetupDialog.tsx
// Local page-setup draft only.
// Parent owns committed settings and print-session preparation.

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  PrintMargins,
  PrintOrientation,
  PrintPaperSize,
  PrintScalingMode,
} from "../../lib/print-pages";

import {
  createCellKey,
  getPrintablePageDimensions,
  normalizePrintRange,
} from "../../lib/print-pages";

import { usePrintI18n } from "./usePrintI18n";
import PrintLanguageSetting from "./PrintLanguageSetting";
import { makePrintError, PrintMessageError, getPrintErrorMessage, getPrintPaperLabel } from "../../lib/print-i18n";
export interface PrintPageSetup {
  paperSize: PrintPaperSize;
  orientation: PrintOrientation;
  margins: PrintMargins;
  scale: number;
  printArea: string;
  scalingMode?: PrintScalingMode;
  rowBreaksBefore?: number[];
  columnBreaksBefore?: number[];
  repeatFirstRow?: boolean;
  rowsPerPage?: number;
  manualRowBreaks?: boolean;
  manualColumnBreaks?: boolean;
  lastRowIsTotal?: boolean;
  autoFitRowHeight?: boolean;
  wrapTextForPrint?: boolean;
}

export interface PageSetupDialogProps {
  open: boolean;
  value: PrintPageSetup;

  /**
   * Synchronously commit validated settings.
   * onClose is requested after this callback returns.
   */
  onApply: (settings: PrintPageSetup) => void;

  onClose: () => void;
}

interface ValidationError {
  cause: unknown;
}

interface DialogContentProps {
  initialValue: PrintPageSetup;
  onApply: PageSetupDialogProps["onApply"];
  onClose: PageSetupDialogProps["onClose"];
}

const PAPER_ORDER: readonly PrintPaperSize[] = [
  "A4",
  "Letter",
  "Legal",
  "A5",
  "Executive",
];

const MARGIN_FIELDS: ReadonlyArray<{
  name: keyof PrintMargins;
  label: "top" | "right" | "bottom" | "left";
}> = [
  { name: "top", label: "top" },
  { name: "right", label: "right" },
  { name: "bottom", label: "bottom" },
  { name: "left", label: "left" },
];

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-green-800";

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 " +
  "bg-white px-3 py-2 text-sm text-slate-900 " +
  "focus:border-green-800 focus:outline-none " +
  "focus:ring-2 focus:ring-amber-200";

const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center " +
  "rounded-md border border-slate-300 bg-white px-4 py-2 " +
  "text-sm font-medium text-slate-700 hover:bg-slate-100 " +
  FOCUS_CLASS;

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center " +
  "rounded-md bg-green-800 px-5 py-2 text-sm font-semibold " +
  "text-white hover:bg-green-900 " +
  FOCUS_CLASS;

function copySettings(
  settings: PrintPageSetup,
): PrintPageSetup {
  return {
    ...settings,
    rowBreaksBefore: [...(settings.rowBreaksBefore ?? [])],
    columnBreaksBefore: [...(settings.columnBreaksBefore ?? [])],
    paperSize: settings.paperSize,
    orientation: settings.orientation,
    margins: { ...settings.margins },
    scale: settings.scale,
    printArea: settings.printArea,
    scalingMode: settings.scalingMode ?? "percentage",
  };
}

function readString(
  data: FormData,
  name: string,
): string {
  const value = data.get(name);

  if (typeof value !== "string") {
    throw makePrintError("invalidInput");
  }

  return value.trim();
}

function readNumber(
  data: FormData,
  name: string,
): number {
  const raw = readString(data, name);

  if (!raw) {
    throw makePrintError("invalidInput");
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw makePrintError("invalidInput");
  }

  return value;
}

function readPrintArea(data: FormData): string {
  const input = readString(data, "printArea");

  if (!input) return "";

  const range = normalizePrintRange(input);

  if (!range) {
    throw makePrintError("invalidPrintArea");
  }

  const start = createCellKey(range.r1, range.c1);
  const end = createCellKey(range.r2, range.c2);

  return start === end ? start : `${start}:${end}`;
}

function readScalingMode(data: FormData): PrintScalingMode {
  const mode = readString(data, "scalingMode");
  if (mode !== "percentage" && mode !== "fit-width" && mode !== "fit-page") {
    throw makePrintError("invalidInput");
  }
  return mode;
}

function readSettings(data: FormData): PrintPageSetup {
  const paperValue = readString(data, "paperSize");

  const paperSize = PAPER_ORDER.find(
    (paper) => paper === paperValue,
  );

  if (!paperSize) {
    throw makePrintError("invalidPaper");
  }

  const orientationValue = readString(
    data,
    "orientation",
  );

  if (
    orientationValue !== "portrait" &&
    orientationValue !== "landscape"
  ) {
    throw makePrintError("invalidPaper");
  }

  const orientation: PrintOrientation =
    orientationValue;

  const margins: PrintMargins = {
    top: readNumber(data, "top"),
    right: readNumber(data, "right"),
    bottom: readNumber(data, "bottom"),
    left: readNumber(data, "left"),
  };

  if (
    Object.values(margins).some(
      (margin) => margin < 0,
    )
  ) {
    throw makePrintError("invalidMargins");
  }

  const paper = getPrintablePageDimensions(
    paperSize,
    orientation,
  );

  const availableWidth =
    paper.width - margins.left - margins.right;

  const availableHeight =
    paper.height - margins.top - margins.bottom;

  if (
    !Number.isFinite(paper.width) ||
    !Number.isFinite(paper.height) ||
    !Number.isFinite(availableWidth) ||
    !Number.isFinite(availableHeight) ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    throw makePrintError("invalidMargins");
  }

  const scale = readNumber(data, "scale");

  if (
    scale < 10 ||
    scale > 400
  ) {
    throw makePrintError("invalidScale", { min: 10, max: 400 });
  }

  return {
    paperSize,
    orientation,
    margins,
    scale,
    printArea: readPrintArea(data),
    scalingMode: readScalingMode(data),
  };
}

function PageSetupDialogContent({
  initialValue,
  onApply,
  onClose,
}: DialogContentProps) {
  const { t, language, dir } = usePrintI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Capture committed values once per opening.
  const [startingValue] = useState(
    () => copySettings(initialValue),
  );

  const [paperSize, setPaperSize] =
    useState<PrintPaperSize>(startingValue.paperSize);

  const [orientation, setOrientation] =
    useState<PrintOrientation>(
      startingValue.orientation,
    );

  const [error, setError] =
    useState<ValidationError | null>(null);

  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const areaHelpId = `${id}-area-help`;
  const scaleHelpId = `${id}-scale-help`;
  const marginHelpId = `${id}-margin-help`;
  const paperHelpId = `${id}-paper-help`;

  const paper = getPrintablePageDimensions(
    paperSize,
    orientation,
  );

  const diagramScale =
    160 / Math.max(paper.width, paper.height);

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

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    let settings: PrintPageSetup;

    try {
      settings = { ...startingValue, ...readSettings(new FormData(event.currentTarget)) };
    } catch (cause: unknown) {
      if (!(cause instanceof RangeError) && !(cause instanceof PrintMessageError)) {
        throw cause;
      }

      setError({ cause });
      return;
    }

    if (settings.scalingMode !== startingValue.scalingMode) {
      if (settings.scalingMode === "fit-width" || settings.scalingMode === "fit-page") {
        settings.columnBreaksBefore = []; settings.manualColumnBreaks = false;
      }
      if (settings.scalingMode === "fit-page") {
        settings.rowBreaksBefore = []; settings.manualRowBreaks = false; settings.rowsPerPage = 0;
      }
    }
    setError(null);

    // Do not disguise parent callback failures as input errors.
    onApply(settings);
    onClose();
  }

  return (
    <dialog lang={language} dir={dir}
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={
        error
          ? `${descriptionId} ${errorId}`
          : descriptionId
      }
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={
        "m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl " +
        "overflow-hidden rounded-xl border border-slate-200 " +
        "bg-white p-0 text-slate-900 shadow-2xl " +
        "backdrop:bg-black/50 print:hidden"
      }
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92dvh] min-h-0 flex-col"
      >
        <header
          className={
            "flex shrink-0 items-start justify-between " +
            "gap-4 border-b border-slate-200 px-4 py-3 sm:px-5"
          }
        >
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold"
            >
              {t("pageSetup")}
            </h2>

            <p
              id={descriptionId}
              className="mt-1 text-sm text-slate-600"
            >
              {t("setupDescription")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            autoFocus
            className={SECONDARY_BUTTON_CLASS}
          >
            {t("close")}
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <PrintLanguageSetting />
          {error && (
            <p
              ref={errorRef}
              id={errorId}
              role="alert"
              tabIndex={-1}
              className={
                "wrap-break-word rounded-md border border-red-200 " +
                "bg-red-50 p-3 text-sm text-red-800 " +
                FOCUS_CLASS
              }
            >
              {getPrintErrorMessage(error.cause, language)}
            </p>
          )}

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold">
              {t("paperAndLayout")}
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="space-y-4">
                <label className="block text-sm font-medium">
                  {t("paperSize")}

                  <select
                    name="paperSize"
                    required
                    value={paperSize}
                    onChange={(event) => {
                      const selected = PAPER_ORDER.find(
                        (item) =>
                          item === event.currentTarget.value,
                      );

                      if (selected) {
                        setPaperSize(selected);
                      }
                    }}
                    className={INPUT_CLASS}
                  >
                    {PAPER_ORDER.map((item) => (
                      <option key={item} value={item}>
                        {getPrintPaperLabel(language, item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  {t("orientation")}

                  <select
                    name="orientation"
                    required
                    value={orientation}
                    onChange={(event) => {
                      const selected =
                        event.currentTarget.value;

                      if (
                        selected === "portrait" ||
                        selected === "landscape"
                      ) {
                        setOrientation(selected);
                      }
                    }}
                    className={INPUT_CLASS}
                  >
                    <option value="portrait">
                      {t("portrait")}
                    </option>

                    <option value="landscape">
                      {t("landscape")}
                    </option>
                  </select>
                </label>

                <p className="text-xs text-slate-600">
                  {t("paperDimensions", { width: paper.width, height: paper.height })}
                </p>
              </div>

              <div
                aria-describedby={paperHelpId}
                className={
                  "flex flex-col items-center justify-center " +
                  "gap-3 rounded-lg bg-slate-100 p-3"
                }
              >
                <div
                  aria-hidden="true"
                  className={
                    "flex items-center justify-center " +
                    "border border-slate-400 bg-white shadow-sm"
                  }
                  style={{
                    width: paper.width * diagramScale,
                    height: paper.height * diagramScale,
                  }}
                >
                  <span className="text-xs text-slate-500">
                    {paperSize}
                  </span>
                </div>

                <p
                  id={paperHelpId}
                  className="text-center text-xs leading-5 text-slate-600"
                >
                  {t("paperDiagramHelp")}
                </p>
              </div>
            </div>
          </section>

          <fieldset className="rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("margins")}
            </legend>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {MARGIN_FIELDS.map(({ name, label }) => (
                <label
                  key={name}
                  className="block min-w-0 text-sm text-slate-700"
                >
                  {t(label)}

                  <input
                    type="number" dir="ltr"
                    name={name}
                    min={0}
                    step="any"
                    required
                    defaultValue={
                      startingValue.margins[name]
                    }
                    aria-describedby={marginHelpId}
                    className={INPUT_CLASS}
                  />
                </label>
              ))}
            </div>

            <p
              id={marginHelpId}
              className="mt-3 text-xs leading-6 text-slate-600"
            >
              {t("marginHelp")}
            </p>
          </fieldset>

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold">
              {t("areaAndScaling")}
            </h3>

            <label className="mt-3 block text-sm">
              {t("scaling")}
              <select name="scalingMode" defaultValue={startingValue.scalingMode ?? "percentage"} className={INPUT_CLASS}>
                <option value="percentage">{t("percentage")}</option>
                <option value="fit-width">{t("fitWidth")}</option>
                <option value="fit-page">{t("fitRange")}</option>
              </select>
            </label>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
              <label className="block min-w-0 text-sm font-medium">
                {t("printScale")}

                <input
                  type="number" dir="ltr"
                  name="scale"
                  min={10}
                  max={400}
                  step="any"
                  required
                  defaultValue={startingValue.scale}
                  aria-describedby={scaleHelpId}
                  className={INPUT_CLASS}
                />

                <span
                  id={scaleHelpId}
                  className={
                    "mt-1 block text-xs font-normal " +
                    "leading-6 text-slate-600"
                  }
                >
                  {t("scaleHelp")}
                </span>
              </label>

              <label className="block min-w-0 text-sm font-medium">
                {t("printArea")}

                <input
                  type="text"
                  name="printArea"
                  defaultValue={startingValue.printArea}
                  placeholder="A1:D20" dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby={areaHelpId}
                  className={INPUT_CLASS}
                />

                <span
                  id={areaHelpId}
                  className={
                    "mt-1 block text-xs font-normal " +
                    "leading-6 text-slate-600"
                  }
                >
                  {t("printAreaHelp")}
                </span>
              </label>
            </div>
          </section>

          <p className="text-xs leading-6 text-slate-600">
            {t("applyHelp")}
          </p>
        </div>

        <footer
          className={
            "flex shrink-0 flex-wrap items-center justify-between " +
            "gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-5"
          }
        >
          <span className="text-xs text-slate-500">
            {t("applyHelp")}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={SECONDARY_BUTTON_CLASS}
            >
              {t("cancel")}
            </button>

            <button
              type="submit"
              className={PRIMARY_BUTTON_CLASS}
            >
              {t("apply")}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}

export function PageSetupDialog({
  open,
  value,
  onApply,
  onClose,
}: PageSetupDialogProps) {
  if (!open) return null;

  return (
    <PageSetupDialogContent
      initialValue={value}
      onApply={onApply}
      onClose={onClose}
    />
  );
}

export default PageSetupDialog;