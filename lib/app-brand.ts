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

    primaryButton: "Enter Workspace",

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

/** Reading translations for the welcome screen only. English remains the default.
 * This does not change workspace settings, routes, storage keys, or document data.
 */
export type WelcomeLanguage = "en" | "bn" | "ar";

interface WelcomeReadingCopy {
  readonly ui: {
    readonly edition: string;
    readonly version: string;
    readonly tagline: string;
    readonly local: string;
    readonly online: string;
    readonly offline: string;
    readonly opening: string;
    readonly built: string;
    readonly contact: string;
    readonly privacyTitle: string;
    readonly privacy: string;
    readonly newTab: string;
    readonly attribution: string;
    readonly language: string;
    readonly languageHelp: string;
    readonly error: string;
    readonly hint: string;
  };
  readonly welcome: WelcomeContent;
  readonly features: readonly { readonly title: string; readonly description: string }[];
  readonly services: readonly string[];
  readonly companyDescription: string;
}

export const WELCOME_TRANSLATIONS = {
  "en": {
    "ui": {
      "edition": "Free Local Edition",
      "version": "Version",
      "tagline": "Your ideas. Your workspace.",
      "local": "Local workspace",
      "online": "Network connection detected",
      "offline": "Browser reports offline",
      "opening": "Opening workspace…",
      "built": "Built by",
      "contact": "Company contact",
      "privacyTitle": "No account required",
      "privacy": "This welcome screen does not create an online account or upload your documents. Company links open only when you choose to use them.",
      "newTab": "opens in a new tab",
      "attribution": "A software product by Smart Family IT Solutions World.",
      "language": "Translate",
      "languageHelp": "Reading language for this page. English is the default.",
      "error": "ALIMXL could not continue. Please try again.",
      "hint": "Create a workbook, open a file, or explore templates."
    },
    "welcome": {
      "title": "Welcome to ALIMXL",
      "subtitle": "Your spreadsheet. Your creative workspace.",
      "description": "Create workbooks, explore ready-made templates, and edit images — all from your workspace.",
      "primaryButton": "Enter Workspace",
      "websiteButton": "Visit company website",
      "emailButton": "Email the company",
      "localDataNotice": "Save locally to keep your work on this device. Export backups regularly; a local save is not an independent backup.",
      "offlineNotice": "Offline use requires the necessary app files to be prepared on this device. This welcome page alone does not confirm offline readiness.",
      "externalLinkNotice": "The company website requires an internet connection.",
      "emailNotice": "Opens your email application. Sending email requires an internet connection.",
      "storageUnavailableNotice": "This browser could not remember your welcome preference. You can still continue, but this screen may appear again.",
      "noAccountNotice": "No registration or online account required for the free local edition."
    },
    "features": [
      {
        "title": "Workbooks",
        "description": "Create and edit spreadsheets for your everyday work."
      },
      {
        "title": "Ready-made templates",
        "description": "Start with a template instead of an empty sheet."
      },
      {
        "title": "Photo Studio",
        "description": "Edit images and export your finished work."
      }
    ],
    "services": [
      "Web & E-Commerce Development",
      "ERP & Business Software",
      "Digital Marketing & SEO",
      "Design, Branding & IT"
    ],
    "companyDescription": "Web and e-commerce development, ERP and business software, digital marketing, design and IT consultancy."
  },
  "bn": {
    "ui": {
      "edition": "বিনামূল্যের লোকাল সংস্করণ",
      "version": "সংস্করণ",
      "tagline": "আপনার ভাবনা। আপনার কর্মক্ষেত্র।",
      "local": "লোকাল কর্মক্ষেত্র",
      "online": "নেটওয়ার্ক সংযোগ শনাক্ত হয়েছে",
      "offline": "ব্রাউজার অফলাইন দেখাচ্ছে",
      "opening": "কর্মক্ষেত্র খোলা হচ্ছে…",
      "built": "নির্মাতা",
      "contact": "প্রতিষ্ঠানের যোগাযোগ",
      "privacyTitle": "অ্যাকাউন্টের প্রয়োজন নেই",
      "privacy": "এই স্বাগত পৃষ্ঠা অনলাইন অ্যাকাউন্ট তৈরি করে না বা আপনার নথি আপলোড করে না। আপনি চাইলে তবেই প্রতিষ্ঠানের লিংক খুলবে।",
      "newTab": "নতুন ট্যাবে খুলবে",
      "attribution": "Smart Family IT Solutions World-এর একটি সফটওয়্যার।",
      "language": "অনুবাদ",
      "languageHelp": "এই পৃষ্ঠা পড়ার ভাষা। ইংরেজি ডিফল্ট ভাষা।",
      "error": "ALIMXL এগিয়ে যেতে পারেনি। আবার চেষ্টা করুন।",
      "hint": "ওয়ার্কবুক তৈরি করুন, ফাইল খুলুন অথবা টেমপ্লেট দেখুন।"
    },
    "welcome": {
      "title": "ALIMXL-এ স্বাগতম",
      "subtitle": "আপনার স্প্রেডশিট। আপনার সৃজনশীল কর্মক্ষেত্র।",
      "description": "একই কর্মক্ষেত্র থেকে ওয়ার্কবুক তৈরি করুন, প্রস্তুত টেমপ্লেট দেখুন এবং ছবি সম্পাদনা করুন।",
      "primaryButton": "কর্মক্ষেত্রে প্রবেশ করুন",
      "websiteButton": "প্রতিষ্ঠানের ওয়েবসাইট দেখুন",
      "emailButton": "প্রতিষ্ঠানকে ইমেইল করুন",
      "localDataNotice": "এই ডিভাইসে কাজ রাখতে লোকাল সেভ ব্যবহার করুন। নিয়মিত ব্যাকআপ এক্সপোর্ট করুন; লোকাল সেভ আলাদা ব্যাকআপ নয়।",
      "offlineNotice": "অফলাইনে ব্যবহার করতে এই ডিভাইসে প্রয়োজনীয় অ্যাপ ফাইল প্রস্তুত থাকতে হবে। শুধু এই স্বাগত পৃষ্ঠা খোলা অফলাইন প্রস্তুতির প্রমাণ নয়।",
      "externalLinkNotice": "প্রতিষ্ঠানের ওয়েবসাইট খুলতে ইন্টারনেট সংযোগ প্রয়োজন।",
      "emailNotice": "আপনার ইমেইল অ্যাপ খুলবে। ইমেইল পাঠাতে ইন্টারনেট সংযোগ প্রয়োজন।",
      "storageUnavailableNotice": "এই ব্রাউজার আপনার স্বাগত পৃষ্ঠার পছন্দ মনে রাখতে পারেনি। আপনি এগোতে পারবেন, তবে পৃষ্ঠাটি আবার দেখা যেতে পারে।",
      "noAccountNotice": "বিনামূল্যের লোকাল সংস্করণে নিবন্ধন বা অনলাইন অ্যাকাউন্ট লাগে না।"
    },
    "features": [
      {
        "title": "ওয়ার্কবুক",
        "description": "দৈনন্দিন কাজের স্প্রেডশিট তৈরি ও সম্পাদনা করুন।"
      },
      {
        "title": "প্রস্তুত টেমপ্লেট",
        "description": "খালি শিটের বদলে টেমপ্লেট দিয়ে শুরু করুন।"
      },
      {
        "title": "ফটো স্টুডিও",
        "description": "ছবি সম্পাদনা করে আপনার কাজ এক্সপোর্ট করুন।"
      }
    ],
    "services": [
      "ওয়েব ও ই-কমার্স ডেভেলপমেন্ট",
      "ইআরপি ও ব্যবসায়িক সফটওয়্যার",
      "ডিজিটাল মার্কেটিং ও এসইও",
      "ডিজাইন, ব্র্যান্ডিং ও আইটি"
    ],
    "companyDescription": "ওয়েব ও ই-কমার্স ডেভেলপমেন্ট, ইআরপি ও ব্যবসায়িক সফটওয়্যার, ডিজিটাল মার্কেটিং, ডিজাইন এবং আইটি পরামর্শ।"
  },
  "ar": {
    "ui": {
      "edition": "الإصدار المحلي المجاني",
      "version": "الإصدار",
      "tagline": "أفكارك. مساحة عملك.",
      "local": "مساحة عمل محلية",
      "online": "تم اكتشاف اتصال بالشبكة",
      "offline": "يشير المتصفح إلى عدم الاتصال",
      "opening": "جارٍ فتح مساحة العمل…",
      "built": "تطوير",
      "contact": "التواصل مع الشركة",
      "privacyTitle": "لا يلزم إنشاء حساب",
      "privacy": "لا تنشئ شاشة الترحيب هذه حسابًا عبر الإنترنت ولا ترفع مستنداتك. لا تُفتح روابط الشركة إلا عندما تختار استخدامها.",
      "newTab": "يفتح في علامة تبويب جديدة",
      "attribution": "منتج برمجي من Smart Family IT Solutions World.",
      "language": "ترجمة",
      "languageHelp": "لغة قراءة هذه الصفحة. الإنجليزية هي اللغة الافتراضية.",
      "error": "تعذر على ALIMXL المتابعة. يرجى المحاولة مرة أخرى.",
      "hint": "أنشئ مصنفًا، أو افتح ملفًا، أو استكشف القوالب."
    },
    "welcome": {
      "title": "مرحبًا بك في ALIMXL",
      "subtitle": "جداول بياناتك. مساحة إبداعك.",
      "description": "أنشئ المصنفات، واستكشف القوالب الجاهزة، وحرّر الصور من مساحة عمل واحدة.",
      "primaryButton": "الدخول إلى مساحة العمل",
      "websiteButton": "زيارة موقع الشركة",
      "emailButton": "مراسلة الشركة",
      "localDataNotice": "احفظ محليًا للاحتفاظ بعملك على هذا الجهاز. صدّر نسخًا احتياطية بانتظام؛ فالحفظ المحلي ليس نسخة احتياطية مستقلة.",
      "offlineNotice": "يتطلب الاستخدام دون اتصال تجهيز ملفات التطبيق اللازمة على هذا الجهاز. فتح صفحة الترحيب وحدها لا يؤكد الجاهزية للعمل دون اتصال.",
      "externalLinkNotice": "يتطلب موقع الشركة اتصالًا بالإنترنت.",
      "emailNotice": "يفتح تطبيق البريد الإلكتروني لديك. يتطلب إرسال الرسالة اتصالًا بالإنترنت.",
      "storageUnavailableNotice": "تعذر على هذا المتصفح تذكر تفضيل شاشة الترحيب. يمكنك المتابعة، ولكن قد تظهر هذه الشاشة مجددًا.",
      "noAccountNotice": "لا يتطلب الإصدار المحلي المجاني تسجيلًا أو حسابًا عبر الإنترنت."
    },
    "features": [
      {
        "title": "المصنفات",
        "description": "أنشئ جداول البيانات وحرّرها لأعمالك اليومية."
      },
      {
        "title": "قوالب جاهزة",
        "description": "ابدأ بقالب بدلًا من ورقة فارغة."
      },
      {
        "title": "استوديو الصور",
        "description": "حرّر الصور وصدّر عملك النهائي."
      }
    ],
    "services": [
      "تطوير الويب والتجارة الإلكترونية",
      "أنظمة ERP وبرمجيات الأعمال",
      "التسويق الرقمي وتحسين محركات البحث",
      "التصميم والهوية البصرية وتقنية المعلومات"
    ],
    "companyDescription": "تطوير الويب والتجارة الإلكترونية، وأنظمة ERP وبرمجيات الأعمال، والتسويق الرقمي، والتصميم والاستشارات التقنية."
  }
} as const satisfies Record<WelcomeLanguage, WelcomeReadingCopy>;
