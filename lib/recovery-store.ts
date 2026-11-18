import {canWriteRecovery, type RecoveryRecord, type RecoverySummary} from "./recovery-policy.mjs";
const DATABASE = "alimxl-recovery-v1";
const STORE = "drafts";
let connection: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Recovery storage unavailable."));
  if (connection) return connection;
  connection = new Promise((resolve,reject) => {
    const req = indexedDB.open(DATABASE,1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE,{keyPath:"key"});
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {db.close();connection=null;};
      db.onclose = () => {connection=null;};
      resolve(db);
    };
    req.onerror = () => {connection=null;reject(req.error ?? new Error("Recovery database failed."));};
    req.onblocked = () => {console.warn("ALIMXL recovery database blocked; close other tabs.");};
  });
  return connection;
}
export async function writeRecovery(record:RecoveryRecord):Promise<void> {
  const db = await open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    const store=tx.objectStore(STORE);
    let cause:unknown;
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(cause ?? tx.error ?? new Error("Recovery write aborted."));
    const req=store.getAllKeys();
    req.onsuccess=()=>{
      try {
        if(!canWriteRecovery(req.result,record.key)) throw new Error("Recovery limit reached (30 drafts). Remove unneeded drafts from Recovery panel.");
        store.put(record);
      } catch(error) {cause=error;tx.abort();}
    };
  });
}
async function request<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const db=await open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);
    let result:T;
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(tx.error ?? new Error("Recovery operation aborted."));
    try { const req=action(tx.objectStore(STORE));req.onsuccess=()=>{result=req.result;}; }
    catch(error){tx.abort();reject(error);}
  });
}
export async function listRecovery():Promise<RecoverySummary[]> {
  const db=await open();
  return new Promise((resolve,reject)=>{
    const rows:RecoverySummary[]=[];
    const tx=db.transaction(STORE,"readonly");
    tx.oncomplete=()=>resolve(rows.sort((a,b)=>b.capturedAt.localeCompare(a.capturedAt)));
    tx.onabort=()=>reject(tx.error ?? new Error("Recovery list failed."));
    const req=tx.objectStore(STORE).openCursor();
    req.onsuccess=()=>{
      const cursor=req.result;
      if(!cursor)return;
      const row=cursor.value as RecoveryRecord;
      rows.push({key:row.key,name:row.name,capturedAt:row.capturedAt});
      cursor.continue();
    };
  });
}
export async function getRecovery(key:string):Promise<RecoveryRecord|null> {
  return (await request<RecoveryRecord|undefined>("readonly",store=>store.get(key))) ?? null;
}
export async function removeRecovery(key:string):Promise<void> {
  await request<undefined>("readwrite",store=>store.delete(key));
}
