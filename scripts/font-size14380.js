/* Scale typography, retaining each component's own size and the existing grid. */
(()=>{'use strict';
const sizes={small:1,normal:1.1,large:1.2},seen=new WeakSet();let queued=false;
function scaleDeclaration(style){const size=style?.getPropertyValue('font-size')?.trim();if(!/^\d*\.?\d+(px|pt)$/.test(size)||parseFloat(size)===0)return;style.setProperty('font-size',`calc(${size} * var(--app-font-scale14380, 1))`,style.getPropertyPriority('font-size'));}
function rules(list){for(const rule of list){if(rule.style)scaleDeclaration(rule.style);if(rule.cssRules)rules(rule.cssRules)}}
function sheets(){for(const sheet of document.styleSheets){if(seen.has(sheet))continue;try{rules(sheet.cssRules);seen.add(sheet)}catch{/* External font-face sheets contain no application typography. */}}}
function inline(root){if(root.nodeType!==1)return;if(root.hasAttribute('style'))scaleDeclaration(root.style);for(const n of root.querySelectorAll('[style]'))scaleDeclaration(n.style)}
function apply(){const name=ApplicationSettings.system?.fontSize||'small';document.documentElement.style.setProperty('--app-font-scale14380',String(sizes[name]||1));document.documentElement.dataset.fontSize14380=name;sheets();}
function ready(){const form=document.querySelector('[data-settings-group="system"]');if(form&&!form.querySelector('[name=fontSize]')){const field=document.createElement('div');field.className='settings-field';field.innerHTML='<label for="appFontSize14380">Font size</label><select id="appFontSize14380" name="fontSize" class="je-select"><option value="small">Small — current size</option><option value="normal">Normal — 110%</option><option value="large">Large — 120%</option></select><small>Applies to all interface text. Printed documents keep their own font sizes.</small>';form.querySelector('.settings-compact-grid').append(field);field.querySelector('select').value=ApplicationSettings.system?.fontSize||'small';}
 apply();inline(document.body);
 const roots=new Set();new MutationObserver(records=>{for(const r of records){if(r.type==='attributes')roots.add(r.target);else for(const n of r.addedNodes)if(n.nodeType===1)roots.add(n);}if(queued||!roots.size)return;queued=true;requestAnimationFrame(()=>{queued=false;for(const n of roots)if(n.isConnected)inline(n);roots.clear();sheets()})}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
 document.addEventListener('load',e=>{if(e.target.matches?.('link[rel=stylesheet]'))sheets()},true);
 window.addEventListener('storage',e=>{if(e.key===APP_SETTINGS_KEY){ApplicationSettings=loadApplicationSettings();apply();setSettingsFormValues('system')}});
}
window.fontSize14380={apply};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

