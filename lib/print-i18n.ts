/**
 * ALIMXL print-interface localization. No React or external dependencies.
 * Safe to import on server or client; storage is accessed only by explicit calls.
 * Does not translate worksheet contents, mirror tables, or control browser UI.
 */
export type PrintLanguage = "bn" | "en" | "ar";
export type PrintDirection = "ltr" | "rtl";
export type PrintParameter = string | number;
export const DEFAULT_PRINT_LANGUAGE: PrintLanguage = "en";
export const PRINT_LANGUAGE_STORAGE_KEY = "alimxl.print.language.v1";

export const PRINT_LANGUAGES = Object.freeze([
  Object.freeze({ code: "bn", label: "বাংলা", locale: "bn-BD", dir: "ltr" }),
  Object.freeze({ code: "en", label: "English", locale: "en-US", dir: "ltr" }),
  Object.freeze({ code: "ar", label: "العربية", locale: "ar", dir: "rtl" }),
] as const);

// Each row contains [Bengali, English, Arabic]. Keep placeholders identical.
const messages = {
  print: ["প্রিন্ট", "Print", "طباعة"],
  printAction: ["প্রিন্ট করুন", "Print", "اطبع"],
  printOptions: ["প্রিন্টের বিকল্প", "Print options", "خيارات الطباعة"],
  printerAndPrint: ["প্রিন্টার নির্বাচন ও প্রিন্ট", "Choose printer and print", "اختيار الطابعة والطباعة"],
  cancel: ["বাতিল", "Cancel", "إلغاء"],
  close: ["বন্ধ", "Close", "إغلاق"],
  apply: ["প্রয়োগ করুন", "Apply", "تطبيق"],
  save: ["সংরক্ষণ করুন", "Save", "حفظ"],
  reset: ["পুনর্নির্ধারণ", "Reset", "إعادة ضبط"],
  retry: ["আবার চেষ্টা করুন", "Try again", "إعادة المحاولة"],
  settings: ["সেটিংস", "Settings", "الإعدادات"],
  language: ["ভাষা", "Language", "اللغة"],
  languageSaved: ["ভাষার পছন্দ সংরক্ষিত হয়েছে।", "Language preference saved.", "تم حفظ اللغة المفضلة."],
  languageNotSaved: ["এইবার ভাষা বদলেছে, তবে পছন্দ সংরক্ষণ করা যায়নি।", "Language changed for this session, but the preference could not be saved.", "تم تغيير اللغة لهذه الجلسة، لكن تعذر حفظ التفضيل."],
  printTitle: ["প্রিন্ট — {name}", "Print — {name}", "طباعة — {name}"],
  workspaceDescription: ["প্রাক্‌দর্শন ও সেটিংস একই জায়গায়। প্রিন্টের আগে সব পৃষ্ঠা দেখুন।", "Preview and settings in one place. Review every page before printing.", "المعاينة والإعدادات في مكان واحد. راجع جميع الصفحات قبل الطباعة."],
  printer: ["প্রিন্টার", "Printer", "الطابعة"],
  printerHelp: ["শেষ প্রিন্ট সংলাপে প্রিন্টার, কপির সংখ্যা ও পৃষ্ঠা নির্বাচন করুন।", "Choose the printer, copies and pages in the final print dialog.", "اختر الطابعة وعدد النسخ والصفحات في مربع حوار الطباعة النهائي."],
  copies: ["কপির সংখ্যা", "Copies", "عدد النسخ"],
  pages: ["পৃষ্ঠাসমূহ", "Pages", "الصفحات"],
  allPages: ["সব পৃষ্ঠা", "All pages", "كل الصفحات"],
  pageRange: ["পৃষ্ঠার পরিসর", "Page range", "نطاق الصفحات"],
  color: ["রঙ", "Color", "الألوان"],
  colorMode: ["রঙিন", "Color", "ملون"],
  grayscale: ["সাদাকালো", "Grayscale", "تدرج الرمادي"],
  duplex: ["উভয় পাশে প্রিন্ট", "Print on both sides", "الطباعة على الوجهين"],
  paperAndLayout: ["কাগজ ও পৃষ্ঠা-বিন্যাস", "Paper and layout", "الورق والتخطيط"],
  paperSize: ["কাগজের মাপ", "Paper size", "حجم الورق"],
  a4: ["A4 — ২১০ × ২৯৭ মিমি", "A4 — 210 × 297 mm", "A4 — ٢١٠ × ٢٩٧ مم"],
  letter: ["লেটার — ৮.৫ × ১১ ইঞ্চি", "Letter — 8.5 × 11 in", "Letter — ٨٫٥ × ١١ بوصة"],
  legal: ["লিগ্যাল — ৮.৫ × ১৪ ইঞ্চি", "Legal — 8.5 × 14 in", "Legal — ٨٫٥ × ١٤ بوصة"],
  orientation: ["পৃষ্ঠার দিক", "Orientation", "اتجاه الصفحة"],
  portrait: ["লম্বালম্বি", "Portrait", "عمودي"],
  landscape: ["আড়াআড়ি", "Landscape", "أفقي"],
  margins: ["মার্জিন", "Margins", "الهوامش"],
  millimeters: ["মিলিমিটার", "Millimeters", "ملليمتر"],
  top: ["ওপরে", "Top", "أعلى"],
  right: ["ডানে", "Right", "يمين"],
  bottom: ["নিচে", "Bottom", "أسفل"],
  left: ["বামে", "Left", "يسار"],
  areaAndScaling: ["প্রিন্টের পরিসর ও আকার", "Print area and scaling", "نطاق الطباعة والتحجيم"],
  printArea: ["প্রিন্টের পরিসর", "Print area", "نطاق الطباعة"],
  printAreaPlaceholder: ["খালি রাখলে ব্যবহৃত অংশ", "Leave blank to use the content area", "اتركه فارغًا لاستخدام نطاق المحتوى"],
  printAreaHelp: ["সেলের ঠিকানা দিন, যেমন A1:J32।", "Enter a cell range, such as A1:J32.", "أدخل نطاق خلايا، مثل A1:J32."],
  scaling: ["কাগজে বিষয়বস্তুর আকার", "Content scaling", "تحجيم المحتوى"],
  percentage: ["শতকরা হারে", "Percentage", "نسبة مئوية"],
  fitWidth: ["সব কলাম এক পৃষ্ঠা চওড়ায়", "Fit all columns to one page wide", "احتواء كل الأعمدة في عرض صفحة واحدة"],
  fitRange: ["পুরো পরিসর এক পৃষ্ঠায়", "Fit the entire range on one page", "احتواء النطاق كله في صفحة واحدة"],
  printScale: ["প্রিন্টের আকার", "Print scale", "مقياس الطباعة"],
  scaleValue: ["প্রিন্টের আকার: {scale}", "Print scale: {scale}", "مقياس الطباعة: {scale}"],
  scalingHelp: ["প্রয়োজনে বিষয়বস্তু ছোট হবে। পর্দার বিবর্ধন প্রিন্টের আকার বদলায় না।", "Content may shrink to fit. Preview zoom does not change print scale.", "قد يُصغّر المحتوى ليلائم الصفحة. تكبير المعاينة لا يغيّر مقياس الطباعة."],
  preview: ["প্রাক্‌দর্শন", "Preview", "معاينة"],
  paperPreview: ["কাগজের প্রাক্‌দর্শন দেখুন", "Show paper preview", "عرض معاينة الورق"],
  previewZoom: ["প্রাক্‌দর্শনের বিবর্ধন", "Preview zoom", "تكبير المعاينة"],
  zoomIn: ["বড় করে দেখুন", "Zoom in", "تكبير"],
  zoomOut: ["ছোট করে দেখুন", "Zoom out", "تصغير"],
  fitPageView: ["পুরো পৃষ্ঠা দেখুন", "Fit page to view", "ملاءمة الصفحة للعرض"],
  fitWidthView: ["প্রস্থ অনুযায়ী দেখুন", "Fit width to view", "ملاءمة العرض"],
  page: ["পৃষ্ঠা", "Page", "الصفحة"],
  pageOf: ["পৃষ্ঠা {page} / {total}", "Page {page} of {total}", "الصفحة {page} من {total}"],
  firstPage: ["প্রথম পৃষ্ঠা", "First page", "الصفحة الأولى"],
  previousPage: ["আগের পৃষ্ঠা", "Previous page", "الصفحة السابقة"],
  nextPage: ["পরের পৃষ্ঠা", "Next page", "الصفحة التالية"],
  lastPage: ["শেষ পৃষ্ঠা", "Last page", "الصفحة الأخيرة"],
  goToPage: ["এই পৃষ্ঠায় যান", "Go to page", "الانتقال إلى الصفحة"],
  zoomValue: ["বিবর্ধন: {zoom}", "Zoom: {zoom}", "التكبير: {zoom}"],
  breaksAndHeading: ["পৃষ্ঠা ভাগ ও শিরোনাম", "Page breaks and heading", "فواصل الصفحات والعنوان"],
  bodyRowsPerPage: ["প্রতি পৃষ্ঠায় তথ্যের সারি", "Body rows per page", "صفوف البيانات في كل صفحة"],
  automatic: ["স্বয়ংক্রিয়", "Automatic", "تلقائي"],
  rowsPerPageOption: ["প্রতি পৃষ্ঠায় {count} জন / তথ্যের সারি", "{count} people / body rows per page", "{count} أشخاص / صفوف بيانات في كل صفحة"],
  repeatFirstRow: ["প্রথম সারি প্রতি পৃষ্ঠায় দেখান", "Repeat the first row on every page", "تكرار الصف الأول في كل صفحة"],
  lastRowIsTotal: ["শেষ সারি সর্বমোট — নির্ধারিত সারি-ভাগে আগের পৃষ্ঠায় রাখুন", "Last row is the total — keep it on the preceding count-based page", "الصف الأخير هو الإجمالي — أبقه في الصفحة السابقة عند التقسيم بعدد الصفوف"],
  breakScaleHelp: ["নির্ধারিত ভাগে ফিট করতে প্রিন্টের আকার কমতে পারে।", "Print scale may shrink to fit the selected page breaks.", "قد يُصغّر مقياس الطباعة لملاءمة الفواصل المحددة."],
  resetBreaks: ["পৃষ্ঠা ভাগ পুনর্নির্ধারণ", "Reset page breaks", "إعادة ضبط فواصل الصفحات"],
  openBreakEditor: ["দাগ টেনে পৃষ্ঠা ভাগ করুন", "Drag page boundaries", "اسحب حدود الصفحات"],
  breakEditorHelp: ["দাগ ধরে সারি বা কলামের সীমানায় ছাড়ুন।", "Drag a line and release it at a row or column boundary.", "اسحب الخط وأفلته عند حد صف أو عمود."],
  breakEditorHint: ["তীরচিহ্নের বোতামে দাগ সরান; মুছতে Delete চাপুন।", "Use arrow keys to move a boundary; press Delete to remove it.", "استخدم مفاتيح الأسهم لتحريك الحد، واضغط Delete لحذفه."],
  breakPlanningNote: ["এটি পৃষ্ঠা ভাগের পরিকল্পনা; চূড়ান্ত কাগজের প্রাক্‌দর্শন নয়। মূল শিট বদলাবে না।", "This is a page-break plan, not the final paper preview. The worksheet will not change.", "هذا مخطط لفواصل الصفحات، وليس المعاينة النهائية للورق. لن تتغير ورقة العمل."],
  beforeRow: ["সারির আগে", "Before row", "قبل الصف"],
  beforeColumn: ["কলামের আগে", "Before column", "قبل العمود"],
  boundaryIndex: ["সারি বা কলামের নম্বর", "Row or column number", "رقم الصف أو العمود"],
  addBreak: ["দাগ যোগ করুন", "Add page break", "إضافة فاصل صفحة"],
  breakBeforeRow: ["{row} নম্বর সারির আগে পৃষ্ঠা ভাগ", "Page break before row {row}", "فاصل صفحة قبل الصف {row}"],
  breakBeforeColumn: ["{column} কলামের আগে পৃষ্ঠা ভাগ", "Page break before column {column}", "فاصل صفحة قبل العمود {column}"],
  dropBeforeRow: ["{row} নম্বর সারির আগে ছাড়ুন", "Release before row {row}", "أفلت قبل الصف {row}"],
  dropBeforeColumn: ["{column} কলামের আগে ছাড়ুন", "Release before column {column}", "أفلت قبل العمود {column}"],
  invalidBoundary: ["প্রিন্টের পরিসরের ভেতরে একটি বৈধ সারি বা কলামের সীমানা বেছে নিন।", "Choose a valid row or column boundary inside the print area.", "اختر حد صف أو عمود صالحًا داخل نطاق الطباعة."],
  editorLimit: ["এই পরিসর দাগ টানার সম্পাদকের জন্য বেশি বড়। সীমা: {cells} সেল, {rows} সারি, {columns} কলাম।", "This range exceeds the drag editor limits: {cells} cells, {rows} rows, {columns} columns.", "يتجاوز هذا النطاق حدود محرر السحب: {cells} خلية و{rows} صفًا و{columns} عمودًا."],
  textFit: ["লেখা সম্পূর্ণ দেখানো — শুধু প্রিন্টে", "Text fitting — print only", "ملاءمة النص — للطباعة فقط"],
  autoFitRows: ["লেখা অনুযায়ী প্রিন্টের সারির উচ্চতা বাড়ান", "Grow print row heights to fit text", "زيادة ارتفاع صفوف الطباعة لاحتواء النص"],
  wrapText: ["প্রিন্টে লেখা একাধিক লাইনে দেখান", "Wrap text for printing", "التفاف النص عند الطباعة"],
  textFitHelp: ["মূল শিটের বিন্যাস বদলাবে না। দীর্ঘ অবিচ্ছিন্ন শব্দে লেখা বাইরে যেতে পারে।", "Worksheet formatting will not change. Long unbroken words may still overflow.", "لن يتغير تنسيق ورقة العمل. قد تتجاوز الكلمات الطويلة المتصلة حدود الخلية."],
  appearance: ["দেখানোর ধরন", "Appearance", "المظهر"],
  showGridlines: ["সেলের ছক দেখান", "Show gridlines", "إظهار خطوط الشبكة"],
  headerFooter: ["ওপরের ও নিচের পৃষ্ঠালেখ", "Header and footer", "رأس الصفحة وتذييلها"],
  header: ["ওপরের পৃষ্ঠালেখ", "Header", "رأس الصفحة"],
  footer: ["নিচের পৃষ্ঠালেখ", "Footer", "تذييل الصفحة"],
  center: ["মাঝে", "Center", "وسط"],
  headerFooterHelp: ["আপনার লেখা নিজে থেকে অনুবাদ হবে না।", "Your own text will not be translated automatically.", "لن يُترجم النص الذي تكتبه تلقائيًا."],
  preparing: ["প্রস্তুতি চলছে…", "Preparing…", "جارٍ التحضير…"],
  loadingPreview: ["প্রাক্‌দর্শন তৈরি হচ্ছে…", "Preparing preview…", "جارٍ إعداد المعاينة…"],
  noPages: ["প্রিন্ট করার মতো পৃষ্ঠা নেই।", "There are no pages to print.", "لا توجد صفحات للطباعة."],
  selectPrintArea: ["প্রিন্টের পরিসর নির্বাচন করুন।", "Select a print area.", "حدد نطاق الطباعة."],
  worksheetUnchanged: ["বর্তমান সেটিংস অনুযায়ী প্রিন্ট হবে। মূল শিট বদলাবে না।", "Printing uses the current settings. The worksheet will not change.", "ستُستخدم الإعدادات الحالية للطباعة. لن تتغير ورقة العمل."],
  details: ["বিস্তারিত", "Details", "التفاصيل"],
  warnings: ["সতর্কবার্তা", "Warnings", "تحذيرات"],
  overflowCount: ["{count}টি সেলের লেখা ফিট হচ্ছে না।", "Text does not fit in {count} cell(s).", "النص لا يتسع في {count} خلية."],
  cell: ["সেল", "Cell", "الخلية"],
  cellAddress: ["সেলের ঠিকানা", "Cell address", "عنوان الخلية"],
  horizontalOverflow: ["লেখা সেলের প্রস্থ ছাড়িয়েছে।", "Text exceeds the cell width.", "يتجاوز النص عرض الخلية."],
  verticalOverflow: ["লেখা সেলের উচ্চতা ছাড়িয়েছে।", "Text exceeds the cell height.", "يتجاوز النص ارتفاع الخلية."],
  unsupportedContent: ["কিছু বিষয়বস্তু এই প্রিন্ট ব্যবস্থায় সমর্থিত নয়।", "Some content is not supported by this print renderer.", "بعض المحتوى غير مدعوم في عارض الطباعة هذا."],
  errorTitle: ["প্রিন্ট প্রস্তুত করা যায়নি", "Could not prepare printing", "تعذر إعداد الطباعة"],
  unknownError: ["প্রিন্ট প্রস্তুত করা যায়নি। আবার চেষ্টা করুন।", "Printing could not be prepared. Please try again.", "تعذر إعداد الطباعة. حاول مرة أخرى."],
  invalidPrintArea: ["প্রিন্টের পরিসর সঠিক নয়। A1:J32-এর মতো পরিসর দিন।", "Invalid print area. Enter a range such as A1:J32.", "نطاق الطباعة غير صالح. أدخل نطاقًا مثل A1:J32."],
  invalidScale: ["প্রিন্টের আকার {min}% থেকে {max}%-এর মধ্যে হতে হবে।", "Print scale must be between {min}% and {max}%.", "يجب أن يكون مقياس الطباعة بين {min}% و{max}%."],
  invalidMargins: ["মার্জিনের মান সঠিক নয় বা কাগজে জায়গা অবশিষ্ট নেই।", "Margins are invalid or leave no printable area.", "الهوامش غير صالحة أو لا تترك مساحة قابلة للطباعة."],
  invalidRowsPerPage: ["প্রতি পৃষ্ঠার সারিসংখ্যা সঠিক নয়।", "Invalid number of rows per page.", "عدد الصفوف في كل صفحة غير صالح."],
  invalidBreaks: ["পৃষ্ঠা ভাগের সারি বা কলামের নম্বর সঠিক নয়।", "Invalid page-break row or column indices.", "أرقام صفوف أو أعمدة فواصل الصفحات غير صالحة."],
  tooManyCells: ["প্রিন্টের সেলসীমা ছাড়িয়েছে। সীমা: {limit}। পরিসর ছোট করুন।", "Print cell limit exceeded: {limit}. Reduce the print area.", "تم تجاوز حد خلايا الطباعة: {limit}. قلّص نطاق الطباعة."],
  tooManyPages: ["প্রিন্টের পৃষ্ঠাসীমা ছাড়িয়েছে। সীমা: {limit}।", "Print page limit exceeded: {limit}.", "تم تجاوز حد صفحات الطباعة: {limit}."],
  belowMinimumScale: ["এই বিন্যাস সর্বনিম্ন {min}% আকারেও ফিট হচ্ছে না। পরিসর ছোট করুন।", "This layout does not fit even at the minimum scale of {min}%. Reduce the print area.", "هذا التخطيط لا يلائم الصفحة حتى عند الحد الأدنى للمقياس وهو {min}%. قلّص نطاق الطباعة."],
  headingTooTall: ["শিরোনামের সারি পুরো পৃষ্ঠা নিয়ে নিচ্ছে। আকার কমান।", "The heading row fills the printable page. Reduce the scale.", "يشغل صف العنوان كامل مساحة الطباعة. قلّل المقياس."],
  printUnavailable: ["প্রিন্টের সুবিধা পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।", "Printing is unavailable. Please try again.", "الطباعة غير متاحة. حاول مرة أخرى."],
  printFrameFailed: ["প্রিন্টের নথি তৈরি করা যায়নি।", "The print document could not be created.", "تعذر إنشاء مستند الطباعة."],
  printTimedOut: ["প্রিন্ট প্রস্তুতির সময় শেষ হয়েছে। আবার চেষ্টা করুন।", "Print preparation timed out. Try again.", "انتهت مهلة إعداد الطباعة. حاول مرة أخرى."],
  cancelled: ["প্রিন্টের প্রক্রিয়া বন্ধ করা হয়েছে।", "The print process was stopped.", "تم إيقاف عملية الطباعة."],
  printDialogClosed: ["প্রিন্টের সংলাপ বন্ধ হয়েছে।", "The print dialog has closed.", "تم إغلاق مربع حوار الطباعة."],
  checkOutput: ["চূড়ান্ত প্রিন্ট দেওয়ার আগে সব পৃষ্ঠা পরীক্ষা করুন।", "Check every page before confirming the final print.", "تحقق من كل صفحة قبل تأكيد الطباعة النهائية."],
  workbook: ["ওয়ার্কবুক", "Workbook", "المصنف"],
  sheet: ["শিট", "Sheet", "ورقة العمل"],
  pageSetup: ["পৃষ্ঠা বিন্যাস", "Page setup", "إعداد الصفحة"],
  openPageSetup: ["আলাদা পৃষ্ঠা বিন্যাস খুলুন", "Open separate page setup", "فتح إعداد الصفحة المنفصل"],
  setupDescription: ["কাগজ, দিক, মার্জিন, আকার ও প্রিন্টের পরিসর নির্ধারণ করুন।", "Choose paper, orientation, margins, scaling and print area.", "حدد الورق والاتجاه والهوامش والتحجيم ونطاق الطباعة."],
  applyHelp: ["প্রয়োগ করলে পরিবর্তিত সেটিংস কার্যকর হবে।", "Apply to use the changed settings.", "اضغط تطبيق لاستخدام الإعدادات المعدلة."],
  paperDiagramHelp: ["শুধু কাগজের অনুপাত; শিটের বিষয়বস্তুর প্রাক্‌দর্শন নয়।", "Paper proportions only, not a content preview.", "نسب الورق فقط، وليست معاينة للمحتوى."],
  paperDimensions: ["প্রস্থ {width} মিমি · উচ্চতা {height} মিমি", "Width {width} mm · Height {height} mm", "العرض {width} مم · الارتفاع {height} مم"],
  marginHelp: ["ওপরের ও নিচের পৃষ্ঠালেখ মার্জিনের ভেতরে বসবে।", "Headers and footers occupy the top and bottom margins.", "يشغل رأس الصفحة وتذييلها الهامشين العلوي والسفلي."],
  scaleHelp: ["১০–৪০০%। ১০০% = মূল আকার। এটি পর্দার বিবর্ধন নয়।", "10–400%. 100% = original size. This is not preview zoom.", "١٠–٤٠٠٪. ١٠٠٪ = الحجم الأصلي. هذا ليس تكبير المعاينة."],
  borderHelp: ["আপনার দেওয়া সেলের সীমানা আলাদাভাবে বজায় থাকবে।", "Your custom cell borders are preserved separately.", "تُحفظ حدود الخلايا المخصصة بشكل مستقل."],
  tokens: ["পৃষ্ঠালেখের সংকেত", "Header/footer tokens", "رموز الرأس والتذييل"],
  tokenHelp: ["&P = পৃষ্ঠা · &N = মোট পৃষ্ঠা · &D = তারিখ · &T = সময় · &A = শিট · &F = ওয়ার্কবুক · && = &", "&P = page · &N = total pages · &D = date · &T = time · &A = sheet · &F = workbook · && = &", "&P = الصفحة · &N = عدد الصفحات · &D = التاريخ · &T = الوقت · &A = الورقة · &F = المصنف · && = &"],
  previewLimitations: ["পর্দার বিবর্ধন প্রিন্টের আকার বদলায় না। ছবি, চার্ট ও একত্রিত সেল এখনো সমর্থিত নয়।", "Preview zoom does not change print scale. Images, charts and merged cells are not supported yet.", "تكبير المعاينة لا يغير مقياس الطباعة. الصور والمخططات والخلايا المدمجة غير مدعومة بعد."],
  previewPageLabel: ["{page} নম্বর পৃষ্ঠার প্রাক্‌দর্শন", "Preview of page {page}", "معاينة الصفحة {page}"],
  navigation: ["পৃষ্ঠা নির্বাচন ও বিবর্ধন", "Page navigation and zoom", "التنقل بين الصفحات والتكبير"],
  previewNotReady: ["প্রাক্‌দর্শন প্রস্তুত নয়", "Preview is not ready", "المعاينة غير جاهزة"],
  invalidPageList: ["পৃষ্ঠাসংখ্যা ১ থেকে ধারাবাহিক হতে হবে।", "Page numbers must be consecutive, starting at 1.", "يجب أن تكون أرقام الصفحات متتالية بدءًا من ١."],
  invalidTimestamp: ["প্রিন্টের তারিখ বা সময় সঠিক নয়। প্রাক্‌দর্শন আবার তৈরি করুন।", "Invalid print date or time. Rebuild the preview.", "تاريخ الطباعة أو وقتها غير صالح. أعد إنشاء المعاينة."],
  invalidDimensions: ["প্রস্তুত পৃষ্ঠার মাপ সঠিক নয়। প্রাক্‌দর্শন আবার তৈরি করুন।", "Invalid prepared page dimensions. Rebuild the preview.", "أبعاد الصفحة المعدة غير صالحة. أعد إنشاء المعاينة."],
  pageLimitations: ["এই পৃষ্ঠায় কিছু সীমাবদ্ধতা আছে।", "This page has some limitations.", "توجد بعض القيود على هذه الصفحة."],
  moreCells: ["আরও {count}টি সেল…", "{count} more cell(s)…", "{count} خلية إضافية…"],
  contentExceeds: ["বিষয়বস্তু প্রিন্টযোগ্য অংশ ছাড়িয়েছে। পৃষ্ঠা বিন্যাস পরীক্ষা করুন।", "Content exceeds the printable area. Check page setup.", "يتجاوز المحتوى المساحة القابلة للطباعة. تحقق من إعداد الصفحة."],
  imagesNotPrinted: ["{count}টি ছবি এই সংস্করণে প্রিন্ট হবে না।", "{count} image(s) will not be printed in this version.", "لن تُطبع {count} صورة في هذا الإصدار."],
  linksTextOnly: ["লিংকের লেখা থাকবে; লিংকটি ক্লিক করা যাবে না।", "Link text is shown; clickable targets are not included.", "يظهر نص الرابط دون تضمين هدف قابل للنقر."],
  overflowHelp: ["সেলের প্রস্থ, উচ্চতা বা লেখা মোড়ানো ঠিক করুন। শুধু প্রিন্টের আকার কমালে সেলের ভেতরের সমস্যা দূর হয় না।", "Adjust cell width, height or wrapping. Print scaling alone does not fix overflow inside a cell.", "اضبط عرض الخلية أو ارتفاعها أو التفاف النص. التحجيم وحده لا يعالج تجاوز النص داخل الخلية."],
  openEditorHint: ["পৃষ্ঠা ভাগ বদলাতে দাগ টানার সম্পাদক খুলুন।", "Open the boundary editor to adjust page breaks.", "افتح محرر الحدود لتعديل فواصل الصفحات."],
  breakAxis: ["দাগের দিক", "Break axis", "محور الفاصل"],
  a5: ["A5 — ১৪৮ × ২১০ মিমি", "A5 — 148 × 210 mm", "A5 — ١٤٨ × ٢١٠ مم"],
  executive: ["এক্সিকিউটিভ — ১৮৪.১৫ × ২৬৬.৭ মিমি", "Executive — 184.15 × 266.7 mm", "Executive — ١٨٤٫١٥ × ٢٦٦٫٧ مم"],
  invalidInput: ["সঠিক মান দিন এবং আবার চেষ্টা করুন।", "Enter valid values and try again.", "أدخل قيمًا صالحة وحاول مرة أخرى."],
  printInProgress: ["আগের প্রিন্ট সংলাপটি আগে বন্ধ করুন।", "Close the previous print dialog first.", "أغلق مربع حوار الطباعة السابق أولًا."],
  fontsFailed: ["প্রিন্টের ফন্ট লোড করা যায়নি। আবার চেষ্টা করুন।", "Print fonts could not be loaded. Try again.", "تعذر تحميل خطوط الطباعة. حاول مرة أخرى."],
  printPreparingHelp: ["প্রিন্টের নথি প্রস্তুত হচ্ছে। শেষ সংলাপ থেকে প্রিন্ট দিন বা বাতিল করুন।", "Preparing the print document. Print or cancel in the final dialog.", "جارٍ إعداد مستند الطباعة. اطبع أو ألغِ من مربع الحوار النهائي."],
  invalidPaper: ["কাগজের সঠিক মাপ ও দিক নির্বাচন করুন।", "Choose a valid paper size and orientation.", "اختر حجم ورق واتجاهًا صالحين."],
} as const satisfies Record<string, readonly [string, string, string]>;

export type PrintMessageKey = keyof typeof messages;
type MessageTable = Readonly<Record<PrintMessageKey, string>>;
type Placeholders<S extends string> = S extends `${string}{${infer P}}${infer Rest}`
  ? P | Placeholders<Rest> : never;
export type PrintMessageParameterName<K extends PrintMessageKey> =
  Placeholders<(typeof messages)[K][1]>;
export type PrintMessageParams<K extends PrintMessageKey> =
  Readonly<Record<PrintMessageParameterName<K>, PrintParameter>>;
export type PrintTranslationArgs<K extends PrintMessageKey> =
  [PrintMessageParameterName<K>] extends [never]
    ? [params?: never]
    : [params: PrintMessageParams<K>];

const keys = Object.keys(messages) as PrintMessageKey[];
function makeTable(index: 0 | 1 | 2): MessageTable {
  const table = Object.create(null) as Record<PrintMessageKey, string>;
  for (const key of keys) table[key] = messages[key][index];
  return Object.freeze(table);
}
export const printMessages: Readonly<Record<PrintLanguage, MessageTable>> = Object.freeze({
  bn: makeTable(0), en: makeTable(1), ar: makeTable(2),
});

export function isPrintLanguage(value: unknown): value is PrintLanguage {
  return value === "bn" || value === "en" || value === "ar";
}

/** Accepts language codes and regional tags, e.g. ar-SA or bn_BD. */
export function normalizePrintLanguage(
  value: unknown, fallback: PrintLanguage = DEFAULT_PRINT_LANGUAGE,
): PrintLanguage {
  const safeFallback = isPrintLanguage(fallback) ? fallback : DEFAULT_PRINT_LANGUAGE;
  if (typeof value !== "string") return safeFallback;
  const code = value.trim().toLowerCase().split(/[-_]/, 1)[0];
  return isPrintLanguage(code) ? code : safeFallback;
}

export function getPrintDirection(language: PrintLanguage): PrintDirection {
  return normalizePrintLanguage(language) === "ar" ? "rtl" : "ltr";
}

export function getPrintLocale(language: PrintLanguage): string {
  switch (normalizePrintLanguage(language)) {
    case "bn": return "bn-BD";
    case "ar": return "ar";
    default: return "en-US";
  }
}

const numberFormatters = new Map<PrintLanguage, Intl.NumberFormat>();
const percentFormatters = new Map<PrintLanguage, Intl.NumberFormat>();

/** Display only: do not use localized output as numeric input or sheet data. */
export function formatPrintNumber(language: PrintLanguage, value: number): string {
  if (!Number.isFinite(value)) throw new RangeError("Print UI numbers must be finite.");
  const lang = normalizePrintLanguage(language);
  let formatter = numberFormatters.get(lang);
  if (!formatter) {
    formatter = new Intl.NumberFormat(getPrintLocale(lang), {
      useGrouping: false, maximumFractionDigits: 20,
      numberingSystem: lang === "bn" ? "beng" : lang === "ar" ? "arab" : "latn",
    });
    numberFormatters.set(lang, formatter);
  }
  return formatter.format(value);
}

/** Pass 84.08 for 84.08%, not 0.8408. */
export function formatPrintPercent(language: PrintLanguage, percentage: number): string {
  if (!Number.isFinite(percentage)) throw new RangeError("Print UI percentages must be finite.");
  const lang = normalizePrintLanguage(language);
  let formatter = percentFormatters.get(lang);
  if (!formatter) {
    formatter = new Intl.NumberFormat(getPrintLocale(lang), {
      style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 2,
      numberingSystem: lang === "bn" ? "beng" : lang === "ar" ? "arab" : "latn",
    });
    percentFormatters.set(lang, formatter);
  }
  return formatter.format(percentage / 100);
}

/**
 * Returns plain text, never HTML. Render through React text nodes.
 * Required placeholders are checked by TypeScript and at runtime.
 * Numbers are localized; strings (names, A1 ranges) are preserved unchanged.
 */
export function translatePrint<K extends PrintMessageKey>(
  language: PrintLanguage, key: K, ...args: PrintTranslationArgs<K>
): string {
  const table = printMessages[normalizePrintLanguage(language)];
  if (!Object.prototype.hasOwnProperty.call(table, key)) {
    throw new TypeError(`Unknown print translation key: ${String(key)}`);
  }
  const params = args[0] as Readonly<Record<string, PrintParameter>> | undefined;
  return table[key].replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_token: string, name: string) => {
    if (!params || !Object.prototype.hasOwnProperty.call(params, name)) {
      throw new TypeError(`Missing print translation parameter: ${String(key)}.${name}`);
    }
    const value = params[name];
    if (typeof value === "number") return formatPrintNumber(language, value);
    if (typeof value === "string") return value;
    throw new TypeError(`Invalid print translation parameter: ${String(key)}.${name}`);
  });
}

export function getPrintTranslator(language: PrintLanguage) {
  const lang = normalizePrintLanguage(language);
  return function t<K extends PrintMessageKey>(key: K, ...args: PrintTranslationArgs<K>): string {
    return translatePrint(lang, key, ...args);
  };
}

/** Call after client mount to avoid server/client first-render disagreement. */
export function readStoredPrintLanguage(
  fallback: PrintLanguage = DEFAULT_PRINT_LANGUAGE,
  storageKey: string = PRINT_LANGUAGE_STORAGE_KEY,
): PrintLanguage {
  const lang = normalizePrintLanguage(fallback);
  if (typeof window === "undefined") return lang;
  try {
    return normalizePrintLanguage(window.localStorage.getItem(storageKey), lang);
  } catch {
    return lang;
  }
}

/**
 * False means storage is unavailable; keep the selection in React state anyway.
 * This is an optional standalone preference, not a second global app setting.
 * If an existing settings provider owns the language, use that provider instead.
 */
export function writeStoredPrintLanguage(
  language: PrintLanguage, storageKey: string = PRINT_LANGUAGE_STORAGE_KEY,
): boolean {
  if (!isPrintLanguage(language) || typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(storageKey, language);
    return true;
  } catch {
    return false;
  }
}

/** Useful in tests/build checks; does not run automatically at import. */
export function validatePrintTranslations(): readonly string[] {
  const errors: string[] = [];
  const placeholders = (text: string) => Array.from(new Set(
    Array.from(text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g), match => match[1]),
  )).sort().join(",");
  for (const key of keys) {
    const expected = placeholders(messages[key][1]);
    for (const language of PRINT_LANGUAGES) {
      const text = printMessages[language.code][key];
      if (!text.trim()) errors.push(`${language.code}.${key}: empty translation`);
      if (placeholders(text) !== expected) errors.push(`${language.code}.${key}: placeholder mismatch`);
    }
  }
  return Object.freeze(errors);
}

export class PrintMessageError extends Error {
  constructor(readonly key: PrintMessageKey, readonly parameters?: Readonly<Record<string, PrintParameter>>) {
    super(key); this.name = "PrintMessageError";
  }
}
export function makePrintError<K extends PrintMessageKey>(key: K, ...args: PrintTranslationArgs<K>): PrintMessageError {
  return new PrintMessageError(key, args[0] as Readonly<Record<string, PrintParameter>> | undefined);
}
/** Legacy engine errors are localized without leaking mixed-language messages. */
export function getPrintErrorMessage(error: unknown, language: PrintLanguage): string {
  const t = getPrintTranslator(language);
  if (error instanceof PrintMessageError) {
    const translate = translatePrint as (lang: PrintLanguage, key: PrintMessageKey, params?: Readonly<Record<string, PrintParameter>>) => string;
    return translate(language, error.key, error.parameters);
  }
  const text = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/print area|printArea/i.test(text)) return t("invalidPrintArea");
  if (/10%|10 থেকে 400/.test(text)) return t("belowMinimumScale", { min: 10 });
  if (/heading/i.test(text)) return t("headingTooTall");
  if (/margin/i.test(text)) return t("invalidMargins");
  if (/rows per page/i.test(text)) return t("invalidRowsPerPage");
  if (/page break indices/i.test(text)) return t("invalidBreaks");
  if (/200,000|200000/.test(text)) return t("tooManyCells", { limit: 200000 });
  if (/page limit|page-limit|pages limit/i.test(text)) return t("tooManyPages", { limit: 5000 });
  if (/page পাওয়া যায়নি/i.test(text)) return t("noPages");
  return t("unknownError");
}
export function getPrintPaperLabel(language: PrintLanguage, paper: string): string {
  const paperKeys = { A4: "a4", A5: "a5", Letter: "letter", Legal: "legal", Executive: "executive" } as const;
  if (!Object.prototype.hasOwnProperty.call(paperKeys, paper)) return paper;
  return translatePrint(language, paperKeys[paper as keyof typeof paperKeys]);
}
