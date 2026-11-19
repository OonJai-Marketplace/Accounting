const assert=require('node:assert/strict');

module.exports=async function checkFullReceiptPDF(page,original){
 const dialog=page.getByRole('dialog',{name:'Full receipt PDF'});
 const frame=dialog.locator('iframe'),link=dialog.getByRole('link',{name:'Open original PDF'});
 await frame.waitFor();
 assert.equal(await link.getAttribute('href'),original);
 const bounds=await dialog.evaluate(node=>{
  const box=node.getBoundingClientRect(),frame=node.querySelector('iframe').getBoundingClientRect();
  const toolbar=node.querySelector('.rv-pdf-toolbar').getBoundingClientRect();
  const vw=visualViewport.width,vh=visualViewport.height;
  return {width:box.width,height:box.height,left:box.left,top:box.top,
   right:vw-box.right,bottom:vh-box.bottom,viewportWidth:vw,viewportHeight:vh,
   frameWidth:frame.width,frameHeight:frame.height,toolbarHeight:toolbar.height,
   controlsVisible:[...node.querySelectorAll('button,a')].every(el=>{
    const r=el.getBoundingClientRect();return r.left>=box.left && r.right<=box.right && r.top>=box.top && r.bottom<=frame.top+1;
   })};
 });
 const detail=JSON.stringify(bounds);
 assert(Math.min(bounds.left,bounds.top,bounds.right,bounds.bottom)>=12,detail);
 assert(Math.abs(bounds.left-bounds.right)<=2 && Math.abs(bounds.top-bounds.bottom)<=2,detail);
 assert(bounds.frameHeight>=Math.min(480,bounds.viewportHeight*.65),detail);
 assert(bounds.frameWidth>=Math.min(620,bounds.viewportWidth*.84),detail);
 assert(bounds.frameHeight+bounds.toolbarHeight>=bounds.height-5 && bounds.controlsVisible,detail);
 console.log('Full PDF popup dimensions',detail);
};
