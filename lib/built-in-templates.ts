// lib/built-in-templates.ts
// ALIMXL Spreadsheet — Built-in Offline Templates
// Production-ready starter template library.

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
}

export type CellMap = Record<string, CellData>;

export interface WorkbookSheet {
  id: string;
  name: string;
  gridRows: number;
  gridCols: number;
  cells: CellMap;
  groups?: any[];
  hiddenRows?: number[];
  hiddenCols?: number[];
  filters?: Record<number, string>;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  frozenRows?: number;
  frozenCols?: number;
  charts?: any[];
  conditionalRules?: any[];
  namedRanges?: Record<string, string>;
  drawings?: any[];
}

export interface WorkbookSnapshot {
  id?: string;
  name: string;
  pageSize?: string;
  orientation?: string;
  activeSheetIndex?: number;
  sheets: WorkbookSheet[];
  updatedAt?: string;
}

export interface BuiltInTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  snapshot: WorkbookSnapshot;
}

// ---------- helpers ----------

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
  rows = 40,
  cols = 12
): WorkbookSheet => ({
  id: `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

const setCell = (
  sheet: WorkbookSheet,
  row: number,
  col: number,
  value: string,
  style?: CellStyle
) => {
  sheet.cells[cellKey(row, col)] = {
    value,
    style,
  };
};

const titleStyle: CellStyle = {
  bold: true,
  fontSize: 20,
  color: "#106EBE",
  align: "center",
};

const headerStyle: CellStyle = {
  bold: true,
  bg: "#106EBE",
  color: "#FFFFFF",
  align: "center",
  borders: {
    top: true,
    right: true,
    bottom: true,
    left: true,
  },
};

const subHeaderStyle: CellStyle = {
  bold: true,
  bg: "#E5F1FB",
  color: "#106EBE",
  borders: {
    top: true,
    right: true,
    bottom: true,
    left: true,
  },
};

const normalStyle: CellStyle = {
  borders: {
    top: true,
    right: true,
    bottom: true,
    left: true,
  },
};

const totalStyle: CellStyle = {
  bold: true,
  bg: "#F3F2F1",
  borders: {
    top: true,
    right: true,
    bottom: true,
    left: true,
  },
};

// ---------- 1. Monthly Budget ----------

const buildMonthlyBudget = (): WorkbookSnapshot => {
  const sheet = createSheet("Monthly Budget", 40, 10);

  setCell(sheet, 0, 0, "MONTHLY BUDGET", titleStyle);
  setCell(sheet, 1, 0, "Plan your income, expenses and savings.", {
    italic: true,
    color: "#605E5C",
  });

  const headers = ["Category", "Planned", "Actual", "Difference"];
  headers.forEach((h, i) => {
    setCell(sheet, 3, i, h, headerStyle);
  });

  const rows = [
    ["Salary", "50000", "52000"],
    ["Freelance", "10000", "8000"],
    ["Rent", "15000", "15000"],
    ["Food", "10000", "12000"],
    ["Transport", "5000", "4500"],
    ["Utilities", "4000", "4200"],
    ["Savings", "10000", "9000"],
  ];

  rows.forEach((row, i) => {
    const r = 4 + i;
    setCell(sheet, r, 0, row[0], normalStyle);
    setCell(sheet, r, 1, row[1], normalStyle);
    setCell(sheet, r, 2, row[2], normalStyle);
    setCell(sheet, r, 3, `=B${r + 1}-C${r + 1}`, normalStyle);
  });

  setCell(sheet, 12, 0, "Total", totalStyle);
  setCell(sheet, 12, 1, "=SUM(B5:B11)", totalStyle);
  setCell(sheet, 12, 2, "=SUM(C5:C11)", totalStyle);
  setCell(sheet, 12, 3, "=B13-C13", totalStyle);

  return {
    name: "Monthly Budget",
    pageSize: "A4",
    orientation: "portrait",
    activeSheetIndex: 0,
    sheets: [sheet],
  };
};

// ---------- 2. Invoice ----------

const buildInvoice = (): WorkbookSnapshot => {
  const sheet = createSheet("Invoice", 40, 8);

  setCell(sheet, 0, 0, "INVOICE", titleStyle);
  setCell(sheet, 1, 0, "ALIMXL Business", {
    bold: true,
    color: "#106EBE",
  });
  setCell(sheet, 2, 0, "Invoice No: INV-001");
  setCell(sheet, 3, 0, "Date: [Date]");

  setCell(sheet, 5, 0, "Bill To:", subHeaderStyle);
  setCell(sheet, 6, 0, "Customer Name");
  setCell(sheet, 7, 0, "Customer Address");

  const headers = ["Item", "Quantity", "Unit Price", "Total"];
  headers.forEach((h, i) => {
    setCell(sheet, 9, i, h, headerStyle);
  });

  const items = [
    ["Website Design", "1", "25000"],
    ["SEO Service", "1", "15000"],
    ["Hosting", "1", "5000"],
  ];

  items.forEach((item, i) => {
    const r = 10 + i;
    setCell(sheet, r, 0, item[0], normalStyle);
    setCell(sheet, r, 1, item[1], normalStyle);
    setCell(sheet, r, 2, item[2], normalStyle);
    setCell(sheet, r, 3, `=B${r + 1}*C${r + 1}`, normalStyle);
  });

  setCell(sheet, 14, 2, "Subtotal", totalStyle);
  setCell(sheet, 14, 3, "=SUM(D11:D13)", totalStyle);

  setCell(sheet, 15, 2, "Tax (10%)", normalStyle);
  setCell(sheet, 15, 3, "=D15*0.1", normalStyle);

  setCell(sheet, 16, 2, "Grand Total", totalStyle);
  setCell(sheet, 16, 3, "=D15+D16", totalStyle);

  return {
    name: "Invoice",
    pageSize: "A4",
    orientation: "portrait",
    activeSheetIndex: 0,
    sheets: [sheet],
  };
};

// ---------- 3. Attendance Sheet ----------

const buildAttendance = (): WorkbookSnapshot => {
  const sheet = createSheet("Attendance", 40, 12);

  setCell(sheet, 0, 0, "EMPLOYEE ATTENDANCE", titleStyle);

  const headers = [
    "Employee",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
    "Present",
    "Absent",
  ];

  headers.forEach((h, i) => {
    setCell(sheet, 2, i, h, headerStyle);
  });

  const employees = ["Rahim", "Karim", "Selina", "Jamal"];

  employees.forEach((name, i) => {
    const r = 3 + i;
    setCell(sheet, r, 0, name, normalStyle);
    for (let c = 1; c <= 7; c++) {
      setCell(sheet, r, c, "", normalStyle);
    }
    setCell(sheet, r, 8, `=COUNTIF(B${r + 1}:H${r + 1},"P")`, normalStyle);
    setCell(sheet, r, 9, `=COUNTIF(B${r + 1}:H${r + 1},"A")`, normalStyle);
  });

  return {
    name: "Attendance Sheet",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [sheet],
  };
};

// ---------- 4. Inventory ----------

const buildInventory = (): WorkbookSnapshot => {
  const sheet = createSheet("Inventory", 40, 10);

  setCell(sheet, 0, 0, "INVENTORY MANAGEMENT", titleStyle);

  const headers = [
    "Product",
    "Category",
    "Stock In",
    "Stock Out",
    "Remaining",
    "Reorder Level",
    "Status",
  ];

  headers.forEach((h, i) => {
    setCell(sheet, 2, i, h, headerStyle);
  });

  const items = [
    ["Laptop", "Electronics", "50", "20", "30", "10"],
    ["Printer", "Office", "30", "10", "20", "5"],
    ["Chair", "Furniture", "100", "40", "60", "20"],
    ["Desk", "Furniture", "80", "30", "50", "15"],
  ];

  items.forEach((item, i) => {
    const r = 3 + i;
    setCell(sheet, r, 0, item[0], normalStyle);
    setCell(sheet, r, 1, item[1], normalStyle);
    setCell(sheet, r, 2, item[2], normalStyle);
    setCell(sheet, r, 3, item[3], normalStyle);
    setCell(sheet, r, 4, `=C${r + 1}-D${r + 1}`, normalStyle);
    setCell(sheet, r, 5, item[5], normalStyle);
    setCell(
      sheet,
      r,
      6,
      `=IF(E${r + 1}<=F${r + 1},"Reorder","OK")`,
      normalStyle
    );
  });

  return {
    name: "Inventory Management",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [sheet],
  };
};

// ---------- 5. Sales Dashboard ----------

const buildSalesDashboard = (): WorkbookSnapshot => {
  const sheet = createSheet("Sales Dashboard", 40, 10);

  setCell(sheet, 0, 0, "SALES DASHBOARD", titleStyle);

  const headers = ["Month", "Target", "Achieved", "Difference", "Performance"];

  headers.forEach((h, i) => {
    setCell(sheet, 2, i, h, headerStyle);
  });

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
  ];

  months.forEach((month, i) => {
    const r = 3 + i;
    setCell(sheet, r, 0, month, normalStyle);
    setCell(sheet, r, 1, "", normalStyle);
    setCell(sheet, r, 2, "", normalStyle);
    setCell(sheet, r, 3, `=C${r + 1}-B${r + 1}`, normalStyle);
    setCell(
      sheet,
      r,
      4,
      `=IF(C${r + 1}>=B${r + 1},"On Target","Below Target")`,
      normalStyle
    );
  });

  return {
    name: "Sales Dashboard",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [sheet],
  };
};

// ---------- 6. Project Plan ----------

const buildProjectPlan = (): WorkbookSnapshot => {
  const sheet = createSheet("Project Plan", 40, 10);

  setCell(sheet, 0, 0, "PROJECT PLAN", titleStyle);

  const headers = [
    "Task",
    "Owner",
    "Start Date",
    "End Date",
    "Status",
    "Priority",
  ];

  headers.forEach((h, i) => {
    setCell(sheet, 2, i, h, headerStyle);
  });

  const tasks = [
    ["Requirement Collection", "Team", "", "", "Pending", "High"],
    ["UI Design", "Designer", "", "", "Pending", "High"],
    ["Development", "Developer", "", "", "Pending", "High"],
    ["Testing", "QA", "", "", "Pending", "Medium"],
    ["Deployment", "DevOps", "", "", "Pending", "High"],
  ];

  tasks.forEach((task, i) => {
    const r = 3 + i;
    task.forEach((value, c) => {
      setCell(sheet, r, c, value, normalStyle);
    });
  });

  return {
    name: "Project Plan",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [sheet],
  };
};

// ---------- export ----------

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "tpl-monthly-budget",
    name: "Monthly Budget",
    category: "Finance",
    description: "Plan income, expenses and savings.",
    snapshot: buildMonthlyBudget(),
  },
  {
    id: "tpl-invoice",
    name: "Professional Invoice",
    category: "Business",
    description: "Create clean invoices with tax and totals.",
    snapshot: buildInvoice(),
  },
  {
    id: "tpl-attendance",
    name: "Employee Attendance",
    category: "HR",
    description: "Track daily attendance and absences.",
    snapshot: buildAttendance(),
  },
  {
    id: "tpl-inventory",
    name: "Inventory Management",
    category: "Business",
    description: "Track stock, sales and reorder levels.",
    snapshot: buildInventory(),
  },
  {
    id: "tpl-sales-dashboard",
    name: "Sales Dashboard",
    category: "Business",
    description: "Monitor monthly sales performance.",
    snapshot: buildSalesDashboard(),
  },
  {
    id: "tpl-project-plan",
    name: "Project Plan",
    category: "Productivity",
    description: "Plan tasks, owners and deadlines.",
    snapshot: buildProjectPlan(),
  },
];