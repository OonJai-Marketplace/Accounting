const assert=require('node:assert/strict');

module.exports=async function checkFullReceiptPDF(page,original){
 const dialog=page.getByRole('dialog',{name:'Full receipt PDF'});
 const frame=dialog.locator('iframe'),link=dialog.getByRole('link',{name:'Open original PDF'});
 await frame.waitFor();
 assert.equal(await link.getAttribute('href'),original);
 const bounds=await dialog.evaluate(node=>{
  const frame=node.querySelector('iframe').getBoundingClientRect();
  const close=node.querySelector('button').getBoundingClientRect();
  const link=node.querySelector('a').getBoundingClientRect();
  return {width:frame.width,height:frame.height,viewportWidth:visualViewport.width,
   viewportHeight:visualViewport.height,top:frame.top,bottom:frame.bottom,
   controlsVisible:[close,link].every(r=>r.top>=-1&&r.left>=-1&&r.bottom<=visualViewport.height+1&&r.right<=visualViewport.width+1)};
 });
 const detail=JSON.stringify(bounds);
 assert(bounds.height>=bounds.viewportHeight*.80,detail);
 assert(bounds.width>=bounds.viewportWidth*.96,detail);
 assert(bounds.top>=-1&&bounds.bottom<=bounds.viewportHeight+1&&bounds.controlsVisible,detail);
 console.log('Full receipt PDF dimensions',detail);
};
