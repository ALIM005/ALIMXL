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
  sparkline?: string;
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


const setSparkline = (
  sheet: WorkbookSheet,
  row: number,
  col: number,
  range: string,
  style?: CellStyle
) => {
  sheet.cells[cellKey(row, col)] = {
    value: "",
    style,
    sparkline: range,
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


// ---------- 7. Company Dashboard ----------


const buildCompanyDashboard = (): WorkbookSnapshot => {
  const dashboard = createSheet("Dashboard", 45, 12);
  const income = createSheet("Income", 45, 8);
  const expenses = createSheet("Expenses", 45, 8);
  const performance = createSheet("Monthly Performance", 45, 8);
  const chartData = createSheet("Chart Data", 45, 8);
  const instructions = createSheet("Instructions", 45, 8);
  const formulaDocs = createSheet("Formula Guide", 45, 8);


  // ---------------- Dashboard ----------------


  dashboard.colWidths = {
    0: 190,
    1: 150,
    2: 150,
    3: 150,
    4: 150,
    5: 150,
    6: 150,
    7: 150,
    8: 150,
    9: 150,
    10: 150,
    11: 150,
  };


  setCell(dashboard, 0, 0, "COMPANY DASHBOARD", titleStyle);
  setCell(
    dashboard,
    1,
    0,
    "কোম্পানি ড্যাশবোর্ড — Company Performance Overview",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const kpiHeaders = [
    "Total Income / মোট আয়",
    "Total Expenses / মোট খরচ",
    "Net Profit / নিট লাভ",
    "Profit Margin / লাভের হার",
  ];


  kpiHeaders.forEach((header, index) => {
    setCell(dashboard, 3, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 4, 0, "=SUM(Income!D5:D16)", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 4, 1, "=SUM(Expenses!D5:D16)", {
    ...totalStyle,
    fontSize: 18,
    color: "#B45309",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 4, 2, "=A5-B5", {
    ...totalStyle,
    fontSize: 18,
    color: "#106EBE",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 4, 3, "=IF(A5=0,0,C5/A5)", {
    ...totalStyle,
    fontSize: 18,
    color: "#7052A3",
    numberFormat: "percentage",
    decimals: 1,
  });


  setCell(dashboard, 6, 0, "Monthly Performance / মাসিক পারফরম্যান্স", subHeaderStyle);


  const performanceHeaders = [
    "Month / মাস",
    "Target / টার্গেট",
    "Achieved / অর্জন",
    "Difference / পার্থক্য",
    "Performance / অবস্থা",
    "Trend / ট্রেন্ড",
  ];


  performanceHeaders.forEach((header, index) => {
    setCell(dashboard, 7, index, header, headerStyle);
  });


  const months = [
    "January / জানুয়ারি",
    "February / ফেব্রুয়ারি",
    "March / মার্চ",
    "April / এপ্রিল",
    "May / মে",
    "June / জুন",
    "July / জুলাই",
    "August / আগস্ট",
    "September / সেপ্টেম্বর",
    "October / অক্টোবর",
    "November / নভেম্বর",
    "December / ডিসেম্বর",
  ];


  months.forEach((month, index) => {
    const row = 8 + index;


    setCell(dashboard, row, 0, month, normalStyle);
    setCell(dashboard, row, 1, "", {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(dashboard, row, 2, "", {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(dashboard, row, 3, `=C${row + 1}-B${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(
      dashboard,
      row,
      4,
      `=IF(C${row + 1}="","",IF(C${row + 1}>=B${row + 1},"On Target / টার্গেট পূরণ","Below Target / টার্গেটের নিচে"))`,
      normalStyle
    );


    setSparkline(dashboard, row, 5, `B${row + 1}:C${row + 1}`, normalStyle);
  });


  dashboard.conditionalRules = [
    {
      id: "company-profit-margin-loss",
      range: "D5:D5",
      condition: "less",
      value: "0",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "company-performance-below",
      range: "E9:E20",
      condition: "textContains",
      value: "Below Target",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "company-performance-on-target",
      range: "E9:E20",
      condition: "textContains",
      value: "On Target",
      bg: "#E6F4EA",
      color: "#137333",
    },
  ];


  dashboard.charts = [
    {
      id: "company-income-trend",
      title: "Monthly Income / মাসিক আয়",
      type: "column",
      range: "Income!D5:D16",
      subtitle: "Monthly income entered in the Income sheet",
      xAxisTitle: "Month",
      yAxisTitle: "Amount (BDT)",
      showLegend: true,
      legendPosition: "bottom",
    },
    {
      id: "company-expense-trend",
      title: "Monthly Expenses / মাসিক খরচ",
      type: "bar",
      range: "Expenses!D5:D16",
      subtitle: "Monthly expenses entered in the Expenses sheet",
      xAxisTitle: "Month",
      yAxisTitle: "Amount (BDT)",
      showLegend: true,
      legendPosition: "bottom",
    },
    {
      id: "company-profit-trend",
      title: "Monthly Difference / মাসিক পার্থক্য",
      type: "line",
      range: "D9:D20",
      subtitle: "Achieved minus target",
      xAxisTitle: "Month",
      yAxisTitle: "Difference (BDT)",
      showLegend: false,
      legendPosition: "none",
    },
  ];


  // ---------------- Income ----------------


  income.colWidths = {
    0: 130,
    1: 240,
    2: 150,
    3: 140,
  };


  income.frozenRows = 4;


  setCell(income, 0, 0, "INCOME / আয়", titleStyle);
  setCell(
    income,
    1,
    0,
    "মাসিক আয়ের তথ্য এখানে লিখুন। Dashboard-এ স্বয়ংক্রিয়ভাবে যোগ হবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const incomeHeaders = [
    "Date / তারিখ",
    "Description / বিবরণ",
    "Category / খাত",
    "Amount / টাকা",
  ];


  incomeHeaders.forEach((header, index) => {
    setCell(income, 3, index, header, headerStyle);
  });


  const incomeSamples = [
    ["2026-01-05", "Product Sales / পণ্য বিক্রয়", "Sales / বিক্রয়", "150000"],
    ["2026-01-12", "Service Income / সেবা আয়", "Services / সেবা", "80000"],
    ["2026-02-03", "Product Sales / পণ্য বিক্রয়", "Sales / বিক্রয়", "175000"],
    ["2026-02-18", "Consulting / পরামর্শ সেবা", "Services / সেবা", "60000"],
    ["2026-03-07", "Online Order / অনলাইন অর্ডার", "Sales / বিক্রয়", "95000"],
    ["2026-03-21", "Training Income / প্রশিক্ষণ আয়", "Services / সেবা", "45000"],
    ["2026-04-04", "Product Sales / পণ্য বিক্রয়", "Sales / বিক্রয়", "120000"],
    ["2026-04-19", "Maintenance / রক্ষণাবেক্ষণ", "Services / সেবা", "35000"],
    ["2026-05-06", "Product Sales / পণ্য বিক্রয়", "Sales / বিক্রয়", "140000"],
    ["2026-05-24", "Consulting / পরামর্শ সেবা", "Services / সেবা", "55000"],
    ["2026-06-09", "Product Sales / পণ্য বিক্রয়", "Sales / বিক্রয়", "165000"],
    ["2026-06-27", "Other Income / অন্যান্য আয়", "Other / অন্যান্য", "30000"],
  ];


  incomeSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(income, row, 0, item[0], normalStyle);
    setCell(income, row, 1, item[1], normalStyle);
    setCell(income, row, 2, item[2], normalStyle);
    setCell(income, row, 3, item[3], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
  });


  setCell(income, 17, 2, "Total / মোট", totalStyle);
  setCell(income, 17, 3, "=SUM(D5:D16)", {
    ...totalStyle,
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  income.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
  };


  income.conditionalRules = [
    {
      id: "income-high-value",
      range: "D5:D16",
      condition: "greater",
      value: "100000",
      bg: "#E6F4EA",
      color: "#137333",
    },
  ];


  // ---------------- Expenses ----------------


  expenses.colWidths = {
    0: 130,
    1: 240,
    2: 150,
    3: 140,
  };


  expenses.frozenRows = 4;


  setCell(expenses, 0, 0, "EXPENSES / খরচ", titleStyle);
  setCell(
    expenses,
    1,
    0,
    "মাসিক খরচের তথ্য এখানে লিখুন। Dashboard-এ স্বয়ংক্রিয়ভাবে যোগ হবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const expenseHeaders = [
    "Date / তারিখ",
    "Description / বিবরণ",
    "Category / খাত",
    "Amount / টাকা",
  ];


  expenseHeaders.forEach((header, index) => {
    setCell(expenses, 3, index, header, headerStyle);
  });


  const expenseSamples = [
    ["2026-01-08", "Office Rent / অফিস ভাড়া", "Fixed Cost / স্থায়ী খরচ", "40000"],
    ["2026-01-15", "Marketing / বিপণন", "Marketing / বিপণন", "25000"],
    ["2026-02-05", "Salaries / বেতন", "Payroll / বেতন", "90000"],
    ["2026-02-20", "Utilities / ইউটিলিটি", "Operations / পরিচালনা", "12000"],
    ["2026-03-06", "Internet & Phone / ইন্টারনেট ও ফোন", "Operations / পরিচালনা", "8000"],
    ["2026-03-18", "Transport / পরিবহন", "Operations / পরিচালনা", "15000"],
    ["2026-04-08", "Office Supplies / অফিস সামগ্রী", "Operations / পরিচালনা", "10000"],
    ["2026-04-22", "Marketing / বিপণন", "Marketing / বিপণন", "30000"],
    ["2026-05-07", "Salaries / বেতন", "Payroll / বেতন", "95000"],
    ["2026-05-25", "Maintenance / রক্ষণাবেক্ষণ", "Operations / পরিচালনা", "18000"],
    ["2026-06-10", "Marketing / বিপণন", "Marketing / বিপণন", "28000"],
    ["2026-06-28", "Other Expense / অন্যান্য খরচ", "Other / অন্যান্য", "22000"],
  ];


  expenseSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(expenses, row, 0, item[0], normalStyle);
    setCell(expenses, row, 1, item[1], normalStyle);
    setCell(expenses, row, 2, item[2], normalStyle);
    setCell(expenses, row, 3, item[3], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
  });


  setCell(expenses, 17, 2, "Total / মোট", totalStyle);
  setCell(expenses, 17, 3, "=SUM(D5:D16)", {
    ...totalStyle,
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  expenses.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
  };


  expenses.conditionalRules = [
    {
      id: "expense-high-value",
      range: "D5:D16",
      condition: "greater",
      value: "80000",
      bg: "#FDE7E9",
      color: "#B42318",
    },
  ];


  // ---------------- Monthly Performance ----------------


  performance.colWidths = {
    0: 190,
    1: 150,
    2: 150,
    3: 150,
    4: 180,
    5: 150,
  };


  performance.frozenRows = 3;


  setCell(performance, 0, 0, "MONTHLY PERFORMANCE / মাসিক পারফরম্যান্স", titleStyle);
  setCell(
    performance,
    1,
    0,
    "প্রতি মাসের টার্গেট ও অর্জন লিখুন। Dashboard-এ ফলাফল দেখা যাবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const performanceSheetHeaders = [
    "Month / মাস",
    "Target / টার্গেট",
    "Achieved / অর্জন",
    "Difference / পার্থক্য",
    "Performance / অবস্থা",
    "Trend / ট্রেন্ড",
  ];


  performanceSheetHeaders.forEach((header, index) => {
    setCell(performance, 2, index, header, headerStyle);
  });


  months.forEach((month, index) => {
    const row = 3 + index;


    setCell(performance, row, 0, month, normalStyle);
    setCell(performance, row, 1, "", {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(performance, row, 2, "", {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(performance, row, 3, `=C${row + 1}-B${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(
      performance,
      row,
      4,
      `=IF(C${row + 1}="","",IF(C${row + 1}>=B${row + 1},"On Target / টার্গেট পূরণ","Below Target / টার্গেটের নিচে"))`,
      normalStyle
    );


    setSparkline(performance, row, 5, `B${row + 1}:C${row + 1}`, normalStyle);
  });


  performance.conditionalRules = [
    {
      id: "performance-below-target",
      range: "E4:E15",
      condition: "textContains",
      value: "Below Target",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "performance-on-target",
      range: "E4:E15",
      condition: "textContains",
      value: "On Target",
      bg: "#E6F4EA",
      color: "#137333",
    },
  ];


  // ---------------- Chart Data ----------------


  chartData.colWidths = {
    0: 190,
    1: 150,
    2: 150,
    3: 150,
  };


  setCell(chartData, 0, 0, "CHART DATA / চার্ট ডেটা", titleStyle);
  setCell(
    chartData,
    1,
    0,
    "Chart Wizard-এর জন্য প্রয়োজনীয় ডেটা range নিচে দেওয়া হয়েছে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const chartDataRows = [
    ["Monthly Income", "Income!D5:D16"],
    ["Monthly Expenses", "Expenses!D5:D16"],
    ["Monthly Difference", "Dashboard!D9:D20"],
    ["Monthly Target", "Dashboard!B9:B20"],
    ["Monthly Achieved", "Dashboard!C9:C20"],
  ];


  chartDataRows.forEach((item, index) => {
    const row = 3 + index;


    setCell(chartData, row, 0, item[0], subHeaderStyle);
    setCell(chartData, row, 1, item[1], normalStyle);
  });


  // ---------------- Instructions ----------------


  setCell(instructions, 0, 0, "HOW TO USE / ব্যবহারের নিয়ম", titleStyle);


  const instructionsList = [
    "1. Income sheet-এ মাসিক আয়ের তথ্য লিখুন।",
    "২. Expenses sheet-এ মাসিক খরচের তথ্য লিখুন।",
    "৩. Dashboard sheet-এ মোট আয়, খরচ, নিট লাভ ও লাভের হার দেখুন।",
    "৪. Monthly Performance sheet-এ টার্গেট ও অর্জন লিখুন।",
    "৫. Difference ও Performance স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    "৬. Chart Data sheet থেকে chart range নির্বাচন করুন।",
    "৭. Chart Wizard ব্যবহার করে chart তৈরি করুন।",
    "৮. প্রিন্টের আগে Print Preview ব্যবহার করুন।",
    "৯. ফাইলটি নিয়মিত XLSX বা JSON backup হিসেবে সেভ রাখুন।",
  ];


  instructionsList.forEach((text, index) => {
    setCell(instructions, 2 + index, 0, text, {
      ...normalStyle,
      wrap: true,
    });
  });


  // ---------------- Formula Guide ----------------


  setCell(formulaDocs, 0, 0, "FORMULA DOCUMENTATION / ফর্মুলা নির্দেশিকা", titleStyle);


  const formulaDocsList = [
    ["Total Income", "=SUM(Income!D5:D16)", "Income sheet-এর সব আয়ের যোগফল।"],
    ["Total Expenses", "=SUM(Expenses!D5:D16)", "Expenses sheet-এর সব খরচের যোগফল।"],
    ["Net Profit", "=A5-B5", "মোট আয় থেকে মোট খরচ বাদ দিলে নিট লাভ।"],
    ["Profit Margin", "=IF(A5=0,0,C5/A5)", "মোট আয়ের তুলনায় লাভের হার।"],
    ["Monthly Difference", "=C4-B4", "অর্জন থেকে টার্গেট বাদ দিলে পার্থক্য।"],
    [
      "Performance Status",
      "=IF(C4>=B4,\"On Target\",\"Below Target\")",
      "টার্গেট পূরণ হয়েছে কি না তা নির্ধারণ করে।",
    ],
    ["Income Total", "=SUM(D5:D16)", "Income sheet-এর মোট আয়।"],
    ["Expense Total", "=SUM(D5:D16)", "Expenses sheet-এর মোট খরচ।"],
  ];


  formulaDocsList.forEach((item, index) => {
    const row = 2 + index;


    setCell(formulaDocs, row, 0, item[0], subHeaderStyle);
    setCell(formulaDocs, row, 1, item[1], normalStyle);
    setCell(formulaDocs, row, 2, item[2], {
      ...normalStyle,
      wrap: true,
    });
  });


  formulaDocs.colWidths = {
    0: 180,
    1: 260,
    2: 320,
  };


  return {
    name: "Company Dashboard",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [
      dashboard,
      income,
      expenses,
      performance,
      chartData,
      instructions,
      formulaDocs,
    ],
  };
};


// ---------- 8. Inventory & Stock Control ----------


const buildInventoryStockControl = (): WorkbookSnapshot => {
  const dashboard = createSheet("Dashboard", 45, 12);
  const products = createSheet("Products", 45, 10);
  const stockIn = createSheet("StockIn", 45, 8);
  const stockOut = createSheet("StockOut", 45, 8);
  const stockReport = createSheet("StockReport", 45, 12);
  const reorderAlert = createSheet("ReorderAlert", 45, 8);
  const suppliers = createSheet("Suppliers", 45, 8);
  const instructions = createSheet("Instructions", 45, 8);
  const formulaDocs = createSheet("FormulaGuide", 45, 8);


  // ---------------- Dashboard ----------------


  dashboard.colWidths = {
    0: 200,
    1: 160,
    2: 160,
    3: 160,
    4: 160,
    5: 160,
    6: 160,
    7: 160,
    8: 160,
    9: 160,
    10: 160,
    11: 160,
  };


  setCell(dashboard, 0, 0, "INVENTORY & STOCK CONTROL", titleStyle);
  setCell(
    dashboard,
    1,
    0,
    "ইনভেন্টরি ও স্টক নিয়ন্ত্রণ ড্যাশবোর্ড — Inventory & Stock Control Dashboard",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const kpiHeaders = [
    "Total Products / মোট পণ্য",
    "Total Stock In / মোট স্টক ইন",
    "Total Stock Out / মোট স্টক আউট",
    "Current Stock / বর্তমান স্টক",
  ];


  kpiHeaders.forEach((header, index) => {
    setCell(dashboard, 3, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 4, 0, "=COUNTIF(Products!A5:A14,\"<>\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#106EBE",
  });


  setCell(dashboard, 4, 1, "=SUM(StockReport!E5:E14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
  });


  setCell(dashboard, 4, 2, "=SUM(StockReport!F5:F14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#B45309",
  });


  setCell(dashboard, 4, 3, "=SUM(StockReport!G5:G14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#7052A3",
  });


  const alertHeaders = [
    "Low Stock Items / কম স্টক পণ্য",
    "Out of Stock Items / স্টক শেষ পণ্য",
    "Total Stock Value / মোট স্টক মূল্য",
    "Reorder Needed / রি-অর্ডার প্রয়োজন",
  ];


  alertHeaders.forEach((header, index) => {
    setCell(dashboard, 6, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 7, 0, "=COUNTIF(StockReport!I5:I14,\"Reorder\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B45309",
  });


  setCell(dashboard, 7, 1, "=COUNTIF(StockReport!G5:G14,0)", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
  });


  setCell(dashboard, 7, 2, "=SUM(StockReport!K5:K14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 7, 3, "=COUNTIF(ReorderAlert!F5:F14,\"Reorder Now\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
  });


  setCell(dashboard, 9, 0, "Stock Overview / স্টক ওভারভিউ", subHeaderStyle);


  const overviewHeaders = [
    "Metric / মেট্রিক",
    "Value / মান",
    "Trend / ট্রেন্ড",
  ];


  overviewHeaders.forEach((header, index) => {
    setCell(dashboard, 10, index, header, headerStyle);
  });


  const overviewRows = [
    ["Total Stock In / মোট স্টক ইন", "=SUM(StockReport!E5:E14)"],
    ["Total Stock Out / মোট স্টক আউট", "=SUM(StockReport!F5:F14)"],
    ["Current Stock / বর্তমান স্টক", "=SUM(StockReport!G5:G14)"],
    ["Total Stock Value / মোট স্টক মূল্য", "=SUM(StockReport!K5:K14)"],
  ];


  overviewRows.forEach((item, index) => {
    const row = 11 + index;


    setCell(dashboard, row, 0, item[0], normalStyle);
    setCell(dashboard, row, 1, item[1], {
      ...normalStyle,
      numberFormat: item[0].includes("Value") ? "currency" : "number",
      currencyCode: "BDT",
    });


    setSparkline(dashboard, row, 2, `B${row + 1}:B${row + 1}`, normalStyle);
  });


  dashboard.charts = [
    {
      id: "inventory-stock-in",
      title: "Stock In by Product / পণ্য অনুযায়ী স্টক ইন",
      type: "column",
      range: "StockReport!E5:E14",
      subtitle: "Total stock received for each product",
      xAxisTitle: "Product",
      yAxisTitle: "Quantity",
      showLegend: true,
      legendPosition: "bottom",
    },
    {
      id: "inventory-stock-out",
      title: "Stock Out by Product / পণ্য অনুযায়ী স্টক আউট",
      type: "bar",
      range: "StockReport!F5:F14",
      subtitle: "Total stock issued or sold for each product",
      xAxisTitle: "Product",
      yAxisTitle: "Quantity",
      showLegend: true,
      legendPosition: "bottom",
    },
    {
      id: "inventory-current-stock",
      title: "Current Stock / বর্তমান স্টক",
      type: "line",
      range: "StockReport!G5:G14",
      subtitle: "Current available stock by product",
      xAxisTitle: "Product",
      yAxisTitle: "Quantity",
      showLegend: false,
      legendPosition: "none",
    },
  ];


  // ---------------- Products ----------------


  products.colWidths = {
    0: 110,
    1: 220,
    2: 150,
    3: 100,
    4: 140,
    5: 130,
    6: 130,
    7: 130,
    8: 180,
  };


  products.frozenRows = 3;


  setCell(products, 0, 0, "PRODUCTS / পণ্য তালিকা", titleStyle);
  setCell(
    products,
    1,
    0,
    "পণ্যের তথ্য, ক্রয়মূল্য, বিক্রয়মূল্য, প্রারম্ভিক স্টক ও রি-অর্ডার লেভেল লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const productHeaders = [
    "Product ID / পণ্য আইডি",
    "Product Name / পণ্যের নাম",
    "Category / ক্যাটাগরি",
    "Unit / একক",
    "Purchase Price / ক্রয়মূল্য",
    "Sale Price / বিক্রয়মূল্য",
    "Opening Stock / প্রারম্ভিক স্টক",
    "Reorder Level / রি-অর্ডার লেভেল",
    "Supplier / সরবরাহকারী",
  ];


  productHeaders.forEach((header, index) => {
    setCell(products, 3, index, header, headerStyle);
  });


  const productSamples = [
    ["P-001", "Rice / চাল", "Grocery / মুদি", "Kg", "80", "95", "100", "20", "Supplier A"],
    ["P-002", "Sugar / চিনি", "Grocery / মুদি", "Kg", "120", "140", "80", "15", "Supplier A"],
    ["P-003", "Cooking Oil / সয়াবিন তেল", "Grocery / মুদি", "Litre", "180", "210", "60", "10", "Supplier B"],
    ["P-004", "Paracetamol / প্যারাসিটামল", "Pharmacy / ফার্মেসি", "Strip", "25", "35", "200", "50", "Supplier C"],
    ["P-005", "Cough Syrup / কাশির সিরাপ", "Pharmacy / ফার্মেসি", "Bottle", "90", "120", "50", "15", "Supplier C"],
    ["P-006", "Cotton Fabric / সুতি কাপড়", "Fabric / কাপড়", "Meter", "350", "450", "120", "30", "Supplier D"],
    ["P-007", "T-Shirt / টি-শার্ট", "Garments / পোশাক", "Piece", "450", "650", "100", "25", "Supplier D"],
    ["P-008", "Rice Cooker / রাইস কুকার", "Electronics / ইলেকট্রনিক্স", "Piece", "3200", "4200", "20", "5", "Supplier E"],
    ["P-009", "Mobile Charger / মোবাইল চার্জার", "Electronics / ইলেকট্রনিক্স", "Piece", "350", "550", "40", "10", "Supplier E"],
    ["P-010", "Notebook / খাতা", "Stationery / স্টেশনারি", "Piece", "60", "85", "150", "30", "Supplier F"],
  ];


  productSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(products, row, 0, item[0], normalStyle);
    setCell(products, row, 1, item[1], normalStyle);
    setCell(products, row, 2, item[2], normalStyle);
    setCell(products, row, 3, item[3], normalStyle);
    setCell(products, row, 4, item[4], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(products, row, 5, item[5], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(products, row, 6, item[6], normalStyle);
    setCell(products, row, 7, item[7], normalStyle);
    setCell(products, row, 8, item[8], normalStyle);
  });


  products.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
    8: "",
  };


  // ---------------- Stock In ----------------


  stockIn.colWidths = {
    0: 120,
    1: 120,
    2: 220,
    3: 160,
    4: 110,
    5: 130,
    6: 140,
  };


  stockIn.frozenRows = 3;


  setCell(stockIn, 0, 0, "STOCK IN / স্টক ইন", titleStyle);
  setCell(
    stockIn,
    1,
    0,
    "কেনা পণ্যের তথ্য এখানে লিখুন। Total Cost স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const stockInHeaders = [
    "Date / তারিখ",
    "Product ID / পণ্য আইডি",
    "Product Name / পণ্যের নাম",
    "Supplier / সরবরাহকারী",
    "Quantity / পরিমাণ",
    "Unit Price / একক মূল্য",
    "Total Cost / মোট খরচ",
  ];


  stockInHeaders.forEach((header, index) => {
    setCell(stockIn, 2, index, header, headerStyle);
  });


  const stockInSamples = [
    ["2026-01-05", "P-001", "Rice / চাল", "Supplier A", "50", "80"],
    ["2026-01-08", "P-002", "Sugar / চিনি", "Supplier A", "30", "120"],
    ["2026-01-12", "P-003", "Cooking Oil / সয়াবিন তেল", "Supplier B", "20", "180"],
    ["2026-01-18", "P-004", "Paracetamol / প্যারাসিটামল", "Supplier C", "100", "25"],
    ["2026-01-25", "P-005", "Cough Syrup / কাশির সিরাপ", "Supplier C", "25", "90"],
    ["2026-02-02", "P-006", "Cotton Fabric / সুতি কাপড়", "Supplier D", "40", "350"],
    ["2026-02-09", "P-007", "T-Shirt / টি-শার্ট", "Supplier D", "50", "450"],
    ["2026-02-16", "P-008", "Rice Cooker / রাইস কুকার", "Supplier E", "10", "3200"],
    ["2026-02-23", "P-009", "Mobile Charger / মোবাইল চার্জার", "Supplier E", "20", "350"],
    ["2026-03-01", "P-010", "Notebook / খাতা", "Supplier F", "80", "60"],
  ];


  stockInSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(stockIn, row, 0, item[0], normalStyle);
    setCell(stockIn, row, 1, item[1], normalStyle);
    setCell(stockIn, row, 2, item[2], normalStyle);
    setCell(stockIn, row, 3, item[3], normalStyle);
    setCell(stockIn, row, 4, item[4], normalStyle);
    setCell(stockIn, row, 5, item[5], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(stockIn, row, 6, `=E${row + 1}*F${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
  });


  setCell(stockIn, 15, 4, "Total / মোট", totalStyle);
  setCell(stockIn, 15, 5, "=SUM(E5:E14)", totalStyle);
  setCell(stockIn, 15, 6, "=SUM(G5:G14)", {
    ...totalStyle,
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  stockIn.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
  };


  // ---------------- Stock Out ----------------


  stockOut.colWidths = {
    0: 120,
    1: 120,
    2: 220,
    3: 180,
    4: 110,
    5: 130,
    6: 140,
  };


  stockOut.frozenRows = 3;


  setCell(stockOut, 0, 0, "STOCK OUT / স্টক আউট", titleStyle);
  setCell(
    stockOut,
    1,
    0,
    "বিক্রয় বা স্টক আউটের তথ্য এখানে লিখুন। Total Sales স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const stockOutHeaders = [
    "Date / তারিখ",
    "Product ID / পণ্য আইডি",
    "Product Name / পণ্যের নাম",
    "Customer / কাস্টমার",
    "Quantity / পরিমাণ",
    "Sale Price / বিক্রয়মূল্য",
    "Total Sales / মোট বিক্রয়",
  ];


  stockOutHeaders.forEach((header, index) => {
    setCell(stockOut, 2, index, header, headerStyle);
  });


  const stockOutSamples = [
    ["2026-01-10", "P-001", "Rice / চাল", "Walk-in Customer", "20", "95"],
    ["2026-01-15", "P-002", "Sugar / চিনি", "Walk-in Customer", "10", "140"],
    ["2026-01-20", "P-003", "Cooking Oil / সয়াবিন তেল", "Walk-in Customer", "8", "210"],
    ["2026-01-28", "P-004", "Paracetamol / প্যারাসিটামল", "Walk-in Customer", "40", "35"],
    ["2026-02-05", "P-005", "Cough Syrup / কাশির সিরাপ", "Walk-in Customer", "10", "120"],
    ["2026-02-12", "P-006", "Cotton Fabric / সুতি কাপড়", "Retail Customer", "15", "450"],
    ["2026-02-20", "P-007", "T-Shirt / টি-শার্ট", "Retail Customer", "25", "650"],
    ["2026-02-27", "P-008", "Rice Cooker / রাইস কুকার", "Retail Customer", "4", "4200"],
    ["2026-03-05", "P-009", "Mobile Charger / মোবাইল চার্জার", "Retail Customer", "10", "550"],
    ["2026-03-12", "P-010", "Notebook / খাতা", "School Customer", "30", "85"],
  ];


  stockOutSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(stockOut, row, 0, item[0], normalStyle);
    setCell(stockOut, row, 1, item[1], normalStyle);
    setCell(stockOut, row, 2, item[2], normalStyle);
    setCell(stockOut, row, 3, item[3], normalStyle);
    setCell(stockOut, row, 4, item[4], normalStyle);
    setCell(stockOut, row, 5, item[5], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(stockOut, row, 6, `=E${row + 1}*F${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
  });


  setCell(stockOut, 15, 4, "Total / মোট", totalStyle);
  setCell(stockOut, 15, 5, "=SUM(E5:E14)", totalStyle);
  setCell(stockOut, 15, 6, "=SUM(G5:G14)", {
    ...totalStyle,
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  stockOut.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
  };


  // ---------------- Stock Report ----------------


  stockReport.colWidths = {
    0: 110,
    1: 220,
    2: 150,
    3: 120,
    4: 120,
    5: 120,
    6: 130,
    7: 130,
    8: 140,
    9: 140,
    10: 150,
  };


  stockReport.frozenRows = 3;


  setCell(stockReport, 0, 0, "STOCK REPORT / স্টক রিপোর্ট", titleStyle);
  setCell(
    stockReport,
    1,
    0,
    "প্রতিটি পণ্যের প্রারম্ভিক স্টক, স্টক ইন, স্টক আউট, বর্তমান স্টক ও স্টক মূল্য।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const stockReportHeaders = [
    "Product ID / পণ্য আইডি",
    "Product Name / পণ্যের নাম",
    "Category / ক্যাটাগরি",
    "Opening Stock / প্রারম্ভিক স্টক",
    "Stock In / স্টক ইন",
    "Stock Out / স্টক আউট",
    "Current Stock / বর্তমান স্টক",
    "Reorder Level / রি-অর্ডার লেভেল",
    "Stock Status / স্টক অবস্থা",
    "Purchase Price / ক্রয়মূল্য",
    "Stock Value / স্টক মূল্য",
  ];


  stockReportHeaders.forEach((header, index) => {
    setCell(stockReport, 3, index, header, headerStyle);
  });


  const stockReportSamples = [
    ["P-001", "Rice / চাল", "Grocery / মুদি", "100", "50", "20", "20"],
    ["P-002", "Sugar / চিনি", "Grocery / মুদি", "80", "30", "10", "15"],
    ["P-003", "Cooking Oil / সয়াবিন তেল", "Grocery / মুদি", "60", "20", "8", "10"],
    ["P-004", "Paracetamol / প্যারাসিটামল", "Pharmacy / ফার্মেসি", "200", "100", "40", "50"],
    ["P-005", "Cough Syrup / কাশির সিরাপ", "Pharmacy / ফার্মেসি", "50", "25", "10", "15"],
    ["P-006", "Cotton Fabric / সুতি কাপড়", "Fabric / কাপড়", "120", "40", "15", "30"],
    ["P-007", "T-Shirt / টি-শার্ট", "Garments / পোশাক", "100", "50", "25", "25"],
    ["P-008", "Rice Cooker / রাইস কুকার", "Electronics / ইলেকট্রনিক্স", "20", "10", "4", "5"],
    ["P-009", "Mobile Charger / মোবাইল চার্জার", "Electronics / ইলেকট্রনিক্স", "40", "20", "10", "10"],
    ["P-010", "Notebook / খাতা", "Stationery / স্টেশনারি", "150", "80", "30", "30"],
  ];


  stockReportSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(stockReport, row, 0, item[0], normalStyle);
    setCell(stockReport, row, 1, item[1], normalStyle);
    setCell(stockReport, row, 2, item[2], normalStyle);
    setCell(stockReport, row, 3, item[3], normalStyle);
    setCell(stockReport, row, 4, item[4], normalStyle);
    setCell(stockReport, row, 5, item[5], normalStyle);
    setCell(stockReport, row, 6, `=D${row + 1}+E${row + 1}-F${row + 1}`, normalStyle);
    setCell(stockReport, row, 7, item[6], normalStyle);
    setCell(
      stockReport,
      row,
      8,
      `=IF(G${row + 1}<=H${row + 1},"Reorder","OK")`,
      normalStyle
    );
    setCell(stockReport, row, 9, `=Products!E${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(stockReport, row, 10, `=G${row + 1}*J${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });


    setSparkline(stockReport, row, 11, `D${row + 1}:G${row + 1}`, normalStyle);
  });


  stockReport.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
    8: "",
    9: "",
    10: "",
  };


  stockReport.conditionalRules = [
    {
      id: "stock-report-reorder",
      range: "I5:I14",
      condition: "textContains",
      value: "Reorder",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "stock-report-ok",
      range: "I5:I14",
      condition: "textContains",
      value: "OK",
      bg: "#E6F4EA",
      color: "#137333",
    },
    {
      id: "stock-report-zero-stock",
      range: "G5:G14",
      condition: "equal",
      value: "0",
      bg: "#FDE7E9",
      color: "#B42318",
    },
  ];


  // ---------------- Reorder Alert ----------------


  reorderAlert.colWidths = {
    0: 110,
    1: 220,
    2: 140,
    3: 150,
    4: 130,
    5: 160,
  };


  reorderAlert.frozenRows = 3;


  setCell(reorderAlert, 0, 0, "REORDER ALERT / রি-অর্ডার সতর্কতা", titleStyle);
  setCell(
    reorderAlert,
    1,
    0,
    "যে পণ্যের স্টক রি-অর্ডার লেভেলের নিচে, সেগুলোর তালিকা এখানে দেখা যাবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const reorderHeaders = [
    "Product ID / পণ্য আইডি",
    "Product Name / পণ্যের নাম",
    "Current Stock / বর্তমান স্টক",
    "Reorder Level / রি-অর্ডার লেভেল",
    "Shortage / ঘাটতি",
    "Status / অবস্থা",
  ];


  reorderHeaders.forEach((header, index) => {
    setCell(reorderAlert, 2, index, header, headerStyle);
  });


  for (let index = 0; index < 10; index++) {
    const row = 4 + index;
    const reportRow = 5 + index;


    setCell(reorderAlert, row, 0, `=StockReport!A${reportRow}`, normalStyle);
    setCell(reorderAlert, row, 1, `=StockReport!B${reportRow}`, normalStyle);
    setCell(reorderAlert, row, 2, `=StockReport!G${reportRow}`, normalStyle);
    setCell(reorderAlert, row, 3, `=StockReport!H${reportRow}`, normalStyle);
    setCell(reorderAlert, row, 4, `=MAX(0,D${row + 1}-C${row + 1})`, normalStyle);
    setCell(
      reorderAlert,
      row,
      5,
      `=IF(C${row + 1}<=D${row + 1},"Reorder Now","OK")`,
      normalStyle
    );
  }


  reorderAlert.conditionalRules = [
    {
      id: "reorder-alert-now",
      range: "F5:F14",
      condition: "textContains",
      value: "Reorder Now",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "reorder-alert-ok",
      range: "F5:F14",
      condition: "textContains",
      value: "OK",
      bg: "#E6F4EA",
      color: "#137333",
    },
  ];


  // ---------------- Suppliers ----------------


  suppliers.colWidths = {
    0: 120,
    1: 220,
    2: 180,
    3: 150,
    4: 220,
    5: 280,
  };


  setCell(suppliers, 0, 0, "SUPPLIERS / সরবরাহকারী", titleStyle);
  setCell(
    suppliers,
    1,
    0,
    "সরবরাহকারীর তথ্য এখানে সংরক্ষণ করুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const supplierHeaders = [
    "Supplier ID / সরবরাহকারী আইডি",
    "Supplier Name / সরবরাহকারীর নাম",
    "Contact Person / যোগাযোগ ব্যক্তি",
    "Phone / ফোন",
    "Email / ইমেইল",
    "Address / ঠিকানা",
  ];


  supplierHeaders.forEach((header, index) => {
    setCell(suppliers, 3, index, header, headerStyle);
  });


  const supplierSamples = [
    ["S-001", "Supplier A / সরবরাহকারী ক", "Rahim Uddin", "01700000001", "suppliera@example.com", "Dhaka / ঢাকা"],
    ["S-002", "Supplier B / সরবরাহকারী খ", "Karim Ahmed", "01700000002", "supplierb@example.com", "Chattogram / চট্টগ্রাম"],
    ["S-003", "Supplier C / সরবরাহকারী গ", "Selina Akter", "01700000003", "supplierc@example.com", "Dhaka / ঢাকা"],
    ["S-004", "Supplier D / সরবরাহকারী ঘ", "Jamal Hossain", "01700000004", "supplierd@example.com", "Narayanganj / নারায়ণগঞ্জ"],
    ["S-005", "Supplier E / সরবরাহকারী ঙ", "Tanvir Hasan", "01700000005", "suppliere@example.com", "Dhaka / ঢাকা"],
    ["S-006", "Supplier F / সরবরাহকারী চ", "Nusrat Jahan", "01700000006", "supplierf@example.com", "Savar / সাভার"],
  ];


  supplierSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(suppliers, row, 0, item[0], normalStyle);
    setCell(suppliers, row, 1, item[1], normalStyle);
    setCell(suppliers, row, 2, item[2], normalStyle);
    setCell(suppliers, row, 3, item[3], normalStyle);
    setCell(suppliers, row, 4, item[4], normalStyle);
    setCell(suppliers, row, 5, item[5], normalStyle);
  });


  // ---------------- Instructions ----------------


  setCell(instructions, 0, 0, "HOW TO USE / ব্যবহারের নিয়ম", titleStyle);


  const instructionsList = [
    "1. Products sheet-এ পণ্যের নাম, ক্রয়মূল্য, বিক্রয়মূল্য, প্রারম্ভিক স্টক ও রি-অর্ডার লেভেল লিখুন।",
    "২. StockIn sheet-এ কেনা পণ্যের তারিখ, পরিমাণ ও একক মূল্য লিখুন।",
    "৩. StockOut sheet-এ বিক্রয় বা স্টক আউটের তথ্য লিখুন।",
    "৪. StockReport sheet-এ প্রতিটি পণ্যের Stock In ও Stock Out মোট সংখ্যা আপডেট করুন।",
    "৫. Current Stock স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    "৬. Reorder Level-এর নিচে স্টক হলে Stock Status-এ Reorder দেখাবে।",
    "৭. ReorderAlert sheet-এ রি-অর্ডার প্রয়োজন এমন পণ্য দেখুন।",
    "৮. Dashboard-এ মোট স্টক, কম স্টক, স্টক শেষ ও স্টক মূল্য দেখুন।",
    "৯. প্রিন্টের আগে Print Preview ব্যবহার করুন।",
    "১০. নিয়মিত XLSX বা JSON backup সেভ রাখুন।",
  ];


  instructionsList.forEach((text, index) => {
    setCell(instructions, 2 + index, 0, text, {
      ...normalStyle,
      wrap: true,
    });
  });


  // ---------------- Formula Guide ----------------


  setCell(formulaDocs, 0, 0, "FORMULA DOCUMENTATION / ফর্মুলা নির্দেশিকা", titleStyle);


  const formulaDocsList = [
    ["Total Products", "=COUNTIF(Products!A5:A14,\"<>\")", "Products sheet-এ থাকা পণ্যের সংখ্যা।"],
    ["Total Stock In", "=SUM(StockReport!E5:E14)", "সব পণ্যের মোট স্টক ইন।"],
    ["Total Stock Out", "=SUM(StockReport!F5:F14)", "সব পণ্যের মোট স্টক আউট।"],
    ["Current Stock", "=SUM(StockReport!G5:G14)", "সব পণ্যের বর্তমান স্টক।"],
    ["Low Stock Items", "=COUNTIF(StockReport!I5:I14,\"Reorder\")", "রি-অর্ডার প্রয়োজন এমন পণ্যের সংখ্যা।"],
    ["Out of Stock Items", "=COUNTIF(StockReport!G5:G14,0)", "স্টক শেষ পণ্যের সংখ্যা।"],
    ["Total Stock Value", "=SUM(StockReport!K5:K14)", "সব পণ্যের বর্তমান স্টক মূল্য।"],
    ["Current Stock", "=D5+E5-F5", "প্রারম্ভিক স্টক + স্টক ইন - স্টক আউট।"],
    ["Stock Value", "=G5*J5", "বর্তমান স্টক × ক্রয়মূল্য।"],
    ["Stock Status", "=IF(G5<=H5,\"Reorder\",\"OK\")", "স্টক রি-অর্ডার লেভেলের নিচে থাকলে Reorder দেখাবে।"],
    ["Shortage", "=MAX(0,D5-C5)", "রি-অর্ডার লেভেল থেকে বর্তমান স্টক বাদ দিলে ঘাটতি।"],
    ["Reorder Status", "=IF(C5<=D5,\"Reorder Now\",\"OK\")", "রি-অর্ডার প্রয়োজন কি না তা নির্ধারণ করে।"],
  ];


  formulaDocsList.forEach((item, index) => {
    const row = 2 + index;


    setCell(formulaDocs, row, 0, item[0], subHeaderStyle);
    setCell(formulaDocs, row, 1, item[1], normalStyle);
    setCell(formulaDocs, row, 2, item[2], {
      ...normalStyle,
      wrap: true,
    });
  });


  formulaDocs.colWidths = {
    0: 180,
    1: 280,
    2: 340,
  };


  return {
    name: "Inventory & Stock Control",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [
      dashboard,
      products,
      stockIn,
      stockOut,
      stockReport,
      reorderAlert,
      suppliers,
      instructions,
      formulaDocs,
    ],
  };
};

// ---------- 9. Sales & POS System ----------


const buildSalesPosSystem = (): WorkbookSnapshot => {
  const dashboard = createSheet("Dashboard", 45, 12);
  const products = createSheet("Products", 45, 8);
  const customers = createSheet("Customers", 45, 8);
  const sales = createSheet("Sales", 45, 10);
  const salesReport = createSheet("SalesReport", 45, 8);
  const instructions = createSheet("Instructions", 45, 8);
  const formulaDocs = createSheet("FormulaGuide", 45, 8);


  // ---------------- Dashboard ----------------


  dashboard.colWidths = {
    0: 200,
    1: 160,
    2: 160,
    3: 160,
    4: 160,
    5: 160,
    6: 160,
    7: 160,
    8: 160,
    9: 160,
    10: 160,
    11: 160,
  };


  setCell(dashboard, 0, 0, "SALES & POS SYSTEM", titleStyle);
  setCell(
    dashboard,
    1,
    0,
    "বিক্রয় ও পিওএস সিস্টেম — Sales & POS Dashboard",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const kpiHeaders = [
    "Total Sales / মোট বিক্রয়",
    "Total Orders / মোট অর্ডার",
    "Quantity Sold / বিক্রীত পরিমাণ",
    "Average Sale / গড় বিক্রয়",
  ];


  kpiHeaders.forEach((header, index) => {
    setCell(dashboard, 3, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 4, 0, "=SUM(Sales!G5:G24)", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 4, 1, "=COUNTIF(Sales!A5:A24,\"<>\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#106EBE",
  });


  setCell(dashboard, 4, 2, "=SUM(Sales!E5:E24)", {
    ...totalStyle,
    fontSize: 18,
    color: "#7052A3",
  });


  setCell(dashboard, 4, 3, "=IF(COUNTIF(Sales!A5:A24,\"<>\")=0,0,B5/COUNTIF(Sales!A5:A24,\"<>\"))", {
    ...totalStyle,
    fontSize: 18,
    color: "#106EBE",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  const paymentHeaders = [
    "Paid Orders / পরিশোধিত অর্ডার",
    "Pending Payments / বাকি পেমেন্ট",
    "Partial Payments / আংশিক পেমেন্ট",
    "Sales Target Status / টার্গেট অবস্থা",
  ];


  paymentHeaders.forEach((header, index) => {
    setCell(dashboard, 6, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 7, 0, "=COUNTIF(Sales!H5:H24,\"Paid / পরিশোধিত\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
  });


  setCell(dashboard, 7, 1, "=COUNTIF(Sales!H5:H24,\"Pending / বাকি\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
  });


  setCell(dashboard, 7, 2, "=COUNTIF(Sales!H5:H24,\"Partial / আংশিক\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B45309",
  });


  setCell(dashboard, 7, 3, "=COUNTIF(SalesReport!E5:E16,\"Below Target\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
  });


  setCell(dashboard, 9, 0, "Monthly Sales Performance / মাসিক বিক্রয় পারফরম্যান্স", subHeaderStyle);


  const performanceHeaders = [
    "Month / মাস",
    "Target / টার্গেট",
    "Achieved / অর্জন",
    "Difference / পার্থক্য",
    "Performance / অবস্থা",
    "Trend / ট্রেন্ড",
  ];


  performanceHeaders.forEach((header, index) => {
    setCell(dashboard, 10, index, header, headerStyle);
  });


  const months = [
    "January / জানুয়ারি",
    "February / ফেব্রুয়ারি",
    "March / মার্চ",
    "April / এপ্রিল",
    "May / মে",
    "June / জুন",
    "July / জুলাই",
    "August / আগস্ট",
    "September / সেপ্টেম্বর",
    "October / অক্টোবর",
    "November / নভেম্বর",
    "December / ডিসেম্বর",
  ];


  months.forEach((month, index) => {
    const row = 11 + index;


    setCell(dashboard, row, 0, month, normalStyle);
    setCell(dashboard, row, 1, "", {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(dashboard, row, 2, "", {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(dashboard, row, 3, `=C${row + 1}-B${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(
      dashboard,
      row,
      4,
      `=IF(C${row + 1}="","",IF(C${row + 1}>=B${row + 1},"On Target / টার্গেট পূরণ","Below Target / টার্গেটের নিচে"))`,
      normalStyle
    );


    setSparkline(dashboard, row, 5, `B${row + 1}:C${row + 1}`, normalStyle);
  });


  dashboard.conditionalRules = [
    {
      id: "sales-below-target",
      range: "E12:E23",
      condition: "textContains",
      value: "Below Target",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "sales-on-target",
      range: "E12:E23",
      condition: "textContains",
      value: "On Target",
      bg: "#E6F4EA",
      color: "#137333",
    },
  ];


  dashboard.charts = [
    {
      id: "sales-by-product",
      title: "Sales by Product / পণ্য অনুযায়ী বিক্রয়",
      type: "column",
      range: "Sales!G5:G24",
      subtitle: "Total sales amount for each sale entry",
      xAxisTitle: "Sale",
      yAxisTitle: "Amount (BDT)",
      showLegend: true,
      legendPosition: "bottom",
    },
    {
      id: "sales-monthly-trend",
      title: "Monthly Sales / মাসিক বিক্রয়",
      type: "line",
      range: "SalesReport!C5:C16",
      subtitle: "Monthly achieved sales",
      xAxisTitle: "Month",
      yAxisTitle: "Amount (BDT)",
      showLegend: false,
      legendPosition: "none",
    },
  ];


  // ---------------- Products ----------------


  products.colWidths = {
    0: 110,
    1: 220,
    2: 150,
    3: 100,
    4: 140,
    5: 130,
    6: 130,
  };


  products.frozenRows = 3;


  setCell(products, 0, 0, "PRODUCTS / পণ্য তালিকা", titleStyle);
  setCell(
    products,
    1,
    0,
    "বিক্রয়যোগ্য পণ্যের নাম, ক্যাটাগরি, দাম ও স্টক তথ্য লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const productHeaders = [
    "Product ID / পণ্য আইডি",
    "Product Name / পণ্যের নাম",
    "Category / ক্যাটাগরি",
    "Unit / একক",
    "Purchase Price / ক্রয়মূল্য",
    "Sale Price / বিক্রয়মূল্য",
    "Stock / স্টক",
  ];


  productHeaders.forEach((header, index) => {
    setCell(products, 3, index, header, headerStyle);
  });


  const productSamples = [
    ["P-001", "Rice / চাল", "Grocery / মুদি", "Kg", "80", "95", "100"],
    ["P-002", "Sugar / চিনি", "Grocery / মুদি", "Kg", "120", "140", "80"],
    ["P-003", "Cooking Oil / সয়াবিন তেল", "Grocery / মুদি", "Litre", "180", "210", "60"],
    ["P-004", "Paracetamol / প্যারাসিটামল", "Pharmacy / ফার্মেসি", "Strip", "25", "35", "200"],
    ["P-005", "Cough Syrup / কাশির সিরাপ", "Pharmacy / ফার্মেসি", "Bottle", "90", "120", "50"],
    ["P-006", "T-Shirt / টি-শার্ট", "Garments / পোশাক", "Piece", "450", "650", "100"],
    ["P-007", "Notebook / খাতা", "Stationery / স্টেশনারি", "Piece", "60", "85", "150"],
    ["P-008", "Mobile Charger / মোবাইল চার্জার", "Electronics / ইলেকট্রনিক্স", "Piece", "350", "550", "40"],
  ];


  productSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(products, row, 0, item[0], normalStyle);
    setCell(products, row, 1, item[1], normalStyle);
    setCell(products, row, 2, item[2], normalStyle);
    setCell(products, row, 3, item[3], normalStyle);
    setCell(products, row, 4, item[4], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(products, row, 5, item[5], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(products, row, 6, item[6], normalStyle);
  });


  products.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
  };


  // ---------------- Customers ----------------


  customers.colWidths = {
    0: 110,
    1: 200,
    2: 150,
    3: 150,
    4: 220,
    5: 280,
  };


  setCell(customers, 0, 0, "CUSTOMERS / কাস্টমার", titleStyle);
  setCell(
    customers,
    1,
    0,
    "কাস্টমারের তথ্য এখানে সংরক্ষণ করুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const customerHeaders = [
    "Customer ID / কাস্টমার আইডি",
    "Customer Name / কাস্টমারের নাম",
    "Phone / ফোন",
    "Email / ইমেইল",
    "Address / ঠিকানা",
    "Notes / নোট",
  ];


  customerHeaders.forEach((header, index) => {
    setCell(customers, 3, index, header, headerStyle);
  });


  const customerSamples = [
    ["C-001", "Walk-in Customer / সাধারণ কাস্টমার", "", "", "", "General retail customer"],
    ["C-002", "Rahim Uddin", "01700000001", "rahim@example.com", "Dhaka / ঢাকা", "Regular customer"],
    ["C-003", "Karim Ahmed", "01700000002", "karim@example.com", "Chattogram / চট্টগ্রাম", "Wholesale customer"],
    ["C-004", "Selina Akter", "01700000003", "selina@example.com", "Dhaka / ঢাকা", "Online customer"],
  ];


  customerSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(customers, row, 0, item[0], normalStyle);
    setCell(customers, row, 1, item[1], normalStyle);
    setCell(customers, row, 2, item[2], normalStyle);
    setCell(customers, row, 3, item[3], normalStyle);
    setCell(customers, row, 4, item[4], normalStyle);
    setCell(customers, row, 5, item[5], normalStyle);
  });


  // ---------------- Sales ----------------


  sales.colWidths = {
    0: 120,
    1: 130,
    2: 200,
    3: 220,
    4: 110,
    5: 130,
    6: 140,
    7: 170,
  };


  sales.frozenRows = 3;


  setCell(sales, 0, 0, "SALES / বিক্রয়", titleStyle);
  setCell(
    sales,
    1,
    0,
    "প্রতিটি বিক্রয়ের তারিখ, ইনভয়েস, কাস্টমার, পণ্য, পরিমাণ, দাম ও পেমেন্ট স্ট্যাটাস লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const salesHeaders = [
    "Date / তারিখ",
    "Invoice No / ইনভয়েস নম্বর",
    "Customer / কাস্টমার",
    "Product / পণ্য",
    "Quantity / পরিমাণ",
    "Unit Price / একক দাম",
    "Total Amount / মোট টাকা",
    "Payment Status / পেমেন্ট স্ট্যাটাস",
  ];


  salesHeaders.forEach((header, index) => {
    setCell(sales, 3, index, header, headerStyle);
  });


  const salesSamples = [
    ["2026-01-05", "INV-001", "Walk-in Customer / সাধারণ কাস্টমার", "Rice / চাল", "10", "95", "Paid / পরিশোধিত"],
    ["2026-01-08", "INV-002", "Rahim Uddin", "Sugar / চিনি", "5", "140", "Paid / পরিশোধিত"],
    ["2026-01-12", "INV-003", "Karim Ahmed", "Cooking Oil / সয়াবিন তেল", "4", "210", "Pending / বাকি"],
    ["2026-01-18", "INV-004", "Selina Akter", "Paracetamol / প্যারাসিটামল", "10", "35", "Paid / পরিশোধিত"],
    ["2026-01-25", "INV-005", "Walk-in Customer / সাধারণ কাস্টমার", "Cough Syrup / কাশির সিরাপ", "3", "120", "Partial / আংশিক"],
    ["2026-02-02", "INV-006", "Rahim Uddin", "T-Shirt / টি-শার্ট", "2", "650", "Paid / পরিশোধিত"],
    ["2026-02-09", "INV-007", "Karim Ahmed", "Notebook / খাতা", "20", "85", "Paid / পরিশোধিত"],
    ["2026-02-16", "INV-008", "Selina Akter", "Mobile Charger / মোবাইল চার্জার", "3", "550", "Pending / বাকি"],
    ["2026-02-23", "INV-009", "Walk-in Customer / সাধারণ কাস্টমার", "Rice / চাল", "15", "95", "Paid / পরিশোধিত"],
    ["2026-03-01", "INV-010", "Rahim Uddin", "Cooking Oil / সয়াবিন তেল", "6", "210", "Paid / পরিশোধিত"],
    ["2026-03-08", "INV-011", "Karim Ahmed", "T-Shirt / টি-শার্ট", "5", "650", "Partial / আংশিক"],
    ["2026-03-15", "INV-012", "Selina Akter", "Notebook / খাতা", "30", "85", "Paid / পরিশোধিত"],
  ];


  salesSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(sales, row, 0, item[0], normalStyle);
    setCell(sales, row, 1, item[1], normalStyle);
    setCell(sales, row, 2, item[2], normalStyle);
    setCell(sales, row, 3, item[3], normalStyle);
    setCell(sales, row, 4, item[4], normalStyle);
    setCell(sales, row, 5, item[5], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(sales, row, 6, `=E${row + 1}*F${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(sales, row, 7, item[6], normalStyle);
  });


  sales.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
  };


  sales.conditionalRules = [
    {
      id: "sales-paid",
      range: "H5:H24",
      condition: "textContains",
      value: "Paid",
      bg: "#E6F4EA",
      color: "#137333",
    },
    {
      id: "sales-pending",
      range: "H5:H24",
      condition: "textContains",
      value: "Pending",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "sales-partial",
      range: "H5:H24",
      condition: "textContains",
      value: "Partial",
      bg: "#FFF4CE",
      color: "#9C6500",
    },
  ];


  // ---------------- Sales Report ----------------


  salesReport.colWidths = {
    0: 190,
    1: 150,
    2: 150,
    3: 150,
    4: 180,
    5: 150,
  };


  salesReport.frozenRows = 3;


  setCell(salesReport, 0, 0, "SALES REPORT / বিক্রয় রিপোর্ট", titleStyle);
  setCell(
    salesReport,
    1,
    0,
    "প্রতি মাসের বিক্রয় টার্গেট ও অর্জন লিখুন। Dashboard-এ ফলাফল দেখা যাবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const reportHeaders = [
    "Month / মাস",
    "Target / টার্গেট",
    "Achieved / অর্জন",
    "Difference / পার্থক্য",
    "Performance / অবস্থা",
    "Trend / ট্রেন্ড",
  ];


  reportHeaders.forEach((header, index) => {
    setCell(salesReport, 3, index, header, headerStyle);
  });


  months.forEach((month, index) => {
    const row = 4 + index;


    setCell(salesReport, row, 0, month, normalStyle);
    setCell(salesReport, row, 1, "", {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(salesReport, row, 2, "", {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(salesReport, row, 3, `=C${row + 1}-B${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(
      salesReport,
      row,
      4,
      `=IF(C${row + 1}="","",IF(C${row + 1}>=B${row + 1},"On Target / টার্গেট পূরণ","Below Target / টার্গেটের নিচে"))`,
      normalStyle
    );


    setSparkline(salesReport, row, 5, `B${row + 1}:C${row + 1}`, normalStyle);
  });


  salesReport.conditionalRules = [
    {
      id: "sales-report-below-target",
      range: "E5:E16",
      condition: "textContains",
      value: "Below Target",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "sales-report-on-target",
      range: "E5:E16",
      condition: "textContains",
      value: "On Target",
      bg: "#E6F4EA",
      color: "#137333",
    },
  ];


  // ---------------- Instructions ----------------


  setCell(instructions, 0, 0, "HOW TO USE / ব্যবহারের নিয়ম", titleStyle);


  const instructionsList = [
    "1. Products sheet-এ পণ্যের নাম, দাম ও স্টক লিখুন।",
    "২. Customers sheet-এ কাস্টমারের তথ্য লিখুন।",
    "৩. Sales sheet-এ প্রতিটি বিক্রয়ের তথ্য লিখুন।",
    "৪. Quantity ও Unit Price লিখলে Total Amount স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    "৫. Payment Status-এ Paid, Pending বা Partial লিখুন।",
    "৬. Dashboard-এ মোট বিক্রয়, অর্ডার, বিক্রীত পরিমাণ ও বাকি পেমেন্ট দেখুন।",
    "৭. SalesReport sheet-এ মাসিক টার্গেট ও অর্জন লিখুন।",
    "৮. Chart Wizard ব্যবহার করে sales chart তৈরি করুন।",
    "৯. প্রিন্টের আগে Print Preview ব্যবহার করুন।",
    "১০. নিয়মিত XLSX বা JSON backup সেভ রাখুন।",
  ];


  instructionsList.forEach((text, index) => {
    setCell(instructions, 2 + index, 0, text, {
      ...normalStyle,
      wrap: true,
    });
  });


  // ---------------- Formula Guide ----------------


  setCell(formulaDocs, 0, 0, "FORMULA DOCUMENTATION / ফর্মুলা নির্দেশিকা", titleStyle);


  const formulaDocsList = [
    ["Total Sales", "=SUM(Sales!G5:G24)", "Sales sheet-এর সব বিক্রয়ের যোগফল।"],
    ["Total Orders", "=COUNTIF(Sales!A5:A24,\"<>\")", "Sales sheet-এ থাকা অর্ডারের সংখ্যা।"],
    ["Quantity Sold", "=SUM(Sales!E5:E24)", "মোট বিক্রীত পরিমাণ।"],
    ["Average Sale", "=IF(COUNTIF(Sales!A5:A24,\"<>\")=0,0,B5/COUNTIF(Sales!A5:A24,\"<>\"))", "মোট বিক্রয় ÷ মোট অর্ডার।"],
    ["Paid Orders", "=COUNTIF(Sales!H5:H24,\"Paid / পরিশোধিত\")", "পরিশোধিত অর্ডারের সংখ্যা।"],
    ["Pending Payments", "=COUNTIF(Sales!H5:H24,\"Pending / বাকি\")", "বাকি পেমেন্টের অর্ডার সংখ্যা।"],
    ["Partial Payments", "=COUNTIF(Sales!H5:H24,\"Partial / আংশিক\")", "আংশিক পেমেন্টের অর্ডার সংখ্যা।"],
    ["Total Amount", "=E5*F5", "পরিমাণ × একক দাম।"],
    ["Monthly Difference", "=C5-B5", "অর্জন থেকে টার্গেট বাদ দিলে পার্থক্য।"],
    [
      "Performance Status",
      "=IF(C5>=B5,\"On Target\",\"Below Target\")",
      "টার্গেট পূরণ হয়েছে কি না তা নির্ধারণ করে।",
    ],
  ];


  formulaDocsList.forEach((item, index) => {
    const row = 2 + index;


    setCell(formulaDocs, row, 0, item[0], subHeaderStyle);
    setCell(formulaDocs, row, 1, item[1], normalStyle);
    setCell(formulaDocs, row, 2, item[2], {
      ...normalStyle,
      wrap: true,
    });
  });


  formulaDocs.colWidths = {
    0: 180,
    1: 300,
    2: 340,
  };


  return {
    name: "Sales & POS System",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [
      dashboard,
      products,
      customers,
      sales,
      salesReport,
      instructions,
      formulaDocs,
    ],
  };
};

// ---------- 10. HR & Attendance System ----------


const buildHrAttendanceSystem = (): WorkbookSnapshot => {
  const dashboard = createSheet("Dashboard", 45, 12);
  const employees = createSheet("Employees", 45, 10);
  const attendance = createSheet("Attendance", 45, 10);
  const leaveRegister = createSheet("LeaveRegister", 45, 8);
  const overtimeRegister = createSheet("OvertimeRegister", 45, 8);
  const salarySheet = createSheet("SalarySheet", 45, 8);
  const instructions = createSheet("Instructions", 45, 8);
  const formulaDocs = createSheet("FormulaGuide", 45, 8);


  // ---------------- Dashboard ----------------


  dashboard.colWidths = {
    0: 200,
    1: 160,
    2: 160,
    3: 160,
    4: 160,
    5: 160,
    6: 160,
    7: 160,
    8: 160,
    9: 160,
    10: 160,
    11: 160,
  };


  setCell(dashboard, 0, 0, "HR & ATTENDANCE SYSTEM", titleStyle);
  setCell(
    dashboard,
    1,
    0,
    "এইচআর ও উপস্থিতি ব্যবস্থাপনা — HR & Attendance Dashboard",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const kpiHeaders = [
    "Total Employees / মোট কর্মচারী",
    "Present Today / আজ উপস্থিত",
    "Absent Today / আজ অনুপস্থিত",
    "On Leave / ছুটিতে",
  ];


  kpiHeaders.forEach((header, index) => {
    setCell(dashboard, 3, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 4, 0, "=COUNTIF(Employees!A5:A14,\"<>\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#106EBE",
  });


  setCell(dashboard, 4, 1, "=COUNTIF(Attendance!D5:D14,\"Present / উপস্থিত\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
  });


  setCell(dashboard, 4, 2, "=COUNTIF(Attendance!D5:D14,\"Absent / অনুপস্থিত\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
  });


  setCell(dashboard, 4, 3, "=COUNTIF(Attendance!D5:D14,\"Leave / ছুটি\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B45309",
  });


  const payrollHeaders = [
    "Total Overtime / মোট ওভারটাইম",
    "Total Salary / মোট বেতন",
    "Total Advance / মোট অগ্রিম",
    "Pending Leave / অপেক্ষমাণ ছুটি",
  ];


  payrollHeaders.forEach((header, index) => {
    setCell(dashboard, 6, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 7, 0, "=SUM(OvertimeRegister!D5:D14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#7052A3",
  });


  setCell(dashboard, 7, 1, "=SUM(SalarySheet!G5:G14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 7, 2, "=SUM(Employees!I5:I14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#B45309",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 7, 3, "=COUNTIF(LeaveRegister!G5:G14,\"Pending / অপেক্ষমাণ\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
  });


  setCell(dashboard, 9, 0, "Attendance Overview / উপস্থিতি ওভারভিউ", subHeaderStyle);


  const overviewHeaders = [
    "Metric / মেট্রিক",
    "Value / মান",
    "Trend / ট্রেন্ড",
  ];


  overviewHeaders.forEach((header, index) => {
    setCell(dashboard, 10, index, header, headerStyle);
  });


  const overviewRows = [
    ["Total Employees / মোট কর্মচারী", "=COUNTIF(Employees!A5:A14,\"<>\")"],
    ["Present Today / আজ উপস্থিত", "=COUNTIF(Attendance!D5:D14,\"Present / উপস্থিত\")"],
    ["Absent Today / আজ অনুপস্থিত", "=COUNTIF(Attendance!D5:D14,\"Absent / অনুপস্থিত\")"],
    ["On Leave / ছুটিতে", "=COUNTIF(Attendance!D5:D14,\"Leave / ছুটি\")"],
  ];


  overviewRows.forEach((item, index) => {
    const row = 11 + index;


    setCell(dashboard, row, 0, item[0], normalStyle);
    setCell(dashboard, row, 1, item[1], normalStyle);


    setSparkline(dashboard, row, 2, `B${row + 1}:B${row + 1}`, normalStyle);
  });


  dashboard.charts = [
    {
      id: "hr-attendance-status",
      title: "Attendance Status / উপস্থিতির অবস্থা",
      type: "column",
      range: "Dashboard!B12:B14",
      subtitle: "Present, absent and leave count",
      xAxisTitle: "Status",
      yAxisTitle: "Employees",
      showLegend: true,
      legendPosition: "bottom",
    },
    {
      id: "hr-salary-overview",
      title: "Salary Overview / বেতন ওভারভিউ",
      type: "bar",
      range: "SalarySheet!G5:G14",
      subtitle: "Net salary by employee",
      xAxisTitle: "Employee",
      yAxisTitle: "Amount (BDT)",
      showLegend: false,
      legendPosition: "none",
    },
  ];


  // ---------------- Employees ----------------


  employees.colWidths = {
    0: 120,
    1: 200,
    2: 160,
    3: 160,
    4: 130,
    5: 150,
    6: 220,
    7: 140,
    8: 140,
    9: 150,
  };


  employees.frozenRows = 3;


  setCell(employees, 0, 0, "EMPLOYEES / কর্মচারী", titleStyle);
  setCell(
    employees,
    1,
    0,
    "কর্মচারীর তথ্য, বেতন, অগ্রিম ও কর্মস্থল এখানে লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const employeeHeaders = [
    "Employee ID / কর্মচারী আইডি",
    "Employee Name / কর্মচারীর নাম",
    "Department / বিভাগ",
    "Designation / পদবি",
    "Joining Date / যোগদানের তারিখ",
    "Phone / ফোন",
    "Email / ইমেইল",
    "Monthly Salary / মাসিক বেতন",
    "Advance / অগ্রিম",
    "Status / অবস্থা",
  ];


  employeeHeaders.forEach((header, index) => {
    setCell(employees, 3, index, header, headerStyle);
  });


  const employeeSamples = [
    ["E-001", "Rahim Uddin", "Production / উৎপাদন", "Operator / অপারেটর", "2024-01-10", "01700000001", "rahim@example.com", "25000", "0", "Active / সক্রিয়"],
    ["E-002", "Karim Ahmed", "Sales / বিক্রয়", "Sales Officer / বিক্রয় কর্মকর্তা", "2024-02-15", "01700000002", "karim@example.com", "30000", "5000", "Active / সক্রিয়"],
    ["E-003", "Selina Akter", "Accounts / হিসাব", "Accountant / হিসাবরক্ষক", "2023-11-01", "01700000003", "selina@example.com", "35000", "0", "Active / সক্রিয়"],
    ["E-004", "Jamal Hossain", "Production / উৎপাদন", "Supervisor / সুপারভাইজার", "2023-06-20", "01700000004", "jamal@example.com", "40000", "10000", "Active / সক্রিয়"],
    ["E-005", "Nusrat Jahan", "HR / এইচআর", "HR Officer / এইচআর কর্মকর্তা", "2024-03-05", "01700000005", "nusrat@example.com", "32000", "0", "Active / সক্রিয়"],
    ["E-006", "Tanvir Hasan", "IT / আইটি", "Support Engineer / সাপোর্ট ইঞ্জিনিয়ার", "2024-04-01", "01700000006", "tanvir@example.com", "38000", "0", "Active / সক্রিয়"],
    ["E-007", "Mizanur Rahman", "Production / উৎপাদন", "Helper / সহকারী", "2024-05-10", "01700000007", "mizan@example.com", "18000", "3000", "Active / সক্রিয়"],
    ["E-008", "Fatema Begum", "Admin / প্রশাসন", "Office Assistant / অফিস সহকারী", "2024-06-01", "01700000008", "fatema@example.com", "20000", "0", "Active / সক্রিয়"],
    ["E-009", "Sabbir Ahmed", "Sales / বিক্রয়", "Sales Officer / বিক্রয় কর্মকর্তা", "2024-07-15", "01700000009", "sabbir@example.com", "28000", "0", "Active / সক্রিয়"],
    ["E-010", "Ayesha Siddiqua", "Accounts / হিসাব", "Assistant Accountant / সহকারী হিসাবরক্ষক", "2024-08-01", "01700000010", "ayesha@example.com", "26000", "0", "Active / সক্রিয়"],
  ];


  employeeSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(employees, row, 0, item[0], normalStyle);
    setCell(employees, row, 1, item[1], normalStyle);
    setCell(employees, row, 2, item[2], normalStyle);
    setCell(employees, row, 3, item[3], normalStyle);
    setCell(employees, row, 4, item[4], normalStyle);
    setCell(employees, row, 5, item[5], normalStyle);
    setCell(employees, row, 6, item[6], normalStyle);
    setCell(employees, row, 7, item[7], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(employees, row, 8, item[8], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(employees, row, 9, item[9], normalStyle);
  });


  employees.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
    8: "",
    9: "",
  };


  // ---------------- Attendance ----------------


  attendance.colWidths = {
    0: 120,
    1: 200,
    2: 120,
    3: 170,
    4: 110,
    5: 110,
    6: 140,
    7: 140,
    8: 200,
  };


  attendance.frozenRows = 3;


  setCell(attendance, 0, 0, "ATTENDANCE / উপস্থিতি", titleStyle);
  setCell(
    attendance,
    1,
    0,
    "প্রতিদিনের উপস্থিতি, সময় ও ওভারটাইম লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const attendanceHeaders = [
    "Employee ID / কর্মচারী আইডি",
    "Employee Name / কর্মচারীর নাম",
    "Date / তারিখ",
    "Status / অবস্থা",
    "In Time / আসার সময়",
    "Out Time / যাওয়ার সময়",
    "Working Hours / কর্মঘণ্টা",
    "Overtime Hours / ওভারটাইম",
    "Remarks / মন্তব্য",
  ];


  attendanceHeaders.forEach((header, index) => {
    setCell(attendance, 3, index, header, headerStyle);
  });


  const attendanceSamples = [
    ["E-001", "Rahim Uddin", "2026-11-09", "Present / উপস্থিত", "09:00", "18:00", "8", "1", ""],
    ["E-002", "Karim Ahmed", "2026-11-09", "Present / উপস্থিত", "09:00", "18:00", "8", "0", ""],
    ["E-003", "Selina Akter", "2026-11-09", "Present / উপস্থিত", "09:00", "18:00", "8", "2", ""],
    ["E-004", "Jamal Hossain", "2026-11-09", "Leave / ছুটি", "", "", "0", "0", "Approved leave"],
    ["E-005", "Nusrat Jahan", "2026-11-09", "Present / উপস্থিত", "09:00", "18:00", "8", "0", ""],
    ["E-006", "Tanvir Hasan", "2026-11-09", "Present / উপস্থিত", "09:00", "19:00", "9", "1", ""],
    ["E-007", "Mizanur Rahman", "2026-11-09", "Absent / অনুপস্থিত", "", "", "0", "0", ""],
    ["E-008", "Fatema Begum", "2026-11-09", "Present / উপস্থিত", "09:00", "18:00", "8", "0", ""],
    ["E-009", "Sabbir Ahmed", "2026-11-09", "Present / উপস্থিত", "09:00", "18:00", "8", "1", ""],
    ["E-010", "Ayesha Siddiqua", "2026-11-09", "Present / উপস্থিত", "09:00", "18:00", "8", "0", ""],
  ];


  attendanceSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(attendance, row, 0, item[0], normalStyle);
    setCell(attendance, row, 1, item[1], normalStyle);
    setCell(attendance, row, 2, item[2], normalStyle);
    setCell(attendance, row, 3, item[3], normalStyle);
    setCell(attendance, row, 4, item[4], normalStyle);
    setCell(attendance, row, 5, item[5], normalStyle);
    setCell(attendance, row, 6, item[6], normalStyle);
    setCell(attendance, row, 7, item[7], normalStyle);
    setCell(attendance, row, 8, item[8], normalStyle);
  });


  attendance.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
    8: "",
  };


  attendance.conditionalRules = [
    {
      id: "attendance-present",
      range: "D5:D14",
      condition: "textContains",
      value: "Present",
      bg: "#E6F4EA",
      color: "#137333",
    },
    {
      id: "attendance-absent",
      range: "D5:D14",
      condition: "textContains",
      value: "Absent",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "attendance-leave",
      range: "D5:D14",
      condition: "textContains",
      value: "Leave",
      bg: "#FFF4CE",
      color: "#9C6500",
    },
  ];


  // ---------------- Leave Register ----------------


  leaveRegister.colWidths = {
    0: 120,
    1: 200,
    2: 180,
    3: 130,
    4: 130,
    5: 120,
    6: 180,
    7: 220,
  };


  setCell(leaveRegister, 0, 0, "LEAVE REGISTER / ছুটির রেজিস্টার", titleStyle);
  setCell(
    leaveRegister,
    1,
    0,
    "কর্মচারীর ছুটির আবেদন, তারিখ ও অনুমোদনের অবস্থা লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const leaveHeaders = [
    "Employee ID / কর্মচারী আইডি",
    "Employee Name / কর্মচারীর নাম",
    "Leave Type / ছুটির ধরন",
    "Start Date / শুরুর তারিখ",
    "End Date / শেষের তারিখ",
    "Total Days / মোট দিন",
    "Status / অবস্থা",
    "Remarks / মন্তব্য",
  ];


  leaveHeaders.forEach((header, index) => {
    setCell(leaveRegister, 3, index, header, headerStyle);
  });


  const leaveSamples = [
    ["E-004", "Jamal Hossain", "Casual / সাধারণ ছুটি", "2026-11-09", "2026-11-09", "1", "Approved / অনুমোদিত", "Family emergency"],
    ["E-007", "Mizanur Rahman", "Sick / অসুস্থতার ছুটি", "2026-11-10", "2026-11-11", "2", "Pending / অপেক্ষমাণ", "Medical certificate required"],
    ["E-002", "Karim Ahmed", "Earned / উপার্জিত ছুটি", "2026-11-15", "2026-11-16", "2", "Pending / অপেক্ষমাণ", ""],
  ];


  leaveSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(leaveRegister, row, 0, item[0], normalStyle);
    setCell(leaveRegister, row, 1, item[1], normalStyle);
    setCell(leaveRegister, row, 2, item[2], normalStyle);
    setCell(leaveRegister, row, 3, item[3], normalStyle);
    setCell(leaveRegister, row, 4, item[4], normalStyle);
    setCell(leaveRegister, row, 5, item[5], normalStyle);
    setCell(leaveRegister, row, 6, item[6], normalStyle);
    setCell(leaveRegister, row, 7, item[7], normalStyle);
  });


  leaveRegister.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
  };


  leaveRegister.conditionalRules = [
    {
      id: "leave-approved",
      range: "G5:G14",
      condition: "textContains",
      value: "Approved",
      bg: "#E6F4EA",
      color: "#137333",
    },
    {
      id: "leave-pending",
      range: "G5:G14",
      condition: "textContains",
      value: "Pending",
      bg: "#FFF4CE",
      color: "#9C6500",
    },
  ];


  // ---------------- Overtime Register ----------------


  overtimeRegister.colWidths = {
    0: 120,
    1: 200,
    2: 120,
    3: 140,
    4: 140,
    5: 160,
  };


  setCell(overtimeRegister, 0, 0, "OVERTIME REGISTER / ওভারটাইম রেজিস্টার", titleStyle);
  setCell(
    overtimeRegister,
    1,
    0,
    "কর্মচারীর ওভারটাইম ঘণ্টা ও হার লিখুন। Overtime Amount স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const overtimeHeaders = [
    "Employee ID / কর্মচারী আইডি",
    "Employee Name / কর্মচারীর নাম",
    "Date / তারিখ",
    "Overtime Hours / ওভারটাইম ঘণ্টা",
    "Overtime Rate / ওভারটাইম হার",
    "Overtime Amount / ওভারটাইম টাকা",
  ];


  overtimeHeaders.forEach((header, index) => {
    setCell(overtimeRegister, 3, index, header, headerStyle);
  });


  const overtimeSamples = [
    ["E-001", "Rahim Uddin", "2026-11-09", "1", "250"],
    ["E-003", "Selina Akter", "2026-11-09", "2", "300"],
    ["E-006", "Tanvir Hasan", "2026-11-09", "1", "350"],
    ["E-009", "Sabbir Ahmed", "2026-11-09", "1", "280"],
  ];


  overtimeSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(overtimeRegister, row, 0, item[0], normalStyle);
    setCell(overtimeRegister, row, 1, item[1], normalStyle);
    setCell(overtimeRegister, row, 2, item[2], normalStyle);
    setCell(overtimeRegister, row, 3, item[3], normalStyle);
    setCell(overtimeRegister, row, 4, item[4], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(overtimeRegister, row, 5, `=D${row + 1}*E${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
  });


  setCell(overtimeRegister, 15, 3, "Total / মোট", totalStyle);
  setCell(overtimeRegister, 15, 4, "=SUM(D5:D14)", totalStyle);
  setCell(overtimeRegister, 15, 5, "=SUM(F5:F14)", {
    ...totalStyle,
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  // ---------------- Salary Sheet ----------------


  salarySheet.colWidths = {
    0: 120,
    1: 200,
    2: 160,
    3: 140,
    4: 160,
    5: 160,
    6: 150,
  };


  salarySheet.frozenRows = 3;


  setCell(salarySheet, 0, 0, "SALARY SHEET / বেতন শিট", titleStyle);
  setCell(
    salarySheet,
    1,
    0,
    "মূল বেতন, ওভারটাইম ও অগ্রিম কর্তন দিয়ে নিট বেতন স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const salaryHeaders = [
    "Employee ID / কর্মচারী আইডি",
    "Employee Name / কর্মচারীর নাম",
    "Department / বিভাগ",
    "Basic Salary / মূল বেতন",
    "Overtime Amount / ওভারটাইম টাকা",
    "Advance Deduction / অগ্রিম কর্তন",
    "Net Salary / নিট বেতন",
  ];


  salaryHeaders.forEach((header, index) => {
    setCell(salarySheet, 3, index, header, headerStyle);
  });


  const salarySamples = [
    ["E-001", "Rahim Uddin", "Production / উৎপাদন", "25000", "250", "0"],
    ["E-002", "Karim Ahmed", "Sales / বিক্রয়", "30000", "0", "5000"],
    ["E-003", "Selina Akter", "Accounts / হিসাব", "35000", "600", "0"],
    ["E-004", "Jamal Hossain", "Production / উৎপাদন", "40000", "0", "10000"],
    ["E-005", "Nusrat Jahan", "HR / এইচআর", "32000", "0", "0"],
    ["E-006", "Tanvir Hasan", "IT / আইটি", "38000", "350", "0"],
    ["E-007", "Mizanur Rahman", "Production / উৎপাদন", "18000", "0", "3000"],
    ["E-008", "Fatema Begum", "Admin / প্রশাসন", "20000", "0", "0"],
    ["E-009", "Sabbir Ahmed", "Sales / বিক্রয়", "28000", "280", "0"],
    ["E-010", "Ayesha Siddiqua", "Accounts / হিসাব", "26000", "0", "0"],
  ];


  salarySamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(salarySheet, row, 0, item[0], normalStyle);
    setCell(salarySheet, row, 1, item[1], normalStyle);
    setCell(salarySheet, row, 2, item[2], normalStyle);
    setCell(salarySheet, row, 3, item[3], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(salarySheet, row, 4, item[4], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(salarySheet, row, 5, item[5], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(salarySheet, row, 6, `=D${row + 1}+E${row + 1}-F${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
  });


  setCell(salarySheet, 15, 3, "Total / মোট", totalStyle);
  setCell(salarySheet, 15, 4, "=SUM(D5:D14)", {
    ...totalStyle,
    numberFormat: "currency",
    currencyCode: "BDT",
  });
  setCell(salarySheet, 15, 5, "=SUM(E5:E14)", {
    ...totalStyle,
    numberFormat: "currency",
    currencyCode: "BDT",
  });
  setCell(salarySheet, 15, 6, "=SUM(G5:G14)", {
    ...totalStyle,
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  // ---------------- Instructions ----------------


  setCell(instructions, 0, 0, "HOW TO USE / ব্যবহারের নিয়ম", titleStyle);


  const instructionsList = [
    "1. Employees sheet-এ কর্মচারীর তথ্য, বেতন ও অগ্রিম লিখুন।",
    "২. Attendance sheet-এ প্রতিদিনের উপস্থিতি, সময় ও ওভারটাইম লিখুন।",
    "৩. LeaveRegister sheet-এ ছুটির আবেদন ও অনুমোদনের অবস্থা লিখুন।",
    "৪. OvertimeRegister sheet-এ ওভারটাইম ঘণ্টা ও হার লিখুন।",
    "৫. SalarySheet-এ মূল বেতন, ওভারটাইম ও অগ্রিম কর্তন লিখুন।",
    "৬. Net Salary স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    "৭. Dashboard-এ উপস্থিতি, অনুপস্থিতি, ছুটি, ওভারটাইম ও বেতন দেখুন।",
    "৮. প্রিন্টের আগে Print Preview ব্যবহার করুন।",
    "৯. নিয়মিত XLSX বা JSON backup সেভ রাখুন।",
  ];


  instructionsList.forEach((text, index) => {
    setCell(instructions, 2 + index, 0, text, {
      ...normalStyle,
      wrap: true,
    });
  });


  // ---------------- Formula Guide ----------------


  setCell(formulaDocs, 0, 0, "FORMULA DOCUMENTATION / ফর্মুলা নির্দেশিকা", titleStyle);


  const formulaDocsList = [
    ["Total Employees", "=COUNTIF(Employees!A5:A14,\"<>\")", "Employees sheet-এ থাকা কর্মচারীর সংখ্যা।"],
    ["Present Today", "=COUNTIF(Attendance!D5:D14,\"Present / উপস্থিত\")", "আজ উপস্থিত কর্মচারীর সংখ্যা।"],
    ["Absent Today", "=COUNTIF(Attendance!D5:D14,\"Absent / অনুপস্থিত\")", "আজ অনুপস্থিত কর্মচারীর সংখ্যা।"],
    ["On Leave", "=COUNTIF(Attendance!D5:D14,\"Leave / ছুটি\")", "ছুটিতে থাকা কর্মচারীর সংখ্যা।"],
    ["Total Overtime", "=SUM(OvertimeRegister!D5:D14)", "মোট ওভারটাইম ঘণ্টা।"],
    ["Overtime Amount", "=D5*E5", "ওভারটাইম ঘণ্টা × ওভারটাইম হার।"],
    ["Net Salary", "=D5+E5-F5", "মূল বেতন + ওভারটাইম - অগ্রিম কর্তন।"],
    ["Total Salary", "=SUM(SalarySheet!G5:G14)", "সব কর্মচারীর নিট বেতনের যোগফল।"],
    ["Total Advance", "=SUM(Employees!I5:I14)", "সব কর্মচারীর মোট অগ্রিম।"],
    ["Pending Leave", "=COUNTIF(LeaveRegister!G5:G14,\"Pending / অপেক্ষমাণ\")", "অপেক্ষমাণ ছুটির আবেদনের সংখ্যা।"],
  ];


  formulaDocsList.forEach((item, index) => {
    const row = 2 + index;


    setCell(formulaDocs, row, 0, item[0], subHeaderStyle);
    setCell(formulaDocs, row, 1, item[1], normalStyle);
    setCell(formulaDocs, row, 2, item[2], {
      ...normalStyle,
      wrap: true,
    });
  });


  formulaDocs.colWidths = {
    0: 180,
    1: 320,
    2: 340,
  };


  return {
    name: "HR & Attendance System",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [
      dashboard,
      employees,
      attendance,
      leaveRegister,
      overtimeRegister,
      salarySheet,
      instructions,
      formulaDocs,
    ],
  };
};

// ---------- 11. Education Management System ----------


const buildEducationManagementSystem = (): WorkbookSnapshot => {
  const dashboard = createSheet("Dashboard", 45, 12);
  const students = createSheet("Students", 45, 8);
  const subjects = createSheet("Subjects", 45, 8);
  const attendance = createSheet("Attendance", 45, 8);
  const marks = createSheet("Marks", 45, 10);
  const resultSheet = createSheet("ResultSheet", 45, 8);
  const feeRegister = createSheet("FeeRegister", 45, 8);
  const instructions = createSheet("Instructions", 45, 8);
  const formulaDocs = createSheet("FormulaGuide", 45, 8);


  // ---------------- Dashboard ----------------


  dashboard.colWidths = {
    0: 200,
    1: 160,
    2: 160,
    3: 160,
    4: 160,
    5: 160,
    6: 160,
    7: 160,
    8: 160,
    9: 160,
    10: 160,
    11: 160,
  };


  setCell(dashboard, 0, 0, "EDUCATION MANAGEMENT SYSTEM", titleStyle);
  setCell(
    dashboard,
    1,
    0,
    "শিক্ষা ব্যবস্থাপনা ড্যাশবোর্ড — Education Management Dashboard",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const kpiHeaders = [
    "Total Students / মোট শিক্ষার্থী",
    "Present Today / আজ উপস্থিত",
    "Absent Today / আজ অনুপস্থিত",
    "Average Marks / গড় নম্বর",
  ];


  kpiHeaders.forEach((header, index) => {
    setCell(dashboard, 3, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 4, 0, "=COUNTIF(Students!A5:A14,\"<>\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#106EBE",
  });


  setCell(dashboard, 4, 1, "=COUNTIF(Attendance!E5:E14,\"Present / উপস্থিত\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
  });


  setCell(dashboard, 4, 2, "=COUNTIF(Attendance!E5:E14,\"Absent / অনুপস্থিত\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
  });


  setCell(dashboard, 4, 3, "=IF(COUNTIF(Marks!G5:G14,\"<>\")=0,0,SUM(Marks!G5:G14)/COUNTIF(Marks!G5:G14,\"<>\"))", {
    ...totalStyle,
    fontSize: 18,
    color: "#7052A3",
    decimals: 1,
  });


  const resultHeaders = [
    "Pass Students / পাস",
    "Fail Students / ফেল",
    "Total Fees Collected / মোট আদায়",
    "Pending Fees / বাকি ফি",
  ];


  resultHeaders.forEach((header, index) => {
    setCell(dashboard, 6, index, header, {
      ...headerStyle,
      fontSize: 12,
      wrap: true,
    });
  });


  setCell(dashboard, 7, 0, "=COUNTIF(ResultSheet!G5:G14,\"Passed / পাস\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
  });


  setCell(dashboard, 7, 1, "=COUNTIF(ResultSheet!G5:G14,\"Failed / ফেল\")", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
  });


  setCell(dashboard, 7, 2, "=SUM(FeeRegister!E5:E14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#107C41",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 7, 3, "=SUM(FeeRegister!F5:F14)", {
    ...totalStyle,
    fontSize: 18,
    color: "#B42318",
    numberFormat: "currency",
    currencyCode: "BDT",
  });


  setCell(dashboard, 9, 0, "Academic Overview / শিক্ষা ওভারভিউ", subHeaderStyle);


  const overviewHeaders = [
    "Metric / মেট্রিক",
    "Value / মান",
    "Trend / ট্রেন্ড",
  ];


  overviewHeaders.forEach((header, index) => {
    setCell(dashboard, 10, index, header, headerStyle);
  });


  const overviewRows = [
    ["Total Students / মোট শিক্ষার্থী", "=COUNTIF(Students!A5:A14,\"<>\")"],
    ["Present Today / আজ উপস্থিত", "=COUNTIF(Attendance!E5:E14,\"Present / উপস্থিত\")"],
    ["Absent Today / আজ অনুপস্থিত", "=COUNTIF(Attendance!E5:E14,\"Absent / অনুপস্থিত\")"],
    ["Average Marks / গড় নম্বর", "=IF(COUNTIF(Marks!G5:G14,\"<>\")=0,0,SUM(Marks!G5:G14)/COUNTIF(Marks!G5:G14,\"<>\"))"],
  ];


  overviewRows.forEach((item, index) => {
    const row = 11 + index;


    setCell(dashboard, row, 0, item[0], normalStyle);
    setCell(dashboard, row, 1, item[1], normalStyle);


    setSparkline(dashboard, row, 2, `B${row + 1}:B${row + 1}`, normalStyle);
  });


  dashboard.charts = [
    {
      id: "education-attendance",
      title: "Attendance Status / উপস্থিতির অবস্থা",
      type: "column",
      range: "Dashboard!B12:B13",
      subtitle: "Present and absent students",
      xAxisTitle: "Status",
      yAxisTitle: "Students",
      showLegend: true,
      legendPosition: "bottom",
    },
    {
      id: "education-marks",
      title: "Student Marks / শিক্ষার্থীর নম্বর",
      type: "bar",
      range: "Marks!G5:G14",
      subtitle: "Total marks by student",
      xAxisTitle: "Student",
      yAxisTitle: "Marks",
      showLegend: false,
      legendPosition: "none",
    },
  ];


  // ---------------- Students ----------------


  students.colWidths = {
    0: 120,
    1: 200,
    2: 100,
    3: 100,
    4: 100,
    5: 180,
    6: 150,
    7: 150,
  };


  students.frozenRows = 3;


  setCell(students, 0, 0, "STUDENTS / শিক্ষার্থী", titleStyle);
  setCell(
    students,
    1,
    0,
    "শিক্ষার্থীর তথ্য, শ্রেণি, রোল ও অভিভাবকের তথ্য লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const studentHeaders = [
    "Student ID / শিক্ষার্থী আইডি",
    "Student Name / শিক্ষার্থীর নাম",
    "Class / শ্রেণি",
    "Section / শাখা",
    "Roll / রোল",
    "Guardian Name / অভিভাবকের নাম",
    "Phone / ফোন",
    "Status / অবস্থা",
  ];


  studentHeaders.forEach((header, index) => {
    setCell(students, 3, index, header, headerStyle);
  });


  const studentSamples = [
    ["S-001", "Ayesha Rahman", "Class 6", "A", "1", "Md. Rahman", "01700000001", "Active / সক্রিয়"],
    ["S-002", "Rafiul Islam", "Class 6", "A", "2", "Md. Islam", "01700000002", "Active / সক্রিয়"],
    ["S-003", "Nusrat Jahan", "Class 6", "A", "3", "Md. Jahan", "01700000003", "Active / সক্রিয়"],
    ["S-004", "Tanvir Hasan", "Class 6", "A", "4", "Md. Hasan", "01700000004", "Active / সক্রিয়"],
    ["S-005", "Fatema Begum", "Class 6", "A", "5", "Md. Begum", "01700000005", "Active / সক্রিয়"],
    ["S-006", "Sabbir Ahmed", "Class 6", "A", "6", "Md. Ahmed", "01700000006", "Active / সক্রিয়"],
    ["S-007", "Mizanur Rahman", "Class 6", "A", "7", "Md. Rahman", "01700000007", "Active / সক্রিয়"],
    ["S-008", "Ayesha Siddiqua", "Class 6", "A", "8", "Md. Siddiqua", "01700000008", "Active / সক্রিয়"],
    ["S-009", "Rakib Hasan", "Class 6", "A", "9", "Md. Hasan", "01700000009", "Active / সক্রিয়"],
    ["S-010", "Sumaiya Akter", "Class 6", "A", "10", "Md. Akter", "01700000010", "Active / সক্রিয়"],
  ];


  studentSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(students, row, 0, item[0], normalStyle);
    setCell(students, row, 1, item[1], normalStyle);
    setCell(students, row, 2, item[2], normalStyle);
    setCell(students, row, 3, item[3], normalStyle);
    setCell(students, row, 4, item[4], normalStyle);
    setCell(students, row, 5, item[5], normalStyle);
    setCell(students, row, 6, item[6], normalStyle);
    setCell(students, row, 7, item[7], normalStyle);
  });


  students.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
  };


  // ---------------- Subjects ----------------


  subjects.colWidths = {
    0: 120,
    1: 200,
    2: 100,
    3: 180,
    4: 120,
    5: 120,
  };


  setCell(subjects, 0, 0, "SUBJECTS / বিষয়", titleStyle);
  setCell(
    subjects,
    1,
    0,
    "বিষয়, শিক্ষক, পূর্ণ নম্বর ও পাস নম্বর লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const subjectHeaders = [
    "Subject Code / বিষয় কোড",
    "Subject Name / বিষয়ের নাম",
    "Class / শ্রেণি",
    "Teacher / শিক্ষক",
    "Full Marks / পূর্ণ নম্বর",
    "Pass Marks / পাস নম্বর",
  ];


  subjectHeaders.forEach((header, index) => {
    setCell(subjects, 3, index, header, headerStyle);
  });


  const subjectSamples = [
    ["SUB-001", "Bangla / বাংলা", "Class 6", "Mr. Karim", "100", "33"],
    ["SUB-002", "English / ইংরেজি", "Class 6", "Ms. Selina", "100", "33"],
    ["SUB-003", "Mathematics / গণিত", "Class 6", "Mr. Rahim", "100", "33"],
    ["SUB-004", "Science / বিজ্ঞান", "Class 6", "Ms. Nusrat", "100", "33"],
  ];


  subjectSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(subjects, row, 0, item[0], normalStyle);
    setCell(subjects, row, 1, item[1], normalStyle);
    setCell(subjects, row, 2, item[2], normalStyle);
    setCell(subjects, row, 3, item[3], normalStyle);
    setCell(subjects, row, 4, item[4], normalStyle);
    setCell(subjects, row, 5, item[5], normalStyle);
  });


  // ---------------- Attendance ----------------


  attendance.colWidths = {
    0: 120,
    1: 120,
    2: 200,
    3: 100,
    4: 170,
    5: 200,
  };


  attendance.frozenRows = 3;


  setCell(attendance, 0, 0, "ATTENDANCE / উপস্থিতি", titleStyle);
  setCell(
    attendance,
    1,
    0,
    "শিক্ষার্থীর দৈনিক উপস্থিতি লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const attendanceHeaders = [
    "Date / তারিখ",
    "Student ID / শিক্ষার্থী আইডি",
    "Student Name / শিক্ষার্থীর নাম",
    "Class / শ্রেণি",
    "Status / অবস্থা",
    "Remarks / মন্তব্য",
  ];


  attendanceHeaders.forEach((header, index) => {
    setCell(attendance, 3, index, header, headerStyle);
  });


  const attendanceSamples = [
    ["2026-11-09", "S-001", "Ayesha Rahman", "Class 6", "Present / উপস্থিত", ""],
    ["2026-11-09", "S-002", "Rafiul Islam", "Class 6", "Present / উপস্থিত", ""],
    ["2026-11-09", "S-003", "Nusrat Jahan", "Class 6", "Absent / অনুপস্থিত", ""],
    ["2026-11-09", "S-004", "Tanvir Hasan", "Class 6", "Present / উপস্থিত", ""],
    ["2026-11-09", "S-005", "Fatema Begum", "Class 6", "Late / দেরিতে", ""],
    ["2026-11-09", "S-006", "Sabbir Ahmed", "Class 6", "Present / উপস্থিত", ""],
    ["2026-11-09", "S-007", "Mizanur Rahman", "Class 6", "Leave / ছুটি", ""],
    ["2026-11-09", "S-008", "Ayesha Siddiqua", "Class 6", "Present / উপস্থিত", ""],
    ["2026-11-09", "S-009", "Rakib Hasan", "Class 6", "Absent / অনুপস্থিত", ""],
    ["2026-11-09", "S-010", "Sumaiya Akter", "Class 6", "Present / উপস্থিত", ""],
  ];


  attendanceSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(attendance, row, 0, item[0], normalStyle);
    setCell(attendance, row, 1, item[1], normalStyle);
    setCell(attendance, row, 2, item[2], normalStyle);
    setCell(attendance, row, 3, item[3], normalStyle);
    setCell(attendance, row, 4, item[4], normalStyle);
    setCell(attendance, row, 5, item[5], normalStyle);
  });


  attendance.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
  };


  attendance.conditionalRules = [
    {
      id: "attendance-present",
      range: "E5:E14",
      condition: "textContains",
      value: "Present",
      bg: "#E6F4EA",
      color: "#137333",
    },
    {
      id: "attendance-absent",
      range: "E5:E14",
      condition: "textContains",
      value: "Absent",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "attendance-late",
      range: "E5:E14",
      condition: "textContains",
      value: "Late",
      bg: "#FFF4CE",
      color: "#9C6500",
    },
  ];


  // ---------------- Marks ----------------


  marks.colWidths = {
    0: 120,
    1: 200,
    2: 180,
    3: 110,
    4: 110,
    5: 110,
    6: 120,
    7: 130,
  };


  marks.frozenRows = 3;


  setCell(marks, 0, 0, "MARKS / নম্বর", titleStyle);
  setCell(
    marks,
    1,
    0,
    "শিক্ষার্থীর ক্লাস টেস্ট, মধ্যবর্তী ও চূড়ান্ত পরীক্ষার নম্বর লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const marksHeaders = [
    "Student ID / শিক্ষার্থী আইডি",
    "Student Name / শিক্ষার্থীর নাম",
    "Subject / বিষয়",
    "Class Test / ক্লাস টেস্ট",
    "Mid Term / মধ্যবর্তী",
    "Final Exam / চূড়ান্ত পরীক্ষা",
    "Total Marks / মোট নম্বর",
    "Grade / গ্রেড",
  ];


  marksHeaders.forEach((header, index) => {
    setCell(marks, 3, index, header, headerStyle);
  });


  const marksSamples = [
    ["S-001", "Ayesha Rahman", "Bangla / বাংলা", "18", "28", "45"],
    ["S-002", "Rafiul Islam", "Bangla / বাংলা", "15", "25", "40"],
    ["S-003", "Nusrat Jahan", "Bangla / বাংলা", "20", "30", "48"],
    ["S-004", "Tanvir Hasan", "Bangla / বাংলা", "12", "22", "35"],
    ["S-005", "Fatema Begum", "Bangla / বাংলা", "17", "27", "44"],
    ["S-006", "Sabbir Ahmed", "Bangla / বাংলা", "19", "29", "46"],
    ["S-007", "Mizanur Rahman", "Bangla / বাংলা", "10", "20", "30"],
    ["S-008", "Ayesha Siddiqua", "Bangla / বাংলা", "16", "26", "42"],
    ["S-009", "Rakib Hasan", "Bangla / বাংলা", "14", "24", "38"],
    ["S-010", "Sumaiya Akter", "Bangla / বাংলা", "18", "28", "47"],
  ];


  marksSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(marks, row, 0, item[0], normalStyle);
    setCell(marks, row, 1, item[1], normalStyle);
    setCell(marks, row, 2, item[2], normalStyle);
    setCell(marks, row, 3, item[3], normalStyle);
    setCell(marks, row, 4, item[4], normalStyle);
    setCell(marks, row, 5, item[5], normalStyle);
    setCell(marks, row, 6, `=D${row + 1}+E${row + 1}+F${row + 1}`, normalStyle);
    setCell(
      marks,
      row,
      7,
      `=IF(G${row + 1}>=80,"A+ / এ+",IF(G${row + 1}>=70,"A / এ",IF(G${row + 1}>=60,"A- / এ-",IF(G${row + 1}>=50,"B / বি",IF(G${row + 1}>=40,"C / সি","F / ফ")))))`,
      normalStyle
    );
  });


  marks.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
  };


  marks.conditionalRules = [
    {
      id: "marks-excellent",
      range: "G5:G14",
      condition: "greaterOrEqual",
      value: "80",
      bg: "#E6F4EA",
      color: "#137333",
    },
    {
      id: "marks-fail",
      range: "G5:G14",
      condition: "less",
      value: "40",
      bg: "#FDE7E9",
      color: "#B42318",
    },
  ];


  // ---------------- Result Sheet ----------------


  resultSheet.colWidths = {
    0: 120,
    1: 200,
    2: 100,
    3: 130,
    4: 140,
    5: 130,
    6: 160,
  };


  resultSheet.frozenRows = 3;


  setCell(resultSheet, 0, 0, "RESULT SHEET / ফলাফল শিট", titleStyle);
  setCell(
    resultSheet,
    1,
    0,
    "শিক্ষার্থীর মোট নম্বর, গড় নম্বর, গ্রেড ও ফলাফল দেখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const resultSheetHeaders = [
  "Student ID / শিক্ষার্থী আইডি",
  "Student Name / শিক্ষার্থীর নাম",
  "Class / শ্রেণি",
  "Total Marks / মোট নম্বর",
  "Average Marks / গড় নম্বর",
  "Grade / গ্রেড",
  "Result / ফলাফল",
];


  resultSheetHeaders.forEach((header, index) => {
  setCell(resultSheet, 3, index, header, headerStyle);
});


  for (let index = 0; index < 10; index++) {
    const row = 4 + index;
    const marksRow = 5 + index;


    setCell(resultSheet, row, 0, `=Marks!A${marksRow}`, normalStyle);
    setCell(resultSheet, row, 1, `=Marks!B${marksRow}`, normalStyle);
    setCell(resultSheet, row, 2, "Class 6", normalStyle);
    setCell(resultSheet, row, 3, `=Marks!G${marksRow}`, normalStyle);
    setCell(resultSheet, row, 4, `=D${row + 1}/3`, normalStyle);
    setCell(
      resultSheet,
      row,
      5,
      `=IF(E${row + 1}>=80,"A+ / এ+",IF(E${row + 1}>=70,"A / এ",IF(E${row + 1}>=60,"A- / এ-",IF(E${row + 1}>=50,"B / বি",IF(E${row + 1}>=40,"C / সি","F / ফ")))))`,
      normalStyle
    );
    setCell(
      resultSheet,
      row,
      6,
      `=IF(E${row + 1}>=40,"Passed / পাস","Failed / ফেল")`,
      normalStyle
    );
  }


  resultSheet.conditionalRules = [
    {
      id: "result-passed",
      range: "G5:G14",
      condition: "textContains",
      value: "Passed",
      bg: "#E6F4EA",
      color: "#137333",
    },
    {
      id: "result-failed",
      range: "G5:G14",
      condition: "textContains",
      value: "Failed",
      bg: "#FDE7E9",
      color: "#B42318",
    },
  ];


  // ---------------- Fee Register ----------------


  feeRegister.colWidths = {
    0: 120,
    1: 200,
    2: 100,
    3: 130,
    4: 130,
    5: 130,
    6: 170,
  };


  feeRegister.frozenRows = 3;


  setCell(feeRegister, 0, 0, "FEE REGISTER / ফি রেজিস্টার", titleStyle);
  setCell(
    feeRegister,
    1,
    0,
    "শিক্ষার্থীর মোট ফি, পরিশোধিত ফি ও বাকি ফি লিখুন।",
    {
      italic: true,
      color: "#605E5C",
    }
  );


  const feeHeaders = [
    "Student ID / শিক্ষার্থী আইডি",
    "Student Name / শিক্ষার্থীর নাম",
    "Class / শ্রেণি",
    "Total Fee / মোট ফি",
    "Paid Amount / পরিশোধিত",
    "Due Amount / বাকি",
    "Payment Status / পেমেন্ট স্ট্যাটাস",
  ];


  feeHeaders.forEach((header, index) => {
    setCell(feeRegister, 3, index, header, headerStyle);
  });


  const feeSamples = [
    ["S-001", "Ayesha Rahman", "Class 6", "5000", "5000"],
    ["S-002", "Rafiul Islam", "Class 6", "5000", "3000"],
    ["S-003", "Nusrat Jahan", "Class 6", "5000", "0"],
    ["S-004", "Tanvir Hasan", "Class 6", "5000", "5000"],
    ["S-005", "Fatema Begum", "Class 6", "5000", "2500"],
    ["S-006", "Sabbir Ahmed", "Class 6", "5000", "5000"],
    ["S-007", "Mizanur Rahman", "Class 6", "5000", "0"],
    ["S-008", "Ayesha Siddiqua", "Class 6", "5000", "4000"],
    ["S-009", "Rakib Hasan", "Class 6", "5000", "5000"],
    ["S-010", "Sumaiya Akter", "Class 6", "5000", "2000"],
  ];


  feeSamples.forEach((item, index) => {
    const row = 4 + index;


    setCell(feeRegister, row, 0, item[0], normalStyle);
    setCell(feeRegister, row, 1, item[1], normalStyle);
    setCell(feeRegister, row, 2, item[2], normalStyle);
    setCell(feeRegister, row, 3, item[3], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(feeRegister, row, 4, item[4], {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(feeRegister, row, 5, `=D${row + 1}-E${row + 1}`, {
      ...normalStyle,
      numberFormat: "currency",
      currencyCode: "BDT",
    });
    setCell(
      feeRegister,
      row,
      6,
      `=IF(F${row + 1}=0,"Paid / পরিশোধিত",IF(E${row + 1}=0,"Unpaid / বাকি","Partial / আংশিক"))`,
      normalStyle
    );
  });


  feeRegister.filters = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
  };


  feeRegister.conditionalRules = [
    {
      id: "fee-paid",
      range: "G5:G14",
      condition: "textContains",
      value: "Paid",
      bg: "#E6F4EA",
      color: "#137333",
    },
    {
      id: "fee-unpaid",
      range: "G5:G14",
      condition: "textContains",
      value: "Unpaid",
      bg: "#FDE7E9",
      color: "#B42318",
    },
    {
      id: "fee-partial",
      range: "G5:G14",
      condition: "textContains",
      value: "Partial",
      bg: "#FFF4CE",
      color: "#9C6500",
    },
  ];


  // ---------------- Instructions ----------------


  setCell(instructions, 0, 0, "HOW TO USE / ব্যবহারের নিয়ম", titleStyle);


  const instructionsList = [
    "1. Students sheet-এ শিক্ষার্থীর তথ্য লিখুন।",
    "২. Subjects sheet-এ বিষয়, শিক্ষক ও নম্বর বিভাজন লিখুন।",
    "৩. Attendance sheet-এ দৈনিক উপস্থিতি লিখুন।",
    "৪. Marks sheet-এ ক্লাস টেস্ট, মধ্যবর্তী ও চূড়ান্ত পরীক্ষার নম্বর লিখুন।",
    "৫. Total Marks ও Grade স্বয়ংক্রিয়ভাবে হিসাব হবে।",
    "৬. ResultSheet-এ ফলাফল দেখুন।",
    "৭. FeeRegister sheet-এ ফি ও পরিশোধ লিখুন।",
    "৮. Dashboard-এ উপস্থিতি, ফলাফল ও ফি সংক্রান্ত তথ্য দেখুন।",
    "৯. প্রিন্টের আগে Print Preview ব্যবহার করুন।",
    "১০. নিয়মিত XLSX বা JSON backup সেভ রাখুন।",
  ];


  instructionsList.forEach((text, index) => {
    setCell(instructions, 2 + index, 0, text, {
      ...normalStyle,
      wrap: true,
    });
  });


  // ---------------- Formula Guide ----------------


  setCell(formulaDocs, 0, 0, "FORMULA DOCUMENTATION / ফর্মুলা নির্দেশিকা", titleStyle);


  const formulaDocsList = [
    ["Total Students", "=COUNTIF(Students!A5:A14,\"<>\")", "Students sheet-এ থাকা শিক্ষার্থীর সংখ্যা।"],
    ["Present Today", "=COUNTIF(Attendance!E5:E14,\"Present / উপস্থিত\")", "আজ উপস্থিত শিক্ষার্থীর সংখ্যা।"],
    ["Absent Today", "=COUNTIF(Attendance!E5:E14,\"Absent / অনুপস্থিত\")", "আজ অনুপস্থিত শিক্ষার্থীর সংখ্যা।"],
    ["Total Marks", "=D5+E5+F5", "ক্লাস টেস্ট + মধ্যবর্তী + চূড়ান্ত পরীক্ষা।"],
    ["Average Marks", "=D5/3", "মোট নম্বর ÷ ৩।"],
    ["Grade", "=IF(E5>=80,\"A+\",\"F\")", "গড় নম্বর অনুযায়ী গ্রেড নির্ধারণ।"],
    ["Result", "=IF(E5>=40,\"Passed\",\"Failed\")", "পাস নম্বর অনুযায়ী ফলাফল।"],
    ["Due Amount", "=D5-E5", "মোট ফি থেকে পরিশোধিত ফি বাদ।"],
    ["Payment Status", "=IF(F5=0,\"Paid\",\"Unpaid\")", "ফি পরিশোধের অবস্থা।"],
    ["Total Fees Collected", "=SUM(FeeRegister!E5:E14)", "মোট আদায়কৃত ফি।"],
    ["Pending Fees", "=SUM(FeeRegister!F5:F14)", "মোট বাকি ফি।"],
  ];


  formulaDocsList.forEach((item, index) => {
    const row = 2 + index;


    setCell(formulaDocs, row, 0, item[0], subHeaderStyle);
    setCell(formulaDocs, row, 1, item[1], normalStyle);
    setCell(formulaDocs, row, 2, item[2], {
      ...normalStyle,
      wrap: true,
    });
  });


  formulaDocs.colWidths = {
    0: 180,
    1: 320,
    2: 340,
  };


  return {
    name: "Education Management System",
    pageSize: "A4",
    orientation: "landscape",
    activeSheetIndex: 0,
    sheets: [
      dashboard,
      students,
      subjects,
      attendance,
      marks,
      resultSheet,
      feeRegister,
      instructions,
      formulaDocs,
    ],
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
  {
    id: "tpl-company-dashboard",
    name: "Company Dashboard",
    category: "Business",
    description:
      "Track company income, expenses, profit, monthly targets, charts and performance.",
    snapshot: buildCompanyDashboard(),
  },
  {
    id: "tpl-inventory-stock-control",
    name: "Inventory & Stock Control",
    category: "Business",
    description:
      "Track products, stock in, stock out, current stock, reorder alerts, suppliers and stock value.",
    snapshot: buildInventoryStockControl(),
  },
  {
  id: "tpl-sales-pos-system",
  name: "Sales & POS System",
  category: "Business",
  description:
    "Track products, customers, sales, invoices, payments, monthly targets and sales performance.",
  snapshot: buildSalesPosSystem(),
},

{
  id: "tpl-hr-attendance-system",
  name: "HR & Attendance System",
  category: "HR",
  description:
    "Track employees, attendance, leave, overtime, salary, advance and HR performance.",
  snapshot: buildHrAttendanceSystem(),
},
{
  id: "tpl-education-management-system",
  name: "Education Management System",
  category: "Education",
  description:
    "Track students, subjects, attendance, marks, results, fees and academic performance.",
  snapshot: buildEducationManagementSystem(),
},

];