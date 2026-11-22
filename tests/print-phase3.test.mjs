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
  folder = fs.mkdtempSync(path.join(os.tmpdir(), "alimxl-print3-"));
  const temp = folder; process.on("exit", () => fs.rmSync(temp, { recursive: true, force: true }));
  for (const name of ["print-pages","print-layout","print-render","print-borders","print-preparation","print-text-measure"]) {
    const source = fs.readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), "utf8");
    const result = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
    fs.writeFileSync(path.join(folder,`${name}.mjs`),result.outputText.replace(/from "(\.\/[^".]+)"/g,'from "$1.mjs"'));
  }
}
const load = name => import(pathToFileURL(path.join(folder,`${name}.mjs`)).href);
const { preparePrintDocument } = await load("print-preparation");
const { computePrintPages, resolvePrintScale, normalizePageBreaks } = await load("print-pages");
const { buildPrintLayout } = await load("print-layout");
const { collectPrintBorders } = await load("print-borders");
const setup={paperSize:"A4",orientation:"landscape",margins:{top:20,right:15,bottom:20,left:15},scale:100,printArea:"A1:J32",scalingMode:"fit-width"};
function fixture(){
 const cells={};for(let r=0;r<32;r++)for(let c=0;c<10;c++)cells[`${String.fromCharCode(65+c)}${r+1}`]={value:r===0?'Heading':String(r),style:{bold:true,borders:{top:true,right:true,bottom:true,left:true},borderWidth:2}};
 return {gridRows:32,gridCols:10,cells,colWidths:{},rowHeights:{}};
}
const measure=(text,size)=>text.length*size*0.5;
function prep(extra={},s=fixture()){return preparePrintDocument(s,{...setup,...extra},key=>s.cells[key]?.value??"",measure);}
function bodyRows(result){return result.pages.flatMap(p=>p.rows.filter(r=>!(p.page.repeatRows??[]).includes(r.row)).map(r=>r.row));}

test("legacy fit-width still includes all ten columns",()=>{const r=prep();assert.equal(r.pages.length,2);assert.ok(r.pages.every(p=>p.page.c1===0&&p.page.c2===9));});
test("15 workers plus total fit on two pages with repeated heading",()=>{const r=prep({rowsPerPage:15,repeatFirstRow:true,lastRowIsTotal:true});assert.equal(r.pages.length,2);assert.equal(r.pages[0].rows.length,16);assert.equal(r.pages[1].rows.length,17);});
test("10 workers plus total fit on three pages",()=>{const r=prep({rowsPerPage:10,repeatFirstRow:true,lastRowIsTotal:true});assert.equal(r.pages.length,3);assert.deepEqual(r.pages.map(p=>p.rows.length),[11,11,12]);});
test("final row not implicitly assumed to be a total",()=>{assert.equal(prep({rowsPerPage:15,repeatFirstRow:true,lastRowIsTotal:false}).pages.length,3);});
test("every page starts with original heading",()=>{const r=prep({rowsPerPage:10,repeatFirstRow:true,lastRowIsTotal:true});for(const p of r.pages){assert.equal(p.rows[0].row,0);assert.equal(p.rows[0].cells[0].value,'Heading');}});
test("body rows occur once and none are lost",()=>{const r=prep({rowsPerPage:10,repeatFirstRow:true,lastRowIsTotal:true});assert.deepEqual(bodyRows(r),Array.from({length:31},(_,i)=>i+1));});
test("header-only print area does not duplicate header",()=>{const r=prep({printArea:'A1:J1',repeatFirstRow:true});assert.equal(r.pages[0].rows.length,1);});
test("repeat header consumes printable capacity",()=>{const r=prep({repeatFirstRow:true});for(const p of r.pages)assert.equal(p.rows[0].row,0);assert.ok(r.pages.length>=2);});
test("manual row break uses zero-based source boundary",()=>{const r=prep({repeatFirstRow:true,manualRowBreaks:true,rowBreaksBefore:[16]});assert.equal(r.pages.length,2);assert.equal(r.pages[1].page.r1,16);});
test("moving row break changes page distribution",()=>{const r=prep({repeatFirstRow:true,manualRowBreaks:true,rowBreaksBefore:[11]});assert.deepEqual(r.pages.map(p=>p.page.r1),[1,11]);});
test("removing final manual row break merges vertical pages",()=>{const r=prep({repeatFirstRow:true,manualRowBreaks:true,rowBreaksBefore:[]});assert.equal(r.pages.length,1);});
test("manual column break divides at selected column",()=>{const r=prep({manualColumnBreaks:true,columnBreaksBefore:[5]});assert.ok(r.pages.some(p=>p.page.c1===5));assert.ok(r.pages.every(p=>p.page.c2===4||p.page.c2===9));});
test("removing final manual column break fits width",()=>{const r=prep({scalingMode:'percentage',manualColumnBreaks:true,columnBreaksBefore:[]});assert.ok(r.pages.every(p=>p.page.c1===0&&p.page.c2===9));});
test("duplicate break indices normalize",()=>assert.deepEqual(normalizePageBreaks([16,11,16],1,31),[11,16]));
test("out-of-range stale breaks are excluded",()=>assert.deepEqual(normalizePageBreaks([0,100],1,31),[]));
test("invalid break indices rejected",()=>assert.throws(()=>normalizePageBreaks([1.5],0,31)));
test("negative rows per page rejected",()=>assert.throws(()=>prep({rowsPerPage:-1})));
test("invalid print area rejected",()=>assert.throws(()=>prep({printArea:'bad'})));
test("prepared rows fit page capacity after forced grouping",()=>{const r=prep({rowsPerPage:15,repeatFirstRow:true,lastRowIsTotal:true});for(const p of r.pages){assert.ok(p.totalHeight*r.settings.scale/100<=(210-40)*96/25.4);}});
test("source workbook remains byte-equivalent after print fitting",()=>{const s=fixture();s.cells.B2={value:'one two three four five six seven eight nine',style:{wrap:true,fontSize:18}};const before=JSON.stringify(s);prep({autoFitRowHeight:true,wrapTextForPrint:true,rowsPerPage:15,repeatFirstRow:true},s);assert.equal(JSON.stringify(s),before);});
test("auto row fit removes vertical overflow for wrapped sample",()=>{const s=fixture();s.cells.B2={value:'one two three four five six seven eight nine',style:{wrap:true,fontSize:18}};const r=prep({autoFitRowHeight:true},s);const c=r.pages[0].rows.find(r=>r.row===1).cells[1];assert.ok(c.height>36);assert.equal(c.hasVerticalOverflow,false);});
test("print-only wrapping does not change worksheet wrap",()=>{const s=fixture();s.cells.B2={value:'one two three four five six seven eight nine',style:{wrap:false}};const r=prep({wrapTextForPrint:true,autoFitRowHeight:true},s);assert.equal(s.cells.B2.style.wrap,false);assert.equal(r.pages[0].rows[1].cells[1].style.wrap,true);});
test("formatted display values used in prepared pages",()=>{const s=fixture();const r=preparePrintDocument(s,setup,key=>key==='D2'?'30,000':s.cells[key]?.value??'',measure);assert.equal(r.pages[0].rows[1].cells[3].value,'30,000');});
test("formula showing blank does not erase requested range",()=>{const s=fixture();const r=preparePrintDocument(s,setup,()=>'',measure);assert.equal(r.pages[0].rows[0].cells.length,10);assert.ok(r.pages.length>0);});
test("small overview available for dragging",()=>{const r=prep();assert.ok(r.overview);assert.equal(r.overview.rows.length,32);});
test("overview disabled beyond editor cap but normal printing works",()=>{const s={gridRows:501,gridCols:10,cells:{A1:{value:'a'},J501:{value:'b'}},colWidths:{},rowHeights:{}};const r=preparePrintDocument(s,{...setup,printArea:'A1:J501'},key=>s.cells[key]?.value??'',measure);assert.equal(r.overview,undefined);assert.match(r.overviewMessage,/5,000/);assert.ok(r.pages.length>0);});
test("repeated heading counted in layout budgets",()=>{const s=fixture();assert.throws(()=>buildPrintLayout(s,[{r1:1,r2:1,c1:0,c2:9,pageNumber:1,repeatRows:[0]}],{maxTotalCells:15}));});
test("duplicate repeated rows rejected",()=>assert.throws(()=>buildPrintLayout(fixture(),[{r1:1,r2:1,c1:0,c2:9,pageNumber:1,repeatRows:[0,0]}])));
test("overlapping repeated body row rejected",()=>assert.throws(()=>buildPrintLayout(fixture(),[{r1:1,r2:2,c1:0,c2:9,pageNumber:1,repeatRows:[1]}])));
test("shared physical border deduplicated below repeated header",()=>{const r=prep({repeatFirstRow:true,rowsPerPage:15,lastRowIsTotal:true});const edges=collectPrintBorders(r.pages[1]);const coords=edges.map(e=>`${e.axis}:${e.x}:${e.y}:${e.length}`);assert.equal(new Set(coords).size,coords.length);});
test("impossible manual segment below 10 percent gives error",()=>{const s=fixture();s.rowHeights[1]=100000;assert.throws(()=>prep({manualRowBreaks:true,rowBreaksBefore:[]},s),/10%/);});
test("empty grid remains safe",()=>{const s={gridRows:0,gridCols:0,cells:{},colWidths:{},rowHeights:{}};const r=preparePrintDocument(s,{...setup,printArea:''},()=>'',measure);assert.equal(r.pages.length,0);});
