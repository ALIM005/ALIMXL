/**
 * ALIMXL public product and company configuration.
 *
 * This module:
 * - Contains public branding information only.
 * - Can be imported from Server or Client Components.
 * - Does not access browser storage.
 * - Does not make network requests.
 * - Does not enable authentication, billing or cloud sync.
 *
 * Never store passwords, API keys, access tokens,
 * payment credentials or private customer information here.
 */

export interface CompanyService {
  readonly id: string;
  readonly title: string;
}

export interface ProductBrand {
  readonly name: string;
  readonly version: string;
  readonly edition: string;
  readonly tagline: string;
  readonly description: string;
  readonly attribution: string;
}

export interface CompanyBrand {
  readonly name: string;
  readonly website: string;
  readonly contactName: string;
  readonly email: string;
  readonly address: string;
  readonly description: string;
  readonly services: readonly CompanyService[];
}

export interface BrandAssets {
  readonly productLogo: string;
  readonly favicon: string;
  readonly productLogoAlt: string;
}

export interface BrandLinks {
  readonly companyWebsite: string;
  readonly companyEmail: string;
}

export interface WelcomeContent {
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;

  readonly primaryButton: string;
  readonly websiteButton: string;
  readonly emailButton: string;

  readonly localDataNotice: string;
  readonly offlineNotice: string;
  readonly externalLinkNotice: string;
  readonly emailNotice: string;

  readonly storageUnavailableNotice: string;
  readonly noAccountNotice: string;
}

export interface AppBrand {
  readonly product: ProductBrand;
  readonly company: CompanyBrand;
  readonly assets: BrandAssets;
  readonly links: BrandLinks;
  readonly welcome: WelcomeContent;
}

/**
 * Current public edition information.
 *
 * Keep the application release version aligned with package.json
 * during your release process.
 *
 * It is separate from:
 * - The settings schema version.
 * - The welcome schema version.
 * - The service worker cache release.
 */
const PRODUCT_NAME = "ALIMXL";

const PRODUCT_VERSION = "4.0.0";

const COMPANY_NAME =
  "Smart Family IT Solutions World";

const COMPANY_WEBSITE =
  "https://smartfamilyitsolutionsworld.com";

const COMPANY_EMAIL =
  "alim@smartfamilyitsolutionsworld.com";

/**
 * Root-based application routes.
 *
 * These match the current project structure.
 * A future deployment under a subpath requires a separate
 * routing/basePath review.
 */
export const APP_ROUTES = {
  home: "/",
  settings: "/settings",
  photoStudio: "/photo-studio",
} as const;

/**
 * Public product and company information.
 *
 * `as const` preserves literal values and readonly TypeScript
 * inference. `satisfies` checks the declared configuration shape.
 *
 * This is a compile-time contract, not a security boundary.
 */
export const APP_BRAND = {
  product: {
    name: PRODUCT_NAME,

    version: PRODUCT_VERSION,

    edition: "Free Local Edition",

    tagline:
      "Your spreadsheet and creative workspace.",

    description:
      "Create workbooks, explore templates and edit images.",

    attribution:
      `A software product by ${COMPANY_NAME}.`,
  },

  company: {
    name: COMPANY_NAME,

    website: COMPANY_WEBSITE,

    contactName: "H M ALIM UDDIN",

    email: COMPANY_EMAIL,

    address:
      "Burdeo, Companyganj-3140, Sylhet",

    description:
      "Web and e-commerce development, ERP and business software, " +
      "digital marketing and SEO, design, branding and IT consultancy.",

    services: [
      {
        id: "web-development",
        title: "Web & E-Commerce Development",
      },
      {
        id: "business-software",
        title: "ERP & Business Software",
      },
      {
        id: "digital-marketing",
        title: "Digital Marketing & SEO",
      },
      {
        id: "design-and-it",
        title: "Design, Branding & IT",
      },
    ],
  },

  assets: {
    productLogo: "/icons/icon-512.png",

    favicon: "/favicon.ico",

    productLogoAlt: "ALIMXL logo",
  },

  links: {
    companyWebsite: COMPANY_WEBSITE,

    companyEmail: `mailto:${COMPANY_EMAIL}`,
  },

  welcome: {
    title: "Welcome to ALIMXL",

    subtitle:
      "Your spreadsheet and creative workspace.",

    description:
      "Create workbooks, explore ready-made templates and edit images. " +
      "No account is required to get started.",

    primaryButton: "Start using ALIMXL",

    websiteButton: "Visit company website",

    emailButton: "Email the company",

    localDataNotice:
      "Use local save to keep your work on this device. " +
      "Export backups regularly to keep a separate copy. " +
      "Saving locally is not the same as keeping an independent backup.",

    offlineNotice:
      "Offline availability depends on whether the required app files " +
      "have been prepared on this device. " +
      "Opening this welcome screen alone does not confirm offline readiness.",

    externalLinkNotice:
      "Opening the company website requires an internet connection.",

    emailNotice:
      "Email opens your configured email application. " +
      "Sending a message requires an internet connection.",

    storageUnavailableNotice:
      "This browser could not remember your welcome preference. " +
      "You can still continue, but this screen may appear again.",

    noAccountNotice:
      "No registration or online account is required for the free local edition.",
  },
} as const satisfies AppBrand;

/**
 * Welcome completion is stored separately from application
 * settings and user documents.
 *
 * Keep this key stable during routine product updates.
 * Do not rename it merely because PRODUCT_VERSION changes.
 */
export const WELCOME_STORAGE_KEY =
  "alimxl:onboarding:v1";

/**
 * Version of the welcome-completion record format.
 *
 * Increment only when its storage format changes.
 * A migration decision must accompany a schema change.
 */
export const WELCOME_SCHEMA_VERSION = 1 as const;

/**
 * Same-document event for reopening the Welcome screen.
 *
 * The upcoming WelcomeGate component will subscribe to this.
 * Defining this constant alone does not register a listener.
 *
 * Event detail must not contain sensitive information.
 */
export const WELCOME_REOPEN_EVENT =
  "alimxl:welcome:reopen";