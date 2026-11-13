"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, FlaskConical, LogOut, ScrollText, UserRound } from "lucide-react";
import { useAppSettings } from "./SettingsProvider";

type SessionUser = { id: string; email: string; name: string };
type ThemeChoice = "system" | "dark" | "light";

interface AccountMenuProps {
  /** Name shown on the button while signed out / loading. */
  fallbackName?: string;
  disabled?: boolean;
  /** Builds the round avatar. Receives the name to use for the fallback letter. */
  renderAvatar: (name: string) => ReactNode;
}

const THEMES: ReadonlyArray<{ value: ThemeChoice; label: string }> = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export default function AccountMenu({
  fallbackName = "User",
  disabled = false,
  renderAvatar,
}: AccountMenuProps) {
  const router = useRouter();
  const { settings, save } = useAppSettings();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [timeZone, setTimeZone] = useState("");

  const wrapRef = useRef<HTMLDivElement>(null);

  // Who is signed in? (reads the signed session cookie through /api/auth/me)
  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((data: { user?: SessionUser | null }) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    } catch {
      setTimeZone("");
    }
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const chooseTheme = useCallback(
    (theme: ThemeChoice) => {
      setNotice("");
      try {
        save({ ...settings, theme });
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Theme সংরক্ষণ করা যায়নি।");
      }
    },
    [save, settings],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      setUser(null);
      setOpen(false);
      router.refresh();
    }
  }, [router]);

  const displayName = user?.name || fallbackName;

  // Signed out: the button simply opens the login page.
  if (loaded && !user) {
    return (
      <button
        type="button"
        className="axh-profile"
        title="Login / Create account"
        aria-label="Login or create account"
        disabled={disabled}
        onClick={() => router.push("/login")}
      >
        {renderAvatar(fallbackName)}
        <span className="axh-profile-name">Login</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="acm-wrap" ref={wrapRef}>
      <button
        type="button"
        className="axh-profile"
        title={user ? `${user.name} (${user.email})` : "Account"}
        aria-label={`Open account menu — ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled || !loaded}
        onClick={() => setOpen((value) => !value)}
      >
        {renderAvatar(displayName)}
        <span className="axh-profile-name">{displayName}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && user && (
        <div className="acm-menu" role="menu" aria-label="Account menu">
          <div className="acm-head">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>

          <button
            type="button"
            role="menuitem"
            className="acm-item"
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
          >
            <UserRound size={16} /> Account
          </button>
          <button
            type="button"
            role="menuitem"
            className="acm-item"
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
          >
            <FlaskConical size={16} /> Settings
          </button>
          <button
            type="button"
            role="menuitem"
            className="acm-item"
            onClick={() => {
              setOpen(false);
              router.push("/");
            }}
          >
            <ScrollText size={16} /> My workspace
          </button>

          <div className="acm-sep" />

          <div className="acm-label">Theme</div>
          {THEMES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="menuitemradio"
              aria-checked={settings.theme === item.value}
              className="acm-item acm-radio"
              onClick={() => chooseTheme(item.value)}
            >
              <span className="acm-dot" data-on={settings.theme === item.value} />
              {item.label}
            </button>
          ))}
          {notice && <p className="acm-notice">{notice}</p>}

          <div className="acm-sep" />

          <div className="acm-zone">
            <span>Timezone</span>
            <strong>Auto ({timeZone || "browser"})</strong>
          </div>

          <div className="acm-sep" />

          <button type="button" role="menuitem" className="acm-item" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}

      <style>{`
        .acm-wrap { position: relative; display: flex; align-items: center; }
        .acm-menu {
          position: absolute; top: calc(100% + 8px); right: 0; z-index: 60;
          width: 290px; max-height: min(80vh, 560px); overflow: auto;
          padding: 8px 0; border-radius: 12px;
          background: var(--ax-panel, #ffffff); color: var(--ax-text, #1f2933);
          border: 1px solid var(--ax-border, #d9dee5);
          box-shadow: 0 18px 50px rgba(15, 23, 42, .28); text-align: left; font-size: 14px;
        }
        .acm-head { display: flex; flex-direction: column; gap: 2px; padding: 8px 16px 12px; border-bottom: 1px solid var(--ax-border, #e5e8ec); }
        .acm-head strong { font-size: 15px; }
        .acm-head span { color: var(--ax-muted, #5f6b7a); font-size: 13px; overflow-wrap: anywhere; }
        .acm-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 9px 16px; border: 0; background: none; color: inherit;
          font: inherit; text-align: left; cursor: pointer;
        }
        .acm-item:hover, .acm-item:focus-visible { background: rgba(8, 115, 71, .1); outline: none; }
        .acm-radio { padding-left: 20px; }
        .acm-dot { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid transparent; }
        .acm-dot[data-on="true"] { background: currentColor; }
        .acm-sep { height: 1px; margin: 6px 0; background: var(--ax-border, #e5e8ec); }
        .acm-label { padding: 4px 16px; color: var(--ax-muted, #5f6b7a); font-size: 13px; }
        .acm-zone { display: flex; flex-direction: column; gap: 2px; padding: 6px 16px; }
        .acm-zone span { color: var(--ax-muted, #5f6b7a); font-size: 13px; }
        .acm-notice { margin: 4px 16px; color: #b42318; font-size: 12px; }
      `}</style>
    </div>
  );
}