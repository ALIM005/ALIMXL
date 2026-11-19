"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type NoticeKind =
  | "info"
  | "warning"
  | "error";

interface OfflineNotice {
  /**
   * Stable identity of the situation being reported. Used so that a notice
   * the user dismissed does not pop up again until the situation changes.
   */
  key: string;
  kind: NoticeKind;
  title: string;
  text: string;
  /** Purely informational success notices hide themselves. */
  autoHideMs?: number;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface OfflineStatus {
  release: string;
  documents: {
    route: string;
    cached: boolean;
  }[];
}

interface GuideSection {
  title: string;
  steps: string[];
}

const SCRIPT_PATH = "/sw.js";
const SCOPE_PATH = "/";

const CACHE_PREFIX = "alimxl-shell-";

/**
 * Any part of the app can open the install / offline guide with:
 *   window.dispatchEvent(new Event("alimxl:open-offline-guide"))
 * (for example from a Help menu item).
 */
const OPEN_GUIDE_EVENT = "alimxl:open-offline-guide";

const STATUS_TIMEOUT_MS = 6000;
const UPDATE_INTERVAL_MS = 10 * 60 * 1000;
const SUCCESS_AUTO_HIDE_MS = 12_000;

const EXPECTED_ROUTES = [
  "/",
  "/settings",
  "/photo-studio",
] as const;

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "কম্পিউটারে (Google Chrome / Microsoft Edge)",
    steps: [
      "ইন্টারনেট চালু রেখে ALIMXL ওয়েবসাইটটি Chrome বা Edge-এ খুলুন।",
      "ঠিকানা-বারের ডান পাশে ইনস্টল আইকন (কম্পিউটার বা ⊕ চিহ্ন) দেখা গেলে তাতে ক্লিক করুন। অথবা এই বক্সের “ইনস্টল করুন” বোতাম চাপুন।",
      "আইকন না দেখা গেলে ব্রাউজারের মেনু (⋮) খুলে “Install ALIMXL”, “Install page as app” বা “Apps → Install this site as an app” বেছে নিন (নাম ব্রাউজারের সংস্করণ অনুযায়ী সামান্য আলাদা হতে পারে)।",
      "ইনস্টল শেষ হলে ডেস্কটপ বা স্টার্ট মেনুতে ALIMXL আইকন পাবেন। সেখান থেকে খুলুন।",
    ],
  },
  {
    title: "অ্যান্ড্রয়েড ফোনে (Chrome)",
    steps: [
      "Chrome-এ ওয়েবসাইটটি খুলুন।",
      "মেনু (⋮) থেকে “Install app” বা “Add to Home screen” বেছে নিন।",
      "এরপর হোম স্ক্রিনের ALIMXL আইকন থেকে খুলুন।",
    ],
  },
  {
    title: "আইফোন / আইপ্যাডে (Safari)",
    steps: [
      "Safari-তে ওয়েবসাইটটি খুলুন।",
      "Share বোতাম চেপে “Add to Home Screen” বেছে নিন।",
    ],
  },
  {
    title: "অফলাইনে চলবে কি না যাচাই করুন",
    steps: [
      "প্রথমবার অবশ্যই ইন্টারনেট চালু রেখে সাইট খুলুন। “প্রধান page-এর cache পাওয়া গেছে” বার্তা না আসা পর্যন্ত কিছুক্ষণ অপেক্ষা করুন।",
      "তারপর ইন্টারনেট বন্ধ করে ইনস্টল করা অ্যাপটি খুলে দেখুন। স্প্রেডশিটের কাজ চলবে।",
      "নতুন সংস্করণ এলে ইন্টারনেট থাকা অবস্থায় নিজে থেকেই নামবে। “নতুন সংস্করণ প্রস্তুত” বার্তা এলে কাজ সেভ করে অ্যাপ বন্ধ করে আবার খুলুন।",
    ],
  },
  {
    title: "গুরুত্বপূর্ণ সতর্কতা",
    steps: [
      "গুরুত্বপূর্ণ ফাইল নিয়মিত .xlsx হিসেবে নিজের কম্পিউটারে সেভ করে রাখুন।",
      "ব্রাউজারের “Cookies and site data” মুছলে ব্রাউজারে রাখা ফাইল ও অফলাইন ক্যাশ চলে যেতে পারে।",
      "লগইন, অ্যাকাউন্ট ও Photo Studio-র AI সুবিধা ইন্টারনেট ছাড়া কাজ করে না।",
      "কম্পিউটারের Firefox-এ অ্যাপ ইনস্টল সমর্থিত নয়। Chrome বা Edge ব্যবহার করুন।",
    ],
  },
];

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function parseOfflineStatus(
  value: unknown
): OfflineStatus {
  if (
    !isRecord(value) ||
    value.type !== "ALIMXL_OFFLINE_STATUS"
  ) {
    throw new Error("Invalid offline status response.");
  }

  if (typeof value.error === "string") {
    throw new Error(
      "The service worker could not inspect its cache."
    );
  }

  if (
    typeof value.release !== "string" ||
    value.release.length === 0 ||
    value.release.length > 120 ||
    !Array.isArray(value.documents) ||
    value.documents.length > 20
  ) {
    throw new Error("Incomplete offline status response.");
  }

  const seen = new Set<string>();

  const documents = value.documents.map(
    (item: unknown) => {
      if (
        !isRecord(item) ||
        typeof item.route !== "string" ||
        item.route.length === 0 ||
        item.route.length > 200 ||
        typeof item.cached !== "boolean" ||
        seen.has(item.route)
      ) {
        throw new Error("Invalid cached-page status.");
      }

      seen.add(item.route);

      return {
        route: item.route,
        cached: item.cached,
      };
    }
  );

  return {
    release: value.release,
    documents,
  };
}

function requestOfflineStatus(
  worker: ServiceWorker,
  signal: AbortSignal
): Promise<OfflineStatus> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Offline status request cancelled."));
      return;
    }

    const channel = new MessageChannel();
    let finished = false;
    const cleanup = (): void => {
      window.clearTimeout(timeout);

      signal.removeEventListener("abort", abort);

      channel.port1.onmessage = null;
      channel.port1.onmessageerror = null;

      channel.port1.close();
      channel.port2.close();
    };

    const fail = (error: Error): void => {
      if (finished) return;

      finished = true;
      cleanup();
      reject(error);
    };

    const abort = (): void => {
      fail(new Error("Offline status request cancelled."));
    };

    const timeout = window.setTimeout(() => {
      fail(new Error("Offline status response timed out."));
    }, STATUS_TIMEOUT_MS);

    channel.port1.onmessage = (
      event: MessageEvent<unknown>
    ): void => {
      if (finished) return;

      try {
        const status = parseOfflineStatus(event.data);

        finished = true;
        cleanup();
        resolve(status);
      } catch (error) {
        fail(
          error instanceof Error
            ? error
            : new Error("Offline status validation failed.")
        );
      }
    };

    channel.port1.onmessageerror = (): void => {
      fail(new Error("Offline status message could not be read."));
    };

    signal.addEventListener("abort", abort, {
      once: true,
    });

    try {
      worker.postMessage(
        {
          type: "ALIMXL_GET_OFFLINE_STATUS",
        },
        [channel.port2]
      );
    } catch {
      fail(new Error("Unable to contact the service worker."));
    }
  });
}

/**
 * Best-effort request for persistent storage.
 *
 * Without it, a browser under disk pressure may evict the offline cache
 * and IndexedDB data of a site that is not "persisted". Failure is
 * harmless and silent. (Firefox may show its own permission prompt.)
 */
async function requestPersistentStorage(): Promise<void> {
  try {
    const storage = navigator.storage;

    if (!storage?.persisted || !storage.persist) return;
    if (await storage.persisted()) return;

    await storage.persist();
  } catch {
    /* Optional hardening only. */
  }
}

/**
 * Development cleanup is intentionally limited to this app's:
 * - Exact root scope and /sw.js worker.
 * - alimxl-shell-* caches.
 *
 * It does not clear localStorage, IndexedDB or documents.
 */
async function cleanupDevelopmentOffline(): Promise<void> {
  const expectedScope = new URL(
    SCOPE_PATH,
    window.location.origin
  ).href;

  const expectedScript = new URL(
    SCRIPT_PATH,
    window.location.origin
  ).href;

  if ("serviceWorker" in navigator) {
    try {
      const registrations =
        await navigator.serviceWorker.getRegistrations();

      const ownedRegistrations = registrations.filter(
        (registration) => {
          if (registration.scope !== expectedScope) {
            return false;
          }

          return [
            registration.active,
            registration.waiting,
            registration.installing,
          ].some(
            (worker) =>
              worker !== null &&
              worker.scriptURL === expectedScript
          );
        }
      );

      const results = await Promise.allSettled(
        ownedRegistrations.map((registration) =>
          registration.unregister()
        )
      );

      for (const result of results) {
        if (result.status === "rejected") {
          console.warn(
            "ALIMXL development worker cleanup failed:",
            result.reason
          );
        }
      }
    } catch (error) {
      console.warn(
        "ALIMXL development worker lookup failed:",
        error
      );
    }
  }

  if ("caches" in window) {
    try {
      const names = await window.caches.keys();

      const results = await Promise.allSettled(
        names
          .filter((name) =>
            name.startsWith(CACHE_PREFIX)
          )
          .map((name) =>
            window.caches.delete(name)
          )
      );

      for (const result of results) {
        if (result.status === "rejected") {
          console.warn(
            "ALIMXL development shell-cache cleanup failed:",
            result.reason
          );
        }
      }
    } catch (error) {
      console.warn(
        "ALIMXL development cache lookup failed:",
        error
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* External-store helpers (no setState inside effects).               */
/* ------------------------------------------------------------------ */

/** True when the app runs as an installed app window (not a browser tab). */
function subscribeStandalone(
  onChange: () => void
): () => void {
  const query = window.matchMedia("(display-mode: standalone)");

  query.addEventListener("change", onChange);

  return () => {
    query.removeEventListener("change", onChange);
  };
}

function getStandaloneSnapshot(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean })
      .standalone === true
  );
}

function getStandaloneServerSnapshot(): boolean {
  return false;
}

/** False while rendering on the server, true in the browser. */
function subscribeNever(): () => void {
  return () => undefined;
}

function getMountedSnapshot(): boolean {
  return true;
}

function getMountedServerSnapshot(): boolean {
  return false;
}

export default function OfflineSetup() {
  const [notice, setNotice] =
    useState<OfflineNotice | null>(null);

  const [attempt, setAttempt] = useState(0);
  const [canInstall, setCanInstall] = useState(false);
  const [installingApp, setInstallingApp] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pillHidden, setPillHidden] = useState(false);

  const mounted = useSyncExternalStore(
    subscribeNever,
    getMountedSnapshot,
    getMountedServerSnapshot
  );

  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot
  );

  const deferredPromptRef =
    useRef<BeforeInstallPromptEvent | null>(null);

  const guideRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  /*
   * Key of the notice the user closed. A notice with the same key is not
   * shown again (e.g. after switching tabs) until a different situation
   * is reported.
   */
  const dismissedKeyRef = useRef<string | null>(null);

  const dismiss = useCallback((): void => {
    setNotice((current) => {
      if (current) {
        dismissedKeyRef.current = current.key;
      }

      return null;
    });
  }, []);

  const openGuide = useCallback((): void => {
    lastFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    setGuideOpen(true);
  }, []);

  const closeGuide = useCallback((): void => {
    setGuideOpen(false);

    lastFocusRef.current?.focus();
    lastFocusRef.current = null;
  }, []);

  /* Other parts of the app (e.g. a Help menu) can open the guide. */
  useEffect(() => {
    const handleOpenGuide = (): void => {
      openGuide();
    };

    window.addEventListener(OPEN_GUIDE_EVENT, handleOpenGuide);

    return () => {
      window.removeEventListener(
        OPEN_GUIDE_EVENT,
        handleOpenGuide
      );
    };
  }, [openGuide]);

  /* Move keyboard focus into the guide dialog when it opens. */
  useEffect(() => {
    if (guideOpen) {
      guideRef.current?.focus();
    }
  }, [guideOpen]);

  /* Capture browser PWA install prompt when available. */
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      deferredPromptRef.current =
        event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = (): void => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      dismissedKeyRef.current = null;
      setNotice({
        key: "app-installed",
        kind: "info",
        title: "অ্যাপ ইনস্টল সম্পন্ন হয়েছে",
        text: "এখন ডেস্কটপ বা স্টার্ট মেনুর ALIMXL আইকন থেকে অ্যাপটি খুলে অফলাইনে ব্যবহার করুন। আপনার কাজ ও ফাইল নিরাপদ আছে।",
        autoHideMs: SUCCESS_AUTO_HIDE_MS,
      });
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );
    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );
    };
  }, []);

  const handleInstallClick = useCallback(async (): Promise<void> => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent || installingApp) return;

    setInstallingApp(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      deferredPromptRef.current = null;
      setCanInstall(false);

      dismissedKeyRef.current = null;
      if (choice.outcome === "accepted") {
        setNotice({
          key: "install-accepted",
          kind: "info",
          title: "ইনস্টল প্রক্রিয়া শুরু হয়েছে",
          text: "ইনস্টল শেষ হলে ALIMXL আইকন থেকে অ্যাপটি খুলে অফলাইনে ব্যবহার করুন।",
          autoHideMs: SUCCESS_AUTO_HIDE_MS,
        });
      } else {
        setNotice({
          key: "install-dismissed",
          kind: "info",
          title: "ইনস্টল বাতিল করা হয়েছে",
          text: "আপনি চাইলে যেকোনো সময় “অফলাইন গাইড” দেখে অ্যাপটি ইনস্টল করতে পারেন।",
          autoHideMs: SUCCESS_AUTO_HIDE_MS,
        });
      }
    } catch {
      setNotice({
        key: "install-error",
        kind: "warning",
        title: "ইনস্টল প্রম্পট চালু করা যায়নি",
        text: "ব্রাউজারের মেনু থেকেও অ্যাপটি ইনস্টল করা যায়। ধাপগুলো দেখতে “অফলাইন গাইড” খুলুন।",
      });
    } finally {
      setInstallingApp(false);
    }
  }, [installingApp]);

  /* Success confirmations fade away on their own. */
  useEffect(() => {
    if (!notice?.autoHideMs) return;

    const timer = window.setTimeout(
      dismiss,
      notice.autoHideMs
    );

    return () => window.clearTimeout(timer);
  }, [notice, dismiss]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      void cleanupDevelopmentOffline();
      return;
    }

    let disposed = false;

    let registration:
      | ServiceWorkerRegistration
      | undefined;

    let watchedWorker: ServiceWorker | null = null;

    let statusInFlight = false;
    let inspectQueued = false;
    let updateInFlight = false;
    let lastUpdateAttempt = 0;
    let updateTimer: number | undefined;

    const controller = new AbortController();

    function publish(next: OfflineNotice): void {
      if (disposed) return;

      if (dismissedKeyRef.current === next.key) {
        return;
      }

      /* A different situation makes earlier dismissals obsolete. */
      dismissedKeyRef.current = null;

      setNotice((current) =>
        current &&
        current.key === next.key &&
        current.text === next.text
          ? current
          : next
      );
    }

    function publishWaitingUpdate(): boolean {
      if (!registration?.waiting) {
        return false;
      }

      publish({
        key: "update-waiting",
        kind: "info",
        title: "নতুন সংস্করণ প্রস্তুত",
        text:
          "আগে কাজ সেভ করুন। তারপর এই অ্যাপের সব tab ও " +
          "installed app window বন্ধ করে আবার খুলুন। " +
          "চলমান কাজের মধ্যে জোর করে reload করা হবে না।",
      });

      return true;
    }

    async function inspectCache(): Promise<void> {
      if (disposed || publishWaitingUpdate()) {
        return;
      }

      if (statusInFlight) {
        /* Re-check once the current request finishes. */
        inspectQueued = true;
        return;
      }

      /*
       * Inspect the worker controlling this page first.
       * Fall back to this registration's active worker.
       */
      const worker =
        navigator.serviceWorker.controller ??
        registration?.active;

      if (!worker || worker.state !== "activated") {
        return;
      }

      statusInFlight = true;

      try {
        const status = await requestOfflineStatus(
          worker,
          controller.signal
        );

        if (disposed || publishWaitingUpdate()) {
          return;
        }

        const missingRoutes = EXPECTED_ROUTES.filter(
          (route) =>
            !status.documents.some(
              (document) =>
                document.route === route &&
                document.cached
            )
        );

        if (missingRoutes.length > 0) {
          publish({
            key: `cache-incomplete:${missingRoutes.join(",")}`,
            kind: "warning",
            title: "Offline page cache অসম্পূর্ণ",
            text:
              `এখনও cache পাওয়া যায়নি: ${missingRoutes.join(", ")}। ` +
              "ইন্টারনেট সংযোগ রেখে অ্যাপটি আবার পরীক্ষা করুন। " +
              "এই বার্তা saved document মুছে যাওয়ার অর্থ নয়।",
          });

          return;
        }

        publish({
          key: `cache-ok:${status.release}`,
          kind: "info",
          title: "প্রধান page-এর cache পাওয়া গেছে",
          text:
            `Cache release: ${status.release}। ` +
            "Home, Settings ও Photo Studio-এর HTML cache আছে। " +
            "এটি সব feature, dynamic file বা offline navigation " +
            "সম্পূর্ণ কাজ করার নিশ্চয়তা নয়। আলাদাভাবে offline পরীক্ষা করুন।",
          autoHideMs: SUCCESS_AUTO_HIDE_MS,
        });
      } catch {
        if (disposed || publishWaitingUpdate()) {
          return;
        }

        publish({
          key: "status-unconfirmed",
          kind: "warning",
          title: "Offline status নিশ্চিত করা যায়নি",
          text:
            "Service worker-এর cache status পাওয়া যায়নি। " +
            "পুরোনো worker সক্রিয় থাকতে পারে অথবা status request " +
            "ব্যর্থ হয়েছে। এটিকে saved data হারানো বা সব offline " +
            "সুবিধা বন্ধ হওয়ার প্রমাণ হিসেবে ধরবেন না।",
        });
      } finally {
        statusInFlight = false;

        if (inspectQueued && !disposed) {
          inspectQueued = false;
          void inspectCache();
        }
      }
    }

    async function checkForUpdate(
      force = false
    ): Promise<void> {
      if (
        disposed ||
        !registration ||
        updateInFlight
      ) {
        return;
      }

      if (publishWaitingUpdate()) {
        return;
      }

      /*
       * navigator.onLine is only a browser hint.
       * A true value does not guarantee server reachability.
       */
      if (!navigator.onLine) {
        return;
      }

      const now = Date.now();

      if (
        !force &&
        now - lastUpdateAttempt < UPDATE_INTERVAL_MS
      ) {
        return;
      }

      lastUpdateAttempt = now;
      updateInFlight = true;

      try {
        await registration.update();

        if (!disposed) {
          publishWaitingUpdate();
        }
      } catch (error) {
        /*
         * Update failure is not registration failure.
         * Keep an existing active worker and cached files.
         */
        if (!disposed) {
          console.warn(
            "ALIMXL update check failed; existing worker retained:",
            error
          );
        }
      } finally {
        updateInFlight = false;
      }
    }

    function handleWorkerStateChange(): void {
      if (disposed || !watchedWorker) {
        return;
      }

      if (watchedWorker.state === "installed") {
        if (
          navigator.serviceWorker.controller ||
          registration?.waiting
        ) {
          publish({
            key: "update-waiting",
            kind: "info",
            title: "নতুন সংস্করণ পাওয়া গেছে",
            text:
              "কাজ সেভ করে এই অ্যাপের সব tab ও installed " +
              "window বন্ধ করে আবার খুলুন। Update জোর করে " +
              "চালু করা হচ্ছে না।",
          });
        } else {
          publish({
            key: "first-install-done",
            kind: "info",
            title: "প্রাথমিক cache installation শেষ",
            text:
              "Service worker activation-এর অপেক্ষা চলছে। " +
              "Installation শেষ হওয়া মানেই সব feature " +
              "offline-ready—এমন নয়।",
          });
        }
      }

      if (watchedWorker.state === "activated") {
        void inspectCache();
      }

      if (
        watchedWorker.state === "redundant" &&
        !registration?.active &&
        !registration?.waiting
      ) {
        publish({
          key: "install-redundant",
          kind: "warning",
          title: "Offline installation সম্পন্ন হয়নি",
          text:
            "নতুন worker সক্রিয় হতে পারেনি। সংযোগ রেখে " +
            "আবার চেষ্টা করুন। অনলাইন অ্যাপ ব্যবহার করা যেতে পারে।",
        });
      }
    }

    function watchInstallingWorker(): void {
      watchedWorker?.removeEventListener(
        "statechange",
        handleWorkerStateChange
      );

      watchedWorker =
        registration?.installing ?? null;

      if (!watchedWorker) return;

      watchedWorker.addEventListener(
        "statechange",
        handleWorkerStateChange
      );

      if (!registration?.active) {
        publish({
          key: "installing",
          kind: "info",
          title: "Offline files প্রস্তুত হচ্ছে",
          text:
            "প্রয়োজনীয় public page ও সরাসরি যুক্ত static files " +
            "সংরক্ষণের চেষ্টা চলছে। এখনই সম্পূর্ণ প্রস্তুত ধরে নেবেন না।",
        });
      }

      handleWorkerStateChange();
    }

    function handleControllerChange(): void {
      /*
       * Do not reload the page here.
       */
      void inspectCache();
    }

    function handleOnline(): void {
      void inspectCache();
      void checkForUpdate();
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState !== "visible") {
        return;
      }

      void inspectCache();
      void checkForUpdate();
    }

    async function setup(): Promise<void> {
      if (disposed) return;

      if (!window.isSecureContext) {
        publish({
          key: "insecure-context",
          kind: "warning",
          title: "Offline setup-এর জন্য secure context প্রয়োজন",
          text:
            "Production website HTTPS দিয়ে খুলুন। " +
            "এই অবস্থায় service worker register করা হয়নি।",
        });

        return;
      }

      if (!("serviceWorker" in navigator)) {
        publish({
          key: "sw-unsupported",
          kind: "warning",
          title: "Service worker সমর্থিত নয়",
          text:
            "এই browser-এ app-shell offline সুবিধা চালু করা যায়নি। " +
            "এটি document export-এর বিকল্প নয়।",
        });

        return;
      }

      try {
        registration =
          await navigator.serviceWorker.register(
            SCRIPT_PATH,
            {
              scope: SCOPE_PATH,
              updateViaCache: "none",
            }
          );
      } catch (error) {
        if (disposed) return;

        console.error(
          "ALIMXL service worker registration failed:",
          error
        );

        publish({
          key: "register-failed",
          kind: "error",
          title: "Offline registration ব্যর্থ হয়েছে",
          text:
            "সংযোগ, HTTPS এবং /sw.js response পরীক্ষা করুন। " +
            "এই component কোনো workbook বা image মুছে দেয়নি।",
        });

        return;
      }

      if (disposed) return;

      registration.addEventListener(
        "updatefound",
        watchInstallingWorker
      );

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange
      );

      window.addEventListener(
        "online",
        handleOnline
      );

      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      /*
       * A long-lived installed window can stay visible for days without
       * any visibility or network event, so also poll for updates.
       * checkForUpdate() itself skips offline and throttled cases.
       */
      updateTimer = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void checkForUpdate();
        }
      }, UPDATE_INTERVAL_MS);

      void requestPersistentStorage();

      watchInstallingWorker();

      if (!publishWaitingUpdate()) {
        void inspectCache();
      }

      void checkForUpdate(true);
    }

    /*
     * Start after mount without synchronous initialization
     * state updates inside the effect body.
     */
    void Promise.resolve()
      .then(setup)
      .catch((error: unknown) => {
        if (disposed) return;

        console.error(
          "ALIMXL offline setup failed unexpectedly:",
          error
        );

        publish({
          key: "setup-failed",
          kind: "error",
          title: "Offline setup সম্পূর্ণ হয়নি",
          text:
            "অপ্রত্যাশিত সমস্যা হয়েছে। অ্যাপ অনলাইনে ব্যবহার করা " +
            "যাবে। কোনো workbook বা image মুছে ফেলা হয়নি।",
        });
      });

    return () => {
      disposed = true;

      controller.abort();

      if (updateTimer !== undefined) {
        window.clearInterval(updateTimer);
      }

      registration?.removeEventListener(
        "updatefound",
        watchInstallingWorker
      );

      watchedWorker?.removeEventListener(
        "statechange",
        handleWorkerStateChange
      );

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange
        );
      }

      window.removeEventListener(
        "online",
        handleOnline
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
    /*
     * `canInstall` is intentionally NOT a dependency: the install button
     * is decided at render time, so a browser install prompt arriving
     * must not tear down and re-run the whole service-worker setup.
     */
  }, [attempt]);

  const borderColor =
    notice?.kind === "error"
      ? "#DC7373"
      : notice?.kind === "warning"
        ? "#D7AD47"
        : "#A9CDB7";

  /* Install is pointless inside an already-installed app window. */
  const showInstallButton = canInstall && !isStandalone;

  const showPill =
    mounted && !notice && !isStandalone && !pillHidden;

  return (
    <>
      {notice && (
        <aside
          aria-label="ALIMXL offline status"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              dismiss();
            }
          }}
          className="fixed bottom-4 right-4 z-10000 max-h-[65vh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border bg-white p-4 text-[#163B28] shadow-xl print:hidden"
          style={{ borderColor }}
        >
          <div
            role={
              notice.kind === "error"
                ? "alert"
                : "status"
            }
            aria-live={
              notice.kind === "error"
                ? "assertive"
                : "polite"
            }
            aria-atomic="true"
          >
            <h2 className="text-sm font-bold">
              {notice.title}
            </h2>

            <p className="mt-2 text-xs leading-6 text-[#4D6758]">
              {notice.text}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {showInstallButton && (
              <button
                type="button"
                disabled={installingApp}
                onClick={() => {
                  void handleInstallClick();
                }}
                className="rounded-lg bg-[#107C41] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0D6635] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
              >
                {installingApp
                  ? "ইনস্টল হচ্ছে..."
                  : "ইনস্টল করুন"}
              </button>
            )}

            <button
              type="button"
              onClick={openGuide}
              className="rounded-lg border border-[#CDDCD2] px-3 py-2 text-xs font-semibold text-[#107C41] hover:bg-[#EFF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
            >
              অফলাইন গাইড
            </button>

            <button
              type="button"
              onClick={() => {
                dismissedKeyRef.current = null;
                setNotice(null);
                setAttempt((value) => value + 1);
              }}
              className="rounded-lg border border-[#CDDCD2] px-3 py-2 text-xs font-semibold text-[#107C41] hover:bg-[#EFF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
            >
              আবার পরীক্ষা
            </button>

            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-[#51695A] hover:bg-[#F1F5F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
            >
              বন্ধ করুন
            </button>
          </div>
        </aside>
      )}

      {showPill && (
        <div
          role="group"
          aria-label="ALIMXL install and offline help"
          className="fixed bottom-14 right-4 z-10000 flex items-center gap-1 rounded-full border bg-white p-1 text-[#163B28] shadow-lg print:hidden"
          style={{ borderColor: "#A9CDB7" }}
        >
          {showInstallButton && (
            <button
              type="button"
              disabled={installingApp}
              onClick={() => {
                void handleInstallClick();
              }}
              className="rounded-full bg-[#107C41] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0D6635] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
            >
              {installingApp
                ? "ইনস্টল হচ্ছে..."
                : "ইনস্টল করুন"}
            </button>
          )}

          <button
            type="button"
            onClick={openGuide}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#107C41] hover:bg-[#EFF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
          >
            অফলাইন গাইড
          </button>

          <button
            type="button"
            aria-label="এই বোতামগুলো লুকান"
            onClick={() => setPillHidden(true)}
            className="rounded-full px-2 py-1.5 text-xs font-semibold text-[#51695A] hover:bg-[#F1F5F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
          >
            ✕
          </button>
        </div>
      )}

      {guideOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 print:hidden"
          style={{ zIndex: 10001 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeGuide();
            }
          }}
        >
          <div
            ref={guideRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alimxl-offline-guide-title"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closeGuide();
              }
            }}
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-[#163B28] shadow-2xl outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="alimxl-offline-guide-title"
                className="text-base font-bold"
              >
                ALIMXL ইনস্টল ও অফলাইন ব্যবহারের গাইড
              </h2>

              <button
                type="button"
                aria-label="গাইড বন্ধ করুন"
                onClick={closeGuide}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-[#51695A] hover:bg-[#F1F5F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs leading-6 text-[#4D6758]">
              একবার ইনস্টল করলে ইন্টারনেট ছাড়াই স্প্রেডশিটের কাজ করা যায়।
              নিচের ধাপগুলো অনুসরণ করুন।
            </p>

            {isStandalone && (
              <p className="mt-3 rounded-lg bg-[#EFF6F1] px-3 py-2 text-xs font-semibold text-[#107C41]">
                আপনি এখন ইনস্টল করা অ্যাপেই আছেন।
              </p>
            )}

            {showInstallButton && (
              <button
                type="button"
                disabled={installingApp}
                onClick={() => {
                  void handleInstallClick();
                }}
                className="mt-3 rounded-lg bg-[#107C41] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D6635] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
              >
                {installingApp
                  ? "ইনস্টল হচ্ছে..."
                  : "এখনই ইনস্টল করুন"}
              </button>
            )}

            {GUIDE_SECTIONS.map((section) => (
              <section key={section.title} className="mt-4">
                <h3 className="text-sm font-bold text-[#107C41]">
                  {section.title}
                </h3>

                <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs leading-6 text-[#31483B]">
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            ))}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeGuide}
                className="rounded-lg border border-[#CDDCD2] px-4 py-2 text-xs font-semibold text-[#107C41] hover:bg-[#EFF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107C41]"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}