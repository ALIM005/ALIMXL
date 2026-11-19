/**
 * ALIMXL — Production Dynamic Array Spill Engine
 *
 * Excel-like dynamic array spill infrastructure.
 *
 * A formula result can be:
 * - Scalar
 * - Rectangular 2D array
 *
 * For an array result:
 * - The top-left cell is the spill anchor.
 * - Remaining values spill down and right.
 * - The anchor contains the formula.
 * - Other spill cells contain values only.
 * - Existing non-empty cells cannot be overwritten.
 * - Blocked ranges produce #SPILL!.
 * - Spill ranges are tracked for recalculation and cleanup.
 *
 * This module does not evaluate formulas. The host application supplies
 * workbook access callbacks.
 */

export const SPILL_ERROR = "#SPILL!";
export const SPILL_CALC_ERROR = "#CALC!";
export const SPILL_CIRCULAR_ERROR = "#CIRCULAR!";

export const MAX_SPILL_ROWS = 1_048_576;
export const MAX_SPILL_COLS = 16_384;
export const MAX_SPILL_CELLS = 1_000_000;

const EMPTY_VALUE = "";

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function createSpillError(code, details = {}) {
    return {
        ok: false,
        error: SPILL_ERROR,
        code,
        details,
    };
}

export function createArrayResult(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return null;
    }

    const firstRow = rows[0];

    if (!Array.isArray(firstRow) || firstRow.length === 0) {
        return null;
    }

    const rowCount = rows.length;
    const colCount = firstRow.length;

    if (
        rowCount > MAX_SPILL_ROWS ||
        colCount > MAX_SPILL_COLS ||
        rowCount * colCount > MAX_SPILL_CELLS
    ) {
        return null;
    }

    const values = new Array(rowCount);

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const row = rows[rowIndex];

        if (!Array.isArray(row) || row.length !== colCount) {
            return null;
        }

        values[rowIndex] = row.slice();
    }

    return {
        kind: "array",
        rows: rowCount,
        cols: colCount,
        values,
    };
}

export function createScalarResult(value) {
    return {
        kind: "scalar",
        value,
    };
}

export function isArrayResult(result) {
    return Boolean(
        result &&
        result.kind === "array" &&
        Array.isArray(result.values) &&
        Number.isInteger(result.rows) &&
        Number.isInteger(result.cols) &&
        result.rows > 0 &&
        result.cols > 0 &&
        result.values.length === result.rows &&
        result.values.every(
            (row) => Array.isArray(row) && row.length === result.cols
        )
    );
}

export function normalizeResult(result) {
    if (!result) {
        return createScalarResult(EMPTY_VALUE);
    }

    if (result.kind === "scalar") {
        return result;
    }

    if (!isArrayResult(result)) {
        return createScalarResult(SPILL_CALC_ERROR);
    }

    if (result.rows === 1 && result.cols === 1) {
        return createScalarResult(result.values[0][0]);
    }

    return result;
}

export function computeSpillRange(anchor, arrayResult) {
    if (
        !isPlainObject(anchor) ||
        !isArrayResult(arrayResult)
    ) {
        return null;
    }

    const {
        sheetId,
        row,
        col,
    } = anchor;

    if (
        typeof sheetId !== "string" ||
        !sheetId ||
        !Number.isInteger(row) ||
        !Number.isInteger(col) ||
        row < 0 ||
        col < 0
    ) {
        return null;
    }

    const startRow = row;
    const startCol = col;
    const endRow = startRow + arrayResult.rows - 1;
    const endCol = startCol + arrayResult.cols - 1;

    if (
        endRow >= MAX_SPILL_ROWS ||
        endCol >= MAX_SPILL_COLS
    ) {
        return null;
    }

    const cellCount = arrayResult.rows * arrayResult.cols;

    if (cellCount > MAX_SPILL_CELLS) {
        return null;
    }

    return Object.freeze({
        sheetId,
        anchorRow: startRow,
        anchorCol: startCol,
        startRow,
        startCol,
        endRow,
        endCol,
        rows: arrayResult.rows,
        cols: arrayResult.cols,
        cellCount,
    });
}

export function spillRangesOverlap(rangeA, rangeB) {
    if (!rangeA || !rangeB) {
        return false;
    }

    if (rangeA.sheetId !== rangeB.sheetId) {
        return false;
    }

    return (
        rangeA.startRow <= rangeB.endRow &&
        rangeA.endRow >= rangeB.startRow &&
        rangeA.startCol <= rangeB.endCol &&
        rangeA.endCol >= rangeB.startCol
    );
}

export function validateSpillTarget(spillRange, host, options = {}) {
    if (!spillRange || !host) {
        return createSpillError("SPILL_INVALID_ARGUMENTS");
    }

    const {
        sheetId,
        anchorRow,
        anchorCol,
        startRow,
        startCol,
        endRow,
        endCol,
    } = spillRange;

    const ignoreCells = options.ignoreCells || new Set();
    const blockedCells = [];

    for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
            if (row === anchorRow && col === anchorCol) {
                continue;
            }

            const key = host.cellKey(row, col);
            const ignoreKey = `${sheetId}!${row}:${col}`;

            if (ignoreCells.has(ignoreKey)) {
                continue;
            }

            if (!host.isCellEditable(sheetId, key)) {
                blockedCells.push({ row, col, key, reason: "locked" });
                continue;
            }

            if (host.isCellMerged && host.isCellMerged(sheetId, key)) {
                blockedCells.push({ row, col, key, reason: "merged" });
                continue;
            }

            if (!host.isCellEmptyForSpill(sheetId, key)) {
                blockedCells.push({ row, col, key, reason: "occupied" });
            }
        }
    }

    if (blockedCells.length > 0) {
        return createSpillError("SPILL_RANGE_BLOCKED", {
            blockedCells,
        });
    }

    return {
        ok: true,
        error: null,
        code: null,
        details: null,
    };
}

function collectExistingValues(spillRange, host) {
    const values = new Map();

    const {
        sheetId,
        startRow,
        startCol,
        endRow,
        endCol,
    } = spillRange;

    for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
            const key = host.cellKey(row, col);
            const mapKey = `${sheetId}!${row}:${col}`;
            values.set(mapKey, host.getCell(sheetId, key));
        }
    }

    return values;
}

export function writeSpill(anchor, arrayResult, host, options = {}) {
    if (!isPlainObject(anchor) || !isArrayResult(arrayResult) || !host) {
        return createSpillError("SPILL_INVALID_ARGUMENTS");
    }

    const spillRange = computeSpillRange(anchor, arrayResult);

    if (!spillRange) {
        return createSpillError("SPILL_RANGE_INVALID");
    }

    const oldSpill = host.getSpillByAnchor(
        anchor.sheetId,
        anchor.row,
        anchor.col
    );

    const oldSpillCells = new Set();

    if (oldSpill) {
        for (let row = oldSpill.startRow; row <= oldSpill.endRow; row += 1) {
            for (let col = oldSpill.startCol; col <= oldSpill.endCol; col += 1) {
                oldSpillCells.add(`${oldSpill.sheetId}!${row}:${col}`);
            }
        }
    }

    const validation = validateSpillTarget(spillRange, host, {
        ignoreCells: oldSpillCells,
    });

    if (!validation.ok) {
        return validation;
    }

    const changedCells = [];
    const previousValues = new Map();

    if (oldSpill) {
        const captured = collectExistingValues(oldSpill, host);

        for (const [mapKey, value] of captured.entries()) {
            previousValues.set(mapKey, value);
        }
    }

    const {
        sheetId,
        startRow,
        startCol,
        endRow,
        endCol,
    } = spillRange;

    for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
            const key = host.cellKey(row, col);
            const mapKey = `${sheetId}!${row}:${col}`;

            if (!previousValues.has(mapKey)) {
                previousValues.set(mapKey, host.getCell(sheetId, key));
            }
        }
    }

    if (oldSpill) {
        for (let row = oldSpill.startRow; row <= oldSpill.endRow; row += 1) {
            for (let col = oldSpill.startCol; col <= oldSpill.endCol; col += 1) {
                const isInsideNewRange =
                    row >= startRow &&
                    row <= endRow &&
                    col >= startCol &&
                    col <= endCol;

                if (isInsideNewRange) {
                    continue;
                }

                const key = host.cellKey(row, col);
                const mapKey = `${sheetId}!${row}:${col}`;

                host.clearCellValue(sheetId, key);

                changedCells.push({
                    sheetId,
                    row,
                    col,
                    key,
                    previousValue: previousValues.get(mapKey) ?? EMPTY_VALUE,
                    newValue: EMPTY_VALUE,
                    changeType: "cleared",
                });
            }
        }

        host.unregisterSpill(
            oldSpill.sheetId,
            oldSpill.anchorRow,
            oldSpill.anchorCol
        );
    }

    for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
            const key = host.cellKey(row, col);
            const mapKey = `${sheetId}!${row}:${col}`;
             // Preserve the anchor formula; write only spill children.
            if (row === anchor.row && col === anchor.col) {
                continue;
            }

            const value = arrayResult.values[row - startRow][col - startCol];

            host.setCellValue(sheetId, key, value);

            changedCells.push({
                sheetId,
                row,
                col,
                key,
                previousValue: previousValues.get(mapKey) ?? EMPTY_VALUE,
                newValue: value,
                changeType: "written",
            });
        }
    }

    host.registerSpill(spillRange);

    if (
        host.spillDependencyManager &&
        typeof host.spillDependencyManager.registerSpill === "function"
    ) {
        host.spillDependencyManager.registerSpill(
            spillRange,
            changedCells,
            host
        );
    }

    if (typeof host.notifySpillChanged === "function") {
        host.notifySpillChanged(changedCells);
    }

    return {
        ok: true,
        error: null,
        code: null,
        details: null,
        spillRange,
        changedCells,
    };
}

export function clearSpill(spillRange, host, options = {}) {
    if (!spillRange || !host) {
        return false;
    }

    const {
        sheetId,
        anchorRow,
        anchorCol,
        startRow,
        startCol,
        endRow,
        endCol,
    } = spillRange;

    const changedCells = [];

    for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
            if (row === anchorRow && col === anchorCol) {
                continue;
            }

            const key = host.cellKey(row, col);
            const previousValue = host.getCell(sheetId, key);

            host.clearCellValue(sheetId, key);

            changedCells.push({
                sheetId,
                row,
                col,
                key,
                previousValue,
                newValue: EMPTY_VALUE,
                changeType: "cleared",
            });
        }
    }

    host.unregisterSpill(sheetId, anchorRow, anchorCol);

    if (
        host.spillDependencyManager &&
        typeof host.spillDependencyManager.unregisterSpill === "function"
    ) {
        host.spillDependencyManager.unregisterSpill(
            sheetId,
            anchorRow,
            anchorCol,
            changedCells,
            host
        );
    }

    if (typeof host.notifySpillChanged === "function") {
        host.notifySpillChanged(changedCells);
    }

    return true;
}

export function clearSpillByAnchor(sheetId, row, col, host) {
    if (!host) {
        return false;
    }

    const spill = host.getSpillByAnchor(sheetId, row, col);

    if (!spill) {
        return false;
    }

    return clearSpill(spill, host);
}

export function isCellInSpillRange(spillRange, sheetId, row, col) {
    if (!spillRange) {
        return false;
    }

    return (
        spillRange.sheetId === sheetId &&
        row >= spillRange.startRow &&
        row <= spillRange.endRow &&
        col >= spillRange.startCol &&
        col <= spillRange.endCol
    );
}

export function isSpillAnchor(spillRange, sheetId, row, col) {
    if (!spillRange) {
        return false;
    }

    return (
        spillRange.sheetId === sheetId &&
        spillRange.anchorRow === row &&
        spillRange.anchorCol === col
    );
}

export function findSpillByCell(spillRegistry, sheetId, row, col) {
    if (!spillRegistry || typeof spillRegistry.getByCell !== "function") {
        return null;
    }

    return spillRegistry.getByCell(sheetId, row, col);
}

export function findSpillByAnchor(spillRegistry, sheetId, row, col) {
    if (!spillRegistry || typeof spillRegistry.getByAnchor !== "function") {
        return null;
    }

    return spillRegistry.getByAnchor(sheetId, row, col);
}

export function createSpillRegistry() {
    const anchors = new Map();
    const cells = new Map();

    const buildAnchorKey = (sheetId, row, col) =>
        `${sheetId}!${row}:${col}`;

    const buildCellKey = (sheetId, row, col) =>
        `${sheetId}!${row}:${col}`;

    return {
        anchors,
        cells,

        register(spillRange) {
            if (!spillRange) {
                return;
            }

            const anchorKey = buildAnchorKey(
                spillRange.sheetId,
                spillRange.anchorRow,
                spillRange.anchorCol
            );

            const existing = anchors.get(anchorKey);

            if (existing && existing !== spillRange) {
                this.unregister(
                    existing.sheetId,
                    existing.anchorRow,
                    existing.anchorCol
                );
            }

            anchors.set(anchorKey, spillRange);

            for (
                let row = spillRange.startRow;
                row <= spillRange.endRow;
                row += 1
            ) {
                for (
                    let col = spillRange.startCol;
                    col <= spillRange.endCol;
                    col += 1
                ) {
                    cells.set(
                        buildCellKey(spillRange.sheetId, row, col),
                        spillRange
                    );
                }
            }
        },

        unregister(sheetId, anchorRow, anchorCol) {
            const anchorKey = buildAnchorKey(sheetId, anchorRow, anchorCol);
            const spill = anchors.get(anchorKey);

            if (!spill) {
                return;
            }

            for (
                let row = spill.startRow;
                row <= spill.endRow;
                row += 1
            ) {
                for (
                    let col = spill.startCol;
                    col <= spill.endCol;
                    col += 1
                ) {
                    const cellKey = buildCellKey(sheetId, row, col);

                    if (cells.get(cellKey) === spill) {
                        cells.delete(cellKey);
                    }
                }
            }

            anchors.delete(anchorKey);
        },

        getByAnchor(sheetId, anchorRow, anchorCol) {
            return (
                anchors.get(buildAnchorKey(sheetId, anchorRow, anchorCol)) || null
            );
        },

        getByCell(sheetId, row, col) {
            return cells.get(buildCellKey(sheetId, row, col)) || null;
        },

        getAll() {
            return Array.from(anchors.values());
        },

        clear() {
            anchors.clear();
            cells.clear();
        },
    };
}

export function createSpillHost(workbook, options = {}) {
    if (!workbook || !Array.isArray(workbook.sheets)) {
        throw new Error("SPILL_HOST_INVALID");
    }

    if (typeof workbook.cellKey !== "function") {
        throw new Error("SPILL_HOST_CELL_KEY_INVALID");
    }

    const registry =
        options.spillRegistry ||
        createSpillRegistry();

    const sheetIndex = new Map(
        workbook.sheets.map((sheet) => [sheet.id, sheet])
    );

    const getSheet = (sheetId) => sheetIndex.get(sheetId) || null;

    const getCellRecord = (sheetId, key) => {
        const sheet = getSheet(sheetId);

        if (!sheet) {
            return null;
        }

        return sheet.cells?.[key] || null;
    };

    const isEmptyValue = (value) =>
        value === EMPTY_VALUE ||
        value === null ||
        value === undefined;

    const hasFormula = (value) =>
        typeof value === "string" &&
        value.length > 1 &&
        value.startsWith("=");

    const host = {
        workbook,
        spillRegistry: registry,
        spillDependencyManager: options.spillDependencyManager || null,

        cellKey: workbook.cellKey,

        getCell(sheetId, key) {
            const cell = getCellRecord(sheetId, key);

            return cell?.value ?? EMPTY_VALUE;
        },

               setCellValue(sheetId, key, value) {
            const sheet = getSheet(sheetId);

            if (!sheet) {
                return false;
            }

            if (!sheet.cells) {
                sheet.cells = {};
            }

            if (!sheet.cells[key]) {
                sheet.cells[key] = {};
            }

            sheet.cells[key].value =
                value === null || value === undefined
                    ? ""
                    : typeof value === "boolean"
                        ? (value ? "TRUE" : "FALSE")
                        : String(value);

            return true;
        },
        

        clearCellValue(sheetId, key) {
            const cell = getCellRecord(sheetId, key);

            if (!cell) {
                return false;
            }

            cell.value = EMPTY_VALUE;

            return true;
        },

        isCellEditable(sheetId, key) {
            const cell = getCellRecord(sheetId, key);

            if (!cell) {
                return true;
            }

            return cell.locked !== true;
        },

        isCellMerged(sheetId, key) {
            const cell = getCellRecord(sheetId, key);

            return Boolean(cell?.merged);
        },

        isCellEmpty(sheetId, key) {
            const cell = getCellRecord(sheetId, key);

            if (!cell) {
                return true;
            }

            return isEmptyValue(cell.value);
        },

        isCellEmptyForSpill(sheetId, key) {
            const cell = getCellRecord(sheetId, key);

            if (!cell) {
                return true;
            }

            if (hasFormula(cell.value)) {
                return false;
            }

            return isEmptyValue(cell.value);
        },

        registerSpill(spillRange) {
            registry.register(spillRange);
        },

        unregisterSpill(sheetId, anchorRow, anchorCol) {
            registry.unregister(sheetId, anchorRow, anchorCol);
        },

        getSpillByAnchor(sheetId, anchorRow, anchorCol) {
            return registry.getByAnchor(sheetId, anchorRow, anchorCol);
        },

        getSpillByCell(sheetId, row, col) {
            return registry.getByCell(sheetId, row, col);
        },

        notifySpillChanged(changedCells) {
            if (
                typeof options.onSpillChanged === "function" &&
                Array.isArray(changedCells) &&
                changedCells.length > 0
            ) {
                options.onSpillChanged(changedCells);
            }
        },
    };

    return Object.freeze(host);
}