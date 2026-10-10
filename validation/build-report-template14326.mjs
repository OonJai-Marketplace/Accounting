import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const w=Workbook.create(),s=w.worksheets.add('Template');
s.showGridLines=false;
const styles=[
 {font:{name:'Arial',size:10,color:'#173C2E'},wrapText:true},
 {font:{name:'Arial',size:15,bold:true,color:'#176249'}},
 {fill:'#176249',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},wrapText:true},
 {fill:'#EAF1EB',font:{name:'Arial',size:10,bold:true,color:'#173C2E'},wrapText:true},
 {font:{name:'Arial',size:10,color:'#173C2E'},numberFormat:'#,##0.00;(#,##0.00);0.00',horizontalAlignment:'right'},
 {fill:'#FFF2CC',font:{name:'Arial',size:10,color:'#0000FF'},numberFormat:'#,##0.00;(#,##0.00);0.00'},
 {font:{name:'Arial',size:10,color:'#173C2E'},numberFormat:'dd/mm/yy'},
 {font:{name:'Arial',size:10,color:'#52675B'},wrapText:true}
];
styles.forEach((f,i)=>{const r=s.getRange(`A${i+1}:F${i+1}`);r.values=[[i===4?1234.56:i===5?0:i===6?46200:['Oon Jai comparison reports','General Ledger','Account · LAK','Date / Entry / Description','','','','Editable yellow cells: enter independently prepared figures.'][i],null,null,null,null,null]];r.format=f;if([0,3,4,5,6].includes(i))r.format.borders={bottom:{style:'thin',color:'#B8C8BD'}};r.format.rowHeight=i===1?28:25;});
s.getRange('A:A').format.columnWidth=28;s.getRange('B:F').format.columnWidth=20;
w.recalculate();
const render=await w.render({sheetName:'Template',range:'A1:F8',scale:1.5});await fs.writeFile('/tmp/accounting14326-sheet/template.png',new Uint8Array(await render.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(w)).save(process.argv[2]||'assets/maintenance/report-template14326.xlsx');
console.log((await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:20}})).ndjson);
