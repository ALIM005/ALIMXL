"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  APP_BRAND,
  WELCOME_REOPEN_EVENT,
  WELCOME_SCHEMA_VERSION,
  WELCOME_STORAGE_KEY,
} from "../lib/app-brand";

import WelcomeScreen from "./WelcomeScreen";

interface WelcomeGateProps {
  children: ReactNode;
}

type GatePhase =
  | "loading"
  | "welcome"
  | "content";

interface GateState {
  phase: GatePhase;
  storageWarning: string;
  sessionNotice: string;
}

interface WelcomeCompletionRecord {
  app: typeof WELCOME_RECORD_APP;
  version: typeof WELCOME_SCHEMA_VERSION;
  completed: true;
  completedAt: string;
}

const WELCOME_RECORD_APP =
  "ALIMXL_WELCOME" as const;

/**
 * The completion record is intentionally small.
 * This limit prevents unnecessarily parsing unrelated or
 * unexpectedly large data stored under the welcome key.
 */
const MAX_RECORD_LENGTH = 4096;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function hasOwn(
  value: Record<string, unknown>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    key
  );
}

function isValidTimestamp(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value
    )
  ) {
    return false;
  }

  const timestamp = Date.parse(value);

  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}

function parseCompletionRecord(
  text: string
): WelcomeCompletionRecord {
  if (
    text.length === 0 ||
    text.length > MAX_RECORD_LENGTH
  ) {
    throw new Error(
      "Invalid welcome preference size."
    );
  }

  const parsed: unknown = JSON.parse(text);

  if (!isRecord(parsed)) {
    throw new Error(
      "Invalid welcome preference."
    );
  }

  if (
    !hasOwn(parsed, "app") ||
    parsed.app !== WELCOME_RECORD_APP
  ) {
    throw new Error(
      "Unrecognized welcome preference."
    );
  }

  if (
    !hasOwn(parsed, "version") ||
    parsed.version !== WELCOME_SCHEMA_VERSION
  ) {
    throw new Error(
      "Unsupported welcome preference version."
    );
  }

  if (
    !hasOwn(parsed, "completed") ||
    parsed.completed !== true
  ) {
    throw new Error(
      "Welcome completion was not confirmed."
    );
  }

  if (
    !hasOwn(parsed, "completedAt") ||
    !isValidTimestamp(parsed.completedAt)
  ) {
    throw new Error(
      "Invalid welcome completion timestamp."
    );
  }

  return {
    app: WELCOME_RECORD_APP,
    version: WELCOME_SCHEMA_VERSION,
    completed: true,
    completedAt: parsed.completedAt,
  };
}

function createCompletionRecord(): WelcomeCompletionRecord {
  return {
    app: WELCOME_RECORD_APP,
    version: WELCOME_SCHEMA_VERSION,
    completed: true,
    completedAt: new Date().toISOString(),
  };
}

/**
 * WelcomeGate is an onboarding gate, not authentication.
 *
 * It must not be used to enforce:
 * - Paid entitlements.
 * - Account permissions.
 * - Sensitive document access.
 *
 * Mount it once around the intended Home screen.
 * Do not wrap an already-active workbook editor if reopening
 * Welcome would unmount that editor and discard unsaved state.
 */
export default function WelcomeGate({
  children,
}: WelcomeGateProps) {
  const [state, setState] = useState<GateState>({
    phase: "loading",
    storageWarning: "",
    sessionNotice: "",
  });

  const continuingRef = useRef(false);
  const reopenRequestedRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    const reopenWelcome = (): void => {
      reopenRequestedRef.current = true;

      setState({
        phase: "welcome",
        storageWarning: "",
        sessionNotice: "",
      });
    };

    window.addEventListener(
      WELCOME_REOPEN_EVENT,
      reopenWelcome
    );

    /*
     * Defer browser storage initialization until after mount.
     *
     * Server output and initial client output both use the
     * loading state, avoiding storage-dependent hydration.
     */
    void Promise.resolve().then(() => {
      if (disposed) return;

      /*
       * An explicit reopen request takes priority over
       * initialization.
       */
      if (reopenRequestedRef.current) {
        return;
      }

      try {
        const saved = window.localStorage.getItem(
          WELCOME_STORAGE_KEY
        );

        if (saved === null) {
          setState({
            phase: "welcome",
            storageWarning: "",
            sessionNotice: "",
          });

          return;
        }

        parseCompletionRecord(saved);

        setState({
          phase: "content",
          storageWarning: "",
          sessionNotice: "",
        });
      } catch {
        /*
         * Do not clear or overwrite invalid/unreadable storage
         * automatically.
         *
         * The user can explicitly continue and attempt to
         * replace this one preference with a valid record.
         */
        setState({
          phase: "welcome",
          storageWarning:
            "Your saved welcome preference could not be read " +
            "or validated. You can still continue. " +
            "Existing workbooks and images are unchanged.",
          sessionNotice: "",
        });
      }
    });

    /*
     * Deliberately do not auto-dismiss Welcome when another tab
     * completes onboarding. The current user remains in control
     * of the Continue action in this tab.
     */
    return () => {
      disposed = true;

      window.removeEventListener(
        WELCOME_REOPEN_EVENT,
        reopenWelcome
      );
    };
  }, []);

  const handleContinue = useCallback((): void => {
    if (continuingRef.current) {
      return;
    }

    continuingRef.current = true;

    let sessionNotice = "";

    try {
      const serialized = JSON.stringify(
        createCompletionRecord()
      );

      window.localStorage.setItem(
        WELCOME_STORAGE_KEY,
        serialized
      );
    } catch {
      /*
       * Storage failure is non-fatal.
       * Never prevent local use merely because the welcome
       * preference could not be remembered.
       */
      sessionNotice =
        APP_BRAND.welcome.storageUnavailableNotice;
    } finally {
      reopenRequestedRef.current = false;

      setState({
        phase: "content",
        storageWarning: "",
        sessionNotice,
      });

      continuingRef.current = false;
    }
  }, []);

  const dismissSessionNotice =
    useCallback((): void => {
      setState((current) => ({
        ...current,
        sessionNotice: "",
      }));
    }, []);

  if (state.phase === "loading") {
    return (
      <section
        aria-label="Preparing ALIMXL welcome preferences"
        aria-busy="true"
        className="ax-settings-surface fixed inset-0 z-[200] flex items-center justify-center p-6 print:hidden"
      >
        <div className="ax-settings-panel w-full max-w-sm rounded-2xl p-6 text-center shadow-sm">
          <p
            className="text-sm font-black tracking-[0.18em]"
            style={{
              color: "var(--ax-accent)",
            }}
          >
            {APP_BRAND.product.name}
          </p>

          <p
            role="status"
            aria-live="polite"
            className="ax-settings-muted mt-3 text-sm leading-6"
          >
            Preparing your workspace…
          </p>
        </div>
      </section>
    );
  }

  if (state.phase === "welcome") {
    return (
      <WelcomeScreen
        onContinue={handleContinue}
        storageWarning={state.storageWarning}
      />
    );
  }

  return (
    <>
      {children}

      {state.sessionNotice && (
        <aside
          aria-label="Welcome preference notice"
          className="ax-settings-surface fixed bottom-4 right-4 z-[250] max-h-[50vh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border p-4 shadow-lg print:hidden"
          style={{
            background: "var(--ax-panel)",
            color: "var(--ax-text)",
            borderColor: "var(--ax-border)",
          }}
        >
          <p
            role="status"
            aria-live="polite"
            className="text-xs leading-6"
          >
            {state.sessionNotice}
          </p>

          <button
            type="button"
            onClick={dismissSessionNotice}
            className="ax-settings-button mt-3 rounded-lg border px-3 py-2 text-xs font-semibold"
          >
            Dismiss
          </button>
        </aside>
      )}
    </>
  );
}