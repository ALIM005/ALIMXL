import type {LocalWorkbook} from "./local-workbooks";
export const MAX_RECOVERY_DRAFTS: number;
export interface RecoveryRecord {key:string;name:string;backup:string;capturedAt:string}
export function makeRecoveryKey(owner:string,workbook:LocalWorkbook):string;
export function makeRecoveryRecord(key:string,name:string,backup:string,now?:string):RecoveryRecord;
export function canWriteRecovery(keys: IDBValidKey[],key:string):boolean;
export type RecoverySummary = Omit<RecoveryRecord,"backup">;
