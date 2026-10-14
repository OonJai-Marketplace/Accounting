const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage(),source=fs.readFileSync('src/documents/editor/document-editor-v105.js','utf8');
 const start=source.indexOf('function grid1424('),end=source.indexOf('\nfunction ',source.indexOf('function changeTableStructure14370(')+1);
 await page.addScriptTag({content:source.slice(start,end)});
 async function edit(html,id,action){return page.evaluate(({html,id,action})=>{document.body.innerHTML='<table>'+html+'</table>';const table=document.querySelector('table');changeTableStructure14370(table,document.getElementById(id),action);return (table.isConnected?grid1424(table):[]).map(r=>Array.from(r,c=>c?.textContent||''))},{html,id,action})}
 assert.deepEqual(await edit('<tr><td id="a" rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr>','a','add-row'),[['A','B'],['A',''],['A','C']]);
 assert.deepEqual(await edit('<tr><td id="a" rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr>','a','delete-row'),[['A','C']]);
 assert.deepEqual(await edit('<tr><td rowspan="2">A</td><td>B</td></tr><tr><td id="c">C</td></tr>','c','delete-col'),[['A'],['A']]);
 assert.deepEqual(await edit('<tr><td id="a">A</td><td>B</td></tr><tr><td colspan="2">C</td></tr>','a','add-col'),[['A','','B'],['C','C','C']]);
 assert.deepEqual(await edit('<tr><td id="a" colspan="2">A</td><td>B</td></tr><tr><td>C</td><td>D</td><td>E</td></tr>','a','delete-col'),[['A','B'],['D','E']]);
 assert.deepEqual(await edit('<tbody><tr><td id="a" rowspan="0">A</td><td>B</td></tr><tr><td>C</td></tr></tbody><tbody><tr><td>D</td><td>E</td></tr></tbody>','a','add-row'),[['A','B'],['A',''],['A','C'],['D','E']]);
 assert.deepEqual(await edit('<tr><td id="a" rowspan="65534">A</td><td>B</td></tr>','a','add-row'),[['A','B'],['','']]);
 assert.deepEqual(await edit('<tr><td id="a">A</td></tr>','a','delete-col'),[]);
 console.log('PASS document row/column edits preserve merged cells, row groups and zero spans; oversized spans stay bounded');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
