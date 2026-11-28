"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
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

interface BilingualText {
  bn: string;
  en: string;
}

type GuideIconName =
  | "desktop"
  | "android"
  | "apple"
  | "offline"
  | "warning";

interface GuideSection {
  icon: GuideIconName;
  title: BilingualText;
  steps: BilingualText[];
  /** Highlights an important-notes section. */
  tone?: "warning";
}

type GuideLanguage = "both" | "bn" | "en";

/**
 * "unknown" until the service worker reports on its cache.
 * Only drives a small status dot; it never blocks any feature.
 */
type OfflineReadiness = "unknown" | "ready" | "partial";

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
    icon: "desktop",
    title: {
      bn: "কম্পিউটারে (Google Chrome / Microsoft Edge)",
      en: "On a computer (Google Chrome / Microsoft Edge)",
    },
    steps: [
      {
        bn: "ইন্টারনেট চালু রেখে ALIMXL ওয়েবসাইটটি Chrome বা Edge-এ খুলুন।",
        en: "With your internet connection on, open the ALIMXL website in Chrome or Edge.",
      },
      {
        bn: "ঠিকানা-বারের ডান পাশে ইনস্টল আইকন (কম্পিউটার বা ⊕ চিহ্ন) দেখা গেলে তাতে ক্লিক করুন। অথবা এই বক্সের “ইনস্টল করুন” বোতাম চাপুন।",
        en: "If you see an install icon (a computer or ⊕ symbol) at the right end of the address bar, click it. Or press the “Install App” button shown here.",
      },
      {
        bn: "আইকন না দেখা গেলে ব্রাউজারের মেনু (⋮) খুলে “Install ALIMXL”, “Install page as app” বা “Apps → Install this site as an app” বেছে নিন (নাম ব্রাউজারের সংস্করণ অনুযায়ী সামান্য আলাদা হতে পারে)।",
        en: "If the icon is not visible, open the browser menu (⋮) and choose “Install ALIMXL”, “Install page as app” or “Apps → Install this site as an app” (the exact name may differ slightly by browser version).",
      },
      {
        bn: "ইনস্টল শেষ হলে ডেস্কটপ বা স্টার্ট মেনুতে ALIMXL আইকন পাবেন। সেখান থেকে খুলুন।",
        en: "When installation finishes, you will find the ALIMXL icon on your desktop or Start menu. Open the app from there.",
      },
    ],
  },
  {
    icon: "android",
    title: {
      bn: "অ্যান্ড্রয়েড ফোনে (Chrome)",
      en: "On an Android phone (Chrome)",
    },
    steps: [
      {
        bn: "Chrome-এ ওয়েবসাইটটি খুলুন।",
        en: "Open the website in Chrome.",
      },
      {
        bn: "মেনু (⋮) থেকে “Install app” বা “Add to Home screen” বেছে নিন।",
        en: "From the menu (⋮), choose “Install app” or “Add to Home screen”.",
      },
      {
        bn: "এরপর হোম স্ক্রিনের ALIMXL আইকন থেকে খুলুন।",
        en: "Then open ALIMXL from its icon on your home screen.",
      },
    ],
  },
  {
    icon: "apple",
    title: {
      bn: "আইফোন / আইপ্যাডে (Safari)",
      en: "On an iPhone / iPad (Safari)",
    },
    steps: [
      {
        bn: "Safari-তে ওয়েবসাইটটি খুলুন।",
        en: "Open the website in Safari.",
      },
      {
        bn: "Share বোতাম চেপে “Add to Home Screen” বেছে নিন।",
        en: "Tap the Share button and choose “Add to Home Screen”.",
      },
    ],
  },
  {
    icon: "offline",
    title: {
      bn: "অফলাইনে চলবে কি না যাচাই করুন",
      en: "Check that it works offline",
    },
    steps: [
      {
        bn: "প্রথমবার অবশ্যই ইন্টারনেট চালু রেখে সাইট খুলুন। “প্রধান page-এর cache পাওয়া গেছে” বার্তা না আসা পর্যন্ত কিছুক্ষণ অপেক্ষা করুন।",
        en: "The first time, always open the site with the internet on. Wait a little until the “Main page cache found” message appears.",
      },
      {
        bn: "তারপর ইন্টারনেট বন্ধ করে ইনস্টল করা অ্যাপটি খুলে দেখুন। স্প্রেডশিটের কাজ চলবে।",
        en: "Then turn the internet off and open the installed app. Spreadsheet work will keep running.",
      },
      {
        bn: "নতুন সংস্করণ এলে ইন্টারনেট থাকা অবস্থায় নিজে থেকেই নামবে। “নতুন সংস্করণ প্রস্তুত” বার্তা এলে কাজ সেভ করে অ্যাপ বন্ধ করে আবার খুলুন।",
        en: "New versions download automatically while you are online. When the “New version ready” message appears, save your work, close the app and open it again.",
      },
    ],
  },
  {
    icon: "warning",
    tone: "warning",
    title: {
      bn: "গুরুত্বপূর্ণ সতর্কতা",
      en: "Important notes",
    },
    steps: [
      {
        bn: "গুরুত্বপূর্ণ ফাইল নিয়মিত .xlsx হিসেবে নিজের কম্পিউটারে সেভ করে রাখুন।",
        en: "Regularly save important files to your own computer as .xlsx.",
      },
      {
        bn: "ব্রাউজারের “Cookies and site data” মুছলে ব্রাউজারে রাখা ফাইল ও অফলাইন ক্যাশ চলে যেতে পারে।",
        en: "Clearing the browser’s “Cookies and site data” can remove files stored in the browser and the offline cache.",
      },
      {
        bn: "লগইন, অ্যাকাউন্ট ও Photo Studio-র AI সুবিধা ইন্টারনেট ছাড়া কাজ করে না।",
        en: "Login, account features and the Photo Studio AI tools do not work without internet.",
      },
      {
        bn: "কম্পিউটারের Firefox-এ অ্যাপ ইনস্টল সমর্থিত নয়। Chrome বা Edge ব্যবহার করুন।",
        en: "Installing the app is not supported in desktop Firefox. Please use Chrome or Edge.",
      },
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

/* ------------------------------------------------------------------ */
/* Presentation helpers (icons, language options, styles).            */
/* ------------------------------------------------------------------ */

const LANGUAGE_OPTIONS: { id: GuideLanguage; label: string }[] = [
  { id: "both", label: "EN + বাংলা" },
  { id: "en", label: "English" },
  { id: "bn", label: "বাংলা" },
];

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface IconProps {
  size?: number;
}

function Svg({
  size = 16,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function DownloadIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </Svg>
  );
}

function BookIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" />
      <path d="M12 6.5v13" />
    </Svg>
  );
}

function CloseIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}

function MonitorIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </Svg>
  );
}

function PhoneIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18h2" />
    </Svg>
  );
}

function TabletIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
      <path d="M10.5 18h3" />
    </Svg>
  );
}

function WifiIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 12.5a10 10 0 0 1 14 0" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 19.5h.01" />
    </Svg>
  );
}

function AlertTriangleIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3.5 22 20.5H2L12 3.5z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.5h.01" />
    </Svg>
  );
}

function AlertCircleIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.5h.01" />
    </Svg>
  );
}

function CheckCircleIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16.2 9.5" />
    </Svg>
  );
}

function NoticeIcon({ kind }: { kind: NoticeKind }) {
  if (kind === "error") return <AlertCircleIcon size={18} />;
  if (kind === "warning") return <AlertTriangleIcon size={18} />;
  return <CheckCircleIcon size={18} />;
}

function GuideSectionIcon({ icon }: { icon: GuideIconName }) {
  switch (icon) {
    case "desktop":
      return <MonitorIcon size={17} />;
    case "android":
      return <PhoneIcon size={17} />;
    case "apple":
      return <TabletIcon size={17} />;
    case "offline":
      return <WifiIcon size={17} />;
    default:
      return <AlertTriangleIcon size={17} />;
  }
}

/**
 * All visual styling lives here so the component does not depend on
 * Tailwind utilities or on globals.css. Every selector is prefixed
 * with `alx-` to avoid clashing with the rest of the app.
 */
const OFFLINE_UI_CSS = `
.alx-pill,.alx-toast,.alx-overlay{
  --alx-green:#107C41;--alx-green-2:#0A5C30;--alx-green-3:#14A058;
  --alx-ink:#163B28;--alx-muted:#4D6758;--alx-line:#CDDCD2;--alx-mint:#EFF6F1;
  --alx-gold:#D7AD47;--alx-gold-2:#B8902F;
  font-family:"Segoe UI",system-ui,-apple-system,"Noto Sans","Noto Sans Bengali",Arial,sans-serif;
}
.alx-pill *,.alx-toast *,.alx-overlay *{box-sizing:border-box}

/* ---------- Buttons ---------- */
.alx-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:.45rem;
  border:0;border-radius:9999px;font:inherit;font-size:.8125rem;font-weight:700;letter-spacing:.015em;
  line-height:1;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent;
  transition:transform .16s ease,box-shadow .16s ease,background-color .16s ease,border-color .16s ease,filter .16s ease}
.alx-btn:focus-visible,.alx-close:focus-visible,.alx-seg button:focus-visible{outline:2px solid var(--alx-gold);outline-offset:2px}
.alx-btn:disabled{cursor:not-allowed;opacity:.65;filter:saturate(.6)}
.alx-ico{display:grid;place-items:center;flex:none;width:1.5rem;height:1.5rem;border-radius:9999px}

.alx-btn-primary{padding:.5rem 1rem .5rem .45rem;color:#fff;overflow:hidden;
  background:linear-gradient(135deg,var(--alx-green-3) 0%,var(--alx-green) 48%,var(--alx-green-2) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 0 0 1px rgba(215,173,71,.9),0 8px 18px -8px rgba(16,124,65,.85)}
.alx-btn-primary .alx-ico{background:rgba(255,255,255,.2);box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.alx-btn-primary .alx-ico svg{animation:alx-bob 2.4s ease-in-out infinite}
.alx-btn-primary::after{content:"";position:absolute;top:0;bottom:0;left:-70%;width:45%;pointer-events:none;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);
  transform:skewX(-20deg);animation:alx-shine 5s ease-in-out 1.2s infinite}
.alx-btn-primary:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 0 1px var(--alx-gold),0 12px 22px -8px rgba(16,124,65,.9)}
.alx-btn-primary:active:not(:disabled){transform:translateY(0);filter:brightness(.97)}
.alx-btn-primary:disabled::after,.alx-btn-primary:disabled .alx-ico svg{display:none;animation:none}

.alx-btn-ghost{padding:.5rem .95rem .5rem .45rem;color:var(--alx-green-2);background:#fff;
  border:1px solid rgba(16,124,65,.3);box-shadow:0 1px 2px rgba(22,59,40,.08)}
.alx-btn-ghost .alx-ico{color:var(--alx-green);background:var(--alx-mint)}
.alx-btn-ghost:hover:not(:disabled){transform:translateY(-1px);background:var(--alx-mint);
  border-color:var(--alx-gold);box-shadow:0 6px 14px -8px rgba(10,92,48,.5)}
.alx-btn-ghost:active:not(:disabled){transform:translateY(0)}

.alx-btn-quiet{padding:.5rem .8rem;color:#51695A;background:transparent}
.alx-btn-quiet:hover:not(:disabled){background:#F1F5F2}

.alx-btn-block{width:100%;padding:.72rem 1rem .72rem .6rem;font-size:.875rem}

.alx-close{display:grid;place-items:center;flex:none;width:1.75rem;height:1.75rem;border:0;border-radius:9999px;
  color:#51695A;background:transparent;cursor:pointer;transition:background-color .16s ease}
.alx-close:hover{background:#F1F5F2}
.alx-close-light{color:#fff}
.alx-close-light:hover{background:rgba(255,255,255,.18)}

/* ---------- Floating pill ---------- */
.alx-pill{position:fixed;right:1rem;bottom:3.5rem;z-index:10000;display:flex;align-items:center;gap:.375rem;
  padding:.3125rem;border-radius:9999px;color:var(--alx-ink);
  background:linear-gradient(180deg,rgba(255,255,255,.97),rgba(244,250,246,.95));
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  border:1px solid rgba(215,173,71,.65);
  box-shadow:0 14px 34px -12px rgba(10,92,48,.55),0 2px 8px rgba(22,59,40,.14),inset 0 1px 0 rgba(255,255,255,.9);
  animation:alx-rise .45s cubic-bezier(.2,.8,.2,1) both}
.alx-status{flex:none;width:.55rem;height:.55rem;margin:0 .1rem 0 .5rem;border-radius:9999px}
.alx-status[data-state="ready"]{background:#1FB868;box-shadow:0 0 0 3px rgba(31,184,104,.2);animation:alx-pulse 2.4s ease-out infinite}
.alx-status[data-state="partial"]{background:var(--alx-gold);box-shadow:0 0 0 3px rgba(215,173,71,.25)}

/* ---------- Notice (toast) ---------- */
.alx-toast{position:fixed;right:1rem;bottom:1rem;z-index:10000;width:calc(100% - 2rem);max-width:24rem;max-height:65vh;
  overflow-y:auto;padding:.95rem 1rem .85rem;color:var(--alx-ink);background:#fff;
  border:1px solid var(--alx-line);border-left:4px solid var(--alx-accent,#107C41);border-radius:1rem;
  box-shadow:0 22px 48px -18px rgba(10,48,28,.45),0 2px 8px rgba(22,59,40,.1);
  animation:alx-rise .35s cubic-bezier(.2,.8,.2,1) both}
.alx-toast[data-kind="info"]{--alx-accent:#107C41}
.alx-toast[data-kind="warning"]{--alx-accent:#D7AD47}
.alx-toast[data-kind="error"]{--alx-accent:#DC7373}
.alx-toast-body{display:flex;align-items:flex-start;gap:.7rem}
.alx-toast-icon{display:grid;place-items:center;flex:none;width:1.9rem;height:1.9rem;border-radius:9999px;
  color:var(--alx-accent);background:#EFF6F1;background:color-mix(in srgb,var(--alx-accent) 14%,#fff)}
.alx-toast-title{margin:0;font-size:.875rem;font-weight:700;line-height:1.35}
.alx-toast-text{margin:.35rem 0 0;font-size:.75rem;line-height:1.65;color:var(--alx-muted)}
.alx-toast-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.8rem}
.alx-toast .alx-btn{font-size:.75rem}
.alx-toast .alx-btn-primary,.alx-toast .alx-btn-ghost{padding:.45rem .85rem .45rem .4rem}
.alx-toast .alx-ico{width:1.35rem;height:1.35rem}

/* ---------- Guide dialog ---------- */
.alx-overlay{position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;
  background:rgba(7,26,16,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:alx-fade .2s ease both}
.alx-dialog{display:flex;flex-direction:column;width:100%;max-width:44rem;max-height:90vh;overflow:hidden;
  color:var(--alx-ink);background:#fff;border:1px solid rgba(215,173,71,.7);border-radius:1.25rem;outline:none;
  box-shadow:0 36px 90px -24px rgba(0,0,0,.6);animation:alx-pop .28s cubic-bezier(.2,.9,.25,1) both}
.alx-dialog-head{position:relative;flex:none;padding:1rem 1.15rem .9rem;color:#fff;
  background:radial-gradient(120% 140% at 100% 0%,rgba(215,173,71,.28),transparent 55%),
  linear-gradient(135deg,#0A5C30 0%,#107C41 60%,#14A058 100%)}
.alx-dialog-head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;
  background:linear-gradient(90deg,transparent,var(--alx-gold),#F3E3B3,var(--alx-gold),transparent)}
.alx-dialog-head-row{display:flex;align-items:center;gap:.8rem}
.alx-badge-ico{display:grid;place-items:center;flex:none;width:2.5rem;height:2.5rem;border-radius:.8rem;
  background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
.alx-dialog-titles{flex:1;min-width:0}
.alx-dialog-title{margin:0;font-size:1rem;font-weight:800;letter-spacing:.01em;line-height:1.3}
.alx-dialog-sub{margin:.15rem 0 0;font-size:.78rem;opacity:.88}
.alx-dialog-tools{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem;margin-top:.85rem}
.alx-tools-label{font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
.alx-seg{display:inline-flex;padding:2px;border-radius:9999px;background:rgba(0,0,0,.22)}
.alx-seg button{border:0;border-radius:9999px;padding:.32rem .8rem;font:inherit;font-size:.74rem;font-weight:700;
  color:rgba(255,255,255,.88);background:transparent;cursor:pointer;transition:background-color .16s ease,color .16s ease}
.alx-seg button[aria-pressed="true"]{color:var(--alx-green-2);background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.alx-dialog-body{flex:1;min-height:0;overflow-y:auto;padding:.9rem 1.15rem 1.1rem;background:#F6FAF7}
.alx-intro{margin:0;font-size:.8rem;line-height:1.7;color:var(--alx-muted)}
.alx-intro span{display:block}
.alx-note-ok{margin:.75rem 0 0;padding:.55rem .8rem;border:1px solid var(--alx-line);border-radius:.7rem;
  background:var(--alx-mint);font-size:.78rem;font-weight:600;color:var(--alx-green-2)}
.alx-cta{margin-top:.85rem}
.alx-card{margin-top:.85rem;padding:.85rem .95rem .95rem;background:#fff;border:1px solid var(--alx-line);
  border-radius:.95rem;box-shadow:0 1px 2px rgba(22,59,40,.05)}
.alx-card-warn{background:#FFFCF2;border-color:rgba(215,173,71,.75)}
.alx-card-title{display:flex;align-items:center;gap:.6rem;margin:0;font-size:.875rem;font-weight:800;color:var(--alx-green-2)}
.alx-card-title small{display:block;margin-top:.1rem;font-size:.72rem;font-weight:600;color:var(--alx-muted)}
.alx-card-ico{display:grid;place-items:center;flex:none;width:1.9rem;height:1.9rem;border-radius:.6rem;
  color:var(--alx-green);background:var(--alx-mint)}
.alx-card-warn .alx-card-ico{color:var(--alx-gold-2);background:#FBF1D4}
.alx-steps{margin:.55rem 0 0;padding:0;list-style:none;counter-reset:alx-step}
.alx-steps li{position:relative;margin-top:.6rem;padding-left:2rem;counter-increment:alx-step}
.alx-steps li::before{content:counter(alx-step);position:absolute;left:0;top:.08rem;display:grid;place-items:center;
  width:1.4rem;height:1.4rem;border-radius:9999px;font-size:.7rem;font-weight:800;color:#fff;
  background:linear-gradient(135deg,var(--alx-green-3),var(--alx-green-2))}
.alx-card-warn .alx-steps li::before{background:linear-gradient(135deg,var(--alx-gold),var(--alx-gold-2))}
.alx-bn{margin:0;font-size:.8rem;line-height:1.75;color:#1F3A2B}
.alx-en{margin:0;font-size:.76rem;line-height:1.65;color:#5A6F62}
.alx-bn + .alx-en{margin-top:.15rem;padding-left:.6rem;border-left:2px solid #DDE8E0}
.alx-dialog-foot{display:flex;flex:none;align-items:center;justify-content:space-between;gap:.75rem;
  padding:.7rem 1.15rem;background:#fff;border-top:1px solid var(--alx-line)}
.alx-hint{font-size:.7rem;color:#6B8073}

/* ---------- Motion ---------- */
@keyframes alx-shine{0%,55%{left:-70%}100%{left:140%}}
@keyframes alx-bob{0%,100%{transform:translateY(-1px)}50%{transform:translateY(1.5px)}}
@keyframes alx-pulse{0%{box-shadow:0 0 0 0 rgba(31,184,104,.45)}70%,100%{box-shadow:0 0 0 7px rgba(31,184,104,0)}}
@keyframes alx-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes alx-pop{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes alx-fade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){
  .alx-pill,.alx-toast,.alx-overlay,.alx-dialog,.alx-status,.alx-btn-primary .alx-ico svg{animation:none}
  .alx-btn-primary::after{display:none}
  .alx-btn,.alx-close,.alx-seg button{transition:none}
}

/* ---------- Small screens & print ---------- */
@media (max-width:480px){
  .alx-pill{right:.5rem;bottom:3.25rem}
  .alx-overlay{padding:.5rem}
  .alx-hint{display:none}
  .alx-dialog-foot{justify-content:flex-end}
}
@media print{.alx-pill,.alx-toast,.alx-overlay{display:none!important}}
`;

export default function OfflineSetup() {
  const [notice, setNotice] =
    useState<OfflineNotice | null>(null);

  const [attempt, setAttempt] = useState(0);
  const [canInstall, setCanInstall] = useState(false);
  const [installingApp, setInstallingApp] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pillHidden, setPillHidden] = useState(false);
  const [offlineState, setOfflineState] =
    useState<OfflineReadiness>("unknown");
  const [guideLanguage, setGuideLanguage] =
    useState<GuideLanguage>("both");

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

  /* Escape closes the guide; Tab / Shift+Tab stay inside the dialog. */
  const handleGuideKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeGuide();
        return;
      }

      if (event.key !== "Tab") return;

      const root = guideRef.current;
      if (!root) return;

      const items = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (items.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeGuide]
  );

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
          setOfflineState("partial");

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

        setOfflineState("ready");

        publish({
          key: `cache-ok:${status.release}`,
          kind: "info",
          title: "Main page cache Found",
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
            title: "New Version Available",
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

  /* Install is pointless inside an already-installed app window. */
  const showInstallButton = canInstall && !isStandalone;

  const showPill =
    mounted && !notice && !isStandalone && !pillHidden;

  const showBengali = guideLanguage !== "en";
  const showEnglish = guideLanguage !== "bn";

  const readinessLabel =
    offlineState === "ready"
      ? "Offline ready"
      : "Offline files are still being prepared";

  return (
    <>
      <style>{OFFLINE_UI_CSS}</style>

      {notice && (
        <aside
          aria-label="ALIMXL offline status"
          data-kind={notice.kind}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              dismiss();
            }
          }}
          className="alx-toast"
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
            className="alx-toast-body"
          >
            <span className="alx-toast-icon">
              <NoticeIcon kind={notice.kind} />
            </span>

            <div>
              <h2 className="alx-toast-title">
                {notice.title}
              </h2>

              <p className="alx-toast-text">{notice.text}</p>
            </div>
          </div>

          {notice.key === "update-waiting" && (
            <button
              type="button"
              onClick={() => {
                navigator.serviceWorker.addEventListener(
                  "controllerchange",
                  () => window.location.reload(),
                  { once: true }
                );
                void navigator.serviceWorker
                  .getRegistration()
                  .then((reg) =>
                    reg?.waiting?.postMessage({
                      type: "ALIMXL_SKIP_WAITING",
                    })
                  );
              }}
              className="alx-btn alx-btn-primary"
            >
              Update Now
            </button>
          )}

          <div className="alx-toast-actions">
            {showInstallButton && (
              <button
                type="button"
                disabled={installingApp}
                onClick={() => {
                  void handleInstallClick();
                }}
                className="alx-btn alx-btn-primary"
              >
                <span className="alx-ico">
                  <DownloadIcon size={14} />
                </span>
                {installingApp ? "Installing…" : "Install App"}
              </button>
            )}

            <button
              type="button"
              onClick={openGuide}
              className="alx-btn alx-btn-ghost"
            >
              <span className="alx-ico">
                <BookIcon size={14} />
              </span>
              Offline Guide
            </button>

            <button
              type="button"
              onClick={() => {
                dismissedKeyRef.current = null;
                setNotice(null);
                setAttempt((value) => value + 1);
              }}
              className="alx-btn alx-btn-quiet"
            >
              Re-check
            </button>

            <button
              type="button"
              onClick={dismiss}
              className="alx-btn alx-btn-quiet"
            >
              Dismiss
            </button>
          </div>
        </aside>
      )}

      {showPill && (
        <div
          role="group"
          aria-label="ALIMXL install and offline help"
          className="alx-pill"
        >
          {offlineState !== "unknown" && (
            <span
              role="img"
              aria-label={readinessLabel}
              title={readinessLabel}
              data-state={offlineState}
              className="alx-status"
            />
          )}

          {showInstallButton && (
            <button
              type="button"
              disabled={installingApp}
              onClick={() => {
                void handleInstallClick();
              }}
              title="Install ALIMXL as an app for offline use"
              className="alx-btn alx-btn-primary"
            >
              <span className="alx-ico">
                <DownloadIcon size={15} />
              </span>
              {installingApp ? "Installing…" : "Install App"}
            </button>
          )}

          <button
            type="button"
            onClick={openGuide}
            title="Step-by-step install and offline guide"
            className="alx-btn alx-btn-ghost"
          >
            <span className="alx-ico">
              <BookIcon size={15} />
            </span>
            Offline Guide
          </button>

          <button
            type="button"
            aria-label="Hide these buttons / এই বোতামগুলো লুকান"
            title="Hide"
            onClick={() => setPillHidden(true)}
            className="alx-close"
          >
            <CloseIcon size={13} />
          </button>
        </div>
      )}

      {guideOpen && (
        <div
          className="alx-overlay"
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
            onKeyDown={handleGuideKeyDown}
            className="alx-dialog"
          >
            <header className="alx-dialog-head">
              <div className="alx-dialog-head-row">
                <span className="alx-badge-ico">
                  <DownloadIcon size={20} />
                </span>

                <div className="alx-dialog-titles">
                  <h2
                    id="alimxl-offline-guide-title"
                    className="alx-dialog-title"
                  >
                    {"ALIMXL Install & Offline Guide"}
                  </h2>

                  <p className="alx-dialog-sub">
                    ইনস্টল ও অফলাইন ব্যবহারের গাইড
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close guide / গাইড বন্ধ করুন"
                  title="Close"
                  onClick={closeGuide}
                  className="alx-close alx-close-light"
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              <div className="alx-dialog-tools">
                <span className="alx-tools-label">
                  Language / ভাষা
                </span>

                <div
                  className="alx-seg"
                  role="group"
                  aria-label="Guide language / গাইডের ভাষা"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={guideLanguage === option.id}
                      onClick={() => setGuideLanguage(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            <div className="alx-dialog-body">
              <p className="alx-intro">
                {showBengali && (
                  <span lang="bn">
                    একবার ইনস্টল করলে ইন্টারনেট ছাড়াই স্প্রেডশিটের কাজ করা যায়।
                    নিচের ধাপগুলো অনুসরণ করুন।
                  </span>
                )}
                {showEnglish && (
                  <span lang="en">
                    Once installed, you can work on spreadsheets without an
                    internet connection. Follow the steps below.
                  </span>
                )}
              </p>

              {isStandalone && (
                <p className="alx-note-ok">
                  {showBengali && (
                    <span lang="bn">
                      আপনি এখন ইনস্টল করা অ্যাপেই আছেন।
                    </span>
                  )}
                  {showBengali && showEnglish && " · "}
                  {showEnglish && (
                    <span lang="en">
                      You are already using the installed app.
                    </span>
                  )}
                </p>
              )}

              {showInstallButton && (
                <button
                  type="button"
                  disabled={installingApp}
                  onClick={() => {
                    void handleInstallClick();
                  }}
                  className="alx-btn alx-btn-primary alx-btn-block alx-cta"
                >
                  <span className="alx-ico">
                    <DownloadIcon size={16} />
                  </span>
                  {installingApp ? "Installing…" : "Install App Now"}
                </button>
              )}

              {GUIDE_SECTIONS.map((section) => (
                <section
                  key={section.title.en}
                  className={
                    section.tone === "warning"
                      ? "alx-card alx-card-warn"
                      : "alx-card"
                  }
                >
                  <h3 className="alx-card-title">
                    <span className="alx-card-ico">
                      <GuideSectionIcon icon={section.icon} />
                    </span>

                    <span>
                      {showEnglish ? section.title.en : section.title.bn}
                      {showEnglish && showBengali && (
                        <small lang="bn">{section.title.bn}</small>
                      )}
                    </span>
                  </h3>

                  <ol className="alx-steps">
                    {section.steps.map((step) => (
                      <li key={step.en}>
                        {showBengali && (
                          <p lang="bn" className="alx-bn">
                            {step.bn}
                          </p>
                        )}
                        {showEnglish && (
                          <p lang="en" className="alx-en">
                            {step.en}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>

            <footer className="alx-dialog-foot">
              <span className="alx-hint">
                Press Esc to close · বন্ধ করতে Esc চাপুন
              </span>

              <button
                type="button"
                onClick={closeGuide}
                className="alx-btn alx-btn-ghost"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}