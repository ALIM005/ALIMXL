/*
 * lib/date-time-engine.ts
 *
 * Gregorian civil date/time engine.
 *
 * Civil dates do not represent instants or carry timezones.
 * fromInstant() converts an instant into a selected timezone.
 *
 * Custom patterns use this engine's token syntax, not the
 * complete Microsoft Excel custom-format grammar.
 */

export type DateSystem = "1900" | "1904";
export type InputOrder = "DMY" | "MDY" | "YMD";
export type Digits = "latn" | "beng";
export type OverflowPolicy = "clamp" | "reject";
export type MonthCountPolicy = "dayOfMonth" | "clamp";

export interface CivilDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export type DateParts =
  Pick<CivilDateTime, "year" | "month" | "day"> &
  Partial<
    Pick<
      CivilDateTime,
      "hour" | "minute" | "second" | "millisecond"
    >
  >;

export type DateInput = string | number | DateParts;

export type DateErrorCode =
  | "INVALID_DATE"
  | "INVALID_INPUT"
  | "AMBIGUOUS_DATE"
  | "OUT_OF_RANGE"
  | "INVALID_SERIAL"
  | "EXCEL_LEAP_DAY"
  | "INVALID_FORMAT"
  | "INVALID_OPTIONS"
  | "REVERSED_RANGE"
  | "LIMIT_EXCEEDED";

export class DateEngineError extends Error {
  readonly code: DateErrorCode;

  constructor(code: DateErrorCode, message: string) {
    super(message);
    this.name = "DateEngineError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type Result<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: {
        code: DateErrorCode;
        message: string;
      };
    };

export interface ParseOptions {
  dateSystem?: DateSystem;
  inputOrder?: InputOrder;
}

export type FormatPreset =
  | "short"
  | "long"
  | "iso"
  | "dmy"
  | "mdy"
  | "abbreviated"
  | "weekday"
  | "monthYear"
  | "year"
  | "month"
  | "day"
  | "dateTime"
  | "time"
  | "custom";

export interface FormatOptions extends ParseOptions {
  preset?: FormatPreset;
  locale?: string;
  digits?: Digits;
  hour12?: boolean;
  showSeconds?: boolean;
  pattern?: string;
}

export interface BusinessOptions extends ParseOptions {
  /** Sunday = 0 ... Saturday = 6. */
  weekend?: readonly number[];
  holidays?: readonly DateInput[];
  maxIterations?: number;
}

export interface DifferenceOptions extends ParseOptions {
  /**
   * dayOfMonth:
   * Jan 31 -> Feb 28 is zero completed months.
   *
   * clamp:
   * Jan 31 -> Feb 28 is one completed month.
   */
  monthPolicy?: MonthCountPolicy;
}

export interface DateDifference {
  days: number;
  totalMonths: number;
  totalYears: number;
}

export interface DateAge {
  years: number;
  months: number;
  days: number;
}

export const DATE_ENGINE_VERSION = "1.1.0";

const DAY_MS = 86_400_000;
const MAX_BUSINESS_ITERATIONS = 1_000_000;
const MAX_BATCH_SIZE = 10_000;
const MAX_TEXT_LENGTH = 256;
const MAX_FORMATTER_CACHE = 128;

function fail(
  code: DateErrorCode,
  message: string,
): never {
  throw new DateEngineError(code, message);
}

function integer(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    fail("INVALID_INPUT", `${label} must be a safe integer.`);
  }
  return value;
}

function finite(value: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("INVALID_INPUT", `${label} must be a finite number.`);
  }
  return value;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function requireRecord(
  value: unknown,
  label: string,
): void {
  if (!isRecord(value)) {
    fail(
      "INVALID_INPUT",
      `${label} must be an object.`,
    );
  }
}

function own(object: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function resolveSystem(
  value: DateSystem | undefined,
): DateSystem {
  if (value === undefined) return "1900";

  if (value !== "1900" && value !== "1904") {
    fail("INVALID_OPTIONS", "Unsupported date system.");
  }

  return value;
}

function validateParseOptions(options: ParseOptions): void {
  requireRecord(options, "Options");
  resolveSystem(options.dateSystem);

  if (
    options.inputOrder !== undefined &&
    options.inputOrder !== "DMY" &&
    options.inputOrder !== "MDY" &&
    options.inputOrder !== "YMD"
  ) {
    fail("INVALID_OPTIONS", "Unsupported input order.");
  }
}

export function attempt<T>(
  operation: () => T,
): Result<T> {
  try {
    return { ok: true, value: operation() };
  } catch (error) {
    return {
      ok: false,
      error: {
        code:
          error instanceof DateEngineError
            ? error.code
            : "INVALID_INPUT",
        message:
          error instanceof Error
            ? error.message
            : "Date operation failed.",
      },
    };
  }
}

export function normalizeDigits(text: string): string {
  if (typeof text !== "string") {
    fail("INVALID_INPUT", "Text must be a string.");
  }

  return text
    .replace(/[০-৯]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x09e6),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0),
    );
}

export function isLeapYear(year: number): boolean {
  integer(year, "Year");

  if (year < 1 || year > 9999) {
    fail("OUT_OF_RANGE", "Year must be within 1–9999.");
  }

  return (
    year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0)
  );
}

export function daysInMonth(
  year: number,
  month: number,
): number {
  integer(year, "Year");
  integer(month, "Month");

  if (
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12
  ) {
    fail("OUT_OF_RANGE", "Invalid year or month.");
  }

  if (month === 2) return isLeapYear(year) ? 29 : 28;

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function validateDate(
  input: DateParts,
): CivilDateTime {
  requireRecord(input, "Date parts");

  for (const field of [
    "year",
    "month",
    "day",
  ] as const) {
    if (typeof input[field] !== "number") {
      fail("INVALID_INPUT", `${field} must be a number.`);
    }
  }

  for (const field of [
    "hour",
    "minute",
    "second",
    "millisecond",
  ] as const) {
    if (
      input[field] !== undefined &&
      typeof input[field] !== "number"
    ) {
      fail(
        "INVALID_INPUT",
        `${field} must be a number when provided.`,
      );
    }
  }

  const date: CivilDateTime = {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour === undefined ? 0 : input.hour,
    minute: input.minute === undefined ? 0 : input.minute,
    second: input.second === undefined ? 0 : input.second,
    millisecond:
      input.millisecond === undefined
        ? 0
        : input.millisecond,
  };

  for (const [field, value] of Object.entries(date)) {
    integer(value, field);
  }

  if (
    date.year < 1 ||
    date.year > 9999 ||
    date.month < 1 ||
    date.month > 12
  ) {
    fail("INVALID_DATE", "Invalid year or month.");
  }

  if (
    date.day < 1 ||
    date.day > daysInMonth(date.year, date.month)
  ) {
    fail("INVALID_DATE", "This day does not exist.");
  }

  if (
    date.hour < 0 ||
    date.hour > 23 ||
    date.minute < 0 ||
    date.minute > 59 ||
    date.second < 0 ||
    date.second > 59 ||
    date.millisecond < 0 ||
    date.millisecond > 999
  ) {
    fail("INVALID_DATE", "Invalid time.");
  }

  return date;
}

function toUTC(date: CivilDateTime): Date {
  const result = new Date(0);

  result.setUTCFullYear(
    date.year,
    date.month - 1,
    date.day,
  );

  result.setUTCHours(
    date.hour,
    date.minute,
    date.second,
    date.millisecond,
  );

  return result;
}

function fromUTC(value: Date): CivilDateTime {
  if (!Number.isFinite(value.getTime())) {
    fail("OUT_OF_RANGE", "Date is outside the supported range.");
  }

  return validateDate({
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
    hour: value.getUTCHours(),
    minute: value.getUTCMinutes(),
    second: value.getUTCSeconds(),
    millisecond: value.getUTCMilliseconds(),
  });
}

function midnight(date: CivilDateTime): CivilDateTime {
  return {
    ...date,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  };
}

function dayIndex(date: CivilDateTime): number {
  return toUTC(midnight(date)).getTime() / DAY_MS;
}

function timeMilliseconds(date: CivilDateTime): number {
  return (
    date.hour * 3_600_000 +
    date.minute * 60_000 +
    date.second * 1_000 +
    date.millisecond
  );
}

const MIN_DAY = dayIndex(
  validateDate({ year: 1, month: 1, day: 1 }),
);

const MAX_DAY = dayIndex(
  validateDate({ year: 9999, month: 12, day: 31 }),
);

const EPOCH_1900 = dayIndex(
  validateDate({ year: 1899, month: 12, day: 31 }),
);

const EPOCH_1904 = dayIndex(
  validateDate({ year: 1904, month: 1, day: 1 }),
);

const MARCH_1900 = dayIndex(
  validateDate({ year: 1900, month: 3, day: 1 }),
);

function weekdayFromIndex(index: number): number {
  return ((index + 4) % 7 + 7) % 7;
}

export function toSerial(
  input: DateParts,
  system: DateSystem = "1900",
): number {
  const selected = resolveSystem(system);
  const date = validateDate(input);
  const index = dayIndex(date);

  let whole =
    index -
    (selected === "1900" ? EPOCH_1900 : EPOCH_1904);

  if (selected === "1900" && index >= MARCH_1900) {
    whole += 1;
  }

  if (whole < 0) {
    fail(
      "OUT_OF_RANGE",
      "Date is earlier than the selected serial epoch.",
    );
  }

  return whole + timeMilliseconds(date) / DAY_MS;
}

export function fromSerial(
  serial: number,
  system: DateSystem = "1900",
): CivilDateTime {
  finite(serial, "Serial");

  const selected = resolveSystem(system);

  const maximumDay =
    MAX_DAY -
    (selected === "1900" ? EPOCH_1900 : EPOCH_1904) +
    (selected === "1900" ? 1 : 0);

  if (serial < 0 || serial >= maximumDay + 1) {
    fail("INVALID_SERIAL", "Serial is outside the supported range.");
  }

  const whole = Math.floor(serial);

  if (selected === "1900" && whole === 60) {
    fail(
      "EXCEL_LEAP_DAY",
      "Serial 60 is Excel's fictitious 1900-02-29.",
    );
  }

  /*
   * Round to engine precision, but keep fractional values
   * inside the civil day represented by the integer part.
   */
  const milliseconds = Math.min(
    DAY_MS - 1,
    Math.round((serial - whole) * DAY_MS),
  );

  let index =
    (selected === "1900" ? EPOCH_1900 : EPOCH_1904) +
    whole;

  if (selected === "1900" && whole > 60) index -= 1;

  return fromUTC(
    new Date(index * DAY_MS + milliseconds),
  );
}

function parseTime(
  hour?: string,
  minute?: string,
  second?: string,
  fraction?: string,
): Pick<
  CivilDateTime,
  "hour" | "minute" | "second" | "millisecond"
> {
  return {
    hour: Number(hour ?? 0),
    minute: Number(minute ?? 0),
    second: Number(second ?? 0),
    millisecond: Number(
      (fraction ?? "").padEnd(3, "0") || "0",
    ),
  };
}

/**
 * Accepted text:
 * YYYY-MM-DD
 * YYYY-MM-DD HH:mm[:ss[.SSS]]
 * YYYY-MM-DDTHH:mm[:ss[.SSS]]
 * Numeric separated dates with explicit inputOrder.
 *
 * Numeric strings are not automatically treated as serials.
 * Offset/Z timestamp text is intentionally rejected.
 */
export function parseDate(
  input: DateInput,
  options: ParseOptions = {},
): CivilDateTime {
  validateParseOptions(options);

  if (typeof input === "number") {
    return fromSerial(input, options.dateSystem);
  }

  if (isRecord(input)) {
    return validateDate(input as DateParts);
  }

  if (typeof input !== "string") {
    fail("INVALID_INPUT", "Unsupported date input.");
  }

  if (input.length > MAX_TEXT_LENGTH) {
    fail("LIMIT_EXCEEDED", "Date input is too long.");
  }

  const text = normalizeDigits(input.trim());

  if (!text) fail("INVALID_INPUT", "Date is empty.");

  const iso = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/,
  );

  if (iso) {
    return validateDate({
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
      ...parseTime(iso[4], iso[5], iso[6], iso[7]),
    });
  }

  const local = text.match(
    /^(\d{1,4})([./-])(\d{1,2})\2(\d{1,4})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/,
  );

  if (!local) {
    fail(
      "INVALID_INPUT",
      "Use YYYY-MM-DD or a supported numeric date.",
    );
  }

  const order = options.inputOrder;

  if (order === undefined) {
    fail(
      "AMBIGUOUS_DATE",
      "Select DMY, MDY or YMD for this input.",
    );
  }

  const first = local[1]!;
  const middle = local[3]!;
  const last = local[4]!;

  if ((order === "YMD" ? first : last).length !== 4) {
    fail("INVALID_INPUT", "Use a four-digit year.");
  }

  const year = Number(order === "YMD" ? first : last);

  const month = Number(
    order === "MDY" ? first : middle,
  );

  const day = Number(
    order === "YMD"
      ? last
      : order === "DMY"
        ? first
        : middle,
  );

  return validateDate({
    year,
    month,
    day,
    ...parseTime(local[5], local[6], local[7], local[8]),
  });
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

/** Civil serialization: no timezone or UTC offset is implied. */
export function toISO(input: DateParts): string {
  const date = validateDate(input);

  return (
    `${pad(date.year, 4)}-${pad(date.month)}-${pad(date.day)}` +
    `T${pad(date.hour)}:${pad(date.minute)}:${pad(date.second)}` +
    `.${pad(date.millisecond, 3)}`
  );
}

export function dateKey(input: DateParts): string {
  const date = validateDate(input);

  return (
    `${pad(date.year, 4)}-` +
    `${pad(date.month)}-${pad(date.day)}`
  );
}

const formatterCache = new Map<
  string,
  Intl.DateTimeFormat
>();

function getFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  if (
    typeof locale !== "string" ||
    !locale.trim() ||
    locale.length > 100
  ) {
    fail("INVALID_OPTIONS", "Invalid locale.");
  }

  const key = JSON.stringify([locale, options]);
  const cached = formatterCache.get(key);

  if (cached) {
    formatterCache.delete(key);
    formatterCache.set(key, cached);
    return cached;
  }

  let formatter: Intl.DateTimeFormat;

  try {
    formatter = new Intl.DateTimeFormat(locale, options);
  } catch {
    fail(
      "INVALID_OPTIONS",
      "Invalid locale, timezone or formatting options.",
    );
  }

  if (formatterCache.size >= MAX_FORMATTER_CACHE) {
    const oldest = formatterCache.keys().next().value;

    if (oldest !== undefined) formatterCache.delete(oldest);
  }

  formatterCache.set(key, formatter);
  return formatter;
}

export function clearDateFormatterCache(): void {
  formatterCache.clear();
}

/**
 * Convert an actual instant into Gregorian wall-clock parts.
 * A timezone is always required.
 */
export function fromInstant(
  instant: Date | number,
  timeZone: string,
): CivilDateTime {
  if (
    !(instant instanceof Date) &&
    typeof instant !== "number"
  ) {
    fail("INVALID_INPUT", "Instant must be a Date or epoch milliseconds.");
  }

  if (
    typeof timeZone !== "string" ||
    !timeZone.trim() ||
    timeZone.length > 100
  ) {
    fail("INVALID_OPTIONS", "A valid timezone is required.");
  }

  const value = new Date(
    instant instanceof Date ? instant.getTime() : instant,
  );

  if (!Number.isFinite(value.getTime())) {
    fail("INVALID_INPUT", "Invalid instant.");
  }

  const parts = getFormatter("en-US", {
    timeZone: timeZone.trim(),
    calendar: "gregory",
    numberingSystem: "latn",
    era: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const era = parts.find((part) => part.type === "era");

  if (era?.value !== "AD") {
    fail("OUT_OF_RANGE", "Only Gregorian years 1–9999 are supported.");
  }

  const get = (name: string): number => {
    const part = parts.find((item) => item.type === name);

    if (!part) {
      fail("INVALID_DATE", `Missing date part: ${name}.`);
    }

    return Number(part.value);
  };

  return validateDate({
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    millisecond: value.getUTCMilliseconds(),
  });
}

export function now(
  timeZone: string,
  clock: () => number = Date.now,
): CivilDateTime {
  return fromInstant(clock(), timeZone);
}

export function today(
  timeZone: string,
  clock: () => number = Date.now,
): CivilDateTime {
  return midnight(now(timeZone, clock));
}

function localizeDigits(
  text: string,
  digits: Digits,
): string {
  if (digits === "latn") return text;

  return text.replace(/[0-9]/g, (digit) =>
    String.fromCharCode(0x09e6 + Number(digit)),
  );
}

const CUSTOM_TOKENS = [
  "YYYY",
  "MMMM",
  "dddd",
  "SSS",
  "MMM",
  "ddd",
  "YY",
  "MM",
  "DD",
  "HH",
  "hh",
  "mm",
  "ss",
  "M",
  "D",
  "H",
  "h",
  "m",
  "s",
  "A",
] as const;

type CustomToken = (typeof CUSTOM_TOKENS)[number];

/**
 * Month = MM; minute = mm.
 * Literal text must be placed in [square brackets].
 */
function formatCustom(
  date: CivilDateTime,
  pattern: string,
  locale: string,
  digits: Digits,
): string {
  if (
    typeof pattern !== "string" ||
    !pattern ||
    pattern.length > MAX_TEXT_LENGTH
  ) {
    fail(
      "INVALID_FORMAT",
      "Custom pattern must contain 1–256 characters.",
    );
  }

  const native = toUTC(date);
  const memo = new Map<CustomToken, string>();

  const name = (
    fields: Intl.DateTimeFormatOptions,
  ): string =>
    getFormatter(locale, {
      ...fields,
      timeZone: "UTC",
      calendar: "gregory",
      numberingSystem: digits,
    }).format(native);

  const render = (token: CustomToken): string => {
    const cached = memo.get(token);
    if (cached !== undefined) return cached;

    let result: string;

    switch (token) {
      case "YYYY": result = pad(date.year, 4); break;
      case "YY": result = pad(date.year % 100); break;
      case "MMMM": result = name({ month: "long" }); break;
      case "MMM": result = name({ month: "short" }); break;
      case "MM": result = pad(date.month); break;
      case "M": result = String(date.month); break;
      case "DD": result = pad(date.day); break;
      case "D": result = String(date.day); break;
      case "dddd": result = name({ weekday: "long" }); break;
      case "ddd": result = name({ weekday: "short" }); break;
      case "HH": result = pad(date.hour); break;
      case "H": result = String(date.hour); break;
      case "hh": result = pad(date.hour % 12 || 12); break;
      case "h": result = String(date.hour % 12 || 12); break;
      case "mm": result = pad(date.minute); break;
      case "m": result = String(date.minute); break;
      case "ss": result = pad(date.second); break;
      case "s": result = String(date.second); break;
      case "SSS": result = pad(date.millisecond, 3); break;
      case "A": result = date.hour < 12 ? "AM" : "PM"; break;
    }

    result = localizeDigits(result, digits);
    memo.set(token, result);
    return result;
  };

  let output = "";
  let position = 0;

  while (position < pattern.length) {
    if (pattern[position] === "[") {
      const end = pattern.indexOf("]", position + 1);

      if (end < 0) {
        fail("INVALID_FORMAT", "Unclosed literal bracket.");
      }

      output += pattern.slice(position + 1, end);
      position = end + 1;
      continue;
    }

    const token = CUSTOM_TOKENS.find((item) =>
      pattern.startsWith(item, position),
    );

    if (token) {
      output += render(token);
      position += token.length;
      continue;
    }

    const character = pattern[position]!;

    if (/[A-Za-z\]]/.test(character)) {
      fail(
        "INVALID_FORMAT",
        `Unsupported token near "${pattern.slice(position)}".`,
      );
    }

    output += character;
    position += 1;
  }

  return output;
}

const EXPLICIT_PATTERNS: Partial<
  Record<FormatPreset, string>
> = {
  iso: "YYYY-MM-DD",
  dmy: "DD/MM/YYYY",
  mdy: "MM/DD/YYYY",
  abbreviated: "DD-MMM-YYYY",
  year: "YYYY",
  day: "DD",
};

const FORMAT_FIELDS: Partial<
  Record<FormatPreset, Intl.DateTimeFormatOptions>
> = {
  short: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
  long: {
    year: "numeric",
    month: "long",
    day: "numeric",
  },
  weekday: {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  },
  monthYear: {
    year: "numeric",
    month: "long",
  },
  month: {
    month: "long",
  },
  dateTime: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
  time: {
    hour: "2-digit",
    minute: "2-digit",
  },
};

export function formatDate(
  input: DateInput,
  options: FormatOptions = {},
): string {
  const date = parseDate(input, options);
  const preset = options.preset ?? "short";
  const locale = options.locale ?? "en-US";
  const digits = options.digits ?? "latn";

  if (digits !== "latn" && digits !== "beng") {
    fail("INVALID_OPTIONS", "Unsupported digit system.");
  }

  for (const key of ["hour12", "showSeconds"] as const) {
    if (
      options[key] !== undefined &&
      typeof options[key] !== "boolean"
    ) {
      fail("INVALID_OPTIONS", `${key} must be boolean.`);
    }
  }

  if (typeof preset !== "string") {
    fail("INVALID_FORMAT", "Invalid date preset.");
  }

  if (preset === "custom") {
    return formatCustom(
      date,
      options.pattern ?? "",
      locale,
      digits,
    );
  }

  if (own(EXPLICIT_PATTERNS, preset)) {
    return formatCustom(
      date,
      EXPLICIT_PATTERNS[preset]!,
      locale,
      digits,
    );
  }

  if (!own(FORMAT_FIELDS, preset)) {
    fail("INVALID_FORMAT", "Unsupported date preset.");
  }

  const hasTime = preset === "time" || preset === "dateTime";

  const fields: Intl.DateTimeFormatOptions = {
    ...FORMAT_FIELDS[preset],
    timeZone: "UTC",
    calendar: "gregory",
    numberingSystem: digits,
  };

  if (hasTime) {
    if (options.showSeconds) fields.second = "2-digit";

    fields.hourCycle =
      options.hour12 === true ? "h12" : "h23";
  }

  return getFormatter(locale, fields).format(toUTC(date));
}

export function addDays(
  input: DateInput,
  amount: number,
  options: ParseOptions = {},
): CivilDateTime {
  integer(amount, "Days");

  const date = parseDate(input, options);
  const target = dayIndex(date) + amount;

  if (
    !Number.isSafeInteger(target) ||
    target < MIN_DAY ||
    target > MAX_DAY
  ) {
    fail("OUT_OF_RANGE", "Result is outside years 1–9999.");
  }

  return fromUTC(
    new Date(target * DAY_MS + timeMilliseconds(date)),
  );
}

export function addMonths(
  input: DateInput,
  amount: number,
  options: ParseOptions & {
    overflow?: OverflowPolicy;
  } = {},
): CivilDateTime {
  integer(amount, "Months");

  const date = parseDate(input, options);
  const overflow = options.overflow ?? "clamp";

  if (overflow !== "clamp" && overflow !== "reject") {
    fail("INVALID_OPTIONS", "Unsupported overflow policy.");
  }

  const target =
    (date.year - 1) * 12 +
    date.month - 1 +
    amount;

  if (
    !Number.isSafeInteger(target) ||
    target < 0 ||
    target >= 9999 * 12
  ) {
    fail("OUT_OF_RANGE", "Result is outside years 1–9999.");
  }

  const year = Math.floor(target / 12) + 1;
  const month = target % 12 + 1;
  const maximum = daysInMonth(year, month);

  if (overflow === "reject" && date.day > maximum) {
    fail(
      "INVALID_DATE",
      "Target month does not contain the original day.",
    );
  }

  return validateDate({
    ...date,
    year,
    month,
    day: Math.min(date.day, maximum),
  });
}

export function addYears(
  input: DateInput,
  amount: number,
  options: ParseOptions & {
    overflow?: OverflowPolicy;
  } = {},
): CivilDateTime {
  integer(amount, "Years");
  integer(amount * 12, "Equivalent months");

  return addMonths(input, amount * 12, options);
}

export function endOfMonth(
  input: DateInput,
  offset = 0,
  options: ParseOptions = {},
): CivilDateTime {
  const date = addMonths(input, offset, options);

  return midnight({
    ...date,
    day: daysInMonth(date.year, date.month),
  });
}

function completedMonths(
  start: CivilDateTime,
  end: CivilDateTime,
  policy: MonthCountPolicy,
): number {
  let months =
    (end.year - start.year) * 12 +
    end.month -
    start.month;

  if (policy === "dayOfMonth") {
    if (end.day < start.day) months -= 1;
  } else {
    const anchor = addMonths(start, months);

    if (dayIndex(anchor) > dayIndex(end)) months -= 1;
  }

  return months;
}

export function dateDifference(
  start: DateInput,
  end: DateInput,
  options: DifferenceOptions = {},
): DateDifference {
  const first = midnight(parseDate(start, options));
  const last = midnight(parseDate(end, options));
  const policy = options.monthPolicy ?? "dayOfMonth";

  if (policy !== "dayOfMonth" && policy !== "clamp") {
    fail("INVALID_OPTIONS", "Unsupported month-count policy.");
  }

  if (dayIndex(last) < dayIndex(first)) {
    fail("REVERSED_RANGE", "End date is before start date.");
  }

  const months = completedMonths(first, last, policy);

  return {
    days: dayIndex(last) - dayIndex(first),
    totalMonths: months,
    totalYears: Math.floor(months / 12),
  };
}

/**
 * Age uses clamped monthly anniversaries from the birth date.
 * Months are always 0–11.
 * Feb 29 becomes Feb 28 in non-leap anniversary years.
 */
export function ageBetween(
  birth: DateInput,
  asOf: DateInput,
  options: ParseOptions = {},
): DateAge {
  const start = midnight(parseDate(birth, options));
  const end = midnight(parseDate(asOf, options));

  if (dayIndex(end) < dayIndex(start)) {
    fail("REVERSED_RANGE", "As-of date is before birth date.");
  }

  const months = completedMonths(start, end, "clamp");
  const anchor = addMonths(start, months);

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: dayIndex(end) - dayIndex(anchor),
  };
}

function businessCalendar(options: BusinessOptions) {
  validateParseOptions(options);

  const weekendInput = options.weekend ?? [0, 6];

  if (
    !Array.isArray(weekendInput) ||
    weekendInput.length > 7
  ) {
    fail("INVALID_OPTIONS", "Weekend must be a weekday array.");
  }

  const weekend = new Set<number>(weekendInput);

  if (
    weekend.size > 6 ||
    [...weekend].some(
      (day) =>
        !Number.isInteger(day) ||
        day < 0 ||
        day > 6,
    )
  ) {
    fail(
      "INVALID_OPTIONS",
      "Weekend must use weekday numbers 0–6 and leave a workday.",
    );
  }

  const limit =
    options.maxIterations ?? MAX_BUSINESS_ITERATIONS;

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_BUSINESS_ITERATIONS
  ) {
    fail(
      "INVALID_OPTIONS",
      "Iteration limit must be within 1–1,000,000.",
    );
  }

  const holidayInputs = options.holidays ?? [];

  if (!Array.isArray(holidayInputs)) {
    fail("INVALID_OPTIONS", "Holidays must be an array.");
  }

  if (holidayInputs.length > MAX_BATCH_SIZE) {
    fail("LIMIT_EXCEEDED", "Too many holidays.");
  }

  const holidays = new Set<number>(
    holidayInputs.map((input) =>
      dayIndex(parseDate(input, options)),
    ),
  );

  const isWorkdayIndex = (index: number): boolean =>
    !weekend.has(weekdayFromIndex(index)) &&
    !holidays.has(index);

  return {
    weekend,
    holidays,
    limit,
    isWorkdayIndex,
  };
}

export function isBusinessDay(
  input: DateInput,
  options: BusinessOptions = {},
): boolean {
  const date = parseDate(input, options);
  const calendar = businessCalendar(options);

  return calendar.isWorkdayIndex(dayIndex(date));
}

/**
 * Excludes the starting day for nonzero offsets.
 * Zero returns the starting date unchanged, without time.
 */
export function addBusinessDays(
  input: DateInput,
  amount: number,
  options: BusinessOptions = {},
): CivilDateTime {
  integer(amount, "Business days");

  const date = midnight(parseDate(input, options));
  const calendar = businessCalendar(options);

  let index = dayIndex(date);
  let remaining = Math.abs(amount);
  const direction = amount < 0 ? -1 : 1;

  if (remaining > calendar.limit) {
    fail("LIMIT_EXCEEDED", "Business-day request is too large.");
  }

  let iterations = 0;

  while (remaining > 0) {
    iterations += 1;

    if (iterations > calendar.limit) {
      fail("LIMIT_EXCEEDED", "Business-day iteration limit exceeded.");
    }

    index += direction;

    if (index < MIN_DAY || index > MAX_DAY) {
      fail("OUT_OF_RANGE", "Result is outside years 1–9999.");
    }

    if (calendar.isWorkdayIndex(index)) remaining -= 1;
  }

  return fromUTC(new Date(index * DAY_MS));
}

/**
 * Inclusive endpoints.
 * Reversed ranges return a negative count.
 * Counts full weeks without daily iteration.
 */
export function countBusinessDays(
  start: DateInput,
  end: DateInput,
  options: BusinessOptions = {},
): number {
  let first = dayIndex(parseDate(start, options));
  let last = dayIndex(parseDate(end, options));
  const calendar = businessCalendar(options);

  let sign = 1;

  if (first > last) {
    [first, last] = [last, first];
    sign = -1;
  }

  const length = last - first + 1;
  const fullWeeks = Math.floor(length / 7);

  let count = fullWeeks * (7 - calendar.weekend.size);

  for (let offset = fullWeeks * 7; offset < length; offset += 1) {
    if (!calendar.weekend.has(weekdayFromIndex(first + offset))) {
      count += 1;
    }
  }

  for (const holiday of calendar.holidays) {
    if (
      holiday >= first &&
      holiday <= last &&
      !calendar.weekend.has(weekdayFromIndex(holiday))
    ) {
      count -= 1;
    }
  }

  return count === 0 ? 0 : count * sign;
}

export type DateFormulaName =
  | "TODAY"
  | "NOW"
  | "DATE"
  | "YEAR"
  | "MONTH"
  | "DAY"
  | "EDATE"
  | "EOMONTH"
  | "WORKDAY"
  | "WORKDAY.INTL"
  | "NETWORKDAYS"
  | "NETWORKDAYS.INTL"
  | "DATEDIF";

export type FormulaArgument =
  | number
  | { ref: string }
  | { range: string }
  | { text: string };

const CELL_REFERENCE =
  /^\$?([A-Za-z]{1,3})\$?([1-9]\d{0,6})$/;

function validateReference(reference: string): string {
  if (typeof reference !== "string") {
    fail("INVALID_INPUT", "Cell reference must be text.");
  }

  const match = reference.match(CELL_REFERENCE);

  if (!match) {
    fail("INVALID_INPUT", "Invalid A1 cell reference.");
  }

  let column = 0;

  for (const character of match[1]!.toUpperCase()) {
    column = column * 26 + character.charCodeAt(0) - 64;
  }

  if (
    column > 16384 ||
    Number(match[2]) > 1048576
  ) {
    fail("OUT_OF_RANGE", "Cell reference exceeds supported bounds.");
  }

  return reference.toUpperCase();
}

function encodeArgument(
  argument: unknown,
): string {
  if (typeof argument === "number") {
    finite(argument, "Formula number");
    return String(argument);
  }

  if (!isRecord(argument)) {
    fail(
      "INVALID_INPUT",
      "Formula argument must be a number or an argument object.",
    );
  }

  const keys = Object.keys(argument);

  if (keys.length !== 1) {
    fail(
      "INVALID_INPUT",
      "Formula argument must have exactly one key.",
    );
  }

  const key = keys[0]!;

  switch (key) {
    case "ref": {
      const reference = argument["ref"];

      if (typeof reference !== "string") {
        fail(
          "INVALID_INPUT",
          "Cell reference must be a string.",
        );
      }

      return validateReference(reference);
    }

    case "range": {
      const range = argument["range"];

      if (typeof range !== "string") {
        fail(
          "INVALID_INPUT",
          "Range must be a string.",
        );
      }

      const parts = range.split(":");

      if (parts.length !== 2) {
        fail(
          "INVALID_INPUT",
          "Use an A1:B10 range.",
        );
      }

      return parts
        .map((reference) => validateReference(reference))
        .join(":");
    }

    case "text": {
      const text = argument["text"];

      if (typeof text !== "string") {
        fail(
          "INVALID_INPUT",
          "Formula text must be a string.",
        );
      }

      if (text.length > MAX_TEXT_LENGTH) {
        fail(
          "LIMIT_EXCEEDED",
          "Formula text is too long.",
        );
      }

      if (/[\u0000-\u001f\u007f]/.test(text)) {
        fail(
          "INVALID_INPUT",
          "Formula text contains control characters.",
        );
      }

      return `"${text.replace(/"/g, '""')}"`;
    }

    default:
      return fail(
        "INVALID_INPUT",
        "Unsupported formula argument.",
      );
  }
}

const FORMULA_ARITY: Record<
  DateFormulaName,
  readonly [number, number]
> = {
  TODAY: [0, 0],
  NOW: [0, 0],
  DATE: [3, 3],
  YEAR: [1, 1],
  MONTH: [1, 1],
  DAY: [1, 1],
  EDATE: [2, 2],
  EOMONTH: [2, 2],
  WORKDAY: [2, 3],
  "WORKDAY.INTL": [2, 4],
  NETWORKDAYS: [2, 3],
  "NETWORKDAYS.INTL": [2, 4],
  DATEDIF: [3, 3],
};

/**
 * Builds formula text only.
 * Spreadsheet evaluation remains the host app's responsibility.
 * References currently support the current sheet only.
 */
export function buildDateFormula(
  name: DateFormulaName,
  args: readonly FormulaArgument[] = [],
): string {
  if (
    typeof name !== "string" ||
    !own(FORMULA_ARITY, name)
  ) {
    fail("INVALID_INPUT", "Unsupported date formula.");
  }

  if (!Array.isArray(args)) {
    fail("INVALID_INPUT", "Formula arguments must be an array.");
  }

  const [minimum, maximum] = FORMULA_ARITY[name];

  if (args.length < minimum || args.length > maximum) {
    fail("INVALID_INPUT", "Invalid formula argument count.");
  }

  const encoded: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    if (!own(args, index)) {
      fail("INVALID_INPUT", "Missing formula argument.");
    }

    encoded.push(encodeArgument(args[index]!));
  }

  if (name === "DATEDIF") {
    const unit = args[2];

    if (
      typeof unit !== "number" &&
      isRecord(unit) &&
      own(unit, "text") &&
      !["Y", "M", "D", "YM", "YD", "MD"].includes(
        String(unit.text),
      )
    ) {
      fail("INVALID_INPUT", "Unsupported DATEDIF unit.");
    }
  }

  return `=${name}(${encoded.join(",")})`;
}

export function buildDayOffsetFormula(
  reference: string,
  days: number,
): string {
  integer(days, "Days");

  return (
    `=${validateReference(reference)}` +
    `${days < 0 ? "-" : "+"}${Math.abs(days)}`
  );
}

export function buildDifferenceFormula(
  startReference: string,
  endReference: string,
): string {
  return (
    `=${validateReference(endReference)}` +
    `-${validateReference(startReference)}`
  );
}

export interface DatePreviewRow {
  index: number;
  input: DateInput;
  result: Result<{
    date: CivilDateTime;
    iso: string;
    serial: number | null;
    display: string;
  }>;
}

export function previewDates(
  inputs: readonly DateInput[],
  options: FormatOptions = {},
): DatePreviewRow[] {
  validateParseOptions(options);

  if (!Array.isArray(inputs)) {
    fail("INVALID_INPUT", "Preview inputs must be an array.");
  }

  if (inputs.length > MAX_BATCH_SIZE) {
    fail(
      "LIMIT_EXCEEDED",
      `Preview supports at most ${MAX_BATCH_SIZE} cells.`,
    );
  }

  return Array.from(inputs, (input, index) => ({
    index,
    input,
    result: attempt(() => {
      const date = parseDate(input, options);

      const serialResult = attempt(() =>
        toSerial(date, options.dateSystem),
      );

      return {
        date,
        iso: toISO(date),
        serial: serialResult.ok ? serialResult.value : null,
        display: formatDate(date, options),
      };
    }),
  }));
}

export const DATE_FORMAT_PRESETS: ReadonlyArray<{
  readonly id: FormatPreset;
  readonly label: string;
}> = Object.freeze([
  { id: "short", label: "Short Date" },
  { id: "long", label: "Long Date" },
  { id: "iso", label: "ISO — YYYY-MM-DD" },
  { id: "dmy", label: "DD/MM/YYYY" },
  { id: "mdy", label: "MM/DD/YYYY" },
  { id: "abbreviated", label: "DD-MMM-YYYY" },
  { id: "weekday", label: "Weekday and Date" },
  { id: "monthYear", label: "Month and Year" },
  { id: "year", label: "Year Only" },
  { id: "month", label: "Month Only" },
  { id: "day", label: "Day Only" },
  { id: "dateTime", label: "Date and Time" },
  { id: "time", label: "Time Only" },
  { id: "custom", label: "Custom Pattern" },
] satisfies ReadonlyArray<{
  readonly id: FormatPreset;
  readonly label: string;
}>);