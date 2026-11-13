"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
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

interface OfflineStatus {
  release: string;
  documents: {
    route: string;
    cached: boolean;
  }[];
}

const SCRIPT_PATH = "/sw.js";
const SCOPE_PATH = "/";

const CACHE_PREFIX = "alimxl-shell-";

const STATUS_TIMEOUT_MS = 6000;
const UPDATE_INTERVAL_MS = 10 * 60 * 1000;
const SUCCESS_AUTO_HIDE_MS = 12_000;

const EXPECTED_ROUTES = [
  "/",
  "/settings",
  "/photo-studio",
] as const;

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

export default function OfflineSetup() {
  const [notice, setNotice] =
    useState<OfflineNotice | null>(null);

  const [attempt, setAttempt] = useState(0);

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
  }, [attempt]);

  if (!notice) {
    return null;
  }

  const borderColor =
    notice.kind === "error"
      ? "#DC7373"
      : notice.kind === "warning"
        ? "#D7AD47"
        : "#A9CDB7";

  return (
    <aside
      aria-label="ALIMXL offline status"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          dismiss();
        }
      }}
      className="fixed bottom-4 right-4 z-[10000] max-h-[65vh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border bg-white p-4 text-[#163B28] shadow-xl print:hidden"
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
  );
}