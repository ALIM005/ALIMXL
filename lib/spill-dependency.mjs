/**
 * ALIMXL — Production Dynamic Array Spill Dependency Engine
 *
 * Tracks:
 * - Spill anchors and spill ranges
 * - Cells owned by spills
 * - Formula dependencies
 * - Transitive dependents
 * - Topological recalculation order
 * - Circular dependencies
 * - Pending recalculations
 * - Undo/redo-ready cell changes
 *
 * This module does not evaluate formulas. It provides dependency and
 * recalculation infrastructure for the spill engine.
 */

export const SPILL_DEPENDENCY_VERSION = "spill-dependency-3";

const MAX_DEPENDENCY_NODES = 1_000_000;
const MAX_UNDO_BATCHES = 200;

export function createCellKey(sheetId, row, col) {
    if (
        typeof sheetId !== "string" ||
        !sheetId ||
        !Number.isInteger(row) ||
        !Number.isInteger(col)
    ) {
        throw new Error("SPILL_DEPENDENCY_INVALID_CELL_KEY");
    }

    return `${encodeURIComponent(sheetId)}!${row}:${col}`;
}

export function parseCellKey(key) {
    if (typeof key !== "string") {
        return null;
    }

    const match = /^([^!]+)!(-?\d+):(-?\d+)$/.exec(key);

    if (!match) {
        return null;
    }

    let sheetId;

    try {
        sheetId = decodeURIComponent(match[1]);
    } catch {
        return null;
    }

    const row = Number(match[2]);
    const col = Number(match[3]);

    if (!Number.isInteger(row) || !Number.isInteger(col)) {
        return null;
    }

    return {
        sheetId,
        row,
        col,
    };
}

function isValidSpillRange(spillRange) {
    return Boolean(
        spillRange &&
        typeof spillRange.sheetId === "string" &&
        Number.isInteger(spillRange.anchorRow) &&
        Number.isInteger(spillRange.anchorCol) &&
        Number.isInteger(spillRange.startRow) &&
        Number.isInteger(spillRange.startCol) &&
        Number.isInteger(spillRange.endRow) &&
        Number.isInteger(spillRange.endCol) &&
        spillRange.startRow <= spillRange.endRow &&
        spillRange.startCol <= spillRange.endCol
    );
}

function createSpillKey(sheetId, anchorRow, anchorCol) {
    return createCellKey(sheetId, anchorRow, anchorCol);
}

export function createSpillDependencyGraph() {
    const spillAnchors = new Map();
    const spillCells = new Map();

    const dependents = new Map();
    const precedents = new Map();

    const dirtyCells = new Set();
    const evaluating = new Set();
    const cyclicCells = new Set();

    const addEdge = (dependentKey, sourceKey) => {
        if (dependentKey === sourceKey) {
            cyclicCells.add(dependentKey);
        }

        if (!dependents.has(sourceKey)) {
            dependents.set(sourceKey, new Set());
        }

        if (!precedents.has(dependentKey)) {
            precedents.set(dependentKey, new Set());
        }

        dependents.get(sourceKey).add(dependentKey);
        precedents.get(dependentKey).add(sourceKey);
    };

    const removeDependentEverywhere = (dependentKey) => {
        const sources = precedents.get(dependentKey);

        if (!sources) {
            return;
        }

        for (const sourceKey of sources) {
            const dependentSet = dependents.get(sourceKey);

            if (!dependentSet) {
                continue;
            }

            dependentSet.delete(dependentKey);

            if (dependentSet.size === 0) {
                dependents.delete(sourceKey);
            }
        }

        precedents.delete(dependentKey);
        dirtyCells.delete(dependentKey);
        cyclicCells.delete(dependentKey);
    };

    const collectTransitiveDependents = (sourceKey, visited) => {
        const directDependents = dependents.get(sourceKey);

        if (!directDependents) {
            return;
        }

        for (const dependentKey of directDependents) {
            if (visited.has(dependentKey)) {
                continue;
            }

            visited.add(dependentKey);
            collectTransitiveDependents(dependentKey, visited);
        }
    };

    const graph = {
        spillAnchors,
        spillCells,
        dependents,
        precedents,
        dirtyCells,
        cyclicCells,

        registerSpill(spillRange) {
            if (!isValidSpillRange(spillRange)) {
                throw new Error("SPILL_DEPENDENCY_INVALID_SPILL_RANGE");
            }

            const anchorKey = createSpillKey(
                spillRange.sheetId,
                spillRange.anchorRow,
                spillRange.anchorCol
            );

            const existing = spillAnchors.get(anchorKey);

            if (existing && existing !== spillRange) {
                graph.unregisterSpill(
                    existing.sheetId,
                    existing.anchorRow,
                    existing.anchorCol
                );
            }

            spillAnchors.set(anchorKey, spillRange);

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
                    spillCells.set(
                        createCellKey(spillRange.sheetId, row, col),
                        spillRange
                    );
                }
            }
        },

        unregisterSpill(sheetId, anchorRow, anchorCol) {
            const anchorKey = createSpillKey(
                sheetId,
                anchorRow,
                anchorCol
            );

            const spillRange = spillAnchors.get(anchorKey);

            if (!spillRange) {
                return;
            }

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
                    const cellKey = createCellKey(sheetId, row, col);

                    if (spillCells.get(cellKey) === spillRange) {
                        spillCells.delete(cellKey);
                    }
                }
            }

            spillAnchors.delete(anchorKey);
        },

        getSpillByAnchor(sheetId, row, col) {
            return (
                spillAnchors.get(createSpillKey(sheetId, row, col)) || null
            );
        },

        getSpillByCell(sheetId, row, col) {
            return (
                spillCells.get(createCellKey(sheetId, row, col)) || null
            );
        },

        addDependency(
            dependentSheetId,
            dependentRow,
            dependentCol,
            sourceSheetId,
            sourceRow,
            sourceCol
        ) {
            const dependentKey = createCellKey(
                dependentSheetId,
                dependentRow,
                dependentCol
            );

            const sourceKey = createCellKey(
                sourceSheetId,
                sourceRow,
                sourceCol
            );

            addEdge(dependentKey, sourceKey);
        },

        removeDependencies(dependentSheetId, dependentRow, dependentCol) {
            removeDependentEverywhere(
                createCellKey(dependentSheetId, dependentRow, dependentCol)
            );
        },

        getDependents(sheetId, row, col) {
            const sourceKey = createCellKey(sheetId, row, col);
            const directDependents = dependents.get(sourceKey);

            return directDependents
                ? Array.from(directDependents)
                : [];
        },

        getTransitiveDependents(sheetId, row, col) {
            const sourceKey = createCellKey(sheetId, row, col);
            const visited = new Set();

            collectTransitiveDependents(sourceKey, visited);

            return Array.from(visited);
        },

        markForRecalculation(sheetId, row, col) {
            dirtyCells.add(createCellKey(sheetId, row, col));
        },

        markSpillForRecalculation(spillRange) {
            if (!isValidSpillRange(spillRange)) {
                return;
            }

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
                    graph.markForRecalculation(
                        spillRange.sheetId,
                        row,
                        col
                    );
                }
            }

            const dependentKeys = graph.getTransitiveDependents(
                spillRange.sheetId,
                spillRange.anchorRow,
                spillRange.anchorCol
            );

            for (const dependentKey of dependentKeys) {
                dirtyCells.add(dependentKey);
            }
        },

        getPendingRecalculations() {
            return Array.from(dirtyCells);
        },

        takePendingRecalculations() {
            const pending = Array.from(dirtyCells);

            dirtyCells.clear();

            return pending;
        },

        isCircular(sheetId, row, col) {
            return evaluating.has(
                createCellKey(sheetId, row, col)
            );
        },

        getCircularCells() {
            return Array.from(cyclicCells);
        },

        beginEvaluation(sheetId, row, col) {
            const key = createCellKey(sheetId, row, col);

            if (evaluating.has(key)) {
                cyclicCells.add(key);

                return false;
            }

            evaluating.add(key);

            return true;
        },

        endEvaluation(sheetId, row, col) {
            evaluating.delete(
                createCellKey(sheetId, row, col)
            );
        },

        buildCalculationOrder(dirtyKeys = graph.getPendingRecalculations()) {
            if (!Array.isArray(dirtyKeys)) {
                throw new Error("SPILL_DEPENDENCY_INVALID_DIRTY_KEYS");
            }

            const dirtySet = new Set(dirtyKeys);
            const order = [];
            const circular = new Set();
            const state = new Map();

            if (dirtySet.size > MAX_DEPENDENCY_NODES) {
                throw new Error("SPILL_DEPENDENCY_TOO_MANY_NODES");
            }

            const visit = (key, path) => {
                const cellState = state.get(key);

                if (cellState === "done") {
                    return;
                }

                if (cellState === "visiting") {
                    for (const cycleKey of path) {
                        cyclicCells.add(cycleKey);
                        circular.add(cycleKey);
                    }

                    return;
                }

                state.set(key, "visiting");
                path.push(key);

                const sources = precedents.get(key);

                if (sources) {
                    for (const sourceKey of sources) {
                        if (dirtySet.has(sourceKey)) {
                            visit(sourceKey, path);
                        }
                    }
                }

                path.pop();
                state.set(key, "done");

                const parsed = parseCellKey(key);

                if (parsed && !circular.has(key)) {
                    order.push(parsed);
                }
            };

            for (const key of dirtySet) {
                if (!state.has(key)) {
                    visit(key, []);
                }
            }

            return {
                order,
                circular: Array.from(circular)
                    .map(parseCellKey)
                    .filter(Boolean),
            };
        },

        clear() {
            spillAnchors.clear();
            spillCells.clear();
            dependents.clear();
            precedents.clear();
            dirtyCells.clear();
            evaluating.clear();
            cyclicCells.clear();
        },
    };

    return Object.freeze(graph);
}

export function createCellChange({
    sheetId,
    row,
    col,
    key,
    previousValue,
    newValue,
}) {
    if (
        typeof sheetId !== "string" ||
        !sheetId ||
        !Number.isInteger(row) ||
        !Number.isInteger(col)
    ) {
        throw new Error("SPILL_DEPENDENCY_INVALID_CELL_CHANGE");
    }

    return Object.freeze({
        sheetId,
        row,
        col,
        key,
        previousValue,
        newValue,
        timestamp: Date.now(),
    });
}

export function createUndoBatch(changes) {
    if (!Array.isArray(changes)) {
        return [];
    }

    return Object.freeze(
        changes.map((change) => createCellChange(change))
    );
}

export function applyUndoBatch(batch, host) {
    if (!Array.isArray(batch) || !host) {
        return false;
    }

    for (let index = batch.length - 1; index >= 0; index -= 1) {
        const change = batch[index];

        host.setCellValue(
            change.sheetId,
            change.key,
            change.previousValue
        );
    }

    return true;
}

export function applyRedoBatch(batch, host) {
    if (!Array.isArray(batch) || !host) {
        return false;
    }

    for (const change of batch) {
        host.setCellValue(
            change.sheetId,
            change.key,
            change.newValue
        );
    }

    return true;
}

export function createRecalculationPlanner(dependencyGraph) {
    if (
        !dependencyGraph ||
        typeof dependencyGraph.getDependents !== "function"
    ) {
        throw new Error("SPILL_DEPENDENCY_INVALID_GRAPH");
    }

    return Object.freeze({
        planForCellChange(sheetId, row, col) {
            const spill = dependencyGraph.getSpillByCell(
                sheetId,
                row,
                col
            );

            if (spill) {
                dependencyGraph.markSpillForRecalculation(spill);
            } else {
                dependencyGraph.markForRecalculation(sheetId, row, col);

                const dependentKeys = dependencyGraph.getTransitiveDependents(
                    sheetId,
                    row,
                    col
                );

                for (const dependentKey of dependentKeys) {
                    const parsed = parseCellKey(dependentKey);

                    if (parsed) {
                        dependencyGraph.markForRecalculation(
                            parsed.sheetId,
                            parsed.row,
                            parsed.col
                        );
                    }
                }
            }

            const {
                order,
                circular,
            } = dependencyGraph.buildCalculationOrder(
                dependencyGraph.takePendingRecalculations()
            );

            return {
                order,
                circular,
            };
        },

        planForSpillChange(spillRange) {
            if (!isValidSpillRange(spillRange)) {
                return {
                    order: [],
                    circular: [],
                };
            }

            dependencyGraph.markSpillForRecalculation(spillRange);

            const {
                order,
                circular,
            } = dependencyGraph.buildCalculationOrder(
                dependencyGraph.takePendingRecalculations()
            );

            return {
                order,
                circular,
            };
        },

        planFullRecalculation() {
            const {
                order,
                circular,
            } = dependencyGraph.buildCalculationOrder();

            dependencyGraph.takePendingRecalculations();

            return {
                order,
                circular,
            };
        },
    });
}

export function createSpillDependencyManager(options = {}) {
    const dependencyGraph = createSpillDependencyGraph();
    const planner = createRecalculationPlanner(dependencyGraph);

    const undoStack = [];
    const redoStack = [];

    const maxUndoBatches =
        Number.isInteger(options.maxUndoBatches) &&
        options.maxUndoBatches > 0
            ? options.maxUndoBatches
            : MAX_UNDO_BATCHES;

    const pushUndoBatch = (batch) => {
        if (
            !batch ||
            !Array.isArray(batch.changes) ||
            batch.changes.length === 0
        ) {
            return batch;
        }

        undoStack.push(batch);

        if (undoStack.length > maxUndoBatches) {
            undoStack.shift();
        }

        redoStack.length = 0;

        return batch;
    };

    const restoreSpill = (spillRange, host) => {
        if (!spillRange || !host) {
            return;
        }

        host.registerSpill(spillRange);
        dependencyGraph.registerSpill(spillRange);
    };

    return Object.freeze({
        dependencyGraph,
        planner,

        registerSpill(spillRange, changedCells, host = null) {
            dependencyGraph.registerSpill(spillRange);

            if (host) {
                host.registerSpill(spillRange);
            }

            return pushUndoBatch({
                changes: createUndoBatch(changedCells),
                spillRange: spillRange || null,
            });
        },

        unregisterSpill(
            sheetId,
            anchorRow,
            anchorCol,
            changedCells,
            host = null
        ) {
            const spillRange = dependencyGraph.getSpillByAnchor(
                sheetId,
                anchorRow,
                anchorCol
            );

            dependencyGraph.unregisterSpill(
                sheetId,
                anchorRow,
                anchorCol
            );

            if (host) {
                host.unregisterSpill(sheetId, anchorRow, anchorCol);
            }

            return pushUndoBatch({
                changes: createUndoBatch(changedCells),
                spillRange: spillRange || null,
            });
        },

        addDependency(
            dependentSheetId,
            dependentRow,
            dependentCol,
            sourceSheetId,
            sourceRow,
            sourceCol
        ) {
            dependencyGraph.addDependency(
                dependentSheetId,
                dependentRow,
                dependentCol,
                sourceSheetId,
                sourceRow,
                sourceCol
            );
        },

        removeDependencies(dependentSheetId, dependentRow, dependentCol) {
            dependencyGraph.removeDependencies(
                dependentSheetId,
                dependentRow,
                dependentCol
            );
        },

        planForCellChange(sheetId, row, col) {
            return planner.planForCellChange(sheetId, row, col);
        },

        planForSpillChange(spillRange) {
            return planner.planForSpillChange(spillRange);
        },

        planFullRecalculation() {
            return planner.planFullRecalculation();
        },

        undo(host) {
            const batch = undoStack.pop();

            if (
                !batch ||
                !Array.isArray(batch.changes) ||
                batch.changes.length === 0
            ) {
                return false;
            }

            applyUndoBatch(batch.changes, host);

            if (batch.spillRange) {
                dependencyGraph.unregisterSpill(
                    batch.spillRange.sheetId,
                    batch.spillRange.anchorRow,
                    batch.spillRange.anchorCol
                );

                if (host) {
                    host.unregisterSpill(
                        batch.spillRange.sheetId,
                        batch.spillRange.anchorRow,
                        batch.spillRange.anchorCol
                    );
                }
            }

            redoStack.push(batch);

            return true;
        },

        redo(host) {
            const batch = redoStack.pop();

            if (
                !batch ||
                !Array.isArray(batch.changes) ||
                batch.changes.length === 0
            ) {
                return false;
            }

            applyRedoBatch(batch.changes, host);

            if (batch.spillRange) {
                restoreSpill(batch.spillRange, host);
            }

            undoStack.push(batch);

            return true;
        },

        clear() {
            dependencyGraph.clear();

            undoStack.length = 0;
            redoStack.length = 0;
        },
    });
}