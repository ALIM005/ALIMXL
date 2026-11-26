import assert from "node:assert/strict";
import test from "node:test";

const {
    importXlsxFile,
    exportXlsxWorkbook,
} = await import("../lib/xlsx-format-io.mjs");

function createSheet() {
    return {
        id: "validation_test_sheet",
        name: "Validation",
        gridRows: 10,
        gridCols: 6,
        cells: {
            A1: {
                value: "Status",
                style: {
                    bold: true,
                    wrap: true,
                },
            },
            B1: {
                value: "Quantity",
                style: {
                    bold: true,
                    wrap: true,
                },
            },
            A2: {
                value: "Active",
            },
            B2: {
                value: "10",
            },
        },
        groups: [],
        colGroups: [],
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
        dataValidations: [
            {
                ref: "A2:A10",
                validation: {
                    type: "list",
                    allowBlank: true,
                    formulae: ['"Active,Inactive,Pending"'],
                    showErrorMessage: true,
                    errorTitle: "Invalid status",
                    error: "Active, Inactive অথবা Pending নির্বাচন করুন।",
                },
            },
            {
                ref: "B2:B10",
                validation: {
                    type: "whole",
                    operator: "between",
                    formulae: ["1", "100"],
                    allowBlank: false,
                    showErrorMessage: true,
                    errorTitle: "Invalid quantity",
                    error: "১ থেকে ১০০ এর মধ্যে পূর্ণসংখ্যা দিন।",
                },
            },
        ],
        drawings: [],
    };
}

function createHelpers() {
    return {
        getCellValueInSheet: (sheet, key) => sheet.cells[key]?.value ?? "",
        normalizeDigitsOutsideQuotes: (value) => value,
        parseDateTextToSerial: () => null,
        strictNumber: (value) => {
            const parsed = Number(value);

            return Number.isFinite(parsed) ? parsed : null;
        },
        FORMULA_ERRORS: new Set(),
    };
}

test("XLSX round-trip preserves data validations", async () => {
    const exported = await exportXlsxWorkbook({
        workbookName: "Data Validation Test",
        sheets: [createSheet()],
        helpers: createHelpers(),
    });

    const buffer = await exported.arrayBuffer();
    const file = new File([buffer], "validation.xlsx", {
        type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const imported = await importXlsxFile(file);

    assert.equal(imported.sheets.length, 1);

    const validations = imported.sheets[0].dataValidations;
    assert.ok(Array.isArray(validations));
    assert.equal(validations.length, 2);

    const listValidation = validations.find(
        (item) => item.ref === "A2:A10"
    );

    assert.ok(listValidation);
    assert.equal(listValidation.validation.type, "list");
    assert.equal(listValidation.validation.allowBlank, true);
    assert.deepEqual(listValidation.validation.formulae, [
        '"Active,Inactive,Pending"',
    ]);
    assert.equal(listValidation.validation.showErrorMessage, true);
    assert.equal(listValidation.validation.errorTitle, "Invalid status");

    const wholeValidation = validations.find(
        (item) => item.ref === "B2:B10"
    );

    assert.ok(wholeValidation);
    assert.equal(wholeValidation.validation.type, "whole");
    assert.equal(wholeValidation.validation.operator, "between");
    assert.deepEqual(wholeValidation.validation.formulae, ["1", "100"]);
    assert.equal(typeof wholeValidation.validation.allowBlank, "boolean");
    assert.equal(wholeValidation.validation.errorTitle, "Invalid quantity");
});