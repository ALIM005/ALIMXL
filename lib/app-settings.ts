/**
 * ALIMXL shared application preferences.
 *
 * This module contains no browser APIs and can be imported
 * from both server-side and client-side code.
 *
 * Preferences must not contain passwords, access tokens,
 * API keys, payment details or document contents.
 */

export type AppTheme = "light" | "dark" | "system";

export type AppAccent = "green" | "blue" | "violet";

export type AppDensity = "comfortable" | "compact";

export type AppLocale = "bn-BD" | "en-US" | "en-GB";

export type AppCurrency = "BDT" | "USD" | "EUR" | "GBP" | "INR";

export type PhotoExportFormat = "png" | "jpeg" | "webp";

export interface AppSettings {
  theme: AppTheme;
  accent: AppAccent;
  density: AppDensity;
  reducedMotion: boolean;

  locale: AppLocale;
  currency: AppCurrency;

  workbookName: string;
  fontSize: number;
  gridlines: boolean;

  photoFormat: PhotoExportFormat;
  photoQuality: number;
  photoWidth: number;
}

export interface SettingsBackup {
  app: typeof SETTINGS_APP_ID;
  version: typeof SETTINGS_SCHEMA_VERSION;
  exportedAt: string;
  settings: AppSettings;
}

export const SETTINGS_APP_ID = "ALIMXL_SETTINGS" as const;

export const SETTINGS_SCHEMA_VERSION = 1 as const;

export const SETTINGS_KEY = "alimxl:preferences:v1";

export const MAX_SETTINGS_BACKUP_BYTES = 100 * 1024;

export const SETTINGS_LIMITS = Object.freeze({
  workbookNameLength: 100,

  fontSizeMin: 8,
  fontSizeMax: 36,

  photoQualityMin: 10,
  photoQualityMax: 100,

  photoWidthMin: 64,
  photoWidthMax: 8192,
});

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  theme: "system",
  accent: "green",
  density: "comfortable",
  reducedMotion: false,

  locale: "bn-BD",
  currency: "BDT",

  workbookName: "Untitled Workbook",
  fontSize: 12,
  gridlines: true,

  photoFormat: "png",
  photoQuality: 92,
  photoWidth: 1600,
});

export const ACCENT_COLORS: Readonly<Record<AppAccent, string>> =
  Object.freeze({
    green: "#0B8A4A",
    blue: "#1D4ED8",
    violet: "#6D3FD1",
  });

export type SettingsErrorCode =
  | "INVALID_DOCUMENT"
  | "INVALID_FIELD"
  | "INVALID_JSON"
  | "BACKUP_TOO_LARGE"
  | "UNSUPPORTED_APP"
  | "UNSUPPORTED_VERSION"
  | "INVALID_TIMESTAMP";

export class SettingsValidationError extends Error {
  readonly code: SettingsErrorCode;

  readonly field?: string;

  constructor(
    code: SettingsErrorCode,
    message: string,
    field?: string
  ) {
    super(message);

    this.name = "SettingsValidationError";
    this.code = code;
    this.field = field;
  }
}

const THEMES: readonly AppTheme[] = [
  "light",
  "dark",
  "system",
];

const ACCENTS: readonly AppAccent[] = [
  "green",
  "blue",
  "violet",
];

const DENSITIES: readonly AppDensity[] = [
  "comfortable",
  "compact",
];

const LOCALES: readonly AppLocale[] = [
  "bn-BD",
  "en-US",
  "en-GB",
];

const CURRENCIES: readonly AppCurrency[] = [
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "INR",
];

const PHOTO_FORMATS: readonly PhotoExportFormat[] = [
  "png",
  "jpeg",
  "webp",
];

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * Returns a new defaults object.
 * Callers can modify the result without changing shared defaults.
 */
export function createDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
  };
}

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
  record: Record<string, unknown>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readField(
  record: Record<string, unknown>,
  key: keyof AppSettings
): unknown {
  if (!hasOwn(record, key)) {
    throw new SettingsValidationError(
      "INVALID_FIELD",
      `Missing required setting: ${key}.`,
      key
    );
  }

  return record[key];
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: keyof AppSettings
): T {
  if (
    typeof value !== "string" ||
    !allowed.some((option) => option === value)
  ) {
    throw new SettingsValidationError(
      "INVALID_FIELD",
      `${field} must be one of: ${allowed.join(", ")}.`,
      field
    );
  }

  return value as T;
}

function readBoolean(
  value: unknown,
  field: keyof AppSettings
): boolean {
  if (typeof value !== "boolean") {
    throw new SettingsValidationError(
      "INVALID_FIELD",
      `${field} must be true or false.`,
      field
    );
  }

  return value;
}

function readInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  field: keyof AppSettings
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new SettingsValidationError(
      "INVALID_FIELD",
      `${field} must be a whole number from ${minimum} to ${maximum}.`,
      field
    );
  }

  return value;
}

function readWorkbookName(value: unknown): string {
  if (typeof value !== "string") {
    throw new SettingsValidationError(
      "INVALID_FIELD",
      "Workbook name must be text.",
      "workbookName"
    );
  }

  if (CONTROL_CHARACTERS.test(value)) {
    throw new SettingsValidationError(
      "INVALID_FIELD",
      "Workbook name cannot contain control characters or line breaks.",
      "workbookName"
    );
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed.length > SETTINGS_LIMITS.workbookNameLength
  ) {
    throw new SettingsValidationError(
      "INVALID_FIELD",
      `Workbook name must contain 1–${SETTINGS_LIMITS.workbookNameLength} characters.`,
      "workbookName"
    );
  }

  return trimmed;
}

/**
 * Validates a complete settings object.
 *
 * Unknown properties are intentionally not copied.
 * Required properties are never silently replaced with defaults.
 * Numeric strings and truthy/falsy values are not coerced.
 */
export function validateSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    throw new SettingsValidationError(
      "INVALID_DOCUMENT",
      "Settings must be a JSON object."
    );
  }

  return {
    theme: readEnum(
      readField(value, "theme"),
      THEMES,
      "theme"
    ),

    accent: readEnum(
      readField(value, "accent"),
      ACCENTS,
      "accent"
    ),

    density: readEnum(
      readField(value, "density"),
      DENSITIES,
      "density"
    ),

    reducedMotion: readBoolean(
      readField(value, "reducedMotion"),
      "reducedMotion"
    ),

    locale: readEnum(
      readField(value, "locale"),
      LOCALES,
      "locale"
    ),

    currency: readEnum(
      readField(value, "currency"),
      CURRENCIES,
      "currency"
    ),

    workbookName: readWorkbookName(
      readField(value, "workbookName")
    ),

    fontSize: readInteger(
      readField(value, "fontSize"),
      SETTINGS_LIMITS.fontSizeMin,
      SETTINGS_LIMITS.fontSizeMax,
      "fontSize"
    ),

    gridlines: readBoolean(
      readField(value, "gridlines"),
      "gridlines"
    ),

    photoFormat: readEnum(
      readField(value, "photoFormat"),
      PHOTO_FORMATS,
      "photoFormat"
    ),

    photoQuality: readInteger(
      readField(value, "photoQuality"),
      SETTINGS_LIMITS.photoQualityMin,
      SETTINGS_LIMITS.photoQualityMax,
      "photoQuality"
    ),

    photoWidth: readInteger(
      readField(value, "photoWidth"),
      SETTINGS_LIMITS.photoWidthMin,
      SETTINGS_LIMITS.photoWidthMax,
      "photoWidth"
    ),
  };
}

/**
 * Compares all supported settings fields.
 */
export function areSettingsEqual(
  first: Readonly<AppSettings>,
  second: Readonly<AppSettings>
): boolean {
  return (
    first.theme === second.theme &&
    first.accent === second.accent &&
    first.density === second.density &&
    first.reducedMotion === second.reducedMotion &&
    first.locale === second.locale &&
    first.currency === second.currency &&
    first.workbookName === second.workbookName &&
    first.fontSize === second.fontSize &&
    first.gridlines === second.gridlines &&
    first.photoFormat === second.photoFormat &&
    first.photoQuality === second.photoQuality &&
    first.photoWidth === second.photoWidth
  );
}

function assertBackupSize(text: string): void {
  /*
   * UTF-8 byte length is never smaller than the number
   * of JavaScript UTF-16 code units for valid JSON text.
   */
  if (text.length > MAX_SETTINGS_BACKUP_BYTES) {
    throw new SettingsValidationError(
      "BACKUP_TOO_LARGE",
      "Settings backup must not exceed 100 KB."
    );
  }

  const bytes = new TextEncoder().encode(text).byteLength;

  if (bytes > MAX_SETTINGS_BACKUP_BYTES) {
    throw new SettingsValidationError(
      "BACKUP_TOO_LARGE",
      "Settings backup must not exceed 100 KB."
    );
  }
}

function isValidExportTimestamp(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false;
  }

  const timestamp = Date.parse(value);

  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}

/**
 * Reads an ALIMXL settings backup or stored preferences envelope.
 *
 * The same envelope format is used by browser persistence
 * and downloadable backups.
 */
export function parseSettingsBackup(text: string): AppSettings {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new SettingsValidationError(
      "INVALID_DOCUMENT",
      "Settings backup is empty."
    );
  }

  assertBackupSize(text);

  const normalized = text.charCodeAt(0) === 0xfeff
    ? text.slice(1)
    : text;

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new SettingsValidationError(
      "INVALID_JSON",
      "Settings backup is not valid JSON."
    );
  }

  if (!isRecord(parsed)) {
    throw new SettingsValidationError(
      "INVALID_DOCUMENT",
      "Settings backup must contain a JSON object."
    );
  }

  if (
    !hasOwn(parsed, "app") ||
    parsed.app !== SETTINGS_APP_ID
  ) {
    throw new SettingsValidationError(
      "UNSUPPORTED_APP",
      "This file is not an ALIMXL settings backup."
    );
  }

  if (
    !hasOwn(parsed, "version") ||
    parsed.version !== SETTINGS_SCHEMA_VERSION
  ) {
    throw new SettingsValidationError(
      "UNSUPPORTED_VERSION",
      "This settings backup version is not supported."
    );
  }

  if (
    !hasOwn(parsed, "exportedAt") ||
    !isValidExportTimestamp(parsed.exportedAt)
  ) {
    throw new SettingsValidationError(
      "INVALID_TIMESTAMP",
      "Settings backup contains an invalid export timestamp."
    );
  }

  if (!hasOwn(parsed, "settings")) {
    throw new SettingsValidationError(
      "INVALID_DOCUMENT",
      "Settings backup does not contain preferences."
    );
  }

  return validateSettings(parsed.settings);
}

/**
 * Creates a validated versioned settings backup.
 */
export function serializeSettings(
  settings: Readonly<AppSettings>
): string {
  const backup: SettingsBackup = {
    app: SETTINGS_APP_ID,
    version: SETTINGS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: validateSettings(settings),
  };

  const text = JSON.stringify(backup, null, 2);

  assertBackupSize(text);

  return text;
}