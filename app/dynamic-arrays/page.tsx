"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  getSpillFunctionNames,
  isSpillFunction,
} from "../../lib/spill-functions.mjs";
import {
  SPILL_ERROR,
  SPILL_CALC_ERROR,
  MAX_SPILL_ROWS,
  MAX_SPILL_COLS,
  MAX_SPILL_CELLS,
} from "../../lib/spill-engine.mjs";

type SpillStatus = "disabled" | "enabled";

interface SpillSettings {
  status: SpillStatus;
  allowSpillReferences: boolean;
  showSpillBorders: boolean;
  maxSpillCells: number;
}

interface DemoFormula {
  title: string;
  formula: string;
  description: string;
}

const SPILL_SETTINGS_KEY = "alimxl_spill_settings";

const DEFAULT_SPILL_SETTINGS: SpillSettings = {
  status: "enabled",
  allowSpillReferences: true,
  showSpillBorders: true,
  maxSpillCells: MAX_SPILL_CELLS,
};

const MIN_SPILL_CELLS = 1;

const DEMO_FORMULAS: readonly DemoFormula[] = [
  {
    title: "SEQUENCE",
    formula: "=SEQUENCE(5,3)",
    description:
      "Creates a 5-row by 3-column sequence starting from 1.",
  },
  {
    title: "TRANSPOSE",
    formula: "=TRANSPOSE(A1:B3)",
    description:
      "Transposes a 3-row by 2-column range into a 2-row by 3-column range.",
  },
  {
    title: "TEXTSPLIT",
    formula: '=TEXTSPLIT("Apple,Banana,Cherry",",")',
    description:
      "Splits comma-separated text into a horizontal array.",
  },
  {
    title: "FILTER",
    formula: "=FILTER(A1:B10,B1:B10>5)",
    description:
      "Filters rows where the value in column B is greater than 5.",
  },
  {
    title: "SORT",
    formula: "=SORT(A1:B10,1,-1)",
    description:
      "Sorts a range by the first column in descending order.",
  },
  {
    title: "UNIQUE",
    formula: "=UNIQUE(A1:A20)",
    description:
      "Returns unique values from a single-column range.",
  },
] as const;

const SPILL_STATUS_OPTIONS: readonly {
  value: SpillStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "enabled",
    label: "Enabled",
    description:
      "Supported formulas can return multi-cell dynamic array results.",
  },
  {
    value: "disabled",
    label: "Disabled",
    description:
      "Dynamic array formulas are restricted to scalar results.",
  },
] as const;

function clampSpillCells(value: number): number {
  if (!Number.isFinite(value)) {
    return MAX_SPILL_CELLS;
  }

  return Math.min(
    MAX_SPILL_CELLS,
    Math.max(MIN_SPILL_CELLS, Math.trunc(value))
  );
}

export default function DynamicArraysPage() {
  const [settings, setSettings] = useState<SpillSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SPILL_SETTINGS;
    try {
      const raw = window.localStorage.getItem(SPILL_SETTINGS_KEY);
      if (!raw) return DEFAULT_SPILL_SETTINGS;
      return { ...DEFAULT_SPILL_SETTINGS, ...(JSON.parse(raw) as Partial<SpillSettings>) };
    } catch {
      return DEFAULT_SPILL_SETTINGS;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SPILL_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable */
    }
  }, [settings]);

  const [selectedFormula, setSelectedFormula] = useState<string>(
    DEMO_FORMULAS[0].formula
  );

  const [copiedFormula, setCopiedFormula] = useState<string | null>(
    null
  );

  const spillModeLabelId = useId();
  const maxCellsLabelId = useId();
  const selectedFormulaLabelId = useId();

  const spillFunctions = useMemo(
    () => getSpillFunctionNames(),
    []
  );

  const isSpillEnabled = settings.status === "enabled";

  const updateSettings = useCallback(
    (
      updater: (
        previous: SpillSettings
      ) => SpillSettings
    ) => {
      setSettings(updater);
    },
    []
  );

  const handleStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value as SpillStatus;

      updateSettings((previous) => ({
        ...previous,
        status: value,
      }));
    },
    [updateSettings]
  );

  const handleToggleChange = useCallback(
    (key: "allowSpillReferences" | "showSpillBorders") => {
      updateSettings((previous) => ({
        ...previous,
        [key]: !previous[key],
      }));
    },
    [updateSettings]
  );

  const handleMaxCellsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);

      updateSettings((previous) => ({
        ...previous,
        maxSpillCells: clampSpillCells(value),
      }));
    },
    [updateSettings]
  );

  const handleFormulaSelect = useCallback(
    (formula: string) => {
      setSelectedFormula(formula);
    },
    []
  );

  const handleCopyFormula = useCallback(
    async (formula: string) => {
      try {
        await navigator.clipboard.writeText(formula);
        setCopiedFormula(formula);
      } catch {
        setCopiedFormula(null);
      }
    },
    []
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Dynamic Arrays
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Configure Excel-like dynamic array spill behavior for
                ALIMXL.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Back to Spreadsheet
            </Link>
          </div>
        </header>

        <section
          aria-labelledby={spillModeLabelId}
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"
        >
          <h2
            id={spillModeLabelId}
            className="text-xl font-semibold"
          >
            Spill Settings
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            These settings control how dynamic array formulas behave in
            the main spreadsheet.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="spill-mode"
                className="block text-sm font-medium text-slate-300"
              >
                Spill Mode
              </label>

              <select
                id="spill-mode"
                value={settings.status}
                onChange={handleStatusChange}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              >
                {SPILL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-slate-500">
                {SPILL_STATUS_OPTIONS.find(
                  (option) => option.value === settings.status
                )?.description}
              </p>
            </div>

            <div>
              <label
                htmlFor="max-spill-cells"
                className="block text-sm font-medium text-slate-300"
              >
                Maximum Spill Cells
              </label>

              <input
                id="max-spill-cells"
                type="number"
                inputMode="numeric"
                min={MIN_SPILL_CELLS}
                max={MAX_SPILL_CELLS}
                step={1}
                value={settings.maxSpillCells}
                onChange={handleMaxCellsChange}
                aria-describedby="max-spill-cells-help"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              />

              <p
                id="max-spill-cells-help"
                className="mt-2 text-xs text-slate-500"
              >
                Maximum allowed cells:{" "}
                {MAX_SPILL_CELLS.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
              <span className="text-sm text-slate-200">
                Allow spill references
              </span>

              <input
                type="checkbox"
                checked={settings.allowSpillReferences}
                onChange={() =>
                  handleToggleChange("allowSpillReferences")
                }
                aria-label="Allow spill references"
                className="h-5 w-5 accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
              <span className="text-sm text-slate-200">
                Show spill borders
              </span>

              <input
                type="checkbox"
                checked={settings.showSpillBorders}
                onChange={() =>
                  handleToggleChange("showSpillBorders")
                }
                aria-label="Show spill borders"
                className="h-5 w-5 accent-sky-500"
              />
            </label>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <h2 className="text-xl font-semibold">
            Supported Functions
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            These functions can return dynamic array results when spill
            mode is enabled.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {spillFunctions.map((name) => (
              <div
                key={name}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
              >
                <div className="text-sm font-semibold text-sky-400">
                  {name}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  {isSpillFunction(name)
                    ? "Spill capable"
                    : "Not spill capable"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <h2 className="text-xl font-semibold">
            Demo Formulas
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Select a formula to preview it, or copy it and paste it into
            the main spreadsheet to test dynamic array behavior.
          </p>

          <div className="mt-6 space-y-4">
            {DEMO_FORMULAS.map((demo) => {
              const isSelected =
                selectedFormula === demo.formula;

              return (
                <div
                  key={demo.title}
                  className={`rounded-xl border px-4 py-4 transition ${
                    isSelected
                      ? "border-sky-500 bg-sky-500/10"
                      : "border-slate-800 bg-slate-950 hover:border-slate-600"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleFormulaSelect(demo.formula)
                    }
                    aria-pressed={isSelected}
                    className="w-full text-left"
                  >
                    <div className="text-sm font-semibold text-slate-100">
                      {demo.title}
                    </div>

                    <div className="mt-1 font-mono text-xs text-sky-300">
                      {demo.formula}
                    </div>

                    <div className="mt-2 text-xs text-slate-400">
                      {demo.description}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyFormula(demo.formula)}
                    className="mt-3 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-sky-500 hover:text-white"
                  >
                    {copiedFormula === demo.formula
                      ? "Copied"
                      : "Copy formula"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div
              id={selectedFormulaLabelId}
              className="text-xs uppercase tracking-wide text-slate-500"
            >
              Selected formula
            </div>

            <div
              aria-labelledby={selectedFormulaLabelId}
              className="mt-2 font-mono text-sm text-sky-300"
            >
              {selectedFormula}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <h2 className="text-xl font-semibold">
            Spill Limits
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
              <div className="text-xs text-slate-500">
                Maximum rows
              </div>

              <div className="mt-1 text-lg font-semibold text-slate-100">
                {MAX_SPILL_ROWS.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
              <div className="text-xs text-slate-500">
                Maximum columns
              </div>

              <div className="mt-1 text-lg font-semibold text-slate-100">
                {MAX_SPILL_COLS.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
              <div className="text-xs text-slate-500">
                Maximum cells
              </div>

              <div className="mt-1 text-lg font-semibold text-slate-100">
                {MAX_SPILL_CELLS.toLocaleString()}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <h2 className="text-xl font-semibold">
            Error Reference
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
              <div className="font-mono text-sm text-rose-400">
                {SPILL_ERROR}
              </div>

              <p className="mt-2 text-sm text-slate-400">
                The spill range is blocked by an existing value, formula,
                locked cell, merged cell, or invalid target area.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
              <div className="font-mono text-sm text-amber-400">
                {SPILL_CALC_ERROR}
              </div>

              <p className="mt-2 text-sm text-slate-400">
                The dynamic array formula produced no usable result.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-500">
          ALIMXL Dynamic Arrays — production-ready spill configuration
          and documentation.
        </footer>
      </div>
    </main>
  );
}