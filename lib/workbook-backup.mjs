export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
const isRecord = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
function validate(w) {
  if (!isRecord(w) || typeof w.name !== "string" || !w.name.trim()) throw new Error("Invalid workbook name/data.");
  if (!["A4", "Letter", "Legal"].includes(w.pageSize) || !["portrait", "landscape"].includes(w.orientation)) throw new Error("Invalid page settings.");
  if (!Array.isArray(w.sheets) || !w.sheets.length || !Number.isInteger(w.activeSheetIndex) || w.activeSheetIndex < 0 || w.activeSheetIndex >= w.sheets.length) throw new Error("Invalid workbook sheets/index.");
  const ids = new Set();
  for (const s of w.sheets) {
    if (!isRecord(s) || typeof s.id !== "string" || !s.id.trim() || ids.has(s.id) || typeof s.name !== "string" || !s.name.trim()) throw new Error("Invalid/duplicate sheet identity.");
    ids.add(s.id);
    if (!Number.isSafeInteger(s.gridRows) || s.gridRows < 1 || !Number.isSafeInteger(s.gridCols) || s.gridCols < 1 || !isRecord(s.cells)) throw new Error("Invalid sheet dimensions/cells.");
    for (const [key,c] of Object.entries(s.cells)) {
      if (!/^[A-Za-z]+[1-9][0-9]*$/.test(key) || !isRecord(c) || typeof c.value !== "string") throw new Error("Invalid cell data.");
    }
  }
}
function checkSize(text) {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error("Backup exceeds the 25 MiB limit.");
}
async function digest(text) {
  if (!globalThis.crypto?.subtle) throw new Error("Backup integrity checks require HTTPS or localhost and Web Crypto.");
  const bytes = await globalThis.crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,"0")).join("");
}
export async function createBackupText(workbook) {
  validate(workbook);
  const payload = JSON.stringify(workbook, function (key, value) {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Non-finite numeric metadata cannot be backed up safely.");
    if (["function", "symbol", "bigint"].includes(typeof value)) throw new Error("Unsupported workbook metadata.");
    if (value === undefined && Array.isArray(this)) throw new Error("Undefined array entries cannot be backed up safely.");
    return value;
  });
  checkSize(payload);
  const envelope = {format:"ALIMXL-WORKBOOK-BACKUP",version:1,createdAt:new Date().toISOString(),checksum:await digest(payload),workbook:JSON.parse(payload)};
  const text = JSON.stringify(envelope);
  checkSize(text);
  return text;
}
export async function parseBackupText(text) {
  if (typeof text !== "string") throw new Error("Backup must contain JSON text.");
  checkSize(text);
  let e;
  try { e = JSON.parse(text.replace(/^\uFEFF/,"")); } catch { throw new Error("Backup is not valid JSON."); }
  if (!isRecord(e) || e.format !== "ALIMXL-WORKBOOK-BACKUP" || e.version !== 1) throw new Error("Unsupported ALIMXL backup format/version.");
  if (typeof e.checksum !== "string" || !/^[a-f0-9]{64}$/.test(e.checksum)) throw new Error("Missing/invalid backup checksum.");
  validate(e.workbook);
  if (await digest(JSON.stringify(e.workbook)) !== e.checksum) throw new Error("Backup integrity check failed. The contents changed or were damaged.");
  const copy = e.workbook;
  delete copy.id;
  delete copy.updatedAt;
  copy.name = `${copy.name.trim()} (Restored)`;
  return copy;
}
