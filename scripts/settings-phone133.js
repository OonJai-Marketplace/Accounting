/* Reflow the original permission inputs. Their values, events and save logic stay native. */
(()=>{
window.compactUserSettings133=()=>{
 if(document.documentElement.dataset.device132!=='phone')return;
 const host=document.getElementById('userPermissionGrid');
 host?.querySelectorAll('details').forEach(details=>{details.open=false;const grid=details.querySelector('.permission-grid113');if(!grid||grid.dataset.compact133)return;grid.dataset.compact133='true';const children=[...grid.children];for(let i=0;i<children.length;i+=7){const group=document.createElement('div');group.className='permission-row133';children.slice(i,i+7).forEach((node,j)=>{if(j===0)node.classList.add('permission-title133');else{const input=node.querySelector('input');const label={view:'View',edit:'Edit',export:'Export',approve:'Approve',post:'Post',void:'Void'}[input?.dataset.action113];if(input&&node.textContent.trim()==='')node.append(document.createTextNode(label||''));}group.append(node)});grid.append(group)}});
 const password=document.getElementById('userAccessPassword');if(password)password.closest('.settings-field').hidden=!!document.getElementById('userAccessId').value;
};
})();
