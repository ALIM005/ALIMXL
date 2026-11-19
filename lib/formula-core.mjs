// ALIMXL formula core — extracted verbatim from app/page.tsx; logic-preserving TS→JS conversion.

const MAX_ROWS = 100000;

const EXCHANGE_RATE_SHEET_NAME = "Exchange Rates";

const activeExchangeRates = {};
let userExchangeRatesActive = false;

const DEFAULT_EXCHANGE_RATES_TO_USD = {
  USD: 1,
  BDT: 0.0082,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.0119,
  PKR: 0.0036,
  // [স্টেপ ১] SAR/AED/QAR ডলারের সাথে স্থির (peg) — সঠিক অনুপাত: 3.75 / 3.6725 / 3.64
  SAR: 1 / 3.75,
  AED: 1 / 3.6725,
  QAR: 1 / 3.64,
  KWD: 3.26,
  OMR: 2.6,
  JPY: 0.0067,
  CNY: 0.14,
  AUD: 0.66,
  CAD: 0.73,
  CHF: 1.12,
  SGD: 0.74,
  MYR: 0.22,
  THB: 0.029,
  IDR: 0.000063,
  KRW: 0.00073,
  TRY: 0.029,
  RUB: 0.011,
  BRL: 0.18,
  MXN: 0.055,
  ZAR: 0.055,
  NGN: 0.00065,
  EGP: 0.021,
  KES: 0.0077,
};

function rateKey(from, to) {
  return `${from}-${to}`;
}

function isValidRate(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getUsdRate(currencyCode) {
  if (currencyCode === "USD") return 1;

  const direct = activeExchangeRates[rateKey(currencyCode, "USD")];
  if (isValidRate(direct)) return direct;

  const reverse = activeExchangeRates[rateKey("USD", currencyCode)];
  if (isValidRate(reverse)) return 1 / reverse;

  const fallback = DEFAULT_EXCHANGE_RATES_TO_USD[currencyCode];
  return typeof fallback === "number" && fallback > 0 ? fallback : null;
}

function getExchangeRate(from, to) {
  if (from === to) return 1;

  const direct = activeExchangeRates[rateKey(from, to)];
  if (isValidRate(direct)) return direct;

  const reverse = activeExchangeRates[rateKey(to, from)];
  if (isValidRate(reverse)) return 1 / reverse;

  const fromUsd = getUsdRate(from);
  const toUsd = getUsdRate(to);

  if (fromUsd && toUsd) {
    return fromUsd / toUsd;
  }

  return NaN;
}

function colToLetter(col) {
  let n = col + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function letterToCol(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
}

function cellKey(row, col) {
  return `${colToLetter(col)}${row + 1}`;
}

function parseKey(key) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(key.trim());
  if (!m) return null;
  return { row: parseInt(m[2], 10) - 1, col: letterToCol(m[1].toUpperCase()) };
}

// ডেটা আছে এমন সর্বশেষ রো (০-ভিত্তিক); কিছু না থাকলে -1
function getLastUsedRow(cells) {
  let last = -1;
  for (const [key, data] of Object.entries(cells)) {
    if (!data || (data.value === "" && !data.image)) continue;
    const pos = parseKey(key);
    if (pos && pos.row > last) last = pos.row;
  }
  return last;
}

function normalizeRange(range) {
  // [স্টেপ ১] পুরো কলাম সমর্থিত: A:A, A1:A ইত্যাদি
  const parts = range.split(":").map((x) => x.trim().toUpperCase());
  const a = parts[0] ?? "";
  const b = parts[1] ?? a;
  const expand = (ref, isEnd) => {
    if (/^[A-Z]{1,3}$/.test(ref)) return `${ref}${isEnd ? MAX_ROWS : 1}`;
    return ref;
  };
  const pa = parseKey(expand(a, false));
  const pb = parseKey(expand(b, true));
  if (!pa || !pb) return null;
  return {
    r1: Math.min(pa.row, pb.row),
    c1: Math.min(pa.col, pb.col),
    r2: Math.max(pa.row, pb.row),
    c2: Math.max(pa.col, pb.col),
  };
}

function cleanNumber(n) {
  if (!Number.isFinite(n)) return n;
  if (n === 0) return 0;
  return Number(n.toPrecision(15));
}

// ঠিক ১০ এর ঘাত ব্যবহার করে অর্ধেক-থেকে-দূরে (Excel-এর মতো) রাউন্ডিং: 1.005 → 1.01, 2.5 → 3, -2.5 → -3
function roundHalfAway(value, digits) {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const shift = (x, d) => {
    const [m, e = "0"] = String(x).split("e");
    return Number(`${m}e${Number(e) + d}`);
  };
  const result = sign * shift(Math.round(shift(abs, digits)), -digits);
  return Object.is(result, -0) ? 0 : result;
}

// [স্টেপ ২] বাংলাদেশি লাখ-কোটি গ্রুপিং ও বাংলা/আরবি অঙ্ক প্রদর্শন



const DISPLAY_SETTINGS = {
  grouping: "western",
  digits: "latin",
};

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toDisplayDigits(text) {
  if (DISPLAY_SETTINGS.digits === "latin") return text;
  const map = DISPLAY_SETTINGS.digits === "bengali" ? BENGALI_DIGITS : ARABIC_DIGITS;
  return text.replace(/[0-9]/g, (d) => map[Number(d)]);
}

function formatDisplayNumber(value, decimals) {
  const d = decimals === null ? undefined : Math.max(0, Math.min(Math.trunc(decimals), 10));
  const locale = DISPLAY_SETTINGS.grouping === "bd" ? "en-IN" : "en-US";
  let text;
  try {
    text = value.toLocaleString(locale, d === undefined ? { maximumFractionDigits: 10 } : { minimumFractionDigits: d, maximumFractionDigits: d });
  } catch {
    text = value.toLocaleString("en-US", d === undefined ? { maximumFractionDigits: 10 } : { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  return toDisplayDigits(text);
}

function excelDateToSerial(date) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000);
}

function parseDateTextToSerial(text) {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : excelDateToSerial(d);
  }
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(text);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(d.getTime()) ? null : excelDateToSerial(d);
  }
  return null;
}

function sameSheetName(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normalizeLocalizedDigits(value) {
  // [হিসাব-সংশোধন] আগে পুরো সংখ্যার টুকরোকে একটি অঙ্ক ধরে খোঁজা হতো ("১২" → "1", "৩৪৫" → "3")।
  // এখন প্রতিটি অঙ্ক আলাদাভাবে রূপান্তরিত হয় (বাংলা, আরবি, ফার্সি)।
  return value.replace(/[\u09E6-\u09EF\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x09e6 && code <= 0x09ef) return String(code - 0x09e6);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

/* ============================================================================
 * Formula engine
 * ========================================================================== */




// $A$1 / A$1 / $A1 — absolute চিহ্ন হিসাবের সময় অপ্রয়োজনীয়; স্ট্রিং ও 'শিট নাম'-এর বাইরের $ সরানো হয়
function stripAbsoluteMarkers(src) {
  let out = "";
  let quote = null;
  for (const ch of src) {
    if (quote) {
      if (ch === quote) quote = null;
      out += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch !== "$") out += ch;
  }
  return out;
}

// [স্টেপ ১] ফর্মুলার "টেক্সট" ও 'শিট নাম'-এর বাইরের বাংলা/আরবি/ফার্সি অঙ্ক ইংরেজি অঙ্কে বদলায়
function normalizeDigitsOutsideQuotes(src) {
  return src
    .split(/("(?:[^"]|"")*"|'[^']*')/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : normalizeLocalizedDigits(part)
          // [স্টেপ ১] আরবি কীবোর্ডের চিহ্ন: ، (কমা) ؛ (সেমিকোলন) ٫ (দশমিক) ٪ (শতাংশ); ; আর , একই আর্গুমেন্ট-বিভাজক
          .replace(/[\u060C\u061B;]/g, ",")
          .replace(/\u066B/g, ".")
          .replace(/\u066A/g, "%")
    )
    .join("");
}

function tokenize(rawSrc) {
  const src = normalizeDigitsOutsideQuotes(stripAbsoluteMarkers(rawSrc));
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    // #REF!, #DIV/0! ইত্যাদি এরর লিটারেল (রেফারেন্স মুছে গেলে এটাই থাকে)
    if (ch === "#") {
      const errorMatch = /^#(?:REF!|DIV\/0!|NAME\?|VALUE!|N\/A|NUM!|ERROR!|CIRCULAR!)/i.exec(src.slice(i));
      if (errorMatch) {
        tokens.push({ type: "str", value: errorMatch[0].toUpperCase() });
        i += errorMatch[0].length;
        continue;
      }
    }
    if (ch === '"') {
      let j = i + 1;
      let out = "";
      let closed = false;
      while (j < src.length) {
        if (src[j] === '"') {
          // Excel-এর মতো "" মানে লিটারেল "
          if (src[j + 1] === '"') {
            out += '"';
            j += 2;
            continue;
          }
          closed = true;
          break;
        }
        out += src[j++];
      }
      if (!closed) throw new Error("Unterminated string");
      tokens.push({ type: "str", value: out });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      let out = "";
      while (j < src.length && /[0-9.]/.test(src[j])) out += src[j++];
      // বৈজ্ঞানিক সংখ্যা: 1E5, 2.5e-3
      const exponent = /^[eE][+-]?\d+/.exec(src.slice(j));
      if (exponent) {
        out += exponent[0];
        j += exponent[0].length;
      }
      // [হিসাব-সংশোধন] "1.2.3" বা "." আগে চুপচাপ 1.2 / NaN হতো — এখন এরর
      if (!/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(out)) throw new Error("Invalid number");
      tokens.push({ type: "num", value: out });
      i = j;
      continue;
    }

    if (ch === "'") {
      let j = i + 1;
      let sheetName = "";

      while (j < src.length && src[j] !== "'") sheetName += src[j++];

      if (src[j] === "'" && src[j + 1] === "!") {
        let k = j + 2;
        let reference = "";

        while (k < src.length && /[A-Za-z0-9:]/.test(src[k])) reference += src[k++];

        tokens.push({
          type: reference.includes(":") ? "range" : "ref",
          value: `${sheetName}!${reference.toUpperCase()}`,
        });

        i = k;
        continue;
      }
    }

    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      let out = "";
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) out += src[j++];
      // [ধাপ ২] ডট-যুক্ত ফাংশনের নাম: PERCENTILE.INC( , RANK.EQ( , MODE.SNGL(
      while (src[j] === "." && /^\.[A-Za-z][A-Za-z0-9_]*\(/.test(src.slice(j))) {
        out += src[j++];
        while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) out += src[j++];
      }

      if (src[j] === "!") {
        let k = j + 1;
        let sheetReference = "";

        while (k < src.length && /[A-Za-z0-9:]/.test(src[k])) {
          sheetReference += src[k];
          k++;
        }

        if (sheetReference.includes(":")) {
          tokens.push({
            type: "range",
            value: `${out.toUpperCase()}!${sheetReference.toUpperCase()}`,
          });
        } else {
          tokens.push({
            type: "ref",
            value: `${out.toUpperCase()}!${sheetReference.toUpperCase()}`,
          });
        }

        i = k;
        continue;
      }
      if (src[j] === ":" && /^[A-Za-z]+\d+$/.test(out)) {
        let k = j + 1;
        let out2 = "";
        while (k < src.length && /[A-Za-z0-9]/.test(src[k])) out2 += src[k++];
        if (/^[A-Za-z]+\d+$/.test(out2)) {
          tokens.push({ type: "range", value: `${out.toUpperCase()}:${out2.toUpperCase()}` });
          i = k;
          continue;
        }
      }
      // [স্টেপ ১] "LOG10(" জাতীয় নাম রেফারেন্স (A1) নয়, ফাংশন — পরে ( থাকলে ident
      tokens.push(/^[A-Za-z]+\d+$/.test(out) && src[j] !== "(" ? { type: "ref", value: out.toUpperCase() } : { type: "ident", value: out.toUpperCase() });
      i = j;
      continue;
    }
    if (ch === "(") tokens.push({ type: "lparen", value: ch });
    else if (ch === ")") tokens.push({ type: "rparen", value: ch });
    else if (ch === ",") tokens.push({ type: "comma", value: ch });
    else if ("+-*/^&%".includes(ch)) tokens.push({ type: "op", value: ch });
    else if (ch === "<" || ch === ">" || ch === "=") {
      let op = ch;
      if (src[i + 1] === "=" && (ch === "<" || ch === ">")) {
        op += "=";
        i++;
      } else if (ch === "<" && src[i + 1] === ">") {
        op = "<>";
        i++;
      }
      tokens.push({ type: "op", value: op });
    } else {
      // [হিসাব-সংশোধন] অচেনা চিহ্ন আগে চুপচাপ বাদ পড়ত (ভুল হিসাব আসত) — এখন এরর
      throw new Error("Unexpected character");
    }
    i++;
  }
  tokens.push({ type: "end", value: "" });
  return tokens;
}



class FormulaParser {
  tokens;
  pos = 0;
  constructor(src) {
    this.tokens = tokenize(src);
  }
  peek() {
    return this.tokens[this.pos];
  }
  next() {
    return this.tokens[this.pos++];
  }
  parse() {
    // খালি ফর্মুলা ("=") আগের মতোই ০
    if (this.peek().type === "end") return { kind: "num", value: 0 };
    const node = this.parseCompare();
    // [হিসাব-সংশোধন] "=1 2" বা "=SUM(A1) )" আগে অবশিষ্ট অংশ ফেলে দিয়ে ভুল ফল দিত — এখন এরর
    if (this.peek().type !== "end") throw new Error("Unexpected token");
    return node;
  }
  parseCompare() {
    let left = this.parseConcat();
    while (this.peek().type === "op" && ["<", ">", "<=", ">=", "=", "<>"].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "bin", op, left, right: this.parseConcat() };
    }
    return left;
  }
  parseConcat() {
    let left = this.parseAdd();
    while (this.peek().type === "op" && this.peek().value === "&") {
      this.next();
      left = { kind: "bin", op: "&", left, right: this.parseAdd() };
    }
    return left;
  }
  parseAdd() {
    let left = this.parseMul();
    while (this.peek().type === "op" && ["+", "-"].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "bin", op, left, right: this.parseMul() };
    }
    return left;
  }
  parseMul() {
    let left = this.parsePow();
    while (this.peek().type === "op" && ["*", "/"].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "bin", op, left, right: this.parsePow() };
    }
    return left;
  }
  parsePow() {
    let left = this.parseUnary();
    while (this.peek().type === "op" && this.peek().value === "^") {
      this.next();
      left = { kind: "bin", op: "^", left, right: this.parseUnary() };
    }
    return left;
  }
  parseUnary() {
    if (this.peek().type === "op" && this.peek().value === "-") {
      this.next();
      return { kind: "neg", node: this.parseUnary() };
    }
    // [স্টেপ ১] =+5 (Excel-এর মতো ইউনারি প্লাস) আগে #ERROR! দিত
    if (this.peek().type === "op" && this.peek().value === "+") {
      this.next();
      return this.parseUnary();
    }
    let node = this.parsePrimary();
    // পোস্টফিক্স শতাংশ: 50% = 0.5, A1% = A1/100
    while (this.peek().type === "op" && this.peek().value === "%") {
      this.next();
      node = { kind: "bin", op: "/", left: node, right: { kind: "num", value: 100 } };
    }
    return node;
  }
  parsePrimary() {
    const t = this.peek();
    if (t.type === "num") {
      this.next();
      return { kind: "num", value: parseFloat(t.value) };
    }
    if (t.type === "str") {
      this.next();
      return { kind: "str", value: t.value };
    }
    if (t.type === "range") {
      this.next();
      return { kind: "range", value: t.value };
    }
    if (t.type === "ref") {
      this.next();
      return { kind: "ref", value: t.value };
    }
    if (t.type === "ident") {
      this.next();
      const name = t.value;
      const args = [];
      if (this.peek().type === "lparen") {
        this.next();
        if (this.peek().type !== "rparen") {
          args.push(this.parseCompare());
          while (this.peek().type === "comma") {
            this.next();
            args.push(this.parseCompare());
          }
        }
        // [হিসাব-সংশোধন] বন্ধনী না বন্ধ হলে এরর (আগে চুপচাপ ধরে নিত)
        if (this.peek().type !== "rparen") throw new Error("Missing )");
        this.next();
      }
      return { kind: "call", name, args };
    }
    if (t.type === "lparen") {
      this.next();
      const inner = this.parseCompare();
      if (this.peek().type !== "rparen") throw new Error("Missing )");
      this.next();
      return inner;
    }
    throw new Error("Unexpected token");
  }
}

// UI-র হিসাবে (পিভট, কনসোলিডেট, গোল-সিক) ব্যবহৃত: শুধু পুরো-সংখ্যা টেক্সট সংখ্যা হয়, "2nd floor" ০ হয়
function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  const parsed = strictNumber(v);
  return parsed === null ? 0 : parsed;
}

// পুরো টেক্সটটাই সংখ্যা হলে সংখ্যা, নাহলে null ("12abc" আর আংশিকভাবে ১২ হয় না)
function strictNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  // [স্টেপ ১] বাংলা/আরবি/ফার্সি অঙ্কও সংখ্যা হিসেবে চেনা হয় ("১২৫" = 125)
  // [স্টেপ ১] আরবি দশমিক (٫) ও হাজার-বিভাজক (٬ ،) এবং বাংলাদেশি গ্রুপিং (১২,৫০,০০০) সমর্থিত
  const text = normalizeLocalizedDigits(String(v).trim()).replace(/\u066B/g, ".").replace(/[\u066C\u060C]/g, ",");
  if (text === "") return null;
  const percentMatch = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:,\d{3})*(?:,\d{2,3})*)\s*%$/.exec(text);
  if (percentMatch) {
    const base = strictNumber(percentMatch[1]);
    return base === null ? null : base / 100;
  }
  const currencyText = text
    .replace(/^\s*(?:৳|টাকা|tk\.?|bdt|usd|\$|€|£|¥|₹)\s*/i, "")
    .replace(/\s*(?:টাকা|taka|bdt|usd)\s*$/i, "")
    .trim();
  if (currencyText && currencyText !== text) {
    const currencyNumber = strictNumber(currencyText);
    if (currencyNumber !== null) return currencyNumber;
  }
  if (NUMERIC_RE.test(text)) return Number(text.replace(/,/g, ""));
  if (INDIAN_GROUPED_RE.test(text)) return Number(text.replace(/,/g, ""));
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ফর্মুলার গাণিতিক অপারেটরের জন্য: ফাঁকা = ০, সংখ্যা-টেক্সট = সংখ্যা, অন্য টেক্সট = #VALUE! (Excel-এর মতো)
function operandNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : "#VALUE!";
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === "" || (typeof v === "string" && v.trim() === "")) return 0;
  const parsed = strictNumber(v);
  return parsed === null ? "#VALUE!" : parsed;
}

const NUMERIC_RE = /^-?(?:(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d+)?|\.\d+)$/;
// ভারতীয়/বাংলাদেশি গ্রুপিং: 1,25,000 / 12,50,000.50 / 1,00,00,000
const INDIAN_GROUPED_RE = /^-?[1-9]\d{0,1}(?:,\d{2})+,\d{3}(?:\.\d+)?$/;

const FORMULA_ERRORS = new Set(["#DIV/0!", "#NAME?", "#ERROR!", "#CIRCULAR!", "#VALUE!", "#REF!", "#N/A", "#NUM!"]);

// শুধু http(s)/mailto/tel এবং সাইটের নিজস্ব পাথ (/...) অনুমোদিত; javascript:, data: ইত্যাদি বাতিল
function sanitizeUrl(input) {
  if (typeof input !== "string") return null;
  const u = input.trim();
  if (!u || u.length > 2048) return null;
  if (/^\/(?!\/)/.test(u)) return u;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(u)) return u;
  return null;
}

// শুধু আসল সংখ্যা হলে number ফেরত দেয়; "2nd floor", "2024-01-01", "01712345678" টেক্সটই থাকে
function parseNumericCell(raw) {
  // [স্টেপ ১] "১২৫", "১,২৫,০০০"-এর মতো বাংলা অঙ্কের সেলও সংখ্যা; টেক্সট হলে মূল লেখাই থাকে
  const s = normalizeLocalizedDigits(raw.trim()).replace(/\u066B/g, ".").replace(/[\u066C\u060C]/g, ",");
  if (NUMERIC_RE.test(s)) return Number(s.replace(/,/g, ""));
  // ভারতীয়/বাংলাদেশি গ্রুপিং: 1,25,000
  if (INDIAN_GROUPED_RE.test(s)) return Number(s.replace(/,/g, ""));
  return raw;
}

// COUNTIF/SUMIF-এর মানদণ্ড: "text", 5, ">3", "<=10", "<>x", "=x", "<>"
function matchesCriterion(value, criterion) {
  const text = normalizeLocalizedDigits(String(criterion).trim());
  const valueText = normalizeLocalizedDigits(String(value).trim());

  if (text === "") return valueText === "";
  if (text === "<>") return valueText !== "";

  const operator = /^(>=|<=|<>|>|<|=)/.exec(text)?.[1] ?? "";
  const operand = text.slice(operator.length).trim();
  const operandNumber = operand === "" ? NaN : Number(operand);
  const isNumber = Number.isFinite(operandNumber);

  const equalsOperand = () => {
    if (operand === "") return valueText === "";
    if (isNumber) {
      if (typeof value === "number") return value === operandNumber;
      return valueText !== "" && Number(valueText) === operandNumber;
    }
    // [স্টেপ ১] Excel-এর মতো * ও ? ওয়াইল্ডকার্ড ("আলী*", "A?C"); ~ দিয়ে আক্ষরিক * ?
    if (/[*?]/.test(operand.replace(/~[*?~]/g, ""))) {
      let pattern = "";
      for (let k = 0; k < operand.length; k++) {
        const c = operand[k];
        if (c === "~" && /[*?~]/.test(operand[k + 1] ?? "")) {
          pattern += "\\" + operand[++k];
        } else if (c === "*") pattern += "[\\s\\S]*";
        else if (c === "?") pattern += "[\\s\\S]";
        else pattern += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      }
      return new RegExp(`^${pattern}$`, "i").test(valueText);
    }
    return valueText.toLowerCase() === operand.toLowerCase();
  };

  if (operator === "" || operator === "=") return equalsOperand();
  if (operator === "<>") return !equalsOperand();

  // বড়/ছোট তুলনা শুধু সংখ্যার ঘরের জন্য (ফাঁকা ও টেক্সট বাদ)
  if (!isNumber || typeof value !== "number") return false;

  switch (operator) {
    case ">": return value > operandNumber;
    case ">=": return value >= operandNumber;
    case "<": return value < operandNumber;
    case "<=": return value <= operandNumber;
    default: return false;
  }
}

// [নতুন ফাংশন] ROW()/COLUMN() আর্গুমেন্ট ছাড়া ডাকলে বর্তমান সেল জানতে হয়
let currentEvalCellKey = null;

// [নতুন ফাংশন] SUBSTITUTE, FIND, SEARCH, PROPER, CONCATENATE, VALUE, AVERAGEIF(S), SUMPRODUCT, LARGE, SMALL,
// RANK, CEILING, FLOOR, ISBLANK, ISNUMBER, ROW, COLUMN, RAND, PMT — চেনা না গেলে undefined (তখন #NAME? আসে)
function evalExtraFunction(node, getCell, expandRange) {
  const args = node.args;
  const isErr = (v) => typeof v === "string" && FORMULA_ERRORS.has(v);
  const ev = (i) => evalNode(args[i], getCell, expandRange);
  const asText = (v) => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v));
  const listOf = (arg) =>
    arg.kind === "range" ? expandRange(arg.value) : arg.kind === "ref" ? [getCell(arg.value)] : [evalNode(arg, getCell, expandRange)];
  const stripSheet = (ref) => ref.slice(ref.lastIndexOf("!") + 1);

  switch (node.name) {
    case "CONCATENATE": {
      const out = [];
      for (const a of args) {
        for (const v of listOf(a)) {
          if (isErr(v)) return v;
          out.push(asText(v));
        }
      }
      return out.join("");
    }
    case "SUBSTITUTE": {
      if (args.length < 3 || args.length > 4) return "#VALUE!";
      const t = ev(0); if (isErr(t)) return t;
      const o = ev(1); if (isErr(o)) return o;
      const n = ev(2); if (isErr(n)) return n;
      const text = asText(t); const oldText = asText(o); const newText = asText(n);
      if (oldText === "") return text;
      if (args[3]) {
        const inst = operandNumber(ev(3));
        if (inst === "#VALUE!") return "#VALUE!";
        const k = Math.trunc(inst);
        if (k < 1) return "#VALUE!";
        let from = 0; let found = 0;
        while (true) {
          const idx = text.indexOf(oldText, from);
          if (idx === -1) return text;
          found += 1;
          if (found === k) return text.slice(0, idx) + newText + text.slice(idx + oldText.length);
          from = idx + oldText.length;
        }
      }
      return text.split(oldText).join(newText);
    }
    case "FIND":
    case "SEARCH": {
      if (args.length < 2 || args.length > 3) return "#VALUE!";
      const f = ev(0); if (isErr(f)) return f;
      const w = ev(1); if (isErr(w)) return w;
      const findText = asText(f); const within = asText(w);
      let start = 1;
      if (args[2]) {
        const st = operandNumber(ev(2));
        if (st === "#VALUE!") return "#VALUE!";
        start = Math.trunc(st);
      }
      if (start < 1 || start > within.length + 1) return "#VALUE!";
      if (node.name === "FIND") {
        const idx = within.indexOf(findText, start - 1);
        return idx === -1 ? "#VALUE!" : idx + 1;
      }
      let pattern = "";
      for (let k = 0; k < findText.length; k++) {
        const c = findText[k];
        if (c === "~" && /[*?~]/.test(findText[k + 1] ?? "")) pattern += "\\" + findText[++k];
        else if (c === "*") pattern += "[\\s\\S]*";
        else if (c === "?") pattern += "[\\s\\S]";
        else pattern += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      }
      const re = new RegExp(pattern, "i");
      const m = re.exec(within.slice(start - 1));
      return m ? m.index + start : "#VALUE!";
    }
    case "PROPER": {
      if (args.length !== 1) return "#VALUE!";
      const v = ev(0); if (isErr(v)) return v;
      return asText(v).replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    }
    case "VALUE": {
      if (args.length !== 1) return "#VALUE!";
      const v = ev(0); if (isErr(v)) return v;
      if (typeof v === "number") return v;
      if (typeof v === "boolean") return "#VALUE!";
      if (v.trim() === "") return 0;
      const n = strictNumber(v);
      if (n !== null) return n;
      const d = parseDateTextToSerial(v.trim());
      return d !== null ? d : "#VALUE!";
    }
    case "AVERAGEIF": {
      if (args.length < 2 || args.length > 3) return "#VALUE!";
      if (args[0].kind !== "range" && args[0].kind !== "ref") return "#VALUE!";
      const avgArg = args[2] ?? args[0];
      if (avgArg.kind !== "range" && avgArg.kind !== "ref") return "#VALUE!";
      const criterion = ev(1); if (isErr(criterion)) return criterion;
      const tested = listOf(args[0]); const averaged = listOf(avgArg);
      const len = Math.max(tested.length, averaged.length);
      let total = 0; let count = 0;
      for (let i = 0; i < len; i++) {
        if (!matchesCriterion(tested[i] ?? "", criterion)) continue;
        const a = averaged[i] ?? "";
        if (isErr(a)) return a;
        if (typeof a === "number" && Number.isFinite(a)) { total += a; count += 1; }
      }
      return count === 0 ? "#DIV/0!" : cleanNumber(total / count);
    }
    case "AVERAGEIFS": {
      if (args.length < 3 || (args.length - 1) % 2 !== 0) return "#VALUE!";
      const avgVals = listOf(args[0]);
      const pairs = [];
      for (let i = 1; i < args.length; i += 2) {
        const range = listOf(args[i]);
        const crit = ev(i + 1); if (isErr(crit)) return crit;
        pairs.push([range, crit]);
      }
      let total = 0; let count = 0;
      for (let i = 0; i < avgVals.length; i++) {
        if (!pairs.every(([range, crit]) => matchesCriterion(range[i] ?? "", crit))) continue;
        const a = avgVals[i];
        if (isErr(a)) return a;
        if (typeof a === "number" && Number.isFinite(a)) { total += a; count += 1; }
      }
      return count === 0 ? "#DIV/0!" : cleanNumber(total / count);
    }
    case "SUMPRODUCT": {
      if (args.length < 1) return "#VALUE!";
      const arrays = args.map((a) => listOf(a));
      const len = arrays[0].length;
      if (arrays.some((a) => a.length !== len)) return "#VALUE!";
      let total = 0;
      for (let i = 0; i < len; i++) {
        let product = 1;
        for (const arr of arrays) {
          const v = arr[i];
          if (isErr(v)) return v;
          product *= typeof v === "number" && Number.isFinite(v) ? v : 0;
        }
        total += product;
      }
      return cleanNumber(total);
    }
    case "LARGE":
    case "SMALL": {
      if (args.length !== 2) return "#VALUE!";
      const values = listOf(args[0]);
      const bad = values.find(isErr); if (bad !== undefined) return bad;
      const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
      const kRaw = ev(1); if (isErr(kRaw)) return kRaw;
      const k = operandNumber(kRaw);
      if (k === "#VALUE!") return "#VALUE!";
      const kk = Math.ceil(k);
      if (kk < 1 || kk > nums.length) return "#NUM!";
      const sorted = [...nums].sort((a, b) => (node.name === "LARGE" ? b - a : a - b));
      return sorted[kk - 1];
    }
    case "RANK": {
      if (args.length < 2 || args.length > 3) return "#VALUE!";
      const nRaw = ev(0); if (isErr(nRaw)) return nRaw;
      const target = operandNumber(nRaw);
      if (target === "#VALUE!") return "#VALUE!";
      if (args[1].kind !== "range" && args[1].kind !== "ref") return "#VALUE!";
      const values = listOf(args[1]);
      const bad = values.find(isErr); if (bad !== undefined) return bad;
      const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
      let ascending = false;
      if (args[2]) {
        const o = operandNumber(ev(2));
        if (o === "#VALUE!") return "#VALUE!";
        ascending = o !== 0;
      }
      if (!nums.some((v) => cleanNumber(v) === cleanNumber(target))) return "#N/A";
      return nums.filter((v) => (ascending ? cleanNumber(v) < cleanNumber(target) : cleanNumber(v) > cleanNumber(target))).length + 1;
    }
    case "CEILING":
    case "FLOOR": {
      if (args.length < 1 || args.length > 2) return "#VALUE!";
      const nRaw = ev(0); if (isErr(nRaw)) return nRaw;
      const n = operandNumber(nRaw);
      if (n === "#VALUE!") return "#VALUE!";
      let sig = n < 0 ? -1 : 1;
      if (args[1]) {
        const sRaw = ev(1); if (isErr(sRaw)) return sRaw;
        const sn = operandNumber(sRaw);
        if (sn === "#VALUE!") return "#VALUE!";
        sig = sn;
      }
      if (sig === 0) return node.name === "CEILING" ? 0 : "#DIV/0!";
      if (n > 0 && sig < 0) return "#NUM!";
      const q = cleanNumber(n / sig);
      const r = (node.name === "CEILING" ? Math.ceil(q) : Math.floor(q)) * sig;
      return cleanNumber(r === 0 ? 0 : r);
    }
    case "ISBLANK": {
      if (args.length !== 1) return "#VALUE!";
      if (args[0].kind !== "ref") return false;
      return getCell(args[0].value) === "";
    }
    case "ISNUMBER": {
      if (args.length !== 1) return "#VALUE!";
      const v = ev(0);
      return typeof v === "number" && Number.isFinite(v);
    }
    case "ROW":
    case "COLUMN": {
      if (args.length > 1) return "#VALUE!";
      let key = null;
      if (args.length === 0) key = currentEvalCellKey;
      else if (args[0].kind === "ref") key = stripSheet(args[0].value);
      else if (args[0].kind === "range") key = stripSheet(args[0].value).split(":")[0];
      else return "#VALUE!";
      const pos = key ? parseKey(key) : null;
      if (!pos) {
        // পুরো কলাম রেঞ্জ (যেমন B:B) এর জন্য COLUMN
        if (node.name === "COLUMN" && key && /^[A-Za-z]{1,3}$/.test(key)) return letterToCol(key.toUpperCase()) + 1;
        return "#VALUE!";
      }
      return node.name === "ROW" ? pos.row + 1 : pos.col + 1;
    }
    case "RAND": {
      if (args.length !== 0) return "#VALUE!";
      return Math.random();
    }
    case "PMT": {
      if (args.length < 3 || args.length > 5) return "#VALUE!";
      const vals = [];
      for (let i = 0; i < 5; i++) {
        if (!args[i]) { vals.push(0); continue; }
        const raw = ev(i); if (isErr(raw)) return raw;
        const n = operandNumber(raw);
        if (n === "#VALUE!") return "#VALUE!";
        vals.push(n);
      }
      const [rate, nper, pv, fv, typeRaw] = vals;
      const type = typeRaw !== 0 ? 1 : 0;
      if (nper === 0) return "#NUM!";
      if (rate === 0) return cleanNumber(-(pv + fv) / nper);
      const growth = Math.pow(1 + rate, nper);
      const payment = -(rate * (fv + pv * growth)) / ((1 + rate * type) * (growth - 1));
      return Number.isFinite(payment) ? cleanNumber(payment) : "#NUM!";
    }
    default:
      // [ধাপ ২] নতুন ফাংশনগুলো (INDEX, MATCH, DATE ...) — নিচের evalMoreFunction-এ
      return evalMoreFunction(node, getCell, expandRange, evalNode, currentEvalContext);
  }
}

/* ============================================================================
 * [ধাপ ২] নতুন ফাংশন (Excel-সামঞ্জস্যপূর্ণ)
 *   লুকআপ  : INDEX, MATCH, HLOOKUP, CHOOSE
 *   তারিখ  : DATE, YEAR, MONTH, DAY, WEEKDAY, EOMONTH, EDATE, DATEDIF, DAYS
 *   গণনা   : COUNTBLANK, MAXIFS, MINIFS, SUBTOTAL
 *   তথ্য   : ISERROR, ISERR, ISNA, ISTEXT, IFNA
 *   গণিত   : LOG, LOG10, LN, EXP, PI, TRUNC, SIGN, RANDBETWEEN
 *   আর্থিক : FV, PV, NPV, IRR, RATE, NPER
 *   টেক্সট : REPLACE, REPT, EXACT
 *   পরিসংখ্যান: PERCENTILE, QUARTILE, MODE (+ .INC / .SNGL নাম), RANK.EQ
 *
 * ব্যবহার: evalExtraFunction-এর default শাখা থেকে ডাকা হয়। অচেনা নাম হলে undefined ফেরত দেয়
 * (তখন #NAME? আসে)। app/page.tsx-ও এই একই ফাংশন ইমপোর্ট করে ব্যবহার করে — তাই দুই ফাইলে
 * লজিক কখনো আলাদা হয়ে যাবে না।
 * ========================================================================== */

const MAX_TEXT_LENGTH = 32767;
const MAX_DATE_SERIAL = 2958465; // 9999-12-31

function isFormulaError(v) {
  return typeof v === "string" && FORMULA_ERRORS.has(v);
}

// রেঞ্জ/রেফারেন্সকে (শিট-নাম সহ) দুই-মাত্রার গ্রিডে পড়ে। পুরো-কলাম (A:A) হলে শুধু ব্যবহৃত সারি পর্যন্ত।
function readGrid(arg, getCell, ctx) {
  if (!arg || (arg.kind !== "range" && arg.kind !== "ref")) return null;
  const { sheetName, reference } = splitSheetReference(arg.value);
  const nr = normalizeRange(reference);
  if (!nr) return { error: "#REF!" };
  const sheet = ctx
    ? sheetName
      ? ctx.allSheets?.find((s) => sameSheetName(s.name, sheetName)) ?? null
      : ctx.sheet ?? null
    : null;
  if (sheetName && ctx && !sheet) return { error: "#REF!" };
  let endRow = nr.r2;
  if (nr.r2 >= MAX_ROWS - 1 && sheet) endRow = Math.min(nr.r2, Math.max(nr.r1, getLastUsedRow(sheet.cells)));
  const prefix = sheetName ? `${sheetName}!` : "";
  const rows = [];
  for (let r = nr.r1; r <= endRow; r++) {
    const row = [];
    for (let c = nr.c1; c <= nr.c2; c++) row.push(getCell(prefix + cellKey(r, c)));
    rows.push(row);
  }
  return { rows, nr, sheet, startRow: nr.r1, startCol: nr.c1 };
}

function wildcardToRegExp(pattern) {
  let out = "";
  for (let k = 0; k < pattern.length; k++) {
    const c = pattern[k];
    if (c === "~" && /[*?~]/.test(pattern[k + 1] ?? "")) out += "\\" + pattern[++k];
    else if (c === "*") out += "[\\s\\S]*";
    else if (c === "?") out += "[\\s\\S]";
    else out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

function lookupRank(v) {
  return typeof v === "number" ? 0 : typeof v === "string" ? 1 : typeof v === "boolean" ? 2 : 3;
}

// একটি সংখ্যা ও একটি সংখ্যা-মতো টেক্সট হলে দুটোকেই সংখ্যা ধরে (দুটোই টেক্সট হলে "007" ≠ "7" থাকে)
function coercePair(a, b) {
  if (typeof a === "number" && typeof b === "string") {
    const n = strictNumber(b);
    if (n !== null) return [a, n];
  } else if (typeof a === "string" && typeof b === "number") {
    const n = strictNumber(a);
    if (n !== null) return [n, b];
  }
  return [a, b];
}

// -1 / 0 / 1; ভিন্ন ধরনের মান হলে null
function compareLookup(x, y) {
  const [a, b] = coercePair(x, y);
  const ra = lookupRank(a);
  if (ra !== lookupRank(b)) return null;
  if (ra === 0) {
    const na = cleanNumber(a);
    const nb = cleanNumber(b);
    return na < nb ? -1 : na > nb ? 1 : 0;
  }
  if (ra === 1) {
    const sa = a.toLowerCase();
    const sb = b.toLowerCase();
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }
  if (ra === 2) return a === b ? 0 : a ? 1 : -1;
  return null;
}

// সঠিক মিল (MATCH টাইপ 0 / HLOOKUP exact): ছোট-বড় হাতের পার্থক্য নেই, টেক্সটে * ? ওয়াইল্ডকার্ড চলে
function lookupEquals(cell, look) {
  if (isFormulaError(cell)) return false;
  const [a, b] = coercePair(cell, look);
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  if (typeof a === "number" && typeof b === "number") return cleanNumber(a) === cleanNumber(b);
  if (a === "" || b === "") return false;
  if (typeof b === "string" && /[*?]/.test(b.replace(/~[*?~]/g, ""))) return wildcardToRegExp(b).test(String(a));
  return String(a).toLowerCase() === String(b).toLowerCase();
}

// আনুমানিক মিল: mode 1 → ≤ মানের মধ্যে শেষটি (ছোট→বড় সাজানো ধরে), mode -1 → ≥ মানের মধ্যে শেষটি
function approxIndex(values, look, mode) {
  let best = -1;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isFormulaError(v)) continue;
    const cmp = compareLookup(v, look);
    if (cmp === null) continue;
    if (mode > 0 ? cmp <= 0 : cmp >= 0) best = i;
  }
  return best;
}

// --- তারিখ (Excel সিরিয়াল; ১৯০০-০২-২৯ বাগসহ) ---
function ymdToSerial(y, m, d) {
  if (!Number.isFinite(y + m + d)) return "#NUM!";
  if (y < 0 || y > 9999) return "#NUM!";
  if (y <= 1899) y += 1900;
  if (y === 1900 && m === 2 && d === 29) return 60;
  const dt = new Date(0);
  dt.setUTCFullYear(y, m - 1, d);
  const t = dt.getTime();
  if (Number.isNaN(t)) return "#NUM!";
  let serial = Math.round((t - Date.UTC(1899, 11, 30)) / 86400000);
  if (serial <= 60) serial -= 1;
  if (serial < 0 || serial > MAX_DATE_SERIAL) return "#NUM!";
  return serial;
}

function serialToYMD(serial) {
  const s = Math.floor(serial);
  if (!Number.isFinite(s) || s < 0 || s > MAX_DATE_SERIAL) return null;
  if (s === 0) return { y: 1900, m: 1, d: 0 };
  if (s === 60) return { y: 1900, m: 2, d: 29 };
  const raw = s < 60 ? s + 1 : s;
  const dt = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// m (১-ভিত্তিক) মাসের শেষ দিন
function lastDayOfMonth(y, m) {
  const dt = new Date(0);
  dt.setUTCFullYear(y, m, 0);
  return dt.getUTCDate();
}

// --- পরিসংখ্যান / আর্থিক সহায়ক ---
function percentileOf(sortedAsc, k) {
  const pos = k * (sortedAsc.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return cleanNumber(sortedAsc[lo] + frac * (sortedAsc[hi] - sortedAsc[lo]));
}

// f(x)=0 এর মূল: প্রথমে নিউটন, না মিললে চিহ্ন-বদল খুঁজে বাইসেকশন। না পেলে null।
// পাওয়া মূল যাচাই করা হয় (|f(x)| ছোট ও x > -১ থেকে যথেষ্ট দূরে) — নইলে ভুয়া মূল বাদ।
function solveRoot(f, guess) {
  const scale = Math.max(Math.abs(f(0)), Math.abs(f(guess)), 1);
  const valid = (x) => Number.isFinite(x) && x > -0.99999 && Math.abs(f(x)) <= 1e-7 * scale;
  let x = guess;
  for (let i = 0; i < 100; i++) {
    const fx = f(x);
    if (!Number.isFinite(fx)) break;
    if (Math.abs(fx) < 1e-12 && valid(x)) return x;
    const h = 1e-6 * Math.max(1, Math.abs(x));
    const d = (f(x + h) - f(x - h)) / (2 * h);
    if (!Number.isFinite(d) || d === 0) break;
    let nx = x - fx / d;
    if (nx <= -1) nx = (x - 1) / 2;
    if (Math.abs(nx - x) < 1e-14 * Math.max(1, Math.abs(x))) {
      if (valid(nx)) return nx;
      break;
    }
    x = nx;
  }
  let prevX = -0.99999;
  let prevF = f(prevX);
  const steps = [];
  for (let v = -0.99; v < 10; v += 0.01) steps.push(v);
  for (let v = 10; v <= 1000; v += 1) steps.push(v);
  for (const cx of steps) {
    const cf = f(cx);
    if (Number.isFinite(prevF) && Number.isFinite(cf) && prevF * cf <= 0) {
      let lo = prevX;
      let hi = cx;
      let flo = prevF;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (flo * fm <= 0) hi = mid;
        else {
          lo = mid;
          flo = fm;
        }
      }
      const root = (lo + hi) / 2;
      return valid(root) ? root : null;
    }
    prevX = cx;
    prevF = cf;
  }
  return null;
}

// সংখ্যার তালিকা (SUM-এর নিয়মে): রেঞ্জ/রেফারেন্সে শুধু সংখ্যা, সরাসরি আর্গুমেন্টে সংখ্যা-টেক্সটও।
// ফেরত: { values } অথবা এরর-স্ট্রিং
function collectNumbers(argList, getCell, expandRange, evalFn, ctx) {
  const values = [];
  for (const a of argList) {
    if (a.kind === "range" || a.kind === "ref") {
      const g = readGrid(a, getCell, ctx);
      if (g.error) return g.error;
      for (const row of g.rows) {
        for (const v of row) {
          if (isFormulaError(v)) return v;
          if (typeof v === "number" && Number.isFinite(v)) values.push(v);
        }
      }
      continue;
    }
    const v = evalFn(a, getCell, expandRange);
    if (isFormulaError(v)) return v;
    const n = operandNumber(v);
    if (n === "#VALUE!") return "#VALUE!";
    values.push(n);
  }
  return { values };
}

/* ============================================================================
 * [ব্যাচ ৩] নতুন ফাংশন (প্রায় ৪০টি)
 *   রেফারেন্স/অ্যারে : OFFSET, INDIRECT, TRANSPOSE, ROWS, COLUMNS, TEXTSPLIT
 *   সময়/তারিখ       : HOUR, MINUTE, SECOND, TIME, NETWORKDAYS, WORKDAY, WEEKNUM
 *   গণিত            : FACT, GCD, LCM, MROUND, SIN, COS, TAN, ASIN, ACOS, ATAN, ATAN2, DEGREES, RADIANS
 *   পরিসংখ্যান      : CORREL, SLOPE, INTERCEPT, RSQ, FORECAST (+ FORECAST.LINEAR)
 *   টেক্সট          : CLEAN, CHAR, CODE, UNICODE, UNICHAR
 *   আর্থিক          : IPMT, PPMT, XNPV, XIRR
 *
 * OFFSET ও INDIRECT একটি আসল রেফারেন্স (ref/range) ফেরত দেয়: তাই SUM(OFFSET(A1,1,0,3,1)),
 * VLOOKUP(x,INDIRECT("A1:C9"),2,0) ইত্যাদি কাজ করে (rewriteDynamicArgs দুই evalNode-এ ডাকা হয়)।
 * TRANSPOSE / TEXTSPLIT অ্যাপের "single-cell mode" মেনে প্রথম মান ফেরত দেয়; INDEX/ROWS/COLUMNS-এর
 * ভেতরে দিলে পুরো অ্যারে ব্যবহৃত হয়: INDEX(TEXTSPLIT(A1,","),2), COLUMNS(TEXTSPLIT(A1,",")).
 * ========================================================================== */

const DYNAMIC_REF_FUNCTIONS = new Set(["OFFSET", "INDIRECT"]);
const ARRAY_FUNCTIONS = new Set(["TRANSPOSE", "TEXTSPLIT"]);
const MAX_COLS = 16384;

function buildRefNode(sheetName, r1, c1, r2, c2) {
  const prefix = sheetName ? `${sheetName}!` : "";
  if (r1 === r2 && c1 === c2) return { kind: "ref", value: prefix + cellKey(r1, c1) };
  return { kind: "range", value: `${prefix}${cellKey(r1, c1)}:${cellKey(r2, c2)}` };
}

function sheetMissing(ctx, sheetName) {
  return Boolean(sheetName && ctx && ctx.allSheets && !ctx.allSheets.find((s) => sameSheetName(s.name, sheetName)));
}

// INDIRECT / OFFSET (অথবা সরাসরি ref/range) → { node } বা { error } ; অন্য কিছু হলে null
function resolveDynamicRef(node, getCell, expandRange, evalFn, ctx) {
  if (node.kind === "ref" || node.kind === "range") return { node };
  if (node.kind !== "call") return null;
  const a = node.args;

  if (node.name === "INDIRECT") {
    if (a.length < 1 || a.length > 2) return { error: "#VALUE!" };
    const t = evalFn(a[0], getCell, expandRange);
    if (isFormulaError(t)) return { error: t };
    if (a[1]) {
      const mode = evalFn(a[1], getCell, expandRange);
      if (isFormulaError(mode)) return { error: mode };
      const isA1 = typeof mode === "boolean" ? mode : operandNumber(mode) !== 0;
      if (!isA1) return { error: "#REF!" }; // R1C1 শৈলী সমর্থিত নয়
    }
    const text = normalizeLocalizedDigits(String(t).trim());
    if (text === "") return { error: "#REF!" };
    let sheetName = null;
    let refPart = text;
    const bang = text.lastIndexOf("!");
    if (bang >= 0) {
      sheetName = text.slice(0, bang).trim();
      refPart = text.slice(bang + 1).trim();
      if (sheetName.length >= 2 && sheetName.startsWith("'") && sheetName.endsWith("'")) {
        sheetName = sheetName.slice(1, -1).replace(/''/g, "'");
      }
      if (sheetName === "") return { error: "#REF!" };
    }
    refPart = refPart.replace(/\$/g, "").toUpperCase();
    if (!/^(?:[A-Z]{1,3}\d+(?::[A-Z]{1,3}\d+)?|[A-Z]{1,3}:[A-Z]{1,3})$/.test(refPart)) return { error: "#REF!" };
    const nr = normalizeRange(refPart);
    if (!nr || nr.r1 < 0 || nr.c1 < 0 || nr.c2 >= MAX_COLS) return { error: "#REF!" };
    if (sheetMissing(ctx, sheetName)) return { error: "#REF!" };
    const prefix = sheetName ? `${sheetName}!` : "";
    return { node: { kind: refPart.includes(":") ? "range" : "ref", value: prefix + refPart } };
  }

  if (node.name === "OFFSET") {
    if (a.length < 3 || a.length > 5) return { error: "#VALUE!" };
    const base = resolveDynamicRef(a[0], getCell, expandRange, evalFn, ctx);
    if (!base) return { error: "#VALUE!" };
    if (base.error) return base;
    const { sheetName, reference } = splitSheetReference(base.node.value);
    const nr = normalizeRange(reference);
    if (!nr) return { error: "#REF!" };
    const ints = [];
    for (let i = 1; i < a.length; i++) {
      const v = evalFn(a[i], getCell, expandRange);
      if (isFormulaError(v)) return { error: v };
      const n = operandNumber(v);
      if (n === "#VALUE!") return { error: "#VALUE!" };
      ints.push(Math.trunc(n));
    }
    const dRow = ints[0];
    const dCol = ints[1];
    const height = a[3] ? ints[2] : nr.r2 - nr.r1 + 1;
    const width = a[4] ? ints[3] : nr.c2 - nr.c1 + 1;
    if (height < 1 || width < 1) return { error: "#REF!" };
    const r1 = nr.r1 + dRow;
    const c1 = nr.c1 + dCol;
    const r2 = r1 + height - 1;
    const c2 = c1 + width - 1;
    if (r1 < 0 || c1 < 0 || r2 >= MAX_ROWS || c2 >= MAX_COLS) return { error: "#REF!" };
    if (sheetMissing(ctx, sheetName)) return { error: "#REF!" };
    return { node: buildRefNode(sheetName, r1, c1, r2, c2) };
  }
  return null;
}

// কোনো ফাংশন-কলের আর্গুমেন্টে OFFSET/INDIRECT থাকলে সেটিকে আসল ref/range নোডে বদলে দেয়
export function rewriteDynamicArgs(node, getCell, expandRange, evalFn, ctx) {
  if (!node.args.some((a) => a.kind === "call" && DYNAMIC_REF_FUNCTIONS.has(a.name))) return node;
  const args = node.args.map((a) => {
    if (!(a.kind === "call" && DYNAMIC_REF_FUNCTIONS.has(a.name))) return a;
    const r = resolveDynamicRef(a, getCell, expandRange, evalFn, ctx);
    if (!r) return a;
    if (r.error) return { kind: "str", value: r.error };
    return r.node;
  });
  return { ...node, args };
}

// আর্গুমেন্ট → দ্বিমাত্রিক গ্রিড ({ rows } অথবা { error })
function gridOfArg(arg, getCell, expandRange, evalFn, ctx) {
  if (arg.kind === "call" && ARRAY_FUNCTIONS.has(arg.name)) return evalArrayNode(arg, getCell, expandRange, evalFn, ctx);
  if (arg.kind === "call" && DYNAMIC_REF_FUNCTIONS.has(arg.name)) {
    const r = resolveDynamicRef(arg, getCell, expandRange, evalFn, ctx);
    if (!r) return { error: "#VALUE!" };
    if (r.error) return { error: r.error };
    return readGrid(r.node, getCell, ctx) ?? { error: "#VALUE!" };
  }
  if (arg.kind === "range" || arg.kind === "ref") return readGrid(arg, getCell, ctx) ?? { error: "#VALUE!" };
  const v = evalFn(arg, getCell, expandRange);
  if (isFormulaError(v)) return { error: v };
  return { rows: [[v]] };
}

function splitByDelimiter(text, delim, caseInsensitive) {
  if (delim === "") return [text];
  const re = new RegExp(delim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseInsensitive ? "gi" : "g");
  return text.split(re);
}

// TRANSPOSE / TEXTSPLIT → { rows } অথবা { error }
function evalArrayNode(node, getCell, expandRange, evalFn, ctx) {
  const args = node.args;
  if (node.name === "TRANSPOSE") {
    if (args.length !== 1) return { error: "#VALUE!" };
    const g = gridOfArg(args[0], getCell, expandRange, evalFn, ctx);
    if (!g || g.error) return g ?? { error: "#VALUE!" };
    const width = g.rows[0].length;
    const rows = [];
    for (let c = 0; c < width; c++) rows.push(g.rows.map((r) => r[c]));
    return { rows };
  }
  // TEXTSPLIT(text, col_delimiter, [row_delimiter], [ignore_empty], [match_mode], [pad_with])
  if (args.length < 2 || args.length > 6) return { error: "#VALUE!" };
  const vals = args.map((a) => evalFn(a, getCell, expandRange));
  for (const v of vals) if (isFormulaError(v)) return { error: v };
  const asStr = (v) => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v));
  const text = asStr(vals[0]);
  const colDelim = asStr(vals[1]);
  const rowDelim = args[2] ? asStr(vals[2]) : "";
  if (colDelim === "" && rowDelim === "") return { error: "#VALUE!" };
  const ignoreEmpty = args[3] ? (typeof vals[3] === "boolean" ? vals[3] : Number(vals[3]) !== 0) : false;
  const matchMode = args[4] ? Number(vals[4]) : 0;
  if (args[4] && matchMode !== 0 && matchMode !== 1) return { error: "#VALUE!" };
  const pad = args[5] ? vals[5] : "#N/A";
  const ci = matchMode === 1;
  let rows = splitByDelimiter(text, rowDelim, ci).map((r) => splitByDelimiter(r, colDelim, ci));
  if (ignoreEmpty) rows = rows.map((r) => r.filter((x) => x !== "")).filter((r) => r.length > 0);
  if (rows.length === 0) return { error: "#VALUE!" };
  const width = Math.max(...rows.map((r) => r.length));
  rows = rows.map((r) => (r.length < width ? [...r, ...Array(width - r.length).fill(pad)] : r));
  return { rows };
}

// Windows-1252 এর 0x80–0x9F অংশ (CHAR/CODE)
const CP1252_HIGH = "\u20AC\u0081\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u008D\u017D\u008F\u0090\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u009D\u017E\u0178";

function gcdOf(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

// ঋণ-সূত্র (আর্থিক ফাংশনের সহায়ক)
function fvCalc(r, n, pmt, pv, type) {
  if (r === 0) return -(pv + pmt * n);
  const g = Math.pow(1 + r, n);
  return -(pv * g + (pmt * (1 + r * type) * (g - 1)) / r);
}
function pmtCalc(r, n, pv, fv, type) {
  if (r === 0) return -(pv + fv) / n;
  const g = Math.pow(1 + r, n);
  return -(r * (fv + pv * g)) / ((1 + r * type) * (g - 1));
}

export function evalMoreFunction(node, getCell, expandRange, evalFn, ctx) {
  const args = node.args;
  const argc = args.length;
  const ev = (i) => evalFn(args[i], getCell, expandRange);
  const evCtx = (a) => evalFn(a, getCell, expandRange);
  // সংখ্যা অথবা এরর-স্ট্রিং
  const numArg = (i) => {
    const v = ev(i);
    if (isFormulaError(v)) return v;
    return operandNumber(v);
  };
  // একাধিক সংখ্যা-আর্গুমেন্ট একসাথে: অ্যারে অথবা এরর-স্ট্রিং
  const numsOf = (idxs) => {
    const out = [];
    for (const i of idxs) {
      const n = numArg(i);
      if (typeof n === "string") return n;
      out.push(n);
    }
    return out;
  };
  const optNum = (i, def) => (args[i] ? numArg(i) : def);
  const asText = (v) => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v));
  const finiteOr = (n, err = "#NUM!") => (Number.isFinite(n) ? cleanNumber(n) : err);

  // তারিখ-আর্গুমেন্ট → সিরিয়াল সংখ্যা অথবা এরর-স্ট্রিং
  const dateArg = (i) => {
    const v = ev(i);
    if (isFormulaError(v)) return v;
    let n;
    if (typeof v === "number") n = v;
    else if (typeof v === "boolean") n = v ? 1 : 0;
    else if (v === "") n = 0;
    else {
      const t = String(v).trim();
      n = strictNumber(t);
      if (n === null) n = parseDateTextToSerial(t);
      if (n === null) return "#VALUE!";
    }
    if (!Number.isFinite(n)) return "#VALUE!";
    if (n < 0 || n > MAX_DATE_SERIAL + 1) return "#NUM!";
    return n;
  };

  switch (node.name) {
    // ------------------------------------------------------------------ লুকআপ
    case "INDEX": {
      if (argc < 2 || argc > 4) return "#VALUE!";
      const g =
        args[0].kind === "call" && ARRAY_FUNCTIONS.has(args[0].name)
          ? evalArrayNode(args[0], getCell, expandRange, evalFn, ctx)
          : readGrid(args[0], getCell, ctx);
      if (!g) return "#VALUE!";
      if (g.error) return g.error;
      const rN = numArg(1);
      if (typeof rN === "string") return rN;
      let cN = null;
      if (argc >= 3) {
        const c = numArg(2);
        if (typeof c === "string") return c;
        cN = Math.trunc(c);
      }
      let row = Math.trunc(rN);
      let col = cN;
      const h = g.rows.length;
      const w = g.rows[0].length;
      if (col === null) {
        if (h === 1) {
          col = row;
          row = 1;
        } else if (w === 1) {
          col = 1;
        } else {
          // একাধিক কলামের রেঞ্জে কলাম নম্বর ছাড়া পুরো সারি ফেরত দিতে হয় (স্পিল) — এখানে সমর্থিত নয়
          return "#VALUE!";
        }
      }
      if (row < 0 || col < 0) return "#VALUE!";
      if (row === 0 || col === 0) return "#VALUE!"; // পুরো সারি/কলাম (অ্যারে) সমর্থিত নয়
      if (row > h || col > w) return "#REF!";
      return g.rows[row - 1][col - 1];
    }
    case "MATCH": {
      if (argc < 2 || argc > 3) return "#VALUE!";
      const look = ev(0);
      if (isFormulaError(look)) return look;
      const g = readGrid(args[1], getCell, ctx);
      if (!g) return "#VALUE!";
      if (g.error) return g.error;
      if (g.rows.length > 1 && g.rows[0].length > 1) return "#N/A";
      const vec = g.rows.length === 1 ? g.rows[0] : g.rows.map((r) => r[0]);
      let type = 1;
      if (argc === 3) {
        const t = numArg(2);
        if (typeof t === "string") return t;
        type = Math.trunc(t);
      }
      const idx =
        type === 0
          ? vec.findIndex((v) => lookupEquals(v, look))
          : approxIndex(vec, look, type > 0 ? 1 : -1);
      return idx === -1 ? "#N/A" : idx + 1;
    }
    case "HLOOKUP": {
      if (argc < 3 || argc > 4) return "#VALUE!";
      const look = ev(0);
      if (isFormulaError(look)) return look;
      const g = readGrid(args[1], getCell, ctx);
      if (!g || args[1].kind !== "range") return "#VALUE!";
      if (g.error) return g.error;
      const rIdx = numArg(2);
      if (typeof rIdx === "string") return rIdx;
      const rowIndex = Math.trunc(rIdx);
      if (rowIndex < 1) return "#VALUE!";
      if (rowIndex > g.rows.length) return "#REF!";
      const approx = argc === 4 ? ev(3) : true;
      if (isFormulaError(approx)) return approx;
      const exact = typeof approx === "boolean" ? !approx : Number(approx) === 0;
      const firstRow = g.rows[0];
      const idx = exact ? firstRow.findIndex((v) => lookupEquals(v, look)) : approxIndex(firstRow, look, 1);
      return idx === -1 ? "#N/A" : g.rows[rowIndex - 1][idx];
    }
    case "CHOOSE": {
      if (argc < 2) return "#VALUE!";
      const n = numArg(0);
      if (typeof n === "string") return n;
      const idx = Math.trunc(n);
      if (idx < 1 || idx > argc - 1) return "#VALUE!";
      return ev(idx);
    }

    // ------------------------------------------------------------------ তারিখ
    case "DATE": {
      if (argc !== 3) return "#VALUE!";
      const r = numsOf([0, 1, 2]);
      if (typeof r === "string") return r;
      return ymdToSerial(Math.trunc(r[0]), Math.trunc(r[1]), Math.trunc(r[2]));
    }
    case "YEAR":
    case "MONTH":
    case "DAY": {
      if (argc !== 1) return "#VALUE!";
      const s = dateArg(0);
      if (typeof s === "string") return s;
      const p = serialToYMD(s);
      if (!p) return "#NUM!";
      return node.name === "YEAR" ? p.y : node.name === "MONTH" ? p.m : p.d;
    }
    case "WEEKDAY": {
      if (argc < 1 || argc > 2) return "#VALUE!";
      const s = dateArg(0);
      if (typeof s === "string") return s;
      const t = optNum(1, 1);
      if (typeof t === "string") return t;
      const type = Math.trunc(t);
      const sun0 = ((((Math.floor(s) - 1) % 7) + 7) % 7); // 0 = রবিবার
      if (type === 1) return sun0 + 1;
      if (type === 2) return ((sun0 + 6) % 7) + 1;
      if (type === 3) return (sun0 + 6) % 7;
      if (type >= 11 && type <= 17) {
        const startSun0 = type === 17 ? 0 : type - 10; // 11 = সোমবার ... 17 = রবিবার
        return ((sun0 - startSun0 + 7) % 7) + 1;
      }
      return "#NUM!";
    }
    case "EOMONTH":
    case "EDATE": {
      if (argc !== 2) return "#VALUE!";
      const s = dateArg(0);
      if (typeof s === "string") return s;
      const mRaw = numArg(1);
      if (typeof mRaw === "string") return mRaw;
      const p = serialToYMD(s);
      if (!p) return "#NUM!";
      const total = p.y * 12 + (p.m - 1) + Math.trunc(mRaw);
      const ty = Math.floor(total / 12);
      const tm = (((total % 12) + 12) % 12) + 1;
      if (node.name === "EOMONTH") return ymdToSerial(ty, tm + 1, 0);
      return ymdToSerial(ty, tm, Math.min(p.d, lastDayOfMonth(ty, tm)));
    }
    case "DAYS": {
      if (argc !== 2) return "#VALUE!";
      const e = dateArg(0);
      if (typeof e === "string") return e;
      const s = dateArg(1);
      if (typeof s === "string") return s;
      return Math.floor(e) - Math.floor(s);
    }
    case "DATEDIF": {
      if (argc !== 3) return "#VALUE!";
      const s = dateArg(0);
      if (typeof s === "string") return s;
      const e = dateArg(1);
      if (typeof e === "string") return e;
      const uRaw = ev(2);
      if (isFormulaError(uRaw)) return uRaw;
      const unit = String(uRaw).trim().toUpperCase();
      const s0 = Math.floor(s);
      const e0 = Math.floor(e);
      if (s0 > e0) return "#NUM!";
      const a = serialToYMD(s0);
      const b = serialToYMD(e0);
      if (!a || !b) return "#NUM!";
      const dayBefore = b.d < a.d;
      if (unit === "D") return e0 - s0;
      if (unit === "M") return (b.y - a.y) * 12 + (b.m - a.m) - (dayBefore ? 1 : 0);
      if (unit === "Y") return b.y - a.y - (b.m < a.m || (b.m === a.m && dayBefore) ? 1 : 0);
      if (unit === "YM") {
        const m = b.m - a.m - (dayBefore ? 1 : 0);
        return m < 0 ? m + 12 : m;
      }
      if (unit === "MD") {
        if (!dayBefore) return b.d - a.d;
        const py = b.m === 1 ? b.y - 1 : b.y;
        const pm = b.m === 1 ? 12 : b.m - 1;
        return b.d + lastDayOfMonth(py, pm) - a.d;
      }
      if (unit === "YD") {
        let start = ymdToSerial(b.y, a.m, a.d);
        if (typeof start === "number" && start > e0) start = ymdToSerial(b.y - 1, a.m, a.d);
        return typeof start === "number" ? e0 - start : start;
      }
      return "#NUM!";
    }

    // ------------------------------------------------------------ গণনা / শর্ত
    case "COUNTBLANK": {
      if (argc !== 1) return "#VALUE!";
      const g = readGrid(args[0], getCell, ctx);
      if (!g) return "#VALUE!";
      if (g.error) return g.error;
      let n = 0;
      for (const row of g.rows) for (const v of row) if (v === "") n++;
      return n;
    }
    case "MAXIFS":
    case "MINIFS": {
      if (argc < 3 || argc % 2 === 0) return "#VALUE!";
      const target = readGrid(args[0], getCell, ctx);
      if (!target) return "#VALUE!";
      if (target.error) return target.error;
      const targetVals = target.rows.flat();
      const conds = [];
      for (let i = 1; i < argc; i += 2) {
        const g = readGrid(args[i], getCell, ctx);
        if (!g) return "#VALUE!";
        if (g.error) return g.error;
        const vals = g.rows.flat();
        if (vals.length !== targetVals.length) return "#VALUE!";
        const criterion = ev(i + 1);
        if (isFormulaError(criterion)) return criterion;
        conds.push({ vals, criterion });
      }
      let best = null;
      for (let k = 0; k < targetVals.length; k++) {
        const v = targetVals[k];
        if (typeof v !== "number" || !Number.isFinite(v)) continue;
        if (!conds.every((c) => matchesCriterion(c.vals[k], c.criterion))) continue;
        if (best === null || (node.name === "MAXIFS" ? v > best : v < best)) best = v;
      }
      return best === null ? 0 : cleanNumber(best);
    }
    case "SUBTOTAL": {
      if (argc < 2) return "#VALUE!";
      const fRaw = numArg(0);
      if (typeof fRaw === "string") return fRaw;
      const code = Math.trunc(fRaw);
      const ignoreManualHidden = code >= 101 && code <= 111;
      const fn = ignoreManualHidden ? code - 100 : code;
      if (fn < 1 || fn > 11) return "#VALUE!";
      const values = [];
      let nonEmpty = 0;
      for (let i = 1; i < argc; i++) {
        const a = args[i];
        if (a.kind === "range" || a.kind === "ref") {
          const g = readGrid(a, getCell, ctx);
          if (g.error) return g.error;
          const hidden = new Set(g.sheet?.hiddenRows ?? []);
          const filterActive = Object.keys(g.sheet?.filters ?? {}).length > 0;
          for (let ri = 0; ri < g.rows.length; ri++) {
            const r = g.startRow + ri;
            // ১-১১: ফিল্টারে লুকানো সারি বাদ; ১০১-১১১: সব লুকানো সারি বাদ
            if (hidden.has(r) && (ignoreManualHidden || filterActive)) continue;
            for (let ci = 0; ci < g.rows[ri].length; ci++) {
              const raw = g.sheet?.cells?.[cellKey(r, g.startCol + ci)]?.value;
              // অন্য SUBTOTAL ফর্মুলার সেল বাদ (দ্বিগুণ গণনা এড়াতে)
              if (typeof raw === "string" && raw.startsWith("=") && /\bSUBTOTAL\s*\(/i.test(raw)) continue;
              const v = g.rows[ri][ci];
              if (isFormulaError(v)) return v;
              if (typeof v === "number" && Number.isFinite(v)) values.push(v);
              if (v !== "") nonEmpty++;
            }
          }
          continue;
        }
        const v = evCtx(a);
        if (isFormulaError(v)) return v;
        const n = operandNumber(v);
        if (n === "#VALUE!") return "#VALUE!";
        values.push(n);
        nonEmpty++;
      }
      const n = values.length;
      const sum = () => values.reduce((s, v) => s + v, 0);
      const variance = (sample) => {
        const mean = sum() / n;
        return values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (sample ? n - 1 : n);
      };
      switch (fn) {
        case 1: return n === 0 ? "#DIV/0!" : cleanNumber(sum() / n);
        case 2: return n;
        case 3: return nonEmpty;
        case 4: return n === 0 ? 0 : values.reduce((m, v) => (v > m ? v : m), -Infinity);
        case 5: return n === 0 ? 0 : values.reduce((m, v) => (v < m ? v : m), Infinity);
        case 6: return n === 0 ? 0 : finiteOr(values.reduce((p, v) => p * v, 1));
        case 7: return n < 2 ? "#DIV/0!" : cleanNumber(Math.sqrt(variance(true)));
        case 8: return n < 1 ? "#DIV/0!" : cleanNumber(Math.sqrt(variance(false)));
        case 9: return cleanNumber(sum());
        case 10: return n < 2 ? "#DIV/0!" : cleanNumber(variance(true));
        default: return n < 1 ? "#DIV/0!" : cleanNumber(variance(false));
      }
    }

    // ------------------------------------------------------------ তথ্য / লজিক
    case "ISERROR":
    case "ISERR":
    case "ISNA": {
      if (argc !== 1) return "#VALUE!";
      const v = ev(0);
      if (node.name === "ISNA") return v === "#N/A";
      if (node.name === "ISERR") return isFormulaError(v) && v !== "#N/A";
      return isFormulaError(v);
    }
    case "ISTEXT": {
      if (argc !== 1) return "#VALUE!";
      if (args[0].kind === "ref") {
        const v = getCell(args[0].value);
        return typeof v === "string" && v !== "" && !isFormulaError(v);
      }
      const v = ev(0);
      return typeof v === "string" && !isFormulaError(v);
    }
    case "IFNA": {
      if (argc !== 2) return "#VALUE!";
      const v = ev(0);
      return v === "#N/A" ? ev(1) : v;
    }

    // ------------------------------------------------------------------- গণিত
    case "LOG": {
      if (argc < 1 || argc > 2) return "#VALUE!";
      const r = numsOf(argc === 2 ? [0, 1] : [0]);
      if (typeof r === "string") return r;
      const x = r[0];
      const base = argc === 2 ? r[1] : 10;
      if (x <= 0 || base <= 0) return "#NUM!";
      if (base === 1) return "#DIV/0!";
      if (base === 10) return finiteOr(Math.log10(x));
      if (base === 2) return finiteOr(Math.log2(x));
      return finiteOr(Math.log(x) / Math.log(base));
    }
    case "LOG10":
    case "LN": {
      if (argc !== 1) return "#VALUE!";
      const x = numArg(0);
      if (typeof x === "string") return x;
      if (x <= 0) return "#NUM!";
      return finiteOr(node.name === "LN" ? Math.log(x) : Math.log10(x));
    }
    case "EXP": {
      if (argc !== 1) return "#VALUE!";
      const x = numArg(0);
      if (typeof x === "string") return x;
      return finiteOr(Math.exp(x));
    }
    case "PI": {
      if (argc !== 0) return "#VALUE!";
      return Math.PI;
    }
    case "SIGN": {
      if (argc !== 1) return "#VALUE!";
      const x = numArg(0);
      if (typeof x === "string") return x;
      return x > 0 ? 1 : x < 0 ? -1 : 0;
    }
    case "TRUNC": {
      if (argc < 1 || argc > 2) return "#VALUE!";
      const x = numArg(0);
      if (typeof x === "string") return x;
      const d = optNum(1, 0);
      if (typeof d === "string") return d;
      const digits = Math.trunc(d);
      if (digits > 15) return cleanNumber(x);
      const f = Math.pow(10, digits);
      const t = Math.trunc(cleanNumber(x * f)) / f;
      return finiteOr(t === 0 ? 0 : t);
    }
    case "RANDBETWEEN": {
      if (argc !== 2) return "#VALUE!";
      const r = numsOf([0, 1]);
      if (typeof r === "string") return r;
      const lo = Math.ceil(r[0]);
      const hi = Math.floor(r[1]);
      if (lo > hi) return "#NUM!";
      return lo + Math.floor(Math.random() * (hi - lo + 1));
    }

    // ----------------------------------------------------------------- আর্থিক
    case "FV": {
      if (argc < 3 || argc > 5) return "#VALUE!";
      const r = numsOf([0, 1, 2]);
      if (typeof r === "string") return r;
      const pv = optNum(3, 0);
      if (typeof pv === "string") return pv;
      const typeRaw = optNum(4, 0);
      if (typeof typeRaw === "string") return typeRaw;
      const [rate, nper, pmt] = r;
      const type = typeRaw !== 0 ? 1 : 0;
      if (rate === 0) return finiteOr(-(pv + pmt * nper));
      const g = Math.pow(1 + rate, nper);
      return finiteOr(-(pv * g + (pmt * (1 + rate * type) * (g - 1)) / rate));
    }
    case "PV": {
      if (argc < 3 || argc > 5) return "#VALUE!";
      const r = numsOf([0, 1, 2]);
      if (typeof r === "string") return r;
      const fv = optNum(3, 0);
      if (typeof fv === "string") return fv;
      const typeRaw = optNum(4, 0);
      if (typeof typeRaw === "string") return typeRaw;
      const [rate, nper, pmt] = r;
      const type = typeRaw !== 0 ? 1 : 0;
      if (rate === 0) return finiteOr(-(fv + pmt * nper));
      const g = Math.pow(1 + rate, nper);
      return finiteOr(-(fv + (pmt * (1 + rate * type) * (g - 1)) / rate) / g);
    }
    case "NPER": {
      if (argc < 3 || argc > 5) return "#VALUE!";
      const r = numsOf([0, 1, 2]);
      if (typeof r === "string") return r;
      const fv = optNum(3, 0);
      if (typeof fv === "string") return fv;
      const typeRaw = optNum(4, 0);
      if (typeof typeRaw === "string") return typeRaw;
      const [rate, pmt, pv] = r;
      const type = typeRaw !== 0 ? 1 : 0;
      if (rate === 0) return pmt === 0 ? "#NUM!" : finiteOr(-(pv + fv) / pmt);
      const adj = pmt * (1 + rate * type);
      const ratio = (adj - fv * rate) / (adj + pv * rate);
      if (!(ratio > 0)) return "#NUM!";
      return finiteOr(Math.log(ratio) / Math.log(1 + rate));
    }
    case "NPV": {
      if (argc < 2) return "#VALUE!";
      const rate = numArg(0);
      if (typeof rate === "string") return rate;
      if (rate === -1) return "#DIV/0!";
      const got = collectNumbers(args.slice(1), getCell, expandRange, evalFn, ctx);
      if (typeof got === "string") return got;
      let total = 0;
      got.values.forEach((v, i) => {
        total += v / Math.pow(1 + rate, i + 1);
      });
      return finiteOr(total);
    }
    case "IRR": {
      if (argc < 1 || argc > 2) return "#VALUE!";
      const got = collectNumbers([args[0]], getCell, expandRange, evalFn, ctx);
      if (typeof got === "string") return got;
      const guess = optNum(1, 0.1);
      if (typeof guess === "string") return guess;
      const vals = got.values;
      if (!vals.some((v) => v > 0) || !vals.some((v) => v < 0)) return "#NUM!";
      const f = (r) => vals.reduce((s, v, i) => s + v / Math.pow(1 + r, i), 0);
      const root = solveRoot(f, guess);
      return root === null ? "#NUM!" : finiteOr(root);
    }
    case "RATE": {
      if (argc < 3 || argc > 6) return "#VALUE!";
      const r = numsOf([0, 1, 2]);
      if (typeof r === "string") return r;
      const fv = optNum(3, 0);
      if (typeof fv === "string") return fv;
      const typeRaw = optNum(4, 0);
      if (typeof typeRaw === "string") return typeRaw;
      const guess = optNum(5, 0.1);
      if (typeof guess === "string") return guess;
      const [nper, pmt, pv] = r;
      if (nper <= 0) return "#NUM!";
      const type = typeRaw !== 0 ? 1 : 0;
      const f = (rate) => {
        if (Math.abs(rate) < 1e-12) return pv + pmt * nper + fv;
        const g = Math.pow(1 + rate, nper);
        return pv * g + (pmt * (1 + rate * type) * (g - 1)) / rate + fv;
      };
      const root = solveRoot(f, guess);
      return root === null ? "#NUM!" : finiteOr(root);
    }

    // ------------------------------------------------------------------ টেক্সট
    case "REPLACE": {
      if (argc !== 4) return "#VALUE!";
      const oldV = ev(0);
      if (isFormulaError(oldV)) return oldV;
      const nums = numsOf([1, 2]);
      if (typeof nums === "string") return nums;
      const newV = ev(3);
      if (isFormulaError(newV)) return newV;
      const start = Math.trunc(nums[0]);
      const count = Math.trunc(nums[1]);
      if (start < 1 || count < 0) return "#VALUE!";
      const text = asText(oldV);
      const out = text.slice(0, start - 1) + asText(newV) + text.slice(start - 1 + count);
      return out.length > MAX_TEXT_LENGTH ? "#VALUE!" : out;
    }
    case "REPT": {
      if (argc !== 2) return "#VALUE!";
      const t = ev(0);
      if (isFormulaError(t)) return t;
      const n = numArg(1);
      if (typeof n === "string") return n;
      const times = Math.trunc(n);
      if (times < 0) return "#VALUE!";
      const text = asText(t);
      if (text.length * times > MAX_TEXT_LENGTH) return "#VALUE!";
      return text.repeat(times);
    }
    case "EXACT": {
      if (argc !== 2) return "#VALUE!";
      const a = ev(0);
      if (isFormulaError(a)) return a;
      const b = ev(1);
      if (isFormulaError(b)) return b;
      return asText(a) === asText(b);
    }

    // ------------------------------------------------------------- পরিসংখ্যান
    case "PERCENTILE":
    case "PERCENTILE.INC": {
      if (argc !== 2) return "#VALUE!";
      const got = collectNumbers([args[0]], getCell, expandRange, evalFn, ctx);
      if (typeof got === "string") return got;
      const k = numArg(1);
      if (typeof k === "string") return k;
      if (got.values.length === 0 || k < 0 || k > 1) return "#NUM!";
      return percentileOf([...got.values].sort((a, b) => a - b), k);
    }
    case "QUARTILE":
    case "QUARTILE.INC": {
      if (argc !== 2) return "#VALUE!";
      const got = collectNumbers([args[0]], getCell, expandRange, evalFn, ctx);
      if (typeof got === "string") return got;
      const q = numArg(1);
      if (typeof q === "string") return q;
      const quart = Math.trunc(q);
      if (got.values.length === 0 || quart < 0 || quart > 4) return "#NUM!";
      return percentileOf([...got.values].sort((a, b) => a - b), quart / 4);
    }
    case "MODE":
    case "MODE.SNGL": {
      if (argc < 1) return "#VALUE!";
      const got = collectNumbers(args, getCell, expandRange, evalFn, ctx);
      if (typeof got === "string") return got;
      const counts = new Map();
      for (const v of got.values) counts.set(v, (counts.get(v) ?? 0) + 1);
      let best = null;
      let bestCount = 1;
      for (const [v, c] of counts) {
        if (c > bestCount) {
          best = v;
          bestCount = c;
        }
      }
      return best === null ? "#N/A" : best;
    }
    // ======================================================== [ব্যাচ ৩]
    // ---------------------------------------------------- রেফারেন্স / অ্যারে
    case "OFFSET":
    case "INDIRECT": {
      const r = resolveDynamicRef(node, getCell, expandRange, evalFn, ctx);
      if (!r) return "#VALUE!";
      if (r.error) return r.error;
      return evalFn(r.node, getCell, expandRange);
    }
    case "TRANSPOSE":
    case "TEXTSPLIT": {
      const g = evalArrayNode(node, getCell, expandRange, evalFn, ctx);
      if (g.error) return g.error;
      return g.rows[0][0];
    }
    case "ROWS":
    case "COLUMNS": {
      if (argc !== 1) return "#VALUE!";
      const a0 = args[0];
      const isRows = node.name === "ROWS";
      if (a0.kind === "ref" || a0.kind === "range") {
        const { sheetName, reference } = splitSheetReference(a0.value);
        const nr = normalizeRange(reference);
        if (!nr) return "#REF!";
        if (sheetMissing(ctx, sheetName)) return "#REF!";
        if (isRows) return nr.r2 >= MAX_ROWS - 1 ? 1048576 - nr.r1 : nr.r2 - nr.r1 + 1;
        return nr.c2 - nr.c1 + 1;
      }
      const g = gridOfArg(a0, getCell, expandRange, evalFn, ctx);
      if (g.error) return g.error;
      return isRows ? g.rows.length : g.rows[0].length;
    }

    // ---------------------------------------------------- সময় / তারিখ
    case "HOUR":
    case "MINUTE":
    case "SECOND": {
      if (argc !== 1) return "#VALUE!";
      const v = ev(0);
      if (isFormulaError(v)) return v;
      let n;
      if (typeof v === "number") n = v;
      else if (typeof v === "boolean") n = v ? 1 : 0;
      else if (v === "") n = 0;
      else {
        const t = normalizeLocalizedDigits(String(v).trim());
        n = strictNumber(t);
        if (n === null) {
          const m = /(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*([AaPp][Mm])?$/.exec(t);
          if (m) {
            let h = Number(m[1]);
            const mi = Number(m[2]);
            const se = m[3] ? Number(m[3]) : 0;
            if (m[4]) {
              if (h < 1 || h > 12) return "#VALUE!";
              h = (h % 12) + (/^p/i.test(m[4]) ? 12 : 0);
            }
            if (h > 23 || mi > 59 || se > 59) return "#VALUE!";
            n = (h * 3600 + mi * 60 + se) / 86400;
          } else {
            n = parseDateTextToSerial(t);
            if (n === null) return "#VALUE!";
          }
        }
      }
      if (!Number.isFinite(n)) return "#VALUE!";
      if (n < 0 || n > MAX_DATE_SERIAL + 1) return "#NUM!";
      let secs = Math.round((n - Math.floor(n)) * 86400);
      if (secs >= 86400) secs -= 86400;
      if (node.name === "HOUR") return Math.floor(secs / 3600);
      if (node.name === "MINUTE") return Math.floor((secs % 3600) / 60);
      return secs % 60;
    }
    case "TIME": {
      if (argc !== 3) return "#VALUE!";
      const t = numsOf([0, 1, 2]);
      if (typeof t === "string") return t;
      const [h, mi, se] = t.map((x) => Math.trunc(x));
      if (h < 0 || mi < 0 || se < 0 || h > 32767 || mi > 32767 || se > 32767) return "#NUM!";
      const total = (h * 3600 + mi * 60 + se) % 86400;
      return cleanNumber(total / 86400);
    }
    case "NETWORKDAYS":
    case "WORKDAY":
    {
      const isNet = node.name === "NETWORKDAYS";
      if (argc < 2 || argc > 3) return "#VALUE!";
      const s0 = dateArg(0);
      if (typeof s0 === "string") return s0;
      let other;
      if (isNet) {
        other = dateArg(1);
        if (typeof other === "string") return other;
      } else {
        other = numArg(1);
        if (typeof other === "string") return other;
      }
      // ছুটির তালিকা
      const holidays = new Set();
      if (args[2]) {
        const h = args[2];
        if (h.kind === "range" || h.kind === "ref") {
          const g = readGrid(h, getCell, ctx);
          if (!g) return "#VALUE!";
          if (g.error) return g.error;
          for (const row of g.rows) {
            for (const cell of row) {
              if (isFormulaError(cell)) return cell;
              if (cell === "") continue;
              let d = null;
              if (typeof cell === "number") d = cell;
              else if (typeof cell === "string") d = strictNumber(cell.trim()) ?? parseDateTextToSerial(cell.trim());
              if (d === null || !Number.isFinite(d)) return "#VALUE!";
              holidays.add(Math.floor(d));
            }
          }
        } else {
          const d = dateArg(2);
          if (typeof d === "string") return d;
          holidays.add(Math.floor(d));
        }
      }
      const sun0Of = (d) => (((d - 1) % 7) + 7) % 7;
      const isWork = (d) => {
        const w = sun0Of(d);
        return w !== 0 && w !== 6 && !holidays.has(d);
      };
      const start = Math.floor(s0);
      if (isNet) {
        const end = Math.floor(other);
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        const full = Math.floor((hi - lo + 1) / 7);
        let count = full * 5;
        for (let d = lo + full * 7; d <= hi; d++) {
          const w = sun0Of(d);
          if (w !== 0 && w !== 6) count++;
        }
        for (const hd of holidays) {
          if (hd >= lo && hd <= hi) {
            const w = sun0Of(hd);
            if (w !== 0 && w !== 6) count--;
          }
        }
        return start <= end ? count : -count;
      }
      const days = Math.trunc(other);
      if (Math.abs(days) > 1000000) return "#NUM!";
      const step = days < 0 ? -1 : 1;
      let remaining = Math.abs(days);
      let d = start;
      while (remaining > 0) {
        d += step;
        if (d < 0 || d > MAX_DATE_SERIAL) return "#NUM!";
        if (isWork(d)) remaining--;
      }
      return d;
    }
    case "WEEKNUM": {
      if (argc < 1 || argc > 2) return "#VALUE!";
      const s = dateArg(0);
      if (typeof s === "string") return s;
      const t = optNum(1, 1);
      if (typeof t === "string") return t;
      const type = Math.trunc(t);
      const serial = Math.floor(s);
      const p = serialToYMD(serial);
      if (!p) return "#NUM!";
      const sun0Of = (d) => (((d - 1) % 7) + 7) % 7;
      if (type === 21) {
        const isoDow = ((sun0Of(serial) + 6) % 7) + 1; // সোম = ১ ... রবি = ৭
        const thursday = serial + (4 - isoDow);
        const tp = serialToYMD(thursday);
        if (!tp) return "#NUM!";
        const jan1 = ymdToSerial(tp.y, 1, 1);
        return Math.floor((thursday - jan1) / 7) + 1;
      }
      const startDay = { 1: 0, 2: 1, 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6, 17: 0 }[type];
      if (startDay === undefined) return "#NUM!";
      const jan1 = ymdToSerial(p.y, 1, 1);
      const off = (sun0Of(jan1) - startDay + 7) % 7;
      return Math.floor((serial - jan1 + off) / 7) + 1;
    }

    // ---------------------------------------------------- গণিত
    case "FACT": {
      if (argc !== 1) return "#VALUE!";
      const n = numArg(0);
      if (typeof n === "string") return n;
      const k = Math.trunc(n);
      if (k < 0 || k > 170) return "#NUM!";
      let f = 1;
      for (let i = 2; i <= k; i++) f *= i;
      return f;
    }
    case "GCD":
    case "LCM": {
      if (argc < 1) return "#VALUE!";
      const got = collectNumbers(args, getCell, expandRange, evalFn, ctx);
      if (typeof got === "string") return got;
      const nums = got.values.map((x) => Math.trunc(x));
      if (nums.length === 0) return "#VALUE!";
      if (nums.some((x) => x < 0 || x > Number.MAX_SAFE_INTEGER)) return "#NUM!";
      if (node.name === "GCD") return nums.reduce((acc, x) => gcdOf(acc, x), 0);
      let l = 1;
      for (const x of nums) {
        if (x === 0) return 0;
        l = (l / gcdOf(l, x)) * x;
        if (!Number.isSafeInteger(l)) return "#NUM!";
      }
      return l;
    }
    case "MROUND": {
      if (argc !== 2) return "#VALUE!";
      const r = numsOf([0, 1]);
      if (typeof r === "string") return r;
      const [n, m] = r;
      if (m === 0) return 0;
      if (n * m < 0) return "#NUM!";
      const q = cleanNumber(n / m);
      return finiteOr(roundHalfAway(q, 0) * m);
    }
    case "SIN":
    case "COS":
    case "TAN":
    case "ASIN":
    case "ACOS":
    case "ATAN":
    case "DEGREES":
    case "RADIANS": {
      if (argc !== 1) return "#VALUE!";
      const x = numArg(0);
      if (typeof x === "string") return x;
      switch (node.name) {
        case "SIN": return finiteOr(Math.sin(x));
        case "COS": return finiteOr(Math.cos(x));
        case "TAN": return finiteOr(Math.tan(x));
        case "ASIN": return x < -1 || x > 1 ? "#NUM!" : finiteOr(Math.asin(x));
        case "ACOS": return x < -1 || x > 1 ? "#NUM!" : finiteOr(Math.acos(x));
        case "ATAN": return finiteOr(Math.atan(x));
        case "DEGREES": return finiteOr((x * 180) / Math.PI);
        default: return finiteOr((x * Math.PI) / 180);
      }
    }
    case "ATAN2": {
      if (argc !== 2) return "#VALUE!";
      const r = numsOf([0, 1]);
      if (typeof r === "string") return r;
      if (r[0] === 0 && r[1] === 0) return "#DIV/0!";
      return finiteOr(Math.atan2(r[1], r[0])); // Excel: ATAN2(x, y)
    }

    // ---------------------------------------------------- পরিসংখ্যান (জোড়া অ্যারে)
    case "CORREL":
    case "SLOPE":
    case "INTERCEPT":
    case "RSQ":
    case "FORECAST":
    case "FORECAST.LINEAR": {
      const isForecast = node.name === "FORECAST" || node.name === "FORECAST.LINEAR";
      if (isForecast ? argc !== 3 : argc !== 2) return "#VALUE!";
      const xi = isForecast ? numArg(0) : 0;
      if (typeof xi === "string") return xi;
      const ia = isForecast ? 1 : 0;
      const ib = isForecast ? 2 : 1;
      const flat = (arg) => {
        if (arg.kind !== "range" && arg.kind !== "ref") return "#VALUE!";
        const g = readGrid(arg, getCell, ctx);
        if (!g) return "#VALUE!";
        if (g.error) return g.error;
        return { cells: g.rows.flat() };
      };
      const fa = flat(args[ia]);
      if (typeof fa === "string") return fa;
      const fb = flat(args[ib]);
      if (typeof fb === "string") return fb;
      if (fa.cells.length !== fb.cells.length) return "#N/A";
      const as = [];
      const bs = [];
      for (let i = 0; i < fa.cells.length; i++) {
        const p = fa.cells[i];
        const q = fb.cells[i];
        if (isFormulaError(p)) return p;
        if (isFormulaError(q)) return q;
        if (typeof p === "number" && Number.isFinite(p) && typeof q === "number" && Number.isFinite(q)) {
          as.push(p);
          bs.push(q);
        }
      }
      const n = as.length;
      if (n < 2) return "#DIV/0!";
      const meanA = as.reduce((s, v) => s + v, 0) / n;
      const meanB = bs.reduce((s, v) => s + v, 0) / n;
      let saa = 0;
      let sbb = 0;
      let sab = 0;
      for (let i = 0; i < n; i++) {
        const da = as[i] - meanA;
        const db = bs[i] - meanB;
        saa += da * da;
        sbb += db * db;
        sab += da * db;
      }
      if (node.name === "CORREL" || node.name === "RSQ") {
        if (saa === 0 || sbb === 0) return "#DIV/0!";
        const r = sab / Math.sqrt(saa * sbb);
        return finiteOr(node.name === "RSQ" ? r * r : r);
      }
      // SLOPE/INTERCEPT/FORECAST: প্রথম অ্যারে = known_y, দ্বিতীয় = known_x
      if (sbb === 0) return "#DIV/0!";
      const slope = sab / sbb;
      const intercept = meanA - slope * meanB;
      if (node.name === "SLOPE") return finiteOr(slope);
      if (node.name === "INTERCEPT") return finiteOr(intercept);
      return finiteOr(intercept + slope * xi);
    }

    // ---------------------------------------------------- টেক্সট
    case "CLEAN": {
      if (argc !== 1) return "#VALUE!";
      const v = ev(0);
      if (isFormulaError(v)) return v;
      return asText(v).replace(/[\u0000-\u001F]/g, "");
    }
    case "CHAR": {
      if (argc !== 1) return "#VALUE!";
      const n = numArg(0);
      if (typeof n === "string") return n;
      const k = Math.trunc(n);
      if (k < 1 || k > 255) return "#VALUE!";
      return k >= 128 && k <= 159 ? CP1252_HIGH[k - 128] : String.fromCharCode(k);
    }
    case "CODE":
    case "UNICODE": {
      if (argc !== 1) return "#VALUE!";
      const v = ev(0);
      if (isFormulaError(v)) return v;
      const t = asText(v);
      if (t === "") return "#VALUE!";
      const cp = t.codePointAt(0);
      if (node.name === "CODE") {
        const hi = CP1252_HIGH.indexOf(String.fromCharCode(cp));
        if (hi >= 0) return 128 + hi;
      }
      return cp;
    }
    case "UNICHAR": {
      if (argc !== 1) return "#VALUE!";
      const n = numArg(0);
      if (typeof n === "string") return n;
      const k = Math.trunc(n);
      if (k < 1 || k > 0x10ffff || (k >= 0xd800 && k <= 0xdfff)) return "#VALUE!";
      return String.fromCodePoint(k);
    }

    // ---------------------------------------------------- আর্থিক
    case "IPMT":
    case "PPMT": {
      if (argc < 4 || argc > 6) return "#VALUE!";
      const r = numsOf([0, 1, 2, 3]);
      if (typeof r === "string") return r;
      const fvRaw = optNum(4, 0);
      if (typeof fvRaw === "string") return fvRaw;
      const typeRaw = optNum(5, 0);
      if (typeof typeRaw === "string") return typeRaw;
      const [rate, perRaw, nper, pv] = r;
      const per = Math.trunc(perRaw);
      const type = typeRaw !== 0 ? 1 : 0;
      if (nper <= 0 || per < 1 || per > nper) return "#NUM!";
      const pmt = pmtCalc(rate, nper, pv, fvRaw, type);
      let ip;
      if (rate === 0) ip = 0;
      else if (per === 1) ip = type ? 0 : -pv * rate;
      else if (type) ip = (fvCalc(rate, per - 2, pmt, pv, 1) - pmt) * rate;
      else ip = fvCalc(rate, per - 1, pmt, pv, 0) * rate;
      return finiteOr(node.name === "IPMT" ? ip : pmt - ip);
    }
    case "XNPV":
    case "XIRR": {
      const isNpv = node.name === "XNPV";
      if (isNpv ? argc !== 3 : argc < 2 || argc > 3) return "#VALUE!";
      const rateOrGuess = isNpv ? numArg(0) : optNum(2, 0.1);
      if (typeof rateOrGuess === "string") return rateOrGuess;
      const vi = isNpv ? 1 : 0;
      const di = isNpv ? 2 : 1;
      const cellsOf = (arg) => {
        if (arg.kind !== "range" && arg.kind !== "ref") return "#VALUE!";
        const g = readGrid(arg, getCell, ctx);
        if (!g) return "#VALUE!";
        if (g.error) return g.error;
        return { cells: g.rows.flat() };
      };
      const cv = cellsOf(args[vi]);
      if (typeof cv === "string") return cv;
      const cd = cellsOf(args[di]);
      if (typeof cd === "string") return cd;
      const values = [];
      for (const c of cv.cells) {
        if (isFormulaError(c)) return c;
        if (typeof c !== "number" || !Number.isFinite(c)) return "#VALUE!";
        values.push(c);
      }
      const dates = [];
      for (const c of cd.cells) {
        if (isFormulaError(c)) return c;
        let d = null;
        if (typeof c === "number") d = c;
        else if (typeof c === "string" && c.trim() !== "") d = strictNumber(c.trim()) ?? parseDateTextToSerial(c.trim());
        if (d === null || !Number.isFinite(d)) return "#VALUE!";
        if (d < 0) return "#NUM!";
        dates.push(Math.floor(d));
      }
      if (values.length !== dates.length || values.length === 0) return "#NUM!";
      const d0 = dates[0];
      if (dates.some((d) => d < d0)) return "#NUM!";
      const npvAt = (rate) => {
        let s = 0;
        for (let i = 0; i < values.length; i++) s += values[i] / Math.pow(1 + rate, (dates[i] - d0) / 365);
        return s;
      };
      if (isNpv) {
        if (rateOrGuess <= -1) return "#NUM!";
        return finiteOr(npvAt(rateOrGuess));
      }
      if (!values.some((x) => x > 0) || !values.some((x) => x < 0)) return "#NUM!";
      if (rateOrGuess <= -1) return "#NUM!";
      const root = solveRoot(npvAt, rateOrGuess);
      return root === null ? "#NUM!" : finiteOr(root);
    }
    case "RANK.EQ": {
      return evalFn({ ...node, name: "RANK" }, getCell, expandRange);
    }
    default:
      return undefined;
  }
}

function evalNode(node, getCell, expandRange) {
  switch (node.kind) {
    case "num":
      return node.value;
    case "str":
      return node.value;
    case "ref":
      return getCell(node.value);
    case "range": {
      const vals = expandRange(node.value);
      return vals.length ? vals[0] : 0;
    }
    case "neg": {
      const value = evalNode(node.node, getCell, expandRange);

      if (
        typeof value === "string" &&
        FORMULA_ERRORS.has(value)
      ) {
        return value;
      }

      const negated = operandNumber(value);
      if (negated === "#VALUE!") return "#VALUE!";
      return negated === 0 ? 0 : -negated;
    }
    case "bin": {
      const l = evalNode(node.left, getCell, expandRange);
      const r = evalNode(node.right, getCell, expandRange);
      if (typeof l === "string" && FORMULA_ERRORS.has(l)) {
        return l;
      }

      if (typeof r === "string" && FORMULA_ERRORS.has(r)) {
        return r;
      }
      if (node.op === "&") {
        const asText = (v) => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v));
        return `${asText(l)}${asText(r)}`;
      }
      if (["<", ">", "<=", ">=", "=", "<>"].includes(node.op)) {
        if (typeof l === "string" && FORMULA_ERRORS.has(l)) {
          return l;
        }

        if (typeof r === "string" && FORMULA_ERRORS.has(r)) {
          return r;
        }

        let left = l;
        let right = r;

        // খালি মানকে অপর পাশের ধরনের উপযোগী করে তুলনা করি।
        if (left === "" && typeof right === "number") {
          left = 0;
        } else if (left === "" && typeof right === "boolean") {
          left = false;
        }

        if (right === "" && typeof left === "number") {
          right = 0;
        } else if (right === "" && typeof left === "boolean") {
          right = false;
        }

        let comparison;

        if (typeof left === "number" && typeof right === "number") {
          if (!Number.isFinite(left) || !Number.isFinite(right)) {
            return "#VALUE!";
          }

          const cl = cleanNumber(left);
          const cr = cleanNumber(right);
          comparison = cl === cr ? 0 : cl < cr ? -1 : 1;
        } else if (
          typeof left === "string" &&
          typeof right === "string"
        ) {
          const leftText = left.toLowerCase();
          const rightText = right.toLowerCase();

          comparison =
            leftText === rightText ? 0 : leftText < rightText ? -1 : 1;
        } else if (
          typeof left === "boolean" &&
          typeof right === "boolean"
        ) {
          comparison = Number(left) - Number(right);
        } else {
          // ভিন্ন ধরনের মানকে জোর করে একই সংখ্যা বানাব না।
          // এই অ্যাপের তুলনার ক্রম: number < string < boolean।
          const typeRank = (value) => {
            if (typeof value === "number") return 0;
            if (typeof value === "string") return 1;
            return 2;
          };

          comparison = typeRank(left) - typeRank(right);
        }

        switch (node.op) {
          case "=":
            return comparison === 0;
          case "<>":
            return comparison !== 0;
          case "<":
            return comparison < 0;
          case ">":
            return comparison > 0;
          case "<=":
            return comparison <= 0;
          case ">=":
            return comparison >= 0;
          default:
            return "#ERROR!";
        }
      }
      const ln = operandNumber(l);
      const rn = operandNumber(r);
      if (ln === "#VALUE!" || rn === "#VALUE!") return "#VALUE!";
      let arithmetic;
      if (node.op === "+") arithmetic = ln + rn;
      else if (node.op === "-") arithmetic = ln - rn;
      else if (node.op === "*") arithmetic = ln * rn;
      else if (node.op === "/") {
        if (rn === 0) return "#DIV/0!";
        arithmetic = ln / rn;
      } else if (node.op === "^") {
        if (ln === 0 && rn === 0) return "#NUM!";
        if (ln === 0 && rn < 0) return "#DIV/0!";
        arithmetic = Math.pow(ln, rn);
      } else return 0;
      if (!Number.isFinite(arithmetic)) return "#NUM!";
      // [স্টেপ ১] আগে প্রতিটি ধাপে ১৫ অঙ্কে কাটা হতো: 1/3*3 = 0.999999999999999 আসত।
      // এখন শুধু যোগ-বিয়োগে পরিষ্কার করা হয়; গুণ/ভাগ/ঘাতের চূড়ান্ত ফল evaluateFormula-তে পরিষ্কার হয়।
      return node.op === "+" || node.op === "-" ? cleanNumber(arithmetic) : arithmetic;
    }
    case "call": {
      const rewrittenCall = rewriteDynamicArgs(node, getCell, expandRange, evalNode, currentEvalContext);
      if (rewrittenCall !== node) return evalNode(rewrittenCall, getCell, expandRange);
      const collect = () => {
        const out = [];
        node.args.forEach((a) => (a.kind === "range" ? out.push(...expandRange(a.value)) : out.push(evalNode(a, getCell, expandRange))));
        return out;
      };
      switch (node.name) {
        case "CONVERT": {
          if (node.args.length !== 3) return "#VALUE!";

          const amountRaw = evalNode(node.args[0], getCell, expandRange);
          if (typeof amountRaw === "string" && FORMULA_ERRORS.has(amountRaw)) return amountRaw;
          const amount = operandNumber(amountRaw);
          if (amount === "#VALUE!") return "#VALUE!";

          const fromCurrency = String(
            evalNode(node.args[1], getCell, expandRange)
          )
            .trim()
            .toUpperCase();

          const toCurrency = String(
            evalNode(node.args[2], getCell, expandRange)
          )
            .trim()
            .toUpperCase();

          const rate = getExchangeRate(fromCurrency, toCurrency);

          if (!Number.isFinite(rate)) return "#VALUE!";

          return cleanNumber(amount * rate);
        }
        case "SUM": {
          // Excel-এর নিয়ম: রেঞ্জ/সেল-রেফারেন্সের টেক্সট ও TRUE/FALSE বাদ; সরাসরি আর্গুমেন্টের সংখ্যা-টেক্সট গোনা হয়
          let total = 0;

          for (const arg of node.args) {
            if (arg.kind === "range" || arg.kind === "ref") {
              const cellValues = arg.kind === "range" ? expandRange(arg.value) : [getCell(arg.value)];
              for (const value of cellValues) {
                if (typeof value === "string" && FORMULA_ERRORS.has(value)) return value;
                if (typeof value === "number" && Number.isFinite(value)) total += value;
              }
              continue;
            }

            const direct = evalNode(arg, getCell, expandRange);
            if (typeof direct === "string" && FORMULA_ERRORS.has(direct)) return direct;
            const numeric = operandNumber(direct);
            if (numeric === "#VALUE!") return "#VALUE!";
            total += numeric;
          }

          return cleanNumber(total);
        }
        case "AVERAGE":
        case "MIN":
        case "MAX": {
          const values = collect();

          const error = values.find(
            (value) =>
              typeof value === "string" &&
              FORMULA_ERRORS.has(value)
          );

          if (typeof error === "string") {
            return error;
          }

          const numbers = values.filter(
            (value) =>
              typeof value === "number" &&
              Number.isFinite(value)
          );

          if (numbers.length === 0) {
            return node.name === "AVERAGE" ? "#DIV/0!" : 0;
          }

          if (node.name === "AVERAGE") {
            const total = numbers.reduce(
              (sum, value) => sum + value,
              0
            );

            return cleanNumber(total / numbers.length);
          }

          if (node.name === "MIN") {
            return numbers.reduce(
              (minimum, value) => Math.min(minimum, value)
            );
          }

          return numbers.reduce(
            (maximum, value) => Math.max(maximum, value)
          );
        }
        case "COUNT":
          return collect().filter(
            (value) =>
              typeof value === "number" &&
              Number.isFinite(value)
          ).length;


        case "COUNTIF": {
          if (node.args.length !== 2) return "#VALUE!";

          const rangeArg = node.args[0];
          if (rangeArg.kind !== "range" && rangeArg.kind !== "ref") return "#VALUE!";

          const criterion = evalNode(node.args[1], getCell, expandRange);
          if (typeof criterion === "string" && FORMULA_ERRORS.has(criterion)) {
            return criterion;
          }

          const values =
            rangeArg.kind === "range"
              ? expandRange(rangeArg.value)
              : [getCell(rangeArg.value)];

          return values.filter((value) => matchesCriterion(value, criterion)).length;
        }

        case "SUMIF": {
          if (node.args.length < 2 || node.args.length > 3) return "#VALUE!";

          const rangeArg = node.args[0];
          if (rangeArg.kind !== "range" && rangeArg.kind !== "ref") return "#VALUE!";

          const sumArg = node.args[2] ?? rangeArg;
          if (sumArg.kind !== "range" && sumArg.kind !== "ref") return "#VALUE!";

          const criterion = evalNode(node.args[1], getCell, expandRange);
          if (typeof criterion === "string" && FORMULA_ERRORS.has(criterion)) {
            return criterion;
          }

          const toList = (arg) =>
            arg.kind === "range"
              ? expandRange(arg.value)
              : arg.kind === "ref"
                ? [getCell(arg.value)]
                : [];

          const tested = toList(rangeArg);
          const summed = toList(sumArg);

          if (tested.length !== summed.length) return "#VALUE!";

          let total = 0;

          for (let index = 0; index < tested.length; index++) {
            if (!matchesCriterion(tested[index], criterion)) continue;

            const amount = summed[index];

            if (typeof amount === "string" && FORMULA_ERRORS.has(amount)) {
              return amount;
            }

            if (typeof amount === "number" && Number.isFinite(amount)) {
              total += amount;
            }
          }

          return total;
        }

        case "IF": {
          const cond = evalNode(node.args[0], getCell, expandRange);
          if (
            typeof cond === "string" &&
            FORMULA_ERRORS.has(cond)
          ) {
            return cond;
          }
          let ok;
          if (typeof cond === "boolean") ok = cond;
          else {
            const condNumber = operandNumber(cond);
            if (condNumber === "#VALUE!") return "#VALUE!";
            ok = condNumber !== 0;
          }
          return ok ? (node.args[1] ? evalNode(node.args[1], getCell, expandRange) : "") : node.args[2] ? evalNode(node.args[2], getCell, expandRange) : "";
        }
        case "ROUND": {
          if (node.args.length < 1 || node.args.length > 2) {
            return "#VALUE!";
          }

          const value = evalNode(
            node.args[0],
            getCell,
            expandRange
          );

          const digitsValue = node.args[1]
            ? evalNode(node.args[1], getCell, expandRange)
            : 0;

          if (
            typeof value === "string" &&
            FORMULA_ERRORS.has(value)
          ) {
            return value;
          }

          if (
            typeof digitsValue === "string" &&
            FORMULA_ERRORS.has(digitsValue)
          ) {
            return digitsValue;
          }

          const parseArgument = (input) => {
            if (typeof input === "number") {
              return Number.isFinite(input) ? input : null;
            }

            if (typeof input === "boolean") {
              return input ? 1 : 0;
            }

            if (input.trim() === "") {
              return 0;
            }

            // [স্টেপ ১] "১২.৫৫", "1,25,000" ইত্যাদি টেক্সটও সংখ্যা (আগে #VALUE! আসত)
            return strictNumber(input);
          };

          const numeric = parseArgument(value);
          const parsedDigits = parseArgument(digitsValue);

          if (numeric === null || parsedDigits === null) {
            return "#VALUE!";
          }

          const digits = Math.trunc(parsedDigits);

          if (Math.abs(digits) > 300) {
            return "#VALUE!";
          }

          // 1.005 → 1.01 (আগে Math.round(100.49999…) এর কারণে 1 আসত)
          const result = roundHalfAway(numeric, digits);

          if (!Number.isFinite(result)) {
            return "#VALUE!";
          }

          return result;
        }
        case "ABS": {
          if (node.args.length !== 1) {
            return "#VALUE!";
          }

          const value = evalNode(
            node.args[0],
            getCell,
            expandRange
          );

          if (
            typeof value === "string" &&
            FORMULA_ERRORS.has(value)
          ) {
            return value;
          }

          if (typeof value === "number") {
            return Number.isFinite(value)
              ? Math.abs(value)
              : "#VALUE!";
          }

          if (typeof value === "boolean") {
            return value ? 1 : 0;
          }

          if (value.trim() === "") {
            return 0;
          }

          const numeric = strictNumber(value);

          return numeric === null ? "#VALUE!" : Math.abs(numeric);
        }
        case "CONCAT":
          return collect().map((v) => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v))).join("");
        case "AND":
          {
            const values = collect();
            const failed = values.find((v) => typeof v === "string" && FORMULA_ERRORS.has(v));
            if (typeof failed === "string") return failed;
            return values.every((v) => (typeof v === "boolean" ? v : toNumber(v) !== 0));
          }
        case "OR":
          {
            const values = collect();
            const failed = values.find((v) => typeof v === "string" && FORMULA_ERRORS.has(v));
            if (typeof failed === "string") return failed;
            return values.some((v) => (typeof v === "boolean" ? v : toNumber(v) !== 0));
          }
        case "TRUE":
          return true;
        case "FALSE":
          return false;
        case "TODAY":
          {
            return excelDateToSerial(new Date());
          }
        case "NOW":
          return new Date().toLocaleString();
        case "UPPER":
          return String(evalNode(node.args[0], getCell, expandRange)).toUpperCase();
        case "LOWER":
          return String(evalNode(node.args[0], getCell, expandRange)).toLowerCase();
        case "LEN":
          return String(evalNode(node.args[0], getCell, expandRange)).length;
        case "COUNTA":
          return collect().filter((v) => v !== "").length;
        case "PRODUCT": {
          const values = collect();

          const error = values.find(
            (value) =>
              typeof value === "string" &&
              FORMULA_ERRORS.has(value)
          );

          if (typeof error === "string") {
            return error;
          }

          const numbers = values.filter(
            (value) =>
              typeof value === "number" &&
              Number.isFinite(value)
          );

          if (numbers.length === 0) {
            return 0;
          }

          const result = numbers.reduce(
            (product, value) => product * value,
            1
          );

          return Number.isFinite(result)
            ? cleanNumber(result)
            : "#NUM!";
        }
        case "IFERROR": {
          if (node.args.length !== 2) return "#VALUE!";
          const value = evalNode(node.args[0], getCell, expandRange);
          if (typeof value === "string" && FORMULA_ERRORS.has(value)) {
            return evalNode(node.args[1], getCell, expandRange);
          }
          return value;
        }
        case "NOT": {
          if (node.args.length !== 1) return "#VALUE!";
          const value = evalNode(node.args[0], getCell, expandRange);
          if (typeof value === "string" && FORMULA_ERRORS.has(value)) return value;
          const numeric = typeof value === "boolean" ? (value ? 1 : 0) : operandNumber(value);
          if (numeric === "#VALUE!") return numeric;
          return numeric === 0;
        }
        case "MOD": {
          if (node.args.length !== 2) return "#VALUE!";
          const a = operandNumber(evalNode(node.args[0], getCell, expandRange));
          const b = operandNumber(evalNode(node.args[1], getCell, expandRange));
          if (a === "#VALUE!" || b === "#VALUE!") return "#VALUE!";
          if (b === 0) return "#DIV/0!";
          return cleanNumber(a - b * Math.floor(a / b));
        }
        case "INT": {
          if (node.args.length !== 1) return "#VALUE!";
          const value = operandNumber(evalNode(node.args[0], getCell, expandRange));
          if (value === "#VALUE!") return value;
          return Math.floor(value);
        }
        case "SQRT": {
          if (node.args.length !== 1) return "#VALUE!";
          const value = operandNumber(evalNode(node.args[0], getCell, expandRange));
          if (value === "#VALUE!") return value;
          if (value < 0) return "#NUM!";
          return cleanNumber(Math.sqrt(value));
        }
        case "POWER": {
          if (node.args.length !== 2) return "#VALUE!";
          const base = operandNumber(evalNode(node.args[0], getCell, expandRange));
          const exponent = operandNumber(evalNode(node.args[1], getCell, expandRange));
          if (base === "#VALUE!" || exponent === "#VALUE!") return "#VALUE!";
          const result = Math.pow(base, exponent);
          return Number.isFinite(result) ? cleanNumber(result) : "#NUM!";
        }
        case "ROUNDUP":
        case "ROUNDDOWN": {
          if (node.args.length < 1 || node.args.length > 2) return "#VALUE!";
          const value = operandNumber(evalNode(node.args[0], getCell, expandRange));
          const digits = node.args[1] ? operandNumber(evalNode(node.args[1], getCell, expandRange)) : 0;
          if (value === "#VALUE!" || digits === "#VALUE!") return "#VALUE!";
          const d = Math.max(-15, Math.min(Math.trunc(digits), 15));
          const factor = Math.pow(10, d);
          const scaled = Math.abs(value) * factor;
          const rounded = node.name === "ROUNDUP" ? Math.ceil(scaled - 1e-10) : Math.floor(scaled + 1e-10);
          return cleanNumber((value < 0 ? -1 : 1) * rounded / factor);
        }
        case "MEDIAN": {
          const values = collect();
          const error = values.find((v) => typeof v === "string" && FORMULA_ERRORS.has(v));
          if (typeof error === "string") return error;
          const numbers = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
          if (numbers.length === 0) return "#NUM!";
          const mid = Math.floor(numbers.length / 2);
          return numbers.length % 2 ? numbers[mid] : cleanNumber((numbers[mid - 1] + numbers[mid]) / 2);
        }
        case "TEXT": {
          if (node.args.length !== 2) return "#VALUE!";
          const value = evalNode(node.args[0], getCell, expandRange);
          const format = String(evalNode(node.args[1], getCell, expandRange));
          if (typeof value === "string" && FORMULA_ERRORS.has(value)) return value;
          const numeric = typeof value === "number" ? value : strictNumber(value);
          if (numeric === null || numeric === undefined) return String(value);
          if (/%/.test(format)) {
            const decimals = format.split(".")[1]?.match(/0/g)?.length ?? 0;
            return toDisplayDigits(`${roundHalfAway(numeric * 100, decimals).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`);
          }
          const decimalMatch = /\.(0+)/.exec(format);
          const decimals = decimalMatch ? decimalMatch[1].length : 0;
          return toDisplayDigits(roundHalfAway(numeric, decimals).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
        }
        case "LEFT": {
          if (node.args.length < 1 || node.args.length > 2) return "#VALUE!";
          const text = String(evalNode(node.args[0], getCell, expandRange));
          const count = node.args[1] ? operandNumber(evalNode(node.args[1], getCell, expandRange)) : 1;
          if (count === "#VALUE!") return count;
          return text.slice(0, Math.max(0, Math.trunc(count)));
        }
        case "RIGHT": {
          if (node.args.length < 1 || node.args.length > 2) return "#VALUE!";
          const text = String(evalNode(node.args[0], getCell, expandRange));
          const count = node.args[1] ? operandNumber(evalNode(node.args[1], getCell, expandRange)) : 1;
          if (count === "#VALUE!") return count;
          return count <= 0 ? "" : text.slice(-Math.trunc(count));
        }
        case "MID": {
          if (node.args.length !== 3) return "#VALUE!";
          const text = String(evalNode(node.args[0], getCell, expandRange));
          const start = operandNumber(evalNode(node.args[1], getCell, expandRange));
          const length = operandNumber(evalNode(node.args[2], getCell, expandRange));
          if (start === "#VALUE!" || length === "#VALUE!") return "#VALUE!";
          if (start < 1 || length < 0) return "#VALUE!";
          return text.slice(Math.trunc(start) - 1, Math.trunc(start) - 1 + Math.trunc(length));
        }
        case "TRIM": {
          if (node.args.length !== 1) return "#VALUE!";
          return String(evalNode(node.args[0], getCell, expandRange)).trim().replace(/\s+/g, " ");
        }
        case "SUMIFS": {
          if (node.args.length < 3 || (node.args.length - 1) % 2 !== 0) return "#VALUE!";
          const toList = (arg) =>
            arg.kind === "range" ? expandRange(arg.value) : arg.kind === "ref" ? [getCell(arg.value)] : [];
          const sumRange = toList(node.args[0]);
          const pairs = [];
          for (let i = 1; i < node.args.length; i += 2) {
            const range = toList(node.args[i]);
            const criterion = evalNode(node.args[i + 1], getCell, expandRange);
            if (typeof criterion === "string" && FORMULA_ERRORS.has(criterion)) return criterion;
            if (range.length !== sumRange.length) {
              const maxLen = Math.max(range.length, sumRange.length);
              while (sumRange.length < maxLen) sumRange.push("");
              while (range.length < maxLen) range.push("");
            }
            pairs.push([range, criterion]);
          }
          let total = 0;
          for (let i = 0; i < sumRange.length; i++) {
            if (pairs.every(([range, criterion]) => matchesCriterion(range[i], criterion))) {
              const amount = sumRange[i];
              if (typeof amount === "string" && FORMULA_ERRORS.has(amount)) return amount;
              if (typeof amount === "number" && Number.isFinite(amount)) total += amount;
            }
          }
          return cleanNumber(total);
        }
        case "COUNTIFS": {
          if (node.args.length < 2 || node.args.length % 2 !== 0) return "#VALUE!";
          const toList = (arg) =>
            arg.kind === "range" ? expandRange(arg.value) : arg.kind === "ref" ? [getCell(arg.value)] : [];
          const first = toList(node.args[0]);
          const pairs = [];
          for (let i = 0; i < node.args.length; i += 2) {
            const range = toList(node.args[i]);
            const criterion = evalNode(node.args[i + 1], getCell, expandRange);
            if (typeof criterion === "string" && FORMULA_ERRORS.has(criterion)) return criterion;
            if (range.length !== first.length) {
              const maxLen = Math.max(range.length, first.length);
              while (first.length < maxLen) first.push("");
              while (range.length < maxLen) range.push("");
            }
            pairs.push([range, criterion]);
          }
          let count = 0;
          for (let i = 0; i < first.length; i++) {
            if (pairs.every(([range, criterion]) => matchesCriterion(range[i], criterion))) count++;
          }
          return count;
        }
        case "VLOOKUP": {
          if (node.args.length < 3 || node.args.length > 4) return "#VALUE!";
          const lookup = evalNode(node.args[0], getCell, expandRange);
          if (typeof lookup === "string" && FORMULA_ERRORS.has(lookup)) return lookup;
          const tableArg = node.args[1];
          if (tableArg.kind !== "range") return "#VALUE!";
          const nr = normalizeRange(tableArg.value);
          if (!nr) return "#REF!";
          const colIndex = operandNumber(evalNode(node.args[2], getCell, expandRange));
          if (colIndex === "#VALUE!") return colIndex;
          const col = Math.trunc(colIndex);
          if (col < 1 || col > nr.c2 - nr.c1 + 1) return "#REF!";
          const approximate = node.args[3] ? evalNode(node.args[3], getCell, expandRange) : true;
          const exact = typeof approximate === "boolean" ? !approximate : Number(approximate) === 0;

          const tableRef = splitSheetReference(tableArg.value);
          const tableSheetName = tableRef.sheetName;

          const contextSheet = tableSheetName
            ? currentEvalContext?.allSheets?.find(
              (s) => sameSheetName(s.name, tableSheetName)
            ) ?? null
            : currentEvalContext?.sheet ?? null;
          const tableLastRow = contextSheet ? getLastUsedRow(contextSheet.cells) : nr.r2;
          const endRow = Math.min(nr.r2, Math.max(nr.r1, tableLastRow));
          const firstColumn = [];
          const resultColumn = [];
          for (let r = nr.r1; r <= endRow; r++) {
            firstColumn.push(getCell(cellKey(r, nr.c1)));
            resultColumn.push(getCell(cellKey(r, nr.c1 + col - 1)));
          }
          if (exact) {
            const index = firstColumn.findIndex((value) => matchesCriterion(value, lookup));
            return index === -1 ? "#N/A" : resultColumn[index];
          }
          const lookupNumber = typeof lookup === "number" ? lookup : strictNumber(lookup);
          let best = -1;
          for (let i = 0; i < firstColumn.length; i++) {
            const value = typeof firstColumn[i] === "number" ? firstColumn[i] : strictNumber(firstColumn[i]);
            if (typeof value === "number" && lookupNumber !== null && value <= lookupNumber) best = i;
          }
          return best === -1 ? "#N/A" : resultColumn[best];
        }
        case "XLOOKUP": {
          if (node.args.length < 3 || node.args.length > 6) return "#VALUE!";
          const lookup = evalNode(node.args[0], getCell, expandRange);
          if (typeof lookup === "string" && FORMULA_ERRORS.has(lookup)) return lookup;
          const lookupArg = node.args[1];
          const returnArg = node.args[2];
          if (lookupArg.kind !== "range" || returnArg.kind !== "range") return "#VALUE!";
          const lookupNr = normalizeRange(lookupArg.value);
          const returnNr = normalizeRange(returnArg.value);
          if (!lookupNr || !returnNr) return "#REF!";
          const lookupVals = [];
          const returnVals = [];
          const isVertical = lookupNr.c1 === lookupNr.c2;
          if (isVertical) {
            for (let r = lookupNr.r1; r <= lookupNr.r2; r++) lookupVals.push(getCell(cellKey(r, lookupNr.c1)));
            for (let r = returnNr.r1; r <= returnNr.r2; r++) returnVals.push(getCell(cellKey(r, returnNr.c1)));
          } else {
            for (let c = lookupNr.c1; c <= lookupNr.c2; c++) lookupVals.push(getCell(cellKey(lookupNr.r1, c)));
            for (let c = returnNr.c1; c <= returnNr.c2; c++) returnVals.push(getCell(cellKey(returnNr.r1, c)));
          }
          if (lookupVals.length !== returnVals.length) return "#VALUE!";
          const ifNotFound = node.args[3] ? evalNode(node.args[3], getCell, expandRange) : "#N/A";
          const matchModeRaw = node.args[4] ? operandNumber(evalNode(node.args[4], getCell, expandRange)) : 0;
          const searchModeRaw = node.args[5] ? operandNumber(evalNode(node.args[5], getCell, expandRange)) : 1;
          if (matchModeRaw === "#VALUE!" || searchModeRaw === "#VALUE!") return "#VALUE!";
          const matchMode = Math.trunc(matchModeRaw);
          const searchMode = Math.trunc(searchModeRaw);
          let index = -1;
          if (matchMode === 0) {
            if (searchMode === -1) {
              for (let i = lookupVals.length - 1; i >= 0; i--) {
                if (matchesCriterion(lookupVals[i], lookup)) { index = i; break; }
              }
            } else {
              index = lookupVals.findIndex((v) => matchesCriterion(v, lookup));
            }
          } else {
            const lookupNum = typeof lookup === "number" ? lookup : strictNumber(lookup);
            if (lookupNum === null) return "#VALUE!";
            let best = -1;
            let bestVal = null;
            const order = searchMode === -1 ? -1 : 1;
            const start = order === 1 ? 0 : lookupVals.length - 1;
            const end = order === 1 ? lookupVals.length : -1;
            for (let i = start; order === 1 ? i < end : i > end; i += order) {
              const value = typeof lookupVals[i] === "number" ? lookupVals[i] : strictNumber(lookupVals[i]);
              if (typeof value !== "number") continue;
              if (matchMode === -1 && value <= lookupNum) {
                if (best === -1 || value > (bestVal ?? -Infinity)) { best = i; bestVal = value; }
              } else if (matchMode === 1 && value >= lookupNum) {
                if (best === -1 || value < (bestVal ?? Infinity)) { best = i; bestVal = value; }
              }
            }
            index = best;
          }
          if (index === -1) return ifNotFound;
          return returnVals[index];
        }
        case "XMATCH": {
          if (node.args.length < 2 || node.args.length > 4) return "#VALUE!";
          const lookup = evalNode(node.args[0], getCell, expandRange);
          if (typeof lookup === "string" && FORMULA_ERRORS.has(lookup)) return lookup;
          const lookupArg = node.args[1];
          if (lookupArg.kind !== "range") return "#VALUE!";
          const lookupNr = normalizeRange(lookupArg.value);
          if (!lookupNr) return "#REF!";
          const lookupVals = [];
          if (lookupNr.c1 === lookupNr.c2) {
            for (let r = lookupNr.r1; r <= lookupNr.r2; r++) lookupVals.push(getCell(cellKey(r, lookupNr.c1)));
          } else {
            for (let c = lookupNr.c1; c <= lookupNr.c2; c++) lookupVals.push(getCell(cellKey(lookupNr.r1, c)));
          }
          const matchModeRaw = node.args[2] ? operandNumber(evalNode(node.args[2], getCell, expandRange)) : 0;
          const searchModeRaw = node.args[3] ? operandNumber(evalNode(node.args[3], getCell, expandRange)) : 1;
          if (matchModeRaw === "#VALUE!" || searchModeRaw === "#VALUE!") return "#VALUE!";
          const matchMode = Math.trunc(matchModeRaw);
          const searchMode = Math.trunc(searchModeRaw);
          let index = -1;
          if (matchMode === 0) {
            if (searchMode === -1) {
              for (let i = lookupVals.length - 1; i >= 0; i--) {
                if (matchesCriterion(lookupVals[i], lookup)) { index = i; break; }
              }
            } else {
              index = lookupVals.findIndex((v) => matchesCriterion(v, lookup));
            }
          } else {
            const lookupNum = typeof lookup === "number" ? lookup : strictNumber(lookup);
            if (lookupNum === null) return "#VALUE!";
            let best = -1;
            let bestVal = null;
            const order = searchMode === -1 ? -1 : 1;
            const start = order === 1 ? 0 : lookupVals.length - 1;
            const end = order === 1 ? lookupVals.length : -1;
            for (let i = start; order === 1 ? i < end : i > end; i += order) {
              const value = typeof lookupVals[i] === "number" ? lookupVals[i] : strictNumber(lookupVals[i]);
              if (typeof value !== "number") continue;
              if (matchMode === -1 && value <= lookupNum) {
                if (best === -1 || value > (bestVal ?? -Infinity)) { best = i; bestVal = value; }
              } else if (matchMode === 1 && value >= lookupNum) {
                if (best === -1 || value < (bestVal ?? Infinity)) { best = i; bestVal = value; }
              }
            }
            index = best;
          }
          return index === -1 ? "#N/A" : index + 1;
        }
        case "FILTER": {
          if (node.args.length < 2) return "#VALUE!";
          const rangeArg = node.args[0];
          if (rangeArg.kind !== "range") return "#VALUE!";
          const nr = normalizeRange(rangeArg.value);
          if (!nr) return "#REF!";
          const values = [];
          for (let r = nr.r1; r <= nr.r2; r++) {
            for (let c = nr.c1; c <= nr.c2; c++) values.push(getCell(cellKey(r, c)));
          }
          const include = values.map(() => true);
          for (let a = 1; a < node.args.length; a++) {
            const condArg = node.args[a];
            if (condArg.kind !== "range") return "#VALUE!";
            const cnr = normalizeRange(condArg.value);
            if (!cnr) return "#REF!";
            const condVals = [];
            for (let r = cnr.r1; r <= cnr.r2; r++) {
              for (let c = cnr.c1; c <= cnr.c2; c++) condVals.push(getCell(cellKey(r, c)));
            }
            if (condVals.length !== values.length) return "#VALUE!";
            for (let i = 0; i < values.length; i++) {
              const cv = condVals[i];
              const isTrue = typeof cv === "boolean" ? cv : (typeof cv === "number" ? cv !== 0 : String(cv).toUpperCase() === "TRUE");
              if (!isTrue) include[i] = false;
            }
          }
          const filtered = values.filter((_, i) => include[i]);
          return filtered.length > 0 ? filtered[0] : "#CALC!";
        }
        case "SORT": {
          if (node.args.length < 1 || node.args.length > 4) return "#VALUE!";
          const rangeArg = node.args[0];
          if (rangeArg.kind !== "range") return "#VALUE!";
          const nr = normalizeRange(rangeArg.value);
          if (!nr) return "#REF!";
          const values = [];
          for (let r = nr.r1; r <= nr.r2; r++) {
            for (let c = nr.c1; c <= nr.c2; c++) values.push(getCell(cellKey(r, c)));
          }
          const orderRaw = node.args[2] ? operandNumber(evalNode(node.args[2], getCell, expandRange)) : 1;
          if (orderRaw === "#VALUE!") return "#VALUE!";
          const order = Math.trunc(orderRaw);
          const sorted = [...values].sort((a, b) => {
            const an = typeof a === "number" ? a : strictNumber(a);
            const bn = typeof b === "number" ? b : strictNumber(b);
            if (typeof an === "number" && typeof bn === "number") return order === -1 ? bn - an : an - bn;
            const as = String(a); const bs = String(b);
            return order === -1 ? bs.localeCompare(as) : as.localeCompare(bs);
          });
          return sorted.length > 0 ? sorted[0] : "#CALC!";
        }
        case "UNIQUE": {
          if (node.args.length < 1 || node.args.length > 3) return "#VALUE!";
          const rangeArg = node.args[0];
          if (rangeArg.kind !== "range") return "#VALUE!";
          const nr = normalizeRange(rangeArg.value);
          if (!nr) return "#REF!";
          const values = [];
          for (let r = nr.r1; r <= nr.r2; r++) {
            for (let c = nr.c1; c <= nr.c2; c++) values.push(getCell(cellKey(r, c)));
          }
          const seen = new Set();
          const unique = [];
          for (const v of values) {
            const k = String(v);
            if (!seen.has(k)) { seen.add(k); unique.push(v); }
          }
          return unique.length > 0 ? unique[0] : "#CALC!";
        }
        case "SEQUENCE": {
          if (node.args.length < 1 || node.args.length > 4) return "#VALUE!";
          const rowsRaw = operandNumber(evalNode(node.args[0], getCell, expandRange));
          if (rowsRaw === "#VALUE!") return "#VALUE!";
          const rows = Math.trunc(rowsRaw);
          const colsRaw = node.args[1] ? operandNumber(evalNode(node.args[1], getCell, expandRange)) : 1;
          if (colsRaw === "#VALUE!") return "#VALUE!";
          const cols = Math.trunc(colsRaw);
          const startRaw = node.args[2] ? operandNumber(evalNode(node.args[2], getCell, expandRange)) : 1;
          if (startRaw === "#VALUE!") return "#VALUE!";
          const start = startRaw;
          const stepRaw = node.args[3] ? operandNumber(evalNode(node.args[3], getCell, expandRange)) : 1;
          if (stepRaw === "#VALUE!") return "#VALUE!";
          if (rows < 1 || cols < 1) return "#VALUE!";
          return start;
        }
        case "TEXTJOIN": {
          if (node.args.length < 3) return "#VALUE!";
          const delimiter = String(evalNode(node.args[0], getCell, expandRange));
          const ignoreEmptyRaw = evalNode(node.args[1], getCell, expandRange);
          const ignoreEmpty = typeof ignoreEmptyRaw === "boolean" ? ignoreEmptyRaw : (typeof ignoreEmptyRaw === "number" ? ignoreEmptyRaw !== 0 : String(ignoreEmptyRaw).toUpperCase() === "TRUE");
          const parts = [];
          for (let i = 2; i < node.args.length; i++) {
            const a = node.args[i];
            const vals = a.kind === "range" ? expandRange(a.value) : [evalNode(a, getCell, expandRange)];
            for (const v of vals) {
              if (typeof v === "string" && FORMULA_ERRORS.has(v)) return v;
              const text = String(v);
              if (ignoreEmpty && text.trim() === "") continue;
              parts.push(text);
            }
          }
          return parts.join(delimiter);
        }
        case "IFS": {
          if (node.args.length < 2 || node.args.length % 2 !== 0) return "#VALUE!";
          for (let i = 0; i < node.args.length; i += 2) {
            const cond = evalNode(node.args[i], getCell, expandRange);
            if (typeof cond === "string" && FORMULA_ERRORS.has(cond)) return cond;
            const ok = typeof cond === "boolean" ? cond : (operandNumber(cond) !== 0);
            if (ok) return evalNode(node.args[i + 1], getCell, expandRange);
          }
          return "#N/A";
        }
        case "SWITCH": {
          if (node.args.length < 3) return "#VALUE!";
          const expr = evalNode(node.args[0], getCell, expandRange);
          if (typeof expr === "string" && FORMULA_ERRORS.has(expr)) return expr;
          let i = 1;
          while (i + 1 < node.args.length) {
            const val = evalNode(node.args[i], getCell, expandRange);
            if (matchesCriterion(expr, val)) return evalNode(node.args[i + 1], getCell, expandRange);
            i += 2;
          }
          if (i < node.args.length) return evalNode(node.args[i], getCell, expandRange);
          return "#N/A";
        }
        case "STDEV":
        case "STDEVP":
        case "VAR":
        case "VARP": {
          const values = collect();

          const error = values.find(
            (value) =>
              typeof value === "string" &&
              FORMULA_ERRORS.has(value)
          );

          if (typeof error === "string") {
            return error;
          }

          const numbers = values.filter(
            (value) =>
              typeof value === "number" &&
              Number.isFinite(value)
          );

          const isSample =
            node.name === "STDEV" || node.name === "VAR";

          const minimumCount = isSample ? 2 : 1;

          if (numbers.length < minimumCount) {
            return "#DIV/0!";
          }

          let count = 0;
          let mean = 0;
          let sumSquaredDifferences = 0;

          for (const value of numbers) {
            count += 1;

            const delta = value - mean;
            mean += delta / count;

            const nextDelta = value - mean;
            sumSquaredDifferences += delta * nextDelta;
          }

          const denominator = isSample ? count - 1 : count;
          const variance =
            sumSquaredDifferences / denominator;

          if (!Number.isFinite(variance) || variance < 0) {
            return "#VALUE!";
          }

          const isStandardDeviation =
            node.name === "STDEV" || node.name === "STDEVP";

          const result = isStandardDeviation
            ? Math.sqrt(variance)
            : variance;

          return Number.isFinite(result)
            ? cleanNumber(result)
            : "#VALUE!";
        }
        default: {
          const extraResult = evalExtraFunction(node, getCell, expandRange);
          return extraResult === undefined ? "#NAME?" : extraResult;
        }
      }
    }
    default:
      return 0;
  }
}

let formulaEvalDepth = 0;

function evaluateFormula(formula, getCell, expandRange) {
  formulaEvalDepth += 1;
  try {
    const result = evalNode(new FormulaParser(formula).parse(), getCell, expandRange);
    return typeof result === "number" ? cleanNumber(result) : result;
  } catch {
    return "#ERROR!";
  } finally {
    formulaEvalDepth -= 1;
  }
}

/* ============================================================================
 * Multi-Sheet Formula Evaluator — Find & Replace ফিচারের জন্য
 * বর্তমান getCellValue শুধু active sheet-এ কাজ করে, কিন্তু "All Sheets" স্কোপে
 * সার্চ করতে হলে যেকোনো sheet object দিয়ে formula evaluate করা দরকার —
 * তাই এই standalone (component-independent) ভার্সনটি তৈরি করা হলো।
 * ========================================================================== */
const splitSheetReference = (reference) => {
  const match = reference.match(/^(.+)!([A-Za-z0-9:]+)$/);

  if (!match) {
    return {
      sheetName: null,
      reference,
    };
  }

  return {
    sheetName: match[1].trim(),
    reference: match[2].trim(),
  };
};
let currentEvalContext = null;

function getCellValueInSheet(targetSheet, key, visiting = new Set(), allSheets = [targetSheet]) {
  const cell = targetSheet.cells[key];
  const raw = cell?.value ?? "";

  if (raw === "") {
    return "";
  }

  if (cell?.style?.numberFormat === "text") {
    return raw;
  }

  if (!raw.startsWith("=")) {
    if (formulaEvalDepth > 0) {
      const dateSerial = parseDateTextToSerial(raw.trim());
      if (dateSerial !== null) return dateSerial;
    }
    return parseNumericCell(raw);
  }
  // সার্কুলার রেফারেন্স প্রতিরোধ — একই cell বারবার resolve হতে থাকলে থামিয়ে দেয়
  const visitKey = `${targetSheet.id}!${key}`;
  if (visiting.has(visitKey)) return "#CIRCULAR!";
  const nextVisiting = new Set(visiting);
  nextVisiting.add(visitKey);

  const findSheet = (name) =>
    allSheets.find((item) => sameSheetName(item.name, name));

  // [হিসাব-সংশোধন] আগে 'Sheet2!A1' মূল শিটের সেল ধরে "" ফেরত দিত — এখন সঠিক শিটে খোঁজে (এক্সপোর্টে ভুল মান আসত)
  const getCell = (ref) => {
    const { sheetName, reference } = splitSheetReference(ref);
    if (!sheetName) return getCellValueInSheet(targetSheet, reference, nextVisiting, allSheets);
    const other = findSheet(sheetName);
    if (!other) return "#REF!";
    return getCellValueInSheet(other, reference, nextVisiting, allSheets);
  };
  const expandRange = (range) => {
    const { sheetName, reference } = splitSheetReference(range);
    const rangeSheet = sheetName ? findSheet(sheetName) : targetSheet;
    if (!rangeSheet) return ["#REF!"];
    const nr = normalizeRange(reference);
    if (!nr) return [];
    const usedLastRow = getLastUsedRow(rangeSheet.cells);
    const endRow = Math.min(nr.r2, Math.max(nr.r1, usedLastRow));
    const out = [];
    for (let r = nr.r1; r <= endRow; r++)
      for (let c = nr.c1; c <= nr.c2; c++)
        out.push(getCellValueInSheet(rangeSheet, cellKey(r, c), nextVisiting, allSheets));
    return out;
  };
  const previousContext = currentEvalContext;
  const previousCellKey = currentEvalCellKey;
  currentEvalContext = { sheet: targetSheet, allSheets };
  currentEvalCellKey = key;
  try {
    return evaluateFormula(raw.slice(1), getCell, expandRange);
  } finally {
    currentEvalContext = previousContext;
    currentEvalCellKey = previousCellKey;
  }
}

function syncExchangeRates(allSheets) {
  const rateSheet = allSheets.find(
    (item) =>
      item.name.trim().toLowerCase() === EXCHANGE_RATE_SHEET_NAME.toLowerCase()
  );

  const next = {};

  if (rateSheet) {
    for (let row = 1; row < rateSheet.gridRows; row += 1) {
      const from = String(rateSheet.cells[cellKey(row, 0)]?.value ?? "").trim().toUpperCase();
      const to = String(rateSheet.cells[cellKey(row, 1)]?.value ?? "").trim().toUpperCase();
      const rate = strictNumber(String(rateSheet.cells[cellKey(row, 2)]?.value ?? "")) ?? NaN;

      if (from && to && Number.isFinite(rate) && rate > 0) {
        next[rateKey(from, to)] = rate;
      }
    }
  }

  Object.keys(activeExchangeRates).forEach((key) => delete activeExchangeRates[key]);
  Object.assign(activeExchangeRates, next);
  userExchangeRatesActive = Object.keys(next).length > 0;
}


export const FORMULA_CORE_VERSION = "formula-core-1";

export function evaluateFormulaCore(formula, workbookContext) {
  const getCell = workbookContext && workbookContext.getCell;
  const expandRange = workbookContext && workbookContext.expandRange;
  if (typeof getCell !== "function" || typeof expandRange !== "function") {
    throw new Error("FORMULA_CORE_CONTEXT_INVALID");
  }
  const expr = typeof formula === "string" && formula.startsWith("=") ? formula.slice(1) : formula;
  return evaluateFormula(expr, getCell, expandRange);
}

export { getCellValueInSheet };
export { getExchangeRate, syncExchangeRates };