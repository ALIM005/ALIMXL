// ALIMXL — Batch 1: ৫০টি নতুন ফর্মুলা ফাংশন
//
// এই ফাইল শুধু formula-core.mjs-এর evalMoreFunction থেকে ডাকা হয় (default শাখায়)।
// app/page.tsx-এ কোনো লজিক নেই: page.tsx-এর ইনলাইন switch না চিনলেও শেষে
// evalMoreFunction ডাকে, তাই নতুন ফাংশন মূল গ্রিডে স্বয়ংক্রিয়ভাবে কাজ করে।
//
// চেনা না গেলে undefined ফেরত দেয় (তখন ইঞ্জিন #NAME? দেখায়)।

export const BATCH1_FUNCTION_NAMES = [
  // গণিত (৮)
  "SUMSQ", "EVEN", "ODD", "QUOTIENT", "CEILING.MATH", "FLOOR.MATH", "COMBIN", "PERMUT",
  // পরিসংখ্যান (৮)
  "STDEV.S", "STDEV.P", "VAR.S", "VAR.P", "GEOMEAN", "DEVSQ", "RANK.AVG", "PERCENTRANK.INC",
  // টেক্সট (৬)
  "TEXTBEFORE", "TEXTAFTER", "NUMBERVALUE", "FIXED", "DOLLAR", "T",
  // তারিখ-সময় (৭)
  "DATEVALUE", "TIMEVALUE", "YEARFRAC", "DAYS360", "ISOWEEKNUM", "NETWORKDAYS.INTL", "WORKDAY.INTL",
  // তথ্য ও লজিক (৮)
  "ISODD", "ISEVEN", "ISLOGICAL", "ISNONTEXT", "N", "TYPE", "NA", "XOR",
  // লুকআপ ও রেফারেন্স (৪)
  "LOOKUP", "ADDRESS", "HYPERLINK", "AGGREGATE",
  // অর্থ (৯)
  "SLN", "DB", "DDB", "SYD", "CUMIPMT", "CUMPRINC", "EFFECT", "NOMINAL", "MIRR",
];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const SEC_PER_DAY = 86400;

/**
 * @param node   ফাংশন-কল নোড ({ name, args })
 * @param h      formula-core থেকে দেওয়া সহায়ক (ev, numArg, dateArg, readGrid, ...)
 */
export function evalBatch1Function(node, h) {
  const { args, ev, numArg, dateArg, readGrid, getCell, ctx, evalFn, expandRange } = h;
  const { cleanNumber, isFormulaError, strictNumber, ymdToSerial, serialToYMD } = h;
  const argc = args.length;
  const name = node.name;
  if (!BATCH1_SET.has(name)) return undefined;

  const bad = "#VALUE!";
  const isRef = (a) => a && (a.kind === "range" || a.kind === "ref");
  const finite = (n, err = "#NUM!") => (Number.isFinite(n) ? cleanNumber(n) : err);

  // --------------------------------------------------------------- সংগ্রহ-সহায়ক
  // Excel-এর নিয়ম: রেঞ্জ/রেফারেন্সে শুধু সংখ্যা গণ্য (টেক্সট, বুলিয়ান, ফাঁকা বাদ);
  // সরাসরি আর্গুমেন্টে সংখ্যা, বুলিয়ান ও সংখ্যা-মতো টেক্সট গণ্য, অন্য টেক্সট #VALUE!।
  // রেফারেন্সের ভেতরে এরর থাকলে (ignoreErrors না হলে) সেই এরর ফেরত।
  function collectNums(argNodes, opts = {}) {
    const out = [];
    for (const a of argNodes) {
      if (isRef(a)) {
        const g = readGrid(a, getCell, ctx);
        if (!g) return bad;
        if (g.error) return g.error;
        for (const row of g.rows) {
          for (const v of row) {
            if (isFormulaError(v)) {
              if (opts.ignoreErrors) continue;
              return v;
            }
            if (typeof v === "number" && Number.isFinite(v)) out.push(v);
          }
        }
      } else {
        const v = evalFn(a, getCell, expandRange);
        if (isFormulaError(v)) {
          if (opts.ignoreErrors) continue;
          return v;
        }
        if (typeof v === "number") {
          if (Number.isFinite(v)) out.push(v);
        } else if (typeof v === "boolean") out.push(v ? 1 : 0);
        else {
          const n = typeof v === "string" ? strictNumber(v) : null;
          if (n === null) return bad;
          out.push(n);
        }
      }
    }
    return out;
  }

  // একটিমাত্র রেঞ্জ/অ্যারে আর্গুমেন্ট থেকে সংখ্যা-তালিকা
  const numsFromRef = (i, opts) => {
    if (!isRef(args[i])) {
      const v = ev(i);
      if (isFormulaError(v)) return v;
      return typeof v === "number" ? [v] : bad;
    }
    return collectNums([args[i]], opts);
  };

  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const sumSqDev = (a) => {
    const m = mean(a);
    return a.reduce((s, x) => s + (x - m) * (x - m), 0);
  };

  // --------------------------------------------------------------- তারিখ-সহায়ক
  const daysInYear = (y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
  const isLeap = (y) => daysInYear(y) === 366;
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const isLastDayOfFeb = (p) => p.m === 2 && p.d === lastDay(p.y, 2);

  // 30/360 (US/NASD ও ইউরোপীয়), ফেরত: দিন-সংখ্যা
  function days360(a, b, european, bothFebRule = true) {
    let { d: d1 } = a;
    let { d: d2 } = b;
    if (european) {
      if (d1 === 31) d1 = 30;
      if (d2 === 31) d2 = 30;
    } else {
      if (bothFebRule && isLastDayOfFeb(a) && isLastDayOfFeb(b)) d2 = 30;
      if (isLastDayOfFeb(a)) d1 = 30;
      if (d2 === 31 && d1 >= 30) d2 = 30;
      if (d1 === 31) d1 = 30;
    }
    return (b.y - a.y) * 360 + (b.m - a.m) * 30 + (d2 - d1);
  }

  const sun0Of = (d) => (((d - 1) % 7) + 7) % 7; // 0 = রবিবার (formula-core-এর নিয়ম)

  // ছুটির তালিকা → Set (সিরিয়াল পূর্ণসংখ্যা) অথবা এরর
  function readHolidays(a) {
    const set = new Set();
    if (!a) return set;
    if (isRef(a)) {
      const g = readGrid(a, getCell, ctx);
      if (!g) return bad;
      if (g.error) return g.error;
      for (const row of g.rows) {
        for (const cell of row) {
          if (isFormulaError(cell)) return cell;
          if (cell === "") continue;
          let d = null;
          if (typeof cell === "number") d = cell;
          else if (typeof cell === "string") d = strictNumber(cell.trim()) ?? h.parseDateTextToSerial(cell.trim());
          if (d === null || !Number.isFinite(d)) return bad;
          set.add(Math.floor(d));
        }
      }
    } else {
      const v = ev(args.indexOf(a));
      if (isFormulaError(v)) return v;
      const d = typeof v === "number" ? v : strictNumber(String(v).trim()) ?? h.parseDateTextToSerial(String(v).trim());
      if (d === null || !Number.isFinite(d)) return bad;
      set.add(Math.floor(d));
    }
    return set;
  }

  // সপ্তাহান্ত-প্যারামিটার → ৭ উপাদানের অ্যারে (সোম=0 … রবি=6; true = সপ্তাহান্ত) অথবা এরর
  function weekendMask(i) {
    if (!args[i]) return [false, false, false, false, false, true, true];
    const v = ev(i);
    if (isFormulaError(v)) return v;
    // টেক্সট "0000011" (৭ অক্ষর, সোম→রবি) আগে মাস্ক হিসেবে দেখা হয়; তারপর সংখ্যা-কোড
    if (typeof v === "string" && /^[01]{7}$/.test(v.trim())) {
      const t = v.trim();
      if (t === "1111111") return bad;
      return t.split("").map((c) => c === "1");
    }
    if (typeof v === "string" && strictNumber(v.trim()) === null) return bad;
    const code = Math.trunc(typeof v === "number" ? v : strictNumber(v.trim()));
    const m = [false, false, false, false, false, false, false];
    if (code >= 1 && code <= 7) {
      // 1=শনি+রবি, 2=রবি+সোম, … 7=শুক্র+শনি
      const first = code === 1 ? 5 : code === 2 ? 6 : code - 3; // সোম-ভিত্তিক সূচক
      m[first] = true;
      m[(first + 1) % 7] = true;
      return m;
    }
    if (code >= 11 && code <= 17) {
      // 11=রবি, 12=সোম, … 17=শনি
      m[code === 11 ? 6 : code - 12] = true;
      return m;
    }
    return "#NUM!";
  }
  const isWorkWith = (mask, holidays) => (d) => !mask[(sun0Of(d) + 6) % 7] && !holidays.has(d);

  // --------------------------------------------------------------- টেক্সট-সহায়ক
  function textBeforeAfter(isBefore) {
    if (argc < 2 || argc > 6) return bad;
    const t = ev(0);
    if (isFormulaError(t)) return t;
    const dl = ev(1);
    if (isFormulaError(dl)) return dl;
    const text = typeof t === "boolean" ? (t ? "TRUE" : "FALSE") : String(t);
    const delim = typeof dl === "boolean" ? (dl ? "TRUE" : "FALSE") : String(dl);
    let inst = 1;
    if (args[2]) {
      const n = numArg(2);
      if (typeof n === "string") return n;
      inst = Math.trunc(n);
    }
    let mode = 0;
    if (args[3]) {
      const n = numArg(3);
      if (typeof n === "string") return n;
      mode = Math.trunc(n);
    }
    let matchEnd = 0;
    if (args[4]) {
      const n = numArg(4);
      if (typeof n === "string") return n;
      matchEnd = Math.trunc(n);
    }
    if (inst === 0 || Math.abs(inst) > Math.max(text.length, 1)) return bad;
    if (mode !== 0 && mode !== 1) return bad;
    if (matchEnd !== 0 && matchEnd !== 1) return bad;
    const notFound = () => (args[5] ? ev(5) : "#N/A");
    if (delim === "") {
      return isBefore ? (inst > 0 ? "" : text) : (inst > 0 ? text : "");
    }
    const hay = mode === 1 ? text.toLowerCase() : text;
    const needle = mode === 1 ? delim.toLowerCase() : delim;
    const occ = [];
    for (let i = 0; i <= hay.length - needle.length; ) {
      if (hay.startsWith(needle, i)) {
        occ.push({ pos: i, len: needle.length });
        i += needle.length;
      } else i++;
    }
    let pick;
    if (inst > 0) {
      if (occ.length >= inst) pick = occ[inst - 1];
      else if (matchEnd === 1 && occ.length === inst - 1) pick = { pos: text.length, len: 0 };
    } else {
      const k = -inst;
      const rev = occ.slice().reverse();
      if (rev.length >= k) pick = rev[k - 1];
      else if (matchEnd === 1 && rev.length === k - 1) pick = { pos: 0, len: 0 };
    }
    if (!pick) return notFound();
    return isBefore ? text.slice(0, pick.pos) : text.slice(pick.pos + pick.len);
  }

  function parseDateText(text) {
    const t = text.trim();
    // বৈধতা যাচাই: ২০২৪-০২-৩০ বা ৩১/০২/২০২৪ নীরবে পরের মাসে গড়িয়ে যাবে না (Excel-এ #VALUE!)
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
    const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(t);
    if (iso || dmy) {
      const y = iso ? +iso[1] : +dmy[3];
      const mo = iso ? +iso[2] : +dmy[2];
      const d = iso ? +iso[3] : +dmy[1];
      if (mo < 1 || mo > 12 || d < 1 || d > lastDay(y, mo)) return null;
      const s0 = ymdToSerial(y, mo, d);
      return typeof s0 === "number" ? s0 : null;
    }
    let m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})\.?,?[\s-]+(\d{4})$/.exec(t);
    let d, mo, y;
    if (m) {
      d = +m[1];
      mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
      y = +m[3];
    } else {
      m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(t);
      if (!m) return null;
      mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
      d = +m[2];
      y = +m[3];
    }
    if (mo < 0 || d < 1 || d > lastDay(y, mo + 1)) return null;
    const s = ymdToSerial(y, mo + 1, d);
    return typeof s === "number" ? s : null;
  }

  // --------------------------------------------------------------- অর্থ-সহায়ক
  function payment(rate, nper, pv, type) {
    const g = Math.pow(1 + rate, nper);
    return (pv * rate) / ((1 + rate * type) * (1 - 1 / g));
  }
  function cumulative(isInterest) {
    if (argc !== 6) return bad;
    const r = [0, 1, 2, 3, 4, 5].map((i) => numArg(i));
    const e = r.find((x) => typeof x === "string");
    if (e) return e;
    const [rate, nperRaw, pv, startRaw, endRaw, typeRaw] = r;
    const nper = nperRaw;
    const start = Math.trunc(startRaw);
    const end = Math.trunc(endRaw);
    const type = Math.trunc(typeRaw);
    if (rate <= 0 || nper <= 0 || pv <= 0 || start < 1 || end < start || end > nper || (type !== 0 && type !== 1)) return "#NUM!";
    if (end > 1000000) return "#NUM!"; // সীমা: ১০ লক্ষ কিস্তির বেশি নয় (লুপ-সুরক্ষা)
    const P = payment(rate, nper, pv, type);
    let bal = pv;
    let sumI = 0;
    let sumP = 0;
    for (let k = 1; k <= end; k++) {
      let interest;
      let princ;
      if (type === 1 && k === 1) {
        interest = 0;
        princ = P;
      } else {
        interest = bal * rate;
        princ = P - interest;
      }
      bal -= princ;
      if (k >= start) {
        sumI += interest;
        sumP += princ;
      }
    }
    return finite(-(isInterest ? sumI : sumP));
  }

  // --------------------------------------------------------------- ফাংশন
  switch (name) {
    // ================================================================ গণিত
    case "SUMSQ": {
      if (argc < 1) return bad;
      const nums = collectNums(args);
      if (typeof nums === "string") return nums;
      return finite(nums.reduce((s, x) => s + x * x, 0));
    }
    case "EVEN":
    case "ODD": {
      if (argc !== 1) return bad;
      const x = numArg(0);
      if (typeof x === "string") return x;
      if (name === "ODD" && x === 0) return 1;
      if (x === 0) return 0;
      let v = Math.ceil(Math.abs(x) - 1e-12);
      const wantEven = name === "EVEN";
      if ((v % 2 === 0) !== wantEven) v += 1;
      return x < 0 ? -v : v;
    }
    case "QUOTIENT": {
      if (argc !== 2) return bad;
      const n = numArg(0);
      if (typeof n === "string") return n;
      const d = numArg(1);
      if (typeof d === "string") return d;
      if (d === 0) return "#DIV/0!";
      return Math.trunc(cleanNumber(n / d));
    }
    case "CEILING.MATH":
    case "FLOOR.MATH": {
      if (argc < 1 || argc > 3) return bad;
      const x = numArg(0);
      if (typeof x === "string") return x;
      let sig = 1;
      if (args[1]) {
        const s = numArg(1);
        if (typeof s === "string") return s;
        sig = Math.abs(s);
      }
      let mode = 0;
      if (args[2]) {
        const m = numArg(2);
        if (typeof m === "string") return m;
        mode = m;
      }
      if (sig === 0) return 0;
      const q = x / sig;
      const qc = cleanNumber(q);
      const isCeil = name === "CEILING.MATH";
      let r;
      if (x >= 0) r = (isCeil ? Math.ceil(qc) : Math.floor(qc)) * sig;
      else if (mode === 0) r = (isCeil ? Math.ceil(qc) : Math.floor(qc)) * sig;
      else r = (isCeil ? Math.floor(qc) : Math.ceil(qc)) * sig;
      return finite(r === 0 ? 0 : r);
    }
    case "COMBIN":
    case "PERMUT": {
      if (argc !== 2) return bad;
      const a = numArg(0);
      if (typeof a === "string") return a;
      const b = numArg(1);
      if (typeof b === "string") return b;
      const n = Math.trunc(a);
      const k = Math.trunc(b);
      if (n < 0 || k < 0 || k > n) return "#NUM!";
      if (n > 9007199254740991) return "#NUM!";
      let res = 1;
      if (name === "PERMUT") {
        for (let i = 0; i < k; i++) {
          res *= n - i;
          if (!Number.isFinite(res)) return "#NUM!"; // উপচে গেলে থামি (অসীম লুপ এড়াতে)
        }
      } else {
        const kk = Math.min(k, n - k);
        for (let i = 1; i <= kk; i++) {
          res = (res * (n - kk + i)) / i;
          if (!Number.isFinite(res)) return "#NUM!";
        }
        res = Math.round(res);
      }
      return Number.isFinite(res) ? res : "#NUM!";
    }

    // ================================================================ পরিসংখ্যান
    case "STDEV.S":
    case "STDEV.P":
    case "VAR.S":
    case "VAR.P": {
      if (argc < 1) return bad;
      const nums = collectNums(args);
      if (typeof nums === "string") return nums;
      const sample = name.endsWith(".S");
      if (nums.length < (sample ? 2 : 1)) return "#DIV/0!";
      const v = sumSqDev(nums) / (sample ? nums.length - 1 : nums.length);
      return finite(name.startsWith("STDEV") ? Math.sqrt(v) : v, "#VALUE!");
    }
    case "GEOMEAN": {
      if (argc < 1) return bad;
      const nums = collectNums(args);
      if (typeof nums === "string") return nums;
      if (nums.length === 0 || nums.some((x) => x <= 0)) return "#NUM!";
      return finite(Math.exp(nums.reduce((s, x) => s + Math.log(x), 0) / nums.length));
    }
    case "DEVSQ": {
      if (argc < 1) return bad;
      const nums = collectNums(args);
      if (typeof nums === "string") return nums;
      if (nums.length === 0) return "#NUM!";
      return finite(sumSqDev(nums));
    }
    case "RANK.AVG": {
      if (argc < 2 || argc > 3) return bad;
      const x = numArg(0);
      if (typeof x === "string") return x;
      if (!isRef(args[1])) return bad;
      const nums = collectNums([args[1]]);
      if (typeof nums === "string") return nums;
      let order = 0;
      if (args[2]) {
        const o = numArg(2);
        if (typeof o === "string") return o;
        order = o;
      }
      const eq = nums.filter((v) => v === x).length;
      if (eq === 0) return "#N/A";
      const better = nums.filter((v) => (order === 0 ? v > x : v < x)).length;
      return cleanNumber(better + (eq + 1) / 2);
    }
    case "PERCENTRANK.INC": {
      if (argc < 2 || argc > 3) return bad;
      const nums = numsFromRef(0);
      if (typeof nums === "string") return nums;
      const x = numArg(1);
      if (typeof x === "string") return x;
      let sigd = 3;
      if (args[2]) {
        const s = numArg(2);
        if (typeof s === "string") return s;
        sigd = Math.trunc(s);
      }
      if (sigd < 1) return "#NUM!";
      if (nums.length === 0) return "#NUM!";
      const a = nums.slice().sort((p, q) => p - q);
      const n = a.length;
      if (x < a[0] || x > a[n - 1]) return "#N/A";
      let r;
      if (n === 1) r = 1;
      else {
        const idx = a.indexOf(x);
        if (idx >= 0) r = idx / (n - 1);
        else {
          let i = 0;
          while (a[i + 1] < x) i++;
          r = i / (n - 1) + ((x - a[i]) / (a[i + 1] - a[i])) / (n - 1);
        }
      }
      const f = Math.pow(10, sigd);
      return cleanNumber(Math.floor(r * f + 1e-9) / f);
    }

    // ================================================================ টেক্সট
    case "TEXTBEFORE":
      return textBeforeAfter(true);
    case "TEXTAFTER":
      return textBeforeAfter(false);
    case "NUMBERVALUE": {
      if (argc < 1 || argc > 3) return bad;
      const t = ev(0);
      if (isFormulaError(t)) return t;
      let dec = ".";
      let grp = ",";
      if (args[1]) {
        const d = ev(1);
        if (isFormulaError(d)) return d;
        dec = String(d).charAt(0);
        if (String(d) === "") dec = ".";
      }
      if (args[2]) {
        const g = ev(2);
        if (isFormulaError(g)) return g;
        grp = String(g).charAt(0);
      }
      if (dec === grp) return bad;
      let s = h.normalizeLocalizedDigits(String(t)).replace(/\s+/g, "");
      if (s === "") return 0;
      let pct = 0;
      while (s.endsWith("%")) {
        pct++;
        s = s.slice(0, -1);
      }
      const di = s.indexOf(dec);
      let intPart = di >= 0 ? s.slice(0, di) : s;
      const frac = di >= 0 ? s.slice(di + 1) : "";
      if (frac.includes(dec)) return bad;
      intPart = intPart.split(grp).join("");
      const joined = frac === "" && di < 0 ? intPart : `${intPart || "0"}.${frac}`;
      if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(joined)) return bad;
      let n = Number(joined);
      if (!Number.isFinite(n)) return bad;
      n = n / Math.pow(100, pct);
      return cleanNumber(n);
    }
    case "FIXED":
    case "DOLLAR": {
      const isFixed = name === "FIXED";
      if (argc < 1 || argc > (isFixed ? 3 : 2)) return bad;
      const x = numArg(0);
      if (typeof x === "string") return x;
      let decimals = 2;
      if (args[1]) {
        const d = numArg(1);
        if (typeof d === "string") return d;
        decimals = Math.trunc(d);
      }
      let noCommas = false;
      if (isFixed && args[2]) {
        const v = ev(2);
        if (isFormulaError(v)) return v;
        noCommas = typeof v === "boolean" ? v : Number(v) !== 0;
      }
      const rounded = h.roundHalfAway(x, decimals);
      const showDec = Math.max(0, Math.min(decimals, 10));
      const abs = Math.abs(rounded);
      let body;
      if (isFixed && noCommas) body = h.toDisplayDigits(abs.toFixed(showDec));
      else body = h.formatDisplayNumber(abs, showDec);
      if (isFixed) return (rounded < 0 ? "-" : "") + body;
      return rounded < 0 ? `($${body})` : `$${body}`;
    }
    case "T": {
      if (argc !== 1) return bad;
      const v = ev(0);
      if (isFormulaError(v)) return v;
      if (args[0].kind === "ref") return typeof v === "string" ? v : "";
      return typeof v === "string" ? v : "";
    }

    // ================================================================ তারিখ-সময়
    case "DATEVALUE": {
      if (argc !== 1) return bad;
      const v = ev(0);
      if (isFormulaError(v)) return v;
      if (typeof v !== "string") return bad;
      const s = parseDateText(v);
      return s === null ? bad : s;
    }
    case "TIMEVALUE": {
      if (argc !== 1) return bad;
      const v = ev(0);
      if (isFormulaError(v)) return v;
      if (typeof v !== "string") return bad;
      const m = /(?:^|[T\s])(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?\s*([AaPp][Mm])?\s*$/.exec(v.trim());
      if (!m) return bad;
      let hh = +m[1];
      const mm = +m[2];
      const ss = m[3] ? +m[3] : 0;
      const ap = m[4] ? m[4].toLowerCase() : null;
      if (mm > 59 || ss >= 60) return bad;
      if (ap) {
        if (hh < 1 || hh > 12) return bad;
        if (ap === "am" && hh === 12) hh = 0;
        if (ap === "pm" && hh !== 12) hh += 12;
      } else if (hh > 23) return bad;
      return cleanNumber((hh * 3600 + mm * 60 + ss) / SEC_PER_DAY);
    }
    case "YEARFRAC": {
      if (argc < 2 || argc > 3) return bad;
      let s = dateArg(0);
      if (typeof s === "string") return s;
      let e = dateArg(1);
      if (typeof e === "string") return e;
      let basis = 0;
      if (args[2]) {
        const b = numArg(2);
        if (typeof b === "string") return b;
        basis = Math.trunc(b);
      }
      if (basis < 0 || basis > 4) return "#NUM!";
      s = Math.floor(s);
      e = Math.floor(e);
      if (s > e) [s, e] = [e, s];
      const a = serialToYMD(s);
      const b = serialToYMD(e);
      if (!a || !b) return "#NUM!";
      const actual = e - s;
      if (basis === 0) return cleanNumber(days360(a, b, false) / 360);
      if (basis === 4) return cleanNumber(days360(a, b, true) / 360);
      if (basis === 2) return cleanNumber(actual / 360);
      if (basis === 3) return cleanNumber(actual / 365);
      // basis 1: প্রকৃত/প্রকৃত
      let denom;
      if (a.y === b.y) denom = daysInYear(a.y);
      else {
        const within1y = b.y === a.y + 1 && (b.m < a.m || (b.m === a.m && b.d <= a.d));
        if (within1y) {
          const feb29 = (isLeap(a.y) && a.m <= 2) || (isLeap(b.y) && (b.m > 2 || (b.m === 2 && b.d === 29)));
          denom = feb29 ? 366 : 365;
        } else {
          let total = 0;
          for (let y = a.y; y <= b.y; y++) total += daysInYear(y);
          denom = total / (b.y - a.y + 1);
        }
      }
      return cleanNumber(actual / denom);
    }
    case "DAYS360": {
      if (argc < 2 || argc > 3) return bad;
      const s = dateArg(0);
      if (typeof s === "string") return s;
      const e = dateArg(1);
      if (typeof e === "string") return e;
      let european = false;
      if (args[2]) {
        const v = ev(2);
        if (isFormulaError(v)) return v;
        european = typeof v === "boolean" ? v : Number(v) !== 0;
      }
      const a = serialToYMD(Math.floor(s));
      const b = serialToYMD(Math.floor(e));
      if (!a || !b) return "#NUM!";
      return days360(a, b, european, false);
    }
    case "ISOWEEKNUM": {
      if (argc !== 1) return bad;
      const s = dateArg(0);
      if (typeof s === "string") return s;
      const p = serialToYMD(Math.floor(s));
      if (!p) return "#NUM!";
      const dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
      const dow = dt.getUTCDay() || 7; // সোম=1 … রবি=7
      dt.setUTCDate(dt.getUTCDate() + 4 - dow); // সেই সপ্তাহের বৃহস্পতিবার
      const yearStart = Date.UTC(dt.getUTCFullYear(), 0, 1);
      return Math.ceil(((dt.getTime() - yearStart) / 86400000 + 1) / 7);
    }
    case "NETWORKDAYS.INTL": {
      if (argc < 2 || argc > 4) return bad;
      const s0 = dateArg(0);
      if (typeof s0 === "string") return s0;
      const e0 = dateArg(1);
      if (typeof e0 === "string") return e0;
      const mask = weekendMask(2);
      if (typeof mask === "string") return mask;
      const holidays = readHolidays(args[3]);
      if (typeof holidays === "string") return holidays;
      const isWork = isWorkWith(mask, holidays);
      const a = Math.floor(s0);
      const b = Math.floor(e0);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      let count = 0;
      for (let d = lo; d <= hi; d++) if (isWork(d)) count++;
      return a <= b ? count : -count;
    }
    case "WORKDAY.INTL": {
      if (argc < 2 || argc > 4) return bad;
      const s0 = dateArg(0);
      if (typeof s0 === "string") return s0;
      const n = numArg(1);
      if (typeof n === "string") return n;
      const mask = weekendMask(2);
      if (typeof mask === "string") return mask;
      const holidays = readHolidays(args[3]);
      if (typeof holidays === "string") return holidays;
      const isWork = isWorkWith(mask, holidays);
      let remaining = Math.trunc(n);
      let d = Math.floor(s0);
      const step = remaining >= 0 ? 1 : -1;
      remaining = Math.abs(remaining);
      while (remaining > 0) {
        d += step;
        if (d < 0 || d > 2958465) return "#NUM!";
        if (isWork(d)) remaining--;
      }
      return d;
    }

    // ================================================================ তথ্য ও লজিক
    case "ISODD":
    case "ISEVEN": {
      if (argc !== 1) return bad;
      const v = ev(0);
      if (isFormulaError(v)) return v;
      if (typeof v === "boolean") return bad;
      const x = h.operandNumber(v);
      if (typeof x === "string") return x;
      const odd = Math.abs(Math.trunc(x)) % 2 === 1;
      return name === "ISODD" ? odd : !odd;
    }
    case "ISLOGICAL": {
      if (argc !== 1) return bad;
      return typeof ev(0) === "boolean";
    }
    case "ISNONTEXT": {
      if (argc !== 1) return bad;
      return !evalFn({ ...node, name: "ISTEXT" }, getCell, expandRange);
    }
    case "N": {
      if (argc !== 1) return bad;
      const v = ev(0);
      if (isFormulaError(v)) return v;
      if (typeof v === "number") return v;
      if (typeof v === "boolean") return v ? 1 : 0;
      return 0;
    }
    case "TYPE": {
      if (argc !== 1) return bad;
      if (args[0].kind === "range") return 64;
      const v = ev(0);
      if (isFormulaError(v)) return 16;
      if (typeof v === "number") return 1;
      if (typeof v === "boolean") return 4;
      if (args[0].kind === "ref" && v === "") return 1; // ফাঁকা সেল
      return 2;
    }
    case "NA": {
      if (argc !== 0) return bad;
      return "#N/A";
    }
    case "XOR": {
      if (argc < 1) return bad;
      let trues = 0;
      let seen = 0;
      for (const a of args) {
        if (isRef(a)) {
          const g = readGrid(a, getCell, ctx);
          if (!g) return bad;
          if (g.error) return g.error;
          for (const row of g.rows)
            for (const v of row) {
              if (isFormulaError(v)) return v;
              if (typeof v === "boolean") {
                seen++;
                if (v) trues++;
              } else if (typeof v === "number") {
                seen++;
                if (v !== 0) trues++;
              }
            }
        } else {
          const v = evalFn(a, getCell, expandRange);
          if (isFormulaError(v)) return v;
          if (typeof v === "boolean") {
            seen++;
            if (v) trues++;
          } else if (typeof v === "number") {
            seen++;
            if (v !== 0) trues++;
          } else return bad;
        }
      }
      if (seen === 0) return bad;
      return trues % 2 === 1;
    }

    // ================================================================ লুকআপ ও রেফারেন্স
    case "LOOKUP": {
      if (argc < 2 || argc > 3) return bad;
      const look = ev(0);
      if (isFormulaError(look)) return look;
      const g = readGrid(args[1], getCell, ctx);
      if (!g) return bad;
      if (g.error) return g.error;
      const rows = g.rows.length;
      const cols = g.rows[0].length;
      if (argc === 3) {
        const r = readGrid(args[2], getCell, ctx);
        if (!r) return bad;
        if (r.error) return r.error;
        const vec = rows === 1 ? g.rows[0] : g.rows.map((x) => x[0]);
        const res = r.rows.length === 1 ? r.rows[0] : r.rows.map((x) => x[0]);
        const idx = h.approxIndex(vec, look, 1);
        if (idx === -1 || idx >= res.length) return "#N/A";
        return res[idx];
      }
      // অ্যারে-ফর্ম: প্রশস্ত হলে প্রথম সারিতে খোঁজা, শেষ সারি ফেরত; নইলে প্রথম কলাম, শেষ কলাম
      if (cols > rows) {
        const idx = h.approxIndex(g.rows[0], look, 1);
        return idx === -1 ? "#N/A" : g.rows[rows - 1][idx];
      }
      const idx = h.approxIndex(g.rows.map((x) => x[0]), look, 1);
      return idx === -1 ? "#N/A" : g.rows[idx][cols - 1];
    }
    case "ADDRESS": {
      if (argc < 2 || argc > 5) return bad;
      const r = numArg(0);
      if (typeof r === "string") return r;
      const c = numArg(1);
      if (typeof c === "string") return c;
      let abs = 1;
      if (args[2]) {
        const a = numArg(2);
        if (typeof a === "string") return a;
        abs = Math.trunc(a);
      }
      let a1 = true;
      if (args[3]) {
        const v = ev(3);
        if (isFormulaError(v)) return v;
        a1 = typeof v === "boolean" ? v : Number(v) !== 0;
      }
      let sheet = "";
      if (args[4]) {
        const sv = ev(4);
        if (isFormulaError(sv)) return sv;
        sheet = String(sv);
      }
      const row = Math.trunc(r);
      const col = Math.trunc(c);
      if (row < 1 || row > 1048576 || col < 1 || col > 16384 || abs < 1 || abs > 4) return bad;
      let ref;
      if (a1) {
        let letters = "";
        for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
        const absCol = abs === 1 || abs === 3;
        const absRow = abs === 1 || abs === 2;
        ref = `${absCol ? "$" : ""}${letters}${absRow ? "$" : ""}${row}`;
      } else {
        const absRow = abs === 1 || abs === 2;
        const absCol = abs === 1 || abs === 3;
        ref = `R${absRow ? row : `[${row}]`}C${absCol ? col : `[${col}]`}`;
      }
      if (sheet !== "") {
        const q = /^[A-Za-z_][A-Za-z0-9_.]*$/.test(sheet) ? sheet : `'${sheet.replace(/'/g, "''")}'`;
        return `${q}!${ref}`;
      }
      return ref;
    }
    case "HYPERLINK": {
      if (argc < 1 || argc > 2) return bad;
      const link = ev(0);
      if (isFormulaError(link)) return link;
      if (argc === 2) return ev(1);
      return typeof link === "boolean" ? (link ? "TRUE" : "FALSE") : link;
    }
    case "AGGREGATE": {
      if (argc < 3) return bad;
      const fnN = numArg(0);
      if (typeof fnN === "string") return fnN;
      const optN = numArg(1);
      if (typeof optN === "string") return optN;
      const fn = Math.trunc(fnN);
      const opt = Math.trunc(optN);
      if (fn < 1 || fn > 19 || opt < 0 || opt > 7) return bad;
      const ignoreErrors = opt === 2 || opt === 3 || opt === 6 || opt === 7;
      const arrayForm = fn >= 14;
      if (arrayForm) {
        if (argc !== 4) return bad;
        const nums = numsFromRef(2, { ignoreErrors });
        if (typeof nums === "string") return nums;
        const k = numArg(3);
        if (typeof k === "string") return k;
        const a = nums.slice().sort((p, q) => p - q);
        const n = a.length;
        if (fn === 14 || fn === 15) {
          const kk = Math.trunc(k);
          if (kk < 1 || kk > n) return "#NUM!";
          return fn === 14 ? a[n - kk] : a[kk - 1];
        }
        if (n === 0) return "#NUM!";
        const exclusive = fn === 18 || fn === 19;
        const quart = fn === 17 || fn === 19;
        let p = k;
        if (quart) {
          if (!Number.isInteger(Math.trunc(k)) || Math.trunc(k) < (exclusive ? 1 : 0) || Math.trunc(k) > (exclusive ? 3 : 4)) return "#NUM!";
          p = Math.trunc(k) / 4;
        }
        if (!exclusive) {
          if (p < 0 || p > 1) return "#NUM!";
          const pos = p * (n - 1);
          const lo = Math.floor(pos);
          const frac = pos - lo;
          return cleanNumber(lo + 1 < n ? a[lo] + frac * (a[lo + 1] - a[lo]) : a[lo]);
        }
        if (p <= 0 || p >= 1) return "#NUM!";
        const pos = p * (n + 1);
        if (pos < 1 || pos > n) return "#NUM!";
        const lo = Math.floor(pos);
        const frac = pos - lo;
        return cleanNumber(lo < n ? a[lo - 1] + frac * (a[lo] - a[lo - 1]) : a[lo - 1]);
      }
      const refs = args.slice(2);
      if (fn === 3) {
        // COUNTA
        let count = 0;
        for (const a of refs) {
          if (isRef(a)) {
            const g = readGrid(a, getCell, ctx);
            if (!g) return bad;
            if (g.error) return g.error;
            for (const row of g.rows)
              for (const v of row) {
                if (isFormulaError(v)) {
                  if (!ignoreErrors) count++;
                } else if (v !== "") count++;
              }
          } else {
            const v = evalFn(a, getCell, expandRange);
            if (isFormulaError(v)) {
              if (!ignoreErrors) count++;
            } else count++;
          }
        }
        return count;
      }
      const nums = collectNums(refs, { ignoreErrors });
      if (typeof nums === "string") return nums;
      const n = nums.length;
      switch (fn) {
        case 1:
          return n === 0 ? "#DIV/0!" : finite(mean(nums));
        case 2:
          return n;
        case 4:
          return n === 0 ? 0 : Math.max(...nums);
        case 5:
          return n === 0 ? 0 : Math.min(...nums);
        case 6:
          return finite(nums.reduce((p, x) => p * x, 1));
        case 7:
        case 8:
        case 10:
        case 11: {
          const sample = fn === 7 || fn === 10;
          if (n < (sample ? 2 : 1)) return "#DIV/0!";
          const v = sumSqDev(nums) / (sample ? n - 1 : n);
          return finite(fn === 7 || fn === 8 ? Math.sqrt(v) : v);
        }
        case 9:
          return finite(nums.reduce((s, x) => s + x, 0));
        case 12: {
          if (n === 0) return "#NUM!";
          const a = nums.slice().sort((p, q) => p - q);
          return n % 2 ? a[(n - 1) / 2] : cleanNumber((a[n / 2 - 1] + a[n / 2]) / 2);
        }
        case 13: {
          const counts = new Map();
          let best = null;
          let bestC = 1;
          for (const v of nums) counts.set(v, (counts.get(v) || 0) + 1);
          for (const v of nums) {
            const c = counts.get(v);
            if (c > bestC) {
              best = v;
              bestC = c;
            }
          }
          return best === null ? "#N/A" : best;
        }
        default:
          return bad;
      }
    }

    // ================================================================ অর্থ
    case "SLN": {
      if (argc !== 3) return bad;
      const r = [0, 1, 2].map((i) => numArg(i));
      const e = r.find((x) => typeof x === "string");
      if (e) return e;
      if (r[2] === 0) return "#DIV/0!";
      return finite((r[0] - r[1]) / r[2]);
    }
    case "SYD": {
      if (argc !== 4) return bad;
      const r = [0, 1, 2, 3].map((i) => numArg(i));
      const e = r.find((x) => typeof x === "string");
      if (e) return e;
      const [cost, salvage, life, per] = r;
      if (life <= 0 || per < 1 || per > life) return "#NUM!";
      return finite(((cost - salvage) * (life - per + 1) * 2) / (life * (life + 1)));
    }
    case "DB": {
      if (argc < 4 || argc > 5) return bad;
      const r = [0, 1, 2, 3].map((i) => numArg(i));
      const e = r.find((x) => typeof x === "string");
      if (e) return e;
      const [cost, salvage, life, periodRaw] = r;
      let month = 12;
      if (args[4]) {
        const m = numArg(4);
        if (typeof m === "string") return m;
        month = Math.trunc(m);
      }
      const period = Math.trunc(periodRaw);
      if (cost < 0 || salvage < 0 || life <= 0 || period < 1 || month < 1 || month > 12) return "#NUM!";
      if (period > life && !(month < 12 && period === Math.trunc(life) + 1)) return "#NUM!";
      if (cost === 0) return "#NUM!";
      if (period > 1000000) return "#NUM!"; // লুপ-সুরক্ষা
      const rate = Math.round((1 - Math.pow(salvage / cost, 1 / life)) * 1000) / 1000;
      let total = 0;
      let dep = 0;
      for (let p = 1; p <= period; p++) {
        if (p === 1) dep = (cost * rate * month) / 12;
        else if (p === Math.trunc(life) + 1) dep = ((cost - total) * rate * (12 - month)) / 12;
        else dep = (cost - total) * rate;
        if (p < period) total += dep;
      }
      return finite(dep);
    }
    case "DDB": {
      if (argc < 4 || argc > 5) return bad;
      const r = [0, 1, 2, 3].map((i) => numArg(i));
      const e = r.find((x) => typeof x === "string");
      if (e) return e;
      const [cost, salvage, life, period] = r;
      let factor = 2;
      if (args[4]) {
        const f = numArg(4);
        if (typeof f === "string") return f;
        factor = f;
      }
      if (cost < 0 || salvage < 0 || life <= 0 || period <= 0 || factor <= 0 || period > life) return "#NUM!";
      if (!Number.isInteger(period)) return "#NUM!"; // সীমাবদ্ধতা: শুধু পূর্ণসংখ্যা period
      if (period > 1000000) return "#NUM!"; // লুপ-সুরক্ষা
      let total = 0;
      let dep = 0;
      for (let p = 1; p <= period; p++) {
        dep = Math.max(0, Math.min((cost - total) * (factor / life), cost - salvage - total));
        total += dep;
      }
      return finite(dep);
    }
    case "CUMIPMT":
      return cumulative(true);
    case "CUMPRINC":
      return cumulative(false);
    case "EFFECT":
    case "NOMINAL": {
      if (argc !== 2) return bad;
      const rate = numArg(0);
      if (typeof rate === "string") return rate;
      const pRaw = numArg(1);
      if (typeof pRaw === "string") return pRaw;
      const p = Math.trunc(pRaw);
      if (rate <= 0 || p < 1) return "#NUM!";
      return name === "EFFECT" ? finite(Math.pow(1 + rate / p, p) - 1) : finite(p * (Math.pow(1 + rate, 1 / p) - 1));
    }
    case "MIRR": {
      if (argc !== 3) return bad;
      const vals = numsFromRef(0);
      if (typeof vals === "string") return vals;
      const fr = numArg(1);
      if (typeof fr === "string") return fr;
      const rr = numArg(2);
      if (typeof rr === "string") return rr;
      const n = vals.length;
      if (n < 2 || !vals.some((v) => v > 0) || !vals.some((v) => v < 0)) return "#DIV/0!";
      if (fr <= -1 || rr <= -1) return "#NUM!";
      let fvPos = 0;
      let pvNeg = 0;
      vals.forEach((v, t) => {
        if (v > 0) fvPos += v * Math.pow(1 + rr, n - 1 - t);
        else if (v < 0) pvNeg += v / Math.pow(1 + fr, t);
      });
      return finite(Math.pow(-fvPos / pvNeg, 1 / (n - 1)) - 1);
    }
    default:
      return undefined;
  }
}

const BATCH1_SET = new Set(BATCH1_FUNCTION_NAMES);
