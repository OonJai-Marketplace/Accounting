/* Load heavy import/export tools on use; the service worker prepares their offline files. */
(()=>{'use strict';
const files={docx:['assets/vendor/docx.js?v=142.47','docx'],zip:['assets/vendor/jszip.min.js?v=142.47','JSZip'],word:['assets/vendor/document14285/cfb.min.js?v=142.94','CFB'],markdown:['assets/vendor/document14285/marked.umd.js?v=142.94','marked'],import:['scripts/document-import-v1422.js?v=143.73'],export:['scripts/document-export-v108.js?v=143.72']};
const pending=new Map(),loaded=new Set();
function load(name){if(loaded.has(name))return Promise.resolve();if(pending.has(name))return pending.get(name);const spec=files[name];if(!spec)return Promise.reject(Error('Unknown document tool.'));if(spec[1]&&window[spec[1]]){loaded.add(name);return Promise.resolve()}
 const job=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=spec[0];script.onload=()=>{if(spec[1]&&!window[spec[1]]){pending.delete(name);script.remove();reject(Error('The document tool did not initialize. Retry when connected.'));return}loaded.add(name);resolve()};script.onerror=()=>{pending.delete(name);script.remove();reject(Error('This document tool has not downloaded yet. Reconnect once, then retry.'))};document.head.append(script)});pending.set(name,job);return job;
}
window.optionalTools14335={load,loaded};
window.importDocument1422=async function(...args){await load('import');return window.importDocument1422(...args)};
window.exportDocx108=async function(...args){await load('export');return window.exportDocx108(...args)};
})();
