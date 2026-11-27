"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {createBackupText,parseBackupText} from "../lib/workbook-backup.mjs";
import {makeRecoveryKey,makeRecoveryRecord,type RecoverySummary} from "../lib/recovery-policy.mjs";
import {getRecovery,listRecovery,removeRecovery,writeRecovery} from "../lib/recovery-store";
import {saveLocalWorkbook,type LocalWorkbook} from "../lib/local-workbooks";
import {makeId} from "../lib/safe-id";
interface Props {workbook:LocalWorkbook;enabled:boolean;onRecovered:()=>void}
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
export default function RecoveryDrafts({workbook,enabled,onRecovered}:Props) {
  const {id,name,pageSize,orientation,activeSheetIndex,sheets}=workbook;
  const current=useRef<LocalWorkbook|null>(null);
  const previous=useRef<LocalWorkbook|null>(null);
  const owner=useRef("");
  const writing=useRef(false);
  const lock=useRef(false);
  const alive=useRef(false);
  const [status,setStatus]=useState("Recovery: অপেক্ষমাণ");
  const [error,setError]=useState("");
  const [rows,setRows]=useState<RecoverySummary[]>([]);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{current.current=enabled?{id,name,pageSize,orientation,activeSheetIndex,sheets}:null;},[enabled,id,name,pageSize,orientation,activeSheetIndex,sheets]);
  const refresh=useCallback(async()=>{
    try {const items=await listRecovery();if(alive.current)setRows(items);}
    catch(cause){if(alive.current)setError(message(cause));}
  },[]);
  useEffect(()=>{
    alive.current=true;
    const capture=async()=>{
      const snapshot=current.current;
      if(!snapshot || snapshot===previous.current || writing.current || lock.current)return;
      writing.current=true;
      try {
        if(!owner.current) owner.current=makeId();
        const key=makeRecoveryKey(owner.current,snapshot);
        const backup=await createBackupText(snapshot);
        const record=makeRecoveryRecord(key,snapshot.name,backup);
        await writeRecovery(record);
        previous.current=snapshot;
        if(alive.current){setStatus(`Recovery draft: ${new Date(record.capturedAt).toLocaleTimeString()}`);setError("");}
      } catch(cause){if(alive.current){setError(message(cause));setStatus("Recovery: সেভ হয়নি");}}
      finally{writing.current=false;}
    };
    const initialRefresh = window.setTimeout(() => { void refresh(); }, 0);
    const timer=window.setInterval(()=>{void capture();},5000);
    return()=>{alive.current=false;window.clearTimeout(initialRefresh);window.clearInterval(timer);};
  },[refresh]);
  async function recover(row:RecoverySummary) {
    if(lock.current || writing.current)return;
    lock.current=true;setBusy(true);setError("");
    try {
      const stored=await getRecovery(row.key);
      if(!stored)throw new Error("Recovery draft আর পাওয়া যাচ্ছে না। তালিকা রিফ্রেশ করুন।");
      const snapshot=await parseBackupText(stored.backup);
      if(!window.confirm(`"${row.name}"-এর recovery draft নতুন কপি হিসেবে ফিরিয়ে আনবেন? বর্তমান এডিটর বদলাবে না।`))return;
      await saveLocalWorkbook(snapshot);
      setStatus("Recovery কপি সেভ হয়েছে। আমার ফাইল থেকে ওপেন করুন।");
      onRecovered();
    }catch(cause){setError(message(cause));}
    finally{lock.current=false;setBusy(false);}
  }
  async function discard(row:RecoverySummary) {
    if(lock.current || writing.current)return;
    if(!window.confirm(`"${row.name}" recovery draft মুছবেন? আলাদাভাবে সেভ করা workbook মুছবে না।`))return;
    lock.current=true;setBusy(true);setError("");
    try{await removeRecovery(row.key);await refresh();}
    catch(cause){setError(message(cause));}
    finally{lock.current=false;setBusy(false);}
  }
 return <details className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-sm rounded border border-gray-300 bg-white p-2 text-xs text-black shadow">
    <summary className="cursor-pointer">{status}{error?" — সমস্যা আছে":""}</summary>
    <p className="my-2">প্রতি ৫ সেকেন্ডে বদলানো workbook-এর recovery draft রাখার চেষ্টা হয়। এটি মূল Save বা বাইরের backup নয়। অসম্পন্ন সেল টাইপিং অন্তর্ভুক্ত নয়।</p>
    {error&&<p role="alert" className="my-2 text-red-700">{error}</p>}
    <button type="button" disabled={busy} onClick={()=>{void refresh();}} className="rounded border px-2 py-1">তালিকা রিফ্রেশ</button>
    <ul className="mt-2 max-h-64 overflow-auto">
      {rows.map(row=><li key={row.key} className="my-2 border-t pt-2">
        <p>{row.name} — {new Date(row.capturedAt).toLocaleString()}</p>
        <button type="button" disabled={busy} onClick={()=>{void recover(row);}} className="mr-2 rounded border px-2 py-1">নতুন কপি ফিরিয়ে আনুন</button>
        <button type="button" disabled={busy} onClick={()=>{void discard(row);}} className="rounded border px-2 py-1">Draft মুছুন</button>
      </li>)}
    </ul>
    <p className="mt-2">Draft নিজে থেকে মোছা হয় না। জায়গা বাঁচাতে অপ্রয়োজনীয় কপি মুছুন।</p>
  </details>;
}
