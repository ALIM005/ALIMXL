import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStoredWorkbook, prepareWorkbookForSave } from '../lib/workbook-integrity.mjs';
const book = () => ({name:'পরীক্ষা',pageSize:'A4',orientation:'portrait',activeSheetIndex:0,sheets:[{id:'s1',name:'শিট',gridRows:100,gridCols:26,cells:{A1:{value:'=SUM(B1:B2)',style:{bold:true}},B1:{value:'10'},B2:{value:'20'}}}]});
test('valid workbook accepted',()=>assert.doesNotThrow(()=>validateStoredWorkbook(book())));
for (const [label, edit] of [
 ['empty name', b=>b.name=' '],
 ['bad ID', b=>b.id=12],
 ['empty sheets', b=>b.sheets=[]],
 ['invalid active index', b=>b.activeSheetIndex=1],
 ['invalid page size', b=>b.pageSize='bad'],
 ['null sheet', b=>b.sheets=[null]],
 ['duplicate sheet IDs', b=>b.sheets.push(structuredClone(b.sheets[0]))],
 ['invalid dimensions', b=>b.sheets[0].gridRows=0],
 ['invalid cell map', b=>b.sheets[0].cells=[]],
 ['invalid address', b=>b.sheets[0].cells.A0={value:'x'}],
 ['invalid cell value', b=>b.sheets[0].cells.A1.value=NaN],
]) test(label,()=>{const b=book();edit(b);assert.throws(()=>validateStoredWorkbook(b));});
test('snapshot isolates nested edits',()=>{const b=book();const copy=prepareWorkbookForSave(b);b.sheets[0].cells.A1.value='changed';b.sheets[0].cells.A1.style.bold=false;assert.equal(copy.sheets[0].cells.A1.value,'=SUM(B1:B2)');assert.equal(copy.sheets[0].cells.A1.style.bold,true);});
test('unknown optional metadata preserved',()=>{const b=book();b.currencyCode='BDT';b.sheets[0].extra={future:true};assert.deepEqual(prepareWorkbookForSave(b),b);});
test('non-cloneable data rejected',()=>{const b=book();b.extra=()=>{};assert.throws(()=>prepareWorkbookForSave(b));});
test('null input rejected',()=>assert.throws(()=>validateStoredWorkbook(null)));
