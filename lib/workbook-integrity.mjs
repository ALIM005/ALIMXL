// Save/open boundary checks. Intentionally does not rewrite workbook content.
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const fail = (message) => { throw new Error(`ALIMXL: ${message}`); };
export function validateStoredWorkbook(value) {
  if (!record(value)) fail("Invalid workbook data.");
  if (typeof value.name !== "string" || !value.name.trim()) fail("Workbook name is required.");
  if (value.id !== undefined && (typeof value.id !== "string" || !value.id.trim())) fail("Invalid workbook ID.");
  if (!Array.isArray(value.sheets) || value.sheets.length === 0) fail("At least one sheet is required.");
  if (!Number.isInteger(value.activeSheetIndex) || value.activeSheetIndex < 0 || value.activeSheetIndex >= value.sheets.length) fail("Invalid active sheet index.");
  if (!["A4", "Letter", "Legal"].includes(value.pageSize) || !["portrait", "landscape"].includes(value.orientation)) fail("Invalid page settings.");
  const ids = new Set();
  for (const sheet of value.sheets) {
    if (!record(sheet)) fail("Invalid sheet data.");
    if (typeof sheet.id !== "string" || !sheet.id.trim() || ids.has(sheet.id)) fail("Missing or duplicate sheet ID.");
    ids.add(sheet.id);
    if (typeof sheet.name !== "string" || !sheet.name.trim()) fail("Invalid sheet name.");
    if (!Number.isSafeInteger(sheet.gridRows) || sheet.gridRows < 1 || !Number.isSafeInteger(sheet.gridCols) || sheet.gridCols < 1) fail("Invalid sheet dimensions.");
    if (!record(sheet.cells)) fail("Invalid cell map.");
    for (const [key, cell] of Object.entries(sheet.cells)) {
      if (!/^[A-Za-z]+[1-9][0-9]*$/.test(key)) fail(`Invalid cell address: ${key}`);
      if (!record(cell) || typeof cell.value !== "string") fail(`Invalid cell data: ${key}`);
    }
  }
}
export function prepareWorkbookForSave(value) {
  validateStoredWorkbook(value);
  if (typeof globalThis.structuredClone !== "function") fail("This environment does not support safe workbook snapshots.");
  const snapshot = globalThis.structuredClone(value);
  validateStoredWorkbook(snapshot);
  return snapshot;
}
