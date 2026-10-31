import {updateRelease} from './update-policy.mjs';

// Version checks never navigate the Accounting WebView, reload it, or touch drafts.
export function installAndroidUpdates({getInfo, getManifest, openDownload, downloadUpdate, installUpdate, onProgress = () => {}, onResume = () => {}, autoDelay = 8000, now = Date.now}) {
  const start = () => {
    if (!document.getElementById('accountMenu') || document.getElementById('nativeUpdate216')) return;
    const menu = document.getElementById('accountMenu');
    const control = document.createElement('button');
    control.id = 'nativeUpdate216'; control.type = 'button'; control.textContent = 'Check for updates';
    menu.querySelector('[data-accounting-install]')?.replaceWith(control);
    if (!control.isConnected) menu.append(control);
    // Keep updates accessible before login without offering a second PWA install.
    const controls = [control];
    document.querySelectorAll('[data-accounting-install]').forEach(old => {
      const button = old.cloneNode(false); button.removeAttribute('data-accounting-install'); button.type = 'button'; button.textContent = 'Check for updates'; old.replaceWith(button); controls.push(button);
    });
    const settingsControl=document.createElement('button');settingsControl.type='button';settingsControl.textContent='App settings';settingsControl.id='nativeSettings217';menu.append(settingsControl);
    const dialog = document.createElement('dialog'); dialog.id = 'nativeUpdateDialog216'; dialog.setAttribute('aria-labelledby', 'nativeUpdateTitle216');
    dialog.innerHTML = '<h2 id="nativeUpdateTitle216">App updates</h2><p data-update-version></p><p data-update-status role="status" aria-live="polite"></p><ul data-update-notes></ul><p data-update-help></p><label data-update-auto-row><input type="checkbox" data-update-auto> Download updates automatically</label><div class="actions"><button type="button" class="btn" data-update-close>Close</button><button type="button" class="btn" data-update-check>Check again</button><button type="button" class="btn primary" data-update-download hidden>Download update</button></div>';
    const style = document.createElement('style');
    style.textContent = '#nativeUpdateDialog216{box-sizing:border-box;padding:20px;font:inherit}#nativeUpdateDialog216 h2{font-size:20px;margin:0 0 12px}#nativeUpdateDialog216 p,#nativeUpdateDialog216 li{line-height:1.5}#nativeUpdateDialog216 ul{padding-left:20px}#nativeUpdateDialog216 .actions{display:flex;gap:8px;flex-wrap:wrap}#nativeUpdateDialog216 .actions button{height:32px;min-height:32px;padding:0 10px;font:inherit;font-size:13px}#nativeUpdateDialog216 [hidden]{display:none!important}#nativeUpdate216[data-available="true"]{font-weight:700;color:#07513e}';
    document.head.append(style); document.body.append(dialog);
    const version = dialog.querySelector('[data-update-version]'), status = dialog.querySelector('[data-update-status]'), notes = dialog.querySelector('[data-update-notes]'), help = dialog.querySelector('[data-update-help]'), download = dialog.querySelector('[data-update-download]'), check = dialog.querySelector('[data-update-check]');
    let installed = null, release = null, job = null, lastChecked = 0, preparing=null, ready=false;
    const auto=dialog.querySelector('[data-update-auto]');auto.checked=localStorage.getItem('ojm_auto_updates217')!=='off';dialog.querySelector('[data-update-auto-row]').hidden=!downloadUpdate;auto.onchange=()=>{localStorage.setItem('ojm_auto_updates217',auto.checked?'on':'off');if(auto.checked&&release?.available)void prepare();};
    onProgress(data=>{if(preparing)status.textContent='Downloading update… '+(data.total>0?Math.min(100,Math.floor(data.bytes/data.total*100))+'%':(data.bytes/1048576).toFixed(1)+' MB');});
    async function prepare(){
      if(!downloadUpdate||!release?.available||ready||preparing)return preparing;
      download.disabled=true;check.disabled=true;status.textContent='Downloading update…';
      preparing=(async()=>{try{await downloadUpdate(release);ready=true;download.textContent='Install update';status.textContent='Update downloaded and verified. Ready to install.';help.textContent='Android will ask you to confirm the update. Your sign-in and saved scans stay in this app.';}catch(e){status.textContent=e.message||'Could not download the update. Try again.';download.textContent='Retry download';}finally{download.disabled=false;check.disabled=false;preparing=null;}})();return preparing;
    }
    function paintMenu() {
      for (const button of controls) { button.textContent = release?.available ? 'Update available' : 'Check for updates'; button.dataset.available = String(!!release?.available); }
    }
    async function checkRelease() {
      if (job || preparing) return job || preparing;
      release = null; ready=false;download.textContent='Download update';paintMenu(); download.hidden = true; check.disabled = true; notes.replaceChildren(); help.textContent = ''; status.textContent = 'Checking for updates…';
      job = (async () => {
        try {
          installed = await getInfo(); version.textContent = 'Installed: ' + installed.version;
          release = updateRelease(await getManifest(), installed); lastChecked = now();
          status.textContent = release.available ? 'Version ' + release.version + ' is available.' : 'Your app is up to date.';
          download.hidden = !release.available;
          if (release.available) {
            for (const note of release.notes) { const li = document.createElement('li'); li.textContent = note; notes.append(li); }
            help.textContent = release.provider === 'drive' ? 'Download opens Oon Jai Google Drive. Use oonjaimarketplace@gmail.com, then install the downloaded APK to update this app.' : 'Download the APK, then open it to confirm the Android update.';
          }
          paintMenu();
          if(release.available&&downloadUpdate){help.textContent='Updates download inside Accounting. Android asks for confirmation before installing.';if(auto.checked)await prepare();}
        } catch { status.textContent = 'Could not check for updates. Connect to the internet and try again.'; }
        finally { check.disabled = false; job = null; }
      })();
      return job;
    }
    function show() { menu.hidden = true; if (!dialog.open) dialog.showModal(); void checkRelease(); }
    for (const button of controls) button.onclick = show;
    settingsControl.onclick=show;window.OJMAppUpdates217={show};document.addEventListener('click',event=>{if(event.target.closest('[data-native-updates217]'))show();});
    dialog.querySelector('[data-update-close]').onclick = () => dialog.close();
    check.onclick = () => { void checkRelease(); };
    download.onclick = async () => {
      if (!release?.available || download.disabled) return;
      if(downloadUpdate){if(!ready){await prepare();return;}download.disabled=true;try{const r=await installUpdate(release);status.textContent=r.permissionRequired?'Allow updates from Oon Jai Accounting, return here, then tap Install update.':'Confirm Update in the Android installer. Your saved data stays in this app.';}catch(e){status.textContent=e.message||'Could not open the installer. Try again.';}finally{download.disabled=false;}return;}
      download.disabled = true;
      try { await openDownload(release.url); status.textContent = 'Open the downloaded APK and confirm Update. Your saved data stays in this app.'; }
      catch { status.textContent = 'Could not open the download. Try again.'; }
      finally { download.disabled = false; }
    };
    const backgroundCheck = () => { if (navigator.onLine && (!lastChecked || now() - lastChecked > 6 * 60 * 60 * 1000)) void checkRelease(); };
    onResume(backgroundCheck); window.addEventListener('online', backgroundCheck);
    if (autoDelay >= 0) setTimeout(backgroundCheck, autoDelay);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
}
