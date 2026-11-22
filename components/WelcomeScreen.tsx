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
  Languages,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";


import {
  APP_BRAND,
  WELCOME_TRANSLATIONS,
  type WelcomeLanguage,
} from "../lib/app-brand";
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


const FEATURE_ICONS = [FileSpreadsheet, FolderOpen, ImageIcon] as const;


const FOCUS_CLASS =
  "focus-visible:outline-2 " +
  "focus-visible:outline-offset-4 " +
  "focus-visible:outline-(--ax-accent)";


function ProductLogo() {
  const [failed, setFailed] = useState(false);


  return (
    <span className="welcome-logo flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D4AF37]/50 bg-[#061744] shadow-lg sm:h-20 sm:w-20">
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
  const { resolvedTheme, effectiveReducedMotion } = useAppSettings();


  // Reading language is deliberately not persisted: each new mount starts in English.
  const [language, setLanguage] = useState<WelcomeLanguage>("en");
  const copy = WELCOME_TRANSLATIONS[language];
  const rtl = language === "ar";
  const languageId = useId();
  const headingId = useId();
  const descriptionId = useId();
  const noticeId = useId();


  const headingRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(false);
  const continuingRef = useRef(false);


  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState("");


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


    headingRef.current?.focus({
      preventScroll: true,
    });


    return () => {
      mountedRef.current = false;
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
      lang={language}
      dir={rtl ? "rtl" : "ltr"}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      aria-busy={working}
      style={themeStyle}
      className="ax-settings-surface welcome-premium fixed inset-0 z-200 overflow-y-auto overscroll-contain bg-(--welcome-bg) font-sans text-(--welcome-text) print:hidden"
    >
      <style>{`
        .welcome-premium .welcome-primary {
          background: linear-gradient(135deg, #087f48, #075e38);
          color: #fff !important;
          border: 1px solid rgba(212,175,55,.65);
          box-shadow: 0 8px 22px rgba(6,95,56,.2), inset 0 1px 0 rgba(255,255,255,.16);
        }
        .welcome-premium .welcome-primary:enabled:hover {
          filter: brightness(1.08);
          box-shadow: 0 10px 26px rgba(6,95,56,.28);
        }
        .welcome-premium[dir="rtl"] { font-family: Tahoma, Arial, sans-serif; }
        .welcome-premium[dir="rtl"] .welcome-forward { transform: rotate(180deg); }
        .welcome-premium .welcome-heading:focus:not(:focus-visible) { outline: none; }
        .welcome-premium .welcome-heading:focus-visible { outline: 2px solid #a58a32; outline-offset: 6px; }

        .welcome-premium .welcome-shell {
          box-sizing: border-box;
          width: 100%;
          min-height: 100%;
          min-height: 100dvh;
          padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
        }
        .welcome-premium .welcome-grid,
        .welcome-premium .welcome-product-panel,
        .welcome-premium .welcome-aside,
        .welcome-premium .welcome-feature {
          min-width: 0;
        }
        .welcome-premium .welcome-contact a {
          overflow-wrap: anywhere;
        }

        @media (min-width: 1024px) {
          .welcome-premium .welcome-shell {
            max-width: 1536px;
            padding-top: 12px;
            padding-inline: 24px;
          }
          .welcome-premium .welcome-main {
            padding-block: 12px;
          }
          .welcome-premium .welcome-grid {
            gap: 16px;
          }
          .welcome-premium .welcome-product-panel {
            padding: 24px;
          }
          .welcome-premium .welcome-aside {
            gap: 12px;
          }
          .welcome-premium .welcome-company {
            padding: 20px;
          }
          .welcome-premium .welcome-contact,
          .welcome-premium .welcome-privacy {
            padding: 16px;
          }
          .welcome-premium .welcome-tagline {
            margin-top: 18px;
          }
          .welcome-premium .welcome-heading {
            margin-top: 14px;
          }
          .welcome-premium .welcome-actions,
          .welcome-premium .welcome-features {
            margin-top: 18px;
          }
          .welcome-premium .welcome-notices {
            margin-top: 18px;
            padding-top: 14px;
          }
          .welcome-premium .welcome-footer {
            padding-top: 8px;
          }
        }

        @media (min-width: 1024px) and (max-height: 850px) {
          .welcome-premium .welcome-shell {
            padding-top: 8px;
            padding-inline: 20px;
          }
          .welcome-premium .welcome-main {
            padding-block: 8px;
          }
          .welcome-premium .welcome-grid,
          .welcome-premium .welcome-aside {
            gap: 10px;
          }
          .welcome-premium .welcome-product-panel {
            padding: 18px;
          }
          .welcome-premium .welcome-logo {
            width: 56px;
            height: 56px;
          }
          .welcome-premium .welcome-tagline {
            margin-top: 12px;
            padding-block: 6px;
          }
          .welcome-premium .welcome-heading {
            margin-top: 10px;
            font-size: clamp(2rem, 3vw, 3rem);
          }
          .welcome-premium .welcome-subtitle,
          .welcome-premium .welcome-description {
            margin-top: 10px;
          }
          .welcome-premium .welcome-description {
            line-height: 1.6;
          }
          .welcome-premium .welcome-actions,
          .welcome-premium .welcome-features {
            margin-top: 12px;
          }
          .welcome-premium .welcome-actions {
            gap: 4px;
          }
          .welcome-premium .welcome-primary {
            min-height: 48px;
            padding-block: 10px;
          }
          .welcome-premium .welcome-feature {
            padding: 10px;
          }
          .welcome-premium .welcome-feature h2 {
            margin-top: 6px;
          }
          .welcome-premium .welcome-feature p {
            margin-top: 4px;
          }
          .welcome-premium .welcome-notices {
            margin-top: 12px;
            padding-top: 10px;
          }
          .welcome-premium .welcome-notices > :not(:last-child) {
            margin-bottom: 6px;
          }
          .welcome-premium .welcome-actions p,
          .welcome-premium .welcome-feature p,
          .welcome-premium .welcome-notices p {
            line-height: 1.5;
          }
          .welcome-premium .welcome-company {
            padding: 16px;
          }
          .welcome-premium .welcome-company-icon {
            width: 36px;
            height: 36px;
          }
          .welcome-premium .welcome-built {
            margin-top: 8px;
          }
          .welcome-premium .welcome-company-title {
            margin-top: 6px;
            line-height: 1.35;
          }
          .welcome-premium .welcome-company-description {
            margin-top: 8px;
            line-height: 1.5;
          }
          .welcome-premium .welcome-services {
            margin-top: 8px;
            gap: 3px;
          }
          .welcome-premium .welcome-services li {
            line-height: 1.5;
          }
          .welcome-premium .welcome-website {
            margin-top: 10px;
            padding-block: 10px;
          }
          .welcome-premium .welcome-contact,
          .welcome-premium .welcome-privacy {
            padding: 12px 16px;
          }
          .welcome-premium .welcome-contact-name,
          .welcome-premium .welcome-contact-row {
            margin-top: 8px;
          }
          .welcome-premium .welcome-contact p,
          .welcome-premium .welcome-contact a,
          .welcome-premium .welcome-privacy p,
          .welcome-premium .welcome-external-notice {
            line-height: 1.5;
          }
          .welcome-premium .welcome-external-notice,
          .welcome-premium .welcome-email-notice {
            margin-top: 8px;
          }
        }

        @media (min-width: 1024px) and (max-height: 700px) {
          .welcome-premium .welcome-product-panel {
            padding: 14px;
          }
          .welcome-premium .welcome-logo {
            width: 48px;
            height: 48px;
          }
          .welcome-premium .welcome-heading {
            font-size: 2rem;
          }
          .welcome-premium .welcome-tagline,
          .welcome-premium .welcome-actions,
          .welcome-premium .welcome-features,
          .welcome-premium .welcome-notices {
            margin-top: 8px;
          }
          .welcome-premium .welcome-company-icon {
            width: 30px;
            height: 30px;
          }
        }

        @media (max-width: 639px) {
          .welcome-premium .welcome-shell {
            padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>


      <div className="welcome-shell mx-auto flex min-h-full max-w-7xl flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-(--ax-accent)"
            />


            <span className="text-xs font-bold uppercase tracking-[0.18em]">
              {APP_BRAND.product.name}
            </span>


            <span className="text-xs text-(--welcome-muted)">
              {copy.ui.edition}
            </span>
          </div>


          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={languageId}
              title={copy.ui.languageHelp}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-(--welcome-border) bg-(--welcome-panel) px-3 text-xs font-semibold shadow-sm"
            >
              <Languages size={15} aria-hidden="true" />


              <span>{copy.ui.language}</span>


              <select
                id={languageId}
                value={language}
                aria-label="Reading language / পড়ার ভাষা / لغة القراءة"
                onChange={(event) => {
                  const next = event.target.value;


                  if (next === "en" || next === "bn" || next === "ar") {
                    setLanguage(next);
                  }
                }}
                className={`min-h-10 max-w-28 rounded-lg bg-(--welcome-panel) px-1 text-(--welcome-text) ${FOCUS_CLASS}`}
              >
                <option value="en" lang="en">
                  English
                </option>
                <option value="bn" lang="bn">
                  বাংলা
                </option>
                <option value="ar" lang="ar">
                  العربية
                </option>
              </select>
            </label>
          </div>
        </header>


        <div className="welcome-main flex flex-1 items-center py-5 sm:py-7">
          <div className="welcome-grid grid w-full gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.85fr)]">
            <div className="welcome-product-panel relative overflow-hidden rounded-3xl border border-(--welcome-border) bg-(--welcome-panel) p-5 shadow-[0_18px_60px_rgba(12,50,30,0.06)] sm:p-7 lg:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-42 border-[#D4AF37]/10"
              />


              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 right-10 h-64 w-64 rounded-full border-32 opacity-5"
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


                    <p className="mt-1 text-xs leading-5 text-(--welcome-muted)">
                      {copy.ui.version} {APP_BRAND.product.version}
                    </p>
                  </div>
                </div>


                <p className="welcome-tagline mt-7 inline-flex items-center gap-2 rounded-full bg-(--welcome-soft) px-3 py-2 text-xs font-semibold text-(--welcome-gold)">
                  <Sparkles size={15} aria-hidden="true" />
                  {copy.ui.tagline}
                </p>


                <h1
                  ref={headingRef}
                  id={headingId}
                  tabIndex={-1}
                  className="welcome-heading mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
                >
                  {copy.welcome.title}
                </h1>


                <p className="welcome-subtitle mt-4 max-w-xl text-lg font-medium leading-7 text-(--welcome-muted)">
                  {copy.welcome.subtitle}
                </p>


                <p
                  id={descriptionId}
                  className="welcome-description mt-4 max-w-xl text-sm leading-7 text-(--welcome-muted)"
                >
                  {copy.welcome.description}
                </p>


                <div className="welcome-actions mt-6 flex flex-col items-start gap-2">
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => {
                      void handleContinue();
                    }}
                    aria-describedby={noticeId}
                    className={`welcome-primary inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-7 py-4 text-base font-bold transition-[filter,box-shadow] motion-reduce:transition-none disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-64 ${FOCUS_CLASS}`}
                  >
                    {working ? (
                      <>
                        <Loader2
                          size={18}
                          aria-hidden="true"
                          className={
                            effectiveReducedMotion ? "" : "animate-spin"
                          }
                        />
                        {copy.ui.opening}
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={20} aria-hidden="true" />
                        {copy.welcome.primaryButton}
                        <ArrowRight
                          className="welcome-forward"
                          size={18}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </button>


                  <p className="text-xs leading-6 text-(--welcome-muted)">
                    {copy.ui.hint}
                  </p>


                  <p className="inline-flex items-center gap-2 text-xs leading-6 text-(--welcome-muted)">
                    <Check
                      size={16}
                      className="shrink-0 text-(--ax-accent)"
                      aria-hidden="true"
                    />
                    {copy.welcome.noAccountNotice}
                  </p>
                </div>


                <div className="welcome-features mt-6 grid gap-3 sm:grid-cols-3">
                  {copy.features.map((feature, index) => {
                    const Icon = FEATURE_ICONS[index];


                    return (
                      <article
                        key={feature.title}
                        className="welcome-feature rounded-2xl border border-(--welcome-border) bg-(--welcome-soft) p-3.5"
                      >
                        <Icon
                          size={23}
                          strokeWidth={1.7}
                          className="text-(--ax-accent)"
                          aria-hidden="true"
                        />


                        <h2 className="mt-3 text-sm font-bold">
                          {feature.title}
                        </h2>


                        <p className="mt-2 text-xs leading-6 text-(--welcome-muted)">
                          {feature.description}
                        </p>
                      </article>
                    );
                  })}
                </div>


                {storageWarning && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-6"
                  >
                    {storageWarning === APP_BRAND.welcome.storageUnavailableNotice
                      ? copy.welcome.storageUnavailableNotice
                      : storageWarning}
                  </div>
                )}


                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm leading-6"
                  >
                    {error === "ALIMXL could not continue. Please try again."
                      ? copy.ui.error
                      : error}
                  </div>
                )}


                <div
                  id={noticeId}
                  className="welcome-notices mt-6 space-y-3 border-t border-(--welcome-border) pt-5"
                >
                  <div className="flex items-start gap-3">
                    <HardDrive
                      size={18}
                      className="mt-1 shrink-0 text-(--ax-accent)"
                      aria-hidden="true"
                    />


                    <p className="text-xs leading-6 text-(--welcome-muted)">
                      {copy.welcome.localDataNotice}
                    </p>
                  </div>


                  <div className="flex items-start gap-3">
                    <Info
                      size={18}
                      className="mt-1 shrink-0 text-(--welcome-gold)"
                      aria-hidden="true"
                    />


                    <p className="text-xs leading-6 text-(--welcome-muted)">
                      {copy.welcome.offlineNotice}
                    </p>
                  </div>
                </div>
              </div>
            </div>


            <aside className="welcome-aside flex flex-col gap-5">
              <section className="welcome-company relative overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-linear-to-br from-[#092755] via-[#0C1C43] to-[#07142E] p-5 text-white shadow-sm sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-28 border-[#D4AF37]/10"
                />


                <div className="relative">
                  <span className="welcome-company-icon inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-white/5 text-[#F5D572]">
                    <Building2
                      size={24}
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  </span>


                  <p className="welcome-built mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0D485]">
                    {copy.ui.built}
                  </p>


                  <h2 className="welcome-company-title mt-3 text-xl font-bold leading-8">
                    {APP_BRAND.company.name}
                  </h2>


                  <p className="welcome-company-description mt-4 text-sm leading-7 text-slate-300">
                    {copy.companyDescription}
                  </p>


                  <ul className="welcome-services mt-4 grid gap-2">
                    {APP_BRAND.company.services.map((service, index) => (
                      <li
                        key={service.id}
                        className="flex items-start gap-2 text-xs leading-6 text-slate-200"
                      >
                        <Check
                          size={15}
                          className="mt-1 shrink-0 text-[#F5D572]"
                          aria-hidden="true"
                        />


                        <span>{copy.services[index] ?? service.title}</span>
                      </li>
                    ))}
                  </ul>


                  <a
                    href={APP_BRAND.links.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${copy.welcome.websiteButton} — ${copy.ui.newTab}`}
                    className="welcome-website mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F5D572]/50 bg-white/5 px-4 py-3 text-sm font-semibold text-[#F5D572] transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5D572]"
                  >
                    {copy.welcome.websiteButton}


                    <ExternalLink size={16} aria-hidden="true" />
                  </a>


                  <p className="welcome-external-notice mt-3 text-[11px] leading-6 text-slate-300">
                    {copy.welcome.externalLinkNotice}
                  </p>
                </div>
              </section>


              <section className="welcome-contact rounded-3xl border border-(--welcome-border) bg-(--welcome-panel) p-5">
                <h2 className="text-sm font-bold">{copy.ui.contact}</h2>


                <p className="welcome-contact-name mt-3 text-sm font-semibold">
                  {APP_BRAND.company.contactName}
                </p>


                <div className="welcome-contact-row mt-4 flex items-start gap-3">
                  <MapPin
                    size={17}
                    className="mt-1 shrink-0 text-(--ax-accent)"
                    aria-hidden="true"
                  />


                  <p className="text-xs leading-6 text-(--welcome-muted)">
                    {APP_BRAND.company.address}
                  </p>
                </div>


                <div className="welcome-contact-row mt-4 flex items-start gap-3">
                  <Mail
                    size={17}
                    className="mt-1 shrink-0 text-(--ax-accent)"
                    aria-hidden="true"
                  />


                  <a
                    href={APP_BRAND.links.companyEmail}
                    aria-label={`${copy.welcome.emailButton}: ${APP_BRAND.company.email}`}
                    className={`min-w-0 wrap-break-word rounded text-xs leading-6 underline-offset-4 hover:underline ${FOCUS_CLASS}`}
                  >
                    <bdi dir="ltr">{APP_BRAND.company.email}</bdi>
                  </a>
                </div>


                <p className="welcome-email-notice mt-3 text-[11px] leading-6 text-(--welcome-muted)">
                  {copy.welcome.emailNotice}
                </p>
              </section>


              <section className="welcome-privacy rounded-2xl border border-(--welcome-border) bg-(--welcome-soft) p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-1 shrink-0 text-(--ax-accent)"
                    aria-hidden="true"
                  />


                  <div>
                    <h2 className="text-xs font-bold">
                      {copy.ui.privacyTitle}
                    </h2>


                    <p className="mt-2 text-xs leading-6 text-(--welcome-muted)">
                      {copy.ui.privacy}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>


        <footer className="welcome-footer flex flex-wrap items-center justify-between gap-3 border-t border-(--welcome-border) pt-4 text-[11px] leading-6 text-(--welcome-muted)">
          <span>{copy.ui.attribution}</span>


          <span>
            {copy.ui.edition} · {APP_BRAND.product.version}
          </span>
        </footer>
      </div>
    </section>
  );
}