/**
 * ALIMXL — Production Dynamic Array Functions
 *
 * Excel-like dynamic array functions that return 2D array results
 * compatible with lib/spill-engine.mjs.
 *
 * Supported functions:
 * - SEQUENCE
 * - TRANSPOSE
 * - TEXTSPLIT
 * - FILTER
 * - SORT
 * - UNIQUE
 *
 * All functions return:
 * - An array result for spill
 * - A scalar result when appropriate
 * - An Excel-style error string for invalid input
 */

import {
    createArrayResult,
    createScalarResult,
    isArrayResult,
} from "./spill-engine.mjs";
import { EXTRA_SPILL_NAMES, evaluateExtraSpill } from "./extra-functions.mjs";

export const MAX_ARRAY_ROWS = 1_048_576;
export const MAX_ARRAY_COLS = 16_384;
export const MAX_ARRAY_CELLS = 1_000_000;

const EMPTY_TEXT = "";
const DEFAULT_IF_EMPTY = "#CALC!";

const FORMULA_ERRORS = new Set([
    "#NULL!",
    "#DIV/0!",
    "#VALUE!",
    "#REF!",
    "#NAME?",
    "#NUM!",
    "#N/A",
    "#SPILL!",
    "#CALC!",
    "#CIRCULAR!",
    "#ERROR!",
]);

function toText(value) {
    if (value === null || value === undefined) {
        return EMPTY_TEXT;
    }

    if (typeof value === "boolean") {
        return value ? "TRUE" : "FALSE";
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : "#NUM!";
    }

    if (typeof value === "object") {
        return EMPTY_TEXT;
    }

    return String(value);
}

function toNumber(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }

    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    if (trimmed === EMPTY_TEXT) {
        return 0;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : null;
}

function isFormulaError(value) {
    return typeof value === "string" && FORMULA_ERRORS.has(value);
}

function normalizeGrid(grid) {
    const rows = Array.isArray(grid)
        ? grid
        : grid?.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
        return null;
    }

    const firstRow = rows[0];

    if (!Array.isArray(firstRow) || firstRow.length === 0) {
        return null;
    }

    const colCount = firstRow.length;

    for (const row of rows) {
        if (!Array.isArray(row) || row.length !== colCount) {
            return null;
        }
    }

    return rows.map((row) => row.slice());
}

function createValueError(error) {
    return error;
}

function exceedsLimits(rowCount, colCount) {
    return (
        rowCount > MAX_ARRAY_ROWS ||
        colCount > MAX_ARRAY_COLS ||
        rowCount * colCount > MAX_ARRAY_CELLS
    );
}

function toBoolean(value, fallback = false) {
    if (typeof value === "boolean") {
        return value;
    }

    const numeric = toNumber(value);

    return numeric === null ? fallback : numeric !== 0;
}

function toInteger(value, fallback = NaN) {
    const numeric = toNumber(value);

    if (numeric === null) {
        return fallback;
    }

    return Math.trunc(numeric);
}

export function sequence(rows, columns = 1, start = 1, step = 1) {
    if (isFormulaError(rows)) {
        return createValueError(rows);
    }

    if (isFormulaError(columns)) {
        return createValueError(columns);
    }

    if (isFormulaError(start)) {
        return createValueError(start);
    }

    if (isFormulaError(step)) {
        return createValueError(step);
    }

    const rowCount = toInteger(rows, NaN);
    const colCount = toInteger(columns, 1);
    const startValue = toNumber(start) ?? 0;
    const stepValue = toNumber(step) ?? 1;

    if (
        !Number.isFinite(rowCount) ||
        !Number.isFinite(colCount) ||
        !Number.isFinite(startValue) ||
        !Number.isFinite(stepValue)
    ) {
        return "#VALUE!";
    }

    if (rowCount < 1 || colCount < 1) {
        return "#VALUE!";
    }

    if (exceedsLimits(rowCount, colCount)) {
        return "#NUM!";
    }

    const output = new Array(rowCount);
    let currentValue = startValue;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const row = new Array(colCount);

        for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
            row[colIndex] = currentValue;
            currentValue += stepValue;
        }

        output[rowIndex] = row;
    }

    return createArrayResult(output);
}

export function transpose(grid) {
    const rows = normalizeGrid(grid);

    if (!rows) {
        return "#VALUE!";
    }

    const rowCount = rows.length;
    const colCount = rows[0].length;

    if (exceedsLimits(colCount, rowCount)) {
        return "#NUM!";
    }

    const output = new Array(colCount);

    for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
        const row = new Array(rowCount);

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
            row[rowIndex] = rows[rowIndex][colIndex];
        }

        output[colIndex] = row;
    }

    return createArrayResult(output);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitByDelimiter(value, delimiter, caseInsensitive) {
    if (delimiter === EMPTY_TEXT) {
        return [value];
    }

    const flags = caseInsensitive ? "gi" : "g";
    const pattern = new RegExp(escapeRegExp(delimiter), flags);

    return value.split(pattern);
}

export function textSplit(
    text,
    colDelimiter,
    rowDelimiter = EMPTY_TEXT,
    ignoreEmpty = false,
    matchMode = 0,
    padWith = "#N/A"
) {
    if (isFormulaError(text)) {
        return createValueError(text);
    }

    if (isFormulaError(colDelimiter)) {
        return createValueError(colDelimiter);
    }

    if (isFormulaError(rowDelimiter)) {
        return createValueError(rowDelimiter);
    }

    const textValue = toText(text);
    const colDelimiterValue = toText(colDelimiter);
    const rowDelimiterValue = toText(rowDelimiter);

    if (
        colDelimiterValue === EMPTY_TEXT &&
        rowDelimiterValue === EMPTY_TEXT
    ) {
        return "#VALUE!";
    }

    const ignoreEmptyValue = toBoolean(ignoreEmpty, false);
    const matchModeValue = toInteger(matchMode, 0);

    if (matchModeValue !== 0 && matchModeValue !== 1) {
        return "#VALUE!";
    }

    const caseInsensitive = matchModeValue === 1;

    let rows = splitByDelimiter(
        textValue,
        rowDelimiterValue,
        caseInsensitive
    ).map((rowText) =>
        splitByDelimiter(rowText, colDelimiterValue, caseInsensitive)
    );

    if (ignoreEmptyValue) {
        rows = rows
            .map((row) => row.filter((value) => value !== EMPTY_TEXT))
            .filter((row) => row.length > 0);
    }

    if (rows.length === 0) {
        return "#CALC!";
    }

    const width = Math.max(
        ...rows.map((row) => row.length)
    );

    if (exceedsLimits(rows.length, width)) {
        return "#NUM!";
    }

    const output = rows.map((row) => {
        if (row.length === width) {
            return row;
        }

        return [
            ...row,
            ...Array.from(
                { length: width - row.length },
                () => padWith
            ),
        ];
    });

    return createArrayResult(output);
}

function isTruthy(value) {
    if (isFormulaError(value)) {
        return false;
    }

    if (typeof value === "boolean") {
        return value;
    }

    const numeric = toNumber(value);

    return numeric !== null && numeric !== 0;
}

export function filter(grid, include, ifEmpty = DEFAULT_IF_EMPTY) {
    const rows = normalizeGrid(grid);

    if (!rows) {
        return "#VALUE!";
    }


    const rowCount = rows.length;
    const colCount = rows[0].length;

    const includeGrid = normalizeGrid(include);

    if (!includeGrid) {
        return "#VALUE!";
    }

    const includeRowCount = includeGrid.length;
    const includeColCount = includeGrid[0].length;

    const matchesRows =
        includeColCount === 1 && includeRowCount === rowCount;

    const matchesColumns =
        includeRowCount === 1 && includeColCount === colCount;

    const matchesFullGrid =
        includeRowCount === rowCount && includeColCount === colCount;

    if (!matchesRows && !matchesColumns && !matchesFullGrid) {
        return "#VALUE!";
    }

    const filteredRows = [];

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        let shouldIncludeRow = false;

        if (matchesRows) {
            shouldIncludeRow = isTruthy(includeGrid[rowIndex][0]);
        } else if (matchesColumns) {
            shouldIncludeRow = isTruthy(includeGrid[0][rowIndex]);
        } else {
            shouldIncludeRow = isTruthy(includeGrid[rowIndex][0]);
        }

        if (shouldIncludeRow) {
            filteredRows.push(rows[rowIndex].slice());
        }
    }

    if (filteredRows.length === 0) {
        return createScalarResult(ifEmpty);
    }

    return createArrayResult(filteredRows);
}

function compareValues(a, b, order) {
    const aError = isFormulaError(a);
    const bError = isFormulaError(b);

    if (aError && bError) {
        return 0;
    }

    if (aError) {
        return 1;
    }

    if (bError) {
        return -1;
    }

    const aNumber = toNumber(a);
    const bNumber = toNumber(b);

    let result;

    if (aNumber !== null && bNumber !== null) {
        result = aNumber - bNumber;
    } else if (aNumber !== null) {
        result = -1;
    } else if (bNumber !== null) {
        result = 1;
    } else {
        const aText = toText(a).toLowerCase();
        const bText = toText(b).toLowerCase();

        result = aText.localeCompare(bText, undefined, {
            sensitivity: "variant",
            numeric: true,
        });
    }

    if (result === 0) {
        return 0;
    }

    return order === -1 ? -result : result;
}

export function sort(
    grid,
    sortIndex = 1,
    sortOrder = 1,
    byCol = false
) {
    const rows = normalizeGrid(grid);

    if (!rows) {
        return "#VALUE!";
    }

    const index = toInteger(sortIndex, 1);
    const order = toInteger(sortOrder, 1);
    const byColumn = toBoolean(byCol, false);

    if (index < 1) {
        return "#VALUE!";
    }

    if (order !== 1 && order !== -1) {
        return "#VALUE!";
    }

    const rowCount = rows.length;
    const colCount = rows[0].length;

    if (exceedsLimits(rowCount, colCount)) {
        return "#NUM!";
    }

    if (byColumn) {
        if (index > rowCount) {
            return "#VALUE!";
        }

        const columns = [];

        for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
            columns.push(rows.map((row) => row[colIndex]));
        }

        columns.sort((a, b) =>
            compareValues(a[index - 1], b[index - 1], order)
        );

        const output = [];

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
            const row = [];

            for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
                row.push(columns[colIndex][rowIndex]);
            }

            output.push(row);
        }

        return createArrayResult(output);
    }

    if (index > colCount) {
        return "#VALUE!";
    }

    const sortedRows = rows
        .map((row) => row.slice())
        .sort((a, b) =>
            compareValues(a[index - 1], b[index - 1], order)
        );

    return createArrayResult(sortedRows);
}

function createDeepKey(value) {
    if (value === null) {
        return "null";
    }

    if (value === undefined) {
        return "undefined";
    }

    if (typeof value === "number") {
        if (Number.isNaN(value)) {
            return "number:NaN";
        }

        if (Object.is(value, -0)) {
            return "number:-0";
        }

        return `number:${value}`;
    }

    if (typeof value === "boolean") {
        return `boolean:${value}`;
    }

    if (typeof value === "string") {
        return `string:${JSON.stringify(value)}`;
    }

    if (Array.isArray(value)) {
        return `array:[${value.map(createDeepKey).join(",")}]`;
    }

    if (typeof value === "object") {
        const entries = Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(
                ([key, item]) =>
                    `${JSON.stringify(key)}:${createDeepKey(item)}`
            );

        return `object:{${entries.join(",")}}`;
    }

    return `unsupported:${String(value)}`;
}

export function unique(grid, byCol = false, exactlyOnce = false) {
    const rows = normalizeGrid(grid);

    if (!rows) {
        return "#VALUE!";
    }

    const byColumn = toBoolean(byCol, false);
    const onlyOnce = toBoolean(exactlyOnce, false);

    const rowCount = rows.length;
    const colCount = rows[0].length;

    if (exceedsLimits(rowCount, colCount)) {
        return "#NUM!";
    }

    const items = byColumn
        ? rows[0].map((_, colIndex) =>
            rows.map((row) => row[colIndex])
        )
        : rows;

    const counts = new Map();
    const order = [];

    for (const item of items) {
        const key = createDeepKey(item);

        if (!counts.has(key)) {
            counts.set(key, 0);
            order.push(item);
        }

        counts.set(key, counts.get(key) + 1);
    }

    const output = onlyOnce
        ? order.filter(
            (item) => counts.get(createDeepKey(item)) === 1
        )
        : order;

    if (output.length === 0) {
        return "#CALC!";
    }

    if (byColumn) {
        return createArrayResult([output]);
    }

    return createArrayResult(output);
}

export function evaluateSpillFunction(
    functionName,
    args,
    context
) {
    if (!Array.isArray(args) || !context) {
        return "#VALUE!";
    }

    const {
        getGrid,
        getValue,
        getArrayOrExpression,
    } = context;

    const hasArg = (index) =>
        index < args.length &&
        args[index] !== undefined &&
        args[index] !== null;

    switch (functionName) {
        case "SEQUENCE": {
            if (!hasArg(0)) {
                return "#VALUE!";
            }

            return sequence(
                getValue(args[0]),
                hasArg(1) ? getValue(args[1]) : 1,
                hasArg(2) ? getValue(args[2]) : 1,
                hasArg(3) ? getValue(args[3]) : 1
            );
        }

        case "TRANSPOSE": {
            if (!hasArg(0)) {
                return "#VALUE!";
            }

            return transpose(getGrid(args[0]));
        }

        case "TEXTSPLIT": {
            if (!hasArg(0) || !hasArg(1)) {
                return "#VALUE!";
            }

            return textSplit(
                getValue(args[0]),
                getValue(args[1]),
                hasArg(2) ? getValue(args[2]) : EMPTY_TEXT,
                hasArg(3) ? getValue(args[3]) : false,
                hasArg(4) ? getValue(args[4]) : 0,
                hasArg(5) ? getValue(args[5]) : "#N/A"
            );
        }

        case "FILTER": {
            if (!hasArg(0) || !hasArg(1)) {
                return "#VALUE!";
            }

            if (typeof getArrayOrExpression !== "function") {
                return "#VALUE!";
            }

            return filter(
                getGrid(args[0]),
                getArrayOrExpression(args[1]),
                hasArg(2) ? getValue(args[2]) : DEFAULT_IF_EMPTY
            );
        }

        case "SORT": {
            if (!hasArg(0)) {
                return "#VALUE!";
            }

            return sort(
                getGrid(args[0]),
                hasArg(1) ? getValue(args[1]) : 1,
                hasArg(2) ? getValue(args[2]) : 1,
                hasArg(3) ? getValue(args[3]) : false
            );
        }

        case "UNIQUE": {
            if (!hasArg(0)) {
                return "#VALUE!";
            }

            return unique(
                getGrid(args[0]),
                hasArg(1) ? getValue(args[1]) : false,
                hasArg(2) ? getValue(args[2]) : false
            );
        }

        default:
            return evaluateExtraSpill(functionName, args, context);
    }
}

export function getSpillFunctionNames() {
    return [
        "SEQUENCE",
        "TRANSPOSE",
        "TEXTSPLIT",
        "FILTER",
        "SORT",
        "UNIQUE",
        ...EXTRA_SPILL_NAMES,
    ];
}

export function isSpillFunction(functionName) {
    return getSpillFunctionNames().includes(functionName);
}

export function toScalarResult(result) {
    if (!result) {
        return createScalarResult(EMPTY_TEXT);
    }

    if (result.kind === "scalar") {
        return result;
    }

    if (!isArrayResult(result)) {
        return createScalarResult(EMPTY_TEXT);
    }

    if (result.rows === 1 && result.cols === 1) {
        return createScalarResult(result.values[0][0]);
    }

    return result;
}