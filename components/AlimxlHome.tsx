"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import * as Icons from "lucide-react";

import { useAppSettings } from "./SettingsProvider";
import { ACCENT_COLORS } from "../lib/app-settings";

interface TemplateCard {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface RecentCard {
  id: string;
  name: string;
  openedAt: string;
}

interface AlimxlHomeProps {
  templates: readonly TemplateCard[];
  recentFiles: readonly RecentCard[];
  onBlank: () => void;
  onOpen: () => void;
  onTemplate: (id: string) => void;
  onRecent: (id: string) => void;
  onMyFiles: () => void;
  onContinue: () => void;
}

type HomeTab = "home" | "new";

type RecentSort = "newest" | "name";

type HomeRoute = "/settings" | "/photo-studio";

interface HomeThemeStyle extends CSSProperties {
  "--home-bg": string;
  "--home-panel": string;
  "--home-panel-soft": string;
  "--home-text": string;
  "--home-muted": string;
  "--home-border": string;
  "--home-hover": string;
  "--home-accent": string;
  "--home-accent-soft": string;
  "--home-gold": string;
}

const BRAND_LOGO_SRC = "/favicon.ico";

const TEMPLATE_ACCENTS = [
  "#107C41",
  "#175CD3",
  "#6941C6",
  "#B54708",
  "#087E8B",
  "#B93865",
] as const;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[var(--home-accent)] " +
  "focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-[var(--home-panel)]";

const SIDEBAR_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-inset focus-visible:ring-[#F5D572]";

function timestampOf(iso: string): number {
  const value = Date.parse(iso);

  return Number.isFinite(value) ? value : 0;
}

function relativeTime(
  iso: string,
  now: number,
  locale: string
): string {
  const timestamp = Date.parse(iso);

  if (!Number.isFinite(timestamp)) {
    return "Unknown date";
  }

  const minutes = Math.max(
    0,
    Math.floor((now - timestamp) / 60_000)
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(timestamp));
}

function greetingAt(timestamp: number): string {
  const hour = new Date(timestamp).getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function BrandLogo() {
  const [failed, setFailed] = useState(false);

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#D4AF37]/40 bg-[#061744] shadow-sm">
      {failed ? (
        <span
          aria-label="ALIMXL"
          className="text-base font-black tracking-tight text-[#F5D572]"
        >
          AX
        </span>
      ) : (
        <Image
          src={BRAND_LOGO_SRC}
          alt="ALIMXL logo"
          width={44}
          height={44}
          unoptimized
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export default function AlimxlHome({
  templates,
  recentFiles,
  onBlank,
  onOpen,
  onTemplate,
  onRecent,
  onMyFiles,
  onContinue,
}: AlimxlHomeProps) {
  const router = useRouter();

  const {
    settings,
    resolvedTheme,
    effectiveReducedMotion,
  } = useAppSettings();

  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const [tab, setTab] = useState<HomeTab>("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [recentSort, setRecentSort] =
    useState<RecentSort>("newest");

  /*
   * null keeps the server and initial client output identical.
   * Relative time and greeting are resolved after mounting.
   */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const refreshClock = (): void => {
      setNow(Date.now());
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === "visible") {
        refreshClock();
      }
    };

    refreshClock();

    const interval = window.setInterval(
      refreshClock,
      60_000
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  useEffect(() => {
    const handleShortcut = (
      event: KeyboardEvent
    ): void => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        searchRef.current?.focus();
        searchRef.current?.select();

        return;
      }

      if (
        event.key === "Escape" &&
        document.activeElement === searchRef.current
      ) {
        event.preventDefault();

        if (searchRef.current?.value) {
          setQuery("");
        } else {
          searchRef.current?.blur();
        }
      }
    };

    window.addEventListener(
      "keydown",
      handleShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleShortcut
      );
    };
  }, []);

  const navigateToTool = useCallback(
    (route: HomeRoute): void => {
      const destination =
        route === "/settings"
          ? "Settings"
          : "Photo Studio";

      const confirmed = window.confirm(
        `Open ${destination}? ` +
          "Save any unsaved workbook changes before leaving this page. " +
          "This action does not save your workbook."
      );

      if (!confirmed) return;

      router.push(route);
    },
    [router]
  );

  function switchTab(nextTab: HomeTab): void {
    setTab(nextTab);

    mainRef.current?.scrollTo({
      top: 0,
      behavior: effectiveReducedMotion
        ? "auto"
        : "smooth",
    });
  }

  const search = query.trim().toLocaleLowerCase();

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          templates
            .map((template) => template.category)
            .filter((value) => value.trim().length > 0)
        )
      ).sort((first, second) =>
        first.localeCompare(second)
      ),
    [templates]
  );

  /*
   * A removed category is treated as "all" without forcing
   * a state update during prop changes.
   */
  const activeCategory =
    category !== null && categories.includes(category)
      ? category
      : null;

  const indexedTemplates = useMemo(
    () =>
      templates.map((template, index) => ({
        template,
        accent:
          TEMPLATE_ACCENTS[
            index % TEMPLATE_ACCENTS.length
          ],
      })),
    [templates]
  );

  const matchingTemplates = useMemo(
    () =>
      indexedTemplates.filter(({ template }) => {
        const matchesSearch = [
          template.name,
          template.category,
          template.description,
        ].some((value) =>
          value.toLocaleLowerCase().includes(search)
        );

        const matchesCategory =
          activeCategory === null ||
          template.category === activeCategory;

        return matchesSearch && matchesCategory;
      }),
    [indexedTemplates, search, activeCategory]
  );

  const visibleTemplates =
    tab === "home" &&
    !search &&
    activeCategory === null
      ? matchingTemplates.slice(0, 5)
      : matchingTemplates;

  const matchingRecent = useMemo(() => {
    const filtered = recentFiles.filter((file) =>
      file.name.toLocaleLowerCase().includes(search)
    );

    return filtered.sort((first, second) => {
      if (recentSort === "name") {
        return first.name.localeCompare(
          second.name,
          settings.locale,
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      }

      return (
        timestampOf(second.openedAt) -
        timestampOf(first.openedAt)
      );
    });
  }, [
    recentFiles,
    search,
    recentSort,
    settings.locale,
  ]);

  const dark = resolvedTheme === "dark";
  const compact = settings.density === "compact";
  const accent = ACCENT_COLORS[settings.accent];

  const themeStyle: HomeThemeStyle = {
    "--home-bg": dark ? "#081322" : "#F7F9F8",
    "--home-panel": dark ? "#111F31" : "#FFFFFF",
    "--home-panel-soft": dark ? "#15283A" : "#F3FAF5",
    "--home-text": dark ? "#EDF5F0" : "#18352A",
    "--home-muted": dark ? "#A3B5AC" : "#61776A",
    "--home-border": dark ? "#2A3C4D" : "#DEE8E1",
    "--home-hover": dark ? "#1A3043" : "#EEF6F0",
    "--home-accent": accent,
    "--home-accent-soft": dark ? "#153A34" : "#EAF4ED",
    "--home-gold": dark ? "#F0D485" : "#916E1C",
    colorScheme: dark ? "dark" : "light",
  };

  const navigation = [
    {
      key: "home",
      label: "Home",
      icon: Icons.Home,
      active: tab === "home",
      onClick: () => switchTab("home"),
    },
    {
      key: "new",
      label: "New workbook",
      icon: Icons.FilePlus,
      active: tab === "new",
      onClick: () => switchTab("new"),
    },
    {
      key: "open",
      label: "Open file",
      icon: Icons.FolderOpen,
      active: false,
      onClick: onOpen,
    },
    {
      key: "files",
      label: "My Files",
      icon: Icons.HardDrive,
      active: false,
      onClick: onMyFiles,
    },
    {
      key: "photo-studio",
      label: "Photo Studio",
      icon: Icons.Image,
      active: false,
      onClick: () =>
        navigateToTool("/photo-studio"),
    },
  ];

  const cardClass =
    "group flex h-full flex-col rounded-2xl border " +
    "border-[var(--home-border)] bg-[var(--home-panel)] " +
    "p-3 text-left shadow-sm transition duration-200 " +
    "hover:border-[var(--home-accent)] hover:shadow-md " +
    (effectiveReducedMotion
      ? ""
      : "motion-safe:hover:-translate-y-1 ") +
    FOCUS_RING;

  const subtleButton =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 " +
    "text-sm font-semibold text-[var(--home-accent)] " +
    "transition hover:bg-[var(--home-hover)] " +
    FOCUS_RING;

  return (
    <section
      aria-label="ALIMXL Home"
      style={themeStyle}
      className="ax-settings-surface fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[var(--home-bg)] font-sans text-[var(--home-text)] print:hidden"
    >
      <header className="relative z-10 flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--home-border)] bg-[var(--home-panel)] px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-3">
          <BrandLogo />

          <div>
            <p className="text-lg font-black tracking-[0.08em]">
              ALIM
              <span className="text-[var(--home-gold)]">
                XL
              </span>
            </p>

            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--home-muted)]">
              Spreadsheet workspace
            </p>
          </div>
        </div>

        <label className="order-3 flex w-full items-center gap-2 rounded-xl border border-[var(--home-border)] bg-[var(--home-bg)] px-3 transition focus-within:border-[var(--home-accent)] focus-within:ring-2 focus-within:ring-[var(--home-accent)] sm:order-none sm:mx-auto sm:max-w-xl sm:flex-1">
          <Icons.Search
            size={18}
            className="shrink-0 text-[var(--home-muted)]"
            aria-hidden="true"
          />

          <span className="sr-only">
            Search templates and recent files
          </span>

          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search templates and recent files..."
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--home-text)] outline-none placeholder:text-[var(--home-muted)]"
          />

          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              title="Clear search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className={`rounded-md p-1 text-[var(--home-muted)] hover:text-[var(--home-text)] ${FOCUS_RING}`}
            >
              <Icons.X
                size={16}
                aria-hidden="true"
              />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="hidden shrink-0 rounded border border-[var(--home-border)] px-1.5 py-0.5 text-[10px] text-[var(--home-muted)] lg:block"
            >
              Ctrl / ⌘ K
            </kbd>
          )}
        </label>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <button
            type="button"
            title="Open Settings"
            aria-label="Open Settings"
            onClick={() =>
              navigateToTool("/settings")
            }
            className={`rounded-xl border border-[var(--home-border)] bg-[var(--home-panel)] p-2.5 text-[var(--home-muted)] transition hover:bg-[var(--home-hover)] hover:text-[var(--home-accent)] ${FOCUS_RING}`}
          >
            <Icons.Settings
              size={19}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={onContinue}
            className={`inline-flex items-center gap-2 rounded-xl border border-[var(--home-border)] bg-[var(--home-panel)] px-3 py-2.5 text-sm font-semibold transition hover:border-[var(--home-accent)] hover:bg-[var(--home-hover)] ${FOCUS_RING}`}
          >
            <Icons.ArrowRight
              size={16}
              aria-hidden="true"
            />

            <span className="hidden md:inline">
              Back to workbook
            </span>

            <span className="md:hidden">
              Workbook
            </span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="relative flex w-20 shrink-0 flex-col overflow-y-auto text-white sm:w-56"
          style={{
            background: `linear-gradient(180deg, ${accent} 0%, #073D30 72%, #062A25 100%)`,
          }}
        >
          <div
            className={`hidden border-b border-white/10 px-6 sm:block ${
              compact ? "py-4" : "py-6"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#EAD58F]">
              Your workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-white/75">
              Organize your work.
              <br />
              Bring your ideas to life.
            </p>
          </div>

          <nav
            aria-label="Home navigation"
            className="space-y-2 px-2 py-4 sm:px-3"
          >
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  onClick={item.onClick}
                  aria-current={
                    item.active ? "page" : undefined
                  }
                  className={`relative flex w-full flex-col items-center gap-2 rounded-xl px-2 text-[10px] font-semibold transition duration-200 sm:flex-row sm:gap-3 sm:px-4 sm:text-sm ${
                    compact ? "py-3" : "py-4"
                  } ${
                    item.active
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  } ${SIDEBAR_FOCUS}`}
                >
                  {item.active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[#F5D572]"
                    />
                  )}

                  <Icon
                    size={21}
                    strokeWidth={1.7}
                    className={
                      item.active
                        ? "text-[#F5D572]"
                        : ""
                    }
                    aria-hidden="true"
                  />

                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto px-2 pb-5 pt-5 sm:px-3">
            <div className="border-t border-white/15 pt-3">
              <button
                type="button"
                title="Settings"
                onClick={() =>
                  navigateToTool("/settings")
                }
                className={`flex w-full flex-col items-center gap-2 rounded-xl px-2 py-3 text-[10px] font-semibold text-white/85 transition hover:bg-white/10 hover:text-white sm:flex-row sm:gap-3 sm:px-4 sm:text-sm ${SIDEBAR_FOCUS}`}
              >
                <Icons.Settings
                  size={21}
                  strokeWidth={1.7}
                  className="text-[#F5D572]"
                  aria-hidden="true"
                />

                <span>Settings</span>
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-2 py-4 text-center sm:px-4 sm:text-left">
              <p className="text-xs font-bold tracking-widest text-[#F5D572]">
                ALIMXL
              </p>

              <p className="mt-2 hidden text-xs leading-5 text-white/65 sm:block">
                Your ideas. Your data.
                <br />
                One organized workspace.
              </p>
            </div>
          </div>
        </aside>

        <main
          ref={mainRef}
          aria-label="Workspace overview"
          className="min-w-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div
            className={`mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-10 ${
              compact
                ? "py-4 lg:py-5"
                : "py-6 lg:py-8"
            }`}
          >
            <section
              className={`relative overflow-hidden rounded-3xl border border-[var(--home-border)] shadow-sm ${
                compact
                  ? "p-5 sm:p-6"
                  : "p-5 sm:p-8"
              }`}
              style={{
                background:
                  "linear-gradient(135deg, var(--home-panel), var(--home-panel-soft))",
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[40px] opacity-[0.06]"
                style={{ borderColor: accent }}
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full border-[25px] border-[#D4AF37]/10"
              />

              <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--home-gold)] sm:text-xs">
                    Welcome to your ALIMXL workspace
                  </p>

                  <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                    {tab === "home"
                      ? now === null
                        ? "Welcome back."
                        : `${greetingAt(now)}.`
                      : "Your next great workbook."}
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--home-muted)]">
                    {tab === "home"
                      ? "Start fresh, explore a ready-made template, or pick up where you left off."
                      : "Choose a template for your workflow, or build something entirely your own."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onBlank}
                      className={`inline-flex items-center gap-2 rounded-xl bg-[var(--home-accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 ${FOCUS_RING}`}
                    >
                      <Icons.Plus
                        size={18}
                        aria-hidden="true"
                      />
                      Blank workbook
                    </button>

                    <button
                      type="button"
                      onClick={onOpen}
                      className={`inline-flex items-center gap-2 rounded-xl border border-[var(--home-border)] bg-[var(--home-panel)] px-5 py-3 text-sm font-semibold transition hover:border-[var(--home-accent)] hover:bg-[var(--home-hover)] ${FOCUS_RING}`}
                    >
                      <Icons.FolderOpen
                        size={18}
                        aria-hidden="true"
                      />
                      Open file
                    </button>
                  </div>
                </div>

                <div className="flex shrink-0 gap-3">
                  {[
                    {
                      label: "Templates",
                      value: templates.length,
                      icon: Icons.LayoutGrid,
                    },
                    {
                      label: "Recent files",
                      value: recentFiles.length,
                      icon: Icons.Clock,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="min-w-[112px] flex-1 rounded-2xl border border-[var(--home-border)] bg-[var(--home-panel)] p-4 sm:min-w-[130px]"
                      >
                        <Icon
                          size={20}
                          className="text-[var(--home-accent)]"
                          aria-hidden="true"
                        />

                        <p className="mt-3 text-2xl font-bold">
                          {item.value}
                        </p>

                        <p className="mt-1 text-xs text-[var(--home-muted)]">
                          {item.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section
              aria-labelledby="alimxl-new-heading"
              className={compact ? "mt-6" : "mt-8"}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="alimxl-new-heading"
                    className="text-xl font-bold tracking-tight"
                  >
                    {tab === "home"
                      ? "Create something new"
                      : "Template library"}
                  </h2>

                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-1 text-xs text-[var(--home-muted)]"
                  >
                    {search || activeCategory !== null
                      ? `${matchingTemplates.length} matching templates`
                      : "A head start for your next project."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label>
                    <span className="sr-only">
                      Filter templates by category
                    </span>

                    <select
                      value={activeCategory ?? ""}
                      onChange={(event) =>
                        setCategory(
                          event.target.value || null
                        )
                      }
                      className={`rounded-xl border border-[var(--home-border)] bg-[var(--home-panel)] px-3 py-2 text-xs text-[var(--home-text)] ${FOCUS_RING}`}
                    >
                      <option value="">
                        All categories
                      </option>

                      {categories.map((value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  {tab === "home" && (
                    <button
                      type="button"
                      onClick={() =>
                        switchTab("new")
                      }
                      className={subtleButton}
                    >
                      All templates
                      <Icons.ArrowRight
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              </div>

              <div
                className={`grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 ${
                  compact ? "gap-3" : "gap-4"
                }`}
              >
                <button
                  type="button"
                  onClick={onBlank}
                  className={cardClass}
                >
                  <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--home-border)] bg-[var(--home-panel-soft)]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-50"
                    >
                      {Array.from(
                        { length: 24 },
                        (_, index) => (
                          <span
                            key={index}
                            className="border-b border-r border-[var(--home-border)]"
                          />
                        )
                      )}
                    </div>

                    <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--home-panel)] text-[var(--home-accent)] shadow-sm transition group-hover:bg-[var(--home-accent)] group-hover:text-white">
                      <Icons.Plus
                        size={27}
                        aria-hidden="true"
                      />
                    </span>
                  </div>

                  <div className="px-1 pb-1 pt-4">
                    <p className="text-sm font-bold">
                      Blank workbook
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[var(--home-muted)]">
                      A clean canvas for your ideas.
                    </p>
                  </div>
                </button>

                {visibleTemplates.map(
                  ({ template, accent: templateAccent }) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() =>
                        onTemplate(template.id)
                      }
                      className={cardClass}
                    >
                      <div className="relative h-36 w-full overflow-hidden rounded-xl border border-[var(--home-border)] bg-[var(--home-panel-soft)]">
                        <div
                          className="h-1.5"
                          style={{
                            backgroundColor:
                              templateAccent,
                          }}
                        />

                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="truncate text-[9px] font-bold uppercase tracking-wider"
                              style={{
                                color: dark
                                  ? "var(--home-text)"
                                  : templateAccent,
                              }}
                            >
                              {template.category}
                            </span>

                            <Icons.FileSpreadsheet
                              size={17}
                              className="shrink-0"
                              style={{
                                color: dark
                                  ? "var(--home-text)"
                                  : templateAccent,
                              }}
                              aria-hidden="true"
                            />
                          </div>

                          <p className="mt-2 line-clamp-2 text-xs font-bold leading-5">
                            {template.name}
                          </p>

                          <div
                            className="mt-3 space-y-1.5"
                            aria-hidden="true"
                          >
                            {[100, 78, 90].map(
                              (width, row) => (
                                <div
                                  key={row}
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: `${width}%`,
                                    backgroundColor:
                                      templateAccent,
                                    opacity:
                                      row === 0
                                        ? dark
                                          ? 0.7
                                          : 0.25
                                        : dark
                                          ? 0.35
                                          : 0.1,
                                  }}
                                />
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                        <p className="text-sm font-bold leading-5">
                          {template.name}
                        </p>

                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--home-muted)]">
                          {template.description}
                        </p>

                        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-semibold text-[var(--home-accent)]">
                          Use template
                          <Icons.ArrowUpRight
                            size={14}
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </button>
                  )
                )}
              </div>

              {matchingTemplates.length === 0 && (
                <div
                  role="status"
                  className="mt-4 rounded-xl border border-[var(--home-border)] bg-[var(--home-panel)] p-4"
                >
                  <p className="text-sm text-[var(--home-muted)]">
                    {templates.length === 0
                      ? "No templates are available yet. You can still create a blank workbook."
                      : "No templates match the current search and category."}
                  </p>

                  {(query || activeCategory !== null) && (
                    <button
                      type="button"
                      className={`${subtleButton} mt-2`}
                      onClick={() => {
                        setQuery("");
                        setCategory(null);
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </section>

            {tab === "home" && (
              <section
                aria-labelledby="alimxl-recent-heading"
                className={compact ? "mt-7" : "mt-9"}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2
                      id="alimxl-recent-heading"
                      className="text-xl font-bold tracking-tight"
                    >
                      Recent workbooks
                    </h2>

                    <p className="mt-1 text-xs text-[var(--home-muted)]">
                      {search
                        ? `${matchingRecent.length} matching workbooks`
                        : "Continue from where you left off."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label>
                      <span className="sr-only">
                        Sort recent workbooks
                      </span>

                      <select
                        value={recentSort}
                        onChange={(event) =>
                          setRecentSort(
                            event.target.value === "name"
                              ? "name"
                              : "newest"
                          )
                        }
                        className={`rounded-xl border border-[var(--home-border)] bg-[var(--home-panel)] px-3 py-2 text-xs ${FOCUS_RING}`}
                      >
                        <option value="newest">
                          Last opened
                        </option>

                        <option value="name">
                          Name A–Z
                        </option>
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={onMyFiles}
                      className={subtleButton}
                    >
                      My Files
                      <Icons.ArrowRight
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--home-border)] bg-[var(--home-panel)] shadow-sm">
                  {matchingRecent.length === 0 ? (
                    <div className="flex flex-col items-center px-5 py-10 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--home-panel-soft)] text-[var(--home-accent)]">
                        <Icons.FolderOpen
                          size={26}
                          aria-hidden="true"
                        />
                      </span>

                      <h3 className="mt-4 text-sm font-bold">
                        {search
                          ? "No matching workbooks"
                          : "Your workspace starts here"}
                      </h3>

                      <p className="mt-2 max-w-sm text-xs leading-6 text-[var(--home-muted)]">
                        {search
                          ? "Try another name or clear the search to see your recent workbooks."
                          : "Create a workbook or open an existing file to get started."}
                      </p>

                      {search ? (
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className={`${subtleButton} mt-4`}
                        >
                          Clear search
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onBlank}
                          className={`mt-5 rounded-lg border border-[var(--home-border)] px-4 py-2 text-xs font-semibold text-[var(--home-accent)] transition hover:bg-[var(--home-hover)] ${FOCUS_RING}`}
                        >
                          Create a workbook
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between border-b border-[var(--home-border)] bg-[var(--home-panel-soft)] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--home-muted)]">
                        <span>Workbook</span>
                        <span>Last opened</span>
                      </div>

                      {matchingRecent.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() =>
                            onRecent(file.id)
                          }
                          className={`flex w-full items-center justify-between gap-3 border-b border-[var(--home-border)] px-4 text-left transition last:border-b-0 hover:bg-[var(--home-hover)] sm:px-5 ${
                            compact ? "py-3" : "py-4"
                          } ${FOCUS_RING}`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--home-border)] bg-[var(--home-panel-soft)] text-[var(--home-accent)]">
                              <Icons.FileSpreadsheet
                                size={22}
                                aria-hidden="true"
                              />
                            </span>

                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">
                                {file.name}
                              </span>

                              <span className="mt-1 block text-xs text-[var(--home-muted)]">
                                ALIMXL workbook
                              </span>
                            </span>
                          </span>

                          <span className="flex shrink-0 items-center gap-3 text-xs text-[var(--home-muted)]">
                            <span title={file.openedAt}>
                              {now === null
                                ? "—"
                                : relativeTime(
                                    file.openedAt,
                                    now,
                                    settings.locale
                                  )}
                            </span>

                            <Icons.ChevronRight
                              size={16}
                              className="hidden sm:block"
                              aria-hidden="true"
                            />
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </section>
            )}

            <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--home-border)] pt-5 text-[10px] text-[var(--home-muted)]">
              <span className="font-semibold tracking-[0.12em]">
                ALIMXL WORKSPACE
              </span>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">
                  Built around your workflow.
                </span>

                <button
                  type="button"
                  onClick={() =>
                    navigateToTool("/settings")
                  }
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold hover:text-[var(--home-accent)] ${FOCUS_RING}`}
                >
                  <Icons.Settings
                    size={13}
                    aria-hidden="true"
                  />
                  Preferences
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </section>
  );
}