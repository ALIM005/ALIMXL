"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

type PdfToken = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfLine = {
  page: number;
  y: number;
  tokens: PdfToken[];
};

type PdfPage = {
  number: number;
  width: number;
  lines: PdfLine[];
};

type ConvertedRow = {
  page: number;
  cells: string[];
};

type ConversionResult = {
  rows: ConvertedRow[];
  pages: number;
  columns: number;
  warnings: string[];
};

type Props = {
  file: File;
  maxRows: number;
  maxCols: number;
  onClose: () => void;
  onImport: (rows: string[][]) => void | Promise<void>;
};

type Stage =
  | "reading"
  | "analyzing"
  | "review"
  | "opening"
  | "complete"
  | "error";

type LoadingTask = {
  destroy: () => Promise<void>;
};

const MAX_PAGES = 1000;
const MAX_TEXT_ITEMS = 1000000;
const MAX_FILE_BYTES = 150 * 1024 * 1024;
const MAX_OUTPUT_CELLS = 1500000;
const GRID_SIZE = 1200;

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold " +
  "text-white shadow-sm transition-colors hover:bg-emerald-800 " +
  "focus-visible:outline-none focus-visible:ring-4 " +
  "focus-visible:ring-emerald-200 disabled:cursor-not-allowed " +
  "disabled:opacity-50 motion-reduce:transition-none";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-xl border border-slate-300 bg-white px-4 py-2.5 " +
  "text-sm font-semibold text-slate-700 shadow-sm " +
  "transition-colors hover:bg-slate-50 " +
  "focus-visible:outline-none focus-visible:ring-4 " +
  "focus-visible:ring-slate-200 disabled:cursor-not-allowed " +
  "disabled:opacity-50 motion-reduce:transition-none";

function median(values: number[]): number {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function groupLines(
  tokens: PdfToken[],
  page: number
): PdfLine[] {
  const sorted = [...tokens].sort(
    (a, b) => a.y - b.y || a.x - b.x
  );

  const lines: PdfLine[] = [];

  for (const token of sorted) {
    const last = lines[lines.length - 1];
    const tolerance = Math.max(
      1,
      Math.min(3, token.height * 0.25)
    );

    if (last && Math.abs(last.y - token.y) <= tolerance) {
      last.tokens.push(token);
    } else {
      lines.push({
        page,
        y: token.y,
        tokens: [token],
      });
    }
  }

  for (const line of lines) {
    line.tokens.sort((a, b) => a.x - b.x);
  }

  return lines;
}

function sampleLines(
  lines: PdfLine[],
  limit: number
): PdfLine[] {
  if (lines.length <= limit) return lines;

  const sampled: PdfLine[] = [];

  for (let index = 0; index < limit; index++) {
    sampled.push(
      lines[
        Math.floor(
          (index * (lines.length - 1)) / (limit - 1)
        )
      ]
    );
  }

  return sampled;
}

function findBoundaries(
  pages: PdfPage[]
): {
  boundaries: number[];
  uncertain: boolean;
} {
  const samples = pages.flatMap((page) =>
    sampleLines(page.lines, 80).map((line) => ({
      line,
      width: page.width,
    }))
  );

  const richLines = samples.filter(
    ({ line }) => line.tokens.length >= 3
  );

  if (richLines.length < 3) {
    return {
      boundaries: [],
      uncertain: true,
    };
  }

  const votes = new Float64Array(GRID_SIZE + 1);
  const occupied = new Float64Array(GRID_SIZE + 1);

  let leftEdge = GRID_SIZE;
  let rightEdge = 0;

  for (const { line, width } of richLines) {
    const rowVotes = new Uint8Array(GRID_SIZE + 1);
    const rowOccupied = new Uint8Array(GRID_SIZE + 1);

    const normalized = line.tokens.map((token) => ({
      start: Math.max(
        0,
        Math.min(
          GRID_SIZE,
          Math.floor((token.x / width) * GRID_SIZE)
        )
      ),
      end: Math.max(
        0,
        Math.min(
          GRID_SIZE,
          Math.ceil(
            ((token.x + token.width) / width) *
              GRID_SIZE
          )
        )
      ),
      height: (token.height / width) * GRID_SIZE,
    }));

    for (const token of normalized) {
      leftEdge = Math.min(leftEdge, token.start);
      rightEdge = Math.max(rightEdge, token.end);

      for (
        let index = token.start;
        index <= token.end;
        index++
      ) {
        rowOccupied[index] = 1;
      }
    }

    let previousEnd = normalized[0]?.end ?? 0;

    for (let index = 1; index < normalized.length; index++) {
      const token = normalized[index];

      const gap = token.start - previousEnd;
      const minimumGap = Math.max(
        5,
        token.height * 0.8
      );

      if (gap >= minimumGap) {
        const start = Math.max(
          0,
          Math.ceil(previousEnd + 1)
        );
        const end = Math.min(
          GRID_SIZE,
          Math.floor(token.start - 1)
        );

        for (let point = start; point <= end; point++) {
          rowVotes[point] = 1;
        }
      }

      previousEnd = Math.max(previousEnd, token.end);
    }

    for (let point = 0; point <= GRID_SIZE; point++) {
      votes[point] += rowVotes[point];
      occupied[point] += rowOccupied[point];
    }
  }

  const count = richLines.length;
  const candidates: {
    position: number;
    support: number;
  }[] = [];

  let runStart = -1;

  for (
    let point = Math.max(1, leftEdge + 2);
    point <= Math.min(GRID_SIZE - 1, rightEdge - 2);
    point++
  ) {
    const support = votes[point] / count;
    const overlap = occupied[point] / count;

    const suitable =
      support >= 0.48 && overlap <= 0.08;

    if (suitable && runStart === -1) {
      runStart = point;
    }

    const atEnd =
      point === Math.min(GRID_SIZE - 1, rightEdge - 2);

    if (runStart !== -1 && (!suitable || atEnd)) {
      const runEnd = suitable ? point : point - 1;

      if (runEnd - runStart >= 2) {
        const position = Math.floor(
          (runStart + runEnd) / 2
        );

        candidates.push({
          position: position / GRID_SIZE,
          support: votes[position] / count,
        });
      }

      runStart = -1;
    }
  }

  const boundaries = candidates
    .map((candidate) => candidate.position)
    .sort((a, b) => a - b);

  const uncertain =
    boundaries.length === 0 ||
    candidates.some((candidate) => candidate.support < 0.65);

  return {
    boundaries,
    uncertain,
  };
}

function makeCells(
  line: PdfLine,
  pageWidth: number,
  boundaries: number[]
): string[] {
  const cells = Array.from(
    { length: boundaries.length + 1 },
    () => ""
  );

  for (const token of line.tokens) {
    const start = token.x / pageWidth;

    let column = 0;

    while (
      column < boundaries.length &&
      start >= boundaries[column]
    ) {
      column++;
    }

    cells[column] +=
      (cells[column] ? " " : "") + token.text;
  }

  return cells;
}

function convertPages(
  pages: PdfPage[],
  maxCols: number,
  maxRows: number
): ConversionResult {
  const rows: ConvertedRow[] = [];
  const warnings = new Set<string>();

  /*
   * Nearby page widths share a layout model.
   * Different page sizes are analyzed independently.
   */
  const groups = new Map<number, PdfPage[]>();

  for (const page of pages) {
    const key = Math.round(page.width / 8);
    const group = groups.get(key) ?? [];

    group.push(page);
    groups.set(key, group);
  }

  const models = new Map<
    number,
    ReturnType<typeof findBoundaries>
  >();

  for (const [key, group] of groups) {
    const model = findBoundaries(group);

    if (model.boundaries.length + 1 > maxCols) {
      throw new Error(
        `Detected ${model.boundaries.length + 1} columns, ` +
          `but this sheet supports ${maxCols}. ` +
          "Nothing has been imported."
      );
    }

    models.set(key, model);

    if (model.uncertain) {
      warnings.add(
        "Some column boundaries are uncertain. " +
          "Review the result before opening the sheet."
      );
    }
  }

  let columns = 1;

  for (const page of pages) {
    const key = Math.round(page.width / 8);
    const model = models.get(key);

    if (!model) {
      throw new Error("The page layout could not be analyzed.");
    }

    columns = Math.max(
      columns,
      model.boundaries.length + 1
    );

    for (const line of page.lines) {
      const cells = makeCells(
        line,
        page.width,
        model.boundaries
      );

      rows.push({
        page: page.number,
        cells,
      });

      if (rows.length > maxRows) {
        throw new Error(
          `The converted document exceeds the ${maxRows}-row ` +
            "sheet limit. Split the PDF into smaller files. " +
            "Nothing has been imported."
        );
      }
    }
  }

  if (rows.length * columns > MAX_OUTPUT_CELLS) {
    throw new Error(
      "The converted document exceeds the safe cell limit. " +
        "Split the PDF into smaller files. Nothing has been imported."
    );
  }

  if (groups.size > 1) {
    warnings.add(
      "This PDF contains different page sizes. " +
        "Column meanings may differ between layouts."
    );
  }

  if (columns === 1) {
    warnings.add(
      "A reliable table grid was not found. " +
        "Text is preserved in one column for manual editing."
    );
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      cells: [
        ...row.cells,
        ...Array.from(
          { length: columns - row.cells.length },
          () => ""
        ),
      ],
    })),
    pages: pages.length,
    columns,
    warnings: [...warnings],
  };
}

export default function PdfTableImport({
  file,
  maxRows,
  maxCols,
  onClose,
  onImport,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();

  const dialog = useRef<HTMLDialogElement>(null);
  const committing = useRef(false);

  const [stage, setStage] = useState<Stage>("reading");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    "Preparing your document..."
  );
  const [error, setError] = useState("");
  const [result, setResult] =
    useState<ConversionResult | null>(null);

  const [reviewFirst, setReviewFirst] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const busy =
    stage === "reading" || stage === "analyzing";

  const opening = stage === "opening";

  const finishConversion = useEffectEvent(
    async (converted: ConversionResult) => {
      setResult(converted);
      setProgress(100);

      if (reviewFirst || converted.warnings.length > 0) {
        setStage("review");
        setMessage("Your editable data is ready for review.");
        return;
      }

      if (committing.current) return;

      committing.current = true;
      setStage("opening");
      setMessage("Opening your editable spreadsheet...");

      try {
        await onImport(
          converted.rows.map((row) => row.cells)
        );

        setStage("complete");
        setMessage("Data sent to your spreadsheet.");
      } catch (cause) {
        committing.current = false;
        setStage("review");
        setError(
          cause instanceof Error
            ? cause.message
            : "The spreadsheet could not be opened."
        );
      }
    }
  );

  useEffect(() => {
    const element = dialog.current;

    if (element && !element.open) {
      element.showModal();
    }

    return () => {
      if (element?.open) element.close();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let task: LoadingTask | undefined;

    const destroyTask = async () => {
      const current = task;
      task = undefined;

      if (current) {
        await current.destroy().catch(() => undefined);
      }
    };

    async function read() {
      committing.current = false;
      setStage("reading");
      setProgress(0);
      setMessage("Preparing your document...");
      setError("");
      setResult(null);
      setAcknowledged(false);

      try {
        if (
          !Number.isInteger(maxRows) ||
          !Number.isInteger(maxCols) ||
          maxRows < 1 ||
          maxCols < 1
        ) {
          throw new Error(
            "Invalid spreadsheet row or column limits."
          );
        }

        if (file.size > MAX_FILE_BYTES) {
          throw new Error(
            "This PDF exceeds the 150 MB import limit. " +
              "Split the document before converting."
          );
        }

        const pdfjs = await import("pdfjs-dist");

        if (disposed) return;

        pdfjs.GlobalWorkerOptions.workerSrc =
          "/pdf-import/pdf.worker.min.mjs";

        const bytes = new Uint8Array(
          await file.arrayBuffer()
        );

        if (disposed) return;

        const loading = pdfjs.getDocument({
          data: bytes,
          cMapUrl: "/pdf-import/cmaps/",
          cMapPacked: true,
          standardFontDataUrl:
            "/pdf-import/standard_fonts/",
          wasmUrl: "/pdf-import/wasm/",
        });

        task = loading;

        const pdf = await loading.promise;

        if (disposed) return;

        if (pdf.numPages > MAX_PAGES) {
          throw new Error(
            `This PDF exceeds the ${MAX_PAGES}-page limit. ` +
              "Split the document before converting."
          );
        }

        const pages: PdfPage[] = [];
        const unreadablePages: number[] = [];

        let totalTokens = 0;
        let totalLines = 0;

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          if (disposed) return;

          setMessage(
            `Reading page ${pageNumber} of ${pdf.numPages}...`
          );
          setProgress(
            Math.round(
              ((pageNumber - 1) / pdf.numPages) * 88
            )
          );

          const page = await pdf.getPage(pageNumber);

          try {
            const viewport = page.getViewport({
              scale: 1,
            });

            const content = await page.getTextContent();

            if (disposed) return;

            const tokens: PdfToken[] = [];

            for (const item of content.items) {
              if (!("str" in item) || !item.str.trim()) {
                continue;
              }

              const transform = pdfjs.Util.transform(
                viewport.transform,
                item.transform
              );

              const horizontalScale = Math.hypot(
                transform[0],
                transform[1]
              );

              const verticalScale = Math.hypot(
                transform[2],
                transform[3]
              );

              if (
                Math.abs(transform[1]) >
                0.2 * Math.max(1, Math.abs(transform[0]))
              ) {
                throw new Error(
                  `Rotated text was found on page ${pageNumber}. ` +
                    "This version cannot safely arrange that text. " +
                    "Nothing has been imported."
                );
              }

              const width =
                Math.abs(item.width * viewport.scale) ||
                Math.max(
                  1,
                  item.str.length * horizontalScale * 0.5
                );

              tokens.push({
                text: item.str,
                x: transform[4],
                y: transform[5],
                width,
                height: Math.max(
                  1,
                  verticalScale,
                  Math.abs(item.height)
                ),
              });
            }

            totalTokens += tokens.length;

            if (totalTokens > MAX_TEXT_ITEMS) {
              throw new Error(
                "The PDF exceeds the text-item safety limit. " +
                  "Split it into smaller files."
              );
            }

            if (!tokens.length) {
              unreadablePages.push(pageNumber);
            }

            const lines = groupLines(tokens, pageNumber);

            totalLines += lines.length;

            if (totalLines > maxRows) {
              throw new Error(
                `This PDF contains more than ${maxRows} text rows. ` +
                  "Split it before converting. " +
                  "Nothing has been imported."
              );
            }

            pages.push({
              number: pageNumber,
              width: viewport.width,
              lines,
            });
          } finally {
            page.cleanup();
          }

          await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
          });
        }

        if (disposed) return;

        if (unreadablePages.length) {
          throw new Error(
            "No readable text was found on page(s): " +
              unreadablePages.slice(0, 20).join(", ") +
              (unreadablePages.length > 20 ? ", ..." : "") +
              ". These pages may be blank or image-based. " +
              "OCR is not included in this version. " +
              "Nothing has been imported."
          );
        }

        if (!totalLines) {
          throw new Error(
            "No readable text was found in this PDF."
          );
        }

        setStage("analyzing");
        setProgress(90);
        setMessage("Detecting columns and arranging cells...");

        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        });

        if (disposed) return;

        const converted = convertPages(
          pages,
          maxCols,
          maxRows
        );

        await destroyTask();

        if (disposed) return;

        await finishConversion(converted);
      } catch (cause) {
        if (!disposed) {
          setStage("error");
          setError(
            cause instanceof Error
              ? cause.message
              : "PDF conversion failed."
          );
          setMessage("The conversion could not be completed.");
        }
      } finally {
        await destroyTask();
      }
    }

    void read();

    return () => {
      disposed = true;
      void destroyTask();
    };
  }, [file, maxRows, maxCols]);

  async function openSpreadsheet() {
    if (
      !result ||
      committing.current ||
      (result.warnings.length > 0 && !acknowledged)
    ) {
      return;
    }

    committing.current = true;
    setError("");
    setStage("opening");
    setMessage("Opening your editable spreadsheet...");

    try {
      await onImport(result.rows.map((row) => row.cells));

      setStage("complete");
      setMessage("Data sent to your spreadsheet.");
    } catch (cause) {
      committing.current = false;
      setStage("review");
      setError(
        cause instanceof Error
          ? cause.message
          : "The spreadsheet could not be opened."
      );
    }
  }

  function requestClose() {
    if (!opening) onClose();
  }

  const preview = result
    ? result.rows.length > 40
      ? [
          ...result.rows.slice(0, 30),
          ...result.rows.slice(-10),
        ]
      : result.rows
    : [];

  const statusTitle =
    stage === "error"
      ? "Conversion needs attention"
      : stage === "review"
        ? "Review your converted data"
        : stage === "complete"
          ? "Your data is ready"
          : opening
            ? "Opening spreadsheet"
            : "Converting your PDF";

  const averageCells = result
    ? median(
        result.rows
          .slice(0, 100)
          .map(
            (row) =>
              row.cells.filter((cell) => cell.trim()).length
          )
      )
    : 0;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy || opening}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className={
        "fixed inset-0 m-auto max-h-[92dvh] w-[96vw] " +
        "max-w-6xl overflow-auto rounded-2xl border " +
        "border-slate-200 bg-white p-0 text-slate-900 " +
        "shadow-2xl backdrop:bg-slate-950/60"
      }
    >
      <header className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800">
              <FileSpreadsheet
                size={25}
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
                ALIM XL · PDF Import
              </p>

              <h2
                id={titleId}
                className="text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Convert to Spreadsheet
              </h2>

              <p
                id={descriptionId}
                className="mt-1 text-sm text-slate-600"
              >
                Automatic column detection. Editable cells.
                Your existing sheets stay unchanged.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestClose}
            disabled={opening}
            aria-label="Close PDF conversion"
            className={
              "rounded-xl p-2 text-slate-500 " +
              "hover:bg-slate-200 hover:text-slate-900 " +
              "focus-visible:outline-none focus-visible:ring-4 " +
              "focus-visible:ring-emerald-200 " +
              "disabled:cursor-not-allowed disabled:opacity-40"
            }
          >
            <X size={21} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="space-y-5 px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
          <FileText
            size={21}
            className="shrink-0 text-slate-500"
            aria-hidden="true"
          />

          <div className="min-w-0">
            <p className="break-all text-sm font-medium">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
              {" · "}
              Local document processing
            </p>
          </div>
        </div>

        <section
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
        >
          <div className="flex items-center gap-3">
            {busy || opening ? (
              <LoaderCircle
                size={22}
                className="animate-spin text-emerald-700 motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : stage === "error" ? (
              <TriangleAlert
                size={22}
                className="text-amber-600"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                size={22}
                className="text-emerald-700"
                aria-hidden="true"
              />
            )}

            <div>
              <h3 className="font-semibold">
                {statusTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {message}
              </p>
            </div>
          </div>

          {(busy || opening) && (
            <div className="mt-4">
              <progress
                aria-label="PDF conversion progress"
                value={progress}
                max={100}
                className="h-2 w-full overflow-hidden rounded-full accent-emerald-700"
              />
              <p className="mt-1 text-right text-xs text-slate-500">
                {progress}%
              </p>
            </div>
          )}
        </section>

        {busy && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={reviewFirst}
              onChange={(event) =>
                setReviewFirst(event.target.checked)
              }
              className="mt-0.5 h-4 w-4 accent-emerald-700"
            />

            <span>
              <span className="block text-sm font-semibold">
                Review before opening
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Otherwise, the converted data opens automatically
                when no layout warning is detected.
              </span>
            </span>
          </label>
        )}

        {error && (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <TriangleAlert
              size={20}
              className="shrink-0"
              aria-hidden="true"
            />
            <p className="wrap-break-words">{error}</p>
          </div>
        )}

        {result && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Pages", result.pages],
                ["Rows", result.rows.length],
                ["Columns", result.columns],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <p className="text-xs font-medium text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {Number(value).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <div className="flex items-center gap-2 font-semibold">
                  <TriangleAlert
                    size={18}
                    aria-hidden="true"
                  />
                  Layout review recommended
                </div>

                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {stage === "review" && (
              <>
                <details
                  open
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-sm font-semibold">
                    Converted Data Preview
                    <ChevronDown
                      size={17}
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="max-h-80 overflow-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 text-slate-700">
                        <tr>
                          <th className="border-b border-r border-slate-200 px-3 py-2">
                            PDF Page
                          </th>

                          {Array.from(
                            { length: result.columns },
                            (_, index) => (
                              <th
                                key={index}
                                className="min-w-28 border-b border-r border-slate-200 px-3 py-2"
                              >
                                Column {index + 1}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {preview.map((row, rowIndex) => (
                          <tr
                            key={`${row.page}-${rowIndex}`}
                            className="odd:bg-white even:bg-slate-50"
                          >
                            <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-500">
                              {row.page}
                            </td>

                            {row.cells.map(
                              (cell, columnIndex) => (
                                <td
                                  key={columnIndex}
                                  className="whitespace-pre-wrap-break-words border-b border-r border-slate-200 px-3 py-2 align-top"
                                >
                                  {cell}
                                </td>
                              )
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>

                <p className="text-xs text-slate-500">
                  {result.rows.length > 40
                    ? "Preview shows the first 30 and last 10 rows."
                    : "Preview shows all converted rows."}
                  {" "}
                  Typical populated cells per sampled row:{" "}
                  {averageCells}. The PDF Page column is for
                  preview only and will not be imported.
                </p>

                {result.warnings.length > 0 && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) =>
                        setAcknowledged(event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-emerald-700"
                    />

                    <span>
                      Open this result for manual correction.
                      I understand that column placement may
                      need editing.
                    </span>
                  </label>
                )}
              </>
            )}
          </>
        )}

        <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <ShieldCheck
            size={17}
            className="shrink-0 text-emerald-700"
            aria-hidden="true"
          />

          <p>
            This converter does not upload your PDF to an
            external conversion service. Text is preserved;
            repeated headings and page labels are not
            automatically deleted. OCR, original formulas
            and exact PDF formatting are not restored.
          </p>
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
        <p className="text-xs text-slate-500">
          Editable data, not a PDF image.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={secondaryButton}
            onClick={requestClose}
            disabled={opening}
          >
            {stage === "complete" ? "Close" : "Cancel"}
          </button>

          {stage === "review" && result && (
            <button
              type="button"
              className={primaryButton}
              onClick={() => void openSpreadsheet()}
              disabled={
                result.warnings.length > 0 &&
                !acknowledged
              }
            >
              Open Spreadsheet
              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </button>
          )}

          {opening && (
            <button
              type="button"
              className={primaryButton}
              disabled
            >
              <LoaderCircle
                size={17}
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Opening Spreadsheet
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}