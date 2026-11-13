"use client";

import Image from "next/image";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  ArrowRight,
  Building2,
  Check,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Info,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";

import { APP_BRAND } from "../lib/app-brand";
import { useAppSettings } from "./SettingsProvider";

interface WelcomeScreenProps {
  /**
   * The gate decides whether to persist completion.
   *
   * The callback may:
   * - Complete immediately.
   * - Return a promise.
   * - Throw/reject to keep the welcome screen open.
   */
  onContinue: () => void | Promise<void>;

  /**
   * Optional busy state controlled by the parent.
   */
  busy?: boolean;

  /**
   * Non-fatal storage information supplied by the gate.
   */
  storageWarning?: string;
}

interface WelcomeThemeStyle extends CSSProperties {
  "--welcome-bg": string;
  "--welcome-panel": string;
  "--welcome-soft": string;
  "--welcome-text": string;
  "--welcome-muted": string;
  "--welcome-border": string;
  "--welcome-gold": string;
}

const FEATURES = [
  {
    title: "Workbooks",
    description:
      "Create and edit spreadsheets for your everyday work.",
    icon: FileSpreadsheet,
  },
  {
    title: "Ready-made templates",
    description:
      "Start with a template instead of an empty sheet.",
    icon: FolderOpen,
  },
  {
    title: "Photo Studio",
    description:
      "Edit images and export your finished work.",
    icon: ImageIcon,
  },
] as const;

const FOCUS_CLASS =
  "focus-visible:outline-2 " +
  "focus-visible:outline-offset-4 " +
  "focus-visible:outline-[var(--ax-accent)]";

function ProductLogo() {
  const [failed, setFailed] = useState(false);

  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D4AF37]/50 bg-[#061744] shadow-lg sm:h-20 sm:w-20">
      {failed ? (
        <span
          aria-label={APP_BRAND.product.name}
          className="text-2xl font-black tracking-tight text-[#F5D572]"
        >
          AX
        </span>
      ) : (
        <Image
          src={APP_BRAND.assets.productLogo}
          alt={APP_BRAND.assets.productLogoAlt}
          width={80}
          height={80}
          unoptimized
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export default function WelcomeScreen({
  onContinue,
  busy = false,
  storageWarning,
}: WelcomeScreenProps) {
  const {
    resolvedTheme,
    effectiveReducedMotion,
  } = useAppSettings();

  const headingId = useId();
  const descriptionId = useId();
  const noticeId = useId();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(false);
  const continuingRef = useRef(false);

  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] =
    useState<boolean | null>(null);

  const dark = resolvedTheme === "dark";
  const working = busy || continuing;

  const themeStyle: WelcomeThemeStyle = {
    "--welcome-bg": dark ? "#071321" : "#F4F8F5",
    "--welcome-panel": dark ? "#102134" : "#FFFFFF",
    "--welcome-soft": dark ? "#152B3E" : "#EFF6F1",
    "--welcome-text": dark ? "#EDF5F0" : "#183D2B",
    "--welcome-muted": dark ? "#B1C1B8" : "#60766A",
    "--welcome-border": dark ? "#2A4052" : "#DCE8DF",
    "--welcome-gold": dark ? "#F0D485" : "#8B6817",
    colorScheme: dark ? "dark" : "light",
  };

  useEffect(() => {
    mountedRef.current = true;

    const updateConnectivity = (): void => {
      setOnline(navigator.onLine);
    };

    updateConnectivity();

    window.addEventListener(
      "online",
      updateConnectivity
    );

    window.addEventListener(
      "offline",
      updateConnectivity
    );

    headingRef.current?.focus({
      preventScroll: true,
    });

    return () => {
      mountedRef.current = false;

      window.removeEventListener(
        "online",
        updateConnectivity
      );

      window.removeEventListener(
        "offline",
        updateConnectivity
      );
    };
  }, []);

  async function handleContinue(): Promise<void> {
    if (busy || continuingRef.current) return;

    continuingRef.current = true;

    setContinuing(true);
    setError("");

    try {
      await onContinue();
    } catch (caught) {
      if (!mountedRef.current) return;

      setError(
        caught instanceof Error
          ? caught.message
          : "ALIMXL could not continue. Please try again."
      );
    } finally {
      continuingRef.current = false;

      if (mountedRef.current) {
        setContinuing(false);
      }
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      aria-busy={working}
      style={themeStyle}
      className="ax-settings-surface fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-[var(--welcome-bg)] font-sans text-[var(--welcome-text)] print:hidden"
    >
      <div className="mx-auto flex min-h-full max-w-7xl flex-col px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[var(--ax-accent)]"
            />

            <span className="text-xs font-bold uppercase tracking-[0.18em]">
              {APP_BRAND.product.name}
            </span>

            <span className="text-xs text-[var(--welcome-muted)]">
              {APP_BRAND.product.edition}
            </span>
          </div>

          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--welcome-border)] bg-[var(--welcome-panel)] px-3 py-2 text-[11px] text-[var(--welcome-muted)]">
            {online === null ? (
              <>
                <Info size={14} aria-hidden="true" />
                Local workspace
              </>
            ) : online ? (
              <>
                <Wifi size={14} aria-hidden="true" />
                Network connection detected
              </>
            ) : (
              <>
                <WifiOff size={14} aria-hidden="true" />
                Browser reports offline
              </>
            )}
          </p>
        </header>

        <div className="flex flex-1 items-center py-6 sm:py-9">
          <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
            <div className="relative overflow-hidden rounded-3xl border border-[var(--welcome-border)] bg-[var(--welcome-panel)] p-5 shadow-sm sm:p-8 lg:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[42px] border-[#D4AF37]/10"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 right-10 h-64 w-64 rounded-full border-[32px] opacity-[0.05]"
                style={{
                  borderColor: "var(--ax-accent)",
                }}
              />

              <div className="relative">
                <div className="flex items-center gap-4">
                  <ProductLogo />

                  <div className="min-w-0">
                    <p className="text-xl font-black tracking-[0.08em] sm:text-2xl">
                      {APP_BRAND.product.name}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--welcome-muted)]">
                      Version {APP_BRAND.product.version}
                    </p>
                  </div>
                </div>

                <p className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--welcome-soft)] px-3 py-2 text-xs font-semibold text-[var(--welcome-gold)]">
                  <Sparkles
                    size={15}
                    aria-hidden="true"
                  />
                  Your ideas. Your workspace.
                </p>

                <h1
                  ref={headingRef}
                  id={headingId}
                  tabIndex={-1}
                  className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight outline-none sm:text-4xl lg:text-5xl"
                >
                  {APP_BRAND.welcome.title}
                </h1>

                <p className="mt-4 max-w-xl text-lg font-medium leading-7 text-[var(--welcome-muted)]">
                  {APP_BRAND.welcome.subtitle}
                </p>

                <p
                  id={descriptionId}
                  className="mt-4 max-w-xl text-sm leading-7 text-[var(--welcome-muted)]"
                >
                  {APP_BRAND.welcome.description}
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {FEATURES.map((feature) => {
                    const Icon = feature.icon;

                    return (
                      <article
                        key={feature.title}
                        className="rounded-2xl border border-[var(--welcome-border)] bg-[var(--welcome-soft)] p-4"
                      >
                        <Icon
                          size={23}
                          strokeWidth={1.7}
                          className="text-[var(--ax-accent)]"
                          aria-hidden="true"
                        />

                        <h2 className="mt-3 text-sm font-bold">
                          {feature.title}
                        </h2>

                        <p className="mt-2 text-xs leading-6 text-[var(--welcome-muted)]">
                          {feature.description}
                        </p>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-7 flex flex-col items-start gap-4">
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => {
                      void handleContinue();
                    }}
                    aria-describedby={noticeId}
                    className={`inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[var(--ax-accent)] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60 sm:w-auto ${FOCUS_CLASS}`}
                  >
                    {working ? (
                      <>
                        <Loader2
                          size={18}
                          aria-hidden="true"
                          className={
                            effectiveReducedMotion
                              ? ""
                              : "animate-spin"
                          }
                        />
                        Opening workspace…
                      </>
                    ) : (
                      <>
                        {APP_BRAND.welcome.primaryButton}
                        <ArrowRight
                          size={18}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </button>

                  <p className="inline-flex items-center gap-2 text-xs leading-6 text-[var(--welcome-muted)]">
                    <Check
                      size={16}
                      className="shrink-0 text-[var(--ax-accent)]"
                      aria-hidden="true"
                    />
                    {APP_BRAND.welcome.noAccountNotice}
                  </p>
                </div>

                {storageWarning && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-6"
                  >
                    {storageWarning}
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm leading-6"
                  >
                    {error}
                  </div>
                )}

                <div
                  id={noticeId}
                  className="mt-7 space-y-4 border-t border-[var(--welcome-border)] pt-5"
                >
                  <div className="flex items-start gap-3">
                    <HardDrive
                      size={18}
                      className="mt-1 shrink-0 text-[var(--ax-accent)]"
                      aria-hidden="true"
                    />

                    <p className="text-xs leading-6 text-[var(--welcome-muted)]">
                      {APP_BRAND.welcome.localDataNotice}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Info
                      size={18}
                      className="mt-1 shrink-0 text-[var(--welcome-gold)]"
                      aria-hidden="true"
                    />

                    <p className="text-xs leading-6 text-[var(--welcome-muted)]">
                      {APP_BRAND.welcome.offlineNotice}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="flex flex-col gap-5">
              <section className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#092755] via-[#0C1C43] to-[#07142E] p-6 text-white shadow-sm sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-[#D4AF37]/10"
                />

                <div className="relative">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-white/5 text-[#F5D572]">
                    <Building2
                      size={24}
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  </span>

                  <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0D485]">
                    Built by
                  </p>

                  <h2 className="mt-3 text-2xl font-bold leading-9">
                    {APP_BRAND.company.name}
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    {APP_BRAND.company.description}
                  </p>

                  <ul className="mt-5 space-y-3">
                    {APP_BRAND.company.services.map(
                      (service) => (
                        <li
                          key={service.id}
                          className="flex items-start gap-2 text-xs leading-6 text-slate-200"
                        >
                          <Check
                            size={15}
                            className="mt-1 shrink-0 text-[#F5D572]"
                            aria-hidden="true"
                          />

                          <span>{service.title}</span>
                        </li>
                      )
                    )}
                  </ul>

                  <a
                    href={APP_BRAND.links.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${APP_BRAND.welcome.websiteButton} — opens in a new tab`}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5D572] px-4 py-3 text-sm font-bold text-[#142344] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5D572]"
                  >
                    {APP_BRAND.welcome.websiteButton}

                    <ExternalLink
                      size={16}
                      aria-hidden="true"
                    />
                  </a>

                  <p className="mt-3 text-[11px] leading-6 text-slate-300">
                    {APP_BRAND.welcome.externalLinkNotice}
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-[var(--welcome-border)] bg-[var(--welcome-panel)] p-6">
                <h2 className="text-sm font-bold">
                  Company contact
                </h2>

                <p className="mt-3 text-sm font-semibold">
                  {APP_BRAND.company.contactName}
                </p>

                <div className="mt-4 flex items-start gap-3">
                  <MapPin
                    size={17}
                    className="mt-1 shrink-0 text-[var(--ax-accent)]"
                    aria-hidden="true"
                  />

                  <p className="text-xs leading-6 text-[var(--welcome-muted)]">
                    {APP_BRAND.company.address}
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <Mail
                    size={17}
                    className="mt-1 shrink-0 text-[var(--ax-accent)]"
                    aria-hidden="true"
                  />

                  <a
                    href={APP_BRAND.links.companyEmail}
                    aria-label={`${APP_BRAND.welcome.emailButton}: ${APP_BRAND.company.email}`}
                    className={`min-w-0 break-words rounded text-xs leading-6 underline-offset-4 hover:underline ${FOCUS_CLASS}`}
                  >
                    {APP_BRAND.company.email}
                  </a>
                </div>

                <p className="mt-3 text-[11px] leading-6 text-[var(--welcome-muted)]">
                  {APP_BRAND.welcome.emailNotice}
                </p>
              </section>

              <section className="rounded-2xl border border-[var(--welcome-border)] bg-[var(--welcome-soft)] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-1 shrink-0 text-[var(--ax-accent)]"
                    aria-hidden="true"
                  />

                  <div>
                    <h2 className="text-xs font-bold">
                      No account required
                    </h2>

                    <p className="mt-2 text-xs leading-6 text-[var(--welcome-muted)]">
                      This welcome screen does not create an
                      online account or upload your documents.
                      Company links open only when you choose
                      to use them.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--welcome-border)] pt-4 text-[11px] leading-6 text-[var(--welcome-muted)]">
          <span>{APP_BRAND.product.attribution}</span>

          <span>
            {APP_BRAND.product.edition} ·{" "}
            {APP_BRAND.product.version}
          </span>
        </footer>
      </div>
    </section>
  );
}