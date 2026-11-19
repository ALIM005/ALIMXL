"use client";

/* eslint-disable react-hooks/refs -- render helpers only read stable refs; event handlers perform all mutations. */
import {
  syncExchangeRates as libSyncExchangeRates,
  getExchangeRate as libGetExchangeRate,
  evalMoreFunction as libEvalMoreFunction,
  rewriteDynamicArgs as libRewriteDynamicArgs,
} from "../lib/formula-core.mjs";
import Image from "next/image";
import { createSignedScale, categoryCenter, barGeometry, collectChartRows, buildPieGroups, pieSlices } from "../lib/chart-geometry.mjs";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Icons from "lucide-react";
import { useLayoutEffect } from 'react';
import AlimxlHome from "../components/AlimxlHome";
import MyFiles from "../components/MyFiles";
import RecoveryDrafts from "../components/RecoveryDrafts";
import { saveDeviceFile } from "../lib/device-files";
import { BUILT_IN_TEMPLATES } from "../lib/built-in-templates";
import {
  saveLocalWorkbook,
  listLocalWorkbooks,
  getLocalWorkbook,
} from "../lib/local-workbooks";
/* ============================================================================
 * AWM Excel Studio — Enterprise Spreadsheet Module
 * Frontend-only page. All cloud/database operations are performed through
 * secure Next.js API routes. No database connection logic is used here.
 * ========================================================================== */

type Align = "left" | "center" | "right" | "justify";
type VerticalAlign = "top" | "middle" | "bottom";
type TextDirection = "ltr" | "rtl";

type ChartType =
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

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: "column", label: "Column" },
  { value: "bar", label: "Bar" },
  { value: "pie", label: "Pie" },
  { value: "ofpie", label: "Of-Pie" },
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "xyscatter", label: "XY (Scatter)" },
  { value: "bubble", label: "Bubble" },
  { value: "net", label: "Net" },
  { value: "stock", label: "Stock" },
  { value: "columnline", label: "Column and Line" },
];
type Aggregate = "SUM" | "COUNT" | "AVERAGE" | "MIN" | "MAX" | "COUNTA" | "PRODUCT" | "STDEV" | "STDEVP" | "VAR" | "VARP";
type NumberFormat = "general" | "currency" | "percentage" | "number" | "date" | "scientific" | "accounting" | "text" | "custom";

interface CellBorders {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
}

interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  bg?: string;
  align?: Align;
  verticalAlign?: VerticalAlign;
  textDirection?: TextDirection;

  fontFamily?: string;
  fontSize?: number;
  borders?: CellBorders;
  borderStyle?: "solid" | "dashed" | "dotted" | "double" | "ridge" | "groove" | "inset" | "outset";
  borderColor?: string;
  borderWidth?: number;
  wrap?: boolean;
  numberFormat?: NumberFormat;
  customFormat?: string;
  decimals?: number;
  indent?: number;
  currencyCode?: string;
}

interface CellData {
  value: string;
  style?: CellStyle;
  rowSpan?: number;
  colSpan?: number;
  mergedInto?: string;
  comment?: string;
  hyperlink?: string;
  image?: string;
  validation?: string[];
  sparkline?: string;
}

type CellMap = Record<string, CellData>;
interface WhatIfTableConfig {
  formulaCell: string;
  rowInputCell: string;
  rowValues: string;
  colInputCell: string;
  colValues: string;
  outputCell: string;
}
interface ScenarioChange {
  cell: string;
  value: string;
}

interface ScenarioItem {
  id: string;
  name: string;
  changes: ScenarioChange[];
  resultCells: string[];
}
interface SubtotalConfig {
  groupColumn: string;
  valueColumn: string;
  func: "SUM" | "COUNT" | "AVERAGE" | "MIN" | "MAX" | "PRODUCT";
  outputCell: string;
}
interface PivotChartConfig {
  sourceRange: string;
  rowField: string;
  valueField: string;
  aggregation: "SUM" | "COUNT" | "AVERAGE" | "MIN" | "MAX";
  chartType: ChartType;
  outputCell: string;
  title: string;
}
interface ForecastSheetConfig {
  timelineRange: string;
  valuesRange: string;
  periods: number;
  confidence: number;
  seasonalityPeriod: number;
  outputCell: string;
  chartType: ChartType;
  title: string;
}
interface AnalyzeChartRequest {
  range: string;
  chartType: ChartType;
  title: string;
}

interface GroupRange {
  id: string;
  start: number;
  end: number;
  collapsed: boolean;
}

interface ChartSeries {
  id: string;
  name: string;
  range: string;
}

interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  range: string;
  subtitle?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  showLegend?: boolean;
  legendPosition?: "right" | "top" | "bottom" | "left" | "none";
  is3D?: boolean;
  realistic?: boolean;
  shape?: "cylinder" | "cone" | "pyramid";
  series?: ChartSeries[];
}

interface ConditionalRule {
  id: string;
  range: string;
  condition: "greater" | "less" | "equal" | "between" | "textContains";
  value: string;
  value2?: string;
  bg: string;
  color?: string;
}

type DrawToolId = "select" | "rectangle" | "ellipse" | "line" | "arrow" | "freeform" | "connector";
type ConnectorSide = "top" | "right" | "bottom" | "left";
interface ConnectorAttach { id: string; side: ConnectorSide; }


interface DrawShape {
  id: string;
  type: DrawToolId;
  x: number; y: number; w: number; h: number;
  points?: { x: number; y: number }[];
  stroke: string;
  fill: string;
  strokeWidth: number;
  rotation?: number;
  connectorStyle?: "straight" | "elbow";
  startAttach?: ConnectorAttach;
  endAttach?: ConnectorAttach;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
}

interface WorkbookSheet {
  id: string;
  name: string;
  gridRows: number;
  gridCols: number;
  cells: CellMap;
  groups: GroupRange[];
  colGroups?: GroupRange[];
  hiddenRows: number[];
  hiddenCols: number[];
  filters: Record<number, string>;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  frozenRows: number;
  frozenCols: number;
  charts: ChartConfig[];
  conditionalRules: ConditionalRule[];
  namedRanges: Record<string, string>;
  drawings: DrawShape[];
}

interface WorkbookSnapshot {
  id?: string;
  name: string;
  pageSize: "A4" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  activeSheetIndex: number;
  sheets: WorkbookSheet[];
  updatedAt?: string;
}

type ClipboardMode = "copy" | "cut" | null;

interface ClipboardData {
  mode: ClipboardMode;
  sourceSheetId: string;
  origin: { row: number; col: number };
  cells: {
    row: number;
    col: number;
    data: CellData;
    valueAtCopy: EvalResult;
  }[];
  rows: number;
  cols: number;
}

interface SelectionRange {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

type EvalResult = number | string | boolean;

type SidebarPanel = "properties" | "styles" | "gallery" | "navigator" | "functions" | "settings";
type ToolbarButtonKind = "button" | "toggle";

const RECENT_FILES_KEY = "awm_excel_recent_files";
const TEMPLATES_KEY = "awm_excel_templates";
const MACROS_KEY = "awm_excel_macros";

// একটি macro action-এর টাইপ: cell selection, value change, বা style/formatting change
type MacroActionType = "SELECT" | "SET_VALUE" | "SET_STYLE";

interface MacroAction {
  type: MacroActionType;
  keys: string[];           // এই action যেসব cell-এ প্রযোজ্য (explicit, live-selection নির্ভর নয় — playback-এ reliable)
  value?: string;           // SET_VALUE-এর জন্য
  style?: Partial<CellStyle>; // SET_STYLE-এর জন্য
  activeCell?: string;      // SELECT-এর জন্য
}

interface SavedMacro {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  actions: MacroAction[];
}

function loadMacrosFromStorage(): SavedMacro[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(MACROS_KEY);
    return raw ? (JSON.parse(raw) as SavedMacro[]) : [];
  } catch {
    return [];
  }
}

function saveMacrosToStorage(items: SavedMacro[]) {
  try {
    window.localStorage.setItem(MACROS_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable or full; macros will not persist across reloads */
  }
}


interface RecentFileEntry {
  id: string;
  name: string;
  openedAt: string;
}

interface WorkbookTemplate {
  id: string;
  name: string;
  createdAt: string;
  snapshot: WorkbookSnapshot;
}

function saveRecentFilesToStorage(files: RecentFileEntry[]) {
  try {
    window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files.slice(0, 8)));
  } catch {
    /* storage unavailable or full; recent files list will not persist across reloads */
  }
}

function loadTemplatesFromStorage(): WorkbookTemplate[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(TEMPLATES_KEY);
    return raw ? (JSON.parse(raw) as WorkbookTemplate[]) : [];
  } catch {
    return [];
  }
}

function saveTemplatesToStorage(items: WorkbookTemplate[]) {
  try {
    window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable or full; templates will not persist across reloads */
  }
}

/* ============================================================================
 * Enterprise Menu Navigation Types & Data
 * ========================================================================== */

export interface MenuItemDefinition {
  label: string;
  action: string;
  shortcut?: string;
  isDivider?: boolean;
}

export interface MenuCategory {
  title: string;
  items: MenuItemDefinition[];
}

const EXCEL_MENU_DATA: MenuCategory[] = [
  {
    title: "File",
    items: [
      { label: "New", shortcut: "Ctrl+N", action: "FILE_NEW" },
      { label: "Open...", shortcut: "Ctrl+O", action: "FILE_OPEN" },
      { label: "Open Remote...", action: "FILE_OPEN_REMOTE" },
      { label: "Recent Documents", action: "FILE_RECENT_DOCS" },
      { label: "Close", action: "FILE_CLOSE" },
      { label: "Wizards", action: "FILE_WIZARDS" },
      { label: "Templates", shortcut: "Ctrl+Shift+N", action: "FILE_TEMPLATES" },
      { label: "Reload", action: "FILE_RELOAD" },
      { label: "Reload", action: "FILE_RELOAD" },
      { label: "Versions...", action: "FILE_VERSIONS" },
      { label: "Save", shortcut: "Ctrl+S", action: "FILE_SAVE" },
      { label: "Save As...", shortcut: "Ctrl+Shift+S", action: "FILE_SAVE_AS" },
      { label: "Save Remote...", action: "FILE_SAVE_REMOTE" },
      { label: "Save a Copy...", action: "FILE_SAVE_COPY" },
      { label: "Save as Template...", shortcut: "Shift+F11", action: "FILE_SAVE_AS_TEMPLATE" },
      { label: "Save All", action: "FILE_SAVE_ALL" },
      { label: "Export...", action: "FILE_EXPORT" },
      { label: "Export as PDF...", action: "FILE_EXPORT_PDF" },
      { label: "Send", action: "FILE_SEND" },
      { label: "Preview in Web Browser", action: "FILE_PREVIEW_WEB" },
      { label: "Print Preview", shortcut: "Ctrl+Shift+O", action: "FILE_PRINT_PREVIEW" },
      { label: "Print...", shortcut: "Ctrl+P", action: "FILE_PRINT" },
      { label: "Printer Settings...", action: "FILE_PRINTER_SETTINGS" },
      { label: "Properties...", action: "FILE_PROPERTIES" },
      { label: "Digital Signatures", action: "FILE_DIGITAL_SIGN" },
      { label: "Exit AWM ERP", shortcut: "Ctrl+Q", action: "FILE_EXIT" }
    ]
  },
  {
    title: "Edit",
    items: [
      { label: "Undo: Delete", shortcut: "Ctrl+Z", action: "EDIT_UNDO" },
      { label: "Redo", shortcut: "Ctrl+Y", action: "EDIT_REDO" },
      { label: "Repeat: Delete", shortcut: "Ctrl+Shift+Y", action: "EDIT_REPEAT" },
      { label: "Cut", shortcut: "Ctrl+X", action: "EDIT_CUT" },
      { label: "Copy", shortcut: "Ctrl+C", action: "EDIT_COPY" },
      { label: "Paste", shortcut: "Ctrl+V", action: "EDIT_PASTE" },
      { label: "Paste Special", action: "EDIT_PASTE_SPECIAL" },
      { label: "Select All", shortcut: "Ctrl+Shift+Space", action: "EDIT_SELECT_ALL" },
      { label: "Select", action: "EDIT_SELECT" },
      { label: "Find...", shortcut: "Ctrl+F", action: "EDIT_FIND" },
      { label: "Find and Replace...", shortcut: "Ctrl+H", action: "EDIT_FIND_REPLACE" },
      { label: "Track Changes", action: "EDIT_TRACK_CHANGES" },
      { label: "Cell Edit Mode", shortcut: "F2", action: "EDIT_CELL_MODE" },
      { label: "Cell Protection", action: "EDIT_CELL_PROTECTION" },
      { label: "Links to External Files...", action: "EDIT_LINKS_EXTERNAL" },
      { label: "OLE Object", action: "EDIT_OLE_OBJECT" },
      { label: "Edit Mode", shortcut: "Ctrl+Shift+M", action: "EDIT_MODE" }
    ]
  },
  {
    title: "View",
    items: [
      { label: "Normal", action: "VIEW_NORMAL" },
      { label: "Page Break", action: "VIEW_PAGE_BREAK" },
      { label: "User Interface...", action: "VIEW_USER_INTERFACE" },
      { label: "Toolbars", action: "VIEW_TOOLBARS" },
      { label: "Formula Bar", action: "VIEW_FORMULA_BAR" },
      { label: "Status Bar", action: "VIEW_STATUS_BAR" },
      { label: "View Headers", action: "VIEW_HEADERS" },
      { label: "View Grid Lines", action: "VIEW_GRID_LINES" },
      { label: "Grid and Helplines", action: "VIEW_GRID_HELPLINES" },
      { label: "Value Highlighting", shortcut: "Ctrl+F8", action: "VIEW_VALUE_HIGHLIGHTING" },
      { label: "Column/Row Highlighting", action: "VIEW_COL_ROW_HIGHLIGHTING" },
      { label: "Hidden Row/Column Indicator", action: "VIEW_HIDDEN_INDICATOR" },
      { label: "Show Formulas", shortcut: "Ctrl+`", action: "VIEW_SHOW_FORMULAS" },
      { label: "Comments", action: "VIEW_COMMENTS" },
      { label: "Split Window", action: "VIEW_SPLIT_WINDOW" },
      { label: "Split Vertically", action: "VIEW_SPLIT_VERTICAL" },
      { label: "Split Horizontally", action: "VIEW_SPLIT_HORIZONTAL" },
      { label: "Remove Split", action: "VIEW_UNSPLIT" },
      { label: "Freeze Rows and Columns", action: "VIEW_FREEZE_ROWS_COLS" },
      { label: "Freeze Cells", action: "VIEW_FREEZE_CELLS" },
      { label: "Sidebar", shortcut: "Ctrl+F5", action: "VIEW_SIDEBAR" },
      { label: "Styles", shortcut: "F11", action: "VIEW_STYLES" },
      { label: "Gallery", action: "VIEW_GALLERY" },
      { label: "Navigator", shortcut: "F5", action: "VIEW_NAVIGATOR" },
      { label: "Function List", action: "VIEW_FUNCTION_LIST" },
      { label: "Data Sources", shortcut: "Ctrl+Shift+F4", action: "VIEW_DATA_SOURCES" },
      { label: "Full Screen", shortcut: "Ctrl+Shift+J", action: "VIEW_FULL_SCREEN" },
      { label: "Zoom", action: "VIEW_ZOOM" }
    ]
  },
  {
    title: "Insert",
    items: [
      { label: "Image...", action: "INSERT_IMAGE" },
      { label: "Chart...", action: "INSERT_CHART" },
      { label: "Sparkline...", action: "INSERT_SPARKLINE" },
      { label: "Pivot Table...", action: "INSERT_PIVOT_TABLE" },
      { label: "Media", action: "INSERT_MEDIA" },
      { label: "OLE Object", action: "INSERT_OLE_OBJECT" },
      { label: "Shape", action: "INSERT_SHAPE" },
      { label: "Function...", shortcut: "Ctrl+F2", action: "INSERT_FUNCTION" },
      { label: "Named Range or Expression...", action: "INSERT_NAMED_RANGE" },
      { label: "Text Box", action: "INSERT_TEXT_BOX" },
      { label: "Comment", shortcut: "Ctrl+Alt+C", action: "INSERT_COMMENT" },
      { label: "Fontwork...", action: "INSERT_FONTWORK" },
      { label: "Hyperlink...", shortcut: "Ctrl+K", action: "INSERT_HYPERLINK" },
      { label: "Special Character...", action: "INSERT_SPECIAL_CHAR" },
      { label: "Formatting Mark", action: "INSERT_FORMATTING_MARK" },
      { label: "Date", shortcut: "Ctrl+;", action: "INSERT_DATE" },
      { label: "Time", shortcut: "Ctrl+Shift+;", action: "INSERT_TIME" },
      { label: "Field", action: "INSERT_FIELD" },
      { label: "Headers and Footers...", action: "INSERT_HEADERS_FOOTERS" },
      { label: "Form Control", action: "INSERT_FORM_CONTROL" },
      { label: "Signature Line...", action: "INSERT_SIGNATURE_LINE" }
    ]
  },
  {
    title: "Format",
    items: [
      { label: "Text", action: "FORMAT_TEXT" },
      { label: "Align Text", action: "FORMAT_ALIGN_TEXT" },
      { label: "Number Format", action: "FORMAT_NUMBER" },
      { label: "Clone Formatting", action: "FORMAT_CLONE" },
      { label: "Clear Direct Formatting", shortcut: "Ctrl+M", action: "FORMAT_CLEAR_DIRECT" },
      { label: "Cells...", shortcut: "Ctrl+1", action: "FORMAT_CELLS" },
      { label: "Rows", action: "FORMAT_ROWS" },
      { label: "Columns", action: "FORMAT_COLUMNS" },
      { label: "Page Style...", action: "FORMAT_PAGE_STYLE" },
      { label: "Print Ranges", action: "FORMAT_PRINT_RANGES" },
      { label: "Conditional", action: "FORMAT_CONDITIONAL" },
      { label: "Spreadsheet Theme", action: "FORMAT_SPREADSHEET_THEME" },
      { label: "Theme...", action: "FORMAT_THEME" },
      { label: "Sparklines", action: "FORMAT_SPARKLINES" }
    ]
  },
  {
    title: "Styles",
    items: [
      { label: "Default", action: "STYLE_DEFAULT" },
      { label: "Accent 1", action: "STYLE_ACCENT_1" },
      { label: "Accent 2", action: "STYLE_ACCENT_2" },
      { label: "Accent 3", action: "STYLE_ACCENT_3" },
      { label: "Heading 1", action: "STYLE_HEADING_1" },
      { label: "Heading 2", action: "STYLE_HEADING_2" },
      { label: "Good", action: "STYLE_GOOD" },
      { label: "Bad", action: "STYLE_BAD" },
      { label: "Neutral", action: "STYLE_NEUTRAL" },
      { label: "Error", action: "STYLE_ERROR" },
      { label: "Warning", action: "STYLE_WARNING" },
      { label: "Footnote", action: "STYLE_FOOTNOTE" },
      { label: "Note", action: "STYLE_NOTE" },
      { label: "Update Selected Style", action: "STYLE_UPDATE_SELECTED" },
      { label: "New Style from Selection", action: "STYLE_NEW_FROM_SELECTION" },
      { label: "Manage Styles", shortcut: "F11", action: "STYLE_MANAGE" }
    ]
  },
  {
    title: "Sheet",
    items: [
      { label: "Insert Cells...", shortcut: "Ctrl++", action: "SHEET_INSERT_CELLS" },
      { label: "Insert Rows", action: "SHEET_INSERT_ROWS" },
      { label: "Insert Columns", action: "SHEET_INSERT_COLUMNS" },
      { label: "Insert Page Break", action: "SHEET_INSERT_PAGE_BREAK" },
      { label: "Delete Cells...", shortcut: "Ctrl+-", action: "SHEET_DELETE_CELLS" },
      { label: "Delete Rows", action: "SHEET_DELETE_ROWS" },
      { label: "Delete Columns", action: "SHEET_DELETE_COLUMNS" },
      { label: "Insert Sheet...", action: "SHEET_INSERT_SHEET" },
      { label: "Insert Sheet at End...", action: "SHEET_INSERT_SHEET_END" },
      { label: "Insert Sheet from File...", action: "SHEET_INSERT_SHEET_FILE" },
      { label: "External Links...", action: "SHEET_EXTERNAL_LINKS" },
      { label: "Clear Cells...", shortcut: "Backspace", action: "SHEET_CLEAR_CELLS" },
      { label: "Cycle Cell Reference Types", shortcut: "F4", action: "SHEET_CYCLE_REF" },
      { label: "Fill Cells", action: "SHEET_FILL_CELLS" },
      { label: "Named Ranges and Expressions", action: "SHEET_NAMED_RANGES" },
      { label: "Rename Sheet...", action: "SHEET_RENAME" },
      { label: "Move or Copy Sheet...", action: "SHEET_MOVE_COPY" },
      { label: "Duplicate Sheet", action: "SHEET_DUPLICATE" },
      { label: "Navigate", action: "SHEET_NAVIGATE" },
      { label: "Sheet Tab Color...", action: "SHEET_TAB_COLOR" },
      { label: "Sheet Events...", action: "SHEET_EVENTS" },
      { label: "Right-To-Left", action: "SHEET_RTL" }
    ]
  },
  {
    title: "Data",
    items: [
      { label: "Sort...", action: "DATA_SORT" },
      { label: "Sort Ascending", action: "DATA_SORT_ASC" },
      { label: "Sort Descending", action: "DATA_SORT_DESC" },
      { label: "AutoFilter", shortcut: "Ctrl+Shift+L", action: "DATA_AUTOFILTER" },
      { label: "More Filters", action: "DATA_MORE_FILTERS" },
      { label: "Duplicates...", action: "DATA_DUPLICATES" },
      { label: "Define Range...", action: "DATA_DEFINE_RANGE" },
      { label: "Select Range...", action: "DATA_SELECT_RANGE" },
      { label: "Pivot Table", action: "DATA_PIVOT_TABLE" },
      { label: "PivotChart", action: "DATA_PIVOT_CHART" },
      { label: "Forecast Sheet", action: "DATA_FORECAST_SHEET" },
      { label: "Analyze Data", action: "DATA_ANALYZE_DATA" },
      { label: "Calculate", action: "DATA_CALCULATE" },
      { label: "Validity...", action: "DATA_VALIDITY" },
      { label: "Subtotals...", action: "DATA_SUBTOTALS" },
      { label: "What-If Data Table...", action: "DATA_WHAT_IF_TABLE" },
      { label: "Scenario Manager...", action: "DATA_SCENARIO_MANAGER" },
      { label: "Data Analysis...", action: "DATA_ANALYSIS_TOOLPAK" },
      { label: "Form...", action: "DATA_FORM" },
      { label: "XML Source...", action: "DATA_XML_SOURCE" },
      { label: "Data Provider...", action: "DATA_DATA_PROVIDER" },
      { label: "Consolidate...", action: "DATA_CONSOLIDATE" },
      { label: "Group and Outline", action: "DATA_GROUP_OUTLINE" }, { label: "Group Columns", action: "DATA_GROUP_COLUMNS" },
      { label: "Ungroup Columns", action: "DATA_UNGROUP_COLUMNS" },
      { label: "Collapse All Groups", action: "DATA_COLLAPSE_ALL_GROUPS" },
      { label: "Expand All Groups", action: "DATA_EXPAND_ALL_GROUPS" },
      { label: "Statistics", action: "DATA_STATISTICS" }
    ]
  },
  {
    title: "Tools",
    items: [
      { label: "Spelling...", shortcut: "F7", action: "TOOLS_SPELLING" },
      { label: "Automatic Spell Checking", shortcut: "Shift+F7", action: "TOOLS_AUTO_SPELL" },
      { label: "Language", action: "TOOLS_LANGUAGE" },
      { label: "AutoCorrect Options...", action: "TOOLS_AUTOCORRECT" },
      { label: "AutoInput", action: "TOOLS_AUTOINPUT" },
      { label: "Redact", action: "TOOLS_REDACT" },
      { label: "Auto-Redact", action: "TOOLS_AUTO_REDACT" },
      { label: "Goal Seek...", action: "TOOLS_GOAL_SEEK" },
      { label: "Solver...", action: "TOOLS_SOLVER" },
      { label: "Detective", action: "TOOLS_DETECTIVE" },
      { label: "Forms", action: "TOOLS_FORMS" },
      { label: "Share Spreadsheet...", action: "TOOLS_SHARE_SPREADSHEET" },
      { label: "Protect Sheet...", action: "TOOLS_PROTECT_SHEET" },
      { label: "Protect Spreadsheet Structure...", action: "TOOLS_PROTECT_STRUCTURE" },
      { label: "Macros", action: "TOOLS_MACROS" },
      { label: "Development Tools", action: "TOOLS_DEV_TOOLS" },
      { label: "XML Filter Settings...", action: "TOOLS_XML_FILTER" },
      { label: "Extensions...", shortcut: "Ctrl+Alt+E", action: "TOOLS_EXTENSIONS" },
      { label: "Customize...", action: "TOOLS_CUSTOMIZE" },
      { label: "Options...", shortcut: "Alt+F12", action: "TOOLS_OPTIONS" }

    ]
  },

  {
    title: "Developer",
    items: [
      { label: "View Formulas", shortcut: "Ctrl+`", action: "VIEW_SHOW_FORMULAS" },
      { label: "Recalculate All", action: "DATA_CALCULATE" },
      { label: "", action: "", isDivider: true },
      { label: "Export CSV", action: "FILE_EXPORT" },
      { label: "Reset Template Inputs", action: "RESET_TEMPLATE_INPUTS" },
      { label: "Reload Page", action: "FILE_RELOAD" }
    ]
  },

  {
    title: "Window",
    items: [
      { label: "New Window", action: "WINDOW_NEW" },
      { label: "Close Window", shortcut: "Ctrl+W", action: "WINDOW_CLOSE" }
    ]
  },

  {
    title: "Help",
    items: [
      { label: "alim@smartfamilyitsolutionsworld.com", action: "HELP_CONTACT_INFO" }
    ]
  }
];

const DEFAULT_ROWS = 1000000;
const DEFAULT_COLS = 5000;
const MAX_ROWS = 100000;
const MAX_COLS = 2000;
const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 36;
const ROW_HEADER_WIDTH = 52;
const HEADER_HEIGHT = 30;

const FONT_CATEGORIES: { category: string; fonts: string[] }[] = [
  {
    category: "Theme Fonts",
    fonts: ["Inter", "Calibri", "Segoe UI"],
  },
  {
    category: "Sans Serif",
    fonts: ["Arial", "Helvetica", "Verdana", "Tahoma", "Trebuchet MS", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito", "Source Sans Pro"],
  },
  {
    category: "Serif",
    fonts: ["Georgia", "Times New Roman", "Garamond", "Cambria", "Palatino Linotype", "Book Antiqua", "Merriweather", "Playfair Display"],
  },
  {
    category: "Monospace",
    fonts: ["Courier New", "Consolas", "Lucida Console", "Monaco", "Roboto Mono", "Source Code Pro"],
  },
  {
    category: "Display / Handwriting",
    fonts: ["Impact", "Comic Sans MS", "Brush Script MT", "Pacifico", "Lobster"],
  },
];

const FONT_FAMILIES = FONT_CATEGORIES.flatMap((c) => c.fonts);

const RECENT_FONTS_KEY = "awm_excel_recent_fonts";

type AppLocale = "en" | "bn" | "ar" | "hi" | "es";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  bn: "বাংলা",
  ar: "العربية",
  hi: "हिन्दी",
  es: "Español",
};

const TRANSLATIONS: Record<AppLocale, Record<string, string>> = {
  en: {
    file: "File",
    edit: "Edit",
    view: "View",
    insert: "Insert",
    format: "Format",
    styles: "Styles",
    sheet: "Sheet",
    data: "Data",
    tools: "Tools",
    window: "Window",
    help: "Help",
    save: "Save",
    open: "Open",
    close: "Close",
    language: "Language",
    locale: "Locale",
    collapse: "Collapse",
    undock: "Undock",
    dock: "Dock",
    customize: "Customize",
    sidebarCollapsed: "Sidebar collapsed.",
    sidebarUndockToggled: "Sidebar undock toggled.",
    sidebarCustomized: "Sidebar customized.",
    sidebarDescription: "The sidebar can be customized, docked, and collapsed.",
  },
  bn: {
    file: "ফাইল",
    edit: "এডিট",
    view: "ভিউ",
    insert: "ইনসার্ট",
    format: "ফরম্যাট",
    styles: "স্টাইলস",
    sheet: "শীট",
    data: "ডাটা",
    tools: "টুলস",
    window: "উইন্ডো",
    help: "হেল্প",
    save: "সেভ",
    open: "ওপেন",
    close: "বন্ধ",
    language: "ভাষা",
    locale: "লোকেল",
    collapse: "সংকুচিত করুন",
    undock: "আলাদা করুন",
    dock: "ডক করুন",
    customize: "কাস্টমাইজ",
    sidebarCollapsed: "সাইডবার সংকুচিত করা হয়েছে।",
    sidebarUndockToggled: "সাইডবার ডক অবস্থা পরিবর্তন করা হয়েছে।",
    sidebarCustomized: "সাইডবার কাস্টমাইজ করা হয়েছে।",
    sidebarDescription: "সাইডবারটি কাস্টমাইজ, ডক, এবং সংকুচিত করা যায়।",
  },
  ar: {
    file: "ملف",
    edit: "تحرير",
    view: "عرض",
    insert: "إدراج",
    format: "تنسيق",
    styles: "أنماط",
    sheet: "ورقة",
    data: "بيانات",
    tools: "أدوات",
    window: "نافذة",
    help: "مساعدة",
    save: "حفظ",
    open: "فتح",
    close: "إغلاق",
    language: "اللغة",
    locale: "الإعدادات المحلية",
    collapse: "طي",
    undock: "فصل",
    dock: "إرساء",
    customize: "تخصيص",
    sidebarCollapsed: "تم طي الشريط الجانبي.",
    sidebarUndockToggled: "تم تبديل حالة فصل الشريط الجانبي.",
    sidebarCustomized: "تم تخصيص الشريط الجانبي.",
    sidebarDescription: "يمكن تخصيص الشريط الجانبي وفصله وطيه.",
  },
  hi: {
    file: "फ़ाइल",
    edit: "संपादित करें",
    view: "देखें",
    insert: "सम्मिलित करें",
    format: "फ़ॉर्मेट",
    styles: "शैलियाँ",
    sheet: "शीट",
    data: "डेटा",
    tools: "टूल्स",
    window: "विंडो",
    help: "सहायता",
    save: "सेव",
    open: "खोलें",
    close: "बंद करें",
    language: "भाषा",
    locale: "लोकेल",
    collapse: "संक्षिप्त करें",
    undock: "अनडॉक करें",
    dock: "डॉक करें",
    customize: "कस्टमाइज़ करें",
    sidebarCollapsed: "साइडबार संक्षिप्त कर दिया गया है।",
    sidebarUndockToggled: "साइडबार अनडॉक स्थिति बदली गई।",
    sidebarCustomized: "साइडबार कस्टमाइज़ किया गया।",
    sidebarDescription: "साइडबार को कस्टमाइज़, डॉक और संक्षिप्त किया जा सकता है।",
  },
  es: {
    file: "Archivo",
    edit: "Editar",
    view: "Ver",
    insert: "Insertar",
    format: "Formato",
    styles: "Estilos",
    sheet: "Hoja",
    data: "Datos",
    tools: "Herramientas",
    window: "Ventana",
    help: "Ayuda",
    save: "Guardar",
    open: "Abrir",
    close: "Cerrar",
    language: "Idioma",
    locale: "Configuración regional",
    collapse: "Contraer",
    undock: "Separar",
    dock: "Anclar",
    customize: "Personalizar",
    sidebarCollapsed: "Barra lateral contraída.",
    sidebarUndockToggled: "Estado de anclaje de la barra lateral cambiado.",
    sidebarCustomized: "Barra lateral personalizada.",
    sidebarDescription: "La barra lateral se puede personalizar, anclar y contraer.",
  },
};

function t(locale: AppLocale, key: string): string {
  return TRANSLATIONS[locale]?.[key] || TRANSLATIONS.en[key] || key;
}
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

const PAGE_SIZES: Record<"A4" | "Letter" | "Legal", { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
};

const FUNCTION_LIST: { name: string; usage: string; desc: string }[] = [
  { name: "SUM", usage: "SUM(A1:A10)", desc: "Adds numbers in a range." },
  { name: "AVERAGE", usage: "AVERAGE(A1:A10)", desc: "Returns the arithmetic mean." },
  { name: "MIN", usage: "MIN(A1:A10)", desc: "Returns the smallest value." },
  { name: "MAX", usage: "MAX(A1:A10)", desc: "Returns the largest value." },
  { name: "COUNT", usage: "COUNT(A1:A10)", desc: "Counts numeric cells." },
  { name: "IF", usage: "IF(A1>100,\"Pass\",\"Fail\")", desc: "Returns a value based on a condition." },
  { name: "ROUND", usage: "ROUND(A1,2)", desc: "Rounds a number." },
  { name: "ABS", usage: "ABS(A1)", desc: "Returns the absolute value." },
  { name: "CONCAT", usage: "CONCAT(A1,\" \",B1)", desc: "Joins values together." },
  { name: "AND", usage: "AND(A1>0,B1>0)", desc: "TRUE if all conditions are true." },
  { name: "OR", usage: "OR(A1>0,B1>0)", desc: "TRUE if any condition is true." },
  { name: "TODAY", usage: "TODAY()", desc: "Returns today's date." },
  { name: "NOW", usage: "NOW()", desc: "Returns current date and time." },
  { name: "UPPER", usage: "UPPER(A1)", desc: "Converts text to uppercase." },
  { name: "LOWER", usage: "LOWER(A1)", desc: "Converts text to lowercase." },
  { name: "LEN", usage: "LEN(A1)", desc: "Returns text length." },
  { name: "COUNTIF", usage: 'COUNTIF(A1:A10,">3")', desc: "Counts cells that meet a condition." },
  { name: "SUMIF", usage: 'SUMIF(A1:A10,"x",B1:B10)', desc: "Adds cells that meet a condition." },

  { name: "COUNTA", usage: "COUNTA(A1:A10)", desc: "Counts non-empty cells." },
  { name: "PRODUCT", usage: "PRODUCT(A1:A5)", desc: "Multiplies the numbers in a range." },
  { name: "STDEV", usage: "STDEV(A1:A10)", desc: "Sample standard deviation." },
  { name: "STDEVP", usage: "STDEVP(A1:A10)", desc: "Population standard deviation." },
  { name: "VAR", usage: "VAR(A1:A10)", desc: "Sample variance." },
  { name: "VARP", usage: "VARP(A1:A10)", desc: "Population variance." },

  { name: "IFERROR", usage: 'IFERROR(A1/B1,"Error")', desc: "Returns a fallback value when a formula returns an error." },
  { name: "VLOOKUP", usage: 'VLOOKUP("A101",A2:C100,3,FALSE)', desc: "Finds a value in the first column and returns a value from another column." },
  { name: "SUMIFS", usage: 'SUMIFS(C2:C100,A2:A100,"Dhaka",B2:B100,">1000")', desc: "Adds values that meet multiple conditions." },
  { name: "COUNTIFS", usage: 'COUNTIFS(A2:A100,"Dhaka",B2:B100,">1000")', desc: "Counts rows that meet multiple conditions." },
  { name: "MOD", usage: "MOD(10,3)", desc: "Returns the remainder after division." },
  { name: "INT", usage: "INT(8.9)", desc: "Rounds a number down to the nearest integer." },
  { name: "SQRT", usage: "SQRT(16)", desc: "Returns the positive square root." },
  { name: "POWER", usage: "POWER(2,10)", desc: "Raises a number to a power." },
  { name: "ROUNDUP", usage: "ROUNDUP(2.141,2)", desc: "Rounds a number away from zero." },
  { name: "ROUNDDOWN", usage: "ROUNDDOWN(2.199,2)", desc: "Rounds a number toward zero." },
  { name: "MEDIAN", usage: "MEDIAN(A1:A10)", desc: "Returns the median of numbers." },
  { name: "NOT", usage: "NOT(A1>0)", desc: "Reverses a logical value." },
  { name: "TEXT", usage: 'TEXT(0.155,"0.0%")', desc: "Formats a number as text." },
  { name: "LEFT", usage: 'LEFT("Invoice",3)', desc: "Returns characters from the start of text." },
  { name: "RIGHT", usage: 'RIGHT("Invoice",3)', desc: "Returns characters from the end of text." },
  { name: "MID", usage: 'MID("Invoice",2,3)', desc: "Returns characters from the middle of text." },
  { name: "TRIM", usage: 'TRIM("  text  ")', desc: "Removes extra spaces from text." },
  { name: "XLOOKUP", usage: 'XLOOKUP(A2,B:B,C:C,"Not found")', desc: "Finds a value and returns a value from the same position in another range; works left or right." },
  { name: "XMATCH", usage: 'XMATCH(A2,B:B)', desc: "Returns the relative position of a value in a range." },
  { name: "FILTER", usage: 'FILTER(A1:A10,B1:B10=TRUE)', desc: "Returns the first value where all conditions are true (single-cell mode)." },
  { name: "SORT", usage: 'SORT(A1:A10,1,1)', desc: "Returns the first value of the sorted range (single-cell mode)." },
  { name: "UNIQUE", usage: 'UNIQUE(A1:A10)', desc: "Returns the first unique value from a range (single-cell mode)." },
  { name: "SEQUENCE", usage: 'SEQUENCE(5)', desc: "Returns the first value of a sequence (single-cell mode)." },
  { name: "TEXTJOIN", usage: 'TEXTJOIN(", ",TRUE,A1:A5)', desc: "Joins text values with a delimiter; can ignore empty cells." },
  { name: "IFS", usage: 'IFS(A1>90,"A",A1>80,"B")', desc: "Checks multiple conditions and returns the value for the first true condition." },
  { name: "SWITCH", usage: 'SWITCH(A1,1,"One",2,"Two","Other")', desc: "Compares an expression against a list of values and returns the first match; optional default." },
  { name: "SUBSTITUTE", usage: 'SUBSTITUTE("a-b-c","-","/")', desc: "Replaces existing text with new text (optional: only the Nth occurrence)." },
  { name: "FIND", usage: 'FIND("b","abc")', desc: "Returns the position of text inside text (case-sensitive)." },
  { name: "SEARCH", usage: 'SEARCH("B","abc")', desc: "Returns the position of text inside text (case-insensitive, supports ? and * wildcards)." },
  { name: "PROPER", usage: 'PROPER("hello world")', desc: "Capitalizes the first letter of each word." },
  { name: "CONCATENATE", usage: 'CONCATENATE(A1," ",B1)', desc: "Joins values together (same as CONCAT)." },
  { name: "VALUE", usage: 'VALUE("123.5")', desc: "Converts text that looks like a number or date into a number." },
  { name: "AVERAGEIF", usage: 'AVERAGEIF(A1:A10,">3",B1:B10)', desc: "Averages cells that meet a condition." },
  { name: "AVERAGEIFS", usage: 'AVERAGEIFS(C2:C100,A2:A100,"Dhaka",B2:B100,">1000")', desc: "Averages cells that meet multiple conditions." },
  { name: "SUMPRODUCT", usage: "SUMPRODUCT(A1:A5,B1:B5)", desc: "Multiplies matching items of the ranges and adds the results." },
  { name: "LARGE", usage: "LARGE(A1:A10,2)", desc: "Returns the k-th largest value." },
  { name: "SMALL", usage: "SMALL(A1:A10,2)", desc: "Returns the k-th smallest value." },
  { name: "RANK", usage: "RANK(A2,A$2:A$20,0)", desc: "Returns the rank of a number in a list (0 = descending, 1 = ascending)." },
  { name: "CEILING", usage: "CEILING(4.2,0.5)", desc: "Rounds a number up to the nearest multiple of significance." },
  { name: "FLOOR", usage: "FLOOR(4.2,0.5)", desc: "Rounds a number down to the nearest multiple of significance." },
  { name: "ISBLANK", usage: "ISBLANK(A1)", desc: "TRUE if the cell is empty." },
  { name: "ISNUMBER", usage: "ISNUMBER(A1)", desc: "TRUE if the value is a number." },
  { name: "ROW", usage: "ROW(A5)", desc: "Returns the row number of a reference (or of the current cell if omitted)." },
  { name: "COLUMN", usage: "COLUMN(C1)", desc: "Returns the column number of a reference (or of the current cell if omitted)." },
  { name: "RAND", usage: "RAND()", desc: "Returns a random number from 0 up to (not including) 1." },
  { name: "PMT", usage: "PMT(0.08/12,60,-250000)", desc: "Returns the periodic payment for a loan with constant payments and rate." },
  { name: "INDEX", usage: "INDEX(B1:B10,3)", desc: "Returns the value at a given row (and column) of a range." },
  { name: "MATCH", usage: "MATCH(\"cherry\",A1:A10,0)", desc: "Returns the position of a value in a range (0 = exact, 1 = largest ≤, -1 = smallest ≥)." },
  { name: "HLOOKUP", usage: "HLOOKUP(20,A1:C2,2,FALSE)", desc: "Looks up a value in the top row and returns a value from a row below it." },
  { name: "CHOOSE", usage: "CHOOSE(2,\"a\",\"b\",\"c\")", desc: "Returns the value at the given position from a list of values." },
  { name: "DATE", usage: "DATE(2026,11,19)", desc: "Builds a date from year, month and day (overflow rolls over, e.g. month 14)." },
  { name: "YEAR", usage: "YEAR(A1)", desc: "Returns the year of a date." },
  { name: "MONTH", usage: "MONTH(A1)", desc: "Returns the month (1-12) of a date." },
  { name: "DAY", usage: "DAY(A1)", desc: "Returns the day of the month of a date." },
  { name: "WEEKDAY", usage: "WEEKDAY(A1,2)", desc: "Returns the day of the week (type 1: Sun=1, 2: Mon=1, 3: Mon=0, 11-17: other start days)." },
  { name: "EOMONTH", usage: "EOMONTH(A1,1)", desc: "Returns the last day of the month, a number of months before or after a date." },
  { name: "EDATE", usage: "EDATE(A1,3)", desc: "Returns the date a number of months before or after a date." },
  { name: "DAYS", usage: "DAYS(B1,A1)", desc: "Returns the number of days between two dates (end, start)." },
  { name: "DATEDIF", usage: "DATEDIF(A1,B1,\"Y\")", desc: "Difference between two dates in Y, M, D, YM, MD or YD units." },
  { name: "COUNTBLANK", usage: "COUNTBLANK(A1:A10)", desc: "Counts empty cells in a range." },
  { name: "MAXIFS", usage: "MAXIFS(B1:B10,A1:A10,\"x\")", desc: "Largest value among cells that meet all conditions." },
  { name: "MINIFS", usage: "MINIFS(B1:B10,A1:A10,\"x\")", desc: "Smallest value among cells that meet all conditions." },
  { name: "SUBTOTAL", usage: "SUBTOTAL(9,B1:B10)", desc: "Subtotal of a list: 1-11 (include) or 101-111 (ignore hidden rows); skips other SUBTOTAL cells." },
  { name: "ISERROR", usage: "ISERROR(A1/B1)", desc: "TRUE if the value is any error." },
  { name: "ISERR", usage: "ISERR(A1/B1)", desc: "TRUE if the value is an error other than #N/A." },
  { name: "ISNA", usage: "ISNA(MATCH(A1,B:B,0))", desc: "TRUE if the value is the #N/A error." },
  { name: "ISTEXT", usage: "ISTEXT(A1)", desc: "TRUE if the value is text." },
  { name: "IFNA", usage: "IFNA(MATCH(A1,B:B,0),\"Not found\")", desc: "Returns a fallback value only when the result is #N/A." },
  { name: "LOG", usage: "LOG(8,2)", desc: "Logarithm of a number to a given base (default 10)." },
  { name: "LOG10", usage: "LOG10(1000)", desc: "Base-10 logarithm." },
  { name: "LN", usage: "LN(2.718)", desc: "Natural logarithm." },
  { name: "EXP", usage: "EXP(1)", desc: "Returns e raised to a power." },
  { name: "PI", usage: "PI()", desc: "Returns the value of pi." },
  { name: "SIGN", usage: "SIGN(A1)", desc: "Returns 1, 0 or -1 for positive, zero or negative numbers." },
  { name: "TRUNC", usage: "TRUNC(3.14159,2)", desc: "Cuts a number to the given digits without rounding." },
  { name: "RANDBETWEEN", usage: "RANDBETWEEN(1,6)", desc: "Returns a random whole number between two values." },
  { name: "FV", usage: "FV(0.06/12,10,-200,-500,1)", desc: "Future value of an investment with constant payments and rate." },
  { name: "PV", usage: "PV(0.08/12,240,500)", desc: "Present value of a loan or investment." },
  { name: "NPER", usage: "NPER(0.01,-100,-1000,10000,1)", desc: "Number of periods for an investment or loan." },
  { name: "NPV", usage: "NPV(0.1,-10000,3000,4200,6800)", desc: "Net present value of future cash flows (first flow is one period away)." },
  { name: "IRR", usage: "IRR(A1:A6)", desc: "Internal rate of return of a series of cash flows." },
  { name: "RATE", usage: "RATE(48,-200,8000)", desc: "Interest rate per period of a loan or annuity." },
  { name: "REPLACE", usage: "REPLACE(\"abcdefghijk\",6,5,\"*\")", desc: "Replaces part of a text by position." },
  { name: "REPT", usage: "REPT(\"ab\",3)", desc: "Repeats text a given number of times." },
  { name: "EXACT", usage: "EXACT(A1,B1)", desc: "TRUE if two texts are exactly equal (case-sensitive)." },
  { name: "PERCENTILE", usage: "PERCENTILE(A1:A10,0.9)", desc: "Returns the k-th percentile of a range (0 to 1)." },
  { name: "QUARTILE", usage: "QUARTILE(A1:A10,1)", desc: "Returns a quartile (0-4) of a range." },
  { name: "MODE", usage: "MODE(A1:A10)", desc: "Returns the most frequent number (#N/A if none repeats)." },
  { name: "OFFSET", usage: "OFFSET(A1,2,1,3,1)", desc: "Returns a reference shifted by rows/columns from a start cell, optionally resized (works inside SUM, VLOOKUP, etc.)." },
  { name: "INDIRECT", usage: "INDIRECT(\"B\"&ROW())", desc: "Turns text such as \"A1\" or \"Sheet2!B2:C9\" into a real cell reference." },
  { name: "TRANSPOSE", usage: "TRANSPOSE(A1:C1)", desc: "Swaps rows and columns of a range (single-cell mode: first value; full array inside INDEX/ROWS/COLUMNS)." },
  { name: "ROWS", usage: "ROWS(A1:A10)", desc: "Returns the number of rows in a range." },
  { name: "COLUMNS", usage: "COLUMNS(A1:D1)", desc: "Returns the number of columns in a range." },
  { name: "HOUR", usage: "HOUR(A1)", desc: "Returns the hour (0-23) of a time or date-time." },
  { name: "MINUTE", usage: "MINUTE(A1)", desc: "Returns the minute (0-59) of a time or date-time." },
  { name: "SECOND", usage: "SECOND(A1)", desc: "Returns the second (0-59) of a time or date-time." },
  { name: "TIME", usage: "TIME(14,30,0)", desc: "Builds a time (fraction of a day) from hour, minute and second." },
  { name: "NETWORKDAYS", usage: "NETWORKDAYS(A1,B1,D1:D5)", desc: "Counts working days (Mon-Fri) between two dates, optionally excluding holidays." },
  { name: "WORKDAY", usage: "WORKDAY(A1,10,D1:D5)", desc: "Returns the date a number of working days before or after a date, optionally skipping holidays." },
  { name: "WEEKNUM", usage: "WEEKNUM(A1,2)", desc: "Returns the week number of the year (type 1/2/11-17 or 21 for ISO weeks)." },
  { name: "FACT", usage: "FACT(5)", desc: "Returns the factorial of a number (0 to 170)." },
  { name: "GCD", usage: "GCD(12,18)", desc: "Returns the greatest common divisor of integers." },
  { name: "LCM", usage: "LCM(4,6)", desc: "Returns the least common multiple of integers." },
  { name: "MROUND", usage: "MROUND(10,3)", desc: "Rounds a number to the nearest multiple." },
  { name: "SIN", usage: "SIN(PI()/2)", desc: "Sine of an angle in radians." },
  { name: "COS", usage: "COS(0)", desc: "Cosine of an angle in radians." },
  { name: "TAN", usage: "TAN(PI()/4)", desc: "Tangent of an angle in radians." },
  { name: "ASIN", usage: "ASIN(1)", desc: "Arcsine in radians (input -1 to 1)." },
  { name: "ACOS", usage: "ACOS(0)", desc: "Arccosine in radians (input -1 to 1)." },
  { name: "ATAN", usage: "ATAN(1)", desc: "Arctangent in radians." },
  { name: "ATAN2", usage: "ATAN2(1,1)", desc: "Arctangent from x and y coordinates (Excel order: x, y)." },
  { name: "DEGREES", usage: "DEGREES(PI())", desc: "Converts radians to degrees." },
  { name: "RADIANS", usage: "RADIANS(180)", desc: "Converts degrees to radians." },
  { name: "CORREL", usage: "CORREL(A2:A20,B2:B20)", desc: "Correlation coefficient of two data sets." },
  { name: "SLOPE", usage: "SLOPE(B2:B20,A2:A20)", desc: "Slope of the linear regression line (known_y, known_x)." },
  { name: "INTERCEPT", usage: "INTERCEPT(B2:B20,A2:A20)", desc: "Intercept of the linear regression line (known_y, known_x)." },
  { name: "RSQ", usage: "RSQ(B2:B20,A2:A20)", desc: "R-squared of the linear regression (known_y, known_x)." },
  { name: "FORECAST", usage: "FORECAST(25,B2:B20,A2:A20)", desc: "Predicts a value along a linear trend (x, known_y, known_x)." },
  { name: "CLEAN", usage: "CLEAN(A1)", desc: "Removes non-printable control characters from text." },
  { name: "CHAR", usage: "CHAR(65)", desc: "Returns the character for a code number (1-255)." },
  { name: "CODE", usage: "CODE(\"A\")", desc: "Returns the numeric code of the first character." },
  { name: "UNICODE", usage: "UNICODE(\"অ\")", desc: "Returns the Unicode code point of the first character (works for Bengali)." },
  { name: "UNICHAR", usage: "UNICHAR(2437)", desc: "Returns the character for a Unicode code point." },
  { name: "TEXTSPLIT", usage: "TEXTSPLIT(\"a,b,c\",\",\")", desc: "Splits text by delimiters (single-cell mode: first piece; use INDEX(TEXTSPLIT(...),n) for others)." },
  { name: "IPMT", usage: "IPMT(0.08/12,1,60,-250000)", desc: "Interest part of a loan payment for a given period." },
  { name: "PPMT", usage: "PPMT(0.08/12,1,60,-250000)", desc: "Principal part of a loan payment for a given period." },
  { name: "XNPV", usage: "XNPV(0.1,B2:B6,A2:A6)", desc: "Net present value for cash flows on irregular dates." },
  { name: "XIRR", usage: "XIRR(B2:B6,A2:A6)", desc: "Internal rate of return for cash flows on irregular dates." },
  {
    name: "CONVERT",
    usage: 'CONVERT(100,"USD","BDT")',
    desc: "Converts an amount from one currency to another using the Exchange Rates sheet or built-in rates.",
  },
];

const FUNCTION_CATEGORIES: Record<string, string> = {
  CONVERT: "Financial",
  SUM: "Math", ROUND: "Math", ABS: "Math",
  AVERAGE: "Statistical", MIN: "Statistical", MAX: "Statistical", COUNT: "Statistical",
  COUNTA: "Statistical", STDEV: "Statistical", STDEVP: "Statistical", VAR: "Statistical", VARP: "Statistical",
  PRODUCT: "Math", COUNTIF: "Statistical", SUMIF: "Math",
  IF: "Logical", AND: "Logical", OR: "Logical",
  CONCAT: "Text", UPPER: "Text", LOWER: "Text", LEN: "Text",
  TODAY: "Date", NOW: "Date",
  IFERROR: "Logical", NOT: "Logical",
  VLOOKUP: "Lookup", SUMIFS: "Math", COUNTIFS: "Statistical",
  MOD: "Math", INT: "Math", SQRT: "Math", POWER: "Math",
  ROUNDUP: "Math", ROUNDDOWN: "Math", MEDIAN: "Statistical",
  TEXT: "Text", LEFT: "Text", RIGHT: "Text", MID: "Text", TRIM: "Text",
  XLOOKUP: "Lookup", XMATCH: "Lookup",
  FILTER: "Dynamic", SORT: "Dynamic", UNIQUE: "Dynamic", SEQUENCE: "Dynamic",
  TEXTJOIN: "Text", IFS: "Logical", SWITCH: "Logical",
  SUBSTITUTE: "Text", FIND: "Text", SEARCH: "Text", PROPER: "Text", CONCATENATE: "Text", VALUE: "Text",
  AVERAGEIF: "Statistical", AVERAGEIFS: "Statistical", SUMPRODUCT: "Math", LARGE: "Statistical", SMALL: "Statistical", RANK: "Statistical",
  CEILING: "Math", FLOOR: "Math", ISBLANK: "Logical", ISNUMBER: "Logical", ROW: "Lookup", COLUMN: "Lookup", RAND: "Math", PMT: "Financial",
  INDEX: "Lookup", MATCH: "Lookup", HLOOKUP: "Lookup", CHOOSE: "Lookup",
  DATE: "Date", YEAR: "Date", MONTH: "Date", DAY: "Date",
  WEEKDAY: "Date", EOMONTH: "Date", EDATE: "Date", DAYS: "Date",
  DATEDIF: "Date", COUNTBLANK: "Statistical", MAXIFS: "Statistical", MINIFS: "Statistical",
  SUBTOTAL: "Math", ISERROR: "Logical", ISERR: "Logical", ISNA: "Logical",
  ISTEXT: "Logical", IFNA: "Logical", LOG: "Math", LOG10: "Math",
  LN: "Math", EXP: "Math", PI: "Math", SIGN: "Math",
  TRUNC: "Math", RANDBETWEEN: "Math", FV: "Financial", PV: "Financial",
  NPER: "Financial", NPV: "Financial", IRR: "Financial", RATE: "Financial",
  REPLACE: "Text", REPT: "Text", EXACT: "Text", PERCENTILE: "Statistical",
  QUARTILE: "Statistical", MODE: "Statistical",
  OFFSET: "Lookup",
  INDIRECT: "Lookup",
  TRANSPOSE: "Lookup",
  ROWS: "Lookup",
  COLUMNS: "Lookup",
  HOUR: "Date",
  MINUTE: "Date",
  SECOND: "Date",
  TIME: "Date",
  NETWORKDAYS: "Date",
  WORKDAY: "Date",
  WEEKNUM: "Date",
  FACT: "Math",
  GCD: "Math",
  LCM: "Math",
  MROUND: "Math",
  SIN: "Math",
  COS: "Math",
  TAN: "Math",
  ASIN: "Math",
  ACOS: "Math",
  ATAN: "Math",
  ATAN2: "Math",
  DEGREES: "Math",
  RADIANS: "Math",
  CORREL: "Statistical",
  SLOPE: "Statistical",
  INTERCEPT: "Statistical",
  RSQ: "Statistical",
  FORECAST: "Statistical",
  CLEAN: "Text",
  CHAR: "Text",
  CODE: "Text",
  UNICODE: "Text",
  UNICHAR: "Text",
  TEXTSPLIT: "Text",
  IPMT: "Financial",
  PPMT: "Financial",
  XNPV: "Financial",
  XIRR: "Financial",
};

const GALLERY_STAMPS = ["✔", "✖", "★", "⚠", "📌", "🏢", "💰", "📈", "📉", "🕒", "✍", "📎"];

const SPECIAL_CHARACTERS = ["Ω", "≈", "≠", "≤", "≥", "÷", "×", "±", "©", "®", "™", "€", "£", "¥", "₹", "✓", "★", "→", "←", "↑", "↓"];

// ============================================================
// LibreOffice Calc-স্টাইল "Insert Special Characters" ফিচারের জন্য ডেটা
// ============================================================

// প্রতিটি Unicode ব্লকের কোড-রেঞ্জ — এখান থেকেই গ্রিডের ক্যারেক্টার জেনারেট হবে
interface CharBlockDef { name: string; start: number; end: number; }

const CHARACTER_BLOCKS: CharBlockDef[] = [
  { name: "Basic Latin", start: 0x0020, end: 0x007E },
  { name: "Latin-1 Supplement", start: 0x00A0, end: 0x00FF },
  { name: "Latin Extended-A", start: 0x0100, end: 0x017F },
  { name: "Greek and Coptic", start: 0x0370, end: 0x03FF },
  { name: "Cyrillic", start: 0x0400, end: 0x04FF },
  { name: "General Punctuation", start: 0x2000, end: 0x206F },
  { name: "Currency Symbols", start: 0x20A0, end: 0x20CF },
  { name: "Letterlike Symbols", start: 0x2100, end: 0x214F },
  { name: "Arrows", start: 0x2190, end: 0x21FF },
  { name: "Mathematical Operators", start: 0x2200, end: 0x22FF },
  { name: "Box Drawing", start: 0x2500, end: 0x257F },
  { name: "Geometric Shapes", start: 0x25A0, end: 0x25FF },
  { name: "Miscellaneous Symbols", start: 0x2600, end: 0x26FF },
  { name: "Dingbats", start: 0x2700, end: 0x27BF },
];

// পরিচিত ক্যারেক্টারগুলোর "মানুষের পড়ার মতো" নাম (LibreOffice-এ যেমন PILCROW SIGN দেখায়)
// এখানে না থাকা ক্যারেক্টারের জন্য নিচে fallback জেনেরিক নাম বসবে
const CHARACTER_NAME_MAP: Record<number, string> = {
  0x0021: "EXCLAMATION MARK", 0x0022: "QUOTATION MARK", 0x0023: "NUMBER SIGN",
  0x0024: "DOLLAR SIGN", 0x0025: "PERCENT SIGN", 0x0026: "AMPERSAND",
  0x0028: "LEFT PARENTHESIS", 0x0029: "RIGHT PARENTHESIS", 0x002A: "ASTERISK",
  0x002B: "PLUS SIGN", 0x002D: "HYPHEN-MINUS", 0x003D: "EQUALS SIGN",
  0x00A0: "NO-BREAK SPACE", 0x00A9: "COPYRIGHT SIGN", 0x00AE: "REGISTERED SIGN",
  0x00B0: "DEGREE SIGN", 0x00B1: "PLUS-MINUS SIGN", 0x00B5: "MICRO SIGN",
  0x00D7: "MULTIPLICATION SIGN", 0x00F7: "DIVISION SIGN",
  0x0391: "GREEK CAPITAL LETTER ALPHA", 0x03A9: "GREEK CAPITAL LETTER OMEGA",
  0x03C0: "GREEK SMALL LETTER PI", 0x03A3: "GREEK CAPITAL LETTER SIGMA",
  0x03BB: "GREEK SMALL LETTER LAMDA", 0x0394: "GREEK CAPITAL LETTER DELTA",
  0x2018: "LEFT SINGLE QUOTATION MARK", 0x2019: "RIGHT SINGLE QUOTATION MARK",
  0x201C: "LEFT DOUBLE QUOTATION MARK", 0x201D: "RIGHT DOUBLE QUOTATION MARK",
  0x2020: "DAGGER", 0x2021: "DOUBLE DAGGER", 0x2022: "BULLET",
  0x2026: "HORIZONTAL ELLIPSIS", 0x2030: "PER MILLE SIGN", 0x00B6: "PILCROW SIGN",
  0x00A7: "SECTION SIGN", 0x20AC: "EURO SIGN", 0x00A3: "POUND SIGN",
  0x00A5: "YEN SIGN", 0x20B9: "INDIAN RUPEE SIGN", 0x2122: "TRADE MARK SIGN",
  0x2190: "LEFTWARDS ARROW", 0x2191: "UPWARDS ARROW", 0x2192: "RIGHTWARDS ARROW",
  0x2193: "DOWNWARDS ARROW", 0x2194: "LEFT RIGHT ARROW",
  0x2200: "FOR ALL", 0x2202: "PARTIAL DIFFERENTIAL", 0x2203: "THERE EXISTS",
  0x2205: "EMPTY SET", 0x2208: "ELEMENT OF", 0x220F: "N-ARY PRODUCT",
  0x2211: "N-ARY SUMMATION", 0x221A: "SQUARE ROOT", 0x221E: "INFINITY",
  0x2229: "INTERSECTION", 0x222A: "UNION", 0x222B: "INTEGRAL",
  0x2248: "ALMOST EQUAL TO", 0x2260: "NOT EQUAL TO", 0x2264: "LESS-THAN OR EQUAL TO",
  0x2265: "GREATER-THAN OR EQUAL TO", 0x25CF: "BLACK CIRCLE", 0x25A0: "BLACK SQUARE",
  0x2713: "CHECK MARK", 0x2714: "HEAVY CHECK MARK", 0x2717: "BALLOT X",
  0x2718: "HEAVY BALLOT X", 0x2764: "HEAVY BLACK HEART", 0x2605: "BLACK STAR",
};

// কোড-পয়েন্ট থেকে নাম বের করে; না পেলে জেনেরিক "UNICODE CHARACTER U+XXXX" দেখাবে
function getCharacterName(codePoint: number): string {
  const found = CHARACTER_NAME_MAP[codePoint];
  if (found) return found;
  return `UNICODE CHARACTER (U+${codePoint.toString(16).toUpperCase().padStart(4, "0")})`;
}

const SPECIAL_CHARS_FAVORITES_KEY = "awm_excel_special_char_favorites";
const SPECIAL_CHARS_RECENT_KEY = "awm_excel_special_char_recent";

function saveCharListToStorage(key: string, items: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, 30)));
  } catch {
    /* localStorage না থাকলে শুধু persist হবে না, অ্যাপ ক্র্যাশ করবে না */
  }
}

// এখন ৮টা প্রফেশনাল বর্ডার লাইন-স্টাইল সাপোর্ট করবে
const BORDER_STYLE_OPTIONS: CellStyle["borderStyle"][] = ["solid", "dashed", "dotted", "double", "ridge", "groove", "inset", "outset"];



/* ============================================================================
 * World Currency List (ISO 4217 active codes) — used by the Currency toolbar dropdown.
 * Each entry: { code, name, symbol, locale } — the locale field drives Intl.NumberFormat so
 * every currency formats with its native symbol, decimal places and grouping.
 * ========================================================================== */
interface WorldCurrency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

/* ============================================================================
 * AWM ERP Sidebar Modules — Insert Hyperlink পিকারে ব্যবহারের জন্য
 * সাইডবারের SIDEBAR_SECTIONS থেকে সংগ্রহ করা সব মডিউলের নাম ও পাথ
 * ========================================================================== */
interface AwmModuleLink {
  label: string;
  href: string;
  section: string;
}

const AWM_MODULE_LINKS: AwmModuleLink[] = [
  // Admin Panel
  { label: "Admin Dashboard", href: "/dashboard/admin", section: "Admin Panel" },

  // AI Control Center
  { label: "AI Assistant", href: "/ai/assistant", section: "AI Control Center" },
  { label: "Smart ChatGPT", href: "/ai/chat", section: "AI Control Center" },
  { label: "AI Analytics", href: "/ai/analytics", section: "AI Control Center" },
  { label: "Attendance AI", href: "/ai/attendance", section: "AI Control Center" },
  { label: "Payroll AI", href: "/ai/payroll", section: "AI Control Center" },
  { label: "Cost Management", href: "/ai/cost-management", section: "AI Control Center" },
  { label: "AI Revenue Orchestrator", href: "/ai/revenue-orchestrator", section: "AI Control Center" },
  { label: "Prediction AI", href: "/ai/prediction", section: "AI Control Center" },
  { label: "AI Search", href: "/ai/search", section: "AI Control Center" },
  { label: "Excel", href: "/reports/excel", section: "AI Control Center" },
  { label: "AWM SMS", href: "/communication/awm-sms", section: "AI Control Center" },
  { label: "AWM Enterprise Social", href: "/community/awm-social", section: "AI Control Center" },
  { label: "Voice Command", href: "/ai/voice-command", section: "AI Control Center" },
  { label: "Multi-language AI", href: "/ai/multi-language", section: "AI Control Center" },
  { label: "AI Report Generator", href: "/ai/report-generator", section: "AI Control Center" },
  { label: "Smart Pharmacy", href: "/ai/pharmacy/smart-hub", section: "AI Control Center" },
  { label: "Smart Restaurant AI", href: "/ai/restaurant", section: "AI Control Center" },
  { label: "AI e-Prescription", href: "/ai/ePrescription", section: "AI Control Center" },
  { label: "AI-Driven Medical Imaging Intelligence", href: "/ai/driven-medical-imaging-intelligence", section: "AI Control Center" },

  // Dashboard System
  { label: "Main Dashboard", href: "/dashboard", section: "Dashboard System" },
  { label: "Live KPI", href: "/dashboard/live-kpi", section: "Dashboard System" },
  { label: "Notifications", href: "/dashboard/notifications", section: "Dashboard System" },
  { label: "Smart Calendar", href: "/dashboard/calendar", section: "Dashboard System" },
  { label: "Activity Timeline", href: "/dashboard/activity-timeline", section: "Dashboard System" },
  { label: "Real-time Monitoring", href: "/dashboard/real-time-monitoring", section: "Dashboard System" },
  { label: "Branch Overview", href: "/dashboard/branch-overview", section: "Dashboard System" },

  // HR & Employee Management
  { label: "Employees", href: "/hr/employees", section: "HR & Employee Management" },
  { label: "Employee Profile", href: "/hr/employee-profile", section: "HR & Employee Management" },
  { label: "ID Card Generator", href: "/hr/id-card-generator", section: "HR & Employee Management" },
  { label: "Attendance", href: "/hr/attendance", section: "HR & Employee Management" },
  { label: "Face/Fingerprint", href: "/face/fingerprint", section: "HR & Employee Management" },
  { label: "Leave Management", href: "/hr/leave-management", section: "HR & Employee Management" },
  { label: "Staff Advance Sheet", href: "/staff-advance-sheet", section: "HR & Employee Management" },
  { label: "Contracts", href: "/hr/contracts", section: "HR & Employee Management" },
  { label: "Performance Tracking", href: "/hr/performance", section: "HR & Employee Management" },
  { label: "Promotions", href: "/hr/promotions", section: "HR & Employee Management" },
  { label: "Disciplinary Actions", href: "/hr/disciplinary-actions", section: "HR & Employee Management" },
  { label: "Universal Scanner", href: "/hr/scanner", section: "HR & Employee Management" },
  { label: "Staff Advancement Count", href: "/staff-advancement/count", section: "HR & Employee Management" },
  { label: "Staff Advancement Logs", href: "/staff-advancement/logs", section: "HR & Employee Management" },
  { label: "Face Attendance", href: "/face-attendance", section: "HR & Employee Management" },

  // Payroll & Finance
  { label: "Payroll", href: "/payroll", section: "Payroll & Finance" },
  { label: "Time Sheet", href: "/payroll/time-sheet", section: "Payroll & Finance" },
  { label: "Banking", href: "/payroll/banking", section: "Payroll & Finance" },
  { label: "Expenses", href: "/payroll/expenses", section: "Payroll & Finance" },
  { label: "Tax Management", href: "/payroll/tax-management", section: "Payroll & Finance" },
  { label: "Revenue", href: "/payroll/revenue", section: "Payroll & Finance" },
  { label: "Profit / Loss", href: "/payroll/profit-loss", section: "Payroll & Finance" },
  { label: "Financial Reports", href: "/payroll/financial-reports", section: "Payroll & Finance" },
  { label: "Zakat Management", href: "/zakat-management", section: "Payroll & Finance" },
  { label: "Salary-Sheet", href: "/salary-sheet", section: "Payroll & Finance" },
  { label: "Construction Payroll", href: "/salary-sheet/construction-payroll", section: "Payroll & Finance" },
  { label: "Multi Currency", href: "/payroll/multi-currency", section: "Payroll & Finance" },
  { label: "Driver Attendance", href: "/payroll/driver-attendance", section: "Payroll & Finance" },
  { label: "AI Salary Prediction", href: "/payroll/ai-salary-prediction", section: "Payroll & Finance" },
  { label: "E-Commerce", href: "/E-Commerce", section: "Payroll & Finance" },

  // Production / Factory
  { label: "Production Planning", href: "/production/planning", section: "Production / Factory" },
  { label: "Line Management", href: "/production/line-management", section: "Production / Factory" },
  { label: "Machine Monitoring", href: "/production/machine-monitoring", section: "Production / Factory" },
  { label: "Raw Materials", href: "/production/raw-materials", section: "Production / Factory" },
  { label: "Waste Analysis", href: "/production/waste-analysis", section: "Production / Factory" },
  { label: "Production KPI", href: "/production/kpi", section: "Production / Factory" },
  { label: "Maintenance", href: "/production/maintenance", section: "Production / Factory" },
  { label: "Equipment Status", href: "/production/equipment-status", section: "Production / Factory" },

  // Inventory & Supply Chain
  { label: "Inventory", href: "/inventory", section: "Inventory & Supply Chain" },
  { label: "Logistics", href: "/inventory/logistics", section: "Inventory & Supply Chain" },
  { label: "Warehouse", href: "/inventory/warehouse", section: "Inventory & Supply Chain" },
  { label: "Live Stock Tracking", href: "/inventory/live-stock-tracking", section: "Inventory & Supply Chain" },
  { label: "Purchase Orders", href: "/inventory/purchase-orders", section: "Inventory & Supply Chain" },
  { label: "Supplier Management", href: "/inventory/suppliers", section: "Inventory & Supply Chain" },
  { label: "Delivery Tracking", href: "/inventory/delivery-tracking", section: "Inventory & Supply Chain" },
  { label: "QR / Barcode Scanner", href: "/inventory/qr-barcode-scanner", section: "Inventory & Supply Chain" },

  // Sales & CRM
  { label: "Customers", href: "/sales/customers", section: "Sales & CRM" },
  { label: "CRM", href: "/sales/crm", section: "Sales & CRM" },
  { label: "Marketing", href: "/sales/marketing", section: "Sales & CRM" },
  { label: "Invoices", href: "/sales/invoices", section: "Sales & CRM" },
  { label: "Client Chat", href: "/sales/client-chat", section: "Sales & CRM" },
  { label: "Sales Analytics", href: "/sales/analytics", section: "Sales & CRM" },
  { label: "Lead Management", href: "/sales/leads", section: "Sales & CRM" },
  { label: "AI Sales Assistant", href: "/sales/ai-assistant", section: "Sales & CRM" },

  // Reporting Center
  { label: "Smart Reports", href: "/reports/smart-reports", section: "Reporting Center" },
  { label: "Export PDF / Excel", href: "/reports/export", section: "Reporting Center" },
  { label: "Data Visualization", href: "/reports/data-visualization", section: "Reporting Center" },
  { label: "Charts", href: "/reports/charts", section: "Reporting Center" },
  { label: "AI Insights", href: "/reports/ai-insights", section: "Reporting Center" },
  { label: "Forecasting", href: "/reports/forecasting", section: "Reporting Center" },
  { label: "Print Center", href: "/reports/print-center", section: "Reporting Center" },

  // Security Center
  { label: "Access Control", href: "/security/access-control", section: "Security Center" },
  { label: "User Roles", href: "/security/user-roles", section: "Security Center" },
  { label: "Biometric Security", href: "/security/biometric", section: "Security Center" },
  { label: "Audit Logs", href: "/security/audit-logs", section: "Security Center" },
  { label: "Threat Detection", href: "/security/threat-detection", section: "Security Center" },
  { label: "API Keys", href: "/security/api-keys", section: "Security Center" },
  { label: "Security Alerts", href: "/security/alerts", section: "Security Center" },
  { label: "IP Restrictions", href: "/security/ip-restrictions", section: "Security Center" },

  // Global Settings
  { label: "Quality Control", href: "/settings/quality-control", section: "Global Settings" },
  { label: "Settings", href: "/settings", section: "Global Settings" },
  { label: "Language", href: "/settings/language", section: "Global Settings" },
  { label: "Theme", href: "/settings/theme", section: "Global Settings" },
  { label: "Dark Mode", href: "/settings/dark-mode", section: "Global Settings" },
  { label: "Mobile Sync", href: "/settings/mobile-sync", section: "Global Settings" },
  { label: "Cloud Backup", href: "/settings/cloud-backup", section: "Global Settings" },
  { label: "API Integration", href: "/settings/api-integration", section: "Global Settings" },
  { label: "ERP Connectors", href: "/settings/erp-connectors", section: "Global Settings" },

  // Next-Gen 2026 Features
  { label: "AI Voice ERP", href: "/next-gen/ai-voice-erp", section: "Next-Gen 2026 Features" },
  { label: "Autonomous AI Agent", href: "/next-gen/autonomous-ai-agent", section: "Next-Gen 2026 Features" },
  { label: "Live IoT Devices", href: "/next-gen/live-iot-devices", section: "Next-Gen 2026 Features" },
  { label: "AR / VR Dashboard", href: "/next-gen/ar-vr-dashboard", section: "Next-Gen 2026 Features" },
  { label: "AI Workflow Automation", href: "/next-gen/ai-workflow-automation", section: "Next-Gen 2026 Features" },
  { label: "Remote Factory Control", href: "/next-gen/remote-factory-control", section: "Next-Gen 2026 Features" },
  { label: "Predictive Analytics", href: "/next-gen/predictive-analytics", section: "Next-Gen 2026 Features" },
  { label: "Auto Decision Engine", href: "/next-gen/auto-decision-engine", section: "Next-Gen 2026 Features" },
  { label: "AI Document Understanding", href: "/next-gen/ai-document-understanding", section: "Next-Gen 2026 Features" },
];




const WORLD_CURRENCIES: WorldCurrency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE" },
  { code: "GBP", name: "British Pound Sterling", symbol: "£", locale: "en-GB" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
  { code: "CNY", name: "Chinese Yuan Renminbi", symbol: "¥", locale: "zh-CN" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", locale: "en-IN" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-AU" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", locale: "en-CA" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", locale: "de-CH" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", locale: "en-HK" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", locale: "en-NZ" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", locale: "sv-SE" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", locale: "nb-NO" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", locale: "da-DK" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", locale: "ar-AE" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", locale: "ar-SA" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", locale: "ar-QA" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", locale: "ar-KW" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "د.ب", locale: "ar-BH" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", locale: "ar-OM" },
  { code: "JOD", name: "Jordanian Dinar", symbol: "د.ا", locale: "ar-JO" },
  { code: "LBP", name: "Lebanese Pound", symbol: "ل.ل", locale: "ar-LB" },
  { code: "EGP", name: "Egyptian Pound", symbol: "£E", locale: "ar-EG" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", locale: "tr-TR" },
  { code: "IRR", name: "Iranian Rial", symbol: "﷼", locale: "fa-IR" },
  { code: "IQD", name: "Iraqi Dinar", symbol: "ع.د", locale: "ar-IQ" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", locale: "ur-PK" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", locale: "bn-BD" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", locale: "si-LK" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "रु", locale: "ne-NP" },
  { code: "AFN", name: "Afghan Afghani", symbol: "؋", locale: "fa-AF" },
  { code: "MVR", name: "Maldivian Rufiyaa", symbol: "Rf", locale: "dv-MV" },
  { code: "THB", name: "Thai Baht", symbol: "฿", locale: "th-TH" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", locale: "id-ID" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", locale: "ms-MY" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", locale: "en-PH" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", locale: "vi-VN" },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛", locale: "km-KH" },
  { code: "LAK", name: "Lao Kip", symbol: "₭", locale: "lo-LA" },
  { code: "MMK", name: "Burmese Kyat", symbol: "Ks", locale: "my-MM" },
  { code: "BND", name: "Brunei Dollar", symbol: "B$", locale: "ms-BN" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", locale: "ko-KR" },
  { code: "TWD", name: "Taiwan New Dollar", symbol: "NT$", locale: "zh-TW" },
  { code: "MNT", name: "Mongolian Tugrik", symbol: "₮", locale: "mn-MN" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", locale: "ru-RU" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", locale: "uk-UA" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", locale: "pl-PL" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", locale: "cs-CZ" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", locale: "hu-HU" },
  { code: "RON", name: "Romanian Leu", symbol: "lei", locale: "ro-RO" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", locale: "bg-BG" },
  { code: "HRK", name: "Croatian Kuna", symbol: "kn", locale: "hr-HR" },
  { code: "RSD", name: "Serbian Dinar", symbol: "дин", locale: "sr-RS" },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr", locale: "is-IS" },
  { code: "MDL", name: "Moldovan Leu", symbol: "L", locale: "ro-MD" },
  { code: "MKD", name: "Macedonian Denar", symbol: "ден", locale: "mk-MK" },
  { code: "ALL", name: "Albanian Lek", symbol: "L", locale: "sq-AL" },
  { code: "BAM", name: "Bosnia Mark", symbol: "KM", locale: "bs-BA" },
  { code: "ZAR", name: "South African Rand", symbol: "R", locale: "en-ZA" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", locale: "en-NG" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", locale: "en-GH" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", locale: "sw-KE" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", locale: "sw-UG" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", locale: "sw-TZ" },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", locale: "rw-RW" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", locale: "am-ET" },
  { code: "SOS", name: "Somali Shilling", symbol: "Sh", locale: "so-SO" },
  { code: "SDG", name: "Sudanese Pound", symbol: "£S", locale: "ar-SD" },
  { code: "LYD", name: "Libyan Dinar", symbol: "ل.د", locale: "ar-LY" },
  { code: "TND", name: "Tunisian Dinar", symbol: "د.ت", locale: "ar-TN" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م.", locale: "ar-MA" },
  { code: "DZD", name: "Algerian Dinar", symbol: "دج", locale: "ar-DZ" },
  { code: "AOA", name: "Angolan Kwanza", symbol: "Kz", locale: "pt-AO" },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", locale: "en-ZM" },
  { code: "BWP", name: "Botswana Pula", symbol: "P", locale: "en-BW" },
  { code: "NAD", name: "Namibian Dollar", symbol: "N$", locale: "en-NA" },
  { code: "MUR", name: "Mauritian Rupee", symbol: "₨", locale: "en-MU" },
  { code: "MZN", name: "Mozambique Metical", symbol: "MT", locale: "pt-MZ" },
  { code: "GMD", name: "Gambian Dalasi", symbol: "D", locale: "en-GM" },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", locale: "fr-SN" },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", locale: "fr-CM" },
  { code: "MXN", name: "Mexican Peso", symbol: "$", locale: "es-MX" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", locale: "pt-BR" },
  { code: "ARS", name: "Argentine Peso", symbol: "$", locale: "es-AR" },
  { code: "CLP", name: "Chilean Peso", symbol: "$", locale: "es-CL" },
  { code: "COP", name: "Colombian Peso", symbol: "$", locale: "es-CO" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", locale: "es-PE" },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", locale: "es-UY" },
  { code: "PYG", name: "Paraguayan Guarani", symbol: "₲", locale: "es-PY" },
  { code: "BOB", name: "Bolivian Boliviano", symbol: "Bs", locale: "es-BO" },
  { code: "VES", name: "Venezuelan Bolivar", symbol: "Bs", locale: "es-VE" },
  { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q", locale: "es-GT" },
  { code: "HNL", name: "Honduran Lempira", symbol: "L", locale: "es-HN" },
  { code: "NIO", name: "Nicaraguan Cordoba", symbol: "C$", locale: "es-NI" },
  { code: "CRC", name: "Costa Rican Colon", symbol: "₡", locale: "es-CR" },
  { code: "PAB", name: "Panamanian Balboa", symbol: "B/.", locale: "es-PA" },
  { code: "DOP", name: "Dominican Peso", symbol: "RD$", locale: "es-DO" },
  { code: "CUP", name: "Cuban Peso", symbol: "$MN", locale: "es-CU" },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$", locale: "en-JM" },
  { code: "TTD", name: "Trinidad Dollar", symbol: "TT$", locale: "en-TT" },
  { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$", locale: "en-BB" },
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$", locale: "en-BS" },
  { code: "BZD", name: "Belize Dollar", symbol: "BZ$", locale: "en-BZ" },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", locale: "en-GD" },
  { code: "AWG", name: "Aruban Florin", symbol: "ƒ", locale: "nl-AW" },
  { code: "ANG", name: "Netherlands Antillean Guilder", symbol: "ƒ", locale: "nl-SX" },
  { code: "SRD", name: "Surinamese Dollar", symbol: "Sr$", locale: "nl-SR" },
  { code: "GYD", name: "Guyanese Dollar", symbol: "G$", locale: "en-GY" },
  { code: "FJD", name: "Fijian Dollar", symbol: "FJ$", locale: "en-FJ" },
  { code: "PGK", name: "Papua New Guinea Kina", symbol: "K", locale: "en-PG" },
  { code: "SBD", name: "Solomon Islands Dollar", symbol: "SI$", locale: "en-SB" },
  { code: "VUV", name: "Vanuatu Vatu", symbol: "Vt", locale: "en-VU" },
  { code: "WST", name: "Samoan Tala", symbol: "WS$", locale: "en-WS" },
  { code: "TOP", name: "Tongan Pa'anga", symbol: "T$", locale: "en-TO" },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", locale: "kk-KZ" },
  { code: "UZS", name: "Uzbekistani Som", symbol: "сўм", locale: "uz-UZ" },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "₼", locale: "az-AZ" },
  { code: "GEL", name: "Georgian Lari", symbol: "₾", locale: "ka-GE" },
  { code: "AMD", name: "Armenian Dram", symbol: "֏", locale: "hy-AM" },
  { code: "BYN", name: "Belarusian Ruble", symbol: "Br", locale: "be-BY" },
  { code: "KGS", name: "Kyrgyzstani Som", symbol: "с", locale: "ky-KG" },
  { code: "TJS", name: "Tajikistani Somoni", symbol: "ЅМ", locale: "tg-TJ" },
  { code: "TMT", name: "Turkmenistani Manat", symbol: "m", locale: "tk-TM" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", locale: "he-IL" },
  { code: "JEP", name: "Jersey Pound", symbol: "£", locale: "en-JE" },
  { code: "GGP", name: "Guernsey Pound", symbol: "£", locale: "en-GG" },
  { code: "IMP", name: "Isle of Man Pound", symbol: "£", locale: "en-IM" },
  { code: "FOK", name: "Faroese Krone", symbol: "kr", locale: "fo-FO" },
  { code: "GIP", name: "Gibraltar Pound", symbol: "£", locale: "en-GI" },
  { code: "FKP", name: "Falkland Islands Pound", symbol: "£", locale: "en-FK" },
  { code: "SHP", name: "Saint Helena Pound", symbol: "£", locale: "en-SH" },
  { code: "KYD", name: "Cayman Islands Dollar", symbol: "KY$", locale: "en-KY" },
  { code: "BMD", name: "Bermudian Dollar", symbol: "BD$", locale: "en-BM" },
];

function findCurrency(code?: string): WorldCurrency {
  if (!code) return WORLD_CURRENCIES[0];
  return WORLD_CURRENCIES.find((c) => c.code === code) || WORLD_CURRENCIES[0];
}

function matchesCurrency(c: WorldCurrency, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    c.code.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.symbol.toLowerCase().includes(q) ||
    c.locale.toLowerCase().includes(q)
  );
}

const EXCHANGE_RATE_SHEET_NAME = "Exchange Rates";

const activeExchangeRates: Record<string, number> = {};
let userExchangeRatesActive = false;

const DEFAULT_EXCHANGE_RATES_TO_USD: Record<string, number> = {
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

function rateKey(from: string, to: string) {
  return `${from}-${to}`;
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getUsdRate(currencyCode: string): number | null {
  if (currencyCode === "USD") return 1;

  const direct = activeExchangeRates[rateKey(currencyCode, "USD")];
  if (isValidRate(direct)) return direct;

  const reverse = activeExchangeRates[rateKey("USD", currencyCode)];
  if (isValidRate(reverse)) return 1 / reverse;

  const fallback = DEFAULT_EXCHANGE_RATES_TO_USD[currencyCode];
  return typeof fallback === "number" && fallback > 0 ? fallback : null;
}


function getExchangeRate(from: string, to: string): number {
  return libGetExchangeRate(from, to);
}


function syncExchangeRates(allSheets: WorkbookSheet[]): void {
  const rateSheet = allSheets.find(
    (item) =>
      item.name.trim().toLowerCase() === EXCHANGE_RATE_SHEET_NAME.toLowerCase()
  );

  const next: Record<string, number> = {};

  if (rateSheet) {
    for (let row = 1; row < rateSheet.gridRows; row += 1) {
      const from = String(rateSheet.cells[cellKey(row, 0)]?.value ?? "").trim().toUpperCase();
      const to = String(rateSheet.cells[cellKey(row, 1)]?.value ?? "").trim().toUpperCase();
      // [স্টেপ ১] বাংলা/আরবি অঙ্কে লেখা রেটও (যেমন "১২২.৫০") গ্রহণযোগ্য
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


function formatCurrencyValue(rawNumeric: number, currencyCode: string, decimals: number): string {
  const currency = findCurrency(currencyCode);
  // [হিসাব-সংশোধন] -0.001 আগে "-$0.00" দেখাত; আগে রাউন্ড করলে "-0" থাকে না
  const numeric = roundHalfAway(rawNumeric, Math.max(0, Math.min(Math.trunc(decimals) || 0, 20)));
  try {
    const displayLocale = DISPLAY_SETTINGS.grouping === "bd" ? "en-IN" : currency.locale;
    return numeric.toLocaleString(displayLocale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    try {
      return numeric.toLocaleString("en-US", {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch {
      return currency.symbol + numeric.toFixed(decimals);
    }
  }
}


const COMMON_WORDS = new Set(
  `
a able about above accept according account across act action active activity add address administration after again against age ago agree agreement ahead air all allow almost alone along already also although always am among amount an analysis and annual another answer any anyone anything appear application apply are area around as ask asset at available average away back balance bank base based be because become been before begin behavior behind being believe below benefit best better between big bill billion bit board body book both break bring budget business but buy by call can capital car care case cash cause cell center central certain change chart check child city claim class clear close cloud code column come company compare complete condition consider control cost could country create current customer cut data date day deal decide decision default delete department design detail develop development did different direct display do document does done down download drive during each early economic edit education effect employee end enough enter entry equal error especially estimate even every example exchange expense export fact factor fail family far feature field file filter final finance find first fixed follow following font for force form formula free freeze from full function future general get give global go goal good government graph great group grow half hand happen hard has have he head help here high history home hour how however human idea if image import in include income increase index industry information input insert interest international into investment invoice is issue it item its job join just keep key kind large last later law layout lead learn least left legal level line link list load local long look loss low made main make management many map market match may me mean measure member menu merge method might million mind minimum minute mode model month more move much multiple must name native navigation need net new next no normal not note now number object of off offer office old on once one online only open operation option or order organization other out output over own page panel paper part particular pass paste payment people percent performance period person place plan point policy position possible power present price print process product production program project property provide purchase put quality question range rate rather raw read real receive record red reduce reference replace report request required result return revenue review right rise risk role row rule run sale same save say screen search second section secure see select selection sell send server service set sheet should show simple since size small so software source specific spell spreadsheet staff standard start state statement status step still storage strategy strong style subject success such sum support system table target tax team technology term text than that the their them then there these they thing think this those through time title to today together tool top total toward transaction true turn type under unit update upload use user value version very view want way we week well were what when where whether which while who whole why width will with within without word work workflow world would write year yes you
`.split(/\s+/).filter(Boolean)
);

let sheetIdCounter = 0;

function createSheet(name = "Sheet 1", uniqueSuffix = "init"): WorkbookSheet {
  return {
    id: `sheet_${uniqueSuffix}_${++sheetIdCounter}`,
    name,
    gridRows: DEFAULT_ROWS,
    gridCols: DEFAULT_COLS,
    cells: {},
    groups: [],
    hiddenRows: [],
    colGroups: [],
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
  };
}

function colToLetter(col: number): string {
  let n = col + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function letterToCol(letters: string): number {
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
}

function cellKey(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`;
}

function parseKey(key: string): { row: number; col: number } | null {
  const m = /^([A-Za-z]+)(\d+)$/.exec(key.trim());
  if (!m) return null;
  return { row: parseInt(m[2], 10) - 1, col: letterToCol(m[1].toUpperCase()) };
}

// ডেটা আছে এমন সর্বশেষ রো (০-ভিত্তিক); কিছু না থাকলে -1
function getLastUsedRow(cells: CellMap): number {
  let last = -1;
  for (const [key, data] of Object.entries(cells)) {
    if (!data || (data.value === "" && !data.image)) continue;
    const pos = parseKey(key);
    if (pos && pos.row > last) last = pos.row;
  }
  return last;
}

let measureCanvas: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, font: string): number {
  if (typeof document === "undefined") return 0;
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text || " ").width;
}

function rangeTouchesMergedCells(
  targetSheet: WorkbookSheet,
  range: SelectionRange
): boolean {
  const r1 = Math.min(range.r1, range.r2);
  const r2 = Math.max(range.r1, range.r2);
  const c1 = Math.min(range.c1, range.c2);
  const c2 = Math.max(range.c1, range.c2);

  return Object.entries(targetSheet.cells).some(([key, cell]) => {
    const position = parseKey(key);

    if (!position) {
      return false;
    }

    const rowSpan = cell.rowSpan || 1;
    const colSpan = cell.colSpan || 1;

    const isMerged =
      Boolean(cell.mergedInto) ||
      rowSpan > 1 ||
      colSpan > 1;

    if (!isMerged) {
      return false;
    }

    const endRow = position.row + rowSpan - 1;
    const endCol = position.col + colSpan - 1;

    return (
      position.row <= r2 &&
      endRow >= r1 &&
      position.col <= c2 &&
      endCol >= c1
    );
  });
}


function normalizeRange(range: string): { r1: number; c1: number; r2: number; c2: number } | null {
  // [স্টেপ ১] পুরো কলাম সমর্থিত: A:A, A1:A ইত্যাদি
  const parts = range.split(":").map((x) => x.trim().toUpperCase());
  const a = parts[0] ?? "";
  const b = parts[1] ?? a;
  const expand = (ref: string, isEnd: boolean): string => {
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


/* ============================================================================
 * [হিসাব-সংশোধন] সংখ্যা পরিচ্ছন্নতা + ফর্মুলা রেফারেন্স রিরাইটার
 * - cleanNumber: 0.1+0.2 = 0.30000000000000004 জাতীয় ভাসমান-বিন্দুর ভুল ১৫ অঙ্কে ঠিক করে
 * - rewriteFormulaReferences: ফর্মুলার সেল রেফারেন্স ($ সহ, শিট-প্রিফিক্স সহ) নিরাপদে বদলায়
 *   (কপি/পেস্ট, ফিল, সর্ট, সারি/কলাম ঢোকানো-মোছা, শিট রিনেম — সবখানে একই ইঞ্জিন)
 * ========================================================================== */
function cleanNumber(n: number): number {
  if (!Number.isFinite(n)) return n;
  if (n === 0) return 0;
  return Number(n.toPrecision(15));
}

// ঠিক ১০ এর ঘাত ব্যবহার করে অর্ধেক-থেকে-দূরে (Excel-এর মতো) রাউন্ডিং: 1.005 → 1.01, 2.5 → 3, -2.5 → -3
function roundHalfAway(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const shift = (x: number, d: number): number => {
    const [m, e = "0"] = String(x).split("e");
    return Number(`${m}e${Number(e) + d}`);
  };
  const result = sign * shift(Math.round(shift(abs, digits)), -digits);
  return Object.is(result, -0) ? 0 : result;
}

// [স্টেপ ২] বাংলাদেশি লাখ-কোটি গ্রুপিং ও বাংলা/আরবি অঙ্ক প্রদর্শন
type DisplayGrouping = "western" | "bd";
type DisplayDigits = "latin" | "bengali" | "arabic";

const DISPLAY_SETTINGS: { grouping: DisplayGrouping; digits: DisplayDigits } = {
  grouping: "western",
  digits: "latin",
};

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toDisplayDigits(text: string): string {
  if (DISPLAY_SETTINGS.digits === "latin") return text;
  const map = DISPLAY_SETTINGS.digits === "bengali" ? BENGALI_DIGITS : ARABIC_DIGITS;
  return text.replace(/[0-9]/g, (d) => map[Number(d)]);
}

function formatDisplayNumber(value: number, decimals: number | null = null): string {
  const d = decimals === null ? undefined : Math.max(0, Math.min(Math.trunc(decimals), 10));
  const locale = DISPLAY_SETTINGS.grouping === "bd" ? "en-IN" : "en-US";
  let text: string;
  try {
    text = value.toLocaleString(locale, d === undefined ? { maximumFractionDigits: 10 } : { minimumFractionDigits: d, maximumFractionDigits: d });
  } catch {
    text = value.toLocaleString("en-US", d === undefined ? { maximumFractionDigits: 10 } : { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  return toDisplayDigits(text);
}

function excelDateToSerial(date: Date): number {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000);
}

function parseDateTextToSerial(text: string): number | null {
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

interface FormulaRefInfo {
  sheet: string | null;
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  absR1: boolean;
  absC1: boolean;
  absR2: boolean;
  absC2: boolean;
  isRange: boolean;
}

const FORMULA_REF_PATTERN =
  /(?<![A-Za-z0-9_.$!'])((?:'[^']+'|[A-Za-z_][A-Za-z0-9_]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?::(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7}))?(?![A-Za-z0-9_(])/g;

function formatSheetPrefix(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? `${name}!` : `'${name}'!`;
}

function formatFormulaRef(ref: FormulaRefInfo): string {
  const prefix = ref.sheet ? formatSheetPrefix(ref.sheet) : "";
  const a = `${ref.absC1 ? "$" : ""}${colToLetter(ref.c1)}${ref.absR1 ? "$" : ""}${ref.r1 + 1}`;
  if (!ref.isRange) return `${prefix}${a}`;
  const b = `${ref.absC2 ? "$" : ""}${colToLetter(ref.c2)}${ref.absR2 ? "$" : ""}${ref.r2 + 1}`;
  return `${prefix}${a}:${b}`;
}

// rewrite() null ফেরত দিলে সেই রেফারেন্স #REF! হয়ে যায়
function rewriteFormulaReferences(
  formula: string,
  rewrite: (ref: FormulaRefInfo) => FormulaRefInfo | null
): string {
  const parts = formula.split(/("[^"]*")/);
  return parts
    .map((part, index) => {
      if (index % 2 === 1) return part; // স্ট্রিং লিটারেল অপরিবর্তিত
      return part.replace(
        FORMULA_REF_PATTERN,
        (
          match: string,
          sheetPart: string | undefined,
          a1: string,
          col1: string,
          b1: string,
          row1: string,
          a2: string | undefined,
          col2: string | undefined,
          b2: string | undefined,
          row2: string | undefined
        ) => {
          const c1 = letterToCol(col1.toUpperCase());
          const r1 = parseInt(row1, 10) - 1;
          if (c1 >= MAX_COLS || r1 < 0 || r1 >= MAX_ROWS) return match;

          let c2 = c1;
          let r2 = r1;
          const isRange = col2 !== undefined && row2 !== undefined;
          if (isRange) {
            c2 = letterToCol((col2 as string).toUpperCase());
            r2 = parseInt(row2 as string, 10) - 1;
            if (c2 >= MAX_COLS || r2 < 0 || r2 >= MAX_ROWS) return match;
          }

          let sheet: string | null = null;
          if (sheetPart) {
            const raw = sheetPart.slice(0, -1);
            sheet = raw.startsWith("'") ? raw.slice(1, -1) : raw;
          }

          const next = rewrite({
            sheet,
            r1,
            c1,
            r2,
            c2,
            absR1: b1 === "$",
            absC1: a1 === "$",
            absR2: b2 === "$",
            absC2: a2 === "$",
            isRange,
          });

          return next ? formatFormulaRef(next) : "#REF!";
        }
      );
    })
    .join("");
}

interface StructuralChange {
  axis: "row" | "col";
  kind: "insert" | "delete";
  at: number;
  count?: number;
}

function adjustIndexSpan(lo: number, hi: number, change: StructuralChange): [number, number] | null {
  const n = change.count ?? 1;
  const at = change.at;
  if (change.kind === "insert") {
    return [lo >= at ? lo + n : lo, hi >= at ? hi + n : hi];
  }
  const deletedEnd = at + n - 1;
  const newLo = lo > deletedEnd ? lo - n : lo >= at ? at : lo;
  const newHi = hi > deletedEnd ? hi - n : hi >= at ? at - 1 : hi;
  if (newHi < newLo) return null;
  return [newLo, newHi];
}

function adjustRefForStructuralChange(ref: FormulaRefInfo, change: StructuralChange): FormulaRefInfo | null {
  if (change.axis === "row") {
    const span = adjustIndexSpan(ref.r1, ref.r2, change);
    return span ? { ...ref, r1: span[0], r2: span[1] } : null;
  }
  const span = adjustIndexSpan(ref.c1, ref.c2, change);
  return span ? { ...ref, c1: span[0], c2: span[1] } : null;
}

function sameSheetName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// ওয়ার্কবুকের সব শিটের সব ফর্মুলায় rewriteFor(মালিক-শিট) দিয়ে রেফারেন্স বদলায়
function rewriteWorkbookFormulas(
  allSheets: WorkbookSheet[],
  rewriteFor: (owner: WorkbookSheet) => (ref: FormulaRefInfo) => FormulaRefInfo | null
): WorkbookSheet[] {
  return allSheets.map((owner) => {
    const rewrite = rewriteFor(owner);
    let nextCells: CellMap | null = null;

    for (const [key, cell] of Object.entries(owner.cells)) {
      if (!cell || typeof cell.value !== "string" || !cell.value.startsWith("=")) continue;
      const updated = "=" + rewriteFormulaReferences(cell.value.slice(1), rewrite);
      if (updated === cell.value) continue;
      if (!nextCells) nextCells = { ...owner.cells };
      nextCells[key] = { ...cell, value: updated };
    }

    return nextCells ? { ...owner, cells: nextCells } : owner;
  });
}

// সারি/কলাম ঢোকানো বা মোছার পর সব ফর্মুলা, চার্ট, কন্ডিশনাল রুল, নামকরা রেঞ্জ ও স্পার্কলাইন ঠিক রাখে
function applyStructuralChangeToWorkbook(
  allSheets: WorkbookSheet[],
  targetSheetId: string,
  change: StructuralChange
): WorkbookSheet[] {
  const target = allSheets.find((item) => item.id === targetSheetId);
  if (!target) return allSheets;

  const rewritten = rewriteWorkbookFormulas(allSheets, (owner) => (ref) => {
    const refSheet = ref.sheet ?? owner.name;
    if (!sameSheetName(refSheet, target.name)) return ref;
    return adjustRefForStructuralChange(ref, change);
  });

  const adjustPlainRange = (text: string | undefined): string | undefined => {
    if (!text) return text;
    let touched = false;
    const next = rewriteFormulaReferences(text, (ref) => {
      const adjusted = adjustRefForStructuralChange(ref, change);
      if (!adjusted) return ref; // পুরো রেঞ্জ মুছে গেলে আগেরটাই থাক, যাতে চার্ট/রুল ভেঙে না যায়
      touched = true;
      return adjusted;
    });
    return touched ? next : text;
  };

  return rewritten.map((item) => {
    if (item.id !== targetSheetId) return item;

    const nextCells: CellMap = { ...item.cells };
    for (const [key, cell] of Object.entries(item.cells)) {
      if (cell?.sparkline) {
        const sparkline = adjustPlainRange(cell.sparkline);
        if (sparkline !== cell.sparkline) nextCells[key] = { ...cell, sparkline };
      }
    }

    const namedRanges: Record<string, string> = {};
    for (const [name, range] of Object.entries(item.namedRanges || {})) {
      namedRanges[name] = adjustPlainRange(range) ?? range;
    }

    return {
      ...item,
      cells: nextCells,
      namedRanges,
      charts: (item.charts || []).map((chart) => ({
        ...chart,
        range: adjustPlainRange(chart.range) ?? chart.range,
        series: chart.series?.map((series) => ({
          ...series,
          range: adjustPlainRange(series.range) ?? series.range,
        })),
      })),
      conditionalRules: (item.conditionalRules || []).map((rule) => ({
        ...rule,
        range: adjustPlainRange(rule.range) ?? rule.range,
      })),
    };
  });
}

function getShapeAnchorPoint(shape: DrawShape, side: ConnectorSide): { x: number; y: number } {
  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;
  if (side === "top") return { x: cx, y: shape.y };
  if (side === "bottom") return { x: cx, y: shape.y + shape.h };
  if (side === "left") return { x: shape.x, y: cy };
  return { x: shape.x + shape.w, y: cy };
}

function nearestShapeSide(shape: DrawShape, pt: { x: number; y: number }): ConnectorSide {
  const distTop = Math.abs(pt.y - shape.y);
  const distBottom = Math.abs(pt.y - (shape.y + shape.h));
  const distLeft = Math.abs(pt.x - shape.x);
  const distRight = Math.abs(pt.x - (shape.x + shape.w));
  const min = Math.min(distTop, distBottom, distLeft, distRight);
  if (min === distTop) return "top";
  if (min === distBottom) return "bottom";
  if (min === distLeft) return "left";
  return "right";
}

function hitTestBoxShape(pt: { x: number; y: number }, shapes: DrawShape[]): DrawShape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if ((s.type === "rectangle" || s.type === "ellipse") && pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h) return s;
  }
  return null;
}

function resolveConnectorPoint(shape: DrawShape, end: "start" | "end", shapes: DrawShape[]): { x: number; y: number } {
  const attach = end === "start" ? shape.startAttach : shape.endAttach;
  const fallback = end === "start" ? shape.startPoint : shape.endPoint;
  if (attach) {
    const target = shapes.find((s) => s.id === attach.id);
    if (target) return getShapeAnchorPoint(target, attach.side);
  }
  return fallback || { x: shape.x, y: shape.y };
}

function elbowPath(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const midX = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
}

/* ============================================================================
 * Formula engine
 * ========================================================================== */

type TokenType = "num" | "str" | "ref" | "range" | "ident" | "op" | "lparen" | "rparen" | "comma" | "end";
interface Token {
  type: TokenType;
  value: string;
}

// $A$1 / A$1 / $A1 — absolute চিহ্ন হিসাবের সময় অপ্রয়োজনীয়; স্ট্রিং ও 'শিট নাম'-এর বাইরের $ সরানো হয়
function stripAbsoluteMarkers(src: string): string {
  let out = "";
  let quote: string | null = null;
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
function normalizeDigitsOutsideQuotes(src: string): string {
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

function tokenize(rawSrc: string): Token[] {
  const src = normalizeDigitsOutsideQuotes(stripAbsoluteMarkers(rawSrc));
  const tokens: Token[] = [];
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

type Node =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "ref"; value: string }
  | { kind: "range"; value: string }
  | { kind: "call"; name: string; args: Node[] }
  | { kind: "bin"; op: string; left: Node; right: Node }
  | { kind: "neg"; node: Node };

class FormulaParser {
  tokens: Token[];
  pos = 0;
  constructor(src: string) {
    this.tokens = tokenize(src);
  }
  peek() {
    return this.tokens[this.pos];
  }
  next() {
    return this.tokens[this.pos++];
  }
  parse(): Node {
    // খালি ফর্মুলা ("=") আগের মতোই ০
    if (this.peek().type === "end") return { kind: "num", value: 0 };
    const node = this.parseCompare();
    // [হিসাব-সংশোধন] "=1 2" বা "=SUM(A1) )" আগে অবশিষ্ট অংশ ফেলে দিয়ে ভুল ফল দিত — এখন এরর
    if (this.peek().type !== "end") throw new Error("Unexpected token");
    return node;
  }
  parseCompare(): Node {
    let left = this.parseConcat();
    while (this.peek().type === "op" && ["<", ">", "<=", ">=", "=", "<>"].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "bin", op, left, right: this.parseConcat() };
    }
    return left;
  }
  parseConcat(): Node {
    let left = this.parseAdd();
    while (this.peek().type === "op" && this.peek().value === "&") {
      this.next();
      left = { kind: "bin", op: "&", left, right: this.parseAdd() };
    }
    return left;
  }
  parseAdd(): Node {
    let left = this.parseMul();
    while (this.peek().type === "op" && ["+", "-"].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "bin", op, left, right: this.parseMul() };
    }
    return left;
  }
  parseMul(): Node {
    let left = this.parsePow();
    while (this.peek().type === "op" && ["*", "/"].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "bin", op, left, right: this.parsePow() };
    }
    return left;
  }
  parsePow(): Node {
    let left = this.parseUnary();
    while (this.peek().type === "op" && this.peek().value === "^") {
      this.next();
      left = { kind: "bin", op: "^", left, right: this.parseUnary() };
    }
    return left;
  }
  parseUnary(): Node {
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
  parsePrimary(): Node {
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
      const args: Node[] = [];
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
function toNumber(v: EvalResult): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  const parsed = strictNumber(v);
  return parsed === null ? 0 : parsed;
}

// পুরো টেক্সটটাই সংখ্যা হলে সংখ্যা, নাহলে null ("12abc" আর আংশিকভাবে ১২ হয় না)
function strictNumber(v: EvalResult): number | null {
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
function operandNumber(v: EvalResult): number | "#VALUE!" {
  if (typeof v === "number") return Number.isFinite(v) ? v : "#VALUE!";
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === "" || (typeof v === "string" && v.trim() === "")) return 0;
  const parsed = strictNumber(v);
  return parsed === null ? "#VALUE!" : parsed;
}

const NUMERIC_RE = /^-?(?:(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d+)?|\.\d+)$/;
// ভারতীয়/বাংলাদেশি গ্রুপিং: 1,25,000 / 12,50,000.50 / 1,00,00,000
const INDIAN_GROUPED_RE = /^-?[1-9]\d{0,1}(?:,\d{2})+,\d{3}(?:\.\d+)?$/;

const FORMULA_ERRORS = new Set<string>(["#DIV/0!", "#NAME?", "#ERROR!", "#CIRCULAR!", "#VALUE!", "#REF!", "#N/A", "#NUM!"]);

// শুধু http(s)/mailto/tel এবং সাইটের নিজস্ব পাথ (/...) অনুমোদিত; javascript:, data: ইত্যাদি বাতিল
function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const u = input.trim();
  if (!u || u.length > 2048) return null;
  if (/^\/(?!\/)/.test(u)) return u;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(u)) return u;
  return null;
}

// শুধু আসল সংখ্যা হলে number ফেরত দেয়; "2nd floor", "2024-01-01", "01712345678" টেক্সটই থাকে
function parseNumericCell(raw: string): number | string {
  // [স্টেপ ১] "১২৫", "১,২৫,০০০"-এর মতো বাংলা অঙ্কের সেলও সংখ্যা; টেক্সট হলে মূল লেখাই থাকে
  const s = normalizeLocalizedDigits(raw.trim()).replace(/\u066B/g, ".").replace(/[\u066C\u060C]/g, ",");
  if (NUMERIC_RE.test(s)) return Number(s.replace(/,/g, ""));
  // ভারতীয়/বাংলাদেশি গ্রুপিং: 1,25,000
  if (INDIAN_GROUPED_RE.test(s)) return Number(s.replace(/,/g, ""));
  return raw;
}

// COUNTIF/SUMIF-এর মানদণ্ড: "text", 5, ">3", "<=10", "<>x", "=x", "<>"
function matchesCriterion(value: EvalResult, criterion: EvalResult): boolean {
  const text = normalizeLocalizedDigits(String(criterion).trim());
  const valueText = normalizeLocalizedDigits(String(value).trim());

  if (text === "") return valueText === "";
  if (text === "<>") return valueText !== "";

  const operator = /^(>=|<=|<>|>|<|=)/.exec(text)?.[1] ?? "";
  const operand = text.slice(operator.length).trim();
  const operandNumber = operand === "" ? NaN : Number(operand);
  const isNumber = Number.isFinite(operandNumber);

  const equalsOperand = (): boolean => {
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
let currentEvalCellKey: string | null = null;

// [নতুন ফাংশন] SUBSTITUTE, FIND, SEARCH, PROPER, CONCATENATE, VALUE, AVERAGEIF(S), SUMPRODUCT, LARGE, SMALL,
// RANK, CEILING, FLOOR, ISBLANK, ISNUMBER, ROW, COLUMN, RAND, PMT — চেনা না গেলে undefined (তখন #NAME? আসে)
function evalExtraFunction(
  node: { kind: "call"; name: string; args: Node[] },
  getCell: (key: string) => EvalResult,
  expandRange: (range: string) => EvalResult[]
): EvalResult | undefined {
  const args = node.args;
  const isErr = (v: EvalResult): boolean => typeof v === "string" && FORMULA_ERRORS.has(v);
  const ev = (i: number): EvalResult => evalNode(args[i], getCell, expandRange);
  const asText = (v: EvalResult): string => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v));
  const listOf = (arg: Node): EvalResult[] =>
    arg.kind === "range" ? expandRange(arg.value) : arg.kind === "ref" ? [getCell(arg.value)] : [evalNode(arg, getCell, expandRange)];
  const stripSheet = (ref: string): string => ref.slice(ref.lastIndexOf("!") + 1);

  switch (node.name) {
    case "CONCATENATE": {
      const out: string[] = [];
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
      const pairs: Array<[EvalResult[], EvalResult]> = [];
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
      const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
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
      const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
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
      let key: string | null = null;
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
      const vals: number[] = [];
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
      // [ধাপ ২] নতুন ফাংশন (INDEX, MATCH, DATE, SUBTOTAL ...) — একই লজিক lib/formula-core.mjs-এ
      return libEvalMoreFunction(node, getCell, expandRange, evalNode, currentEvalContext);
  }
}

function evalNode(node: Node, getCell: (key: string) => EvalResult, expandRange: (range: string) => EvalResult[]): EvalResult {
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
        const asText = (v: EvalResult): string => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v));
        return `${asText(l)}${asText(r)}`;
      }
      if (["<", ">", "<=", ">=", "=", "<>"].includes(node.op)) {
        if (typeof l === "string" && FORMULA_ERRORS.has(l)) {
          return l;
        }

        if (typeof r === "string" && FORMULA_ERRORS.has(r)) {
          return r;
        }

        let left: EvalResult = l;
        let right: EvalResult = r;

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

        let comparison: number;

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
          const typeRank = (value: EvalResult): number => {
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
      let arithmetic: number;
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
      const rewrittenCall = libRewriteDynamicArgs(node, getCell, expandRange, evalNode, currentEvalContext) as typeof node;
      if (rewrittenCall !== node) return evalNode(rewrittenCall, getCell, expandRange);
      const collect = () => {
        const out: EvalResult[] = [];
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
            (value): value is number =>
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

          const toList = (arg: Node): EvalResult[] =>
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
          let ok: boolean;
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

          const parseArgument = (
            input: EvalResult
          ): number | null => {
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
            (value): value is number =>
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
          const numbers = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
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
          const toList = (arg: typeof node.args[number]): EvalResult[] =>
            arg.kind === "range" ? expandRange(arg.value) : arg.kind === "ref" ? [getCell(arg.value)] : [];
          const sumRange = toList(node.args[0]);
          const pairs: Array<[EvalResult[], EvalResult]> = [];
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
          const toList = (arg: typeof node.args[number]): EvalResult[] =>
            arg.kind === "range" ? expandRange(arg.value) : arg.kind === "ref" ? [getCell(arg.value)] : [];
          const first = toList(node.args[0]);
          const pairs: Array<[EvalResult[], EvalResult]> = [];
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
          const firstColumn: EvalResult[] = [];
          const resultColumn: EvalResult[] = [];
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
          const lookupVals: EvalResult[] = [];
          const returnVals: EvalResult[] = [];
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
          const matchMode = Math.trunc(matchModeRaw as number);
          const searchMode = Math.trunc(searchModeRaw as number);
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
            let bestVal: number | null = null;
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
          const lookupVals: EvalResult[] = [];
          if (lookupNr.c1 === lookupNr.c2) {
            for (let r = lookupNr.r1; r <= lookupNr.r2; r++) lookupVals.push(getCell(cellKey(r, lookupNr.c1)));
          } else {
            for (let c = lookupNr.c1; c <= lookupNr.c2; c++) lookupVals.push(getCell(cellKey(lookupNr.r1, c)));
          }
          const matchModeRaw = node.args[2] ? operandNumber(evalNode(node.args[2], getCell, expandRange)) : 0;
          const searchModeRaw = node.args[3] ? operandNumber(evalNode(node.args[3], getCell, expandRange)) : 1;
          if (matchModeRaw === "#VALUE!" || searchModeRaw === "#VALUE!") return "#VALUE!";
          const matchMode = Math.trunc(matchModeRaw as number);
          const searchMode = Math.trunc(searchModeRaw as number);
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
            let bestVal: number | null = null;
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
          const values: EvalResult[] = [];
          for (let r = nr.r1; r <= nr.r2; r++) {
            for (let c = nr.c1; c <= nr.c2; c++) values.push(getCell(cellKey(r, c)));
          }
          const include: boolean[] = values.map(() => true);
          for (let a = 1; a < node.args.length; a++) {
            const condArg = node.args[a];
            if (condArg.kind !== "range") return "#VALUE!";
            const cnr = normalizeRange(condArg.value);
            if (!cnr) return "#REF!";
            const condVals: EvalResult[] = [];
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
          const values: EvalResult[] = [];
          for (let r = nr.r1; r <= nr.r2; r++) {
            for (let c = nr.c1; c <= nr.c2; c++) values.push(getCell(cellKey(r, c)));
          }
          const orderRaw = node.args[2] ? operandNumber(evalNode(node.args[2], getCell, expandRange)) : 1;
          if (orderRaw === "#VALUE!") return "#VALUE!";
          const order = Math.trunc(orderRaw as number);
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
          const values: EvalResult[] = [];
          for (let r = nr.r1; r <= nr.r2; r++) {
            for (let c = nr.c1; c <= nr.c2; c++) values.push(getCell(cellKey(r, c)));
          }
          const seen = new Set<string>();
          const unique: EvalResult[] = [];
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
          const rows = Math.trunc(rowsRaw as number);
          const colsRaw = node.args[1] ? operandNumber(evalNode(node.args[1], getCell, expandRange)) : 1;
          if (colsRaw === "#VALUE!") return "#VALUE!";
          const cols = Math.trunc(colsRaw as number);
          const startRaw = node.args[2] ? operandNumber(evalNode(node.args[2], getCell, expandRange)) : 1;
          if (startRaw === "#VALUE!") return "#VALUE!";
          const start = startRaw as number;
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
          const parts: string[] = [];
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
            (value): value is number =>
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

function evaluateFormula(formula: string, getCell: (key: string) => EvalResult, expandRange: (range: string) => EvalResult[]): EvalResult {
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
const splitSheetReference = (
  reference: string
): { sheetName: string | null; reference: string } => {
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
let currentEvalContext: { sheet: WorkbookSheet; allSheets: WorkbookSheet[] } | null = null;

function getCellValueInSheet(
  targetSheet: WorkbookSheet,
  key: string,
  visiting: Set<string> = new Set(),
  allSheets: WorkbookSheet[] = [targetSheet]
): EvalResult {
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

  const findSheet = (name: string): WorkbookSheet | undefined =>
    allSheets.find((item) => sameSheetName(item.name, name));

  // [হিসাব-সংশোধন] আগে 'Sheet2!A1' মূল শিটের সেল ধরে "" ফেরত দিত — এখন সঠিক শিটে খোঁজে (এক্সপোর্টে ভুল মান আসত)
  const getCell = (ref: string): EvalResult => {
    const { sheetName, reference } = splitSheetReference(ref);
    if (!sheetName) return getCellValueInSheet(targetSheet, reference, nextVisiting, allSheets);
    const other = findSheet(sheetName);
    if (!other) return "#REF!";
    return getCellValueInSheet(other, reference, nextVisiting, allSheets);
  };
  const expandRange = (range: string): EvalResult[] => {
    const { sheetName, reference } = splitSheetReference(range);
    const rangeSheet = sheetName ? findSheet(sheetName) : targetSheet;
    if (!rangeSheet) return ["#REF!"];
    const nr = normalizeRange(reference);
    if (!nr) return [];
    const usedLastRow = getLastUsedRow(rangeSheet.cells);
    const endRow = Math.min(nr.r2, Math.max(nr.r1, usedLastRow));
    const out: EvalResult[] = [];
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

function createRefreshTick(): number {
  return Date.now();
}

function safeRefreshWorkbookState(snapshot: {
  workbookName: string;
  workbookId: string | null;
  activeSheetIndex: number;
  activeCell: string;
  selection: SelectionRange;
  pageSize: "A4" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  rightSidebarOpen: boolean;
  rightSidebarUndocked: boolean;
  activeSidebarPanel: SidebarPanel;
  showGridLines: boolean;
  printPreview: boolean;
  splitAxis: "vertical" | "horizontal" | null;
  splitRatio: number;
  activePane: "a" | "b";
  showDrawFunctions: boolean;
  formulaExpanded: boolean;
  showStatusBar: boolean;
  showPredictiveAnalytics: boolean;
  predictivePeriods: number;
  showFindReplace: boolean;
  showFunctionWizard: boolean;
  showChartDialog: boolean;
  showPivotDialog: boolean;
  showSpellCheck: boolean;
  showValidity: boolean;
  showDataSource: boolean;
  showExportDialog: boolean;
  showConditionalFormatting: boolean;
  showNamedRanges: boolean;
  showConsolidate: boolean;
  showGallery: boolean;
  showGoalSeek: boolean;
  showTemplatesDialog: "apply" | "manage" | null;
}): typeof snapshot {
  return {
    ...snapshot,
  };
}


/* ============================================================================
 * Main component
 * ========================================================================== */

// কপি/ফিল/সর্টে সেল সরলে আপেক্ষিক (relative) রেফারেন্স সরে; $ দেওয়া অংশ স্থির থাকে।
// সীমার বাইরে গেলে Excel-এর মতো #REF! হয়।
function shiftFormulaRefs(formula: string, dr: number, dc: number): string {
  return rewriteFormulaReferences(formula, (ref) => {
    const r1 = ref.absR1 ? ref.r1 : ref.r1 + dr;
    const c1 = ref.absC1 ? ref.c1 : ref.c1 + dc;
    const r2 = ref.absR2 ? ref.r2 : ref.r2 + dr;
    const c2 = ref.absC2 ? ref.c2 : ref.c2 + dc;
    if (Math.min(r1, r2, c1, c2) < 0 || Math.max(r1, r2) >= MAX_ROWS || Math.max(c1, c2) >= MAX_COLS) return null;
    return { ...ref, r1, c1, r2, c2 };
  });
}

function parseFillDate(v: string): Date | null {
  if (!v || !/[\/\-]/.test(v)) return null;

  const t = Date.parse(v);
  if (!Number.isFinite(t)) return null;

  return new Date(t);
}

type DigitScript = "latin" | "bengali" | "arabic" | "persian";

function detectDigitScript(value: string): DigitScript {
  if (/[০-৯]/.test(value)) return "bengali";
  if (/[٠-٩]/.test(value)) return "arabic";
  if (/[۰-۹]/.test(value)) return "persian";

  return "latin";
}

function normalizeLocalizedDigits(value: string): string {
  // [হিসাব-সংশোধন] আগে পুরো সংখ্যার টুকরোকে একটি অঙ্ক ধরে খোঁজা হতো ("১২" → "1", "৩৪৫" → "3")।
  // এখন প্রতিটি অঙ্ক আলাদাভাবে রূপান্তরিত হয় (বাংলা, আরবি, ফার্সি)।
  return value.replace(/[\u09E6-\u09EF\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x09e6 && code <= 0x09ef) return String(code - 0x09e6);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}


function localizeDigits(value: string, script: DigitScript): string {
  const maps: Record<DigitScript, string> = {
    latin: "0123456789",
    bengali: "০১২৩৪৫৬৭৮۹".replace("۹", "৯"),
    arabic: "٠١٢٣٤٥٦٧٨٩",
    persian: "۰۱۲۳۴۵۶۷۸۹",
  };

  if (script === "latin") return value;

  const target = maps[script];

  return value.replace(/\d/g, (digit) => target[parseInt(digit, 10)]);
}

function parseSeriesNumber(value: string): number | null {
  const normalized = normalizeLocalizedDigits(value.trim()).replace(/,/g, "");

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSeriesNumber(value: number, sample: string): string {
  const script = detectDigitScript(sample);
  const normalizedSample = normalizeLocalizedDigits(sample.trim()).replace(/,/g, "");

  const decimalMatch = normalizedSample.match(/\.(\d+)$/);
  const decimals = decimalMatch ? decimalMatch[1].length : 0;

  let output =
    decimals > 0
      ? value.toFixed(decimals)
      : Number.isInteger(value)
        ? String(value)
        : String(Math.round(value * 1e10) / 1e10);

  /*
   * Preserve leading zero pattern:
   * 001 -> 002 -> 003
   */
  if (decimals === 0) {
    const sampleMatch = normalizedSample.match(/^(-?)(0+)(\d+)$/);
    if (sampleMatch) {
      const sign = output.startsWith("-") ? "-" : "";
      const absOutput = output.replace("-", "");
      const targetWidth = sampleMatch[2].length + sampleMatch[3].length;
      output = sign + absOutput.padStart(targetWidth, "0");
    }
  }

  return localizeDigits(output, script);
}

function extractTrailingNumber(
  value: string
): { prefix: string; num: number; digits: number; script: DigitScript } | null {
  // [হিসাব-সংশোধন] হাইফেন সংখ্যার অংশ ছিল বলে "INV-001" → -1 হয়ে "INV0000" আসত; এখন শুধু অঙ্ক ধরা হয়।
  const match = value.match(/^([\s\S]*?)([0-9\u09E6-\u09EF\u0660-\u0669\u06F0-\u06F9]+)$/);
  if (!match) return null;

  const script = detectDigitScript(match[2]);
  const normalizedNumber = normalizeLocalizedDigits(match[2]);
  const parsed = parseInt(normalizedNumber, 10);

  if (!Number.isFinite(parsed)) return null;

  return {
    prefix: match[1],
    num: parsed,
    digits: match[2].length,
    script,
  };
}

function formatTrailingNumber(
  prefix: string,
  num: number,
  digits: number,
  script: DigitScript
): string {
  const safeNum = Math.round(num);
  const output = String(safeNum).padStart(digits, "0");
  return `${prefix}${localizeDigits(output, script)}`;
}

function applyCustomNumberFormat(numeric: number, pattern: string): string {

  const hasPercent = pattern.includes("%");
  const hasGrouping = pattern.includes(",");
  const decimalMatch = pattern.match(/\.(0+)/);
  const decimals = decimalMatch ? decimalMatch[1].length : 0;
  const prefixMatch = pattern.match(/^([^\d#0]*)/);
  const prefix = prefixMatch ? prefixMatch[1] : "";
  const value = roundHalfAway(hasPercent ? cleanNumber(numeric * 100) : numeric, decimals);
  const formatted = hasGrouping
    ? value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : value.toFixed(decimals);
  return `${prefix}${formatted}${hasPercent ? "%" : ""}`;
}

function evaluateConditionalRule(rule: ConditionalRule, rawValue: EvalResult): boolean {
  // [হিসাব-সংশোধন] parseFloat("12abc") = 12 ধরার ভুল বাদ — শুধু পুরো-সংখ্যা মান তুলনা হয়
  const numeric = strictNumber(typeof rawValue === "boolean" ? String(rawValue) : rawValue) ?? NaN;
  const target = strictNumber(rule.value) ?? NaN;
  switch (rule.condition) {
    case "greater":
      return Number.isFinite(numeric) && Number.isFinite(target) && numeric > target;
    case "less":
      return Number.isFinite(numeric) && Number.isFinite(target) && numeric < target;
    case "equal":
      if (Number.isFinite(numeric) && Number.isFinite(target)) return numeric === target;
      return String(rawValue).trim().toLowerCase() === rule.value.trim().toLowerCase() && rule.value.trim() !== "";
    case "between": {
      const t2 = strictNumber(rule.value2 || "") ?? NaN;
      return Number.isFinite(numeric) && Number.isFinite(target) && Number.isFinite(t2) && numeric >= Math.min(target, t2) && numeric <= Math.max(target, t2);
    }
    case "textContains":
      return String(rawValue).toLowerCase().includes(rule.value.toLowerCase());
    default:
      return false;
  }
}

/* ============================================================================
 * LibreOffice/Calc Style AutoFilter Engine
 * ========================================================================== */

type AutoFilterCondition =
  | "none"
  | "empty"
  | "notEmpty"
  | "top10"
  | "bottom10"
  | "standard";

type AutoFilterStandardOperator =
  | "contains"
  | "notContains"
  | "equals"
  | "notEquals"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "greaterOrEqual"
  | "lessOrEqual";

interface AutoFilterState {
  version: 1;
  selectedValues: string[] | null;
  condition: AutoFilterCondition;
  standard: {
    operator: AutoFilterStandardOperator;
    value: string;
  };
  bgColor: string | null;
  fontColor: string | null;
}

interface AutoFilterOption {
  value: string;
  label: string;
  count: number;
}

interface AutoFilterColorOption {
  color: string;
  label: string;
  count: number;
}

const AUTO_FILTER_PREFIX = "__AWM_AUTOFILTER_V1__:";

function createEmptyAutoFilterState(): AutoFilterState {
  return {
    version: 1,
    selectedValues: null,
    condition: "none",
    standard: {
      operator: "contains",
      value: "",
    },
    bgColor: null,
    fontColor: null,
  };
}

function serializeAutoFilterState(state: AutoFilterState): string {
  return `${AUTO_FILTER_PREFIX}${JSON.stringify(state)}`;
}

function parseAutoFilterState(raw?: string): AutoFilterState {
  const empty = createEmptyAutoFilterState();
  if (!raw) return empty;

  if (raw.startsWith(AUTO_FILTER_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(AUTO_FILTER_PREFIX.length)) as Partial<AutoFilterState>;

      return {
        ...empty,
        ...parsed,
        version: 1,
        standard: {
          ...empty.standard,
          ...(parsed.standard || {}),
        },
      };
    } catch {
      return empty;
    }
  }

  /*
   * Backward compatibility:
   * পুরোনো prompt-based filter text থাকলে সেটিকে Standard Filter -> contains হিসেবে ধরা হবে।
   */
  return {
    ...empty,
    condition: "standard",
    standard: {
      operator: "contains",
      value: raw,
    },
  };
}

function normalizeFilterColor(color?: string | null): string {
  return (color || "").trim().toUpperCase();
}

function isAutoFilterActive(state: AutoFilterState): boolean {
  return (
    state.selectedValues !== null ||
    state.condition !== "none" ||
    !!state.bgColor ||
    !!state.fontColor
  );
}

function matchStandardAutoFilter(
  operator: AutoFilterStandardOperator,
  rawValue: EvalResult,
  displayValue: string,
  target: string
): boolean {
  const display = displayValue.toLowerCase();
  const needle = target.toLowerCase();

  const numeric = strictNumber(typeof rawValue === "boolean" ? String(rawValue) : rawValue) ?? NaN;

  const targetNumeric = strictNumber(target) ?? NaN;

  switch (operator) {
    case "contains":
      return display.includes(needle);

    case "notContains":
      return !display.includes(needle);

    case "equals":
      if (Number.isFinite(numeric) && Number.isFinite(targetNumeric)) return numeric === targetNumeric;
      return displayValue === target;

    case "notEquals":
      if (Number.isFinite(numeric) && Number.isFinite(targetNumeric)) return numeric !== targetNumeric;
      return displayValue !== target;

    case "startsWith":
      return display.startsWith(needle);

    case "endsWith":
      return display.endsWith(needle);

    case "greaterThan":
      return Number.isFinite(numeric) && Number.isFinite(targetNumeric) && numeric > targetNumeric;

    case "lessThan":
      return Number.isFinite(numeric) && Number.isFinite(targetNumeric) && numeric < targetNumeric;

    case "greaterOrEqual":
      return Number.isFinite(numeric) && Number.isFinite(targetNumeric) && numeric >= targetNumeric;

    case "lessOrEqual":
      return Number.isFinite(numeric) && Number.isFinite(targetNumeric) && numeric <= targetNumeric;

    default:
      return true;
  }
}

function computeSeriesValue(values: string[], overallIndex: number, seriesMode: boolean = true): string {
  const n = values.length;
  const trimmed = values.map((v) => v.trim());
  const repeatPattern = () => values[((overallIndex % n) + n) % n];
  const asDates = trimmed.map((v) => parseFillDate(v));
  if (asDates.every((d) => d !== null)) {
    if (!seriesMode) return repeatPattern();
    const dates = asDates as Date[];
    const dayMs = 24 * 60 * 60 * 1000;
    const step = n >= 2 ? (dates[n - 1].getTime() - dates[0].getTime()) / dayMs / (n - 1) : 1;
    return new Date(dates[0].getTime() + step * overallIndex * dayMs).toLocaleDateString("en-US");
  }
  const asNums = trimmed.map((v) => parseSeriesNumber(v));
  if (asNums.every((v) => v !== null)) {
    const nums = asNums as number[];
    if (n === 1) {
      if (!seriesMode) return trimmed[0];
      return formatSeriesNumber(nums[0] + overallIndex, trimmed[0]);
    }
    if (!seriesMode) return repeatPattern();
    const step = (nums[n - 1] - nums[0]) / (n - 1);
    return formatSeriesNumber(nums[0] + step * overallIndex, trimmed[n - 1]);
  }
  const trailingNumbers = trimmed.map((v) => extractTrailingNumber(v));
  if (trailingNumbers.every((item) => item !== null)) {
    const items = trailingNumbers as NonNullable<ReturnType<typeof extractTrailingNumber>>[];
    const samePrefix = items.every((item) => item.prefix === items[0].prefix);
    if (samePrefix) {
      if (n === 1) {
        if (!seriesMode) return repeatPattern();
        return formatTrailingNumber(items[0].prefix, items[0].num + overallIndex, items[0].digits, items[0].script);
      }
      if (!seriesMode) return repeatPattern();
      const step = (items[n - 1].num - items[0].num) / (n - 1);
      return formatTrailingNumber(items[0].prefix, items[0].num + step * overallIndex, items[n - 1].digits, items[n - 1].script);
    }
  }
  return repeatPattern();
}

/* ============================================================================
 * Predictive Analytics Engine — Frontend-only statistical forecasting
 * ========================================================================== */

interface PredictiveDataPoint {
  key: string;
  index: number;
  value: number;
}

interface PredictiveForecastPoint {
  period: number;
  value: number;
  low: number;
  high: number;
}

interface PredictiveAnomaly {
  key: string;
  value: number;
  zScore: number;
}

interface PredictiveAnalyticsResult {
  range: string;
  points: PredictiveDataPoint[];
  count: number;
  min: number;
  max: number;
  sum: number;
  average: number;
  slope: number;
  intercept: number;
  r2: number;
  trend: "up" | "down" | "flat";
  movingAverage: number;
  anomalies: PredictiveAnomaly[];
  forecast: PredictiveForecastPoint[];
  insight: string;
}

function roundPredictive(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function calculatePredictiveAnalytics(
  points: PredictiveDataPoint[],
  range: string,
  forecastPeriods: number
): PredictiveAnalyticsResult {
  const values = points.map((p) => p.value);
  const count = values.length;

  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / count;
  const min = values.reduce((lowest: number, v: number) => Math.min(lowest, v), Infinity);
  const max = values.reduce((highest: number, v: number) => Math.max(highest, v), -Infinity);

  const xValues = values.map((_, i) => i + 1);
  const xMean = xValues.reduce((a, b) => a + b, 0) / count;
  const yMean = average;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < count; i++) {
    numerator += (xValues[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  const predictedExisting = xValues.map((x) => intercept + slope * x);

  const ssTot = values.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
  const ssRes = values.reduce((acc, y, i) => acc + Math.pow(y - predictedExisting[i], 2), 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  const residuals = values.map((y, i) => y - predictedExisting[i]);
  const residualMean = residuals.reduce((a, b) => a + b, 0) / count;
  // রিগ্রেশনের স্ট্যান্ডার্ড এরর: স্বাধীনতার মাত্রা n-2 (দুটি প্যারামিটার slope ও intercept অনুমান করা হয়েছে)
  const residualStd =
    count > 2
      ? Math.sqrt(
        residuals.reduce((acc, r) => acc + Math.pow(r - residualMean, 2), 0) /
        (count - 2)
      )
      : 0;

  const valueStd =
    count > 1
      ? Math.sqrt(
        values.reduce((acc, v) => acc + Math.pow(v - average, 2), 0) /
        (count - 1)
      )
      : 0;

  const anomalies: PredictiveAnomaly[] =
    valueStd === 0
      ? []
      : points
        .map((p) => ({
          key: p.key,
          value: p.value,
          zScore: (p.value - average) / valueStd,
        }))
        .filter((a) => Math.abs(a.zScore) >= 2)
        .map((a) => ({
          ...a,
          value: roundPredictive(a.value),
          zScore: roundPredictive(a.zScore),
        }));

  const movingWindow = Math.min(3, count);
  const movingAverage =
    values.slice(count - movingWindow).reduce((a, b) => a + b, 0) / movingWindow;

  const safePeriods = Math.max(1, Math.min(24, Math.floor(forecastPeriods || 5)));

  const confidencePadding =
    residualStd > 0
      ? residualStd * 1.96
      : Math.max(0.01, Math.abs(average) * 0.05);

  const forecast: PredictiveForecastPoint[] = Array.from(
    { length: safePeriods },
    (_, i) => {
      const x = count + i + 1;
      const value = intercept + slope * x;

      return {
        period: i + 1,
        value: roundPredictive(value),
        low: roundPredictive(value - confidencePadding),
        high: roundPredictive(value + confidencePadding),
      };
    }
  );

  const trend: PredictiveAnalyticsResult["trend"] =
    Math.abs(slope) < 0.000001 ? "flat" : slope > 0 ? "up" : "down";

  const insight =
    trend === "up"
      ? `The selected data shows an upward trend. Forecast confidence is ${(r2 * 100).toFixed(1)}%.`
      : trend === "down"
        ? `The selected data shows a downward trend. Forecast confidence is ${(r2 * 100).toFixed(1)}%.`
        : `The selected data is mostly stable. Forecast confidence is ${(r2 * 100).toFixed(1)}%.`;

  return {
    range,
    points,
    count,
    min: roundPredictive(min),
    max: roundPredictive(max),
    sum: roundPredictive(sum),
    average: roundPredictive(average),
    slope: roundPredictive(slope, 6),
    intercept: roundPredictive(intercept, 6),
    r2: roundPredictive(r2, 4),
    trend,
    movingAverage: roundPredictive(movingAverage),
    anomalies,
    forecast,
    insight,
  };
}

// offsets[i] <= pos হয় এমন সর্ববৃহৎ i (বাইনারি সার্চ)
function findIndexByOffset(offsets: number[], pos: number): number {
  let lo = 0;
  let hi = offsets.length - 2;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= pos) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

type HomeDataToolsMode = "export" | "backup";

function HomeDataToolsDialog({ mode, workbookName, sheetName, onClose, onXlsx, onCsv, onBackup, onRestore }: {
  mode: HomeDataToolsMode; workbookName: string; sheetName: string; onClose: () => void;
  onXlsx: () => Promise<void>; onCsv: () => Promise<void>; onBackup: () => Promise<void>; onRestore: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialogRef.current;
    if (el && !el.open) el.showModal();
    return () => { if (el?.open) el.close(); };
  }, []);
  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setWorking(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "ফাইলের কাজ সম্পন্ন হয়নি।"); }
    finally { lock.current = false; setWorking(false); }
  }
  const buttonClass = "w-full rounded-xl border border-green-700/30 bg-green-50 px-4 py-3 text-left text-sm font-semibold text-green-950 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-green-700 disabled:cursor-wait disabled:opacity-50";
  return <dialog ref={dialogRef} aria-labelledby="home-data-tools-title" onCancel={e => { e.preventDefault(); if (!lock.current) onClose(); }} onKeyDown={e => e.stopPropagation()} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-2xl border border-green-700/30 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-black/50">
    <header className="mb-4 flex items-center justify-between gap-4"><h2 id="home-data-tools-title" className="text-xl font-bold">{mode === "export" ? "Export Data" : "Backup & Restore"}</h2><button type="button" disabled={working} onClick={onClose} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" aria-label="Close data tools">Close</button></header>
    <p className="mb-2 .break-words text-sm">Current workbook: {workbookName || "Untitled Workbook"}</p>
    <p className="mb-4 text-xs leading-5 text-slate-600">হোমস্ক্রিনে নয়, বর্তমানে মেমরিতে খোলা workbook-এর ডেটা ব্যবহার হবে। সংরক্ষিত অন্য workbook চাইলে আগে My Files / Recent Files থেকে খুলুন।</p>
    <div className="space-y-3">
      {mode === "export" && <>
        <button type="button" disabled={working} className={buttonClass} onClick={() => void perform(onXlsx)}>Export Excel (.xlsx)<span className="mt-1 block text-xs font-normal">সব sheet — বিদ্যমান Excel exporter ব্যবহার করবে।</span></button>
        <button type="button" disabled={working} className={buttonClass} onClick={() => void perform(onCsv)}>Export CSV (.csv)<span className="mt-1 block text-xs font-normal">শুধু active sheet: {sheetName}. CSV-তে workbook formatting থাকে না।</span></button>
      </>}
      <button type="button" disabled={working} className={buttonClass} onClick={() => void perform(onBackup)}>Download workbook backup (.json)<span className="mt-1 block text-xs font-normal">বর্তমান workbook-এর নিজস্ব JSON snapshot।</span></button>
      {mode === "backup" && <button type="button" disabled={working} className={buttonClass} onClick={() => { if (!lock.current) onRestore(); }}>Restore workbook backup (.json)<span className="mt-1 block text-xs font-normal">ফাইল নির্বাচন ও confirmation-এর পরে বর্তমান workbook প্রতিস্থাপিত হবে।</span></button>}
    </div>
    <p className="mt-4 text-xs leading-5 text-amber-800">এটি সব saved workbook, account settings, Photo Studio অথবা সম্পূর্ণ অ্যাপের backup নয়। Restore-এর আগে বর্তমান কাজের JSON backup রাখুন।</p>
    <p role="status" aria-live="polite" className="mt-3 text-sm">{working ? "ফাইল প্রস্তুত হচ্ছে… ডাউনলোড/সেভ ডায়ালগ এবং অ্যাপের notification দেখুন।" : ""}</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </dialog>;
}

export default function ExcelStudioPage() {
  const router = useRouter();
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const requestConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void) => {
      setConfirmDialog({ title, message, onConfirm });
    },
    []
  );
  const [promptDialog, setPromptDialog] = useState<{
    title: string;
    message: string;
    onConfirm: (value: string) => void;
  } | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [showWhatIfTable, setShowWhatIfTable] = useState(false);
  const [showScenarioManager, setShowScenarioManager] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [scenarioSummary, setScenarioSummary] = useState<string | null>(null);
  const [showDataAnalysis, setShowDataAnalysis] = useState(false);
  const [showSubtotalDialog, setShowSubtotalDialog] = useState(false);

  const requestPrompt = useCallback(
    (title: string, message: string, onConfirm: (value: string) => void, defaultValue = "") => {
      setPromptValue(defaultValue);
      setPromptDialog({ title, message, onConfirm });
    },
    []
  );
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [homeDataTools, setHomeDataTools] = useState<HomeDataToolsMode | null>(null);
  const homeDataInput = useRef<HTMLInputElement>(null);
  const homeDataMode = useRef<"import" | "restore">("import");
  const homeDataLoading = useRef(false);

  const [appLocale, setAppLocale] = useState<AppLocale>("en");
  const [rtlEnabled, setRtlEnabled] = useState(false);
  const [showChartWizard, setShowChartWizard] = useState(false);
  const [, setRefreshTick] = useState(0);
  const [workbookName, setWorkbookName] = useState("Untitled Workbook");
  const [workbookId, setWorkbookId] = useState<string | null>(null);
  const localSaveInProgressRef = useRef(false);
  const [sheets, setSheetsRaw] = useState<WorkbookSheet[]>([createSheet("Sheet 1")]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Legal">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");

  const [activeCell, setActiveCell] = useState("A1");
  const [selection, setSelection] = useState<SelectionRange>({ r1: 0, c1: 0, r2: 0, c2: 0 });
  const [ctrlSelectedRows, setCtrlSelectedRows] = useState<number[]>([]);
  const [ctrlSelectedCols, setCtrlSelectedCols] = useState<number[]>([]);
  const [ctrlSelectedCells, setCtrlSelectedCells] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [formatPainter, setFormatPainter] = useState<CellStyle | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toast, setToast] = useState<string | null>(null);

  const [showFunctionWizard, setShowFunctionWizard] = useState(false);
  const [showGoalSeek, setShowGoalSeek] = useState(false);
  const [showConsolidate, setShowConsolidate] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showDataSource, setShowDataSource] = useState(false);
  const [showValidity, setShowValidity] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showChartDialog, setShowChartDialog] = useState(false);
  const [showPivotDialog, setShowPivotDialog] = useState(false);
  const [showPivotChart, setShowPivotChart] = useState(false);
  const [showForecastSheet, setShowForecastSheet] = useState(false);
  const [showAnalyzeData, setShowAnalyzeData] = useState(false);
  const [showSpellCheck, setShowSpellCheck] = useState(false);

  const [openToolbarMenu, setOpenToolbarMenu] = useState<"new" | "open" | "save" | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>([]);
  useEffect(() => {
    saveRecentFilesToStorage(recentFiles);
  }, [recentFiles]);
  const [recentFilesModuleOnly, setRecentFilesModuleOnly] = useState(true);
  const [templates, setTemplates] = useState<WorkbookTemplate[]>([]);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState<"apply" | "manage" | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [validityInput, setValidityInput] = useState("");
  const [goalTargetCell, setGoalTargetCell] = useState("");
  const [goalValue, setGoalValue] = useState("");
  const [goalChangingCell, setGoalChangingCell] = useState("");
  const [consolidateRanges, setConsolidateRanges] = useState("");
  const [consolidateTarget, setConsolidateTarget] = useState("");
  const [dataSourceText, setDataSourceText] = useState("");

  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);

  const [chartTitle, setChartTitle] = useState("Chart");
  const [chartRange, setChartRange] = useState("A1:B5");
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardType, setWizardType] = useState<ChartType>("column");
  const [wizardSubtitle, setWizardSubtitle] = useState("");
  const [wizardXAxisTitle, setWizardXAxisTitle] = useState("");
  const [wizardYAxisTitle, setWizardYAxisTitle] = useState("");
  const [wizardShowLegend, setWizardShowLegend] = useState(true);
  const [wizardLegendPosition, setWizardLegendPosition] = useState<"right" | "top" | "bottom" | "left" | "none">("right");
  const [wizard3D, setWizard3D] = useState(false);
  const [wizardRealistic, setWizardRealistic] = useState(false);
  const [wizardShape, setWizardShape] = useState<"cylinder" | "cone" | "pyramid">("cylinder");
  const [wizardSeries, setWizardSeries] = useState<ChartSeries[]>([
    { id: "s_initial", name: "Series 1", range: "" },
  ]);
  const chartSeriesIdRef = useRef(0);
  const [pivotRange, setPivotRange] = useState("A1:C10");
  const [pivotRowField, setPivotRowField] = useState("");
  const [pivotColumnField, setPivotColumnField] = useState("");
  const [pivotValueField, setPivotValueField] = useState("");
  const [pivotAggregate, setPivotAggregate] = useState<Aggregate>("SUM");
  const [pivotResult, setPivotResult] = useState<string[][]>([]);

  const [showGridLines, setShowGridLines] = useState(true);
  const [printPreview, setPrintPreview] = useState(false);
  const [showPageSetup, setShowPageSetup] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printMarginTop, setPrintMarginTop] = useState(20);
  const [printMarginBottom, setPrintMarginBottom] = useState(20);
  const [printMarginLeft, setPrintMarginLeft] = useState(15);
  const [printMarginRight, setPrintMarginRight] = useState(15);
  const [printScale, setPrintScale] = useState(100);
  const [printHeader, setPrintHeader] = useState("");
  const [printFooter, setPrintFooter] = useState("Page &P of &N");
  const [printArea, setPrintArea] = useState<string>("");
  const [printTitleRows, setPrintTitleRows] = useState<string>(""); // যেমন "1:1"
  const [printTitleCols, setPrintTitleCols] = useState<string>("");
  const [showAdvancedPrintPreview, setShowAdvancedPrintPreview] = useState(false);
  type SplitAxis = "vertical" | "horizontal" | null;
  const [splitAxis, setSplitAxis] = useState<SplitAxis>(null);
  const [splitRatio, setSplitRatio] = useState(0.5); // 0.1–0.9 এর মধ্যে clamp হবে
  const [activePane, setActivePane] = useState<"a" | "b">("a");
  const [showDrawFunctions, setShowDrawFunctions] = useState(false);
  const [activeDrawTool, setActiveDrawTool] = useState<DrawToolId>("select");
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null);
  const [drawPreview, setDrawPreview] = useState<DrawShape | null>(null);
  const drawingRef = useRef<{ type: DrawToolId; startX: number; startY: number; points: { x: number; y: number }[] } | null>(null);
  const resizeRef = useRef<{ id: string; handle: string; orig: DrawShape } | null>(null);
  const rotateRef = useRef<{ id: string; cx: number; cy: number; startAngle: number; origRotation: number } | null>(null);
  const [formulaExpanded, setFormulaExpanded] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [rightSidebarUndocked, setRightSidebarUndocked] = useState(false);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>("properties");
  const [sidebarWidth, setSidebarWidth] = useState(310);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sidebarHoverPeek, setSidebarHoverPeek] = useState(false);

  const [, setToolbarPulse] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const draggingHeader = useRef<"row" | "col" | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const isFilling = useRef(false);
  const fillSeriesMode = useRef(false);
  const fillBaseSelection = useRef<SelectionRange | null>(null);
  const [fillPreview, setFillPreview] = useState<SelectionRange | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // ===== কলাম হেডার রাইট-ক্লিক কনটেক্সট মেনুর জন্য নতুন state =====
  const [columnContextMenu, setColumnContextMenu] = useState<{ x: number; y: number; col: number } | null>(null);
  const columnContextMenuRef = useRef<HTMLDivElement>(null);
  const [showColumnWidthDialog, setShowColumnWidthDialog] = useState(false);
  const [columnWidthDialogCol, setColumnWidthDialogCol] = useState<number | null>(null);
  const [columnWidthInput, setColumnWidthInput] = useState("120");
  // ===== রো হেডার রাইট-ক্লিক কনটেক্সট মেনুর জন্য নতুন state =====
  const [rowContextMenu, setRowContextMenu] = useState<{ x: number; y: number; row: number } | null>(null);
  const rowContextMenuRef = useRef<HTMLDivElement>(null);
  const [showRowHeightDialog, setShowRowHeightDialog] = useState(false);
  const [rowHeightDialogRow, setRowHeightDialogRow] = useState<number | null>(null);
  const [rowHeightInput, setRowHeightInput] = useState("36");


  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const [showFormatCells, setShowFormatCells] = useState(false);
  // ===== Special Characters ফিচারের state =====
  const [showSpecialCharsMenu, setShowSpecialCharsMenu] = useState(false); // টুলবারের ছোট quick dropdown
  const [showSpecialCharsDialog, setShowSpecialCharsDialog] = useState(false); // "More Characters..." মূল মোডাল
  const specialCharsMenuRef = useRef<HTMLDivElement>(null);
  const [scFavorites, setScFavorites] = useState<string[]>([]);
  const [scRecent, setScRecent] = useState<string[]>([]);
  const [scSelectedFont, setScSelectedFont] = useState<string>("Arial");
  const [scSelectedBlock, setScSelectedBlock] = useState<string>("Basic Latin");
  const [scSearch, setScSearch] = useState("");
  const [scSelectedChar, setScSelectedChar] = useState<string | null>(null);
  const [wizardSelected, setWizardSelected] = useState<string | null>(null);
  const [showConditionalFormatting, setShowConditionalFormatting] = useState(false);
  const [cfRange, setCfRange] = useState("");
  const [cfCondition, setCfCondition] = useState<ConditionalRule["condition"]>("greater");
  const [cfValue, setCfValue] = useState("");
  const [cfValue2, setCfValue2] = useState("");
  const [cfColor, setCfColor] = useState("#FFEB9C");
  const [showNamedRanges, setShowNamedRanges] = useState(false);
  const [nrName, setNrName] = useState("");
  const [nrRange, setNrRange] = useState("");
  const [showHyperlinkDialog, setShowHyperlinkDialog] = useState(false);
  const [hyperlinkSearch, setHyperlinkSearch] = useState("");
  const [shareMenu, setShareMenu] = useState<{ x: number; y: number; url: string; label: string } | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [traceHighlight, setTraceHighlight] = useState<Set<string> | null>(null);
  const [viewport, setViewport] = useState({ scrollTop: 0, scrollLeft: 0, clientHeight: 800, clientWidth: 1200 });
  const scrollRafRef = useRef<number | null>(null);
  const [showAutoSumMenu, setShowAutoSumMenu] = useState(false);
  const autoSumMenuRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  useLayoutEffect(() => {
    const el = document.getElementById("awm-print-area");
    if (!el) return;
    const measure = () => {
      const scale = Math.max(0.1, zoomLevel / 100);
      const next = {
        scrollTop: el.scrollTop / scale, scrollLeft: el.scrollLeft / scale,
        clientHeight: el.clientHeight / scale, clientWidth: el.clientWidth / scale,
      };
      setViewport(prev => prev.scrollTop === next.scrollTop &&
        prev.scrollLeft === next.scrollLeft && prev.clientHeight === next.clientHeight &&
        prev.clientWidth === next.clientWidth ? prev : next);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [zoomLevel, activeSheetIndex, showHomeScreen, showLoadDialog]);

  const [darkMode, setDarkMode] = useState(false);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [displayGrouping, setDisplayGrouping] = useState<DisplayGrouping>(DISPLAY_SETTINGS.grouping);
  const [displayDigits, setDisplayDigits] = useState<DisplayDigits>(DISPLAY_SETTINGS.digits);
  const [showPredictiveAnalytics, setShowPredictiveAnalytics] = useState(false);
  const [predictivePeriods, setPredictivePeriods] = useState(5);
  const [predictiveResult, setPredictiveResult] = useState<PredictiveAnalyticsResult | null>(null);

  // Enterprise Menu State
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [focusedMenuItemIndex, setFocusedMenuItemIndex] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOpenCategory, setMobileOpenCategory] = useState<number | null>(null);

  const sheet = sheets[activeSheetIndex] || sheets[0];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // ==================== Macro Engine: Recording State ====================
  // isRecording শুধু UI-তে দেখানোর জন্য state; isRecordingRef হলো আসল
  // source-of-truth যা setCellValue/applyStyleToSelection-এর ভেতর থেকে
  // stale-closure ছাড়াই তাৎক্ষণিকভাবে চেক করা যায়
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const recordedActionsRef = useRef<MacroAction[]>([]);

  const [isPlayingMacro, setIsPlayingMacro] = useState(false);
  const isPlayingMacroRef = useRef(false);
  const macroCancelRef = useRef(false);

  const [savedMacros, setSavedMacros] = useState<SavedMacro[]>([]);

  // এই ফাংশনটাই setCellValue/applyStyleToSelection/handleMouseDown থেকে
  // কল হবে। Recording চালু না থাকলে, অথবা এটি Macro Playback-এর internal
  // call হলে — কিছুই record হবে না (recursion/duplicate-recording প্রতিরোধ)
  const recordAction = useCallback((action: MacroAction) => {
    if (!isRecordingRef.current || isPlayingMacroRef.current) return;
    recordedActionsRef.current.push(action);
  }, []);

  const startMacroRecording = useCallback(() => {
    if (isPlayingMacroRef.current) {
      showToast("Macro playback চলাকালীন recording শুরু করা যাবে না।");
      return;
    }
    // নতুন রেকর্ডিং শুরুর আগে আগের অসম্পূর্ণ action buffer রিসেট করা হচ্ছে
    recordedActionsRef.current = [];
    isRecordingRef.current = true;
    setIsRecording(true);
    showToast("Macro recording শুরু হয়েছে।");
  }, [showToast]);

  const stopMacroRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);

    const actions = recordedActionsRef.current;
    if (actions.length === 0) {
      showToast("কোনো action রেকর্ড হয়নি, macro save করা হলো না।");
      recordedActionsRef.current = [];
      return;
    }

    requestPrompt(
      "Macro সংরক্ষণ",
      "Macro-র নাম দিন:",
      (name) => {
        if (!name || !name.trim()) {
          showToast("নাম দেওয়া হয়নি, macro save বাতিল করা হলো।");
          recordedActionsRef.current = [];
          return;
        }
        const trimmedName = name.trim();

        const existing = savedMacros.find(
          (m) => m.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (existing) {
          requestConfirm(
            "Macro Overwrite",
            `"${trimmedName}" নামে ইতিমধ্যে একটি macro আছে। এটি overwrite করবেন?`,
            () => {
              const updated = savedMacros.map((m) =>
                m.id === existing.id
                  ? { ...m, actions, updatedAt: new Date().toISOString() }
                  : m
              );
              setSavedMacros(updated);
              saveMacrosToStorage(updated);
              recordedActionsRef.current = [];
              showToast(`Macro "${trimmedName}" সংরক্ষণ করা হয়েছে।`);
            }
          );
          return;
        }

        const entry: SavedMacro = {
          id: `macro_${Date.now()}`,
          name: trimmedName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          actions,
        };
        const next = [...savedMacros, entry];
        setSavedMacros(next);
        saveMacrosToStorage(next);
        recordedActionsRef.current = [];
        showToast(`Macro "${trimmedName}" সংরক্ষণ করা হয়েছে।`);
      },
      ""
    );
  }, [showToast, savedMacros, requestPrompt, requestConfirm]);



  const toggleMacroRecording = useCallback(() => {
    if (isRecordingRef.current) stopMacroRecording();
    else startMacroRecording();
  }, [startMacroRecording, stopMacroRecording]);

  const deleteMacro = useCallback((id: string) => {
    setSavedMacros((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveMacrosToStorage(next);
      return next;
    });
    showToast("Macro delete করা হয়েছে।");
  }, [showToast]);

  const renameMacro = useCallback((id: string) => {
    const target = savedMacros.find((m) => m.id === id);
    if (!target) return;

    requestPrompt(
      "Macro Rename",
      "নতুন নাম দিন:",
      (newName) => {
        if (!newName || !newName.trim()) return;
        const trimmed = newName.trim();
        const duplicate = savedMacros.find(
          (m) => m.id !== id && m.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
          showToast("এই নামে ইতিমধ্যে একটি macro আছে।");
          return;
        }
        const next = savedMacros.map((m) =>
          m.id === id ? { ...m, name: trimmed, updatedAt: new Date().toISOString() } : m
        );
        setSavedMacros(next);
        saveMacrosToStorage(next);
      },
      target.name
    );
  }, [showToast, savedMacros, requestPrompt]);

  const cancelMacroPlayback = useCallback(() => {
    macroCancelRef.current = true;
  }, []);
  // ==================== Macro Engine: Recording State (শেষ) ====================

  const closeMenu = () => {
    setActiveMenuIndex(null);
    setFocusedMenuItemIndex(null);
  };

  // ---- Enterprise Undo / Redo History ----
  // 🔄 P0-FIX-1: latest sheets-এর live mirror — undo/redo-তে safe read-এর জন্য
  const sheetsRef = useRef(sheets);


  // Keep the committed workbook snapshot in sync without writing to a ref during render.
  useLayoutEffect(() => {
    sheetsRef.current = sheets;
  }, [sheets]);

  const undoStackRef = useRef<WorkbookSheet[][]>([]);
  const redoStackRef = useRef<WorkbookSheet[][]>([]);
  const HISTORY_LIMIT = 100;
  const [historyVersion, setHistoryVersion] = useState(0);

  // 🔄 P0-FIX-1: history push এখন updater-এর বাইরে — StrictMode-safe
  const setSheets = useCallback((updater: React.SetStateAction<WorkbookSheet[]>) => {
    const prev = sheetsRef.current;
    const next = typeof updater === "function"
      ? (updater as (p: WorkbookSheet[]) => WorkbookSheet[])(prev)
      : updater;
    if (next !== prev) {
      undoStackRef.current.push(prev);
      if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
      redoStackRef.current = [];
      sheetsRef.current = next; // ref সাথে সাথে update — পরের call-এ সঠিক prev পাবে
      libSyncExchangeRates(next);
      setSheetsRaw(next);
      setHistoryVersion(v => v + 1);
    }
  }, []);
  const replaceWorkbookSheets = useCallback(
    (nextSheets: WorkbookSheet[]) => {
      if (nextSheets.length === 0) {
        throw new Error("অন্তত একটি শিট থাকতে হবে।");
      }

      const isolatedSheets = structuredClone(nextSheets);

      undoStackRef.current = [];
      redoStackRef.current = [];

      sheetsRef.current = isolatedSheets;
      libSyncExchangeRates(isolatedSheets);
      setSheetsRaw(isolatedSheets);
      setHistoryVersion((version) => version + 1);

      setEditingKey(null);
      setEditValue("");
      setClipboard(null);
      setFormatPainter(null);
    },
    []
  );

  // 🔄 P0-FIX-1: side-effect updater-এর বাইরে — StrictMode-safe undo
  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) {
      showToast("Nothing to undo.");
      return;
    }
    const current = sheetsRef.current;
    const previous = undoStackRef.current.pop()!;
    redoStackRef.current.push(current);
    sheetsRef.current = previous;
    libSyncExchangeRates(previous);
    setSheetsRaw(previous);
    setHistoryVersion((v) => v + 1);
    showToast("Undo");
  }, [showToast]);

  // 🔄 P0-FIX-1: side-effect updater-এর বাইরে — StrictMode-safe redo
  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) {
      showToast("Nothing to redo.");
      return;
    }
    const current = sheetsRef.current;
    const nextState = redoStackRef.current.pop()!;
    undoStackRef.current.push(current);
    sheetsRef.current = nextState;
    libSyncExchangeRates(nextState);
    setSheetsRaw(nextState);
    setHistoryVersion((v) => v + 1);
    showToast("Redo");
  }, [showToast]);

  const updateSheet = useCallback((patch: Partial<WorkbookSheet> | ((s: WorkbookSheet) => Partial<WorkbookSheet>)) => {
    setSheets((prev) =>
      prev.map((s, i) => {
        if (i !== activeSheetIndex) return s;
        const nextPatch = typeof patch === "function" ? patch(s) : patch;
        return { ...s, ...nextPatch };
      })
    );
  }, [activeSheetIndex, setSheets]);
  // সারি/কলাম ঢোকানো-মোছার সময়: সেল সরানোর পাশাপাশি ওয়ার্কবুকের সব ফর্মুলার রেফারেন্সও ঠিক করে
  const updateSheetStructural = useCallback(
    (patch: (s: WorkbookSheet) => Partial<WorkbookSheet>, change: StructuralChange) => {
      setSheets((prev) => {
        const target = prev[activeSheetIndex];
        if (!target) return prev;
        const patched = prev.map((item, index) => (index === activeSheetIndex ? { ...item, ...patch(item) } : item));
        return applyStructuralChangeToWorkbook(patched, target.id, change);
      });
    },
    [activeSheetIndex, setSheets]
  );
  const focusActiveGridCell = useCallback(() => {
    requestAnimationFrame(() => {
      cellRefs.current.get(activeCell)?.focus({
        preventScroll: true,
      });
    });
  }, [activeCell]);
  const getRawValue = useCallback((key: string) => sheet.cells[key]?.value ?? "", [sheet.cells]);

  // Each top-level formula evaluation gets a local cache. This avoids mutating refs
  // during React render while still preventing repeated work inside nested formulas
  const getCellValue = useCallback(
    (
      key: string,
      visiting: Set<string> = new Set(),
      activeSheet: WorkbookSheet = sheet,
      allSheets: WorkbookSheet[] = sheets
    ): EvalResult => {
      const evaluationCache = new Map<string, EvalResult>();

      const resolveCellValue = (
        targetKey: string,
        currentVisiting: Set<string>,
        currentSheet: WorkbookSheet
      ): EvalResult => {
        const cell = currentSheet.cells[targetKey];
        const raw = cell?.value ?? "";

        if (!raw) return "";
        if (cell?.style?.numberFormat === "text") return raw;
        if (!raw.startsWith("=")) return parseNumericCell(raw);

        const visitKey = `${historyVersion}:${currentSheet.id}!${targetKey}`;
        if (currentVisiting.has(visitKey)) return "#CIRCULAR!";

        const cached = evaluationCache.get(visitKey);
        if (cached !== undefined) return cached;

        const nextVisiting = new Set(currentVisiting);
        nextVisiting.add(visitKey);

        const findSheet = (name: string): WorkbookSheet | undefined =>
          allSheets.find(
            (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase()
          );

        const getCell = (reference: string): EvalResult => {
          const { sheetName, reference: localReference } = splitSheetReference(reference);
          if (!sheetName) {
            return resolveCellValue(localReference, nextVisiting, currentSheet);
          }

          const targetSheet = findSheet(sheetName);
          if (!targetSheet) return "#REF!";
          return resolveCellValue(localReference, nextVisiting, targetSheet);
        };

        const expandRange = (range: string): EvalResult[] => {
          const { sheetName, reference: localReference } = splitSheetReference(range);
          const rangeSheet = sheetName ? findSheet(sheetName) : currentSheet;
          if (!rangeSheet) return ["#REF!"];

          const normalizedRange = normalizeRange(localReference);
          if (!normalizedRange) return [];

          const output: EvalResult[] = [];
          for (let row = normalizedRange.r1; row <= normalizedRange.r2; row += 1) {
            for (let col = normalizedRange.c1; col <= normalizedRange.c2; col += 1) {
              output.push(resolveCellValue(cellKey(row, col), nextVisiting, rangeSheet));
            }
          }
          return output;
        };

        const previousCellKey = currentEvalCellKey;
        const previousEvalContext = currentEvalContext;
        currentEvalCellKey = targetKey;
        // [ধাপ ২] SUBTOTAL-এর লুকানো সারি ও পুরো-কলাম রেঞ্জের জন্য বর্তমান শিটের তথ্য
        currentEvalContext = { sheet: currentSheet, allSheets };
        let result: EvalResult;
        try {
          result = evaluateFormula(raw.slice(1), getCell, expandRange);
        } finally {
          currentEvalCellKey = previousCellKey;
          currentEvalContext = previousEvalContext;
        }
        evaluationCache.set(visitKey, result);
        return result;
      };

      return resolveCellValue(key, visiting, activeSheet);
    },
    [sheet, sheets, historyVersion]
  );



  const activePos = useMemo(() => parseKey(activeCell) || { row: 0, col: 0 }, [activeCell]);

  // 🛡️ P0-FIX-2: selection cell cap — বড় selection-এ crash আটকাতে
  const MAX_SELECTION_CELLS = 50000;

  const selectionCells = useMemo(() => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);
    const total = (r2 - r1 + 1) * (c2 - c1 + 1);
    const set = new Set<string>();
    if (total > MAX_SELECTION_CELLS) {
      const maxRows = Math.max(1, Math.floor(MAX_SELECTION_CELLS / (c2 - c1 + 1)));
      for (let r = r1; r < r1 + maxRows; r++) {
        for (let c = c1; c <= c2; c++) set.add(cellKey(r, c));
      }
    } else {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) set.add(cellKey(r, c));
      }
    }
    for (const r of ctrlSelectedRows) {
      if (set.size >= MAX_SELECTION_CELLS) break;
      for (let c = 0; c < sheet.gridCols; c++) {
        if (set.size >= MAX_SELECTION_CELLS) break;
        set.add(cellKey(r, c));
      }
    }
    for (const c of ctrlSelectedCols) {
      if (set.size >= MAX_SELECTION_CELLS) break;
      for (let r = 0; r < sheet.gridRows; r++) {
        if (set.size >= MAX_SELECTION_CELLS) break;
        set.add(cellKey(r, c));
      }
    }
    for (const k of ctrlSelectedCells) {
      if (set.size >= MAX_SELECTION_CELLS) break;
      set.add(k);
    }
    return Array.from(set);
  }, [selection, ctrlSelectedRows, ctrlSelectedCols, ctrlSelectedCells, sheet.gridRows, sheet.gridCols]);

  const hiddenRows = useMemo(() => new Set(sheet.hiddenRows), [sheet.hiddenRows]);
  // কোন কোন কলাম হাইড করা আছে — দ্রুত লুকআপের জন্য Set-এ রাখা হলো
  const hiddenCols = useMemo(() => {
    const set = new Set(sheet.hiddenCols || []);
    (sheet.colGroups || []).forEach((group) => {
      if (group.collapsed) {
        for (let col = group.start + 1; col <= group.end; col++) set.add(col);
      }
    });
    return set;
  }, [sheet.hiddenCols, sheet.colGroups]);


  const rowsArr = useMemo(() => Array.from({ length: sheet.gridRows }, (_, i) => i), [sheet.gridRows]);


  // ২০০ কলামের মধ্যে শুধু স্ক্রিনে দেখা যাচ্ছে এমন কলামগুলোই DOM-এ রেন্ডার হবে —
  // এটাই flicker/lag-এর মূল কারণ ঠিক করে (প্রতি রো-তে ২০০ সেলের বদলে ~৩০-৪০টা)
  const hasColumnMerges = useMemo(
    () => Object.values(sheet.cells).some(cell => (cell.colSpan || 1) > 1),
    [sheet.cells]
  );
  const virtualizeCols = !hasColumnMerges && sheet.gridCols > 40;

  // প্রতিটা কলামের বাম-প্রান্তের cumulative (ক্রমযোজিত) পজিশন — colWidths/gridCols
  // বদলালে তবেই আবার হিসাব হবে, প্রতি স্ক্রলে না, তাই সস্তা
  const colOffsets = useMemo(() => {
    const offsets: number[] = new Array(sheet.gridCols + 1);
    offsets[0] = 0;
    for (let i = 0; i < sheet.gridCols; i++) {
      offsets[i + 1] = offsets[i] + (hiddenCols.has(i) ? 0 : sheet.colWidths[i] || DEFAULT_COL_WIDTH);
    }
    return offsets;
  }, [sheet.gridCols, sheet.colWidths, hiddenCols]);

  // scrollLeft অনুযায়ী কোন কলাম থেকে কোন কলাম পর্যন্ত ভিজিবল সেটা
  // বাইনারি সার্চ দিয়ে বের করা হচ্ছে (O(log n) — দ্রুত, স্ক্রলে lag করে না)



  const visibleColRange = useMemo(() => {
    if (!virtualizeCols) return { start: 0, end: sheet.gridCols - 1 };
    const BUFFER = Math.max(12, Math.min(24, Math.ceil(viewport.clientWidth / DEFAULT_COL_WIDTH))); // স্ক্রলের সময় হালকা বাফার রাখা হলো যাতে ফাঁকা না দেখায়

    let lo = sheet.frozenCols, hi = sheet.gridCols - 1, startCol = sheet.frozenCols;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (colOffsets[mid] < viewport.scrollLeft) { startCol = mid; lo = mid + 1; }
      else hi = mid - 1;
    }

    const rightEdge = viewport.scrollLeft + viewport.clientWidth;
    lo = startCol; hi = sheet.gridCols - 1;
    let endCol = startCol;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (colOffsets[mid] < rightEdge) { endCol = mid; lo = mid + 1; }
      else hi = mid - 1;
    }

    return {
      start: Math.max(sheet.frozenCols, startCol - BUFFER),
      end: Math.min(sheet.gridCols - 1, endCol + BUFFER),
    };
  }, [virtualizeCols, viewport.scrollLeft, viewport.clientWidth, colOffsets, sheet.gridCols, sheet.frozenCols]);

  // স্ক্রিনে যে কলামগুলো দেখা যাবে তার তালিকা। virtualization চালু থাকলে:
  // [frozen কলাম..., -1 (বাম spacer), দৃশ্যমান কলাম..., -2 (ডান spacer)]
  const columns = useMemo(() => {
    if (!virtualizeCols) return Array.from({ length: sheet.gridCols }, (_, i) => i);
    const out: number[] = [];
    for (let i = 0; i < sheet.frozenCols && i < sheet.gridCols; i++) out.push(i);
    out.push(-1);
    for (let i = visibleColRange.start; i <= visibleColRange.end; i++) {
      if (i >= sheet.frozenCols) out.push(i);
    }
    out.push(-2);
    return out;
  }, [sheet.gridCols, sheet.frozenCols, virtualizeCols, visibleColRange.start, visibleColRange.end]);

  // বাদ পড়া কলামগুলোর মোট প্রস্থ (hidden কলাম বাদ দিয়ে)। spacer এই প্রস্থ নেবে
  const colSpacerWidths = useMemo(() => {
    if (!virtualizeCols) return { left: 0, right: 0 };
    return {
      left: Math.max(0, colOffsets[visibleColRange.start] - colOffsets[sheet.frozenCols]),
      right: Math.max(0, colOffsets[sheet.gridCols] - colOffsets[visibleColRange.end + 1]),
    };
  }, [virtualizeCols, colOffsets, sheet.frozenCols, sheet.gridCols, visibleColRange.start, visibleColRange.end]);

  const selectedRangeText = useMemo(() => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);
    return `${cellKey(r1, c1)}:${cellKey(r2, c2)}`;
  }, [selection]);

  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [borderMenuOpen, setBorderMenuOpen] = useState(false);
  const [borderWidthMenuOpen, setBorderWidthMenuOpen] = useState(false);
  const borderMenuRef = useRef<HTMLDivElement>(null)

  const closeBorderMenu = () => setBorderMenuOpen(false);

  useEffect(() => {
    if (!borderMenuOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (borderMenuRef.current && e.target instanceof Node && borderMenuRef.current.contains(e.target)) {
        return;
      }
      setBorderMenuOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [borderMenuOpen]);

  const [currencySearch, setCurrencySearch] = useState("");

  const [autoFilterEnabled, setAutoFilterEnabled] = useState(false);
  const autoFilterIsEnabled = autoFilterEnabled || Object.keys(sheet.filters || {}).length > 0;

  const [autoFilterMenu, setAutoFilterMenu] = useState<{
    col: number;
    x: number;
    y: number;
  } | null>(null);

  const [autoFilterDraft, setAutoFilterDraft] = useState<AutoFilterState | null>(null);
  const autoFilterMenuRef = useRef<HTMLDivElement>(null);

  const activeCellStyle = sheet.cells[activeCell]?.style || {};
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (showHomeScreen || showLoadDialog || editingKey) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      cellRefs.current.get(activeCell)?.focus({
        preventScroll: true,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    showHomeScreen,
    showLoadDialog,
    sheet.id,
    activeCell,
    editingKey,
  ]);
  useLayoutEffect(() => {
    if (!editingKey) return;
    const el = editorRef.current;
    if (!el) return;

    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [editingKey]);

  // Edit width is derived from the current editor content and cell formatting.
  // Keeping it derived avoids an effect-driven extra render while preserving sizing.
  const editWidth = useMemo(() => {
    if (!editingKey) return null;
    const cellStyle = sheet.cells[editingKey]?.style;
    const fontSize = cellStyle?.fontSize || 12;
    const fontFamily = cellStyle?.fontFamily || "Inter";
    const font = `${cellStyle?.bold ? "bold " : ""}${cellStyle?.italic ? "italic " : ""}${fontSize}px ${fontFamily}`;
    const textWidth = measureTextWidth(editValue, font);
    const pos = parseKey(editingKey);
    const cellWidth = pos ? (sheet.colWidths[pos.col] || DEFAULT_COL_WIDTH) : DEFAULT_COL_WIDTH;
    return Math.max(cellWidth, Math.ceil(textWidth) + 20);
  }, [editValue, editingKey, sheet.cells, sheet.colWidths]);

  const isSelected = useCallback(
    (row: number, col: number) => {
      const r1 = Math.min(selection.r1, selection.r2);
      const r2 = Math.max(selection.r1, selection.r2);
      const c1 = Math.min(selection.c1, selection.c2);
      const c2 = Math.max(selection.c1, selection.c2);
      return row >= r1 && row <= r2 && col >= c1 && col <= c2;
    },
    [selection]
  );


  const formatDisplayValue = useCallback((rawValue: EvalResult, style?: CellStyle) => {
    if (rawValue === "") return "";
    if (typeof rawValue === "boolean") return rawValue ? "TRUE" : "FALSE";
    const numberFormat = style?.numberFormat || "general";
    const decimals = typeof style?.decimals === "number" ? style.decimals : 2;

    if (numberFormat === "text") return String(rawValue);

    if (numberFormat === "date") {
      // [হিসাব-সংশোধন] সংখ্যা (যেমন 5) আর তারিখ ধরা হয় না; YYYY-MM-DD স্থানীয় তারিখ হিসেবে পড়া হয়
      // (আগে UTC ধরায় UTC-র পিছনের টাইমজোনে একদিন আগের তারিখ দেখাত)
      if (typeof rawValue !== "string") return String(rawValue);
      const text = rawValue.trim();
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
      if (iso) {
        const y = Number(iso[1]);
        const m = Number(iso[2]);
        const d = Number(iso[3]);
        const local = new Date(y, m - 1, d);
        if (local.getFullYear() === y && local.getMonth() === m - 1 && local.getDate() === d) {
          return local.toLocaleDateString();
        }
        return rawValue;
      }
      if (!/[\/\-]|[A-Za-z]/.test(text)) return rawValue;
      const date = new Date(text);
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
      return rawValue;
    }

    const numeric =
      typeof rawValue === "number" ? rawValue : NaN;
    if (Number.isFinite(numeric)) {
      if (numberFormat === "currency") {
        return toDisplayDigits(formatCurrencyValue(numeric, style?.currencyCode || "USD", decimals));
      }
      if (numberFormat === "percentage") {
        return `${formatDisplayNumber(roundHalfAway(cleanNumber(numeric * 100), decimals), decimals)}%`;
      }
      if (numberFormat === "number") {
        return formatDisplayNumber(roundHalfAway(numeric, decimals), decimals);
      }
      if (numberFormat === "scientific") {
        return numeric.toExponential(decimals);
      }
      if (numberFormat === "accounting") {
        const abs = formatDisplayNumber(roundHalfAway(Math.abs(numeric), decimals), decimals);
        return numeric === 0 ? "-" : numeric < 0 ? `(${abs})` : `${abs}`;
      }
      if (numberFormat === "custom" && style?.customFormat) {
        return applyCustomNumberFormat(numeric, style.customFormat);
      }
      if (Number.isInteger(numeric)) return formatDisplayNumber(numeric, null);
      // [হিসাব-সংশোধন] General ফরম্যাটে দশমিক সংখ্যা আর জোর করে ২ ঘরে কাটা হয় না (1/3 → 0.333333333333, 0.001 → 0.001)।
      // স্পষ্টভাবে দশমিক-সংখ্যা ঠিক করা থাকলে সেটিই মানা হয়।
      if (typeof style?.decimals === "number") {
        return formatDisplayNumber(roundHalfAway(numeric, Math.max(0, Math.min(decimals, 10))), Math.max(0, Math.min(decimals, 10)));
      }
      return formatDisplayNumber(cleanNumber(numeric), null);
    }

    return String(rawValue);
  }, []);

  const getDisplayValue = useCallback(
    (key: string) => {
      const val = getCellValue(key);
      return formatDisplayValue(val, sheet.cells[key]?.style);
    },
    [getCellValue, formatDisplayValue, sheet.cells]
  );

  const setCellData = useCallback(
    (key: string, rawPatch: Partial<CellData>) => {
      const patch: Partial<CellData> = { ...rawPatch };
      if ("hyperlink" in patch && patch.hyperlink) {
        const safe = sanitizeUrl(patch.hyperlink);
        if (!safe) {
          patch.hyperlink = undefined;
        }
        else patch.hyperlink = safe;
      }
      updateSheet((s) => ({
        cells: { ...s.cells, [key]: { ...(s.cells[key] || { value: "" }), ...patch } },
      }));
    },
    [updateSheet]
  );

  const setCellValue = useCallback(
    (key: string, value: string) => {
      updateSheet((s) => ({
        cells: { ...s.cells, [key]: { ...(s.cells[key] || { value: "" }), value } },
      }));
      // Macro recording চালু থাকলে এই cell-value change action হিসেবে record হচ্ছে
      recordAction({ type: "SET_VALUE", keys: [key], value });
    },
    [updateSheet, recordAction]
  );

  useEffect(() => {
    if (editingKey) return;
    const el = cellRefs.current.get(activeCell);
    if (el && document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
  }, [activeCell, editingKey]);
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && e.target instanceof Node && contextMenuRef.current.contains(e.target)) return;
      setContextMenu(null);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  // কলাম হেডার কনটেক্সট মেনুর বাইরে ক্লিক করলে মেনু বন্ধ হয়ে যাবে
  useEffect(() => {
    if (!columnContextMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        columnContextMenuRef.current &&
        e.target instanceof Node &&
        columnContextMenuRef.current.contains(e.target)
      ) return;
      setColumnContextMenu(null);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [columnContextMenu]);

  // রো হেডার কনটেক্সট মেনুর বাইরে ক্লিক করলে মেনু বন্ধ হয়ে যাবে
  useEffect(() => {
    if (!rowContextMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        rowContextMenuRef.current &&
        e.target instanceof Node &&
        rowContextMenuRef.current.contains(e.target)
      ) return;
      setRowContextMenu(null);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [rowContextMenu]);

  useEffect(() => {
    if (!showAutoSumMenu) return;
    const handler = (e: MouseEvent) => {
      if (autoSumMenuRef.current && e.target instanceof Node && autoSumMenuRef.current.contains(e.target)) return;
      setShowAutoSumMenu(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showAutoSumMenu]);

  useEffect(() => {
    if (!autoFilterMenu) return;

    const handler = (e: MouseEvent) => {
      if (
        autoFilterMenuRef.current &&
        e.target instanceof Node &&
        autoFilterMenuRef.current.contains(e.target)
      ) {
        return;
      }

      setAutoFilterMenu(null);
      setAutoFilterDraft(null);
    };

    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [autoFilterMenu]);

  useEffect(() => {
    if (!shareMenu) return;
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && e.target instanceof Node && shareMenuRef.current.contains(e.target)) return;
      setShareMenu(null);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [shareMenu]);

  const handleMouseDown = (row: number, col: number, e?: React.MouseEvent) => {
    // রাইট-ক্লিক (e.button === 2) হলে সিলেকশন পরিবর্তন করা যাবে না।
    // কারণ ব্রাউজারে রাইট-ক্লিকের সময় mousedown আগে ফায়ার হয়, তারপর
    // contextmenu ইভেন্ট। আগে থেকে একাধিক সেল সিলেক্ট করা থাকলে এই
    // চেক না থাকলে mousedown সেই সিলেকশনকে একটা মাত্র সেলে সংকুচিত করে
    // ফেলতো, ফলে রাইট-ক্লিক মেনুর "Copy" শুধু একটা সেল কপি করতো।
    // ইতিমধ্যে সিলেক্ট করা এলাকার বাইরে রাইট-ক্লিক করলে অবশ্য
    // onContextMenu হ্যান্ডলার ঠিকই নতুন সিলেকশন বসাবে।
    if (e?.button === 2) return;
    const key = cellKey(row, col);
    if (e && (e.ctrlKey || e.metaKey)) {
      dragging.current = false;
      setCtrlSelectedCells((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
      return;
    }
    setCtrlSelectedRows([]);
    setCtrlSelectedCols([]);
    setCtrlSelectedCells([]);
    if (e?.shiftKey) {
      dragging.current = false;
      setSelection((prev) => ({ ...prev, r2: row, c2: col }));
      setActiveCell(key);
      return;
    }

    dragging.current = true;
    setActiveCell(key);
    setSelection({ r1: row, c1: col, r2: row, c2: col });
    // Macro recording চালু থাকলে cell-selection action হিসেবে record হচ্ছে
    recordAction({ type: "SELECT", keys: [key], activeCell: key });
    if (formatPainter) {

      setCellData(key, { style: { ...formatPainter, wrap: true } });
      setFormatPainter(null);
      showToast("Formatting applied.");
    }
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isFilling.current) {
      dragFillTo(row, col);
      return;
    }
    if (dragging.current) setSelection((prev) => ({ ...prev, r2: row, c2: col }));
  };

  const selectEntireRow = useCallback((row: number) => {
    setActiveCell(cellKey(row, 0));
    setSelection({ r1: row, c1: 0, r2: row, c2: sheet.gridCols - 1 });
  }, [sheet.gridCols]);

  const selectEntireColumn = useCallback((col: number) => {
    setActiveCell(cellKey(0, col));
    setSelection({ r1: 0, c1: col, r2: sheet.gridRows - 1, c2: col });
  }, [sheet.gridRows]);

  const commitFill = useCallback((source: SelectionRange, target: SelectionRange) => {
    const sr1 = Math.min(source.r1, source.r2);
    const sr2 = Math.max(source.r1, source.r2);
    const sc1 = Math.min(source.c1, source.c2);
    const sc2 = Math.max(source.c1, source.c2);
    const tr1 = Math.min(target.r1, target.r2);
    const tr2 = Math.max(target.r1, target.r2);
    const tc1 = Math.min(target.c1, target.c2);
    const tc2 = Math.max(target.c1, target.c2);
    const down = tr2 - sr2;
    const up = sr1 - tr1;
    const right = tc2 - sc2;
    const left = sc1 - tc1;
    const vertical = Math.max(down, up);
    const horizontal = Math.max(right, left);
    let direction: "down" | "up" | "right" | "left" | null = null;
    if (vertical >= horizontal && (down > 0 || up > 0)) direction = down >= up ? "down" : "up";
    else if (right > 0 || left > 0) direction = right >= left ? "right" : "left";
    if (!direction) return;
    const seriesMode = fillSeriesMode.current;
    updateSheet((s) => {
      const nextCells = { ...s.cells };
      if (direction === "down" || direction === "up") {
        const rows: number[] = [];
        for (let r = sr1; r <= sr2; r++) rows.push(r);
        const n = rows.length;
        const start = direction === "down" ? sr2 + 1 : tr1;
        const end = direction === "down" ? tr2 : sr1 - 1;
        for (let c = sc1; c <= sc2; c++) {
          const values = rows.map((r) => s.cells[cellKey(r, c)]?.value ?? "");
          for (let r = start; r <= end; r++) {
            const overallIndex = r - sr1;
            const srcIdx = ((overallIndex % n) + n) % n;
            const srcRow = rows[srcIdx];
            const srcVal = values[srcIdx];
            const srcStyle = s.cells[cellKey(srcRow, c)]?.style;
            const newVal = srcVal.startsWith("=")
              ? "=" + shiftFormulaRefs(srcVal.slice(1), overallIndex, 0)
              : computeSeriesValue(values, overallIndex, seriesMode);
            nextCells[cellKey(r, c)] = { ...(nextCells[cellKey(r, c)] || { value: "" }), value: newVal, style: srcStyle };
          }
        }
      } else {
        const cols: number[] = [];
        for (let c = sc1; c <= sc2; c++) cols.push(c);
        const n = cols.length;
        const start = direction === "right" ? sc2 + 1 : tc1;
        const end = direction === "right" ? tc2 : sc1 - 1;
        for (let r = sr1; r <= sr2; r++) {
          const values = cols.map((c) => s.cells[cellKey(r, c)]?.value ?? "");
          for (let c = start; c <= end; c++) {
            const overallIndex = c - sc1;
            const srcIdx = ((overallIndex % n) + n) % n;
            const srcCol = cols[srcIdx];
            const srcVal = values[srcIdx];
            const srcStyle = s.cells[cellKey(r, srcCol)]?.style;
            const newVal = srcVal.startsWith("=")
              ? "=" + shiftFormulaRefs(srcVal.slice(1), 0, overallIndex)
              : computeSeriesValue(values, overallIndex, seriesMode);
            nextCells[cellKey(r, c)] = { ...(nextCells[cellKey(r, c)] || { value: "" }), value: newVal, style: srcStyle };
          }
        }
      }
      return { cells: nextCells };
    });
    showToast(seriesMode ? "Series fill applied." : "Copied fill applied.");
  }, [updateSheet, showToast]);

  const startFillDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isFilling.current = true;
    fillSeriesMode.current = Boolean(e.ctrlKey || e.metaKey);
    fillBaseSelection.current = { ...selection };
    setFillPreview({ ...selection });
  }, [selection]);

  const dragFillTo = useCallback((row: number, col: number) => {
    if (!isFilling.current || !fillBaseSelection.current) return;
    const base = fillBaseSelection.current;
    const br1 = Math.min(base.r1, base.r2);
    const br2 = Math.max(base.r1, base.r2);
    const bc1 = Math.min(base.c1, base.c2);
    const bc2 = Math.max(base.c1, base.c2);
    const verticalDistance = row < br1 ? br1 - row : row - br2;
    const horizontalDistance = col < bc1 ? bc1 - col : col - bc2;
    if (verticalDistance >= horizontalDistance) {
      setFillPreview({ r1: Math.min(br1, row), c1: bc1, r2: Math.max(br2, row), c2: bc2 });
    } else {
      setFillPreview({ r1: br1, c1: Math.min(bc1, col), r2: br2, c2: Math.max(bc2, col) });
    }
  }, []);

  const endFillDrag = useCallback(() => {
    if (!isFilling.current) return;
    isFilling.current = false;
    const base = fillBaseSelection.current;
    fillBaseSelection.current = null;
    setFillPreview((currentPreview) => {
      if (base && currentPreview) commitFill(base, currentPreview);
      return null;
    });
  }, [commitFill]);

  // [মাউস ফিক্স] দ্রুত ড্র্যাগে সেল স্কিপ না হয় — pointer position থেকে সেল/হেডার নির্ধারণ
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el) return;
      if (isFilling.current) {
        const cell = el.closest("td[data-row]") as HTMLElement | null;
        if (!cell) return;
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        if (Number.isFinite(r) && Number.isFinite(c)) dragFillTo(r, c);
        return;
      }
      if (dragging.current) {
        const cell = el.closest("td[data-row]") as HTMLElement | null;
        if (!cell) return;
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        if (Number.isFinite(r) && Number.isFinite(c)) {
          setSelection((prev) => ({ ...prev, r2: r, c2: c }));
        }
        return;
      }
      if (draggingHeader.current === "row") {
        const header = el.closest("td[data-row-header]") as HTMLElement | null;
        if (header) {
          const r = Number(header.dataset.rowHeader);
          if (Number.isFinite(r)) selectEntireRow(r);
        }
        return;
      }
      if (draggingHeader.current === "col") {
        const header = el.closest("th[data-col-header]") as HTMLElement | null;
        if (header) {
          const c = Number(header.dataset.colHeader);
          if (Number.isFinite(c)) selectEntireColumn(c);
        }
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [dragFillTo, selectEntireRow, selectEntireColumn]);

  useEffect(() => {
    const up = () => {
      dragging.current = false;
      draggingHeader.current = null;
      endFillDrag();
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [endFillDrag]);




  const commitEdit = useCallback(
    (moveDir: "down" | "right" | "up" | "left" | "none" = "down") => {
      if (editingKey) setCellValue(editingKey, editValue);
      setEditingKey(null);
      // এডিট শেষ করে (commit করে) নির্দিষ্ট দিকের পাশের সেলে চলে যাওয়া হচ্ছে —
      // Excel-এর মতো: লেখা শেষ করে Arrow key চাপলেই পাশের সেলে চলে যাবে
      if (moveDir === "down") {
        const pos = parseKey(activeCell)!;
        const nr = Math.min(pos.row + 1, sheet.gridRows - 1);
        setActiveCell(cellKey(nr, pos.col));
        setSelection({ r1: nr, c1: pos.col, r2: nr, c2: pos.col });
      } else if (moveDir === "up") {
        const pos = parseKey(activeCell)!;
        const nr = Math.max(pos.row - 1, 0);
        setActiveCell(cellKey(nr, pos.col));
        setSelection({ r1: nr, c1: pos.col, r2: nr, c2: pos.col });
      } else if (moveDir === "right") {
        const pos = parseKey(activeCell)!;
        const nc = Math.min(pos.col + 1, sheet.gridCols - 1);
        setActiveCell(cellKey(pos.row, nc));
        setSelection({ r1: pos.row, c1: nc, r2: pos.row, c2: nc });
      } else if (moveDir === "left") {
        const pos = parseKey(activeCell)!;
        const nc = Math.max(pos.col - 1, 0);
        setActiveCell(cellKey(pos.row, nc));
        setSelection({ r1: pos.row, c1: nc, r2: pos.row, c2: nc });
      }
    },
    [editingKey, editValue, activeCell, sheet.gridRows, sheet.gridCols, setCellValue]
  );

  const startEditing = (key: string, initial?: string) => {
    setEditingKey(key);
    setEditValue(initial !== undefined ? initial : getRawValue(key));
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    const key = cellKey(row, col);
    if (editingKey === key) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        commitEdit(e.shiftKey ? "up" : "down");
      } else if (e.key === "Tab") {
        e.preventDefault();
        commitEdit("right");
      } else if (e.key === "Escape") {
        setEditingKey(null);
      } else if (e.key.startsWith("Arrow")) {
        // এডিট করার সময় Arrow key চাপলে লেখাটা সেভ (commit) হয়ে যাবে,
        // তারপর সেই দিকের পাশের সেলে চলে যাবে — ঠিক Excel-এর মতো আচরণ
        e.preventDefault();
        if (e.key === "ArrowRight") commitEdit("right");
        else if (e.key === "ArrowLeft") commitEdit("left");
        else if (e.key === "ArrowDown") commitEdit("down");
        else if (e.key === "ArrowUp") commitEdit("up");
      }
      return;
    }

    // Ctrl+A / Cmd+A — Select entire sheet
    if (
      (e.ctrlKey || e.metaKey) &&
      !e.altKey &&
      !e.shiftKey &&
      e.key.toLowerCase() === "a"
    ) {
      e.preventDefault();
      e.stopPropagation();
      selectAllCells();
      return;
    }


    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      setShowFindReplace(true);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();


      commitEdit(e.shiftKey ? "up" : "down");
      return;
    } else if (e.key === "F2") {
      e.preventDefault();
      e.stopPropagation();


      startEditing(key);
      return;
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();

      const totalSelectedCells = selectionCells.length;

      if (
        totalSelectedCells > 500 &&
        !window.confirm(
          "Clear all selected cells? Formulas in the selected cells will also be removed."
        )
      ) {
        return;
      }

      updateSheet((s) => {
        const next = { ...s.cells };
        selectionCells.forEach((k) => {
          next[k] = { ...(next[k] || { value: "" }), value: "" };
        });
        return { cells: next };
      });
      showToast("Selection cleared.");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      doCopy("copy");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
      e.preventDefault();
      doCopy("cut");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      e.preventDefault();
      doPaste();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      startEditing(key, e.key);
    } else if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const nr = e.key === "ArrowDown" ? Math.min(row + 1, sheet.gridRows - 1) : e.key === "ArrowUp" ? Math.max(row - 1, 0) : row;
      const nc = e.key === "ArrowRight" ? Math.min(col + 1, sheet.gridCols - 1) : e.key === "ArrowLeft" ? Math.max(col - 1, 0) : col;
      setActiveCell(cellKey(nr, nc));
      setSelection({ r1: nr, c1: nc, r2: nr, c2: nc });
    }
  };


  const applyStyleToSelection = useCallback((patch: Partial<CellStyle>, targetKeys?: string[]) => {
    // targetKeys দেওয়া থাকলে (Macro Playback থেকে আসা explicit cell list)
    // সেটাই ব্যবহার হবে; না দিলে স্বাভাবিক UI ব্যবহারে বর্তমান selectionCells ব্যবহার হবে
    const keys = targetKeys && targetKeys.length ? targetKeys : selectionCells;
    updateSheet((s) => {
      const next = { ...s.cells };
      keys.forEach((k) => {
        next[k] = {
          ...(next[k] || { value: "" }),
          style: { ...(next[k]?.style || {}), wrap: true, ...patch },
        };
      });
      return { cells: next };
    });
    // Macro recording চালু থাকলে এই formatting-change action হিসেবে record হচ্ছে
    recordAction({ type: "SET_STYLE", keys, style: patch });
  }, [selectionCells, updateSheet, recordAction]);


  const toggleStyle = (field: "bold" | "italic" | "underline") => {
    const current = sheet.cells[activeCell]?.style?.[field];
    applyStyleToSelection({ [field]: !current } as Partial<CellStyle>);
    showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} ${current ? "off" : "on"}.`);
  };


  const toggleBorderAll = () => {
    const current = sheet.cells[activeCell]?.style?.borders;
    const on = !(current && current.top && current.right && current.bottom && current.left);
    applyStyleToSelection({ borders: { top: on, right: on, bottom: on, left: on } });
    showToast(on ? "Borders applied." : "Borders removed.");
  };
  const applyBorderPreset = (preset: BorderPreset) => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);


    updateSheet((s) => {
      const next = { ...s.cells };
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const key = cellKey(r, c);
          const existing = next[key] || { value: "" };
          const existingStyle = existing.style || {};
          let borders: CellBorders | undefined;


          switch (preset) {
            case "none":
              borders = undefined;
              break;
            case "left":
              borders = { left: true };
              break;
            case "right":
              borders = { right: true };
              break;
            case "top":
              borders = { top: true };
              break;
            case "bottom":
              borders = { bottom: true };
              break;
            case "all":
              borders = { top: true, right: true, bottom: true, left: true };
              break;
            case "outside":
              borders = {
                top: r === r1,
                bottom: r === r2,
                left: c === c1,
                right: c === c2,
              };
              break;
            case "inside":
              borders = {
                top: r > r1,
                bottom: r < r2,
                left: c > c1,
                right: c < c2,
              };
              break;
          }


          next[key] = {
            ...existing,
            style: { ...existingStyle, wrap: true, borders },
          };
        }
      }
      return { cells: next };
    });

    showToast(preset === "none" ? "Borders removed." : "Borders applied.");
  };

  const macroSleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  // এখানে recorded action sequence অনুযায়ী macro playback করা হচ্ছে
  const runMacro = useCallback(async (macro: SavedMacro) => {
    if (isPlayingMacroRef.current) {
      showToast("ইতিমধ্যে একটি macro চলছে।");
      return;
    }
    if (isRecordingRef.current) {
      showToast("Recording চলাকালীন macro run করা যাবে না।");
      return;
    }
    if (!macro.actions.length) {
      showToast("এই macro-তে কোনো action নেই।");
      return;
    }

    // Playback চলাকালীন পুনরায় recording শুরু হওয়া আটকানো হচ্ছে (recursion prevention)
    isPlayingMacroRef.current = true;
    macroCancelRef.current = false;
    setIsPlayingMacro(true);
    showToast(`Macro "${macro.name}" চলছে...`);

    try {
      for (const action of macro.actions) {
        if (macroCancelRef.current) {
          showToast("Macro playback বাতিল করা হয়েছে।");
          break;
        }
        if (!action.keys || action.keys.length === 0) continue;

        try {
          if (action.type === "SELECT") {
            const first = parseKey(action.keys[0]);
            const last = parseKey(action.keys[action.keys.length - 1]);
            if (first && last) {
              setSelection({ r1: first.row, c1: first.col, r2: last.row, c2: last.col });
              if (action.activeCell) setActiveCell(action.activeCell);
            }
          } else if (action.type === "SET_VALUE") {
            setCellValue(action.keys[0], action.value ?? "");
          } else if (action.type === "SET_STYLE" && action.style) {
            applyStyleToSelection(action.style, action.keys);
          }
        } catch {
          // একটি step fail করলেও পুরো playback থামবে না
          showToast("একটি macro step execute করা যায়নি, পরবর্তী step-এ এগিয়ে যাওয়া হচ্ছে।");
        }

        await macroSleep(120);
      }
      if (!macroCancelRef.current) showToast(`Macro "${macro.name}" সম্পন্ন হয়েছে।`);
    } finally {
      isPlayingMacroRef.current = false;
      setIsPlayingMacro(false);
    }
  }, [showToast, setCellValue, applyStyleToSelection]);

  const grabFormat = () => {
    setFormatPainter(sheet.cells[activeCell]?.style ? { ...sheet.cells[activeCell]!.style } : { wrap: true });
    showToast("Format painter is active.");
  };

  const genDrawId = () => `draw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const getOverlayPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTestDrawShape = (pt: { x: number; y: number }): string | null => {
    const shapes = sheet.drawings || [];
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (s.type === "rectangle" || s.type === "ellipse") {
        if (pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h) return s.id;
      } else if (s.type === "connector") {
        const p1 = resolveConnectorPoint(s, "start", shapes);
        const p2 = resolveConnectorPoint(s, "end", shapes);
        if (Math.hypot(p1.x - pt.x, p1.y - pt.y) < 8 || Math.hypot(p2.x - pt.x, p2.y - pt.y) < 8) return s.id;
      } else if (s.points?.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 8)) {
        return s.id;
      }
    }
    return null;
  };

  const handleDrawPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getOverlayPoint(e);
    if (activeDrawTool === "select") {
      const hit = hitTestDrawShape(pt);
      setSelectedDrawId(hit);
      if (hit) drawingRef.current = { type: "select", startX: pt.x, startY: pt.y, points: [pt] };
      return;
    }

    if (activeDrawTool === "connector") {
      const startShape = hitTestBoxShape(pt, sheet.drawings || []);
      if (!startShape) {
        showToast("Rectangle বা Ellipse শেপ থেকে টেনে Connector শুরু করুন।");
        return;
      }
      const side = nearestShapeSide(startShape, pt);
      const anchor = getShapeAnchorPoint(startShape, side);
      drawingRef.current = { type: "connector", startX: anchor.x, startY: anchor.y, points: [anchor] };
      setDrawPreview({
        id: "preview",
        type: "connector",
        x: 0, y: 0, w: 0, h: 0,
        stroke: "#106EBE",
        fill: "none",
        strokeWidth: 2,
        connectorStyle: "straight",
        startAttach: { id: startShape.id, side },
        endPoint: anchor,
      });
      return;
    }

    drawingRef.current = { type: activeDrawTool, startX: pt.x, startY: pt.y, points: [pt] };
    setDrawPreview({
      id: "preview",
      type: activeDrawTool,
      x: pt.x, y: pt.y, w: 0, h: 0,
      points: [pt],
      stroke: "#106EBE",
      fill: activeDrawTool === "rectangle" || activeDrawTool === "ellipse" ? "rgba(16,110,190,0.12)" : "none",
      strokeWidth: 2,
    });
  };

  const handleDrawPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (rotateRef.current) {
      const { id, cx, cy, startAngle, origRotation } = rotateRef.current;
      const pt = getOverlayPoint(e);
      const currentAngle = Math.atan2(pt.y - cy, pt.x - cx) * (180 / Math.PI);
      const delta = currentAngle - startAngle;
      updateSheet((s) => ({
        drawings: (s.drawings || []).map((d) => (d.id === id ? { ...d, rotation: origRotation + delta } : d)),
      }));
      return;
    }

    if (resizeRef.current) {

      const { id, handle, orig } = resizeRef.current;
      const pt = getOverlayPoint(e);

      if (handle === "p0" || handle === "p1") {
        const idx = handle === "p0" ? 0 : 1;
        updateSheet((s) => ({
          drawings: (s.drawings || []).map((d) =>
            d.id === id && d.points ? { ...d, points: d.points.map((p, i) => (i === idx ? pt : p)) } : d
          ),
        }));
        return;
      }

      const fixed =
        handle === "nw" ? { x: orig.x + orig.w, y: orig.y + orig.h } :
          handle === "ne" ? { x: orig.x, y: orig.y + orig.h } :
            handle === "sw" ? { x: orig.x + orig.w, y: orig.y } :
              { x: orig.x, y: orig.y };

      const newX = Math.min(pt.x, fixed.x);
      const newY = Math.min(pt.y, fixed.y);
      const newW = Math.abs(pt.x - fixed.x);
      const newH = Math.abs(pt.y - fixed.y);

      updateSheet((s) => ({
        drawings: (s.drawings || []).map((d) => (d.id === id ? { ...d, x: newX, y: newY, w: newW, h: newH } : d)),
      }));
      return;
    }

    const state = drawingRef.current;
    if (!state) return;
    const pt = getOverlayPoint(e);

    if (state.type === "select" && selectedDrawId) {
      const dx = pt.x - state.startX;
      const dy = pt.y - state.startY;
      updateSheet((s) => ({
        drawings: (s.drawings || []).map((d) =>
          d.id === selectedDrawId
            ? d.points
              ? { ...d, x: d.x + dx, y: d.y + dy, points: d.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
              : { ...d, x: d.x + dx, y: d.y + dy }
            : d
        ),
      }));
      drawingRef.current = { ...state, startX: pt.x, startY: pt.y };
      return;
    }

    if (state.type === "rectangle" || state.type === "ellipse") {
      setDrawPreview((prev) => prev && ({
        ...prev,
        x: Math.min(state.startX, pt.x),
        y: Math.min(state.startY, pt.y),
        w: Math.abs(pt.x - state.startX),
        h: Math.abs(pt.y - state.startY),
      }));
    } else if (state.type === "freeform") {
      state.points.push(pt);
      setDrawPreview((prev) => prev && ({ ...prev, points: [...state.points] }));

    } else if (state.type === "line" || state.type === "arrow") {
      setDrawPreview((prev) => prev && ({ ...prev, points: [state.points[0], pt] }));
    } else if (state.type === "connector") {
      const target = hitTestBoxShape(pt, sheet.drawings || []);
      if (target) {
        const side = nearestShapeSide(target, pt);
        setDrawPreview((prev) => prev && ({ ...prev, endAttach: { id: target.id, side }, endPoint: undefined }));
      } else {
        setDrawPreview((prev) => prev && ({ ...prev, endAttach: undefined, endPoint: pt }));
      }
    }
  };


  const handleDrawPointerUp = () => {
    if (rotateRef.current) {
      rotateRef.current = null;
      showToast("Shape rotated.");
      return;
    }
    if (resizeRef.current) {
      resizeRef.current = null;
      showToast("Shape resized.");
      return;
    }
    const state = drawingRef.current;

    drawingRef.current = null;
    if (!state || state.type === "select") return;

    if (drawPreview) {

      if ((drawPreview.type === "rectangle" || drawPreview.type === "ellipse") && (drawPreview.w < 4 || drawPreview.h < 4)) {
        setDrawPreview(null);
        return;
      }
      if (drawPreview.type === "connector" && !drawPreview.endAttach && drawPreview.endPoint && drawPreview.startAttach) {
        const startShape = (sheet.drawings || []).find((sh) => sh.id === drawPreview.startAttach!.id);
        const startAnchor = startShape ? getShapeAnchorPoint(startShape, drawPreview.startAttach!.side) : null;
        if (startAnchor && Math.hypot(startAnchor.x - drawPreview.endPoint.x, startAnchor.y - drawPreview.endPoint.y) < 6) {
          setDrawPreview(null);
          return;
        }
      }
      const finalShape: DrawShape = { ...drawPreview, id: genDrawId() };

      updateSheet((s) => ({ drawings: [...(s.drawings || []), finalShape] }));
      setSelectedDrawId(finalShape.id);
      showToast("Shape added.");
    }
    setDrawPreview(null);
  };

  const deleteSelectedDrawShape = () => {
    if (!selectedDrawId) return;
    updateSheet((s) => {
      const shapes = s.drawings || [];
      const deletedId = selectedDrawId;
      const target = shapes.find((sh) => sh.id === deletedId);
      const detached = shapes.map((d) => {
        if (d.type !== "connector") return d;
        let next = d;
        if (target && d.startAttach?.id === deletedId) {
          next = { ...next, startAttach: undefined, startPoint: getShapeAnchorPoint(target, d.startAttach.side) };
        }
        if (target && d.endAttach?.id === deletedId) {
          next = { ...next, endAttach: undefined, endPoint: getShapeAnchorPoint(target, d.endAttach.side) };
        }
        return next;
      });
      return { drawings: detached.filter((d) => d.id !== deletedId) };
    });
    setSelectedDrawId(null);
    showToast("Shape deleted.");
  };

  const startResizeDrag = (id: string, handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const shape = (sheet.drawings || []).find((d) => d.id === id);
    if (!shape) return;
    resizeRef.current = { id, handle, orig: shape };
    setSelectedDrawId(id);
    setActiveDrawTool("select");
  };

  const startRotateDrag = (id: string, e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    const shape = (sheet.drawings || []).find((d) => d.id === id);
    if (!shape) return;
    const cx = shape.x + shape.w / 2;
    const cy = shape.y + shape.h / 2;
    const svg = e.currentTarget.ownerSVGElement;
    const rect = svg ? svg.getBoundingClientRect() : { left: 0, top: 0 };
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const startAngle = Math.atan2(py - cy, px - cx) * (180 / Math.PI);
    rotateRef.current = { id, cx, cy, startAngle, origRotation: shape.rotation || 0 };
    setSelectedDrawId(id);
    setActiveDrawTool("select");
  };

  const doCopy = (mode: ClipboardMode) => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);
    const collected: ClipboardData["cells"] = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const k = cellKey(r, c);
        if (sheet.cells[k]) {
          collected.push({
            row: r - r1,
            col: c - c1,
            data: structuredClone(sheet.cells[k]),
            valueAtCopy: getCellValue(k),
          });
        }
      }
    }
    setClipboard({
      mode,
      sourceSheetId: sheet.id,
      origin: {
        row: r1,
        col: c1,
      },
      cells: structuredClone(collected),
      rows: r2 - r1 + 1,
      cols: c2 - c1 + 1,
    });
    showToast(mode === "cut" ? "Cut completed." : "Copy completed.");
  };

  // ব্রাউজারের OS ক্লিপবোর্ড থেকে টেক্সট পড়ে তা সেলে বসানো হচ্ছে।
  // Excel/Google Sheets থেকে কপি করা ডেটা সাধারণত Tab দিয়ে কলাম আর
  // নতুন লাইন দিয়ে সারি আলাদা করা থাকে (TSV ফরম্যাট) — এখানে সেটাই পার্স করা হলো
  const pasteExternalText = (text: string) => {
    const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = cleaned.split("\n");
    // শেষে একটা খালি লাইন থাকলে (কপি করার সময় প্রায়ই থাকে) সেটা বাদ দেওয়া হলো
    const rows = lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
    if (rows.length === 0) return;

    const pastedColumnCount = rows.reduce(
      (maximum, rowText) =>
        Math.max(maximum, rowText.split("\t").length),
      1
    );

    const destinationRange: SelectionRange = {
      r1: activePos.row,
      c1: activePos.col,
      r2: activePos.row + rows.length - 1,
      c2: activePos.col + pastedColumnCount - 1,
    };

    if (rangeTouchesMergedCells(sheet, destinationRange)) {
      showToast(
        "Merged cell-এর ওপর text Paste বন্ধ করা হয়েছে। আগে Unmerge করুন বা অন্য রেঞ্জ বেছে নিন।"
      );
      return;
    }

    updateSheet((s) => {
      const next = { ...s.cells };
      let maxRow = s.gridRows;
      let maxCol = s.gridCols;

      rows.forEach((rowText, r) => {
        const cols = rowText.split("\t");
        cols.forEach((val, c) => {
          const targetRow = activePos.row + r;
          const targetCol = activePos.col + c;
          if (targetRow >= MAX_ROWS || targetCol >= MAX_COLS) return;
          next[cellKey(targetRow, targetCol)] = {
            ...(next[cellKey(targetRow, targetCol)] || { value: "" }),
            value: val,
          };
          maxRow = Math.max(maxRow, Math.min(targetRow + 1, MAX_ROWS));
          maxCol = Math.max(maxCol, Math.min(targetCol + 1, MAX_COLS));
        });
      });

      return { cells: next, gridRows: maxRow, gridCols: maxCol };
    });

    showToast("Pasted from clipboard.");
  };

  const doPaste = async () => {
    if (!clipboard) {
      // অ্যাপের ভেতরে (Ctrl+C/Copy বাটন দিয়ে) কিছু কপি করা নেই — তাই এবার
      // সরাসরি ব্রাউজারের সিস্টেম ক্লিপবোর্ড থেকে পড়ার চেষ্টা করা হচ্ছে।
      // এভাবে বাইরে থেকে (Excel, ওয়েবসাইট, নোটপ্যাড) কপি করা ডেটাও
      // রাইট-ক্লিক মেনুর "Paste" দিয়ে বসানো যাবে
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim() !== "") {
          pasteExternalText(text);
          focusActiveGridCell();
          return;
        }
      } catch {
        showToast("Clipboard access was blocked by the browser. Try Ctrl+V instead.");
        return;
      }
      showToast("Clipboard is empty.");
      return;
    }


    const copied = clipboard;
    const destinationRow = activePos.row;
    const destinationCol = activePos.col;
    const destinationSheetId = sheet.id;

    const currentSheets = sheetsRef.current;

    const destinationIndex = currentSheets.findIndex(
      (item) => item.id === destinationSheetId
    );

    const sourceIndex = currentSheets.findIndex(
      (item) => item.id === copied.sourceSheetId
    );

    if (destinationIndex < 0) {
      showToast("যে শিটে Paste করবেন সেটি পাওয়া যায়নি।");
      return;
    }

    if (copied.mode === "cut" && sourceIndex < 0) {
      showToast(
        "Cut করা মূল শিটটি পাওয়া যায়নি। আবার ডেটা নির্বাচন করুন।"
      );
      return;
    }

    const destinationSheet = currentSheets[destinationIndex];

    if (
      destinationRow < 0 ||
      destinationCol < 0 ||
      destinationRow + copied.rows > destinationSheet.gridRows ||
      destinationCol + copied.cols > destinationSheet.gridCols
    ) {
      showToast(
        "পুরো ডেটা বসানোর মতো জায়গা নেই। অন্য সেল বেছে নিন বা গ্রিড বড় করুন।"
      );
      focusActiveGridCell();
      return;
    }

    if (copied.mode === "cut") {
      const sourceSheet = currentSheets[sourceIndex];

      if (
        !sourceSheet ||
        copied.origin.row < 0 ||
        copied.origin.col < 0 ||
        copied.origin.row + copied.rows > sourceSheet.gridRows ||
        copied.origin.col + copied.cols > sourceSheet.gridCols
      ) {
        setClipboard(null);

        showToast(
          "Cut করা রেঞ্জের অবস্থান বদলেছে। আবার নির্বাচন করে Cut করুন।"
        );

        focusActiveGridCell();
        return;
      }

      const originalCells = new Map<string, CellData>();

      for (const item of copied.cells) {
        originalCells.set(
          `${item.row},${item.col}`,
          item.data
        );
      }

      let sourceChanged = false;

      for (
        let row = 0;
        row < copied.rows && !sourceChanged;
        row++
      ) {
        for (let col = 0; col < copied.cols; col++) {
          const sourceKey = cellKey(
            copied.origin.row + row,
            copied.origin.col + col
          );

          const currentCell = sourceSheet.cells[sourceKey];

          const originalCell = originalCells.get(
            `${row},${col}`
          );

          if (
            JSON.stringify(currentCell) !==
            JSON.stringify(originalCell)
          ) {
            sourceChanged = true;
            break;
          }
        }
      }

      if (sourceChanged) {
        setClipboard(null);

        showToast(
          "Cut করার পরে মূল ডেটা বদলেছে। নিরাপত্তার জন্য Paste বন্ধ করা হয়েছে। আবার Cut করুন।"
        );

        focusActiveGridCell();
        return;
      }
    }

    const clipboardContainsMerge = copied.cells.some(
      ({ data }) =>
        Boolean(data.mergedInto) ||
        (data.rowSpan || 1) > 1 ||
        (data.colSpan || 1) > 1
    );

    const sourceTouchesMerge =
      sourceIndex >= 0 &&
      rangeTouchesMergedCells(currentSheets[sourceIndex], {
        r1: copied.origin.row,
        c1: copied.origin.col,
        r2: copied.origin.row + copied.rows - 1,
        c2: copied.origin.col + copied.cols - 1,
      });

    const destinationTouchesMerge = rangeTouchesMergedCells(
      destinationSheet,
      {
        r1: destinationRow,
        c1: destinationCol,
        r2: destinationRow + copied.rows - 1,
        c2: destinationCol + copied.cols - 1,
      }
    );

    if (
      clipboardContainsMerge ||
      sourceTouchesMerge ||
      destinationTouchesMerge
    ) {
      showToast(
        "Merged cell থাকা রেঞ্জে সাধারণ Paste এখন সমর্থিত নয়। আগে Unmerge করুন বা অন্য রেঞ্জ বেছে নিন।"
      );

      focusActiveGridCell();
      return;
    }

    const copiedCells = structuredClone(copied.cells);
    const nextSheets = [...currentSheets];

    if (copied.mode === "cut") {
      const sourceSheet = nextSheets[sourceIndex];
      const sourceCells = { ...sourceSheet.cells };

      for (let row = 0; row < copied.rows; row++) {
        for (let col = 0; col < copied.cols; col++) {
          delete sourceCells[
            cellKey(
              copied.origin.row + row,
              copied.origin.col + col
            )
          ];
        }
      }

      nextSheets[sourceIndex] = {
        ...sourceSheet,
        cells: sourceCells,
      };
    }

    // একই শিট হলে source সরানোর পরের cells থেকেই শুরু করি।
    const targetSheet = nextSheets[destinationIndex];
    const targetCells = { ...targetSheet.cells };

    for (let row = 0; row < copied.rows; row++) {
      for (let col = 0; col < copied.cols; col++) {
        delete targetCells[
          cellKey(
            destinationRow + row,
            destinationCol + col
          )
        ];
      }
    }

    const pasteRowShift = destinationRow - copied.origin.row;
    const pasteColShift = destinationCol - copied.origin.col;
    const cutAcrossSheets = copied.mode === "cut" && sourceIndex !== destinationIndex;
    const sourceSheetName = sourceIndex >= 0 ? currentSheets[sourceIndex].name : "";

    for (const { row, col, data } of copiedCells) {
      let pasted = data;

      if (typeof data.value === "string" && data.value.startsWith("=")) {
        if (copied.mode !== "cut") {
          // Copy: সূত্রের আপেক্ষিক রেফারেন্স নতুন জায়গা অনুযায়ী সরে (=A1+B1 নিচের ঘরে হয় =A2+B2)
          pasted = {
            ...data,
            value: "=" + shiftFormulaRefs(data.value.slice(1), pasteRowShift, pasteColShift),
          };
        } else if (cutAcrossSheets) {
          // Cut অন্য শিটে: সূত্র একই ঘরগুলোকেই দেখবে, তাই মূল শিটের নাম বসাই
          pasted = {
            ...data,
            value:
              "=" +
              rewriteFormulaReferences(data.value.slice(1), (ref) =>
                ref.sheet ? ref : { ...ref, sheet: sourceSheetName }
              ),
          };
        }
      }

      targetCells[
        cellKey(
          destinationRow + row,
          destinationCol + col
        )
      ] = pasted;
    }

    nextSheets[destinationIndex] = {
      ...targetSheet,
      cells: targetCells,
    };

    let finalSheets = nextSheets;

    if (copied.mode === "cut" && sourceIndex >= 0) {
      // Cut: অন্য যেসব সূত্র কাটা ঘরগুলোকে দেখছিল, সেগুলো নতুন জায়গাকে দেখবে (Excel-এর মতো)
      const sourceName = nextSheets[sourceIndex].name;
      const destinationName = nextSheets[destinationIndex].name;
      const cutR1 = copied.origin.row;
      const cutC1 = copied.origin.col;
      const cutR2 = copied.origin.row + copied.rows - 1;
      const cutC2 = copied.origin.col + copied.cols - 1;

      finalSheets = rewriteWorkbookFormulas(nextSheets, (owner) => (ref) => {
        const refSheet = ref.sheet ?? owner.name;
        if (!sameSheetName(refSheet, sourceName)) return ref;
        if (ref.r1 < cutR1 || ref.r2 > cutR2 || ref.c1 < cutC1 || ref.c2 > cutC2) return ref;
        return {
          ...ref,
          r1: ref.r1 + pasteRowShift,
          r2: ref.r2 + pasteRowShift,
          c1: ref.c1 + pasteColShift,
          c2: ref.c2 + pasteColShift,
          sheet: sameSheetName(destinationName, owner.name) ? null : destinationName,
        };
      });
    }

    // দুই শিটের পরিবর্তন একই Undo step-এ রাখি।
    setSheets(finalSheets);



    if (clipboard.mode === "cut") setClipboard(null);
    showToast("Paste completed.");
    focusActiveGridCell();
  };

  const removeRow = () => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    const count = r2 - r1 + 1;
    if (count > 200 || count >= sheet.gridRows) {
      showToast("একসাথে সর্বোচ্চ ২০০টি রো মুছা যাবে এবং অন্তত একটি রো থাকতে হবে।");
      return;
    }
    // নিচ থেকে উপরে মুছছি, যাতে ইনডেক্স এলোমেলো না হয়
    for (let r = r2; r >= r1; r--) deleteRowAtIndex(r);
  };

  /* ============================================================================
   * কলাম হেডার কনটেক্সট মেনুর জন্য অ্যাডভান্সড লজিক
   * ========================================================================== */

  // নির্দিষ্ট ইনডেক্সে (atCol) একটি নতুন খালি কলাম ঢুকিয়ে দেওয়া হচ্ছে —
  // atCol এবং তার ডানে থাকা সব কলামের ডাটা একঘর ডানে শিফট হয়ে যাবে
  const insertColumnAtIndex = useCallback((atCol: number) => {
    updateSheetStructural((s) => {
      const nextCells: CellMap = {};
      // প্রতিটি সেল স্ক্যান করে, atCol বা তার ডানে থাকা সেলগুলো এক ঘর ডানে সরানো হচ্ছে
      Object.entries(s.cells).forEach(([key, data]) => {
        const pos = parseKey(key);
        if (!pos) return;
        if (pos.col >= atCol) {
          nextCells[cellKey(pos.row, pos.col + 1)] = data;
        } else {
          nextCells[key] = data;
        }
      });

      // কলামের প্রস্থ (width) তথ্যও ডানে শিফট করা হচ্ছে, যাতে সঠিক কলামে সঠিক প্রস্থ থাকে
      const nextColWidths: Record<number, number> = {};
      Object.entries(s.colWidths).forEach(([colStr, w]) => {
        const col = parseInt(colStr, 10);
        nextColWidths[col >= atCol ? col + 1 : col] = w;
      });

      // AutoFilter-এর তথ্যও শিফট করা হচ্ছে
      const nextFilters: Record<number, string> = {};
      Object.entries(s.filters || {}).forEach(([colStr, f]) => {
        const col = parseInt(colStr, 10);
        nextFilters[col >= atCol ? col + 1 : col] = f;
      });

      // হাইড করা কলাম তালিকাও শিফট করা হচ্ছে
      const nextHiddenCols = (s.hiddenCols || []).map((c) => (c >= atCol ? c + 1 : c));

      return {
        cells: nextCells,
        colWidths: nextColWidths,
        filters: nextFilters,
        hiddenCols: nextHiddenCols,
        gridCols: Math.min(s.gridCols + 1, MAX_COLS),
      };
    }, { axis: "col", kind: "insert", at: atCol });
    showToast("নতুন কলাম যুক্ত করা হয়েছে।");
  }, [updateSheetStructural, showToast]);

  // নির্বাচিত (রাইট-ক্লিক করা) কলামের বামে নতুন কলাম বসানো
  const insertColumnsBeforeTarget = useCallback((col: number) => {
    insertColumnAtIndex(col);
  }, [insertColumnAtIndex]);

  // নির্বাচিত (রাইট-ক্লিক করা) কলামের ডানে নতুন কলাম বসানো
  const insertColumnsAfterTarget = useCallback((col: number) => {
    insertColumnAtIndex(col + 1);
  }, [insertColumnAtIndex]);

  // নির্দিষ্ট কলামটি সম্পূর্ণভাবে মুছে ফেলা হচ্ছে —
  // মুছে ফেলা কলামের ডানের সব কলাম একঘর বামে সরে আসবে
  const deleteColumnAtIndex = useCallback((atCol: number) => {
    if (sheet.gridCols <= 1) {
      showToast("অন্তত একটি কলাম থাকা আবশ্যক।");
      return;
    }
    updateSheetStructural((s) => {
      const nextCells: CellMap = {};
      Object.entries(s.cells).forEach(([key, data]) => {
        const pos = parseKey(key);
        if (!pos) return;
        if (pos.col === atCol) return; // ⬅️ এই কলামের ডাটা বাদ দেওয়া হলো (ডিলিট)
        if (pos.col > atCol) {
          nextCells[cellKey(pos.row, pos.col - 1)] = data;
        } else {
          nextCells[key] = data;
        }
      });

      const nextColWidths: Record<number, number> = {};
      Object.entries(s.colWidths).forEach(([colStr, w]) => {
        const col = parseInt(colStr, 10);
        if (col === atCol) return;
        nextColWidths[col > atCol ? col - 1 : col] = w;
      });

      const nextFilters: Record<number, string> = {};
      Object.entries(s.filters || {}).forEach(([colStr, f]) => {
        const col = parseInt(colStr, 10);
        if (col === atCol) return;
        nextFilters[col > atCol ? col - 1 : col] = f;
      });

      const nextHiddenCols = (s.hiddenCols || [])
        .filter((c) => c !== atCol)
        .map((c) => (c > atCol ? c - 1 : c));

      return {
        cells: nextCells,
        colWidths: nextColWidths,
        filters: nextFilters,
        hiddenCols: nextHiddenCols,
        gridCols: Math.max(1, s.gridCols - 1),
      };
    }, { axis: "col", kind: "delete", at: atCol });
    showToast("কলাম মুছে ফেলা হয়েছে।");
  }, [sheet.gridCols, updateSheetStructural, showToast]);

  // কলামটি নিজে থাকবে, শুধু ভেতরের সব ডাটা (Contents) খালি হয়ে যাবে
  const clearColumnContentsAtIndex = useCallback((atCol: number) => {
    updateSheet((s) => {
      const nextCells = { ...s.cells };
      for (let r = 0; r < s.gridRows; r++) {
        const key = cellKey(r, atCol);
        if (nextCells[key]) nextCells[key] = { ...nextCells[key], value: "" };
      }
      return { cells: nextCells };
    });
    showToast("কলামের কনটেন্ট মুছে ফেলা হয়েছে।");
  }, [updateSheet, showToast]);

  // নির্দিষ্ট কলামের প্রস্থ (width) কাস্টম পিক্সেল মান দিয়ে সেট করা
  const applyColumnWidthAtIndex = useCallback((atCol: number, width: number) => {
    const safeWidth = Math.max(20, Math.min(800, width));
    updateSheet((s) => ({ colWidths: { ...s.colWidths, [atCol]: safeWidth } }));
    showToast(`কলামের প্রস্থ ${safeWidth}px করা হয়েছে।`);
  }, [updateSheet, showToast]);

  // কলামের ভেতরের কনটেন্টের দৈর্ঘ্য দেখে সবচেয়ে উপযুক্ত (Optimal) প্রস্থ হিসাব করে বসানো হচ্ছে
  const applyOptimalWidthAtIndex = useCallback((atCol: number) => {
    let maxLen = 2; // কলাম হেডারের অক্ষরের জন্য ন্যূনতম জায়গা রাখা হলো
    for (let r = 0; r < sheet.gridRows; r++) {
      const text = getDisplayValue(cellKey(r, atCol));
      if (text.length > maxLen) maxLen = text.length;
    }
    // প্রতি ক্যারেক্টারে আনুমানিক ৭.৫px + কিছুটা বাড়তি প্যাডিং যোগ করা হচ্ছে
    const optimalWidth = Math.min(600, Math.max(60, Math.round(maxLen * 7.5) + 24));
    applyColumnWidthAtIndex(atCol, optimalWidth);
  }, [sheet.gridRows, getDisplayValue, applyColumnWidthAtIndex]);

  // বর্তমানে সিলেক্ট করা কলাম রেঞ্জ হাইড করে দেওয়া হচ্ছে
  const hideSelectedColumns = useCallback(() => {
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);
    updateSheet((s) => {
      const set = new Set(s.hiddenCols || []);
      for (let c = c1; c <= c2; c++) set.add(c);
      return { hiddenCols: Array.from(set) };
    });
    showToast("কলাম লুকানো (Hide) হয়েছে।");
  }, [selection, updateSheet, showToast]);

  // সব হাইড করা কলাম আবার দৃশ্যমান করে দেওয়া হচ্ছে
  const showAllHiddenColumns = useCallback(() => {
    updateSheet({ hiddenCols: [] });
    showToast("সব লুকানো কলাম আবার দেখানো হয়েছে।");
  }, [updateSheet, showToast]);
  /* ============================================================================
     * রো হেডার কনটেক্সট মেনুর জন্য অ্যাডভান্সড লজিক
     * ========================================================================== */

  // নির্দিষ্ট ইনডেক্সে (atRow) একটি নতুন খালি রো ঢুকিয়ে দেওয়া হচ্ছে —
  // atRow এবং তার নিচে থাকা সব রো-এর ডাটা একঘর নিচে শিফট হয়ে যাবে
  const insertRowAtIndex = useCallback((atRow: number) => {
    updateSheetStructural((s) => {
      const nextCells: CellMap = {};
      // প্রতিটি সেল স্ক্যান করে, atRow বা তার নিচে থাকা সেলগুলো এক ঘর নিচে সরানো হচ্ছে
      Object.entries(s.cells).forEach(([key, data]) => {
        const pos = parseKey(key);
        if (!pos) return;
        if (pos.row >= atRow) {
          nextCells[cellKey(pos.row + 1, pos.col)] = data;
        } else {
          nextCells[key] = data;
        }
      });

      // রো-এর উচ্চতা (height) তথ্যও নিচে শিফট করা হচ্ছে, যাতে সঠিক রো-তে সঠিক উচ্চতা থাকে
      const nextRowHeights: Record<number, number> = {};
      Object.entries(s.rowHeights).forEach(([rowStr, h]) => {
        const row = parseInt(rowStr, 10);
        nextRowHeights[row >= atRow ? row + 1 : row] = h;
      });

      // হাইড করা রো তালিকাও শিফট করা হচ্ছে
      const nextHiddenRows = (s.hiddenRows || []).map((r) => (r >= atRow ? r + 1 : r));

      // গ্রুপ (Row Grouping) রেঞ্জও শিফট করা হচ্ছে, যাতে গ্রুপিং ভেঙে না যায়
      const nextGroups = (s.groups || []).map((g) => ({
        ...g,
        start: g.start >= atRow ? g.start + 1 : g.start,
        end: g.end >= atRow ? g.end + 1 : g.end,
      }));

      return {
        cells: nextCells,
        rowHeights: nextRowHeights,
        hiddenRows: nextHiddenRows,
        groups: nextGroups,
        gridRows: Math.min(s.gridRows + 1, MAX_ROWS),
      };
    }, { axis: "row", kind: "insert", at: atRow });
    showToast("নতুন রো যুক্ত করা হয়েছে।");
  }, [updateSheetStructural, showToast]);

  // নির্বাচিত (রাইট-ক্লিক করা) রো-এর উপরে নতুন রো বসানো
  const insertRowsAboveTarget = useCallback((row: number) => {
    insertRowAtIndex(row);
  }, [insertRowAtIndex]);

  // নির্বাচিত (রাইট-ক্লিক করা) রো-এর নিচে নতুন রো বসানো
  const insertRowsBelowTarget = useCallback((row: number) => {
    insertRowAtIndex(row + 1);
  }, [insertRowAtIndex]);

  // নির্দিষ্ট রোটি সম্পূর্ণভাবে মুছে ফেলা হচ্ছে —
  // মুছে ফেলা রো-এর নিচের সব রো একঘর উপরে সরে আসবে
  const deleteRowAtIndex = useCallback((atRow: number) => {
    if (sheet.gridRows <= 1) {
      showToast("অন্তত একটি রো থাকা আবশ্যক।");
      return;
    }
    updateSheetStructural((s) => {
      const nextCells: CellMap = {};
      Object.entries(s.cells).forEach(([key, data]) => {
        const pos = parseKey(key);
        if (!pos) return;
        if (pos.row === atRow) return; // ⬅️ এই রো-এর ডাটা বাদ দেওয়া হলো (ডিলিট)
        if (pos.row > atRow) {
          nextCells[cellKey(pos.row - 1, pos.col)] = data;
        } else {
          nextCells[key] = data;
        }
      });

      const nextRowHeights: Record<number, number> = {};
      Object.entries(s.rowHeights).forEach(([rowStr, h]) => {
        const row = parseInt(rowStr, 10);
        if (row === atRow) return;
        nextRowHeights[row > atRow ? row - 1 : row] = h;
      });

      const nextHiddenRows = (s.hiddenRows || [])
        .filter((r) => r !== atRow)
        .map((r) => (r > atRow ? r - 1 : r));

      const nextGroups = (s.groups || [])
        .map((g) => ({
          ...g,
          start: g.start > atRow ? g.start - 1 : g.start,
          end: g.end > atRow ? g.end - 1 : g.end,
        }))
        .filter((g) => g.end >= g.start);

      return {
        cells: nextCells,
        rowHeights: nextRowHeights,
        hiddenRows: nextHiddenRows,
        groups: nextGroups,
        gridRows: Math.max(1, s.gridRows - 1),
      };
    }, { axis: "row", kind: "delete", at: atRow });
    showToast("রো মুছে ফেলা হয়েছে।");
  }, [sheet.gridRows, updateSheetStructural, showToast]);

  // রোটি নিজে থাকবে, শুধু ভেতরের সব ডাটা (Contents) খালি হয়ে যাবে
  const clearRowContentsAtIndex = useCallback((atRow: number) => {
    updateSheet((s) => {
      const nextCells = { ...s.cells };
      for (let c = 0; c < s.gridCols; c++) {
        const key = cellKey(atRow, c);
        if (nextCells[key]) nextCells[key] = { ...nextCells[key], value: "" };
      }
      return { cells: nextCells };
    });
    showToast("রো-এর কনটেন্ট মুছে ফেলা হয়েছে।");
  }, [updateSheet, showToast]);

  // নির্দিষ্ট রো-এর উচ্চতা (height) কাস্টম পিক্সেল মান দিয়ে সেট করা
  const applyRowHeightAtIndex = useCallback((atRow: number, height: number) => {
    const safeHeight = Math.max(16, Math.min(400, height));
    updateSheet((s) => ({ rowHeights: { ...s.rowHeights, [atRow]: safeHeight } }));
    showToast(`রো-এর উচ্চতা ${safeHeight}px করা হয়েছে।`);
  }, [updateSheet, showToast]);

  // রো-এর ভেতরের কনটেন্টের লাইন-সংখ্যা দেখে সবচেয়ে উপযুক্ত (Optimal) উচ্চতা হিসাব করে বসানো হচ্ছে
  const applyOptimalHeightAtIndex = useCallback((atRow: number) => {
    let maxLines = 1;
    for (let c = 0; c < sheet.gridCols; c++) {
      const text = getDisplayValue(cellKey(atRow, c));
      const lineCount = text.split("\n").length;
      if (lineCount > maxLines) maxLines = lineCount;
    }
    // প্রতি লাইনে আনুমানিক ২০px + কিছুটা বাড়তি প্যাডিং যোগ করা হচ্ছে
    const optimalHeight = Math.min(300, Math.max(24, maxLines * 20 + 16));
    applyRowHeightAtIndex(atRow, optimalHeight);
  }, [sheet.gridCols, getDisplayValue, applyRowHeightAtIndex]);

  // বর্তমানে সিলেক্ট করা রো রেঞ্জ হাইড করে দেওয়া হচ্ছে
  // (hiddenRows ফিল্ড আগে থেকেই আছে, তাই নতুন কিছু বানাতে হচ্ছে না)
  const hideSelectedRows = useCallback(() => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    updateSheet((s) => {
      const set = new Set(s.hiddenRows || []);
      for (let r = r1; r <= r2; r++) set.add(r);
      return { hiddenRows: Array.from(set) };
    });
    showToast("রো লুকানো (Hide) হয়েছে।");
  }, [selection, updateSheet, showToast]);

  // সব হাইড করা রো আবার দৃশ্যমান করে দেওয়া হচ্ছে
  const showAllHiddenRows = useCallback(() => {
    updateSheet({ hiddenRows: [] });
    showToast("সব লুকানো রো আবার দেখানো হয়েছে।");
  }, [updateSheet, showToast]);
  const removeCol = () => {
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);
    const count = c2 - c1 + 1;
    if (count > 50 || count >= sheet.gridCols) {
      showToast("একসাথে সর্বোচ্চ ৫০টি কলাম মুছা যাবে এবং অন্তত একটি কলাম থাকতে হবে।");
      return;
    }
    for (let c = c2; c >= c1; c--) deleteColumnAtIndex(c);
  };

  const mergeSelection = () => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);
    if (r1 === r2 && c1 === c2) {
      showToast("Select multiple cells to merge.");
      return;
    }
    const anchor = cellKey(r1, c1);
    updateSheet((s) => {
      const next = { ...s.cells };
      next[anchor] = { ...(next[anchor] || { value: "" }), rowSpan: r2 - r1 + 1, colSpan: c2 - c1 + 1 };
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const k = cellKey(r, c);
          if (k !== anchor) next[k] = { ...(next[k] || { value: "" }), mergedInto: anchor };
        }
      }
      return { cells: next };
    });
    showToast("Cells merged.");
  };

  const unmergeSelection = () => {
    updateSheet((s) => {
      const next = { ...s.cells };
      selectionCells.forEach((k) => {
        if (next[k]) {
          const rest = { ...next[k] };
          delete rest.rowSpan;
          delete rest.colSpan;
          delete rest.mergedInto;
          next[k] = rest;
        }
      });
      return { cells: next };
    });
    showToast("Cells unmerged.");
  };

  const onImagePicked = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCellData(activeCell, { image: reader.result as string });
      showToast("Image inserted.");
    };
    reader.readAsDataURL(file);
  };

  const insertHyperlink = () => {
    setHyperlinkSearch("");
    setShowHyperlinkDialog(true);
  };

  // মডিউল লিস্ট থেকে ক্লিক করলে এই ফাংশনটি লিংক বসিয়ে দেবে
  const applyModuleHyperlink = (link: AwmModuleLink) => {
    setCellData(activeCell, {
      hyperlink: link.href,
      value: getRawValue(activeCell) || link.label,
    });
    setShowHyperlinkDialog(false);
    showToast(`"${link.label}" পেইজের লিংক যোগ করা হয়েছে।`);
  };

  const insertManualHyperlinkUrl = () => {
    requestPrompt(
      "Insert Hyperlink",
      "Enter URL",
      (url) => {
        if (!url) return;
        if (!sanitizeUrl(url)) {
          showToast("Invalid link. Only https, mailto and tel links are allowed.");
          return;
        }
        setCellData(activeCell, { hyperlink: url.trim() });
        setShowHyperlinkDialog(false);
        showToast("Hyperlink inserted.");
      },
      sheet.cells[activeCell]?.hyperlink || "https://"
    );
  };
  const openShareMenu = (url: string, label: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareMenu({
      x: Math.min(e.clientX, window.innerWidth - 260),
      y: Math.min(e.clientY + 8, window.innerHeight - 320),
      url,
      label,
    });
  };

  const copyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast("লিংক কপি করা হয়েছে।");
    } catch {
      showToast("লিংক কপি করা যায়নি। ব্রাউজার ক্লিপবোর্ড পারমিশন চেক করুন।");
    }
    setShareMenu(null);
  };

  const insertComment = () => {
    requestPrompt(
      "Insert Comment",
      "Enter comment",
      (text) => {
        if (!text) return;
        setCellData(activeCell, { comment: text });
        showToast("Comment saved.");
      },
      sheet.cells[activeCell]?.comment ?? ""
    );
  };

  const clearFormattingOnSelection = useCallback(() => {
    updateSheet((s) => {
      const next = { ...s.cells };
      selectionCells.forEach((k) => {
        if (next[k]) next[k] = { ...next[k], style: undefined };
      });
      return { cells: next };
    });
    showToast("Direct formatting cleared.");
  }, [updateSheet, selectionCells, showToast]);

  const doPasteSpecial = useCallback(
    (mode: "values" | "formatting" | "formulas") => {
      if (!clipboard) {
        showToast("আগে অ্যাপের ভেতর থেকে Copy করুন।");
        return;
      }

      if (clipboard.mode !== "copy") {
        showToast(
          "Paste Special-এর জন্য Copy ব্যবহার করুন। Cut-এর জন্য সাধারণ Paste ব্যবহার করুন।"
        );
        return;
      }

      const copied = clipboard;

      const destinationRange: SelectionRange = {
        r1: activePos.row,
        c1: activePos.col,
        r2: activePos.row + copied.rows - 1,
        c2: activePos.col + copied.cols - 1,
      };

      if (
        destinationRange.r1 < 0 ||
        destinationRange.c1 < 0 ||
        destinationRange.r2 >= sheet.gridRows ||
        destinationRange.c2 >= sheet.gridCols
      ) {
        showToast("পুরো রেঞ্জ বসানোর মতো জায়গা নেই।");
        return;
      }

      const hasMergedSource = copied.cells.some(
        ({ data }) =>
          Boolean(data.mergedInto) ||
          (data.rowSpan || 1) > 1 ||
          (data.colSpan || 1) > 1
      );

      if (
        hasMergedSource ||
        rangeTouchesMergedCells(sheet, destinationRange)
      ) {
        showToast(
          "Merged cell-এর সঙ্গে Paste Special এখন সমর্থিত নয়।"
        );
        return;
      }

      const copiedCells = structuredClone(copied.cells);

      const cellMap = new Map<
        string,
        (typeof copiedCells)[number]
      >();

      for (const item of copiedCells) {
        cellMap.set(`${item.row},${item.col}`, item);
      }

      updateSheet((currentSheet) => {
        const next = { ...currentSheet.cells };

        for (let row = 0; row < copied.rows; row++) {
          for (let col = 0; col < copied.cols; col++) {
            const targetKey = cellKey(
              activePos.row + row,
              activePos.col + col
            );

            const source = cellMap.get(`${row},${col}`);

            const existing = next[targetKey] || {
              value: "",
            };

            if (mode === "formatting") {
              next[targetKey] = {
                ...existing,
                style: source?.data.style,
              };
              continue;
            }

            if (mode === "formulas") {
              const sourceIsText =
                source?.data.style?.numberFormat === "text";

              // Paste Special (Formulas): আপেক্ষিক রেফারেন্স নতুন ঘর অনুযায়ী সরে
              const sourceValue = source?.data.value ?? "";
              const shiftedValue =
                sourceValue.startsWith("=") && !sourceIsText
                  ? "=" + shiftFormulaRefs(sourceValue.slice(1), activePos.row - copied.origin.row, activePos.col - copied.origin.col)
                  : sourceValue;

              next[targetKey] = {
                ...existing,
                value: shiftedValue,
                style: {
                  ...existing.style,
                  numberFormat: sourceIsText
                    ? "text"
                    : existing.style?.numberFormat === "text"
                      ? "general"
                      : existing.style?.numberFormat,
                },
              };
              continue;
            }

            const value = source?.valueAtCopy ?? "";

            const textValue =
              typeof value === "boolean"
                ? value
                  ? "TRUE"
                  : "FALSE"
                : String(value);

            next[targetKey] = {
              ...existing,
              value: textValue,
              style: {
                ...existing.style,
                numberFormat:
                  typeof value === "number"
                    ? existing.style?.numberFormat === "text"
                      ? "general"
                      : existing.style?.numberFormat
                    : "text",
              },
            };
          }
        }

        return { cells: next };
      });

      showToast(`Paste Special (${mode}) সম্পন্ন হয়েছে।`);
      focusActiveGridCell();
    },
    [
      clipboard,
      activePos,
      sheet,
      updateSheet,
      showToast,
      focusActiveGridCell,
    ]
  );


  const insertSparkline = useCallback(() => {
    requestPrompt(
      "Insert Sparkline",
      "Enter data range for sparkline (e.g. A1:A6)",
      (range) => {
        if (!range) return;
        setCellData(activeCell, { sparkline: range });
        showToast("Sparkline inserted.");
      },
      selectedRangeText
    );
  }, [selectedRangeText, activeCell, setCellData, showToast, requestPrompt]);

  const clearAllFilters = useCallback(() => {
    updateSheet({ filters: {}, hiddenRows: [] });
    showToast("All filters cleared.");
  }, [updateSheet, showToast]);

  const addConditionalRule = useCallback(() => {
    if (!cfRange.trim()) {
      showToast("Enter a cell range first.");
      return;
    }
    const rule: ConditionalRule = {
      id: `cf_${Date.now()}`,
      range: cfRange.trim().toUpperCase(),
      condition: cfCondition,
      value: cfValue,
      value2: cfValue2,
      bg: cfColor,
    };
    updateSheet((s) => ({ conditionalRules: [...(s.conditionalRules || []), rule] }));
    showToast("Conditional formatting rule added.");
  }, [cfRange, cfCondition, cfValue, cfValue2, cfColor, updateSheet, showToast]);

  const removeConditionalRule = useCallback((id: string) => {
    updateSheet((s) => ({ conditionalRules: (s.conditionalRules || []).filter((r) => r.id !== id) }));
  }, [updateSheet]);

  const addNamedRange = useCallback(() => {
    if (!nrName.trim() || !nrRange.trim()) {
      showToast("Enter both a name and a range.");
      return;
    }
    const key = nrName.trim().toUpperCase().replace(/\s+/g, "_");
    updateSheet((s) => ({ namedRanges: { ...(s.namedRanges || {}), [key]: nrRange.trim().toUpperCase() } }));
    setNrName("");
    setNrRange("");
    showToast("Named range saved.");
  }, [nrName, nrRange, updateSheet, showToast, setNrName, setNrRange]);

  const removeNamedRange = useCallback((key: string) => {
    updateSheet((s) => {
      const next = { ...(s.namedRanges || {}) };
      delete next[key];
      return { namedRanges: next };
    });
  }, [updateSheet]);

  const goToNamedRange = useCallback(
    (key: string) => {
      const range = sheet.namedRanges?.[key];
      if (!range) return false;
      const nr = normalizeRange(range);
      if (!nr) return false;
      setSelection({ r1: nr.r1, c1: nr.c1, r2: nr.r2, c2: nr.c2 });
      setActiveCell(cellKey(nr.r1, nr.c1));
      return true;
    },
    [sheet.namedRanges]
  );

  const tracePrecedents = useCallback(() => {
    const raw = getRawValue(activeCell);
    if (!raw.startsWith("=")) {
      showToast("Active cell has no formula.");
      return;
    }
    const tokens = tokenize(raw.slice(1));
    const keys = new Set<string>();
    tokens.forEach((t) => {
      if (t.type === "ref") keys.add(t.value);
      else if (t.type === "range") {
        const nr = normalizeRange(t.value);
        if (nr) for (let r = nr.r1; r <= nr.r2; r++) for (let c = nr.c1; c <= nr.c2; c++) keys.add(cellKey(r, c));
      }
    });
    if (keys.size === 0) {
      showToast("No precedent cells found.");
      return;
    }
    setTraceHighlight(keys);
    showToast(`${keys.size} precedent cell(s) highlighted.`);
  }, [activeCell, getRawValue, showToast]);

  const traceDependents = useCallback(() => {
    const keys = new Set<string>();
    Object.entries(sheet.cells).forEach(([key, cellData]) => {
      const raw = cellData?.value || "";
      if (!raw.startsWith("=")) return;
      const tokens = tokenize(raw.slice(1));
      const references = new Set<string>();
      tokens.forEach((t) => {
        if (t.type === "ref") references.add(t.value);
        else if (t.type === "range") {
          const nr = normalizeRange(t.value);
          if (nr) for (let r = nr.r1; r <= nr.r2; r++) for (let c = nr.c1; c <= nr.c2; c++) references.add(cellKey(r, c));
        }
      });
      if (references.has(activeCell)) keys.add(key);
    });
    if (keys.size === 0) {
      showToast("No dependent cells found.");
      return;
    }
    setTraceHighlight(keys);
    showToast(`${keys.size} dependent cell(s) highlighted.`);
  }, [sheet.cells, activeCell, showToast]);

  const clearTrace = useCallback(() => setTraceHighlight(null), []);

  const zoomIn = useCallback(() => setZoomLevel((z) => Math.min(200, z + 10)), []);
  const zoomOut = useCallback(() => setZoomLevel((z) => Math.max(50, z - 10)), []);
  const resetZoom = useCallback(() => setZoomLevel(100), []);
  const toggleDarkMode = useCallback(() => {
    setDarkMode((v) => !v);
    showToast(darkMode ? "Light mode enabled." : "Dark mode enabled.");
  }, [darkMode, showToast]);

  // LibreOffice-স্টাইল: সাইডবারের বাম কিনারা টেনে প্রস্থ বদলানো
  const startSidebarResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    sidebarResizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    const onMove = (ev: PointerEvent) => {
      const d = sidebarResizeRef.current;
      if (!d) return;
      const delta = d.startX - ev.clientX;
      setSidebarWidth(Math.max(240, Math.min(560, d.startWidth + delta)));
    };
    const onUp = () => {
      sidebarResizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [sidebarWidth]);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectionStats = useMemo(() => {
    // Formula evaluation helper is render-safe; its internal cache ref is read-only during evaluation.
    const nums = selectionCells.map((k) => getCellValue(k)).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    // cleanNumber: 0.1 + 0.2 স্ট্যাটাস বারে 0.30000000000000004 দেখানোর ভুল বাদ
    const sum = cleanNumber(nums.reduce((a, b) => a + b, 0));
    const avg = nums.length ? cleanNumber(sum / nums.length) : 0;
    const min = nums.length ? nums.reduce((lowest: number, v: number) => Math.min(lowest, v), Infinity) : 0;
    const max = nums.length ? nums.reduce((highest: number, v: number) => Math.max(highest, v), -Infinity) : 0;
    // বিশাল সিলেকশনে শুধু প্রথম MAX_SELECTION_CELLS ঘর গোনা হয় — তখন ব্যবহারকারীকে জানানো হয়
    const totalSelected =
      (Math.abs(selection.r2 - selection.r1) + 1) * (Math.abs(selection.c2 - selection.c1) + 1);
    return {
      count: selectionCells.length,
      numericCount: nums.length,
      sum,
      avg,
      min,
      max,
      truncated: totalSelected > selectionCells.length,
    };
  }, [selectionCells, getCellValue, selection]);


  const hasRowMerges = useMemo(() => Object.values(sheet.cells).some((c) => (c.rowSpan || 1) > 1), [sheet.cells]);
  const virtualizeRows = !hasRowMerges && sheet.gridRows > 150;
  const ROW_BUFFER = Math.max(20, Math.min(64, Math.ceil(viewport.clientHeight / DEFAULT_ROW_HEIGHT)));

  // প্রতিটি রোর বাম-প্রান্তের ক্রমযোজিত অফসেট (hidden রো = ০ উচ্চতা)
  const rowOffsets = useMemo(() => {
    const o = new Array<number>(sheet.gridRows + 1);
    o[0] = 0;
    for (let i = 0; i < sheet.gridRows; i++) {
      o[i + 1] = o[i] + (hiddenRows.has(i) ? 0 : sheet.rowHeights[i] || DEFAULT_ROW_HEIGHT);
    }
    return o;
  }, [sheet.gridRows, sheet.rowHeights, hiddenRows]);

  const visibleRowRange = useMemo(() => {
    if (!virtualizeRows) return { start: 0, end: sheet.gridRows - 1 };
    const first = findIndexByOffset(rowOffsets, viewport.scrollTop);
    const last = findIndexByOffset(rowOffsets, viewport.scrollTop + viewport.clientHeight);
    return {
      start: Math.max(sheet.frozenRows, first - ROW_BUFFER),
      end: Math.min(sheet.gridRows - 1, last + ROW_BUFFER),
    };
  }, [virtualizeRows, rowOffsets, viewport.scrollTop, viewport.clientHeight, sheet.gridRows, sheet.frozenRows, ROW_BUFFER]);

  const topSpacerHeight = virtualizeRows
    ? Math.max(0, rowOffsets[visibleRowRange.start] - rowOffsets[sheet.frozenRows])
    : 0;
  const bottomSpacerHeight = virtualizeRows
    ? Math.max(0, rowOffsets[sheet.gridRows] - rowOffsets[visibleRowRange.end + 1])
    : 0;

  // শুধু যে রোগুলো আসলে রেন্ডার হবে
  const renderRows = useMemo(() => {
    if (!virtualizeRows) return rowsArr;
    const out: number[] = [];
    for (let i = 0; i < sheet.frozenRows; i++) out.push(i);
    for (let i = Math.max(visibleRowRange.start, sheet.frozenRows); i <= visibleRowRange.end; i++) out.push(i);
    return out;
  }, [virtualizeRows, rowsArr, sheet.frozenRows, visibleRowRange.start, visibleRowRange.end]);

  // টেবিলের মোট প্রস্থ (hidden কলাম বাদে) — টেবিল-প্রস্থ স্থির রাখতে
  const tableWidth = useMemo(() => {
    let w = ROW_HEADER_WIDTH;
    for (let i = 0; i < sheet.gridCols; i++) {
      if (!hiddenCols.has(i)) w += sheet.colWidths[i] || DEFAULT_COL_WIDTH;
    }
    return w;
  }, [sheet.gridCols, sheet.colWidths, hiddenCols]);

  // কন্ডিশনাল ফরম্যাটিং রুলের রেঞ্জ একবারই পার্স হবে
  const cfRulesParsed = useMemo(
    () => (sheet.conditionalRules || []).map((rule) => ({ rule, nr: normalizeRange(rule.range) })),
    [sheet.conditionalRules]
  );

  const handleExportCsv = useCallback(async (): Promise<void> => {
    try {
      let lastRow = -1;
      let lastCol = -1;

      for (const [key, cell] of Object.entries(sheet.cells)) {
        if (cell.mergedInto || cell.value === "") {
          continue;
        }

        const position = parseKey(key);

        if (
          !position ||
          position.row < 0 ||
          position.col < 0 ||
          position.row >= sheet.gridRows ||
          position.col >= sheet.gridCols
        ) {
          throw new Error(`সেলের ঠিকানা সঠিক নয়: ${key}`);
        }

        lastRow = Math.max(lastRow, position.row);
        lastCol = Math.max(lastCol, position.col);
      }

      if (lastRow < 0 || lastCol < 0) {
        showToast("CSV export করার মতো সেল ডেটা নেই।");
        return;
      }

      const exportCellCount = (lastRow + 1) * (lastCol + 1);
      const maximumExportCells = 1_000_000;

      if (exportCellCount > maximumExportCells) {
        showToast(
          "CSV রেঞ্জ অতিরিক্ত বড়। ডেটা ছোট রেঞ্জে সাজান বা JSON backup ব্যবহার করুন।"
        );
        return;
      }

      const escapeCsvValue = (value: string): string =>
        /[",\r\n]/.test(value)
          ? `"${value.replace(/"/g, '""')}"`
          : value;

      const rows: string[] = [];

      for (let row = 0; row <= lastRow; row++) {
        const values: string[] = [];

        for (let col = 0; col <= lastCol; col++) {
          const key = cellKey(row, col);
          const cell = sheet.cells[key];

          const display = cell?.mergedInto
            ? ""
            : getDisplayValue(key);

          values.push(escapeCsvValue(display));
        }

        rows.push(values.join(","));
      }

      const csv = "\uFEFF" + rows.join("\r\n");

      const result = await saveDeviceFile({
        suggestedName: `${sheet.name.trim() || "sheet"}.csv`,
        blob: new Blob([csv], {
          type: "text/csv;charset=utf-8",
        }),
        types: [
          {
            description: "CSV File",
            accept: {
              "text/csv": [".csv"],
            },
          },
        ],
      });

      if (result.status === "cancelled") {
        showToast("CSV export বাতিল করা হয়েছে।");
        return;
      }

      if (result.status === "saved") {
        showToast(`CSV সেভ হয়েছে: ${result.fileName}`);
      } else {
        showToast(
          "CSV ডাউনলোড শুরু হয়েছে। Downloads তালিকা পরীক্ষা করুন।"
        );
      }
    } catch (error) {
      console.error("ALIMXL CSV export failed:", error);

      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);

      window.alert(`CSV export হয়নি।\n\n${message}`);
    }
  }, [sheet, getDisplayValue, showToast]);


  // সিলেক্ট করা ক্যারেক্টারটি active cell-এ বসানো হবে, এবং Recent তালিকায় যোগ হবে
  const insertCharacterToCell = useCallback((ch: string) => {
    const raw = getRawValue(activeCell);
    setCellValue(activeCell, `${raw}${ch}`);

    setScRecent((prev) => {
      const next = [ch, ...prev.filter((c) => c !== ch)].slice(0, 24);
      saveCharListToStorage(SPECIAL_CHARS_RECENT_KEY, next);
      return next;
    });

    showToast(`"${ch}" inserted.`);
  }, [activeCell, getRawValue, setCellValue, showToast]);

  // Favorites তালিকায় নতুন ক্যারেক্টার যোগ/বাদ (টগল)
  const toggleFavoriteCharacter = useCallback((ch: string) => {
    setScFavorites((prev) => {
      const exists = prev.includes(ch);
      const next = exists ? prev.filter((c) => c !== ch) : [ch, ...prev].slice(0, 30);
      saveCharListToStorage(SPECIAL_CHARS_FAVORITES_KEY, next);
      showToast(exists ? "Removed from favorites." : "Added to favorites.");
      return next;
    });
  }, [showToast]);

  const insertDate = () => {
    setCellValue(activeCell, new Date().toISOString().split("T")[0]);
    showToast("Date inserted.");
  };

  const insertTime = () => {
    setCellValue(activeCell, new Date().toLocaleTimeString());
    showToast("Time inserted.");
  };


  const sortColumn = useCallback(
    (col: number, direction: "asc" | "desc") => {
      const lastRow = getLastUsedRow(sheet.cells);
      if (lastRow < 1) {
        showToast("Nothing to sort.");
        return;
      }

      // হেডার সারি (যেমন "Amount") সর্টের ভেতরে ঢুকে যেত — এখন টেক্সট-হেডার + নিচে সংখ্যা থাকলে বাদ যায়
      const firstValue = getCellValue(cellKey(0, col));
      const hasNumbersBelow = Array.from({ length: lastRow }, (_, i) => getCellValue(cellKey(i + 1, col))).some(
        (v) => typeof v === "number"
      );
      const headerBold = Boolean(sheet.cells[cellKey(0, col)]?.style?.bold) && !sheet.cells[cellKey(1, col)]?.style?.bold;
      const looksLikeHeader =
        typeof firstValue === "string" &&
        firstValue !== "" &&
        !FORMULA_ERRORS.has(firstValue) &&
        (hasNumbersBelow || headerBold);
      const startRow = looksLikeHeader ? 1 : 0;

      const rowsData = Array.from({ length: lastRow + 1 - startRow }, (_, index) => ({
        row: index + startRow,
        val: getCellValue(cellKey(index + startRow, col)),
      }));

      const sorted = [...rowsData].sort((a, b) => {
        const aBlank = a.val === "";
        const bBlank = b.val === "";

        // খালি সেল সবসময় শেষে (asc/desc দুই ক্ষেত্রেই)
        if (aBlank || bBlank) {
          if (aBlank && bBlank) return a.row - b.row;
          return aBlank ? 1 : -1;
        }

        let cmp: number;
        if (typeof a.val === "number" && typeof b.val === "number") {
          cmp = a.val - b.val;
        } else if (typeof a.val === "number") {
          cmp = -1; // সংখ্যা আগে, টেক্সট পরে
        } else if (typeof b.val === "number") {
          cmp = 1;
        } else {
          cmp = String(a.val).localeCompare(String(b.val), undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }

        if (cmp === 0) return a.row - b.row; // সমান হলে আগের ক্রম ঠিক থাকবে
        return direction === "asc" ? cmp : -cmp;
      });

      updateSheet((s) => {
        const next = { ...s.cells };

        sorted.forEach(({ row: sourceRow }, index) => {
          const targetRow = index + startRow;

          for (let c = 0; c < s.gridCols; c++) {
            const data = s.cells[cellKey(sourceRow, c)];
            const k = cellKey(targetRow, c);

            if (!data) {
              delete next[k]; // খালি সেলের অবজেক্ট জমা হবে না
              continue;
            }

            // সারি সরলে সূত্রের আপেক্ষিক রেফারেন্সও সরে, নাহলে =A2*B2 অন্য সারির মান দেখাত
            next[k] =
              targetRow !== sourceRow && typeof data.value === "string" && data.value.startsWith("=")
                ? { ...data, value: "=" + shiftFormulaRefs(data.value.slice(1), targetRow - sourceRow, 0) }
                : data;
          }
        });

        return { cells: next };
      });

      setSortDir(direction === "asc" ? "desc" : "asc");

      showToast(`Sorted ${direction === "asc" ? "ascending" : "descending"} by column ${colToLetter(col)}.`);
    },
    [sheet.cells, getCellValue, updateSheet, showToast]
  );


  const sortByActiveColumn = useCallback(

    (direction?: "asc" | "desc") => {
      sortColumn(activePos.col, direction || sortDir);
    },
    [activePos.col, sortDir, sortColumn]
  );

  const sortColumnByColor = useCallback(
    (col: number, kind: "bg" | "font", color: string) => {
      const normalizedTarget = normalizeFilterColor(color);

      const lastRow = getLastUsedRow(sheet.cells);
      if (lastRow < 1) {
        showToast("Nothing to sort.");
        return;
      }

      const rowsData = Array.from({ length: lastRow + 1 }, (_, row) => {
        const style = sheet.cells[cellKey(row, col)]?.style;
        const currentColor =
          kind === "bg"
            ? normalizeFilterColor(style?.bg || "#FFFFFF")
            : normalizeFilterColor(style?.color || "#000000");

        return {
          row,
          matched: currentColor === normalizedTarget,
        };
      });

      const sorted = [...rowsData].sort((a, b) => {
        if (a.matched === b.matched) return a.row - b.row;
        return a.matched ? -1 : 1;
      });

      updateSheet((s) => {
        const next = { ...s.cells };

        sorted.forEach(({ row: sourceRow }, targetRow) => {
          for (let c = 0; c < s.gridCols; c++) {
            const data = s.cells[cellKey(sourceRow, c)] || { value: "" };
            next[cellKey(targetRow, c)] =
              targetRow !== sourceRow && typeof data.value === "string" && data.value.startsWith("=")
                ? { ...data, value: "=" + shiftFormulaRefs(data.value.slice(1), targetRow - sourceRow, 0) }
                : data;
          }
        });

        return { cells: next };
      });

      showToast(
        `Sorted by ${kind === "bg" ? "background" : "font"} color in column ${colToLetter(col)}.`
      );
    },
    [sheet.cells, updateSheet, showToast]
  );

  const getColumnUniqueValues = useCallback(
    (col: number): AutoFilterOption[] => {
      const map = new Map<string, number>();

      for (let r = 0; r < sheet.gridRows; r++) {
        const value = getDisplayValue(cellKey(r, col));
        map.set(value, (map.get(value) || 0) + 1);
      }

      return Array.from(map.entries())
        .map(([value, count]) => ({
          value,
          label: value === "" ? "(Empty)" : value,
          count,
        }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );
    },
    [sheet.gridRows, getDisplayValue]
  );

  const getColumnColorOptions = useCallback(
    (col: number, kind: "bg" | "font"): AutoFilterColorOption[] => {
      const map = new Map<string, number>();

      for (let r = 0; r < sheet.gridRows; r++) {
        const style = sheet.cells[cellKey(r, col)]?.style;

        const color =
          kind === "bg"
            ? normalizeFilterColor(style?.bg || "#FFFFFF")
            : normalizeFilterColor(style?.color || "#000000");

        map.set(color, (map.get(color) || 0) + 1);
      }

      return Array.from(map.entries()).map(([color, count]) => ({
        color,
        label:
          color === "#FFFFFF"
            ? kind === "bg"
              ? "Default / No Fill"
              : "#FFFFFF"
            : color === "#000000"
              ? kind === "font"
                ? "Default Font"
                : "#000000"
              : color,
        count,
      }));
    },
    [sheet.gridRows, sheet.cells]
  );

  const buildHiddenRowsFromFilterRecords = useCallback(
    (filters: Record<number, string>): number[] => {
      const parsedFilters = Object.entries(filters)
        .map(([col, raw]) => ({
          col: parseInt(col, 10),
          state: parseAutoFilterState(raw),
        }))
        .filter(({ col, state }) => Number.isFinite(col) && isAutoFilterActive(state));

      if (parsedFilters.length === 0) return [];

      const topBottomSets = new Map<string, Set<number>>();

      parsedFilters.forEach(({ col, state }) => {
        if (state.condition !== "top10" && state.condition !== "bottom10") return;

        const numericRows: { row: number; value: number }[] = [];

        for (let r = 0; r < sheet.gridRows; r++) {
          const raw = getCellValue(cellKey(r, col));

          const numeric = strictNumber(typeof raw === "boolean" ? String(raw) : raw) ?? NaN;

          if (Number.isFinite(numeric)) {
            numericRows.push({ row: r, value: numeric });
          }
        }

        numericRows.sort((a, b) =>
          state.condition === "top10" ? b.value - a.value : a.value - b.value
        );

        topBottomSets.set(
          `${col}:${state.condition}`,
          new Set(numericRows.slice(0, 10).map((item) => item.row))
        );
      });

      const hidden: number[] = [];

      for (let r = 0; r < sheet.gridRows; r++) {
        let visible = true;

        for (const { col, state } of parsedFilters) {
          const key = cellKey(r, col);
          const display = getDisplayValue(key);
          const raw = getCellValue(key);
          const style = sheet.cells[key]?.style;

          /*
           * Checkbox/value filter
           */
          if (state.selectedValues !== null) {
            const selected = new Set(state.selectedValues);

            if (!selected.has(display)) {
              visible = false;
              break;
            }
          }

          /*
           * Background color filter
           */
          if (state.bgColor) {
            const bg = normalizeFilterColor(style?.bg || "#FFFFFF");

            if (bg !== normalizeFilterColor(state.bgColor)) {
              visible = false;
              break;
            }
          }

          /*
           * Font color filter
           */
          if (state.fontColor) {
            const font = normalizeFilterColor(style?.color || "#000000");

            if (font !== normalizeFilterColor(state.fontColor)) {
              visible = false;
              break;
            }
          }

          /*
           * Empty / Not Empty
           */
          if (state.condition === "empty" && display.trim() !== "") {
            visible = false;
            break;
          }

          if (state.condition === "notEmpty" && display.trim() === "") {
            visible = false;
            break;
          }

          /*
           * Top 10 / Bottom 10
           */
          if (state.condition === "top10" || state.condition === "bottom10") {
            const set = topBottomSets.get(`${col}:${state.condition}`);

            if (!set?.has(r)) {
              visible = false;
              break;
            }
          }

          /*
           * Standard Filter
           */
          if (state.condition === "standard") {
            const standardValue = state.standard.value.trim();

            if (
              standardValue &&
              !matchStandardAutoFilter(
                state.standard.operator,
                raw,
                display,
                standardValue
              )
            ) {
              visible = false;
              break;
            }
          }
        }

        if (!visible) hidden.push(r);
      }

      return hidden;
    },
    [sheet.gridRows, sheet.cells, getDisplayValue, getCellValue]
  );

  const openAutoFilterMenu = useCallback(
    (col: number, e?: React.MouseEvent) => {
      if (!autoFilterIsEnabled && !sheet.filters[col]) {
        return;
      }

      const options = getColumnUniqueValues(col);
      const current = parseAutoFilterState(sheet.filters[col]);

      setAutoFilterDraft({
        ...current,
        selectedValues: current.selectedValues ?? options.map((item) => item.value),
      });

      setAutoFilterMenu({
        col,
        x: e ? Math.min(e.clientX, window.innerWidth - 360) : 220,
        y: e ? Math.min(e.clientY + 8, window.innerHeight - 560) : 160,
      });
    },
    [autoFilterIsEnabled, getColumnUniqueValues, sheet.filters, setAutoFilterDraft, setAutoFilterMenu]
  );

  const applyAutoFilterDraft = useCallback(() => {
    if (!autoFilterMenu || !autoFilterDraft) return;

    const col = autoFilterMenu.col;

    const allValues = getColumnUniqueValues(col).map((item) => item.value);
    const selectedValues = autoFilterDraft.selectedValues ?? allValues;
    const selectedAll = selectedValues.length === allValues.length;

    const normalizedState: AutoFilterState = {
      ...autoFilterDraft,
      selectedValues: selectedAll ? null : selectedValues,
      bgColor: autoFilterDraft.bgColor || null,
      fontColor: autoFilterDraft.fontColor || null,
      standard: {
        operator: autoFilterDraft.standard.operator,
        value: autoFilterDraft.standard.value || "",
      },
    };

    const nextFilters = { ...sheet.filters };

    if (isAutoFilterActive(normalizedState)) {
      nextFilters[col] = serializeAutoFilterState(normalizedState);
    } else {
      delete nextFilters[col];
    }

    const hiddenRows = buildHiddenRowsFromFilterRecords(nextFilters);

    updateSheet({
      filters: nextFilters,
      hiddenRows,
    });

    setAutoFilterMenu(null);
    setAutoFilterDraft(null);

    showToast("AutoFilter applied.");
  }, [
    autoFilterMenu,
    autoFilterDraft,
    getColumnUniqueValues,
    sheet.filters,
    buildHiddenRowsFromFilterRecords,
    updateSheet,
    showToast,
    setAutoFilterMenu,
    setAutoFilterDraft,
  ]);

  const clearAutoFilterColumn = useCallback(() => {
    if (!autoFilterMenu) return;

    const nextFilters = { ...sheet.filters };
    delete nextFilters[autoFilterMenu.col];

    const hiddenRows = buildHiddenRowsFromFilterRecords(nextFilters);

    updateSheet({
      filters: nextFilters,
      hiddenRows,
    });

    setAutoFilterMenu(null);
    setAutoFilterDraft(null);

    showToast(`Filter cleared for column ${colToLetter(autoFilterMenu.col)}.`);
  }, [
    autoFilterMenu,
    sheet.filters,
    buildHiddenRowsFromFilterRecords,
    updateSheet,
    showToast,
    setAutoFilterMenu,
    setAutoFilterDraft,
  ]);

  const toggleAutoFilter = useCallback(() => {
    const hasActiveFilters = Object.keys(sheet.filters || {}).length > 0;

    if (autoFilterIsEnabled || hasActiveFilters) {
      setAutoFilterEnabled(false);
      setAutoFilterMenu(null);
      setAutoFilterDraft(null);

      updateSheet({
        filters: {},
        hiddenRows: [],
      });

      showToast("AutoFilter turned off.");
      return;
    }

    setAutoFilterEnabled(true);
    showToast("AutoFilter turned on. Use the header dropdown arrows to filter.");
  }, [
    autoFilterIsEnabled,
    sheet.filters,
    updateSheet,
    showToast,
    setAutoFilterMenu,
    setAutoFilterDraft,
  ]);


  const groupSelection = () => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    if (r1 === r2) {
      showToast("Select multiple rows to group.");
      return;
    }
    updateSheet((s) => ({ groups: [...s.groups, { id: `g_${Date.now()}`, start: r1, end: r2, collapsed: false }] }));
    showToast("Rows grouped.");
  };

  const ungroupSelection = () => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    updateSheet((s) => ({ groups: s.groups.filter((g) => !(g.start === r1 && g.end === r2)) }));
    showToast("Rows ungrouped.");
  };

  const toggleGroupCollapse = (id: string) => {
    updateSheet((s) => {
      const groups = s.groups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g));
      const group = groups.find((g) => g.id === id);
      const hidden = new Set(s.hiddenRows);
      if (group) {
        for (let r = group.start + 1; r <= group.end; r++) {
          if (group.collapsed) {
            hidden.add(r);
          } else {
            hidden.delete(r);
          }
        }
      }
      return { groups, hiddenRows: Array.from(hidden) };
    });
  };
  const groupColumnsSelection = () => {
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);
    if (c1 === c2) {
      showToast("Select multiple columns to group.");
      return;
    }
    updateSheet((s) => ({ colGroups: [...(s.colGroups || []), { id: `cg_${Date.now()}`, start: c1, end: c2, collapsed: false }] }));
    showToast("Columns grouped.");
  };

  const ungroupColumnsSelection = () => {
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);
    updateSheet((s) => ({ colGroups: (s.colGroups || []).filter((group) => !(group.start === c1 && group.end === c2)) }));
    showToast("Columns ungrouped.");
  };


  const collapseAllGroups = () => {
    updateSheet((s) => {
      const groups = s.groups.map((group) => ({ ...group, collapsed: true }));
      const hidden = new Set(s.hiddenRows);
      groups.forEach((group) => {
        for (let row = group.start + 1; row <= group.end; row++) hidden.add(row);
      });
      const colGroups = (s.colGroups || []).map((group) => ({ ...group, collapsed: true }));
      const hiddenColumnSet = new Set(s.hiddenCols || []);
      colGroups.forEach((group) => {
        for (let col = group.start + 1; col <= group.end; col++) hiddenColumnSet.add(col);
      });
      return { groups, hiddenRows: Array.from(hidden), colGroups, hiddenCols: Array.from(hiddenColumnSet) };
    });
  };

  const expandAllGroups = () => {
    updateSheet((s) => {
      const expandedGroups = s.groups.map((group) => ({ ...group, collapsed: false }));
      const groupRows = new Set<number>();
      expandedGroups.forEach((group) => {
        for (let row = group.start + 1; row <= group.end; row++) groupRows.add(row);
      });
      const expandedColGroups = (s.colGroups || []).map((group) => ({ ...group, collapsed: false }));
      const groupCols = new Set<number>();
      expandedColGroups.forEach((group) => {
        for (let col = group.start + 1; col <= group.end; col++) groupCols.add(col);
      });
      return {
        groups: expandedGroups,
        hiddenRows: s.hiddenRows.filter((row) => !groupRows.has(row)),
        colGroups: expandedColGroups,
        hiddenCols: (s.hiddenCols || []).filter((col) => !groupCols.has(col)),
      };
    });
  };

  const applyValidity = () => {
    const options = validityInput.split(",").map((s) => s.trim()).filter(Boolean);
    updateSheet((s) => {
      const next = { ...s.cells };
      selectionCells.forEach((k) => (next[k] = { ...(next[k] || { value: "" }), validation: options.length ? options : undefined }));
      return { cells: next };
    });
    setShowValidity(false);
    showToast("Data validation applied.");
  };

  const applyAggregateFunction = useCallback(
    (fn: Aggregate) => {
      let r = activePos.row - 1;
      const startRow = r;
      while (r >= 0 && getRawValue(cellKey(r, activePos.col)) !== "") r--;
      const firstDataRow = r + 1;
      const range = startRow < firstDataRow ? selectedRangeText : `${cellKey(firstDataRow, activePos.col)}:${cellKey(startRow, activePos.col)}`;
      setCellValue(activeCell, `=${fn}(${range})`);
      setShowAutoSumMenu(false);
      showToast(`${fn} applied.`);
    },
    [activePos, getRawValue, activeCell, selectedRangeText, setCellValue, showToast]
  );

  const autoSum = () => {
    let r = activePos.row - 1;
    const startRow = r;
    while (r >= 0 && getRawValue(cellKey(r, activePos.col)) !== "") r--;
    const firstDataRow = r + 1;
    if (startRow < firstDataRow) {
      setCellValue(activeCell, `=SUM(${selectedRangeText})`);
      showToast("AutoSum inserted for selected range.");
      return;
    }
    setCellValue(activeCell, `=SUM(${cellKey(firstDataRow, activePos.col)}:${cellKey(startRow, activePos.col)})`);
    showToast("AutoSum applied.");
  };

  const insertFunctionFromToolbar = () => {
    startEditing(activeCell, "=");
    setShowFunctionWizard(true);
    showToast("Function wizard opened.");
  };

  const runGoalSeek = () => {
    const targetKey = goalTargetCell.toUpperCase().trim();
    const changeKey = goalChangingCell.toUpperCase().trim();
    const desired = strictNumber(goalValue.trim());
    if (!parseKey(targetKey) || !parseKey(changeKey) || desired === null) {
      showToast("Enter valid cell references and target value.");
      return;
    }
    if (targetKey === changeKey) {
      showToast("Target cell and changing cell must be different.");
      return;
    }
    if (sheet.cells[targetKey]?.value?.startsWith("=") !== true) {
      showToast("Target cell must contain a formula that depends on the changing cell.");
      return;
    }
    if (sheet.cells[changeKey]?.value?.startsWith("=")) {
      showToast("Changing cell must contain a plain value, not a formula.");
      return;
    }

    // [হিসাব-সংশোধন] আগের ভার্সন: ফিক্সড ±১কোটি সীমা, সমাধান আছে কিনা না দেখেই ফলাফল বসাত, ২ দশমিকে রাউন্ড করত।
    // এখন: সমাধান-সীমা (bracket) খোঁজে, bisection-এ প্রায় নিখুঁত মান বের করে, না পেলে কিছু বদলায় না।
    const estimate = (x: number): number => {
      const tempCells = { ...sheet.cells, [changeKey]: { ...(sheet.cells[changeKey] || { value: "" }), value: String(x) } };
      const tempSheet: WorkbookSheet = { ...sheet, cells: tempCells };
      const tempAll = sheets.map((item) => (item.id === sheet.id ? tempSheet : item));
      const value = getCellValueInSheet(tempSheet, targetKey, new Set<string>(), tempAll);
      return typeof value === "number" && Number.isFinite(value) ? value : NaN;
    };

    const gap = (x: number): number => estimate(x) - desired;
    const tolerance = 1e-9 * Math.max(1, Math.abs(desired));

    const startRaw = strictNumber(getRawValue(changeKey));
    const start = startRaw ?? 0;

    let lo = NaN;
    let hi = NaN;
    let gapLo = NaN;
    let gapHi = NaN;

    const startGap = gap(start);
    if (Number.isFinite(startGap) && Math.abs(startGap) <= tolerance) {
      showToast("Goal already satisfied by the current value.");
      setShowGoalSeek(false);
      return;
    }

    for (let step = 1; step <= 1e12 && Number.isNaN(lo); step *= 10) {
      const left = start - step;
      const right = start + step;
      const gapLeft = gap(left);
      const gapRight = gap(right);
      if (Number.isFinite(gapLeft) && Number.isFinite(startGap) && Math.sign(gapLeft) * Math.sign(startGap) <= 0) {
        lo = left; hi = start; gapLo = gapLeft; gapHi = startGap;
      } else if (Number.isFinite(gapRight) && Number.isFinite(startGap) && Math.sign(gapRight) * Math.sign(startGap) <= 0) {
        lo = start; hi = right; gapLo = startGap; gapHi = gapRight;
      } else if (Number.isFinite(gapLeft) && Number.isFinite(gapRight) && Math.sign(gapLeft) * Math.sign(gapRight) <= 0) {
        lo = left; hi = right; gapLo = gapLeft; gapHi = gapRight;
      }
    }

    if (Number.isNaN(lo) || Number.isNaN(gapLo) || Number.isNaN(gapHi)) {
      showToast("Goal Seek could not find a solution. The target may not be reachable by changing this cell.");
      return;
    }

    let best = Math.abs(gapLo) <= Math.abs(gapHi) ? lo : hi;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const gapMid = gap(mid);
      if (!Number.isFinite(gapMid)) break;
      best = mid;
      if (Math.abs(gapMid) <= tolerance || mid === lo || mid === hi) break;
      if (Math.sign(gapMid) === Math.sign(gapLo)) {
        lo = mid;
        gapLo = gapMid;
      } else {
        hi = mid;
        gapHi = gapMid;
      }
    }

    const solution = cleanNumber(best);
    const achieved = estimate(solution);
    if (!Number.isFinite(achieved) || Math.abs(achieved - desired) > Math.max(1e-6, 1e-6 * Math.abs(desired))) {
      showToast("Goal Seek could not reach the target value; no cell was changed.");
      return;
    }

    setCellValue(changeKey, String(solution));
    setShowGoalSeek(false);
    showToast(`Goal seek completed: ${changeKey} = ${solution}`);
  };

  const runConsolidate = () => {
    const targetKey = consolidateTarget.toUpperCase().trim();
    if (!parseKey(targetKey)) {
      showToast("Target cell is invalid.");
      return;
    }
    let total = 0;
    let invalidRange = "";
    let errorValue = "";
    consolidateRanges.split(",").map((s) => s.trim()).filter(Boolean).forEach((range) => {
      const nr = normalizeRange(range.includes(":") ? range : `${range}:${range}`);
      if (!nr) {
        invalidRange = invalidRange || range;
        return;
      }
      for (let r = nr.r1; r <= nr.r2; r++) {
        for (let c = nr.c1; c <= nr.c2; c++) {
          const value = getCellValue(cellKey(r, c));
          // শুধু আসল সংখ্যা যোগ হয়; টেক্সট/ফাঁকা বাদ, এররে থামে (আগে "2nd" → ২ ও এরর → ০ ধরা হতো)
          if (typeof value === "number" && Number.isFinite(value)) total += value;
          else if (typeof value === "string" && FORMULA_ERRORS.has(value)) errorValue = errorValue || value;
        }
      }
    });
    if (invalidRange) {
      showToast(`Invalid range: ${invalidRange}`);
      return;
    }
    if (errorValue) {
      showToast(`Consolidation stopped: a source cell contains ${errorValue}`);
      return;
    }
    setCellValue(targetKey, String(cleanNumber(total)));
    setShowConsolidate(false);
    showToast("Consolidation completed.");
  };



  const importCsvText = useCallback((text: string) => {
    const parseCsv = (input: string) => {
      const rows: string[][] = [];
      let row: string[] = [];
      let cell = "";
      let inQuotes = false;

      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        const next = input[i + 1];

        if (ch === '"') {
          if (inQuotes && next === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (ch === "," && !inQuotes) {
          row.push(cell);
          cell = "";
          continue;
        }

        if ((ch === "\n" || ch === "\r") && !inQuotes) {
          if (ch === "\r" && next === "\n") i++;
          row.push(cell);
          if (row.length > 1 || row[0] !== "") rows.push(row);
          row = [];
          cell = "";
          continue;
        }

        cell += ch;
      }

      row.push(cell);
      if (row.length > 1 || row[0] !== "") rows.push(row);

      return rows;
    };

    const parsedRows = parseCsv(text);
    const neededRows = parsedRows.length;
    const neededCols = Math.max(1, ...parsedRows.map((r) => r.length));

    updateSheet((s) => {
      const next = { ...s.cells };

      parsedRows.forEach((row, r) =>
        row.forEach((val, c) => {
          next[cellKey(r, c)] = {
            value: val.trim(),
            style: { wrap: true },
          };
        })
      );

      return {
        cells: next,
        gridRows: Math.max(s.gridRows, Math.min(neededRows, MAX_ROWS)),
        gridCols: Math.max(s.gridCols, Math.min(neededCols, MAX_COLS)),
      };
    });

    setShowDataSource(false);
    showToast("CSV data imported.");
  }, [updateSheet, showToast]);


  const recordRecentFile = useCallback(
    (name: string, id?: string) => {
      const savedId = id?.trim();

      // অ্যাপে সেভ করা workbook-এর ID ছাড়া Recent তৈরি করব না।
      if (!savedId) {
        return;
      }

      const entry: RecentFileEntry = {
        id: savedId,
        name: name.trim() || "Untitled Workbook",
        openedAt: new Date().toISOString(),
      };

      setRecentFiles((prev) => {
        const next = [
          entry,
          ...prev.filter((file) => file.id !== savedId),
        ].slice(0, 8);

        return next;
      });
    },
    []
  );

  // Recent তালিকা সরাসরি ডিভাইসে সেভ করা ওয়ার্কবুক থেকে বানানো হচ্ছে
  const refreshRecentFromDevice = useCallback(async () => {
    try {
      const list = await listLocalWorkbooks();
      const next: RecentFileEntry[] = [...list]
        .sort((a, b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0))
        .slice(0, 8)
        .map((w) => ({
          id: w.id,
          name: w.name,
          openedAt: w.updatedAt || new Date().toISOString(),
        }));
      setRecentFiles(next);
      saveRecentFilesToStorage(next);
    } catch (error) {
      console.error("ALIMXL recent list refresh failed:", error);
    }
  }, []);


  const handleNewFile = () => {
    requestConfirm(
      "New Workbook",
      "Create a new workbook? Unsaved changes will be lost.",
      () => {
        setWorkbookName("Untitled Workbook");
        setWorkbookId(null);
        setSheets([createSheet("Sheet 1")]);
        setActiveSheetIndex(0);
        setActiveCell("A1");
        setSelection({ r1: 0, c1: 0, r2: 0, c2: 0 });
        showToast("New workbook created.");
      }
    );
  };


  const handleUnsupportedNewDocument = useCallback((docType: string) => {
    showToast(`${docType} is not available in this Spreadsheet module. Only spreadsheet workbooks can be created here.`);
  }, [showToast]);


  const handleOpenRecentFile = useCallback(
    async (file: RecentFileEntry) => {
      if (localSaveInProgressRef.current) {
        showToast("Please wait. A workbook is currently being saved.");
        return;
      }

      try {
        const workbook = await getLocalWorkbook<WorkbookSnapshot>(file.id);

        if (!workbook) {
          showToast(`"${file.name}" could not be found.`);
          return;
        }

        const nextSheets =
          workbook.sheets && workbook.sheets.length > 0
            ? workbook.sheets
            : [createSheet("Sheet 1")];

        replaceWorkbookSheets(nextSheets);
        setActiveSheetIndex(
          Math.min(
            workbook.activeSheetIndex || 0,
            Math.max(nextSheets.length - 1, 0)
          )
        );

        setWorkbookName(workbook.name || file.name);
        setWorkbookId(workbook.id || file.id);
        setPageSize(workbook.pageSize || "A4");
        setOrientation(workbook.orientation || "portrait");

        setActiveCell("A1");
        setSelection({ r1: 0, c1: 0, r2: 0, c2: 0 });
        setSaveState("idle");

        showToast(`Reopened "${file.name}".`);
      } catch (error) {
        console.error("ALIMXL recent workbook open failed:", error);
        showToast("Unable to open the selected workbook.");
      }
    },
    [showToast, replaceWorkbookSheets]
  );


  const handleClearRecentFiles = useCallback(() => {
    setRecentFiles([]);
    saveRecentFilesToStorage([]);
    showToast("Recent files list cleared.");
  }, [showToast]);


  const handleToggleCurrentModuleOnly = useCallback(() => {
    setRecentFilesModuleOnly((v) => {
      const next = !v;
      showToast(next ? "Showing spreadsheet workbooks only." : "Showing files from all modules.");
      return next;
    });
  }, [showToast]);


  const handleApplyTemplate = useCallback((tpl: WorkbookTemplate) => {
    const nextSheets = tpl.snapshot.sheets.length
      ? tpl.snapshot.sheets.map((s) => ({ ...s }))
      : [createSheet("Sheet 1")];

    setSheets(nextSheets);
    setActiveSheetIndex(0);
    setWorkbookName(tpl.name);
    setWorkbookId(null);
    setPageSize(tpl.snapshot.pageSize);
    setOrientation(tpl.snapshot.orientation);
    setActiveCell("A1");
    setSelection({ r1: 0, c1: 0, r2: 0, c2: 0 });
    setShowTemplatesDialog(null);
    showToast(`New workbook created from "${tpl.name}".`);
  }, [showToast, setSheets]);

  const handleApplyBuiltInTemplate = useCallback(
    (tpl: (typeof BUILT_IN_TEMPLATES)[number]) => {
      handleApplyTemplate({
        id: tpl.id,
        name: tpl.name,
        createdAt: new Date().toISOString(),
        snapshot: tpl.snapshot as WorkbookTemplate["snapshot"],
      });
    },
    [handleApplyTemplate]
  );

  const handleDeleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTemplatesToStorage(next);
      return next;
    });
  }, []);

  const onFileSelected = async (file: File) => {
    if (file.name.toLowerCase().endsWith(".json")) {
      if (localSaveInProgressRef.current) {
        throw new Error("সেভ সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন।");
      }

      const parsed: unknown = JSON.parse(
        (await file.text()).replace(/^\uFEFF/, "")
      );

      const isRecord = (
        value: unknown
      ): value is Record<string, unknown> =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);

      if (!isRecord(parsed)) {
        throw new Error("ব্যাকআপের গঠন সঠিক নয়।");
      }

      if (
        typeof parsed.name !== "string" ||
        !parsed.name.trim() ||
        !Array.isArray(parsed.sheets) ||
        parsed.sheets.length === 0
      ) {
        throw new Error("ব্যাকআপে নাম বা শিট পাওয়া যায়নি।");
      }

      if (
        parsed.pageSize !== "A4" &&
        parsed.pageSize !== "Letter" &&
        parsed.pageSize !== "Legal"
      ) {
        throw new Error("ব্যাকআপের pageSize সঠিক নয়।");
      }

      if (
        parsed.orientation !== "portrait" &&
        parsed.orientation !== "landscape"
      ) {
        throw new Error("ব্যাকআপের orientation সঠিক নয়।");
      }

      const index = parsed.activeSheetIndex;

      if (
        typeof index !== "number" ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= parsed.sheets.length
      ) {
        throw new Error("ব্যাকআপের active sheet সঠিক নয়।");
      }

      for (const item of parsed.sheets) {
        if (
          !isRecord(item) ||
          typeof item.id !== "string" ||
          typeof item.name !== "string" ||
          typeof item.gridRows !== "number" ||
          !Number.isInteger(item.gridRows) ||
          item.gridRows < 1 ||
          item.gridRows > MAX_ROWS ||
          typeof item.gridCols !== "number" ||
          !Number.isInteger(item.gridCols) ||
          item.gridCols < 1 ||
          item.gridCols > MAX_COLS ||
          !isRecord(item.cells)
        ) {
          throw new Error("ব্যাকআপের কোনো শিটের গঠন সঠিক নয়।");
        }

        for (const field of [
          "groups",
          "hiddenRows",
          "hiddenCols",
          "charts",
          "conditionalRules",
          "drawings",
        ]) {
          if (!Array.isArray(item[field])) {
            throw new Error(`শিটের ${field} তালিকা সঠিক নয়।`);
          }
        }

        for (const field of [
          "filters",
          "colWidths",
          "rowHeights",
          "namedRanges",
        ]) {
          if (!isRecord(item[field])) {
            throw new Error(`শিটের ${field} তথ্য সঠিক নয়।`);
          }
        }

        if (
          typeof item.frozenRows !== "number" ||
          !Number.isInteger(item.frozenRows) ||
          item.frozenRows < 0 ||
          item.frozenRows > item.gridRows ||
          typeof item.frozenCols !== "number" ||
          !Number.isInteger(item.frozenCols) ||
          item.frozenCols < 0 ||
          item.frozenCols > item.gridCols
        ) {
          throw new Error("শিটের freeze settings সঠিক নয়।");
        }

        for (const [key, cell] of Object.entries(item.cells)) {
          const position = parseKey(key);

          if (
            !position ||
            position.row < 0 ||
            position.col < 0 ||
            position.row >= item.gridRows ||
            position.col >= item.gridCols ||
            !isRecord(cell) ||
            typeof cell.value !== "string"
          ) {
            throw new Error(`ব্যাকআপের সেল সঠিক নয়: ${key}`);
          }
        }
      }

      const confirmed = window.confirm(
        "JSON ব্যাকআপ খুলবেন? বর্তমান অসেভ করা কাজ বদলে যাবে।"
      );

      if (!confirmed) {
        throw new Error("ব্যাকআপ খোলা বাতিল করা হয়েছে।");
      }

      const snapshot = parsed as unknown as WorkbookSnapshot;

      setEditingKey(null);
      setEditValue("");
      setClipboard(null);
      setFormatPainter(null);

      replaceWorkbookSheets(snapshot.sheets);
      setActiveSheetIndex(snapshot.activeSheetIndex);
      setWorkbookName(snapshot.name.trim());

      // ব্যাকআপের পুরোনো ID দিয়ে সেভ করা workbook overwrite করব না।
      setWorkbookId(null);

      setPageSize(snapshot.pageSize);
      setOrientation(snapshot.orientation);
      setActiveCell("A1");
      setSelection({ r1: 0, c1: 0, r2: 0, c2: 0 });
      setSaveState("idle");

      showToast("ব্যাকআপ খোলা হয়েছে। অ্যাপের ভেতরে রাখতে Save করুন।");
      return;
    }
    const isCsv = file.name.toLowerCase().endsWith(".csv");

    if (isCsv) {
      importCsvText(await file.text());
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, {
        type: "array",
        cellFormula: true,
        cellNF: true,
      });


      const importedSheets: WorkbookSheet[] = wb.SheetNames.map(
        (name: string) => {
          const ws = wb.Sheets[name];

          if (!ws) {
            throw new Error(`শিট পাওয়া যায়নি: ${name}`);
          }

          const sh = createSheet(
            name,
            crypto.randomUUID()
          );

          let requiredRows = 1;
          let requiredCols = 1;

          for (const address of Object.keys(ws)) {
            if (address.startsWith("!")) {
              continue;
            }

            const position = parseKey(address);

            if (!position) {
              continue;
            }

            if (
              position.row < 0 ||
              position.col < 0 ||
              position.row >= MAX_ROWS ||
              position.col >= MAX_COLS
            ) {
              throw new Error(
                `শিট "${name}"-এর ${address} অ্যাপের সীমার বাইরে।`
              );
            }

            const source = ws[address];

            if (!source || source.t === "z") {
              continue;
            }

            const hasFormula =
              typeof source.f === "string" &&
              source.f.length > 0;

            if (!hasFormula && source.v == null) {
              continue;
            }

            let value: string;

            if (hasFormula) {
              value = `=${source.f}`;
            } else if (source.t === "b") {
              value = source.v ? "TRUE" : "FALSE";
            } else if (source.t === "e") {
              value = source.w || "#ERROR!";
            } else {
              value = String(source.v ?? "");
            }

            const style: CellStyle = {
              wrap: true,
            };

            if (
              !hasFormula &&
              (source.t === "s" || source.t === "str")
            ) {
              style.numberFormat = "text";
            } else if (
              !hasFormula &&
              source.t === "n" &&
              typeof source.z === "string" &&
              XLSX.SSF.is_date(source.z)
            ) {
              value = XLSX.utils.format_cell(source);
              style.numberFormat = "text";
            }

            sh.cells[cellKey(position.row, position.col)] = {
              value,
              style,
            };

            requiredRows = Math.max(
              requiredRows,
              position.row + 1
            );

            requiredCols = Math.max(
              requiredCols,
              position.col + 1
            );
          }

          sh.gridRows = Math.min(
            MAX_ROWS,
            Math.max(DEFAULT_ROWS, requiredRows)
          );

          sh.gridCols = Math.min(
            MAX_COLS,
            Math.max(DEFAULT_COLS, requiredCols)
          );

          return sh;
        }
      );


      const nextSheets = importedSheets.length ? importedSheets : [createSheet("Sheet 1")];
      setSheets(nextSheets);
      setWorkbookId(null);
      setActiveSheetIndex(0);
      setWorkbookName(file.name.replace(/\.[^/.]+$/, ""));
      setActiveCell("A1");
      setSelection({ r1: 0, c1: 0, r2: 0, c2: 0 });
      showToast("Workbook loaded.");

      recordRecentFile(file.name.replace(/\.[^/.]+$/, ""));

      showToast("Workbook loaded.");
    } catch (error) {
      console.error("ALIMXL XLSX import failed:", error);

      throw error instanceof Error
        ? error
        : new Error("XLSX ফাইল খোলা যায়নি।");
    }
  };


  const buildWorkbookSnapshot = useCallback((): WorkbookSnapshot => ({
    id: workbookId || undefined,
    name: workbookName,
    pageSize,
    orientation,
    activeSheetIndex,
    sheets,
  }), [workbookId, workbookName, pageSize, orientation, activeSheetIndex, sheets]);

  const handleSaveToApp = () => {
    if (localSaveInProgressRef.current) {
      return;
    }

    const nameToUse = workbookName.trim();

    const proceed = (finalName: string) => {
      if (!finalName) {
        showToast("ওয়ার্কবুকের নাম দিন।");
        return;
      }

      localSaveInProgressRef.current = true;
      setSaveState("saving");

      void (async () => {
        try {
          const snapshot: WorkbookSnapshot = {
            ...buildWorkbookSnapshot(),
            name: finalName,
          };

          const saved = await saveLocalWorkbook(snapshot);

          setWorkbookId(saved.id);
          setWorkbookName(saved.name);
          setSaveState("saved");
          void refreshRecentFromDevice();
          showToast("ওয়ার্কবুক এই ডিভাইসে সেভ হয়েছে।");

          window.setTimeout(() => {
            setSaveState((current) =>
              current === "saved" ? "idle" : current
            );
          }, 1800);
        } catch (error) {
          console.error("ALIMXL local save failed:", error);

          setSaveState("error");

          showToast(
            "সেভ হয়নি। ডিভাইসের খালি জায়গা ও ব্রাউজারের স্টোরেজ অনুমতি পরীক্ষা করুন।"
          );
        } finally {
          localSaveInProgressRef.current = false;
        }
      })();
    };

    if (
      !workbookId &&
      (!nameToUse || nameToUse === "Untitled Workbook")
    ) {
      requestPrompt(
        "Save Workbook",
        "ওয়ার্কবুকের নাম দিন",
        (entered) => {
          proceed(entered.trim());
        },
        nameToUse === "Untitled Workbook" ? "" : nameToUse
      );
      return;
    }

    proceed(nameToUse);
  };


  const handleExportAlimxl = async (): Promise<void> => {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const usedSheetNames = new Set<string>();

      for (const sourceSheet of sheets) {
        const worksheet = XLSX.utils.aoa_to_sheet([]);

        let lastRow = 0;
        let lastCol = 0;

        for (const [key, cell] of Object.entries(sourceSheet.cells)) {
          const position = parseKey(key);

          if (
            !position ||
            position.row < 0 ||
            position.col < 0 ||
            position.row >= sourceSheet.gridRows ||
            position.col >= sourceSheet.gridCols
          ) {
            throw new Error(`সেলের ঠিকানা সঠিক নয়: ${key}`);
          }

          if (cell.mergedInto || cell.value === "") {
            continue;
          }

          const address = XLSX.utils.encode_cell({
            r: position.row,
            c: position.col,
          });

          const raw = cell.value;

          if (
            raw.startsWith("=") &&
            cell.style?.numberFormat !== "text"
          ) {
            const evaluated = getCellValueInSheet(sourceSheet, key, new Set<string>(), sheets);

            // [স্টেপ ১] এক্সেলে বাংলা/আরবি অঙ্ক ও ; ، চিহ্নযুক্ত ফর্মুলা চলে না — ইংরেজি অঙ্ক/কমায় বদলে লেখা হয়।
            // CONVERT (মুদ্রা) এক্সেলের CONVERT (একক) থেকে আলাদা, তাই শুধু মান লেখা হয়; ভুল ফর্মুলা নয়।
            const excelFormula = normalizeDigitsOutsideQuotes(raw.slice(1));
            const usesAppOnlyFunction = /\bCONVERT\s*\(/i.test(excelFormula);
            const isErrorValue = typeof evaluated === "string" && FORMULA_ERRORS.has(evaluated);
            const errorCodes: Record<string, number> = { "#NULL!": 0, "#DIV/0!": 7, "#VALUE!": 15, "#REF!": 23, "#NAME?": 29, "#NUM!": 36, "#N/A": 42 };
            const cellObject: { t: string; v: string | number | boolean; f?: string; z?: string } = isErrorValue
              ? { t: "e", v: errorCodes[evaluated as string] ?? 15 }
              : {
                t:
                  typeof evaluated === "number"
                    ? "n"
                    : typeof evaluated === "boolean"
                      ? "b"
                      : "s",
                v: evaluated,
              };
            if (!usesAppOnlyFunction) cellObject.f = excelFormula;
            if (/\bTODAY\s*\(/i.test(excelFormula)) {
              cellObject.z = "yyyy-mm-dd";
            } else if (/\bNOW\s*\(/i.test(excelFormula)) {
              cellObject.z = "yyyy-mm-dd hh:mm:ss";
            }
            if (cell.style?.numberFormat === "percentage") {
              const exportDecimals = Math.max(0, Math.min(cell.style.decimals ?? 0, 10));
              cellObject.z = `0${exportDecimals ? "." + "0".repeat(exportDecimals) : ""}%`;
            } else if (cell.style?.numberFormat === "currency") {
              const exportCurrency = findCurrency(cell.style.currencyCode || "USD");
              const exportDecimals = Math.max(0, Math.min(cell.style.decimals ?? 2, 10));
              cellObject.z = `"${exportCurrency.symbol}"#,##0${exportDecimals ? "." + "0".repeat(exportDecimals) : ""}`;
            }
            worksheet[address] = cellObject;
          } else {
            const value =
              cell.style?.numberFormat === "text"
                ? raw
                : (parseDateTextToSerial(raw.trim()) ?? strictNumber(raw) ?? raw);

            const exportedCell: { t: string; v: string | number | boolean; z?: string } =
              typeof value === "number"
                ? { t: "n", v: value }
                : { t: "s", v: value };
            if (typeof value === "number" && parseDateTextToSerial(raw.trim()) !== null) {
              exportedCell.z = "yyyy-mm-dd";
            }
            if (cell.style?.numberFormat === "percentage") {
              const exportDecimals = Math.max(0, Math.min(cell.style.decimals ?? 0, 10));
              exportedCell.z = `0${exportDecimals ? "." + "0".repeat(exportDecimals) : ""}%`;
            } else if (cell.style?.numberFormat === "currency") {
              const exportCurrency = findCurrency(cell.style.currencyCode || "USD");
              const exportDecimals = Math.max(0, Math.min(cell.style.decimals ?? 2, 10));
              exportedCell.z = `"${exportCurrency.symbol}"#,##0${exportDecimals ? "." + "0".repeat(exportDecimals) : ""}`;
            }
            worksheet[address] = exportedCell;
          }

          lastRow = Math.max(lastRow, position.row);
          lastCol = Math.max(lastCol, position.col);
        }

        worksheet["!ref"] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: lastRow, c: lastCol },
        });

        const originalName = sourceSheet.name || "Sheet";

        const baseName =
          originalName
            .replace(/[\\/?*[\]:]/g, "_")
            .replace(/^'+|'+$/g, "")
            .trim()
            .slice(0, 31) || "Sheet";

        let sheetName = baseName;
        let suffixNumber = 2;

        while (usedSheetNames.has(sheetName.toLowerCase())) {
          const suffix = ` (${suffixNumber++})`;
          sheetName = baseName.slice(0, 31 - suffix.length) + suffix;
        }

        usedSheetNames.add(sheetName.toLowerCase());

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          sheetName
        );
      }

      const data = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      }) as ArrayBuffer;

      const result = await saveDeviceFile({
        suggestedName:
          `${workbookName.trim() || "workbook"}.xlsx`,
        blob: new Blob([data], {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        types: [
          {
            description: "Excel Workbook",
            accept: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
            },
          },
        ],
      });

      if (result.status === "cancelled") {
        showToast("XLSX export বাতিল করা হয়েছে।");
        return;
      }

      if (result.status === "saved") {
        showToast(`XLSX ফাইল সেভ হয়েছে: ${result.fileName}`);
      } else {
        showToast(
          "XLSX ডাউনলোড শুরু হয়েছে। Downloads তালিকা পরীক্ষা করুন।"
        );
      }
    } catch (error) {
      console.error("ALIMXL XLSX export failed:", error);

      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);

      showToast(`XLSX export হয়নি।\n\n${message}`);
    }
  };


  const handleExportJsonBackup = async (): Promise<void> => {
    console.info("ALIMXL JSON backup: handler started");
    try {
      const snapshot = buildWorkbookSnapshot();

      const backup = {
        ...snapshot,
        updatedAt: new Date().toISOString(),
      };

      const content = JSON.stringify(backup, null, 2);

      const blob = new Blob([content], {
        type: "application/json;charset=utf-8",
      });

      const result = await saveDeviceFile({
        suggestedName:
          `${workbookName.trim() || "workbook"}.awm-workbook.json`,
        blob,
        types: [
          {
            description: "ALIMXL Workbook Backup",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
      });

      if (result.status === "cancelled") {
        showToast("ব্যাকআপ সেভ বাতিল করা হয়েছে।");
        return;
      }

      if (result.status === "saved") {
        showToast(`ব্যাকআপ সেভ হয়েছে: ${result.fileName}`);
        return;
      }

      showToast(
        "ব্যাকআপ ডাউনলোড শুরু হয়েছে। ব্রাউজারের Downloads তালিকা পরীক্ষা করুন।"
      );
    } catch (error) {
      console.error("ALIMXL JSON backup export failed:", error);

      const details =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);

      showToast(`JSON backup সেভ ব্যর্থ হয়েছে।\n\n${details}`);
    }
  };


  const handleOpenRemoteFile = useCallback(() => {
    requestPrompt(
      "Open Remote File",
      "Enter the URL of the remote file to open:",
      (url) => {
        if (!url) {
          return;
        }

        const trimmedUrl = url.trim();

        if (!/^https?:\/\//i.test(trimmedUrl)) {
          showToast("শুধু http বা https URL ব্যবহার করা যাবে।");
          return;
        }

        void (async () => {
          try {
            const response = await fetch(trimmedUrl);

            if (!response.ok) {
              throw new Error(
                `Remote file request failed with status ${response.status}`
              );
            }

            const text = await response.text();

            const isCsv =
              trimmedUrl.toLowerCase().endsWith(".csv") ||
              response.headers
                .get("content-type")
                ?.toLowerCase()
                .includes("text/csv");

            if (isCsv) {
              importCsvText(text);
              showToast("Remote CSV file opened.");
              return;
            }

            try {
              const parsed = JSON.parse(text) as WorkbookSnapshot;

              const sheets = parsed.sheets?.length
                ? parsed.sheets
                : [createSheet("Sheet 1")];

              replaceWorkbookSheets(sheets);
              setActiveSheetIndex(0);
              setWorkbookName(parsed.name || "Remote Workbook");
              setWorkbookId(parsed.id || null);

              showToast("Remote workbook opened.");
            } catch {
              importCsvText(text);
              showToast("Remote CSV file opened.");
            }
          } catch (error) {
            console.error("ALIMXL remote open failed:", error);

            const message =
              error instanceof Error
                ? `${error.name}: ${error.message}`
                : String(error);

            showToast(`Remote file খোলা যায়নি।\n\n${message}`);
          }
        })();
      }
    );
  }, [importCsvText, showToast, replaceWorkbookSheets, requestPrompt]);



  const handleSaveRemoteFile = useCallback(() => {
    requestPrompt(
      "Save to Remote",
      "Enter the URL to save this workbook to:",
      (url) => {
        if (!url) {
          return;
        }

        const trimmedUrl = url.trim();

        if (!/^https?:\/\//i.test(trimmedUrl)) {
          showToast("শুধু http বা https URL ব্যবহার করা যাবে।");
          return;
        }

        void (async () => {
          try {
            const snapshot = buildWorkbookSnapshot();

            const response = await fetch(trimmedUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(snapshot),
            });

            if (!response.ok) {
              throw new Error(
                `Remote save failed with status ${response.status}`
              );
            }

            showToast("Workbook saved to the remote location.");
          } catch (error) {
            console.error("ALIMXL remote save failed:", error);

            const message =
              error instanceof Error
                ? `${error.name}: ${error.message}`
                : String(error);

            showToast(`Remote save হয়নি।\n\n${message}`);
          }
        })();
      }
    );
  }, [buildWorkbookSnapshot, showToast, requestPrompt]);


  const handleSaveAsTemplate = useCallback((): void => {
    requestPrompt(
      "Save as Template",
      "Template name:",
      (name) => {
        if (!name) {
          showToast("Template save বাতিল করা হয়েছে।");
          return;
        }

        const trimmedName = name.trim();

        if (!trimmedName) {
          showToast("Template name দিন।");
          return;
        }

        const duplicate = templates.some(
          (template) =>
            template.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (duplicate) {
          showToast("এই নামে template আগেই আছে।");
          return;
        }

        try {
          const snapshot = buildWorkbookSnapshot();

          const entry: WorkbookTemplate = {
            id: `tpl-${Date.now()}`,
            name: trimmedName,
            createdAt: new Date().toISOString(),
            snapshot,
          };

          const next = [entry, ...templates];

          saveTemplatesToStorage(next);

          setTemplates(next);

          showToast(`Template "${trimmedName}" saved.`);
        } catch (error) {
          console.error("ALIMXL template save failed:", error);

          const message =
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error);

          showToast(`Template save হয়নি।\n\n${message}`);
        }
      },
      workbookName || "Untitled Template"
    );
  }, [
    workbookName,
    templates,
    buildWorkbookSnapshot,
    showToast,
    requestPrompt,
  ]);


  const openLoadDialog = () => {
    if (localSaveInProgressRef.current) {
      showToast("সেভ সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন।");
      return;
    }

    setOpenToolbarMenu(null);
    setActiveMenuIndex(null);
    setFocusedMenuItemIndex(null);
    setShowLoadDialog(true);
  };

  const loadWorkbookById = (id: string) => {
    if (localSaveInProgressRef.current) {
      showToast("সেভ সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন।");
      return;
    }

    requestConfirm(
      "Open Workbook",
      "সেভ করা ওয়ার্কবুক খুলবেন? বর্তমান কাজ সেভ না করলে হারিয়ে যাবে।",
      () => {
        void (async () => {
          try {
            const doc = await getLocalWorkbook<WorkbookSnapshot>(id);

            if (!doc) {
              throw new Error("ওয়ার্কবুকটি পাওয়া যায়নি।");
            }

            setEditingKey(null);
            setEditValue("");
            setClipboard(null);
            setFormatPainter(null);

            setWorkbookId(doc.id);
            setWorkbookName(doc.name);
            setPageSize(doc.pageSize);
            setOrientation(doc.orientation);

            setActiveSheetIndex(
              Math.min(
                Math.max(doc.activeSheetIndex, 0),
                doc.sheets.length - 1
              )
            );

            replaceWorkbookSheets(doc.sheets);

            setActiveCell("A1");
            setSelection({
              r1: 0,
              c1: 0,
              r2: 0,
              c2: 0,
            });

            setSaveState("idle");
            setShowHomeScreen(false);
            setShowLoadDialog(false);

            void refreshRecentFromDevice();

            showToast(`ওয়ার্কবুক খোলা হয়েছে: ${doc.name}`);
          } catch (error) {
            console.error("ALIMXL local load failed:", error);

            const message =
              error instanceof Error
                ? `${error.name}: ${error.message}`
                : String(error);

            showToast(`ওয়ার্কবুক খোলা যায়নি।\n\n${message}`);
          }
        })();
      }
    );
  };



  const handleExportPdf = () => {
    showToast("Preparing PDF export.");
    window.setTimeout(() => window.print(), 80);
  };

  const findMatches = useCallback(() => {
    if (!findText) return [];
    const needle = matchCase ? findText : findText.toLowerCase();
    return Object.entries(sheet.cells)
      .filter(([, data]) => {
        const hay = matchCase ? data.value : data.value.toLowerCase();
        return hay.includes(needle);
      })
      .map(([key]) => key)
      .sort((a, b) => {
        const pa = parseKey(a)!;
        const pb = parseKey(b)!;
        return pa.row - pb.row || pa.col - pb.col;
      });
  }, [findText, matchCase, sheet.cells]);

  const findNext = () => {
    const matches = findMatches();
    if (!matches.length) {
      showToast("No matches found.");
      return;
    }
    const currentIndex = matches.indexOf(activeCell);
    const next = matches[(currentIndex + 1) % matches.length];
    const pos = parseKey(next)!;
    setActiveCell(next);
    setSelection({ r1: pos.row, c1: pos.col, r2: pos.row, c2: pos.col });
    showToast(`Found ${next}.`);
  };

  const replaceCurrent = () => {
    if (!findText) return;
    const raw = getRawValue(activeCell);
    const flags = matchCase ? "g" : "gi";
    setCellValue(activeCell, raw.replace(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags), () => replaceText));
    showToast("Current match replaced.");
  };

  const replaceAll = () => {
    if (!findText) return;
    const pattern = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = matchCase ? "g" : "gi";
    updateSheet((s) => {
      const next = { ...s.cells };
      Object.keys(next).forEach((k) => {
        const current = next[k].value;
        if (typeof current !== "string") return;
        const replaced = current.replace(new RegExp(pattern, flags), () => replaceText);
        if (replaced !== current) next[k] = { ...next[k], value: replaced };
      });
      return { cells: next };
    });
    showToast("All matches replaced.");
  };

  const getChartData = (
    range: string
  ): { label: string; value: number }[] => {
    const normalized = range.trim();

    if (!normalized) return [];

    const { sheetName, reference } = splitSheetReference(normalized);

    const targetSheet = sheetName
      ? sheets.find(
        (item) =>
          item.name.trim().toLowerCase() ===
          sheetName.trim().toLowerCase()
      )
      : sheet;

    if (!targetSheet) return [];

    const normalizedRange = normalizeRange(reference);

    if (!normalizedRange) return [];

    if (normalizedRange.r1 < 0 || normalizedRange.c1 < 0 ||
      normalizedRange.r2 >= targetSheet.gridRows || normalizedRange.c2 >= targetSheet.gridCols) return [];
    return collectChartRows(
      normalizedRange,
      (row, col) => getCellValue(cellKey(row, col), new Set(), targetSheet, sheets),
      (row, col) => {
        const key = cellKey(row, col);
        return formatDisplayValue(getCellValue(key, new Set(), targetSheet, sheets), targetSheet.cells[key]?.style);
      }
    );
  };

  const openChartWizard = () => {
    const range = selectedRangeText.trim();

    if (!range) {
      showToast("আগে ডেটা রেঞ্জ সিলেক্ট করুন।");
      return;
    }

    setChartTitle("Chart");
    setChartRange(range);
    setWizardStep(1);
    setWizardType("column");
    setWizardSubtitle("");
    setWizardXAxisTitle("");
    setWizardYAxisTitle("");
    setWizardShowLegend(true);
    setWizardLegendPosition("right");
    setWizard3D(false);
    setWizardRealistic(false);
    setWizardShape("cylinder");
    setWizardSeries([
      {
        id: `s_${++chartSeriesIdRef.current}`,
        name: "Series 1",
        range,
      },
    ]);
    setShowChartWizard(true);
  };

  const finishChartWizard = () => {
    const range = chartRange.trim();

    if (!range) {
      showToast("Chart data range দিন।");
      return;
    }

    try {
      updateSheet((s) => ({
        charts: [
          ...s.charts,
          {
            id: `chart_${Date.now()}`,
            title: chartTitle,
            type: wizardType,
            range,
            subtitle: wizardSubtitle,
            xAxisTitle: wizardXAxisTitle,
            yAxisTitle: wizardYAxisTitle,
            showLegend: wizardShowLegend,
            legendPosition: wizardLegendPosition,
            is3D: wizard3D,
            realistic: wizardRealistic,
            shape: wizardShape,
            series: wizardSeries,
          },
        ],
      }));

      setShowChartWizard(false);
      showToast("Chart added.");
    } catch (error) {
      console.error("ALIMXL chart creation failed:", error);

      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);

      window.alert(`Chart তৈরি হয়নি।\n\n${message}`);
      showToast("Chart তৈরি হয়নি। দেখানো error-টি পরীক্ষা করুন।");
    }
  };

  const pivotHeaderOptions = useMemo(() => {
    const nr = normalizeRange(pivotRange);
    if (!nr) return [] as string[];
    const headers: string[] = [];
    for (let c = nr.c1; c <= nr.c2; c++) {
      // Display helper reads workbook state; no ref is mutated by this render.
      const label = getDisplayValue(cellKey(nr.r1, c));
      if (label) headers.push(label);
    }
    return headers;
  }, [pivotRange, getDisplayValue]);

  const runPivot = () => {
    const nr = normalizeRange(pivotRange);
    if (!nr) {
      showToast("Pivot range is invalid.");
      return;
    }
    const headers: string[] = [];
    for (let c = nr.c1; c <= nr.c2; c++) headers.push(String(getDisplayValue(cellKey(nr.r1, c))));
    const rowIndex = headers.indexOf(pivotRowField);
    const colIndex = pivotColumnField ? headers.indexOf(pivotColumnField) : -1;
    const valIndex = headers.indexOf(pivotValueField);
    if (rowIndex < 0 || valIndex < 0 || (pivotColumnField && colIndex < 0)) {
      showToast("Pivot fields must match the header row.");
      return;
    }

    // [হিসাব-সংশোধন] আগে ফাঁকা/টেক্সট ঘরও ০ হয়ে AVERAGE, MIN, COUNT বিগড়ে দিত।
    // এখন: SUM/AVERAGE/MIN/MAX শুধু আসল সংখ্যা নেয়; COUNT অ-ফাঁকা ঘর গোনে; এরর থাকলে ফলাফলও এরর।
    interface PivotBucket {
      numbers: number[];
      nonBlank: number;
      error: string;
    }
    const newBucket = (): PivotBucket => ({ numbers: [], nonBlank: 0, error: "" });
    const map = new Map<string, Map<string, PivotBucket>>();
    const colKeys = new Set<string>();
    const rowTotals = new Map<string, PivotBucket>();
    const colTotals = new Map<string, PivotBucket>();
    const grand = newBucket();

    const addTo = (bucket: PivotBucket, value: EvalResult) => {
      if (value === "") return;
      bucket.nonBlank += 1;
      if (typeof value === "number" && Number.isFinite(value)) bucket.numbers.push(value);
      else if (typeof value === "string" && FORMULA_ERRORS.has(value) && !bucket.error) bucket.error = value;
    };

    for (let r = nr.r1 + 1; r <= nr.r2; r++) {
      const rowKey = getDisplayValue(cellKey(r, nr.c1 + rowIndex)) || "(blank)";
      const colKey = colIndex >= 0 ? (getDisplayValue(cellKey(r, nr.c1 + colIndex)) || "(blank)") : "Total";
      const value = getCellValue(cellKey(r, nr.c1 + valIndex));
      colKeys.add(colKey);
      if (!map.has(rowKey)) map.set(rowKey, new Map());
      const rowMap = map.get(rowKey)!;
      if (!rowMap.has(colKey)) rowMap.set(colKey, newBucket());
      if (!rowTotals.has(rowKey)) rowTotals.set(rowKey, newBucket());
      if (!colTotals.has(colKey)) colTotals.set(colKey, newBucket());
      addTo(rowMap.get(colKey)!, value);
      addTo(rowTotals.get(rowKey)!, value);
      addTo(colTotals.get(colKey)!, value);
      addTo(grand, value);
    }

    const cols = Array.from(colKeys).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    const rowKeysSorted = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    const aggregate = (bucket: PivotBucket | undefined): string => {
      if (!bucket || bucket.nonBlank === 0) return "";
      if (bucket.error) return bucket.error;
      const nums = bucket.numbers;
      if (pivotAggregate === "COUNT") return String(bucket.nonBlank);
      if (nums.length === 0) return "";
      if (pivotAggregate === "AVERAGE") return String(cleanNumber(nums.reduce((a, b) => a + b, 0) / nums.length));
      if (pivotAggregate === "MIN") return String(nums.reduce((lowest: number, v: number) => Math.min(lowest, v), Infinity));
      if (pivotAggregate === "MAX") return String(nums.reduce((highest: number, v: number) => Math.max(highest, v), -Infinity));
      return String(cleanNumber(nums.reduce((a, b) => a + b, 0)));
    };

    // Grand Total কলাম (একাধিক কলাম থাকলেই অর্থবহ) ও Grand Total সারি যোগ হলো — আগে ছিল না
    const showTotalColumn = colIndex >= 0;
    const result = [[pivotRowField, ...cols, ...(showTotalColumn ? ["Grand Total"] : [])]];
    rowKeysSorted.forEach((rk) => {
      result.push([
        rk,
        ...cols.map((ck) => aggregate(map.get(rk)!.get(ck))),
        ...(showTotalColumn ? [aggregate(rowTotals.get(rk))] : []),
      ]);
    });
    result.push([
      "Grand Total",
      ...cols.map((ck) => aggregate(colTotals.get(ck))),
      ...(showTotalColumn ? [aggregate(grand)] : []),
    ]);
    setPivotResult(result);
  };

  const insertPivotToSheet = () => {
    if (!pivotResult.length) return;
    updateSheet((s) => {
      const next = { ...s.cells };
      pivotResult.forEach((row, r) => row.forEach((v, c) => (next[cellKey(activePos.row + r, activePos.col + c)] = { value: v, style: { wrap: true, bold: r === 0 } })));
      return { cells: next };
    });
    setShowPivotDialog(false);
    showToast("Pivot table inserted.");
  };

  const spellIssues = useMemo(() => {
    const issues: { key: string; word: string }[] = [];
    Object.entries(sheet.cells).forEach(([key, data]) => {
      if (!data.value || data.value.startsWith("=")) return;
      const words = data.value.match(/[A-Za-z]{3,}/g) || [];
      words.forEach((w) => {
        const lower = w.toLowerCase();
        if (!COMMON_WORDS.has(lower) && !/^[A-Z][a-z]+$/.test(w) && !/^[A-Z]+$/.test(w)) issues.push({ key, word: w });
      });
    });
    return issues;
  }, [sheet.cells]);

  const resizeColumn = (col: number, startX: number) => {
    const startWidth = sheet.colWidths[col] || DEFAULT_COL_WIDTH;
    const move = (e: MouseEvent) => {
      updateSheet((s) => ({ colWidths: { ...s.colWidths, [col]: Math.max(60, startWidth + e.clientX - startX) } }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const resizeRow = (row: number, startY: number) => {
    const startHeight = sheet.rowHeights[row] || DEFAULT_ROW_HEIGHT;
    const move = (e: MouseEvent) => {
      updateSheet((s) => ({ rowHeights: { ...s.rowHeights, [row]: Math.max(24, startHeight + e.clientY - startY) } }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const addSheet = () => {
    const idSuffix = "new";
    setSheets((prev) => [...prev, createSheet(`Sheet ${prev.length + 1}`, idSuffix)]);
    setActiveSheetIndex(sheets.length);
    showToast("Sheet inserted.");
  };

  const renameSheet = () => {
    const name = window.prompt("Sheet name:", sheet.name)?.trim();
    if (!name || name === sheet.name) return;

    if (/[:\\/?*[\]!']/.test(name) || name.length > 31) {
      showToast("Sheet name cannot contain : \\ / ? * [ ] ! ' and must be at most 31 characters.");
      return;
    }

    if (sheets.some((item, index) => index !== activeSheetIndex && sameSheetName(item.name, name))) {
      showToast("Another sheet already uses this name.");
      return;
    }

    const oldName = sheet.name;

    // শিটের নাম বদলালে অন্য শিটের 'পুরনো নাম'!A1 সূত্রগুলোও নতুন নামে আপডেট হয় (আগে #REF! হয়ে যেত)
    setSheets((prev) => {
      const renamed = prev.map((item, index) => (index === activeSheetIndex ? { ...item, name } : item));
      return rewriteWorkbookFormulas(renamed, () => (ref) =>
        ref.sheet && sameSheetName(ref.sheet, oldName) ? { ...ref, sheet: name } : ref
      );
    });
    showToast("Sheet renamed.");
  };

  const duplicateSheet = () => {
    const copy: WorkbookSheet = JSON.parse(JSON.stringify(sheet));
    copy.id = `sheet_duplicate_${++sheetIdCounter}`;
    copy.name = `${sheet.name} Copy`;
    setSheets((prev) => [...prev, copy]);
    setActiveSheetIndex(sheets.length);
    showToast("Sheet duplicated.");
  };

  const deleteSheet = () => {
    if (sheets.length <= 1) {
      showToast("At least one sheet is required.");
      return;
    }
    if (!window.confirm(`Delete ${sheet.name}?`)) return;
    setSheets((prev) => prev.filter((_, i) => i !== activeSheetIndex));
    setActiveSheetIndex((i) => Math.max(0, i - 1));
    showToast("Sheet deleted.");
  };

  const resetTemplateInputValues = () => {
    if (
      !window.confirm(
        "Reset all editable input values?\n\nFormulas, headings, department names, currency and template structure will remain unchanged."
      )
    ) {
      return;
    }

    setSheets((prevSheets) =>
      prevSheets.map((targetSheet) => {
        const nextCells = { ...targetSheet.cells };

        Object.entries(nextCells).forEach(([cellKey, cellData]) => {
          const background = cellData?.style?.bg;

          // #FFF9DE = editable input cell in the built-in Monthly Budget template.
          if (background === "#FFF9DE") {
            nextCells[cellKey] = {
              ...cellData,
              value: "",
            };
          }
        });

        return {
          ...targetSheet,
          cells: nextCells,
        };
      })
    );

    showToast(
      "Template inputs reset. Formulas and structure are unchanged."
    );
  };


  const clearSelection = () => {
    updateSheet((s) => {
      const next = { ...s.cells };
      selectionCells.forEach((k) => {
        next[k] = { ...(next[k] || { value: "" }), value: "" };
      });
      return { cells: next };
    });
    showToast("Selection cleared.");
  };

  // 🛡️ P0-FIX-2: Select All-এ cap — বড় grid-এ crash আটকাতে
  const selectAllCells = () => {
    const totalCells = sheet.gridRows * sheet.gridCols;
    if (totalCells > MAX_SELECTION_CELLS) {
      const maxRows = Math.max(1, Math.floor(MAX_SELECTION_CELLS / sheet.gridCols));
      setSelection({ r1: 0, c1: 0, r2: maxRows - 1, c2: sheet.gridCols - 1 });
      showToast(`All cells selected (limited to first ${maxRows} rows).`);
    } else {
      setSelection({ r1: 0, c1: 0, r2: sheet.gridRows - 1, c2: sheet.gridCols - 1 });
      showToast("All cells selected.");
    }
    setActiveCell("A1");
  };

  const toggleFreezeRowsAndColumns = () => {
    const shouldFreeze = sheet.frozenRows === 0 && sheet.frozenCols === 0;
    updateSheet({ frozenRows: shouldFreeze ? Math.max(1, activePos.row + 1) : 0, frozenCols: shouldFreeze ? Math.max(1, activePos.col + 1) : 0 });
    showToast(shouldFreeze ? "Rows and columns frozen." : "Freeze removed.");
  };

  const splitVertical = useCallback(() => {
    setSplitAxis("vertical");
    setSplitRatio(0.5);
    showToast("Split vertically.");
  }, [showToast]);

  const splitHorizontal = useCallback(() => {
    setSplitAxis("horizontal");
    setSplitRatio(0.5);
    showToast("Split horizontally.");
  }, [showToast]);

  const unsplitWindow = useCallback(() => {
    setSplitAxis(null);
    setActivePane("a");
    showToast("Split removed.");
  }, [showToast]);

  const equalizeSplit = useCallback(() => {
    setSplitRatio(0.5);
    showToast("Panes equalized.");
  }, [showToast]);

  const toggleSplitWindow = useCallback(() => {
    // টুলবার বাটনের single-click default behavior: split না থাকলে vertical split করবে, থাকলে unsplit করবে
    if (splitAxis) unsplitWindow();
    else splitVertical();
  }, [splitAxis, splitVertical, unsplitWindow]);

  const insertRowsAtSelection = () => {
    // সিলেকশনের সবচেয়ে উপরের রো-এর ঠিক উপরে নতুন রো বসবে
    insertRowAtIndex(Math.min(selection.r1, selection.r2));
  };

  const insertColumnsAtSelection = () => {
    // সিলেকশনের সবচেয়ে বামের কলামের ঠিক বামে নতুন কলাম বসবে
    insertColumnAtIndex(Math.min(selection.c1, selection.c2));
  };

  const applyNumberFormat = (format: NumberFormat) => {
    applyStyleToSelection({ numberFormat: format });
    showToast(`${format.charAt(0).toUpperCase() + format.slice(1)} format applied.`);
  };

  const applyCurrencyFormat = (currencyCode: string) => {
    applyStyleToSelection({ numberFormat: "currency", currencyCode });
    const c = findCurrency(currencyCode);
    showToast(`${c.name} (${c.code}) currency format applied.`);
    setCurrencyMenuOpen(false);
    setCurrencySearch("");
  };

  const adjustDecimals = (delta: number) => {
    const current = activeCellStyle.decimals ?? 2;
    applyStyleToSelection({ decimals: Math.max(0, Math.min(10, current + delta)), numberFormat: activeCellStyle.numberFormat || "number" });
    showToast(delta > 0 ? "Decimal places increased." : "Decimal places decreased.");
  };

  const adjustIndent = (delta: number) => {
    const current = activeCellStyle.indent ?? 0;
    applyStyleToSelection({ indent: Math.max(0, Math.min(12, current + delta)) });
    showToast(delta > 0 ? "Indent increased." : "Indent decreased.");
  };

  const collectPredictivePointsFromSelection = useCallback((): PredictiveDataPoint[] => {
    const r1 = Math.min(selection.r1, selection.r2);
    const r2 = Math.max(selection.r1, selection.r2);
    const c1 = Math.min(selection.c1, selection.c2);
    const c2 = Math.max(selection.c1, selection.c2);

    const points: PredictiveDataPoint[] = [];
    let index = 1;

    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const key = cellKey(r, c);
        const raw = getCellValue(key);

        let numeric: number | null = null;

        if (typeof raw === "number" && Number.isFinite(raw)) {
          numeric = raw;
        } else if (typeof raw === "string" && raw.trim() && !raw.startsWith("#")) {
          const parsed = strictNumber(raw);
          if (parsed !== null && Number.isFinite(parsed)) numeric = parsed;
        }

        if (numeric !== null) {
          points.push({
            key,
            index,
            value: numeric,
          });
          index++;
        }
      }
    }

    return points;
  }, [selection, getCellValue]);

  const runPredictiveAnalytics = useCallback(() => {
    const points = collectPredictivePointsFromSelection();

    if (points.length < 2) {
      showToast("Select at least 2 numeric cells for Predictive Analytics.");
      return;
    }

    const result = calculatePredictiveAnalytics(
      points,
      selectedRangeText,
      predictivePeriods
    );

    setPredictiveResult(result);
    setShowPredictiveAnalytics(true);

    showToast("Predictive Analytics generated.");
  }, [
    collectPredictivePointsFromSelection,
    selectedRangeText,
    predictivePeriods,
    showToast,
    setShowPredictiveAnalytics,
  ]);

  const refreshPredictiveAnalytics = useCallback(() => {
    const points = collectPredictivePointsFromSelection();

    if (points.length < 2) {
      showToast("Select at least 2 numeric cells for Predictive Analytics.");
      return;
    }

    setPredictiveResult(
      calculatePredictiveAnalytics(points, selectedRangeText, predictivePeriods)
    );

    showToast("Predictive Analytics refreshed.");
  }, [
    collectPredictivePointsFromSelection,
    selectedRangeText,
    predictivePeriods,
    showToast,
  ]);

  const insertPredictiveForecastToSheet = useCallback(() => {
    if (!predictiveResult) {
      showToast("No forecast result to insert.");
      return;
    }
    const r2 = Math.max(selection.r1, selection.r2);
    const c1 = Math.min(selection.c1, selection.c2);

    const startRow = Math.min(r2 + 2, MAX_ROWS - 1);
    const labelCol = c1;
    const valueCol = Math.min(c1 + 1, MAX_COLS - 1);
    const lowCol = Math.min(c1 + 2, MAX_COLS - 1);
    const highCol = Math.min(c1 + 3, MAX_COLS - 1);

    const neededRows = startRow + predictiveResult.forecast.length + 1;
    const neededCols = Math.max(labelCol, valueCol, lowCol, highCol) + 1;

    updateSheet((s) => {
      const next = { ...s.cells };

      next[cellKey(startRow, labelCol)] = {
        value: "Forecast Period",
        style: { bold: true, bg: "#E5F1FB", color: "#106EBE", wrap: true },
      };
      next[cellKey(startRow, valueCol)] = {
        value: "Predicted",
        style: { bold: true, bg: "#E5F1FB", color: "#106EBE", wrap: true },
      };
      next[cellKey(startRow, lowCol)] = {
        value: "Low",
        style: { bold: true, bg: "#E5F1FB", color: "#106EBE", wrap: true },
      };
      next[cellKey(startRow, highCol)] = {
        value: "High",
        style: { bold: true, bg: "#E5F1FB", color: "#106EBE", wrap: true },
      };

      predictiveResult.forecast.forEach((item, i) => {
        const row = startRow + i + 1;

        next[cellKey(row, labelCol)] = {
          value: `Period ${item.period}`,
          style: { wrap: true },
        };
        next[cellKey(row, valueCol)] = {
          value: String(item.value),
          style: { wrap: true, numberFormat: "number", decimals: 2 },
        };
        next[cellKey(row, lowCol)] = {
          value: String(item.low),
          style: { wrap: true, numberFormat: "number", decimals: 2 },
        };
        next[cellKey(row, highCol)] = {
          value: String(item.high),
          style: { wrap: true, numberFormat: "number", decimals: 2 },
        };
      });

      return {
        cells: next,
        gridRows: Math.max(s.gridRows, Math.min(neededRows, MAX_ROWS)),
        gridCols: Math.max(s.gridCols, Math.min(neededCols, MAX_COLS)),
      };
    });

    showToast("Forecast inserted into sheet.");
  }, [predictiveResult, selection, updateSheet, showToast]);

  const handleRefreshPage = useCallback(() => {
    const nextSnapshot = safeRefreshWorkbookState({
      workbookName,
      workbookId,
      activeSheetIndex,
      activeCell,
      selection,
      pageSize,
      orientation,
      rightSidebarOpen,
      rightSidebarUndocked,
      activeSidebarPanel,
      showGridLines,
      printPreview,
      splitAxis,
      splitRatio,
      activePane,
      showDrawFunctions,
      formulaExpanded,
      showStatusBar,
      showPredictiveAnalytics,
      predictivePeriods,
      showFindReplace,
      showFunctionWizard,
      showChartDialog,
      showPivotDialog,
      showSpellCheck,
      showValidity,
      showDataSource,
      showExportDialog,
      showConditionalFormatting,
      showNamedRanges,
      showConsolidate,
      showGallery,
      showGoalSeek,
      showTemplatesDialog,
    });

    setWorkbookName(nextSnapshot.workbookName);
    setWorkbookId(nextSnapshot.workbookId);
    setActiveSheetIndex(nextSnapshot.activeSheetIndex);
    setActiveCell(nextSnapshot.activeCell);
    setSelection(nextSnapshot.selection);
    setPageSize(nextSnapshot.pageSize);
    setOrientation(nextSnapshot.orientation);
    setRightSidebarOpen(nextSnapshot.rightSidebarOpen);
    setRightSidebarUndocked(nextSnapshot.rightSidebarUndocked);
    setActiveSidebarPanel(nextSnapshot.activeSidebarPanel);
    setShowGridLines(nextSnapshot.showGridLines);
    setPrintPreview(nextSnapshot.printPreview);
    setSplitAxis(nextSnapshot.splitAxis);
    setSplitRatio(nextSnapshot.splitRatio);
    setActivePane(nextSnapshot.activePane);
    setShowDrawFunctions(nextSnapshot.showDrawFunctions);
    setFormulaExpanded(nextSnapshot.formulaExpanded);
    setShowStatusBar(nextSnapshot.showStatusBar);
    setShowPredictiveAnalytics(nextSnapshot.showPredictiveAnalytics);
    setPredictivePeriods(nextSnapshot.predictivePeriods);
    setShowFindReplace(nextSnapshot.showFindReplace);
    setShowFunctionWizard(nextSnapshot.showFunctionWizard);
    setShowChartDialog(nextSnapshot.showChartDialog);
    setShowPivotDialog(nextSnapshot.showPivotDialog);
    setShowSpellCheck(nextSnapshot.showSpellCheck);
    setShowValidity(nextSnapshot.showValidity);
    setShowDataSource(nextSnapshot.showDataSource);
    setShowExportDialog(nextSnapshot.showExportDialog);
    setShowConditionalFormatting(nextSnapshot.showConditionalFormatting);
    setShowNamedRanges(nextSnapshot.showNamedRanges);
    setShowConsolidate(nextSnapshot.showConsolidate);
    setShowGallery(nextSnapshot.showGallery);
    setShowGoalSeek(nextSnapshot.showGoalSeek);
    setShowTemplatesDialog(nextSnapshot.showTemplatesDialog);

    setRefreshTick(createRefreshTick());
    showToast("Page refreshed.");
  }, [
    workbookName,
    workbookId,
    activeSheetIndex,
    activeCell,
    selection,
    pageSize,
    orientation,
    rightSidebarOpen,
    rightSidebarUndocked,
    activeSidebarPanel,
    showGridLines,
    printPreview,
    splitAxis,
    splitRatio,
    activePane,
    showDrawFunctions,
    formulaExpanded,
    showStatusBar,
    showPredictiveAnalytics,
    predictivePeriods,
    showFindReplace,
    showFunctionWizard,
    showChartDialog,
    showPivotDialog,
    showSpellCheck,
    showValidity,
    showDataSource,
    showExportDialog,
    showConditionalFormatting,
    showNamedRanges,
    showConsolidate,
    showGallery,
    showGoalSeek,
    showTemplatesDialog,
    showToast,
    setRightSidebarOpen,
    setRightSidebarUndocked,
    setActiveSidebarPanel,
    setShowPredictiveAnalytics,
    setPredictivePeriods,
    setShowConditionalFormatting,
    setShowNamedRanges,
  ]);

  const toggleTextDirection = () => {
    const currentDirection = activeCellStyle.textDirection ?? "rtl";

    const nextDirection: TextDirection =
      currentDirection === "rtl" ? "ltr" : "rtl";

    applyStyleToSelection({
      textDirection: nextDirection,
    });


    showToast(`Text direction set to ${nextDirection.toUpperCase()}.`);
  };

  const applySidebarStylePreset = (preset: Partial<CellStyle>, label: string) => {
    applyStyleToSelection(preset);
    showToast(`${label} style applied.`);
  };

  const handleToolbarAction = (label: string, callback: () => void) => {
    setToolbarPulse((v) => v + 1);
    callback();
  };

  const dispatchMenuAction = (action: string) => {
    switch (action) {
      case "FILE_NEW":
        handleNewFile();
        break;
      case "FILE_OPEN":
        fileInputRef.current?.click();
        break;
      case "FILE_SAVE":
      case "FILE_SAVE_REMOTE":
      case "FILE_SAVE_ALL":
        handleSaveToApp();
        break;
      case "FILE_EXPORT":
      case "FILE_SAVE_AS":
        handleExportAlimxl();
        break;
      case "RESET_TEMPLATE_INPUTS":
        resetTemplateInputValues();
        break;
      case "FILE_RELOAD":
        handleRefreshPage();
        break;
      case "FILE_SAVE_COPY":
        handleExportJsonBackup();
        break;
      case "FILE_SAVE_AS_TEMPLATE":
        handleSaveAsTemplate();
        break;
      case "FILE_EXPORT_PDF":
        handleExportPdf();
        break;
      case "FILE_PRINT":
        setShowPageSetup(false);
        setShowPrintDialog(true);
        break;

      case "FILE_PRINT_PREVIEW":
        setPrintPreview(true);
        break;
      case "FILE_PAGE_STYLE":
      case "FORMAT_PAGE_STYLE":
        setShowPageSetup(true);
        break;


      case "FILE_CLOSE":
        showToast("Workbook close requested.");
        break;
      case "FILE_TEMPLATES":
        setShowTemplatesDialog("apply");
        break;
      case "EDIT_UNDO":
        undo();
        break;
      case "EDIT_REDO":
        redo();
        break;
      case "EDIT_REPEAT":
        showToast("Repeat last action is not implemented yet.");
        break;
      case "EDIT_CUT":
        doCopy("cut");
        break;
      case "EDIT_COPY":
        doCopy("copy");
        break;
      case "EDIT_PASTE":
      case "EDIT_PASTE_SPECIAL":
        doPaste();
        break;
      case "EDIT_SELECT_ALL":
        selectAllCells();
        break;
      case "EDIT_FIND":
      case "EDIT_FIND_REPLACE":
        setShowFindReplace(true);
        break;
      case "INSERT_NAMED_RANGE":
      case "SHEET_NAMED_RANGES":
        setShowNamedRanges(true);
        break;
      case "VIEW_GRID_LINES":
        setShowGridLines((v) => !v);
        showToast("Grid lines toggled.");
        break;
      case "VIEW_SIDEBAR":
        setRightSidebarOpen((v) => !v);
        showToast("Sidebar toggled.");
        break;
      case "VIEW_ZOOM":
        resetZoom();
        showToast("Zoom reset to 100%.");
        break;
      case "VIEW_STATUS_BAR":
        setShowStatusBar((v) => !v);
        showToast("Status bar toggled.");
        break;
      case "FORMAT_THEME":
      case "FORMAT_SPREADSHEET_THEME":
        toggleDarkMode();
        break;
      case "VIEW_GALLERY":
        setActiveSidebarPanel("gallery");
        setRightSidebarOpen(true);
        break;
      case "VIEW_STYLES":
        setActiveSidebarPanel("styles");
        setRightSidebarOpen(true);
        break;
      case "VIEW_NAVIGATOR":
        setActiveSidebarPanel("navigator");
        setRightSidebarOpen(true);
        break;
      case "VIEW_SHOW_FORMULAS":
      case "VIEW_FUNCTION_LIST":
        setActiveSidebarPanel("functions");
        setRightSidebarOpen(true);
        setShowFunctionWizard(true);
        break;
      case "VIEW_DATA_SOURCES":
        setShowDataSource(true);
        break;
      case "VIEW_SPLIT_WINDOW":
        toggleSplitWindow();
        break;
      case "VIEW_SPLIT_VERTICAL":
        splitVertical();
        break;
      case "VIEW_SPLIT_HORIZONTAL":
        splitHorizontal();
        break;
      case "VIEW_UNSPLIT":
        unsplitWindow();
        break;
      case "VIEW_FREEZE_ROWS_COLS":
      case "VIEW_FREEZE_CELLS":
        toggleFreezeRowsAndColumns();
        break;
      case "INSERT_IMAGE":
        imageInputRef.current?.click();
        break;
      case "INSERT_CHART":
        openChartWizard();
        break;
      case "INSERT_PIVOT_TABLE":
        setShowPivotDialog(true);
        break;
      case "INSERT_FUNCTION":
        setShowFunctionWizard(true);
        break;
      case "INSERT_COMMENT":
        insertComment();
        break;
      case "INSERT_HYPERLINK":
        insertHyperlink();
        break;
      case "INSERT_SPECIAL_CHAR":
        setShowSpecialCharsDialog(true);
        break;
      case "INSERT_DATE":
        insertDate();
        break;
      case "INSERT_TIME":
        insertTime();
        break;
      case "FORMAT_CLEAR_DIRECT":
        applyStyleToSelection({ bold: false, italic: false, underline: false, color: "#000000", bg: "#FFFFFF", align: "left", verticalAlign: "top", numberFormat: "general", indent: 0 });
        showToast("Formatting cleared.");
        break;
      case "FORMAT_CLONE":
        grabFormat();
        break;
      case "DATA_SORT":
      case "DATA_SORT_ASC":
        sortByActiveColumn("asc");
        break;
      case "DATA_SORT_DESC":
        sortByActiveColumn("desc");
        break;
      case "DATA_AUTOFILTER":
        toggleAutoFilter();
        break;
      case "DATA_PIVOT_TABLE":
        setShowPivotDialog(true);
        break;
      case "DATA_PIVOT_CHART":
        setShowPivotChart(true);
        break;
      case "DATA_FORECAST_SHEET":
        setShowForecastSheet(true);
        break;
      case "DATA_ANALYZE_DATA":
        setShowAnalyzeData(true);
        break;
      case "DATA_WHAT_IF_TABLE":
        setShowWhatIfTable(true);
        break;
      case "DATA_SCENARIO_MANAGER":
        setShowScenarioManager(true);
        break;
      case "DATA_ANALYSIS_TOOLPAK":
        setShowDataAnalysis(true);
        break;
      case "DATA_SUBTOTALS":
        setShowSubtotalDialog(true);
        break;
      case "DATA_VALIDITY":
        setShowValidity(true);
        break;
      case "DATA_CONSOLIDATE":
        setShowConsolidate(true);
        break;
      case "DATA_GROUP_OUTLINE":
        groupSelection();
        break; case "DATA_GROUP_COLUMNS":
        groupColumnsSelection();
        break;
      case "DATA_UNGROUP_COLUMNS":
        ungroupColumnsSelection();
        break;
      case "DATA_COLLAPSE_ALL_GROUPS":
        collapseAllGroups();
        break;
      case "DATA_EXPAND_ALL_GROUPS":
        expandAllGroups();
        break;
      case "TOOLS_SPELLING":
      case "TOOLS_AUTO_SPELL":
        setShowSpellCheck(true);
        break;
      case "TOOLS_GOAL_SEEK":
        setShowGoalSeek(true);
        break;
      case "SHEET_INSERT_ROWS":
        insertRowsAtSelection();
        break;
      case "SHEET_INSERT_COLUMNS":
        insertColumnsAtSelection();
        break;
      case "SHEET_DELETE_ROWS":
        removeRow();
        break;
      case "SHEET_DELETE_COLUMNS":
        removeCol();
        break;
      case "SHEET_INSERT_SHEET":
      case "SHEET_INSERT_SHEET_END":
        addSheet();
        break;
      case "SHEET_RENAME":
        renameSheet();
        break;
      case "SHEET_DUPLICATE":
        duplicateSheet();
        break;
      case "SHEET_CLEAR_CELLS":
        clearSelection();
        break;
      default:
        showToast(`Action Triggered: ${action}`);
        break;
    }
    closeMenu();
  };

  useEffect(() => {
    // Restore persisted browser-only lists after mount; no render-derived state is fed back.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshRecentFromDevice();
    setTemplates(loadTemplatesFromStorage());
    setSavedMacros(loadMacrosFromStorage());
  }, [refreshRecentFromDevice]);

  // Used only by the listener installed in the Effect below. Menu/UI events
  // continue calling dispatchMenuAction directly.
  const dispatchShortcutAction = useEffectEvent((action: string) => {
    dispatchMenuAction(action);
  });

  // refreshTick is intentionally a render trigger for the explicit Refresh action.
  // Do not clone predictiveResult in an effect: the clone does not recalculate analytics.
  useEffect(() => {

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Home screen খোলা থাকলে editor-এর global shortcuts চালাবেন না।
      if (showHomeScreen) return;

      // Input, textarea, select বা editable field-এ টাইপ করার সময়
      // editor-এর global shortcuts চালাবেন না।
      const targetEl = e.target as HTMLElement | null;

      const isTypingInField =
        targetEl !== null &&
        (targetEl.tagName === "INPUT" ||
          targetEl.tagName === "TEXTAREA" ||
          targetEl.tagName === "SELECT" ||
          targetEl.isContentEditable);

      if (isTypingInField) return;

      if (e.key === "Alt") {
        e.preventDefault();

        setActiveMenuIndex(0);
        setFocusedMenuItemIndex(null);
      }

      if (e.key === "Escape") {
        closeMenu();
      }

      if (activeMenuIndex === null) {
        const keys: string[] = [];

        if (e.ctrlKey || e.metaKey) keys.push("Ctrl");
        if (e.shiftKey) keys.push("Shift");
        if (e.altKey) keys.push("Alt");

        keys.push(
          e.key.length === 1 ? e.key.toUpperCase() : e.key
        );

        const shortcutString = keys.join("+");

        EXCEL_MENU_DATA.forEach((category) => {
          category.items.forEach((item) => {
            if (
              item.shortcut &&
              item.shortcut.toUpperCase() ===
              shortcutString.toUpperCase()
            ) {
              e.preventDefault();
              dispatchShortcutAction(item.action);
            }
          });
        });
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as globalThis.Node)) {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    activeMenuIndex,
    showHomeScreen,
  ]);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, categoryIndex: number) => {
    const itemsCount = EXCEL_MENU_DATA[categoryIndex].items.length;

    switch (e.key) {
      case "ArrowRight":
        setActiveMenuIndex((categoryIndex + 1) % EXCEL_MENU_DATA.length);
        setFocusedMenuItemIndex(0);
        break;
      case "ArrowLeft":
        setActiveMenuIndex((categoryIndex - 1 + EXCEL_MENU_DATA.length) % EXCEL_MENU_DATA.length);
        setFocusedMenuItemIndex(0);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedMenuItemIndex(prev => (prev === null || prev === itemsCount - 1) ? 0 : prev + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedMenuItemIndex(prev => (prev === null || prev === 0) ? itemsCount - 1 : prev - 1);
        break;
      case "Enter":
      case " ":
        if (focusedMenuItemIndex !== null) {
          e.preventDefault();
          dispatchMenuAction(EXCEL_MENU_DATA[categoryIndex].items[focusedMenuItemIndex].action);
        } else {
          setActiveMenuIndex(activeMenuIndex === categoryIndex ? null : categoryIndex);
        }
        break;
      case "Tab":
        closeMenu();
        break;
      default:
        break;
    }
  };

  const pageDims = PAGE_SIZES[pageSize] || PAGE_SIZES["A4"] || { w: 210, h: 297 };
  const pageWmm = orientation === "portrait" ? pageDims.w : pageDims.h;

  const leftOffset = (col: number) => ROW_HEADER_WIDTH + colOffsets[col];
  const headerRowShadow = viewport.scrollTop > 0
    ? { boxShadow: "0 2px 4px rgba(0,0,0,0.12)" }
    : undefined;

  const headerColShadow = viewport.scrollLeft > 0
    ? { boxShadow: "2px 0 4px rgba(0,0,0,0.12)" }
    : undefined;
  const topOffset = (row: number) => HEADER_HEIGHT + rowOffsets[row];

  const standardToolbarButtons: SpreadsheetToolbarButton[] = [
    {
      label: "New Document",
      icon: Icons.FilePlus2,
      onClick: () => handleToolbarAction("New Document", handleNewFile),
      dropdownItems: [
        { label: "Text Document", onClick: () => handleUnsupportedNewDocument("Text Document") },
        { label: "Spreadsheet", shortcut: "Ctrl+N", onClick: () => handleToolbarAction("New Document", handleNewFile) },
        { label: "Presentation", onClick: () => handleUnsupportedNewDocument("Presentation") },
        { label: "Drawing", onClick: () => handleUnsupportedNewDocument("Drawing") },
        { label: "Formula", onClick: () => handleUnsupportedNewDocument("Formula") },
        { label: "Database", onClick: () => handleUnsupportedNewDocument("Database") },
        { label: "HTML Document", onClick: () => handleUnsupportedNewDocument("HTML Document") },
        { label: "XML Form Document", onClick: () => handleUnsupportedNewDocument("XML Form Document") },
        { label: "Labels", onClick: () => handleUnsupportedNewDocument("Labels") },
        { label: "Business Cards", onClick: () => handleUnsupportedNewDocument("Business Cards") },
        { label: "Master Document", onClick: () => handleUnsupportedNewDocument("Master Document") },
        { label: "", isDivider: true },
        { label: "Templates...", shortcut: "Ctrl+Shift+N", onClick: () => setShowTemplatesDialog("apply") },

      ],
    },
    {
      label: "Open",
      icon: Icons.FolderOpen,
      onClick: () => handleToolbarAction("Open", () => fileInputRef.current?.click()),
      dropdownExtra: () => (
        <div>
          <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-[#8A8886]">Recent Files</div>
          {recentFiles.length === 0 ? (
            <div className="px-3 pb-2 text-xs text-[#8A8886]">No recent files</div>
          ) : (
            recentFiles.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleOpenRecentFile(f)}
                className="flex w-full items-center gap-2 truncate px-3 py-1.5 text-left text-[13px] text-[#323130] hover:bg-[#E5F1FB] hover:text-[#106EBE]"
                title={f.name}
              >
                <Icons.FileText size={13} className="shrink-0 text-[#8A8886]" />
                <span className="truncate">{f.name}</span>
              </button>
            ))
          )}
          <div className="my-1 h-px bg-[#E1DFDD]" />
        </div>
      ),
      dropdownItems: [
        { label: "Clear List", disabled: recentFiles.length === 0, onClick: handleClearRecentFiles },
        { label: "Current Module Only", checked: recentFilesModuleOnly, onClick: handleToggleCurrentModuleOnly },
        { label: "", isDivider: true },
        { label: "Edit Template...", onClick: () => setShowTemplatesDialog("manage") },
        { label: "My Files...", onClick: openLoadDialog },
        {
          label: "Sign out",
          onClick: async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } finally {
              router.push("/login");
            }
          },
        },
        { label: "Open Remote File...", onClick: handleOpenRemoteFile },
      ],
    },
    {
      label: "Save",
      icon: Icons.Save,
      onClick: () => handleToolbarAction("Save", handleSaveToApp),
      dropdownItems: [
        { label: "Save As...", shortcut: "Ctrl+Shift+S", onClick: () => handleToolbarAction("Save As", handleExportAlimxl) },
        { label: "Export...", onClick: () => setShowExportDialog(true) },
        {
          label: "Save a Copy...", onClick: () => handleToolbarAction("Save a Copy", handleExportJsonBackup
          )
        },
        { label: "Save as Template...", shortcut: "Shift+F11", onClick: handleSaveAsTemplate },
        { label: "Save Remote File...", onClick: handleSaveRemoteFile },
      ],
    },
    { label: "Export Directly as PDF", icon: Icons.FileDown, onClick: () => handleToolbarAction("Export Directly as PDF", handleExportPdf) },
    { label: "Refresh", icon: Icons.RefreshCw, onClick: () => handleToolbarAction("Refresh", handleRefreshPage), },
    { label: "Export CSV", icon: Icons.FileSpreadsheet, onClick: () => handleToolbarAction("Export CSV", handleExportCsv) },
    { label: "Print", icon: Icons.Printer, onClick: () => handleToolbarAction("Print", () => setShowPrintDialog(true)) },
    { label: "Toggle Print Preview", icon: Icons.ScanSearch, active: showAdvancedPrintPreview, kind: "toggle", onClick: () => handleToolbarAction("Toggle Print Preview", () => setShowAdvancedPrintPreview(v => !v)) },
    { label: "Cut", icon: Icons.Scissors, onClick: () => handleToolbarAction("Cut", () => doCopy("cut")) },
    { label: "Copy", icon: Icons.Copy, onClick: () => handleToolbarAction("Copy", () => doCopy("copy")) },
    { label: "Paste", icon: Icons.ClipboardPaste, onClick: () => handleToolbarAction("Paste", doPaste) },
    { label: "Merge Cells", icon: Icons.Merge, onClick: mergeSelection, },
    { label: "Unmerge Cells", icon: Icons.SplitSquareHorizontal, onClick: unmergeSelection, },
    { label: "Clone Formatting", icon: Icons.Paintbrush, active: !!formatPainter, kind: "toggle", onClick: () => handleToolbarAction("Clone Formatting", grabFormat) },
    { label: "Undo", icon: Icons.Undo2, onClick: () => handleToolbarAction("Undo", undo) },
    { label: "Redo", icon: Icons.Redo2, onClick: () => handleToolbarAction("Redo", redo) },
    { label: "Find and Replace", icon: Icons.Search, onClick: () => handleToolbarAction("Find and Replace", () => setShowFindReplace(true)) },
    { label: "Spelling", icon: Icons.SpellCheck, onClick: () => handleToolbarAction("Spelling", () => setShowSpellCheck(true)) },
    { label: "Toggle Grid Lines", icon: Icons.Grid3X3, active: showGridLines, kind: "toggle", onClick: () => handleToolbarAction("Toggle Grid Lines", () => { setShowGridLines(v => !v); showToast("Grid lines toggled."); }) },
    { label: "Insert Rows", icon: Icons.Rows3, onClick: () => handleToolbarAction("Insert Rows", insertRowsAtSelection) },
    { label: "Insert Columns", icon: Icons.Columns3, onClick: () => handleToolbarAction("Insert Columns", insertColumnsAtSelection) },
    { label: "Delete Rows", icon: Icons.PanelTopClose, onClick: () => handleToolbarAction("Delete Rows", removeRow) },
    { label: "Delete Columns", icon: Icons.PanelRightClose, onClick: () => handleToolbarAction("Delete Columns", removeCol) },
    { label: "Sort Ascending", icon: Icons.ArrowUpAZ, onClick: () => handleToolbarAction("Sort Ascending", () => sortByActiveColumn("asc")) },
    { label: "Sort Descending", icon: Icons.ArrowDownZA, onClick: () => handleToolbarAction("Sort Descending", () => sortByActiveColumn("desc")) },
    { label: "AutoFilter", icon: Icons.Filter, active: autoFilterIsEnabled, kind: "toggle", onClick: () => handleToolbarAction("AutoFilter", toggleAutoFilter), },
    { label: "Insert Image", icon: Icons.ImagePlus, onClick: () => handleToolbarAction("Insert Image", () => imageInputRef.current?.click()) },
    { label: "Insert Chart", icon: Icons.ChartColumnBig, onClick: () => handleToolbarAction("Insert Chart", openChartWizard) },
    { label: "Insert Pivot Table", icon: Icons.TableProperties, onClick: () => handleToolbarAction("Insert Pivot Table", () => setShowPivotDialog(true)) },
    { label: "Insert Hyperlink", icon: Icons.Link, onClick: () => handleToolbarAction("Insert Hyperlink", insertHyperlink) },
    { label: "Insert Comment", icon: Icons.MessageSquarePlus, onClick: () => handleToolbarAction("Insert Comment", insertComment) },
    { label: "Show Draw Functions", icon: Icons.PenTool, active: showDrawFunctions, kind: "toggle", onClick: () => handleToolbarAction("Show Draw Functions", () => { setShowDrawFunctions(v => !v); showToast("Draw functions toggled."); }) },
    { label: "Freeze Rows and Columns", icon: Icons.Snowflake, active: sheet.frozenRows > 0 || sheet.frozenCols > 0, kind: "toggle", onClick: () => handleToolbarAction("Freeze Rows and Columns", toggleFreezeRowsAndColumns) },
    { label: "Split Window", icon: Icons.SplitSquareHorizontal, active: splitAxis !== null, kind: "toggle", onClick: () => handleToolbarAction("Split Window", toggleSplitWindow) },
  ];

  const sidebarPanels: { key: SidebarPanel; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: "properties", label: "Properties", icon: Icons.SlidersHorizontal },
    { key: "styles", label: "Styles", icon: Icons.Palette },
    { key: "gallery", label: "Gallery", icon: Icons.Images },
    { key: "navigator", label: "Navigator", icon: Icons.Navigation },
    { key: "functions", label: "Functions", icon: Icons.FunctionSquare },
    { key: "settings", label: "Sidebar Settings", icon: Icons.Settings },
  ];


  const writeCell = (sheetIndex: number, key: string, value: string) => {
    setSheetsRaw((prev) =>
      prev.map((sheet, index) =>
        index === sheetIndex
          ? {
            ...sheet,
            cells: {
              ...sheet.cells,
              [key]: { ...(sheet.cells[key] ?? { value: "" }), value },
            },
          }
          : sheet,
      ),
    );
  };

  const runWhatIfTable = (cfg: WhatIfTableConfig) => {
    const sheetIndex = activeSheetIndex;
    const sheet = sheets[sheetIndex];
    if (!sheet) return;
    const rowVals = cfg.rowValues.split(",").map((item) => item.trim()).filter(Boolean);
    const colVals = cfg.colValues ? cfg.colValues.split(",").map((item) => item.trim()).filter(Boolean) : [];
    const parseA1 = (ref: string) => {
      const match = /^([A-Z]+)([0-9]+)$/.exec(ref.trim().toUpperCase());
      if (!match) return null;
      let col = 0;
      for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
      return { row: parseInt(match[2], 10), col };
    };
    const toA1 = (row: number, col: number) => {
      let value = col;
      let label = "";
      while (value > 0) {
        const remainder = (value - 1) % 26;
        label = String.fromCharCode(65 + remainder) + label;
        value = Math.floor((value - 1) / 26);
      }
      return label + row;
    };
    const base = parseA1(cfg.outputCell);
    if (!base) return;
    const evalAt = (rowValue?: string, colValue?: string): string => {
      const cloned = JSON.parse(JSON.stringify(sheets)) as WorkbookSheet[];
      const target = cloned[sheetIndex];
      const applyInput = (cell: string, value?: string) => {
        if (!cell || !value) return;
        const existing = target.cells[cell] ?? { value: "" };
        target.cells[cell] = { ...existing, value };
      };
      applyInput(cfg.rowInputCell, rowValue);
      applyInput(cfg.colInputCell, colValue);
      const rawFormula = target.cells[cfg.formulaCell]?.value ?? "";
      if (!rawFormula.startsWith("=")) return "#VALUE!";
      const getCell = (key: string) => getCellValueInSheet(target, key, new Set<string>(), cloned);
      const expandRange = (range: string) => {
        const normalized = normalizeRange(range);
        if (!normalized) return [];
        const values: EvalResult[] = [];
        for (let row = normalized.r1; row <= normalized.r2; row++) {
          for (let col = normalized.c1; col <= normalized.c2; col++) {
            values.push(getCell(cellKey(row, col)));
          }
        }
        return values;
      };
      try {
        const result = evaluateFormula(rawFormula.slice(1), getCell, expandRange);
        return String(result);
      } catch {
        return "#VALUE!";
      }
    };
    const results: Array<{ key: string; value: string }> = [];
    if (rowVals.length > 0 && colVals.length > 0) {
      colVals.forEach((colValue, colIndex) => {
        results.push({ key: toA1(base.row, base.col + 1 + colIndex), value: colValue });
      });
      rowVals.forEach((rowValue, rowIndex) => {
        results.push({ key: toA1(base.row + 1 + rowIndex, base.col), value: rowValue });
        colVals.forEach((colValue, colIndex) => {
          results.push({
            key: toA1(base.row + 1 + rowIndex, base.col + 1 + colIndex),
            value: evalAt(rowValue, colValue),
          });
        });
      });
    } else if (rowVals.length > 0) {
      rowVals.forEach((rowValue, rowIndex) => {
        results.push({ key: toA1(base.row + rowIndex, base.col), value: rowValue });
        results.push({ key: toA1(base.row + rowIndex, base.col + 1), value: evalAt(rowValue, undefined) });
      });
    } else if (colVals.length > 0) {
      colVals.forEach((colValue, colIndex) => {
        results.push({ key: toA1(base.row, base.col + colIndex), value: colValue });
        results.push({ key: toA1(base.row + 1, base.col + colIndex), value: evalAt(undefined, colValue) });
      });
    }
    results.forEach((item) => {
      writeCell(sheetIndex, item.key, item.value);
    });
  };
  const addScenario = (name: string, changes: string, resultCells: string) => {
    const changeList = changes
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [cell, ...rest] = item.split("=");
        return { cell: cell.trim(), value: rest.join("=").trim() };
      })
      .filter((item) => item.cell && item.value);
    const resultCellList = resultCells.split(",").map((item) => item.trim()).filter(Boolean);
    setScenarios((prev) => [
      ...prev,
      {
        id: `scenario-${Date.now()}-${prev.length}`,
        name: name.trim() || `Scenario ${prev.length + 1}`,
        changes: changeList,
        resultCells: resultCellList,
      },
    ]);
  };

  const applyScenario = (id: string) => {
    const scenario = scenarios.find((item) => item.id === id);
    if (!scenario) return;
    scenario.changes.forEach((change) => {
      writeCell(activeSheetIndex, change.cell, change.value);
    });
  };

  const deleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((item) => item.id !== id));
  };

  const summarizeScenarios = () => {
    const lines: string[] = [];
    scenarios.forEach((scenario) => {
      const cloned = JSON.parse(JSON.stringify(sheets)) as WorkbookSheet[];
      const target = cloned[activeSheetIndex];
      scenario.changes.forEach((change) => {
        const existing = target.cells[change.cell] ?? { value: "" };
        target.cells[change.cell] = { ...existing, value: change.value };
      });
      const values = scenario.resultCells.map((cell) => {
        const rawValue = target.cells[cell]?.value ?? "";
        if (!rawValue.startsWith("=")) return String(rawValue);
        const getCell = (key: string) => getCellValueInSheet(target, key, new Set<string>(), cloned);
        const expandRange = (range: string) => {
          const normalized = normalizeRange(range);
          if (!normalized) return [];
          const collected: EvalResult[] = [];
          for (let row = normalized.r1; row <= normalized.r2; row++) {
            for (let col = normalized.c1; col <= normalized.c2; col++) {
              collected.push(getCell(cellKey(row, col)));
            }
          }
          return collected;
        };
        try {
          return String(evaluateFormula(rawValue.slice(1), getCell, expandRange));
        } catch {
          return "#VALUE!";
        }
      });
      const detail = scenario.resultCells
        .map((cell, index) => `${cell} = ${values[index]}`)
        .join(", ");
      lines.push(`${scenario.name}: ${detail}`);
    });
    setScenarioSummary(lines.length > 0 ? lines.join("\n") : "No scenarios defined.");
  };
  const runSubtotal = (cfg: SubtotalConfig) => {
    const sheetIndex = activeSheetIndex;
    const sheet = sheets[sheetIndex];
    if (!sheet) return;
    const colToIndex = (col: string) => {
      let value = 0;
      for (const ch of col.trim().toUpperCase()) value = value * 26 + (ch.charCodeAt(0) - 64);
      return value - 1;
    };
    const groupCol = colToIndex(cfg.groupColumn);
    const valueCol = colToIndex(cfg.valueColumn);
    const groups = new Map<string, number[]>();
    for (let row = 0; row < sheet.gridRows; row++) {
      const groupKey = sheet.cells[cellKey(row, groupCol)]?.value?.trim();
      if (!groupKey) continue;
      const rawValue = sheet.cells[cellKey(row, valueCol)]?.value ?? "";
      const numeric = parseFloat(rawValue);
      const bucket = groups.get(groupKey) ?? [];
      if (Number.isFinite(numeric)) bucket.push(numeric);
      groups.set(groupKey, bucket);
    }
    const parseA1 = (ref: string) => {
      const match = /^([A-Z]+)([0-9]+)$/.exec(ref.trim().toUpperCase());
      if (!match) return null;
      let col = 0;
      for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
      return { row: parseInt(match[2], 10), col };
    };
    const toA1 = (row: number, col: number) => {
      let value = col;
      let label = "";
      while (value > 0) {
        const remainder = (value - 1) % 26;
        label = String.fromCharCode(65 + remainder) + label;
        value = Math.floor((value - 1) / 26);
      }
      return label + row;
    };
    const base = parseA1(cfg.outputCell);
    if (!base) return;
    const results: Array<{ key: string; value: string }> = [];
    results.push({ key: toA1(base.row, base.col), value: "Group" });
    results.push({ key: toA1(base.row, base.col + 1), value: cfg.func });
    let outputRow = base.row + 1;
    groups.forEach((values, key) => {
      let aggregate = 0;
      if (cfg.func === "SUM") aggregate = values.reduce((sum, value) => sum + value, 0);
      else if (cfg.func === "COUNT") aggregate = values.length;
      else if (cfg.func === "AVERAGE") aggregate = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      else if (cfg.func === "MIN") aggregate = values.length > 0 ? Math.min(...values) : 0;
      else if (cfg.func === "MAX") aggregate = values.length > 0 ? Math.max(...values) : 0;
      else if (cfg.func === "PRODUCT") aggregate = values.reduce((product, value) => product * value, 1);
      results.push({ key: toA1(outputRow, base.col), value: key });
      results.push({ key: toA1(outputRow, base.col + 1), value: String(aggregate) });
      outputRow += 1;
    });
    results.forEach((item) => {
      writeCell(sheetIndex, item.key, item.value);
    });
  };
  const runPivotChart = (cfg: PivotChartConfig) => {
    const sheetIndex = activeSheetIndex;
    const sheet = sheets[sheetIndex];
    if (!sheet) return;
    const normalized = normalizeRange(cfg.sourceRange);
    if (!normalized) return;
    const headerRow = normalized.r1;
    const headers = new Map<string, number>();
    for (let col = normalized.c1; col <= normalized.c2; col++) {
      const header = sheet.cells[cellKey(headerRow, col)]?.value?.trim();
      if (header) headers.set(header, col);
    }
    const rowCol = headers.get(cfg.rowField);
    const valueCol = headers.get(cfg.valueField);
    if (rowCol === undefined || valueCol === undefined) return;
    const groups = new Map<string, number[]>();
    for (let row = headerRow + 1; row <= normalized.r2; row++) {
      const label = sheet.cells[cellKey(row, rowCol)]?.value?.trim();
      if (!label) continue;
      const rawValue = sheet.cells[cellKey(row, valueCol)]?.value ?? "";
      const numeric = parseFloat(rawValue);
      const bucket = groups.get(label) ?? [];
      if (cfg.aggregation === "COUNT" || Number.isFinite(numeric)) bucket.push(Number.isFinite(numeric) ? numeric : 0);
      groups.set(label, bucket);
    }
    const parseA1 = (ref: string) => {
      const match = /^([A-Z]+)([0-9]+)$/.exec(ref.trim().toUpperCase());
      if (!match) return null;
      let col = 0;
      for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
      return { row: parseInt(match[2], 10) - 1, col: col - 1 };
    };
    const base = parseA1(cfg.outputCell);
    if (!base) return;
    const results: Array<{ key: string; value: string }> = [];
    results.push({ key: cellKey(base.row, base.col), value: "Category" });
    results.push({ key: cellKey(base.row, base.col + 1), value: cfg.aggregation });
    let outputRow = base.row + 1;
    groups.forEach((values, label) => {
      let aggregate = 0;
      if (cfg.aggregation === "SUM") aggregate = values.reduce((sum, value) => sum + value, 0);
      else if (cfg.aggregation === "COUNT") aggregate = values.length;
      else if (cfg.aggregation === "AVERAGE") aggregate = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      else if (cfg.aggregation === "MIN") aggregate = values.length > 0 ? Math.min(...values) : 0;
      else if (cfg.aggregation === "MAX") aggregate = values.length > 0 ? Math.max(...values) : 0;
      results.push({ key: cellKey(outputRow, base.col), value: label });
      results.push({ key: cellKey(outputRow, base.col + 1), value: String(aggregate) });
      outputRow += 1;
    });
    results.forEach((item) => {
      writeCell(sheetIndex, item.key, item.value);
    });
    const chartRange = `${colToLetter(base.col)}${base.row + 1}:${colToLetter(base.col + 1)}${outputRow}`;
    updateSheet((s) => ({
      charts: [
        ...s.charts,
        {
          id: `pivotchart_${Date.now()}`,
          title: cfg.title || "PivotChart",
          type: cfg.chartType,
          range: chartRange,
          showLegend: true,
          legendPosition: "right",
        },
      ],
    }));
  };
  const runForecastSheet = (cfg: ForecastSheetConfig) => {
    const sheetIndex = activeSheetIndex;
    const sheet = sheets[sheetIndex];
    if (!sheet) return;
    const values = getRangeNumbers(sheets, sheetIndex, cfg.valuesRange);
    if (values.length === 0) return;
    const n = values.length;
    const x = Array.from({ length: n }, (_, index) => index + 1);
    const regression = linearRegression(values, [x]);
    if (regression.coefficients.length === 0) return;
    const intercept = regression.coefficients[0];
    const slope = regression.coefficients[1];
    const residuals = values.map((value, index) => value - (intercept + slope * x[index]));
    const residualStd = standardDeviation(residuals, true);
    const period = Math.max(0, Math.trunc(cfg.seasonalityPeriod));
    const seasonalIndex = new Map<number, number>();
    if (period > 1) {
      const buckets = new Map<number, number[]>();
      residuals.forEach((residual, index) => {
        const key = index % period;
        const bucket = buckets.get(key) ?? [];
        bucket.push(residual);
        buckets.set(key, bucket);
      });
      buckets.forEach((bucket, key) => {
        seasonalIndex.set(key, mean(bucket));
      });
    }
    const z = cfg.confidence >= 0.99 ? 2.576 : cfg.confidence >= 0.95 ? 1.96 : 1.645;
    const parseA1 = (ref: string) => {
      const match = /^([A-Z]+)([0-9]+)$/.exec(ref.trim().toUpperCase());
      if (!match) return null;
      let col = 0;
      for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
      return { row: parseInt(match[2], 10) - 1, col: col - 1 };
    };
    const base = parseA1(cfg.outputCell);
    if (!base) return;
    const results: Array<{ key: string; value: string }> = [];
    results.push({ key: cellKey(base.row, base.col), value: "Period" });
    results.push({ key: cellKey(base.row, base.col + 1), value: "Forecast" });
    results.push({ key: cellKey(base.row, base.col + 2), value: "Lower" });
    results.push({ key: cellKey(base.row, base.col + 3), value: "Upper" });
    let outputRow = base.row + 1;
    for (let step = 1; step <= cfg.periods; step++) {
      const futureX = n + step;
      let forecast = intercept + slope * futureX;
      if (period > 1) forecast += seasonalIndex.get((n + step - 1) % period) ?? 0;
      const margin = z * residualStd * Math.sqrt(1 + 1 / n);
      results.push({ key: cellKey(outputRow, base.col), value: `Period ${futureX}` });
      results.push({ key: cellKey(outputRow, base.col + 1), value: String(forecast) });
      results.push({ key: cellKey(outputRow, base.col + 2), value: String(forecast - margin) });
      results.push({ key: cellKey(outputRow, base.col + 3), value: String(forecast + margin) });
      outputRow += 1;
    }
    results.forEach((item) => {
      writeCell(sheetIndex, item.key, item.value);
    });
    const chartRange = `${colToLetter(base.col)}${base.row + 1}:${colToLetter(base.col + 1)}${outputRow}`;
    updateSheet((s) => ({
      charts: [
        ...s.charts,
        {
          id: `forecast_${Date.now()}`,
          title: cfg.title || "Forecast",
          type: cfg.chartType,
          range: chartRange,
          showLegend: true,
          legendPosition: "right",
        },
      ],
    }));
  };
  const insertAnalysisChart = (request: AnalyzeChartRequest) => {
    if (!request.range) return;
    updateSheet((s) => ({
      charts: [
        ...s.charts,
        {
          id: `analysis_${Date.now()}`,
          title: request.title || "Analysis Chart",
          type: request.chartType,
          range: request.range,
          showLegend: true,
          legendPosition: "right",
        },
      ],
    }));
  };
  function openHomeDataPicker(mode: "import" | "restore") {
    if (homeDataLoading.current || localSaveInProgressRef.current) {
      showToast("চলমান ফাইলের কাজ শেষ হওয়া পর্যন্ত অপেক্ষা করুন।"); return;
    }
    const input = homeDataInput.current;
    if (!input) return;
    homeDataMode.current = mode;
    input.accept = mode === "restore" ? ".json" : ".xlsx,.xls,.csv,.json";
    input.value = "";
    input.click();
  }

  return (
    <div
      dir="ltr"
      className="h-screen bg-[#FFFFFF] text-[#000000] font-sans flex flex-col overflow-hidden"
      style={
        darkMode
          ? { filter: "invert(1) hue-rotate(180deg)" }
          : undefined
      }
    >

      <input ref={homeDataInput} type="file" accept=".xlsx,.xls,.csv,.json" className="hidden" aria-label="Import data or restore workbook backup"
        onChange={async e => {
          const input = e.currentTarget, file = input.files?.[0], mode = homeDataMode.current;
          if (!file) return;
          if (homeDataLoading.current || localSaveInProgressRef.current) { input.value = ""; showToast("অন্য ফাইলের কাজ চলছে।"); return; }
          const ext = file.name.split(".").pop()?.toLowerCase();
          if (!(mode === "restore" ? ext === "json" : ["xlsx", "xls", "csv", "json"].includes(ext ?? ""))) { input.value = ""; window.alert("সমর্থিত workbook ফাইল নির্বাচন করুন।"); return; }
          if (!file.size || file.size > 50 * 1024 * 1024) { input.value = ""; window.alert("খালি ফাইল নয়; সর্বোচ্চ 50 MB ফাইল ব্যবহার করুন।"); return; }
          if (!window.confirm(mode === "restore" ? "এই backup দিয়ে বর্তমান workbook প্রতিস্থাপিত হবে। Unsaved কাজ হারাবে। আগে backup রেখে থাকলে Continue করুন।" : "এই ফাইল খুললে বর্তমান workbook-এর ডেটা প্রতিস্থাপিত বা পরিবর্তিত হতে পারে। Unsaved কাজ হারাতে পারে। Continue?")) { input.value = ""; return; }
          homeDataLoading.current = true;
          try {
            await onFileSelected(file);
            setHomeDataTools(null);
            setShowHomeScreen(false);
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "ফাইল খোলা যায়নি।");
          } finally { homeDataLoading.current = false; input.value = ""; }
        }} />
      {homeDataTools && <HomeDataToolsDialog mode={homeDataTools} workbookName={workbookName} sheetName={sheet.name}
        onClose={() => setHomeDataTools(null)} onXlsx={handleExportAlimxl} onCsv={handleExportCsv} onBackup={handleExportJsonBackup}
        onRestore={() => { setHomeDataTools(null); openHomeDataPicker("restore"); }} />}

      {/* START: ALIMXL HOME SCREEN */}
      {showHomeScreen && (
        <AlimxlHome
          templates={BUILT_IN_TEMPLATES}
          recentFiles={recentFiles}
          onImportData={() => openHomeDataPicker("import")}
          onExportData={() => setHomeDataTools("export")}
          onBackupRestore={() => setHomeDataTools("backup")}
          onBlank={() => {
            if (
              !window.confirm(
                "Create a new workbook? Any unsaved changes will be lost."
              )
            ) {
              return;
            }

            setEditingKey(null);
            setEditValue("");

            setWorkbookName("Untitled Workbook");
            setWorkbookId(null);
            replaceWorkbookSheets([createSheet("Sheet 1")]);
            setActiveSheetIndex(0);

            setActiveCell("A1");
            setSelection({ r1: 0, c1: 0, r2: 0, c2: 0 });

            setSaveState("idle");
            setShowHomeScreen(false);
          }}
          onOpen={() => {
            fileInputRef.current?.click();
          }}
          onTemplate={(id) => {
            const template = BUILT_IN_TEMPLATES.find((item) => item.id === id);

            if (!template) return;

            if (
              !window.confirm(
                "Open this template? Any unsaved changes will be lost."
              )
            ) {
              return;
            }

            setEditingKey(null);
            setEditValue("");

            handleApplyBuiltInTemplate(template);
            setShowHomeScreen(false);
          }}
          onRecent={(id) => {
            const recent = recentFiles.find((item) => item.id === id);

            if (!recent) return;

            if (
              !window.confirm(
                "Open this workbook? Any unsaved changes will be lost."
              )
            ) {
              return;
            }

            setEditingKey(null);
            setEditValue("");

            void handleOpenRecentFile(recent);
            setShowHomeScreen(false);
          }}
          onMyFiles={() => {
            openLoadDialog();
          }}
          onContinue={() => {
            setShowHomeScreen(false);
          }}
        />
      )}
      {/* END: ALIMXL HOME SCREEN */}


      {/* এখান থেকে আপনার আগের <style> ও বাকি JSX থাকবে */}


      <style>{`
             html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          overscroll-behavior: none;
        }
        @media print {
          body * { visibility: hidden; }
          #awm-print-area, #awm-print-area * { visibility: visible; }
          #awm-print-area { position: absolute; left: 0; top: 0; width: ${pageWmm}mm; max-height: none !important; overflow: visible !important; }
          .awm-print-hide { display: none !important; }
          @page { size: ${pageSize} ${orientation}; margin: 0mm; }
        }
        @keyframes awmFadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes awmSoftPulse {
          0% { box-shadow: 0 0 0 0 rgba(16,110,190,0.18); }
          100% { box-shadow: 0 0 0 10px rgba(16,110,190,0); }
        }
        .awm-premium-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .awm-premium-scrollbar::-webkit-scrollbar-track { background: #F3F2F1; }
        .awm-premium-scrollbar::-webkit-scrollbar-thumb { background: #C8C6C4; border-radius: 999px; border: 2px solid #F3F2F1; }
        .awm-premium-scrollbar::-webkit-scrollbar-thumb:hover { background: #A19F9D; }
                /* ===== VIP Green & Gold Toolbar Theme ===== */
        .awm-vip-toolbar [class~="text-[#323130]"] { color: #014E00 !important; }
        .awm-vip-toolbar [class~="text-[#106EBE]"] { color: #014E00 !important; }
        .awm-vip-toolbar [class~="bg-[#E5F1FB]"] { background-color: #FFF3C4 !important; }
        .awm-vip-toolbar [class~="border-[#106EBE]"] { border-color: #E3A200 !important; }
        .awm-vip-toolbar [class~="border-[#C8C6C4]"],
        .awm-vip-toolbar [class~="border-[#D2D0CE]"] { border-color: #D9B44A !important; }
        .awm-vip-toolbar [class~="bg-[#C8C6C4]"] { background-color: #D9B44A !important; }
        .awm-vip-toolbar [class~="bg-[#106EBE]"] { background-color: #014E00 !important; color: #F8D150 !important; }
        .awm-vip-toolbar [class~="hover:bg-[#005A9E]"]:hover { background-color: #013706 !important; }

        .awm-vip-toolbar [class~="hover:bg-white"]:hover,
        .awm-vip-toolbar [class~="hover:bg-[#F4F9FD]"]:hover,
        .awm-vip-toolbar [class~="hover:bg-[#E5F1FB]"]:hover,
        .awm-vip-toolbar [class~="hover:bg-[#F3F2F1]"]:hover { background-color: #FFF3C4 !important; }
        .awm-vip-toolbar [class~="hover:text-[#106EBE]"]:hover { color: #013706 !important; }
        .awm-vip-toolbar [class~="hover:border-[#106EBE]"]:hover,
        .awm-vip-toolbar [class~="hover:border-[#C8C6C4]"]:hover { border-color: #E3A200 !important; }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.json"
        className="hidden"
        onChange={async (e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];

          if (!file) return;

          try {
            await onFileSelected(file);
            setShowHomeScreen(false);
          } catch (error) {
            console.error("ALIMXL workbook open failed:", error);

            const message =
              error instanceof Error
                ? error.message
                : "ফাইল খোলা যায়নি।";

            window.alert(message);
          } finally {
            input.value = "";
          }
        }}
      />
      {/* Image file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];

          if (file) {
            onImagePicked(file);
          }

          e.currentTarget.value = "";
        }}
      />

      {toast && <div className="fixed right-6 top-6 z-9999 rounded-xl border border-[#106EBE]/30 bg-[#E5F1FB] px-5 py-3 text-sm font-bold text-[#106EBE] shadow-2xl backdrop-blur-md animate-[awmFadeIn_0.16s_ease-out]">{toast}</div>}

      {/* Enterprise Top Navigation Menu Bar */}
      <nav
        ref={menuBarRef}
        className="flex flex-wrap items-center bg-linear-to-b from-[#016200] to-[#013706] border-b-2 border-[#E3A200] text-[13px] text-[#F8D150] select-none relative z-50 shadow-md"
      >
        <div className="flex items-center gap-2 px-4 font-black text-[#014E00] mr-2 tracking-widest uppercase text-xs">
          <Image
            src="/icons/icon-192.png"
            alt="ALIMXL"
            width={192}
            height={192}
            className="h-8 w-auto drop-shadow-sm"
            priority
          />
        </div>

        {/* Home button */}
        <button
          type="button"
          onClick={() => {
            setActiveMenuIndex(null);
            setFocusedMenuItemIndex(null);
            void refreshRecentFromDevice();
            setShowHomeScreen(true);
          }}
          className="mr-2 rounded-md border border-[#D2D0CE] bg-white px-3 py-1.5 text-xs font-semibold text-[#107C41] transition-colors hover:bg-[#EEF5F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#107C41]"
        >
          Home
        </button>


        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="md:hidden ml-auto rounded-md border border-[#E3A200]/60 px-2 py-2"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className="block h-0.5 w-5 bg-[#F8D150]"></span>
          <span className="mt-1 block h-0.5 w-5 bg-[#F8D150]"></span>
          <span className="mt-1 block h-0.5 w-5 bg-[#F8D150]"></span>
        </button>

        {EXCEL_MENU_DATA.map((category, index) => {
          const isActive = activeMenuIndex === index;
          const isDeveloperMenu = category.title === "Developer";

          return (
            <div
              key={category.title}
              className="relative group hidden md:block"
              onMouseEnter={() => {
                if (activeMenuIndex !== null) setActiveMenuIndex(index);
              }}
            >

              <button
                className={`flex items-center gap-1 px-3 py-1.5 outline-none transition-colors ${isActive ? "bg-[#E3A200] text-[#013706]" : "hover:bg-[#E3A200]/25"}`}
                onClick={() => setActiveMenuIndex(isActive ? null : index)}
                onKeyDown={(e) => handleMenuKeyDown(e, index)}
                aria-haspopup="true"
                aria-expanded={isActive}
                tabIndex={0}
              >
                {category.title}
                {isDeveloperMenu && (
                  <>
                    {isRecording && (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" title="Recording" />
                    )}
                    <Icons.ChevronDown size={13} className="text-[#605E5C]" />
                  </>
                )}
              </button>

              {isActive && isDeveloperMenu && (
                <DeveloperMacroMenu
                  isRecording={isRecording}
                  isPlayingMacro={isPlayingMacro}
                  savedMacros={savedMacros}
                  extraItems={category.items}
                  onToggleRecording={() => { toggleMacroRecording(); closeMenu(); }}
                  onRunMacro={(m) => { runMacro(m); closeMenu(); }}
                  onRenameMacro={renameMacro}
                  onDeleteMacro={deleteMacro}
                  onCancelPlayback={cancelMacroPlayback}
                  onExtraItemClick={(action) => { dispatchMenuAction(action); closeMenu(); }}
                />
              )}

              {isActive && !isDeveloperMenu && (
                <ul className="absolute top-full left-0 min-w-70 bg-white border border-[#D2D0CE] shadow-[0_14px_34px_rgba(0,0,0,0.18)] py-1 m-0 list-none z-1000 rounded-b-xl overflow-hidden animate-[awmFadeIn_0.1s_ease-out]">
                  {category.items.map((item, itemIndex) => {
                    const isFocused = focusedMenuItemIndex === itemIndex;
                    return (
                      <li
                        key={`${item.label}-${itemIndex}`}
                        className={`flex justify-between items-center px-4 py-1.5 cursor-default text-[13px] text-[#000000] ${isFocused ? "bg-[#E5F1FB] text-[#106EBE]" : "hover:bg-[#F3F2F1]"}`}
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => dispatchMenuAction(item.action)}
                        onMouseEnter={() => setFocusedMenuItemIndex(itemIndex)}
                      >
                        <span className="whitespace-nowrap">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-[#605E5C] text-[12px] ml-6 text-right">{item.shortcut}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}



        <div className="ml-auto flex items-center gap-2 px-3">
          <div className="ml-auto hidden items-center gap-2 rounded-lg border border-[#C8C6C4] bg-linear-to-b from-white to-[#EDEBE9] px-3 py-1 text-xs font-black text-[#3B3A39] shadow-sm md:flex">
            <Icons.Crown size={16} className="text-amber-500" />
            SMART FAMILY IT SOLUTIONS WORLD LLC
          </div>
          <input
            value={workbookName}
            onChange={(e) => setWorkbookName(e.target.value)}
            className="h-7 w-56 rounded-md border border-[#C8C6C4] bg-white px-3 text-xs font-bold outline-none shadow-inner transition-all focus:border-[#106EBE] focus:ring-2 focus:ring-[#106EBE]/15"
            aria-label="Workbook name"
          />
          {saveState === "saving" && <span className="text-xs text-[#106EBE] font-bold whitespace-nowrap">Saving...</span>}
          {saveState === "saved" && <span className="text-xs text-green-600 font-bold whitespace-nowrap">Saved</span>}
          {saveState === "error" && <span className="text-xs text-red-600 font-bold whitespace-nowrap">Save failed</span>}
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 z-50 max-h-[70vh] overflow-y-auto border-t border-[#E3A200] bg-[#013706] text-[#F8D150]">
            {EXCEL_MENU_DATA.map((category, index) => (
              <div key={category.title} className="border-b border-[#016200]/60">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-2 text-left"
                  onClick={() => setMobileOpenCategory(mobileOpenCategory === index ? null : index)}
                >
                  <span>{category.title}</span>
                  <span>{mobileOpenCategory === index ? "−" : "+"}</span>
                </button>
                {mobileOpenCategory === index && (
                  <div className="bg-[#014E00]/40">
                    {category.items.map((item, itemIndex) => (
                      <button
                        key={`${item.label}-${itemIndex}`}
                        type="button"
                        className="block w-full px-6 py-2 text-left text-[13px] text-white/90 hover:bg-[#016200]/60"
                        onClick={() => {
                          dispatchMenuAction(item.action);
                          setMobileMenuOpen(false);
                          setMobileOpenCategory(null);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>


      {/* alimxl Style Enterprise Toolbar */}
      <div className="awm-vip-toolbar border-b-2 border-[#E3A200] bg-linear-to-b from-[#FFFDF4] via-[#FFF6D6] to-[#F7E7B0] shadow-[0_2px_6px_rgba(1,78,0,0.18)]">
        <div className="flex items-center gap-3 border-b border-[#D2D0CE] px-3 py-1.5">

        </div>

        {/* Row 1: Standard Toolbar */}
        <div className="flex flex-wrap items-center gap-o.75px] border-b border-[#D2D0CE] px-2 py-1">
          {/* Toolbar callbacks read refs only when clicked, not while rendering. */}
          {standardToolbarButtons.map((button, index) => (
            <React.Fragment key={button.label}>
              {button.dropdownItems || button.dropdownExtra ? (
                <SpreadsheetToolbarSplitButton
                  button={button}
                  open={openToolbarMenu === (button.label === "New Document" ? "new" : button.label === "Open" ? "open" : "save")}
                  onToggle={() =>
                    setOpenToolbarMenu((v) => {
                      const key = button.label === "New Document" ? "new" : button.label === "Open" ? "open" : "save";
                      return v === key ? null : key;
                    })
                  }
                  onClose={() => setOpenToolbarMenu(null)}
                />
              ) : (
                <SpreadsheetToolbarIconButton button={button} />
              )}
              {[2, 5, 8, 10, 13, 14, 18, 21, 24, 27].includes(index) && <ToolbarSeparator />}
            </React.Fragment>
          ))}

          <SpecialCharactersQuickButton
            open={showSpecialCharsMenu}
            onToggle={() => setShowSpecialCharsMenu((v) => !v)}
            menuRef={specialCharsMenuRef}
            favorites={scFavorites}
            recent={scRecent}
            onPick={(ch) => { insertCharacterToCell(ch); setShowSpecialCharsMenu(false); }}
            onOpenDialog={() => { setShowSpecialCharsMenu(false); setShowSpecialCharsDialog(true); }}
          />

          <AdvancedColorDropdown
            label="Border Color"
            icon={Icons.SquareDashedBottom}
            value={activeCellStyle.borderColor || "#000000"}
            storageKey="awm_excel_recent_colors_border"
            onChange={(borderColor) => { applyStyleToSelection({ borderColor }); showToast("Border color applied."); }}
          />


          <div className="relative">
            <button
              type="button"
              onClick={() => setBorderWidthMenuOpen((v) => !v)}
              title="Border Thickness"
              aria-label="Border Thickness"
              aria-haspopup="menu"
              aria-expanded={borderWidthMenuOpen}
              className={`flex h-8 w-6 items-center justify-center rounded-md border shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30 ${borderWidthMenuOpen ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-transparent text-[#323130] hover:border-[#C8C6C4] hover:bg-white hover:text-[#106EBE] hover:shadow-md"}`}
            >
              <Icons.ChevronDown size={16} />
            </button>
            {borderWidthMenuOpen && (
              <React.Fragment>
                <div className="fixed inset-0 z-40" onClick={() => setBorderWidthMenuOpen(false)} aria-hidden="true" />
                <div className="absolute left-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-md border border-[#C8C6C4] bg-white py-1 shadow-lg">
                  {[{ label: "Thin", value: 1 }, { label: "Medium", value: 2 }, { label: "Thick", value: 4 }].map((opt) => {
                    const isActive = (activeCellStyle.borderWidth || 2) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { applyStyleToSelection({ borderWidth: opt.value }); showToast("Border width applied."); setBorderWidthMenuOpen(false); }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${isActive ? "bg-[#E5F1FB] font-bold text-[#106EBE]" : "text-[#323130] hover:bg-[#F3F2F1]"}`}
                      >
                        {opt.label}
                        {isActive && <Icons.Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </React.Fragment>
            )}
          </div>
          <SpreadsheetToolbarIconButton
            button={{
              label: activeCellStyle.textDirection === "rtl" ? "Text Direction: RTL" : "Text Direction: LTR",
              icon: Icons.ArrowLeftRight,
              active: activeCellStyle.textDirection === "rtl",
              kind: "toggle",
              onClick: toggleTextDirection,
            }}

          />
          <SpreadsheetToolbarIconButton
            button={{
              label: "Predictive Analytics",
              icon: Icons.TrendingUp,
              active: showPredictiveAnalytics,
              kind: "toggle",
              onClick: runPredictiveAnalytics,
            }}
          />
        </div>

        {/* Row 2: Formatting Toolbar */}
        <div className="flex flex-wrap items-center gap-[0.75px] border-b border-[#D2D0CE] px-2 py-1">
          <AdvancedFontPicker
            value={activeCellStyle.fontFamily || "Inter"}
            onChange={(fontFamily) => { applyStyleToSelection({ fontFamily }); showToast(`Font changed to ${fontFamily}.`); }}
          />
          <select
            value={activeCellStyle.fontSize || 12}
            onChange={(e) => { applyStyleToSelection({ fontSize: parseInt(e.target.value, 10) }); showToast("Font size changed."); }}
            className="h-8 w-18 rounded-md border border-[#C8C6C4] bg-white px-2 text-sm shadow-inner outline-none hover:border-[#106EBE] focus:border-[#106EBE]"
            title="Font Size"
            aria-label="Font Size"
          >
            {FONT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <ToolbarSeparator />
          <SpreadsheetToolbarIconButton button={{ label: "Bold", icon: Icons.Bold, active: !!activeCellStyle.bold, kind: "toggle", onClick: () => toggleStyle("bold") }} />
          <SpreadsheetToolbarIconButton button={{ label: "Italic", icon: Icons.Italic, active: !!activeCellStyle.italic, kind: "toggle", onClick: () => toggleStyle("italic") }} />
          <SpreadsheetToolbarIconButton button={{ label: "Underline", icon: Icons.Underline, active: !!activeCellStyle.underline, kind: "toggle", onClick: () => toggleStyle("underline") }} />
          <AdvancedColorDropdown
            label="Font Color"
            icon={Icons.CaseSensitive}
            value={activeCellStyle.color || "#000000"}
            storageKey="awm_excel_recent_colors_font"
            onChange={(color) => { applyStyleToSelection({ color }); showToast("Font color applied."); }}
          />

          <AdvancedColorDropdown
            label="Background Color"
            icon={Icons.PaintBucket}
            value={activeCellStyle.bg || "#FFFFFF"}
            allowNoFill
            storageKey="awm_excel_recent_colors_bg"
            onChange={(bg) => {
              if (bg === "transparent") {
                applyStyleToSelection({ bg: undefined });
                showToast("Background fill removed.");
              } else {
                applyStyleToSelection({ bg });
                showToast("Background color applied.");
              }
            }}
          />
          <ToolbarSeparator />
          <SpreadsheetToolbarIconButton button={{ label: "Align Left", icon: Icons.AlignLeft, active: activeCellStyle.align === "left", kind: "toggle", onClick: () => { applyStyleToSelection({ align: "left" }); showToast("Aligned left."); } }} />
          <SpreadsheetToolbarIconButton button={{ label: "Align Center", icon: Icons.AlignCenter, active: activeCellStyle.align === "center", kind: "toggle", onClick: () => { applyStyleToSelection({ align: "center" }); showToast("Aligned center."); } }} />
          <SpreadsheetToolbarIconButton button={{ label: "Align Right", icon: Icons.AlignRight, active: activeCellStyle.align === "right", kind: "toggle", onClick: () => { applyStyleToSelection({ align: "right" }); showToast("Aligned right."); } }} />
          <SpreadsheetToolbarIconButton button={{ label: "Justified", icon: Icons.AlignJustify, active: activeCellStyle.align === "justify", kind: "toggle", onClick: () => { applyStyleToSelection({ align: "justify" }); showToast("Justified."); } }} />
          <SpreadsheetToolbarIconButton button={{ label: "Wrap Text", icon: Icons.WrapText, active: !!activeCellStyle.wrap, kind: "toggle", onClick: () => { applyStyleToSelection({ wrap: !activeCellStyle.wrap }); showToast("Wrap text toggled."); } }} />
          <ToolbarSeparator />
          <SpreadsheetToolbarIconButton button={{ label: "Align Top", icon: Icons.AlignVerticalJustifyStart, active: activeCellStyle.verticalAlign === "top", kind: "toggle", onClick: () => { applyStyleToSelection({ verticalAlign: "top" }); showToast("Aligned top."); } }} />
          <SpreadsheetToolbarIconButton button={{ label: "Align Center Vertically", icon: Icons.AlignVerticalJustifyCenter, active: activeCellStyle.verticalAlign === "middle", kind: "toggle", onClick: () => { applyStyleToSelection({ verticalAlign: "middle" }); showToast("Aligned middle."); } }} />
          <SpreadsheetToolbarIconButton button={{ label: "Align Bottom", icon: Icons.AlignVerticalJustifyEnd, active: activeCellStyle.verticalAlign === "bottom", kind: "toggle", onClick: () => { applyStyleToSelection({ verticalAlign: "bottom" }); showToast("Aligned bottom."); } }} />
          <ToolbarSeparator />
          {/* Currency split-button: main button applies the active currency, chevron opens the world-currency dropdown */}
          <div className="relative">
            <div className="flex items-stretch">
              <button
                type="button"
                title="Apply currency format"
                aria-label="Currency"
                onClick={() => applyStyleToSelection({ numberFormat: "currency", currencyCode: activeCellStyle.currencyCode || "USD" })}
                className={`inline-flex items-center gap-1 rounded-l-md border px-2 py-1 text-xs font-medium shadow-inner transition ${activeCellStyle.numberFormat === "currency" ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#C8C6C4] bg-white text-[#444] hover:border-[#106EBE] hover:bg-[#F4F9FD]"}`}
              >
                <Icons.CircleDollarSign size={14} />
                <span className="hidden md:inline">{findCurrency(activeCellStyle.currencyCode).code}</span>
              </button>
              <button
                type="button"
                title="Choose currency"
                aria-label="Choose currency"
                aria-expanded={currencyMenuOpen}
                onClick={() => setCurrencyMenuOpen((v) => !v)}
                className={`inline-flex items-center rounded-r-md border border-l-0 px-1 py-1 shadow-inner transition ${currencyMenuOpen ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#C8C6C4] bg-white text-[#444] hover:border-[#106EBE] hover:bg-[#F4F9FD]"}`}
              >
                {currencyMenuOpen ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
              </button>
            </div>

            {currencyMenuOpen && (
              <>
                {/* Click-outside backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => { setCurrencyMenuOpen(false); setCurrencySearch(""); }}
                  aria-hidden="true"
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-[#C8C6C4] bg-white shadow-lg">
                  <div className="border-b border-[#E1DFDD] p-2">
                    <div className="flex items-center gap-2 rounded-md border border-[#D2D0CE] px-2 py-1">
                      <Icons.Search size={12} className="text-[#605E5C]" />
                      <input
                        autoFocus
                        type="text"
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        placeholder="Search currency or country…"
                        className="w-full bg-transparent text-xs outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") { setCurrencyMenuOpen(false); setCurrencySearch(""); }
                          if (e.key === "Enter") {
                            const list = WORLD_CURRENCIES.filter((c) => matchesCurrency(c, currencySearch));
                            if (list.length > 0) applyCurrencyFormat(list[0].code);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {WORLD_CURRENCIES.filter((c) => matchesCurrency(c, currencySearch)).map((c) => {
                      const active = activeCellStyle.numberFormat === "currency" && (activeCellStyle.currencyCode || "USD") === c.code;
                      return (
                        <li key={c.code}>
                          <button
                            type="button"
                            onClick={() => applyCurrencyFormat(c.code)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition ${active ? "bg-[#E5F1FB] text-[#106EBE]" : "text-[#323130] hover:bg-[#F3F2F1]"}`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="w-8 shrink-0 text-center font-semibold">{c.symbol}</span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-[#605E5C]">{c.code}</span>
                          </button>
                        </li>
                      );
                    })}
                    {WORLD_CURRENCIES.filter((c) => matchesCurrency(c, currencySearch)).length === 0 && (
                      <li className="px-3 py-2 text-xs text-[#605E5C]">No currency matches &quot;{currencySearch}&quot;.</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
          <SpreadsheetToolbarIconButton button={{ label: "Percentage", icon: Icons.Percent, active: activeCellStyle.numberFormat === "percentage", kind: "toggle", onClick: () => applyNumberFormat("percentage") }} />
          <SpreadsheetToolbarIconButton button={{ label: "Number", icon: Icons.Binary, active: activeCellStyle.numberFormat === "number", kind: "toggle", onClick: () => applyNumberFormat("number") }} />
          <SpreadsheetToolbarIconButton button={{ label: "Date", icon: Icons.CalendarDays, active: activeCellStyle.numberFormat === "date", kind: "toggle", onClick: () => applyNumberFormat("date") }} />
          <SpreadsheetToolbarIconButton button={{ label: "Scientific", icon: Icons.Superscript, active: activeCellStyle.numberFormat === "scientific", kind: "toggle", onClick: () => applyNumberFormat("scientific") }} />
          <SpreadsheetToolbarIconButton button={{ label: "Accounting", icon: Icons.Receipt, active: activeCellStyle.numberFormat === "accounting", kind: "toggle", onClick: () => applyNumberFormat("accounting") }} />
          <SpreadsheetToolbarIconButton button={{ label: "Text Format", icon: Icons.Type, active: activeCellStyle.numberFormat === "text", kind: "toggle", onClick: () => applyNumberFormat("text") }} />
          <input
            type="text"
            placeholder="Custom e.g. $#,##0.00"
            defaultValue={activeCellStyle.customFormat || ""}
            onBlur={(e) => {
              if (e.target.value.trim()) {
                applyStyleToSelection({ numberFormat: "custom", customFormat: e.target.value.trim() });
                showToast("Custom format applied.");
              }
            }}
            className="w-36 rounded-md border border-[#D2D0CE] bg-white px-2 py-1 text-xs outline-none focus:border-[#106EBE]"
          />
          <SpreadsheetToolbarIconButton button={{ label: "Increase Decimal", icon: Icons.Plus, onClick: () => adjustDecimals(1) }} />
          <SpreadsheetToolbarIconButton button={{ label: "Decrease Decimal", icon: Icons.Minus, onClick: () => adjustDecimals(-1) }} />
          <ToolbarSeparator />
          <SpreadsheetToolbarIconButton button={{ label: "Increase Indent", icon: Icons.IndentIncrease, onClick: () => adjustIndent(1) }} />
          <SpreadsheetToolbarIconButton button={{ label: "Decrease Indent", icon: Icons.IndentDecrease, onClick: () => adjustIndent(-1) }} />


          <div className="relative" ref={borderMenuRef}>
            <div className="flex items-stretch">
              <button
                type="button"
                onClick={toggleBorderAll}
                className="inline-flex items-center gap-1 rounded-l-md border border-C8C6C4 bg-white px-2 py-1 text-xs shadow-inner hover:border-106EBE hover:bg-F4F9FD"
                title="Apply Border"
                aria-label="Apply Border"
              >
                <Icons.Square size={14} />
              </button>

              <button
                type="button"
                onClick={() => setBorderMenuOpen(v => !v)}
                className="inline-flex items-center rounded-r-md border border-l-0 border-C8C6C4 bg-white px-1 py-1 text-xs shadow-inner hover:border-106EBE hover:bg-F4F9FD"
                title="Open border menu"
                aria-label="Open border menu"
                aria-expanded={borderMenuOpen}
              >
                <Icons.ChevronDown size={14} />
              </button>
            </div>

            {borderMenuOpen && (
              <div
                className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-C8C6C4 bg-white py-1 shadow-lg"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => { applyBorderPreset("none"); closeBorderMenu(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-E5F1FB"
                >
                  No Border
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => { applyBorderPreset("left"); closeBorderMenu(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-E5F1FB"
                >
                  Left Border
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => { applyBorderPreset("right"); closeBorderMenu(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-E5F1FB"
                >
                  Right Border
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => { applyBorderPreset("top"); closeBorderMenu(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-E5F1FB"
                >
                  Top Border
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => { applyBorderPreset("bottom"); closeBorderMenu(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-E5F1FB"
                >
                  Bottom Border
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => { applyBorderPreset("all"); closeBorderMenu(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-E5F1FB"
                >
                  All Borders
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => { applyBorderPreset("outside"); closeBorderMenu(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-E5F1FB"
                >
                  Outside Borders
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => { applyBorderPreset("inside"); closeBorderMenu(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-E5F1FB"
                >
                  Inside Borders
                </button>
              </div>
            )}
          </div>

          <select
            value={activeCellStyle.borderStyle || "solid"}
            onChange={(e) => { applyStyleToSelection({ borderStyle: e.target.value as CellStyle["borderStyle"] }); showToast("Border style applied."); }}
            className="h-6 w-4 rounded-md border border-[#C8C6C4] bg-white px-1 text-[10px] shadow-inner outline-none hover:border-[#106EBE] focus:border-[#106EBE]"
            title="Border Style"
            aria-label="Border Style"
          >

            {BORDER_STYLE_OPTIONS.map((style) => <option key={style} value={style}>{style}</option>)}
          </select>

        </div>

        {/* Row 3: Formula Bar */}
        <div className={`flex items-start gap-2 px-2 py-1 bg-linear-to-b from-[#FFFFFF] to-[#F7F7F7] transition-all ${formulaExpanded ? "min-h-[4.75px]" : "min-h-[2.5px]"}`}>
          <input
            value={activeCell}
            onChange={(e) => {
              const next = e.target.value.toUpperCase();
              const pos = parseKey(next);
              if (pos && pos.row >= 0 && pos.col >= 0 && pos.row < sheet.gridRows && pos.col < sheet.gridCols) {
                setActiveCell(next);
                setSelection({ r1: pos.row, c1: pos.col, r2: pos.row, c2: pos.col });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const raw = (e.currentTarget as HTMLInputElement).value.toUpperCase();
                if (goToNamedRange(raw.replace(/\s+/g, "_"))) return;
                const pos = parseKey(raw);
                if (pos) {
                  setActiveCell(cellKey(pos.row, pos.col));
                  setSelection({ r1: pos.row, c1: pos.col, r2: pos.row, c2: pos.col });
                }
              }
            }}
            className="h-8 w-[27.5px] rounded-md border border-[#C8C6C4] bg-white px-2 text-sm font-bold shadow-inner outline-none focus:border-[#106EBE]"
            title="Name Box"
            aria-label="Name Box"
          />
          <button onClick={() => setShowFunctionWizard(true)} className="h-8 rounded-md px-2 text-lg italic font-bold text-[#106EBE] hover:bg-[#E5F1FB] focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30" title="Function Wizard" aria-label="Function Wizard">fx</button>
          <div className="relative flex items-center">
            <button onClick={autoSum} className="h-8 rounded-md px-2 text-xl font-bold text-[#3B3A39] hover:bg-[#E5F1FB] focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30" title="Sum" aria-label="Sum">Σ</button>
            <button onClick={() => setShowAutoSumMenu((v) => !v)} className="flex h-8 w-5 items-center justify-center rounded-md text-[#3B3A39] hover:bg-[#E5F1FB] focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30" title="AutoSum options" aria-label="AutoSum options">
              <Icons.ChevronDown size={12} />
            </button>
            {showAutoSumMenu && (
              <div ref={autoSumMenuRef} className="absolute left-0 top-full z-500 mt-1 w-36 rounded-md border border-[#D2D0CE] bg-white py-1 text-sm shadow-2xl">
                {(["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "COUNTA", "PRODUCT", "STDEV", "STDEVP", "VAR", "VARP"] as Aggregate[]).map((fn) => (
                  <button key={fn} onClick={() => applyAggregateFunction(fn)} className="block w-full px-3 py-1 text-left hover:bg-[#E5F1FB]">
                    {fn}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={insertFunctionFromToolbar} className="h-8 rounded-md px-2 text-lg hover:bg-[#E5F1FB] focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30" title="Insert Function" aria-label="Insert Function">😊</button>
          <textarea
            spellCheck
            dir="ltr"
            value={editingKey === activeCell ? editValue : getRawValue(activeCell)}
            onChange={(e) => {
              if (editingKey === activeCell) setEditValue(e.target.value);
              else {
                startEditing(activeCell, e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitEdit("down");
              }
            }}
            className={`${formulaExpanded ? "h-16" : "h-8"} flex-1 resize-none rounded-md border border-[#C8C6C4] bg-white px-3 py-1.5 text-sm outline-none shadow-inner transition-all focus:border-[#106EBE] focus:ring-2 focus:ring-[#106EBE]/15 text-[#000000]`}
            style={{ direction: "ltr", unicodeBidi: "plaintext" }}
            placeholder="Input line..."
            title="Formula Input"
            aria-label="Formula Input"
          />
          <button
            onClick={() => { setFormulaExpanded(v => !v); showToast("Formula bar size toggled."); }}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#C8C6C4] bg-white text-[#3B3A39] shadow-sm hover:border-[#106EBE] hover:bg-[#E5F1FB] focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30"
            title="Expand / Collapse Formula Bar"
            aria-label="Expand / Collapse Formula Bar"
          >
            {formulaExpanded ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${printPreview ? "bg-[#A19F9D] p-6" : ""}`}>
          {showDrawFunctions && (
            <div className="flex flex-wrap items-center gap-2 border-b border-[#D2D0CE] bg-[#FBFBFB] px-3 py-2 text-xs">
              <span className="font-bold text-[#605E5C]">Draw Functions</span>
              {([
                { id: "select", label: "Select", icon: Icons.MousePointer2 },
                { id: "rectangle", label: "Rectangle", icon: Icons.Square },
                { id: "ellipse", label: "Ellipse", icon: Icons.Circle },
                { id: "line", label: "Line", icon: Icons.Slash },
                { id: "arrow", label: "Arrow", icon: Icons.ArrowRight },

                { id: "freeform", label: "Freeform", icon: Icons.PenTool },
                { id: "connector", label: "Connector", icon: Icons.Spline },
              ] as { id: DrawToolId; label: string; icon: React.ComponentType<{ size?: number }> }[]).map((tool) => {

                const Icon = tool.icon;
                const active = activeDrawTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => { setActiveDrawTool(tool.id); setSelectedDrawId(null); }}
                    className={`flex items-center gap-1 rounded-md border px-3 py-1 ${active ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#D2D0CE] bg-white hover:border-[#106EBE]"}`}
                  >
                    <Icon size={13} /> {tool.label}
                  </button>
                );
              })}

              {(() => {
                const selectedShape = (sheet.drawings || []).find((d) => d.id === selectedDrawId);
                if (!selectedShape || selectedShape.type !== "connector") return null;
                const style = selectedShape.connectorStyle || "straight";
                return (
                  <div className="flex items-center gap-1 rounded-md border border-[#D2D0CE] bg-white p-0.5">
                    {(["straight", "elbow"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateSheet((sh) => ({ drawings: (sh.drawings || []).map((d) => (d.id === selectedShape.id ? { ...d, connectorStyle: s } : d)) }))}
                        className={`rounded px-2 py-1 capitalize ${style === s ? "bg-[#E5F1FB] text-[#106EBE] font-bold" : "text-[#605E5C] hover:bg-[#F3F2F1]"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                );
              })()}

              <button
                onClick={deleteSelectedDrawShape}
                disabled={!selectedDrawId}
                className="flex items-center gap-1 rounded-md border border-[#D2D0CE] bg-white px-3 py-1 hover:border-red-400 hover:text-red-600 disabled:opacity-40"
              >
                <Icons.Trash2 size={13} /> Delete
              </button>
            </div>
          )}


          {splitAxis && (
            <div className="flex items-center justify-between border-b border-[#D2D0CE] bg-[#E5F1FB] px-3 py-1 text-xs font-bold text-[#106EBE]">
              <span>
                Split Window active ({splitAxis === "vertical" ? "Vertical" : "Horizontal"}) — Active pane: {activePane === "a" ? "A" : "B"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={equalizeSplit}
                  className="rounded-md border border-[#106EBE] px-2 py-0.5 text-[11px] font-bold text-[#106EBE] hover:bg-white"
                >
                  Equalize
                </button>
                <button
                  type="button"
                  onClick={unsplitWindow}
                  className="rounded-md border border-[#106EBE] px-2 py-0.5 text-[11px] font-bold text-[#106EBE] hover:bg-white"
                >
                  Unsplit
                </button>
              </div>
            </div>
          )}

          {/* Spreadsheet Grid Area */}
          <div

            id="awm-print-area"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (scrollRafRef.current !== null) return;
              scrollRafRef.current = requestAnimationFrame(() => {
                scrollRafRef.current = null;
                if (!el.isConnected) return;
                // Coordinates must match the CSS-zoomed table's logical units.
                const scale = Math.max(0.1, zoomLevel / 100);
                const scrollTop = el.scrollTop / scale;
                const scrollLeft = el.scrollLeft / scale;
                const clientHeight = el.clientHeight / scale;
                const clientWidth = el.clientWidth / scale;
                setViewport((prev) =>
                  prev.scrollTop === scrollTop && prev.scrollLeft === scrollLeft &&
                    prev.clientHeight === clientHeight && prev.clientWidth === clientWidth
                    ? prev : { scrollTop, scrollLeft, clientHeight, clientWidth }
                );
              });
            }}
            className={`flex-1 overflow-auto bg-[#F3F2F1] relative awm-premium-scrollbar ${printPreview ? "mx-auto w-full max-w-6xl rounded-xl bg-white shadow-2xl" : ""}`}
            style={{ overflowAnchor: "none", overscrollBehavior: "contain" }}
          >
            <table
              className="table-fixed text-sm bg-[#FFFFFF]"
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                width: tableWidth,
                ...(zoomLevel !== 100 ? { zoom: zoomLevel / 100 } : {}),
              } as React.CSSProperties}
            >
              <thead>
                <tr>
                  <th
                    className={`awm-print-hide sticky left-0 top-0 z-40 border border-[#D2D0CE] bg-[#f1eaf0] px-2 py-1 text-xs text-[#FFFFFF] shadow-sm ${printPreview ? "hidden" : ""}`}
                    style={{
                      width: ROW_HEADER_WIDTH,
                      minWidth: ROW_HEADER_WIDTH,
                      height: HEADER_HEIGHT,
                      ...(viewport.scrollLeft > 0 ? headerColShadow : {}),
                      ...(viewport.scrollTop > 0 ? headerRowShadow : {}),
                    }}
                  ></th>



                  {columns
                    .filter((c) => {
                      if (hiddenCols.has(c)) return false; // ⬅️ নতুন: হাইড করা কলাম রেন্ডার হবে না
                      if (!virtualizeCols) return true;
                      return c < sheet.frozenCols || (c >= visibleColRange.start && c <= visibleColRange.end);
                    })
                    .map((c) => {
                      // স্ক্রল-spacer (-1 বাম, -2 ডান): ফাঁকা হেডার সেল, শুধু জায়গা ধরে রাখে
                      if (c < 0) {
                        const spacerW = c === -1 ? colSpacerWidths.left : colSpacerWidths.right;
                        return (
                          <th
                            key={`col-spacer-${c}`}
                            className="awm-print-hide"
                            style={{
                              width: spacerW,
                              minWidth: spacerW,
                              maxWidth: spacerW,
                              height: HEADER_HEIGHT,
                              padding: 0,
                              border: "none",
                              position: "sticky",
                              top: 0,
                              zIndex: 25,
                              backgroundColor: "#014E00",
                            }}
                          />
                        );
                      }
                      const frozen = c < sheet.frozenCols;
                      const colMarked = c >= Math.min(selection.c1, selection.c2) && c <= Math.max(selection.c1, selection.c2);

                      return (
                        <th
                          key={c}
                          data-col-header={c}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            e.preventDefault();
                            if (e.ctrlKey || e.metaKey) {
                              draggingHeader.current = null;
                              setCtrlSelectedCols((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
                              return;
                            }
                            setCtrlSelectedRows([]);
                            setCtrlSelectedCols([]);
                            setCtrlSelectedCells([]);
                            draggingHeader.current = "col";
                            selectEntireColumn(c);
                          }}
                          onClick={() => selectEntireColumn(c)}
                          onContextMenu={(e) => {
                            // ডিফল্ট ব্রাউজার রাইট-ক্লিক মেনু বন্ধ করে, প্রথমে পুরো কলামটি সিলেক্ট করা হচ্ছে
                            e.preventDefault();
                            e.stopPropagation();
                            selectEntireColumn(c);
                            setColumnContextMenu({ x: e.clientX, y: e.clientY, col: c });
                          }}
                          className={`awm-print-hide relative cursor-default border border-[#D2D0CE] px-2 py-1 text-xs font-bold text-[#FFFFFF] shadow-sm ${printPreview ? "hidden" : ""}`}
                          style={{

                            width: sheet.colWidths[c] || DEFAULT_COL_WIDTH,
                            minWidth: sheet.colWidths[c] || DEFAULT_COL_WIDTH,
                            height: HEADER_HEIGHT,
                            position: "sticky",
                            top: 0,
                            left: frozen ? leftOffset(c) : undefined,
                            zIndex: frozen ? 35 : 25,
                            backgroundColor: colMarked ? "#E3A200" : "#014E00",
                            color: colMarked ? "#013706" : "#F8D150",
                            // ⬅️ সিলেক্ট করা কলাম হেডার এখন গাঢ় নীল (আগে ছিল সবুজ #107C10)
                            ...(viewport.scrollTop > 0 ? headerRowShadow : {}),
                          }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{colToLetter(c)}</span>

                            {sheet.filters[c] && <Icons.Filter size={11} className="text-white" />}

                            {(autoFilterIsEnabled || !!sheet.filters[c]) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openAutoFilterMenu(c, e);
                                }}
                                className={`ml-1 flex h-5 w-5 items-center justify-center rounded border border-white/40 transition hover:bg-white/20 ${sheet.filters[c] ? "bg-white/25" : "bg-transparent"
                                  }`}
                                title={`AutoFilter ${colToLetter(c)}`}
                                aria-label={`AutoFilter ${colToLetter(c)}`}
                              >
                                <Icons.ChevronDown size={12} />
                              </button>
                            )}
                          </div>

                          <span
                            onMouseDown={(e) => {
                              e.preventDefault();
                              resizeColumn(c, e.clientX);
                            }}
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#FFFFFF]"
                          />
                          <span onMouseDown={(e) => { e.preventDefault(); resizeColumn(c, e.clientX); }} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#FFFFFF]" />
                          {sheet.frozenCols > 0 && c === sheet.frozenCols - 1 && (
                            <span className="pointer-events-none absolute right-0 top-0 z-40 h-full w-0.75 bg-[#107C10]" />
                          )}
                        </th>

                      );
                    })}



                </tr>
              </thead>
              <tbody>
                {virtualizeRows && topSpacerHeight > 0 && (
                  <tr style={{ height: topSpacerHeight }}>
                    <td colSpan={sheet.gridCols + 1} style={{ padding: 0, border: "none" }} />
                  </tr>
                )}
                {/* Row render helpers read refs without mutating them. */}
                {renderRows.map((r) => {
                  if (hiddenRows.has(r)) return null;
                  if (virtualizeRows && r >= sheet.frozenRows && (r < visibleRowRange.start || r > visibleRowRange.end)) return null;
                  const isGroupHeader = sheet.groups.find((g) => g.start === r);
                  const rowFrozen = r < sheet.frozenRows;
                  const rowMarked = r >= Math.min(selection.r1, selection.r2) && r <= Math.max(selection.r1, selection.r2);
                  const rowH = sheet.rowHeights[r] || DEFAULT_ROW_HEIGHT;
                  return (


                    <tr key={r} style={{ height: rowH }}>
                      <td
                        data-row-header={r}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          if (e.ctrlKey || e.metaKey) {
                            draggingHeader.current = null;
                            setCtrlSelectedRows((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
                            return;
                          }
                          setCtrlSelectedRows([]);
                          setCtrlSelectedCols([]);
                          setCtrlSelectedCells([]);
                          draggingHeader.current = "row";
                          selectEntireRow(r);
                        }}
                        onClick={() => selectEntireRow(r)}
                        onContextMenu={(e) => {
                          // ডিফল্ট ব্রাউজার রাইট-ক্লিক মেনু বন্ধ করে, প্রথমে পুরো রোটি সিলেক্ট করা হচ্ছে
                          e.preventDefault();
                          e.stopPropagation();
                          selectEntireRow(r);
                          setRowContextMenu({ x: e.clientX, y: e.clientY, row: r });
                        }}
                        className={`awm-print-hide relative cursor-default border border-[#D2D0CE] px-2 py-1 text-center text-xs text-[#FFFFFF] shadow-sm ${printPreview ? "hidden" : ""}`}
                        style={{
                          position: "sticky",
                          left: 0,
                          top: rowFrozen ? topOffset(r) : undefined,
                          zIndex: rowFrozen ? 32 : 20,
                          height: sheet.rowHeights[r] || DEFAULT_ROW_HEIGHT,
                          backgroundColor: rowMarked ? "#E3A200" : "#014E00",
                          color: rowMarked ? "#013706" : "#F8D150",
                          // ⬅️ কলামের সাথে মিলিয়ে রো হেডারও নীল করা হলো
                          ...(viewport.scrollLeft > 0 ? headerColShadow : {}),
                        }}
                      >

                        <div className="flex items-center justify-center gap-1">
                          {isGroupHeader && (
                            <button
                              onClick={() => toggleGroupCollapse(isGroupHeader.id)}
                              className="text-[#FFFFFF] font-bold"
                            >
                              {isGroupHeader.collapsed ? "▸" : "▾"}
                            </button>
                          )}
                          {r + 1}
                        </div>
                        <span
                          onMouseDown={(e) => {
                            e.preventDefault();
                            resizeRow(r, e.clientY);
                          }}
                          className="absolute bottom-0 left-0 h-1 w-full cursor-row-resize hover:bg-[#FFFFFF]"
                        />
                        <span
                          onMouseDown={(e) => {
                            e.preventDefault();
                            resizeRow(r, e.clientY);
                          }}
                          className="absolute bottom-0 left-0 h-1 w-full cursor-row-resize hover:bg-[#FFFFFF]"
                        />
                        {sheet.frozenRows > 0 && r === sheet.frozenRows - 1 && (
                          <span className="pointer-events-none absolute bottom-0 left-0 z-40 h-0.75 w-full bg-[#107C10]" />
                        )}
                      </td>

                      {columns
                        .filter((c) => {
                          if (hiddenCols.has(c)) return false; // ⬅️ নতুন: হাইড করা কলাম রেন্ডার হবে না
                          if (!virtualizeCols) return true;
                          return c < sheet.frozenCols || (c >= visibleColRange.start && c <= visibleColRange.end);
                        })
                        .map((c) => {
                          const key = cellKey(r, c);
                          const data = sheet.cells[key];
                          // স্ক্রল-spacer (-1 বাম, -2 ডান): ফাঁকা সেল, শুধু জায়গা ধরে রাখে
                          if (c < 0) {
                            const spacerW = c === -1 ? colSpacerWidths.left : colSpacerWidths.right;
                            return (
                              <td
                                key={`spacer-${r}-${c}`}
                                className="awm-print-hide"
                                style={{
                                  width: spacerW,
                                  minWidth: spacerW,
                                  maxWidth: spacerW,
                                  height: sheet.rowHeights[r] || DEFAULT_ROW_HEIGHT,
                                  padding: 0,
                                  border: "none",
                                }}
                              />
                            );
                          }
                          if (data?.mergedInto) return null;

                          const style = data?.style;
                          const isEditing = editingKey === key;
                          const selected = isSelected(r, c);
                          const isActive = activeCell === key;
                          const colFrozen = c < sheet.frozenCols;
                          const isFillCorner =
                            r === Math.max(selection.r1, selection.r2) &&
                            c === Math.max(selection.c1, selection.c2);

                          const inFillPreview =
                            !!fillPreview &&
                            !selected &&
                            r >= Math.min(fillPreview.r1, fillPreview.r2) &&
                            r <= Math.max(fillPreview.r1, fillPreview.r2) &&
                            c >= Math.min(fillPreview.c1, fillPreview.c2) &&
                            c <= Math.max(fillPreview.c1, fillPreview.c2);

                          const cellRawResult = getCellValue(key);
                          const cfMatch = cfRulesParsed.find(
                            ({ rule, nr }) =>
                              nr &&
                              r >= nr.r1 && r <= nr.r2 &&
                              c >= nr.c1 && c <= nr.c2 &&
                              evaluateConditionalRule(rule, cellRawResult)
                          )?.rule;
                          const displayText = formatDisplayValue(cellRawResult, style);

                          const isErrorValue =
                            typeof cellRawResult === "string" &&
                            !!data?.value?.startsWith("=") &&
                            FORMULA_ERRORS.has(cellRawResult);
                          const isTraced = !!traceHighlight?.has(key);

                          // সেলের নিজস্ব (base) ব্যাকগ্রাউন্ড হিসাব
                          const baseCellBg = isErrorValue
                            ? "#FDE7E9"
                            : cfMatch?.bg || style?.bg || (colFrozen || rowFrozen ? "#F3F2F1" : "#FFFFFF");

                          // Active/Selected হলে বেস কালারের উপর নীল টিন্ট ব্লেন্ড করা হচ্ছে
                          let finalCellBg = baseCellBg;
                          if (isActive) {
                            finalCellBg = blendWithAlpha(baseCellBg, "#106EBE", 0.22);
                          } else if (selected) {
                            finalCellBg = blendWithAlpha(baseCellBg, "#106EBE", 0.12);
                          }
                          return (

                            <td
                              key={key}
                              ref={(el) => {
                                if (el) cellRefs.current.set(key, el);
                                else cellRefs.current.delete(key);
                              }}
                              rowSpan={data?.rowSpan}
                              colSpan={data?.colSpan}
                              data-row={r}
                              data-col={c}
                              onMouseDown={(e) => handleMouseDown(r, c, e)}

                              onMouseEnter={() => handleMouseEnter(r, c)}
                              onDoubleClick={() => startEditing(key)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                if (!isSelected(r, c)) {
                                  setActiveCell(key);
                                  setSelection({ r1: r, c1: c, r2: r, c2: c });
                                }
                                setContextMenu({ x: e.clientX, y: e.clientY, row: r, col: c });
                              }}
                              onKeyDown={(e) => handleKeyDown(e, r, c)}
                              tabIndex={0}
                              className={`relative px-2 py-1 outline-none transition-colors ${showGridLines ? "border" : "border border-transparent"
                                } ${isActive
                                  ? "border-[#0057B7] border-2 z-10"
                                  : selected
                                    ? "border-[#5B9BD5]"
                                    : "border-[#dfd9df]"
                                } ${inFillPreview ? "outline-2 outline-dashed outline-[#15803D]" : ""
                                } ${isTraced ? "ring-2 ring-inset ring-[#f006ec]" : ""
                                }`}

                              style={{
                                width: sheet.colWidths[c] || DEFAULT_COL_WIDTH,
                                minWidth: sheet.colWidths[c] || DEFAULT_COL_WIDTH,
                                maxWidth: sheet.colWidths[c] || DEFAULT_COL_WIDTH,
                                height: rowH,
                                minHeight: rowH,
                                backgroundColor: finalCellBg, // ⬅️ এখন blend করা কালার থেকে আসছে (ধাপ ২-এ হিসাব করা)
                                color: isErrorValue ? "#A80000" : cfMatch?.color || style?.color || "#000000",
                                fontFamily: style?.fontFamily,
                                fontSize: style?.fontSize,
                                fontWeight: style?.bold ? 700 : 400,
                                fontStyle: style?.italic ? "italic" : "normal",
                                textDecoration: style?.underline ? "underline" : "none",
                                textAlign: style?.align || (style?.textDirection === "rtl" ? "right" : "left"),
                                verticalAlign: style?.verticalAlign || "top",
                                direction: style?.textDirection || "ltr",
                                unicodeBidi: "isolate",
                                paddingLeft: style?.indent ? 8 + style.indent * 12 : undefined,
                                borderTopWidth: style?.borders?.top ? style?.borderWidth ?? 2 : undefined,
                                borderRightWidth: style?.borders?.right ? style?.borderWidth ?? 2 : undefined,
                                borderBottomWidth: style?.borders?.bottom ? style?.borderWidth ?? 2 : undefined,
                                borderLeftWidth: style?.borders?.left ? style?.borderWidth ?? 2 : undefined,
                                borderStyle: style?.borderStyle,
                                borderColor: style?.borders ? style?.borderColor || "#000000" : undefined,
                                position: colFrozen || rowFrozen ? "sticky" : "relative", // ⬅️ non-frozen সেলে relative রাখা হলো, যাতে এডিটিং টেক্সটএরিয়া absolute হয়ে বাইরে overflow করতে পারে
                                left: colFrozen ? leftOffset(c) : undefined,
                                top: rowFrozen ? topOffset(r) : undefined,
                                zIndex: colFrozen && rowFrozen ? 31 : colFrozen ? 22 : rowFrozen ? 21 : undefined,
                              }}
                            >
                              {isFillCorner && (
                                <span
                                  onMouseDown={startFillDrag}
                                  className="absolute -bottom-0.75 -right-0.75 z-20 h-2 w-2 cursor-crosshair border border-white bg-[#107C10]"

                                />
                              )}

                              {sheet.frozenCols > 0 && c === sheet.frozenCols - 1 && (
                                <span
                                  className="pointer-events-none absolute right-0 top-0 z-30 h-full w-0.75 bg-[#107C10]"
                                />
                              )}
                              {sheet.frozenRows > 0 && r === sheet.frozenRows - 1 && (
                                <span
                                  className="pointer-events-none absolute bottom-0 left-0 z-30 h-0.75 w-full bg-[#107C10]"
                                />
                              )}

                              {data?.comment && (
                                <span
                                  title={data.comment}
                                  className="absolute right-0 top-0 h-2 w-2 rounded-full bg-amber-500"
                                />
                              )}
                              {data?.comment && (
                                <span
                                  title={data.comment}
                                  className="absolute right-0 top-0 h-2 w-2 rounded-full bg-amber-500"
                                />
                              )}

                              {data?.hyperlink && !isEditing && (
                                <button
                                  type="button"
                                  onClick={(e) => openShareMenu(data.hyperlink as string, data.value || (data.hyperlink as string), e)}
                                  title="Share this link"
                                  className="absolute bottom-0 right-0 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-[#106EBE] text-white shadow hover:bg-[#005A9E]"
                                >
                                  <Icons.Share2 size={10} />
                                </button>
                              )}
                              {data?.sparkline &&
                                (() => {
                                  const nr = normalizeRange(data.sparkline as string);
                                  if (!nr) return null;
                                  const vals: number[] = [];
                                  for (let rr = nr.r1; rr <= nr.r2; rr++) {
                                    for (let cc = nr.c1; cc <= nr.c2; cc++) {
                                      const v = getCellValue(cellKey(rr, cc));
                                      vals.push(typeof v === "number" ? v : parseFloat(String(v)) || 0);
                                    }
                                  }
                                  if (vals.length < 2) return null;
                                  const maxV = Math.max(...vals);
                                  const minV = Math.min(...vals);
                                  const span = maxV - minV || 1;
                                  const w = 60;
                                  const h = 16;
                                  const points = vals
                                    .map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - minV) / span) * h}`)
                                    .join(" ");
                                  return (
                                    <svg
                                      width={w}
                                      height={h}
                                      className="pointer-events-none absolute bottom-0 right-0 opacity-80"
                                      viewBox={`0 0 ${w} ${h}`}
                                    >
                                      <polyline fill="none" stroke="#107C10" strokeWidth="1.5" points={points} />
                                    </svg>
                                  );
                                })()}

                              {isEditing ? (
                                <textarea
                                  ref={editorRef}
                                  autoFocus
                                  spellCheck
                                  dir={style?.textDirection || "ltr"}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => commitEdit("none")}
                                  rows={1} // ⬅️ শুধু ১ লাইনের height, নিচে র‍্যাপ করে বাড়বে না
                                  className="resize-none bg-transparent outline-none text-[#000000]"
                                  style={{
                                    // ⬇️ Excel/LibreOffice-এর মতো বিহেভিয়ার:
                                    //    টেক্সট লাইন ভাঙবে না (nowrap), সেলের বাইরেও দেখা যাবে (overflow visible)
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    height: "100%",
                                    minWidth: "100%",
                                    width: editWidth ? `${editWidth}px` : "100%", // ⬅️ JS দিয়ে মাপা প্রকৃত টেক্সট width
                                    maxWidth: "none",
                                    whiteSpace: "nowrap", // ⬅️ লাইন ভাঙবে না, একটানা ডানে চলে যাবে
                                    overflow: "hidden", // ⬅️ বক্স নিজেই কনটেন্ট অনুযায়ী চওড়া হয়ে যায় বলে ভেতরে স্ক্রলবার লাগবে না
                                    zIndex: 60, // ⬅️ পাশের সেলগুলোর ওপরে ভেসে থাকবে
                                    padding: "4px 8px", // td-এর px-2 py-1 এর সমান প্যাডিং বজায় রাখা হলো
                                    boxSizing: "border-box",
                                    backgroundColor: isErrorValue ? "#FDE7E9" : cfMatch?.bg || style?.bg || "#FFFFFF", // ⬅️ নিচের সেলের কনটেন্ট যেন দেখা না যায়, তাই সেলের কালারেই ব্যাকগ্রাউন্ড
                                    direction: style?.textDirection || "ltr",
                                    unicodeBidi: "plaintext",
                                    textAlign: style?.align || (style?.textDirection === "rtl" ? "right" : "left"),
                                  }}
                                />
                              ) : data?.image ? (

                                <Image src={data.image} alt="" width={800} height={600} unoptimized className="max-h-full max-w-full object-contain" style={{ maxHeight: virtualizeRows ? rowH - 10 : undefined }} />



                              ) : data?.hyperlink ? (
                                <a
                                  href={sanitizeUrl(data.hyperlink) || undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  dir={style?.textDirection || "ltr"}
                                  className="text-[#106EBE] underline"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    direction: style?.textDirection || "ltr",
                                    unicodeBidi: "plaintext",
                                  }}
                                >
                                  {displayText || data.hyperlink}
                                </a>

                              ) : data?.validation ? (
                                <select
                                  dir={style?.textDirection || "ltr"}
                                  value={data.value}
                                  onChange={(e) => setCellValue(key, e.target.value)}
                                  className="w-full bg-transparent outline-none text-[#000000]"
                                  style={{
                                    direction: style?.textDirection || "ltr",
                                    textAlign: style?.align || (style?.textDirection === "rtl" ? "right" : "left"),
                                  }}
                                >
                                  <option value="" />
                                  {data.validation.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  dir={style?.textDirection || "ltr"}
                                  className={`block h-full overflow-hidden wrap-break-word leading-snug ${style?.wrap === false ? "whitespace-nowrap" : "whitespace-pre-wrap"
                                    }`}
                                  style={{
                                    direction: style?.textDirection || "ltr",
                                    unicodeBidi: "plaintext",
                                    textAlign: style?.align || (style?.textDirection === "rtl" ? "right" : "left"),
                                    maxHeight: virtualizeRows ? rowH - 10 : undefined,
                                  }}
                                >
                                  {displayText}

                                </span>
                              )}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
                {virtualizeRows && bottomSpacerHeight > 0 && (
                  <tr style={{ height: bottomSpacerHeight }}>
                    <td colSpan={sheet.gridCols + 1} style={{ padding: 0, border: "none" }} />
                  </tr>
                )}
              </tbody>
            </table>
            {showDrawFunctions && (
              <svg
                tabIndex={0}
                className="absolute left-0 top-0 z-40 outline-none"
                style={{ width: "100%", height: "100%", cursor: activeDrawTool === "select" ? "default" : "crosshair" }}
                onPointerDown={handleDrawPointerDown}
                onPointerMove={handleDrawPointerMove}
                onPointerUp={handleDrawPointerUp}
                onKeyDown={(e) => { if (e.key === "Delete" || e.key === "Backspace") deleteSelectedDrawShape(); }}
              >


                {(sheet.drawings || []).map((d) => (
                  <DrawShapeRenderer
                    key={d.id}
                    shape={d}
                    allShapes={sheet.drawings || []}
                    selected={d.id === selectedDrawId}
                    onSelect={() => { setActiveDrawTool("select"); setSelectedDrawId(d.id); }}
                    onResizeStart={(handle, e) => startResizeDrag(d.id, handle, e)}
                    onRotateStart={(e) => startRotateDrag(d.id, e)}
                  />
                ))}
                {drawPreview && <DrawShapeRenderer shape={drawPreview} allShapes={sheet.drawings || []} selected={false} />}



              </svg>
            )}
          </div>

          {showStatusBar && (
            <div className="flex shrink-0 items-center justify-between border-t border-[#D2D0CE] bg-[#F3F2F1] px-3 py-1 text-xs text-[#3B3A39]">
              <div className="flex items-center gap-4">
                <span>Selected: {selectionStats.count}</span>
                {selectionStats.numericCount > 0 && (
                  <>
                    <span>Count: {selectionStats.numericCount.toLocaleString("en-US")}</span>
                    <span>Sum: {selectionStats.sum.toLocaleString("en-US", { maximumFractionDigits: 10 })}</span>
                    <span>Average: {selectionStats.avg.toLocaleString("en-US", { maximumFractionDigits: 6 })}</span>
                    <span>Min: {selectionStats.min.toLocaleString("en-US", { maximumFractionDigits: 10 })}</span>
                    <span>Max: {selectionStats.max.toLocaleString("en-US", { maximumFractionDigits: 10 })}</span>
                    {selectionStats.truncated && (
                      <span className="text-[#A4262C]" title="Selection is too large; totals use only the first part of the selection.">
                        (partial)
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {userExchangeRatesActive && (
                  <span className="rounded bg-[#E1F0E5] px-2 py-0.5 text-[11px] text-[#0F5132]" title="Exchange Rates শিটে দেওয়া রেট ব্যবহৃত হচ্ছে।">
                    Exchange Rates: sheet রেট ব্যবহৃত হচ্ছে
                  </span>
                )}
                <select
                  className="rounded border border-[#D2D0CE] bg-white px-1 py-0.5 text-[11px]"
                  value={displayGrouping}
                  onChange={(event) => {
                    const next = event.target.value as DisplayGrouping;
                    setDisplayGrouping(next);
                    DISPLAY_SETTINGS.grouping = next;
                  }}
                  title="সংখ্যার গ্রুপিং: ১২,৫০,০০০ (BD) বা 1,250,000 (Western)"
                >
                  <option value="western">1,250,000</option>
                  <option value="bd">১২,৫০,০০০</option>
                </select>
                <select
                  className="rounded border border-[#D2D0CE] bg-white px-1 py-0.5 text-[11px]"
                  value={displayDigits}
                  onChange={(event) => {
                    const next = event.target.value as DisplayDigits;
                    setDisplayDigits(next);
                    DISPLAY_SETTINGS.digits = next;
                  }}
                  title="ফলাফলের অঙ্ক: English, বাংলা বা আরবি"
                >
                  <option value="latin">123</option>
                  <option value="bengali">১২৩</option>
                  <option value="arabic">١٢৩</option>
                </select>
                <button onClick={toggleDarkMode} className="rounded-md border border-[#D2D0CE] bg-white px-2 py-0.5 hover:border-[#106EBE]" title="Toggle Dark Mode">
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </button>
                <button onClick={zoomOut} className="rounded-md border border-[#D2D0CE] bg-white px-2 py-0.5 hover:border-[#106EBE]" title="Zoom Out">-</button>
                <button onClick={resetZoom} className="rounded-md border border-[#D2D0CE] bg-white px-2 py-0.5 hover:border-[#106EBE]" title="Reset Zoom">{zoomLevel}%</button>
                <button onClick={zoomIn} className="rounded-md border border-[#D2D0CE] bg-white px-2 py-0.5 hover:border-[#106EBE]" title="Zoom In">+</button>
              </div>
            </div>
          )}

          {/* Embedded Charts Area */}
          {sheet.charts.length > 0 && (
            <div className="bg-[#F3F2F1] p-4 grid max-h-[40vh] min-h-0 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2 border-t border-[#D2D0CE] shrink-0 awm-premium-scrollbar">
              {/* Chart render callbacks are invoked by user interaction only. */}
              {sheet.charts.map((chart) => (
                <div
                  key={chart.id}
                  className="rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold text-[#000000]">
                      {chart.title}
                    </h3>

                    <button
                      onClick={() =>
                        updateSheet((s) => ({
                          charts: s.charts.filter((c) => c.id !== chart.id),
                        }))
                      }
                      className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs hover:bg-[#F3F2F1]"
                    >
                      Remove
                    </button>
                  </div>

                  <ChartView
                    type={chart.type}
                    config={chart}
                    data={getChartData(chart.range)}
                  />
                </div>
              ))}
            </div>
          )}
          {/* Sheet Tabs */}
          <div
            className="flex items-center gap-1 border-t border-[#D2D0CE] bg-[#F3F2F1] px-2 py-1 shrink-0 overflow-x-auto">
            <button onClick={addSheet} className="rounded-md border border-[#D2D0CE] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold hover:bg-[#E1DFDD] shadow-sm">+</button>
            {sheets.map((s, i) => (
              <button key={s.id} onClick={() => { setActiveSheetIndex(i); setActiveCell("A1"); setSelection({ r1: 0, c1: 0, r2: 0, c2: 0 }); }} className={`rounded-t-lg border px-4 py-1.5 text-xs font-bold shadow-sm min-w-20px ${i === activeSheetIndex ? "border-[#106EBE] bg-[#FFFFFF] text-[#106EBE] border-b-2" : "border-[#D2D0CE] bg-[#E1DFDD] text-[#000000] hover:bg-[#FFFFFF]"}`}>
                {s.name}
              </button>
            ))}
            <button onClick={renameSheet} className="rounded-md border border-[#D2D0CE] bg-white px-2 py-1.5 text-xs font-bold hover:border-[#106EBE]">Rename</button>
            <button onClick={duplicateSheet} className="rounded-md border border-[#D2D0CE] bg-white px-2 py-1.5 text-xs font-bold hover:border-[#106EBE]">Duplicate</button>
            <button onClick={deleteSheet} className="rounded-md border border-[#D2D0CE] bg-white px-2 py-1.5 text-xs font-bold hover:border-red-500 hover:text-red-600">Delete</button>
          </div>
        </div>

        {/* LibreOffice Calc Style Right Sidebar */}
        {rightSidebarOpen && (
          <aside
            className={`${rightSidebarUndocked ? "fixed right-5 top-28 z-9000 h-[72vh] rounded-2xl shadow-2xl" : "relative"} flex shrink-0 border-l border-[#C8C6C4] bg-linear-to-b from-[#F8F9FA] to-[#ECEFF3]`}
            style={{ width: sidebarWidth }}
          >
            <div
              onPointerDown={startSidebarResize}
              title="Drag to resize sidebar"
              className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-ew-resize bg-transparent hover:bg-[#106EBE]/40"
            />
            <div className="flex w-12 flex-col items-center gap-1 border-r border-[#D2D0CE] bg-[#F3F2F1] py-2">
              {sidebarPanels.map((panel) => {
                const Icon = panel.icon;
                const active = activeSidebarPanel === panel.key;
                return (
                  <button
                    key={panel.key}
                    onClick={() => setActiveSidebarPanel(panel.key)}
                    title={panel.label}
                    aria-label={panel.label}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30 ${active ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE] shadow-sm" : "border-transparent text-[#605E5C] hover:border-[#C8C6C4] hover:bg-white hover:text-[#106EBE]"}`}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>

            <div
              className="flex min-w-0 flex-1 flex-col"
              dir={rtlEnabled ? "rtl" : "ltr"}
              lang={appLocale}
            >
              <div className="flex items-center justify-between border-b border-[#D2D0CE] px-3 py-2">
                <h2 className="text-sm font-black text-[#106EBE]">
                  {sidebarPanels.find((p) => p.key === activeSidebarPanel)?.label}
                </h2>
                <button onClick={() => setRightSidebarOpen(false)} className="rounded-md p-1 text-[#605E5C] hover:bg-[#E1DFDD]" title="Collapse Sidebar" aria-label="Collapse Sidebar">
                  <Icons.ChevronRight size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-3 awm-premium-scrollbar">
                {activeSidebarPanel === "properties" && (
                  <div className="space-y-3">
                    <CollapsibleSection title="Cell" sectionKey="cell" collapsed={!!collapsedSections.cell} onToggle={toggleSection}>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <InfoPill label="Active" value={activeCell} />
                        <InfoPill label="Range" value={selectedRangeText} />
                        <InfoPill label="Rows" value={String(sheet.gridRows)} />
                        <InfoPill label="Cols" value={String(sheet.gridCols)} />
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Character" sectionKey="character" collapsed={!!collapsedSections.character} onToggle={toggleSection}>
                      <div className="space-y-2">
                        <AdvancedFontPicker
                          value={activeCellStyle.fontFamily || "Inter"}
                          onChange={(fontFamily) => applyStyleToSelection({ fontFamily })}
                        />
                        <select value={activeCellStyle.fontSize || 12} onChange={(e) => applyStyleToSelection({ fontSize: parseInt(e.target.value, 10) })} className="w-full rounded-md border border-[#D2D0CE] bg-white px-2 py-2 text-xs outline-none focus:border-[#106EBE]">
                          {FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
                        </select>
                        <div className="grid grid-cols-3 gap-2">
                          <ToolBtn onClick={() => toggleStyle("bold")} active={!!activeCellStyle.bold}>Bold</ToolBtn>
                          <ToolBtn onClick={() => toggleStyle("italic")} active={!!activeCellStyle.italic}>Italic</ToolBtn>
                          <ToolBtn onClick={() => toggleStyle("underline")} active={!!activeCellStyle.underline}>Under</ToolBtn>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <AdvancedColorDropdown label="Font Color" icon={Icons.CaseSensitive} value={activeCellStyle.color || "#000000"} storageKey="awm_excel_recent_colors_font" onChange={(color) => applyStyleToSelection({ color })} />
                          <AdvancedColorDropdown label="Background" icon={Icons.PaintBucket} value={activeCellStyle.bg || "#FFFFFF"} allowNoFill storageKey="awm_excel_recent_colors_bg" onChange={(bg) => applyStyleToSelection({ bg: bg === "transparent" ? undefined : bg })} />
                        </div>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Alignment" sectionKey="alignment" collapsed={!!collapsedSections.alignment} onToggle={toggleSection}>
                      <div className="grid grid-cols-4 gap-2">
                        <ToolBtn onClick={() => applyStyleToSelection({ align: "left" })} active={activeCellStyle.align === "left"}><Icons.AlignLeft size={14} /></ToolBtn>
                        <ToolBtn onClick={() => applyStyleToSelection({ align: "center" })} active={activeCellStyle.align === "center"}><Icons.AlignCenter size={14} /></ToolBtn>
                        <ToolBtn onClick={() => applyStyleToSelection({ align: "right" })} active={activeCellStyle.align === "right"}><Icons.AlignRight size={14} /></ToolBtn>
                        <ToolBtn onClick={() => applyStyleToSelection({ wrap: !activeCellStyle.wrap })} active={!!activeCellStyle.wrap}><Icons.WrapText size={14} /></ToolBtn>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Page" sectionKey="page" collapsed={!!collapsedSections.page} onToggle={toggleSection}>
                      <div className="space-y-2">
                        <select value={pageSize} onChange={(e) => setPageSize(e.target.value as "A4" | "Letter" | "Legal")} className="w-full rounded-md border border-[#D2D0CE] bg-white px-2 py-2 text-xs outline-none focus:border-[#106EBE]">
                          <option value="A4">A4</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                        </select>
                        <select value={orientation} onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")} className="w-full rounded-md border border-[#D2D0CE] bg-white px-2 py-2 text-xs outline-none focus:border-[#106EBE]">
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>
                    </CollapsibleSection>
                  </div>
                )}

                {activeSidebarPanel === "styles" && (
                  <div className="space-y-3">
                    <SidebarStyleButton label="Default" onClick={() => applySidebarStylePreset({ bold: false, italic: false, underline: false, color: "#000000", bg: "#FFFFFF", align: "left" }, "Default")} />
                    <SidebarStyleButton label="Heading 1" className="bg-[#106EBE] text-white" onClick={() => applySidebarStylePreset({ bold: true, fontSize: 20, color: "#FFFFFF", bg: "#106EBE" }, "Heading 1")} />
                    <SidebarStyleButton label="Heading 2" className="bg-[#E5F1FB] text-[#106EBE]" onClick={() => applySidebarStylePreset({ bold: true, fontSize: 16, color: "#106EBE", bg: "#E5F1FB" }, "Heading 2")} />
                    <SidebarStyleButton label="Good" className="bg-green-50 text-green-700" onClick={() => applySidebarStylePreset({ bold: true, color: "#107C10", bg: "#DFF6DD" }, "Good")} />
                    <SidebarStyleButton label="Bad" className="bg-red-50 text-red-700" onClick={() => applySidebarStylePreset({ bold: true, color: "#A4262C", bg: "#FDE7E9" }, "Bad")} />
                    <SidebarStyleButton label="Neutral" className="bg-gray-100 text-gray-700" onClick={() => applySidebarStylePreset({ color: "#323130", bg: "#F3F2F1" }, "Neutral")} />
                    <SidebarStyleButton label="Warning" className="bg-amber-50 text-amber-700" onClick={() => applySidebarStylePreset({ bold: true, color: "#8A6D00", bg: "#FFF4CE" }, "Warning")} />
                  </div>
                )}

                {activeSidebarPanel === "gallery" && (
                  <div className="grid grid-cols-4 gap-2">
                    {GALLERY_STAMPS.map((stamp) => (
                      <button key={stamp} onClick={() => { setCellValue(activeCell, stamp); showToast("Gallery item inserted."); }} className="flex h-14 items-center justify-center rounded-xl border border-[#D2D0CE] bg-white text-2xl shadow-sm transition-all hover:border-[#106EBE] hover:shadow-md">
                        {stamp}
                      </button>
                    ))}
                    {SPECIAL_CHARACTERS.map((ch) => (
                      <button key={ch} onClick={() => { setCellValue(activeCell, `${getRawValue(activeCell)}${ch}`); showToast("Special character inserted."); }} className="flex h-12 items-center justify-center rounded-xl border border-[#D2D0CE] bg-white text-lg shadow-sm transition-all hover:border-[#106EBE] hover:shadow-md">
                        {ch}
                      </button>
                    ))}
                  </div>
                )}

                {activeSidebarPanel === "navigator" && (
                  <div className="space-y-3">
                    <SidebarSection title="Sheets">
                      <div className="space-y-1">
                        {sheets.map((s, i) => (
                          <button key={s.id} onClick={() => { setActiveSheetIndex(i); setActiveCell("A1"); setSelection({ r1: 0, c1: 0, r2: 0, c2: 0 }); }} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold ${i === activeSheetIndex ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#D2D0CE] bg-white hover:border-[#106EBE]"}`}>
                            <span>{s.name}</span>
                            <span>{s.gridRows}×{s.gridCols}</span>
                          </button>
                        ))}
                      </div>
                    </SidebarSection>
                    <SidebarSection title="Objects">
                      <button onClick={openChartWizard} className="w-full rounded-lg border border-[#D2D0CE] bg-white px-3 py-2 text-left text-xs hover:border-[#106EBE]">Charts: {sheet.charts.length}</button>
                      <button onClick={groupSelection} className="mt-2 w-full rounded-lg border border-[#D2D0CE] bg-white px-3 py-2 text-left text-xs hover:border-[#106EBE]">Group selected rows</button>
                      <button onClick={ungroupSelection} className="mt-2 w-full rounded-lg border border-[#D2D0CE] bg-white px-3 py-2 text-left text-xs hover:border-[#106EBE]">Ungroup selected rows</button>                      <button onClick={groupColumnsSelection} className="mt-2 w-full rounded-lg border border-[#D2D0CE] bg-white px-3 py-2 text-left text-xs hover:border-[#106EBE]">Group selected columns</button>
                      <button onClick={ungroupColumnsSelection} className="mt-2 w-full rounded-lg border border-[#D2D0CE] bg-white px-3 py-2 text-left text-xs hover:border-[#106EBE]">Ungroup selected columns</button>
                      <button onClick={collapseAllGroups} className="mt-2 w-full rounded-lg border border-[#D2D0CE] bg-white px-3 py-2 text-left text-xs hover:border-[#106EBE]">Collapse all groups</button>
                      <button onClick={expandAllGroups} className="mt-2 w-full rounded-lg border border-[#D2D0CE] bg-white px-3 py-2 text-left text-xs hover:border-[#106EBE]">Expand all groups</button>
                    </SidebarSection>
                  </div>
                )}

                {activeSidebarPanel === "functions" && (
                  <div className="space-y-2">
                    {FUNCTION_LIST.map((fn) => (
                      <button key={fn.name} onClick={() => { startEditing(activeCell, `=${fn.usage}`); showToast(`${fn.name} inserted.`); }} className="w-full rounded-xl border border-[#D2D0CE] bg-white p-3 text-left shadow-sm transition-all hover:border-[#106EBE] hover:shadow-md">
                        <p className="text-sm font-black text-[#106EBE]">{fn.name}</p>
                        <p className="mt-1 font-mono text-[11px] text-[#605E5C]">{fn.usage}</p>
                        <p className="mt-1 text-[11px] text-[#323130]">{fn.desc}</p>
                      </button>
                    ))}
                  </div>
                )}



                {activeSidebarPanel === "settings" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium mb-2">
                      {t(appLocale, "language")}
                    </label>

                    <select
                      value={appLocale}
                      onChange={(e) => {
                        const next = e.target.value as AppLocale;
                        setAppLocale(next);
                        setRtlEnabled(isRTL(next));
                      }}
                      className="w-full rounded border px-3 py-2"
                    >
                      {Object.entries(LOCALE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <button onClick={() => { setRightSidebarOpen(false); showToast(t(appLocale, "sidebarCollapsed")); }} className="flex w-full items-center gap-2 rounded-xl border border-[#D2D0CE] bg-white px-3 py-3 text-sm font-bold hover:border-[#106EBE]">
                      <Icons.PanelRightClose size={16} /> {t(appLocale, "collapse")}
                    </button>
                    <button onClick={() => { setRightSidebarUndocked(v => !v); showToast(t(appLocale, "sidebarUndockToggled")); }} className="flex w-full items-center gap-2 rounded-xl border border-[#D2D0CE] bg-white px-3 py-3 text-sm font-bold hover:border-[#106EBE]">
                      <Icons.PanelRightOpen size={16} /> {rightSidebarUndocked ? t(appLocale, "dock") : t(appLocale, "undock")}
                    </button>
                    <button onClick={() => { setActiveSidebarPanel("properties"); showToast(t(appLocale, "sidebarCustomized")); }} className="flex w-full items-center gap-2 rounded-xl border border-[#D2D0CE] bg-white px-3 py-3 text-sm font-bold hover:border-[#106EBE]">
                      <Icons.Settings2 size={16} /> {t(appLocale, "customize")}
                    </button>

                    <div className="rounded-xl border border-[#D2D0CE] bg-white p-3 text-xs text-[#605E5C]">
                      The sidebar follows LibreOffice Calc panel order and remains fully functional with collapsible, dockable, and customizable behavior.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {!rightSidebarOpen && (
          <div
            className="relative flex shrink-0"
            onMouseEnter={() => setSidebarHoverPeek(true)}
            onMouseLeave={() => setSidebarHoverPeek(false)}
          >
            <div className="flex w-9 flex-col items-center gap-1 border-l border-[#D2D0CE] bg-[#F3F2F1] py-2">
              <button onClick={() => setRightSidebarOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-md text-[#106EBE] hover:bg-[#E5F1FB]" title="Open Sidebar" aria-label="Open Sidebar">
                <Icons.ChevronLeft size={16} />
              </button>
              <div className="my-1 h-px w-6 bg-[#D2D0CE]" />
              {sidebarPanels.map((panel) => {
                const Icon = panel.icon;
                return (
                  <button
                    key={panel.key}
                    onClick={() => { setActiveSidebarPanel(panel.key); setRightSidebarOpen(true); }}
                    title={panel.label}
                    aria-label={panel.label}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[#605E5C] hover:bg-white hover:text-[#106EBE]"
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>

            {sidebarHoverPeek && (
              <div
                className="absolute right-9 top-0 z-8000 w-65 cursor-pointer rounded-l-xl border border-[#C8C6C4] bg-white p-3 shadow-2xl animate-[awmFadeIn_0.12s_ease-out]"
                onClick={() => setRightSidebarOpen(true)}
              >
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#106EBE]">
                  {sidebarPanels.find((p) => p.key === activeSidebarPanel)?.label}
                </p>
                <p className="text-xs text-[#605E5C]">
                  Click to expand — edit {activeCell}&apos;s properties, styles, gallery items, and more.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
      {autoFilterMenu && autoFilterDraft && (
        <AutoFilterDropdown
          refObject={autoFilterMenuRef}
          x={autoFilterMenu.x}
          y={autoFilterMenu.y}
          columnLabel={colToLetter(autoFilterMenu.col)}
          draft={autoFilterDraft}
          setDraft={setAutoFilterDraft}
          options={getColumnUniqueValues(autoFilterMenu.col)}
          bgColors={getColumnColorOptions(autoFilterMenu.col, "bg")}
          fontColors={getColumnColorOptions(autoFilterMenu.col, "font")}
          onSortAsc={() => {
            sortColumn(autoFilterMenu.col, "asc");
            setAutoFilterMenu(null);
            setAutoFilterDraft(null);
          }}
          onSortDesc={() => {
            sortColumn(autoFilterMenu.col, "desc");
            setAutoFilterMenu(null);
            setAutoFilterDraft(null);
          }}
          onSortByBg={(color) => {
            sortColumnByColor(autoFilterMenu.col, "bg", color);
            setAutoFilterMenu(null);
            setAutoFilterDraft(null);
          }}
          onSortByFont={(color) => {
            sortColumnByColor(autoFilterMenu.col, "font", color);
            setAutoFilterMenu(null);
            setAutoFilterDraft(null);
          }}
          onApply={applyAutoFilterDraft}
          onClear={clearAutoFilterColumn}
          onClose={() => {
            setAutoFilterMenu(null);
            setAutoFilterDraft(null);
          }}
        />
      )}

      {showPredictiveAnalytics && predictiveResult && (
        <Modal
          title="Predictive Analytics"
          onClose={() => setShowPredictiveAnalytics(false)}
        >
          <div className="space-y-4 text-sm text-[#201F1E]">
            <div className="rounded-xl border border-[#D2D0CE] bg-[#F8F9FA] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#605E5C]">
                    Source Range
                  </p>
                  <p className="font-mono text-sm font-bold text-[#106EBE]">
                    {predictiveResult.range}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[#605E5C]">
                    Forecast Periods
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={predictivePeriods}
                    onChange={(e) =>
                      setPredictivePeriods(
                        Math.max(1, Math.min(24, parseInt(e.target.value || "5", 10)))
                      )
                    }
                    className="w-20 rounded-md border border-[#C8C6C4] px-2 py-1 text-xs outline-none focus:border-[#106EBE]"
                  />
                  <button
                    type="button"
                    onClick={refreshPredictiveAnalytics}
                    className="rounded-md bg-[#106EBE] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#005A9E]"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold text-[#323130]">
                {predictiveResult.insight}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <InfoPill label="Count" value={String(predictiveResult.count)} />
              <InfoPill label="Average" value={String(predictiveResult.average)} />
              <InfoPill label="Min" value={String(predictiveResult.min)} />
              <InfoPill label="Max" value={String(predictiveResult.max)} />
              <InfoPill label="Trend" value={predictiveResult.trend.toUpperCase()} />
              <InfoPill label="Slope" value={String(predictiveResult.slope)} />
              <InfoPill label="R²" value={`${(predictiveResult.r2 * 100).toFixed(1)}%`} />
              <InfoPill label="Moving Avg" value={String(predictiveResult.movingAverage)} />
            </div>

            <div className="rounded-xl border border-[#D2D0CE] bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-black text-[#106EBE]">Forecast</h4>
                <button
                  type="button"
                  onClick={insertPredictiveForecastToSheet}
                  className="rounded-md border border-[#106EBE] px-3 py-1.5 text-xs font-bold text-[#106EBE] hover:bg-[#E5F1FB]"
                >
                  Insert Forecast to Sheet
                </button>
              </div>

              <div className="max-h-56 overflow-auto rounded-lg border border-[#E1DFDD] awm-premium-scrollbar">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F3F2F1]">
                      <th className="border border-[#D2D0CE] px-2 py-1 text-left">Period</th>
                      <th className="border border-[#D2D0CE] px-2 py-1 text-right">Predicted</th>
                      <th className="border border-[#D2D0CE] px-2 py-1 text-right">Low</th>
                      <th className="border border-[#D2D0CE] px-2 py-1 text-right">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictiveResult.forecast.map((item) => (
                      <tr key={item.period}>
                        <td className="border border-[#D2D0CE] px-2 py-1">
                          Period {item.period}
                        </td>
                        <td className="border border-[#D2D0CE] px-2 py-1 text-right font-bold text-[#107C10]">
                          {item.value}
                        </td>
                        <td className="border border-[#D2D0CE] px-2 py-1 text-right">
                          {item.low}
                        </td>
                        <td className="border border-[#D2D0CE] px-2 py-1 text-right">
                          {item.high}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-[#D2D0CE] bg-white p-3">
              <h4 className="mb-2 font-black text-[#106EBE]">Trend Visualization</h4>

              <svg viewBox="0 0 620 220" className="h-56 w-full rounded-lg bg-[#FAFAFA]">
                {(() => {
                  const actual = predictiveResult.points.map((p) => p.value);
                  const forecast = predictiveResult.forecast.map((p) => p.value);
                  const combined = [...actual, ...forecast];

                  const minV = Math.min(...combined);
                  const maxV = Math.max(...combined);
                  const span = maxV - minV || 1;

                  const toX = (i: number) =>
                    30 + (i * 560) / Math.max(1, combined.length - 1);

                  const toY = (v: number) =>
                    185 - ((v - minV) / span) * 150;

                  const actualPoints = actual
                    .map((v, i) => `${toX(i)},${toY(v)}`)
                    .join(" ");

                  const forecastPoints = forecast
                    .map((v, i) => `${toX(actual.length + i)},${toY(v)}`)
                    .join(" ");

                  return (
                    <>
                      <line x1="30" y1="20" x2="30" y2="185" stroke="#D2D0CE" />
                      <line x1="30" y1="185" x2="590" y2="185" stroke="#D2D0CE" />

                      <polyline
                        fill="none"
                        stroke="#106EBE"
                        strokeWidth="3"
                        points={actualPoints}
                      />

                      <polyline
                        fill="none"
                        stroke="#107C10"
                        strokeWidth="3"
                        strokeDasharray="6 4"
                        points={forecastPoints}
                      />

                      {actual.map((v, i) => (
                        <circle
                          key={`a-${i}`}
                          cx={toX(i)}
                          cy={toY(v)}
                          r="4"
                          fill="#106EBE"
                        />
                      ))}

                      {forecast.map((v, i) => (
                        <circle
                          key={`f-${i}`}
                          cx={toX(actual.length + i)}
                          cy={toY(v)}
                          r="4"
                          fill="#107C10"
                        />
                      ))}

                      <text x="35" y="16" fontSize="11" fill="#605E5C">
                        Actual: blue | Forecast: green dashed
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="rounded-xl border border-[#D2D0CE] bg-white p-3">
              <h4 className="mb-2 font-black text-[#106EBE]">Anomaly Detection</h4>

              {predictiveResult.anomalies.length === 0 ? (
                <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">
                  No major anomalies detected.
                </p>
              ) : (
                <div className="max-h-40 overflow-auto rounded-lg border border-[#E1DFDD] awm-premium-scrollbar">
                  {predictiveResult.anomalies.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between border-b border-[#E1DFDD] px-3 py-2 text-xs"
                    >
                      <span className="font-bold text-[#A80000]">{item.key}</span>
                      <span>Value: {item.value}</span>
                      <span>Z-score: {item.zScore}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showWhatIfTable && (
        <WhatIfTableModal
          onClose={() => setShowWhatIfTable(false)}
          onGenerate={(config) => {
            runWhatIfTable(config);
            setShowWhatIfTable(false);
          }}
        />
      )}

      {showScenarioManager && (
        <ScenarioManagerModal
          scenarios={scenarios}
          summary={scenarioSummary}
          onAdd={addScenario}
          onApply={applyScenario}
          onDelete={deleteScenario}
          onSummary={summarizeScenarios}
          onClose={() => setShowScenarioManager(false)}
        />
      )}

      {showDataAnalysis && (
        <DataAnalysisModal
          sheets={sheets}
          activeSheetIndex={activeSheetIndex}
          onClose={() => setShowDataAnalysis(false)}
        />
      )}

      {showSubtotalDialog && (
        <SubtotalModal
          onGenerate={(config) => {
            runSubtotal(config);
            setShowSubtotalDialog(false);
          }}
          onClose={() => setShowSubtotalDialog(false)}
        />
      )}

      {showPivotChart && (
        <PivotChartModal
          onGenerate={(config) => {
            runPivotChart(config);
            setShowPivotChart(false);
          }}
          onClose={() => setShowPivotChart(false)}
        />
      )}

      {showForecastSheet && (
        <ForecastSheetModal
          onGenerate={(config) => {
            runForecastSheet(config);
            setShowForecastSheet(false);
          }}
          onClose={() => setShowForecastSheet(false)}
        />
      )}

      {showAnalyzeData && (
        <AnalyzeDataModal
          sheets={sheets}
          activeSheetIndex={activeSheetIndex}
          onInsertChart={insertAnalysisChart}
          onClose={() => setShowAnalyzeData(false)}
        />
      )}

      {/* Modals */}
      {contextMenu && (
        <div
          ref={contextMenuRef}

          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
          className="w-60 rounded-lg border border-[#D2D0CE] bg-white py-1 text-sm shadow-2xl"
        >
          {/* Context-menu actions are deferred until a click. */}
          {[
            { label: "Cut", onClick: () => doCopy("cut") },
            { label: "Copy", onClick: () => doCopy("copy") },
            { label: "Paste", onClick: doPaste },
            { label: "Paste Special: Values", onClick: () => doPasteSpecial("values") },
            { label: "Paste Special: Formatting", onClick: () => doPasteSpecial("formatting") },
            { label: "Insert Row", onClick: insertRowsAtSelection },
            { label: "Insert Column", onClick: insertColumnsAtSelection },
            { label: "Delete Row", onClick: removeRow },
            { label: "Delete Column", onClick: removeCol },
            { label: "Clear Contents", onClick: clearSelection },
            { label: "Clone Formatting", onClick: grabFormat },
            { label: "Clear Direct Formatting", onClick: clearFormattingOnSelection },
            { label: "Styles", onClick: () => { setActiveSidebarPanel("styles"); setRightSidebarOpen(true); } },
            { label: "Insert Comment", onClick: insertComment },
            { label: "Sparklines", onClick: insertSparkline },
            { label: "Format Cells", onClick: () => setShowFormatCells(true) },
            { label: "Merge Cells", onClick: mergeSelection },
            { label: "Unmerge Cells", onClick: unmergeSelection },
            { label: "Clear All Filters", onClick: clearAllFilters },
            { label: "Conditional Formatting", onClick: () => setShowConditionalFormatting(true) },

            { label: "Trace Precedents", onClick: tracePrecedents },
            { label: "Trace Dependents", onClick: traceDependents },
            { label: "Clear Trace Highlights", onClick: clearTrace },
            {
              label: "Share Hyperlink",
              onClick: () => {
                const link = sheet.cells[activeCell]?.hyperlink;
                if (!link) {
                  showToast("এই সেলে কোনো হাইপারলিংক নেই।");
                  return;
                }
                setShareMenu({
                  x: contextMenu.x,
                  y: contextMenu.y + 8,
                  url: link,
                  label: sheet.cells[activeCell]?.value || link,
                });
              },
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setContextMenu(null); }}
              className="block w-full px-3 py-1.5 text-left hover:bg-[#E5F1FB]"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* কলাম হেডার রাইট-ক্লিক কনটেক্সট মেনু */}
      {columnContextMenu && (
        <ColumnHeaderContextMenu
          refObject={columnContextMenuRef}
          x={columnContextMenu.x}
          y={columnContextMenu.y}
          col={columnContextMenu.col}
          onClose={() => setColumnContextMenu(null)}
          onCut={() => doCopy("cut")}
          onCopy={() => doCopy("copy")}
          onPaste={doPaste}
          onPasteSpecial={(mode) => doPasteSpecial(mode)}
          onInsertBefore={() => insertColumnsBeforeTarget(columnContextMenu.col)}
          onInsertAfter={() => insertColumnsAfterTarget(columnContextMenu.col)}
          onDeleteColumn={() => deleteColumnAtIndex(columnContextMenu.col)}
          onClearContents={() => clearColumnContentsAtIndex(columnContextMenu.col)}
          onOpenWidthDialog={() => {
            setColumnWidthDialogCol(columnContextMenu.col);
            setColumnWidthInput(String(sheet.colWidths[columnContextMenu.col] || DEFAULT_COL_WIDTH));
            setShowColumnWidthDialog(true);
          }}
          onOptimalWidth={() => applyOptimalWidthAtIndex(columnContextMenu.col)}
          onHideColumns={hideSelectedColumns}
          onShowColumns={showAllHiddenColumns}
          onFreeze={toggleFreezeRowsAndColumns}
          onSplit={toggleSplitWindow}
          onFormatCells={() => setShowFormatCells(true)}
        />
      )}

      {/* Column Width কাস্টম ইনপুট ডায়ালগ */}
      {showColumnWidthDialog && columnWidthDialogCol !== null && (
        <ColumnWidthDialog
          colLabel={colToLetter(columnWidthDialogCol)}
          value={columnWidthInput}
          onChange={setColumnWidthInput}
          onApply={() => {
            const num = parseInt(columnWidthInput, 10);
            if (Number.isFinite(num)) applyColumnWidthAtIndex(columnWidthDialogCol, num);
            setShowColumnWidthDialog(false);
            setColumnWidthDialogCol(null);
          }}
          onClose={() => { setShowColumnWidthDialog(false); setColumnWidthDialogCol(null); }}
        />
      )}

      {/* রো হেডার রাইট-ক্লিক কনটেক্সট মেনু */}
      {rowContextMenu && (
        <RowHeaderContextMenu
          refObject={rowContextMenuRef}
          x={rowContextMenu.x}
          y={rowContextMenu.y}
          row={rowContextMenu.row}
          onClose={() => setRowContextMenu(null)}
          onCut={() => doCopy("cut")}
          onCopy={() => doCopy("copy")}
          onPaste={doPaste}
          onPasteSpecial={(mode) => doPasteSpecial(mode)}
          onInsertAbove={() => insertRowsAboveTarget(rowContextMenu.row)}
          onInsertBelow={() => insertRowsBelowTarget(rowContextMenu.row)}
          onDeleteRow={() => deleteRowAtIndex(rowContextMenu.row)}
          onClearContents={() => clearRowContentsAtIndex(rowContextMenu.row)}
          onOpenHeightDialog={() => {
            setRowHeightDialogRow(rowContextMenu.row);
            setRowHeightInput(String(sheet.rowHeights[rowContextMenu.row] || DEFAULT_ROW_HEIGHT));
            setShowRowHeightDialog(true);
          }}
          onOptimalHeight={() => applyOptimalHeightAtIndex(rowContextMenu.row)}
          onHideRows={hideSelectedRows}
          onShowRows={showAllHiddenRows}
          onFreeze={toggleFreezeRowsAndColumns}
          onSplit={toggleSplitWindow}
          onFormatCells={() => setShowFormatCells(true)}
        />
      )}

      {/* Row Height কাস্টম ইনপুট ডায়ালগ */}
      {showRowHeightDialog && rowHeightDialogRow !== null && (
        <RowHeightDialog
          rowLabel={String(rowHeightDialogRow + 1)}
          value={rowHeightInput}
          onChange={setRowHeightInput}
          onApply={() => {
            const num = parseInt(rowHeightInput, 10);
            if (Number.isFinite(num)) applyRowHeightAtIndex(rowHeightDialogRow, num);
            setShowRowHeightDialog(false);
            setRowHeightDialogRow(null);
          }}
          onClose={() => { setShowRowHeightDialog(false); setRowHeightDialogRow(null); }}
        />
      )}


      {showSpecialCharsDialog && (
        <SpecialCharactersDialog
          fonts={FONT_FAMILIES}
          blocks={CHARACTER_BLOCKS}
          selectedFont={scSelectedFont}
          setSelectedFont={setScSelectedFont}
          selectedBlock={scSelectedBlock}
          setSelectedBlock={setScSelectedBlock}
          search={scSearch}
          setSearch={setScSearch}
          selectedChar={scSelectedChar}
          setSelectedChar={setScSelectedChar}
          favorites={scFavorites}
          recent={scRecent}
          onInsert={(ch) => insertCharacterToCell(ch)}
          onToggleFavorite={(ch) => toggleFavoriteCharacter(ch)}
          onClose={() => setShowSpecialCharsDialog(false)}
        />
      )}

      {showFormatCells && (
        <Modal title="Format Cells" onClose={() => setShowFormatCells(false)}>
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-bold text-[#106EBE]">Number</p>
              <div className="flex flex-wrap gap-2">
                {(["general", "number", "currency", "percentage", "accounting", "scientific", "date", "text"] as NumberFormat[]).map((fmt) => (
                  <button key={fmt} onClick={() => applyStyleToSelection({ numberFormat: fmt })} className={`rounded-md border px-2 py-1 text-xs capitalize ${activeCellStyle.numberFormat === fmt ? "border-[#106EBE] bg-[#E5F1FB]" : "border-[#D2D0CE]"}`}>{fmt}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 font-bold text-[#106EBE]">Alignment</p>
              <div className="flex flex-wrap gap-2">
                {(["left", "center", "right", "justify"] as Align[]).map((a) => (
                  <button key={a} onClick={() => applyStyleToSelection({ align: a })} className={`rounded-md border px-2 py-1 text-xs capitalize ${activeCellStyle.align === a ? "border-[#106EBE] bg-[#E5F1FB]" : "border-[#D2D0CE]"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 font-bold text-[#106EBE]">Font</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => applyStyleToSelection({ bold: !activeCellStyle.bold })} className={`rounded-md border px-2 py-1 text-xs ${activeCellStyle.bold ? "border-[#106EBE] bg-[#E5F1FB]" : "border-[#D2D0CE]"}`}>Bold</button>
                <button onClick={() => applyStyleToSelection({ italic: !activeCellStyle.italic })} className={`rounded-md border px-2 py-1 text-xs ${activeCellStyle.italic ? "border-[#106EBE] bg-[#E5F1FB]" : "border-[#D2D0CE]"}`}>Italic</button>
                <button onClick={() => applyStyleToSelection({ underline: !activeCellStyle.underline })} className={`rounded-md border px-2 py-1 text-xs ${activeCellStyle.underline ? "border-[#106EBE] bg-[#E5F1FB]" : "border-[#D2D0CE]"}`}>Underline</button>
              </div>
            </div>
            <div>
              <p className="mb-1 font-bold text-[#106EBE]">Border</p>
              <button onClick={toggleBorderAll} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs">Toggle All Borders</button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowFormatCells(false)} className="rounded-md bg-[#106EBE] px-4 py-2 text-xs font-bold text-white">Done</button>
            </div>
          </div>
        </Modal>
      )}

      {showConditionalFormatting && (
        <Modal title="Conditional Formatting" onClose={() => setShowConditionalFormatting(false)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Range e.g. A1:A10" value={cfRange} onChange={(e) => setCfRange(e.target.value)} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs" />
              <select value={cfCondition} onChange={(e) => setCfCondition(e.target.value as ConditionalRule["condition"])} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs">
                <option value="greater">Greater than</option>
                <option value="less">Less than</option>
                <option value="equal">Equal to</option>
                <option value="between">Between</option>
                <option value="textContains">Text contains</option>
              </select>
              <input type="text" placeholder="Value" value={cfValue} onChange={(e) => setCfValue(e.target.value)} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs" />
              {cfCondition === "between" && (
                <input type="text" placeholder="Second value" value={cfValue2} onChange={(e) => setCfValue2(e.target.value)} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs" />
              )}
              <input type="color" value={cfColor} onChange={(e) => setCfColor(e.target.value)} className="h-8 w-full rounded-md border border-[#D2D0CE]" />
              <button onClick={addConditionalRule} className="rounded-md bg-[#106EBE] px-3 py-1 text-xs font-bold text-white">Add Rule</button>
            </div>
            <div className="max-h-[30vh] space-y-1 overflow-auto">
              {(sheet.conditionalRules || []).map((rule) => (
                <div key={rule.id} className="flex items-center justify-between rounded-md border border-[#D2D0CE] px-2 py-1 text-xs">
                  <span>{rule.range}: {rule.condition} {rule.value}{rule.condition === "between" ? ` - ${rule.value2}` : ""}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded" style={{ backgroundColor: rule.bg }} />
                    <button onClick={() => removeConditionalRule(rule.id)} className="text-[#A80000]">Remove</button>
                  </span>
                </div>
              ))}
              {(!sheet.conditionalRules || sheet.conditionalRules.length === 0) && <p className="text-xs text-[#605E5C]">No rules yet.</p>}
            </div>
          </div>
        </Modal>
      )}

      {showNamedRanges && (
        <Modal title="Named Ranges" onClose={() => setShowNamedRanges(false)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <input type="text" placeholder="Name e.g. SalesData" value={nrName} onChange={(e) => setNrName(e.target.value)} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs" />
              <input type="text" placeholder="Range e.g. A1:B10" value={nrRange} onChange={(e) => setNrRange(e.target.value)} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs" />
              <button onClick={addNamedRange} className="rounded-md bg-[#106EBE] px-3 py-1 text-xs font-bold text-white">Add</button>
            </div>
            <div className="max-h-[30vh] space-y-1 overflow-auto">
              {Object.entries(sheet.namedRanges || {}).map(([key, range]) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-[#D2D0CE] px-2 py-1 text-xs">
                  <button onClick={() => { goToNamedRange(key); setShowNamedRanges(false); }} className="font-bold text-[#106EBE] hover:underline">{key}</button>
                  <span className="font-mono text-[#605E5C]">{range}</span>
                  <button onClick={() => removeNamedRange(key)} className="text-[#A80000]">Remove</button>
                </div>
              ))}
              {Object.keys(sheet.namedRanges || {}).length === 0 && <p className="text-xs text-[#605E5C]">No named ranges yet. Type a name into the Name Box (top-left) after adding one to jump straight to it.</p>}
            </div>
          </div>
        </Modal>
      )}

      {showHyperlinkDialog && (
        <HyperlinkPickerDialog
          links={AWM_MODULE_LINKS}
          search={hyperlinkSearch}
          setSearch={setHyperlinkSearch}
          onPick={applyModuleHyperlink}
          onManual={insertManualHyperlinkUrl}
          onClose={() => setShowHyperlinkDialog(false)}
        />
      )}

      {shareMenu && (
        <ShareLinkMenu
          refObject={shareMenuRef}
          x={shareMenu.x}
          y={shareMenu.y}
          url={shareMenu.url}
          label={shareMenu.label}
          onCopy={() => copyShareLink(shareMenu.url)}
          onClose={() => setShareMenu(null)}
        />
      )}

      {showFunctionWizard && (
        <Modal title="Function Wizard" onClose={() => setShowFunctionWizard(false)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="awm-premium-scrollbar max-h-[55vh] space-y-3 overflow-auto pr-2">
              {Array.from(new Set(FUNCTION_LIST.map((f) => FUNCTION_CATEGORIES[f.name] || "Other"))).map((cat) => (
                <div key={cat}>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#605E5C]">{cat}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FUNCTION_LIST.filter((f) => (FUNCTION_CATEGORIES[f.name] || "Other") === cat).map((f) => (
                      <button
                        key={f.name}
                        onClick={() => setWizardSelected(f.name)}
                        className={`rounded-lg border p-2 text-left text-xs hover:border-[#106EBE] ${wizardSelected === f.name ? "border-[#106EBE] bg-[#E5F1FB]" : "border-[#D2D0CE] bg-[#FFFFFF]"}`}
                      >
                        <p className="font-bold text-[#106EBE]">{f.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#D2D0CE] bg-[#F8F9FA] p-3">
              {(() => {
                const f = FUNCTION_LIST.find((x) => x.name === wizardSelected) || FUNCTION_LIST[0];
                const rangePattern = /[A-Z]+\d+:[A-Z]+\d+/;
                const refPattern = /[A-Z]+\d+/;
                let formula = f.usage;
                if (rangePattern.test(formula)) formula = formula.replace(rangePattern, selectedRangeText);
                else if (refPattern.test(formula)) formula = formula.replace(refPattern, activeCell);
                let preview: string;
                try {
                  const result = evaluateFormula(
                    formula,
                    (ref: string) => getCellValue(ref),
                    (range: string) => {
                      const nr = normalizeRange(range);
                      if (!nr) return [];
                      const out: EvalResult[] = [];
                      for (let rr = nr.r1; rr <= nr.r2; rr++) for (let cc = nr.c1; cc <= nr.c2; cc++) out.push(getCellValue(cellKey(rr, cc)));
                      return out;
                    }
                  );
                  preview = String(result);
                } catch {
                  preview = "—";
                }
                return (
                  <>
                    <p className="font-bold text-[#106EBE]">{f.name}</p>
                    <p className="mt-1 text-xs text-[#000000]">{f.desc}</p>
                    <p className="mt-2 font-mono text-xs text-[#605E5C]">Syntax: {f.usage}</p>
                    <p className="mt-2 font-mono text-xs text-[#107C10]">Live Preview: ={formula} &rarr; {preview}</p>
                    <button
                      onClick={() => { startEditing(activeCell, `=${formula}`); setShowFunctionWizard(false); }}
                      className="mt-3 w-full rounded-md bg-[#106EBE] px-3 py-2 text-xs font-bold text-white"
                    >
                      Insert Formula
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {showFindReplace && (
        <Modal title="Find and Replace" onClose={() => setShowFindReplace(false)}>
          <div className="space-y-4">
            <LabeledInput label="Find" value={findText} onChange={setFindText} />
            <LabeledInput label="Replace with" value={replaceText} onChange={setReplaceText} />
            <label className="flex items-center gap-2 text-sm text-[#000000]">
              <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> Match case
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <ToolBtn onClick={findNext}>Find Next</ToolBtn>
              <ToolBtn onClick={replaceCurrent}>Replace Current</ToolBtn>
              <ToolBtn onClick={replaceAll}>Replace All</ToolBtn>
            </div>
          </div>
        </Modal>
      )}


      {showGoalSeek && (
        <Modal title="Goal Seek" onClose={() => setShowGoalSeek(false)}>
          <div className="space-y-4">
            <LabeledInput label="Target cell" value={goalTargetCell} onChange={setGoalTargetCell} placeholder="Example: C10" />
            <LabeledInput label="Target value" value={goalValue} onChange={setGoalValue} placeholder="Example: 50000" />
            <LabeledInput label="Changing cell" value={goalChangingCell} onChange={setGoalChangingCell} placeholder="Example: B4" />
            <button onClick={runGoalSeek} className="w-full rounded-xl bg-[#106EBE] text-[#FFFFFF] font-bold py-2 shadow-sm hover:bg-[#005A9E]">Solve</button>
          </div>
        </Modal>
      )}

      {showConsolidate && (
        <Modal title="Consolidate" onClose={() => setShowConsolidate(false)}>
          <div className="space-y-4">
            <LabeledInput label="Source ranges" value={consolidateRanges} onChange={setConsolidateRanges} placeholder="Example: A1:A10, C1:C10" />
            <LabeledInput label="Target cell" value={consolidateTarget} onChange={setConsolidateTarget} placeholder="Example: E1" />
            <button onClick={runConsolidate} className="w-full rounded-xl bg-[#106EBE] text-[#FFFFFF] font-bold py-2 shadow-sm hover:bg-[#005A9E]">Consolidate</button>
          </div>
        </Modal>
      )}

      {showGallery && (
        <Modal title="Gallery" onClose={() => setShowGallery(false)}>
          <div className="grid grid-cols-6 gap-3">
            {GALLERY_STAMPS.map((s) => (
              <button key={s} onClick={() => { setCellValue(activeCell, s); setShowGallery(false); }} className="flex h-14 items-center justify-center rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] text-2xl hover:border-[#106EBE] text-[#000000]">{s}</button>
            ))}
          </div>
        </Modal>
      )}

      {showDataSource && (
        <Modal title="Import CSV Data Source" onClose={() => setShowDataSource(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[#605E5C]">Paste CSV text. Each line is a row and commas separate columns.</p>
            <textarea value={dataSourceText} onChange={(e) => setDataSourceText(e.target.value)} rows={8} className="w-full rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] p-3 font-mono text-xs outline-none focus:border-[#106EBE] text-[#000000]" placeholder={"Name,Salary,Department\nJohn,45000,Finance"} />
            <button onClick={() => importCsvText(dataSourceText)} className="w-full rounded-xl bg-[#106EBE] text-[#FFFFFF] font-bold py-2 shadow-sm hover:bg-[#005A9E]">Import</button>
          </div>
        </Modal>
      )}

      {showValidity && (
        <Modal title="Data Validation" onClose={() => setShowValidity(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[#605E5C]">Enter dropdown options separated by commas.</p>
            <LabeledInput label="Options" value={validityInput} onChange={setValidityInput} placeholder="Approved, Pending, Rejected" />
            <button onClick={applyValidity} className="w-full rounded-xl bg-[#106EBE] text-[#FFFFFF] font-bold py-2 shadow-sm hover:bg-[#005A9E]">Apply</button>
          </div>
        </Modal>
      )}

      {showAdvancedPrintPreview && (
        <AdvancedPrintPreviewModal
          sheet={sheet}
          workbookName={workbookName}
          pageSize={pageSize}
          setPageSize={setPageSize}
          orientation={orientation}
          setOrientation={setOrientation}
          printScale={printScale}
          setPrintScale={setPrintScale}
          printMarginTop={printMarginTop}
          setPrintMarginTop={setPrintMarginTop}
          printMarginRight={printMarginRight}
          setPrintMarginRight={setPrintMarginRight}
          printMarginBottom={printMarginBottom}
          setPrintMarginBottom={setPrintMarginBottom}
          printMarginLeft={printMarginLeft}
          setPrintMarginLeft={setPrintMarginLeft}
          printHeader={printHeader}
          printFooter={printFooter}
          printArea={printArea}
          printTitleRows={printTitleRows}
          printTitleCols={printTitleCols}
          showGridLines={showGridLines}
          getDisplayValue={getDisplayValue}
          onClose={() => setShowAdvancedPrintPreview(false)}
          onOpenPageSetup={() => setShowPageSetup(true)}
          onPrint={() => { setShowAdvancedPrintPreview(false); setShowPrintDialog(true); }}
        />
      )}


      {showPrintDialog && (
        <PrintDialogModal
          onClose={() => setShowPrintDialog(false)}
          onConfirmPrint={() => {
            setShowPrintDialog(false);
            setPrintPreview(true);
            window.setTimeout(() => window.print(), 150);
          }}
          workbookName={workbookName}
          sheet={sheet}
          sheets={sheets}
          getDisplayValue={getDisplayValue}
          pageSize={pageSize}
          setPageSize={setPageSize}
          orientation={orientation}
          setOrientation={setOrientation}
        />
      )}


      {showPageSetup && (
        <PageSetupDialog
          pageSize={pageSize} setPageSize={setPageSize}
          orientation={orientation} setOrientation={setOrientation}
          printScale={printScale} setPrintScale={setPrintScale}
          printMarginTop={printMarginTop} setPrintMarginTop={setPrintMarginTop}
          printMarginBottom={printMarginBottom} setPrintMarginBottom={setPrintMarginBottom}
          printMarginLeft={printMarginLeft} setPrintMarginLeft={setPrintMarginLeft}
          printMarginRight={printMarginRight} setPrintMarginRight={setPrintMarginRight}
          printHeader={printHeader} setPrintHeader={setPrintHeader}
          printFooter={printFooter} setPrintFooter={setPrintFooter}
          printArea={printArea} setPrintArea={setPrintArea}
          printTitleRows={printTitleRows} setPrintTitleRows={setPrintTitleRows}
          printTitleCols={printTitleCols} setPrintTitleCols={setPrintTitleCols}
          showGridLines={showGridLines} setShowGridLines={setShowGridLines}
          onClose={() => setShowPageSetup(false)}
          onApply={() => { setShowPageSetup(false); setPrintPreview(true); showToast("Page setup applied."); }}
        />
      )}
      {confirmDialog && (
        <Modal title={confirmDialog.title} onClose={() => setConfirmDialog(null)} zIndex={100001}>
          <p className="text-sm">{confirmDialog.message}</p>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setConfirmDialog(null)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(null);
              }}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white"
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {promptDialog && (
        <Modal title={promptDialog.title} onClose={() => setPromptDialog(null)}>
          <p className="text-sm">{promptDialog.message}</p>
          <input
            type="text"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-2"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setPromptDialog(null)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                promptDialog.onConfirm(promptValue);
                setPromptDialog(null);
              }}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white"
            >
              OK
            </button>
          </div>
        </Modal>
      )}

      {showChartWizard && (
        <ChartWizardModal
          step={wizardStep}
          setStep={setWizardStep}
          chartTitle={chartTitle}
          setChartTitle={setChartTitle}
          chartRange={chartRange}
          setChartRange={setChartRange}
          wizardType={wizardType}
          setWizardType={setWizardType}
          subtitle={wizardSubtitle}
          setSubtitle={setWizardSubtitle}
          xAxisTitle={wizardXAxisTitle}
          setXAxisTitle={setWizardXAxisTitle}
          yAxisTitle={wizardYAxisTitle}
          setYAxisTitle={setWizardYAxisTitle}
          showLegend={wizardShowLegend}
          setShowLegend={setWizardShowLegend}
          legendPosition={wizardLegendPosition}
          setLegendPosition={setWizardLegendPosition}
          is3D={wizard3D}
          setIs3D={setWizard3D}
          realistic={wizardRealistic}
          setRealistic={setWizardRealistic}
          shape={wizardShape}
          setShape={setWizardShape}
          series={wizardSeries}
          setSeries={setWizardSeries}
          onFinish={finishChartWizard}
          onCancel={() => setShowChartWizard(false)}
          onHelp={() => showToast("Chart Wizard: pick a type, set your data range, define series, then customize chart elements.")}
        />
      )}

      {showPivotDialog && (
        <Modal title="Pivot Table" onClose={() => setShowPivotDialog(false)}>
          <div className="space-y-4">
            <LabeledInput label="Source range with header row" value={pivotRange} onChange={setPivotRange} placeholder="A1:C10" />
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Row field</label>
              <select value={pivotRowField} onChange={(e) => setPivotRowField(e.target.value)} className="w-full rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] px-3 py-2 text-sm outline-none focus:border-[#106EBE] text-[#000000]">
                <option value="">-- select column --</option>
                {pivotHeaderOptions.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Column field (optional)</label>
              <select value={pivotColumnField} onChange={(e) => setPivotColumnField(e.target.value)} className="w-full rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] px-3 py-2 text-sm outline-none focus:border-[#106EBE] text-[#000000]">
                <option value="">(none — single total column)</option>
                {pivotHeaderOptions.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Value field</label>
              <select value={pivotValueField} onChange={(e) => setPivotValueField(e.target.value)} className="w-full rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] px-3 py-2 text-sm outline-none focus:border-[#106EBE] text-[#000000]">
                <option value="">-- select column --</option>
                {pivotHeaderOptions.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Aggregate Function</label>
              <select value={pivotAggregate} onChange={(e) => setPivotAggregate(e.target.value as Aggregate)} className="w-full rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] px-3 py-2 text-sm outline-none focus:border-[#106EBE] text-[#000000]">
                <option value="SUM">SUM</option>
                <option value="COUNT">COUNT</option>
                <option value="AVERAGE">AVERAGE</option>
                <option value="MIN">MIN</option>
                <option value="MAX">MAX</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={runPivot} className="flex-1 rounded-xl bg-[#106EBE] text-[#FFFFFF] font-bold py-2 shadow-sm hover:bg-[#005A9E]">Generate</button>
              <button onClick={insertPivotToSheet} disabled={!pivotResult.length} className="flex-1 rounded-xl border border-[#D2D0CE] bg-[#F3F2F1] text-[#000000] font-bold py-2 hover:bg-[#E1DFDD] disabled:opacity-40">Insert to Sheet</button>
            </div>
            {pivotResult.length > 0 && (
              <div className="max-h-60 overflow-auto rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] awm-premium-scrollbar">
                <table className="w-full border-collapse text-xs text-[#000000]">
                  <tbody>
                    {pivotResult.map((row, r) => (
                      <tr key={r}>{row.map((v, c) => <td key={c} className={`border border-[#D2D0CE] px-2 py-1 ${r === 0 ? "font-bold bg-[#F3F2F1]" : ""}`}>{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showSpellCheck && (
        <Modal title="Spell Check" onClose={() => setShowSpellCheck(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[#605E5C]">Browser spell checking is enabled while editing. The list below highlights uncommon English words found in text cells.</p>
            <div className="max-h-80 overflow-auto rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] awm-premium-scrollbar">
              {spellIssues.length === 0 ? (
                <p className="p-3 text-sm text-green-600 font-bold">No spelling issues detected.</p>
              ) : (
                spellIssues.map((item, i) => (
                  <button key={`${item.key}_${item.word}_${i}`} onClick={() => { const pos = parseKey(item.key)!; setActiveCell(item.key); setSelection({ r1: pos.row, c1: pos.col, r2: pos.row, c2: pos.col }); setShowSpellCheck(false); }} className="flex w-full justify-between border-b border-[#D2D0CE] px-3 py-2 text-left text-sm hover:bg-[#F3F2F1] text-[#000000]">
                    <span className="font-bold">{item.word}</span>
                    <span className="text-[#605E5C]">{item.key}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {showTemplatesDialog && (
        <Modal title={showTemplatesDialog === "apply" ? "New From Template" : "Edit Template"} onClose={() => setShowTemplatesDialog(null)}>
          <div className="max-h-[60vh] space-y-2 overflow-auto awm-premium-scrollbar">

            <div className="max-h-[60vh] space-y-2 overflow-auto awm-premium-scrollbar">

              {/* ============================= */}
              {/* START: BUILT-IN TEMPLATES UI */}
              {/* ============================= */}

              <div className="space-y-2">
                <p className="text-sm font-bold text-[#106EBE]">
                  Built-in Templates
                </p>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {BUILT_IN_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyBuiltInTemplate(tpl)}
                      className="rounded-xl border border-[#D2D0CE] bg-white p-3 text-left hover:border-[#106EBE] hover:bg-[#F4F9FD]"
                    >
                      <p className="text-sm font-bold text-[#201F1E]">
                        {tpl.name}
                      </p>

                      <p className="text-xs text-[#605E5C]">
                        {tpl.description}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[#106EBE]">
                        {tpl.category}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* =========================== */}
              {/* END: BUILT-IN TEMPLATES UI */}
              {/* =========================== */}

              {/* এখান থেকে আপনার আগের user template list শুরু */}
              {templates.length === 0 ? (
                <p className="px-1 py-4 text-sm text-[#605E5C]">
                  No templates saved yet. Use Save, then Save as Template to create one.
                </p>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#D2D0CE] bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#201F1E]">{tpl.name}</p>
                      <p className="text-xs text-[#8A8886]">{new Date(tpl.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => handleApplyTemplate(tpl)} className="rounded-md border border-[#106EBE] px-2 py-1 text-xs font-bold text-[#106EBE] hover:bg-[#E5F1FB]">
                        Use
                      </button>

                      <button type="button" onClick={() => handleDeleteTemplate(tpl.id)} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs font-bold text-[#605E5C] hover:border-red-400 hover:text-red-600">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {templates.length === 0 ? (
              <p className="px-1 py-4 text-sm text-[#605E5C]">
                No templates saved yet. Use Save, then Save as Template to create one.
              </p>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#D2D0CE] bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#201F1E]">{tpl.name}</p>
                    <p className="text-xs text-[#8A8886]">{new Date(tpl.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => handleApplyTemplate(tpl)} className="rounded-md border border-[#106EBE] px-2 py-1 text-xs font-bold text-[#106EBE] hover:bg-[#E5F1FB]">
                      Use
                    </button>
                    <button type="button" onClick={() => handleDeleteTemplate(tpl.id)} className="rounded-md border border-[#D2D0CE] px-2 py-1 text-xs font-bold text-[#605E5C] hover:border-red-400 hover:text-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {showExportDialog && (
        <Modal title="Export" onClose={() => setShowExportDialog(false)}>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { setShowExportDialog(false); handleExportPdf(); }}
              className="flex w-full items-center gap-3 rounded-lg border border-[#D2D0CE] bg-white px-3 py-3 text-sm font-bold text-[#323130] hover:border-[#106EBE] hover:bg-[#F4F9FD]"
            >
              <Icons.FileDown size={16} /> Export as PDF
            </button>
            <button
              type="button"
              onClick={() => { setShowExportDialog(false); handleExportCsv(); }}
              className="flex w-full items-center gap-3 rounded-lg border border-[#D2D0CE] bg-white px-3 py-3 text-sm font-bold text-[#323130] hover:border-[#106EBE] hover:bg-[#F4F9FD]"
            >
              <Icons.FileSpreadsheet size={16} /> Export as CSV
            </button>
            <button
              type="button"
              onClick={() => { setShowExportDialog(false); handleExportAlimxl(); }}
              className="flex w-full items-center gap-3 rounded-lg border border-[#D2D0CE] bg-white px-3 py-3 text-sm font-bold text-[#323130] hover:border-[#106EBE] hover:bg-[#F4F9FD]"
            >
              <Icons.FileSpreadsheet size={16} /> Export as XLSX
            </button>
          </div>
        </Modal>
      )}

      <RecoveryDrafts
        workbook={buildWorkbookSnapshot()}
        enabled={!showHomeScreen}
        onRecovered={() => {
          void refreshRecentFromDevice();
          setShowLoadDialog(true);
        }}
      />

      <MyFiles
        open={showLoadDialog}
        activeWorkbookId={workbookId}
        onOpen={loadWorkbookById}
        onClose={() => {
          setShowLoadDialog(false);
          void refreshRecentFromDevice();
        }}
      />
    </div>
  );
}

type BorderPreset =
  | "none"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "all"
  | "outside"
  | "inside";
/* ============================================================================
 * UI primitives
 * ========================================================================== */

interface ToolbarDropdownItem {
  label: string;
  shortcut?: string;
  isDivider?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

interface SpreadsheetToolbarButton {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  active?: boolean;
  kind?: ToolbarButtonKind;
  dropdownItems?: ToolbarDropdownItem[];
  dropdownExtra?: () => React.ReactNode;
}

function AutoFilterDropdown({
  refObject,
  x,
  y,
  columnLabel,
  draft,
  setDraft,
  options,
  bgColors,
  fontColors,
  onSortAsc,
  onSortDesc,
  onSortByBg,
  onSortByFont,
  onApply,
  onClear,
  onClose,
}: {
  refObject: React.RefObject<HTMLDivElement | null>;
  x: number;
  y: number;
  columnLabel: string;
  draft: AutoFilterState;
  setDraft: React.Dispatch<React.SetStateAction<AutoFilterState | null>>;
  options: AutoFilterOption[];
  bgColors: AutoFilterColorOption[];
  fontColors: AutoFilterColorOption[];
  onSortAsc: () => void;
  onSortDesc: () => void;
  onSortByBg: (color: string) => void;
  onSortByFont: (color: string) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const selectedSet = useMemo(
    () => new Set(draft.selectedValues ?? options.map((item) => item.value)),
    [draft.selectedValues, options]
  );

  const visibleOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;

    return options.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
    );
  }, [search, options]);

  const allVisibleSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every((item) => selectedSet.has(item.value));

  const selectedCount = selectedSet.size;

  const updateSelectedValues = (next: string[]) => {
    setDraft((prev) => (prev ? { ...prev, selectedValues: next } : prev));
  };

  const toggleValue = (value: string) => {
    const next = new Set(selectedSet);

    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }

    updateSelectedValues(Array.from(next));
  };

  const toggleAllVisible = () => {
    const next = new Set(selectedSet);

    if (allVisibleSelected) {
      visibleOptions.forEach((item) => next.delete(item.value));
    } else {
      visibleOptions.forEach((item) => next.add(item.value));
    }

    updateSelectedValues(Array.from(next));
  };

  return (
    <div
      ref={refObject}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 99999,
      }}
      className="w-85 overflow-hidden rounded-xl border border-[#C8C6C4] bg-white text-[#201F1E] shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-[#E1DFDD] bg-linear-to-b from-[#FFFFFF] to-[#F3F2F1] px-3 py-2">
        <div className="flex items-center gap-2">
          <Icons.Filter size={16} className="text-[#106EBE]" />
          <span className="text-sm font-black text-[#106EBE]">
            AutoFilter: {columnLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-[#605E5C] hover:bg-[#E1DFDD]"
          aria-label="Close AutoFilter"
          title="Close"
        >
          <Icons.X size={16} />
        </button>
      </div>

      <div className="max-h-[74vh] overflow-auto p-3 awm-premium-scrollbar">
        {/* Sorting */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onSortAsc}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#E5F1FB]"
          >
            <Icons.ArrowUpAZ size={15} />
            Sort Ascending
          </button>

          <button
            type="button"
            onClick={onSortDesc}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#E5F1FB]"
          >
            <Icons.ArrowDownZA size={15} />
            Sort Descending
          </button>
        </div>

        <div className="my-3 h-px bg-[#E1DFDD]" />

        {/* Sort by Background Color */}
        <details className="group rounded-lg border border-[#E1DFDD] bg-[#FAFAFA]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-bold text-[#323130]">
            <span className="flex items-center gap-2">
              <Icons.PaintBucket size={15} />
              Sort by Background Color
            </span>
            <Icons.ChevronDown size={14} className="transition group-open:rotate-180" />
          </summary>

          <div className="border-t border-[#E1DFDD] bg-white py-1">
            {bgColors.map((item) => (
              <button
                type="button"
                key={`sort-bg-${item.color}`}
                onClick={() => onSortByBg(item.color)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-[#E5F1FB]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-[#C8C6C4]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-[#8A8886]">{item.count}</span>
              </button>
            ))}
          </div>
        </details>

        {/* Sort by Font Color */}
        <details className="group mt-2 rounded-lg border border-[#E1DFDD] bg-[#FAFAFA]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-bold text-[#323130]">
            <span className="flex items-center gap-2">
              <Icons.CaseSensitive size={15} />
              Sort by Font Color
            </span>
            <Icons.ChevronDown size={14} className="transition group-open:rotate-180" />
          </summary>

          <div className="border-t border-[#E1DFDD] bg-white py-1">
            {fontColors.map((item) => (
              <button
                type="button"
                key={`sort-font-${item.color}`}
                onClick={() => onSortByFont(item.color)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-[#E5F1FB]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-[#C8C6C4]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-[#8A8886]">{item.count}</span>
              </button>
            ))}
          </div>
        </details>

        <div className="my-3 h-px bg-[#E1DFDD]" />

        {/* Filter by Condition */}
        <details className="group rounded-lg border border-[#E1DFDD] bg-[#FAFAFA]" open>
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-bold text-[#323130]">
            <span className="flex items-center gap-2">
              <Icons.Filter size={15} />
              Filter by Condition
            </span>
            <Icons.ChevronDown size={14} className="transition group-open:rotate-180" />
          </summary>

          <div className="space-y-2 border-t border-[#E1DFDD] bg-white p-3">
            <select
              value={draft.condition}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                      ...prev,
                      condition: e.target.value as AutoFilterCondition,
                    }
                    : prev
                )
              }
              className="w-full rounded-md border border-[#C8C6C4] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]"
            >
              <option value="none">None</option>
              <option value="empty">Empty</option>
              <option value="notEmpty">Not Empty</option>
              <option value="top10">Top 10</option>
              <option value="bottom10">Bottom 10</option>
              <option value="standard">Standard Filter</option>
            </select>

            {draft.condition === "standard" && (
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={draft.standard.operator}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev
                        ? {
                          ...prev,
                          standard: {
                            ...prev.standard,
                            operator: e.target.value as AutoFilterStandardOperator,
                          },
                        }
                        : prev
                    )
                  }
                  className="w-full rounded-md border border-[#C8C6C4] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]"
                >
                  <option value="contains">Contains</option>
                  <option value="notContains">Does not contain</option>
                  <option value="equals">Equals</option>
                  <option value="notEquals">Not equals</option>
                  <option value="startsWith">Starts with</option>
                  <option value="endsWith">Ends with</option>
                  <option value="greaterThan">Greater than</option>
                  <option value="lessThan">Less than</option>
                  <option value="greaterOrEqual">Greater or equal</option>
                  <option value="lessOrEqual">Less or equal</option>
                </select>

                <input
                  type="text"
                  value={draft.standard.value}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev
                        ? {
                          ...prev,
                          standard: {
                            ...prev.standard,
                            value: e.target.value,
                          },
                        }
                        : prev
                    )
                  }
                  placeholder="Value..."
                  className="w-full rounded-md border border-[#C8C6C4] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]"
                />
              </div>
            )}
          </div>
        </details>

        {/* Filter by Background Color */}
        <details className="group mt-2 rounded-lg border border-[#E1DFDD] bg-[#FAFAFA]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-bold text-[#323130]">
            <span className="flex items-center gap-2">
              <Icons.PaintBucket size={15} />
              Filter by Background Color
            </span>
            <Icons.ChevronDown size={14} className="transition group-open:rotate-180" />
          </summary>

          <div className="border-t border-[#E1DFDD] bg-white py-1">
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => (prev ? { ...prev, bgColor: null } : prev))
              }
              className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-[#E5F1FB] ${!draft.bgColor ? "font-bold text-[#106EBE]" : ""
                }`}
            >
              No background color filter
            </button>

            {bgColors.map((item) => (
              <button
                type="button"
                key={`filter-bg-${item.color}`}
                onClick={() =>
                  setDraft((prev) =>
                    prev ? { ...prev, bgColor: item.color } : prev
                  )
                }
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-[#E5F1FB] ${normalizeFilterColor(draft.bgColor) === normalizeFilterColor(item.color)
                  ? "font-bold text-[#106EBE]"
                  : ""
                  }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-[#C8C6C4]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-[#8A8886]">{item.count}</span>
              </button>
            ))}
          </div>
        </details>

        {/* Filter by Font Color */}
        <details className="group mt-2 rounded-lg border border-[#E1DFDD] bg-[#FAFAFA]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-bold text-[#323130]">
            <span className="flex items-center gap-2">
              <Icons.CaseSensitive size={15} />
              Filter by Font Color
            </span>
            <Icons.ChevronDown size={14} className="transition group-open:rotate-180" />
          </summary>

          <div className="border-t border-[#E1DFDD] bg-white py-1">
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => (prev ? { ...prev, fontColor: null } : prev))
              }
              className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-[#E5F1FB] ${!draft.fontColor ? "font-bold text-[#106EBE]" : ""
                }`}
            >
              No font color filter
            </button>

            {fontColors.map((item) => (
              <button
                type="button"
                key={`filter-font-${item.color}`}
                onClick={() =>
                  setDraft((prev) =>
                    prev ? { ...prev, fontColor: item.color } : prev
                  )
                }
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-[#E5F1FB] ${normalizeFilterColor(draft.fontColor) === normalizeFilterColor(item.color)
                  ? "font-bold text-[#106EBE]"
                  : ""
                  }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-[#C8C6C4]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-[#8A8886]">{item.count}</span>
              </button>
            ))}
          </div>
        </details>

        <div className="my-3 h-px bg-[#E1DFDD]" />

        {/* Search + Checkbox Values */}
        <div className="rounded-lg border border-[#E1DFDD] bg-white">
          <div className="border-b border-[#E1DFDD] p-2">
            <div className="flex items-center gap-2 rounded-md border border-[#C8C6C4] px-2 py-1.5">
              <Icons.Search size={14} className="text-[#605E5C]" />
              <input
                autoFocus
                dir="ltr"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search values..."
                className="w-full bg-transparent text-sm outline-none"
                style={{ direction: "ltr", unicodeBidi: "plaintext" }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    onClose();
                  }

                  if (e.key === "Enter") {
                    onApply();
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[#E1DFDD] px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
              />
              Select All
            </label>

            <span className="text-xs text-[#605E5C]">
              {selectedCount}/{options.length}
            </span>
          </div>

          <div className="max-h-56 overflow-auto py-1 awm-premium-scrollbar">
            {visibleOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-[#605E5C]">
                No matching values.
              </div>
            ) : (
              visibleOptions.map((item) => (
                <label
                  key={`filter-value-${item.value}`}
                  className="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-[#F3F2F1]"
                  title={item.label}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(item.value)}
                      onChange={() => toggleValue(item.value)}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>

                  <span className="shrink-0 text-xs text-[#8A8886]">
                    {item.count}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-between border-t border-[#E1DFDD] bg-[#F8F8F8] px-3 py-2">
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-[#C8C6C4] bg-white px-3 py-1.5 text-xs font-bold text-[#605E5C] hover:border-red-400 hover:text-red-600"
        >
          Clear
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#C8C6C4] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#F3F2F1]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onApply}
            className="rounded-md bg-[#106EBE] px-4 py-1.5 text-xs font-black text-white hover:bg-[#005A9E]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function SpreadsheetToolbarIconButton({ button }: { button: SpreadsheetToolbarButton }) {
  const Icon = button.icon;
  return (
    <button
      type="button"
      onClick={button.onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          button.onClick();
        }
      }}
      title={button.label}
      aria-label={button.label}
      aria-pressed={button.kind === "toggle" ? !!button.active : undefined}
      className={`group relative flex h-8 w-8 items-center justify-center rounded-md border text-[#323130] shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30 ${button.active
        ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE] shadow-[inset_0_0_0_1px_rgba(16,110,190,0.12)]"
        : "border-transparent bg-transparent hover:border-[#C8C6C4] hover:bg-white hover:text-[#106EBE] hover:shadow-md"
        }`}
    >
      <Icon size={17} className="transition-transform duration-150 group-hover:scale-110" />
      <span className="pointer-events-none absolute left-1/2 top-full z-9999 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#201F1E] px-2 py-1 text-[11px] font-semibold text-white shadow-lg group-hover:block">
        {button.label}
      </span>
    </button>
  );
}

function SpreadsheetToolbarSplitButton({
  button,
  open,
  onToggle,
  onClose,
}: {
  button: SpreadsheetToolbarButton;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const Icon = button.icon;
  const items = button.dropdownItems || [];
  return (
    <div className="relative flex items-stretch">
      <button
        type="button"
        onClick={button.onClick}
        title={button.label}
        aria-label={button.label}
        className="group relative flex h-8 w-8 items-center justify-center rounded-l-md border border-r-0 border-transparent bg-transparent text-[#323130] shadow-sm transition-all duration-150 hover:border-[#C8C6C4] hover:bg-white hover:text-[#106EBE] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30"
      >
        <Icon size={17} className="transition-transform duration-150 group-hover:scale-110" />
        <span className="pointer-events-none absolute left-1/2 top-full z-9999 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#201F1E] px-2 py-1 text-[11px] font-semibold text-white shadow-lg group-hover:block">
          {button.label}
        </span>
      </button>
      <button
        type="button"
        onClick={onToggle}
        title={`${button.label} options`}
        aria-label={`${button.label} options`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-8 w-4 items-center justify-center rounded-r-md border text-[#605E5C] shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30 ${open
          ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]"
          : "border-transparent bg-transparent hover:border-[#C8C6C4] hover:bg-white hover:text-[#106EBE] hover:shadow-md"
          }`}
      >
        <Icons.ChevronDown size={11} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-9990" aria-hidden="true" onClick={onClose} />
          <div
            role="menu"
            className="absolute left-0 top-full z-9991 mt-1 w-64 overflow-hidden rounded-md border border-[#D2D0CE] bg-white py-1 shadow-2xl"
          >
            {button.dropdownExtra ? button.dropdownExtra() : null}
            {items.map((item, idx) =>
              item.isDivider ? (
                <div key={`div-${idx}`} className="my-1 h-px bg-[#E1DFDD]" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    onClose();
                    item.onClick?.();
                  }}
                  className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[13px] text-[#323130] hover:bg-[#E5F1FB] hover:text-[#106EBE] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="flex items-center gap-2">
                    {item.checked && <Icons.Check size={13} className="text-[#106EBE]" />}

                    <span className={item.checked ? "" : "pl-5.25"}>{item.label}</span>

                  </span>
                  {item.shortcut && <span className="text-[11px] text-[#8A8886]">{item.shortcut}</span>}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================================
 * Advanced Color Picker — Theme Colors / Standard Colors / Recent / Custom Hex
 * ========================================================================== */

const STANDARD_COLORS = [
  "#E11D48", "#F43F5E", "#FB7185", "#F97316", "#F59E0B",
  "#EAB308", "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6",
  "#A855F7", "#D946EF", "#EC4899", "#64748B", "#0F172A",
];

// প্রতিটি কলামে: [বেস কালার, লাইট ৮০%, লাইট ৬০%, লাইট ৪০%, ডার্ক ২৫%, ডার্ক ৫০%]
const THEME_COLOR_COLUMNS: string[][] = [
  ["#FFFFFF", "#F2F2F2", "#D9D9D9", "#BFBFBF", "#A6A6A6", "#808080"],
  ["#000000", "#7F7F7F", "#595959", "#404040", "#262626", "#0D0D0D"],
  ["#E7E6E6", "#F2F2F2", "#D0CECE", "#AEABAB", "#757070", "#3B3838"],
  ["#44546A", "#D6DCE4", "#ADB9CA", "#8496B0", "#333F4F", "#222B35"],
  ["#4472C4", "#DAE3F3", "#B4C6E7", "#8EAADB", "#2F5496", "#1F3864"],
  ["#ED7D31", "#FBE5D5", "#F8CBAD", "#F4B183", "#C55A11", "#833C00"],
  ["#A5A5A5", "#EDEDED", "#DBDBDB", "#C9C9C9", "#7B7B7B", "#525252"],
  ["#FFC000", "#FFF2CC", "#FFE599", "#FFD966", "#BF9000", "#7F6000"],
  ["#5B9BD5", "#DDEBF7", "#BDD7EE", "#9DC3E6", "#2E75B6", "#1F4E79"],
  ["#70AD47", "#E2EFDA", "#C6E0B4", "#A9D08E", "#548235", "#375623"],
  // [আপগ্রেড] আধুনিক ব্র্যান্ড-গ্রেড accent কলাম
  ["#0D9488", "#CCFBF1", "#99F6E4", "#5EEAD4", "#0F766E", "#134E4A"],
  ["#7C3AED", "#EDE9FE", "#DDD6FE", "#C4B5FD", "#6D28D9", "#4C1D95"],
  ["#DB2777", "#FCE7F3", "#FBCFE8", "#F9A8D4", "#BE185D", "#831843"],
  ["#EA580C", "#FFEDD5", "#FED7AA", "#FDBA74", "#C2410C", "#7C2D12"],
  ["#2563EB", "#DBEAFE", "#BFDBFE", "#93C5FD", "#1D4ED8", "#1E3A8A"],
  ["#0F172A", "#E2E8F0", "#CBD5E1", "#94A3B8", "#1E293B", "#020617"],
];

function AdvancedColorDropdown({
  label,
  icon: Icon,
  value,
  onChange,
  allowNoFill = false,
  storageKey,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  onChange: (color: string) => void;
  allowNoFill?: boolean;
  storageKey: string;
}) {

  const [open, setOpen] = useState(false);
  const [customHex, setCustomHex] = useState(value === "transparent" ? "#FFFFFF" : value);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      // Restore persisted color history once this browser-only control mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setRecentColors(JSON.parse(raw));
    } catch {
      /* localStorage unavailable */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && e.target instanceof Node && wrapRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const commitColor = (color: string) => {
    onChange(color);
    if (color !== "transparent") {
      setRecentColors((prev) => {
        const next = [color, ...prev.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 10);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* localStorage unavailable */
        }
        return next;
      });
    }
    setOpen(false);
  };

  const checkerBg = {
    backgroundImage:
      "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)",
    backgroundSize: "6px 6px",
    backgroundPosition: "0 0, 3px 3px",
  } as const;

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => commitColor(value)}
          title={label}
          aria-label={label}
          className="group relative flex h-8 w-8 items-center justify-center rounded-l-md border border-transparent text-[#323130] transition-all hover:border-[#C8C6C4] hover:bg-white hover:text-[#106EBE] hover:shadow-md"
        >
          <Icon size={17} />
          <span
            className="absolute bottom-1 h-0.75 w-5 rounded-full"
            style={value === "transparent" ? { ...checkerBg, backgroundSize: "4px 4px" } : { backgroundColor: value }}
          />
          <span className="pointer-events-none absolute left-1/2 top-full z-9999 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#201F1E] px-2 py-1 text-[11px] font-semibold text-white shadow-lg group-hover:block">
            {label}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={`${label} — More options`}
          aria-label={`${label} — More options`}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`flex h-8 w-4 items-center justify-center rounded-r-md border transition-all ${open ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-transparent text-[#605E5C] hover:border-[#C8C6C4] hover:bg-white hover:text-[#106EBE]"
            }`}
        >
          <Icons.ChevronDown size={12} />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-9990" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-9991 mt-1 w-72 rounded-xl border border-[#C8C6C4] bg-white p-3 shadow-2xl">
            {allowNoFill && (
              <button
                type="button"
                onClick={() => commitColor("transparent")}
                className="mb-3 flex w-full items-center gap-2 rounded-md border border-[#D2D0CE] px-2 py-1.5 text-xs font-bold text-[#323130] hover:border-[#106EBE] hover:bg-[#F3F2F1]"
              >
                <span className="h-4 w-4 rounded border border-[#C8C6C4]" style={checkerBg} />
                No Fill
              </button>
            )}

            <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#8A8886]">Theme Colors</p>
            <div className="mb-3 grid grid-cols-10 gap-0.75">

              {THEME_COLOR_COLUMNS.map((col, ci) =>
                col.map((c, ri) => (
                  <button
                    key={`theme-${ci}-${ri}`}
                    type="button"
                    title={c}
                    onClick={() => commitColor(c)}
                    className="h-5 w-5 rounded-md border border-black/10 shadow-sm transition-all duration-150 hover:z-10 hover:scale-110 hover:border-transparent hover:ring-2 hover:ring-[#106EBE]/40"
                    style={{ backgroundColor: c }}
                  />
                ))
              )}
            </div>

            <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#8A8886]">Standard Colors</p>
            <div className="mb-3 grid grid-cols-10 gap-0.75">
              {STANDARD_COLORS.map((c) => (
                <button
                  key={`std-${c}`}
                  type="button"
                  title={c}
                  onClick={() => commitColor(c)}
                  className="h-5 w-5 rounded-md border border-black/10 shadow-sm transition-all duration-150 hover:z-10 hover:scale-110 hover:border-transparent hover:ring-2 hover:ring-[#106EBE]/40"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {recentColors.length > 0 && (
              <>
                <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#8A8886]">Recent Colors</p>
                <div className="mb-3 grid grid-cols-10 gap-0.75">
                  {recentColors.map((c, i) => (
                    <button
                      key={`recent-${c}-${i}`}
                      type="button"
                      title={c}
                      onClick={() => commitColor(c)}
                      className="h-5 w-5 rounded-md border border-black/10 shadow-sm transition-all duration-150 hover:z-10 hover:scale-110 hover:border-transparent hover:ring-2 hover:ring-[#106EBE]/40"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="border-t border-[#E1DFDD] pt-2">
              <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#8A8886]">Custom Color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#([0-9A-Fa-f]{6})$/.test(customHex) ? customHex : "#FFFFFF"}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-[#D2D0CE]"
                  title="Pick custom color"
                />
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  placeholder="#RRGGBB"
                  className="w-24 rounded-md border border-[#D2D0CE] px-2 py-1 text-xs font-mono outline-none focus:border-[#106EBE]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (/^#([0-9A-Fa-f]{6})$/.test(customHex)) commitColor(customHex);
                  }}
                  className="rounded-md bg-[#106EBE] px-3 py-1 text-xs font-bold text-white hover:bg-[#005A9E]"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================================
 * Advanced Font Picker — Search + Categorized + Live Preview + Recently Used
 * ========================================================================== */

function AdvancedFontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (font: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentFonts, setRecentFonts] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_FONTS_KEY);
      // Restore persisted font history once this browser-only control mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setRecentFonts(JSON.parse(raw));
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && e.target instanceof Node && wrapRef.current.contains(e.target)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const commitFont = (font: string) => {
    const trimmed = font.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setRecentFonts((prev) => {
      const next = [trimmed, ...prev.filter((f) => f.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_FONTS_KEY, JSON.stringify(next));
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
    setOpen(false);
    setQuery("");
  };

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FONT_CATEGORIES;
    return FONT_CATEGORIES.map((cat) => ({
      category: cat.category,
      fonts: cat.fonts.filter((f) => f.toLowerCase().includes(q)),
    })).filter((cat) => cat.fonts.length > 0);
  }, [query]);

  const flatFilteredFonts = useMemo(() => filteredCategories.flatMap((c) => c.fonts), [filteredCategories]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => Math.min(flatFilteredFonts.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = flatFilteredFonts[highlightIndex] || query.trim();
      if (chosen) commitFont(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : value}
        onFocus={() => { setOpen(true); setQuery(""); setHighlightIndex(0); }}
        onChange={(e) => { setQuery(e.target.value); setHighlightIndex(0); }}
        onKeyDown={handleKeyDown}
        title="Font Name"
        aria-label="Font Name"
        style={{ fontFamily: open ? undefined : value }}
        className="h-8 w-47.5 rounded-md border border-[#C8C6C4] bg-white px-2 text-sm shadow-inner outline-none hover:border-[#106EBE] focus:border-[#106EBE]"
        placeholder="Search fonts..."
      />
      <Icons.ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#605E5C]" />

      {open && (
        <div className="absolute left-0 top-full z-9991 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-[#C8C6C4] bg-white py-2 shadow-2xl awm-premium-scrollbar">
          {!query && recentFonts.length > 0 && (
            <div className="mb-2 border-b border-[#E1DFDD] pb-2">
              <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-wide text-[#8A8886]">Recently Used</p>
              {recentFonts.map((font) => (
                <button
                  key={`recent-${font}`}
                  type="button"
                  onClick={() => commitFont(font)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-[#E5F1FB] ${font === value ? "bg-[#E5F1FB] text-[#106EBE]" : "text-[#323130]"}`}
                  style={{ fontFamily: font }}
                >
                  <span>{font}</span>
                  {font === value && <Icons.Check size={13} className="text-[#106EBE]" />}
                </button>
              ))}
            </div>
          )}

          {filteredCategories.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[#8A8886]">
              <p>No matching font found.</p>
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => commitFont(query)}
                  className="mt-2 rounded-md border border-[#106EBE] px-3 py-1 text-xs font-bold text-[#106EBE] hover:bg-[#E5F1FB]"
                >
                  Use &quot;{query.trim()}&quot; anyway
                </button>
              )}
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.category} className="mb-1">
                <p className="px-3 pb-1 pt-1 text-[10px] font-black uppercase tracking-wide text-[#8A8886]">{cat.category}</p>
                {cat.fonts.map((font) => {
                  const flatIndex = flatFilteredFonts.indexOf(font);
                  const isHighlighted = flatIndex === highlightIndex;
                  const isSelected = font === value;
                  return (
                    <button
                      key={font}
                      type="button"
                      onClick={() => commitFont(font)}
                      onMouseEnter={() => setHighlightIndex(flatIndex)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${isHighlighted ? "bg-[#F3F2F1]" : ""} ${isSelected ? "bg-[#E5F1FB] text-[#106EBE]" : "text-[#323130]"}`}
                      style={{ fontFamily: font }}
                    >
                      <span className="truncate">{font}</span>
                      {isSelected && <Icons.Check size={13} className="shrink-0 text-[#106EBE]" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * কালার কনভার্সন ইউটিলিটি — HEX ⇄ RGB ⇄ HSL রূপান্তরের জন্য
 * ========================================================================== */

// HEX (#RRGGBB) কে RGB অবজেক্টে রূপান্তর করে
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

// RGB মানকে HEX কোডে রূপান্তর করে
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}



// বেস কালারের (সেলের নিজস্ব ব্যাকগ্রাউন্ড) উপর একটা স্বচ্ছ (rgba) কালার
// "ব্লেন্ড" করে একটামাত্র solid হেক্স কালার বানায় — এভাবে backgroundColor
// একবারই সেট হয়, তাই ইনলাইন style-এর কারণে সিলেকশনের কালার হারিয়ে যায় না
function blendWithAlpha(baseHex: string, overlayHex: string, alpha: number): string {
  const base = hexToRgb(baseHex) || { r: 255, g: 255, b: 255 };
  const overlay = hexToRgb(overlayHex) || { r: 16, g: 110, b: 190 };
  const r = overlay.r * alpha + base.r * (1 - alpha);
  const g = overlay.g * alpha + base.g * (1 - alpha);
  const b = overlay.b * alpha + base.b * (1 - alpha);
  return rgbToHex(r, g, b);
}

/* ============================================================================
 * Advanced Border Dropdown — Style + Width + Placement + Color — সব একসাথে
 * ========================================================================== */

// বর্ডারের মিনি-প্রিভিউ লাইন — প্রতিটা স্টাইল অপশনের পাশে ছোট নমুনা দেখানোর জন্য

function ToolbarSeparator() {
  return <span className="mx-0.5 h-6 w-px bg-[#C8C6C4]" aria-hidden="true" />;
}
function DeveloperMacroMenu({
  isRecording,
  isPlayingMacro,
  savedMacros,
  extraItems,
  onToggleRecording,
  onRunMacro,
  onRenameMacro,
  onDeleteMacro,
  onCancelPlayback,
  onExtraItemClick,
}: {
  isRecording: boolean;
  isPlayingMacro: boolean;
  savedMacros: SavedMacro[];
  extraItems: MenuItemDefinition[];
  onToggleRecording: () => void;
  onRunMacro: (macro: SavedMacro) => void;
  onRenameMacro: (id: string) => void;
  onDeleteMacro: (id: string) => void;
  onCancelPlayback: () => void;
  onExtraItemClick: (action: string) => void;
}) {
  const [showSavedList, setShowSavedList] = useState(false);

  return (
    <div
      className="absolute top-full left-0 min-w-68 bg-white border border-[#D2D0CE] shadow-[0_14px_34px_rgba(0,0,0,0.18)] py-1 m-0 z-1000 rounded-b-xl overflow-hidden animate-[awmFadeIn_0.1s_ease-out]"
      role="menu"
    >
      {/* Record / Stop Recording — লেবেল ও আইকন state অনুযায়ী পরিবর্তিত হয় */}
      <button
        type="button"
        role="menuitem"
        onClick={onToggleRecording}
        disabled={isPlayingMacro}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#000000] hover:bg-[#F3F2F1] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isRecording ? (
          <>
            <Icons.Square size={13} className="text-[#A80000]" />
            <span>Stop Recording</span>
          </>
        ) : (
          <>
            <span className="h-3 w-3 rounded-full bg-red-600" />
            <span>Record Macro</span>
          </>
        )}
      </button>

      <div className="my-1 h-px bg-[#E1DFDD]" />

      {/* Run / Saved Macros — সাব-লিস্ট, empty-state সহ */}
      <button
        type="button"
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={showSavedList}
        onClick={() => setShowSavedList((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-[13px] text-[#000000] hover:bg-[#F3F2F1]"
      >
        <span className="flex items-center gap-2">
          <Icons.Play size={13} className="text-[#107C10]" />
          Run / Saved Macros
        </span>
        <Icons.ChevronRight size={13} className={showSavedList ? "rotate-90 transition-transform" : "transition-transform"} />
      </button>

      {showSavedList && (
        <div className="max-h-56 overflow-y-auto border-t border-[#E1DFDD] bg-[#FAFAFA]">
          {savedMacros.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#605E5C]">No saved macros</p>
          ) : (
            savedMacros.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-1 px-3 py-1.5 text-[12px] hover:bg-[#F3F2F1]">
                <button
                  type="button"
                  onClick={() => onRunMacro(m)}
                  disabled={isPlayingMacro || isRecording}
                  className="flex-1 truncate text-left text-[#106EBE] hover:underline disabled:cursor-not-allowed disabled:text-[#8A8886] disabled:no-underline"
                  title={m.name}
                >
                  {m.name}
                </button>
                <button
                  type="button"
                  onClick={() => onRenameMacro(m.id)}
                  title="Rename"
                  aria-label={`Rename ${m.name}`}
                  className="rounded p-1 text-[#605E5C] hover:bg-[#E5F1FB] hover:text-[#106EBE]"
                >
                  <Icons.Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteMacro(m.id)}
                  title="Delete"
                  aria-label={`Delete ${m.name}`}
                  className="rounded p-1 text-[#605E5C] hover:bg-red-50 hover:text-red-600"
                >
                  <Icons.Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {isPlayingMacro && (
        <>
          <div className="my-1 h-px bg-[#E1DFDD]" />
          <button
            type="button"
            onClick={onCancelPlayback}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
          >
            <Icons.OctagonX size={13} />
            Stop Playback
          </button>
        </>
      )}

      {/* আগে থেকে থাকা Developer মেনুর অন্যান্য আইটেম (View Formulas, Recalculate All ইত্যাদি) —
          এগুলো হারিয়ে না গিয়ে এই নতুন dropdown-এর নিচের অংশে সংরক্ষিত থাকলো */}
      {extraItems.length > 0 && (
        <>
          <div className="my-1 h-px bg-[#E1DFDD]" />
          {extraItems.map((item, i) =>
            item.isDivider ? (
              <div key={`extra-div-${i}`} className="my-1 h-px bg-[#E1DFDD]" />
            ) : (
              <button
                key={`${item.label}-${i}`}
                type="button"
                role="menuitem"
                onClick={() => onExtraItemClick(item.action)}
                className="flex w-full items-center justify-between px-4 py-1.5 text-left text-[13px] text-[#000000] hover:bg-[#F3F2F1]"
              >
                <span className="whitespace-nowrap">{item.label}</span>
                {item.shortcut && <span className="text-[#605E5C] text-[12px] ml-6">{item.shortcut}</span>}
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}

function ToolBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={`h-8 rounded-lg border px-3 text-xs font-bold transition-all shadow-sm ${active ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#D2D0CE] bg-[#FFFFFF] text-[#000000] hover:bg-[#F3F2F1] hover:border-[#106EBE]"}`}>
      {children}
    </button>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#D2D0CE] bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-[#605E5C]">{title}</h3>
      {children}
    </section>
  );
}

function CollapsibleSection({
  title, sectionKey, collapsed, onToggle, children,
}: {
  title: string;
  sectionKey: string;
  collapsed: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#D2D0CE] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#F3F2F1]"
        aria-expanded={!collapsed}
      >
        <h3 className="text-xs font-black uppercase tracking-wide text-[#605E5C]">{title}</h3>
        <Icons.ChevronDown size={14} className={`text-[#605E5C] transition-transform ${collapsed ? "-rotate-90" : ""}`} />
      </button>
      {!collapsed && <div className="border-t border-[#E1DFDD] p-3">{children}</div>}
    </section>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E1DFDD] bg-[#FAFAFA] p-2">
      <p className="text-[10px] font-bold uppercase text-[#605E5C]">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-[#106EBE]">{value}</p>
    </div>
  );
}

function SidebarStyleButton({ label, onClick, className = "" }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={`w-full rounded-xl border border-[#D2D0CE] bg-white px-4 py-3 text-left text-sm font-black shadow-sm transition-all hover:border-[#106EBE] hover:shadow-md ${className}`}>
      {label}
    </button>
  );
}

/* ============================================================================
 * Special Characters — Quick Dropdown (টুলবার বোতামে ক্লিক করলে খোলে)
 * ========================================================================== */
function SpecialCharactersQuickButton({
  open, onToggle, menuRef,
  favorites, recent,
  onPick, onOpenDialog,
}: {
  open: boolean;
  onToggle: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  favorites: string[];
  recent: string[];
  onPick: (ch: string) => void;
  onOpenDialog: () => void;
}) {
  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        title="Insert Special Character"
        aria-label="Insert Special Character"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`group relative flex h-8 w-8 items-center justify-center rounded-md border text-[#323130] shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#106EBE]/30 ${open ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-transparent hover:border-[#C8C6C4] hover:bg-white hover:text-[#106EBE] hover:shadow-md"
          }`}
      >
        <Icons.Omega size={17} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-9991 mt-1 w-64 rounded-lg border border-[#C8C6C4] bg-white py-2 shadow-2xl">
          {/* ফেভারিট প্যানেল — দ্রুত অ্যাক্সেসের জন্য গ্রিড */}
          <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-wide text-[#8A8886]">Favorites</p>
          <div className="grid grid-cols-8 gap-1 px-3">
            {favorites.length === 0 ? (
              <p className="col-span-8 py-2 text-xs text-[#8A8886]">No favorites yet.</p>
            ) : (
              favorites.map((ch, i) => (
                <button
                  key={`fav-${ch}-${i}`}
                  type="button"
                  onClick={() => onPick(ch)}
                  title={ch}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E1DFDD] text-sm hover:border-[#106EBE] hover:bg-[#E5F1FB]"
                >
                  {ch}
                </button>
              ))
            )}
          </div>

          <div className="my-2 h-px bg-[#E1DFDD]" />

          {/* সাম্প্রতিক ব্যবহৃত ক্যারেক্টার */}
          <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-wide text-[#8A8886]">
            {recent.length === 0 ? "No recent characters" : "Recent characters"}
          </p>
          {recent.length > 0 && (
            <div className="grid grid-cols-8 gap-1 px-3">
              {recent.map((ch, i) => (
                <button
                  key={`rec-${ch}-${i}`}
                  type="button"
                  onClick={() => onPick(ch)}
                  title={ch}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E1DFDD] text-sm hover:border-[#106EBE] hover:bg-[#E5F1FB]"
                >
                  {ch}
                </button>
              ))}
            </div>
          )}

          <div className="my-2 h-px bg-[#E1DFDD]" />

          {/* সম্পূর্ণ ডায়ালগ ওপেন করার বাটন */}
          <button
            type="button"
            onClick={onOpenDialog}
            className="mx-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-md bg-[#106EBE] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#005A9E]"
          >
            More Characters...
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Special Characters — সম্পূর্ণ মোডাল ডায়ালগ (LibreOffice Calc স্টাইল)
 * ========================================================================== */
function SpecialCharactersDialog({
  fonts, blocks,
  selectedFont, setSelectedFont,
  selectedBlock, setSelectedBlock,
  search, setSearch,
  selectedChar, setSelectedChar,
  favorites, recent,
  onInsert, onToggleFavorite, onClose,
}: {
  fonts: string[];
  blocks: CharBlockDef[];
  selectedFont: string; setSelectedFont: (v: string) => void;
  selectedBlock: string; setSelectedBlock: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  selectedChar: string | null; setSelectedChar: (v: string | null) => void;
  favorites: string[];
  recent: string[];
  onInsert: (ch: string) => void;
  onToggleFavorite: (ch: string) => void;
  onClose: () => void;
}) {
  // নির্বাচিত ব্লকের সব ক্যারেক্টার জেনারেট করা হচ্ছে
  const blockDef = blocks.find((b) => b.name === selectedBlock) || blocks[0];
  const allCharsInBlock = useMemo(() => {
    const out: { ch: string; code: number }[] = [];
    for (let cp = blockDef.start; cp <= blockDef.end; cp++) {
      out.push({ ch: String.fromCodePoint(cp), code: cp });
    }
    return out;
  }, [blockDef]);

  // সার্চ বক্সে টাইপ করলে ক্যারেক্টার, নাম, hex বা decimal দিয়ে ফিল্টার হবে
  const filteredChars = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCharsInBlock;
    return allCharsInBlock.filter(({ ch, code }) => {
      const name = getCharacterName(code).toLowerCase();
      const hex = code.toString(16).toLowerCase();
      return ch === search || name.includes(q) || hex.includes(q) || String(code).includes(q);
    });
  }, [allCharsInBlock, search]);

  const selectedCode = selectedChar ? selectedChar.codePointAt(0) || 0 : null;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-[#D2D0CE] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D2D0CE] px-6 py-4">
          <h3 className="text-lg font-black text-[#106EBE]">Special Characters</h3>
          <button onClick={onClose} className="rounded-lg border border-[#D2D0CE] bg-[#F3F2F1] px-3 py-1 text-sm font-bold hover:bg-[#E1DFDD]">Close</button>
        </div>

        {/* ফিল্টার রো: Font + Character Block + Search */}
        <div className="grid grid-cols-1 gap-2 border-b border-[#D2D0CE] px-6 py-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#605E5C]">Font</label>
            <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]">
              {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#605E5C]">Character Block</label>
            <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]">
              {CHARACTER_BLOCKS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#605E5C]">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, char, or code..."
              className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]"
            />
          </div>
        </div>

        {/* মূল বডি: গ্রিড + প্রিভিউ প্যানেল */}
        <div className="flex min-h-0 flex-1">
          <div className="grid flex-1 grid-cols-10 gap-1 overflow-y-auto p-3 awm-premium-scrollbar sm:grid-cols-12">
            {filteredChars.map(({ ch, code }) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedChar(ch)}
                onDoubleClick={() => onInsert(ch)}
                title={getCharacterName(code)}
                style={{ fontFamily: selectedFont }}
                className={`flex h-9 w-9 items-center justify-center rounded-md border text-base ${selectedChar === ch ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#E1DFDD] text-[#323130] hover:border-[#106EBE] hover:bg-[#F4F9FD]"
                  }`}
              >
                {ch}
              </button>
            ))}
            {filteredChars.length === 0 && (
              <p className="col-span-full py-6 text-center text-xs text-[#8A8886]">No characters matched your search.</p>
            )}
          </div>

          {/* ডানপাশে প্রিভিউ ও ডিটেইলস */}
          <div className="w-52 shrink-0 border-l border-[#D2D0CE] bg-[#FAFAFA] p-4">
            <div
              className="mb-3 flex h-24 items-center justify-center rounded-lg border border-[#D2D0CE] bg-white text-5xl"
              style={{ fontFamily: selectedFont }}
            >
              {selectedChar || ""}
            </div>
            {selectedChar && selectedCode !== null ? (
              <div className="space-y-1 text-xs">
                <p className="font-bold text-[#106EBE]">{getCharacterName(selectedCode)}</p>
                <p className="text-[#605E5C]">Hex: U+{selectedCode.toString(16).toUpperCase().padStart(4, "0")}</p>
                <p className="text-[#605E5C]">Decimal: {selectedCode}</p>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(selectedChar)}
                  className={`mt-2 w-full rounded-md border px-2 py-1.5 text-xs font-bold ${favorites.includes(selectedChar) ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#D2D0CE] hover:border-[#106EBE]"
                    }`}
                >
                  {favorites.includes(selectedChar) ? "Remove from Favorites" : "Add to Favorites"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#8A8886]">Select a character to see details.</p>
            )}
          </div>
        </div>

        {/* নিচে Recent ও Favorite রো */}
        <div className="border-t border-[#D2D0CE] px-6 py-2">
          <p className="mb-1 text-[10px] font-black uppercase text-[#8A8886]">Recent Characters</p>
          <div className="flex flex-wrap gap-1">
            {recent.length === 0 ? (
              <span className="text-xs text-[#8A8886]">No recent characters</span>
            ) : (
              recent.map((ch, i) => (
                <button key={`d-rec-${ch}-${i}`} onClick={() => setSelectedChar(ch)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E1DFDD] text-sm hover:border-[#106EBE]">{ch}</button>
              ))
            )}
          </div>
        </div>
        <div className="border-t border-[#D2D0CE] px-6 py-2">
          <p className="mb-1 text-[10px] font-black uppercase text-[#8A8886]">Favorite Characters</p>
          <div className="flex flex-wrap gap-1">
            {favorites.length === 0 ? (
              <span className="text-xs text-[#8A8886]">No favorites yet</span>
            ) : (
              favorites.map((ch, i) => (
                <button key={`d-fav-${ch}-${i}`} onClick={() => setSelectedChar(ch)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E1DFDD] text-sm hover:border-[#106EBE]">{ch}</button>
              ))
            )}
          </div>
        </div>

        {/* কন্ট্রোল বাটন: Insert / Cancel / Help */}
        <div className="flex items-center justify-between border-t border-[#D2D0CE] px-6 py-4">
          <button type="button" className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1]">Help</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1]">Cancel</button>
            <button
              type="button"
              disabled={!selectedChar}
              onClick={() => selectedChar && onInsert(selectedChar)}
              className="rounded-md bg-[#106EBE] px-6 py-2 text-xs font-bold text-white hover:bg-[#005A9E] disabled:opacity-40"
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HyperlinkPickerDialog({
  links,
  search,
  setSearch,
  onPick,
  onManual,
  onClose,
}: {
  links: AwmModuleLink[];
  search: string;
  setSearch: (v: string) => void;
  onPick: (link: AwmModuleLink) => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return links;
    return links.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.section.toLowerCase().includes(q) ||
        l.href.toLowerCase().includes(q)
    );
  }, [links, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, AwmModuleLink[]>();
    filtered.forEach((l) => {
      if (!map.has(l.section)) map.set(l.section, []);
      map.get(l.section)!.push(l);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-[#D2D0CE] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D2D0CE] px-6 py-4">
          <h3 className="text-lg font-black text-[#106EBE]">Insert Hyperlink — AWM ERP Module</h3>
          <button onClick={onClose} className="rounded-lg border border-[#D2D0CE] bg-[#F3F2F1] px-3 py-1 text-sm font-bold hover:bg-[#E1DFDD]">
            Close
          </button>
        </div>

        <div className="border-b border-[#D2D0CE] px-6 py-3">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="মডিউলের নাম লিখে সার্চ করুন..."
            className="w-full rounded-xl border border-[#D2D0CE] px-3 py-2 text-sm outline-none focus:border-[#106EBE]"
          />
        </div>

        <div className="flex-1 overflow-auto px-6 py-3 awm-premium-scrollbar">
          {grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#605E5C]">কোনো মডিউল পাওয়া যায়নি।</p>
          ) : (
            grouped.map(([section, items]) => (
              <div key={section} className="mb-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#605E5C]">{section}</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {items.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => onPick(item)}
                      title={item.href}
                      className="flex items-center justify-between rounded-lg border border-[#E1DFDD] bg-white px-3 py-2 text-left text-xs hover:border-[#106EBE] hover:bg-[#F4F9FD]"
                    >
                      <span className="truncate">{item.label}</span>
                      <span className="ml-2 shrink-0 text-[10px] text-[#8A8886]">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#D2D0CE] px-6 py-4">
          <button
            type="button"
            onClick={onManual}
            className="rounded-md border border-[#106EBE] px-4 py-2 text-xs font-bold text-[#106EBE] hover:bg-[#E5F1FB]"
          >
            নিজের URL লিখব
          </button>
          <button type="button" onClick={onClose} className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Share Link Popover — WhatsApp, Messenger, Telegram, Email, Copy Link
 * ========================================================================== */
function ShareLinkMenu({
  refObject,
  x,
  y,
  url,
  label,
  onCopy,
  onClose,
}: {
  refObject: React.RefObject<HTMLDivElement | null>;
  x: number;
  y: number;
  url: string;
  label: string;
  onCopy: () => void;
  onClose: () => void;
}) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${label}: ${url}`);

  const options: {
    name: string;
    icon: React.ComponentType<{ size?: number }>;
    href?: string;
    onClick?: () => void;
  }[] = [
      {
        name: "WhatsApp",
        icon: Icons.MessageCircle,
        href: `https://wa.me/?text=${encodedText}`,
      },
      {
        name: "Telegram",
        icon: Icons.Send,
        href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(
          label
        )}`,
      },
      {
        name: "Messenger",
        icon: Icons.MessageSquare,
        href: `fb-messenger://share/?link=${encodedUrl}`,
      },
      {
        name: "Email",
        icon: Icons.Mail,
        href: `mailto:?subject=${encodeURIComponent(
          label
        )}&body=${encodedText}`,
      },
      {
        name: "imo",
        icon: Icons.Share2,
        onClick: onCopy,
      },
    ];

  return (
    <div
      ref={refObject}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 99999,
      }}
      className="w-60 overflow-hidden rounded-lg border border-[#D2D0CE] bg-white py-1 text-sm shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[11px] font-black uppercase tracking-wide text-[#8A8886]">
          Share Link
        </span>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-[#605E5C] hover:bg-[#E1DFDD]"
          aria-label="Close"
        >
          <Icons.X size={14} />
        </button>
      </div>

      <div className="my-1 h-px bg-[#E1DFDD]" />

      {/* Share Options */}
      {options.map((opt) => {
        const Icon = opt.icon;

        if (opt.href) {
          return (
            <a
              key={opt.name}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-[#201F1E] hover:bg-[#E5F1FB] hover:text-[#106EBE]"
            >
              <Icon size={16} />
              {opt.name}
            </a>
          );
        }

        return (
          <button
            key={opt.name}
            type="button"
            onClick={opt.onClick}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] text-[#201F1E] hover:bg-[#E5F1FB] hover:text-[#106EBE]"
            title="imo-তে সরাসরি শেয়ার লিংক নেই — লিংক কপি হয়ে যাবে, imo চ্যাটে পেস্ট করুন"
          >
            <Icon size={16} />
            imo (Copy & Paste)
          </button>
        );
      })}

      {/* Copy Link */}
      <div className="my-1 h-px bg-[#E1DFDD]" />

      <button
        type="button"
        onClick={onCopy}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] font-bold text-[#106EBE] hover:bg-[#E5F1FB]"
      >
        <Icons.Copy size={16} />
        Copy Link
      </button>
    </div>
  );
}

interface ContextMenuItemProps {
  label: string;
  shortcut?: string;
  onClick: () => void;
  onClose: () => void;
  danger?: boolean;
}

/** Shared, stable menu item component; declared outside menu renders. */
function ContextMenuItem({
  label,
  shortcut,
  onClick,
  onClose,
  danger = false,
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        onClose();
      }}
      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-[#E5F1FB] ${danger ? "text-[#A80000] hover:text-[#A80000]" : "text-[#201F1E] hover:text-[#106EBE]"}`}
    >
      <span>{label}</span>
      {shortcut && <span className="ml-6 text-[11px] text-[#8A8886]">{shortcut}</span>}
    </button>
  );
}

function ContextMenuDivider() {
  return <div className="my-1 h-px bg-[#E1DFDD]" />;
}

/* ============================================================================
 * কলাম হেডার রাইট-ক্লিক কনটেক্সট মেনু — LibreOffice Calc স্টাইল
 * ========================================================================== */
function ColumnHeaderContextMenu({
  refObject,
  x, y, col,
  onClose,
  onCut, onCopy, onPaste, onPasteSpecial,
  onInsertBefore, onInsertAfter, onDeleteColumn, onClearContents,
  onOpenWidthDialog, onOptimalWidth,
  onHideColumns, onShowColumns,
  onFreeze, onSplit, onFormatCells,
}: {
  refObject: React.RefObject<HTMLDivElement | null>;
  x: number; y: number; col: number;
  onClose: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onPasteSpecial: (mode: "values" | "formatting" | "formulas") => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onDeleteColumn: () => void;
  onClearContents: () => void;
  onOpenWidthDialog: () => void;
  onOptimalWidth: () => void;
  onHideColumns: () => void;
  onShowColumns: () => void;
  onFreeze: () => void;
  onSplit: () => void;
  onFormatCells: () => void;
}) {
  return (
    <div
      ref={refObject}
      style={{ position: "fixed", left: x, top: y, zIndex: 99999 }}
      className="w-64 overflow-hidden rounded-lg border border-[#D2D0CE] bg-white py-1 text-sm shadow-2xl"
    >
      {/* কলাম নম্বর হেডার — কোন কলামে মেনু খোলা হয়েছে তা দেখানোর জন্য */}
      <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#8A8886]">
        Column {colToLetter(col)}
      </div>
      <ContextMenuDivider />

      {/* ১. ক্লিপবোর্ড অপশন */}
      <ContextMenuItem onClose={onClose} label="Cut" shortcut="Ctrl+X" onClick={onCut} />
      <ContextMenuItem onClose={onClose} label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
      <ContextMenuItem onClose={onClose} label="Paste" shortcut="Ctrl+V" onClick={onPaste} />
      <ContextMenuItem onClose={onClose} label="Paste Special: Values" shortcut="Ctrl+Shift+V" onClick={() => onPasteSpecial("values")} />
      <ContextMenuItem onClose={onClose} label="Paste Special: Formatting" onClick={() => onPasteSpecial("formatting")} />
      <ContextMenuItem onClose={onClose} label="Paste Special: Formulas" onClick={() => onPasteSpecial("formulas")} />
      <ContextMenuDivider />

      {/* ২. কলাম ইনসার্ট ও ডিলিট */}
      <ContextMenuItem onClose={onClose} label="Insert Columns Before" onClick={onInsertBefore} />
      <ContextMenuItem onClose={onClose} label="Insert Columns After" onClick={onInsertAfter} />
      <ContextMenuItem onClose={onClose} label="Delete Columns" onClick={onDeleteColumn} danger />
      <ContextMenuItem onClose={onClose} label="Clear Contents..." shortcut="Backspace" onClick={onClearContents} />
      <ContextMenuDivider />

      {/* ৩. কলাম অ্যাডজাস্টমেন্ট ও ভিজিবিলিটি */}
      <ContextMenuItem onClose={onClose} label="Column Width..." onClick={onOpenWidthDialog} />
      <ContextMenuItem onClose={onClose} label="Optimal Width..." onClick={onOptimalWidth} />
      <ContextMenuItem onClose={onClose} label="Hide Columns" onClick={onHideColumns} />
      <ContextMenuItem onClose={onClose} label="Show Columns" onClick={onShowColumns} />
      <ContextMenuDivider />

      {/* ৪. অ্যাডভান্সড ভিউ ও ফরম্যাটিং */}
      <ContextMenuItem onClose={onClose} label="Freeze Rows and Columns" onClick={onFreeze} />
      <ContextMenuItem onClose={onClose} label="Split Window" onClick={onSplit} />
      <ContextMenuItem onClose={onClose} label="Format Cells..." shortcut="Ctrl+1" onClick={onFormatCells} />
    </div>
  );
}

/* ============================================================================
 * রো হেডার রাইট-ক্লিক কনটেক্সট মেনু — LibreOffice Calc স্টাইল
 * ========================================================================== */
function RowHeaderContextMenu({
  refObject,
  x, y, row,
  onClose,
  onCut, onCopy, onPaste, onPasteSpecial,
  onInsertAbove, onInsertBelow, onDeleteRow, onClearContents,
  onOpenHeightDialog, onOptimalHeight,
  onHideRows, onShowRows,
  onFreeze, onSplit, onFormatCells,
}: {
  refObject: React.RefObject<HTMLDivElement | null>;
  x: number; y: number; row: number;
  onClose: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onPasteSpecial: (mode: "values" | "formatting" | "formulas") => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onDeleteRow: () => void;
  onClearContents: () => void;
  onOpenHeightDialog: () => void;
  onOptimalHeight: () => void;
  onHideRows: () => void;
  onShowRows: () => void;
  onFreeze: () => void;
  onSplit: () => void;
  onFormatCells: () => void;
}) {
  return (
    <div
      ref={refObject}
      style={{ position: "fixed", left: x, top: y, zIndex: 99999 }}
      className="w-64 overflow-hidden rounded-lg border border-[#D2D0CE] bg-white py-1 text-sm shadow-2xl"
    >
      <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#8A8886]">
        Row {row + 1}
      </div>
      <ContextMenuDivider />

      {/* ১. ক্লিপবোর্ড অপশন */}
      <ContextMenuItem onClose={onClose} label="Cut" shortcut="Ctrl+X" onClick={onCut} />
      <ContextMenuItem onClose={onClose} label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
      <ContextMenuItem onClose={onClose} label="Paste" shortcut="Ctrl+V" onClick={onPaste} />
      <ContextMenuItem onClose={onClose} label="Paste Special: Values" shortcut="Ctrl+Shift+V" onClick={() => onPasteSpecial("values")} />
      <ContextMenuItem onClose={onClose} label="Paste Special: Formatting" onClick={() => onPasteSpecial("formatting")} />
      <ContextMenuItem onClose={onClose} label="Paste Special: Formulas" onClick={() => onPasteSpecial("formulas")} />
      <ContextMenuDivider />

      {/* ২. রো ইনসার্ট ও ডিলিট */}
      <ContextMenuItem onClose={onClose} label="Insert Rows Above" onClick={onInsertAbove} />
      <ContextMenuItem onClose={onClose} label="Insert Rows Below" onClick={onInsertBelow} />
      <ContextMenuItem onClose={onClose} label="Delete Rows" onClick={onDeleteRow} danger />
      <ContextMenuItem onClose={onClose} label="Clear Contents..." shortcut="Backspace" onClick={onClearContents} />
      <ContextMenuDivider />

      {/* ৩. রো অ্যাডজাস্টমেন্ট ও ভিজিবিলিটি */}
      <ContextMenuItem onClose={onClose} label="Row Height..." onClick={onOpenHeightDialog} />
      <ContextMenuItem onClose={onClose} label="Optimal Height..." onClick={onOptimalHeight} />
      <ContextMenuItem onClose={onClose} label="Hide Rows" onClick={onHideRows} />
      <ContextMenuItem onClose={onClose} label="Show Rows" onClick={onShowRows} />
      <ContextMenuDivider />

      {/* ৪. অ্যাডভান্সড ভিউ ও ফরম্যাটিং */}
      <ContextMenuItem onClose={onClose} label="Freeze Rows and Columns" onClick={onFreeze} />
      <ContextMenuItem onClose={onClose} label="Split Window" onClick={onSplit} />
      <ContextMenuItem onClose={onClose} label="Format Cells..." shortcut="Ctrl+1" onClick={onFormatCells} />
    </div>
  );
}

// Row Height বসানোর ছোট মোডাল — ColumnWidthDialog-এর সমতুল্য
function RowHeightDialog({
  rowLabel, value, onChange, onApply, onClose,
}: {
  rowLabel: string;
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl border border-[#D2D0CE] bg-white p-5 shadow-2xl">
        <h3 className="mb-3 text-sm font-black text-[#106EBE]">Row Height — Row {rowLabel}</h3>
        <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Height (px)</label>
        <input
          type="number"
          min={16}
          max={400}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onApply(); }}
          className="w-full rounded-md border border-[#D2D0CE] px-3 py-2 text-sm outline-none focus:border-[#106EBE]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-[#D2D0CE] px-3 py-1.5 text-xs font-bold hover:bg-[#F3F2F1]">Cancel</button>
          <button onClick={onApply} className="rounded-md bg-[#106EBE] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#005A9E]">OK</button>
        </div>
      </div>
    </div>
  );
}

// Column Width বসানোর ছোট মোডাল — LibreOffice-এর "Column Width..." ডায়ালগের মতো
function ColumnWidthDialog({
  colLabel, value, onChange, onApply, onClose,
}: {
  colLabel: string;
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl border border-[#D2D0CE] bg-white p-5 shadow-2xl">
        <h3 className="mb-3 text-sm font-black text-[#106EBE]">Column Width — {colLabel}</h3>
        <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Width (px)</label>
        <input
          type="number"
          min={20}
          max={800}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onApply(); }}
          className="w-full rounded-md border border-[#D2D0CE] px-3 py-2 text-sm outline-none focus:border-[#106EBE]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-[#D2D0CE] px-3 py-1.5 text-xs font-bold hover:bg-[#F3F2F1]">Cancel</button>
          <button onClick={onApply} className="rounded-md bg-[#106EBE] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#005A9E]">OK</button>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, zIndex = 99999 }: { title: string; onClose: () => void; children: React.ReactNode; zIndex?: number }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" style={{ zIndex }}>
      <div className="w-full max-w-2xl rounded-2xl border border-[#D2D0CE] bg-[#FFFFFF] p-6 text-[#000000] shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#D2D0CE] pb-3">
          <h3 className="text-lg font-black text-[#106EBE]">{title}</h3>
          <button onClick={onClose} className="rounded-lg border border-[#D2D0CE] bg-[#F3F2F1] px-3 py-1 text-sm font-bold hover:bg-[#E1DFDD] text-[#000000]">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#D2D0CE] bg-[#FFFFFF] px-3 py-2 text-sm outline-none focus:border-[#106EBE] text-[#000000]" />
    </div>
  );
}

function ChartWizardModal({
  step, setStep,
  chartTitle, setChartTitle,
  chartRange, setChartRange,
  wizardType, setWizardType,
  subtitle, setSubtitle,
  xAxisTitle, setXAxisTitle,
  yAxisTitle, setYAxisTitle,
  showLegend, setShowLegend,
  legendPosition, setLegendPosition,
  is3D, setIs3D,
  realistic, setRealistic,
  shape, setShape,
  series, setSeries,
  onFinish, onCancel, onHelp,
}: {
  step: number; setStep: (n: number) => void;
  chartTitle: string; setChartTitle: (v: string) => void;
  chartRange: string; setChartRange: (v: string) => void;
  wizardType: ChartType; setWizardType: (v: ChartType) => void;
  subtitle: string; setSubtitle: (v: string) => void;
  xAxisTitle: string; setXAxisTitle: (v: string) => void;
  yAxisTitle: string; setYAxisTitle: (v: string) => void;
  showLegend: boolean; setShowLegend: (v: boolean) => void;
  legendPosition: "right" | "top" | "bottom" | "left" | "none"; setLegendPosition: (v: "right" | "top" | "bottom" | "left" | "none") => void;
  is3D: boolean; setIs3D: (v: boolean) => void;
  realistic: boolean; setRealistic: (v: boolean) => void;
  shape: "cylinder" | "cone" | "pyramid"; setShape: (v: "cylinder" | "cone" | "pyramid") => void;
  series: ChartSeries[]; setSeries: React.Dispatch<React.SetStateAction<ChartSeries[]>>;
  onFinish: () => void; onCancel: () => void; onHelp: () => void;
}) {
  const STEPS = ["Chart Type", "Data Range", "Data Series", "Chart Elements"];

  const addSeriesRow = () => {
    setSeries((prev) => [...prev, { id: `s_${Date.now()}`, name: `Series ${prev.length + 1}`, range: "" }]);
  };
  const removeSeriesRow = (id: string) => {
    setSeries((prev) => prev.filter((s) => s.id !== id));
  };
  const updateSeriesRow = (id: string, patch: Partial<ChartSeries>) => {
    setSeries((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl border border-[#D2D0CE] bg-white text-[#000000] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D2D0CE] px-6 py-4">
          <h3 className="text-lg font-black text-[#106EBE]">Chart Wizard</h3>
          <span className="text-xs font-bold text-[#605E5C]">Step {step} of 4: {STEPS[step - 1]}</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 border-b border-[#D2D0CE] px-6 py-3">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(n)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-[#106EBE] text-white" : done ? "bg-[#DFF6DD] text-[#107C10]" : "bg-[#F3F2F1] text-[#605E5C]"}`}
                >
                  {n}. {label}
                </button>
                {n < STEPS.length && <span className="text-[#D2D0CE]">—</span>}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="max-h-[55vh] overflow-auto px-6 py-5">
          {step === 1 && (
            <div>
              <p className="mb-3 text-sm font-bold text-[#323130]">Choose a Chart Type</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {CHART_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWizardType(opt.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold ${wizardType === opt.value ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#D2D0CE] bg-white text-[#323130] hover:border-[#106EBE]"}`}
                  >
                    <Icons.ChartColumnBig size={22} />
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-[#D2D0CE] bg-[#F8F9FA] p-4">
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" checked={is3D} onChange={(e) => setIs3D(e.target.checked)} />
                    3D Look
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" checked={realistic} onChange={(e) => setRealistic(e.target.checked)} />
                    Realistic
                  </label>
                </div>

                {is3D && (
                  <div className="mt-3 flex flex-wrap gap-4 border-t border-[#E1DFDD] pt-3">
                    <p className="w-full text-xs font-bold uppercase text-[#605E5C]">Shape</p>
                    {(["cylinder", "cone", "pyramid"] as const).map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm capitalize">
                        <input type="radio" name="wizard-shape" checked={shape === s} onChange={() => setShape(s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <LabeledInput label="Chart title" value={chartTitle} onChange={setChartTitle} />
              <LabeledInput label="Data range" value={chartRange} onChange={setChartRange} placeholder="A1:B5" />
              <p className="text-xs text-[#605E5C]">Include the header row in your range so labels can be read from the first column.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-[#323130]">Data Series</p>
              {series.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <input
                    value={s.name}
                    onChange={(e) => updateSeriesRow(s.id, { name: e.target.value })}
                    placeholder="Series name"
                    className="w-40 rounded-md border border-[#D2D0CE] px-2 py-1.5 text-xs outline-none focus:border-[#106EBE]"
                  />
                  <input
                    value={s.range}
                    onChange={(e) => updateSeriesRow(s.id, { range: e.target.value })}
                    placeholder="Series range e.g. B2:B10"
                    className="flex-1 rounded-md border border-[#D2D0CE] px-2 py-1.5 text-xs outline-none focus:border-[#106EBE]"
                  />
                  <button type="button" onClick={() => removeSeriesRow(s.id)} className="rounded-md border border-[#D2D0CE] px-2 py-1.5 text-xs text-red-600 hover:border-red-400">Remove</button>
                </div>
              ))}
              <button type="button" onClick={addSeriesRow} className="rounded-md border border-[#106EBE] px-3 py-1.5 text-xs font-bold text-[#106EBE] hover:bg-[#E5F1FB]">
                + Add Series
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <LabeledInput label="Subtitle" value={subtitle} onChange={setSubtitle} />
              <LabeledInput label="X axis title" value={xAxisTitle} onChange={setXAxisTitle} />
              <LabeledInput label="Y axis title" value={yAxisTitle} onChange={setYAxisTitle} />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} />
                Show Legend
              </label>
              {showLegend && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Legend Position</label>
                  <select
                    value={legendPosition}
                    onChange={(e) => setLegendPosition(e.target.value as typeof legendPosition)}
                    className="w-full rounded-xl border border-[#D2D0CE] bg-white px-3 py-2 text-sm outline-none focus:border-[#106EBE]"
                  >
                    <option value="right">Right</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="none">None</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between border-t border-[#D2D0CE] px-6 py-4">
          <button type="button" onClick={onHelp} className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1]">
            Help
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1]">
              Cancel
            </button>
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(Math.max(1, step - 1))}
              className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1] disabled:opacity-40"
            >
              &lt; Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(Math.min(4, step + 1))}
                className="rounded-md bg-[#106EBE] px-4 py-2 text-xs font-bold text-white hover:bg-[#005A9E]"
              >
                Next &gt;
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinish}
                className="rounded-md bg-[#107C10] px-4 py-2 text-xs font-bold text-white hover:bg-[#0E6E0E]"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function arrowHeadPoints(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const size = 8;
  const x1 = p2.x - size * Math.cos(angle - Math.PI / 6);
  const y1 = p2.y - size * Math.sin(angle - Math.PI / 6);
  const x2 = p2.x - size * Math.cos(angle + Math.PI / 6);
  const y2 = p2.y - size * Math.sin(angle + Math.PI / 6);
  return `${p2.x},${p2.y} ${x1},${y1} ${x2},${y2}`;
}


function DrawShapeRenderer({
  shape,
  allShapes,
  selected,
  onSelect,
  onResizeStart,
  onRotateStart,
}: {
  shape: DrawShape;
  allShapes: DrawShape[];
  selected: boolean;
  onSelect?: () => void;
  onResizeStart?: (handle: string, e: React.PointerEvent) => void;
  onRotateStart?: (e: React.PointerEvent<SVGCircleElement>) => void;
}) {
  const onMouseDown = (e: React.MouseEvent) => { e.stopPropagation(); onSelect?.(); };
  const handleStyle = { fill: "#FFFFFF", stroke: "#106EBE", strokeWidth: 1.5, cursor: "pointer" } as const;

  const cornerHandles = (x: number, y: number, w: number, h: number) => (
    <>
      <rect x={x - 4} y={y - 4} width={8} height={8} {...handleStyle} onPointerDown={(e) => onResizeStart?.("nw", e)} />
      <rect x={x + w - 4} y={y - 4} width={8} height={8} {...handleStyle} onPointerDown={(e) => onResizeStart?.("ne", e)} />
      <rect x={x - 4} y={y + h - 4} width={8} height={8} {...handleStyle} onPointerDown={(e) => onResizeStart?.("sw", e)} />
      <rect x={x + w - 4} y={y + h - 4} width={8} height={8} {...handleStyle} onPointerDown={(e) => onResizeStart?.("se", e)} />
    </>
  );

  const rotateHandle = (x: number, y: number, w: number) => (
    <>
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y - 22} stroke="#106EBE" strokeWidth={1} />
      <circle cx={x + w / 2} cy={y - 22} r={5} fill="#107C10" stroke="#FFFFFF" strokeWidth={1.5} style={{ cursor: "grab" }} onPointerDown={(e) => onRotateStart?.(e)} />
    </>
  );

  const endpointHandles = (p1: { x: number; y: number }, p2: { x: number; y: number }) => (
    <>
      <circle cx={p1.x} cy={p1.y} r={5} {...handleStyle} onPointerDown={(e) => onResizeStart?.("p0", e)} />
      <circle cx={p2.x} cy={p2.y} r={5} {...handleStyle} onPointerDown={(e) => onResizeStart?.("p1", e)} />
    </>
  );

  if (shape.type === "rectangle") {
    const cx = shape.x + shape.w / 2;
    const cy = shape.y + shape.h / 2;
    return (
      <g transform={shape.rotation ? `rotate(${shape.rotation} ${cx} ${cy})` : undefined}>
        <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill={shape.fill} strokeDasharray={selected ? "4 2" : undefined} onMouseDown={onMouseDown} />
        {selected && cornerHandles(shape.x, shape.y, shape.w, shape.h)}
        {selected && rotateHandle(shape.x, shape.y, shape.w)}
      </g>
    );
  }
  if (shape.type === "ellipse") {
    const cx = shape.x + shape.w / 2;
    const cy = shape.y + shape.h / 2;
    return (
      <g transform={shape.rotation ? `rotate(${shape.rotation} ${cx} ${cy})` : undefined}>
        <ellipse cx={cx} cy={cy} rx={shape.w / 2} ry={shape.h / 2} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill={shape.fill} strokeDasharray={selected ? "4 2" : undefined} onMouseDown={onMouseDown} />
        {selected && cornerHandles(shape.x, shape.y, shape.w, shape.h)}
        {selected && rotateHandle(shape.x, shape.y, shape.w)}
      </g>
    );
  }
  if (shape.type === "line" && shape.points?.length === 2) {
    const [p1, p2] = shape.points;
    return (
      <g>
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={shape.stroke} strokeWidth={shape.strokeWidth} onMouseDown={onMouseDown} />
        {selected && endpointHandles(p1, p2)}
      </g>
    );
  }
  if (shape.type === "arrow" && shape.points?.length === 2) {
    const [p1, p2] = shape.points;
    return (
      <g>
        <g onMouseDown={onMouseDown}>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
          <polygon points={arrowHeadPoints(p1, p2)} fill={shape.stroke} />
        </g>
        {selected && endpointHandles(p1, p2)}
      </g>
    );
  }
  if (shape.type === "freeform" && shape.points && shape.points.length >= 2) {
    const d = shape.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return <path d={d} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill="none" onMouseDown={onMouseDown} />;
  }
  if (shape.type === "connector") {
    const p1 = resolveConnectorPoint(shape, "start", allShapes);
    const p2 = resolveConnectorPoint(shape, "end", allShapes);
    const style = shape.connectorStyle || "straight";
    const midX = (p1.x + p2.x) / 2;
    const d = style === "elbow" ? elbowPath(p1, p2) : `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    const arrowFrom = style === "elbow" ? { x: midX, y: p2.y } : p1;
    return (
      <g onMouseDown={onMouseDown}>
        <path d={d} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill="none" strokeDasharray={selected ? "4 2" : undefined} />
        <polygon points={arrowHeadPoints(arrowFrom, p2)} fill={shape.stroke} />
      </g>
    );
  }
  return null;
}


function ChartView({ type, data, config }: {
  type: ChartType;
  data: { label: string; value: number }[];
  config: ChartConfig;
}) {
  const palette = ["#106EBE", "#0078D4", "#00B294", "#FFB900", "#D83B01", "#E3008C", "#8764B8", "#00CC6A"];
  const showLegend = config.showLegend !== false && config.legendPosition !== "none";
  const position = config.legendPosition || "right";
  const side = position === "left" || position === "right";
  const pie = type === "pie" || type === "ofpie";
  const legendData = pie ? data.filter((point) => Number.isFinite(point.value) && point.value > 0) : data;
  const legend = showLegend && legendData.length > 0 ? (
    <ul aria-label="Chart legend" className={`flex gap-2 text-xs text-[#605E5C] ${side ? "max-h-72 max-w-40 shrink-0 flex-col overflow-auto" : "flex-wrap"}`}>
      {legendData.map((point, index) => <li key={index} className="flex items-start gap-1" title={`${point.label}: ${point.value}`}>
        <span aria-hidden="true" className="mt-1 inline-block h-2 w-2 shrink-0" style={{ backgroundColor: type === "columnline" ? "#B4D6EE" : type === "line" || type === "area" || type === "net" ? palette[0] : palette[index % palette.length] }} />
        <span className="break-all">{point.label}: {point.value}</span>
      </li>)}
    </ul>
  ) : null;
  return <figure aria-label={config.title || "Chart"} className="min-w-0">
    {config.subtitle && <figcaption className="mb-2 text-center text-sm text-[#605E5C]">{config.subtitle}</figcaption>}
    <div className={`flex gap-3 ${side ? "flex-row" : "flex-col"}`}>
      {(position === "top" || position === "left") && legend}
      <div className="min-w-0 flex-1">
        {!pie && config.yAxisTitle && <div className="text-xs text-[#605E5C]">{config.yAxisTitle}</div>}
        <ChartPlot type={type} data={data} />
        {!pie && config.xAxisTitle && <div className="text-center text-xs text-[#605E5C]">{config.xAxisTitle}</div>}
      </div>
      {(position === "bottom" || position === "right") && legend}
    </div>
  </figure>;
}

function ChartPlot({ type, data: sourceData }: { type: ChartType; data: { label: string; value: number }[] }) {
  const data = sourceData.filter((item) => Number.isFinite(item.value));
  const width = 640;
  const height = 260;
  const max = data.reduce((largest, item) => Math.max(largest, Math.abs(item.value)), 1);
  const colors = ["#106EBE", "#0078D4", "#00B294", "#FFB900", "#D83B01", "#E3008C", "#8764B8", "#00CC6A"];

  if (!data.length) return <div className="text-sm text-[#605E5C]">No chart data available.</div>;

  const plotLeft = 70;
  const plotRight = width - 20;
  const plotBottom = height - 35;
  const plotTop = 15;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const values = data.map((item) => item.value);
  const scaleValues = type === "stock" ? values.flatMap((value) => [value, value * 1.08, value * 0.9, value * 0.97]).filter(Number.isFinite) : values;
  const yScale = createSignedScale(scaleValues, plotBottom, plotTop);
  const xScale = createSignedScale(values, plotLeft, plotRight);
  const xAt = (i: number) => categoryCenter(i, data.length, plotLeft, plotRight);
  const yAt = yScale.map;
  const columnWidth = Math.max(0.1, Math.min(48, (plotW / data.length) * 0.72));
  const tickLabel = (value: number) => value === 0 ? "0" :
    (Math.abs(value) >= 1e6 || Math.abs(value) < 0.001 ? value.toExponential(1) : Number(value.toPrecision(4)).toString());
  const axes = (
    <>
      {yScale.ticks.map((value, index) => (
        <g key={index}>
          <line x1={plotLeft} y1={yAt(value)} x2={plotRight} y2={yAt(value)} stroke={value === 0 ? "#8A8886" : "#EDEBE9"} />
          <text x={plotLeft - 7} y={yAt(value) + 3} textAnchor="end" fontSize="10" fill="#605E5C">{tickLabel(value)}</text>
        </g>
      ))}
      <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#D2D0CE" />
    </>
  );

  const xLabels = data.map((d, i) => (
    <text key={i} x={xAt(i)} y={height - 12} fill="#605E5C" fontSize="10" textAnchor="middle">
      {d.label.slice(0, 8)}
    </text>
  ));

  /* ---------------------------------------------------------- PIE ---------------------------------------------------------- */
  if (type === "pie" || type === "ofpie") {
    const groups = buildPieGroups(data, type === "ofpie");
    if (groups.error) return <div role="status" className="p-4 text-sm text-[#605E5C]">{groups.error}</div>;
    const main = pieSlices(groups.main, groups.secondary.length ? 190 : 320, 125, 90);
    const secondary = pieSlices(groups.secondary, 450, 125, 60);
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full" role="img" aria-label={type === "ofpie" ? "Of-Pie chart" : "Pie chart"}>
        {[...main, ...secondary].map((slice, index) => (
          <path key={index} d={slice.path} fill={colors[slice.colorIndex % colors.length]} stroke="#FFFFFF" strokeWidth="1">
            <title>{`${slice.label}: ${slice.value} (${(slice.fraction * 100).toFixed(1)}% of this pie)`}</title>
          </path>
        ))}
        {secondary.length > 0 && <>
          <line x1={280} y1={125} x2={390} y2={125} stroke="#8A8886" strokeDasharray="3 3" />
          <text x={450} y={210} textAnchor="middle" fontSize="11" fill="#605E5C">Other: actual source categories</text>
        </>}
      </svg>
    );
  }

  /* ---------------------------------------------------------- LINE / AREA ---------------------------------------------------------- */
  if (type === "line" || type === "area") {
    const points = data.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(" ");
    const areaPath = `M ${xAt(0)},${yScale.zero} L ${points.split(" ").join(" L ")} L ${xAt(data.length - 1)},${yScale.zero} Z`;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {axes}
        {type === "area" && <path d={areaPath} fill="#106EBE" fillOpacity="0.18" stroke="none" />}
        <polyline fill="none" stroke="#106EBE" strokeWidth="3" points={points} />
        {data.map((d, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(d.value)} r="4" fill="#0078D4" />
        ))}
        {xLabels}
      </svg>
    );
  }

  /* ---------------------------------------------------------- XY SCATTER ---------------------------------------------------------- */
  if (type === "xyscatter") {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {axes}
        {data.map((d, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(d.value)} r="5" fill={colors[i % colors.length]} stroke="#FFFFFF" strokeWidth="1" />
        ))}
        {xLabels}
      </svg>
    );
  }

  /* ---------------------------------------------------------- BUBBLE ---------------------------------------------------------- */
  if (type === "bubble") {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {axes}
        {data.map((d, i) => {
          const radius = 4 + (Math.abs(d.value) / max) * 22;
          return (
            <circle
              key={i}
              cx={xAt(i)}
              cy={yAt(d.value)}
              r={radius}
              fill={colors[i % colors.length]}
              fillOpacity="0.55"
              stroke={colors[i % colors.length]}
              strokeWidth="1.5"
            />
          );
        })}
        {xLabels}
      </svg>
    );
  }

  /* ---------------------------------------------------------- NET (RADAR) ---------------------------------------------------------- */
  if (type === "net") {
    const cx = width / 2;
    const cy = 130;
    const radius = 95;
    const n = data.length;
    const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

    const rings = [0.25, 0.5, 0.75, 1].map((f, ri) => {
      const ringPoints = data
        .map((_, i) => {
          const a = angleFor(i);
          return `${cx + radius * f * Math.cos(a)},${cy + radius * f * Math.sin(a)}`;
        })
        .join(" ");
      return <polygon key={ri} points={ringPoints} fill="none" stroke="#E1DFDD" strokeWidth="1" />;
    });

    const spokes = data.map((_, i) => {
      const a = angleFor(i);
      return (
        <line key={i} x1={cx} y1={cy} x2={cx + radius * Math.cos(a)} y2={cy + radius * Math.sin(a)} stroke="#E1DFDD" strokeWidth="1" />
      );
    });

    const dataPoints = data
      .map((d, i) => {
        const a = angleFor(i);
        const f = Math.abs(d.value) / max;
        return `${cx + radius * f * Math.cos(a)},${cy + radius * f * Math.sin(a)}`;
      })
      .join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {rings}
        {spokes}
        <polygon points={dataPoints} fill="#106EBE" fillOpacity="0.25" stroke="#106EBE" strokeWidth="2" />
        {data.map((d, i) => {
          const a = angleFor(i);
          const f = Math.abs(d.value) / max;
          return <circle key={i} cx={cx + radius * f * Math.cos(a)} cy={cy + radius * f * Math.sin(a)} r="4" fill="#106EBE" />;
        })}
        {data.map((d, i) => {
          const a = angleFor(i);
          const lx = cx + (radius + 16) * Math.cos(a);
          const ly = cy + (radius + 16) * Math.sin(a);
          return (
            <text key={i} x={lx} y={ly} fill="#605E5C" fontSize="10" textAnchor="middle">
              {d.label.slice(0, 8)}
            </text>
          );
        })}
      </svg>
    );
  }

  /* ---------------------------------------------------------- STOCK (HIGH-LOW-CLOSE style) ---------------------------------------------------------- */
  if (type === "stock") {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {axes}
        {data.map((d, i) => {
          const x = xAt(i);
          const closeY = yAt(d.value);
          const highY = yAt(d.value * 1.08);
          const lowY = yAt(d.value * 0.9);
          const up = d.value >= 0;
          return (
            <g key={i}>
              <line x1={x} y1={highY} x2={x} y2={lowY} stroke={up ? "#107C10" : "#A80000"} strokeWidth="1.5" />
              <line x1={x - 6} y1={yAt(d.value * 0.97)} x2={x} y2={yAt(d.value * 0.97)} stroke={up ? "#107C10" : "#A80000"} strokeWidth="2" />
              <line x1={x} y1={closeY} x2={x + 6} y2={closeY} stroke={up ? "#107C10" : "#A80000"} strokeWidth="2" />
            </g>
          );
        })}
        {xLabels}
      </svg>
    );
  }

  /* ---------------------------------------------------------- COLUMN AND LINE (combo) ---------------------------------------------------------- */
  if (type === "columnline") {
    const barWidth = columnWidth;
    const linePoints = data.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(" ");
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {axes}
        {data.map((d, i) => {
          const bar = barGeometry(d.value, yScale);
          const barHeight = bar.size;
          const x = xAt(i) - barWidth / 2;
          const y = bar.start;
          return <rect key={i} x={x} y={y} width={barWidth} height={barHeight} rx="3" fill="#B4D6EE" />;
        })}
        <polyline fill="none" stroke="#D83B01" strokeWidth="3" points={linePoints} />
        {data.map((d, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(d.value)} r="4" fill="#D83B01" />
        ))}
        {xLabels}
      </svg>
    );
  }

  /* ---------------------------------------------------------- BAR (horizontal) ---------------------------------------------------------- */
  if (type === "bar") {
    const rowH = Math.max(0.1, Math.min(36, (plotH / data.length) * 0.72));
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full" role="img" aria-label="Horizontal bar chart">
        {xScale.ticks.map((value, index) => <g key={index}>
          <line x1={xScale.map(value)} y1={plotTop} x2={xScale.map(value)} y2={plotBottom} stroke={value === 0 ? "#8A8886" : "#EDEBE9"} />
          <text x={xScale.map(value)} y={height - 12} textAnchor="middle" fontSize="10" fill="#605E5C">{tickLabel(value)}</text>
        </g>)}
        {data.map((d, i) => {
          const bar = barGeometry(d.value, xScale);
          const y = categoryCenter(i, data.length, plotTop, plotBottom) - rowH / 2;
          return <g key={i}>
            <title>{`${d.label}: ${d.value}`}</title>
            <rect x={bar.start} y={y} width={bar.size} height={rowH} rx="3" fill={colors[i % colors.length]} />
            <text x={plotLeft - 6} y={y + rowH / 2 + 4} fill="#605E5C" fontSize="10" textAnchor="end">{d.label.slice(0, 10)}</text>
          </g>;
        })}
      </svg>
    );
  }

  /* ---------------------------------------------------------- COLUMN (default, vertical bars) ---------------------------------------------------------- */
  const barWidth = columnWidth;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
      {axes}
      {data.map((d, i) => {
        const bar = barGeometry(d.value, yScale);
        const barHeight = bar.size;
        const x = xAt(i) - barWidth / 2;
        const y = bar.start;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill={colors[i % colors.length]} />
          </g>
        );
      })}
      {xLabels}
    </svg>
  );
}

const PRINT_PAPER_SIZES: Record<string, { w: number; h: number; label: string }> = {
  Letter: { w: 216, h: 279, label: "Letter (8.50in x 11.00in)" },
  Legal: { w: 216, h: 356, label: "Legal (8.50in x 14.00in)" },
  A4: { w: 210, h: 297, label: "A4 (8.27in x 11.69in)" },
  A5: { w: 148, h: 210, label: "A5 (5.83in x 8.27in)" },
  Executive: { w: 184, h: 267, label: "Executive (7.25in x 10.50in)" },
};

/* ============================================================================
 * Advanced Print Preview — LibreOffice Calc স্টাইল ফুল-ফিচার প্রিভিউ
 * ========================================================================== */

const PRINT_PX_PER_MM = 3.78; // ~96dpi

interface PrintPageDef {
  r1: number; r2: number; c1: number; c2: number;
  pageNumber: number;
}

// শীটের ভেতর যেসব সেলে ডাটা আছে তার বাউন্ডিং বক্স বের করা হচ্ছে
function computeSheetBoundingBox(sheet: WorkbookSheet): { r1: number; c1: number; r2: number; c2: number } | null {
  let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;
  Object.entries(sheet.cells).forEach(([key, data]) => {
    const value = (data?.value ?? "").toString();
    if (!value.trim() && !data?.image && !data?.hyperlink) return;
    const pos = parseKey(key);
    if (!pos) return;
    minR = Math.min(minR, pos.row);
    minC = Math.min(minC, pos.col);
    maxR = Math.max(maxR, pos.row);
    maxC = Math.max(maxC, pos.col);
  });
  if (maxR === -1) return null;
  return { r1: minR, c1: minC, r2: maxR, c2: maxC };
}

// printArea স্ট্রিং (যেমন "A1:F30") থেকে bounding box বের করে,
// খালি থাকলে null রিটার্ন করে (তখন পুরো শীট ব্যবহার হবে)
function parsePrintAreaBox(printArea: string): { r1: number; c1: number; r2: number; c2: number } | null {
  if (!printArea.trim()) return null;
  const nr = normalizeRange(printArea.trim().toUpperCase());
  return nr ? { r1: nr.r1, c1: nr.c1, r2: nr.r2, c2: nr.c2 } : null;
}

// পেজ সাইজ, মার্জিন ও স্কেল অনুযায়ী কয়টা পেজে ডাটা ভাগ হবে তা হিসাব করা হচ্ছে
function computePrintPages(
  sheet: WorkbookSheet,
  pageSize: "A4" | "Letter" | "Legal",
  orientation: "portrait" | "landscape",
  margins: { top: number; right: number; bottom: number; left: number },
  scale: number,
  printArea: string = ""   // ⬅️ নতুন প্যারামিটার
): PrintPageDef[] {
  const box = parsePrintAreaBox(printArea) || computeSheetBoundingBox(sheet); // ⬅️ পরিবর্তিত লাইন
  if (!box) return [{ r1: 0, c1: 0, r2: 0, c2: 0, pageNumber: 1 }];


  const dims = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const pageWmm = orientation === "landscape" ? dims.h : dims.w;
  const pageHmm = orientation === "landscape" ? dims.w : dims.h;

  const printableWpx = Math.max(50, (pageWmm - margins.left - margins.right) * PRINT_PX_PER_MM) / (scale / 100);
  const printableHpx = Math.max(50, (pageHmm - margins.top - margins.bottom - 14) * PRINT_PX_PER_MM) / (scale / 100);

  const colBreaks: { start: number; end: number }[] = [];
  let curStart = box.c1;
  let acc = 0;
  for (let c = box.c1; c <= box.c2; c++) {
    const w = sheet.colWidths[c] || DEFAULT_COL_WIDTH;
    if (acc + w > printableWpx && acc > 0) {
      colBreaks.push({ start: curStart, end: c - 1 });
      curStart = c;
      acc = 0;
    }
    acc += w;
  }
  colBreaks.push({ start: curStart, end: box.c2 });

  const rowBreaks: { start: number; end: number }[] = [];
  curStart = box.r1;
  acc = 0;
  for (let r = box.r1; r <= box.r2; r++) {
    const h = sheet.rowHeights[r] || DEFAULT_ROW_HEIGHT;
    if (acc + h > printableHpx && acc > 0) {
      rowBreaks.push({ start: curStart, end: r - 1 });
      curStart = r;
      acc = 0;
    }
    acc += h;
  }
  rowBreaks.push({ start: curStart, end: box.r2 });

  const pages: PrintPageDef[] = [];
  let pageNumber = 1;
  colBreaks.forEach((cb) => {
    rowBreaks.forEach((rb) => {
      pages.push({ r1: rb.start, r2: rb.end, c1: cb.start, c2: cb.end, pageNumber: pageNumber++ });
    });
  });

  return pages.length ? pages : [{ r1: 0, c1: 0, r2: 0, c2: 0, pageNumber: 1 }];
}

const PRINT_ZOOM_PRESETS = [
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
  { label: "150%", value: 150 },
  { label: "200%", value: 200 },
];

function AdvancedPrintPreviewModal({
  sheet,
  workbookName,
  pageSize,
  setPageSize,
  orientation,
  setOrientation,
  printScale,
  setPrintScale,
  printMarginTop,
  setPrintMarginTop,
  printMarginRight,
  setPrintMarginRight,
  printMarginBottom,
  setPrintMarginBottom,
  printMarginLeft,
  setPrintMarginLeft,
  printHeader,
  printFooter,
  printArea,
  printTitleRows,
  printTitleCols,
  showGridLines,
  getDisplayValue,
  onClose,
  onOpenPageSetup,
  onPrint,
}: {
  sheet: WorkbookSheet;
  workbookName: string;
  pageSize: "A4" | "Letter" | "Legal";
  setPageSize: (v: "A4" | "Letter" | "Legal") => void;
  orientation: "portrait" | "landscape";
  setOrientation: (v: "portrait" | "landscape") => void;
  printScale: number;
  setPrintScale: (v: number) => void;
  printMarginTop: number;
  setPrintMarginTop: (v: number) => void;
  printMarginRight: number;
  setPrintMarginRight: (v: number) => void;
  printMarginBottom: number;
  setPrintMarginBottom: (v: number) => void;
  printMarginLeft: number;
  setPrintMarginLeft: (v: number) => void;
  printHeader: string;
  printFooter: string;
  printArea: string;
  printTitleRows: string;
  printTitleCols: string;
  showGridLines: boolean;
  getDisplayValue: (key: string) => string;
  onClose: () => void;
  onOpenPageSetup: () => void;
  onPrint: () => void;
}) {

  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(90);
  const [showMargins, setShowMargins] = useState(true);
  const [viewMode, setViewMode] = useState<"single" | "continuous">("single");
  const [pageJumpInput, setPageJumpInput] = useState("1");
  const [draggingEdge, setDraggingEdge] = useState<"top" | "right" | "bottom" | "left" | null>(null);
  const marginDragRef = useRef<{ edge: "top" | "right" | "bottom" | "left"; startClient: number; startMargin: number } | null>(null);

  const margins = useMemo(
    () => ({ top: printMarginTop, right: printMarginRight, bottom: printMarginBottom, left: printMarginLeft }),
    [printMarginTop, printMarginRight, printMarginBottom, printMarginLeft]
  );

  const pages = useMemo(
    () => computePrintPages(sheet, pageSize, orientation, margins, printScale, printArea), // ⬅️ printArea যোগ হলো
    [sheet, pageSize, orientation, margins, printScale, printArea]
  );

  // ⬇️ Excel-এর মতো: Print Preview-এ মাউস দিয়ে টেনে মার্জিন সাজানোর লজিক
  const pxPerMm = PRINT_PX_PER_MM * (zoom / 100);

  const onMarginDragMove = useCallback((e: PointerEvent) => {
    const d = marginDragRef.current;
    if (!d) return;
    const client = d.edge === "top" || d.edge === "bottom" ? e.clientY : e.clientX;
    const deltaMm = (client - d.startClient) / pxPerMm;
    let next = d.edge === "top" || d.edge === "left" ? d.startMargin + deltaMm : d.startMargin - deltaMm;
    next = Math.max(0, Math.min(60, Math.round(next * 10) / 10));
    if (d.edge === "top") setPrintMarginTop(next);
    else if (d.edge === "right") setPrintMarginRight(next);
    else if (d.edge === "bottom") setPrintMarginBottom(next);
    else setPrintMarginLeft(next);
  }, [pxPerMm, setPrintMarginTop, setPrintMarginRight, setPrintMarginBottom, setPrintMarginLeft]);

  const onMarginDragEnd = useCallback(() => {
    marginDragRef.current = null;
    setDraggingEdge(null);
    window.removeEventListener("pointermove", onMarginDragMove);
  }, [onMarginDragMove]);

  const onMarginDragStart = useCallback((edge: "top" | "right" | "bottom" | "left", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startMargin = edge === "top" ? margins.top : edge === "right" ? margins.right : edge === "bottom" ? margins.bottom : margins.left;
    marginDragRef.current = { edge, startClient: edge === "top" || edge === "bottom" ? e.clientY : e.clientX, startMargin };
    setDraggingEdge(edge);
    window.addEventListener("pointermove", onMarginDragMove);
    window.addEventListener("pointerup", onMarginDragEnd, { once: true });
  }, [margins, onMarginDragMove, onMarginDragEnd]);

  const totalPages = Math.max(1, pages.length);
  const currentPageIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
  const goToPage = useCallback((requestedIndex: number) => {
    const nextIndex = Math.max(0, Math.min(totalPages - 1, requestedIndex));
    setPageIndex(nextIndex);
    setPageJumpInput(String(nextIndex + 1));
  }, [totalPages]);

  // Clean up active pointer listeners if the preview closes during a margin drag.
  useEffect(() => () => {
    window.removeEventListener("pointermove", onMarginDragMove);
    window.removeEventListener("pointerup", onMarginDragEnd);
    marginDragRef.current = null;
  }, [onMarginDragMove, onMarginDragEnd]);

  const dims = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const pageWmm = orientation === "landscape" ? dims.h : dims.w;
  const pageHmm = orientation === "landscape" ? dims.w : dims.h;
  const pageWpx = pageWmm * PRINT_PX_PER_MM * (zoom / 100);
  const pageHpx = pageHmm * PRINT_PX_PER_MM * (zoom / 100);

  const resolveHeaderFooter = (template: string, pageNum: number) =>
    template.replace(/&P/g, String(pageNum)).replace(/&N/g, String(totalPages));

  const renderPage = (page: PrintPageDef) => {
    const titleRowNums = printTitleRows.match(/(\d+):(\d+)/);
    const titleColLetters = printTitleCols.match(/([A-Z]+):([A-Z]+)/i);

    const rows: number[] = [];
    if (titleRowNums) {
      const tr1 = parseInt(titleRowNums[1], 10) - 1;
      const tr2 = parseInt(titleRowNums[2], 10) - 1;
      for (let r = tr1; r <= tr2; r++) if (r < page.r1) rows.push(r); // শুধু আগে থেকেই পেজে না থাকলে
    }
    for (let r = page.r1; r <= page.r2; r++) rows.push(r);

    const cols: number[] = [];
    if (titleColLetters) {
      const tc1 = letterToCol(titleColLetters[1].toUpperCase());
      const tc2 = letterToCol(titleColLetters[2].toUpperCase());
      for (let c = tc1; c <= tc2; c++) if (c < page.c1) cols.push(c); // শুধু আগে থেকেই পেজে না থাকলে
    }
    for (let c = page.c1; c <= page.c2; c++) cols.push(c);

    return (

      <div
        key={page.pageNumber}
        className="relative mx-auto mb-6 overflow-hidden bg-white shadow-2xl"
        style={{
          width: pageWpx,
          height: pageHpx,
          padding: `${margins.top * PRINT_PX_PER_MM * (zoom / 100)}px ${margins.right * PRINT_PX_PER_MM * (zoom / 100)}px ${margins.bottom * PRINT_PX_PER_MM * (zoom / 100)}px ${margins.left * PRINT_PX_PER_MM * (zoom / 100)}px`,
          boxSizing: "border-box",
        }}
      >
        {showMargins && (
          <>
            <div
              className="pointer-events-none absolute border border-dashed border-[#9BC2E6]"
              style={{
                top: margins.top * PRINT_PX_PER_MM * (zoom / 100),
                left: margins.left * PRINT_PX_PER_MM * (zoom / 100),
                right: margins.right * PRINT_PX_PER_MM * (zoom / 100),
                bottom: margins.bottom * PRINT_PX_PER_MM * (zoom / 100),
              }}
            />
            {/* Excel-style draggable margin handles */}
            <div
              onPointerDown={(e) => onMarginDragStart("top", e)}
              title={`Top margin: ${margins.top}mm — drag to adjust`}
              className="absolute left-1/2 z-20 flex h-3 w-8 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-b-md bg-[#106EBE]/80 opacity-0 shadow transition-opacity hover:opacity-100"
              style={{ top: margins.top * PRINT_PX_PER_MM * (zoom / 100) - 2 }}
            >
              <span className="h-0.5 w-4 rounded bg-white" />
            </div>
            <div
              onPointerDown={(e) => onMarginDragStart("bottom", e)}
              title={`Bottom margin: ${margins.bottom}mm — drag to adjust`}
              className="absolute left-1/2 z-20 flex h-3 w-8 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-t-md bg-[#106EBE]/80 opacity-0 shadow transition-opacity hover:opacity-100"
              style={{ bottom: margins.bottom * PRINT_PX_PER_MM * (zoom / 100) - 2 }}
            >
              <span className="h-0.5 w-4 rounded bg-white" />
            </div>
            <div
              onPointerDown={(e) => onMarginDragStart("left", e)}
              title={`Left margin: ${margins.left}mm — drag to adjust`}
              className="absolute top-1/2 z-20 flex h-8 w-3 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-r-md bg-[#106EBE]/80 opacity-0 shadow transition-opacity hover:opacity-100"
              style={{ left: margins.left * PRINT_PX_PER_MM * (zoom / 100) - 2 }}
            >
              <span className="h-4 w-0.5 rounded bg-white" />
            </div>
            <div
              onPointerDown={(e) => onMarginDragStart("right", e)}
              title={`Right margin: ${margins.right}mm — drag to adjust`}
              className="absolute top-1/2 z-20 flex h-8 w-3 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-l-md bg-[#106EBE]/80 opacity-0 shadow transition-opacity hover:opacity-100"
              style={{ right: margins.right * PRINT_PX_PER_MM * (zoom / 100) - 2 }}
            >
              <span className="h-4 w-0.5 rounded bg-white" />
            </div>
            {draggingEdge && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-md bg-[#201F1E] px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                {draggingEdge === "top" ? margins.top : draggingEdge === "bottom" ? margins.bottom : draggingEdge === "left" ? margins.left : margins.right}mm
              </div>
            )}
          </>
        )}

        {printHeader && (
          <div className="absolute left-0 right-0 top-1 text-center font-bold text-[#605E5C]" style={{ fontSize: 10 * (zoom / 100) }}>
            {resolveHeaderFooter(printHeader, page.pageNumber)}
          </div>
        )}

        <table className="w-full border-collapse" style={{ fontSize: 10 * (zoom / 100) }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r} style={{ height: (sheet.rowHeights[r] || DEFAULT_ROW_HEIGHT) * (zoom / 100) * (printScale / 100) }}>
                {cols.map((c) => {
                  const key = cellKey(r, c);
                  const style = sheet.cells[key]?.style;

                  // Excel-এর মতো: "Print Gridlines" চালু থাকলে হালকা ধূসর গ্রিড দেখাবে (সব সেলে),
                  // বন্ধ থাকলে শুধু ইউজার নিজে যে সেলে বর্ডার এঁকেছেন সেটাই দেখাবে —
                  // বাকি খালি রো/কলামে কোনো লাইন প্রিন্টে আসবে না।
                  const b = style?.borders;
                  const borderBoxStyle: React.CSSProperties = showGridLines
                    ? { borderWidth: 1, borderStyle: "solid", borderColor: "#E1DFDD" }
                    : {
                      borderTopWidth: b?.top ? (style?.borderWidth ?? 1) : 0,
                      borderRightWidth: b?.right ? (style?.borderWidth ?? 1) : 0,
                      borderBottomWidth: b?.bottom ? (style?.borderWidth ?? 1) : 0,
                      borderLeftWidth: b?.left ? (style?.borderWidth ?? 1) : 0,
                      borderStyle: style?.borderStyle || "solid",
                      borderColor: style?.borderColor || "#000000",
                    };

                  return (
                    <td
                      key={c}
                      className="overflow-hidden px-1"
                      style={{
                        width: (sheet.colWidths[c] || DEFAULT_COL_WIDTH) * (zoom / 100) * (printScale / 100),
                        fontWeight: style?.bold ? 700 : 400,
                        fontStyle: style?.italic ? "italic" : "normal",
                        textAlign: style?.align || "left",
                        backgroundColor: style?.bg || "transparent",
                        color: style?.color || "#000000",
                        ...borderBoxStyle,
                      }}
                    >
                      {getDisplayValue(key)}
                    </td>
                  );
                })}

              </tr>

            ))}
          </tbody>
        </table>

        {printFooter && (
          <div className="absolute bottom-1 left-0 right-0 text-center font-bold text-[#605E5C]" style={{ fontSize: 10 * (zoom / 100) }}>
            {resolveHeaderFooter(printFooter, page.pageNumber)}
          </div>
        )}

        <div className="absolute bottom-1 right-2 text-[9px] text-[#B3B0AD]">
          Page {page.pageNumber} / {totalPages}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-99999 flex flex-col bg-[#525659]">
      {/* Top Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/30 bg-[#3B3A39] px-3 py-2 text-white shadow-lg">
        <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs font-bold hover:bg-white/10">
          <Icons.X size={14} /> Close Preview
        </button>

        <div className="mx-1 h-6 w-px bg-white/20" />

        <button type="button" onClick={() => goToPage(0)} disabled={currentPageIndex === 0} title="First Page" className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-30">
          <Icons.ChevronsLeft size={16} />
        </button>
        <button type="button" onClick={() => goToPage(currentPageIndex - 1)} disabled={currentPageIndex === 0} title="Previous Page" className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-30">
          <Icons.ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1 text-xs">
          <input
            value={pageJumpInput}
            onChange={(e) => setPageJumpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = parseInt(pageJumpInput, 10);
                if (Number.isFinite(n)) goToPage(n - 1);
              }
            }}
            onBlur={() => {
              const n = parseInt(pageJumpInput, 10);
              if (Number.isFinite(n)) goToPage(n - 1);
              else setPageJumpInput(String(currentPageIndex + 1));
            }}
            className="w-10 rounded-md border border-white/20 bg-white/10 px-1 py-1 text-center text-xs text-white outline-none focus:border-white"
          />
          <span className="text-white/70">/ {totalPages}</span>
        </div>

        <button type="button" onClick={() => goToPage(currentPageIndex + 1)} disabled={currentPageIndex === totalPages - 1} title="Next Page" className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-30">
          <Icons.ChevronRight size={16} />
        </button>
        <button type="button" onClick={() => goToPage(totalPages - 1)} disabled={currentPageIndex === totalPages - 1} title="Last Page" className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-30">
          <Icons.ChevronsRight size={16} />
        </button>

        <div className="mx-1 h-6 w-px bg-white/20" />

        <div className="flex items-center gap-1 rounded-md bg-white/10 p-0.5">
          <button type="button" onClick={() => setViewMode("single")} className={`rounded px-2 py-1 text-xs font-bold ${viewMode === "single" ? "bg-white text-[#3B3A39]" : "text-white/80 hover:bg-white/10"}`}>
            Single Page
          </button>
          <button type="button" onClick={() => setViewMode("continuous")} className={`rounded px-2 py-1 text-xs font-bold ${viewMode === "continuous" ? "bg-white text-[#3B3A39]" : "text-white/80 hover:bg-white/10"}`}>
            Continuous
          </button>
        </div>

        <div className="mx-1 h-6 w-px bg-white/20" />

        <button type="button" onClick={() => setZoom((z) => Math.max(30, z - 10))} className="rounded-md p-1.5 hover:bg-white/10" title="Zoom Out">
          <Icons.ZoomOut size={16} />
        </button>
        <input type="range" min={30} max={300} step={5} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 accent-[#106EBE]" />
        <button type="button" onClick={() => setZoom((z) => Math.min(300, z + 10))} className="rounded-md p-1.5 hover:bg-white/10" title="Zoom In">
          <Icons.ZoomIn size={16} />
        </button>
        <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="rounded-md border border-white/20 bg-white/10 px-1 py-1 text-xs text-white outline-none">
          {PRINT_ZOOM_PRESETS.map((p) => (
            <option key={p.value} value={p.value} className="text-black">{p.label}</option>
          ))}
        </select>

        <div className="mx-1 h-6 w-px bg-white/20" />

        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={showMargins} onChange={(e) => setShowMargins(e.target.checked)} />
          Show Margins
        </label>

        <div className="mx-1 h-6 w-px bg-white/20" />

        <select value={pageSize} onChange={(e) => setPageSize(e.target.value as "A4" | "Letter" | "Legal")} className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white outline-none">
          <option value="A4" className="text-black">A4</option>
          <option value="Letter" className="text-black">Letter</option>
          <option value="Legal" className="text-black">Legal</option>
        </select>
        <select value={orientation} onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")} className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white outline-none">
          <option value="portrait" className="text-black">Portrait</option>
          <option value="landscape" className="text-black">Landscape</option>
        </select>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-white/70">Scale</span>
          <input
            type="number"
            min={10}
            max={400}
            value={printScale}
            onChange={(e) => setPrintScale(Math.max(10, Math.min(400, Number(e.target.value) || 100)))}
            className="w-14 rounded-md border border-white/20 bg-white/10 px-1 py-1 text-xs text-white outline-none"
          />
          <span className="text-white/70">%</span>
        </div>

        <button type="button" onClick={onOpenPageSetup} className="flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs font-bold hover:bg-white/10">
          <Icons.Settings2 size={14} /> Format Page
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-white/60 md:inline">{workbookName}</span>
          <button type="button" onClick={onPrint} className="flex items-center gap-1 rounded-md bg-[#106EBE] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#005A9E]">
            <Icons.Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Page Canvas */}
      <div className="flex-1 overflow-auto px-8 py-8 awm-premium-scrollbar">
        {viewMode === "single" ? (
          <div className="flex justify-center">{renderPage(pages[currentPageIndex])}</div>
        ) : (
          <div>{pages.map((p) => renderPage(p))}</div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-black/30 bg-[#3B3A39] px-4 py-1.5 text-[11px] text-white/70">
        <span>{totalPages} page{totalPages > 1 ? "s" : ""} total — LibreOffice-style advanced print preview</span>
        <span>Zoom: {zoom}%</span>
      </div>
    </div>
  );
}

function PageSetupDialog({
  pageSize, setPageSize,
  orientation, setOrientation,
  printScale, setPrintScale,
  printMarginTop, setPrintMarginTop,
  printMarginBottom, setPrintMarginBottom,
  printMarginLeft, setPrintMarginLeft,
  printMarginRight, setPrintMarginRight,
  printHeader, setPrintHeader,
  printFooter, setPrintFooter,
  printArea, setPrintArea,
  printTitleRows, setPrintTitleRows,
  printTitleCols, setPrintTitleCols,
  showGridLines, setShowGridLines,
  onClose,
  onApply,
}: {
  pageSize: "A4" | "Letter" | "Legal"; setPageSize: (v: "A4" | "Letter" | "Legal") => void;
  orientation: "portrait" | "landscape"; setOrientation: (v: "portrait" | "landscape") => void;
  printScale: number; setPrintScale: (v: number) => void;
  printMarginTop: number; setPrintMarginTop: (v: number) => void;
  printMarginBottom: number; setPrintMarginBottom: (v: number) => void;
  printMarginLeft: number; setPrintMarginLeft: (v: number) => void;
  printMarginRight: number; setPrintMarginRight: (v: number) => void;
  printHeader: string; setPrintHeader: (v: string) => void;
  printFooter: string; setPrintFooter: (v: string) => void;
  printArea: string; setPrintArea: (v: string) => void;
  printTitleRows: string; setPrintTitleRows: (v: string) => void;
  printTitleCols: string; setPrintTitleCols: (v: string) => void;
  showGridLines: boolean; setShowGridLines: (v: boolean) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const [tab, setTab] = useState<"page" | "margins" | "headerFooter" | "sheet">("page");

  const dims = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const pageWmm = orientation === "landscape" ? dims.h : dims.w;
  const pageHmm = orientation === "landscape" ? dims.w : dims.h;
  const thumbScale = 130 / Math.max(pageWmm, pageHmm);

  const TABS: { key: typeof tab; label: string }[] = [
    { key: "page", label: "Page" },
    { key: "margins", label: "Margins" },
    { key: "headerFooter", label: "Header/Footer" },
    { key: "sheet", label: "Sheet" },
  ];

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#D2D0CE] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D2D0CE] bg-linear-to-b from-[#F9FAFB] to-[#ECEFF3] px-6 py-3">
          <h3 className="text-lg font-black text-[#106EBE]">Page Setup</h3>
          <button onClick={onClose} className="rounded-md p-1 text-[#605E5C] hover:bg-[#E1DFDD]" aria-label="Close">
            <Icons.X size={18} />
          </button>
        </div>

        <div className="flex border-b border-[#D2D0CE] bg-[#F3F2F1] px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative -mb-px px-4 py-2 text-sm font-bold transition-colors ${tab === t.key ? "border border-b-0 border-[#D2D0CE] bg-white text-[#106EBE] rounded-t-md" : "text-[#605E5C] hover:text-[#106EBE]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_180px]">
          <div className="space-y-4">
            {tab === "page" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Orientation</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setOrientation("portrait")} className={`flex-1 rounded-md border px-3 py-2 text-xs font-bold ${orientation === "portrait" ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#D2D0CE] hover:border-[#106EBE]"}`}>
                        Portrait
                      </button>
                      <button type="button" onClick={() => setOrientation("landscape")} className={`flex-1 rounded-md border px-3 py-2 text-xs font-bold ${orientation === "landscape" ? "border-[#106EBE] bg-[#E5F1FB] text-[#106EBE]" : "border-[#D2D0CE] hover:border-[#106EBE]"}`}>
                        Landscape
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Paper Size</label>
                    <select value={pageSize} onChange={(e) => setPageSize(e.target.value as "A4" | "Letter" | "Legal")} className="w-full rounded-md border border-[#D2D0CE] px-3 py-2 text-sm outline-none focus:border-[#106EBE]">
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#605E5C]">Scaling</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={10} max={400} value={printScale} onChange={(e) => setPrintScale(Number(e.target.value) || 100)} className="w-24 rounded-md border border-[#D2D0CE] px-3 py-2 text-sm outline-none focus:border-[#106EBE]" />
                    <span className="text-sm text-[#605E5C]">% Normal Size</span>
                  </div>
                </div>
              </>
            )}

            {tab === "margins" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Top (mm)" value={String(printMarginTop)} onChange={(v) => setPrintMarginTop(Number(v) || 0)} />
                  <LabeledInput label="Bottom (mm)" value={String(printMarginBottom)} onChange={(v) => setPrintMarginBottom(Number(v) || 0)} />
                  <LabeledInput label="Left (mm)" value={String(printMarginLeft)} onChange={(v) => setPrintMarginLeft(Number(v) || 0)} />
                  <LabeledInput label="Right (mm)" value={String(printMarginRight)} onChange={(v) => setPrintMarginRight(Number(v) || 0)} />
                </div>
                <p className="text-xs text-[#8A8886]">টিপ: Print Preview খুলে &quot;Show Margins&quot; চালু রেখে সরাসরি মাউস দিয়ে টেনে মার্জিন বদলানো যায়।</p>
              </>
            )}

            {tab === "headerFooter" && (
              <>
                <LabeledInput label="Header text" value={printHeader} onChange={setPrintHeader} placeholder="e.g. AWM ERP Timesheet" />
                <LabeledInput label="Footer text" value={printFooter} onChange={setPrintFooter} placeholder="&P = page no, &N = total pages" />
              </>
            )}

            {tab === "sheet" && (
              <>
                <LabeledInput label="Print area (optional, e.g. A1:F30)" value={printArea} onChange={setPrintArea} placeholder="Leave blank to print all" />
                <LabeledInput label="Repeat rows (e.g. 1:1)" value={printTitleRows} onChange={setPrintTitleRows} placeholder="1:1" />
                <LabeledInput label="Repeat columns (e.g. A:A)" value={printTitleCols} onChange={setPrintTitleCols} placeholder="A:A" />
                <label className="flex items-center gap-2 text-sm font-bold text-[#323130]">
                  <input type="checkbox" checked={showGridLines} onChange={(e) => setShowGridLines(e.target.checked)} />
                  Print gridlines
                </label>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-black uppercase text-[#8A8886]">Preview</p>
            <div
              className="relative border border-[#C8C6C4] bg-white shadow-md"
              style={{ width: pageWmm * thumbScale, height: pageHmm * thumbScale }}
            >
              <div
                className="absolute border border-dashed border-[#9BC2E6]"
                style={{
                  top: printMarginTop * thumbScale,
                  left: printMarginLeft * thumbScale,
                  right: printMarginRight * thumbScale,
                  bottom: printMarginBottom * thumbScale,
                }}
              />
            </div>
            <p className="text-[10px] text-[#8A8886]">{pageSize} · {orientation}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#D2D0CE] px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1]">Cancel</button>
          <button onClick={onApply} className="rounded-md bg-[#106EBE] px-4 py-2 text-xs font-bold text-white hover:bg-[#005A9E]">OK</button>
        </div>
      </div>
    </div>
  );
}

function PrintDialogModal({
  onClose,
  onConfirmPrint,
  workbookName,
  sheet,
  sheets,
  getDisplayValue,
  pageSize,
  setPageSize,
  orientation,
  setOrientation,
}: {
  onClose: () => void;
  onConfirmPrint: () => void;
  workbookName: string;
  sheet: WorkbookSheet;
  sheets: WorkbookSheet[];
  getDisplayValue: (key: string) => string;
  pageSize: "A4" | "Letter" | "Legal";
  setPageSize: (v: "A4" | "Letter" | "Legal") => void;
  orientation: "portrait" | "landscape";
  setOrientation: (v: "portrait" | "landscape") => void;
}) {
  const [activeTab, setActiveTab] = useState<"general" | "advanced">("general");
  const [printerName, setPrinterName] = useState("Print to File (PDF)");
  const [pageSelection, setPageSelection] = useState<"all" | "pages" | "selection">("all");
  const [pagesInput, setPagesInput] = useState("1-1");
  const [copies, setCopies] = useState(1);
  const [collate, setCollate] = useState(true);
  const [duplex, setDuplex] = useState<"one" | "both-long" | "both-short">("one");
  const [dialogOrientation, setDialogOrientation] = useState<"automatic" | "portrait" | "landscape">(orientation);
  const [pagesPerSheet, setPagesPerSheet] = useState<"1" | "2" | "4" | "6" | "9" | "16" | "custom">("1");
  const [pageOrder, setPageOrder] = useState("Left to right, then down");
  const [drawBorder, setDrawBorder] = useState(false);
  const [suppressEmptyPages, setSuppressEmptyPages] = useState(true);
  const [printOnlySelectedSheets, setPrintOnlySelectedSheets] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [zoom, setZoom] = useState(80);
  const [pageIndex, setPageIndex] = useState(1);

  const dims = PRINT_PAPER_SIZES[pageSize] || PRINT_PAPER_SIZES.A4;
  const effectiveOrientation = dialogOrientation === "automatic" ? orientation : dialogOrientation;
  const pageW = effectiveOrientation === "landscape" ? dims.h : dims.w;
  const pageH = effectiveOrientation === "landscape" ? dims.w : dims.h;

  const previewRows = Math.min(sheet.gridRows, 18);
  const previewCols = Math.min(sheet.gridCols, 9);

  const handlePrinterOrientationChange = (v: "automatic" | "portrait" | "landscape") => {
    setDialogOrientation(v);
    if (v !== "automatic") setOrientation(v);
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#D2D0CE] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D2D0CE] bg-linear-to-b from-[#F9FAFB] to-[#ECEFF3] px-6 py-3">
          <h3 className="text-lg font-black text-[#106EBE]">Print</h3>
          <span className="text-xs text-[#605E5C]">{workbookName}</span>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Left: Live Preview */}
          <div className="flex min-h-0 w-[55%] flex-col border-r border-[#D2D0CE] bg-[#3B3A39]">
            <div className="flex items-center justify-between gap-2 border-b border-black/30 bg-[#2B2A29] px-3 py-2">
              <label className="flex items-center gap-2 text-xs font-bold text-white">
                <input type="checkbox" checked={previewEnabled} onChange={(e) => setPreviewEnabled(e.target.checked)} />
                Preview
              </label>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPageIndex((p) => Math.max(1, p - 1))} className="rounded border border-white/20 px-2 py-1 text-xs text-white hover:bg-white/10" disabled={pageIndex <= 1}>‹</button>
                <span className="text-xs text-white">Page {pageIndex} of 1</span>
                <button type="button" onClick={() => setPageIndex((p) => Math.min(1, p + 1))} className="rounded border border-white/20 px-2 py-1 text-xs text-white hover:bg-white/10" disabled>›</button>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setZoom((z) => Math.max(30, z - 10))} className="rounded border border-white/20 px-2 py-1 text-xs text-white hover:bg-white/10">-</button>
                <span className="w-10 text-center text-xs text-white">{zoom}%</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(200, z + 10))} className="rounded border border-white/20 px-2 py-1 text-xs text-white hover:bg-white/10">+</button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto p-6">
              {!previewEnabled ? (
                <p className="text-sm text-white/60">Preview disabled.</p>
              ) : (
                <div
                  className="overflow-hidden bg-white shadow-2xl"
                  style={{
                    width: pageW * (zoom / 100) * 3.78,
                    height: pageH * (zoom / 100) * 3.78,
                    padding: 12 * (zoom / 100),
                    border: drawBorder ? "1px solid #999" : "none",
                  }}
                >
                  <table className="w-full border-collapse text-[10px]" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}>
                    <tbody>
                      {Array.from({ length: previewRows }, (_, r) => (
                        <tr key={r}>
                          {Array.from({ length: previewCols }, (_, c) => (
                            <td key={c} className="border border-[#D2D0CE] px-1 py-0.5 text-[#000000]">
                              {getDisplayValue(cellKey(r, c))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Settings Panel */}
          <div className="flex min-h-0 w-[45%] flex-col">
            <div className="flex border-b border-[#D2D0CE]">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`flex-1 px-4 py-2 text-sm font-bold ${activeTab === "general" ? "border-b-2 border-[#106EBE] text-[#106EBE]" : "text-[#605E5C] hover:bg-[#F3F2F1]"}`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("advanced")}
                className={`flex-1 px-4 py-2 text-sm font-bold ${activeTab === "advanced" ? "border-b-2 border-[#106EBE] text-[#106EBE]" : "text-[#605E5C] hover:bg-[#F3F2F1]"}`}
              >
                awmerp / Advanced
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4 text-sm awm-premium-scrollbar">
              {activeTab === "general" && (
                <>
                  <div className="rounded-lg border border-[#D2D0CE] p-3">
                    <p className="mb-2 text-xs font-black uppercase text-[#605E5C]">Printer</p>
                    <select value={printerName} onChange={(e) => setPrinterName(e.target.value)} className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]">
                      <option>Print to File (PDF)</option>
                      <option>Default Printer</option>
                      <option>HP Smart Tank 580-590 series</option>
                      <option>Microsoft Print to PDF</option>
                    </select>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-[#605E5C]">Status: Default printer</span>
                      <button type="button" className="rounded-md border border-[#D2D0CE] px-3 py-1 text-xs font-bold hover:bg-[#F3F2F1]">Properties</button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#D2D0CE] p-3">
                    <p className="mb-2 text-xs font-black uppercase text-[#605E5C]">Range and Copies</p>
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="pageSelection" checked={pageSelection === "all"} onChange={() => setPageSelection("all")} />
                        All Pages
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="pageSelection" checked={pageSelection === "pages"} onChange={() => setPageSelection("pages")} />
                        Pages
                        <input
                          type="text"
                          value={pagesInput}
                          onChange={(e) => setPagesInput(e.target.value)}
                          disabled={pageSelection !== "pages"}
                          placeholder="1-28"
                          className="ml-1 w-24 rounded-md border border-[#D2D0CE] px-2 py-1 text-xs outline-none focus:border-[#106EBE] disabled:opacity-40"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="pageSelection" checked={pageSelection === "selection"} onChange={() => setPageSelection("selection")} />
                        Selection / Active Sheet
                      </label>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs font-bold text-[#605E5C]">Number of copies</label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={copies}
                        onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value || "1", 10)))}
                        className="w-16 rounded-md border border-[#D2D0CE] px-2 py-1 text-xs outline-none focus:border-[#106EBE]"
                      />
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={collate} onChange={(e) => setCollate(e.target.checked)} disabled={copies <= 1} />
                      Collate
                    </label>
                    <div className="mt-2">
                      <label className="mb-1 block text-xs font-bold text-[#605E5C]">Paper Sides</label>
                      <select value={duplex} onChange={(e) => setDuplex(e.target.value as typeof duplex)} className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]">
                        <option value="one">Print One Side</option>
                        <option value="both-long">Print on Both Sides (Long Edge)</option>
                        <option value="both-short">Print on Both Sides (Short Edge)</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#D2D0CE] p-3">
                    <p className="mb-2 text-xs font-black uppercase text-[#605E5C]">Page Layout</p>
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-[#605E5C]">Paper size</label>
                        <select value={pageSize} onChange={(e) => setPageSize(e.target.value as "A4" | "Letter" | "Legal")} className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]">
                          {Object.entries(PRINT_PAPER_SIZES).map(([key, v]) => (
                            <option key={key} value={key}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-[#605E5C]">Orientation</label>
                        <select value={dialogOrientation} onChange={(e) => handlePrinterOrientationChange(e.target.value as typeof dialogOrientation)} className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]">
                          <option value="automatic">Automatic</option>
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-[#605E5C]">Pages per sheet</label>
                        <select value={pagesPerSheet} onChange={(e) => setPagesPerSheet(e.target.value as typeof pagesPerSheet)} className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]">
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="4">4</option>
                          <option value="6">6</option>
                          <option value="9">9</option>
                          <option value="16">16</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      {pagesPerSheet !== "1" && (
                        <div>
                          <label className="mb-1 block text-xs font-bold text-[#605E5C]">Order</label>
                          <select value={pageOrder} onChange={(e) => setPageOrder(e.target.value)} className="w-full rounded-md border border-[#D2D0CE] px-2 py-1.5 text-sm outline-none focus:border-[#106EBE]">
                            <option>Left to right, then down</option>
                            <option>Top to bottom, then right</option>
                            <option>Top to bottom, then left</option>
                            <option>Right to left, then down</option>
                          </select>
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={drawBorder} onChange={(e) => setDrawBorder(e.target.checked)} />
                        Draw a border around each page
                      </label>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "advanced" && (
                <div className="rounded-lg border border-[#D2D0CE] p-3 space-y-2">
                  <p className="mb-1 text-xs font-black uppercase text-[#605E5C]">awmerp Options</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={suppressEmptyPages} onChange={(e) => setSuppressEmptyPages(e.target.checked)} />
                    Suppress output of empty pages
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={printOnlySelectedSheets} onChange={(e) => setPrintOnlySelectedSheets(e.target.checked)} />
                    Print Only Selected Sheets ({sheets.length} sheet{sheets.length > 1 ? "s" : ""} in workbook)
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#D2D0CE] bg-[#F9FAFB] px-6 py-4">
          <button type="button" className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1]">Help</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-[#D2D0CE] px-4 py-2 text-xs font-bold hover:bg-[#F3F2F1]">Cancel</button>
            <button type="button" onClick={onConfirmPrint} className="rounded-md bg-[#106EBE] px-6 py-2 text-xs font-bold text-white hover:bg-[#005A9E]">Print</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isRTL(locale: AppLocale): boolean {
  return locale === "ar";
};

function getRangeNumbers(sheets: WorkbookSheet[], sheetIndex: number, range: string): number[] {
  const sheet = sheets[sheetIndex];
  if (!sheet) return [];
  const normalized = normalizeRange(range);
  if (!normalized) return [];
  const values: number[] = [];
  for (let row = normalized.r1; row <= normalized.r2; row++) {
    for (let col = normalized.c1; col <= normalized.c2; col++) {
      const value = getCellValueInSheet(sheet, cellKey(row, col), new Set<string>(), sheets);
      const numeric = typeof value === "number" ? value : parseFloat(String(value));
      if (typeof numeric === "number" && Number.isFinite(numeric)) values.push(numeric);
    }
  }
  return values;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[], sample: boolean): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const total = values.reduce((sum, value) => sum + (value - avg) ** 2, 0);
  return total / (values.length - (sample ? 1 : 0));
}

function standardDeviation(values: number[], sample: boolean): number {
  return Math.sqrt(variance(values, sample));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  let best = values[0];
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

function covariance(x: number[], y: number[], sample: boolean): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const meanX = mean(x);
  const meanY = mean(y);
  const total = x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0);
  return total / (x.length - (sample ? 1 : 0));
}

function correlation(x: number[], y: number[]): number {
  const cov = covariance(x, y, true);
  const sdX = standardDeviation(x, true);
  const sdY = standardDeviation(y, true);
  return sdX === 0 || sdY === 0 ? 0 : cov / (sdX * sdY);
}

function logGamma(x: number): number {
  const cofactors = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let temp = x + 5.5;
  temp -= (x + 0.5) * Math.log(temp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser -= cofactors[j] / y;
  }
  return -temp + Math.log(2.5066282746310005 * ser / x);
}

function betaInc(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betaInc(b, a, 1 - x);
  }
  let f = 1;
  let c = 1;
  let d = 0;
  for (let i = 0; i <= 300; i++) {
    const m = Math.floor(i / 2);
    const numerator = i % 2 === 0 ? (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m)) : -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    const cd = c * d;
    f *= cd;
    if (Math.abs(1 - cd) < 1e-10) break;
  }
  return front * (f - 1);
}

function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const p = 0.5 * betaInc(df / 2, 0.5, x);
  return t > 0 ? 1 - p : p;
}

function fCDF(f: number, d1: number, d2: number): number {
  if (f <= 0) return 0;
  const x = (d1 * f) / (d1 * f + d2);
  return betaInc(d1 / 2, d2 / 2, x);
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    }
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const pivotValue = a[i][i];
    if (Math.abs(pivotValue) < 1e-12) return [];
    for (let j = i + 1; j < n; j++) {
      const factor = a[j][i] / pivotValue;
      for (let k = i; k <= n; k++) a[j][k] -= factor * a[i][k];
    }
  }
  const solution = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = a[i][n];
    for (let j = i + 1; j < n; j++) sum -= a[i][j] * solution[j];
    solution[i] = sum / a[i][i];
  }
  return solution;
}

function linearRegression(y: number[], predictors: number[][]): { coefficients: number[]; rSquared: number } {
  const n = y.length;
  const k = predictors.length;
  const design = predictors.map((_, index) => [1, ...predictors.map((column) => column[index])]);
  const xtx: number[][] = Array.from({ length: k + 1 }, () => new Array(k + 1).fill(0));
  const xty: number[] = new Array(k + 1).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= k; j++) {
      xty[j] += design[i][j] * y[i];
      for (let l = 0; l <= k; l++) xtx[j][l] += design[i][j] * design[i][l];
    }
  }
  const coefficients = solveLinearSystem(xtx, xty);
  if (coefficients.length === 0) return { coefficients: [], rSquared: 0 };
  const meanY = mean(y);
  let ssTotal = 0;
  let ssResidual = 0;
  for (let i = 0; i < n; i++) {
    const predicted = coefficients.reduce((sum, coefficient, index) => sum + coefficient * design[i][index], 0);
    ssTotal += (y[i] - meanY) ** 2;
    ssResidual += (y[i] - predicted) ** 2;
  }
  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;
  return { coefficients, rSquared };
}

function tTestPaired(a: number[], b: number[]): { t: number; df: number; pValue: number } {
  const differences = a.map((value, index) => value - b[index]);
  const avg = mean(differences);
  const sd = standardDeviation(differences, true);
  const t = sd === 0 ? 0 : (avg / (sd / Math.sqrt(differences.length)));
  const df = differences.length - 1;
  return { t, df, pValue: 2 * (1 - tCDF(Math.abs(t), df)) };
}

function tTestTwoSample(a: number[], b: number[], equalVar: boolean): { t: number; df: number; pValue: number } {
  const meanA = mean(a);
  const meanB = mean(b);
  const varA = variance(a, true);
  const varB = variance(b, true);
  const nA = a.length;
  const nB = b.length;
  if (equalVar) {
    const pooled = ((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2);
    const standardError = Math.sqrt(pooled * (1 / nA + 1 / nB));
    const t = (meanA - meanB) / standardError;
    const df = nA + nB - 2;
    return { t, df, pValue: 2 * (1 - tCDF(Math.abs(t), df)) };
  }
  const standardError = Math.sqrt(varA / nA + varB / nB);
  const t = (meanA - meanB) / standardError;
  const df = (varA / nA + varB / nB) ** 2 / ((varA / nA) ** 2 / (nA - 1) + (varB / nB) ** 2 / (nB - 1));
  return { t, df, pValue: 2 * (1 - tCDF(Math.abs(t), df)) };
}

function fTest(a: number[], b: number[]): { f: number; df1: number; df2: number; pValue: number } {
  const varA = variance(a, true);
  const varB = variance(b, true);
  const larger = Math.max(varA, varB);
  const smaller = Math.min(varA, varB);
  const f = smaller === 0 ? 0 : larger / smaller;
  const df1 = varA >= varB ? a.length - 1 : b.length - 1;
  const df2 = varA >= varB ? b.length - 1 : a.length - 1;
  return { f, df1, df2, pValue: 1 - fCDF(f, df1, df2) };
}

function anovaOneWay(groups: number[][]): { f: number; pValue: number; dfBetween: number; dfWithin: number } {
  const allValues = groups.flat();
  const grandMean = mean(allValues);
  let ssBetween = 0;
  let ssWithin = 0;
  groups.forEach((group) => {
    const groupMean = mean(group);
    ssBetween += group.length * (groupMean - grandMean) ** 2;
    group.forEach((value) => {
      ssWithin += (value - groupMean) ** 2;
    });
  });
  const dfBetween = groups.length - 1;
  const dfWithin = allValues.length - groups.length;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msWithin === 0 ? 0 : msBetween / msWithin;
  return { f, pValue: 1 - fCDF(f, dfBetween, dfWithin), dfBetween, dfWithin };
}
function DataAnalysisModal({ sheets, activeSheetIndex, onClose }: {
  sheets: WorkbookSheet[];
  activeSheetIndex: number;
  onClose: () => void;
}) {
  const [analysisType, setAnalysisType] = useState("descriptive");
  const [ranges, setRanges] = useState("");
  const [alpha, setAlpha] = useState("0.05");
  const [paired, setPaired] = useState(false);
  const [equalVar, setEqualVar] = useState(true);
  const [binCount, setBinCount] = useState("10");
  const [result, setResult] = useState("");
  const inputClass = "w-full rounded border border-slate-300 px-2 py-1 text-sm";
  const runAnalysis = () => {
    const rangeList = ranges.split(",").map((item) => item.trim()).filter(Boolean);
    const numericGroups = rangeList.map((range) => getRangeNumbers(sheets, activeSheetIndex, range));
    const lines: string[] = [];
    if (analysisType === "descriptive") {
      numericGroups.forEach((values, index) => {
        lines.push(`Range ${index + 1}: ${rangeList[index]}`);
        lines.push(`Count: ${values.length}`);
        lines.push(`Sum: ${values.reduce((sum, value) => sum + value, 0)}`);
        lines.push(`Mean: ${mean(values)}`);
        lines.push(`Median: ${median(values)}`);
        lines.push(`Mode: ${mode(values)}`);
        lines.push(`Min: ${Math.min(...values)}`);
        lines.push(`Max: ${Math.max(...values)}`);
        lines.push(`Range: ${Math.max(...values) - Math.min(...values)}`);
        lines.push(`Sample Variance: ${variance(values, true)}`);
        lines.push(`Sample Std Dev: ${standardDeviation(values, true)}`);
        lines.push("");
      });
    } else if (analysisType === "histogram") {
      const values = numericGroups[0];
      const bins = Math.max(1, parseInt(binCount, 10) || 10);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const width = (max - min) / bins || 1;
      const frequencies = new Array(bins).fill(0);
      values.forEach((value) => {
        const index = Math.min(bins - 1, Math.floor((value - min) / width));
        frequencies[index] += 1;
      });
      lines.push("Bin\tFrequency");
      frequencies.forEach((frequency, index) => {
        const lower = min + index * width;
        const upper = min + (index + 1) * width;
        lines.push(`${lower.toFixed(2)} - ${upper.toFixed(2)}\t${frequency}`);
      });
    } else if (analysisType === "correlation" || analysisType === "covariance") {
      if (numericGroups.length < 2) {
        lines.push("Please provide two ranges.");
      } else {
        const value = analysisType === "correlation" ? correlation(numericGroups[0], numericGroups[1]) : covariance(numericGroups[0], numericGroups[1], true);
        lines.push(`${analysisType === "correlation" ? "Correlation" : "Covariance"}: ${value}`);
      }
    } else if (analysisType === "regression") {
      const y = numericGroups[0];
      const predictors = numericGroups.slice(1);
      const regression = linearRegression(y, predictors);
      lines.push(`Intercept: ${regression.coefficients[0]}`);
      regression.coefficients.slice(1).forEach((coefficient, index) => {
        lines.push(`Coefficient ${index + 1}: ${coefficient}`);
      });
      lines.push(`R-squared: ${regression.rSquared}`);
    } else if (analysisType === "ttest") {
      const outcome = paired ? tTestPaired(numericGroups[0], numericGroups[1]) : tTestTwoSample(numericGroups[0], numericGroups[1], equalVar);
      lines.push(`t Statistic: ${outcome.t}`);
      lines.push(`Degrees of Freedom: ${outcome.df}`);
      lines.push(`p-value: ${outcome.pValue}`);
    } else if (analysisType === "ftest") {
      const outcome = fTest(numericGroups[0], numericGroups[1]);
      lines.push(`F Statistic: ${outcome.f}`);
      lines.push(`df1: ${outcome.df1}`);
      lines.push(`df2: ${outcome.df2}`);
      lines.push(`p-value: ${outcome.pValue}`);
    } else if (analysisType === "anova") {
      const outcome = anovaOneWay(numericGroups);
      lines.push(`F Statistic: ${outcome.f}`);
      lines.push(`df Between: ${outcome.dfBetween}`);
      lines.push(`df Within: ${outcome.dfWithin}`);
      lines.push(`p-value: ${outcome.pValue}`);
    }
    setResult(lines.join("\n"));
  };
  return (
    <Modal title="Data Analysis ToolPak" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block font-medium">Analysis type</label>
          <select className={inputClass} value={analysisType} onChange={(event) => setAnalysisType(event.target.value)}>
            <option value="descriptive">Descriptive Statistics</option>
            <option value="histogram">Histogram</option>
            <option value="correlation">Correlation</option>
            <option value="covariance">Covariance</option>
            <option value="regression">Regression</option>
            <option value="ttest">t-Test</option>
            <option value="ftest">F-Test</option>
            <option value="anova">ANOVA (Single Factor)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-medium">Ranges (comma separated)</label>
          <input className={inputClass} value={ranges} onChange={(event) => setRanges(event.target.value)} placeholder="A1:A10, B1:B10" />
        </div>
        {(analysisType === "histogram") && (
          <div>
            <label className="mb-1 block font-medium">Bin count</label>
            <input className={inputClass} value={binCount} onChange={(event) => setBinCount(event.target.value)} />
          </div>
        )}
        {(analysisType === "ttest") && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1"><input type="checkbox" checked={paired} onChange={(event) => setPaired(event.target.checked)} /> Paired</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={equalVar} onChange={(event) => setEqualVar(event.target.checked)} /> Equal variance</label>
          </div>
        )}
        <div>
          <label className="mb-1 block font-medium">Alpha</label>
          <input className={inputClass} value={alpha} onChange={(event) => setAlpha(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>Close</button>
          <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={runAnalysis}>Run Analysis</button>
        </div>
        {result && <pre className="whitespace-pre-wrap rounded bg-slate-100 p-2 text-xs">{result}</pre>}
      </div>
    </Modal>
  );
}

function SubtotalModal({ onGenerate, onClose }: { onGenerate: (config: SubtotalConfig) => void; onClose: () => void }) {
  const [groupColumn, setGroupColumn] = useState("A");
  const [valueColumn, setValueColumn] = useState("B");
  const [func, setFunc] = useState<SubtotalConfig["func"]>("SUM");
  const [outputCell, setOutputCell] = useState("");
  const inputClass = "w-full rounded border border-slate-300 px-2 py-1 text-sm";
  return (
    <Modal title="Subtotal" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block font-medium">Group column</label>
          <input className={inputClass} value={groupColumn} onChange={(event) => setGroupColumn(event.target.value)} placeholder="A" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Value column</label>
          <input className={inputClass} value={valueColumn} onChange={(event) => setValueColumn(event.target.value)} placeholder="B" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Function</label>
          <select className={inputClass} value={func} onChange={(event) => setFunc(event.target.value as SubtotalConfig["func"])}>
            <option value="SUM">SUM</option>
            <option value="COUNT">COUNT</option>
            <option value="AVERAGE">AVERAGE</option>
            <option value="MIN">MIN</option>
            <option value="MAX">MAX</option>
            <option value="PRODUCT">PRODUCT</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-medium">Output cell</label>
          <input className={inputClass} value={outputCell} onChange={(event) => setOutputCell(event.target.value)} placeholder="E1" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={() => onGenerate({ groupColumn, valueColumn, func, outputCell })}>Generate</button>
        </div>
      </div>
    </Modal>
  );
}

function PivotChartModal({ onGenerate, onClose }: { onGenerate: (config: PivotChartConfig) => void; onClose: () => void }) {
  const [sourceRange, setSourceRange] = useState("A1:C10");
  const [rowField, setRowField] = useState("");
  const [valueField, setValueField] = useState("");
  const [aggregation, setAggregation] = useState<PivotChartConfig["aggregation"]>("SUM");
  const [chartType, setChartType] = useState<ChartType>("column");
  const [outputCell, setOutputCell] = useState("");
  const [title, setTitle] = useState("PivotChart");
  const inputClass = "w-full rounded border border-slate-300 px-2 py-1 text-sm";
  return (
    <Modal title="PivotChart" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block font-medium">Source range (with header row)</label>
          <input className={inputClass} value={sourceRange} onChange={(event) => setSourceRange(event.target.value)} placeholder="A1:C10" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Row field (category)</label>
          <input className={inputClass} value={rowField} onChange={(event) => setRowField(event.target.value)} placeholder="Category" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Value field</label>
          <input className={inputClass} value={valueField} onChange={(event) => setValueField(event.target.value)} placeholder="Amount" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Aggregation</label>
          <select className={inputClass} value={aggregation} onChange={(event) => setAggregation(event.target.value as PivotChartConfig["aggregation"])}>
            <option value="SUM">SUM</option>
            <option value="COUNT">COUNT</option>
            <option value="AVERAGE">AVERAGE</option>
            <option value="MIN">MIN</option>
            <option value="MAX">MAX</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-medium">Chart type</label>
          <select className={inputClass} value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}>
            <option value="column">Column</option>
            <option value="bar">Bar</option>
            <option value="pie">Pie</option>
            <option value="line">Line</option>
            <option value="area">Area</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-medium">Output cell</label>
          <input className={inputClass} value={outputCell} onChange={(event) => setOutputCell(event.target.value)} placeholder="E1" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Chart title</label>
          <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={() => onGenerate({ sourceRange, rowField, valueField, aggregation, chartType, outputCell, title })}>Generate</button>
        </div>
      </div>
    </Modal>
  );
}

function ForecastSheetModal({ onGenerate, onClose }: { onGenerate: (config: ForecastSheetConfig) => void; onClose: () => void }) {
  const [timelineRange, setTimelineRange] = useState("A1:A12");
  const [valuesRange, setValuesRange] = useState("B1:B12");
  const [periods, setPeriods] = useState("6");
  const [confidence, setConfidence] = useState("0.95");
  const [seasonalityPeriod, setSeasonalityPeriod] = useState("0");
  const [outputCell, setOutputCell] = useState("");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [title, setTitle] = useState("Forecast");
  const inputClass = "w-full rounded border border-slate-300 px-2 py-1 text-sm";
  return (
    <Modal title="Forecast Sheet" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block font-medium">Timeline range</label>
          <input className={inputClass} value={timelineRange} onChange={(event) => setTimelineRange(event.target.value)} placeholder="A1:A12" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Values range</label>
          <input className={inputClass} value={valuesRange} onChange={(event) => setValuesRange(event.target.value)} placeholder="B1:B12" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Forecast periods</label>
          <input className={inputClass} value={periods} onChange={(event) => setPeriods(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block font-medium">Confidence (0.90 / 0.95 / 0.99)</label>
          <input className={inputClass} value={confidence} onChange={(event) => setConfidence(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block font-medium">Seasonality period (0 = none)</label>
          <input className={inputClass} value={seasonalityPeriod} onChange={(event) => setSeasonalityPeriod(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block font-medium">Output cell</label>
          <input className={inputClass} value={outputCell} onChange={(event) => setOutputCell(event.target.value)} placeholder="E1" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Chart type</label>
          <select className={inputClass} value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}>
            <option value="line">Line</option>
            <option value="column">Column</option>
            <option value="area">Area</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-medium">Chart title</label>
          <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={() => onGenerate({ timelineRange, valuesRange, periods: parseInt(periods, 10) || 0, confidence: parseFloat(confidence) || 0.95, seasonalityPeriod: parseInt(seasonalityPeriod, 10) || 0, outputCell, chartType, title })}>Generate</button>
        </div>
      </div>
    </Modal>
  );
}

function AnalyzeDataModal({ sheets, activeSheetIndex, onInsertChart, onClose }: {
  sheets: WorkbookSheet[];
  activeSheetIndex: number;
  onInsertChart: (request: AnalyzeChartRequest) => void;
  onClose: () => void;
}) {
  const [range, setRange] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [chartType, setChartType] = useState<ChartType>("column");
  const inputClass = "w-full rounded border border-slate-300 px-2 py-1 text-sm";
  const runInsight = (type: string) => {
    const rangeList = range.split(",").map((item) => item.trim()).filter(Boolean);
    const numericGroups = rangeList.map((item) => getRangeNumbers(sheets, activeSheetIndex, item));
    const values = numericGroups[0];
    const lines: string[] = [];
    if (values.length === 0) {
      setResult("Please provide a valid numeric range.");
      return;
    }
    if (type === "auto" || type === "trend") {
      const x = Array.from({ length: values.length }, (_, index) => index + 1);
      const regression = linearRegression(values, [x]);
      const slope = regression.coefficients[1] ?? 0;
      lines.push(`Trend: ${slope > 0 ? "Increasing" : slope < 0 ? "Decreasing" : "Flat"} (slope ${slope})`);
      lines.push(`R-squared: ${regression.rSquared}`);
    }
    if (type === "auto" || type === "outlier") {
      const avg = mean(values);
      const sd = standardDeviation(values, true);
      const outliers = values.filter((value) => Math.abs(value - avg) > 2 * sd);
      lines.push(`Outliers (mean ± 2 SD): ${outliers.length > 0 ? outliers.join(", ") : "None"}`);
    }
    if (type === "auto" || type === "correlation") {
      if (numericGroups.length >= 2) {
        const corr = correlation(numericGroups[0], numericGroups[1]);
        lines.push(`Correlation: ${corr}`);
      } else {
        lines.push("Correlation requires two ranges.");
      }
    }
    if (type === "auto" || type === "topbottom") {
      const sorted = [...values].sort((a, b) => b - a);
      lines.push(`Top 5: ${sorted.slice(0, 5).join(", ")}`);
      lines.push(`Bottom 5: ${sorted.slice(-5).reverse().join(", ")}`);
    }
    if (type === "auto" || type === "stats") {
      lines.push(`Count: ${values.length}`);
      lines.push(`Mean: ${mean(values)}`);
      lines.push(`Median: ${median(values)}`);
      lines.push(`Min: ${Math.min(...values)}`);
      lines.push(`Max: ${Math.max(...values)}`);
      lines.push(`Std Dev: ${standardDeviation(values, true)}`);
    }
    if (type === "charts") {
      lines.push(numericGroups.length >= 2 ? "Suggested chart: Line or Scatter" : "Suggested chart: Histogram or Column");
    }
    setResult(lines.join("\n"));
  };
  const runQuestion = () => {
    const text = question.toLowerCase();
    if (text.includes("trend")) runInsight("trend");
    else if (text.includes("outlier")) runInsight("outlier");
    else if (text.includes("correlation")) runInsight("correlation");
    else if (text.includes("top") || text.includes("bottom")) runInsight("topbottom");
    else if (text.includes("chart")) runInsight("charts");
    else runInsight("auto");
  };
  return (
    <Modal title="Analyze Data" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block font-medium">Range (comma separated for multiple)</label>
          <input className={inputClass} value={range} onChange={(event) => setRange(event.target.value)} placeholder="A1:A20, B1:B20" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Ask a question</label>
          <input className={inputClass} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What is the trend?" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => runInsight("auto")}>Auto Insights</button>
          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => runInsight("trend")}>Trends</button>
          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => runInsight("outlier")}>Outliers</button>
          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => runInsight("correlation")}>Correlation</button>
          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => runInsight("topbottom")}>Top/Bottom</button>
          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => runInsight("charts")}>Suggest Charts</button>
          <button type="button" className="rounded bg-blue-600 px-2 py-1 text-xs text-white" onClick={runQuestion}>Ask</button>
        </div>
        <div>
          <label className="mb-1 block font-medium">Insert chart</label>
          <select className={inputClass} value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}>
            <option value="column">Column</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
            <option value="area">Area</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>Close</button>
          <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={() => onInsertChart({ range: range.split(",")[0]?.trim() || "", chartType, title: "Analysis Chart" })}>Insert Chart</button>
        </div>
        {result && <pre className="whitespace-pre-wrap rounded bg-slate-100 p-2 text-xs">{result}</pre>}
      </div>
    </Modal>
  );
}

function WhatIfTableModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (config: WhatIfTableConfig) => void }) {
  const [formulaCell, setFormulaCell] = useState("");
  const [rowInputCell, setRowInputCell] = useState("");
  const [rowValues, setRowValues] = useState("");
  const [colInputCell, setColInputCell] = useState("");
  const [colValues, setColValues] = useState("");
  const [outputCell, setOutputCell] = useState("");
  const inputClass = "w-full rounded border border-slate-300 px-2 py-1 text-sm";
  return (
    <Modal title="What-If Data Table" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block font-medium">Formula cell</label>
          <input className={inputClass} value={formulaCell} onChange={(event) => setFormulaCell(event.target.value)} placeholder="B2" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Row input cell</label>
          <input className={inputClass} value={rowInputCell} onChange={(event) => setRowInputCell(event.target.value)} placeholder="B1" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Row values (comma separated)</label>
          <input className={inputClass} value={rowValues} onChange={(event) => setRowValues(event.target.value)} placeholder="10,20,30" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Column input cell (optional)</label>
          <input className={inputClass} value={colInputCell} onChange={(event) => setColInputCell(event.target.value)} placeholder="C1" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Column values (optional, comma separated)</label>
          <input className={inputClass} value={colValues} onChange={(event) => setColValues(event.target.value)} placeholder="5,10" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Output cell</label>
          <input className={inputClass} value={outputCell} onChange={(event) => setOutputCell(event.target.value)} placeholder="E1" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={() => onGenerate({ formulaCell, rowInputCell, rowValues, colInputCell, colValues, outputCell })}>Generate</button>
        </div>
      </div>
    </Modal>
  );
}

function ScenarioManagerModal({ scenarios, summary, onAdd, onApply, onDelete, onSummary, onClose }: {
  scenarios: ScenarioItem[];
  summary: string | null;
  onAdd: (name: string, changes: string, resultCells: string) => void;
  onApply: (id: string) => void;
  onDelete: (id: string) => void;
  onSummary: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [changes, setChanges] = useState("");
  const [resultCells, setResultCells] = useState("");
  const inputClass = "w-full rounded border border-slate-300 px-2 py-1 text-sm";
  return (
    <Modal title="Scenario Manager" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block font-medium">Scenario name</label>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Best case" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Changes (cell=value, comma separated)</label>
          <input className={inputClass} value={changes} onChange={(event) => setChanges(event.target.value)} placeholder="B1=100, B2=200" />
        </div>
        <div>
          <label className="mb-1 block font-medium">Result cells (comma separated)</label>
          <input className={inputClass} value={resultCells} onChange={(event) => setResultCells(event.target.value)} placeholder="B10, B11" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>Close</button>
          <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={() => { onAdd(name, changes, resultCells); setName(""); setChanges(""); setResultCells(""); }}>Add Scenario</button>
        </div>
        <div className="space-y-2">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="rounded border border-slate-200 p-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{scenario.name}</span>
                <div className="flex gap-2">
                  <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => onApply(scenario.id)}>Apply</button>
                  <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => onDelete(scenario.id)}>Delete</button>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-600">{scenario.changes.map((change) => `${change.cell}=${change.value}`).join(", ")}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onSummary}>Show Summary</button>
        </div>
        {summary && <pre className="whitespace-pre-wrap rounded bg-slate-100 p-2 text-xs">{summary}</pre>}
      </div>
    </Modal>
  );
}