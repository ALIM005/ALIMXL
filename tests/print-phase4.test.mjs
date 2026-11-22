import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
let folder = process.env.ALIMXL_COMPILED_PRINT_ROOT;
if (!folder) {
 const ts = createRequire(import.meta.url)("typescript");
 folder = fs.mkdtempSync(path.join(os.tmpdir(), "alimxl-print4-"));
 const temp = folder; process.on("exit", () => fs.rmSync(temp, {recursive:true,force:true}));
 for (const name of ["print-frame","print-i18n"]) {
  const source = fs.readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),"utf8");
  const result = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  fs.writeFileSync(path.join(folder,`${name}.mjs`), result.outputText.replace(/from "(\.\/[^".]+)"/g,'from "$1.mjs"'));
 }
}
const load=name=>import(pathToFileURL(path.join(folder,`${name}.mjs`)).href);
const i=await load("print-i18n"); const {runPrintFrame}=await load("print-frame");
function browser(mode="normal") {
 const descriptors=Object.fromEntries(["window","document","HTMLElement"].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const win=new EventTarget();win.setTimeout=setTimeout;win.clearTimeout=clearTimeout;win.open=()=>{throw Error("Unexpected popup")};
 class Element extends EventTarget {
  style={};isConnected=false;attributes={};children=[];
  setAttribute(k,v){this.attributes[k]=v} appendChild(x){this.children.push(x);return x} prepend(x){this.children.unshift(x)}
  getBoundingClientRect(){return {width:794,height:1123}} remove(){this.isConnected=false} focus(){}
 }
 const previous=new Element();previous.isConnected=true;let restored=false,printCalls=0;
 previous.focus=()=>{restored=true};const frames=[];
 const doc={baseURI:"https://example.invalid/alimxl",activeElement:previous,body:new Element(),hasFocus:()=>true,
 createElement(tag){const el=new Element();if(tag!=="iframe")return el;
  const child=new EventTarget();child.focus=()=>{};const media=new EventTarget();media.matches=false;child.matchMedia=()=>media;
  child.print=()=>{printCalls++;if(mode==="printFailure")throw Error("driver error");if(mode!=="hold")queueMicrotask(()=>child.dispatchEvent(new Event("afterprint")))};
  el.contentWindow=child;el.contentDocument={body:new Element(),head:new Element(),createElement:doc.createElement,fonts:{ready:mode==="fontFailure"?Promise.reject(Error("font")):Promise.resolve()}};frames.push(el);return el;
 }};
 doc.body.appendChild=el=>{el.isConnected=true;doc.body.children.push(el);queueMicrotask(()=>el.dispatchEvent(new Event(mode==="loadFailure"?"error":"load")));return el};
 globalThis.window=win;globalThis.document=doc;globalThis.HTMLElement=Element;
 return {frames,get restored(){return restored},get printCalls(){return printCalls},restore(){for(const[k,d]of Object.entries(descriptors))d?Object.defineProperty(globalThis,k,d):delete globalThis[k]}};
}
test("all three dictionaries have complete matching placeholders",()=>{assert.deepEqual(i.validatePrintTranslations(),[]);for(const lang of ['en','bn','ar'])assert.equal(Object.keys(i.printMessages[lang]).length,164)});
test("English is the default",()=>assert.equal(i.DEFAULT_PRINT_LANGUAGE,'en'));
test("regional language codes normalize",()=>{assert.equal(i.normalizePrintLanguage('ar-SA'),'ar');assert.equal(i.normalizePrintLanguage('bn_BD'),'bn');assert.equal(i.normalizePrintLanguage(null),'en')});
test("Arabic is RTL; English and Bengali are LTR",()=>{assert.equal(i.getPrintDirection('ar'),'rtl');assert.equal(i.getPrintDirection('bn'),'ltr');assert.equal(i.getPrintDirection('en'),'ltr')});
test("all translations interpolate",()=>{for(const lang of ['bn','en','ar'])for(const[key,text]of Object.entries(i.printMessages[lang])){const params=Object.fromEntries(Array.from(text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g),x=>[x[1],3]));assert.equal(typeof i.translatePrint(lang,key,...(Object.keys(params).length?[params]:[])),'string')}});
test("missing parameters rejected",()=>assert.throws(()=>i.translatePrint('en','pageOf'),TypeError));
test("user parameters preserved literally",()=>assert.equal(i.translatePrint('en','printTitle',{name:'$& {page} <b>x</b>'}),'Print — $& {page} <b>x</b>'));
test("localized numbers preserve values",()=>{assert.equal(i.formatPrintNumber('bn',123),'১২৩');assert.equal(i.formatPrintNumber('ar',123),'١٢٣');assert.equal(i.formatPrintPercent('en',84.08),'84.08%')});
test("structured errors follow language",()=>{const e=i.makePrintError('invalidScale',{min:10,max:400});assert.equal(i.getPrintErrorMessage(e,'en'),'Print scale must be between 10% and 400%.');assert.match(i.getPrintErrorMessage(e,'bn'),/১০/)});
test("unknown errors do not leak mixed UI text",()=>assert.equal(i.getPrintErrorMessage(Error('Internal বাংলা'),'en'),i.translatePrint('en','unknownError')));
test("SSR preference access safe",()=>{assert.equal(i.readStoredPrintLanguage(),'en');assert.equal(i.writeStoredPrintLanguage('ar'),false)});
test("no browser gives structured error",async()=>assert.rejects(runPrintFrame('',{title:'salary'}),e=>e.key==='printUnavailable'));
test("iframe prints without popup and cleans up",async()=>{const b=browser();try{await runPrintFrame('<p>salary</p>',{title:'salary',fontCss:'@font-face {}'});assert.equal(b.printCalls,1);assert.equal(b.frames[0].isConnected,false);assert.equal(b.restored,true);assert.equal(b.frames[0].contentDocument.title,'salary');assert.equal(b.frames[0].attributes['aria-hidden'],'true');assert.ok(b.frames[0].contentDocument.head.children.some(n=>n.href==='https://example.invalid/alimxl'))}finally{b.restore()}});
test("pending dialog keeps snapshot and prevents duplicate job",async()=>{const b=browser('hold');try{const p=runPrintFrame('',{title:'salary'});await new Promise(r=>setTimeout(r,140));assert.equal(b.frames[0].isConnected,true);await assert.rejects(runPrintFrame('',{title:'second'}),e=>e.key==='printInProgress');b.frames[0].contentWindow.dispatchEvent(new Event('afterprint'));await p;assert.equal(b.frames[0].isConnected,false)}finally{b.restore()}});
test("load error cleans up",async()=>{const b=browser('loadFailure');try{await assert.rejects(runPrintFrame('',{title:'salary'}),e=>e.key==='printFrameFailed');assert.equal(b.printCalls,0);assert.equal(b.frames[0].isConnected,false)}finally{b.restore()}});
test("font error cleans up",async()=>{const b=browser('fontFailure');try{await assert.rejects(runPrintFrame('',{title:'salary'}),e=>e.key==='fontsFailed');assert.equal(b.printCalls,0);assert.equal(b.frames[0].isConnected,false)}finally{b.restore()}});
test("print failure releases lock for retry",async()=>{const b=browser('printFailure');try{await assert.rejects(runPrintFrame('',{title:'salary'}),/driver error/);assert.equal(b.frames[0].isConnected,false)}finally{b.restore()}const retry=browser();try{await runPrintFrame('',{title:'retry'});assert.equal(retry.printCalls,1)}finally{retry.restore()}});
