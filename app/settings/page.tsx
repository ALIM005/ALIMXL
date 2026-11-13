"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { useAppSettings } from "../../components/SettingsProvider";

import {
  MAX_SETTINGS_BACKUP_BYTES,
  SETTINGS_LIMITS,
  SETTINGS_SCHEMA_VERSION,
  areSettingsEqual,
  createDefaultSettings,
  parseSettingsBackup,
  serializeSettings,
  validateSettings,
  type AppSettings,
} from "../../lib/app-settings";

type SectionId =
  | "appearance"
  | "formats"
  | "workbook"
  | "photo"
  | "backup"
  | "about";

interface SettingsSection {
  id: SectionId;
  title: string;
  description: string;
  keywords: string;
}

interface SettingsForm {
  draft: AppSettings;
  baseline: AppSettings;
  revision: number;
}

interface Notice {
  type: "success" | "error" | "info";
  text: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SettingsRowProps {
  title: string;
  description?: string;
  children: ReactNode;
}

interface SettingsSelectProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
}

interface SettingsToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const SECTIONS: readonly SettingsSection[] = [
  {
    id: "appearance",
    title: "Appearance & accessibility",
    description:
      "Choose a theme, brand accent and comfortable interface preferences.",
    keywords:
      "theme light dark system accent colour color green blue violet density motion accessibility থিম রং",
  },
  {
    id: "formats",
    title: "Regional formats",
    description:
      "Set regional number, date and currency preferences.",
    keywords:
      "locale region currency date number bangla english taka dollar বাংলা টাকা",
  },
  {
    id: "workbook",
    title: "Workbook defaults",
    description:
      "Store preferred defaults for newly created workbooks.",
    keywords:
      "spreadsheet workbook name font size grid gridlines document cell ওয়ার্কবুক",
  },
  {
    id: "photo",
    title: "Photo Studio defaults",
    description:
      "Store preferred export settings for new editing sessions.",
    keywords:
      "photo studio image export quality width png jpeg jpg webp ছবি",
  },
  {
    id: "backup",
    title: "Backup & reset",
    description:
      "Export, import or reset your application preferences.",
    keywords:
      "backup restore import export json reset settings data ব্যাকআপ",
  },
  {
    id: "about",
    title: "About & privacy",
    description:
      "Understand what is stored and which features require integration.",
    keywords:
      "about privacy security local storage version help account cloud তথ্য",
  },
];

const THEME_OPTIONS: readonly SelectOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Follow system" },
];

const ACCENT_OPTIONS: readonly SelectOption[] = [
  { value: "green", label: "ALIMXL Green" },
  { value: "blue", label: "Royal Blue" },
  { value: "violet", label: "Violet" },
];

const DENSITY_OPTIONS: readonly SelectOption[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

const LOCALE_OPTIONS: readonly SelectOption[] = [
  { value: "bn-BD", label: "বাংলা — বাংলাদেশ" },
  { value: "en-US", label: "English — United States" },
  { value: "en-GB", label: "English — United Kingdom" },
];

const CURRENCY_OPTIONS: readonly SelectOption[] = [
  { value: "BDT", label: "BDT — Bangladeshi Taka" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Pound Sterling" },
  { value: "INR", label: "INR — Indian Rupee" },
];

const PHOTO_FORMAT_OPTIONS: readonly SelectOption[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

const FIELD_CLASS =
  "ax-settings-field w-full rounded-xl px-3 py-2.5 text-sm " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_CLASS =
  "ax-settings-button inline-flex items-center justify-center " +
  "gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold " +
  "transition hover:brightness-95 " +
  "disabled:cursor-not-allowed disabled:opacity-40";

function SettingsRow({
  title,
  description,
  children,
}: SettingsRowProps) {
  return (
    <div
      className="grid gap-4 border-b py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)]"
      style={{ borderColor: "var(--ax-border)" }}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>

        {description && (
          <p className="ax-settings-muted mt-2 text-xs leading-6">
            {description}
          </p>
        )}
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SettingsSelect({
  label,
  value,
  options,
  onChange,
}: SettingsSelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={FIELD_CLASS}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SettingsToggle({
  label,
  checked,
  onChange,
}: SettingsToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0"
        style={{ accentColor: "var(--ax-accent)" }}
      />

      <span>{label}</span>
    </label>
  );
}

function IntegrationNote({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-5 rounded-xl border p-4"
      style={{ borderColor: "var(--ax-border)" }}
    >
      <p className="text-xs font-semibold">Integration scope</p>

      <div className="ax-settings-muted mt-2 text-xs leading-6">
        {children}
      </div>
    </div>
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error ? error.message : fallback;
}

function downloadSettingsBackup(text: string): void {
  const blob = new Blob([text], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  try {
    anchor.href = url;
    anchor.download = `alimxl-settings-${timestamp}.json`;

    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  }
}

export default function SettingsPage() {
  const {
    settings,
    ready,
    warning,
    revision,
    resolvedTheme,
    effectiveReducedMotion,
    save,
  } = useAppSettings();

  const [form, setForm] = useState<SettingsForm | null>(null);

  const [section, setSection] =
    useState<SectionId>("appearance");

  const [query, setQuery] = useState("");

  const [notice, setNotice] = useState<Notice | null>(null);

  const [busy, setBusy] = useState(false);

  const importInputRef = useRef<HTMLInputElement>(null);
  const importingRef = useRef(false);
  const mountedRef = useRef(false);

  /*
   * Hydrate the form once.
   *
   * Later external preference changes must not silently
   * overwrite a user's open draft.
   */
  useEffect(() => {
    if (!ready) return;

    setForm((current) => {
      if (current !== null) return current;

      return {
        draft: { ...settings },
        baseline: { ...settings },
        revision,
      };
    });
  }, [ready, settings, revision]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const dirty =
    form !== null &&
    !areSettingsEqual(form.draft, form.baseline);

  const conflict =
    form !== null &&
    form.revision !== revision;

  const draft =
    form?.draft ?? createDefaultSettings();

  const controlsDisabled =
    !ready || form === null || busy;

  useEffect(() => {
    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ): void => {
      if (!dirty) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [dirty]);

  const patch = useCallback(
    <K extends keyof AppSettings,>(
      key: K,
      value: AppSettings[K]
    ): void => {
      setForm((current) => {
        if (current === null) return current;

        return {
          ...current,
          draft: {
            ...current.draft,
            [key]: value,
          },
        };
      });

      setNotice(null);
    },
    []
  );

  function saveDraft(): void {
    if (form === null || busy) return;

    if (conflict) {
      setNotice({
        type: "error",
        text:
          "Saved preferences changed while this form was open. " +
          "Export your draft if needed, then reload saved preferences.",
      });

      return;
    }

    try {
      const validated = validateSettings(form.draft);

      save(validated);

      setForm({
        draft: { ...validated },
        baseline: { ...validated },
        revision: revision + 1,
      });

      setNotice({
        type: "success",
        text:
          "Preferences saved in this browser. " +
          "Existing documents and active photo projects were not changed.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: getErrorMessage(
          error,
          "Preferences could not be saved."
        ),
      });
    }
  }

  function reloadSavedPreferences(): void {
    if (form === null || busy) return;

    if (
      dirty &&
      !window.confirm(
        "Discard your unsaved settings draft and load the currently active preferences?"
      )
    ) {
      return;
    }

    setForm({
      draft: { ...settings },
      baseline: { ...settings },
      revision,
    });

    setNotice({
      type: "info",
      text: "Currently active preferences loaded into the form.",
    });
  }

  function resetDraft(): void {
    if (form === null || busy) return;

    const confirmed = window.confirm(
      "Reset the settings draft to defaults? " +
      "Workbooks, images and photo projects will not be deleted. " +
      "You must click Save changes to apply the reset."
    );

    if (!confirmed) return;

    setForm((current) => {
      if (current === null) return current;

      return {
        ...current,
        draft: createDefaultSettings(),
      };
    });

    setNotice({
      type: "info",
      text:
        "Defaults loaded into the draft. " +
        "Review them and click Save changes to apply.",
    });
  }

  function exportDraft(): void {
    if (form === null || busy) return;

    try {
      const validated = validateSettings(form.draft);

      downloadSettingsBackup(
        serializeSettings(validated)
      );

      setNotice({
        type: "info",
        text:
          "Settings backup download requested. " +
          "This includes the current validated draft. " +
          "Exporting does not save or apply pending changes.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: getErrorMessage(
          error,
          "Settings backup could not be exported."
        ),
      });
    }
  }

  async function importBackup(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (
      !file ||
      form === null ||
      importingRef.current
    ) {
      return;
    }

    if (
      dirty &&
      !window.confirm(
        "Replace your unsaved settings draft with the imported preferences?"
      )
    ) {
      return;
    }

    if (file.size > MAX_SETTINGS_BACKUP_BYTES) {
      setNotice({
        type: "error",
        text: "Settings backup must not exceed 100 KB.",
      });

      return;
    }

    importingRef.current = true;

    setBusy(true);
    setNotice({
      type: "info",
      text: "Reading and validating the settings backup…",
    });

    try {
      const text = await file.text();
      const imported = parseSettingsBackup(text);

      if (!mountedRef.current) return;

      setForm((current) => {
        if (current === null) return current;

        return {
          ...current,
          draft: imported,
        };
      });

      setNotice({
        type: "success",
        text:
          "Backup validated and loaded into the draft. " +
          "Review the settings, then click Save changes to apply them.",
      });
    } catch (error) {
      if (!mountedRef.current) return;

      setNotice({
        type: "error",
        text: getErrorMessage(
          error,
          "Settings backup could not be imported."
        ),
      });
    } finally {
      importingRef.current = false;

      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  function confirmNavigation(): boolean {
    if (busy) {
      return window.confirm(
        "A settings file is being processed. Leave this page?"
      );
    }

    if (!dirty) return true;

    return window.confirm(
      "Leave Settings and discard unsaved changes? " +
      "Save or export your draft first if you want to keep it."
    );
  }

  const normalizedQuery =
    query.trim().toLocaleLowerCase();

  const matchingSections = SECTIONS.filter((item) =>
    `${item.title} ${item.description} ${item.keywords}`
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  );

  const activeSection =
    matchingSections.find((item) => item.id === section) ??
    matchingSections[0];

  const currencyPreview = new Intl.NumberFormat(
    draft.locale,
    {
      style: "currency",
      currency: draft.currency,
    }
  ).format(123456.78);

  const numberPreview = new Intl.NumberFormat(
    draft.locale,
    {
      maximumFractionDigits: 2,
    }
  ).format(1234567.89);

  const datePreview = new Intl.DateTimeFormat(
    draft.locale,
    {
      dateStyle: "long",
      timeZone: "UTC",
    }
  ).format(new Date("2026-01-15T12:00:00.000Z"));

  return (
    <main
      className="ax-settings-surface fixed inset-0 flex flex-col overflow-hidden font-sans"
      aria-busy={busy || !ready}
    >
      <header
        className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-6"
        style={{
          background: "var(--ax-panel)",
          borderColor: "var(--ax-border)",
        }}
      >
        <div className="min-w-0">
          <Link
            href="/"
            className="ax-settings-button inline-block rounded text-xs font-bold tracking-[0.18em]"
            style={{ color: "var(--ax-accent)" }}
            onClick={(event) => {
              if (!confirmNavigation()) {
                event.preventDefault();
              }
            }}
          >
            ALIMXL / HOME
          </Link>

          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Settings Center
          </h1>

          <p className="ax-settings-muted mt-1 text-xs leading-5">
            Your workspace preferences, organized in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="ax-settings-muted mr-1 text-xs"
            aria-live="polite"
          >
            {!ready || form === null
              ? "Loading…"
              : conflict
                ? "Review required"
                : dirty
                  ? "Unsaved changes"
                  : "Up to date"}
          </span>

          <button
            type="button"
            className={BUTTON_CLASS}
            disabled={
              controlsDisabled ||
              (!dirty && !conflict)
            }
            onClick={reloadSavedPreferences}
          >
            {conflict
              ? "Reload saved"
              : "Discard changes"}
          </button>

          <button
            type="button"
            className={`${BUTTON_CLASS} ax-settings-primary`}
            disabled={
              controlsDisabled ||
              !dirty ||
              conflict
            }
            onClick={saveDraft}
          >
            Save changes
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[260px_minmax(0,1fr)] md:overflow-hidden">
        <aside
          className="border-b p-4 md:min-h-0 md:overflow-y-auto md:border-b-0 md:border-r"
          style={{ borderColor: "var(--ax-border)" }}
        >
          <label className="block">
            <span className="ax-settings-muted text-xs font-semibold">
              Find a settings category
            </span>

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Theme, export, backup…"
              className={`${FIELD_CLASS} mt-2`}
            />
          </label>

          <nav
            aria-label="Settings categories"
            className="mt-5 flex flex-wrap gap-2 md:flex-col"
          >
            {matchingSections.map((item) => {
              const active =
                activeSection?.id === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={
                    active ? "page" : undefined
                  }
                  onClick={() => setSection(item.id)}
                  className={`${BUTTON_CLASS} justify-start text-left`}
                  style={{
                    background: active
                      ? "var(--ax-accent)"
                      : "transparent",
                    color: active
                      ? "#FFFFFF"
                      : "var(--ax-text)",
                  }}
                >
                  {item.title}
                </button>
              );
            })}
          </nav>

          {matchingSections.length === 0 && (
            <p
              role="status"
              className="ax-settings-muted mt-4 text-sm leading-6"
            >
              No matching category. Try another keyword.
            </p>
          )}

          <div
            className="mt-6 rounded-xl border p-4"
            style={{ borderColor: "var(--ax-border)" }}
          >
            <p className="text-xs font-semibold">
              Local preferences
            </p>

            <p className="ax-settings-muted mt-2 text-xs leading-6">
              Saved on this browser for this site.
              Not an account backup or cloud sync.
            </p>
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-6 md:min-h-0 md:overflow-y-auto lg:p-8">
          <div className="ax-settings-stack mx-auto flex max-w-4xl flex-col">
            {(warning || conflict) && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4"
              >
                <h2 className="text-sm font-semibold">
                  Preferences need attention
                </h2>

                <p className="mt-2 text-xs leading-6">
                  {warning ||
                    "Active preferences changed while this form was open."}
                </p>

                {conflict && (
                  <>
                    <p className="mt-2 text-xs leading-6">
                      Your draft has been preserved.
                      Export it if needed, then reload the
                      saved preferences before making further changes.
                    </p>

                    <button
                      type="button"
                      className={`${BUTTON_CLASS} mt-3`}
                      disabled={controlsDisabled}
                      onClick={reloadSavedPreferences}
                    >
                      Reload saved preferences
                    </button>
                  </>
                )}
              </div>
            )}

            {notice && (
              <div
                role={
                  notice.type === "error"
                    ? "alert"
                    : "status"
                }
                aria-live={
                  notice.type === "error"
                    ? "assertive"
                    : "polite"
                }
                className="rounded-xl border p-4 text-sm leading-6"
                style={{
                  borderColor:
                    notice.type === "error"
                      ? "#E87979"
                      : notice.type === "success"
                        ? "#34A875"
                        : "var(--ax-border)",
                }}
              >
                {notice.text}
              </div>
            )}

            {!ready || form === null ? (
              <section className="ax-settings-panel rounded-2xl p-6">
                <p
                  role="status"
                  className="ax-settings-muted text-sm"
                >
                  Loading saved preferences…
                </p>
              </section>
            ) : activeSection ? (
              <fieldset
                disabled={controlsDisabled}
                className="min-w-0 disabled:opacity-60"
              >
                <legend className="sr-only">
                  Application preference controls
                </legend>

                <section
                  className="ax-settings-panel rounded-2xl p-5 sm:p-7"
                  aria-labelledby="settings-section-heading"
                >
                  <div
                    className="border-b pb-5"
                    style={{
                      borderColor: "var(--ax-border)",
                    }}
                  >
                    <h2
                      id="settings-section-heading"
                      className="text-lg font-bold"
                    >
                      {activeSection.title}
                    </h2>

                    <p className="ax-settings-muted mt-2 text-sm leading-6">
                      {activeSection.description}
                    </p>
                  </div>

                  {activeSection.id === "appearance" && (
                    <>
                      <SettingsRow
                        title="Colour mode"
                        description="Follow your device appearance or choose a fixed light/dark theme."
                      >
                        <SettingsSelect
                          label="Colour mode"
                          value={draft.theme}
                          options={THEME_OPTIONS}
                          onChange={(value) =>
                            patch(
                              "theme",
                              value as AppSettings["theme"]
                            )
                          }
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="Brand accent"
                        description="Changes connected interface accents, not your logo or document cell colours."
                      >
                        <SettingsSelect
                          label="Brand accent"
                          value={draft.accent}
                          options={ACCENT_OPTIONS}
                          onChange={(value) =>
                            patch(
                              "accent",
                              value as AppSettings["accent"]
                            )
                          }
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="Interface density"
                        description="Controls spacing in settings elements that use the shared density tokens."
                      >
                        <SettingsSelect
                          label="Interface density"
                          value={draft.density}
                          options={DENSITY_OPTIONS}
                          onChange={(value) =>
                            patch(
                              "density",
                              value as AppSettings["density"]
                            )
                          }
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="Reduced motion"
                        description="Your operating system's reduced-motion preference is also respected."
                      >
                        <SettingsToggle
                          label="Reduce interface motion"
                          checked={draft.reducedMotion}
                          onChange={(value) =>
                            patch("reducedMotion", value)
                          }
                        />
                      </SettingsRow>

                      <div
                        className="mt-5 rounded-xl border p-4"
                        style={{
                          borderColor: "var(--ax-border)",
                        }}
                      >
                        <p className="text-xs font-semibold">
                          Currently active
                        </p>

                        <p className="ax-settings-muted mt-2 text-xs leading-6">
                          Theme: {resolvedTheme}
                          <br />
                          Reduced motion:{" "}
                          {effectiveReducedMotion
                            ? "On"
                            : "Off"}
                        </p>
                      </div>

                      <IntegrationNote>
                        Theme, accent and motion are applied
                        after Save to this Settings interface
                        and other components explicitly using
                        the provider's styles. Existing
                        hard-coded Home, Workbook and Photo
                        Studio colours are not automatically
                        rewritten.
                      </IntegrationNote>
                    </>
                  )}

                  {activeSection.id === "formats" && (
                    <>
                      <SettingsRow
                        title="Regional format"
                        description="Sets number/date formatting preferences. This does not translate the interface."
                      >
                        <SettingsSelect
                          label="Regional format"
                          value={draft.locale}
                          options={LOCALE_OPTIONS}
                          onChange={(value) =>
                            patch(
                              "locale",
                              value as AppSettings["locale"]
                            )
                          }
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="Default currency"
                        description="Does not convert amounts or overwrite currency formats in existing cells."
                      >
                        <SettingsSelect
                          label="Default currency"
                          value={draft.currency}
                          options={CURRENCY_OPTIONS}
                          onChange={(value) =>
                            patch(
                              "currency",
                              value as AppSettings["currency"]
                            )
                          }
                        />
                      </SettingsRow>

                      <div
                        className="mt-5 rounded-xl border p-5"
                        style={{
                          borderColor: "var(--ax-border)",
                        }}
                      >
                        <h3 className="text-sm font-semibold">
                          Draft formatting preview
                        </h3>

                        <dl className="mt-4 space-y-4">
                          <div>
                            <dt className="ax-settings-muted text-xs">
                              Currency sample
                            </dt>
                            <dd className="mt-1 break-words text-xl font-semibold">
                              {currencyPreview}
                            </dd>
                          </div>

                          <div>
                            <dt className="ax-settings-muted text-xs">
                              Number sample
                            </dt>
                            <dd className="mt-1 text-sm">
                              {numberPreview}
                            </dd>
                          </div>

                          <div>
                            <dt className="ax-settings-muted text-xs">
                              Date sample — 15 January 2026
                            </dt>
                            <dd className="mt-1 text-sm">
                              {datePreview}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <IntegrationNote>
                        The preview responds immediately.
                        Other modules must read the saved locale
                        and currency settings to use these
                        defaults.
                      </IntegrationNote>
                    </>
                  )}

                  {activeSection.id === "workbook" && (
                    <>
                      <SettingsRow
                        title="New workbook name"
                        description="A default name for newly created blank workbooks."
                      >
                        <input
                          type="text"
                          aria-label="Default workbook name"
                          maxLength={
                            SETTINGS_LIMITS.workbookNameLength
                          }
                          value={draft.workbookName}
                          onChange={(event) =>
                            patch(
                              "workbookName",
                              event.target.value
                            )
                          }
                          className={FIELD_CLASS}
                          autoComplete="off"
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="Default font size"
                        description={`Whole numbers from ${SETTINGS_LIMITS.fontSizeMin} to ${SETTINGS_LIMITS.fontSizeMax}.`}
                      >
                        <input
                          type="number"
                          aria-label="Default workbook font size"
                          min={SETTINGS_LIMITS.fontSizeMin}
                          max={SETTINGS_LIMITS.fontSizeMax}
                          step={1}
                          value={draft.fontSize || ""}
                          onChange={(event) =>
                            patch(
                              "fontSize",
                              Number(event.target.value)
                            )
                          }
                          className={FIELD_CLASS}
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="Gridlines"
                        description="Preferred gridline visibility for a new workbook."
                      >
                        <SettingsToggle
                          label="Show gridlines"
                          checked={draft.gridlines}
                          onChange={(value) =>
                            patch("gridlines", value)
                          }
                        />
                      </SettingsRow>

                      <IntegrationNote>
                        These preferences are saved and
                        available through useAppSettings.
                        Your existing workbook-creation code
                        must read them when creating a new
                        document. Saving here does not modify
                        an open workbook or a built-in template.
                      </IntegrationNote>
                    </>
                  )}

                  {activeSection.id === "photo" && (
                    <>
                      <SettingsRow
                        title="Preferred export format"
                        description="The initial export choice for a new image-editing session."
                      >
                        <SettingsSelect
                          label="Photo export format"
                          value={draft.photoFormat}
                          options={PHOTO_FORMAT_OPTIONS}
                          onChange={(value) =>
                            patch(
                              "photoFormat",
                              value as AppSettings["photoFormat"]
                            )
                          }
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="JPEG / WebP quality"
                        description="A value from 10 to 100. PNG export does not use this quality preference."
                      >
                        <input
                          type="number"
                          aria-label="Preferred image export quality"
                          min={SETTINGS_LIMITS.photoQualityMin}
                          max={SETTINGS_LIMITS.photoQualityMax}
                          step={1}
                          value={draft.photoQuality || ""}
                          onChange={(event) =>
                            patch(
                              "photoQuality",
                              Number(event.target.value)
                            )
                          }
                          className={FIELD_CLASS}
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="Preferred export width"
                        description="A preference, not a guarantee. The editor must still enforce image dimensions and total-pixel limits."
                      >
                        <div>
                          <input
                            type="number"
                            aria-label="Preferred image export width in pixels"
                            min={SETTINGS_LIMITS.photoWidthMin}
                            max={SETTINGS_LIMITS.photoWidthMax}
                            step={1}
                            value={draft.photoWidth || ""}
                            onChange={(event) =>
                              patch(
                                "photoWidth",
                                Number(event.target.value)
                              )
                            }
                            className={FIELD_CLASS}
                          />

                          <p className="ax-settings-muted mt-2 text-xs">
                            Pixels ·{" "}
                            {SETTINGS_LIMITS.photoWidthMin}
                            –
                            {SETTINGS_LIMITS.photoWidthMax}
                          </p>
                        </div>
                      </SettingsRow>

                      <IntegrationNote>
                        Photo Studio must read these saved
                        defaults when initializing a new image
                        session. Loaded projects and active
                        editing choices should not be
                        overwritten automatically.
                      </IntegrationNote>
                    </>
                  )}

                  {activeSection.id === "backup" && (
                    <>
                      <SettingsRow
                        title="Export preferences"
                        description="Downloads the current validated draft as a versioned JSON backup. Does not include documents or images."
                      >
                        <button
                          type="button"
                          className={BUTTON_CLASS}
                          onClick={exportDraft}
                        >
                          Export settings JSON
                        </button>
                      </SettingsRow>

                      <SettingsRow
                        title="Import preferences"
                        description="Maximum 100 KB. Imported settings are validated and loaded into the draft for review."
                      >
                        <button
                          type="button"
                          className={BUTTON_CLASS}
                          onClick={() =>
                            importInputRef.current?.click()
                          }
                        >
                          Choose backup file
                        </button>

                        <input
                          ref={importInputRef}
                          type="file"
                          accept=".json,application/json"
                          aria-label="Import settings backup"
                          className="hidden"
                          onChange={(event) => {
                            void importBackup(event);
                          }}
                        />
                      </SettingsRow>

                      <SettingsRow
                        title="Reset preferences"
                        description="Loads defaults into the draft. Your workbook files, images and other site storage are not deleted."
                      >
                        <button
                          type="button"
                          className={BUTTON_CLASS}
                          onClick={resetDraft}
                        >
                          Reset settings draft
                        </button>
                      </SettingsRow>

                      <IntegrationNote>
                        Exporting does not apply a draft.
                        Importing and resetting do not
                        overwrite saved preferences until
                        Save changes succeeds. Keep separate
                        backups of your workbooks and Photo
                        Studio projects.
                      </IntegrationNote>
                    </>
                  )}

                  {activeSection.id === "about" && (
                    <div className="mt-5 space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Settings schema
                        </h3>

                        <p className="ax-settings-muted mt-2 text-sm leading-7">
                          Version {SETTINGS_SCHEMA_VERSION}.
                          This identifies the preferences
                          file format, not a verified ALIMXL
                          application release.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">
                          Storage & privacy
                        </h3>

                        <p className="ax-settings-muted mt-2 text-sm leading-7">
                          Preferences are stored in this
                          browser's localStorage for this site.
                          They are not encrypted or synchronized
                          to an account. This module does not
                          store passwords, access tokens, API
                          keys or payment information.
                        </p>

                        <p className="ax-settings-muted mt-3 text-sm leading-7">
                          Clearing browser site data may remove
                          preferences and other locally stored
                          application data. Export documents
                          and editable photo projects
                          separately before clearing site data.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">
                          Network scope
                        </h3>

                        <p className="ax-settings-muted mt-2 text-sm leading-7">
                          This settings module does not send
                          preferences to a server or make
                          analytics requests. This statement
                          does not describe network activity
                          elsewhere in the application.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">
                          Features requiring backend integration
                        </h3>

                        <p className="ax-settings-muted mt-2 text-sm leading-7">
                          Accounts, password changes,
                          multi-factor authentication,
                          permissions, billing and cloud sync
                          are not implemented by these three
                          settings files.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href="/"
                          className={BUTTON_CLASS}
                          onClick={(event) => {
                            if (!confirmNavigation()) {
                              event.preventDefault();
                            }
                          }}
                        >
                          Home / Workbooks
                        </Link>

                        <Link
                          href="/photo-studio"
                          className={BUTTON_CLASS}
                          onClick={(event) => {
                            if (!confirmNavigation()) {
                              event.preventDefault();
                            }
                          }}
                        >
                          Open Photo Studio
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              </fieldset>
            ) : (
              <section className="ax-settings-panel rounded-2xl p-6">
                <h2 className="text-lg font-semibold">
                  No matching settings category
                </h2>

                <p className="ax-settings-muted mt-3 text-sm leading-6">
                  Try a keyword such as theme, currency,
                  workbook, photo or backup.
                </p>

                <button
                  type="button"
                  className={`${BUTTON_CLASS} mt-4`}
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              </section>
            )}

            <footer className="ax-settings-muted pb-6 text-xs leading-6">
              Preferences apply to this browser and
              explicitly connected modules. Existing
              documents are not rewritten.
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}