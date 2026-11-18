import type { LocalWorkbook } from "./local-workbooks";
export const MAX_BACKUP_BYTES: number;
export function createBackupText(workbook: LocalWorkbook): Promise<string>;
export function parseBackupText(text: string): Promise<LocalWorkbook>;
