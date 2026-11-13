// lib/built-in-templates.ts
// ALIMXL — Offline Built-in Templates
//
// Company: Smart Family Point
//
// Stage 3: Monthly Budget + Exchange Rate Converter + Inventory Management.
//
// Dependency:
//   ./currency.ts
//
// Template 1 — Monthly Budget (tpl-monthly-budget)
// - 10 departments.
// - 50 expense entries per department: 500 total.
// - Adjustable expense target.
// - Weighted planned-expense allocation.
// - Separate planned and actual inputs.
//
// Template 2 — Exchange Rate Converter (tpl-exchange-rate-converter)
// - "Exchange Rates" sheet: 200-row rate table (From / To / Rate) with a
//   per-row status check and a rate-table summary.
// - "Currency Converter" sheet: quick converter, business calculator
//   (discount + tax + conversion), 40-line multi-currency table and
//   rate-table checks.
// - "Converter Guide" sheet: usage rules, limits and verification values.
// - Uses the editor's CONVERT(amount, from, to) formula.
// - Rates are manual and offline. The sample rates are demonstration data,
//   not live market rates.
//
// Template 3 — Inventory Management (tpl-inventory-management)
// - "InventoryDashboard": stock position, movement totals, gross profit,
//   budget-threshold check, integrity checks and a category summary.
// - "InventoryProducts": 300-row product master with automatic stock in/out,
//   current stock, stock value at cost, potential sales, margin, reorder
//   quantity and a per-row status check.
// - "InventoryMovements": 1,000-row Stock In / Stock Out ledger with a
//   running balance, cost of goods out, gross profit and a per-row check
//   that flags unknown SKUs and stock that would go negative.
// - "InventorySuppliers": 100 supplier records with product count and
//   stock value per supplier.
// - "InventorySetup": organization, period, inventory budget threshold
//   (minimum 50,000,000), currency label and a 15-entry category list.
// - "InventoryGuide": usage rules, limits and verification values.
// - Uses SUM, IF, COUNTIF and SUMIF only.
// - Sample products, suppliers and movements are demonstration data.
//
// Shared features
// - Plain number formatting: English digits with thousands separators,
//   no currency symbol (for example 10,000 / 20,000 / 50,000).
// - Currency code kept as metadata/label only.
// - Workbook-content search helpers.
// - Currency-aware template creation helper.
//
// Default expense target: 100,000,000 (10 crore).
// This is demonstration data, not a minimum or maximum budget.
//
// This module does not implement:
// - Search/dropdown UI.
// - Live editor state updates.
// - Live exchange-rate feeds or automatic rate updates.
// - Persistence, autosave, import/export or backup.
//
// Search returns stored cell text, not evaluated formula results.


import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCY_COUNT,
  getCurrencyOptions,
  parseCurrencyCode,
} from "./currency";


import type {
  CurrencyCode,
  CurrencyOption,
} from "./currency";


// ------------------------------------------------------------
// Public workbook types
// ------------------------------------------------------------


export type Align = "left" | "center" | "right" | "justify";


export type VerticalAlign = "top" | "middle" | "bottom";


export interface CellBorders {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
}


export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  bg?: string;
  align?: Align;
  verticalAlign?: VerticalAlign;
  fontFamily?: string;
  fontSize?: number;
  borders?: CellBorders;
  borderStyle?: string;
  borderColor?: string;
  borderWidth?: number;
  wrap?: boolean;
  numberFormat?: string;
  decimals?: number;
  currencyCode?: string;
  indent?: number;
}


export interface CellData {
  value: string;
  style?: CellStyle;
  sparkline?: string;
}


export type CellMap = Record<string, CellData>;


export interface GroupRange {
  id: string;
  start: number;
  end: number;
  collapsed: boolean;
}


export interface ChartSeries {
  id: string;
  name: string;
  range: string;
}


export interface ChartConfig {
  id: string;
  title: string;
  type:
  | "column"
  | "bar"
  | "pie"
  | "ofpie"
  | "area"
  | "line"
  | "xyscatter"
  | "bubble"
  | "net"
  | "stock"
  | "columnline";
  range: string;
  subtitle?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  showLegend?: boolean;
  legendPosition?: "top" | "bottom" | "left" | "right" | "none";
  is3D?: boolean;
  realistic?: boolean;
  shape?: "cylinder" | "cone" | "pyramid";
  series?: ChartSeries[];
}


export interface ConditionalRule {
  id: string;
  range: string;
  condition:
  | "greater"
  | "less"
  | "equal"
  | "between"
  | "textContains"
  | "greaterOrEqual"
  | "lessOrEqual";
  value: string;
  value2?: string;
  bg: string;
  color?: string;
}


export interface DrawShape {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  points?: { x: number; y: number }[];
  stroke: string;
  fill: string;
  strokeWidth: number;
  rotation?: number;
  connectorStyle?: string;
  startAttach?: { id: string; side: string };
  endAttach?: { id: string; side: string };
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
}


export interface WorkbookSheet {
  id: string;
  name: string;
  gridRows: number;
  gridCols: number;
  cells: CellMap;
  groups?: GroupRange[];
  hiddenRows?: number[];
  hiddenCols?: number[];
  filters?: Record<number, string>;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  frozenRows?: number;
  frozenCols?: number;
  charts?: ChartConfig[];
  conditionalRules?: ConditionalRule[];
  namedRanges?: Record<string, string>;
  drawings?: DrawShape[];
}


export interface WorkbookSnapshot {
  id?: string;
  name: string;
  pageSize?: string;
  orientation?: string;
  activeSheetIndex?: number;
  sheets: WorkbookSheet[];
  updatedAt?: string;
  currencyCode?: CurrencyCode;
}


export interface BuiltInTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  createdAt?: string;
  snapshot: WorkbookSnapshot;
}


export interface MonthlyBudgetOptions {
  expenseTarget?: number;
  openingCash?: number;
  includeSampleActuals?: boolean;
}


export interface InventoryOptions {
  // Demonstration suppliers, products and movements. Default: true.
  includeSampleData?: boolean;

  // Planning threshold for stock value. Default and minimum: 50,000,000.
  budgetThreshold?: number;
}


// ------------------------------------------------------------
// Template identifiers
// ------------------------------------------------------------


export const MONTHLY_BUDGET_TEMPLATE_ID = "tpl-monthly-budget";


export const EXCHANGE_RATE_TEMPLATE_ID = "tpl-exchange-rate-converter";


export const INVENTORY_TEMPLATE_ID = "tpl-inventory-management";

// ------------------------------------------------------------
// Template 4 — Sales, Purchase & Inventory
// ------------------------------------------------------------

export const SALES_PURCHASE_TEMPLATE_ID =
  "tpl-sales-purchase-management";

export interface SalesPurchaseOptions {
  /**
   * Include clearly labelled demonstration records.
   * Default: false — a new business workbook starts empty.
   */
  includeSampleData?: boolean;

  /**
   * Optional purchasing-monitoring threshold.
   * Default: 0 — monitoring disabled.
   *
   * This is not cash, available credit or a transaction limit.
   */
  purchaseBudgetThreshold?: number;
}

/**
 * Monetary values in this template are displayed with 2 decimals.
 * Display formatting alone does not round stored calculations.
 */
export const SALES_PURCHASE_MONEY_DECIMALS = 2;

/**
 * Quantity display supports fractional units.
 * Display precision is not an input-validation rule.
 */
export const SALES_PURCHASE_QUANTITY_DECIMALS = 3;

/**
 * Internal sheet names intentionally contain only letters.
 * Keep these names unchanged: generated formulas reference them.
 *
 * Captions and instructions inside the sheets are bilingual.
 */
export const SALES_PURCHASE_SHEETS = Object.freeze({
  dashboard: "TradeDashboard",
  setup: "TradeSetup",
  products: "TradeProducts",
  customers: "TradeCustomers",
  suppliers: "TradeSuppliers",
  sales: "TradeSales",
  saleItems: "TradeSaleItems",
  purchases: "TradePurchases",
  purchaseItems: "TradePurchaseItems",
  payments: "TradePayments",
  returns: "TradeReturns",
  stock: "TradeStock",
  reports: "TradeReports",
  invoice: "TradeInvoice",
  guide: "TradeGuide",
});

/**
 * Fixed input capacities for the initial workbook.
 * These are template row limits, not tested performance claims.
 *
 * Generated summaries must use the same boundaries.
 */
export const SALES_PURCHASE_CAPACITY = Object.freeze({
  productCount: 100,
  customerCount: 100,
  supplierCount: 100,
  salesInvoiceCount: 150,
  saleItemCount: 500,
  purchaseInvoiceCount: 150,
  purchaseItemCount: 500,
  paymentAllocationCount: 500,
  returnLineCount: 250,
});

/**
 * Header occupies Excel row 4.
 * Input records start at Excel row 5.
 */
export const SALES_PURCHASE_LAYOUT = Object.freeze({
  headerRow: 4,
  firstDataRow: 5,
});

/**
 * Stable settings locations for currency helpers and formulas.
 * These are one-based Excel row numbers; values go in column B.
 */
export const SALES_PURCHASE_SETUP_ROWS = Object.freeze({
  organization: 5,
  address: 6,
  phone: 7,
  email: 8,
  currency: 9,
  periodLabel: 10,
  purchaseBudgetThreshold: 11,
  defaultTaxPercent: 12,
  preparedBy: 13,
  dataNotice: 14,
});

// Inventory Management sheet names. Formulas reference these names.
const INV_DASHBOARD_NAME = "InventoryDashboard";
const INV_PRODUCTS_NAME = "InventoryProducts";
const INV_MOVEMENTS_NAME = "InventoryMovements";
const INV_SUPPLIERS_NAME = "InventorySuppliers";
const INV_SETUP_NAME = "InventorySetup";
const INV_GUIDE_NAME = "InventoryGuide";


// ------------------------------------------------------------
// Public search types
// ------------------------------------------------------------


export type WorkbookSearchScope =
  | "all"
  | "departments"
  | "expenseItems"
  | "notes"
  | "incomeSources"
  | "savingsGoals";


export interface WorkbookSearchOptions {
  scope?: WorkbookSearchScope;
  limit?: number;
  includeNumbers?: boolean;
}


export interface WorkbookSearchMatch {
  workbookId?: string;
  workbookName: string;
  sheetId: string;
  sheetName: string;
  sheetIndex: number;


  // Excel-style address, for example B5.
  cell: string;


  // One-based Excel row number.
  row: number;


  // Zero-based column index, useful for editor selection.
  columnIndex: number;


  // Stored text only. Formula results are not evaluated here.
  value: string;


  kind: Exclude<WorkbookSearchScope, "all"> | "content";
}


export interface WorkbookSearchResponse {
  query: string;
  scope: WorkbookSearchScope;
  totalMatches: number;
  results: WorkbookSearchMatch[];
  truncated: boolean;
}


export interface BuiltInTemplateSummary {
  id: string;
  name: string;
  category: string;
  description: string;
}


export const WORKBOOK_SEARCH_OPTIONS: readonly {
  value: WorkbookSearchScope;
  label: string;
  labelBn: string;
}[] = [
    { value: "all", label: "All workbook content", labelBn: "ওয়ার্কবুকের সব তথ্য" },
    { value: "departments", label: "Departments", labelBn: "বিভাগ" },
    { value: "expenseItems", label: "Expense items", labelBn: "খরচের খাত" },
    { value: "notes", label: "Notes", labelBn: "নোট ও বিবরণ" },
    { value: "incomeSources", label: "Income sources", labelBn: "আয়ের উৎস" },
    { value: "savingsGoals", label: "Savings goals", labelBn: "সঞ্চয়ের লক্ষ্য" },
  ];


// Hidden workbook search bar shortcut.
// The actual search-bar UI must be implemented in the spreadsheet page.
export const WORKBOOK_SEARCH_SHORTCUT = "Ctrl+Shift+F";


// ------------------------------------------------------------
// Number display
// ------------------------------------------------------------


// Number of decimal places shown for monetary amounts.
// 0 => 10,000      2 => 10,000.00
// Stored values and formulas are never rounded; only the display is.
export const MONEY_DECIMALS = 0;


// Display decimals for the Exchange Rate Converter template.
// Converted amounts show 2 decimals; exchange rates show 4 decimals.
// Stored values and formulas are never rounded; only the display is.
export const CONVERTER_DECIMALS = 2;

export const RATE_DECIMALS = 4;


// Shown in the sheets instead of the old currency-format notice.
export const NUMBER_DISPLAY_NOTICE =
  "সংখ্যা ইংরেজি অঙ্কে ও কমা দিয়ে দেখানো হয় (যেমন 10,000); কোনো মুদ্রা চিহ্ন দেখানো হয় না। মুদ্রার কোড শুধু তথ্য হিসেবে থাকে, কোনো রূপান্তর হয় না।";


// ------------------------------------------------------------
// Theme
// ------------------------------------------------------------


const THEME = {
  green: "#006B32",
  darkGreen: "#12452B",
  gold: "#FFD447",
  white: "#FFFFFF",
  titleBackground: "#F5F5F3",
  subtitleBlue: "#003B76",
  input: "#FFF9DE",
  calculated: "#EFF8F1",
  dangerBackground: "#FDE7E9",
  dangerText: "#B42318",
  successBackground: "#E6F4EA",
  successText: "#137333",
  warningBackground: "#FFF4CE",
  warningText: "#9C6500",
};


const BORDER: CellBorders = {
  top: true,
  right: true,
  bottom: true,
  left: true,
};


const BASE_STYLE: CellStyle = {
  borders: BORDER,
  verticalAlign: "middle",
  fontSize: 11,
};


const HEADER_STYLE: CellStyle = {
  ...BASE_STYLE,
  bold: true,
  bg: THEME.green,
  color: THEME.white,
  wrap: true,
};


const INPUT_STYLE: CellStyle = {
  ...BASE_STYLE,
  bg: THEME.input,
  color: THEME.darkGreen,
  wrap: true,
};


const RESULT_STYLE: CellStyle = {
  ...BASE_STYLE,
  bg: THEME.calculated,
  color: THEME.darkGreen,
  wrap: true,
};


const WARNING_STYLE: CellStyle = {
  ...RESULT_STYLE,
  bold: true,
  bg: THEME.warningBackground,
  color: THEME.warningText,
};


const TITLE_STYLE: CellStyle = {
  bold: true,
  fontSize: 20,
  color: THEME.green,
  bg: THEME.titleBackground,
  align: "center",
  verticalAlign: "middle",
  wrap: false,
};


const SUBTITLE_STYLE: CellStyle = {
  bold: true,
  italic: true,
  fontSize: 12,
  color: THEME.subtitleBlue,
  bg: THEME.white,
  align: "center",
  verticalAlign: "middle",
  wrap: false,
};


const PERCENTAGE_STYLE: CellStyle = {
  ...RESULT_STYLE,
  align: "right",
  numberFormat: "percentage",
  decimals: 1,
};


const PERCENTAGE_INPUT_STYLE: CellStyle = {
  ...INPUT_STYLE,
  align: "right",
  numberFormat: "percentage",
  decimals: 1,
};


const WEIGHT_INPUT_STYLE: CellStyle = {
  ...INPUT_STYLE,
  align: "right",
  numberFormat: "number",
  decimals: 2,
};


interface MoneyStyles {
  input: CellStyle;
  result: CellStyle;
  total: CellStyle;
}


// Monetary cells use the plain "number" format: English digits with
// thousands separators and no currency symbol.
const MONEY_FORMAT: CellStyle = {
  numberFormat: "number",
  decimals: MONEY_DECIMALS,
};


const createMoneyStyles = (): MoneyStyles => {
  return {
    input: {
      ...INPUT_STYLE,
      ...MONEY_FORMAT,
      align: "right",
    },
    result: {
      ...RESULT_STYLE,
      ...MONEY_FORMAT,
      align: "right",
    },
    total: {
      ...RESULT_STYLE,
      ...MONEY_FORMAT,
      align: "right",
      bold: true,
      bg: THEME.green,
      color: THEME.gold,
    },
  };
};


interface ConverterStyles {
  code: CellStyle;
  amountInput: CellStyle;
  amountResult: CellStyle;
  amountTotal: CellStyle;
  percentInput: CellStyle;
  rateInput: CellStyle;
  rateResult: CellStyle;
}


// Converter amounts and rates use the same plain "number" format
// (no currency symbol), with converter-specific decimal places.
const createConverterStyles = (): ConverterStyles => {
  const amountFormat: CellStyle = {
    numberFormat: "number",
    decimals: CONVERTER_DECIMALS,
    align: "right",
  };


  const rateFormat: CellStyle = {
    numberFormat: "number",
    decimals: RATE_DECIMALS,
    align: "right",
  };


  return {
    code: {
      ...INPUT_STYLE,
      align: "center",
    },
    amountInput: {
      ...INPUT_STYLE,
      ...amountFormat,
    },
    amountResult: {
      ...RESULT_STYLE,
      ...amountFormat,
    },
    amountTotal: {
      ...RESULT_STYLE,
      ...amountFormat,
      bold: true,
      bg: THEME.green,
      color: THEME.gold,
    },
    percentInput: {
      ...INPUT_STYLE,
      ...amountFormat,
    },
    rateInput: {
      ...INPUT_STYLE,
      ...rateFormat,
    },
    rateResult: {
      ...RESULT_STYLE,
      ...rateFormat,
    },
  };
};


// ------------------------------------------------------------
// Configuration and sample data
// ------------------------------------------------------------


const CONFIG = {
  firstDataRow: 5,
  incomeCount: 30,
  expenseRowsPerDepartment: 50,
  savingsCount: 20,
  firstDepartmentSetupRow: 15,
  firstOverviewDepartmentRow: 19,
  defaultExpenseTarget: 100000000,
};


const SAMPLE = {
  plannedProductIncome: 100000000,
  actualProductIncome: 95000000,
  plannedServiceIncome: 20000000,
  actualServiceIncome: 20000000,
  plannedSavings: 10000000,
  actualSavings: 10000000,
};


interface ExpenseItem {
  name: string;
  weight: number;
  actual: number;
}


interface DepartmentDefinition {
  name: string;
  share: number;
  items: readonly ExpenseItem[];
}


const DEPARTMENTS: readonly DepartmentDefinition[] = [
  {
    name: "Operations / পরিচালনা",
    share: 0.20,
    items: [
      { name: "Facilities / স্থাপনা পরিচালনা", weight: 60, actual: 11500000 },
      { name: "Utilities / ইউটিলিটি", weight: 20, actual: 3800000 },
      { name: "Maintenance / রক্ষণাবেক্ষণ", weight: 20, actual: 3700000 },
    ],
  },
  {
    name: "HR / মানবসম্পদ",
    share: 0.25,
    items: [
      { name: "Salary / বেতন", weight: 80, actual: 19000000 },
      { name: "Training / প্রশিক্ষণ", weight: 12, actual: 3000000 },
      { name: "Staff welfare / কর্মী কল্যাণ", weight: 8, actual: 2000000 },
    ],
  },
  {
    name: "Sales / বিক্রয়",
    share: 0.10,
    items: [
      { name: "Sales commission / বিক্রয় কমিশন", weight: 40, actual: 3500000 },
      { name: "Sales operations / বিক্রয় পরিচালনা", weight: 40, actual: 4000000 },
      { name: "Sales travel / বিক্রয় ভ্রমণ", weight: 20, actual: 2000000 },
    ],
  },
  {
    name: "Marketing / বিপণন",
    share: 0.10,
    items: [
      { name: "Advertising / বিজ্ঞাপন", weight: 60, actual: 5500000 },
      { name: "Promotion / প্রচার", weight: 20, actual: 2000000 },
      { name: "Content / কনটেন্ট", weight: 20, actual: 2000000 },
    ],
  },
  {
    name: "IT / প্রযুক্তি",
    share: 0.10,
    items: [
      { name: "Software services / সফটওয়্যার সেবা", weight: 40, actual: 3800000 },
      { name: "IT support / প্রযুক্তি সহায়তা", weight: 40, actual: 3800000 },
      { name: "Connectivity / সংযোগ সেবা", weight: 20, actual: 1900000 },
    ],
  },
  {
    name: "Administration / প্রশাসন",
    share: 0.05,
    items: [
      { name: "Office services / অফিস সেবা", weight: 40, actual: 1800000 },
      { name: "Administrative support / প্রশাসনিক সহায়তা", weight: 40, actual: 2000000 },
      { name: "Office supplies / অফিস সামগ্রী", weight: 20, actual: 900000 },
    ],
  },
  {
    name: "Finance / অর্থ",
    share: 0.05,
    items: [
      { name: "Finance operations / অর্থ বিভাগ পরিচালনা", weight: 40, actual: 1800000 },
      { name: "Financial advisory / আর্থিক পরামর্শ", weight: 40, actual: 2000000 },
      { name: "Accounting services / হিসাবরক্ষণ সেবা", weight: 20, actual: 1000000 },
    ],
  },
  {
    name: "Procurement / ক্রয়",
    share: 0.05,
    items: [
      { name: "Procurement operations / ক্রয় পরিচালনা", weight: 40, actual: 2000000 },
      { name: "Supplier assessment / সরবরাহকারী মূল্যায়ন", weight: 40, actual: 1800000 },
      { name: "Procurement support / ক্রয় সহায়তা", weight: 20, actual: 1000000 },
    ],
  },
  {
    name: "Logistics / সরবরাহ পরিবহন",
    share: 0.05,
    items: [
      { name: "Freight / পণ্য পরিবহন", weight: 40, actual: 1900000 },
      { name: "Warehousing / গুদাম সেবা", weight: 40, actual: 1900000 },
      { name: "Distribution support / বিতরণ সহায়তা", weight: 20, actual: 1000000 },
    ],
  },
  {
    name: "Legal & Compliance / আইন ও পরিপালন",
    share: 0.05,
    items: [
      { name: "Legal services / আইন সেবা", weight: 40, actual: 1700000 },
      { name: "Compliance review / পরিপালন পর্যালোচনা", weight: 40, actual: 1700000 },
      { name: "Regulatory support / নিয়ন্ত্রক সহায়তা", weight: 20, actual: 1000000 },
    ],
  },
];


// Exchange-rate sample data (demonstration only — not live market rates).
// Each entry: [From, To, Rate] where 1 From = Rate To.
type RateSample = readonly [string, string, number];


const RATE_SAMPLES: readonly RateSample[] = [
  ["USD", "BDT", 122.5],
  ["EUR", "BDT", 132.8],
  ["GBP", "BDT", 155.6],
  ["SAR", "BDT", 32.6],
  ["AED", "BDT", 33.1],
  ["QAR", "BDT", 33.65],
  ["KWD", "BDT", 399],
  ["OMR", "BDT", 318],
  ["BHD", "BDT", 325],
  ["INR", "BDT", 1.47],
  ["PKR", "BDT", 0.44],
  ["NPR", "BDT", 0.92],
  ["LKR", "BDT", 0.41],
  ["JPY", "BDT", 0.82],
  ["CNY", "BDT", 17.1],
  ["AUD", "BDT", 80.5],
  ["CAD", "BDT", 89.2],
  ["CHF", "BDT", 137],
  ["SGD", "BDT", 91],
  ["HKD", "BDT", 15.7],
  ["NZD", "BDT", 74],
  ["MYR", "BDT", 27],
  ["THB", "BDT", 3.55],
  ["IDR", "BDT", 0.0077],
  ["PHP", "BDT", 2.15],
  ["VND", "BDT", 0.0049],
  ["KRW", "BDT", 0.089],
  ["TRY", "BDT", 3.55],
  ["RUB", "BDT", 1.35],
  ["BRL", "BDT", 22],
  ["MXN", "BDT", 6.75],
  ["ZAR", "BDT", 6.75],
  ["EGP", "BDT", 2.55],
  ["KES", "BDT", 0.94],
  ["NGN", "BDT", 0.08],
  ["USD", "EUR", 0.92],
  ["USD", "GBP", 0.79],
  ["USD", "SAR", 3.76],
  ["USD", "AED", 3.67],
  ["USD", "INR", 83.5],
  ["USD", "JPY", 149],
  ["USD", "CNY", 7.15],
  ["USD", "AUD", 1.52],
  ["USD", "CAD", 1.37],
  ["USD", "CHF", 0.89],
  ["USD", "SGD", 1.34],
  ["EUR", "USD", 1.09],
  ["GBP", "USD", 1.27],
  ["SAR", "USD", 0.266],
  ["AED", "USD", 0.272],
  ["INR", "USD", 0.012],
];


// Sample lines for the multi-currency conversion table.
// "HOME" is replaced with the workbook's home currency code.
type ConversionSample = readonly [number, string, string];


const CONVERSION_SAMPLES: readonly ConversionSample[] = [
  [100, "USD", "HOME"],
  [250, "EUR", "HOME"],
  [500, "GBP", "HOME"],
  [1000, "SAR", "HOME"],
  [750, "AED", "HOME"],
  [5000, "INR", "HOME"],
  [10000, "JPY", "HOME"],
  [2000, "CNY", "HOME"],
  [300, "AUD", "HOME"],
  [400, "CAD", "HOME"],
  [100, "HOME", "USD"],
  [1000, "HOME", "EUR"],
];


// ------------------------------------------------------------
// Dynamic row locations
// ------------------------------------------------------------


interface LedgerLayout {
  count: number;
  first: number;
  last: number;
  total: number;
}


const createLedgerLayout = (count: number): LedgerLayout => {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("Ledger capacity must be a positive integer.");
  }


  const first = CONFIG.firstDataRow;
  const last = first + count - 1;


  return {
    count,
    first,
    last,
    total: last + 2,
  };
};


const INCOME = createLedgerLayout(CONFIG.incomeCount);


const EXPENSES = createLedgerLayout(
  DEPARTMENTS.length * CONFIG.expenseRowsPerDepartment
);


const SAVINGS = createLedgerLayout(CONFIG.savingsCount);


export const MONTHLY_BUDGET_CAPACITY = Object.freeze({
  departmentCount: DEPARTMENTS.length,
  expensesPerDepartment: CONFIG.expenseRowsPerDepartment,
  expenseCount: EXPENSES.count,
  incomeCount: INCOME.count,
  savingsCount: SAVINGS.count,
});


const setupFirst = CONFIG.firstDepartmentSetupRow;
const setupLast = setupFirst + DEPARTMENTS.length - 1;


const SETUP = {
  departmentHeader: setupFirst - 1,
  departmentFirst: setupFirst,
  departmentLast: setupLast,
  shareTotal: setupLast + 2,
  shareStatus: setupLast + 3,
  shareHint: setupLast + 4,
  currencyNote: setupLast + 5,
  currencyHeader: setupLast + 7,
};


const overviewFirst = CONFIG.firstOverviewDepartmentRow;
const overviewLast = overviewFirst + DEPARTMENTS.length - 1;
const checksHeader = overviewLast + 5;
const targetRow = checksHeader + 8;


const OVERVIEW = {
  opening: 5,
  income: 6,
  expenses: 7,
  surplus: 8,
  savings: 9,
  closing: 10,


  savingsRatio: 12,
  cashWarning: 13,
  organization: 14,
  period: 15,
  dataNotice: 16,


  departmentHeader: overviewFirst - 1,
  departmentFirst: overviewFirst,
  departmentLast: overviewLast,


  reconciliation: overviewLast + 2,
  reconciliationNote: overviewLast + 3,


  checksHeader,
  negativeIncome: checksHeader + 1,
  negativeExpenses: checksHeader + 2,
  negativeSavings: checksHeader + 3,
  invalidShares: checksHeader + 4,
  inputLimitations: checksHeader + 5,
  negativeSetup: checksHeader + 6,


  target: targetRow,
  planned: targetRow + 1,
  difference: targetRow + 2,
  targetStatus: targetRow + 3,


  currency: targetRow + 5,
  currencyNotice: targetRow + 6,
  shareTotal: targetRow + 8,
  shareStatus: targetRow + 9,
  invalidWeightDepartments: targetRow + 10,
  plannedCashWarning: targetRow + 12,
  capacity: targetRow + 14,
};


const rangeOf = (
  column: string,
  layout: Pick<LedgerLayout, "first" | "last">
): string => {
  return `${column}${layout.first}:${column}${layout.last}`;
};


const departmentRange = (
  index: number
): Pick<LedgerLayout, "first" | "last"> => {
  const first =
    EXPENSES.first +
    index * CONFIG.expenseRowsPerDepartment;


  return {
    first,
    last: first + CONFIG.expenseRowsPerDepartment - 1,
  };
};


// ------------------------------------------------------------
// Exchange Rate Converter — sheet names and row locations
// ------------------------------------------------------------


// The "Exchange Rates" sheet keeps the classic layout that the CONVERT
// formula reads: header in row 1, then From (A) / To (B) / Rate (C)
// starting at row 2. Do not rename the sheet or move these columns.
const RATE_SHEET_NAME = "Exchange Rates";
const CONVERTER_SHEET_NAME = "Currency Converter";
const CONVERTER_GUIDE_NAME = "Converter Guide";


const RATES = {
  headerRow: 1,
  first: 2,
  count: 200,
  last: 201,
  // Summary block (columns I:J).
  usable: 2,
  problems: 3,
  capacity: 4,
  updated: 5,
  notice: 6,
  base: 7,
};


export const EXCHANGE_RATE_CAPACITY = Object.freeze({
  rateCount: RATES.count,
  conversionLines: 40,
  sampleRateCount: RATE_SAMPLES.length,
});


const CONVERTER = {
  // Quick converter (header in row 4).
  quickAmount: 5,
  quickFrom: 6,
  quickTo: 7,
  quickResult: 8,
  quickRate: 9,
  quickCheck: 10,


  // Business calculator.
  bizHeader: 12,
  bizAmount: 13,
  bizCurrency: 14,
  bizDiscount: 15,
  bizTax: 16,
  bizDiscountAmount: 17,
  bizSubtotal: 18,
  bizTaxAmount: 19,
  bizTotal: 20,
  bizTo: 21,
  bizConvertedSubtotal: 22,
  bizConvertedTax: 23,
  bizConvertedTotal: 24,
  bizRate: 25,
  bizCheck: 26,


  // Multi-currency conversion table.
  tableTitle: 28,
  tableHeader: 29,
  tableFirst: 30,
  tableCount: 40,
  tableLast: 69,


  // Rate-table checks.
  checksHeader: 71,
  usable: 72,
  problems: 73,
  updated: 74,
  notice: 75,
  mode: 76,
};


const RATE_STATUS = {
  ok: "OK",
  incomplete: "INCOMPLETE / অসম্পূর্ণ",
  invalid: "INVALID RATE / ভুল হার",
  same: "SAME CURRENCY / একই মুদ্রা",
};


// ------------------------------------------------------------
// Inventory Management — layout, capacity and status labels
// ------------------------------------------------------------


// Planning floor carried over from the original inventory module:
// the inventory budget threshold must not be below 50,000,000.
// It is a planning limit, not cash and not a credit facility.
const INV_MIN_BUDGET = 50000000;


// Display decimals for unit prices and monetary values (quantities use 0).
// Stored values and formulas are never rounded; only the display is.
export const INVENTORY_DECIMALS = 2;


const INV_CATEGORY_COUNT = 15;


const INV_PRODUCTS = createLedgerLayout(300);
const INV_MOVEMENTS = createLedgerLayout(1000);
const INV_SUPPLIERS = createLedgerLayout(100);


export const INVENTORY_CAPACITY = Object.freeze({
  productCount: INV_PRODUCTS.count,
  movementCount: INV_MOVEMENTS.count,
  supplierCount: INV_SUPPLIERS.count,
  categoryCount: INV_CATEGORY_COUNT,
});


// InventorySetup rows (column A label, B value, C instruction).
const INV_SETUP = {
  organization: 5,
  period: 6,
  budget: 7,
  currency: 8,
  preparedBy: 9,
  minimum: 10,
  budgetCheck: 11,
  numberNotice: 12,
  budgetNotice: 13,
  categoryHeader: 15,
  categoryFirst: 16,
  categoryLast: 15 + INV_CATEGORY_COUNT,
};


// InventoryDashboard rows (column A label, B value, C note).
const INV_DASH = {
  products: 5,
  units: 6,
  value: 7,
  salesValue: 8,
  margin: 9,
  low: 10,
  out: 11,
  negative: 12,

  movHeader: 14,
  inQty: 15,
  outQty: 16,
  purchases: 17,
  salesOut: 18,
  cogs: 19,
  profit: 20,
  profitPct: 21,

  budgetHeader: 23,
  budget: 24,
  utilization: 25,
  headroom: 26,
  budgetStatus: 27,

  checksHeader: 29,
  expected: 30,
  actual: 31,
  difference: 32,
  reconStatus: 33,
  productProblems: 34,
  movementProblems: 35,
  insufficient: 36,
  orphan: 37,
  supplierProblems: 38,
  unlinkedValue: 39,
  uncategorizedValue: 40,

  infoHeader: 42,
  organization: 43,
  period: 44,
  currency: 45,
  dataNotice: 46,
  numberNotice: 47,
  capacity: 48,

  categoryHeader: 50,
  categoryFirst: 51,
  categoryLast: 50 + INV_CATEGORY_COUNT,
  categoryTotal: 52 + INV_CATEGORY_COUNT,
};


const INV_PRODUCT_STATUS = {
  skuRequired: "SKU REQUIRED / SKU দিন",
  duplicate: "DUPLICATE SKU / SKU পুনরাবৃত্তি",
  nameRequired: "NAME REQUIRED / নাম দিন",
  invalid: "INVALID VALUE / ঋণাত্মক মান",
  supplierMissing: "SUPPLIER NOT FOUND / সরবরাহকারী নেই",
  negative: "NEGATIVE STOCK / ঋণাত্মক স্টক",
  out: "OUT OF STOCK / স্টক নেই",
  low: "LOW STOCK / স্টক কম",
  ok: "IN STOCK / স্টক আছে",
};


const INV_MOVEMENT_STATUS = {
  skuRequired: "SKU REQUIRED / SKU দিন",
  notFound: "SKU NOT FOUND / SKU নেই",
  duplicate: "DUPLICATE SKU / SKU পুনরাবৃত্তি",
  invalidType: "INVALID TYPE / ধরন ভুল",
  invalidQty: "INVALID QTY / পরিমাণ ভুল",
  invalidRate: "INVALID RATE / রেট ভুল",
  dateRequired: "DATE REQUIRED / তারিখ দিন",
  insufficient: "INSUFFICIENT STOCK / স্টক অপর্যাপ্ত",
  ok: "OK",
};


const INV_SUPPLIER_STATUS = {
  idRequired: "ID REQUIRED / আইডি দিন",
  duplicate: "DUPLICATE ID / আইডি পুনরাবৃত্তি",
  nameRequired: "NAME REQUIRED / নাম দিন",
  ok: "OK",
};


const INV_RECON_STATUS = {
  matched: "MATCHED / মিলেছে",
  mismatch: "MISMATCH / অমিল",
};


const INV_BUDGET_STATUS = {
  below: "BELOW MINIMUM / সর্বনিম্ন সীমার নিচে",
  over: "OVER THRESHOLD / সীমা ছাড়িয়েছে",
  within: "WITHIN THRESHOLD / সীমার মধ্যে",
};


// ------------------------------------------------------------
// Headings
// ------------------------------------------------------------


interface TemplateHeading {
  title: string;
  subtitle: string;
}


const HEADINGS: Record<string, TemplateHeading> = {
    [SALES_PURCHASE_SHEETS.dashboard]: {
    title: "ALIMXL | SALES & PURCHASE DASHBOARD",
    subtitle:
      "বিক্রয়, ক্রয়, পাওনা, দেনা ও স্টক — যাচাইয়ের অবস্থা দেখে ফল ব্যবহার করুন",
  },

  [SALES_PURCHASE_SHEETS.setup]: {
    title: "ALIMXL | BUSINESS SETUP",
    subtitle:
      "প্রতিষ্ঠানের তথ্য ও হিসাবের নিয়ম — হলুদ ঘর ইনপুট; সবুজ ঘর হিসাব",
  },

  [SALES_PURCHASE_SHEETS.products]: {
    title: "ALIMXL | PRODUCT MASTER",
    subtitle:
      "প্রতিটি পণ্যের আলাদা SKU রাখুন — শুরুর স্টক ও একক এখানে লিখুন",
  },

  [SALES_PURCHASE_SHEETS.customers]: {
    title: "ALIMXL | CUSTOMER REGISTER",
    subtitle:
      "ক্রেতার অনন্য ID, যোগাযোগের তথ্য ও শুরুর পাওনা",
  },

  [SALES_PURCHASE_SHEETS.suppliers]: {
    title: "ALIMXL | SUPPLIER REGISTER",
    subtitle:
      "সরবরাহকারীর অনন্য ID, যোগাযোগের তথ্য ও শুরুর দেনা",
  },

  [SALES_PURCHASE_SHEETS.sales]: {
    title: "ALIMXL | SALES INVOICE REGISTER",
    subtitle:
      "প্রতি invoice-এর জন্য একটি সারি — পণ্যের বিস্তারিত TradeSaleItems-এ",
  },

  [SALES_PURCHASE_SHEETS.saleItems]: {
    title: "ALIMXL | SALES INVOICE ITEMS",
    subtitle:
      "প্রতি পণ্য লাইনের জন্য একটি সারি — সংশ্লিষ্ট sales invoice number লিখুন",
  },

  [SALES_PURCHASE_SHEETS.purchases]: {
    title: "ALIMXL | PURCHASE INVOICE REGISTER",
    subtitle:
      "প্রতি invoice-এর জন্য একটি সারি — পণ্যের বিস্তারিত TradePurchaseItems-এ",
  },

  [SALES_PURCHASE_SHEETS.purchaseItems]: {
    title: "ALIMXL | PURCHASE INVOICE ITEMS",
    subtitle:
      "প্রতি পণ্য লাইনের জন্য একটি সারি — সংশ্লিষ্ট purchase invoice number লিখুন",
  },

  [SALES_PURCHASE_SHEETS.payments]: {
    title: "ALIMXL | PAYMENT ALLOCATIONS",
    subtitle:
      "একটি payment একাধিক invoice-এ দিলে আলাদা allocation row ব্যবহার করুন",
  },

  [SALES_PURCHASE_SHEETS.returns]: {
    title: "ALIMXL | SALES & PURCHASE RETURNS",
    subtitle:
      "মূল invoice ও item line উল্লেখ করুন — পণ্য ফেরত ও নগদ ফেরত আলাদা বিষয়",
  },

  [SALES_PURCHASE_SHEETS.stock]: {
    title: "ALIMXL | STOCK POSITION",
    subtitle:
      "শুরুর স্টক, ক্রয়, বিক্রয় ও ফেরত থেকে পণ্যভিত্তিক স্টকের সারসংক্ষেপ",
  },

  [SALES_PURCHASE_SHEETS.reports]: {
    title: "ALIMXL | BUSINESS REPORTS",
    subtitle:
      "রিপোর্টের পরিধি ও সীমাবদ্ধতা পরীক্ষা করুন — এটি audited financial statement নয়",
  },

  [SALES_PURCHASE_SHEETS.invoice]: {
    title: "ALIMXL | INVOICE PRINT VIEW",
    subtitle:
      "নির্বাচিত invoice-এর বিবরণ — print করার আগে invoice ও মোট যাচাই করুন",
  },

  [SALES_PURCHASE_SHEETS.guide]: {
    title: "ALIMXL | SALES & PURCHASE GUIDE",
    subtitle:
      "ব্যবহারের ক্রম, হিসাবের নিয়ম, ধারণক্ষমতা ও পরীক্ষার নির্দেশনা",
  },
  BudgetOverview: {
    title: "SMART FAMILY POINT | MONTHLY BUDGET",
    subtitle:
      "পরিবর্তনযোগ্য বাজেট — হলুদ = ইনপুট; হালকা সবুজ = হিসাব",
  },
  BudgetIncome: {
    title: "SMART FAMILY POINT | MONTHLY INCOME",
    subtitle:
      "Planned ও Actual আয় আলাদা লিখুন — বর্তমান অর্থের পরিমাণ নমুনা",
  },
  BudgetExpenses: {
    title: "SMART FAMILY POINT | DEPARTMENT EXPENSES",
    subtitle:
      `${DEPARTMENTS.length} বিভাগ × ${CONFIG.expenseRowsPerDepartment} খাত — Planned বরাদ্দে G কলামের weight ব্যবহৃত হয়`,
  },
  BudgetSavings: {
    title: "SMART FAMILY POINT | MONTHLY SAVINGS",
    subtitle:
      "সঞ্চয়ে স্থানান্তর — একই অর্থ Expenses-এ আবার লিখবেন না",
  },
  BudgetSetup: {
    title: "SMART FAMILY POINT | BUDGET SETUP",
    subtitle:
      `B10 = খরচের লক্ষ্য; B${SETUP.departmentFirst}:B${SETUP.departmentLast} = বিভাগীয় শতাংশ`,
  },
  BudgetGuide: {
    title: "SMART FAMILY POINT | BUDGET GUIDE",
    subtitle:
      `ব্যবহার নির্দেশিকা — ${DEPARTMENTS.length} বিভাগ এবং ${EXPENSES.count}টি খরচের খাত`,
  },
  [CONVERTER_SHEET_NAME]: {
    title: "SMART FAMILY POINT | EXCHANGE RATE CONVERTER",
    subtitle:
      `হলুদ = ইনপুট; হালকা সবুজ = হিসাব — হার ${RATE_SHEET_NAME} শিট থেকে আসে`,
  },
  [CONVERTER_GUIDE_NAME]: {
    title: "SMART FAMILY POINT | CONVERTER GUIDE",
    subtitle:
      "ব্যবহার নির্দেশিকা — হার, ব্যবসায়িক হিসাব ও সীমাবদ্ধতা",
  },
  [INV_DASHBOARD_NAME]: {
    title: "SMART FAMILY POINT | INVENTORY DASHBOARD",
    subtitle:
      "স্টক, চলাচল, মুনাফা ও নির্ভুলতা পরীক্ষা — সব হিসাব স্বয়ংক্রিয়",
  },
  [INV_PRODUCTS_NAME]: {
    title: "SMART FAMILY POINT | PRODUCT INFORMATION",
    subtitle:
      "হলুদ = ইনপুট (A–I); হালকা সবুজ = হিসাব — স্টক Movements শিট থেকে আসে",
  },
  [INV_MOVEMENTS_NAME]: {
    title: "SMART FAMILY POINT | STOCK IN / STOCK OUT",
    subtitle:
      "তারিখের ক্রমে লিখুন — Type শুধু IN বা OUT; Rate = ক্রয় বা বিক্রয়ের একক দর",
  },
  [INV_SUPPLIERS_NAME]: {
    title: "SMART FAMILY POINT | SUPPLIER INFORMATION",
    subtitle:
      "Supplier ID অনন্য রাখুন — Products শিটের Supplier ID এর সঙ্গে মিলতে হবে",
  },
  [INV_SETUP_NAME]: {
    title: "SMART FAMILY POINT | INVENTORY SETUP",
    subtitle:
      "প্রতিষ্ঠান, বাজেট সীমা ও ক্যাটাগরি তালিকা",
  },
  [INV_GUIDE_NAME]: {
    title: "SMART FAMILY POINT | INVENTORY GUIDE",
    subtitle:
      "ব্যবহার নির্দেশিকা — হিসাবের নিয়ম, সীমাবদ্ধতা ও যাচাই",
  },
};


// ------------------------------------------------------------
// Core helpers
// ------------------------------------------------------------


// Converts Bengali, Arabic-Indic and Persian digits to English digits.
// Used for every text written into a cell and for search matching,
// so numbers always appear (and are searchable) in English digits.
const toEnglishDigits = (value: string): string => {
  return value.replace(
    /[\u09E6-\u09EF\u0660-\u0669\u06F0-\u06F9]/g,
    (char) => {
      const code = char.charCodeAt(0);


      if (code >= 0x09e6 && code <= 0x09ef) return String(code - 0x09e6);
      if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
      return String(code - 0x06f0);
    }
  );
};


// Removes common currency symbol characters from display labels.
const CURRENCY_SYMBOL_PATTERN =
  /[$\u20AC\u00A3\u00A5\u20B9\u09F3\u20A8\u20A9\u20BA\u20BD\u20B4\u20AA\u20AB\u20A6\u20B1\u0E3F\u20A1\u20B2\u20B5\u20B8\u20BC\u20BE\u058F\uFDFC\u060B\u17DB\u20AD\u20AE]/g;


const stripCurrencySymbols = (label: string): string => {
  return label
    .replace(CURRENCY_SYMBOL_PATTERN, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};


const cellKey = (row: number, col: number): string => {
  let column = col + 1;
  let letters = "";


  while (column > 0) {
    const remainder = (column - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    column = Math.floor((column - 1) / 26);
  }


  return `${letters}${row + 1}`;
};


const createSheet = (
  name: string,
  rows: number,
  cols: number
): WorkbookSheet => ({
  id: `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name,
  gridRows: rows,
  gridCols: cols,
  cells: {},
  groups: [],
  hiddenRows: [],
  hiddenCols: [],
  filters: {},
  colWidths: {},
  rowHeights: {},
  frozenRows: 0,
  frozenCols: 0,
  charts: [],
  conditionalRules: [],
  namedRanges: {},
  drawings: [],
});


// Excel row number; zero-based column index.
const put = (
  sheet: WorkbookSheet,
  excelRow: number,
  col: number,
  value: string,
  style?: CellStyle
): void => {
  if (
    !Number.isInteger(excelRow) ||
    !Number.isInteger(col) ||
    excelRow < 1 ||
    excelRow > sheet.gridRows ||
    col < 0 ||
    col >= sheet.gridCols
  ) {
    throw new RangeError(
      `Cell outside sheet bounds: ${sheet.name}, row ${excelRow}, col ${col}`
    );
  }


  sheet.cells[cellKey(excelRow - 1, col)] = {
    value: toEnglishDigits(value),
    style: style
      ? {
        ...style,
        borders: style.borders
          ? { ...style.borders }
          : undefined,
      }
      : undefined,
  };
};


const setRowHeight = (
  sheet: WorkbookSheet,
  excelRow: number,
  height: number
): void => {
  if (!sheet.rowHeights) sheet.rowHeights = {};
  sheet.rowHeights[excelRow - 1] = height;
};


const prepareSheet = (
  sheet: WorkbookSheet,
  currencyCode: CurrencyCode,
  headers: readonly string[]
): void => {
  const widths = [280, 280, 200, 210, 240, 300, 200, 160];


  sheet.colWidths = {};


  for (let col = 0; col < sheet.gridCols; col++) {
    sheet.colWidths[col] = widths[col] ?? 160;
  }


  sheet.rowHeights = {};
  sheet.frozenRows = 4;
  sheet.frozenCols = 0;


  setRowHeight(sheet, 1, 46);
  setRowHeight(sheet, 2, 40);
  setRowHeight(sheet, 3, 22);
  setRowHeight(sheet, 4, 54);


  const heading = HEADINGS[sheet.name];


  if (heading) {
    put(sheet, 1, 0, heading.title, TITLE_STYLE);


    put(
      sheet,
      2,
      0,
      `${heading.subtitle} | Currency: ${currencyCode}`,
      SUBTITLE_STYLE
    );
  }


  headers.forEach((header, col) => {
    put(sheet, 4, col, header, HEADER_STYLE);
  });
};


const addVarianceRules = (
  sheet: WorkbookSheet,
  range: string,
  prefix: string
): void => {
  sheet.conditionalRules = [
    ...(sheet.conditionalRules ?? []),
    {
      id: `${prefix}-negative`,
      range,
      condition: "less",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: `${prefix}-positive`,
      range,
      condition: "greater",
      value: "0",
      bg: THEME.successBackground,
      color: THEME.successText,
    },
  ];
};


const requireNonnegativeNumber = (
  value: number,
  label: string
): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${label} must be a finite, nonnegative number.`
    );
  }


  return value;
};


const cloneWorkbook = (
  snapshot: WorkbookSnapshot
): WorkbookSnapshot => {
  return JSON.parse(JSON.stringify(snapshot)) as WorkbookSnapshot;
};


// ------------------------------------------------------------
// Currency API
// ------------------------------------------------------------


export const getTemplateCurrencyOptions = (
  language: "bn" | "en" = "bn"
): CurrencyOption[] => {
  return getCurrencyOptions(language);
};


export const getWorkbookCurrency = (
  snapshot: WorkbookSnapshot
): CurrencyCode => {
  const discovered = new Set<CurrencyCode>();


  const collect = (value: string, location: string): void => {
    const parsed = parseCurrencyCode(value);


    if (!parsed) {
      throw new RangeError(
        `Unsupported currency in ${location}: ${value}`
      );
    }


    discovered.add(parsed);
  };


  if (snapshot.currencyCode !== undefined) {
    collect(snapshot.currencyCode, "workbook metadata");
  }


  const setup = snapshot.sheets.find(
    (sheet) => sheet.name === "BudgetSetup"
  );


  const label = setup?.cells.B8?.value;


  if (label?.trim()) collect(label, "BudgetSetup!B8");


  const inventorySetup = snapshot.sheets.find(
    (sheet) => sheet.name === INV_SETUP_NAME
  );


  const inventoryLabel =
    inventorySetup?.cells[`B${INV_SETUP.currency}`]?.value;


  if (inventoryLabel?.trim()) {
    collect(inventoryLabel, `${INV_SETUP_NAME}!B${INV_SETUP.currency}`);
  }


  // Older saved workbooks may still carry currency-formatted cells.
  for (const sheet of snapshot.sheets) {
    for (const cell of Object.values(sheet.cells)) {
      if (
        cell.style?.numberFormat === "currency" &&
        cell.style.currencyCode
      ) {
        collect(cell.style.currencyCode, sheet.name);
      }
    }
  }


  if (discovered.size > 1) {
    throw new RangeError(
      "Workbook contains inconsistent or mixed currency formatting."
    );
  }


  for (const code of discovered) return code;


  return DEFAULT_CURRENCY;
};


/**
  * Returns a new snapshot labelled with the requested currency code.
  *
  * Amounts stay plain numbers (no symbol). Cells that still use the old
  * "currency" format (from workbooks saved earlier) are converted to the
  * plain number format so no symbol appears anywhere.
  *
  * For the Exchange Rate Converter template, the "Currency Converter"
  * sheet's home-currency cells (To currency and Convert To) are set to the
  * requested code. Exchange rates and amounts are never converted.
  */
export const applyTemplateCurrency = (
  snapshot: WorkbookSnapshot,
  requestedCode: string
): WorkbookSnapshot => {
  const currencyCode = parseCurrencyCode(requestedCode);


  if (!currencyCode) {
    throw new RangeError(
      `Unsupported currency selection: ${requestedCode}`
    );
  }


  const result = cloneWorkbook(snapshot);


  result.currencyCode = currencyCode;


  for (const sheet of result.sheets) {
    for (const cell of Object.values(sheet.cells)) {
      if (cell.style?.numberFormat === "currency") {
        const rest: CellStyle = { ...cell.style };
        delete rest.currencyCode;

        cell.style = {
          ...rest,
          ...MONEY_FORMAT,
        };
      }
    }


    if (HEADINGS[sheet.name] && sheet.cells.A2) {
      const subtitle = sheet.cells.A2.value.replace(
        /\s*\|\s*Currency:\s*[A-Za-z]{3}\s*$/,
        ""
      );


      sheet.cells.A2 = {
        ...sheet.cells.A2,
        value: `${subtitle} | Currency: ${currencyCode}`,
      };
    }


    if (sheet.name === "BudgetSetup" && sheet.cells.B8) {
      sheet.cells.B8 = {
        ...sheet.cells.B8,
        value: currencyCode,
      };
    }


    if (sheet.name === INV_SETUP_NAME) {
      const address = `B${INV_SETUP.currency}`;


      if (sheet.cells[address]) {
        sheet.cells[address] = {
          ...sheet.cells[address],
          value: currencyCode,
        };
      }
    }


    if (sheet.name === CONVERTER_SHEET_NAME) {
      for (const address of [
        `B${CONVERTER.quickTo}`,
        `B${CONVERTER.bizTo}`,
      ]) {
        if (sheet.cells[address]) {
          sheet.cells[address] = {
            ...sheet.cells[address],
            value: currencyCode,
          };
        }
      }
    }
  }


  return result;
};


// ------------------------------------------------------------
// Workbook search API
// ------------------------------------------------------------


const normalizeSearchText = (value: string): string => {
  return toEnglishDigits(value.normalize("NFC")).toLowerCase();
};


const NUMERIC_TEXT_PATTERN =
  /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:e[+-]?\d+)?$|^[+-]?\.\d+$/i;


const isNumericText = (value: string): boolean => {
  return NUMERIC_TEXT_PATTERN.test(value.trim());
};


const parseCellAddress = (
  address: string
): { row: number; columnIndex: number } | null => {
  const match = /^([A-Z]+)([1-9]\d*)$/.exec(address);


  if (!match) return null;


  const row = Number(match[2]);
  let column = 0;


  for (const letter of match[1]) {
    column = column * 26 + letter.charCodeAt(0) - 64;
  }


  if (
    !Number.isSafeInteger(row) ||
    !Number.isSafeInteger(column) ||
    column < 1
  ) {
    return null;
  }


  return {
    row,
    columnIndex: column - 1,
  };
};


const classifySearchCell = (
  sheetName: string,
  row: number,
  columnIndex: number,
  value: string
): WorkbookSearchMatch["kind"] => {
  if (row < CONFIG.firstDataRow || value === "TOTAL / মোট") {
    return "content";
  }


  if (sheetName === "BudgetExpenses" && columnIndex === 0) {
    return "departments";
  }


  if (sheetName === "BudgetExpenses" && columnIndex === 1) {
    return "expenseItems";
  }


  if (
    (
      sheetName === "BudgetExpenses" ||
      sheetName === "BudgetIncome" ||
      sheetName === "BudgetSavings"
    ) &&
    columnIndex === 5
  ) {
    return "notes";
  }


  if (sheetName === "BudgetIncome" && columnIndex === 0) {
    return "incomeSources";
  }


  if (sheetName === "BudgetSavings" && columnIndex === 0) {
    return "savingsGoals";
  }


  return "content";
};


/**
  * Search the supplied snapshot only.
  *
  * Caller responsibilities:
  * - Supply current or loaded saved-workbook data.
  * - Display results.
  * - Open the workbook and navigate to the returned sheet/cell.
  *
  * This function does not read local databases or evaluate formulas.
  * Repeated department labels are returned once per sheet.
  * Bengali digits in the query match English digits in the workbook.
  * Exchange Rate Converter cells are returned with kind "content".
  */
export const searchWorkbookSnapshot = (
  snapshot: WorkbookSnapshot,
  query: string,
  options: WorkbookSearchOptions = {}
): WorkbookSearchResponse => {
  const scope = options.scope ?? "all";


  if (!WORKBOOK_SEARCH_OPTIONS.some((option) => option.value === scope)) {
    throw new RangeError(`Unsupported workbook search scope: ${scope}`);
  }


  const tokens = normalizeSearchText(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean);


  const requestedLimit = options.limit;


  const limit =
    typeof requestedLimit === "number" &&
      Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(500, Math.floor(requestedLimit)))
      : 100;


  const response: WorkbookSearchResponse = {
    query,
    scope,
    totalMatches: 0,
    results: [],
    truncated: false,
  };


  if (tokens.length === 0) return response;


  const seenDepartments = new Set<string>();


  snapshot.sheets.forEach((sheet, sheetIndex) => {
    const entries: {
      address: string;
      cell: CellData;
      row: number;
      columnIndex: number;
    }[] = [];


    for (const [address, cell] of Object.entries(sheet.cells)) {
      const parsed = parseCellAddress(address);


      if (!parsed) continue;


      entries.push({
        address,
        cell,
        row: parsed.row,
        columnIndex: parsed.columnIndex,
      });
    }


    entries.sort(
      (first, second) =>
        first.row - second.row ||
        first.columnIndex - second.columnIndex
    );


    for (const entry of entries) {
      const value = entry.cell.value.trim();


      // Formula source text is intentionally excluded.
      if (!value || value.startsWith("=")) continue;


      if (isNumericText(value) && !options.includeNumbers) continue;


      const kind = classifySearchCell(
        sheet.name,
        entry.row,
        entry.columnIndex,
        value
      );


      if (scope !== "all" && kind !== scope) continue;


      const normalized = normalizeSearchText(value);


      if (!tokens.every((token) => normalized.includes(token))) {
        continue;
      }


      if (kind === "departments") {
        const key = `${sheetIndex}|${normalized}`;


        if (seenDepartments.has(key)) continue;
        seenDepartments.add(key);
      }


      response.totalMatches++;


      if (response.results.length < limit) {
        response.results.push({
          workbookId: snapshot.id,
          workbookName: snapshot.name,
          sheetId: sheet.id,
          sheetName: sheet.name,
          sheetIndex,
          cell: entry.address,
          row: entry.row,
          columnIndex: entry.columnIndex,
          value,
          kind,
        });
      }
    }
  });


  response.truncated =
    response.totalMatches > response.results.length;


  return response;
};


// ------------------------------------------------------------
// Income and savings ledgers
// ------------------------------------------------------------


const populateSimpleLedger = (
  sheet: WorkbookSheet,
  kind: "income" | "savings",
  layout: LedgerLayout,
  money: MoneyStyles,
  includeSampleActuals: boolean
): void => {
  for (let row = layout.first; row <= layout.last; row++) {
    put(sheet, row, 0, "", INPUT_STYLE);
    put(sheet, row, 1, "", INPUT_STYLE);
    put(sheet, row, 2, "0", money.input);
    put(sheet, row, 3, "0", money.input);


    put(
      sheet,
      row,
      4,
      kind === "income"
        ? `=D${row}-C${row}`
        : `=C${row}-D${row}`,
      money.result
    );


    put(sheet, row, 5, "", INPUT_STYLE);
    setRowHeight(sheet, row, 40);
  }


  put(sheet, layout.total, 0, "TOTAL / মোট", HEADER_STYLE);


  ["C", "D", "E"].forEach((column, index) => {
    put(
      sheet,
      layout.total,
      index + 2,
      `=SUM(${rangeOf(column, layout)})`,
      money.total
    );
  });


  if (kind === "income") {
    const samples = [
      {
        name: "Product sales / পণ্য বিক্রয়",
        planned: SAMPLE.plannedProductIncome,
        actual: SAMPLE.actualProductIncome,
      },
      {
        name: "Services / সেবা",
        planned: SAMPLE.plannedServiceIncome,
        actual: SAMPLE.actualServiceIncome,
      },
    ];


    samples.forEach((sample, index) => {
      if (index >= layout.count) return;


      const row = layout.first + index;


      put(sheet, row, 0, sample.name, INPUT_STYLE);
      put(sheet, row, 1, "DEMO / নমুনা", INPUT_STYLE);
      put(sheet, row, 2, String(sample.planned), money.input);


      put(
        sheet,
        row,
        3,
        String(includeSampleActuals ? sample.actual : 0),
        money.input
      );


      put(
        sheet,
        row,
        5,
        "বাজেটের লক্ষ্য পরিবর্তনে আয় নিজে থেকে বদলায় না।",
        INPUT_STYLE
      );
    });


    addVarianceRules(sheet, rangeOf("E", layout), "budget-income");
  } else {
    const row = layout.first;


    put(sheet, row, 0, "Emergency reserve / জরুরি তহবিল", INPUT_STYLE);
    put(sheet, row, 1, "Monthly transfer / মাসিক স্থানান্তর", INPUT_STYLE);
    put(sheet, row, 2, String(SAMPLE.plannedSavings), money.input);


    put(
      sheet,
      row,
      3,
      String(includeSampleActuals ? SAMPLE.actualSavings : 0),
      money.input
    );


    put(
      sheet,
      row,
      5,
      "নমুনা; Expenses-এ আবার লিখবেন না।",
      INPUT_STYLE
    );


    sheet.conditionalRules = [
      {
        id: "budget-savings-gap",
        range: rangeOf("E", layout),
        condition: "greater",
        value: "0",
        bg: THEME.warningBackground,
        color: THEME.warningText,
      },
    ];
  }
};


// ------------------------------------------------------------
// Expense ledger
// ------------------------------------------------------------


const populateExpenseLedger = (
  sheet: WorkbookSheet,
  money: MoneyStyles,
  includeSampleActuals: boolean
): void => {
  DEPARTMENTS.forEach((department, index) => {
    const block = departmentRange(index);
    const setupRow = SETUP.departmentFirst + index;
    const weights = rangeOf("G", block);


    for (
      let itemIndex = 0;
      itemIndex < CONFIG.expenseRowsPerDepartment;
      itemIndex++
    ) {
      const row = block.first + itemIndex;
      const sample = department.items[itemIndex];


      put(sheet, row, 0, department.name, RESULT_STYLE);
      put(sheet, row, 1, sample?.name ?? "", INPUT_STYLE);


      put(
        sheet,
        row,
        2,
        `=IF(COUNTIF(${weights},"<0")>0,0,IF(SUM(${weights})<=0,0,BudgetSetup!C${setupRow}*G${row}/SUM(${weights})))`,
        money.result
      );


      put(
        sheet,
        row,
        3,
        String(includeSampleActuals ? sample?.actual ?? 0 : 0),
        money.input
      );


      put(sheet, row, 4, `=C${row}-D${row}`, money.result);


      put(
        sheet,
        row,
        5,
        sample
          ? "DEMO / নমুনা — Planned বদলাতে G-এর weight ব্যবহার করুন।"
          : "",
        INPUT_STYLE
      );


      put(
        sheet,
        row,
        6,
        String(sample?.weight ?? 0),
        WEIGHT_INPUT_STYLE
      );


      setRowHeight(sheet, row, 48);
    }
  });


  put(sheet, EXPENSES.total, 0, "TOTAL / মোট", HEADER_STYLE);


  ["C", "D", "E"].forEach((column, index) => {
    put(
      sheet,
      EXPENSES.total,
      index + 2,
      `=SUM(${rangeOf(column, EXPENSES)})`,
      money.total
    );
  });


  addVarianceRules(
    sheet,
    rangeOf("E", EXPENSES),
    "budget-expenses"
  );


  sheet.conditionalRules = [
    ...(sheet.conditionalRules ?? []),
    {
      id: "budget-negative-weight",
      range: rangeOf("G", EXPENSES),
      condition: "less",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
  ];
};


// ------------------------------------------------------------
// Monthly Budget builder
// ------------------------------------------------------------


export const createMonthlyBudgetSnapshot = (
  requestedCurrency: CurrencyCode = DEFAULT_CURRENCY,
  options: MonthlyBudgetOptions = {}
): WorkbookSnapshot => {
  const currencyCode = parseCurrencyCode(requestedCurrency);


  if (!currencyCode) {
    throw new RangeError("Unsupported template currency.");
  }


  const expenseTarget = requireNonnegativeNumber(
    options.expenseTarget ?? CONFIG.defaultExpenseTarget,
    "Expense target"
  );


  const openingCash = requireNonnegativeNumber(
    options.openingCash ?? 0,
    "Opening cash"
  );


  const includeSampleActuals =
    options.includeSampleActuals ?? true;


  const money = createMoneyStyles();


  const overview = createSheet(
    "BudgetOverview",
    OVERVIEW.capacity + 8,
    8
  );


  const income = createSheet("BudgetIncome", INCOME.total + 10, 6);
  const expenses = createSheet("BudgetExpenses", EXPENSES.total + 20, 8);
  const savings = createSheet("BudgetSavings", SAVINGS.total + 10, 6);


  const setup = createSheet(
    "BudgetSetup",
    Math.max(140, SETUP.currencyHeader + SUPPORTED_CURRENCY_COUNT + 10),
    6
  );


  const guide = createSheet("BudgetGuide", 88, 4);


  // ----------------------------------------------------------
  // Setup
  // ----------------------------------------------------------


  prepareSheet(setup, currencyCode, [
    "Setting / বিষয়",
    "Value / তথ্য",
    "Instructions / নির্দেশনা",
  ]);


  setup.colWidths = {
    0: 310,
    1: 300,
    2: 440,
    3: 210,
    4: 310,
    5: 160,
  };


  const settings: string[][] = [
    [
      "Organization / প্রতিষ্ঠান",
      "Smart Family Point",
      "নিজ প্রতিষ্ঠানের নাম লিখুন।",
    ],
    [
      "Period / হিসাবের মাস",
      "YYYY-MM",
      "সব শিটে একই মাসের তথ্য লিখুন। Automatic date filtering নেই।",
    ],
    [
      "Opening cash / শুরুর নগদ",
      String(openingCash),
      "শুরুর ব্যবহারযোগ্য নগদ; চলতি মাসের আয় নয়।",
    ],
    [
      "Currency / মুদ্রা",
      currencyCode,
      "শুধু তথ্য হিসেবে মুদ্রার কোড; সংখ্যায় কোনো মুদ্রা চিহ্ন দেখানো হয় না।",
    ],
    [
      "Prepared by / প্রস্তুতকারী",
      "",
      "দায়িত্বপ্রাপ্ত ব্যক্তির নাম।",
    ],
    [
      "Expense target / খরচের লক্ষ্য",
      String(expenseTarget),
      "প্রাথমিক নমুনা 10 কোটি (100,000,000)। নিজের বাজেট লিখতে পারবেন।",
    ],
  ];


  settings.forEach((values, index) => {
    const row = 5 + index;
    setRowHeight(setup, row, 60);


    values.forEach((value, col) => {
      let style: CellStyle = RESULT_STYLE;


      if (col === 1 && index !== 3) {
        style =
          index === 2 || index === 5
            ? money.input
            : INPUT_STYLE;
      }


      put(setup, row, col, value, style);
    });
  });


  put(setup, 11, 0, "Number format / সংখ্যা প্রদর্শন", HEADER_STYLE);
  put(setup, 11, 1, NUMBER_DISPLAY_NOTICE, WARNING_STYLE);


  put(setup, 12, 0, "Budget behaviour / বাজেটের আচরণ", HEADER_STYLE);


  put(
    setup,
    12,
    1,
    "B10 বদলালে Planned expenses বদলায়। Actual, Planned income ও savings নিজে লিখতে হবে।",
    WARNING_STYLE
  );


  setRowHeight(setup, 11, 84);
  setRowHeight(setup, 12, 88);


  [
    "Department / বিভাগ",
    "Share / শতাংশ",
    "Allocated budget / বরাদ্দ",
    "Weight total / মোট ওজন",
    "Allocation status / অবস্থা",
  ].forEach((value, col) => {
    put(setup, SETUP.departmentHeader, col, value, HEADER_STYLE);
  });


  setRowHeight(setup, SETUP.departmentHeader, 58);


  DEPARTMENTS.forEach((department, index) => {
    const row = SETUP.departmentFirst + index;
    const block = departmentRange(index);
    const weights = `BudgetExpenses!${rangeOf("G", block)}`;


    put(setup, row, 0, department.name, RESULT_STYLE);


    put(
      setup,
      row,
      1,
      String(department.share),
      PERCENTAGE_INPUT_STYLE
    );


    put(
      setup,
      row,
      2,
      `=IF(B10<0,0,IF(B${row}<0,0,IF(B${row}>1,0,B10*B${row})))`,
      money.result
    );


    put(setup, row, 3, `=SUM(${weights})`, RESULT_STYLE);


    put(
      setup,
      row,
      4,
      `=IF(B10<0,"INVALID TARGET",IF(B${row}<0,"INVALID SHARE",IF(B${row}>1,"INVALID SHARE",IF(COUNTIF(${weights},"<0")>0,"INVALID WEIGHTS",IF(B${row}=0,"No allocation / বরাদ্দ নেই",IF(D${row}<=0,"WEIGHTS REQUIRED / ওজন দিন","Ready / প্রস্তুত"))))))`,
      RESULT_STYLE
    );


    setRowHeight(setup, row, 60);
  });


  put(setup, SETUP.shareTotal, 0, "TOTAL / মোট", HEADER_STYLE);


  put(
    setup,
    SETUP.shareTotal,
    1,
    `=SUM(B${SETUP.departmentFirst}:B${SETUP.departmentLast})`,
    PERCENTAGE_STYLE
  );


  put(
    setup,
    SETUP.shareTotal,
    2,
    `=SUM(C${SETUP.departmentFirst}:C${SETUP.departmentLast})`,
    money.total
  );


  put(
    setup,
    SETUP.shareStatus,
    0,
    "Share check / শতাংশ পরীক্ষা",
    HEADER_STYLE
  );


  put(
    setup,
    SETUP.shareStatus,
    1,
    `=IF(B${SETUP.shareTotal}<0.999999999,"UNDER 100% / কম বরাদ্দ",IF(B${SETUP.shareTotal}>1.000000001,"OVER 100% / বেশি বরাদ্দ","100% / সঠিক"))`,
    RESULT_STYLE
  );


  put(setup, SETUP.shareHint, 0, "Share input / শতাংশ লেখা", HEADER_STYLE);


  put(
    setup,
    SETUP.shareHint,
    1,
    "20% লিখতে 0.20 অথবা editor সমর্থন করলে 20% লিখুন। শুধু 20 লিখবেন না।",
    WARNING_STYLE
  );


  put(setup, SETUP.currencyNote, 0, "Currency reference", HEADER_STYLE);


  put(
    setup,
    SETUP.currencyNote,
    1,
    "নিচে মুদ্রার কোডের reference list। Currency helper নিজে live editor আপডেট করে না।",
    RESULT_STYLE
  );


  put(setup, SETUP.currencyHeader, 0, "Code / কোড", HEADER_STYLE);
  put(setup, SETUP.currencyHeader, 1, "Currency / মুদ্রা", HEADER_STYLE);


  getTemplateCurrencyOptions("bn").forEach((option, index) => {
    const row = SETUP.currencyHeader + 1 + index;


    put(setup, row, 0, option.value, RESULT_STYLE);
    put(setup, row, 1, stripCurrencySymbols(option.label), RESULT_STYLE);
    setRowHeight(setup, row, 38);
  });


  setup.conditionalRules = [
    {
      id: "setup-negative-share",
      range: `B${SETUP.departmentFirst}:B${SETUP.departmentLast}`,
      condition: "less",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "setup-excessive-share",
      range: `B${SETUP.departmentFirst}:B${SETUP.departmentLast}`,
      condition: "greater",
      value: "1",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "setup-invalid-allocation",
      range: `E${SETUP.departmentFirst}:E${SETUP.departmentLast}`,
      condition: "textContains",
      value: "INVALID",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "setup-missing-weights",
      range: `E${SETUP.departmentFirst}:E${SETUP.departmentLast}`,
      condition: "textContains",
      value: "WEIGHTS REQUIRED",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
  ];


  // ----------------------------------------------------------
  // Financial ledgers
  // ----------------------------------------------------------


  prepareSheet(income, currencyCode, [
    "Source / আয়ের উৎস",
    "Description / বিবরণ",
    "Planned / পরিকল্পিত",
    "Actual / প্রাপ্ত",
    "Variance / পার্থক্য",
    "Notes / নোট",
  ]);


  populateSimpleLedger(
    income,
    "income",
    INCOME,
    money,
    includeSampleActuals
  );


  prepareSheet(expenses, currencyCode, [
    "Department / বিভাগ",
    "Expense item / খরচের খাত",
    "Planned / স্বয়ংক্রিয় বরাদ্দ",
    "Actual / পরিশোধিত",
    "Remaining / অবশিষ্ট",
    "Notes / নোট",
    "Allocation weight / বরাদ্দের ওজন",
  ]);


  populateExpenseLedger(expenses, money, includeSampleActuals);


  prepareSheet(savings, currencyCode, [
    "Goal / সঞ্চয়ের লক্ষ্য",
    "Description / বিবরণ",
    "Planned / লক্ষ্য",
    "Actual / স্থানান্তরিত",
    "Gap / বাকি লক্ষ্য",
    "Notes / নোট",
  ]);


  populateSimpleLedger(
    savings,
    "savings",
    SAVINGS,
    money,
    includeSampleActuals
  );


  // ----------------------------------------------------------
  // Overview
  // ----------------------------------------------------------


  prepareSheet(overview, currencyCode, [
    "Metric / বিষয়",
    "Planned / পরিকল্পিত",
    "Actual / বাস্তব",
    "Favorable variance / অনুকূল পার্থক্য",
    "Status / অবস্থা",
  ]);


  const summary: {
    row: number;
    label: string;
    planned: string;
    actual: string;
    variance: string;
  }[] = [
      {
        row: OVERVIEW.opening,
        label: "Opening cash / শুরুর নগদ",
        planned: "=BudgetSetup!B7",
        actual: "=BudgetSetup!B7",
        variance: `=C${OVERVIEW.opening}-B${OVERVIEW.opening}`,
      },
      {
        row: OVERVIEW.income,
        label: "Income / আয়",
        planned: `=BudgetIncome!C${INCOME.total}`,
        actual: `=BudgetIncome!D${INCOME.total}`,
        variance: `=C${OVERVIEW.income}-B${OVERVIEW.income}`,
      },
      {
        row: OVERVIEW.expenses,
        label: "Operating expenses / পরিচালন খরচ",
        planned: `=BudgetExpenses!C${EXPENSES.total}`,
        actual: `=BudgetExpenses!D${EXPENSES.total}`,
        variance: `=B${OVERVIEW.expenses}-C${OVERVIEW.expenses}`,
      },
      {
        row: OVERVIEW.surplus,
        label: "Operating surplus / পরিচালন উদ্বৃত্ত",
        planned: `=B${OVERVIEW.income}-B${OVERVIEW.expenses}`,
        actual: `=C${OVERVIEW.income}-C${OVERVIEW.expenses}`,
        variance: `=C${OVERVIEW.surplus}-B${OVERVIEW.surplus}`,
      },
      {
        row: OVERVIEW.savings,
        label: "Savings transfer / সঞ্চয়ে স্থানান্তর",
        planned: `=BudgetSavings!C${SAVINGS.total}`,
        actual: `=BudgetSavings!D${SAVINGS.total}`,
        variance: `=C${OVERVIEW.savings}-B${OVERVIEW.savings}`,
      },
      {
        row: OVERVIEW.closing,
        label: "Closing available cash / অবশিষ্ট নগদ",
        planned:
          `=B${OVERVIEW.opening}+B${OVERVIEW.surplus}-B${OVERVIEW.savings}`,
        actual:
          `=C${OVERVIEW.opening}+C${OVERVIEW.surplus}-C${OVERVIEW.savings}`,
        variance: `=C${OVERVIEW.closing}-B${OVERVIEW.closing}`,
      },
    ];


  summary.forEach((item) => {
    const style =
      item.row === OVERVIEW.closing ? money.total : money.result;


    put(overview, item.row, 0, item.label, HEADER_STYLE);
    put(overview, item.row, 1, item.planned, style);
    put(overview, item.row, 2, item.actual, style);
    put(overview, item.row, 3, item.variance, style);


    put(
      overview,
      item.row,
      4,
      `=IF(D${item.row}<0,"Review / পর্যালোচনা","On plan / পরিকল্পনামাফিক")`,
      RESULT_STYLE
    );


    setRowHeight(overview, item.row, 54);
  });


  const writeInfo = (
    row: number,
    label: string,
    value: string,
    style: CellStyle = RESULT_STYLE
  ): void => {
    put(overview, row, 0, label, HEADER_STYLE);
    put(overview, row, 1, value, style);
    setRowHeight(overview, row, 56);
  };


  writeInfo(
    OVERVIEW.savingsRatio,
    "Savings achievement / সঞ্চয় অর্জন",
    `=IF(B${OVERVIEW.savings}=0,0,C${OVERVIEW.savings}/B${OVERVIEW.savings})`,
    PERCENTAGE_STYLE
  );


  put(
    overview,
    OVERVIEW.savingsRatio,
    2,
    `=IF(B${OVERVIEW.savings}=0,"No target / লক্ষ্য নেই","Actual / Planned")`,
    RESULT_STYLE
  );


  writeInfo(
    OVERVIEW.cashWarning,
    "Cash warning / নগদ সতর্কতা",
    `=IF(C${OVERVIEW.closing}<0,"SHORTFALL / ঘাটতি","AVAILABLE / নগদ আছে")`
  );


  writeInfo(OVERVIEW.organization, "Organization / প্রতিষ্ঠান", "=BudgetSetup!B5");
  writeInfo(OVERVIEW.period, "Period / হিসাবের মাস", "=BudgetSetup!B6");


  writeInfo(
    OVERVIEW.dataNotice,
    "Data notice / তথ্যের ধরন",
    includeSampleActuals
      ? "DEMO / সব monetary sample নিজের তথ্য দিয়ে বদলান"
      : "Actual শূন্য; Planned income, savings ও খাতগুলো নমুনা",
    WARNING_STYLE
  );


  [
    "Department / বিভাগ",
    "Planned / বরাদ্দ",
    "Actual / খরচ",
    "Remaining / অবশিষ্ট",
    "Budget used / ব্যবহার",
    "Status / অবস্থা",
  ].forEach((value, col) => {
    put(overview, OVERVIEW.departmentHeader, col, value, HEADER_STYLE);
  });


  DEPARTMENTS.forEach((department, index) => {
    const row = OVERVIEW.departmentFirst + index;
    const block = departmentRange(index);


    put(overview, row, 0, department.name, RESULT_STYLE);


    put(
      overview,
      row,
      1,
      `=SUM(BudgetExpenses!${rangeOf("C", block)})`,
      money.result
    );


    put(
      overview,
      row,
      2,
      `=SUM(BudgetExpenses!${rangeOf("D", block)})`,
      money.result
    );


    put(overview, row, 3, `=B${row}-C${row}`, money.result);


    put(
      overview,
      row,
      4,
      `=IF(B${row}=0,0,C${row}/B${row})`,
      PERCENTAGE_STYLE
    );


    put(
      overview,
      row,
      5,
      `=IF(B${row}=0,IF(C${row}>0,"Unbudgeted / বরাদ্দ নেই","No budget / বাজেট নেই"),IF(C${row}>B${row},"Over budget / অতিরিক্ত","Within budget / সীমার মধ্যে"))`,
      RESULT_STYLE
    );


    setRowHeight(overview, row, 58);
  });


  // ----------------------------------------------------------
  // Reconciliation and checks
  // ----------------------------------------------------------


  writeInfo(
    OVERVIEW.reconciliation,
    "Reconciliation / বিভাগীয় মিল",
    `=SUM(B${OVERVIEW.departmentFirst}:B${OVERVIEW.departmentLast})-B${OVERVIEW.expenses}`,
    money.result
  );


  put(
    overview,
    OVERVIEW.reconciliation,
    2,
    `=SUM(C${OVERVIEW.departmentFirst}:C${OVERVIEW.departmentLast})-C${OVERVIEW.expenses}`,
    money.result
  );


  writeInfo(
    OVERVIEW.reconciliationNote,
    "Expected / প্রত্যাশিত",
    "দুই মান 0; floating-point গণনায় ক্ষুদ্র residual হতে পারে।"
  );


  put(
    overview,
    OVERVIEW.checksHeader,
    0,
    "Input checks / ইনপুট পরীক্ষা",
    HEADER_STYLE
  );


  put(
    overview,
    OVERVIEW.checksHeader,
    1,
    "Count / সংখ্যা",
    HEADER_STYLE
  );


  writeInfo(
    OVERVIEW.negativeIncome,
    "Negative income inputs",
    `=COUNTIF(BudgetIncome!${rangeOf("C", INCOME)},"<0")+COUNTIF(BudgetIncome!${rangeOf("D", INCOME)},"<0")`
  );


  writeInfo(
    OVERVIEW.negativeExpenses,
    "Negative expense actual/weights",
    `=COUNTIF(BudgetExpenses!${rangeOf("D", EXPENSES)},"<0")+COUNTIF(BudgetExpenses!${rangeOf("G", EXPENSES)},"<0")`
  );


  writeInfo(
    OVERVIEW.negativeSavings,
    "Negative savings inputs",
    `=COUNTIF(BudgetSavings!${rangeOf("C", SAVINGS)},"<0")+COUNTIF(BudgetSavings!${rangeOf("D", SAVINGS)},"<0")`
  );


  writeInfo(
    OVERVIEW.invalidShares,
    "Invalid department shares",
    `=COUNTIF(BudgetSetup!B${SETUP.departmentFirst}:B${SETUP.departmentLast},"<0")+COUNTIF(BudgetSetup!B${SETUP.departmentFirst}:B${SETUP.departmentLast},">1")`
  );


  writeInfo(
    OVERVIEW.inputLimitations,
    "Input limitations / সীমাবদ্ধতা",
    "Text input সম্পূর্ণ validate হয় না। Formula cells locked নয়।",
    WARNING_STYLE
  );


  writeInfo(
    OVERVIEW.negativeSetup,
    "Negative setup amounts",
    "=IF(BudgetSetup!B7<0,1,0)+IF(BudgetSetup!B10<0,1,0)"
  );


  writeInfo(
    OVERVIEW.target,
    "Expense target / খরচের লক্ষ্য",
    "=BudgetSetup!B10",
    money.result
  );


  writeInfo(
    OVERVIEW.planned,
    "Planned expenses / পরিকল্পিত খরচ",
    `=B${OVERVIEW.expenses}`,
    money.result
  );


  writeInfo(
    OVERVIEW.difference,
    "Unallocated target / অবণ্টিত লক্ষ্য",
    `=B${OVERVIEW.target}-B${OVERVIEW.planned}`,
    money.result
  );


  writeInfo(
    OVERVIEW.targetStatus,
    "Target status / লক্ষ্য অবস্থা",
    `=IF(B${OVERVIEW.difference}>0.0000001,"UNALLOCATED / বরাদ্দ বাকি",IF(B${OVERVIEW.difference}<-0.0000001,"OVERALLOCATED / বেশি বরাদ্দ","MATCHED / মিলেছে"))`
  );


  writeInfo(OVERVIEW.currency, "Currency / মুদ্রা", "=BudgetSetup!B8");


  writeInfo(
    OVERVIEW.currencyNotice,
    "Number format / সংখ্যা প্রদর্শন",
    NUMBER_DISPLAY_NOTICE,
    WARNING_STYLE
  );


  writeInfo(
    OVERVIEW.shareTotal,
    "Department shares / মোট শতাংশ",
    `=BudgetSetup!B${SETUP.shareTotal}`,
    PERCENTAGE_STYLE
  );


  writeInfo(
    OVERVIEW.shareStatus,
    "Share status / শতাংশের অবস্থা",
    `=BudgetSetup!B${SETUP.shareStatus}`
  );


  writeInfo(
    OVERVIEW.invalidWeightDepartments,
    "Departments needing weight correction",
    `=COUNTIF(BudgetSetup!E${SETUP.departmentFirst}:E${SETUP.departmentLast},"WEIGHTS REQUIRED / ওজন দিন")+COUNTIF(BudgetSetup!E${SETUP.departmentFirst}:E${SETUP.departmentLast},"INVALID WEIGHTS")`
  );


  writeInfo(
    OVERVIEW.plannedCashWarning,
    "Planned cash warning",
    `=IF(B${OVERVIEW.closing}<0,"PLAN SHORTFALL / পরিকল্পনায় ঘাটতি","PLAN FUNDED / পরিকল্পনায় নগদ আছে")`
  );


  writeInfo(
    OVERVIEW.capacity,
    "Expense capacity / খরচের ধারণক্ষমতা",
    `${DEPARTMENTS.length} বিভাগ × ${CONFIG.expenseRowsPerDepartment} খাত = ${EXPENSES.count}`
  );


  // ----------------------------------------------------------
  // Conditional formatting
  // ----------------------------------------------------------


  addVarianceRules(
    overview,
    `D${OVERVIEW.opening}:D${OVERVIEW.closing}`,
    "budget-main"
  );


  addVarianceRules(
    overview,
    `D${OVERVIEW.departmentFirst}:D${OVERVIEW.departmentLast}`,
    "budget-departments"
  );


  overview.conditionalRules = [
    ...(overview.conditionalRules ?? []),
    {
      id: "budget-negative-actual-cash",
      range: `C${OVERVIEW.closing}:C${OVERVIEW.closing}`,
      condition: "less",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "budget-negative-planned-cash",
      range: `B${OVERVIEW.closing}:B${OVERVIEW.closing}`,
      condition: "less",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "budget-invalid-inputs",
      range: `B${OVERVIEW.negativeIncome}:B${OVERVIEW.invalidShares}`,
      condition: "greater",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "budget-negative-setup",
      range: `B${OVERVIEW.negativeSetup}:B${OVERVIEW.negativeSetup}`,
      condition: "greater",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "budget-overallocated-target",
      range: `B${OVERVIEW.difference}:B${OVERVIEW.difference}`,
      condition: "less",
      value: "-0.0000001",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "budget-unallocated-target",
      range: `B${OVERVIEW.difference}:B${OVERVIEW.difference}`,
      condition: "greater",
      value: "0.0000001",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
    {
      id: "budget-weight-correction-needed",
      range:
        `B${OVERVIEW.invalidWeightDepartments}:B${OVERVIEW.invalidWeightDepartments}`,
      condition: "greater",
      value: "0",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
  ];


  // ----------------------------------------------------------
  // Guide
  // ----------------------------------------------------------


  prepareSheet(guide, currencyCode, [
    "Topic / বিষয়",
    "Instructions / নির্দেশনা",
  ]);


  guide.colWidths = {
    0: 310,
    1: 800,
    2: 160,
    3: 160,
  };


  const guideRows: string[][] = [
    [
      "1. শুরু",
      "BudgetSetup-এ প্রতিষ্ঠান, মাস, opening cash এবং expense target লিখুন।",
    ],
    [
      "2. নমুনা বাজেট",
      "প্রাথমিক target 100,000,000 (10 কোটি)। এটি minimum বা maximum নয়।",
    ],
    [
      "3. নমুনা আয়",
      "Planned income 120,000,000; Actual sample income 115,000,000।",
    ],
    [
      "4. নমুনা খরচ",
      "Planned expenses 100,000,000; Actual sample expenses 95,000,000।",
    ],
    [
      "5. নমুনা সঞ্চয়",
      "Planned ও Actual sample savings 10,000,000।",
    ],
    [
      "6. নমুনা নগদ",
      "Opening cash 0 হলে Planned ও Actual closing cash উভয়ই 10,000,000।",
    ],
    [
      "7. তথ্যের ধরন",
      includeSampleActuals
        ? "Actual-সহ সব monetary sample বাস্তব ব্যবহারের আগে বদলান।"
        : "Actual শূন্য। Planned income, savings ও খাতগুলো নমুনা।",
    ],
    [
      "8. বাজেট পরিবর্তন",
      "BudgetSetup B10 বদলালে Planned expenses বদলায়। Actual, income ও savings নিজে লিখতে হবে।",
    ],
    [
      "9. বিভাগীয় শতাংশ",
      `BudgetSetup B${SETUP.departmentFirst}:B${SETUP.departmentLast} সম্পাদনা করুন। মোট 100% হওয়া উচিত।`,
    ],
    [
      "10. শতাংশ লেখা",
      "20% বোঝাতে 0.20 অথবা editor সমর্থন করলে 20% লিখুন। শুধু 20 লিখবেন না।",
    ],
    [
      "11. বিভাগের বরাদ্দ",
      "Department budget = expense target × department share।",
    ],
    [
      "12. খাতের weight",
      "Expenses G কলাম অর্থের পরিমাণ নয়, অনুপাত। 60,20,20 দিলে সেই অনুপাতে বরাদ্দ হয়।",
    ],
    [
      "13. Planned formula",
      "C কলাম = department budget × item weight ÷ total department weights।",
    ],
    [
      "14. নতুন খাত",
      `নিজ বিভাগের ${CONFIG.expenseRowsPerDepartment}টি সারির মধ্যে নাম ও positive G weight লিখুন।`,
    ],
    [
      "15. শূন্য weight",
      "Positive share কিন্তু total weight 0 হলে Planned allocation 0 এবং warning আসবে।",
    ],
    [
      "16. ঋণাত্মক weight",
      "একটি block-এ negative weight থাকলে ওই বিভাগের Planned allocation বন্ধ থাকবে। আগে weight ঠিক করুন।",
    ],
    [
      "17. Invalid share",
      "Share 0-এর কম বা 1-এর বেশি হলে বিভাগের allocation 0 এবং warning হবে।",
    ],
    [
      "18. Planned income",
      "Income C কলামে নিজের পরিকল্পনা লিখুন। বাজেট বাড়ালেই আয় বাড়ে না।",
    ],
    [
      "19. Planned savings",
      "Savings C কলামে সঞ্চয়ের পরিকল্পনা নিজে লিখুন।",
    ],
    [
      "20. Actual",
      "প্রাপ্ত আয়, পরিশোধিত খরচ ও চলতি মাসের savings transfer লিখুন।",
    ],
    [
      "21. Cash basis",
      "বকেয়া invoice বা পুরোনো savings balance Actual আয় নয়।",
    ],
    [
      "22. দ্বিগুণ গণনা",
      "Savings transfer-কে Expenses-এ আবার লিখবেন না।",
    ],
    [
      "23. উদ্বৃত্ত",
      "Income - operating expenses। Opening cash ও savings transfer এর অংশ নয়।",
    ],
    [
      "24. অবশিষ্ট নগদ",
      "Opening cash + income - operating expenses - savings transfers।",
    ],
    [
      "25. সংখ্যার নিয়ম",
      NUMBER_DISPLAY_NOTICE,
    ],
    [
      "26. Currency helper",
      "createBuiltInTemplateSnapshot বা createMonthlyBudgetSnapshot currency কোড গ্রহণ করে। applyTemplateCurrency নতুন snapshot দেয়।",
    ],
    [
      "27. Currency সীমা",
      "এই module নিজে live editor, dropdown বা save আপডেট করে না। B8 edit করলে snapshot metadata বদলায় না।",
    ],
    [
      "28. Currency list",
      `${SUPPORTED_CURRENCY_COUNT}টি supported currency কোডের reference BudgetSetup-এ রয়েছে।`,
    ],
    [
      "29. একই মুদ্রা",
      "এক workbook-এ একটি মুদ্রা ধরে হিসাব। Mixed-currency conversion নয়।",
    ],
    [
      "30. দশমিক",
      `অর্থের সংখ্যা কমা দিয়ে, ${MONEY_DECIMALS} দশমিকে দেখানো হয়। মূল মান ও formula অপরিবর্তিত।`,
    ],
    [
      "31. Rounding সীমা",
      "প্রতি খাতে minor-unit rounding ও শেষ খাতে rounding residual adjustment বাস্তবায়িত হয়নি।",
    ],
    [
      "32. Floating point",
      "ক্ষুদ্র residual হতে পারে। Target status-এ 0.0000001 tolerance রয়েছে।",
    ],
    [
      "33. ইনপুট পরীক্ষা",
      "Negative counts 0 হওয়া উচিত। Text ও অসম্পূর্ণ তথ্য সম্পূর্ণ validate হয় না।",
    ],
    [
      "34. Formula protection",
      "Formula cells locked নয়। Formula overwrite করবেন না।",
    ],
    [
      "35. Income capacity",
      `${INCOME.count} খাত; rows ${INCOME.first}:${INCOME.last}; Total ${INCOME.total}।`,
    ],
    [
      "36. Expense capacity",
      `${DEPARTMENTS.length} × ${CONFIG.expenseRowsPerDepartment} = ${EXPENSES.count} খাত; rows ${EXPENSES.first}:${EXPENSES.last}; Total ${EXPENSES.total}।`,
    ],
    [
      "37. Savings capacity",
      `${SAVINGS.count} খাত; rows ${SAVINGS.first}:${SAVINGS.last}; Total ${SAVINGS.total}।`,
    ],
    [
      "38. সারির সীমা",
      "নির্ধারিত block-এর বাইরে তথ্য totals-এ যোগ হবে না। Row insert/delete/sort এড়িয়ে চলুন।",
    ],
    [
      "39. নতুন মাস",
      "অ্যাপের Save As/duplicate থাকলে নতুন workbook করুন। Automatic rollover নেই।",
    ],
    [
      "40. অ্যাপের দায়িত্ব",
      "Database, autosave, import/export ও backup বিদ্যমান application-এর দায়িত্ব।",
    ],
    [
      "41. Formula support",
      "SUM, IF, COUNTIF, comparisons, arithmetic ও cross-sheet references কাজ করতে হবে।",
    ],
    [
      "42. শিরোনাম",
      "দুই লাইনের shared heading আছে। Merged rendering বর্তমান renderer-এর ওপর নির্ভর করে।",
    ],
    [
      "43. Search API",
      "searchWorkbookSnapshot-এ snapshot, query ও scope দিলে matching sheet/cell ফেরত পাওয়া যায়।",
    ],
    [
      "44. Search-এর তথ্য",
      "বর্তমান বা সেভ করা workbook খুঁজতে caller-কে সেই workbook-এর snapshot দিতে হবে।",
    ],
    [
      "45. Search-এর সীমা",
      "Search formula evaluate করে না। Formula source বাদ দেয়। Numeric literal খুঁজতে includeNumbers=true দিন।",
    ],
    [
      "46. Search UI",
      "এই module searchbar, dropdown, result panel বা cell navigation নিজে তৈরি করে না।",
    ],
    [
      "47. Search count",
      "সব matching entry গণনা করা হয়; results limit অনুযায়ী সংক্ষিপ্ত হতে পারে। Repeated department label একবার দেখায়।",
    ],
    [
      "48. হিসাবের ধরন",
      "এটি cash-basis budget planning; audited financial statement বা পূর্ণ accounting ledger নয়।",
    ],
    [
      "49. ফল যাচাই",
      `Overview B${OVERVIEW.expenses}=100,000,000; C${OVERVIEW.expenses}=95,000,000; B${OVERVIEW.closing}/C${OVERVIEW.closing}=10,000,000; B${OVERVIEW.difference}=0।`,
    ],
  ];


  guideRows.forEach((values, index) => {
    const row = 5 + index;


    put(guide, row, 0, values[0], HEADER_STYLE);
    put(guide, row, 1, values[1], RESULT_STYLE);
    setRowHeight(guide, row, 78);
  });


  return {
    name: "Monthly Budget",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    currencyCode,
    sheets: [
      overview,
      income,
      expenses,
      savings,
      setup,
      guide,
    ],
  };
};


// ------------------------------------------------------------
// Exchange Rate Converter — formula helpers
// ------------------------------------------------------------


// Quoted because the sheet name contains a space.
const RATE_SHEET_REF = `'${RATE_SHEET_NAME}'`;


const RATE_FROM_RANGE =
  `${RATE_SHEET_REF}!A${RATES.first}:A${RATES.last}`;


const RATE_TO_RANGE =
  `${RATE_SHEET_REF}!B${RATES.first}:B${RATES.last}`;


// Number of times a currency code appears in the rate table
// (as From or as To). 0 means the code is unknown to the table.
const currencyKnownCount = (cell: string): string => {
  return `COUNTIF(${RATE_FROM_RANGE},${cell})+COUNTIF(${RATE_TO_RANGE},${cell})`;
};


const rateRowStatusFormula = (row: number): string => {
  return (
    `=IF(A${row}="",IF(B${row}="",IF(C${row}="","","${RATE_STATUS.incomplete}"),"${RATE_STATUS.incomplete}"),` +
    `IF(B${row}="","${RATE_STATUS.incomplete}",` +
    `IF(C${row}<=0,"${RATE_STATUS.invalid}",` +
    `IF(A${row}=B${row},"${RATE_STATUS.same}","${RATE_STATUS.ok}"))))`
  );
};


const quickCheckFormula = (): string => {
  const amount = `B${CONVERTER.quickAmount}`;
  const from = `B${CONVERTER.quickFrom}`;
  const to = `B${CONVERTER.quickTo}`;


  return (
    `=IF(${amount}<0,"INVALID AMOUNT / ঋণাত্মক পরিমাণ",` +
    `IF(${currencyKnownCount(from)}=0,"FROM NOT IN RATE TABLE / থেকে-মুদ্রা তালিকায় নেই",` +
    `IF(${currencyKnownCount(to)}=0,"TO NOT IN RATE TABLE / এ-মুদ্রা তালিকায় নেই","OK")))`
  );
};


const businessCheckFormula = (): string => {
  const amount = `B${CONVERTER.bizAmount}`;
  const currency = `B${CONVERTER.bizCurrency}`;
  const discount = `B${CONVERTER.bizDiscount}`;
  const tax = `B${CONVERTER.bizTax}`;
  const to = `B${CONVERTER.bizTo}`;


  return (
    `=IF(${amount}<0,"INVALID AMOUNT / ঋণাত্মক পরিমাণ",` +
    `IF(${discount}<0,"INVALID DISCOUNT / ছাড় ভুল",` +
    `IF(${discount}>100,"INVALID DISCOUNT / ছাড় ভুল",` +
    `IF(${tax}<0,"INVALID TAX / কর ভুল",` +
    `IF(${currencyKnownCount(currency)}=0,"CURRENCY NOT IN RATE TABLE / মুদ্রা তালিকায় নেই",` +
    `IF(${currencyKnownCount(to)}=0,"CURRENCY NOT IN RATE TABLE / মুদ্রা তালিকায় নেই","OK"))))))`
  );
};


const tableAmountFormula = (row: number): string => {
  return `=IF(A${row}="","",CONVERT(A${row},B${row},C${row}))`;
};


const tableRateFormula = (row: number): string => {
  return `=IF(A${row}="","",CONVERT(1,B${row},C${row}))`;
};


const tableStatusFormula = (row: number): string => {
  return (
    `=IF(A${row}="","",` +
    `IF(A${row}<0,"INVALID AMOUNT / ঋণাত্মক পরিমাণ",` +
    `IF(B${row}="","FROM REQUIRED / থেকে-মুদ্রা দিন",` +
    `IF(C${row}="","TO REQUIRED / এ-মুদ্রা দিন",` +
    `IF(${currencyKnownCount(`B${row}`)}=0,"FROM NOT IN RATE TABLE / থেকে-মুদ্রা তালিকায় নেই",` +
    `IF(${currencyKnownCount(`C${row}`)}=0,"TO NOT IN RATE TABLE / এ-মুদ্রা তালিকায় নেই","OK"))))))`
  );
};


const statusRules = (
  range: string,
  prefix: string
): ConditionalRule[] => {
  return [
    {
      id: `${prefix}-invalid`,
      range,
      condition: "textContains",
      value: "INVALID",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: `${prefix}-not-in-table`,
      range,
      condition: "textContains",
      value: "NOT IN",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: `${prefix}-required`,
      range,
      condition: "textContains",
      value: "REQUIRED",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
    {
      id: `${prefix}-ok`,
      range,
      condition: "equal",
      value: "OK",
      bg: THEME.successBackground,
      color: THEME.successText,
    },
  ];
};


// ------------------------------------------------------------
// Exchange Rate Converter — Exchange Rates sheet
// ------------------------------------------------------------


const populateRatesSheet = (
  sheet: WorkbookSheet,
  styles: ConverterStyles
): void => {
  sheet.colWidths = {
    0: 140,
    1: 140,
    2: 170,
    3: 260,
    4: 190,
    5: 230,
    6: 300,
    7: 40,
    8: 340,
    9: 280,
  };


  sheet.rowHeights = {};
  sheet.frozenRows = 1;
  sheet.frozenCols = 0;


  setRowHeight(sheet, RATES.headerRow, 48);


  [
    "From",
    "To",
    "Rate",
    "Status / অবস্থা",
    "Updated / হালনাগাদ",
    "Source / উৎস",
    "Note / নোট",
  ].forEach((header, col) => {
    put(sheet, RATES.headerRow, col, header, HEADER_STYLE);
  });


  for (let index = 0; index < RATES.count; index++) {
    const row = RATES.first + index;
    const sample = RATE_SAMPLES[index];


    put(sheet, row, 0, sample ? sample[0] : "", styles.code);
    put(sheet, row, 1, sample ? sample[1] : "", styles.code);
    put(sheet, row, 2, sample ? String(sample[2]) : "", styles.rateInput);
    put(sheet, row, 3, rateRowStatusFormula(row), RESULT_STYLE);
    put(sheet, row, 4, "", INPUT_STYLE);
    put(sheet, row, 5, sample ? "SAMPLE / নমুনা" : "", INPUT_STYLE);
    put(sheet, row, 6, "", INPUT_STYLE);


    setRowHeight(sheet, row, 32);
  }


  // Summary block (columns I:J).
  put(sheet, RATES.headerRow, 8, "Rate table summary / হার সারসংক্ষেপ", HEADER_STYLE);
  put(sheet, RATES.headerRow, 9, "Value / তথ্য", HEADER_STYLE);


  const statusRange = `D${RATES.first}:D${RATES.last}`;


  put(sheet, RATES.usable, 8, "Usable rates / সঠিক হার", HEADER_STYLE);


  put(
    sheet,
    RATES.usable,
    9,
    `=COUNTIF(${statusRange},"${RATE_STATUS.ok}")`,
    { ...RESULT_STYLE, align: "right" }
  );


  put(sheet, RATES.problems, 8, "Rows needing correction / সংশোধন দরকার", HEADER_STYLE);


  put(
    sheet,
    RATES.problems,
    9,
    `=COUNTIF(${statusRange},"${RATE_STATUS.incomplete}")+COUNTIF(${statusRange},"${RATE_STATUS.invalid}")+COUNTIF(${statusRange},"${RATE_STATUS.same}")`,
    { ...RESULT_STYLE, align: "right" }
  );


  put(sheet, RATES.capacity, 8, "Rate capacity / ধারণক্ষমতা", HEADER_STYLE);


  put(
    sheet,
    RATES.capacity,
    9,
    `${RATES.count} rates; rows ${RATES.first}:${RATES.last}`,
    RESULT_STYLE
  );


  put(sheet, RATES.updated, 8, "Rates updated on / হার হালনাগাদের তারিখ", HEADER_STYLE);
  put(sheet, RATES.updated, 9, "YYYY-MM-DD", INPUT_STYLE);


  put(sheet, RATES.notice, 8, "Rate data notice / তথ্যের ধরন", HEADER_STYLE);


  put(
    sheet,
    RATES.notice,
    9,
    "SAMPLE RATES / নমুনা হার — বাস্তব ব্যবহারের আগে বাজারদর দিয়ে বদলান",
    WARNING_STYLE
  );


  put(sheet, RATES.base, 8, "Sample base / নমুনার ভিত্তি", HEADER_STYLE);


  put(
    sheet,
    RATES.base,
    9,
    "নমুনা হার BDT-ভিত্তিক। অন্য হোম মুদ্রা হলে হারগুলো নিজে বদলান।",
    RESULT_STYLE
  );


  for (let row = RATES.usable; row <= RATES.base; row++) {
    setRowHeight(sheet, row, 64);
  }


  sheet.conditionalRules = [
    {
      id: "rates-invalid",
      range: statusRange,
      condition: "textContains",
      value: "INVALID",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "rates-incomplete",
      range: statusRange,
      condition: "textContains",
      value: "INCOMPLETE",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
    {
      id: "rates-same-currency",
      range: statusRange,
      condition: "textContains",
      value: "SAME",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
    {
      id: "rates-ok",
      range: statusRange,
      condition: "equal",
      value: "OK",
      bg: THEME.successBackground,
      color: THEME.successText,
    },
    {
      id: "rates-problem-count",
      range: `J${RATES.problems}:J${RATES.problems}`,
      condition: "greater",
      value: "0",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
  ];
};


// ------------------------------------------------------------
// Exchange Rate Converter — Currency Converter sheet
// ------------------------------------------------------------


const populateConverterSheet = (
  sheet: WorkbookSheet,
  currencyCode: CurrencyCode,
  styles: ConverterStyles
): void => {
  sheet.colWidths = {
    0: 330,
    1: 240,
    2: 280,
    3: 260,
    4: 220,
    5: 340,
  };


  // ----- Quick converter -----------------------------------------


  const quick: {
    row: number;
    label: string;
    value: string;
    style: CellStyle;
    note: string;
  }[] = [
      {
        row: CONVERTER.quickAmount,
        label: "Amount / পরিমাণ",
        value: "100",
        style: styles.amountInput,
        note: "অ-ঋণাত্মক সংখ্যা লিখুন।",
      },
      {
        row: CONVERTER.quickFrom,
        label: "From currency / যে মুদ্রা থেকে",
        value: "USD",
        style: styles.code,
        note: "ISO কোড, বড় হাতের অক্ষরে (যেমন USD)।",
      },
      {
        row: CONVERTER.quickTo,
        label: "To currency / যে মুদ্রায়",
        value: currencyCode,
        style: styles.code,
        note: "ডিফল্ট হোম মুদ্রা; বদলানো যাবে।",
      },
      {
        row: CONVERTER.quickResult,
        label: "Converted amount / রূপান্তরিত পরিমাণ",
        value: `=CONVERT(B${CONVERTER.quickAmount},B${CONVERTER.quickFrom},B${CONVERTER.quickTo})`,
        style: styles.amountTotal,
        note: "Exchange Rates শিটের হার ব্যবহার করে।",
      },
      {
        row: CONVERTER.quickRate,
        label: "Rate used / ব্যবহৃত হার",
        value: `=CONVERT(1,B${CONVERTER.quickFrom},B${CONVERTER.quickTo})`,
        style: styles.rateResult,
        note: "1 From = Rate To।",
      },
      {
        row: CONVERTER.quickCheck,
        label: "Input check / ইনপুট পরীক্ষা",
        value: quickCheckFormula(),
        style: RESULT_STYLE,
        note: "OK না হলে ইনপুট বা হার তালিকা ঠিক করুন।",
      },
    ];


  quick.forEach((item) => {
    put(sheet, item.row, 0, item.label, HEADER_STYLE);
    put(sheet, item.row, 1, item.value, item.style);
    put(sheet, item.row, 2, item.note, RESULT_STYLE);
    setRowHeight(sheet, item.row, 46);
  });


  // ----- Business calculator -------------------------------------


  setRowHeight(sheet, CONVERTER.bizHeader - 1, 22);
  setRowHeight(sheet, CONVERTER.bizHeader, 54);


  [
    "Business calculator / ব্যবসায়িক হিসাব",
    "Value / তথ্য",
    "Note / মন্তব্য",
  ].forEach((header, col) => {
    put(sheet, CONVERTER.bizHeader, col, header, HEADER_STYLE);
  });


  const biz: {
    row: number;
    label: string;
    value: string;
    style: CellStyle;
    note: string;
  }[] = [
      {
        row: CONVERTER.bizAmount,
        label: "Product amount / পণ্যের মূল্য",
        value: "1000",
        style: styles.amountInput,
        note: "ছাড় ও কর বাদে মূল পরিমাণ।",
      },
      {
        row: CONVERTER.bizCurrency,
        label: "Currency / মুদ্রা",
        value: "USD",
        style: styles.code,
        note: "পণ্যের মূল্যের মুদ্রা।",
      },
      {
        row: CONVERTER.bizDiscount,
        label: "Discount % / ছাড় %",
        value: "10",
        style: styles.percentInput,
        note: "10 মানে 10%; % চিহ্ন ছাড়া লিখুন (0–100)।",
      },
      {
        row: CONVERTER.bizTax,
        label: "Tax / VAT % / কর %",
        value: "15",
        style: styles.percentInput,
        note: "15 মানে 15%; ছাড়ের পরের মূল্যের ওপর প্রযোজ্য।",
      },
      {
        row: CONVERTER.bizDiscountAmount,
        label: "Discount amount / ছাড়ের পরিমাণ",
        value: `=B${CONVERTER.bizAmount}*B${CONVERTER.bizDiscount}/100`,
        style: styles.amountResult,
        note: "Amount × Discount % ÷ 100।",
      },
      {
        row: CONVERTER.bizSubtotal,
        label: "Subtotal / উপমোট",
        value: `=B${CONVERTER.bizAmount}-B${CONVERTER.bizDiscountAmount}`,
        style: styles.amountResult,
        note: "Amount − Discount amount।",
      },
      {
        row: CONVERTER.bizTaxAmount,
        label: "Tax amount / করের পরিমাণ",
        value: `=B${CONVERTER.bizSubtotal}*B${CONVERTER.bizTax}/100`,
        style: styles.amountResult,
        note: "Subtotal × Tax % ÷ 100।",
      },
      {
        row: CONVERTER.bizTotal,
        label: "Total amount / মোট পরিমাণ",
        value: `=B${CONVERTER.bizSubtotal}+B${CONVERTER.bizTaxAmount}`,
        style: styles.amountTotal,
        note: "Subtotal + Tax amount।",
      },
      {
        row: CONVERTER.bizTo,
        label: "Convert to / যে মুদ্রায়",
        value: currencyCode,
        style: styles.code,
        note: "ডিফল্ট হোম মুদ্রা; বদলানো যাবে।",
      },
      {
        row: CONVERTER.bizConvertedSubtotal,
        label: "Converted subtotal / রূপান্তরিত উপমোট",
        value: `=CONVERT(B${CONVERTER.bizSubtotal},B${CONVERTER.bizCurrency},B${CONVERTER.bizTo})`,
        style: styles.amountResult,
        note: "",
      },
      {
        row: CONVERTER.bizConvertedTax,
        label: "Converted tax / রূপান্তরিত কর",
        value: `=CONVERT(B${CONVERTER.bizTaxAmount},B${CONVERTER.bizCurrency},B${CONVERTER.bizTo})`,
        style: styles.amountResult,
        note: "",
      },
      {
        row: CONVERTER.bizConvertedTotal,
        label: "Converted total / রূপান্তরিত মোট",
        value: `=CONVERT(B${CONVERTER.bizTotal},B${CONVERTER.bizCurrency},B${CONVERTER.bizTo})`,
        style: styles.amountTotal,
        note: "উপমোট ও কর আলাদাভাবে রূপান্তরিত; দুটির যোগফল এই মানের সমান।",
      },
      {
        row: CONVERTER.bizRate,
        label: "Rate used / ব্যবহৃত হার",
        value: `=CONVERT(1,B${CONVERTER.bizCurrency},B${CONVERTER.bizTo})`,
        style: styles.rateResult,
        note: "1 Currency = Rate Convert-to।",
      },
      {
        row: CONVERTER.bizCheck,
        label: "Input check / ইনপুট পরীক্ষা",
        value: businessCheckFormula(),
        style: RESULT_STYLE,
        note: "OK না হলে ইনপুট বা হার তালিকা ঠিক করুন।",
      },
    ];


  biz.forEach((item) => {
    put(sheet, item.row, 0, item.label, HEADER_STYLE);
    put(sheet, item.row, 1, item.value, item.style);
    put(sheet, item.row, 2, item.note, RESULT_STYLE);
    setRowHeight(sheet, item.row, 46);
  });


  // ----- Multi-currency conversion table -------------------------


  put(
    sheet,
    CONVERTER.tableTitle,
    0,
    "MULTI-CURRENCY CONVERSION TABLE / বহু-মুদ্রা রূপান্তর তালিকা",
    {
      ...RESULT_STYLE,
      bold: true,
      fontSize: 13,
    }
  );


  setRowHeight(sheet, CONVERTER.tableTitle, 40);
  setRowHeight(sheet, CONVERTER.tableHeader, 54);


  [
    "Amount / পরিমাণ",
    "From / থেকে",
    "To / এ",
    "Converted amount / রূপান্তরিত",
    "Rate used / হার",
    "Status / অবস্থা",
  ].forEach((header, col) => {
    put(sheet, CONVERTER.tableHeader, col, header, HEADER_STYLE);
  });


  for (let index = 0; index < CONVERTER.tableCount; index++) {
    const row = CONVERTER.tableFirst + index;
    const sample = CONVERSION_SAMPLES[index];


    const sampleFrom = sample
      ? sample[1] === "HOME" ? currencyCode : sample[1]
      : "";


    const sampleTo = sample
      ? sample[2] === "HOME" ? currencyCode : sample[2]
      : "";


    put(sheet, row, 0, sample ? String(sample[0]) : "", styles.amountInput);
    put(sheet, row, 1, sampleFrom, styles.code);
    put(sheet, row, 2, sampleTo, styles.code);
    put(sheet, row, 3, tableAmountFormula(row), styles.amountResult);
    put(sheet, row, 4, tableRateFormula(row), styles.rateResult);
    put(sheet, row, 5, tableStatusFormula(row), RESULT_STYLE);


    setRowHeight(sheet, row, 36);
  }


  // ----- Rate-table checks ---------------------------------------


  setRowHeight(sheet, CONVERTER.checksHeader, 48);


  [
    "Rate table checks / হার পরীক্ষা",
    "Value / তথ্য",
    "Note / মন্তব্য",
  ].forEach((header, col) => {
    put(sheet, CONVERTER.checksHeader, col, header, HEADER_STYLE);
  });


  const checks: {
    row: number;
    label: string;
    value: string;
    style: CellStyle;
    note: string;
  }[] = [
      {
        row: CONVERTER.usable,
        label: "Usable rates / সঠিক হার",
        value: `=${RATE_SHEET_REF}!J${RATES.usable}`,
        style: { ...RESULT_STYLE, align: "right" },
        note: "Exchange Rates শিটে Status = OK সারির সংখ্যা।",
      },
      {
        row: CONVERTER.problems,
        label: "Rows needing correction / সংশোধন দরকার",
        value: `=${RATE_SHEET_REF}!J${RATES.problems}`,
        style: { ...RESULT_STYLE, align: "right" },
        note: "0 হওয়া উচিত।",
      },
      {
        row: CONVERTER.updated,
        label: "Rates updated on / হার হালনাগাদের তারিখ",
        value: `=${RATE_SHEET_REF}!J${RATES.updated}`,
        style: RESULT_STYLE,
        note: "তারিখ Exchange Rates শিটে লিখুন।",
      },
      {
        row: CONVERTER.notice,
        label: "Rate data notice / তথ্যের ধরন",
        value: `=${RATE_SHEET_REF}!J${RATES.notice}`,
        style: WARNING_STYLE,
        note: "",
      },
      {
        row: CONVERTER.mode,
        label: "Calculation mode / হিসাবের ধরন",
        value: "OFFLINE / হাতে দেওয়া হার",
        style: RESULT_STYLE,
        note: "কোনো live বাজারদর নেই।",
      },
    ];


  checks.forEach((item) => {
    put(sheet, item.row, 0, item.label, HEADER_STYLE);
    put(sheet, item.row, 1, item.value, item.style);
    put(sheet, item.row, 2, item.note, RESULT_STYLE);
    setRowHeight(sheet, item.row, 46);
  });


  // ----- Conditional formatting ----------------------------------


  sheet.conditionalRules = [
    ...statusRules(
      `B${CONVERTER.quickCheck}:B${CONVERTER.quickCheck}`,
      "converter-quick"
    ),
    ...statusRules(
      `B${CONVERTER.bizCheck}:B${CONVERTER.bizCheck}`,
      "converter-business"
    ),
    ...statusRules(
      `F${CONVERTER.tableFirst}:F${CONVERTER.tableLast}`,
      "converter-table"
    ),
    {
      id: "converter-rate-problems",
      range: `B${CONVERTER.problems}:B${CONVERTER.problems}`,
      condition: "greater",
      value: "0",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
  ];
};


// ------------------------------------------------------------
// Exchange Rate Converter — builder
// ------------------------------------------------------------


export const createExchangeRateConverterSnapshot = (
  requestedCurrency: CurrencyCode = DEFAULT_CURRENCY
): WorkbookSnapshot => {
  const currencyCode = parseCurrencyCode(requestedCurrency);


  if (!currencyCode) {
    throw new RangeError("Unsupported template currency.");
  }


  const styles = createConverterStyles();


  const guideRows: string[][] = [
    [
      "1. শুরু",
      `প্রথমে ${RATE_SHEET_NAME} শিটে হার হালনাগাদ করুন, তারপর ${CONVERTER_SHEET_NAME} শিটে রূপান্তর করুন।`,
    ],
    [
      "2. নমুনা হার",
      "ফাইলের হারগুলো নমুনা (demonstration); live বাজারদর নয়। বাস্তব ব্যবহারের আগে সব হার বদলান।",
    ],
    [
      "3. হারের অর্থ",
      "Rate = 1 From মুদ্রা কত To মুদ্রার সমান। যেমন USD→BDT 122.5 মানে 1 USD = 122.5 BDT।",
    ],
    [
      "4. মুদ্রার কোড",
      "তিন অক্ষরের ISO কোড বড় হাতের অক্ষরে লিখুন, যেমন USD, BDT, EUR, SAR। ফাঁকা স্থান রাখবেন না।",
    ],
    [
      "5. নতুন মুদ্রা",
      "Exchange Rates শিটের ফাঁকা সারিতে From, To ও Rate লিখুন। যেমন XYZ→USD 0.25 দিলে XYZ থেকে অন্য মুদ্রায় রূপান্তরের জন্য USD-ভিত্তিক হার কাজে লাগে (CONVERT-এর আচরণ editor-এর formula engine অনুযায়ী)।",
    ],
    [
      "6. হারের ধারণক্ষমতা",
      `${RATES.count}টি হার; rows ${RATES.first}:${RATES.last}। Status ও summary শুধু এই সারিগুলো গণনা করে।`,
    ],
    [
      "7. Status কলাম",
      "D কলামে OK / INCOMPLETE / INVALID RATE / SAME CURRENCY দেখায়। Rate অবশ্যই 0-এর বেশি হতে হবে।",
    ],
    [
      "8. দ্বৈত জোড়া",
      "একই From–To জোড়া একাধিকবার দেবেন না। কোনটি ব্যবহৃত হবে তা formula engine-এর ওপর নির্ভর করে।",
    ],
    [
      "9. বিন্যাস অপরিবর্তিত রাখুন",
      `${RATE_SHEET_NAME} শিটের নাম, A:C কলাম এবং row 1 header বদলাবেন না। CONVERT এই বিন্যাস থেকে হার পড়ে। Row insert/delete/sort এড়িয়ে চলুন।`,
    ],
    [
      "10. দ্রুত রূপান্তর",
      `${CONVERTER_SHEET_NAME} শিটে B${CONVERTER.quickAmount}:B${CONVERTER.quickTo} লিখুন; ফল B${CONVERTER.quickResult} ও ব্যবহৃত হার B${CONVERTER.quickRate}।`,
    ],
    [
      "11. হোম মুদ্রা",
      `To currency (B${CONVERTER.quickTo}) ও Convert to (B${CONVERTER.bizTo}) ডিফল্ট হিসেবে হোম মুদ্রা (${currencyCode})। প্রয়োজনে বদলান।`,
    ],
    [
      "12. ব্যবসায়িক হিসাব",
      "Discount = Amount × Discount% ÷ 100; Subtotal = Amount − Discount; Tax = Subtotal × Tax% ÷ 100; Total = Subtotal + Tax।",
    ],
    [
      "13. শতাংশ লেখা",
      "Discount % ও Tax % এ 10 লিখলে 10% বোঝায়। % চিহ্ন বা 0.10 লিখবেন না।",
    ],
    [
      "14. রূপান্তরিত মোট",
      "উপমোট, কর ও মোট আলাদাভাবে রূপান্তরিত হয়। রূপান্তরিত উপমোট + রূপান্তরিত কর = রূপান্তরিত মোট।",
    ],
    [
      "15. বহু-মুদ্রা তালিকা",
      `${CONVERTER.tableCount}টি লাইন; rows ${CONVERTER.tableFirst}:${CONVERTER.tableLast}। Amount ফাঁকা থাকলে ওই লাইনের ফল ফাঁকা থাকে।`,
    ],
    [
      "16. CONVERT formula",
      'যেকোনো ঘরে =CONVERT(amount,"FROM","TO") অথবা ঘরের রেফারেন্স দিয়ে লিখতে পারবেন। যেমন =CONVERT(B5,B6,B7)।',
    ],
    [
      "17. Input check",
      "OK না হলে লাল বা হলুদ সতর্কতা আসে: ঋণাত্মক পরিমাণ, ভুল ছাড়/কর, বা মুদ্রা হার-তালিকায় নেই।",
    ],
    [
      "18. সংখ্যার নিয়ম",
      NUMBER_DISPLAY_NOTICE,
    ],
    [
      "19. দশমিক",
      `রূপান্তরিত অর্থ ${CONVERTER_DECIMALS} দশমিকে এবং হার ${RATE_DECIMALS} দশমিকে দেখানো হয়। মূল মান ও formula অপরিবর্তিত; খুব ছোট হার দেখাতে ${RATE_DECIMALS} দশমিক যথেষ্ট না হলেও গণনা সঠিক থাকে।`,
    ],
    [
      "20. Rounding সীমা",
      "প্রতি লাইনে minor-unit rounding বাস্তবায়িত হয়নি। প্রদর্শিত যোগফল ও গণনার মানে ক্ষুদ্র পার্থক্য হতে পারে।",
    ],
    [
      "21. অফলাইন হার",
      "হার হাতে দিতে হয়। এই module live exchange-rate ফিড বা স্বয়ংক্রিয় হালনাগাদ দেয় না।",
    ],
    [
      "22. একই মুদ্রা",
      "From ও To একই হলে Exchange Rates শিটে সেই সারি SAME CURRENCY দেখায়; এমন সারি হার তালিকায় রাখার দরকার নেই।",
    ],
    [
      "23. Formula protection",
      "Formula cells locked নয়। Status, summary ও ফল কলাম overwrite করবেন না।",
    ],
    [
      "24. ইনপুট সীমাবদ্ধতা",
      "Text হার (যেমন abc) সম্পূর্ণ validate হয় না। হারে শুধু সংখ্যা লিখুন।",
    ],
    [
      "25. Currency helper",
      "createBuiltInTemplateSnapshot বা createExchangeRateConverterSnapshot currency কোড গ্রহণ করে। applyTemplateCurrency শুধু হোম মুদ্রার ঘর ও লেবেল বদলায়; হার বা পরিমাণ রূপান্তর করে না।",
    ],
    [
      "26. হোম মুদ্রা ও নমুনা হার",
      "নমুনা হার BDT-ভিত্তিক। হোম মুদ্রা BDT না হলে প্রয়োজনীয় হার Exchange Rates শিটে নিজে যোগ বা বদলান।",
    ],
    [
      "27. Search API",
      "searchWorkbookSnapshot-এ এই workbook-এর শিটও খোঁজা যায়; ফল kind = content হিসেবে আসে। Numeric literal খুঁজতে includeNumbers=true দিন।",
    ],
    [
      "28. Formula support",
      "CONVERT, IF, COUNTIF, comparisons, arithmetic ও quoted cross-sheet reference (যেমন 'Exchange Rates'!A2:A201) editor-এ কাজ করতে হবে।",
    ],
    [
      "29. অ্যাপের দায়িত্ব",
      "Database, autosave, import/export, backup ও live editor আপডেট বিদ্যমান application-এর দায়িত্ব।",
    ],
    [
      "30. ফল যাচাই",
      `নমুনা হার অক্ষত ও হোম মুদ্রা BDT থাকলে: ${CONVERTER_SHEET_NAME} B${CONVERTER.quickResult}=12,250.00; B${CONVERTER.bizTotal}=1,035.00; B${CONVERTER.bizConvertedTotal}=126,787.50।`,
    ],
  ];


  const converter = createSheet(CONVERTER_SHEET_NAME, 80, 6);
  const rates = createSheet(RATE_SHEET_NAME, RATES.last + 9, 10);


  const guide = createSheet(
    CONVERTER_GUIDE_NAME,
    5 + guideRows.length + 10,
    4
  );


  // Converter: title, subtitle and the first section header.
  prepareSheet(converter, currencyCode, [
    "Quick converter / দ্রুত রূপান্তর",
    "Value / তথ্য",
    "Note / মন্তব্য",
  ]);


  populateConverterSheet(converter, currencyCode, styles);


  populateRatesSheet(rates, styles);


  // Guide.
  prepareSheet(guide, currencyCode, [
    "Topic / বিষয়",
    "Instructions / নির্দেশনা",
  ]);


  guide.colWidths = {
    0: 310,
    1: 800,
    2: 160,
    3: 160,
  };


  guideRows.forEach((values, index) => {
    const row = 5 + index;


    put(guide, row, 0, values[0], HEADER_STYLE);
    put(guide, row, 1, values[1], RESULT_STYLE);
    setRowHeight(guide, row, 78);
  });


  return {
    name: "Exchange Rate Converter",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    currencyCode,
    sheets: [
      converter,
      rates,
      guide,
    ],
  };
};


// ------------------------------------------------------------
// Inventory Management — styles
// ------------------------------------------------------------


interface InventoryStyles {
  code: CellStyle;
  date: CellStyle;
  qtyInput: CellStyle;
  qtyResult: CellStyle;
  qtyTotal: CellStyle;
  priceInput: CellStyle;
  amountInput: CellStyle;
  amountResult: CellStyle;
  amountTotal: CellStyle;
}


// Quantities: whole numbers (0 decimals). Prices and values: 2 decimals.
// Both use the plain "number" format (no currency symbol).
const createInventoryStyles = (): InventoryStyles => {
  const qtyFormat: CellStyle = {
    numberFormat: "number",
    decimals: 0,
    align: "right",
  };


  const amountFormat: CellStyle = {
    numberFormat: "number",
    decimals: INVENTORY_DECIMALS,
    align: "right",
  };


  const total: CellStyle = {
    bold: true,
    bg: THEME.green,
    color: THEME.gold,
  };


  return {
    code: { ...INPUT_STYLE, align: "center" },
    date: { ...INPUT_STYLE, align: "center" },
    qtyInput: { ...INPUT_STYLE, ...qtyFormat },
    qtyResult: { ...RESULT_STYLE, ...qtyFormat },
    qtyTotal: { ...RESULT_STYLE, ...qtyFormat, ...total },
    priceInput: { ...INPUT_STYLE, ...amountFormat },
    amountInput: { ...INPUT_STYLE, ...amountFormat },
    amountResult: { ...RESULT_STYLE, ...amountFormat },
    amountTotal: { ...RESULT_STYLE, ...amountFormat, ...total },
  };
};


// ------------------------------------------------------------
// Inventory Management — sample data (demonstration only)
// ------------------------------------------------------------


const INV_SAMPLE_CATEGORIES: readonly string[] = [
  "Grocery / মুদি",
  "Beverages / পানীয়",
  "Household / গৃহস্থালি",
  "Personal care / ব্যক্তিগত পরিচর্যা",
  "Electronics / ইলেকট্রনিক্স",
  "Stationery / স্টেশনারি",
];


interface InventorySupplierSample {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
}


const INV_SAMPLE_SUPPLIERS: readonly InventorySupplierSample[] = [
  {
    id: "SUP-001",
    name: "Dhaka Grocery Wholesale / ঢাকা মুদি পাইকারি",
    contact: "Sample Contact A",
    phone: "01700-000001",
    email: "grocery@example.com",
    address: "DEMO / নমুনা — Dhaka",
  },
  {
    id: "SUP-002",
    name: "City Daily Supplies / সিটি ডেইলি সাপ্লাইজ",
    contact: "Sample Contact B",
    phone: "01700-000002",
    email: "daily@example.com",
    address: "DEMO / নমুনা — Dhaka",
  },
  {
    id: "SUP-003",
    name: "Metro Electric & Office / মেট্রো ইলেকট্রিক ও অফিস",
    contact: "Sample Contact C",
    phone: "01700-000003",
    email: "office@example.com",
    address: "DEMO / নমুনা — Dhaka",
  },
];


interface InventoryProductSample {
  sku: string;
  name: string;
  category: string;
  unit: string;
  supplier: string;
  cost: number;
  price: number;
  opening: number;
  reorder: number;
}


const INV_SAMPLE_PRODUCTS: readonly InventoryProductSample[] = [
  { sku: "SFP-1001", name: "Basmati rice 5 kg / বাসমতি চাল ৫ কেজি", category: "Grocery / মুদি", unit: "pack", supplier: "SUP-001", cost: 520, price: 600, opening: 100, reorder: 20 },
  { sku: "SFP-1002", name: "Soybean oil 5 L / সয়াবিন তেল ৫ লিটার", category: "Grocery / মুদি", unit: "pcs", supplier: "SUP-001", cost: 780, price: 860, opening: 60, reorder: 15 },
  { sku: "SFP-1003", name: "Sugar 1 kg / চিনি ১ কেজি", category: "Grocery / মুদি", unit: "pack", supplier: "SUP-001", cost: 118, price: 135, opening: 200, reorder: 50 },
  { sku: "SFP-2001", name: "Mineral water 1.5 L / মিনারেল ওয়াটার", category: "Beverages / পানীয়", unit: "pcs", supplier: "SUP-002", cost: 28, price: 40, opening: 300, reorder: 100 },
  { sku: "SFP-2002", name: "Tea 400 g / চা ৪০০ গ্রাম", category: "Beverages / পানীয়", unit: "pack", supplier: "SUP-002", cost: 210, price: 250, opening: 80, reorder: 25 },
  { sku: "SFP-3001", name: "Dishwashing liquid / থালাবাসন ধোয়ার তরল", category: "Household / গৃহস্থালি", unit: "pcs", supplier: "SUP-002", cost: 95, price: 120, opening: 70, reorder: 20 },
  { sku: "SFP-3002", name: "Laundry detergent 1 kg / কাপড় ধোয়ার পাউডার", category: "Household / গৃহস্থালি", unit: "pack", supplier: "SUP-002", cost: 165, price: 195, opening: 90, reorder: 30 },
  { sku: "SFP-4001", name: "Bath soap / গোসলের সাবান", category: "Personal care / ব্যক্তিগত পরিচর্যা", unit: "pcs", supplier: "SUP-002", cost: 38, price: 50, opening: 150, reorder: 50 },
  { sku: "SFP-5001", name: "LED bulb 12 W / এলইডি বাল্ব", category: "Electronics / ইলেকট্রনিক্স", unit: "pcs", supplier: "SUP-003", cost: 140, price: 190, opening: 50, reorder: 15 },
  { sku: "SFP-5002", name: "Extension cord 4-way / এক্সটেনশন কর্ড", category: "Electronics / ইলেকট্রনিক্স", unit: "pcs", supplier: "SUP-003", cost: 360, price: 450, opening: 25, reorder: 10 },
  { sku: "SFP-6001", name: "A4 paper ream / এ-ফোর কাগজ", category: "Stationery / স্টেশনারি", unit: "pack", supplier: "SUP-003", cost: 430, price: 520, opening: 40, reorder: 10 },
  { sku: "SFP-6002", name: "Ball pen box / বলপেন বক্স", category: "Stationery / স্টেশনারি", unit: "box", supplier: "SUP-003", cost: 160, price: 210, opening: 30, reorder: 8 },
];


interface InventoryMovementSample {
  date: string;
  sku: string;
  type: "IN" | "OUT";
  qty: number;
  rate: number;
  ref: string;
  note: string;
}


const INV_SAMPLE_MOVEMENTS: readonly InventoryMovementSample[] = [
  { date: "2026-11-01", sku: "SFP-1001", type: "IN", qty: 50, rate: 520, ref: "PO-1001", note: "Weekly restock" },
  { date: "2026-11-01", sku: "SFP-1003", type: "IN", qty: 100, rate: 118, ref: "PO-1001", note: "Weekly restock" },
  { date: "2026-11-02", sku: "SFP-2001", type: "IN", qty: 200, rate: 28, ref: "PO-1002", note: "Beverage restock" },
  { date: "2026-11-02", sku: "SFP-1001", type: "OUT", qty: 35, rate: 600, ref: "INV-2001", note: "Retail sale" },
  { date: "2026-11-03", sku: "SFP-1002", type: "OUT", qty: 28, rate: 860, ref: "INV-2002", note: "Retail sale" },
  { date: "2026-11-03", sku: "SFP-1003", type: "OUT", qty: 90, rate: 135, ref: "INV-2003", note: "Retail sale" },
  { date: "2026-11-04", sku: "SFP-2001", type: "OUT", qty: 180, rate: 40, ref: "INV-2004", note: "Bulk sale" },
  { date: "2026-11-04", sku: "SFP-2002", type: "OUT", qty: 30, rate: 250, ref: "INV-2005", note: "Retail sale" },
  { date: "2026-11-05", sku: "SFP-3001", type: "OUT", qty: 25, rate: 120, ref: "INV-2006", note: "Retail sale" },
  { date: "2026-11-05", sku: "SFP-3002", type: "IN", qty: 40, rate: 165, ref: "PO-1003", note: "Restock" },
  { date: "2026-11-06", sku: "SFP-4001", type: "OUT", qty: 60, rate: 50, ref: "INV-2007", note: "Retail sale" },
  { date: "2026-11-06", sku: "SFP-5001", type: "OUT", qty: 20, rate: 190, ref: "INV-2008", note: "Retail sale" },
  { date: "2026-11-07", sku: "SFP-5002", type: "OUT", qty: 18, rate: 450, ref: "INV-2009", note: "Retail sale" },
  { date: "2026-11-07", sku: "SFP-6001", type: "IN", qty: 20, rate: 430, ref: "PO-1004", note: "Restock" },
  { date: "2026-11-08", sku: "SFP-6001", type: "OUT", qty: 22, rate: 520, ref: "INV-2010", note: "Office order" },
  { date: "2026-11-08", sku: "SFP-6002", type: "OUT", qty: 22, rate: 210, ref: "INV-2011", note: "Office order" },
  { date: "2026-11-09", sku: "SFP-3002", type: "OUT", qty: 35, rate: 195, ref: "INV-2012", note: "Retail sale" },
  { date: "2026-11-09", sku: "SFP-1002", type: "IN", qty: 20, rate: 780, ref: "PO-1005", note: "Restock" },
  { date: "2026-11-10", sku: "SFP-2002", type: "OUT", qty: 35, rate: 250, ref: "INV-2013", note: "Retail sale" },
  { date: "2026-11-10", sku: "SFP-4001", type: "IN", qty: 30, rate: 38, ref: "PO-1006", note: "Restock" },
];


interface InventorySampleStats {
  products: number;
  units: number;
  value: number;
  salesValue: number;
  low: number;
  out: number;
  negative: number;
  inQty: number;
  outQty: number;
  purchases: number;
  salesOut: number;
  cogs: number;
}


// Independent JavaScript calculation of the sample data. Used only to
// print the verification values in the guide sheet; the workbook itself
// is always calculated by its formulas.
const computeInventorySampleStats = (): InventorySampleStats => {
  const stock = new Map<string, number>();
  const costs = new Map<string, number>();


  for (const product of INV_SAMPLE_PRODUCTS) {
    stock.set(product.sku, product.opening);
    costs.set(product.sku, product.cost);
  }


  const stats: InventorySampleStats = {
    products: INV_SAMPLE_PRODUCTS.length,
    units: 0,
    value: 0,
    salesValue: 0,
    low: 0,
    out: 0,
    negative: 0,
    inQty: 0,
    outQty: 0,
    purchases: 0,
    salesOut: 0,
    cogs: 0,
  };


  for (const move of INV_SAMPLE_MOVEMENTS) {
    const current = stock.get(move.sku) ?? 0;
    const unitCost = costs.get(move.sku) ?? 0;


    if (move.type === "IN") {
      stock.set(move.sku, current + move.qty);
      stats.inQty += move.qty;
      stats.purchases += move.qty * move.rate;
    } else {
      stock.set(move.sku, current - move.qty);
      stats.outQty += move.qty;
      stats.salesOut += move.qty * move.rate;
      stats.cogs += move.qty * unitCost;
    }
  }


  for (const product of INV_SAMPLE_PRODUCTS) {
    const level = stock.get(product.sku) ?? 0;


    stats.units += level;
    stats.value += level * product.cost;
    stats.salesValue += level * product.price;


    if (level < 0) stats.negative++;
    else if (level === 0) stats.out++;
    else if (level <= product.reorder) stats.low++;
  }


  return stats;
};


const formatGuideNumber = (value: number, decimals = 2): string => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};


// ------------------------------------------------------------
// Inventory Management — formula helpers
// ------------------------------------------------------------


const invProductRange = (column: string): string => {
  return `${INV_PRODUCTS_NAME}!${rangeOf(column, INV_PRODUCTS)}`;
};


const invMovementRange = (column: string): string => {
  return `${INV_MOVEMENTS_NAME}!${rangeOf(column, INV_MOVEMENTS)}`;
};


const invSupplierRange = (column: string): string => {
  return `${INV_SUPPLIERS_NAME}!${rangeOf(column, INV_SUPPLIERS)}`;
};


const inventoryProductStatusFormula = (row: number): string => {
  const S = INV_PRODUCT_STATUS;
  const sku = `A${row}`;
  const name = `B${row}`;
  const supplier = `E${row}`;
  const cost = `F${row}`;
  const price = `G${row}`;
  const opening = `H${row}`;
  const reorder = `I${row}`;
  const stock = `L${row}`;


  const stockStatus =
    `IF(${stock}<0,"${S.negative}",` +
    `IF(${stock}=0,"${S.out}",` +
    `IF(${stock}<=${reorder},"${S.low}","${S.ok}")))`;


  return (
    `=IF(${sku}="",IF(${name}="","","${S.skuRequired}"),` +
    `IF(COUNTIF(${rangeOf("A", INV_PRODUCTS)},${sku})>1,"${S.duplicate}",` +
    `IF(${name}="","${S.nameRequired}",` +
    `IF(${cost}<0,"${S.invalid}",` +
    `IF(${price}<0,"${S.invalid}",` +
    `IF(${opening}<0,"${S.invalid}",` +
    `IF(${reorder}<0,"${S.invalid}",` +
    `IF(COUNTIF(${invSupplierRange("A")},${supplier})+IF(${supplier}="",1,0)=0,"${S.supplierMissing}",` +
    `${stockStatus}))))))))`
  );
};


const inventoryMovementStatusFormula = (row: number): string => {
  const S = INV_MOVEMENT_STATUS;
  const date = `A${row}`;
  const sku = `B${row}`;
  const type = `C${row}`;
  const qty = `D${row}`;
  const rate = `E${row}`;
  const balance = `K${row}`;
  const products = invProductRange("A");


  const validRow =
    `IF(${qty}<=0,"${S.invalidQty}",` +
    `IF(${rate}<0,"${S.invalidRate}",` +
    `IF(${date}="","${S.dateRequired}",` +
    `IF(${type}="OUT",IF(${balance}<0,"${S.insufficient}","${S.ok}"),"${S.ok}"))))`;


  return (
    `=IF(${sku}="",IF(${type}="",IF(${qty}=0,"","${S.skuRequired}"),"${S.skuRequired}"),` +
    `IF(COUNTIF(${products},${sku})=0,"${S.notFound}",` +
    `IF(COUNTIF(${products},${sku})>1,"${S.duplicate}",` +
    `IF(${type}="IN",${validRow},` +
    `IF(${type}="OUT",${validRow},"${S.invalidType}")))))`
  );
};


const inventorySupplierStatusFormula = (row: number): string => {
  const S = INV_SUPPLIER_STATUS;


  return (
    `=IF(A${row}="",IF(B${row}="","","${S.idRequired}"),` +
    `IF(COUNTIF(${rangeOf("A", INV_SUPPLIERS)},A${row})>1,"${S.duplicate}",` +
    `IF(B${row}="","${S.nameRequired}","${S.ok}")))`
  );
};


const inventoryStatusRules = (
  range: string,
  prefix: string,
  okValue: string
): ConditionalRule[] => {
  const rule = (
    id: string,
    condition: ConditionalRule["condition"],
    value: string,
    bg: string,
    color: string
  ): ConditionalRule => ({
    id: `${prefix}-${id}`,
    range,
    condition,
    value,
    bg,
    color,
  });


  return [
    rule("invalid", "textContains", "INVALID", THEME.dangerBackground, THEME.dangerText),
    rule("not-found", "textContains", "NOT FOUND", THEME.dangerBackground, THEME.dangerText),
    rule("duplicate", "textContains", "DUPLICATE", THEME.dangerBackground, THEME.dangerText),
    rule("insufficient", "textContains", "INSUFFICIENT", THEME.dangerBackground, THEME.dangerText),
    rule("negative", "textContains", "NEGATIVE", THEME.dangerBackground, THEME.dangerText),
    rule("required", "textContains", "REQUIRED", THEME.warningBackground, THEME.warningText),
    rule("low", "textContains", "LOW STOCK", THEME.warningBackground, THEME.warningText),
    rule("out", "textContains", "OUT OF STOCK", THEME.warningBackground, THEME.warningText),
    rule("ok", "equal", okValue, THEME.successBackground, THEME.successText),
  ];
};


// ------------------------------------------------------------
// Inventory Management — Setup sheet
// ------------------------------------------------------------


const populateInventorySetup = (
  sheet: WorkbookSheet,
  currencyCode: CurrencyCode,
  styles: InventoryStyles,
  budgetThreshold: number
): void => {
  sheet.colWidths = { 0: 330, 1: 330, 2: 470, 3: 160 };


  const settings: {
    row: number;
    label: string;
    value: string;
    style: CellStyle;
    note: string;
  }[] = [
      {
        row: INV_SETUP.organization,
        label: "Organization / প্রতিষ্ঠান",
        value: "Smart Family Point",
        style: INPUT_STYLE,
        note: "নিজ প্রতিষ্ঠানের নাম লিখুন।",
      },
      {
        row: INV_SETUP.period,
        label: "Period / হিসাবের সময়",
        value: "YYYY-MM",
        style: INPUT_STYLE,
        note: "রিপোর্টের মাস বা সময় লিখুন। Automatic date filtering নেই।",
      },
      {
        row: INV_SETUP.budget,
        label: "Inventory budget threshold / ইনভেন্টরি বাজেট সীমা",
        value: String(budgetThreshold),
        style: styles.amountInput,
        note: `পরিকল্পনার সীমা; ন্যূনতম ${formatGuideNumber(INV_MIN_BUDGET, 0)}। এটি জমা নগদ বা অনুমোদিত ঋণ নয়।`,
      },
      {
        row: INV_SETUP.currency,
        label: "Currency / মুদ্রা",
        value: currencyCode,
        style: RESULT_STYLE,
        note: "শুধু তথ্য হিসেবে মুদ্রার কোড; সংখ্যায় কোনো মুদ্রা চিহ্ন দেখানো হয় না।",
      },
      {
        row: INV_SETUP.preparedBy,
        label: "Prepared by / প্রস্তুতকারী",
        value: "",
        style: INPUT_STYLE,
        note: "দায়িত্বপ্রাপ্ত ব্যক্তির নাম।",
      },
      {
        row: INV_SETUP.minimum,
        label: "Minimum budget threshold / সর্বনিম্ন সীমা",
        value: String(INV_MIN_BUDGET),
        style: styles.amountResult,
        note: "নির্ধারিত সর্বনিম্ন সীমা। বাজেট সীমা এর কম হলে সতর্কতা আসে।",
      },
      {
        row: INV_SETUP.budgetCheck,
        label: "Budget check / বাজেট পরীক্ষা",
        value: `=IF(B${INV_SETUP.budget}<B${INV_SETUP.minimum},"${INV_BUDGET_STATUS.below}","OK")`,
        style: RESULT_STYLE,
        note: "OK না হলে বাজেট সীমা সংশোধন করুন।",
      },
      {
        row: INV_SETUP.numberNotice,
        label: "Number format / সংখ্যা প্রদর্শন",
        value: NUMBER_DISPLAY_NOTICE,
        style: WARNING_STYLE,
        note: "",
      },
      {
        row: INV_SETUP.budgetNotice,
        label: "Budget notice / বাজেট সীমা সম্পর্কে",
        value: "বাজেট সীমা শুধু স্টক মূল্যের তুলনার জন্য; বাস্তব নগদ বা তহবিল নয়।",
        style: WARNING_STYLE,
        note: "",
      },
    ];


  settings.forEach((item) => {
    put(sheet, item.row, 0, item.label, HEADER_STYLE);
    put(sheet, item.row, 1, item.value, item.style);
    put(sheet, item.row, 2, item.note, RESULT_STYLE);
    setRowHeight(sheet, item.row, 60);
  });


  setRowHeight(sheet, INV_SETUP.numberNotice, 84);
  setRowHeight(sheet, INV_SETUP.budgetNotice, 70);


  [
    "Product category / পণ্যের ক্যাটাগরি",
    "Products using it / পণ্যসংখ্যা",
    "Instructions / নির্দেশনা",
  ].forEach((value, col) => {
    put(sheet, INV_SETUP.categoryHeader, col, value, HEADER_STYLE);
  });


  setRowHeight(sheet, INV_SETUP.categoryHeader, 54);


  for (let index = 0; index < INV_CATEGORY_COUNT; index++) {
    const row = INV_SETUP.categoryFirst + index;
    const category = INV_SAMPLE_CATEGORIES[index] ?? "";


    put(sheet, row, 0, category, INPUT_STYLE);


    put(
      sheet,
      row,
      1,
      `=IF(A${row}="",0,COUNTIF(${invProductRange("C")},A${row}))`,
      styles.qtyResult
    );


    put(
      sheet,
      row,
      2,
      index === 0
        ? "Products শিটের Category কলামে এখানকার নামটি হুবহু লিখুন। Dashboard এই তালিকা থেকে ক্যাটাগরি-ভিত্তিক সারসংক্ষেপ দেখায়।"
        : "",
      RESULT_STYLE
    );


    setRowHeight(sheet, row, index === 0 ? 70 : 36);
  }


  sheet.conditionalRules = [
    {
      id: "inv-setup-budget-below",
      range: `B${INV_SETUP.budgetCheck}:B${INV_SETUP.budgetCheck}`,
      condition: "textContains",
      value: "BELOW",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "inv-setup-budget-ok",
      range: `B${INV_SETUP.budgetCheck}:B${INV_SETUP.budgetCheck}`,
      condition: "equal",
      value: "OK",
      bg: THEME.successBackground,
      color: THEME.successText,
    },
  ];
};


// ------------------------------------------------------------
// Inventory Management — Suppliers sheet
// ------------------------------------------------------------


const populateInventorySuppliers = (
  sheet: WorkbookSheet,
  styles: InventoryStyles,
  includeSample: boolean
): void => {
  sheet.colWidths = {
    0: 190, 1: 360, 2: 250, 3: 220, 4: 280, 5: 340, 6: 210, 7: 260, 8: 250,
  };


  for (let row = INV_SUPPLIERS.first; row <= INV_SUPPLIERS.last; row++) {
    const sample = includeSample
      ? INV_SAMPLE_SUPPLIERS[row - INV_SUPPLIERS.first]
      : undefined;


    put(sheet, row, 0, sample?.id ?? "", styles.code);
    put(sheet, row, 1, sample?.name ?? "", INPUT_STYLE);
    put(sheet, row, 2, sample?.contact ?? "", INPUT_STYLE);
    put(sheet, row, 3, sample?.phone ?? "", INPUT_STYLE);
    put(sheet, row, 4, sample?.email ?? "", INPUT_STYLE);
    put(sheet, row, 5, sample?.address ?? "", INPUT_STYLE);


    put(
      sheet,
      row,
      6,
      `=IF(A${row}="",0,COUNTIF(${invProductRange("E")},A${row}))`,
      styles.qtyResult
    );


    put(
      sheet,
      row,
      7,
      `=IF(A${row}="",0,SUMIF(${invProductRange("E")},A${row},${invProductRange("M")}))`,
      styles.amountResult
    );


    put(sheet, row, 8, inventorySupplierStatusFormula(row), RESULT_STYLE);
    setRowHeight(sheet, row, 36);
  }


  put(sheet, INV_SUPPLIERS.total, 0, "TOTAL / মোট", HEADER_STYLE);


  put(
    sheet,
    INV_SUPPLIERS.total,
    6,
    `=SUM(${rangeOf("G", INV_SUPPLIERS)})`,
    styles.qtyTotal
  );


  put(
    sheet,
    INV_SUPPLIERS.total,
    7,
    `=SUM(${rangeOf("H", INV_SUPPLIERS)})`,
    styles.amountTotal
  );


  sheet.conditionalRules = inventoryStatusRules(
    rangeOf("I", INV_SUPPLIERS),
    "inv-suppliers",
    INV_SUPPLIER_STATUS.ok
  );
};


// ------------------------------------------------------------
// Inventory Management — Products sheet
// ------------------------------------------------------------


const populateInventoryProducts = (
  sheet: WorkbookSheet,
  styles: InventoryStyles,
  includeSample: boolean
): void => {
  sheet.colWidths = {
    0: 190, 1: 400, 2: 280, 3: 130, 4: 170, 5: 200, 6: 200, 7: 190, 8: 190,
    9: 170, 10: 170, 11: 190, 12: 240, 13: 240, 14: 170, 15: 230, 16: 290, 17: 130,
  };


  const movementSku = invMovementRange("B");
  const movementIn = invMovementRange("I");
  const movementOut = invMovementRange("J");


  for (let row = INV_PRODUCTS.first; row <= INV_PRODUCTS.last; row++) {
    const sample = includeSample
      ? INV_SAMPLE_PRODUCTS[row - INV_PRODUCTS.first]
      : undefined;


    put(sheet, row, 0, sample?.sku ?? "", styles.code);
    put(sheet, row, 1, sample?.name ?? "", INPUT_STYLE);
    put(sheet, row, 2, sample?.category ?? "", INPUT_STYLE);
    put(sheet, row, 3, sample?.unit ?? "", styles.code);
    put(sheet, row, 4, sample?.supplier ?? "", styles.code);
    put(sheet, row, 5, String(sample?.cost ?? 0), styles.priceInput);
    put(sheet, row, 6, String(sample?.price ?? 0), styles.priceInput);
    put(sheet, row, 7, String(sample?.opening ?? 0), styles.qtyInput);
    put(sheet, row, 8, String(sample?.reorder ?? 0), styles.qtyInput);


    put(
      sheet,
      row,
      9,
      `=IF(A${row}="",0,SUMIF(${movementSku},A${row},${movementIn}))`,
      styles.qtyResult
    );


    put(
      sheet,
      row,
      10,
      `=IF(A${row}="",0,SUMIF(${movementSku},A${row},${movementOut}))`,
      styles.qtyResult
    );


    put(sheet, row, 11, `=H${row}+J${row}-K${row}`, styles.qtyResult);
    put(sheet, row, 12, `=L${row}*F${row}`, styles.amountResult);
    put(sheet, row, 13, `=L${row}*G${row}`, styles.amountResult);


    put(
      sheet,
      row,
      14,
      `=IF(G${row}=0,0,(G${row}-F${row})/G${row})`,
      PERCENTAGE_STYLE
    );


    put(
      sheet,
      row,
      15,
      `=IF(A${row}="",0,IF(L${row}<=I${row},I${row}-L${row},0))`,
      styles.qtyResult
    );


    put(sheet, row, 16, inventoryProductStatusFormula(row), RESULT_STYLE);
    put(sheet, row, 17, `=IF(Q${row}="",0,1)`, styles.qtyResult);
    setRowHeight(sheet, row, 40);
  }


  put(sheet, INV_PRODUCTS.total, 0, "TOTAL / মোট", HEADER_STYLE);


  [
    { column: "H", index: 7, style: styles.qtyTotal },
    { column: "J", index: 9, style: styles.qtyTotal },
    { column: "K", index: 10, style: styles.qtyTotal },
    { column: "L", index: 11, style: styles.qtyTotal },
    { column: "M", index: 12, style: styles.amountTotal },
    { column: "N", index: 13, style: styles.amountTotal },
    { column: "P", index: 15, style: styles.qtyTotal },
    { column: "R", index: 17, style: styles.qtyTotal },
  ].forEach((item) => {
    put(
      sheet,
      INV_PRODUCTS.total,
      item.index,
      `=SUM(${rangeOf(item.column, INV_PRODUCTS)})`,
      item.style
    );
  });


  sheet.conditionalRules = [
    ...inventoryStatusRules(
      rangeOf("Q", INV_PRODUCTS),
      "inv-products",
      INV_PRODUCT_STATUS.ok
    ),
    {
      id: "inv-products-negative-stock",
      range: rangeOf("L", INV_PRODUCTS),
      condition: "less",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "inv-products-reorder-needed",
      range: rangeOf("P", INV_PRODUCTS),
      condition: "greater",
      value: "0",
      bg: THEME.warningBackground,
      color: THEME.warningText,
    },
  ];
};


// ------------------------------------------------------------
// Inventory Management — Movements sheet
// ------------------------------------------------------------


const populateInventoryMovements = (
  sheet: WorkbookSheet,
  styles: InventoryStyles,
  includeSample: boolean
): void => {
  sheet.colWidths = {
    0: 190, 1: 190, 2: 130, 3: 170, 4: 200, 5: 230, 6: 300, 7: 230,
    8: 150, 9: 150, 10: 220, 11: 200, 12: 220, 13: 230, 14: 290, 15: 130,
  };


  const productSku = invProductRange("A");
  const productOpening = invProductRange("H");
  const productCost = invProductRange("F");
  const last = INV_MOVEMENTS.last;


  for (let row = INV_MOVEMENTS.first; row <= last; row++) {
    const sample = includeSample
      ? INV_SAMPLE_MOVEMENTS[row - INV_MOVEMENTS.first]
      : undefined;


    put(sheet, row, 0, sample?.date ?? "", styles.date);
    put(sheet, row, 1, sample?.sku ?? "", styles.code);
    put(sheet, row, 2, sample?.type ?? "", styles.code);
    put(sheet, row, 3, String(sample?.qty ?? 0), styles.qtyInput);
    put(sheet, row, 4, String(sample?.rate ?? 0), styles.priceInput);
    put(sheet, row, 5, sample?.ref ?? "", INPUT_STYLE);
    put(sheet, row, 6, sample?.note ?? "", INPUT_STYLE);


    put(sheet, row, 7, `=D${row}*E${row}`, styles.amountResult);
    put(sheet, row, 8, `=IF(C${row}="IN",D${row},0)`, styles.qtyResult);
    put(sheet, row, 9, `=IF(C${row}="OUT",D${row},0)`, styles.qtyResult);


    // Balance after this row: product opening stock plus all IN and minus
    // all OUT from the first data row down to this row (row order = time).
    put(
      sheet,
      row,
      10,
      `=IF(B${row}="",0,SUMIF(${productSku},B${row},${productOpening})+SUMIF(B${INV_MOVEMENTS.first}:B${row},B${row},I${INV_MOVEMENTS.first}:I${row})-SUMIF(B${INV_MOVEMENTS.first}:B${row},B${row},J${INV_MOVEMENTS.first}:J${row}))`,
      styles.qtyResult
    );


    put(
      sheet,
      row,
      11,
      `=IF(B${row}="",0,SUMIF(${productSku},B${row},${productCost}))`,
      styles.amountResult
    );


    put(sheet, row, 12, `=J${row}*L${row}`, styles.amountResult);
    put(sheet, row, 13, `=IF(C${row}="OUT",H${row}-M${row},0)`, styles.amountResult);
    put(sheet, row, 14, inventoryMovementStatusFormula(row), RESULT_STYLE);
    put(sheet, row, 15, `=IF(O${row}="",0,1)`, styles.qtyResult);
    setRowHeight(sheet, row, 36);
  }


  put(sheet, INV_MOVEMENTS.total, 0, "TOTAL / মোট", HEADER_STYLE);


  [
    { column: "I", index: 8, style: styles.qtyTotal },
    { column: "J", index: 9, style: styles.qtyTotal },
    { column: "M", index: 12, style: styles.amountTotal },
    { column: "N", index: 13, style: styles.amountTotal },
    { column: "P", index: 15, style: styles.qtyTotal },
  ].forEach((item) => {
    put(
      sheet,
      INV_MOVEMENTS.total,
      item.index,
      `=SUM(${rangeOf(item.column, INV_MOVEMENTS)})`,
      item.style
    );
  });


  sheet.conditionalRules = [
    ...inventoryStatusRules(
      rangeOf("O", INV_MOVEMENTS),
      "inv-movements",
      INV_MOVEMENT_STATUS.ok
    ),
    {
      id: "inv-movements-negative-balance",
      range: rangeOf("K", INV_MOVEMENTS),
      condition: "less",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
    {
      id: "inv-movements-loss",
      range: rangeOf("N", INV_MOVEMENTS),
      condition: "less",
      value: "0",
      bg: THEME.dangerBackground,
      color: THEME.dangerText,
    },
  ];
};


// ------------------------------------------------------------
// Inventory Management — Dashboard sheet
// ------------------------------------------------------------


const populateInventoryDashboard = (
  sheet: WorkbookSheet,
  styles: InventoryStyles,
  includeSample: boolean
): void => {
  sheet.colWidths = { 0: 360, 1: 280, 2: 340, 3: 260, 4: 260, 5: 200 };


  const D = INV_DASH;
  const PS = INV_PRODUCT_STATUS;
  const MS = INV_MOVEMENT_STATUS;
  const SS = INV_SUPPLIER_STATUS;


  const statusRange = invProductRange("Q");
  const movementStatusRange = invMovementRange("O");


  const writeRow = (
    row: number,
    label: string,
    formula: string,
    style: CellStyle,
    note: string
  ): void => {
    put(sheet, row, 0, label, HEADER_STYLE);
    put(sheet, row, 1, formula, style);
    put(sheet, row, 2, note, RESULT_STYLE);
    setRowHeight(sheet, row, 46);
  };


  const writeSection = (row: number, title: string): void => {
    put(sheet, row, 0, title, HEADER_STYLE);
    put(sheet, row, 1, "Value / মান", HEADER_STYLE);
    put(sheet, row, 2, "Note / মন্তব্য", HEADER_STYLE);
    setRowHeight(sheet, row, 48);
  };


  // ----- Stock position -------------------------------------------


  writeRow(D.products, "Products / পণ্যসংখ্যা", `=SUM(${invProductRange("R")})`, styles.qtyResult, "SKU বা নাম আছে এমন সারির সংখ্যা।");
  writeRow(D.units, "Units in stock / মোট স্টক", `=SUM(${invProductRange("L")})`, styles.qtyResult, "সব পণ্যের Current stock-এর যোগফল।");
  writeRow(D.value, "Stock value at cost / ক্রয়মূল্যে স্টক মূল্য", `=SUM(${invProductRange("M")})`, styles.amountTotal, "Current stock × Purchase price।");
  writeRow(D.salesValue, "Potential sales value / সম্ভাব্য বিক্রয় মূল্য", `=SUM(${invProductRange("N")})`, styles.amountResult, "Current stock × Selling price।");
  writeRow(D.margin, "Potential gross margin / সম্ভাব্য মোট মুনাফা", `=B${D.salesValue}-B${D.value}`, styles.amountResult, "Potential sales − Stock value।");


  writeRow(
    D.low,
    "Low stock items / কম স্টকের পণ্য",
    `=COUNTIF(${statusRange},"${PS.low}")+COUNTIF(${statusRange},"${PS.out}")`,
    styles.qtyResult,
    "Reorder level-এর সমান বা কম (শূন্য স্টকসহ)।"
  );


  writeRow(
    D.out,
    "Out of stock / স্টক শেষ",
    `=COUNTIF(${statusRange},"${PS.out}")`,
    styles.qtyResult,
    "Current stock ঠিক 0।"
  );


  writeRow(
    D.negative,
    "Negative stock / ঋণাত্মক স্টক",
    `=COUNTIF(${statusRange},"${PS.negative}")`,
    styles.qtyResult,
    "0 হওয়া উচিত; Movements শিটে INSUFFICIENT STOCK দেখুন।"
  );


  // ----- Movements ------------------------------------------------


  writeSection(D.movHeader, "Stock movements / স্টক চলাচল");


  writeRow(D.inQty, "Total stock in / মোট স্টক ইন", `=SUM(${invMovementRange("I")})`, styles.qtyResult, "সব IN সারির পরিমাণ।");
  writeRow(D.outQty, "Total stock out / মোট স্টক আউট", `=SUM(${invMovementRange("J")})`, styles.qtyResult, "সব OUT সারির পরিমাণ।");
  writeRow(D.purchases, "Purchases value / ক্রয়ের মূল্য", `=SUMIF(${invMovementRange("C")},"IN",${invMovementRange("H")})`, styles.amountResult, "IN সারির Quantity × Rate।");
  writeRow(D.salesOut, "Sales value / বিক্রয় মূল্য", `=SUMIF(${invMovementRange("C")},"OUT",${invMovementRange("H")})`, styles.amountResult, "OUT সারির Quantity × Rate।");
  writeRow(D.cogs, "Cost of goods out / বিক্রিত পণ্যের ক্রয়মূল্য", `=SUM(${invMovementRange("M")})`, styles.amountResult, "OUT পরিমাণ × পণ্যের বর্তমান Purchase price।");
  writeRow(D.profit, "Gross profit / মোট মুনাফা", `=B${D.salesOut}-B${D.cogs}`, styles.amountTotal, "Sales value − Cost of goods out।");
  writeRow(D.profitPct, "Gross margin % / মুনাফার হার", `=IF(B${D.salesOut}=0,0,B${D.profit}/B${D.salesOut})`, PERCENTAGE_STYLE, "Gross profit ÷ Sales value।");


  // ----- Budget threshold -----------------------------------------


  writeSection(D.budgetHeader, "Budget threshold / বাজেট সীমা");


  writeRow(D.budget, "Inventory budget threshold / বাজেট সীমা", `=${INV_SETUP_NAME}!B${INV_SETUP.budget}`, styles.amountResult, "InventorySetup থেকে; পরিকল্পনার সীমা, নগদ নয়।");
  writeRow(D.utilization, "Budget utilization / সীমা ব্যবহার", `=IF(B${D.budget}=0,0,B${D.value}/B${D.budget})`, PERCENTAGE_STYLE, "Stock value ÷ Budget threshold।");
  writeRow(D.headroom, "Headroom / অবশিষ্ট সীমা", `=B${D.budget}-B${D.value}`, styles.amountResult, "Budget threshold − Stock value।");


  writeRow(
    D.budgetStatus,
    "Budget status / সীমার অবস্থা",
    `=IF(B${D.budget}<${INV_SETUP_NAME}!B${INV_SETUP.minimum},"${INV_BUDGET_STATUS.below}",IF(B${D.value}>B${D.budget},"${INV_BUDGET_STATUS.over}","${INV_BUDGET_STATUS.within}"))`,
    RESULT_STYLE,
    "Stock value বাজেট সীমা ছাড়ালে সতর্কতা।"
  );


  // ----- Integrity checks -----------------------------------------


  writeSection(D.checksHeader, "Integrity checks / নির্ভুলতা পরীক্ষা");


  writeRow(
    D.expected,
    "Expected stock / প্রত্যাশিত স্টক",
    `=SUM(${invProductRange("H")})+SUM(${invMovementRange("I")})-SUM(${invMovementRange("J")})`,
    styles.qtyResult,
    "Opening stock + সব IN − সব OUT (SUMIF ছাড়া স্বাধীন হিসাব)।"
  );


  writeRow(
    D.actual,
    "Actual stock / বাস্তব স্টক",
    `=SUM(${invProductRange("L")})`,
    styles.qtyResult,
    "Products শিটের Current stock-এর যোগফল।"
  );


  writeRow(D.difference, "Difference / পার্থক্য", `=B${D.actual}-B${D.expected}`, styles.qtyResult, "0 হওয়া উচিত।");


  writeRow(
    D.reconStatus,
    "Reconciliation / মিল",
    `=IF(B${D.difference}>0.000001,"${INV_RECON_STATUS.mismatch}",IF(B${D.difference}<-0.000001,"${INV_RECON_STATUS.mismatch}","${INV_RECON_STATUS.matched}"))`,
    RESULT_STYLE,
    "অমিল মানে অজানা SKU, পুনরাবৃত্ত SKU বা ভুল সারি আছে।"
  );


  writeRow(
    D.productProblems,
    "Product rows needing correction / পণ্যের ভুল সারি",
    `=SUM(${invProductRange("R")})-COUNTIF(${statusRange},"${PS.ok}")-COUNTIF(${statusRange},"${PS.low}")-COUNTIF(${statusRange},"${PS.out}")`,
    styles.qtyResult,
    "0 হওয়া উচিত (ঋণাত্মক স্টকসহ)।"
  );


  writeRow(
    D.movementProblems,
    "Movement rows needing correction / চলাচলের ভুল সারি",
    `=SUM(${invMovementRange("P")})-COUNTIF(${movementStatusRange},"${MS.ok}")`,
    styles.qtyResult,
    "0 হওয়া উচিত।"
  );


  writeRow(
    D.insufficient,
    "Insufficient-stock movements / অপর্যাপ্ত স্টকে আউট",
    `=COUNTIF(${movementStatusRange},"${MS.insufficient}")`,
    styles.qtyResult,
    "OUT-এর সময় স্টক ঋণাত্মক হয়ে যাওয়া সারি।"
  );


  writeRow(
    D.orphan,
    "Unknown-SKU movements / অজানা SKU-এর চলাচল",
    `=COUNTIF(${movementStatusRange},"${MS.notFound}")`,
    styles.qtyResult,
    "Products শিটে নেই এমন SKU।"
  );


  writeRow(
    D.supplierProblems,
    "Supplier rows needing correction / সরবরাহকারীর ভুল সারি",
    `=COUNTIF(${invSupplierRange("I")},"${SS.idRequired}")+COUNTIF(${invSupplierRange("I")},"${SS.duplicate}")+COUNTIF(${invSupplierRange("I")},"${SS.nameRequired}")`,
    styles.qtyResult,
    "0 হওয়া উচিত।"
  );


  writeRow(
    D.unlinkedValue,
    "Stock value without a supplier / সরবরাহকারী ছাড়া স্টক মূল্য",
    `=B${D.value}-SUM(${invSupplierRange("H")})`,
    styles.amountResult,
    "0 হলে সব পণ্য একটি বৈধ সরবরাহকারীর সঙ্গে যুক্ত।"
  );


  writeRow(
    D.uncategorizedValue,
    "Stock value outside listed categories / তালিকার বাইরের স্টক মূল্য",
    `=B${D.value}-D${D.categoryTotal}`,
    styles.amountResult,
    "0 হলে সব পণ্য InventorySetup-এর ক্যাটাগরি তালিকায় আছে।"
  );


  // ----- Information ----------------------------------------------


  writeSection(D.infoHeader, "Information / তথ্য");


  writeRow(D.organization, "Organization / প্রতিষ্ঠান", `=${INV_SETUP_NAME}!B${INV_SETUP.organization}`, RESULT_STYLE, "");
  writeRow(D.period, "Period / হিসাবের সময়", `=${INV_SETUP_NAME}!B${INV_SETUP.period}`, RESULT_STYLE, "");
  writeRow(D.currency, "Currency / মুদ্রা", `=${INV_SETUP_NAME}!B${INV_SETUP.currency}`, RESULT_STYLE, "");


  writeRow(
    D.dataNotice,
    "Data notice / তথ্যের ধরন",
    includeSample
      ? "DEMO / সব পণ্য, সরবরাহকারী ও চলাচল নমুনা — নিজের তথ্য দিয়ে বদলান"
      : "খালি টেমপ্লেট — Suppliers, Products ও Movements-এ নিজের তথ্য লিখুন",
    WARNING_STYLE,
    ""
  );


  writeRow(D.numberNotice, "Number format / সংখ্যা প্রদর্শন", NUMBER_DISPLAY_NOTICE, WARNING_STYLE, "");


  writeRow(
    D.capacity,
    "Capacity / ধারণক্ষমতা",
    `${INV_PRODUCTS.count} পণ্য; ${INV_MOVEMENTS.count} চলাচল; ${INV_SUPPLIERS.count} সরবরাহকারী`,
    RESULT_STYLE,
    ""
  );


  setRowHeight(sheet, D.numberNotice, 84);
  setRowHeight(sheet, D.dataNotice, 60);


  // ----- Category summary -----------------------------------------


  [
    "Category / ক্যাটাগরি",
    "Products / পণ্যসংখ্যা",
    "Units / স্টক",
    "Stock value at cost / স্টক মূল্য",
    "Potential sales / সম্ভাব্য বিক্রয়",
    "Share / অংশ",
  ].forEach((value, col) => {
    put(sheet, D.categoryHeader, col, value, HEADER_STYLE);
  });


  setRowHeight(sheet, D.categoryHeader, 54);


  const productCategory = invProductRange("C");


  for (let index = 0; index < INV_CATEGORY_COUNT; index++) {
    const row = D.categoryFirst + index;
    const setupRow = INV_SETUP.categoryFirst + index;


    put(
      sheet,
      row,
      0,
      `=IF(${INV_SETUP_NAME}!A${setupRow}="","",${INV_SETUP_NAME}!A${setupRow})`,
      RESULT_STYLE
    );


    put(sheet, row, 1, `=IF(A${row}="",0,COUNTIF(${productCategory},A${row}))`, styles.qtyResult);
    put(sheet, row, 2, `=IF(A${row}="",0,SUMIF(${productCategory},A${row},${invProductRange("L")}))`, styles.qtyResult);
    put(sheet, row, 3, `=IF(A${row}="",0,SUMIF(${productCategory},A${row},${invProductRange("M")}))`, styles.amountResult);
    put(sheet, row, 4, `=IF(A${row}="",0,SUMIF(${productCategory},A${row},${invProductRange("N")}))`, styles.amountResult);
    put(sheet, row, 5, `=IF(B${D.value}=0,0,D${row}/B${D.value})`, PERCENTAGE_STYLE);
    setRowHeight(sheet, row, 36);
  }


  put(sheet, D.categoryTotal, 0, "TOTAL / মোট", HEADER_STYLE);


  [
    { column: "B", style: styles.qtyTotal },
    { column: "C", style: styles.qtyTotal },
    { column: "D", style: styles.amountTotal },
    { column: "E", style: styles.amountTotal },
  ].forEach((item, offset) => {
    put(
      sheet,
      D.categoryTotal,
      offset + 1,
      `=SUM(${item.column}${D.categoryFirst}:${item.column}${D.categoryLast})`,
      item.style
    );
  });


  put(
    sheet,
    D.categoryTotal,
    5,
    `=SUM(F${D.categoryFirst}:F${D.categoryLast})`,
    { ...PERCENTAGE_STYLE, bold: true, bg: THEME.green, color: THEME.gold }
  );


  // ----- Conditional formatting -----------------------------------


  const rule = (
    id: string,
    range: string,
    condition: ConditionalRule["condition"],
    value: string,
    danger: boolean
  ): ConditionalRule => ({
    id: `inv-dashboard-${id}`,
    range,
    condition,
    value,
    bg: danger ? THEME.dangerBackground : THEME.warningBackground,
    color: danger ? THEME.dangerText : THEME.warningText,
  });


  sheet.conditionalRules = [
    rule("margin-negative", `B${D.margin}:B${D.margin}`, "less", "0", true),
    rule("profit-negative", `B${D.profit}:B${D.profit}`, "less", "0", true),
    rule("low-stock", `B${D.low}:B${D.low}`, "greater", "0", false),
    rule("out-of-stock", `B${D.out}:B${D.out}`, "greater", "0", false),
    rule("negative-stock", `B${D.negative}:B${D.negative}`, "greater", "0", true),
    rule("over-budget", `B${D.utilization}:B${D.utilization}`, "greater", "1", true),
    rule("headroom-negative", `B${D.headroom}:B${D.headroom}`, "less", "0", true),
    rule("budget-below", `B${D.budgetStatus}:B${D.budgetStatus}`, "textContains", "BELOW", true),
    rule("budget-over", `B${D.budgetStatus}:B${D.budgetStatus}`, "textContains", "OVER", true),
    rule("mismatch", `B${D.reconStatus}:B${D.reconStatus}`, "textContains", "MISMATCH", true),
    rule("product-problems", `B${D.productProblems}:B${D.orphan}`, "greater", "0", true),
    rule("supplier-problems", `B${D.supplierProblems}:B${D.supplierProblems}`, "greater", "0", true),
    rule("unlinked-supplier", `B${D.unlinkedValue}:B${D.unlinkedValue}`, "greater", "0.000001", false),
    rule("uncategorized", `B${D.uncategorizedValue}:B${D.uncategorizedValue}`, "greater", "0.000001", false),
    {
      id: "inv-dashboard-matched",
      range: `B${D.reconStatus}:B${D.reconStatus}`,
      condition: "equal",
      value: INV_RECON_STATUS.matched,
      bg: THEME.successBackground,
      color: THEME.successText,
    },
    {
      id: "inv-dashboard-within",
      range: `B${D.budgetStatus}:B${D.budgetStatus}`,
      condition: "equal",
      value: INV_BUDGET_STATUS.within,
      bg: THEME.successBackground,
      color: THEME.successText,
    },
  ];
};


// ------------------------------------------------------------
// Inventory Management — builder
// ------------------------------------------------------------


export const createInventoryManagementSnapshot = (
  requestedCurrency: CurrencyCode = DEFAULT_CURRENCY,
  options: InventoryOptions = {}
): WorkbookSnapshot => {
  const currencyCode = parseCurrencyCode(requestedCurrency);


  if (!currencyCode) {
    throw new RangeError("Unsupported template currency.");
  }


  const includeSample = options.includeSampleData ?? true;


  const budgetThreshold = requireNonnegativeNumber(
    options.budgetThreshold ?? INV_MIN_BUDGET,
    "Inventory budget threshold"
  );


  const styles = createInventoryStyles();
  const stats = computeInventorySampleStats();


  const dashboard = createSheet(
    INV_DASHBOARD_NAME,
    INV_DASH.categoryTotal + 8,
    6
  );


  const products = createSheet(
    INV_PRODUCTS_NAME,
    INV_PRODUCTS.total + 10,
    18
  );


  const movements = createSheet(
    INV_MOVEMENTS_NAME,
    INV_MOVEMENTS.total + 10,
    16
  );


  const suppliers = createSheet(
    INV_SUPPLIERS_NAME,
    INV_SUPPLIERS.total + 10,
    9
  );


  const setup = createSheet(
    INV_SETUP_NAME,
    INV_SETUP.categoryLast + 10,
    4
  );


  // ----- Dashboard ------------------------------------------------


  prepareSheet(dashboard, currencyCode, [
    "Metric / বিষয়",
    "Value / মান",
    "Note / মন্তব্য",
  ]);


  populateInventoryDashboard(dashboard, styles, includeSample);


  // ----- Products -------------------------------------------------


  prepareSheet(products, currencyCode, [
    "SKU / পণ্য কোড",
    "Product name / পণ্যের নাম",
    "Category / ক্যাটাগরি",
    "Unit / একক",
    "Supplier ID / সরবরাহকারী",
    "Purchase price / ক্রয়মূল্য",
    "Selling price / বিক্রয়মূল্য",
    "Opening stock / শুরুর স্টক",
    "Reorder level / রিঅর্ডার স্তর",
    "Stock in / স্টক ইন",
    "Stock out / স্টক আউট",
    "Current stock / বর্তমান স্টক",
    "Stock value / স্টক মূল্য",
    "Potential sales / সম্ভাব্য বিক্রয়",
    "Margin % / মুনাফার হার",
    "Qty to reorder level / রিঅর্ডারে প্রয়োজন",
    "Status / অবস্থা",
    "Counted / গণনা",
  ]);


  populateInventoryProducts(products, styles, includeSample);


  // ----- Movements ------------------------------------------------


  prepareSheet(movements, currencyCode, [
    "Date / তারিখ",
    "SKU / পণ্য কোড",
    "Type / ধরন (IN/OUT)",
    "Quantity / পরিমাণ",
    "Rate / একক দর",
    "Reference / রেফারেন্স",
    "Note / নোট",
    "Amount / মোট মূল্য",
    "In qty / ইন",
    "Out qty / আউট",
    "Balance after / পরের স্টক",
    "Unit cost / একক ক্রয়মূল্য",
    "Cost of goods out / ক্রয়মূল্য",
    "Gross profit / মুনাফা",
    "Status / অবস্থা",
    "Counted / গণনা",
  ]);


  populateInventoryMovements(movements, styles, includeSample);


  // ----- Suppliers ------------------------------------------------


  prepareSheet(suppliers, currencyCode, [
    "Supplier ID / আইডি",
    "Supplier name / সরবরাহকারীর নাম",
    "Contact person / যোগাযোগকারী",
    "Phone / ফোন",
    "Email / ইমেইল",
    "Address / ঠিকানা",
    "Products / পণ্যসংখ্যা",
    "Stock value / স্টক মূল্য",
    "Status / অবস্থা",
  ]);


  populateInventorySuppliers(suppliers, styles, includeSample);


  // ----- Setup ----------------------------------------------------


  prepareSheet(setup, currencyCode, [
    "Setting / বিষয়",
    "Value / তথ্য",
    "Instructions / নির্দেশনা",
  ]);


  populateInventorySetup(setup, currencyCode, styles, budgetThreshold);


  // ----- Guide ----------------------------------------------------


  const verification = includeSample
    ? `নমুনা তথ্য অক্ষত থাকলে: ${INV_DASHBOARD_NAME} B${INV_DASH.products}=${stats.products}; B${INV_DASH.units}=${formatGuideNumber(stats.units, 0)}; B${INV_DASH.value}=${formatGuideNumber(stats.value)}; B${INV_DASH.salesValue}=${formatGuideNumber(stats.salesValue)}; B${INV_DASH.low}=${stats.low + stats.out}; B${INV_DASH.out}=${stats.out}; B${INV_DASH.inQty}=${formatGuideNumber(stats.inQty, 0)}; B${INV_DASH.outQty}=${formatGuideNumber(stats.outQty, 0)}; B${INV_DASH.purchases}=${formatGuideNumber(stats.purchases)}; B${INV_DASH.salesOut}=${formatGuideNumber(stats.salesOut)}; B${INV_DASH.cogs}=${formatGuideNumber(stats.cogs)}; B${INV_DASH.profit}=${formatGuideNumber(stats.salesOut - stats.cogs)}; B${INV_DASH.difference}=0; B${INV_DASH.reconStatus}=MATCHED।`
    : "খালি টেমপ্লেটে সব মান 0 এবং Reconciliation = MATCHED হওয়া উচিত।";


  const guideRows: string[][] = [
    [
      "1. শুরু",
      `${INV_SETUP_NAME}-এ প্রতিষ্ঠান, সময়, বাজেট সীমা ও ক্যাটাগরি লিখুন। এরপর ${INV_SUPPLIERS_NAME}, ${INV_PRODUCTS_NAME} ও ${INV_MOVEMENTS_NAME} শিটে তথ্য দিন।`,
    ],
    [
      "2. হলুদ ও সবুজ ঘর",
      "হলুদ ঘর = আপনার ইনপুট। হালকা সবুজ ঘর = স্বয়ংক্রিয় হিসাব; এগুলো overwrite করবেন না।",
    ],
    [
      "3. নমুনা তথ্য",
      includeSample
        ? `${INV_SAMPLE_SUPPLIERS.length}টি সরবরাহকারী, ${INV_SAMPLE_PRODUCTS.length}টি পণ্য ও ${INV_SAMPLE_MOVEMENTS.length}টি চলাচল নমুনা (DEMO)। বাস্তব ব্যবহারের আগে মুছে নিজের তথ্য দিন।`
        : "এই কপিতে নমুনা তথ্য নেই; সব ইনপুট ঘর খালি।",
    ],
    [
      "4. কাজের ক্রম",
      "প্রথমে Suppliers, তারপর Products (Opening stock-সহ), তারপর Movements-এ প্রতিটি Stock In/Out তারিখ অনুযায়ী ওপর থেকে নিচে লিখুন।",
    ],
    [
      "5. SKU নিয়ম",
      "প্রতিটি পণ্যের SKU অনন্য হতে হবে (বড়/ছোট হাতের অক্ষর একই ধরা হয়)। SKU-তে * ? ~ চিহ্ন বা শুরুতে = < > ব্যবহার করবেন না; এগুলো COUNTIF/SUMIF-এ বিশেষ অর্থ বহন করে।",
    ],
    [
      "6. Product ইনপুট",
      "Products শিটের A–I কলাম ইনপুট: SKU, নাম, ক্যাটাগরি, একক, Supplier ID, Purchase price, Selling price, Opening stock, Reorder level।",
    ],
    [
      "7. একক",
      "একক হিসেবে pcs, kg, g, liter, box, pack, meter ব্যবহার করুন। একক শুধু লেবেল; কোনো রূপান্তর হয় না।",
    ],
    [
      "8. Opening stock",
      "Opening stock হলো Movements শুরুর আগের স্টক। পরে বদলালে সব পরের স্টক ও Balance after বদলে যাবে।",
    ],
    [
      "9. Stock In/Out",
      "Movements শিটে তারিখ, SKU, Type (শুধু IN বা OUT, ইংরেজি বড় হাতের), Quantity ও Rate লিখুন।",
    ],
    [
      "10. Rate-এর অর্থ",
      "IN সারিতে Rate = একক ক্রয়মূল্য; OUT সারিতে Rate = একক বিক্রয়মূল্য। Amount = Quantity × Rate।",
    ],
    [
      "11. Current stock",
      "Current stock = Opening stock + Stock in − Stock out। Stock in/out সংশ্লিষ্ট SKU-এর সব Movement সারি থেকে SUMIF দিয়ে আসে।",
    ],
    [
      "12. Stock value",
      "Stock value = Current stock × Purchase price (Products শিটের F কলাম)। এটি ক্রয়মূল্যে মূল্যায়ন।",
    ],
    [
      "13. Potential sales",
      "Potential sales = Current stock × Selling price। Margin % = (Selling − Purchase) ÷ Selling।",
    ],
    [
      "14. স্টকের অবস্থা",
      "স্টক < 0 = NEGATIVE STOCK; স্টক = 0 = OUT OF STOCK; 0 < স্টক ≤ Reorder level = LOW STOCK; অন্যথায় IN STOCK।",
    ],
    [
      "15. রিঅর্ডার পরিমাণ",
      "Qty to reorder level = Reorder level − Current stock (স্টক Reorder level-এর সমান বা কম হলে), নতুবা 0। এটি প্রস্তাবিত অর্ডার নয়, শুধু স্তরে ফেরার পরিমাণ।",
    ],
    [
      "16. ঋণাত্মক স্টক পরীক্ষা",
      "প্রতিটি সারিতে Balance after (K) দেখায় সেই সারি পর্যন্ত স্টক। OUT সারিতে এটি 0-এর কম হলে INSUFFICIENT STOCK দেখায়।",
    ],
    [
      "17. প্রতিরোধ নয়, শনাক্তকরণ",
      "স্প্রেডশিট ইনপুট আটকাতে পারে না। ঋণাত্মক স্টক লাল সতর্কতায় ও Dashboard-এ গণনায় ধরা পড়ে; আপনাকে সারি সংশোধন করতে হবে।",
    ],
    [
      "18. সারির ক্রম",
      "Movements তারিখের ক্রমে ওপর থেকে নিচে লিখুন। Balance after সারির অবস্থানের ওপর নির্ভর করে, তাই sort, row insert বা delete করবেন না।",
    ],
    [
      "19. বিক্রিত পণ্যের ক্রয়মূল্য",
      "Cost of goods out = OUT পরিমাণ × পণ্যের বর্তমান Purchase price। FIFO বা weighted-average costing নেই; Purchase price বদলালে আগের সারির হিসাবও বদলায়।",
    ],
    [
      "20. মোট মুনাফা",
      "Gross profit = OUT সারির Amount − Cost of goods out। এটি অন্যান্য খরচ, কর বা ছাড় বিবেচনা করে না।",
    ],
    [
      "21. ক্যাটাগরি",
      `InventorySetup A${INV_SETUP.categoryFirst}:A${INV_SETUP.categoryLast}-এ ক্যাটাগরি তালিকা লিখুন (${INV_CATEGORY_COUNT}টি)। Products শিটে নামটি হুবহু একই লিখুন। Dashboard ক্যাটাগরি-ভিত্তিক সারসংক্ষেপ দেখায়।`,
    ],
    [
      "22. তালিকার বাইরের ক্যাটাগরি",
      `Dashboard B${INV_DASH.uncategorizedValue} 0-এর বেশি হলে কিছু পণ্যের ক্যাটাগরি তালিকায় নেই (বানান বা ফাঁকা স্থান পরীক্ষা করুন)।`,
    ],
    [
      "23. সরবরাহকারী",
      "Products শিটের Supplier ID অবশ্যই Suppliers শিটের Supplier ID-র সঙ্গে মিলতে হবে; না মিললে SUPPLIER NOT FOUND দেখায়। ফাঁকা Supplier ID গ্রহণযোগ্য।",
    ],
    [
      "24. সরবরাহকারী সারসংক্ষেপ",
      "Suppliers শিটের G কলামে ওই সরবরাহকারীর পণ্যসংখ্যা এবং H কলামে স্টক মূল্য স্বয়ংক্রিয়ভাবে আসে।",
    ],
    [
      "25. বাজেট সীমা",
      `Setup-এর বাজেট সীমা ন্যূনতম ${formatGuideNumber(INV_MIN_BUDGET, 0)}। এটি পরিকল্পনার সীমা; জমা নগদ বা ঋণ সুবিধা নয়। Dashboard-এ Stock value-এর সঙ্গে তুলনা হয়।`,
    ],
    [
      "26. বাজেট সীমার সতর্কতা",
      "সীমা ন্যূনতমের নিচে হলে BELOW MINIMUM; Stock value সীমা ছাড়ালে OVER THRESHOLD দেখায়।",
    ],
    [
      "27. মিল পরীক্ষা",
      `Dashboard B${INV_DASH.expected} স্বাধীনভাবে (Opening + IN − OUT) হিসাব করে এবং B${INV_DASH.actual}-এর সঙ্গে মেলায়। অমিল হলে অজানা SKU, পুনরাবৃত্ত SKU বা ভুল সারি আছে।`,
    ],
    [
      "28. অজানা SKU",
      "Movements-এর SKU Products-এ না থাকলে SKU NOT FOUND দেখায়। ওই সারি কোনো পণ্যের স্টকে যোগ হয় না কিন্তু Movements-এর মোটে ধরা পড়ে; তাই Reconciliation-এ অমিল আসে।",
    ],
    [
      "29. ভুল সারির গণনা",
      "Dashboard-এর 'needing correction' ঘরগুলো 0 হওয়া উচিত। 0-এর বেশি হলে সংশ্লিষ্ট শিটের Status কলামে লাল বা হলুদ সারি খুঁজুন। ভুল-চিহ্নিত সারি স্বয়ংক্রিয়ভাবে বাদ যায় না: বৈধ SKU ও Type (IN/OUT) থাকলে পরিমাণ স্টকে ধরা হয়; তাই দ্রুত সংশোধন করুন।",
    ],
    [
      "30. Dashboard",
      "স্টক অবস্থান, চলাচল, মুনাফা, বাজেট সীমা, নির্ভুলতা পরীক্ষা ও ক্যাটাগরি সারসংক্ষেপ একসঙ্গে দেখায়।",
    ],
    [
      "31. রিপোর্ট",
      "Products শিটের Stock in, Stock out, Current stock, Stock value ও Potential sales কলামই ইনভেন্টরি রিপোর্ট। আলাদা রিপোর্ট শিট নেই।",
    ],
    [
      "32. সংখ্যার নিয়ম",
      NUMBER_DISPLAY_NOTICE,
    ],
    [
      "33. দশমিক",
      `পরিমাণ 0 দশমিকে (পূর্ণ সংখ্যা) এবং দর ও মূল্য ${INVENTORY_DECIMALS} দশমিকে দেখানো হয়। মূল মান ও formula অপরিবর্তিত। ভগ্নাংশ পরিমাণ লিখলে হিসাব ঠিক থাকে, কিন্তু প্রদর্শন গোল হয়ে দেখায়; তাই পূর্ণ সংখ্যা ব্যবহার করুন।`,
    ],
    [
      "34. মুদ্রা",
      "মুদ্রার কোড শুধু তথ্য হিসেবে থাকে; কোনো রূপান্তর হয় না। এক workbook-এ একটি মুদ্রা ধরে হিসাব।",
    ],
    [
      "35. ধারণক্ষমতা",
      `${INV_PRODUCTS.count}টি পণ্য (rows ${INV_PRODUCTS.first}:${INV_PRODUCTS.last}); ${INV_MOVEMENTS.count}টি চলাচল (rows ${INV_MOVEMENTS.first}:${INV_MOVEMENTS.last}); ${INV_SUPPLIERS.count}টি সরবরাহকারী (rows ${INV_SUPPLIERS.first}:${INV_SUPPLIERS.last})। এর বাইরের তথ্য মোটে যোগ হবে না।`,
    ],
    [
      "36. নতুন সময়কাল",
      "Automatic date filtering বা month rollover নেই। নতুন সময়ের জন্য workbook অনুলিপি করুন এবং বর্তমান Current stock-কে নতুন Opening stock করে Movements পরিষ্কার করুন।",
    ],
    [
      "37. তারিখ",
      "তারিখ লেখা হিসেবে YYYY-MM-DD ফরম্যাটে লিখুন। তারিখ যাচাই বা তারিখ অনুযায়ী ফিল্টার করা হয় না; শুধু ফাঁকা থাকলে DATE REQUIRED দেখায়।",
    ],
    [
      "38. ইনপুট সীমাবদ্ধতা",
      "সংখ্যার ঘরে লেখা (text) দিলে সম্পূর্ণ যাচাই হয় না এবং formula ত্রুটি দেখাতে পারে। পরিমাণ ও দরে শুধু সংখ্যা লিখুন।",
    ],
    [
      "39. Formula protection",
      "Formula cells locked নয়। Stock, Status, Counted ও সব সবুজ কলাম overwrite করবেন না।",
    ],
    [
      "40. Formula support",
      "SUM, IF, COUNTIF, SUMIF, comparisons, arithmetic ও cross-sheet references editor-এ কাজ করতে হবে। SUMIF ব্যবহার হয় SKU অনুযায়ী Stock in/out, Balance after, Unit cost, ক্যাটাগরি ও সরবরাহকারী সারসংক্ষেপে।",
    ],
    [
      "41. স্থির দায়িত্ব",
      "Database, autosave, CSV export, backup/restore ও multi-user নিয়ন্ত্রণ বিদ্যমান application-এর দায়িত্ব। এই টেমপ্লেট audit log বা কর হিসাব দেয় না।",
    ],
    [
      "42. Search API",
      "searchWorkbookSnapshot-এ এই workbook-এর শিটও খোঁজা যায়; ফল kind = content হিসেবে আসে। Numeric literal খুঁজতে includeNumbers=true দিন।",
    ],
    [
      "43. Currency helper",
      "createBuiltInTemplateSnapshot বা createInventoryManagementSnapshot currency কোড গ্রহণ করে। applyTemplateCurrency শুধু লেবেল ও কোড বদলায়; পরিমাণ রূপান্তর করে না।",
    ],
    [
      "44. ফল যাচাই",
      verification,
    ],
  ];


  const guide = createSheet(
    INV_GUIDE_NAME,
    5 + guideRows.length + 10,
    4
  );


  prepareSheet(guide, currencyCode, [
    "Topic / বিষয়",
    "Instructions / নির্দেশনা",
  ]);


  guide.colWidths = {
    0: 310,
    1: 800,
    2: 160,
    3: 160,
  };


  guideRows.forEach((values, index) => {
    const row = 5 + index;


    put(guide, row, 0, values[0] ?? "", HEADER_STYLE);
    put(guide, row, 1, values[1] ?? "", RESULT_STYLE);
    setRowHeight(guide, row, 78);
  });


  return {
    name: "Inventory Management",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    currencyCode,
    sheets: [
      dashboard,
      products,
      movements,
      suppliers,
      setup,
      guide,
    ],
  };
};


// ------------------------------------------------------------
// Currency-aware template creation
// ------------------------------------------------------------


/**
  * A single entry point for future Home integration.
  *
  * Creates a fresh snapshot with fresh sheet IDs.
  * Caller still opens and persists the returned workbook.
  *
  * Supported template ids:
  * - "tpl-monthly-budget"          (accepts MonthlyBudgetOptions)
  * - "tpl-exchange-rate-converter" (options are ignored)
  * - "tpl-inventory-management"    (accepts InventoryOptions)
  */
export const createBuiltInTemplateSnapshot = (
  templateId: string,
  requestedCurrency: string = DEFAULT_CURRENCY,
  options: MonthlyBudgetOptions & InventoryOptions = {}
): WorkbookSnapshot => {
  const currencyCode = parseCurrencyCode(requestedCurrency);


  if (!currencyCode) {
    throw new RangeError(
      `Unsupported template currency: ${requestedCurrency}`
    );
  }


  let snapshot: WorkbookSnapshot;


  switch (templateId) {
    case MONTHLY_BUDGET_TEMPLATE_ID:
      snapshot = createMonthlyBudgetSnapshot(currencyCode, options);
      break;


    case EXCHANGE_RATE_TEMPLATE_ID:
      snapshot = createExchangeRateConverterSnapshot(currencyCode);
      break;


    case INVENTORY_TEMPLATE_ID:
      snapshot = createInventoryManagementSnapshot(currencyCode, options);
      break;


    default:
      throw new RangeError(
        `Unsupported built-in template: ${templateId}`
      );
  }


  return {
    ...snapshot,
    id: `workbook-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
};


// ------------------------------------------------------------
// Public registry — three templates
// ------------------------------------------------------------


export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: MONTHLY_BUDGET_TEMPLATE_ID,
    name: "Monthly Budget",
    category: "Finance",
    description:
      "Smart Family Point adjustable budget with 10 departments, 500 expense entries, weighted allocation, actuals, savings and plain number formatting.",
    createdAt: "2026-01-01T00:00:00.000Z",
    snapshot: createMonthlyBudgetSnapshot(),
  },
  {
    id: EXCHANGE_RATE_TEMPLATE_ID,
    name: "Exchange Rate Converter",
    category: "Finance",
    description:
      "Offline currency converter with a 200-row exchange-rate table, rate checks, quick converter, discount and tax business calculator, 40-line multi-currency table and CONVERT formula support.",
    createdAt: "2026-01-01T00:00:00.000Z",
    snapshot: createExchangeRateConverterSnapshot(),
  },
  {
    id: INVENTORY_TEMPLATE_ID,
    name: "Inventory Management",
    category: "Business",
    description:
      "Offline stock-control workbook with product master (300 SKUs), Stock In / Stock Out ledger (1,000 rows), suppliers, automatic stock balance, valuation at cost, potential sales, low-stock and negative-stock checks, gross profit, budget threshold, category summary and reconciliation.",
    createdAt: "2026-01-01T00:00:00.000Z",
    snapshot: createInventoryManagementSnapshot(),
  },
];


// ------------------------------------------------------------
// Built-in template metadata search
// Does not search a user's saved workbooks.
// ------------------------------------------------------------


export const searchBuiltInTemplates = (
  query: string
): BuiltInTemplateSummary[] => {
  const tokens = normalizeSearchText(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean);


  return BUILT_IN_TEMPLATES
    .filter((template) => {
      const text = normalizeSearchText(
        `${template.name} ${template.category} ${template.description}`
      );


      return tokens.every((token) => text.includes(token));
    })
    .map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description,
    }));
};