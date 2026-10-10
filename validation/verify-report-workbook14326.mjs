import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {SpreadsheetFile,FileBlob} from '@oai/artifact-tool';
const w=await SpreadsheetFile.importXlsx(await FileBlob.load('/tmp/accounting14326-sheet/fixture.xlsx'));
w.recalculate();
const c=w.worksheets.getItem('Comparison'),p=w.worksheets.getItem('Payroll Data');
console.log((await w.inspect({kind:'table',range:'Comparison!A5:I12',include:'values,formulas',tableMaxRows:8,tableMaxCols:9,maxChars:2500})).ndjson);
assert.equal(c.getRange('D6').values[0][0],400);assert.equal(p.getRange('X6').values[0][0],1005);assert.equal(p.getRange('Z6').values[0][0],929.72);assert.equal(p.getRange('AB6').values[0][0],924.72);
c.getRange('G6').values=[[0]];p.getRange('E6').values=[[1100]];w.recalculate();assert.equal(c.getRange('H6').values[0][0],400);assert.equal(c.getRange('I6').values[0][0],'External difference');assert.equal(p.getRange('AB6').values[0][0],1024.72);
c.getRange('G6').values=[[null]];p.getRange('E6').values=[[1000]];w.recalculate();assert.equal(c.getRange('I6').values[0][0],'Enter external amount');
console.log((await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#N/A',options:{useRegex:true,maxResults:30},maxChars:1500})).ndjson);
const names=['General Ledger','Trial Balance','Payroll','Comparison','Journal Data','Payroll Data','Instructions','Attendance 1'];
for(const name of names){const img=await w.render({sheetName:name,range:name==='Attendance 1'?'A1:AF5':name==='Instructions'?'A1:B13':name==='Comparison'?'A1:I12':name==='Journal Data'?'A1:I9':name==='Payroll Data'?'A1:L6':'A1:F24',scale:1.5});await fs.writeFile('/tmp/accounting14326-sheet/'+name.replaceAll(' ','-')+'.png',new Uint8Array(await img.arrayBuffer()));}
await (await SpreadsheetFile.exportXlsx(w)).save('/tmp/accounting14326-sheet/artifact-verified.xlsx');
console.log('PASS formula recalculation, external zero vs missing, payroll driver edits, all eight rendered sheets');
