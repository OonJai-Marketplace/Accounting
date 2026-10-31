import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { pendingScan } from './pending-scan.mjs';
import { installAndroidUpdates } from './updates.mjs';

if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform(), Scanner = registerPlugin('OonJaiNativeScanner');
  const Storage = registerPlugin('OonJaiStorage'), Updater=registerPlugin('OonJaiAppUpdate');
  const queue = pendingScan(localStorage, () => window.deviceVault14334);
  let active = false;
  const restored = App.addListener('appRestoredResult', event => {
    if (event.pluginId !== 'OonJaiNativeScanner' || event.methodName !== 'scan') return;
    if (event.success && !event.data?.cancelled && event.data?.scannedImages?.length) {
      try { queue.record(event.data); } catch (error) { console.error('Native scan recovery:', error.message); return; }
      if (!location.pathname.endsWith('/scan.html')) location.replace('scan.html?capture=0');
    }
  });
  void Scanner.prepare().catch(() => {});
  void App.addListener('appUrlOpen', async ({url}) => {
    const u=new URL(url);if(u.protocol!=='oonjai-accounting-preview:'||u.hostname!=='scan')return;
    await Browser.close().catch(()=>{});location.replace('scan.html?settings=1'+(u.search?'&'+u.search.slice(1):''));
  });
  // Keep the same account and APIs; never navigate the native WebView to OAuth.
  window.OJM_PUBLIC_APP_URL = 'https://oonjai-marketplace.github.io/Accounting/';
  if (platform === 'android') installAndroidUpdates({
    getInfo: () => App.getInfo(),
    getManifest: async () => {
      const response = await CapacitorHttp.get({url: window.OJM_PUBLIC_APP_URL + 'data/android-release.json?t=' + Date.now(), headers: {'Cache-Control': 'no-cache'}, connectTimeout: 10000, readTimeout: 10000, responseType: 'json'});
      if (response.status !== 200) throw Error('The update service is unavailable.');
      return response.data;
    },
    openDownload: url => Browser.open({url}),
    downloadUpdate: async release => {
      const session=window.deviceVault14334?.readSession?.();
      if(!window.deviceVault14334?.unlocked||!session?.access_token)throw Error('Sign in to Accounting, then retry the update download.');
      return Updater.download({sha256:release.sha256,versionCode:release.versionCode,token:session.access_token,apikey:window.OJM_SUPABASE_ANON_KEY});
    },
    installUpdate: release => Updater.install({sha256:release.sha256,versionCode:release.versionCode}),
    onProgress: callback => { void Updater.addListener('progress',callback); },
    onResume: callback => { void App.addListener('appStateChange', ({isActive}) => { if (isActive) callback(); }); }
  });
  window.ReceiptNative214 = {
    available: true,
    preview215: true,
    platform,
    pickDirectory: folder => Storage.pickDirectory(folder || {}),
    checkDirectory: folder => Storage.checkDirectory(folder),
    createDirectory: (folder,name) => Storage.createDirectory({...folder,name}),
    async savePDF(file, folder, sha256) {
      const data = await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});
      const path='scan-exports/'+crypto.randomUUID()+'.pdf';
      const source=await Filesystem.writeFile({path,data,directory:Directory.Cache,recursive:true});
      try { return await Storage.writePDF({...folder,name:file.name,sha256,source:source.uri}); }
      finally { await Filesystem.deleteFile({path,directory:Directory.Cache}).catch(()=>{}); }
    },
    async scan(context) {
      await restored;
      if (active) throw Error('The document scanner is already open.');
      const previous = await this.recover();
      if (previous) return previous;
      // An interrupted launch with no returned pages is safe to restart.
      const interrupted = queue.context();
      if (interrupted) queue.cancel(interrupted.id);
      const request = queue.start(context); active = true;
      try {
        const result = await Scanner.scan({requestId: request.id, singlePage: !!context.replace});
        if (result.cancelled || !result.scannedImages?.length) { queue.cancel(request.id); return null; }
        queue.record(result);
        return queue.pending();
      } catch (error) {
        // Keep the recovery reference even if native file copying failed. A later
        // launch checks native storage before restarting an interrupted capture.
        if (/Scan cancelled or failed\. Result code: 0/.test(error.message)) return null;
        throw error;
      } finally { active = false; }
    },
    pending: () => queue.pending(),
    async recover() {
      await restored;const request=queue.context();if(!request)return null;
      if(queue.pending())return queue.pending();
      const result=await Scanner.recover({requestId:request.id});
      if(result.scannedImages?.length)queue.record(result);
      return queue.pending();
    },
    async readPage(path) {
      const result = await Filesystem.readFile({ path });
      if (typeof result.data !== 'string') throw Error('The native scan could not be read.');
      return 'data:image/jpeg;base64,' + result.data;
    },
    async acknowledge(job, index) {
      queue.acknowledge(job.id, index);
    },
    async complete(job) {
      queue.assertComplete(job.id);
      await Scanner.finish({requestId:job.id});queue.complete(job.id);
    },
    async openConnection(url) {
      const target = new URL(url);
      if (target.protocol !== 'https:' || target.hostname !== 'accounts.google.com') throw Error('Invalid Google authorization address.');
      await Browser.open({ url: target.href });
    },
    async sharePDF(file) {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file);
      });
      const path = 'scan-exports/' + crypto.randomUUID() + '/' + file.name;
      const saved = await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
      try { await Share.share({ title: file.name, files: [saved.uri] }); }
      finally { await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {}); }
    }
  };
}
