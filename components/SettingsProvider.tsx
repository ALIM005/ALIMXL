"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  ACCENT_COLORS,
  SETTINGS_KEY,
  areSettingsEqual,
  createDefaultSettings,
  parseSettingsBackup,
  serializeSettings,
  validateSettings,
  type AppSettings,
} from "../lib/app-settings";

export type ResolvedTheme = "light" | "dark";

export interface AppSettingsContextValue {
  /**
   * Saved settings currently active in this application tab.
   *
   * Treat this object as read-only.
   */
  settings: Readonly<AppSettings>;

  /**
   * True after the initial browser-storage read has finished,
   * including when that read failed and defaults were used.
   */
  ready: boolean;

  /**
   * Warning about storage access, invalid stored data
   * or preferences changed in another tab.
   */
  warning: string;

  /**
   * Increases when preferences are saved locally or changed
   * externally. Settings forms can use it to detect conflicts.
   */
  revision: number;

  resolvedTheme: ResolvedTheme;

  /**
   * True when either ALIMXL preferences or the operating system
   * requests reduced motion.
   */
  effectiveReducedMotion: boolean;

  /**
   * Validates and persists the complete settings object.
   *
   * Throws when:
   * - initial loading has not finished;
   * - settings are invalid;
   * - browser persistence is unavailable.
   *
   * Active settings update only after persistence succeeds.
   */
  save: (value: Readonly<AppSettings>) => void;
}

interface SettingsProviderProps {
  children: ReactNode;
}

interface SettingsState {
  settings: AppSettings;
  ready: boolean;
  warning: string;
  revision: number;
}

interface SettingsCSSProperties extends CSSProperties {
  "--ax-accent": string;
  "--ax-bg": string;
  "--ax-panel": string;
  "--ax-text": string;
  "--ax-muted": string;
  "--ax-border": string;
  "--ax-gap": string;
  "--ax-control-padding": string;
}

const SettingsContext =
  createContext<AppSettingsContextValue | null>(null);

function createInitialState(): SettingsState {
  return {
    settings: createDefaultSettings(),
    ready: false,
    warning: "",
    revision: 0,
  };
}

function getStorageWarning(error: unknown): string {
  if (error instanceof Error && error.name === "QuotaExceededError") {
    return (
      "Browser storage is full. Preferences were not saved. " +
      "Export a settings backup or review browser storage."
    );
  }

  if (error instanceof Error && error.name === "SecurityError") {
    return (
      "This browser blocked preference storage. " +
      "Preferences were not saved. Check browser privacy settings " +
      "or export a settings backup."
    );
  }

  return (
    "Preferences could not be saved in this browser. " +
    "Your active settings have not changed. " +
    "Export a settings backup before leaving."
  );
}

/**
 * Subscribe to a media query.
 * The returned function removes the listener.
 */
function subscribeToMediaQuery(
  query: MediaQueryList,
  callback: () => void
): () => void {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", callback);

    return () => {
      query.removeEventListener("change", callback);
    };
  }

  query.addListener(callback);

  return () => {
    query.removeListener(callback);
  };
}

export default function SettingsProvider({
  children,
}: SettingsProviderProps) {
  const [state, setState] =
    useState<SettingsState>(createInitialState);

  const [systemDark, setSystemDark] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] =
    useState(false);

  /*
   * The ref allows stable save() callbacks to check readiness
   * without depending on the current render's state closure.
   */
  const readyRef = useRef(false);

  useEffect(() => {
    let storedSettings = createDefaultSettings();
    let warning = "";

    try {
      const storedText = window.localStorage.getItem(SETTINGS_KEY);

      if (storedText !== null) {
        storedSettings = parseSettingsBackup(storedText);
      }
    } catch {
      warning =
        "Saved preferences could not be read or validated. " +
        "Defaults are active for this session. " +
        "Existing stored data has not been overwritten.";
    }

    readyRef.current = true;

    setState((previous) => ({
      ...previous,
      settings: storedSettings,
      ready: true,
      warning,
    }));

    const handleStorageChange = (event: StorageEvent): void => {
      /*
       * key === null means another tab cleared the storage area.
       * This module never calls localStorage.clear().
       */
      if (event.key !== SETTINGS_KEY && event.key !== null) {
        return;
      }

      try {
        if (
          event.storageArea !== null &&
          event.storageArea !== window.localStorage
        ) {
          return;
        }

        /*
         * Read the latest value instead of trusting an older
         * queued event's newValue.
         */
        const latestText =
          window.localStorage.getItem(SETTINGS_KEY);

        const nextSettings =
          latestText === null
            ? createDefaultSettings()
            : parseSettingsBackup(latestText);

        setState((previous) => ({
          settings: areSettingsEqual(
            previous.settings,
            nextSettings
          )
            ? previous.settings
            : nextSettings,
          ready: true,
          warning:
            latestText === null
              ? (
                  "Preferences were removed in another tab. " +
                  "Defaults are now active. Reload the saved " +
                  "preferences in any open Settings form before saving."
                )
              : (
                  "Preferences changed in another tab. " +
                  "Reload the saved preferences in any open " +
                  "Settings form before saving your draft."
                ),
          revision: previous.revision + 1,
        }));
      } catch {
        setState((previous) => ({
          ...previous,
          warning:
            "Preferences changed in another tab, but the latest " +
            "stored value could not be read or validated. " +
            "Current active settings were retained.",
          revision: previous.revision + 1,
        }));
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      readyRef.current = false;

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const darkQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updateSystemPreferences = (): void => {
      setSystemDark(darkQuery.matches);
      setSystemReducedMotion(motionQuery.matches);
    };

    updateSystemPreferences();

    const unsubscribeDark = subscribeToMediaQuery(
      darkQuery,
      updateSystemPreferences
    );

    const unsubscribeMotion = subscribeToMediaQuery(
      motionQuery,
      updateSystemPreferences
    );

    return () => {
      unsubscribeDark();
      unsubscribeMotion();
    };
  }, []);

  const save = useCallback(
    (value: Readonly<AppSettings>): void => {
      if (!readyRef.current) {
        throw new Error(
          "Preferences are still loading. Please wait before saving."
        );
      }

      const validatedSettings = validateSettings(value);
      const serialized = serializeSettings(validatedSettings);

      /*
       * Persist before changing active settings.
       * A failed storage write must not report a successful save.
       */
      try {
        window.localStorage.setItem(
          SETTINGS_KEY,
          serialized
        );
      } catch (error) {
        const warning = getStorageWarning(error);

        setState((previous) => ({
          ...previous,
          warning,
        }));

        throw new Error(warning);
      }

      setState((previous) => ({
        settings: validatedSettings,
        ready: true,
        warning: "",
        revision: previous.revision + 1,
      }));
    },
    []
  );

  const resolvedTheme: ResolvedTheme =
    state.settings.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : state.settings.theme;

  const effectiveReducedMotion =
    state.settings.reducedMotion || systemReducedMotion;

  const contextValue =
    useMemo<AppSettingsContextValue>(
      () => ({
        settings: state.settings,
        ready: state.ready,
        warning: state.warning,
        revision: state.revision,
        resolvedTheme,
        effectiveReducedMotion,
        save,
      }),
      [
        state.settings,
        state.ready,
        state.warning,
        state.revision,
        resolvedTheme,
        effectiveReducedMotion,
        save,
      ]
    );

  const themeStyle =
    useMemo<SettingsCSSProperties>(() => {
      const dark = resolvedTheme === "dark";
      const compact =
        state.settings.density === "compact";

      return {
        "--ax-accent":
          ACCENT_COLORS[state.settings.accent],

        "--ax-bg": dark
          ? "#081322"
          : "#F4F8F5",

        "--ax-panel": dark
          ? "#111F31"
          : "#FFFFFF",

        "--ax-text": dark
          ? "#EDF5F0"
          : "#163B28",

        "--ax-muted": dark
          ? "#A3B5AC"
          : "#60756A",

        "--ax-border": dark
          ? "#2A3C4D"
          : "#DBE7DF",

        "--ax-gap": compact
          ? "12px"
          : "20px",

        "--ax-control-padding": compact
          ? "8px"
          : "12px",
      };
    }, [
      resolvedTheme,
      state.settings.accent,
      state.settings.density,
    ]);

  return (
    <SettingsContext.Provider value={contextValue}>
      <div
        className="ax-settings-root"
        style={themeStyle}
        data-ax-theme={resolvedTheme}
        data-ax-density={state.settings.density}
        data-ax-motion={
          effectiveReducedMotion
            ? "reduce"
            : "normal"
        }
      >
        {children}
      </div>

      <style jsx global>{`
        .ax-settings-root {
          min-width: 0;
        }

        .ax-settings-root .ax-settings-surface {
          background: var(--ax-bg);
          color: var(--ax-text);
          color-scheme: light;
        }

        .ax-settings-root[data-ax-theme="dark"]
          .ax-settings-surface {
          color-scheme: dark;
        }

        .ax-settings-root .ax-settings-panel {
          background: var(--ax-panel);
          border: 1px solid var(--ax-border);
        }

        .ax-settings-root .ax-settings-muted {
          color: var(--ax-muted);
        }

        .ax-settings-root .ax-settings-field {
          background: var(--ax-bg);
          color: var(--ax-text);
          border: 1px solid var(--ax-border);
        }

        .ax-settings-root
          .ax-settings-field::placeholder {
          color: var(--ax-muted);
          opacity: 0.85;
        }

        .ax-settings-root .ax-settings-button {
          border-color: var(--ax-border);
        }

        .ax-settings-root
          .ax-settings-field:focus-visible,
        .ax-settings-root
          .ax-settings-button:focus-visible,
        .ax-settings-root
          .ax-settings-surface a:focus-visible,
        .ax-settings-root
          .ax-settings-surface input:focus-visible,
        .ax-settings-root
          .ax-settings-surface select:focus-visible,
        .ax-settings-root
          .ax-settings-surface textarea:focus-visible,
        .ax-settings-root
          .ax-settings-surface button:focus-visible {
          outline: 2px solid var(--ax-accent);
          outline-offset: 3px;
        }

        .ax-settings-root .ax-settings-primary {
          background: var(--ax-accent);
          color: #ffffff;
          border-color: var(--ax-accent);
        }

        .ax-settings-root
          .ax-settings-primary:not(:disabled):hover {
          filter: brightness(0.94);
        }

        .ax-settings-root .ax-settings-stack {
          gap: var(--ax-gap);
        }

        .ax-settings-root
          .ax-settings-field:disabled,
        .ax-settings-root
          .ax-settings-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .ax-settings-root[data-ax-motion="reduce"]
          .ax-settings-surface,
        .ax-settings-root[data-ax-motion="reduce"]
          .ax-settings-surface *,
        .ax-settings-root[data-ax-motion="reduce"]
          .ax-settings-surface *::before,
        .ax-settings-root[data-ax-motion="reduce"]
          .ax-settings-surface *::after {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
        }
      `}</style>
    </SettingsContext.Provider>
  );
}

/**
 * Read shared settings from a Client Component.
 * The component must be inside SettingsProvider.
 */
export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(SettingsContext);

  if (context === null) {
    throw new Error(
      "useAppSettings must be used inside SettingsProvider. " +
      "Wrap your application children with SettingsProvider " +
      "in the existing app/layout.tsx."
    );
  }

  return context;
}