// Shared request references for retained legacy entry handlers; no visual changes.
const legacySaveReferences14228=new Map();
function journalEntry98Key14228(owner,payload){const fingerprint=JSON.stringify(payload),last=legacySaveReferences14228.get(owner);if(last?.fingerprint===fingerprint)return last.key;const key='web-'+crypto.randomUUID();legacySaveReferences14228.set(owner,{fingerprint,key});return key;}
document.addEventListener('input',e=>{if(e.isTrusted){const card=e.target.closest('#journalEntry98');if(card)delete card._postingRequest14228;legacySaveReferences14228.clear()}},true)