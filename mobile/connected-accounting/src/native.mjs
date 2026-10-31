import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { pendingScan } from './pending-scan.mjs';

if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform(), Scanner = registerPlugin('OonJaiNativeScanner');
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
    const u=new URL(url);if(u.protocol!=='oonjai-accounting:'||u.hostname!=='scan')return;
    await Browser.close().catch(()=>{});location.replace('scan.html?settings=1'+(u.search?'&'+u.search.slice(1):''));
  });
  // Keep the same account and APIs; never navigate the native WebView to OAuth.
  window.OJM_PUBLIC_APP_URL = 'https://oonjai-marketplace.github.io/Accounting/';
  window.ReceiptNative214 = {
    available: true,
    platform,
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
