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