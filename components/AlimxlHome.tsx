"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
  Database,
  Download,
  FilePlus,
  FileSpreadsheet,
  FolderOpen,
  HardDrive,
  HelpCircle,
  Home as HomeIcon,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  Star,
  TriangleAlert,
  Upload,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";

import WelcomeGate from "./WelcomeGate";
import AccountMenu from "./AccountMenu";
import { useAppSettings } from "./SettingsProvider";

import { BUILT_IN_TEMPLATES } from "../lib/built-in-templates";

import type { WorkbookSnapshot } from "../lib/built-in-templates";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

type HomeAction = () => void | Promise<void>;

export interface AlimxlHomeProps {
  templates: readonly TemplateCard[];
  recentFiles: readonly RecentCard[];

  onBlank: HomeAction;
  onOpen: HomeAction;
  onTemplate: (id: string) => void | Promise<void>;
  onRecent: (id: string) => void | Promise<void>;
  onMyFiles: HomeAction;
  onContinue: HomeAction;

  hasUnsavedChanges?: boolean;

  /** Opens the selected template's own snapshot through the workbook system. */
  onTemplateSnapshot?: (
    snapshot: WorkbookSnapshot,
    templateId: string
  ) => void | Promise<void>;

  onImportData?: HomeAction;
  onExportData?: HomeAction;
  onBackupRestore?: HomeAction;
  onHelp?: HomeAction;

  heroImageSrc?: string;
  templateImages?: Readonly<Record<string, string>>;
  profileImageSrc?: string;
  profileName?: string;
  version?: string;
}

type HomeTab = "home" | "new" | "templates" | "recent" | "favorites";
type RecentSort = "newest" | "name";
type HomeRoute = "/settings" | "/photo-studio";
type DialogKind = "help" | "notifications" | "compare" | null;
type SearchScope = "files" | "templates";

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  hint?: string;
  onClick: () => void;
}

interface AssetImageProps {
  sources: readonly string[];
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
  fallback: ReactNode;
}

interface HomeErrorBoundaryProps {
  onContinue: HomeAction;
  children: ReactNode;
}

interface HomeErrorBoundaryState {
  failed: boolean;
  actionError: string;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const CLOCK_INTERVAL_MS = 60_000;
const HOME_TEMPLATE_LIMIT = 4;

const FAVORITES_KEY = "alimxl.home.favorite-template-ids.v1";

const LOGO_SOURCES = ["/favicon.ico"] as const;

const BANNER_SOURCES = [
  "/icons/banner.png",
  "/icons/banner.jpg",
  "/icons/banner.jpeg",
  "/icons/banner.webp",
  "/icons/banner.avif",
] as const;

const ROUTE_LABELS: Record<HomeRoute, string> = {
  "/settings": "Settings",
  "/photo-studio": "Photo Studio",
};

const CATEGORY_COLORS = [
  "#00872A",
  "#1767D7",
  "#AD00DE",
  "#F09500",
  "#008899",
  "#BD2862",
] as const;

const SEARCH_SCOPES: readonly {
  value: SearchScope;
  label: string;
}[] = [
  { value: "files", label: "Files" },
  { value: "templates", label: "Templates" },
];
/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

function timestampOf(iso: string): number {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

function resolveLocale(locale: string | undefined): string {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([locale ?? ""])[0] ?? "en";
  } catch {
    return "en";
  }
}

function normalizeText(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

function tokenize(query: string): string[] {
  return normalizeText(query).trim().split(/\s+/).filter(Boolean);
}

function matchesAll(
  haystack: string,
  tokens: readonly string[]
): boolean {
  return tokens.every((token) => haystack.includes(token));
}

function greetingAt(timestamp: number): string {
  const hour = new Date(timestamp).getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function relativeTime(
  iso: string,
  now: number,
  dateFormat: Intl.DateTimeFormat
): string {
  const timestamp = Date.parse(iso);

  if (!Number.isFinite(timestamp)) return "Unknown date";

  // Future timestamps should not be shown as "Just now".
  if (timestamp > now) {
    return dateFormat.format(new Date(timestamp));
  }

  const minutes = Math.floor((now - timestamp) / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return dateFormat.format(new Date(timestamp));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The requested action could not be completed.";
}

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Image components                                                           */
/* -------------------------------------------------------------------------- */

function AssetImage({
  sources,
  alt,
  className,
  width = 640,
  height = 360,
  loading = "lazy",
  fallback,
}: AssetImageProps) {
  const signature = sources.join("\n");

  const [failure, setFailure] = useState({
    signature,
    index: 0,
  });

  const index =
    failure.signature === signature ? failure.index : 0;

  const source = sources[index];

  if (!source) return <>{fallback}</>;

  return (
    <Image
      key={`${signature}:${index}`}
      src={source}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      unoptimized
      className={className}
      onError={() => {
        setFailure((current) => {
          const currentIndex =
            current.signature === signature ? current.index : 0;

          // Ignore duplicate errors from an already-replaced source.
          if (currentIndex !== index) return current;

          return {
            signature,
            index: currentIndex + 1,
          };
        });
      }}
    />
  );
}

function BrandLogo({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`axh-logo ${small ? "axh-logo-small" : ""}`}
      aria-label="ALIMXL"
    >
      <AssetImage
        sources={LOGO_SOURCES}
        alt="ALIMXL logo"
        width={small ? 24 : 56}
        height={small ? 24 : 56}
        className="axh-logo-image"
        fallback={<span className="axh-logo-fallback">AX</span>}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal components                                                           */
/* -------------------------------------------------------------------------- */

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;

    if (!dialog) return;

    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      dialog.setAttribute("open", "");
    }

    closeRef.current?.focus();

    return () => {
      if (dialog.open) {
        try {
          dialog.close();
        } catch {
          dialog.removeAttribute("open");
        }
      }

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="axh-modal"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom;

        if (outside) onClose();
      }}
    >
      <div className="axh-modal-heading">
        <h2 id={headingId}>{title}</h2>

        <button
          ref={closeRef}
          type="button"
          className="axh-icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="axh-modal-content">{children}</div>
    </dialog>
  );
}

function ConfirmLeaveDialog({
  destination,
  onConfirm,
  onCancel,
}: {
  destination: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={`Open ${destination}?`} onClose={onCancel}>
      <div className="axh-dialog-message">
        <TriangleAlert size={28} aria-hidden="true" />

        <p>
          Save any unsaved workbook changes before leaving this page.
          Opening {destination} does not save your workbook.
        </p>
      </div>

      <div className="axh-dialog-actions">
        <button
          type="button"
          className="axh-soft-button"
          onClick={onCancel}
        >
          Stay here
        </button>

        <button
          type="button"
          className="axh-green-button"
          onClick={onConfirm}
        >
          Open {destination}
        </button>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Local fallback artwork                                                     */
/* -------------------------------------------------------------------------- */

function TemplateArtwork({
  template,
  accent,
}: {
  template: TemplateCard;
  accent: string;
}) {
  const label = normalizeText(
    `${template.id} ${template.name} ${template.category}`
  );

  if (/budget|finance/.test(label)) {
    return (
      <div className="axh-money-art" aria-hidden="true">
        <span className="axh-coins axh-coins-one" />
        <span className="axh-coins axh-coins-two" />
        <span className="axh-coins axh-coins-three" />
        <span className="axh-growth-arrow">↗</span>
      </div>
    );
  }

  if (/invoice/.test(label)) {
    return (
      <div className="axh-invoice-art" aria-hidden="true">
        <strong>INVOICE</strong>
        <i />
        <i />
        <i />
        <i />
        <span />
      </div>
    );
  }

  if (/attendance|human|\bhr\b/.test(label)) {
    return (
      <div className="axh-people-art" aria-hidden="true">
        <span />
        <span />
        <span />
        <Clock size={58} strokeWidth={1.6} />
      </div>
    );
  }

  if (/inventory|stock/.test(label)) {
    return (
      <div className="axh-box-art" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="axh-generic-art"
      style={{ color: accent }}
      aria-hidden="true"
    >
      <FileSpreadsheet size={78} strokeWidth={1.3} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Home component                                                        */
/* -------------------------------------------------------------------------- */

function AlimxlHomeContent({
  templates,
  recentFiles,
  onBlank,
  onOpen,
  onTemplate,
  onRecent,
  onMyFiles,
  onContinue,
  hasUnsavedChanges = true,
  onTemplateSnapshot,
  onImportData,
  onExportData,
  onBackupRestore,
  onHelp,
  heroImageSrc,
  templateImages,
  profileImageSrc,
  profileName = "User",
  version = "1.0.0",
}: AlimxlHomeProps) {
  const router = useRouter();

  const {
    settings,
    resolvedTheme,
    effectiveReducedMotion,
  } = useAppSettings();

  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const actionLockRef = useRef(false);
  const mountedRef = useRef(false);

  const [tab, setTab] = useState<HomeTab>("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [recentSort, setRecentSort] = useState<RecentSort>("newest");
  const [pendingRoute, setPendingRoute] = useState<HomeRoute | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl K");
  const [searchScope, setSearchScope] = useState<SearchScope>("files");

  const [now, setNow] = useState<number | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

    const [favorites, setFavorites] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [preferencesReady, setPreferencesReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const compact = settings.density === "compact";

  const locale = useMemo(
    () => resolveLocale(settings.locale),
    [settings.locale]
  );

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale]
  );

  const fullDateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "full",
        timeStyle: "short",
      }),
    [locale]
  );

  const collator = useMemo(
    () =>
      new Intl.Collator(locale, {
        numeric: true,
        sensitivity: "base",
      }),
    [locale]
  );

    const bannerSources = useMemo(
    () => heroImageSrc ? [heroImageSrc] : [...BANNER_SOURCES],
    [heroImageSrc]
  );

  const profileSources = useMemo(
    () => profileImageSrc ? [profileImageSrc] : [],
    [profileImageSrc]
  );


  const rootStyle: CSSProperties = {
    colorScheme: resolvedTheme === "dark" ? "dark" : "light",
  };

  /* Mounted state for async action cleanup. */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* Clock and reported network status. */
  useEffect(() => {
    const refreshClock = (): void => setNow(Date.now());

    const refreshNetwork = (): void => {
      setOnline(navigator.onLine);
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === "visible") {
        refreshClock();
        refreshNetwork();
      }
    };

    refreshClock();
    refreshNetwork();

    const interval = window.setInterval(
      refreshClock,
      CLOCK_INTERVAL_MS
    );

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", refreshNetwork);
    window.addEventListener("offline", refreshNetwork);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", refreshNetwork);
      window.removeEventListener("offline", refreshNetwork);
    };
  }, []);

  /* Load local Home preferences after hydration. */
  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.userAgent)) {
      setShortcutLabel("⌘ K");
    }

        const storedFavorites = readPreference(FAVORITES_KEY);

    if (storedFavorites) {
      try {
        const parsed: unknown = JSON.parse(storedFavorites);

        if (Array.isArray(parsed)) {
          const validIds = parsed.filter(
            (item): item is string => typeof item === "string"
          );

          setFavorites(Array.from(new Set(validIds)));
        }
      } catch {
        // Malformed preferences must not block Home.
      }
    }

    setPreferencesReady(true);
  }, []);

  /* Save Home preferences, not workbook data. */
  useEffect(() => {
    if (!preferencesReady) return;

    const savedFavorites = writePreference(
      FAVORITES_KEY,
      JSON.stringify(favorites)
    );

    setStorageWarning(!savedFavorites);
  }, [favorites, preferencesReady]);

  /* Prefetch does not verify offline route availability. */
  useEffect(() => {
    try {
      void Promise.resolve(
        router.prefetch("/settings")
      ).catch(() => undefined);

      void Promise.resolve(
        router.prefetch("/photo-studio")
      ).catch(() => undefined);
    } catch {
      // Prefetch failure must not break the workspace.
    }
  }, [router]);

  /* Search keyboard shortcuts. */
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if (
        event.isComposing ||
        pendingRoute !== null ||
        dialog !== null
      ) {
        return;
      }

      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k";

      const isSlashShortcut =
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTypingTarget(event.target);

      if (isSearchShortcut || isSlashShortcut) {
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

    window.addEventListener("keydown", handleShortcut);

    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, [pendingRoute, dialog]);

  const switchTab = useCallback(
    (nextTab: HomeTab): void => {
      setTab(nextTab);

      mainRef.current?.scrollTo({
        top: 0,
        behavior: effectiveReducedMotion ? "auto" : "smooth",
      });
    },
    [effectiveReducedMotion]
  );

  const navigateToTool = useCallback(
    (route: HomeRoute): void => {
      if (actionLockRef.current) return;

      if (hasUnsavedChanges) {
        setPendingRoute(route);
      } else {
        router.push(route);
      }
    },
    [hasUnsavedChanges, router]
  );

  const runAction = useCallback(
    async (action: HomeAction): Promise<void> => {
      if (actionLockRef.current) return;

      actionLockRef.current = true;
      setBusy(true);
      setMessage("");

      try {
        await action();
      } catch (error) {
        if (mountedRef.current) {
          setMessage(getErrorMessage(error));
        }
      } finally {
        actionLockRef.current = false;

        if (mountedRef.current) setBusy(false);
      }
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Template opening                                                       */
  /* ---------------------------------------------------------------------- */

  const selectTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      if (!preferencesReady || actionLockRef.current) return;

      await runAction(async () => {
        if (!onTemplateSnapshot) {
          /* Preserve the existing legacy template-opening handler. */
          await onTemplate(templateId);
          return;
        }

        const definition = BUILT_IN_TEMPLATES.find(
          (item) => item.id === templateId
        );

        if (!definition) {
          throw new Error(
            "This template is not present in the current template registry."
          );
        }

        /*
         * Preserve the template's own workbook data and currency settings.
         * The Home page does not override a template's currency.
         */
        const templateSnapshot = definition.snapshot;

        const token =
          `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const snapshot: WorkbookSnapshot = {
          ...templateSnapshot,
          id: `workbook-${token}`,
          activeSheetIndex: templateSnapshot.activeSheetIndex ?? 0,
          sheets: templateSnapshot.sheets.map((sheet, index) => ({
            ...sheet,
            id: `sheet-${token}-${index}`,
          })),
        };

        await onTemplateSnapshot(snapshot, templateId);
      });
    },
    [
      onTemplate,
      onTemplateSnapshot,
      preferencesReady,
      runAction,
    ]
  );

  const toggleFavorite = useCallback((templateId: string): void => {
    setFavorites((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId]
    );
  }, []);

  const toggleCompare = useCallback((templateId: string): void => {
    setCompareIds((current) => {
      if (current.includes(templateId)) {
        return current.filter((id) => id !== templateId);
      }

      return current.length < 3
        ? [...current, templateId]
        : current;
    });
  }, []);

  const tokens = useMemo(() => tokenize(query), [query]);
  const hasSearch = tokens.length > 0;

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          templates
            .map((template) => template.category)
            .filter((value) => value.trim().length > 0)
        )
      ).sort((first, second) => collator.compare(first, second)),
    [templates, collator]
  );

  const activeCategory =
    category !== null && categories.includes(category)
      ? category
      : null;

  const matchingTemplates = useMemo(
    () =>
      templates.filter((template) => {
        if (hasSearch && searchScope === "files") return false;

        const haystack = normalizeText(
          `${template.name} ${template.category} ${template.description}`
        );

        return (
          matchesAll(haystack, tokens) &&
          (
            activeCategory === null ||
            template.category === activeCategory
          ) &&
          (
            tab !== "favorites" ||
            favorites.includes(template.id)
          )
        );
      }),
    [
      templates,
      tokens,
      activeCategory,
      tab,
      favorites,
      searchScope,
      hasSearch,
    ]
  );

  const visibleTemplates =
    tab === "home" &&
      !hasSearch &&
      activeCategory === null
      ? matchingTemplates.slice(0, HOME_TEMPLATE_LIMIT)
      : matchingTemplates;

  const matchingRecent = useMemo(
    () =>
      recentFiles
        .filter((file) => {
          if (hasSearch && searchScope === "templates") return false;

          return matchesAll(normalizeText(file.name), tokens);
        })
        .sort((first, second) =>
          recentSort === "name"
            ? collator.compare(first.name, second.name)
            : timestampOf(second.openedAt) - timestampOf(first.openedAt)
        ),
    [recentFiles, tokens, recentSort, collator, searchScope, hasSearch]
  );



  const comparedTemplates = templates.filter(
    (template) => compareIds.includes(template.id)
  );

  const favoriteCount = templates.filter(
    (template) => favorites.includes(template.id)
  ).length;

  const compareCount = comparedTemplates.length;

  const notifications: string[] = [
    ...(storageWarning
      ? [
        "Home preferences could not be stored. " +
        "Current selections remain in memory.",
      ]
      : []),
    ...(online === false
      ? [
        "Network is unavailable. Offline route availability " +
        "depends on the existing application cache.",
      ]
      : []),
  ];

  const navigation: NavItem[] = [
    {
      key: "home",
      label: "Home",
      icon: HomeIcon,
      active: tab === "home",
      onClick: () => switchTab("home"),
    },
    {
      key: "new",
      label: "New Workbook",
      icon: FilePlus,
      active: tab === "new",
      onClick: () => switchTab("new"),
    },
    {
      key: "open",
      label: "Open File",
      icon: FolderOpen,
      disabled: busy,
      onClick: () => void runAction(onOpen),
    },
    {
      key: "files",
      label: "My Files",
      icon: HardDrive,
      disabled: busy,
      onClick: () => void runAction(onMyFiles),
    },
    {
      key: "recent",
      label: "Recent Files",
      icon: Clock,
      active: tab === "recent",
      onClick: () => switchTab("recent"),
    },
    {
      key: "templates",
      label: "Templates",
      icon: LayoutGrid,
      active: tab === "templates",
      onClick: () => switchTab("templates"),
    },
    {
      key: "favorites",
      label: "Favorites",
      icon: Star,
      active: tab === "favorites",
      onClick: () => switchTab("favorites"),
    },
    {
      key: "photo",
      label: "Photo Studio",
      icon: ImageIcon,
      disabled: busy,
      onClick: () => navigateToTool("/photo-studio"),
    },
    {
      key: "import",
      label: "Import Data",
      icon: Upload,
      disabled: !onImportData || busy,
      hint: onImportData
        ? "Import Data"
        : "Import handler is not connected",
      onClick: () => {
        if (onImportData) void runAction(onImportData);
      },
    },
    {
      key: "export",
      label: "Export Data",
      icon: Download,
      disabled: !onExportData || busy,
      hint: onExportData
        ? "Export Data"
        : "Export handler is not connected",
      onClick: () => {
        if (onExportData) void runAction(onExportData);
      },
    },
    {
      key: "backup",
      label: "Backup & Restore",
      icon: Database,
      disabled: !onBackupRestore || busy,
      hint: onBackupRestore
        ? "Backup & Restore"
        : "Backup handler is not connected",
      onClick: () => {
        if (onBackupRestore) void runAction(onBackupRestore);
      },
    },
    {
      key: "settings",
      label: "Settings",
      icon: Settings,
      disabled: busy,
      onClick: () => navigateToTool("/settings"),
    },
    {
      key: "help",
      label: "Help & Support",
      icon: HelpCircle,
      disabled: busy,
      onClick: () => {
        if (onHelp) void runAction(onHelp);
        else setDialog("help");
      },
    },
  ];

  const greeting =
    now === null ? "Welcome back" : greetingAt(now);

  const heroTitle =
    tab === "home"
      ? `${greeting}!`
      : tab === "favorites"
        ? "Your favorites!"
        : tab === "recent"
          ? "Pick up your work!"
          : "Start something new!";

  const heroWords = heroTitle.split(" ");
  const heroFirstWord = heroWords.shift() ?? "";
  const heroRest = heroWords.join(" ");

  const showTemplates = tab !== "recent";
  const showRecent = tab === "home" || tab === "recent";

  return (
    <section
      className="axh-root"
      style={rootStyle}
      data-dark={resolvedTheme === "dark" ? "true" : "false"}
      data-compact={compact ? "true" : "false"}
      data-reduced-motion={effectiveReducedMotion ? "true" : "false"}
      aria-label="ALIMXL Home"
      aria-busy={busy}
    >
      {/* Topbar */}
      <header className="axh-topbar">
        <div className="axh-brand">
          <BrandLogo />

          <div>
            <p>ALIM<span>XL</span></p>
            <small>SPREADSHEET WORKSPACE</small>
          </div>
        </div>


        <div className="axh-search" role="search">
          <label className="axh-search-scope" htmlFor="axh-search-scope">
            <span className="axh-sr-only">
              Choose what to search
            </span>

            <select
              id="axh-search-scope"
              value={searchScope}
              onChange={(event) => {
                setSearchScope(event.target.value as SearchScope);
                setTab("home");
              }}
            >
              {SEARCH_SCOPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <ChevronDown size={13} aria-hidden="true" />
          </label>

          <Search size={20} aria-hidden="true" />

          <label className="axh-sr-only" htmlFor="axh-search-input">
            Search files or templates
          </label>

          <input
            id="axh-search-input"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              searchScope === "templates"
                ? "Search templates..."
                : "Search files..."
            }
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-keyshortcuts="Control+K Meta+K /"
          />

          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              <X size={17} />
            </button>
          ) : (
            <kbd>{shortcutLabel}</kbd>
          )}
        </div>


        <div className="axh-top-actions">
          <span
            className="axh-network"
            data-online={
              online === null
                ? "unknown"
                : online
                  ? "true"
                  : "false"
            }
            title="Reported network status only; connectivity and offline cache are not verified here."
          >
            {online === false
              ? <WifiOff size={18} />
              : <Wifi size={18} />}

            <span>
              {online === null
                ? "Checking"
                : online
                  ? "Online"
                  : "Offline"}
            </span>

            <i />
          </span>

          <button
            type="button"
            className="axh-top-icon"
            aria-label={`Notifications: ${notifications.length}`}
            title="Notifications"
            onClick={() => setDialog("notifications")}
          >
            <Bell size={24} />

            {notifications.length > 0 && (
              <b className="axh-badge">{notifications.length}</b>
            )}
          </button>

          <button
            type="button"
            className="axh-top-labeled"
            title={`${favoriteCount} favorite templates`}
            aria-label={`Favorite templates: ${favoriteCount}`}
            onClick={() => switchTab("favorites")}
          >
            <Star size={24} />
            <span>Wishlist</span>
          </button>

          <button
            type="button"
            className="axh-top-labeled"
            aria-label={`Compare templates: ${compareCount} selected`}
            onClick={() => setDialog("compare")}
          >
            <ArrowLeftRight size={24} />
            <span>Compare{compareCount ? ` (${compareCount})` : ""}</span>
          </button>

                    <button
            type="button"
            className="axh-top-icon"
            aria-label="Open Settings"
            title="Settings"
            disabled={busy}
            onClick={() => navigateToTool("/settings")}
          >
            <Settings size={28} />
          </button>

          <AccountMenu
            fallbackName={profileName}
            disabled={busy}
            renderAvatar={(name) => (
              <AssetImage
                sources={profileSources}
                alt=""
                width={40}
                height={40}
                className="axh-profile-photo"
                fallback={
                  <span className="axh-profile-letter">
                    {name.trim().charAt(0).toUpperCase() || "U"}
                  </span>
                }
              />
            )}
          />
        </div>
      </header>

      <div className="axh-body">
        {/* Sidebar */}
        <aside className="axh-sidebar">
          <div className="axh-sidebar-intro">
            <h2>YOUR WORKSPACE</h2>
            <p>Organize your work.<br />Bring your ideas to life.</p>
          </div>

          <nav className="axh-navigation" aria-label="Home navigation">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.hint ?? item.label}
                  className={item.active ? "is-active" : ""}
                  aria-current={item.active ? "page" : undefined}
                  disabled={item.disabled}
                  onClick={item.onClick}
                >
                  <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                  <span>{item.label}</span>

                  {item.active && (
                    <ChevronRight
                      size={18}
                      className="axh-nav-arrow"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="axh-sidebar-edition">
            <Crown size={36} aria-hidden="true" />

            <div>
              <strong>ALIMXL</strong>
              <span>Spreadsheet Workspace</span>
              <small>v{version}</small>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main
          ref={mainRef}
          className="axh-main"
          aria-label="Workspace overview"
        >
          <div className="axh-main-inner">
            <section className="axh-hero" aria-label="Welcome banner">
              <div className="axh-hero-glow" aria-hidden="true" />

              <div className="axh-hero-copy">
                <p>
                  Welcome to Your <strong>ALIMXL Workspace</strong>
                </p>

                <h1>
                  {heroFirstWord} <span>{heroRest}</span>
                </h1>

                <p className="axh-hero-description">
                  Start fresh, explore a ready-made template, or pick up
                  where you left off.
                </p>

                <div className="axh-hero-buttons">
                  <button
                    type="button"
                    className="axh-gold-button"
                    disabled={busy}
                    onClick={() => void runAction(onBlank)}
                  >
                    <Plus size={24} />
                    Blank Workbook
                  </button>

                  <button
                    type="button"
                    className="axh-hero-open"
                    disabled={busy}
                    onClick={() => void runAction(onOpen)}
                  >
                    <FolderOpen size={24} />
                    Open File
                  </button>
                </div>
              </div>

              <div className="axh-hero-visual">
                <AssetImage
                  sources={bannerSources}
                  alt="ALIMXL banner"
                  width={700}
                  height={420}
                  loading="eager"
                  className="axh-banner-image"
                  fallback={
                    <div
                      className="axh-banner-fallback"
                      aria-hidden="true"
                    >
                      <div className="axh-banner-emblem">
                        <FileSpreadsheet
                          size={100}
                          strokeWidth={1.1}
                        />
                        <strong>ALIMXL</strong>
                      </div>
                    </div>
                  }
                />

                <div className="axh-hero-slogan">
                  Work Smarter<br />
                  Not Harder<br />
                  <small>With</small><br />
                  ALIMXL
                </div>

                <div className="axh-hero-stats">
                  <button
                    type="button"
                    onClick={() => switchTab("templates")}
                  >
                    <LayoutGrid size={26} />
                    <strong>{templates.length}</strong>
                    <span>Templates</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab("recent")}
                  >
                    <Clock size={26} />
                    <strong>{recentFiles.length}</strong>
                    <span>Recent files</span>
                  </button>
                </div>
              </div>
            </section>

                        {message && (
              <div className="axh-alert" role="alert">
                <TriangleAlert size={20} aria-hidden="true" />
                <span>{message}</span>

                <button
                  type="button"
                  aria-label="Dismiss message"
                  onClick={() => setMessage("")}
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {showTemplates && (
              <section aria-labelledby="axh-template-heading">
                <div className="axh-section-heading">
                  <div className="axh-heading-label">
                    <Star size={35} aria-hidden="true" />

                    <div>
                      <h2 id="axh-template-heading">
                        {tab === "favorites"
                          ? "Favorite templates"
                          : tab === "templates" || tab === "new"
                            ? "Template library"
                            : "Create something new"}
                      </h2>

                      <p role="status" aria-live="polite">
                        {hasSearch ||
                          activeCategory !== null ||
                          tab === "favorites"
                          ? plural(
                            matchingTemplates.length,
                            "matching template"
                          )
                          : "A head start for your next project."}
                      </p>
                    </div>
                  </div>

                  <div className="axh-filters">
                    <label>
                      <span className="axh-sr-only">
                        Filter templates by category
                      </span>

                      <select
                        value={activeCategory ?? ""}
                        onChange={(event) =>
                          setCategory(event.target.value || null)
                        }
                      >
                        <option value="">All Categories</option>

                        {categories.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      className="axh-filter-button"
                      onClick={() =>
                        switchTab(
                          tab === "favorites" ? "home" : "templates"
                        )
                      }
                    >
                      {tab === "favorites" ? "Home" : "All Templates"}
                      <ChevronDown size={15} />
                    </button>
                  </div>
                </div>

                <div className="axh-template-grid">
                  {tab !== "favorites" && (
                    <article className="axh-template-card axh-blank-card">
                      <div className="axh-template-preview axh-blank-preview">
                        <span className="axh-start-label">Start Fresh</span>
                        <BrandLogo />
                      </div>

                      <div className="axh-template-copy">
                        <h3>Blank Workbook</h3>
                        <p>A clean canvas for your ideas.</p>
                      </div>

                      <button
                        type="button"
                        className="axh-create-button"
                        disabled={busy}
                        onClick={() => void runAction(onBlank)}
                      >
                        Create New <ArrowRight size={18} />
                      </button>
                    </article>
                  )}

                  {visibleTemplates.map((template, index) => {
                    const accent =
                      CATEGORY_COLORS[index % CATEGORY_COLORS.length];

                    const favorite = favorites.includes(template.id);
                    const comparing = compareIds.includes(template.id);
                    const templateImage = templateImages?.[template.id];

                    return (
                      <article
                        key={template.id}
                        className="axh-template-card"
                      >
                        <div className="axh-template-preview">
                          <span
                            className="axh-category-label"
                            style={{ backgroundColor: accent }}
                          >
                            {template.category}
                          </span>

                          <button
                            type="button"
                            className={`axh-favorite-button ${favorite ? "is-saved" : ""
                              }`}
                            disabled={!preferencesReady}
                            aria-label={`${favorite ? "Remove" : "Save"
                              } favorite: ${template.name}`}
                            aria-pressed={favorite}
                            title={
                              favorite
                                ? "Remove favorite"
                                : "Save favorite"
                            }
                            onClick={() => toggleFavorite(template.id)}
                          >
                            <Bookmark
                              size={20}
                              fill={favorite ? "currentColor" : "none"}
                            />
                          </button>

                          <AssetImage
                            sources={templateImage ? [templateImage] : []}
                            alt={`${template.name} preview`}
                            width={400}
                            height={220}
                            className="axh-template-image"
                            fallback={
                              <TemplateArtwork
                                template={template}
                                accent={accent}
                              />
                            }
                          />
                        </div>

                        <div className="axh-template-copy">
                          <h3>{template.name}</h3>
                          <p>{template.description}</p>
                        </div>

                        <button
                          type="button"
                          className="axh-use-template"
                          disabled={busy || !preferencesReady}
                          title="Create a workbook using this template's own settings"
                          onClick={() =>
                            void selectTemplate(template.id)
                          }
                        >
                          {busy ? "Please wait" : "Use Template"}
                          <ArrowRight size={17} />
                        </button>

                        <label className="axh-compare-choice">
                          <input
                            type="checkbox"
                            checked={comparing}
                            disabled={
                              !comparing && compareIds.length >= 3
                            }
                            onChange={() => toggleCompare(template.id)}
                          />
                          Compare
                        </label>
                      </article>
                    );
                  })}
                </div>

                {matchingTemplates.length === 0 && (
                  <div className="axh-empty-state" role="status">
                    <p>
                      {templates.length === 0
                        ? "No templates are available yet. Create a blank workbook."
                        : tab === "favorites" &&
                          !hasSearch &&
                          activeCategory === null
                          ? "Bookmark a template to show it here."
                          : "No templates match the current filters."}
                    </p>

                    {(hasSearch || activeCategory !== null) && (
                      <button
                        type="button"
                        className="axh-soft-button"
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
            )}

            {showRecent && (
              <section
                className="axh-recent-section"
                aria-labelledby="axh-recent-heading"
              >
                <div className="axh-recent-heading">
                  <div className="axh-heading-label">
                    <Clock size={34} aria-hidden="true" />

                    <div>
                      <h2 id="axh-recent-heading">Recent Workbooks</h2>

                      <p role="status" aria-live="polite">
                        {hasSearch
                          ? plural(
                            matchingRecent.length,
                            "matching workbook"
                          )
                          : "Continue from where you left off."}
                      </p>
                    </div>
                  </div>

                  <div className="axh-recent-actions">
                    <label>
                      <span className="axh-sr-only">
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
                      >
                        <option value="newest">Last opened</option>
                        <option value="name">Name A–Z</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      className="axh-soft-button"
                      disabled={busy}
                      onClick={() => void runAction(onMyFiles)}
                    >
                      View All <ArrowRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="axh-recent-list">
                  {matchingRecent.length === 0 ? (
                    <div className="axh-empty-state">
                      <FolderOpen size={30} aria-hidden="true" />

                      <h3>
                        {hasSearch
                          ? "No matching workbooks"
                          : "Your workspace starts here"}
                      </h3>

                      <p>
                        {hasSearch
                          ? "Try another name or clear the search."
                          : "Create a workbook or open an existing file."}
                      </p>

                      <button
                        type="button"
                        className="axh-soft-button"
                        disabled={busy}
                        onClick={() => {
                          if (hasSearch) setQuery("");
                          else void runAction(onBlank);
                        }}
                      >
                        {hasSearch
                          ? "Clear search"
                          : "Create a workbook"}
                      </button>
                    </div>
                  ) : (
                    matchingRecent.map((file) => {
                      const timestamp = Date.parse(file.openedAt);

                      const fullDate = Number.isFinite(timestamp)
                        ? fullDateFormat.format(new Date(timestamp))
                        : "Unknown date";

                      return (
                        <button
                          key={file.id}
                          type="button"
                          className="axh-recent-row"
                          disabled={busy}
                          onClick={() =>
                            void runAction(() => onRecent(file.id))
                          }
                        >
                          <span className="axh-recent-file-icon">
                            <FileSpreadsheet
                              size={31}
                              aria-hidden="true"
                            />
                          </span>

                          <span className="axh-recent-file-name">
                            <strong>{file.name}</strong>
                            <small>ALIMXL workbook</small>
                          </span>

                          <span
                            className="axh-recent-time"
                            title={fullDate}
                          >
                            Last opened:{" "}
                            {now === null
                              ? "—"
                              : relativeTime(
                                file.openedAt,
                                now,
                                dateFormat
                              )}
                          </span>

                          <ChevronRight size={18} aria-hidden="true" />
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Status bar */}
      <footer className="axh-statusbar">
        <div className="axh-status-brand">
          <BrandLogo small />
          <span>ALIMXL Workspace</span>
          <i />
          <span>Version {version}</span>
        </div>

        <div className="axh-status-right">
          <span>
            {online === false
              ? <WifiOff size={16} />
              : <Check size={16} />}

            {online === null
              ? "Checking network"
              : online
                ? "Network reported online"
                : "Offline"}
          </span>

                    <span>
            <Clock size={16} />
            {now === null
              ? "—"
              : fullDateFormat.format(new Date(now))}
          </span>
        </div>
      </footer>

      {/* Dialogs */}
      {pendingRoute !== null && (
        <ConfirmLeaveDialog
          destination={ROUTE_LABELS[pendingRoute]}
          onCancel={() => setPendingRoute(null)}
          onConfirm={() => {
            const route = pendingRoute;
            setPendingRoute(null);
            router.push(route);
          }}
        />
      )}

      {dialog === "help" && (
        <Modal
          title="Help & Support"
          onClose={() => setDialog(null)}
        >
          <ul className="axh-help-list">
            <li>
              Blank Workbook creates a workbook through the existing action.
            </li>
            <li>
              Open File and My Files use the existing application handlers.
            </li>
            <li>
              Templates keep their own workbook and currency settings.
            </li>
            <li>Bookmark templates to keep them in Favorites.</li>
            <li>
              Select up to three templates for description-based comparison.
            </li>
            <li>Press {shortcutLabel} or / to focus search.</li>
            <li>
              Search filters template details or recent file names, depending on the selected scope.
              It does not search workbook cells.
            </li>
            <li>
              Import, Export and Backup require their application callbacks.
            </li>
            <li>Save your workbook before leaving for another tool.</li>
          </ul>
        </Modal>
      )}

      {dialog === "notifications" && (
        <Modal
          title="Workspace notifications"
          onClose={() => setDialog(null)}
        >
          {notifications.length > 0 ? (
            <ul className="axh-help-list">
              {notifications.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          ) : (
            <p>No workspace notices.</p>
          )}
        </Modal>
      )}

      {dialog === "compare" && (
        <Modal
          title="Compare templates"
          onClose={() => setDialog(null)}
        >
          {comparedTemplates.length === 0 ? (
            <p>Select Compare below up to three template cards.</p>
          ) : (
            <div className="axh-comparison">
              {comparedTemplates.map((template) => (
                <article key={template.id}>
                  <h3>{template.name}</h3>
                  <small>{template.category}</small>
                  <p>{template.description}</p>

                                    <button
                    type="button"
                    className="axh-soft-button"
                    onClick={() => toggleCompare(template.id)}
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Component-prefixed global styles do not target spreadsheet classes. */}
      <style jsx global>{`
        .axh-root {
          --axh-green: #006425;
          --axh-deep: #013001;
          --axh-gold: #ffda32;
          --axh-border: #d4e8ce;
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #f5faf3;
          color: #10281b;
          font-family: Arial, Helvetica, sans-serif;
        }

        .axh-root *,
        .axh-root *::before,
        .axh-root *::after {
          box-sizing: border-box;
        }

        .axh-root button,
        .axh-root input,
        .axh-root select {
          font: inherit;
        }

        .axh-root button {
          cursor: pointer;
          transition: filter .15s, box-shadow .15s;
        }

        .axh-root button:disabled {
          cursor: not-allowed;
          opacity: .45;
        }

        .axh-root button:hover:not(:disabled) {
          filter: brightness(1.04);
        }

        .axh-root button:focus-visible,
        .axh-root input:focus-visible,
        .axh-root select:focus-visible {
          outline: 3px solid #e4bc17;
          outline-offset: 3px;
        }

        .axh-root p,
        .axh-root h1,
        .axh-root h2,
        .axh-root h3 {
          margin: 0;
        }

        .axh-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .axh-topbar {
          min-height: 69px;
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 7px 16px;
          color: white;
          background: linear-gradient(
            100deg,
            #013001,
            #005719 55%,
            #013601
          );
          border-bottom: 3px solid #e7cb28;
          box-shadow: 0 2px 8px #cfdb5470;
          z-index: 2;
          flex-shrink: 0;
        }

        .axh-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .axh-brand p {
          font-size: 27px;
          font-weight: 900;
          letter-spacing: -.8px;
        }

        .axh-brand p span {
          color: #ffdf37;
        }

        .axh-brand small {
          display: block;
          font-size: 9px;
          margin-top: 2px;
        }

        .axh-logo {
          width: 56px;
          height: 56px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border: 2px solid #f7d536;
          border-radius: 12px;
          background: #061442;
          box-shadow: 0 0 7px #ffe42a70;
        }

        .axh-logo-small {
          width: 25px;
          height: 25px;
          border-radius: 5px;
        }

        .axh-logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .axh-logo-fallback {
          color: #ffe139;
          font-size: 23px;
          font-weight: 900;
        }

        .axh-search {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 120px;
          max-width: 580px;
          flex: 1;
          padding: 7px 12px;
          border: 1px solid #52b63a;
          border-radius: 30px;
          background: linear-gradient(#008b38, #006a29);
          box-shadow:
            inset 0 1px 7px #a9ed3970,
            0 2px 6px #002c13;
        }

        .axh-search > svg {
          flex-shrink: 0;
        }

        .axh-search input {
          min-width: 0;
          width: 100%;
          color: white;
          background: transparent;
          border: 0;
          outline: none;
          font-size: 12px;
          padding: 4px 0;
        }


.axh-search-scope {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  max-width: 132px;
  padding: 5px 9px;
  border: 1px solid #4ea832;
  border-radius: 18px;
  background: #00591f;
  color: #eaffef;
  font-size: 11px;
}

.axh-search-scope select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.axh-search-scope:focus-within {
  outline: 3px solid #e4bc17;
  outline-offset: 2px;
}

.axh-search-scope option {
  background: white;
  color: #123c21;
}


        .axh-search input::placeholder {
          color: #e3f7e8;
          opacity: 1;
        }

        .axh-search input::-webkit-search-cancel-button {
          display: none;
        }

        .axh-search button {
          display: flex;
          color: white;
          border: 0;
          background: transparent;
          padding: 2px;
          flex-shrink: 0;
        }

        .axh-search kbd {
          white-space: nowrap;
          background: #20b956;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
        }

        .axh-top-actions {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-left: auto;
        }

        .axh-top-icon,
        .axh-top-labeled {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          color: white;
          background: transparent;
          padding: 2px;
        }

        .axh-top-labeled {
          flex-direction: column;
          gap: 2px;
          font-size: 10px;
        }

        .axh-network {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          padding: 7px 10px;
          border-radius: 25px;
          border: 1px solid #438c25;
          font-size: 11px;
        }

        .axh-network i {
          width: 7px;
          height: 7px;
          background: #59df54;
          border-radius: 50%;
        }

        .axh-network[data-online="false"] i {
          background: #ffb86b;
        }

        .axh-network[data-online="unknown"] i {
          background: #c5d0c0;
        }

        .axh-badge {
          position: absolute;
          top: -7px;
          right: -5px;
          min-width: 16px;
          padding: 2px 4px;
          border-radius: 15px;
          background: #e61f21;
          font-size: 9px;
        }


        .axh-profile {
          display: flex;
          align-items: center;
          gap: 7px;
          color: white;
          border: 0;
          background: none;
          font-size: 12px !important;
        }

        .axh-profile-photo,
        .axh-profile-letter {
          width: 38px;
          height: 38px;
          border: 2px solid #e8efca;
          border-radius: 50%;
          object-fit: cover;
        }

        .axh-profile-letter {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e7f6d6;
          color: #004a1b;
          font-weight: 800;
          font-size: 20px;
        }

        .axh-body {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .axh-sidebar {
          width: 180px;
          flex-shrink: 0;
          overflow-y: auto;
          scrollbar-width: thin;
          display: flex;
          flex-direction: column;
          color: white;
          background:
            radial-gradient(
              ellipse at bottom left,
              #26760080,
              transparent 55%
            ),
            linear-gradient(
              160deg,
              #005b19,
              #02370c 70%,
              #003710
            );
          border-right: 3px solid #e1efb8;
        }

        .axh-sidebar-intro {
          padding: 25px 16px 14px;
        }

        .axh-sidebar-intro h2 {
          font-size: 14px;
          color: #ffdf31;
        }

        .axh-sidebar-intro p {
          margin-top: 12px;
          font-size: 12px;
          line-height: 1.6;
        }

        .axh-navigation {
          padding: 5px 9px 15px;
          display: grid;
          gap: 3px;
        }

        .axh-navigation button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 8px;
          min-height: 39px;
          border: 1px solid transparent;
          border-radius: 10px;
          text-align: left;
          background: transparent;
          color: #edf6e7;
          font-size: 12px;
        }

        .axh-navigation button:hover:not(:disabled) {
          background: #ffffff13;
        }

        .axh-navigation button.is-active {
          color: #102c05;
          background: linear-gradient(
            130deg,
            #ffffa0,
            #ffdd30 55%,
            #e3a602
          );
          border-color: #fff894;
          box-shadow: 0 2px 8px #f7e41c80;
          font-weight: 700;
        }

        .axh-navigation button:nth-last-child(2) {
          margin-top: 9px;
          border-top-color: #7da64b;
          border-radius: 0 0 10px 10px;
        }

        .axh-nav-arrow {
          margin-left: auto;
          flex-shrink: 0;
        }

        .axh-sidebar-edition {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 23px 16px;
          border-top: 3px solid #dcbd28;
          color: #ffe73c;
        }

        .axh-sidebar-edition strong,
        .axh-sidebar-edition span,
        .axh-sidebar-edition small {
          display: block;
        }

        .axh-sidebar-edition strong {
          font-size: 13px;
        }

        .axh-sidebar-edition span {
          font-size: 9px;
          margin-top: 3px;
        }

        .axh-sidebar-edition small {
          font-size: 10px;
          color: white;
          margin-top: 4px;
        }

        .axh-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .axh-main-inner {
          max-width: 1800px;
          margin: auto;
          padding: 11px 13px 22px;
        }

        .axh-hero {
          position: relative;
          min-height: 220px;
          display: flex;
          overflow: hidden;
          border: 2px solid #bada35;
          border-radius: 18px;
          color: white;
          background:
            radial-gradient(
              ellipse at 66% 4%,
              #b8e43a,
              transparent 34%
            ),
            radial-gradient(
              ellipse at 85% 65%,
              #3e9409,
              transparent 45%
            ),
            linear-gradient(
              110deg,
              #004e18,
              #004820 48%,
              #187b03
            );
          box-shadow: 0 0 10px #ccdf3e70;
        }

        .axh-hero-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          box-shadow: inset 0 0 18px #e1ed3c85;
          border-radius: inherit;
          z-index: 2;
        }

        .axh-hero-copy {
          width: 60%;
          padding: 25px 20px 20px 34px;
          z-index: 1;
        }

        .axh-hero-copy > p:first-child {
          font-size: 16px;
        }

        .axh-hero-copy > p:first-child strong {
          color: #ffdf36;
        }

        .axh-hero h1 {
          margin-top: 3px;
          font-size: clamp(28px, 3.9vw, 57px);
          letter-spacing: -1.8px;
          line-height: 1.12;
          font-weight: 900;
          color: white;
          text-shadow: 1px 2px #003e16;
        }

        .axh-hero h1 span {
          color: #ffe23d;
        }

        .axh-hero-description {
          margin-top: 8px !important;
          font-size: 13px;
          line-height: 1.5;
        }

        .axh-hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 18px;
        }

        .axh-gold-button,
        .axh-hero-open {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 30px;
          padding: 10px 20px;
          font-size: 14px !important;
          font-weight: 700 !important;
        }

        .axh-gold-button {
          border: 1px solid #fff48e;
          background: linear-gradient(
            #fff995,
            #ffe22e 50%,
            #e3a602
          );
          color: #132d05;
          box-shadow: 0 0 9px #ffde3c9c;
        }

        .axh-hero-open {
          border: 2px solid #e7d339;
          background: #00441a80;
          color: white;
        }

        .axh-hero-visual {
          position: relative;
          width: 40%;
          min-height: 220px;
        }

        .axh-banner-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .axh-banner-fallback {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle at 35% 35%,
              #ebf75177,
              transparent 40%
            ),
            linear-gradient(135deg, #78b51b55, #004d0f);
        }

        .axh-banner-emblem {
          position: absolute;
          left: 8%;
          top: 18%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          color: #e8f5c8;
          transform: rotate(-8deg);
          text-shadow: 1px 2px #003f15;
        }

        .axh-banner-emblem strong {
          letter-spacing: 4px;
        }

        .axh-hero-slogan {
          position: absolute;
          top: 18px;
          right: 18px;
          text-align: center;
          color: #ffe631;
          font-weight: 800;
          font-style: italic;
          font-size: 23px;
          line-height: 1.05;
          transform: rotate(-7deg);
          text-shadow: 1px 2px #1b6208;
        }

        .axh-hero-slogan small {
          font-size: 15px;
        }

        .axh-hero-stats {
          position: absolute;
          bottom: 8px;
          right: 9px;
          display: flex;
          gap: 9px;
        }

        .axh-hero-stats button {
          width: 99px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 7px;
          border: 1px solid #4bc84c;
          border-radius: 13px;
          color: white;
          background: linear-gradient(#00a13b, #006918);
          box-shadow: inset 0 1px 6px #8ddc63;
        }

        .axh-hero-stats strong {
          font-size: 24px;
        }

        .axh-hero-stats span {
          font-size: 11px;
        }



        .axh-section-heading,
        .axh-recent-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin: 10px 0;
        }

        .axh-heading-label {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .axh-heading-label > svg {
          color: #177f25;
          flex-shrink: 0;
        }

        .axh-heading-label h2 {
          font-size: 20px;
          letter-spacing: -.5px;
        }

        .axh-heading-label p {
          font-size: 11px;
          margin-top: 2px;
        }

        .axh-filters,
        .axh-recent-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .axh-filters select,
        .axh-recent-actions select,
        .axh-filter-button {
          border: 1px solid #d5e7ce;
          border-radius: 22px;
          background: linear-gradient(white, #eaf7e7);
          padding: 9px 13px;
          color: #183b24;
          font-size: 12px;
        }

        .axh-filter-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .axh-template-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .axh-template-card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 7px;
          overflow: hidden;
          border: 1px solid #d5e7ce;
          border-radius: 19px;
          background: linear-gradient(white 60%, #f0fae9);
          box-shadow: 0 2px 5px #76a05c22;
        }

        .axh-blank-card {
          border-color: #bae8a8;
          background: linear-gradient(
            #eeffe5,
            white 70%,
            #d7f6bc
          );
        }

        .axh-template-preview {
          position: relative;
          height: 110px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 13px;
          background: linear-gradient(
            130deg,
            #f5faf1,
            white,
            #e8f2df
          );
        }

        .axh-blank-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            130deg,
            #eeffdb,
            #d8f8df
          );
        }

        .axh-blank-preview .axh-logo {
          width: 75px;
          height: 75px;
        }

        .axh-start-label,
        .axh-category-label {
          position: absolute;
          top: 1px;
          left: 1px;
          z-index: 1;
          max-width: calc(100% - 30px);
          padding: 5px 10px;
          border-radius: 15px;
          color: white;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .axh-start-label {
          left: auto;
          right: 1px;
          background: #08792a;
          text-transform: none;
        }

        .axh-favorite-button {
          position: absolute;
          top: 1px;
          right: 1px;
          z-index: 2;
          display: flex;
          padding: 4px;
          background: #ffffffcc;
          border: 0;
          border-radius: 5px;
          color: #163526;
        }

        .axh-favorite-button.is-saved {
          color: #b58c00;
        }

        .axh-template-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .axh-template-copy {
          padding: 10px 3px 8px;
          text-align: center;
          flex: 1;
        }

        .axh-template-copy h3 {
          font-size: 14px;
          letter-spacing: -.4px;
        }

        .axh-template-copy p {
          font-size: 11px;
          line-height: 1.35;
          margin-top: 5px;
        }

        .axh-use-template,
        .axh-create-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 33px;
          width: 100%;
          margin-top: auto;
          border: 0;
          border-radius: 20px;
          font-size: 12px !important;
          font-weight: 700 !important;
        }

        .axh-use-template {
          color: #17521d;
          background: linear-gradient(#fafff4, #def4cf);
          box-shadow: 0 1px 2px #abd39a;
        }

        .axh-create-button {
          color: white;
          background: linear-gradient(#27d445, #009229);
          box-shadow: 0 2px 5px #5dcc44;
        }

        .axh-compare-choice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 7px;
          font-size: 10px;
          color: #516349;
        }

        .axh-compare-choice input {
          accent-color: #08792a;
        }

        .axh-money-art {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .axh-coins {
          position: absolute;
          bottom: 8px;
          width: 27px;
          border-radius: 50% / 12%;
          border: 1px solid #ce8a00;
          background: repeating-linear-gradient(
            0deg,
            #ae6900 0 2px,
            #ffe46b 3px 6px
          );
        }

        .axh-coins::before {
          content: "";
          position: absolute;
          top: -4px;
          left: -1px;
          width: 27px;
          height: 10px;
          border-radius: 50%;
          background: #ffdb39;
          border: 1px solid #d49b14;
        }

        .axh-coins-one {
          left: 18%;
          height: 30px;
        }

        .axh-coins-two {
          left: 37%;
          height: 48px;
        }

        .axh-coins-three {
          left: 56%;
          height: 67px;
        }

        .axh-growth-arrow {
          position: absolute;
          right: 8%;
          top: 8px;
          color: #48c12c;
          font-weight: 900;
          font-size: 73px;
          text-shadow: 1px 2px #14862b;
        }

        .axh-invoice-art {
          width: 92px;
          height: 94px;
          margin: 19px auto 0;
          padding: 10px;
          background: white;
          box-shadow: 1px 2px 7px #6d8daf66;
          transform: rotate(-14deg);
        }

        .axh-invoice-art strong {
          display: block;
          color: #1262c6;
          font-size: 16px;
        }

        .axh-invoice-art i {
          display: block;
          height: 4px;
          margin-top: 7px;
          background: #c2d9ef;
        }

        .axh-invoice-art span {
          display: block;
          height: 3px;
          margin-top: 8px;
          background: #327fc7;
        }

        .axh-people-art {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 5px;
          height: 100%;
          padding: 30px 5px 12px;
        }

        .axh-people-art > span {
          position: relative;
          width: 20px;
          height: 36px;
          background: linear-gradient(90deg, #d88713, #ffd78b);
          border-radius: 10px 10px 2px 2px;
        }

        .axh-people-art > span::before {
          content: "";
          position: absolute;
          top: -20px;
          left: 1px;
          width: 18px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(90deg, #d88713, #ffdc93);
        }

        .axh-people-art > svg {
          color: #39404c;
          margin-left: 2px;
        }

        .axh-box-art {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-content: end;
          gap: 4px;
          height: 100%;
          padding: 34px 10px 8px;
          background: linear-gradient(120deg, #eef6ff, #d4e5ee);
        }

        .axh-box-art span {
          height: 30px;
          border: 1px solid #b97c32;
          background: linear-gradient(
            90deg,
            #cf9847,
            #f0c987 45%,
            #cb8e3c
          );
          box-shadow: 1px 2px 1px #a0a5a5;
        }

        .axh-generic-art {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding-top: 13px;
        }

        .axh-recent-section {
          margin-top: 19px;
          padding: 10px 12px;
          border: 1px solid #d3e8c9;
          border-radius: 18px;
          background: #ffffffed;
          box-shadow: 0 2px 4px #b0c99f55;
        }

        .axh-recent-heading {
          margin: 0 0 8px;
        }

        .axh-recent-heading h2 {
          font-size: 16px;
        }

        .axh-recent-heading .axh-heading-label p {
          font-size: 10px;
        }

        .axh-recent-list {
          border-top: 1px solid #e2ecdc;
        }

        .axh-recent-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          background: transparent;
          border: 0;
          border-bottom: 1px solid #e4eddf;
          padding: 11px 2px;
          text-align: left;
          color: #173c22;
        }

        .axh-recent-row:last-child {
          border-bottom: 0;
        }

        .axh-recent-file-icon {
          display: flex;
          flex-shrink: 0;
          padding: 6px;
          border-radius: 12px;
          color: #19882d;
          background: #e8f7dc;
        }

        .axh-recent-file-name {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .axh-recent-file-name strong {
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .axh-recent-file-name small {
          font-size: 10px;
          margin-top: 3px;
        }

        .axh-recent-time {
          font-size: 11px;
        }

        .axh-soft-button,
        .axh-green-button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 9px 17px;
          border-radius: 22px;
          font-size: 12px !important;
          font-weight: 700 !important;
          border: 1px solid #d0e5ac;
          color: #214921;
          background: linear-gradient(#ffffed, #e5f7c6);
        }

        .axh-green-button {
          color: white;
          background: #08752a;
          border-color: #08752a;
        }

        .axh-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 25px 15px;
          text-align: center;
          font-size: 13px;
          color: #4e6749;
        }

        .axh-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 10px 0;
          padding: 12px;
          border: 1px solid #e7bb61;
          background: #fff7dc;
          color: #6e4910;
          border-radius: 11px;
          font-size: 13px;
        }

        .axh-alert > span {
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .axh-alert > svg {
          flex-shrink: 0;
        }

        .axh-alert > button {
          border: 0;
          background: transparent;
          color: inherit;
        }

        .axh-statusbar {
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          flex-shrink: 0;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(
            100deg,
            #e5f8c4,
            #edffdb,
            #dbf4af
          );
          border-top: 1px solid #d4e2af;
          color: #29472d;
          font-size: 10px;
        }

        .axh-status-brand,
        .axh-status-right,
        .axh-status-right > span {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .axh-status-brand i {
          height: 18px;
          border-left: 1px solid #6a8b54;
          margin: 0 3px;
        }

        .axh-status-right {
          gap: 16px;
        }

        .axh-status-right > span + span {
          padding-left: 13px;
          border-left: 1px solid #9ab67b;
        }

        .axh-modal {
          width: min(94vw, 720px);
          max-height: 85vh;
          margin: auto;
          padding: 0;
          overflow-y: auto;
          border: 1px solid #b9d3ad;
          border-radius: 18px;
          background: white;
          color: #173c22;
          box-shadow: 0 20px 80px #001e2299;
        }

        .axh-modal::backdrop {
          background: #001a0cb3;
        }

        .axh-modal-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          background: #eef8e7;
          border-bottom: 1px solid #d2e6c8;
        }

        .axh-modal-heading h2 {
          font-size: 18px;
        }

        .axh-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          padding: 5px;
          color: inherit;
        }

        .axh-modal-content {
          padding: 20px;
          font-size: 14px;
          line-height: 1.7;
        }

        .axh-dialog-message {
          display: flex;
          gap: 13px;
        }

        .axh-dialog-message > svg {
          flex-shrink: 0;
          color: #ac7c00;
        }

        .axh-dialog-actions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .axh-help-list {
          margin: 0;
          padding-left: 21px;
        }

        .axh-help-list li + li {
          margin-top: 10px;
        }

        .axh-comparison {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(160px, 1fr)
          );
          gap: 15px;
        }

        .axh-comparison article {
          border: 1px solid #d1e3c7;
          border-radius: 12px;
          padding: 12px;
          min-width: 0;
        }

        .axh-comparison h3 {
          font-size: 15px;
        }

        .axh-comparison p {
          margin-top: 10px;
          font-size: 12px;
        }

        .axh-comparison button {
          margin-top: 12px;
        }

        .axh-root[data-compact="true"] .axh-navigation button {
          padding-top: 6px;
          padding-bottom: 6px;
          min-height: 34px;
        }

        .axh-root[data-compact="true"] .axh-recent-row {
          padding-top: 7px;
          padding-bottom: 7px;
        }

        .axh-root[data-dark="true"] {
          background: #102318;
          color: #e6f4de;
        }

        .axh-root[data-dark="true"] .axh-template-card,
        .axh-root[data-dark="true"] .axh-recent-section {
          background: #173523;
          border-color: #36543b;
          color: #e6f4de;
        }

        .axh-root[data-dark="true"] .axh-template-preview {
          background: #203e29;
        }

        .axh-root[data-dark="true"] .axh-recent-row,
        .axh-root[data-dark="true"] .axh-compare-choice,
        .axh-root[data-dark="true"] .axh-empty-state {
          color: #d4e8cb;
        }

        .axh-root[data-dark="true"] .axh-modal {
          background: #173523;
          color: #e6f4de;
          border-color: #45624a;
        }

        .axh-root[data-dark="true"] .axh-modal-heading {
          background: #203e29;
          border-color: #45624a;
        }

        .axh-root[data-dark="true"] .axh-comparison article {
          border-color: #45624a;
        }

        .axh-root[data-reduced-motion="true"] *,
        .axh-root[data-reduced-motion="true"] *::before,
        .axh-root[data-reduced-motion="true"] *::after {
          transition: none !important;
          animation: none !important;
          scroll-behavior: auto !important;
        }

        @media (min-width: 1600px) {
          .axh-sidebar {
            width: 220px;
          }

          .axh-topbar {
            min-height: 82px;
          }

          .axh-hero,
          .axh-hero-visual {
            min-height: 275px;
          }

          .axh-template-preview {
            height: 150px;
          }

          .axh-template-copy h3 {
            font-size: 16px;
          }

          .axh-template-copy p {
            font-size: 12px;
          }
        }

        @media (max-width: 1150px) {
          .axh-topbar {
            gap: 12px;
          }

          .axh-brand p {
            font-size: 22px;
          }

          .axh-brand small {
            font-size: 8px;
          }

          .axh-top-actions {
            gap: 10px;
          }

          .axh-network span,
          .axh-profile-name {
            display: none;
          }

          .axh-top-labeled span {
            font-size: 9px;
          }

          .axh-search kbd {
            display: none;
          }

          .axh-template-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .axh-hero-copy {
            padding-left: 23px;
            width: 62%;
          }

          .axh-hero-visual {
            width: 38%;
          }

          .axh-hero-slogan {
            font-size: 18px;
            right: 12px;
          }

          .axh-banner-emblem {
            left: 0;
            opacity: .65;
          }

          .axh-hero-stats button {
            width: 83px;
          }

          .axh-status-right {
            gap: 8px;
          }
        }

        @media (max-width: 850px) {
          .axh-topbar {
            flex-wrap: wrap;
            padding: 8px 11px;
          }

          .axh-brand .axh-logo {
            width: 44px;
            height: 44px;
          }

          .axh-top-actions {
            margin-left: auto;
            gap: 11px;
          }

          .axh-search {
            order: 3;
            max-width: none;
            flex-basis: 100%;
          }

          .axh-network,
          .axh-top-labeled {
            display: none;
          }

          .axh-sidebar {
            width: 77px;
          }

          .axh-sidebar-intro {
            display: none;
          }

          .axh-navigation {
            padding: 10px 5px;
          }

          .axh-navigation button {
            flex-direction: column;
            gap: 4px;
            padding: 8px 3px;
            font-size: 9px;
            text-align: center;
          }

          .axh-nav-arrow {
            display: none;
          }

          .axh-sidebar-edition {
            justify-content: center;
            padding: 17px 5px;
          }

          .axh-sidebar-edition > div {
            display: none;
          }

          .axh-hero-copy {
            width: 100%;
            padding: 24px 20px;
          }

          .axh-hero-visual {
            display: none;
          }

          .axh-hero h1 {
            font-size: 40px;
          }

          .axh-hero {
            min-height: 220px;
          }

          .axh-main-inner {
            padding: 10px;
          }

          .axh-template-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .axh-status-right {
            display: none;
          }

          .axh-heading-label h2 {
            font-size: 18px;
          }

          .axh-recent-time {
            max-width: 100px;
            font-size: 10px;
          }
        }

        @media (max-width: 480px) {
          .axh-brand small {
            font-size: 7px;
          }

          .axh-brand p {
            font-size: 20px;
          }

          .axh-top-actions {
            gap: 7px;
          }

          .axh-profile {
            display: none;
          }

          .axh-sidebar {
            width: 64px;
          }

          .axh-navigation button {
            font-size: 8px;
          }

          .axh-hero h1 {
            font-size: 32px;
            letter-spacing: -1px;
          }

          .axh-hero-copy > p:first-child {
            font-size: 13px;
          }

          .axh-hero-buttons {
            gap: 8px;
          }

          .axh-gold-button,
          .axh-hero-open {
            padding: 9px 12px;
            font-size: 12px !important;
          }

          .axh-template-grid {
            grid-template-columns: 1fr;
          }

          .axh-template-preview {
            height: 135px;
          }


          .axh-filters {
            width: 100%;
            flex-wrap: wrap;
          }

          .axh-recent-time {
            display: none;
          }

          .axh-recent-actions {
            flex-wrap: wrap;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .axh-root *,
          .axh-root *::before,
          .axh-root *::after {
            transition: none !important;
            animation: none !important;
            scroll-behavior: auto !important;
          }
        }

        @media print {
          .axh-root {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Error boundary                                                             */
/* -------------------------------------------------------------------------- */

class HomeErrorBoundary extends Component<
  HomeErrorBoundaryProps,
  HomeErrorBoundaryState
> {
  state: HomeErrorBoundaryState = {
    failed: false,
    actionError: "",
  };

  static getDerivedStateFromError(): Partial<HomeErrorBoundaryState> {
    return {
      failed: true,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      "[ALIMXL Home] render failure",
      error,
      info.componentStack
    );
  }

  private returnToWorkbook = (): void => {
    try {
      void Promise.resolve(this.props.onContinue()).catch(
        (error: unknown) => {
          this.setState({
            actionError: getErrorMessage(error),
          });
        }
      );
    } catch (error) {
      this.setState({
        actionError: getErrorMessage(error),
      });
    }
  };

  render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <section
        role="alert"
        className="fixed inset-0 z-100 flex items-center justify-center bg-[#F5F8F6] p-6 text-[#0B2E20] print:hidden"
      >
        <div className="w-full max-w-md rounded-2xl border border-[#D3E6DA] bg-white p-6 text-center shadow-lg">
          <h1 className="text-lg font-bold">
            The Home screen could not be displayed
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#55705F]">
            You can try again or return to the workbook.
            This error screen does not save unsaved changes.
          </p>

          {this.state.actionError && (
            <p className="mt-3 text-sm text-red-700">
              {this.state.actionError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                this.setState({
                  failed: false,
                  actionError: "",
                })
              }
              className="rounded-xl border border-[#D3E6DA] px-4 py-2.5 text-sm font-semibold hover:bg-[#E3F3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A4A]"
            >
              Try again
            </button>

            <button
              type="button"
              onClick={this.returnToWorkbook}
              className="rounded-xl bg-[#0B8A4A] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8A4A] focus-visible:ring-offset-2"
            >
              Back to workbook
            </button>
          </div>
        </div>
      </section>
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export default function AlimxlHome(props: AlimxlHomeProps) {
  return (
    <HomeErrorBoundary onContinue={props.onContinue}>
      <WelcomeGate>
        <AlimxlHomeContent {...props} />
      </WelcomeGate>
    </HomeErrorBoundary>
  );
}